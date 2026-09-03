-- ============================================================
-- Joy PeopleHR — Phase 4 Database Architecture & RLS Policies
-- ============================================================
-- Tables for Release Governance, Service Health, Ownership,
-- Chronological Timeline Events, Structured RCA, and Prevention.
-- Strictly denies customer, employee, and tenant access.
-- Accessible only to SUPER_ADMIN, PLATFORM_ENGINEER, DEVOPS_SRE, SECURITY_OFFICER.
-- ============================================================

-- 1. Releases Registry
CREATE TABLE IF NOT EXISTS engineering_releases (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
    commit_sha TEXT,
    branch TEXT,
    deployed_by TEXT NOT NULL,
    deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    previous_version TEXT,
    status TEXT NOT NULL CHECK (status IN ('DEPLOYING', 'ACTIVE', 'MONITORING', 'VERIFIED', 'ROLLED_BACK', 'FAILED')),
    rollback_release_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Post-Deployment Release Health Snapshots
CREATE TABLE IF NOT EXISTS release_health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id TEXT NOT NULL REFERENCES engineering_releases(id) ON DELETE CASCADE,
    window_name TEXT NOT NULL CHECK (window_name IN ('10_MINUTE_WATCH', '30_MINUTE_WATCH', '60_MINUTE_WATCH', '24_HOUR_REVIEW')),
    status TEXT NOT NULL CHECK (status IN ('HEALTHY', 'WARNING', 'REGRESSION_DETECTED', 'MONITORING')),
    error_rate_percentage NUMERIC(5,2) NOT NULL,
    api_success_rate_percentage NUMERIC(5,2) NOT NULL,
    crash_count INT NOT NULL DEFAULT 0,
    affected_tenants_count INT NOT NULL DEFAULT 0,
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Composite Service Health Snapshots
CREATE TABLE IF NOT EXISTS service_health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('HEALTHY', 'DEGRADED', 'MAJOR_DEGRADATION', 'CRITICAL')),
    error_rate_percentage NUMERIC(5,2) NOT NULL,
    avg_latency_ms INT NOT NULL,
    uptime_percentage NUMERIC(5,2) NOT NULL,
    active_incidents_count INT NOT NULL DEFAULT 0,
    business_anomaly_status TEXT NOT NULL DEFAULT 'NORMAL',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Engineering Module Ownership
CREATE TABLE IF NOT EXISTS engineering_service_ownership (
    module_id TEXT PRIMARY KEY,
    module_name TEXT NOT NULL,
    squad TEXT NOT NULL,
    primary_owner TEXT NOT NULL,
    primary_email TEXT NOT NULL,
    secondary_owner TEXT NOT NULL,
    secondary_email TEXT NOT NULL,
    team_lead TEXT NOT NULL,
    slack_channel TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Incident Chronological Timeline Events
CREATE TABLE IF NOT EXISTS incident_timeline_events (
    id TEXT PRIMARY KEY,
    incident_number TEXT NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('DEPLOYMENT', 'METRIC_CHANGE', 'ERROR_DETECTED', 'INCIDENT_OPENED', 'ENGINEER_ASSIGNED', 'ROOT_CAUSE', 'FIX_DEPLOYED', 'VERIFIED', 'RESOLVED')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('CRITICAL', 'HIGH', 'INFO')),
    actor TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Structured Root Cause Analysis (RCA) Records
CREATE TABLE IF NOT EXISTS incident_rca (
    rca_id TEXT PRIMARY KEY,
    incident_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    what_happened TEXT NOT NULL,
    why_happened TEXT NOT NULL,
    technical_root_cause TEXT NOT NULL,
    customer_impact_summary TEXT NOT NULL,
    affected_tenants_list JSONB DEFAULT '[]'::jsonb,
    why_not_caught_earlier TEXT NOT NULL,
    fix_applied TEXT NOT NULL,
    preventative_action TEXT NOT NULL,
    lead_investigator TEXT NOT NULL,
    signed_off_by TEXT NOT NULL,
    ci_test_added TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Regression Prevention CI Action Items
CREATE TABLE IF NOT EXISTS incident_prevention_actions (
    rule_id TEXT PRIMARY KEY,
    incident_ref TEXT NOT NULL,
    rule_title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('AUTOMATED_UNIT_TEST', 'CI_LINT_RULE', 'SCHEMA_CONSTRAINT', 'SECURITY_BARRIER')),
    file_path TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE_IN_CI', 'IN_DEVELOPMENT', 'VERIFIED')),
    added_by TEXT NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Signal Correlations
CREATE TABLE IF NOT EXISTS signal_correlations (
    id TEXT PRIMARY KEY,
    incident_title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
    module TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_title TEXT NOT NULL,
    confidence TEXT NOT NULL CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
    related_signals JSONB DEFAULT '[]'::jsonb,
    recommended_investigation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row-Level Security (RLS) Isolation
-- ============================================================
ALTER TABLE engineering_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineering_service_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_rca ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_prevention_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_correlations ENABLE ROW LEVEL SECURITY;

-- Deny all public and tenant roles
CREATE POLICY "Deny customer reads on engineering_releases" ON engineering_releases FOR ALL TO anon, authenticated USING (
  coalesce(auth.jwt() ->> 'role', '') IN ('SUPER_ADMIN', 'PLATFORM_ENGINEER', 'DEVOPS_SRE', 'SECURITY_OFFICER')
);

CREATE POLICY "Deny customer reads on incident_rca" ON incident_rca FOR ALL TO anon, authenticated USING (
  coalesce(auth.jwt() ->> 'role', '') IN ('SUPER_ADMIN', 'PLATFORM_ENGINEER', 'DEVOPS_SRE', 'SECURITY_OFFICER')
);

CREATE POLICY "Deny customer reads on signal_correlations" ON signal_correlations FOR ALL TO anon, authenticated USING (
  coalesce(auth.jwt() ->> 'role', '') IN ('SUPER_ADMIN', 'PLATFORM_ENGINEER', 'DEVOPS_SRE', 'SECURITY_OFFICER')
);
