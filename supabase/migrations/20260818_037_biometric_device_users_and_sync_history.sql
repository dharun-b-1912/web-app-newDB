-- supabase/migrations/20260818_037_biometric_device_users_and_sync_history.sql
-- ============================================================================
-- WorkForceOS Enterprise Biometric Device Users, Mappings & Sync History Schema
-- Complete Machine User Separation, Metadata Preservation & RLS
-- ============================================================================

-- 1. BIOMETRIC DEVICE USERS (Raw hardware machine-user records synced from physical terminals)
CREATE TABLE IF NOT EXISTS biometric_device_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    device_user_uid VARCHAR(64),
    device_user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    privilege VARCHAR(32) NOT NULL DEFAULT 'USER' CHECK (privilege IN ('USER', 'ADMIN', 'SUPERADMIN', 'ENROLLER')),
    password_configured BOOLEAN NOT NULL DEFAULT false,
    card_number VARCHAR(64),
    group_id VARCHAR(64),
    timezone VARCHAR(64),
    user_group VARCHAR(64),
    enabled BOOLEAN NOT NULL DEFAULT true,
    fingerprint_count INT,
    face_count INT,
    face_enrolled BOOLEAN,
    palm_enrolled BOOLEAN,
    iris_enrolled BOOLEAN,
    raw_capabilities JSONB,
    device_created_at TIMESTAMPTZ,
    device_updated_at TIMESTAMPTZ,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED' CHECK (sync_status IN ('SYNCED', 'PENDING_PUSH', 'NOT_PRESENT_ON_DEVICE', 'ERROR', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_device_user_identity UNIQUE (organization_id, device_id, device_user_id)
);

CREATE INDEX IF NOT EXISTS idx_bio_device_users_org ON biometric_device_users(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_bio_device_users_device ON biometric_device_users(device_id);
CREATE INDEX IF NOT EXISTS idx_bio_device_users_pin ON biometric_device_users(device_user_id);
CREATE INDEX IF NOT EXISTS idx_bio_device_users_status ON biometric_device_users(sync_status);

-- 2. EMPLOYEE BIOMETRIC MAPPINGS (Explicit association between machine user and canonical employee)
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

-- 3. BIOMETRIC USER SYNCS (Full audit trail and snapshots of device synchronization jobs)
CREATE TABLE IF NOT EXISTS biometric_user_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64),
    command_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    total_fetched INT NOT NULL DEFAULT 0,
    created_count INT NOT NULL DEFAULT 0,
    updated_count INT NOT NULL DEFAULT 0,
    unchanged_count INT NOT NULL DEFAULT 0,
    removed_count INT NOT NULL DEFAULT 0,
    unmapped_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    duration_seconds NUMERIC(8, 2) DEFAULT 0,
    requested_by VARCHAR(64) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_syncs_device ON biometric_user_syncs(organization_id, device_id);
CREATE INDEX IF NOT EXISTS idx_user_syncs_status ON biometric_user_syncs(status);

-- 4. BIOMETRIC DEVICE USER HISTORY (Audit log of field changes on machine users over time)
CREATE TABLE IF NOT EXISTS biometric_device_user_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    device_user_id VARCHAR(64) NOT NULL,
    change_type VARCHAR(64) NOT NULL,
    field_name VARCHAR(64),
    old_value TEXT,
    new_value TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_user_history_pin ON biometric_device_user_history(device_id, device_user_id);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE biometric_device_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_biometric_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_user_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_device_user_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY bio_device_users_tenant_isolation ON biometric_device_users
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true))
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY emp_bio_mappings_tenant_isolation ON employee_biometric_mappings
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true))
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY bio_user_syncs_tenant_isolation ON biometric_user_syncs
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true))
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY bio_user_history_tenant_isolation ON biometric_device_user_history
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true))
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true));
