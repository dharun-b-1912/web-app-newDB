-- ============================================================================
-- Joy PeopleHR — Enterprise Multi-Tenant & Zero-Loss Biometric Schema V2
-- Safe Idempotent Migration Script (Runs cleanly on new or existing database)
-- ============================================================================

-- 1. Biometric Devices Fleet Table
CREATE TABLE IF NOT EXISTS public.biometric_devices (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL,
    company_id TEXT,
    branch_id TEXT,
    device_name TEXT NOT NULL,
    device_model TEXT NOT NULL DEFAULT 'AI-FACE MAGNUM',
    vendor TEXT NOT NULL DEFAULT 'eSSL',
    serial_number TEXT UNIQUE NOT NULL,
    ip_address INET,
    port INTEGER DEFAULT 4370,
    communication_type TEXT DEFAULT 'EDGE_AGENT' CHECK (communication_type IN ('LAN_POLLING', 'ADMS_PUSH', 'EDGE_AGENT')),
    pairing_key TEXT UNIQUE,
    device_secret_hash TEXT,
    firmware_version TEXT,
    platform TEXT DEFAULT 'ZMM510_TFT',
    capabilities JSONB DEFAULT '{"face": true, "fingerprint": true, "card": true, "password": true, "iris": false}'::jsonb,
    capacity JSONB DEFAULT '{"users": 10000, "faces": 1500, "fingerprints": 5000, "cards": 10000, "attendance_records": 200000}'::jsonb,
    direction_mode TEXT DEFAULT 'AUTO' CHECK (direction_mode IN ('IN', 'OUT', 'AUTO')),
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'degraded', 'no_power', 'syncing')),
    registered_users_count INTEGER DEFAULT 0,
    last_seen_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    last_sync_cursor TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Migration for existing biometric_devices table
ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'ZMM510_TFT';
ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{"face": true, "fingerprint": true, "card": true, "password": true, "iris": false}'::jsonb;
ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS capacity JSONB DEFAULT '{"users": 10000, "faces": 1500, "fingerprints": 5000, "cards": 10000, "attendance_records": 200000}'::jsonb;

-- 2. Biometric Raw Attendance Logs (Layer 1: Immutable Ingress + SHA-256 Idempotency)
CREATE TABLE IF NOT EXISTS public.biometric_raw_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL,
    device_id TEXT NOT NULL REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    device_serial TEXT,
    device_user_id TEXT NOT NULL,
    punch_time TIMESTAMPTZ NOT NULL,
    verification_type TEXT DEFAULT 'FACE' CHECK (verification_type IN ('FACE', 'FINGERPRINT', 'CARD', 'PASSWORD', 'IRIS', 'UNKNOWN')),
    punch_direction TEXT DEFAULT 'AUTO' CHECK (punch_direction IN ('IN', 'OUT', 'AUTO')),
    event_idempotency_key TEXT,
    raw_payload JSONB,
    processed_status TEXT DEFAULT 'PENDING' CHECK (processed_status IN ('PENDING', 'PROCESSED', 'DEDUPLICATED', 'UNRESOLVED_EMPLOYEE', 'FAILED')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_device_punch UNIQUE(device_id, device_user_id, punch_time)
);

-- Safe Migration for existing biometric_raw_logs table
ALTER TABLE public.biometric_raw_logs ADD COLUMN IF NOT EXISTS device_serial TEXT;
ALTER TABLE public.biometric_raw_logs ADD COLUMN IF NOT EXISTS event_idempotency_key TEXT;

-- 3. Gateway Flight Recorder Audit Journal (Local SQLite / Cloud Mirror)
CREATE TABLE IF NOT EXISTS public.biometric_gateway_journal (
    event_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL,
    gateway_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- PUNCH_INGEST, USER_PUSH, ADMIN_UNLOCK, HEALTH_PROBE
    payload_hash TEXT NOT NULL,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'UPLOADING', 'RETRY_PENDING', 'ACKNOWLEDGED', 'SYNCED')),
    retry_count INTEGER DEFAULT 0,
    error_details TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);

-- 4. EOD Worker Checkpoints (Partitioned Batch Shift Processing)
CREATE TABLE IF NOT EXISTS public.biometric_eod_checkpoints (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL,
    target_date DATE NOT NULL,
    partition_key TEXT NOT NULL, -- location_id / branch_id
    total_employees INTEGER DEFAULT 0,
    processed_employees INTEGER DEFAULT 0,
    status TEXT DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_log JSONB,
    CONSTRAINT unique_org_date_partition UNIQUE(organization_id, target_date, partition_key)
);

-- 5. Tenant Resource Isolation & Rate Quotas
CREATE TABLE IF NOT EXISTS public.biometric_tenant_quotas (
    organization_id TEXT PRIMARY KEY,
    api_rate_limit_per_min INTEGER DEFAULT 1200,
    concurrent_eod_workers INTEGER DEFAULT 4,
    max_devices_allowed INTEGER DEFAULT 50,
    offline_queue_quota_mb INTEGER DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. High Performance Multi-Tenant Indexes
CREATE INDEX IF NOT EXISTS idx_biometric_devices_org ON public.biometric_devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_biometric_devices_serial ON public.biometric_devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_biometric_raw_logs_org_status ON public.biometric_raw_logs(organization_id, processed_status);
CREATE INDEX IF NOT EXISTS idx_biometric_raw_logs_idempotency ON public.biometric_raw_logs(event_idempotency_key);
CREATE INDEX IF NOT EXISTS idx_biometric_raw_logs_punch_time ON public.biometric_raw_logs(device_id, punch_time DESC);
CREATE INDEX IF NOT EXISTS idx_biometric_gateway_journal_sync ON public.biometric_gateway_journal(organization_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_biometric_eod_checkpoints_status ON public.biometric_eod_checkpoints(organization_id, target_date, status);

-- 7. Multi-Tenant Row Level Security (RLS)
ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_raw_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_gateway_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_eod_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_tenant_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for biometric devices" ON public.biometric_devices;
DROP POLICY IF EXISTS "Tenant isolation for biometric raw logs" ON public.biometric_raw_logs;
DROP POLICY IF EXISTS "Tenant isolation for biometric gateway journal" ON public.biometric_gateway_journal;
DROP POLICY IF EXISTS "Tenant isolation for biometric eod checkpoints" ON public.biometric_eod_checkpoints;
DROP POLICY IF EXISTS "Tenant isolation for biometric tenant quotas" ON public.biometric_tenant_quotas;

CREATE POLICY "Tenant isolation for biometric devices"
ON public.biometric_devices FOR ALL
USING (organization_id = COALESCE(auth.jwt() ->> 'organization_id', organization_id));

CREATE POLICY "Tenant isolation for biometric raw logs"
ON public.biometric_raw_logs FOR ALL
USING (organization_id = COALESCE(auth.jwt() ->> 'organization_id', organization_id));

CREATE POLICY "Tenant isolation for biometric gateway journal"
ON public.biometric_gateway_journal FOR ALL
USING (organization_id = COALESCE(auth.jwt() ->> 'organization_id', organization_id));

CREATE POLICY "Tenant isolation for biometric eod checkpoints"
ON public.biometric_eod_checkpoints FOR ALL
USING (organization_id = COALESCE(auth.jwt() ->> 'organization_id', organization_id));

CREATE POLICY "Tenant isolation for biometric tenant quotas"
ON public.biometric_tenant_quotas FOR ALL
USING (organization_id = COALESCE(auth.jwt() ->> 'organization_id', organization_id));
