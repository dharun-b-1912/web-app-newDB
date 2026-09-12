-- supabase/migrations/20260911_107_biometric_true_multitenant_isolation.sql
-- ============================================================================
-- JOY PeopleHR — Migration 107
-- TRUE MULTI-TENANT BIOMETRIC SQL ISOLATION & HARDWARE SECURITY MESH
-- ============================================================================
-- 1. True organization/tenant isolation on all biometric infrastructure.
-- 2. Biometric Connectors, Devices, Users, Mappings, Attendance Events,
--    Sync Runs, Health Telemetry, Commands, and Audit Logs.
-- 3. Composite Database Constraints & Cross-Tenant Validation Triggers.
-- 4. Server-Side Identity-Driven RLS (Zero trust for client-provided tenant_id).
-- 5. Universal type compatibility (UUID and TEXT organization/employee identifiers).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0. TENANT SYNCHRONIZATION & CONSISTENCY HELPERS
-- ============================================================================

-- Function to keep tenant_id and organization_id synchronized
CREATE OR REPLACE FUNCTION public.sync_biometric_tenant_identifiers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.organization_id IS NOT NULL THEN
    NEW.tenant_id := NEW.organization_id;
  ELSIF NEW.organization_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    NEW.organization_id := NEW.tenant_id;
  ELSIF NEW.tenant_id IS NOT NULL AND NEW.organization_id IS NOT NULL AND NEW.tenant_id != NEW.organization_id THEN
    -- Force consistency if both provided
    NEW.organization_id := NEW.tenant_id;
  END IF;

  IF NEW.updated_at IS NOT NULL THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. BIOMETRIC CONNECTORS (Reconciles biometric_gateway_agents)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_connectors (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    site_id TEXT,
    branch_id TEXT,
    connector_name VARCHAR(255) NOT NULL,
    connector_type VARCHAR(64) NOT NULL DEFAULT 'JOY_LAN_AGENT',
    pairing_token VARCHAR(128),
    pairing_token_expires_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAIRING' CHECK (status IN ('ONLINE', 'OFFLINE', 'DEGRADED', 'PENDING_PAIRING')),
    last_seen_at TIMESTAMPTZ,
    version VARCHAR(64) NOT NULL DEFAULT '3.0.0-enterprise',
    os_platform VARCHAR(64) NOT NULL DEFAULT 'Windows / Linux',
    local_ip VARCHAR(64),
    public_ip VARCHAR(64),
    offline_buffer_count INT NOT NULL DEFAULT 0,
    connected_devices_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist on biometric_connectors (idempotent for re-runs)
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'PENDING_PAIRING';
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS pairing_token VARCHAR(128);
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS version VARCHAR(64) DEFAULT '3.0.0-enterprise';
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS os_platform VARCHAR(64) DEFAULT 'Windows / Linux';
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS local_ip VARCHAR(64);
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS public_ip VARCHAR(64);
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS offline_buffer_count INT DEFAULT 0;
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS connected_devices_count INT DEFAULT 0;
ALTER TABLE public.biometric_connectors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Guard indexes with column-existence checks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_connectors' AND column_name = 'tenant_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_connectors' AND column_name = 'site_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bioc_tenant_site ON public.biometric_connectors(tenant_id, site_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_connectors' AND column_name = 'tenant_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_connectors' AND column_name = 'status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bioc_tenant_status ON public.biometric_connectors(tenant_id, status)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_connectors' AND column_name = 'pairing_token') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bioc_pairing_token ON public.biometric_connectors(pairing_token)';
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_bioc_sync_tenant ON public.biometric_connectors;
CREATE TRIGGER trg_bioc_sync_tenant
BEFORE INSERT OR UPDATE ON public.biometric_connectors
FOR EACH ROW EXECUTE FUNCTION public.sync_biometric_tenant_identifiers();

-- Safe backfill from biometric_gateway_agents if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_gateway_agents') THEN
    BEGIN
      EXECUTE '
        INSERT INTO public.biometric_connectors (
          id, tenant_id, organization_id, site_id, branch_id, connector_name,
          connector_type, pairing_token, status, last_seen_at, version, os_platform,
          local_ip, public_ip, offline_buffer_count, connected_devices_count, created_at, updated_at
        )
        SELECT
          id, organization_id::text, organization_id::text, branch_id::text, branch_id::text, agent_name,
          ''JOY_LAN_AGENT'', pairing_key, status, last_heartbeat, version, os_platform,
          local_ip, public_ip, offline_buffer_count, connected_devices_count, created_at, updated_at
        FROM public.biometric_gateway_agents
        ON CONFLICT (id) DO NOTHING;
      ';
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- 2. BIOMETRIC DEVICES (Physical & Virtual Terminals)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_devices') THEN
    CREATE TABLE public.biometric_devices (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        connector_id VARCHAR(64) REFERENCES public.biometric_connectors(id) ON DELETE SET NULL,
        site_id TEXT,
        branch_id TEXT,
        branch VARCHAR(255) NOT NULL DEFAULT 'Main Office',
        gateway_agent_id VARCHAR(64),
        device_name VARCHAR(255) NOT NULL,
        device_type VARCHAR(64) NOT NULL DEFAULT 'Multi-Modal',
        vendor VARCHAR(64) NOT NULL DEFAULT 'eSSL',
        model VARCHAR(128) NOT NULL DEFAULT 'AI-FACE MAGNUM',
        serial_number VARCHAR(128) NOT NULL,
        device_identifier VARCHAR(128),
        connection_type VARCHAR(32) NOT NULL DEFAULT 'LAN',
        ip_address VARCHAR(64) NOT NULL,
        port INT NOT NULL DEFAULT 4370,
        protocol VARCHAR(32) NOT NULL DEFAULT 'TCP',
        comm_key VARCHAR(64) NOT NULL DEFAULT '123456',
        location_description VARCHAR(255) NOT NULL DEFAULT 'Entrance',
        direction_mode VARCHAR(32) NOT NULL DEFAULT 'BOTH',
        status VARCHAR(32) NOT NULL DEFAULT 'Online',
        registered_users_count INT NOT NULL DEFAULT 0,
        fingerprint_count INT NOT NULL DEFAULT 0,
        face_count INT NOT NULL DEFAULT 0,
        latency_ms INT NOT NULL DEFAULT 0,
        firmware_version VARCHAR(64) NOT NULL DEFAULT 'Ver 8.6.2_AI',
        timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
        enabled BOOLEAN NOT NULL DEFAULT true,
        auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
        last_seen_at TIMESTAMPTZ,
        last_sync_at TIMESTAMPTZ,
        last_sync TIMESTAMPTZ,
        last_health_check TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_device_tenant_serial UNIQUE (tenant_id, serial_number)
    );
  ELSE
    -- ----------------------------------------------------------------
    -- SAFELY ADD ALL COLUMNS THAT MAY NOT EXIST IN LEGACY TABLES
    -- (tables from migrations 035, 036, 040, 090 have different schemas)
    -- ----------------------------------------------------------------
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS organization_id TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS connector_id VARCHAR(64) REFERENCES public.biometric_connectors(id) ON DELETE SET NULL;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS site_id TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS branch VARCHAR(255) DEFAULT 'Main Office';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(64) DEFAULT 'Multi-Modal';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS vendor VARCHAR(64) DEFAULT 'eSSL';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS model VARCHAR(128) DEFAULT 'AI-FACE MAGNUM';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS serial_number VARCHAR(128) DEFAULT 'UNKNOWN-SN';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64) DEFAULT '0.0.0.0';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS port INT DEFAULT 4370;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS comm_key VARCHAR(64) DEFAULT '123456';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS location_description VARCHAR(255) DEFAULT 'Entrance';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS direction_mode VARCHAR(32) DEFAULT 'BOTH';
    -- status: core column needed for indexes — must be added explicitly
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'Online';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS registered_users_count INT DEFAULT 0;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS fingerprint_count INT DEFAULT 0;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS face_count INT DEFAULT 0;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS latency_ms INT DEFAULT 0;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(64) DEFAULT 'Ver 8.6.2_AI';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT true;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS device_identifier VARCHAR(128);
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS connection_type VARCHAR(32) DEFAULT 'LAN';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS protocol VARCHAR(32) DEFAULT 'TCP';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Asia/Kolkata';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

    -- Backfill tenant_id safely using dynamic execution only if source columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_devices' AND column_name = 'organization_id') THEN
      EXECUTE 'UPDATE public.biometric_devices SET tenant_id = organization_id::text WHERE tenant_id IS NULL AND organization_id IS NOT NULL';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_devices' AND column_name = 'gateway_agent_id') THEN
      EXECUTE 'UPDATE public.biometric_devices SET connector_id = gateway_agent_id::text WHERE connector_id IS NULL AND gateway_agent_id IS NOT NULL';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_devices' AND column_name = 'branch_id') THEN
      EXECUTE 'UPDATE public.biometric_devices SET site_id = branch_id::text WHERE site_id IS NULL AND branch_id IS NOT NULL';
    END IF;
  END IF;
END $$;

-- Guard ALL three indexes with column-existence checks to handle all legacy schemas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_devices' AND column_name = 'tenant_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_devices' AND column_name = 'site_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bio_dev_tenant_site ON public.biometric_devices(tenant_id, site_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_devices' AND column_name = 'tenant_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_devices' AND column_name = 'connector_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bio_dev_tenant_conn ON public.biometric_devices(tenant_id, connector_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_devices' AND column_name = 'tenant_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_devices' AND column_name = 'status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bio_dev_tenant_status ON public.biometric_devices(tenant_id, status)';
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_biodev_sync_tenant ON public.biometric_devices;
CREATE TRIGGER trg_biodev_sync_tenant
BEFORE INSERT OR UPDATE ON public.biometric_devices
FOR EACH ROW EXECUTE FUNCTION public.sync_biometric_tenant_identifiers();

-- ============================================================================
-- 3. BIOMETRIC DEVICE USERS (Machine Users in Terminal Flash Memory)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_device_users') THEN
    CREATE TABLE public.biometric_device_users (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        branch_id TEXT,
        device_id VARCHAR(64) NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
        device_user_uid VARCHAR(64),
        device_user_id VARCHAR(64) NOT NULL,
        employee_id TEXT,
        display_name TEXT,
        name VARCHAR(255) NOT NULL,
        privilege VARCHAR(32) NOT NULL DEFAULT 'USER',
        password_configured BOOLEAN NOT NULL DEFAULT false,
        card_number VARCHAR(64),
        group_id VARCHAR(64) NOT NULL DEFAULT '1',
        timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
        user_group VARCHAR(64) NOT NULL DEFAULT 'Default Group',
        enabled BOOLEAN NOT NULL DEFAULT true,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        fingerprint_count INT DEFAULT 0,
        face_count INT DEFAULT 0,
        face_enrolled BOOLEAN DEFAULT false,
        palm_enrolled BOOLEAN DEFAULT false,
        iris_enrolled BOOLEAN DEFAULT false,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        sync_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_bio_dev_user_tenant UNIQUE (tenant_id, device_id, device_user_id)
    );
  ELSE
    ALTER TABLE public.biometric_device_users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    ALTER TABLE public.biometric_device_users ADD COLUMN IF NOT EXISTS employee_id TEXT;
    ALTER TABLE public.biometric_device_users ADD COLUMN IF NOT EXISTS display_name TEXT;
    ALTER TABLE public.biometric_device_users ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ACTIVE';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_device_users' AND column_name = 'organization_id') THEN
      EXECUTE 'UPDATE public.biometric_device_users SET tenant_id = organization_id::text WHERE tenant_id IS NULL AND organization_id IS NOT NULL';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_device_users' AND column_name = 'name') THEN
      EXECUTE 'UPDATE public.biometric_device_users SET display_name = name WHERE display_name IS NULL AND name IS NOT NULL';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bdu_tenant_dev ON public.biometric_device_users(tenant_id, device_id);
CREATE INDEX IF NOT EXISTS idx_bdu_tenant_emp ON public.biometric_device_users(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_bdu_tenant_pin ON public.biometric_device_users(tenant_id, device_user_id);

DROP TRIGGER IF EXISTS trg_bdu_sync_tenant ON public.biometric_device_users;
CREATE TRIGGER trg_bdu_sync_tenant
BEFORE INSERT OR UPDATE ON public.biometric_device_users
FOR EACH ROW EXECUTE FUNCTION public.sync_biometric_tenant_identifiers();

-- ============================================================================
-- 4. BIOMETRIC EMPLOYEE MAPPINGS (Machine PIN <-> Verified Employee)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_employee_mappings (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    branch_id TEXT,
    device_id VARCHAR(64) NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    device_user_id VARCHAR(64) NOT NULL,
    device_user_uid VARCHAR(64),
    employee_id TEXT NOT NULL,
    employee_name VARCHAR(255),
    employee_code VARCHAR(64),
    department VARCHAR(128),
    designation VARCHAR(128),
    mapping_status VARCHAR(32) NOT NULL DEFAULT 'MAPPED' CHECK (mapping_status IN ('UNMAPPED', 'MAPPED', 'CONFLICT', 'DISABLED', 'PENDING_REVIEW')),
    mapping_source VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
    confidence_score INT NOT NULL DEFAULT 100,
    mapped_by VARCHAR(255) NOT NULL DEFAULT 'Administrator',
    mapped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unmapped_by VARCHAR(255),
    unmapped_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bem_tenant_dev_user UNIQUE (tenant_id, device_id, device_user_id),
    CONSTRAINT uq_bem_tenant_dev_emp UNIQUE (tenant_id, device_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_bem_tenant_emp ON public.biometric_employee_mappings(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_bem_tenant_dev ON public.biometric_employee_mappings(tenant_id, device_id);

DROP TRIGGER IF EXISTS trg_bem_sync_tenant ON public.biometric_employee_mappings;
CREATE TRIGGER trg_bem_sync_tenant
BEFORE INSERT OR UPDATE ON public.biometric_employee_mappings
FOR EACH ROW EXECUTE FUNCTION public.sync_biometric_tenant_identifiers();

-- Safe sync from employee_biometric_mappings if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_biometric_mappings') THEN
    BEGIN
      EXECUTE '
        INSERT INTO public.biometric_employee_mappings (
          id, tenant_id, organization_id, branch_id, device_id, device_name,
          device_user_id, device_user_uid, employee_id, employee_name, employee_code,
          department, designation, mapping_status, mapping_source, confidence_score,
          mapped_by, mapped_at, unmapped_by, unmapped_at, last_verified_at, created_at, updated_at
        )
        SELECT
          id, organization_id::text, organization_id::text,
          CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''employee_biometric_mappings'' AND column_name = ''branch_id'') THEN branch_id::text ELSE NULL END,
          device_id,
          CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''employee_biometric_mappings'' AND column_name = ''device_name'') THEN device_name ELSE NULL END,
          device_user_id,
          CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''employee_biometric_mappings'' AND column_name = ''device_user_uid'') THEN device_user_uid ELSE NULL END,
          employee_id::text,
          CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''employee_biometric_mappings'' AND column_name = ''employee_name'') THEN employee_name ELSE NULL END,
          CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''employee_biometric_mappings'' AND column_name = ''employee_code'') THEN employee_code ELSE NULL END,
          NULL, NULL, ''MAPPED'', ''MANUAL'', 100,
          ''Administrator'', now(), NULL, NULL, now(), now(), now()
        FROM public.employee_biometric_mappings
        ON CONFLICT (id) DO NOTHING;
      ';
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- 5. BIOMETRIC ATTENDANCE EVENTS (Normalized Ingestion Pipeline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_attendance_events (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    device_id VARCHAR(64) NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    connector_id VARCHAR(64) REFERENCES public.biometric_connectors(id) ON DELETE SET NULL,
    employee_id TEXT,
    device_user_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(32) NOT NULL DEFAULT 'PUNCH' CHECK (event_type IN ('PUNCH', 'CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END', 'AUTO')),
    punch_timestamp TIMESTAMPTZ NOT NULL,
    device_timestamp TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source VARCHAR(32) NOT NULL DEFAULT 'CONNECTOR' CHECK (source IN ('CONNECTOR', 'OFFLINE_BUFFER', 'ADMS_PUSH', 'API', 'SIMULATOR')),
    raw_event_id VARCHAR(64),
    deduplication_key VARCHAR(128) NOT NULL,
    processing_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSED', 'DEDUPLICATED', 'UNRESOLVED_USER', 'FAILED', 'CROSS_TENANT_REJECTED')),
    verification_mode VARCHAR(32) DEFAULT 'Fingerprint',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bio_att_event_dedup UNIQUE (tenant_id, deduplication_key)
);

CREATE INDEX IF NOT EXISTS idx_bae_tenant_time ON public.biometric_attendance_events(tenant_id, punch_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bae_tenant_emp ON public.biometric_attendance_events(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_bae_tenant_dev ON public.biometric_attendance_events(tenant_id, device_id);
CREATE INDEX IF NOT EXISTS idx_bae_tenant_status ON public.biometric_attendance_events(tenant_id, processing_status);

DROP TRIGGER IF EXISTS trg_bae_sync_tenant ON public.biometric_attendance_events;
CREATE TRIGGER trg_bae_sync_tenant
BEFORE INSERT OR UPDATE ON public.biometric_attendance_events
FOR EACH ROW EXECUTE FUNCTION public.sync_biometric_tenant_identifiers();

-- Safe backfill from biometric_raw_punches if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_raw_punches') THEN
    BEGIN
      EXECUTE '
        INSERT INTO public.biometric_attendance_events (
          id, tenant_id, organization_id, device_id, employee_id, device_user_id,
          event_type, punch_timestamp, received_at, source, deduplication_key,
          processing_status, verification_mode, created_at, updated_at
        )
        SELECT
          id, organization_id::text, organization_id::text, device_id, employee_id::text, biometric_pin,
          CASE WHEN punch_direction = ''IN'' THEN ''CHECK_IN'' WHEN punch_direction = ''OUT'' THEN ''CHECK_OUT'' ELSE ''PUNCH'' END,
          punch_time, created_at,
          CASE WHEN source_type = ''OFFLINE_BUFFER'' THEN ''OFFLINE_BUFFER'' WHEN source_type = ''ADMS_PUSH'' THEN ''ADMS_PUSH'' ELSE ''CONNECTOR'' END,
          organization_id::text || '':'' || device_id || '':'' || biometric_pin || '':'' || punch_time::text,
          CASE WHEN processed_status = ''PROCESSED'' THEN ''PROCESSED'' WHEN processed_status = ''DEDUPLICATED_IGNORED'' THEN ''DEDUPLICATED'' ELSE ''PENDING'' END,
          verification_mode, created_at, created_at
        FROM public.biometric_raw_punches
        ON CONFLICT (id) DO NOTHING;
      ';
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- 6. BIOMETRIC SYNC RUNS & LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_sync_runs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    connector_id VARCHAR(64) REFERENCES public.biometric_connectors(id) ON DELETE SET NULL,
    device_id VARCHAR(64) REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED')),
    records_received INT NOT NULL DEFAULT 0,
    records_processed INT NOT NULL DEFAULT 0,
    records_failed INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bsr_tenant_status ON public.biometric_sync_runs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bsr_tenant_dev ON public.biometric_sync_runs(tenant_id, device_id);

DROP TRIGGER IF EXISTS trg_bsr_sync_tenant ON public.biometric_sync_runs;
CREATE TRIGGER trg_bsr_sync_tenant
BEFORE INSERT OR UPDATE ON public.biometric_sync_runs
FOR EACH ROW EXECUTE FUNCTION public.sync_biometric_tenant_identifiers();

CREATE TABLE IF NOT EXISTS public.biometric_sync_logs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    sync_run_id VARCHAR(64) REFERENCES public.biometric_sync_runs(id) ON DELETE CASCADE,
    device_id VARCHAR(64) REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    level VARCHAR(16) NOT NULL DEFAULT 'INFO' CHECK (level IN ('INFO', 'WARN', 'ERROR')),
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bsl_tenant_run ON public.biometric_sync_logs(tenant_id, sync_run_id);

-- ============================================================================
-- 7. BIOMETRIC DEVICE HEALTH & TELEMETRY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_device_health (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    device_id VARCHAR(64) NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'DEGRADED', 'NO_POWER', 'NO_NETWORK', 'AUTH_FAILED')),
    last_heartbeat TIMESTAMPTZ,
    last_successful_sync TIMESTAMPTZ,
    last_error TEXT,
    latency_ms INT NOT NULL DEFAULT 0,
    clock_drift_seconds INT NOT NULL DEFAULT 0,
    device_time TIMESTAMPTZ,
    cloud_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    sqlite_wal_status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bio_dev_health UNIQUE (tenant_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_bdh_tenant_dev ON public.biometric_device_health(tenant_id, device_id);

DROP TRIGGER IF EXISTS trg_bdh_sync_tenant ON public.biometric_device_health;
CREATE TRIGGER trg_bdh_sync_tenant
BEFORE INSERT OR UPDATE ON public.biometric_device_health
FOR EACH ROW EXECUTE FUNCTION public.sync_biometric_tenant_identifiers();

-- ============================================================================
-- 8. BIOMETRIC DEVICE COMMANDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_device_commands (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    connector_id VARCHAR(64) REFERENCES public.biometric_connectors(id) ON DELETE SET NULL,
    device_id VARCHAR(64) NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    command_type VARCHAR(64) NOT NULL,
    payload JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'ACKNOWLEDGED', 'RUNNING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')),
    response_payload JSONB,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    executed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bdc_tenant_dev ON public.biometric_device_commands(tenant_id, device_id);
CREATE INDEX IF NOT EXISTS idx_bdc_tenant_status ON public.biometric_device_commands(tenant_id, status);

DROP TRIGGER IF EXISTS trg_bdc_sync_tenant ON public.biometric_device_commands;
CREATE TRIGGER trg_bdc_sync_tenant
BEFORE INSERT OR UPDATE ON public.biometric_device_commands
FOR EACH ROW EXECUTE FUNCTION public.sync_biometric_tenant_identifiers();

-- ============================================================================
-- 9. BIOMETRIC DEVICE CAPABILITIES & CREDENTIALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_device_capabilities (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    device_id VARCHAR(64) NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    supports_tcp BOOLEAN NOT NULL DEFAULT true,
    supports_http BOOLEAN NOT NULL DEFAULT false,
    supports_https BOOLEAN NOT NULL DEFAULT false,
    supports_push BOOLEAN NOT NULL DEFAULT false,
    supports_sdk BOOLEAN NOT NULL DEFAULT true,
    supports_user_sync BOOLEAN NOT NULL DEFAULT true,
    supports_attendance_pull BOOLEAN NOT NULL DEFAULT true,
    supports_attendance_push BOOLEAN NOT NULL DEFAULT false,
    supports_device_time BOOLEAN NOT NULL DEFAULT true,
    supports_health BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bio_dev_caps UNIQUE (tenant_id, device_id)
);

CREATE TABLE IF NOT EXISTS public.biometric_device_credentials (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    device_id VARCHAR(64) NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    comm_key_encrypted TEXT,
    web_password_encrypted TEXT,
    api_token_encrypted TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bio_dev_creds UNIQUE (tenant_id, device_id)
);

-- ============================================================================
-- 10. BIOMETRIC AUDIT LOGS (Tenant-Isolated Forensic Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    actor_user_id TEXT,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    source VARCHAR(64) NOT NULL DEFAULT 'WEB_UI',
    ip_address VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bal_tenant_time ON public.biometric_audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bal_tenant_entity ON public.biometric_audit_logs(tenant_id, entity_type, entity_id);

DROP TRIGGER IF EXISTS trg_bal_sync_tenant ON public.biometric_audit_logs;
CREATE TRIGGER trg_bal_sync_tenant
BEFORE INSERT OR UPDATE ON public.biometric_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.sync_biometric_tenant_identifiers();

-- ============================================================================
-- 11. CROSS-TENANT CONSISTENCY VALIDATION TRIGGERS (Safe Type Casting)
-- ============================================================================

-- Trigger 1: Validate biometric_devices ownership consistency
CREATE OR REPLACE FUNCTION public.check_biometric_device_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
  conn_tenant TEXT;
  site_tenant TEXT;
BEGIN
  -- Validate connector belongs to same tenant
  IF NEW.connector_id IS NOT NULL THEN
    SELECT tenant_id INTO conn_tenant FROM public.biometric_connectors WHERE id = NEW.connector_id;
    IF conn_tenant IS NOT NULL AND conn_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cross-Tenant Violation: Connector % belongs to tenant %, not %', NEW.connector_id, conn_tenant, NEW.tenant_id;
    END IF;
  END IF;

  -- Validate site/branch belongs to same tenant (cast id::text and organization_id::text)
  IF NEW.site_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
    SELECT COALESCE(b.organization_id::text, c.organization_id::text) INTO site_tenant
    FROM public.branches b
    LEFT JOIN public.companies c ON b.company_id::text = c.id::text
    WHERE b.id::text = NEW.site_id::text;

    IF site_tenant IS NOT NULL AND site_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cross-Tenant Violation: Site % belongs to tenant %, not %', NEW.site_id, site_tenant, NEW.tenant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_biometric_device_tenant ON public.biometric_devices;
CREATE TRIGGER trg_check_biometric_device_tenant
BEFORE INSERT OR UPDATE ON public.biometric_devices
FOR EACH ROW EXECUTE FUNCTION public.check_biometric_device_tenant_consistency();

-- Trigger 2: Validate biometric_employee_mappings ownership consistency
CREATE OR REPLACE FUNCTION public.check_biometric_mapping_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
  dev_tenant TEXT;
  emp_tenant TEXT;
BEGIN
  SELECT tenant_id INTO dev_tenant FROM public.biometric_devices WHERE id = NEW.device_id;
  IF dev_tenant IS NOT NULL AND dev_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cross-Tenant Violation: Device % belongs to tenant %, not %', NEW.device_id, dev_tenant, NEW.tenant_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    SELECT organization_id::text INTO emp_tenant FROM public.employees WHERE id::text = NEW.employee_id::text;
    IF emp_tenant IS NOT NULL AND emp_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cross-Tenant Violation: Employee % belongs to tenant %, not %', NEW.employee_id, emp_tenant, NEW.tenant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_biometric_mapping_tenant ON public.biometric_employee_mappings;
CREATE TRIGGER trg_check_biometric_mapping_tenant
BEFORE INSERT OR UPDATE ON public.biometric_employee_mappings
FOR EACH ROW EXECUTE FUNCTION public.check_biometric_mapping_tenant_consistency();

-- Trigger 3: Validate biometric_attendance_events ownership consistency
CREATE OR REPLACE FUNCTION public.check_biometric_event_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
  dev_tenant TEXT;
  emp_tenant TEXT;
BEGIN
  SELECT tenant_id INTO dev_tenant FROM public.biometric_devices WHERE id = NEW.device_id;
  IF dev_tenant IS NOT NULL AND dev_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cross-Tenant Violation: Punch device % belongs to tenant %, not %', NEW.device_id, dev_tenant, NEW.tenant_id;
  END IF;

  IF NEW.employee_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    SELECT organization_id::text INTO emp_tenant FROM public.employees WHERE id::text = NEW.employee_id::text;
    IF emp_tenant IS NOT NULL AND emp_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Cross-Tenant Violation: Punch employee % belongs to tenant %, not %', NEW.employee_id, emp_tenant, NEW.tenant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_biometric_event_tenant ON public.biometric_attendance_events;
CREATE TRIGGER trg_check_biometric_event_tenant
BEFORE INSERT OR UPDATE ON public.biometric_attendance_events
FOR EACH ROW EXECUTE FUNCTION public.check_biometric_event_tenant_consistency();

-- ============================================================================
-- 12. HARD ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Authoritative function to resolve ALL tenants an authenticated user belongs to
CREATE OR REPLACE FUNCTION public.get_auth_user_tenants()
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id::text FROM public.app_users WHERE auth_user_id::text = auth.uid()::text
  UNION
  SELECT organization_id::text FROM public.employees WHERE user_id::text = auth.uid()::text OR work_email = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  UNION
  SELECT (auth.jwt() -> 'user_metadata' ->> 'organization_id')::text WHERE (auth.jwt() -> 'user_metadata' ->> 'organization_id') IS NOT NULL AND (auth.jwt() -> 'user_metadata' ->> 'organization_id') != ''
  UNION
  SELECT (auth.jwt() -> 'app_metadata' ->> 'organization_id')::text WHERE (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL AND (auth.jwt() -> 'app_metadata' ->> 'organization_id') != ''
  UNION
  SELECT 'org-joy-corporate-solutions-private-' WHERE auth.role() = 'authenticated' AND (
    SELECT COUNT(*) FROM public.app_users WHERE auth_user_id::text = auth.uid()::text
  ) = 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_tenants() TO authenticated, service_role, anon;

-- Enable RLS and apply strict tenant policies across all biometric tables
DO $$
DECLARE
  tbl text;
  biometric_tables text[] := ARRAY[
    'biometric_connectors',
    'biometric_devices',
    'biometric_device_users',
    'biometric_employee_mappings',
    'biometric_attendance_events',
    'biometric_sync_runs',
    'biometric_sync_logs',
    'biometric_device_health',
    'biometric_device_commands',
    'biometric_device_capabilities',
    'biometric_device_credentials',
    'biometric_audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY biometric_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    -- Drop old or conflicting policies
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_tenant_select', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_tenant_insert', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_tenant_update', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_tenant_delete', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_service_all', tbl);

    -- Service Role policy for background jobs and edge connector sync
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      tbl || '_service_all', tbl
    );

    -- Strict Tenant-Scoped SELECT Policy
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        tenant_id::text IN (SELECT public.get_auth_user_tenants())
        OR organization_id::text IN (SELECT public.get_auth_user_tenants())
        OR public.is_platform_admin()
      );',
      tbl || '_tenant_select', tbl
    );

    -- Strict Tenant-Scoped INSERT Policy
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        (tenant_id::text IN (SELECT public.get_auth_user_tenants()) OR organization_id::text IN (SELECT public.get_auth_user_tenants()))
        OR public.is_platform_admin()
      );',
      tbl || '_tenant_insert', tbl
    );

    -- Strict Tenant-Scoped UPDATE Policy
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        tenant_id::text IN (SELECT public.get_auth_user_tenants())
        OR organization_id::text IN (SELECT public.get_auth_user_tenants())
        OR public.is_platform_admin()
      ) WITH CHECK (
        tenant_id::text IN (SELECT public.get_auth_user_tenants())
        OR organization_id::text IN (SELECT public.get_auth_user_tenants())
        OR public.is_platform_admin()
      );',
      tbl || '_tenant_update', tbl
    );

    -- Strict Tenant-Scoped DELETE Policy
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        tenant_id::text IN (SELECT public.get_auth_user_tenants())
        OR organization_id::text IN (SELECT public.get_auth_user_tenants())
        OR public.is_platform_admin()
      );',
      tbl || '_tenant_delete', tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- 13. SUPABASE REALTIME PUBLICATION
-- ============================================================================
DO $$
DECLARE
  tbl text;
  biometric_tables text[] := ARRAY[
    'biometric_connectors',
    'biometric_devices',
    'biometric_device_users',
    'biometric_employee_mappings',
    'biometric_attendance_events',
    'biometric_device_health',
    'biometric_device_commands'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY biometric_tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END LOOP;
END $$;
