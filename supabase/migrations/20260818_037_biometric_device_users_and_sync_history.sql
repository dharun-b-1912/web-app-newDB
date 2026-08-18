-- supabase/migrations/20260818_037_biometric_device_users_and_sync_history.sql
-- ============================================================================
-- WorkForceOS Enterprise Biometric Device Users, Mappings & Sync History Schema
-- Strictly Tenant & Branch Scoped, Realtime Enabled with RLS
-- ============================================================================

-- 1. BIOMETRIC DEVICE USERS (Raw hardware user records synced from physical terminals)
CREATE TABLE IF NOT EXISTS biometric_device_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    device_user_id VARCHAR(64) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    privilege VARCHAR(32) NOT NULL DEFAULT 'USER' CHECK (privilege IN ('USER', 'ADMIN', 'SUPERADMIN', 'ENROLLER')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    card_number VARCHAR(64),
    password_present BOOLEAN NOT NULL DEFAULT false,
    fingerprint_count INT NOT NULL DEFAULT 0,
    face_enrolled BOOLEAN NOT NULL DEFAULT false,
    device_created_at TIMESTAMPTZ,
    device_updated_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED' CHECK (sync_status IN ('SYNCED', 'PENDING_PUSH', 'NOT_PRESENT_ON_DEVICE', 'ERROR')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_device_user_identity UNIQUE (organization_id, device_id, device_user_id)
);

CREATE INDEX IF NOT EXISTS idx_bio_device_users_org ON biometric_device_users(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_bio_device_users_device ON biometric_device_users(device_id);
CREATE INDEX IF NOT EXISTS idx_bio_device_users_pin ON biometric_device_users(device_user_id);

-- 2. EMPLOYEE BIOMETRIC MAPPINGS (Associates hardware PIN with WorkForceOS employee profiles)
CREATE TABLE IF NOT EXISTS employee_biometric_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    device_user_id VARCHAR(64) NOT NULL,
    mapping_status VARCHAR(32) NOT NULL DEFAULT 'MAPPED' CHECK (mapping_status IN ('UNMAPPED', 'MAPPED', 'CONFLICT', 'DISABLED')),
    mapped_by VARCHAR(64),
    mapped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_emp_device_mapping UNIQUE (organization_id, device_id, device_user_id)
);

CREATE INDEX IF NOT EXISTS idx_emp_bio_mappings_emp ON employee_biometric_mappings(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_bio_mappings_dev_user ON employee_biometric_mappings(device_id, device_user_id);

-- 3. DEVICE USER SYNC HISTORY (Audit trail of every user synchronization job)
CREATE TABLE IF NOT EXISTS device_user_sync_history (
    sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64),
    command_id VARCHAR(64) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    requested_by VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED')),
    fetched_count INT NOT NULL DEFAULT 0,
    created_count INT NOT NULL DEFAULT 0,
    updated_count INT NOT NULL DEFAULT 0,
    unchanged_count INT NOT NULL DEFAULT 0,
    unmapped_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    duration_seconds NUMERIC(8, 2) DEFAULT 0,
    error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_history_device ON device_user_sync_history(organization_id, device_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON device_user_sync_history(status);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE biometric_device_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_biometric_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_user_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY biometric_device_users_tenant_isolation ON biometric_device_users
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true))
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY employee_biometric_mappings_tenant_isolation ON employee_biometric_mappings
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true))
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY device_user_sync_history_tenant_isolation ON device_user_sync_history
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true))
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true));
