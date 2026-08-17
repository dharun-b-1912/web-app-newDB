-- ============================================================
-- WorkForceOS — Platform Settings, API Keys & Integrations Schema
-- Migration: 20260814_013_platform_settings_and_integrations_schema.sql
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

-- 2. Active Platform Settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(120) NOT NULL REFERENCES public.platform_setting_definitions(key) ON DELETE CASCADE,
    environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION', -- 'GLOBAL', 'PRODUCTION', 'STAGING', 'DEVELOPMENT'
    value JSONB NOT NULL,
    is_overridden BOOLEAN NOT NULL DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    last_modified_by VARCHAR(120) NOT NULL DEFAULT 'Super Admin',
    last_modified_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (key, environment)
);

-- 3. Configuration History & Audit Rollback Ledger
CREATE TABLE IF NOT EXISTS public.platform_config_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(120) NOT NULL,
    environment VARCHAR(40) NOT NULL,
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

-- 4. Granular API Key Scopes Registry
CREATE TABLE IF NOT EXISTS public.platform_api_key_scopes (
    scope VARCHAR(80) PRIMARY KEY,
    category VARCHAR(60) NOT NULL,
    label VARCHAR(120) NOT NULL,
    description TEXT,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    is_admin_only BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Developer API Keys Vault (Stores SHA-256 Hashes Only)
CREATE TABLE IF NOT EXISTS public.platform_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    description TEXT,
    key_prefix VARCHAR(30) NOT NULL, -- e.g. 'wk_live_9a2f' or 'wk_test_881b'
    key_hash VARCHAR(128) NOT NULL UNIQUE, -- SHA-256 hex string
    environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION',
    owner VARCHAR(120) NOT NULL,
    organization_id VARCHAR(80),
    tenant_name VARCHAR(120),
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    rate_limit_per_min INTEGER NOT NULL DEFAULT 500,
    burst_limit INTEGER NOT NULL DEFAULT 50,
    concurrency_limit INTEGER NOT NULL DEFAULT 10,
    status VARCHAR(30) NOT NULL DEFAULT 'Active', -- 'Active', 'Revoked', 'Expired'
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by VARCHAR(120),
    revocation_reason TEXT,
    created_by VARCHAR(120) NOT NULL,
    last_used_at TIMESTAMPTZ,
    last_used_ip VARCHAR(60),
    total_requests_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Platform Integrations & External Providers
CREATE TABLE IF NOT EXISTS public.platform_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type VARCHAR(60) NOT NULL, -- 'email', 'sms', 'whatsapp', 'push', 'storage', 'erp', 'siem'
    provider_name VARCHAR(80) NOT NULL, -- e.g. 'SMTP', 'Resend', 'Twilio', 'WhatsApp Cloud API', 'AWS S3'
    environment VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION',
    status VARCHAR(30) NOT NULL DEFAULT 'Configured', -- 'Configured', 'Not Configured', 'Degraded', 'Disabled'
    health_status VARCHAR(30) NOT NULL DEFAULT 'Healthy', -- 'Healthy', 'At Risk', 'Failing', 'Unknown'
    is_default BOOLEAN NOT NULL DEFAULT true,
    masked_credentials JSONB NOT NULL DEFAULT '{}'::jsonb, -- Safe references only
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_health_check_at TIMESTAMPTZ,
    last_test_request_id VARCHAR(100),
    last_latency_ms INTEGER,
    failure_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_by VARCHAR(120) NOT NULL DEFAULT 'Super Admin',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider_name, environment)
);

-- 7. Platform Maintenance Windows & Emergency Controls
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
    created_by VARCHAR(120) NOT NULL,
    activated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Platform Rate Limits & Quotas
CREATE TABLE IF NOT EXISTS public.platform_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type VARCHAR(40) NOT NULL, -- 'GLOBAL', 'ENVIRONMENT', 'TENANT', 'API_KEY'
    scope_id VARCHAR(120) NOT NULL,
    requests_per_minute INTEGER NOT NULL DEFAULT 600,
    burst_capacity INTEGER NOT NULL DEFAULT 100,
    concurrency_limit INTEGER NOT NULL DEFAULT 20,
    daily_quota BIGINT,
    monthly_quota BIGINT,
    is_custom_override BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (scope_type, scope_id)
);

-- Indexes for high throughput performance
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(key);
CREATE INDEX IF NOT EXISTS idx_platform_settings_env ON public.platform_settings(environment);
CREATE INDEX IF NOT EXISTS idx_platform_config_versions_key ON public.platform_config_versions(setting_key, environment);
CREATE INDEX IF NOT EXISTS idx_platform_api_keys_hash ON public.platform_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_platform_api_keys_status ON public.platform_api_keys(status, environment);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_env ON public.platform_integrations(environment, provider_type);

-- Realtime Setup
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_api_keys;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_maintenance_windows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_integrations;

-- Row Level Security (RLS)
ALTER TABLE public.platform_setting_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_api_key_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform Super Admins full access on setting definitions"
    ON public.platform_setting_definitions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Platform Super Admins full access on settings"
    ON public.platform_settings FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Platform Super Admins full access on config versions"
    ON public.platform_config_versions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Platform Super Admins full access on api keys"
    ON public.platform_api_keys FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Platform Super Admins full access on integrations"
    ON public.platform_integrations FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Platform Super Admins full access on maintenance"
    ON public.platform_maintenance_windows FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Platform Super Admins full access on rate limits"
    ON public.platform_rate_limits FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

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
        v_new_version := v_current_version + 1;
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
