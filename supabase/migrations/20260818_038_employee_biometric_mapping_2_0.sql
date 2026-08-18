-- supabase/migrations/20260818_038_employee_biometric_mapping_2_0.sql
-- ============================================================================
-- WorkForceOS Enterprise Biometric Employee Mapping 2.0 Schema
-- Machine User → Employee Mapping → Real-time Ingestion & Attendance Reprocessing
-- ============================================================================

-- 1. UPGRADE EMPLOYEE BIOMETRIC MAPPINGS
ALTER TABLE IF EXISTS employee_biometric_mappings 
    ADD COLUMN IF NOT EXISTS device_user_uid VARCHAR(64),
    ADD COLUMN IF NOT EXISTS mapping_source VARCHAR(32) NOT NULL DEFAULT 'MANUAL' CHECK (mapping_source IN ('MANUAL', 'AUTO_EXACT_ID', 'AUTO_EXACT_NAME', 'SUGGESTED', 'IMPORTED')),
    ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    ADD COLUMN IF NOT EXISTS unmapped_by VARCHAR(64),
    ADD COLUMN IF NOT EXISTS unmapped_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS conflict_details JSONB;

-- 2. UNRESOLVED BIOMETRIC PUNCHES (Holding table for punches received from unmapped hardware users)
CREATE TABLE IF NOT EXISTS unresolved_biometric_punches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    device_user_id VARCHAR(64) NOT NULL,
    punch_time TIMESTAMPTZ NOT NULL,
    verification_mode VARCHAR(32) NOT NULL DEFAULT 'Fingerprint',
    punch_direction VARCHAR(16) NOT NULL DEFAULT 'AUTO',
    source_type VARCHAR(32) NOT NULL DEFAULT 'LAN_AGENT',
    resolution_status VARCHAR(32) NOT NULL DEFAULT 'UNRESOLVED' CHECK (resolution_status IN ('UNRESOLVED', 'RESOLVED', 'DISCARDED')),
    resolved_employee_id VARCHAR(64),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unresolved_punches_dev_pin ON unresolved_biometric_punches(device_id, device_user_id);
CREATE INDEX IF NOT EXISTS idx_unresolved_punches_status ON unresolved_biometric_punches(resolution_status);

-- 3. RLS POLICIES
ALTER TABLE unresolved_biometric_punches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unresolved_punches_org_isolation" ON unresolved_biometric_punches
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true));
