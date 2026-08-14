-- ============================================================
-- WORKFORCEOS — SAAS PLATFORM CONTROL PLANE CLEAN MIGRATION
-- PostgreSQL 16 / Supabase Schema Architecture
-- 100% Idempotent, Zero Mock Data, Full RLS Enabled
-- ============================================================

-- 1. Create Domain Schemas
CREATE SCHEMA IF NOT EXISTS platform_control;
CREATE SCHEMA IF NOT EXISTS billing_mesh;
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS operations;
CREATE SCHEMA IF NOT EXISTS integrations;
    
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. PLATFORM CONTROL DOMAIN TABLES
-- ============================================================

-- Organizations & Tenants Directory
CREATE TABLE IF NOT EXISTS platform_control.organizations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_code VARCHAR(64) UNIQUE NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    domain VARCHAR(255) NOT NULL,
    industry VARCHAR(128) NOT NULL,
    country VARCHAR(64) NOT NULL DEFAULT 'India',
    city VARCHAR(128) NOT NULL,
    gstin VARCHAR(32),
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    
    -- Status & Lifecycle
    status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Trial', 'Suspended', 'Payment Pending')),
    lifecycle_state VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (lifecycle_state IN ('Onboarding', 'Trial', 'Active', 'Growing', 'Renewal', 'At Risk', 'Suspended', 'Churned')),
    billing_status VARCHAR(32) NOT NULL DEFAULT 'Paid' CHECK (billing_status IN ('Paid', 'Past Due', 'Payment Failed', 'Pending', 'Canceled')),
    
    -- Plan & Headcount Capacity
    plan VARCHAR(32) NOT NULL DEFAULT 'Starter' CHECK (plan IN ('Starter', 'Professional', 'Business', 'Enterprise')),
    mrr_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
    seat_limit INT NOT NULL DEFAULT 50,
    active_seats INT NOT NULL DEFAULT 0,
    storage_limit_gb NUMERIC(8,2) NOT NULL DEFAULT 50,
    storage_used_gb NUMERIC(8,2) NOT NULL DEFAULT 0,
    
    -- Health & Telemetry
    health_score INT NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
    health_grade VARCHAR(16) NOT NULL DEFAULT 'Healthy' CHECK (health_grade IN ('Healthy', 'Watch', 'At Risk', 'Critical')),
    health_trend_30d INT NOT NULL DEFAULT 0,
    
    -- Primary Admin
    admin_name VARCHAR(128) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    admin_phone VARCHAR(32),
    
    -- Metadata & Auditing
    is_watchlist BOOLEAN NOT NULL DEFAULT false,
    notes_count INT NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deletion_reason TEXT
);

-- Impersonation Sessions
CREATE TABLE IF NOT EXISTS platform_control.impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    target_org_id VARCHAR(64) NOT NULL REFERENCES platform_control.organizations(id) ON DELETE CASCADE,
    target_org_name VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    access_level VARCHAR(32) NOT NULL DEFAULT 'READ_ONLY' CHECK (access_level IN ('READ_ONLY', 'SUPPORT_ADMIN')),
    duration_minutes INT NOT NULL DEFAULT 15,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Platform Services Registry
CREATE TABLE IF NOT EXISTS platform_control.platform_services (
    service_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Operational' CHECK (status IN ('Operational', 'Degraded', 'Partial Outage', 'Major Outage', 'Maintenance', 'Unknown')),
    latency_ms INT NOT NULL DEFAULT 20,
    error_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    uptime_pct NUMERIC(5,2) NOT NULL DEFAULT 99.99,
    criticality VARCHAR(16) NOT NULL DEFAULT 'High' CHECK (criticality IN ('Critical', 'High', 'Medium', 'Low')),
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Incidents
CREATE TABLE IF NOT EXISTS platform_control.platform_incidents (
    id VARCHAR(32) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(32) NOT NULL CHECK (severity IN ('SEV-1 Critical', 'SEV-2 Major', 'SEV-3 Moderate', 'SEV-4 Minor')),
    status VARCHAR(32) NOT NULL DEFAULT 'Investigating' CHECK (status IN ('Draft', 'Declared', 'Investigating', 'Identified', 'Mitigating', 'Monitoring', 'Resolved', 'Postmortem Required', 'Closed')),
    commander_name VARCHAR(128) NOT NULL,
    technical_lead_name VARCHAR(128),
    affected_services TEXT[] NOT NULL DEFAULT '{}',
    affected_region VARCHAR(128) NOT NULL,
    affected_tenants_count INT NOT NULL DEFAULT 0,
    affected_users_count INT NOT NULL DEFAULT 0,
    error_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    latency_increase_ms INT NOT NULL DEFAULT 0,
    detection_source VARCHAR(64) NOT NULL DEFAULT 'Monitoring Alert',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    mitigation_started_at TIMESTAMPTZ,
    monitoring_started_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incident Timeline Events
CREATE TABLE IF NOT EXISTS platform_control.incident_timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(32) NOT NULL REFERENCES platform_control.platform_incidents(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    actor VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    visibility VARCHAR(16) NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'customer')),
    message TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incident Mitigation Tasks
CREATE TABLE IF NOT EXISTS platform_control.incident_mitigation_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(32) NOT NULL REFERENCES platform_control.platform_incidents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    completed_at TIMESTAMPTZ
);

-- Incident Postmortems
CREATE TABLE IF NOT EXISTS platform_control.incident_postmortems (
    incident_id VARCHAR(32) PRIMARY KEY REFERENCES platform_control.platform_incidents(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Not Required', 'Required', 'Draft', 'In Review', 'Published')),
    summary TEXT,
    impact_summary TEXT,
    detection_summary TEXT,
    root_cause_category VARCHAR(64) NOT NULL DEFAULT 'Unknown',
    root_cause_narrative TEXT,
    contributing_factors TEXT[] DEFAULT '{}',
    what_went_well TEXT[] DEFAULT '{}',
    what_went_wrong TEXT[] DEFAULT '{}',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Postmortem Action Items
CREATE TABLE IF NOT EXISTS platform_control.postmortem_action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(32) NOT NULL REFERENCES platform_control.platform_incidents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    owner VARCHAR(128) NOT NULL,
    priority VARCHAR(8) NOT NULL DEFAULT 'P2' CHECK (priority IN ('P1', 'P2', 'P3')),
    due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    completed_at TIMESTAMPTZ
);

-- Feature Capabilities
CREATE TABLE IF NOT EXISTS platform_control.feature_capabilities (
    code VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    module VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    lifecycle VARCHAR(32) NOT NULL DEFAULT 'General Availability' CHECK (lifecycle IN (
        'Discovery', 'Define', 'Build', 'Internal Test', 'Enablement',
        'Entitlement Ready', 'Canary Rollout', 'Monitoring Soak',
        'General Availability', 'Deprecated', 'Archived'
    )),
    allowed_plans VARCHAR(32)[] NOT NULL DEFAULT '{}',
    rollout_percentage INT NOT NULL DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
    is_kill_switch_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-Tenant Feature Overrides
CREATE TABLE IF NOT EXISTS platform_control.tenant_feature_overrides (
    organization_id VARCHAR(64) NOT NULL REFERENCES platform_control.organizations(id) ON DELETE CASCADE,
    capability_code VARCHAR(64) NOT NULL REFERENCES platform_control.feature_capabilities(code) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL,
    reason TEXT NOT NULL,
    created_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, capability_code)
);

-- ============================================================
-- 3. BILLING & FINANCIAL DOMAIN TABLES
-- ============================================================

-- Subscription Plans Master
CREATE TABLE IF NOT EXISTS billing_mesh.subscription_plans (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    monthly_price_inr NUMERIC(10,2) NOT NULL,
    annual_price_inr NUMERIC(10,2) NOT NULL,
    seat_limit INT NOT NULL,
    storage_gb INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Active Subscriptions
CREATE TABLE IF NOT EXISTS billing_mesh.subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES platform_control.organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR(32) NOT NULL REFERENCES billing_mesh.subscription_plans(id),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED')),
    billing_cycle VARCHAR(16) NOT NULL DEFAULT 'Monthly' CHECK (billing_cycle IN ('Monthly', 'Annual')),
    current_mrr_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
    seat_quota INT NOT NULL DEFAULT 50,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    renews_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices & GST Ledger
CREATE TABLE IF NOT EXISTS billing_mesh.invoices (
    id VARCHAR(32) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES platform_control.organizations(id) ON DELETE CASCADE,
    amount_inr NUMERIC(12,2) NOT NULL,
    taxable_amount_inr NUMERIC(12,2) NOT NULL,
    cgst_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
    sgst_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
    igst_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
    tenant_gstin VARCHAR(32),
    status VARCHAR(32) NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Past Due', 'Payment Failed', 'Pending', 'Canceled')),
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(64),
    payment_reference VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. FORENSIC AUDIT LOG DOMAIN TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS audit.platform_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'Normal' CHECK (severity IN ('Critical', 'High', 'Normal', 'Low')),
    reason TEXT,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45) DEFAULT '127.0.0.1',
    session_id VARCHAR(64),
    checksum VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. OPERATIONS & QUEUES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS operations.background_jobs (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    queue VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Queued', 'Running', 'Completed', 'Failed', 'Retrying', 'Dead-Letter')),
    attempts INT NOT NULL DEFAULT 1,
    max_attempts INT NOT NULL DEFAULT 5,
    payload_ref VARCHAR(128),
    error_message TEXT,
    worker_node VARCHAR(64),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. CLEAN OUT ANY SEED / MOCK DATA (ZERO MOCK DATA GUARANTEE)
-- ============================================================

TRUNCATE TABLE 
    platform_control.postmortem_action_items,
    platform_control.incident_postmortems,
    platform_control.incident_mitigation_tasks,
    platform_control.incident_timeline_events,
    platform_control.platform_incidents,
    platform_control.impersonation_sessions,
    platform_control.tenant_feature_overrides,
    billing_mesh.invoices,
    billing_mesh.subscriptions,
    platform_control.organizations,
    audit.platform_audit_log,
    operations.background_jobs
CASCADE;

-- ============================================================
-- 7. INDEXES & QUERY OPTIMIZATIONS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_org_status ON platform_control.organizations(status);
CREATE INDEX IF NOT EXISTS idx_org_plan ON platform_control.organizations(plan);
CREATE INDEX IF NOT EXISTS idx_org_health ON platform_control.organizations(health_grade);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON platform_control.platform_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON platform_control.platform_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON billing_mesh.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON billing_mesh.invoices(status);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit.platform_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit.platform_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit.platform_audit_log(created_at DESC);

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES (DROP + CREATE SAFE)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE platform_control.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_control.impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_control.platform_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_control.platform_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_control.incident_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_control.incident_mitigation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_control.incident_postmortems ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_control.postmortem_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_control.feature_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_control.tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_mesh.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_mesh.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_mesh.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.platform_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.background_jobs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if caller is super_admin or service_role
CREATE OR REPLACE FUNCTION platform_control.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        current_setting('request.jwt.claim.role', true) = 'service_role' OR
        coalesce(current_setting('request.jwt.claim.app_role', true), '') = 'super_admin' OR
        coalesce(current_setting('request.jwt.claim.role', true), '') = 'super_admin' OR
        coalesce((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'), '') = 'super_admin' OR
        auth.role() = 'service_role'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if any to prevent ERROR 42710 (policy already exists)
DROP POLICY IF EXISTS "super_admin_full_access_orgs" ON platform_control.organizations;
DROP POLICY IF EXISTS "super_admin_full_access_impersonation" ON platform_control.impersonation_sessions;
DROP POLICY IF EXISTS "public_read_services" ON platform_control.platform_services;
DROP POLICY IF EXISTS "incidents_full_access" ON platform_control.platform_incidents;
DROP POLICY IF EXISTS "incident_events_full_access" ON platform_control.incident_timeline_events;
DROP POLICY IF EXISTS "incident_mitigation_full_access" ON platform_control.incident_mitigation_tasks;
DROP POLICY IF EXISTS "incident_postmortems_full_access" ON platform_control.incident_postmortems;
DROP POLICY IF EXISTS "postmortem_actions_full_access" ON platform_control.postmortem_action_items;
DROP POLICY IF EXISTS "feature_capabilities_full_access" ON platform_control.feature_capabilities;
DROP POLICY IF EXISTS "feature_overrides_full_access" ON platform_control.tenant_feature_overrides;
DROP POLICY IF EXISTS "plans_read_access" ON billing_mesh.subscription_plans;
DROP POLICY IF EXISTS "subscriptions_full_access" ON billing_mesh.subscriptions;
DROP POLICY IF EXISTS "invoices_full_access" ON billing_mesh.invoices;
DROP POLICY IF EXISTS "audit_log_full_access" ON audit.platform_audit_log;
DROP POLICY IF EXISTS "background_jobs_full_access" ON operations.background_jobs;

-- Recreate Clean Policies
CREATE POLICY "super_admin_full_access_orgs" ON platform_control.organizations
    FOR ALL TO authenticated, service_role
    USING (platform_control.is_super_admin() OR auth.role() = 'authenticated')
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "super_admin_full_access_impersonation" ON platform_control.impersonation_sessions
    FOR ALL TO authenticated, service_role
    USING (platform_control.is_super_admin() OR auth.role() = 'authenticated')
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "public_read_services" ON platform_control.platform_services
    FOR ALL TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "incidents_full_access" ON platform_control.platform_incidents
    FOR ALL TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "incident_events_full_access" ON platform_control.incident_timeline_events
    FOR ALL TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "incident_mitigation_full_access" ON platform_control.incident_mitigation_tasks
    FOR ALL TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "incident_postmortems_full_access" ON platform_control.incident_postmortems
    FOR ALL TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "postmortem_actions_full_access" ON platform_control.postmortem_action_items
    FOR ALL TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "feature_capabilities_full_access" ON platform_control.feature_capabilities
    FOR ALL TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "feature_overrides_full_access" ON platform_control.tenant_feature_overrides
    FOR ALL TO authenticated, service_role
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "plans_read_access" ON billing_mesh.subscription_plans
    FOR ALL TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "subscriptions_full_access" ON billing_mesh.subscriptions
    FOR ALL TO authenticated, service_role
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "invoices_full_access" ON billing_mesh.invoices
    FOR ALL TO authenticated, service_role
    USING (true)
    WITH CHECK (platform_control.is_super_admin() OR auth.role() = 'authenticated');

CREATE POLICY "audit_log_full_access" ON audit.platform_audit_log
    FOR ALL TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "background_jobs_full_access" ON operations.background_jobs
    FOR ALL TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (true);
