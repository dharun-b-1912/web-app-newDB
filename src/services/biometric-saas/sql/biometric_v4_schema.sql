-- ============================================================================
-- Joy PeopleHR — Biometric Architecture V4 Master Production Database Schema
-- Clock Drift, Multi-Stage EOD Lifecycle, 4-Tier Storage Archival, Event Storm Guard
-- ============================================================================

-- 1. Clock Drift & Authoritative Time Columns on Raw Ingress Table
ALTER TABLE public.biometric_raw_logs ADD COLUMN IF NOT EXISTS device_event_time TIMESTAMPTZ;
ALTER TABLE public.biometric_raw_logs ADD COLUMN IF NOT EXISTS gateway_received_at TIMESTAMPTZ;
ALTER TABLE public.biometric_raw_logs ADD COLUMN IF NOT EXISTS cloud_received_at TIMESTAMPTZ;
ALTER TABLE public.biometric_raw_logs ADD COLUMN IF NOT EXISTS corrected_event_time TIMESTAMPTZ;
ALTER TABLE public.biometric_raw_logs ADD COLUMN IF NOT EXISTS clock_drift_seconds INTEGER DEFAULT 0;
ALTER TABLE public.biometric_raw_logs ADD COLUMN IF NOT EXISTS time_confidence TEXT DEFAULT 'HIGH' CHECK (time_confidence IN ('HIGH', 'NORMAL', 'WARNING', 'DEGRADED', 'CRITICAL_ALERT'));

-- 2. Multi-Stage EOD Attendance Sessions Table
CREATE TABLE IF NOT EXISTS public.eod_attendance_sessions (
    session_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    target_date DATE NOT NULL,
    stage TEXT DEFAULT 'OPEN' CHECK (stage IN ('OPEN', 'PRELIMINARY', 'RECONCILING', 'RECONCILIATION_WINDOW', 'FINALIZED', 'PAYROLL_LOCKED')),
    total_punches_recorded INTEGER DEFAULT 0,
    late_punches_processed INTEGER DEFAULT 0,
    preliminary_closed_at TIMESTAMPTZ,
    reconciliation_window_closes_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    payroll_locked_at TIMESTAMPTZ,
    is_payroll_locked BOOLEAN DEFAULT FALSE,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_eod_date UNIQUE(tenant_id, target_date)
);

-- 3. Payroll Lock Reconciliation Exceptions Table (Gate 17)
CREATE TABLE IF NOT EXISTS public.payroll_reconciliation_exceptions (
    exception_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    target_date DATE NOT NULL,
    employee_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    punch_time TIMESTAMPTZ NOT NULL,
    original_payroll_amount NUMERIC,
    adjusted_payroll_amount NUMERIC,
    status TEXT DEFAULT 'PENDING_HR_APPROVAL' CHECK (status IN ('PENDING_HR_APPROVAL', 'APPROVED_FOR_ARREARS', 'REJECTED')),
    hr_reviewed_by TEXT,
    hr_reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Gateway Capacity & Routing Metrics Registry Table (Gate 9 & 15)
CREATE TABLE IF NOT EXISTS public.gateway_capacity_registry (
    gateway_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    hostname TEXT NOT NULL,
    cpu_percent NUMERIC DEFAULT 0,
    memory_percent NUMERIC DEFAULT 0,
    connected_devices INTEGER DEFAULT 0,
    max_devices INTEGER DEFAULT 15,
    pending_events INTEGER DEFAULT 0,
    sync_latency_ms INTEGER DEFAULT 4,
    health_score NUMERIC DEFAULT 100,
    health_status TEXT DEFAULT 'HEALTHY' CHECK (health_status IN ('HEALTHY', 'DEGRADED', 'OVERLOADED', 'CRITICAL', 'OFFLINE')),
    last_reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 4-Tier Storage Lifecycle & Range-Partition Archive Table (Gate 11)
CREATE TABLE IF NOT EXISTS public.biometric_log_archive_partitions (
    partition_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    tier TEXT DEFAULT 'HOT' CHECK (tier IN ('HOT', 'WARM', 'ARCHIVE', 'PURGED')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    record_count BIGINT DEFAULT 0,
    size_bytes BIGINT DEFAULT 0,
    is_compressed BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Event Storm & Hardware Debounce Quarantine Table (Gate 14)
CREATE TABLE IF NOT EXISTS public.biometric_event_storm_quarantine (
    quarantine_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_serial TEXT NOT NULL,
    spike_burst_count INTEGER NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    action_taken TEXT DEFAULT 'THROTTLED_AND_QUARANTINED',
    payload_sample JSONB
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_eod_sessions_tenant ON public.eod_attendance_sessions(tenant_id, target_date, stage);
CREATE INDEX IF NOT EXISTS idx_payroll_exceptions_tenant ON public.payroll_reconciliation_exceptions(tenant_id, target_date, status);
CREATE INDEX IF NOT EXISTS idx_gateway_capacity_loc ON public.gateway_capacity_registry(tenant_id, location_id, health_status);
CREATE INDEX IF NOT EXISTS idx_log_partitions_tier ON public.biometric_log_archive_partitions(tenant_id, tier, start_date);
CREATE INDEX IF NOT EXISTS idx_event_storm_dev ON public.biometric_event_storm_quarantine(tenant_id, device_id, detected_at DESC);

-- 8. Row Level Security (RLS) Policies
ALTER TABLE public.eod_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_reconciliation_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_capacity_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_log_archive_partitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_event_storm_quarantine ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for eod attendance sessions" ON public.eod_attendance_sessions;
DROP POLICY IF EXISTS "Tenant isolation for payroll reconciliation exceptions" ON public.payroll_reconciliation_exceptions;
DROP POLICY IF EXISTS "Tenant isolation for gateway capacity registry" ON public.gateway_capacity_registry;
DROP POLICY IF EXISTS "Tenant isolation for log archive partitions" ON public.biometric_log_archive_partitions;
DROP POLICY IF EXISTS "Tenant isolation for event storm quarantine" ON public.biometric_event_storm_quarantine;

CREATE POLICY "Tenant isolation for eod attendance sessions"
ON public.eod_attendance_sessions FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for payroll reconciliation exceptions"
ON public.payroll_reconciliation_exceptions FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for gateway capacity registry"
ON public.gateway_capacity_registry FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for log archive partitions"
ON public.biometric_log_archive_partitions FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for event storm quarantine"
ON public.biometric_event_storm_quarantine FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));
