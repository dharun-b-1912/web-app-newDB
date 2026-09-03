-- ============================================================================
-- Joy PeopleHR — Biometric Architecture V3 Production Database Schema
-- Multi-Tenant Isolation, Device Leases, Gateway Clustering, DLQ, Emergency Muster
-- ============================================================================

-- 1. Gateway Cluster Nodes
CREATE TABLE IF NOT EXISTS public.gateway_nodes (
    gateway_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    cluster_group_id TEXT NOT NULL DEFAULT 'cluster-default',
    role TEXT DEFAULT 'PRIMARY' CHECK (role IN ('PRIMARY', 'SECONDARY_STANDBY', 'STANDALONE')),
    hostname TEXT,
    local_ip TEXT,
    status TEXT DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'STANDBY', 'OFFLINE')),
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    version TEXT DEFAULT '3.0.0',
    active_leases_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Distributed Device Leases (Leader Election & Dual-Polling Lock)
CREATE TABLE IF NOT EXISTS public.device_gateway_leases (
    device_id TEXT PRIMARY KEY,
    device_serial TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    gateway_id TEXT NOT NULL REFERENCES public.gateway_nodes(gateway_id) ON DELETE CASCADE,
    lease_token TEXT NOT NULL,
    lease_acquired_at TIMESTAMPTZ DEFAULT NOW(),
    lease_expires_at TIMESTAMPTZ NOT NULL,
    heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    is_locked BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Device Sync Cursors (Crash Reconciliation & Historical Replay)
CREATE TABLE IF NOT EXISTS public.device_sync_cursors (
    device_id TEXT PRIMARY KEY,
    device_serial TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    last_event_timestamp TIMESTAMPTZ DEFAULT '1970-01-01 00:00:00+00',
    last_event_hash TEXT,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    total_punches_reconciled BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Gateway Local Event Journal Mirror
CREATE TABLE IF NOT EXISTS public.gateway_event_journal (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    gateway_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_serial TEXT NOT NULL,
    employee_machine_id TEXT,
    event_time TIMESTAMPTZ NOT NULL,
    verification_type TEXT DEFAULT 'FACE',
    event_type TEXT DEFAULT 'AUTO',
    raw_payload JSONB NOT NULL,
    event_hash TEXT UNIQUE NOT NULL,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'UPLOADING', 'ACKNOWLEDGED', 'SYNCED', 'FAILED_RETRY')),
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ,
    error TEXT
);

-- 5. Emergency Muster & Last-Known-Presence Ledger
CREATE TABLE IF NOT EXISTS public.employee_presence_state (
    employee_id TEXT PRIMARY KEY,
    employee_code TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    last_event TEXT DEFAULT 'IN' CHECK (last_event IN ('IN', 'OUT')),
    last_event_time TIMESTAMPTZ NOT NULL,
    device_id TEXT NOT NULL,
    device_serial TEXT NOT NULL,
    status TEXT DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'OUTSIDE', 'UNKNOWN', 'EVACUATED', 'MISSING')),
    department TEXT,
    emergency_contact_phone TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emergency_muster_events (
    muster_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    total_headcount INTEGER DEFAULT 0,
    safe_count INTEGER DEFAULT 0,
    inside_count INTEGER DEFAULT 0,
    missing_count INTEGER DEFAULT 0,
    is_cloud_independent BOOLEAN DEFAULT TRUE,
    ledger_snapshot JSONB
);

-- 6. Asynchronous Device Commands & Dead Letter Queue (DLQ)
CREATE TABLE IF NOT EXISTS public.device_commands (
    command_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_serial TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CREATE_USER', 'DELETE_USER', 'UPDATE_USER', 'PUSH_FACE_TEMPLATE', 'PUSH_FINGERPRINT', 'CLEAR_ADMIN', 'REBOOT_DEVICE', 'WIPE_LOGS')),
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'ASSIGNED', 'PROCESSING', 'SUCCESS', 'FAILED', 'DEAD_LETTER')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_gateway_id TEXT,
    processed_at TIMESTAMPTZ,
    result_payload JSONB,
    dead_letter_reason TEXT
);

-- 7. High Performance Partitioned Indexes
CREATE INDEX IF NOT EXISTS idx_gateway_nodes_tenant ON public.gateway_nodes(tenant_id, location_id);
CREATE INDEX IF NOT EXISTS idx_device_leases_tenant ON public.device_gateway_leases(tenant_id, gateway_id);
CREATE INDEX IF NOT EXISTS idx_sync_cursors_tenant ON public.device_sync_cursors(tenant_id, device_id);
CREATE INDEX IF NOT EXISTS idx_gateway_journal_sync ON public.gateway_event_journal(tenant_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_presence_state_location ON public.employee_presence_state(tenant_id, location_id, status);
CREATE INDEX IF NOT EXISTS idx_device_commands_status ON public.device_commands(tenant_id, status);

-- 8. Row Level Security (RLS) Policies
ALTER TABLE public.gateway_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_gateway_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sync_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_event_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_presence_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_muster_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for gateway nodes" ON public.gateway_nodes;
DROP POLICY IF EXISTS "Tenant isolation for device leases" ON public.device_gateway_leases;
DROP POLICY IF EXISTS "Tenant isolation for sync cursors" ON public.device_sync_cursors;
DROP POLICY IF EXISTS "Tenant isolation for gateway event journal" ON public.gateway_event_journal;
DROP POLICY IF EXISTS "Tenant isolation for presence state" ON public.employee_presence_state;
DROP POLICY IF EXISTS "Tenant isolation for emergency muster" ON public.emergency_muster_events;
DROP POLICY IF EXISTS "Tenant isolation for device commands" ON public.device_commands;

CREATE POLICY "Tenant isolation for gateway nodes"
ON public.gateway_nodes FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for device leases"
ON public.device_gateway_leases FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for sync cursors"
ON public.device_sync_cursors FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for gateway event journal"
ON public.gateway_event_journal FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for presence state"
ON public.employee_presence_state FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for emergency muster"
ON public.emergency_muster_events FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for device commands"
ON public.device_commands FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));
