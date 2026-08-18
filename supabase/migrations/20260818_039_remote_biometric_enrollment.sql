-- supabase/migrations/20260818_039_remote_biometric_enrollment.sql
-- ============================================================================
-- WorkForceOS Real Remote Biometric Enrollment Schema
-- Remote Command Bus → Hardware Terminal Sensor → Cloud Identity Bridge
-- ============================================================================

-- 1. BIOMETRIC ENROLLMENT SESSIONS (Live transaction log of remote enrollment sessions)
CREATE TABLE IF NOT EXISTS biometric_enrollment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64),
    machine_user_id VARCHAR(64) NOT NULL,
    machine_user_uid VARCHAR(64),
    finger_code VARCHAR(32) NOT NULL DEFAULT 'RIGHT_THUMB',
    vendor_finger_index INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED' CHECK (
        status IN (
            'CREATED',
            'VALIDATING',
            'QUEUED',
            'SENT_TO_AGENT',
            'DEVICE_PREPARING',
            'WAITING_FOR_FINGER',
            'CAPTURING',
            'PROCESSING',
            'SUCCESS',
            'FAILED',
            'CANCELLED',
            'TIMEOUT'
        )
    ),
    requested_by VARCHAR(64) NOT NULL DEFAULT 'Administrator',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error_code VARCHAR(64),
    error_message TEXT,
    correlation_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bio_sessions_emp ON biometric_enrollment_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_bio_sessions_dev ON biometric_enrollment_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_bio_sessions_status ON biometric_enrollment_sessions(status);

-- 2. BIOMETRIC ENROLLMENTS (Canonical record of enrolled biometric credentials per employee)
CREATE TABLE IF NOT EXISTS biometric_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    device_user_id VARCHAR(64) NOT NULL,
    device_user_uid VARCHAR(64),
    biometric_type VARCHAR(32) NOT NULL DEFAULT 'FINGERPRINT' CHECK (biometric_type IN ('FINGERPRINT', 'FACE', 'PALM', 'CARD')),
    finger_code VARCHAR(32) NOT NULL DEFAULT 'RIGHT_THUMB',
    vendor_finger_index INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'REVOKED', 'DISABLED')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    enrolled_by VARCHAR(64) NOT NULL DEFAULT 'Administrator',
    device_transaction_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bio_enroll_emp ON biometric_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_bio_enroll_dev ON biometric_enrollments(device_id, device_user_id);

-- 3. RLS POLICIES
ALTER TABLE biometric_enrollment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bio_sessions_org_isolation" ON biometric_enrollment_sessions
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY "bio_enroll_org_isolation" ON biometric_enrollments
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true));
