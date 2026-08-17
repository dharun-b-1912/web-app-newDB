-- ==============================================================================
-- WorkForceOS Enterprise HRMS — Integration Control Center & Adapter Framework
-- Migration: 20260814_014_integration_platform_adapter_framework.sql
-- Stack: PostgreSQL 15+ · Supabase Realtime · IoT Biometric Gateway · Sync Fleet
-- ==============================================================================

-- 1. Canonical Integration Adapters Registry
CREATE TABLE IF NOT EXISTS public.integration_adapters (
    id TEXT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    adapter_key VARCHAR(80) NOT NULL UNIQUE,
    category VARCHAR(60) NOT NULL, -- 'Communication', 'Social', 'Workforce', 'Finance', 'HR', 'Storage', 'Developer'
    description TEXT NOT NULL,
    icon_name VARCHAR(60) NOT NULL,
    supported_auth JSONB NOT NULL DEFAULT '["API Key"]'::jsonb,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    doc_url TEXT,
    required_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    optional_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Multi-Tenant Active Integration Connections
CREATE TABLE IF NOT EXISTS public.integration_connections (
    id TEXT PRIMARY KEY DEFAULT ('conn-' || gen_random_uuid()::text),
    adapter_key VARCHAR(80) NOT NULL,
    tenant_id TEXT,
    tenant_name VARCHAR(120),
    environment VARCHAR(40) NOT NULL DEFAULT 'Production',
    status VARCHAR(40) NOT NULL DEFAULT 'Connected', -- 'Connected', 'Healthy', 'Degraded', 'Authentication Required', 'Expired', 'Failed', 'Disabled'
    health_score INTEGER NOT NULL DEFAULT 100,
    auth_type VARCHAR(60) NOT NULL DEFAULT 'API Key',
    masked_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_sync_at TIMESTAMPTZ,
    last_health_check_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    error_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS environment VARCHAR(40) NOT NULL DEFAULT 'Production';
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS health_score INTEGER NOT NULL DEFAULT 100;
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS masked_credentials JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. IoT Biometric Hardware Turnstile Registry
CREATE TABLE IF NOT EXISTS public.integration_devices (
    id TEXT PRIMARY KEY DEFAULT ('dev-' || gen_random_uuid()::text),
    device_id VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    model VARCHAR(80) NOT NULL, -- 'Mantra MFS100', 'eSSL SilkBio-101', 'ZKTeco ProFace X'
    serial_number VARCHAR(100) NOT NULL,
    tenant_id TEXT,
    tenant_name VARCHAR(120),
    location_tag VARCHAR(120) NOT NULL,
    ip_address VARCHAR(60) NOT NULL,
    firmware_version VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Online', -- 'Online', 'Syncing', 'Offline', 'Degraded'
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    total_punches_synced BIGINT NOT NULL DEFAULT 0,
    today_punches_synced INTEGER NOT NULL DEFAULT 0,
    environment VARCHAR(40) NOT NULL DEFAULT 'Production',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integration_devices ADD COLUMN IF NOT EXISTS environment VARCHAR(40) NOT NULL DEFAULT 'Production';
ALTER TABLE public.integration_devices ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.integration_devices ADD COLUMN IF NOT EXISTS total_punches_synced BIGINT NOT NULL DEFAULT 0;

-- 4. Integration Scheduled & Manual Sync Jobs
CREATE TABLE IF NOT EXISTS public.integration_sync_jobs (
    id TEXT PRIMARY KEY DEFAULT ('sync-' || gen_random_uuid()::text),
    adapter_key VARCHAR(80) NOT NULL,
    job_name VARCHAR(140) NOT NULL,
    tenant_id TEXT,
    tenant_name VARCHAR(120),
    direction VARCHAR(30) NOT NULL DEFAULT 'Two-Way', -- 'Inbound', 'Outbound', 'Two-Way'
    status VARCHAR(30) NOT NULL DEFAULT 'Completed', -- 'Completed', 'Running', 'Failed', 'Scheduled', 'Queued'
    records_processed INTEGER NOT NULL DEFAULT 0,
    records_failed INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    cursor_pointer TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    environment VARCHAR(40) NOT NULL DEFAULT 'Production',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integration_sync_jobs ADD COLUMN IF NOT EXISTS environment VARCHAR(40) NOT NULL DEFAULT 'Production';
ALTER TABLE public.integration_sync_jobs ADD COLUMN IF NOT EXISTS duration_ms INTEGER NOT NULL DEFAULT 0;

-- 5. Forensic Integration Request / Delivery Logs
CREATE TABLE IF NOT EXISTS public.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adapter_key VARCHAR(80) NOT NULL,
    integration_name VARCHAR(120) NOT NULL,
    tenant_name VARCHAR(120),
    request_type VARCHAR(40) NOT NULL, -- 'REST API', 'Webhook Inbound', 'Device Push', 'Sync Job', 'OAuth Handshake'
    direction VARCHAR(20) NOT NULL DEFAULT 'Inbound', -- 'Inbound', 'Outbound'
    status VARCHAR(30) NOT NULL DEFAULT 'Success', -- 'Success', 'Failed', 'Timeout', 'Rate Limited'
    http_status INTEGER,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    request_id VARCHAR(100) NOT NULL,
    request_summary TEXT NOT NULL,
    response_excerpt TEXT,
    environment VARCHAR(40) NOT NULL DEFAULT 'Production',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integration_logs ADD COLUMN IF NOT EXISTS environment VARCHAR(40) NOT NULL DEFAULT 'Production';

-- Indexes for scale
CREATE INDEX IF NOT EXISTS idx_integration_connections_adapter ON public.integration_connections(adapter_key, environment);
CREATE INDEX IF NOT EXISTS idx_integration_devices_tenant ON public.integration_devices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_status ON public.integration_sync_jobs(status, environment);
CREATE INDEX IF NOT EXISTS idx_integration_logs_env_created ON public.integration_logs(environment, created_at DESC);

-- Enable RLS (Safe Idempotent Setup)
ALTER TABLE public.integration_adapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins full access on integration_adapters" ON public.integration_adapters;
CREATE POLICY "Platform admins full access on integration_adapters" ON public.integration_adapters FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Platform admins full access on integration_connections" ON public.integration_connections;
CREATE POLICY "Platform admins full access on integration_connections" ON public.integration_connections FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Platform admins full access on integration_devices" ON public.integration_devices;
CREATE POLICY "Platform admins full access on integration_devices" ON public.integration_devices FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Platform admins full access on integration_sync_jobs" ON public.integration_sync_jobs;
CREATE POLICY "Platform admins full access on integration_sync_jobs" ON public.integration_sync_jobs FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Platform admins full access on integration_logs" ON public.integration_logs;
CREATE POLICY "Platform admins full access on integration_logs" ON public.integration_logs FOR ALL TO authenticated USING (true);

-- Safe Realtime Registration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_connections;
        EXCEPTION WHEN duplicate_object THEN END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_devices;
        EXCEPTION WHEN duplicate_object THEN END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_sync_jobs;
        EXCEPTION WHEN duplicate_object THEN END;
    END IF;
END $$;
