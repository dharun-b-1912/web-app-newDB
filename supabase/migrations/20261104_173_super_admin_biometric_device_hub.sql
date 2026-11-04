-- ============================================================================
-- Migration: 20261104_173_super_admin_biometric_device_hub.sql
-- Joy PeopleHR — Enterprise Super Admin Biometric Device Management Hub
-- Hybrid Biometric Connector Architecture: Independent Subsystem for Fleet,
-- Configuration, Monitoring, Offline Buffering, Recovery, & Audit.
-- ============================================================================

-- 1. Biometric Connectors (Local Node.js + SQLite Agents)
CREATE TABLE IF NOT EXISTS public.biometric_connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    connector_name VARCHAR(100) NOT NULL,
    connector_token VARCHAR(120) NOT NULL UNIQUE,
    host_ip VARCHAR(50) NOT NULL,
    os_info VARCHAR(100),
    agent_version VARCHAR(30) NOT NULL DEFAULT 'v2.4.1',
    sqlite_status VARCHAR(30) NOT NULL DEFAULT 'HEALTHY' CHECK (sqlite_status IN ('HEALTHY', 'DEGRADED', 'CORRUPT', 'OFFLINE')),
    pending_buffer_count INT NOT NULL DEFAULT 0,
    sync_frequency_sec INT NOT NULL DEFAULT 30,
    status VARCHAR(30) NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'SYNCING', 'ERROR')),
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    site_location VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Biometric Devices Extension (Ensure columns for model-independent adapters)
ALTER TABLE public.biometric_devices
    ADD COLUMN IF NOT EXISTS connector_id UUID REFERENCES public.biometric_connectors(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(50) DEFAULT 'eSSL',
    ADD COLUMN IF NOT EXISTS model_name VARCHAR(50) DEFAULT 'K90 Pro',
    ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(50) DEFAULT 'Ver 6.60 Nov 12 2025',
    ADD COLUMN IF NOT EXISTS connection_mode VARCHAR(30) DEFAULT 'HYBRID' CHECK (connection_mode IN ('PUSH_ADMS', 'PULL_SDK', 'HYBRID', 'DIRECT_LAN')),
    ADD COLUMN IF NOT EXISTS site_name VARCHAR(150) DEFAULT 'Head Office — Coimbatore',
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    ADD COLUMN IF NOT EXISTS log_capacity INT DEFAULT 100000,
    ADD COLUMN IF NOT EXISTS current_log_count INT DEFAULT 14250,
    ADD COLUMN IF NOT EXISTS clock_drift_seconds INT DEFAULT 2,
    ADD COLUMN IF NOT EXISTS ping_latency_ms INT DEFAULT 42,
    ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'SYNCING', 'WARNING', 'DISABLED'));

-- 3. Biometric Raw Events (Immutable audit log of original device payloads)
CREATE TABLE IF NOT EXISTS public.biometric_raw_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    connector_id UUID REFERENCES public.biometric_connectors(id) ON DELETE SET NULL,
    source_event_id VARCHAR(100),
    event_hash VARCHAR(128) NOT NULL,
    device_pin VARCHAR(50) NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    verify_mode VARCHAR(30) DEFAULT 'FINGERPRINT',
    processing_status VARCHAR(30) NOT NULL DEFAULT 'PROCESSED' CHECK (processing_status IN ('PENDING', 'PROCESSED', 'DUPLICATE', 'FAILED', 'UNMAPPED_PIN')),
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    hrms_attendance_id UUID,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, device_id, event_hash)
);

-- 4. Biometric Device Commands Queue (Reboot, Sync Time, Clear Buffer, Push Users)
CREATE TABLE IF NOT EXISTS public.biometric_device_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    command_type VARCHAR(50) NOT NULL CHECK (command_type IN ('REBOOT', 'SYNC_TIME', 'CLEAR_BUFFER', 'PUSH_USERS', 'DIAGNOSTIC_PING', 'FORCE_PULL_LOGS')),
    command_payload JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'EXECUTED', 'FAILED', 'CANCELLED')),
    requested_by VARCHAR(100) DEFAULT 'Platform Super Admin',
    result_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);

-- 5. Biometric Incidents & Error Center
CREATE TABLE IF NOT EXISTS public.biometric_device_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    connector_id UUID REFERENCES public.biometric_connectors(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
    incident_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    suggested_action TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED')),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100)
);

-- 6. Biometric Backups Registry (Layer 1 SQLite, Layer 2 Central Postgres, Layer 3 Vault)
CREATE TABLE IF NOT EXISTS public.biometric_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    backup_type VARCHAR(30) NOT NULL CHECK (backup_type IN ('LOCAL_SQLITE', 'CENTRAL_POSTGRES', 'VAULT_SNAPSHOT')),
    filename VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    checksum VARCHAR(128) NOT NULL,
    record_count INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'FAILED')),
    storage_path TEXT,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. High-performance Indices
CREATE INDEX IF NOT EXISTS idx_biometric_raw_events_org_time 
    ON public.biometric_raw_events(organization_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_biometric_raw_events_device 
    ON public.biometric_raw_events(device_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_biometric_raw_events_status 
    ON public.biometric_raw_events(processing_status);

CREATE INDEX IF NOT EXISTS idx_biometric_commands_device_status 
    ON public.biometric_device_commands(device_id, status);

CREATE INDEX IF NOT EXISTS idx_biometric_incidents_status 
    ON public.biometric_device_incidents(status, severity);

-- 8. Row Level Security for Multi-Tenant & Super Admin
ALTER TABLE public.biometric_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_raw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_device_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bio_connectors_super_admin ON public.biometric_connectors;
CREATE POLICY bio_connectors_super_admin ON public.biometric_connectors FOR ALL USING (true);

DROP POLICY IF EXISTS bio_raw_events_super_admin ON public.biometric_raw_events;
CREATE POLICY bio_raw_events_super_admin ON public.biometric_raw_events FOR ALL USING (true);

DROP POLICY IF EXISTS bio_commands_super_admin ON public.biometric_device_commands;
CREATE POLICY bio_commands_super_admin ON public.biometric_device_commands FOR ALL USING (true);

DROP POLICY IF EXISTS bio_incidents_super_admin ON public.biometric_device_incidents;
CREATE POLICY bio_incidents_super_admin ON public.biometric_device_incidents FOR ALL USING (true);

DROP POLICY IF EXISTS bio_backups_super_admin ON public.biometric_backups;
CREATE POLICY bio_backups_super_admin ON public.biometric_backups FOR ALL USING (true);

