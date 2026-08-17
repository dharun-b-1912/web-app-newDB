-- ============================================================
-- WorkForceOS — Platform Settings, API Keys & Integrations Schema
-- Migration: 20260814_013_platform_settings_and_integrations_schema.sql
-- Resilient & Self-Healing Migration (Handles existing legacy schemas)
-- ============================================================

-- 1. Setting Definitions Registry
CREATE TABLE IF NOT EXISTS public.platform_setting_definitions (
    key VARCHAR(120) PRIMARY KEY,
    category VARCHAR(60) NOT NULL, -- 'general', 'access_security', 'integrations', 'realtime_events', 'operations', 'governance'
    sub_category VARCHAR(60) NOT NULL,
    label VARCHAR(180) NOT NULL,
    description TEXT,
    value_type VARCHAR(40) NOT NULL, -- 'boolean', 'integer', 'decimal', 'string', 'enum', 'json', 'duration', 'rate'
    default_value JSONB NOT NULL,
    allowed_values JSONB, -- For enum or constraints
    validation_schema JSONB, -- JSON Schema for complex values
    scope VARCHAR(40) NOT NULL DEFAULT 'ENVIRONMENT', -- 'GLOBAL', 'ENVIRONMENT', 'TENANT'
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    requires_restart BOOLEAN NOT NULL DEFAULT false,
    requires_confirmation BOOLEAN NOT NULL DEFAULT false,
    documentation_url TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Active Platform Settings (Ensure table & all columns exist)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(120) NOT NULL,
    environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION',
    value JSONB NOT NULL,
    is_overridden BOOLEAN NOT NULL DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    last_modified_by VARCHAR(120) NOT NULL DEFAULT 'Super Admin',
    last_modified_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was created in an older migration without them
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION';
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS is_overridden BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(120) NOT NULL DEFAULT 'Super Admin';
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS last_modified_reason TEXT;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Configuration History & Audit Rollback Ledger
CREATE TABLE IF NOT EXISTS public.platform_config_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(120) NOT NULL,
    environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION',
    version INTEGER NOT NULL,
    old_value JSONB,
    new_value JSONB NOT NULL,
    changed_by VARCHAR(120) NOT NULL,
    reason TEXT,
    request_id VARCHAR(100),
    is_rollback BOOLEAN NOT NULL DEFAULT false,
    rolled_back_from_version INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_config_versions ADD COLUMN IF NOT EXISTS environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION';
ALTER TABLE public.platform_config_versions ADD COLUMN IF NOT EXISTS is_rollback BOOLEAN NOT NULL DEFAULT false;

-- 4. Granular API Key Scopes Registry
CREATE TABLE IF NOT EXISTS public.platform_api_key_scopes (
    scope VARCHAR(80) PRIMARY KEY,
    category VARCHAR(60) NOT NULL,
    label VARCHAR(120) NOT NULL,
    description TEXT,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
    is_admin_only BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Developer API Keys Vault
CREATE TABLE IF NOT EXISTS public.platform_api_keys (
    id TEXT PRIMARY KEY DEFAULT ('key-' || gen_random_uuid()::text),
    name VARCHAR(120) NOT NULL,
    description TEXT,
    key_prefix VARCHAR(30) NOT NULL,
    key_hash VARCHAR(128),
    environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION',
    owner VARCHAR(120) NOT NULL DEFAULT 'Platform Admin',
    organization_id VARCHAR(80),
    tenant_name VARCHAR(120),
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    rate_limit_per_min INTEGER NOT NULL DEFAULT 500,
    burst_limit INTEGER NOT NULL DEFAULT 50,
    concurrency_limit INTEGER NOT NULL DEFAULT 10,
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by VARCHAR(120),
    revocation_reason TEXT,
    created_by VARCHAR(120) NOT NULL DEFAULT 'Super Admin',
    last_used_at TIMESTAMPTZ,
    last_used_ip VARCHAR(60),
    total_requests_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on platform_api_keys
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION';
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS key_hash VARCHAR(128);
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS owner VARCHAR(120) NOT NULL DEFAULT 'Platform Admin';
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS organization_id VARCHAR(80);
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(120);
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS burst_limit INTEGER NOT NULL DEFAULT 50;
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS concurrency_limit INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS revoked_by VARCHAR(120);
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS revocation_reason TEXT;
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS last_used_ip VARCHAR(60);
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS total_requests_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.platform_api_keys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. Platform Integrations & External Providers
CREATE TABLE IF NOT EXISTS public.platform_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type VARCHAR(60) NOT NULL,
    provider_name VARCHAR(80) NOT NULL,
    environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION',
    status VARCHAR(30) NOT NULL DEFAULT 'Configured',
    health_status VARCHAR(30) NOT NULL DEFAULT 'Healthy',
    is_default BOOLEAN NOT NULL DEFAULT true,
    masked_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_health_check_at TIMESTAMPTZ,
    last_test_request_id VARCHAR(100),
    last_latency_ms INTEGER,
    failure_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_by VARCHAR(120) NOT NULL DEFAULT 'Super Admin',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_integrations ADD COLUMN IF NOT EXISTS environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION';
ALTER TABLE public.platform_integrations ADD COLUMN IF NOT EXISTS health_status VARCHAR(30) NOT NULL DEFAULT 'Healthy';
ALTER TABLE public.platform_integrations ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.platform_integrations ADD COLUMN IF NOT EXISTS masked_credentials JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.platform_integrations ADD COLUMN IF NOT EXISTS last_test_request_id VARCHAR(100);
ALTER TABLE public.platform_integrations ADD COLUMN IF NOT EXISTS last_latency_ms INTEGER;
ALTER TABLE public.platform_integrations ADD COLUMN IF NOT EXISTS failure_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00;

-- 7. Platform Maintenance Windows
CREATE TABLE IF NOT EXISTS public.platform_maintenance_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(180) NOT NULL,
    operator_message TEXT NOT NULL,
    environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION',
    is_active BOOLEAN NOT NULL DEFAULT false,
    read_only_mode BOOLEAN NOT NULL DEFAULT false,
    api_read_only BOOLEAN NOT NULL DEFAULT false,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Kolkata (IST)',
    affected_services JSONB NOT NULL DEFAULT '["All Services"]'::jsonb,
    bypass_roles JSONB NOT NULL DEFAULT '["Super Admin"]'::jsonb,
    created_by VARCHAR(120) NOT NULL DEFAULT 'Super Admin',
    activated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_maintenance_windows ADD COLUMN IF NOT EXISTS environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION';
ALTER TABLE public.platform_maintenance_windows ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.platform_maintenance_windows ADD COLUMN IF NOT EXISTS read_only_mode BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.platform_maintenance_windows ADD COLUMN IF NOT EXISTS api_read_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.platform_maintenance_windows ADD COLUMN IF NOT EXISTS timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Kolkata (IST)';
ALTER TABLE public.platform_maintenance_windows ADD COLUMN IF NOT EXISTS affected_services JSONB NOT NULL DEFAULT '["All Services"]'::jsonb;
ALTER TABLE public.platform_maintenance_windows ADD COLUMN IF NOT EXISTS bypass_roles JSONB NOT NULL DEFAULT '["Super Admin"]'::jsonb;

-- 8. Platform Rate Limits & Quotas
CREATE TABLE IF NOT EXISTS public.platform_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type VARCHAR(40) NOT NULL,
    scope_id VARCHAR(120) NOT NULL,
    requests_per_minute INTEGER NOT NULL DEFAULT 600,
    burst_capacity INTEGER NOT NULL DEFAULT 100,
    concurrency_limit INTEGER NOT NULL DEFAULT 20,
    daily_quota BIGINT,
    monthly_quota BIGINT,
    is_custom_override BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes (Safe creation)
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(key);
CREATE INDEX IF NOT EXISTS idx_platform_settings_env ON public.platform_settings(environment);
CREATE INDEX IF NOT EXISTS idx_platform_config_versions_key ON public.platform_config_versions(setting_key, environment);
CREATE INDEX IF NOT EXISTS idx_platform_api_keys_status ON public.platform_api_keys(status, environment);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_env ON public.platform_integrations(environment, provider_type);

-- Safe Realtime Registration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
        EXCEPTION WHEN duplicate_object THEN END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_api_keys;
        EXCEPTION WHEN duplicate_object THEN END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_maintenance_windows;
        EXCEPTION WHEN duplicate_object THEN END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_integrations;
        EXCEPTION WHEN duplicate_object THEN END;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.platform_setting_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_api_key_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_rate_limits ENABLE ROW LEVEL SECURITY;

-- Safe RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Platform Super Admins full access on setting definitions') THEN
        CREATE POLICY "Platform Super Admins full access on setting definitions" ON public.platform_setting_definitions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Platform Super Admins full access on settings') THEN
        CREATE POLICY "Platform Super Admins full access on settings" ON public.platform_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Platform Super Admins full access on config versions') THEN
        CREATE POLICY "Platform Super Admins full access on config versions" ON public.platform_config_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Platform Super Admins full access on api keys') THEN
        CREATE POLICY "Platform Super Admins full access on api keys" ON public.platform_api_keys FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Platform Super Admins full access on integrations') THEN
        CREATE POLICY "Platform Super Admins full access on integrations" ON public.platform_integrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Platform Super Admins full access on maintenance') THEN
        CREATE POLICY "Platform Super Admins full access on maintenance" ON public.platform_maintenance_windows FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Platform Super Admins full access on rate limits') THEN
        CREATE POLICY "Platform Super Admins full access on rate limits" ON public.platform_rate_limits FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Stored Procedure: Update Setting with Versioning
CREATE OR REPLACE FUNCTION public.fn_update_platform_setting(
    p_key VARCHAR,
    p_value JSONB,
    p_environment VARCHAR,
    p_actor VARCHAR,
    p_reason TEXT,
    p_request_id VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_value JSONB;
    v_current_version INTEGER := 1;
    v_new_version INTEGER;
    v_result JSONB;
BEGIN
    SELECT value, version INTO v_old_value, v_current_version
    FROM platform_settings
    WHERE key = p_key AND environment = p_environment;

    IF NOT FOUND THEN
        v_new_version := 1;
        INSERT INTO platform_settings (key, environment, value, version, last_modified_by, last_modified_reason, updated_at)
        VALUES (p_key, p_environment, p_value, 1, p_actor, p_reason, NOW());
    ELSE
        v_new_version := COALESCE(v_current_version, 1) + 1;
        UPDATE platform_settings
        SET value = p_value,
            version = v_new_version,
            is_overridden = true,
            last_modified_by = p_actor,
            last_modified_reason = p_reason,
            updated_at = NOW()
        WHERE key = p_key AND environment = p_environment;
    END IF;

    -- Record in Immutable Config Version Table
    INSERT INTO platform_config_versions (
        setting_key,
        environment,
        version,
        old_value,
        new_value,
        changed_by,
        reason,
        request_id
    ) VALUES (
        p_key,
        p_environment,
        v_new_version,
        v_old_value,
        p_value,
        p_actor,
        p_reason,
        p_request_id
    );

    v_result := jsonb_build_object(
        'success', true,
        'key', p_key,
        'environment', p_environment,
        'version', v_new_version,
        'updated_at', NOW()
    );

    RETURN v_result;
END;
$$;
