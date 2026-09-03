-- supabase/migrations/20260902_090_complete_enterprise_biometrics_and_identity_mesh.sql
-- ============================================================================
-- Joy PeopleHR — Complete Enterprise Multi-Tenant Biometric & Identity Mesh Schema
-- Zero Hardcoding, Strict RLS Isolation, High-Throughput Indexes, Hardware Audits
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. BIOMETRIC GATEWAY AGENTS (LAN Gateways / Outbound Edge Daemons)
-- ============================================================================
CREATE TABLE IF NOT EXISTS biometric_gateway_agents (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64),
    branch_name VARCHAR(255) NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    pairing_key VARCHAR(128) NOT NULL,
    version VARCHAR(32) NOT NULL DEFAULT '2.5.0-enterprise',
    os_platform VARCHAR(64) NOT NULL DEFAULT 'Windows / Linux',
    local_ip VARCHAR(64) NOT NULL,
    public_ip VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAIRING' CHECK (status IN ('ONLINE', 'OFFLINE', 'DEGRADED', 'PENDING_PAIRING')),
    last_heartbeat TIMESTAMPTZ,
    offline_buffer_count INT NOT NULL DEFAULT 0,
    connected_devices_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bga_org_branch ON biometric_gateway_agents(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_bga_status ON biometric_gateway_agents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_bga_pairing ON biometric_gateway_agents(pairing_key);

-- ============================================================================
-- 2. BIOMETRIC DEVICES (Physical & Virtual Attendance Terminals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS biometric_devices (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64),
    branch VARCHAR(255) NOT NULL DEFAULT 'Main Office',
    gateway_agent_id VARCHAR(64) REFERENCES biometric_gateway_agents(id) ON DELETE SET NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(64) NOT NULL DEFAULT 'Multi-Modal' CHECK (device_type IN ('Facial Recognition', 'Fingerprint', 'RFID Card', 'Turnstile Gate', 'Iris Scanner', 'Multi-Modal')),
    vendor VARCHAR(64) NOT NULL DEFAULT 'eSSL' CHECK (vendor IN ('eSSL', 'ZKTeco', 'Mantra', 'Suprema', 'Matrix COSEC', 'Hikvision', 'Realtime', 'Anviz')),
    model VARCHAR(128) NOT NULL DEFAULT 'AI-FACE MAGNUM',
    serial_number VARCHAR(128) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    port INT NOT NULL DEFAULT 4370,
    comm_key VARCHAR(64) NOT NULL DEFAULT '123456',
    location_description VARCHAR(255) NOT NULL DEFAULT 'Entrance',
    direction_mode VARCHAR(32) NOT NULL DEFAULT 'BOTH' CHECK (direction_mode IN ('IN', 'OUT', 'BOTH')),
    status VARCHAR(32) NOT NULL DEFAULT 'Online' CHECK (status IN ('Online', 'Offline', 'Degraded', 'No Power', 'Auth Failed', 'Disabled')),
    registered_users_count INT NOT NULL DEFAULT 0,
    fingerprint_count INT NOT NULL DEFAULT 0,
    face_count INT NOT NULL DEFAULT 0,
    latency_ms INT NOT NULL DEFAULT 0,
    firmware_version VARCHAR(64) NOT NULL DEFAULT 'Ver 8.6.2_AI',
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
    last_sync TIMESTAMPTZ,
    last_health_check TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_device_hardware_org UNIQUE (organization_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_bio_dev_org ON biometric_devices(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_bio_dev_status ON biometric_devices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_bio_dev_ip ON biometric_devices(ip_address, port);

-- ============================================================================
-- 3. BIOMETRIC DEVICE USERS (Machine Users in Terminal Flash RAM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS biometric_device_users (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64),
    device_id VARCHAR(64) NOT NULL REFERENCES biometric_devices(id) ON DELETE CASCADE,
    device_user_uid VARCHAR(64),
    device_user_id VARCHAR(64) NOT NULL, -- Machine PIN (e.g. 17, 27, 154)
    name VARCHAR(255) NOT NULL,
    privilege VARCHAR(32) NOT NULL DEFAULT 'USER' CHECK (privilege IN ('USER', 'ADMIN', 'SUPERADMIN', 'ENROLLER')),
    password_configured BOOLEAN NOT NULL DEFAULT false,
    card_number VARCHAR(64),
    group_id VARCHAR(64) NOT NULL DEFAULT '1',
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    user_group VARCHAR(64) NOT NULL DEFAULT 'Default Group',
    enabled BOOLEAN NOT NULL DEFAULT true,
    fingerprint_count INT DEFAULT 0,
    face_count INT DEFAULT 0,
    face_enrolled BOOLEAN DEFAULT false,
    palm_enrolled BOOLEAN DEFAULT false,
    iris_enrolled BOOLEAN DEFAULT false,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_status VARCHAR(32) NOT NULL DEFAULT 'SYNCED' CHECK (sync_status IN ('SYNCED', 'PENDING_PUSH', 'NOT_PRESENT_ON_DEVICE', 'ERROR', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bio_device_pin UNIQUE (organization_id, device_id, device_user_id)
);

CREATE INDEX IF NOT EXISTS idx_bdu_org_dev ON biometric_device_users(organization_id, device_id);
CREATE INDEX IF NOT EXISTS idx_bdu_pin ON biometric_device_users(organization_id, device_user_id);
CREATE INDEX IF NOT EXISTS idx_bdu_sync ON biometric_device_users(sync_status);

-- ============================================================================
-- 4. EMPLOYEE BIOMETRIC MAPPINGS (Canonical Bridge: Machine PIN -> Employee)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_biometric_mappings (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64),
    employee_id VARCHAR(64) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    employee_code VARCHAR(64) NOT NULL,
    department VARCHAR(128),
    designation VARCHAR(128),
    device_id VARCHAR(64) NOT NULL REFERENCES biometric_devices(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    device_user_id VARCHAR(64) NOT NULL, -- Machine PIN
    device_user_uid VARCHAR(64),
    mapping_status VARCHAR(32) NOT NULL DEFAULT 'MAPPED' CHECK (mapping_status IN ('UNMAPPED', 'MAPPED', 'CONFLICT', 'DISABLED', 'PENDING_REVIEW')),
    mapping_source VARCHAR(32) NOT NULL DEFAULT 'MANUAL' CHECK (mapping_source IN ('MANUAL', 'AUTO_EXACT_ID', 'AUTO_EXACT_NAME', 'SUGGESTED', 'IMPORTED')),
    confidence_score INT NOT NULL DEFAULT 100,
    mapped_by VARCHAR(255) NOT NULL DEFAULT 'Administrator',
    mapped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unmapped_by VARCHAR(255),
    unmapped_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ebm_org_dev_pin UNIQUE (organization_id, device_id, device_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ebm_org_emp ON employee_biometric_mappings(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_ebm_org_dev_pin ON employee_biometric_mappings(organization_id, device_id, device_user_id);
CREATE INDEX IF NOT EXISTS idx_ebm_status ON employee_biometric_mappings(organization_id, mapping_status);

-- ============================================================================
-- 5. BIOMETRIC ENROLLMENTS (Permanent Biometric Template Credentials)
-- ============================================================================
CREATE TABLE IF NOT EXISTS biometric_enrollments (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64),
    employee_id VARCHAR(64) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    employee_code VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL REFERENCES biometric_devices(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    device_user_id VARCHAR(64) NOT NULL,
    device_user_uid VARCHAR(64),
    biometric_type VARCHAR(32) NOT NULL CHECK (biometric_type IN ('FINGERPRINT', 'FACE', 'PALM', 'CARD', 'IRIS')),
    finger_code VARCHAR(32),
    vendor_finger_index INT DEFAULT 0,
    card_number VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'REVOKED', 'DISABLED', 'PENDING')),
    enrolled_by VARCHAR(255) NOT NULL DEFAULT 'HR Administrator',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bio_enr_org_emp ON biometric_enrollments(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_bio_enr_dev_pin ON biometric_enrollments(organization_id, device_id, device_user_id);
CREATE INDEX IF NOT EXISTS idx_bio_enr_type ON biometric_enrollments(organization_id, biometric_type, status);

-- ============================================================================
-- 6. BIOMETRIC ENROLLMENT SESSIONS (Interactive Remote Sensor Orchestrator)
-- ============================================================================
CREATE TABLE IF NOT EXISTS biometric_enrollment_sessions (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64),
    employee_id VARCHAR(64) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    employee_code VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL REFERENCES biometric_devices(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    machine_user_id VARCHAR(64) NOT NULL,
    machine_user_uid VARCHAR(64),
    biometric_type VARCHAR(32) NOT NULL DEFAULT 'FINGERPRINT' CHECK (biometric_type IN ('FINGERPRINT', 'FACE', 'PALM', 'CARD')),
    finger_code VARCHAR(32) NOT NULL DEFAULT 'RIGHT_INDEX',
    vendor_finger_index INT NOT NULL DEFAULT 6,
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'VALIDATING', 'QUEUED', 'SENT_TO_AGENT', 'CONNECTING_TO_DEVICE', 'DEVICE_PREPARING', 'WAITING_FOR_FINGER', 'CAPTURING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'TIMEOUT')),
    progress_step INT NOT NULL DEFAULT 0,
    total_steps INT NOT NULL DEFAULT 3,
    message TEXT NOT NULL DEFAULT 'Session created',
    requested_by VARCHAR(255) NOT NULL DEFAULT 'Administrator',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error_code VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bes_org_status ON biometric_enrollment_sessions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_bes_dev_pin ON biometric_enrollment_sessions(device_id, machine_user_id);

-- ============================================================================
-- 7. RAW BIOMETRIC PUNCHES (Live Hardware Attendance Telemetry Logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS biometric_raw_punches (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL REFERENCES biometric_devices(id) ON DELETE CASCADE,
    device_serial VARCHAR(128) NOT NULL,
    device_name VARCHAR(255),
    biometric_pin VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64),
    employee_name VARCHAR(255),
    punch_time TIMESTAMPTZ NOT NULL,
    verification_mode VARCHAR(32) NOT NULL DEFAULT 'Manual' CHECK (verification_mode IN ('Fingerprint', 'Face', 'Card', 'Manual', 'Password', 'Palm', 'Iris')),
    verify_code INT DEFAULT 0,
    punch_direction VARCHAR(16) NOT NULL DEFAULT 'AUTO' CHECK (punch_direction IN ('IN', 'OUT', 'AUTO')),
    source_type VARCHAR(32) NOT NULL DEFAULT 'LAN_AGENT' CHECK (source_type IN ('LAN_AGENT', 'OFFLINE_BUFFER', 'USB_SCANNER', 'SIMULATOR', 'ADMS_PUSH')),
    dedup_hash VARCHAR(128) NOT NULL,
    card_number VARCHAR(64),
    processed_status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED' CHECK (processed_status IN ('PROCESSED', 'DEDUPLICATED_IGNORED', 'UNRESOLVED_PIN', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_raw_punch_hash UNIQUE (organization_id, dedup_hash)
);

CREATE INDEX IF NOT EXISTS idx_brp_org_time ON biometric_raw_punches(organization_id, punch_time DESC);
CREATE INDEX IF NOT EXISTS idx_brp_org_pin ON biometric_raw_punches(organization_id, biometric_pin);
CREATE INDEX IF NOT EXISTS idx_brp_org_emp ON biometric_raw_punches(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_brp_dev ON biometric_raw_punches(device_id, punch_time DESC);

-- ============================================================================
-- 8. BIOMETRIC DIAGNOSTIC LOGS (Real-Time Forensic Engine)
-- ============================================================================
CREATE TABLE IF NOT EXISTS biometric_diagnostic_logs (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    category VARCHAR(32) NOT NULL CHECK (category IN ('TCP_SOCKET', 'PUNCH_INGESTION', 'DEVICE_COMMAND', 'AGENT_HEARTBEAT', 'CRASH_ERROR')),
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('INFO', 'WARN', 'ERROR', 'CRASH')),
    device_id VARCHAR(64),
    device_name VARCHAR(255),
    agent_id VARCHAR(64),
    ip_address VARCHAR(64),
    port INT,
    message TEXT NOT NULL,
    error_code VARCHAR(64),
    stack_trace TEXT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bdl_org_time ON biometric_diagnostic_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bdl_dev ON biometric_diagnostic_logs(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bdl_sev ON biometric_diagnostic_logs(organization_id, severity);

-- ============================================================================
-- 9. DYNAMIC MULTI-TENANT ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE biometric_gateway_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_device_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_biometric_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_enrollment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_raw_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_diagnostic_logs ENABLE ROW LEVEL SECURITY;

-- Dynamic Tenant Context Resolver Function
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_organization_id', true),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id'),
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id'),
        'org-joy-corporate-solutions-private-'
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Apply RLS Across All Tables (Zero hardcoding)
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'biometric_gateway_agents',
        'biometric_devices',
        'biometric_device_users',
        'employee_biometric_mappings',
        'biometric_enrollments',
        'biometric_enrollment_sessions',
        'biometric_raw_punches',
        'biometric_diagnostic_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', tbl);
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON %I
            FOR ALL
            USING (organization_id = get_current_tenant_id() OR organization_id IS NULL)
            WITH CHECK (organization_id = get_current_tenant_id());
        ', tbl);
    END LOOP;
END;
$$;

-- ============================================================================
-- 10. REAL-TIME CHANGE TRIGGER FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_biometric_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'biometric_gateway_agents',
        'biometric_devices',
        'biometric_device_users',
        'employee_biometric_mappings',
        'biometric_enrollments',
        'biometric_enrollment_sessions'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_update_timestamp ON %I', tbl);
        EXECUTE format('
            CREATE TRIGGER trg_update_timestamp
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_biometric_timestamp();
        ', tbl);
    END LOOP;
END;
$$;

-- ============================================================================
-- 11. SUPABASE REALTIME REPLICATION (Zero Latency Live WebSocket Streaming)
-- ============================================================================
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'biometric_gateway_agents',
        'biometric_devices',
        'biometric_device_users',
        'employee_biometric_mappings',
        'biometric_enrollments',
        'biometric_enrollment_sessions',
        'biometric_raw_punches',
        'biometric_diagnostic_logs'
    ];
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add biometric tables to realtime publication
    FOREACH tbl IN ARRAY tables LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Table is already in publication, continue
                NULL;
        END;
    END LOOP;
END;
$$;

