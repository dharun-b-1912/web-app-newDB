-- ============================================================================
-- Migration: 036_enterprise_multitenant_biometrics.sql
-- Description: Enterprise Multi-Tenant Biometric Gateway, Hardware Device Manager,
--              Short-Lived Pairing Tokens, Raw Punches, Intervals & Command Bus
-- ============================================================================

-- 1. SHORT-LIVED PAIRING TOKENS
CREATE TABLE IF NOT EXISTS public.biometric_pairing_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.organization_branches(id) ON DELETE CASCADE,
    pairing_token VARCHAR(64) UNIQUE NOT NULL,
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bio_pairing_tokens_org ON public.biometric_pairing_tokens(organization_id, pairing_token);

-- 2. BIOMETRIC GATEWAY AGENTS (On-Premises Daemons)
CREATE TABLE IF NOT EXISTS public.biometric_gateway_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.organization_branches(id) ON DELETE SET NULL,
    agent_name VARCHAR(120) NOT NULL,
    agent_code VARCHAR(60) NOT NULL,
    agent_secret_hash VARCHAR(255) NOT NULL,
    version VARCHAR(30) NOT NULL DEFAULT '2.4.0-enterprise',
    os_platform VARCHAR(60) NOT NULL DEFAULT 'Linux / Windows',
    local_ip VARCHAR(45) NOT NULL,
    public_ip VARCHAR(45),
    status VARCHAR(30) NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'DEGRADED', 'PENDING_PAIRING')),
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    offline_buffer_count INT NOT NULL DEFAULT 0,
    connected_devices_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(organization_id, agent_code)
);

CREATE INDEX IF NOT EXISTS idx_bio_gateway_agents_org ON public.biometric_gateway_agents(organization_id, branch_id);

-- 3. BIOMETRIC HARDWARE DEVICES
CREATE TABLE IF NOT EXISTS public.biometric_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.organization_branches(id) ON DELETE SET NULL,
    gateway_agent_id UUID REFERENCES public.biometric_gateway_agents(id) ON DELETE SET NULL,
    device_name VARCHAR(120) NOT NULL,
    device_type VARCHAR(60) NOT NULL DEFAULT 'Facial Recognition' CHECK (device_type IN ('Facial Recognition', 'Fingerprint', 'RFID Card', 'Turnstile Gate', 'Iris Scanner', 'Multi-Modal')),
    provider VARCHAR(60) NOT NULL DEFAULT 'ZKTeco' CHECK (provider IN ('ZKTeco', 'Mantra', 'eSSL', 'Suprema', 'Matrix COSEC', 'Hikvision', 'Custom API')),
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    mac_address VARCHAR(30),
    ip_address VARCHAR(45) NOT NULL,
    port INT NOT NULL DEFAULT 4370,
    protocol VARCHAR(30) NOT NULL DEFAULT 'TCP_SOCKET' CHECK (protocol IN ('TCP_SOCKET', 'RD_SERVICE', 'ADMS_PUSH', 'REST_API', 'WEBSOCKET')),
    location_description VARCHAR(255),
    capabilities JSONB NOT NULL DEFAULT '{"supports_realtime": true, "supports_user_sync": true, "supports_time_sync": true, "supports_remote_delete": true}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'Online' CHECK (status IN ('Online', 'Offline', 'Syncing', 'Maintenance', 'Disabled')),
    last_sync TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_event_at TIMESTAMPTZ,
    registered_users_count INT NOT NULL DEFAULT 0,
    sync_frequency_mins INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(organization_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_bio_devices_org ON public.biometric_devices(organization_id, branch_id);

-- 4. EMPLOYEE BIOMETRIC IDENTITY MAPPINGS
CREATE TABLE IF NOT EXISTS public.biometric_user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.biometric_devices(id) ON DELETE SET NULL,
    biometric_pin VARCHAR(64) NOT NULL,
    rfid_card_number VARCHAR(64),
    privilege INT NOT NULL DEFAULT 0, -- 0: User, 14: SuperAdmin
    enrolled_fingerprints_count INT NOT NULL DEFAULT 0,
    has_face_enrolled BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_PUSH')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_synced_at TIMESTAMPTZ,
    UNIQUE(organization_id, device_id, biometric_pin)
);

CREATE INDEX IF NOT EXISTS idx_bio_user_identities_emp ON public.biometric_user_identities(organization_id, employee_id);

-- 5. IMMUTABLE RAW BIOMETRIC PUNCHES (Machine Evidence)
CREATE TABLE IF NOT EXISTS public.biometric_raw_punches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.organization_branches(id) ON DELETE SET NULL,
    device_id UUID REFERENCES public.biometric_devices(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES public.biometric_gateway_agents(id) ON DELETE SET NULL,
    event_id VARCHAR(100) NOT NULL,
    device_event_id VARCHAR(100),
    biometric_pin VARCHAR(64) NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    punch_time TIMESTAMPTZ NOT NULL,
    verification_mode VARCHAR(30) NOT NULL DEFAULT 'Fingerprint' CHECK (verification_mode IN ('Fingerprint', 'Face', 'Card', 'Password', 'Manual')),
    punch_direction VARCHAR(20) NOT NULL DEFAULT 'AUTO' CHECK (punch_direction IN ('IN', 'OUT', 'BREAK_IN', 'BREAK_OUT', 'AUTO')),
    source_type VARCHAR(30) NOT NULL DEFAULT 'LAN_AGENT' CHECK (source_type IN ('LAN_AGENT', 'OFFLINE_BUFFER', 'USB_SCANNER', 'ADMS_PUSH', 'SIMULATOR')),
    dedup_hash VARCHAR(120) NOT NULL,
    processing_status VARCHAR(30) NOT NULL DEFAULT 'PROCESSED' CHECK (processing_status IN ('PROCESSED', 'DUPLICATE', 'UNRESOLVED_EMPLOYEE', 'FAILED')),
    duplicate_of UUID REFERENCES public.biometric_raw_punches(id) ON DELETE SET NULL,
    raw_payload JSONB,
    received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(organization_id, dedup_hash)
);

CREATE INDEX IF NOT EXISTS idx_bio_raw_punches_org_time ON public.biometric_raw_punches(organization_id, punch_time);
CREATE INDEX IF NOT EXISTS idx_bio_raw_punches_emp ON public.biometric_raw_punches(organization_id, employee_id, punch_time);

-- 6. ATTENDANCE PUNCH INTERVALS (Granular Pairs)
CREATE TABLE IF NOT EXISTS public.attendance_intervals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    in_event_id UUID REFERENCES public.biometric_raw_punches(id) ON DELETE SET NULL,
    out_event_id UUID REFERENCES public.biometric_raw_punches(id) ON DELETE SET NULL,
    in_time TIMESTAMPTZ NOT NULL,
    out_time TIMESTAMPTZ,
    duration_minutes INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('OPEN', 'COMPLETED', 'MISSING_OUT', 'ANOMALOUS')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_att_intervals_emp_date ON public.attendance_intervals(organization_id, employee_id, attendance_date);

-- 7. DAILY ATTENDANCE SUMMARIES (Calculation Output with Versioning)
CREATE TABLE IF NOT EXISTS public.attendance_daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    shift_code VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    first_in TIMESTAMPTZ,
    last_out TIMESTAMPTZ,
    gross_work_minutes INT NOT NULL DEFAULT 0,
    break_deduction_minutes INT NOT NULL DEFAULT 0,
    net_work_minutes INT NOT NULL DEFAULT 0,
    late_minutes INT NOT NULL DEFAULT 0,
    early_out_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'MISSING_PUNCH', 'WORK_FROM_HOME', 'ON_DUTY', 'WEEK_OFF', 'HOLIDAY', 'LEAVE', 'ATTENDANCE_EXCEPTION')),
    exception_status VARCHAR(30) NOT NULL DEFAULT 'NONE' CHECK (exception_status IN ('NONE', 'MISSING_OUT', 'INVALID_SEQUENCE', 'POLICY_BREACH', 'REGULARIZATION_PENDING')),
    calculation_version VARCHAR(20) NOT NULL DEFAULT 'ATT-V3',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(organization_id, employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_att_daily_org_date ON public.attendance_daily_summaries(organization_id, attendance_date);

-- 8. ASYNC BIOMETRIC DEVICE COMMAND BUS
CREATE TABLE IF NOT EXISTS public.biometric_device_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.organization_branches(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES public.biometric_gateway_agents(id) ON DELETE SET NULL,
    device_id UUID NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    command_type VARCHAR(60) NOT NULL CHECK (command_type IN ('SYNC_TIME', 'TEST_CONNECTION', 'GET_DEVICE_INFO', 'GET_USER_COUNT', 'SYNC_USERS', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'CLEAR_LOGS', 'REBOOT')),
    payload JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'ACKNOWLEDGED', 'RUNNING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')),
    response_payload JSONB,
    executed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bio_commands_org_status ON public.biometric_device_commands(organization_id, status);

-- 9. DEAD LETTER QUEUE (Failed Raw Ingestion)
CREATE TABLE IF NOT EXISTS public.biometric_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.biometric_devices(id) ON DELETE SET NULL,
    event_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    failure_reason VARCHAR(255) NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'UNRESOLVED' CHECK (status IN ('UNRESOLVED', 'REPROCESSED', 'IGNORED')),
    first_failed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_failed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bio_dlq_org ON public.biometric_dead_letter_queue(organization_id, status);

-- 10. ENABLE RLS POLICIES FOR ALL BIOMETRIC TABLES
ALTER TABLE public.biometric_pairing_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_gateway_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_raw_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation RLS Policies
CREATE POLICY "Tenant isolation for biometric_pairing_tokens" ON public.biometric_pairing_tokens
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Tenant isolation for biometric_gateway_agents" ON public.biometric_gateway_agents
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Tenant isolation for biometric_devices" ON public.biometric_devices
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Tenant isolation for biometric_user_identities" ON public.biometric_user_identities
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Tenant isolation for biometric_raw_punches" ON public.biometric_raw_punches
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Tenant isolation for attendance_intervals" ON public.attendance_intervals
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Tenant isolation for attendance_daily_summaries" ON public.attendance_daily_summaries
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Tenant isolation for biometric_device_commands" ON public.biometric_device_commands
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Tenant isolation for biometric_dead_letter_queue" ON public.biometric_dead_letter_queue
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
