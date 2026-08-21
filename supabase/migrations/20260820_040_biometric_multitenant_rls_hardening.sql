-- supabase/migrations/20260820_040_biometric_multitenant_rls_hardening.sql
-- ============================================================================
-- WorkForceOS — Enterprise Multi-Tenant Biometric Gateway, Commands & RLS Schema
-- 100% Idempotent: Creates tables if missing, adds compound indices & RLS policies
-- ============================================================================

-- 1. BIOMETRIC GATEWAY AGENTS (On-Premises Daemons)
CREATE TABLE IF NOT EXISTS public.biometric_gateway_agents (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    branch_name TEXT NOT NULL DEFAULT 'Main Campus',
    agent_name TEXT NOT NULL,
    pairing_key TEXT,
    version TEXT NOT NULL DEFAULT '2.4.0-enterprise',
    os_platform TEXT NOT NULL DEFAULT 'Linux / Windows',
    local_ip TEXT NOT NULL DEFAULT '127.0.0.1',
    public_ip TEXT,
    status TEXT NOT NULL DEFAULT 'ONLINE',
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    offline_buffer_count INT NOT NULL DEFAULT 0,
    connected_devices_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. BIOMETRIC HARDWARE DEVICES (ZKTeco, Mantra, eSSL, Suprema)
CREATE TABLE IF NOT EXISTS public.biometric_devices (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    gateway_agent_id TEXT,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'Fingerprint',
    vendor TEXT NOT NULL DEFAULT 'ZKTeco',
    model TEXT NOT NULL DEFAULT 'K2000 (ZLM60_TFT)',
    serial_number TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    port INT NOT NULL DEFAULT 4370,
    branch TEXT NOT NULL DEFAULT 'Main Branch',
    location_description TEXT,
    status TEXT NOT NULL DEFAULT 'Online',
    registered_users_count INT NOT NULL DEFAULT 0,
    sync_frequency_mins INT NOT NULL DEFAULT 1,
    last_sync TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. ASYNC BIOMETRIC DEVICE COMMAND BUS
CREATE TABLE IF NOT EXISTS public.biometric_device_commands (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    branch_id TEXT,
    agent_id TEXT,
    device_id TEXT NOT NULL,
    device_name TEXT,
    command_type TEXT NOT NULL,
    payload JSONB,
    created_by TEXT NOT NULL DEFAULT 'HR Admin',
    status TEXT NOT NULL DEFAULT 'QUEUED',
    response_payload JSONB,
    executed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. BIOMETRIC RAW INGESTION PUNCHES
CREATE TABLE IF NOT EXISTS public.biometric_raw_punches (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    device_id TEXT NOT NULL,
    device_serial TEXT,
    device_name TEXT,
    biometric_pin TEXT NOT NULL,
    employee_id TEXT,
    employee_name TEXT,
    punch_time TIMESTAMPTZ NOT NULL,
    verification_mode TEXT NOT NULL DEFAULT 'Fingerprint',
    punch_direction TEXT NOT NULL DEFAULT 'AUTO',
    source_type TEXT NOT NULL DEFAULT 'LAN_AGENT',
    dedup_hash TEXT UNIQUE NOT NULL,
    processed_status TEXT NOT NULL DEFAULT 'PROCESSED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. BIOMETRIC DIAGNOSTIC & CRASH LOGS
CREATE TABLE IF NOT EXISTS public.biometric_diagnostic_logs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    device_id TEXT,
    device_name TEXT,
    agent_id TEXT,
    category TEXT NOT NULL DEFAULT 'TCP_SOCKET',
    severity TEXT NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL,
    ip_address TEXT,
    port INT,
    error_code TEXT,
    stack_trace TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. COMPOUND INDICES FOR MULTI-TENANT QUERY ACCELERATION
CREATE INDEX IF NOT EXISTS idx_bio_devices_org_status ON public.biometric_devices (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_bio_devices_org_serial ON public.biometric_devices (organization_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_bio_agents_org_heartbeat ON public.biometric_gateway_agents (organization_id, last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_bio_commands_org_status ON public.biometric_device_commands (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bio_punches_org_time ON public.biometric_raw_punches (organization_id, punch_time DESC);
CREATE INDEX IF NOT EXISTS idx_bio_punches_org_dedup ON public.biometric_raw_punches (organization_id, dedup_hash);
CREATE INDEX IF NOT EXISTS idx_bio_diagnostic_org_time ON public.biometric_diagnostic_logs (organization_id, timestamp DESC);

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_gateway_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_raw_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_diagnostic_logs ENABLE ROW LEVEL SECURITY;

-- 8. TENANT ISOLATION POLICIES
DO $$ 
BEGIN
  -- biometric_devices policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'biometric_devices' AND policyname = 'biometric_devices_tenant_isolation'
  ) THEN
    CREATE POLICY biometric_devices_tenant_isolation ON public.biometric_devices
      FOR ALL
      USING (
        organization_id = COALESCE(
          (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id')::text,
          (current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id')::text,
          'org-joy-01'
        )
      );
  END IF;

  -- biometric_gateway_agents policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'biometric_gateway_agents' AND policyname = 'biometric_agents_tenant_isolation'
  ) THEN
    CREATE POLICY biometric_agents_tenant_isolation ON public.biometric_gateway_agents
      FOR ALL
      USING (
        organization_id = COALESCE(
          (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id')::text,
          (current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id')::text,
          'org-joy-01'
        )
      );
  END IF;

  -- biometric_device_commands policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'biometric_device_commands' AND policyname = 'biometric_commands_tenant_isolation'
  ) THEN
    CREATE POLICY biometric_commands_tenant_isolation ON public.biometric_device_commands
      FOR ALL
      USING (
        organization_id = COALESCE(
          (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id')::text,
          (current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id')::text,
          'org-joy-01'
        )
      );
  END IF;

  -- biometric_raw_punches policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'biometric_raw_punches' AND policyname = 'biometric_punches_tenant_isolation'
  ) THEN
    CREATE POLICY biometric_punches_tenant_isolation ON public.biometric_raw_punches
      FOR ALL
      USING (
        organization_id = COALESCE(
          (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id')::text,
          (current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id')::text,
          'org-joy-01'
        )
      );
  END IF;

  -- biometric_diagnostic_logs policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'biometric_diagnostic_logs' AND policyname = 'biometric_logs_tenant_isolation'
  ) THEN
    CREATE POLICY biometric_logs_tenant_isolation ON public.biometric_diagnostic_logs
      FOR ALL
      USING (
        organization_id = COALESCE(
          (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id')::text,
          (current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id')::text,
          'org-joy-01'
        )
      );
  END IF;
END $$;
