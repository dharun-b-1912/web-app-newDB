-- ============================================================================
-- Joy PeopleHR — Biometric Architecture V5 Master Production Database Schema
-- Observability Tracing, Cryptographic Audit Ledger, Predictive Health,
-- Zero-Trust Identity, Command Approvals & Global Command Center
-- ============================================================================

-- 1. Distributed Immutable Audit Ledger Table (Gate 20)
CREATE TABLE IF NOT EXISTS public.biometric_audit_ledger (
    audit_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    actor_ip TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('DEVICE_CONFIG_CHANGE', 'GATEWAY_REASSIGNMENT', 'EMPLOYEE_DELETED', 'ATTENDANCE_CORRECTED', 'PAYROLL_RECONCILED', 'EMERGENCY_MUSTER_TRIGGERED', 'FACTORY_RESET_INITIATED')),
    target_resource TEXT NOT NULL,
    target_resource_id TEXT NOT NULL,
    before_value JSONB,
    after_value JSONB,
    justification TEXT NOT NULL,
    approved_by TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    cryptographic_signature TEXT NOT NULL -- SHA-256 seal
);

-- 2. Predictive Device Health Scores Table (Gate 21)
CREATE TABLE IF NOT EXISTS public.device_predictive_health_scores (
    device_id TEXT PRIMARY KEY,
    device_serial TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    connectivity_score INTEGER DEFAULT 100,
    latency_score INTEGER DEFAULT 100,
    storage_pressure_score INTEGER DEFAULT 100,
    clock_drift_score INTEGER DEFAULT 100,
    error_rate_score INTEGER DEFAULT 100,
    overall_health_score INTEGER DEFAULT 100,
    status TEXT DEFAULT 'HEALTHY' CHECK (status IN ('HEALTHY', 'DEGRADED', 'OVERLOADED', 'CRITICAL')),
    predictive_failure_risk TEXT DEFAULT 'LOW' CHECK (predictive_failure_risk IN ('LOW', 'ELEVATED', 'HIGH_RISK_FAILURE_IMMINENT')),
    recommended_action TEXT,
    last_evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Gateway Canary Releases & Rollback Table (Gate 22)
CREATE TABLE IF NOT EXISTS public.gateway_canary_releases (
    release_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    release_version TEXT NOT NULL,
    target_version TEXT NOT NULL,
    phase TEXT DEFAULT 'CANARY_5_PERCENT' CHECK (phase IN ('CANARY_5_PERCENT', 'STAGED_25_PERCENT', 'FULL_ROLLOUT', 'ROLLBACK_TRIGGERED')),
    canary_gateways_count INTEGER DEFAULT 0,
    total_gateways_count INTEGER DEFAULT 0,
    error_rate_threshold_percent NUMERIC DEFAULT 5.0,
    observed_error_rate_percent NUMERIC DEFAULT 0.0,
    is_rollback_triggered BOOLEAN DEFAULT FALSE,
    rollback_reason TEXT,
    journal_preservation_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Zero-Trust Gateway Rotating Tokens Table (Gate 23)
CREATE TABLE IF NOT EXISTS public.zero_trust_gateway_tokens (
    token_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    gateway_id TEXT NOT NULL,
    hardware_fingerprint_uuid TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    signed_session_token TEXT UNIQUE NOT NULL,
    token_issued_at TIMESTAMPTZ DEFAULT NOW(),
    token_expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. High-Risk Command Dual-Control Approvals Table (Gate 24)
CREATE TABLE IF NOT EXISTS public.high_risk_command_approvals (
    request_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    command_type TEXT NOT NULL CHECK (command_type IN ('WIPE_ALL_USERS', 'WIPE_LOGS', 'FACTORY_RESET', 'REMOVE_ADMIN')),
    target_device_id TEXT NOT NULL,
    risk_level TEXT DEFAULT 'HIGH' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    time_limited_execution_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    audit_receipt_id TEXT
);

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_audit_ledger_tenant ON public.biometric_audit_ledger(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictive_health_tenant ON public.device_predictive_health_scores(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_zt_tokens_gateway ON public.zero_trust_gateway_tokens(gateway_id, token_expires_at);
CREATE INDEX IF NOT EXISTS idx_command_approvals_tenant ON public.high_risk_command_approvals(tenant_id, status);

-- 7. Row Level Security (RLS) Policies
ALTER TABLE public.biometric_audit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_predictive_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_canary_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zero_trust_gateway_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.high_risk_command_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for audit ledger" ON public.biometric_audit_ledger;
DROP POLICY IF EXISTS "Tenant isolation for predictive health" ON public.device_predictive_health_scores;
DROP POLICY IF EXISTS "Tenant isolation for zero trust tokens" ON public.zero_trust_gateway_tokens;
DROP POLICY IF EXISTS "Tenant isolation for command approvals" ON public.high_risk_command_approvals;

CREATE POLICY "Tenant isolation for audit ledger"
ON public.biometric_audit_ledger FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for predictive health"
ON public.device_predictive_health_scores FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for zero trust tokens"
ON public.zero_trust_gateway_tokens FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));

CREATE POLICY "Tenant isolation for command approvals"
ON public.high_risk_command_approvals FOR ALL
USING (tenant_id = COALESCE(auth.jwt() ->> 'organization_id', tenant_id));
