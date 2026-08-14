-- ============================================================
-- WORKFORCEOS — PLANS, FEATURES & ENTITLEMENTS DDL MIGRATION
-- PostgreSQL 15/16 / Supabase Public Schema Architecture
-- ============================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. PLANS MASTER TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    internal_description TEXT,
    category VARCHAR(64) NOT NULL DEFAULT 'Professional',
    target_segment VARCHAR(128) NOT NULL DEFAULT 'Growing Business',
    status VARCHAR(32) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Deprecated', 'Archived')),
    recommended BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 1,
    
    -- Currency & Pricing
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    billing_model VARCHAR(32) NOT NULL DEFAULT 'Per Seat' CHECK (billing_model IN ('Per Seat', 'Flat Rate', 'Usage Based', 'Hybrid')),
    billing_interval VARCHAR(16) NOT NULL DEFAULT 'Both' CHECK (billing_interval IN ('Monthly', 'Annual', 'Both')),
    monthly_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    annual_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    
    -- Seat Capacity & Quotas
    minimum_seats INT NOT NULL DEFAULT 10,
    included_seats INT NOT NULL DEFAULT 50,
    maximum_seats INT NOT NULL DEFAULT 50,
    unlimited_seats BOOLEAN NOT NULL DEFAULT false,
    allow_overage BOOLEAN NOT NULL DEFAULT false,
    additional_seat_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    
    -- Trial & Fees
    trial_enabled BOOLEAN NOT NULL DEFAULT false,
    trial_days INT NOT NULL DEFAULT 14,
    setup_fee NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    
    -- Metadata & Versioning
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INT NOT NULL DEFAULT 1,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

-- ============================================================
-- 3. PRODUCT FEATURES / CAPABILITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.features (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'Core HR',
    module VARCHAR(64) NOT NULL DEFAULT 'Core HR',
    description TEXT,
    type VARCHAR(32) NOT NULL DEFAULT 'Boolean' CHECK (type IN ('Boolean', 'Quota', 'Workflow', 'Integration', 'AI Capability')),
    status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Beta', 'Deprecated', 'Disabled')),
    min_tier_name VARCHAR(64) NOT NULL DEFAULT 'Starter',
    is_high_value BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. PLAN ENTITLEMENTS (RELATIONAL M:N)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id VARCHAR(64) NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    feature_id VARCHAR(64) NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
    access_type VARCHAR(32) NOT NULL DEFAULT 'Included' CHECK (access_type IN ('Included', 'Not Included', 'Limited', 'Add-on')),
    included_quantity NUMERIC(14,2) DEFAULT NULL,
    limit_quantity NUMERIC(14,2) DEFAULT NULL,
    unit VARCHAR(32) DEFAULT NULL,
    period VARCHAR(32) DEFAULT NULL,
    overage_allowed BOOLEAN NOT NULL DEFAULT false,
    overage_price NUMERIC(14,4) DEFAULT 0.0000,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_plan_feature UNIQUE (plan_id, feature_id)
);

-- ============================================================
-- 5. PLAN RESOURCE LIMITS & QUOTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id VARCHAR(64) NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    resource_code VARCHAR(64) NOT NULL,
    limit_type VARCHAR(32) NOT NULL DEFAULT 'Hard Limit' CHECK (limit_type IN ('Hard Limit', 'Soft Limit', 'Unlimited', 'Usage Based')),
    limit_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit VARCHAR(32) NOT NULL DEFAULT 'count',
    period VARCHAR(32) NOT NULL DEFAULT 'monthly' CHECK (period IN ('instant', 'daily', 'monthly', 'annual')),
    overage_policy VARCHAR(32) NOT NULL DEFAULT 'Blocked' CHECK (overage_policy IN ('Blocked', 'Warn', 'Allow and Bill')),
    overage_price NUMERIC(14,4) DEFAULT 0.0000,
    warning_threshold NUMERIC(5,2) DEFAULT 80.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_plan_limit UNIQUE (plan_id, resource_code)
);

-- ============================================================
-- 6. SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    tenant_name VARCHAR(255) NOT NULL,
    plan_id VARCHAR(64) NOT NULL REFERENCES public.plans(id),
    plan_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Trial', 'Past Due', 'Suspended', 'Cancelled', 'Renewing Soon')),
    billing_cycle VARCHAR(16) NOT NULL DEFAULT 'Monthly' CHECK (billing_cycle IN ('Monthly', 'Annual')),
    seats INT NOT NULL DEFAULT 50,
    used_seats INT NOT NULL DEFAULT 0,
    price_per_seat NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    renewal_date DATE NOT NULL,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'Normal' CHECK (severity IN ('Normal', 'High', 'Critical')),
    reason TEXT NOT NULL,
    ip_address VARCHAR(45),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_plans_code ON public.plans(code);
CREATE INDEX IF NOT EXISTS idx_plans_status ON public.plans(status);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_id ON public.plan_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_plan_limits_plan_id ON public.plan_limits(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- ============================================================
-- 9. SEED CORE FEATURES CATALOG (22 STANDARD HRMS CAPABILITIES)
-- ============================================================
INSERT INTO public.features (id, name, code, category, module, description, type, min_tier_name, is_high_value, status)
VALUES
('f-01', 'Core Employee Directory & Org Chart', 'CORE_EMPLOYEE_DIR', 'Core HR', 'Core HR', 'Centralized employee profiles, departmental trees, and organization chart.', 'Boolean', 'Starter', false, 'Active'),
('f-02', 'Employee Self-Service (ESS Portal)', 'ESS_PORTAL', 'Employee Self-Service', 'ESS', 'Mobile and web self-service for profile edits, tax declarations, and document downloads.', 'Boolean', 'Starter', false, 'Active'),
('f-03', 'TL & Supervisor Portal', 'TEAM_LEAD_PORTAL', 'Core HR', 'Core HR', 'Manager approval workflows for leaves, shift swaps, and attendance regularizations.', 'Boolean', 'Professional', false, 'Active'),
('f-04', 'Document Management & Digital E-Sign', 'DOCUMENTS_ESIGN', 'Core HR', 'Core HR', 'Employee contract signing, Aadhaar e-Sign, and automated letter generation.', 'Boolean', 'Professional', true, 'Active'),
('f-05', 'Basic Check-in / Check-out', 'ATTENDANCE_BASIC', 'Attendance', 'Attendance', 'Web-based and basic mobile clock-in/out logging.', 'Boolean', 'Starter', false, 'Active'),
('f-06', 'GPS Geofence Clock-in', 'ATTENDANCE_GPS', 'Attendance', 'Attendance', 'Geofenced mobile check-ins with radius validation for remote and field teams.', 'Boolean', 'Professional', true, 'Active'),
('f-07', 'Shift Scheduling & Roster Management', 'ATTENDANCE_ROSTER', 'Attendance', 'Attendance', 'Complex rotational shifts, night allowance calculations, and auto-rosters.', 'Boolean', 'Professional', false, 'Active'),
('f-08', 'Biometric Push Hardware Adapters', 'BIOMETRIC_ADAPTERS', 'Biometrics & Hardware', 'Biometrics', 'Direct daemon adapter connections for Mantra, eSSL, Suprema, and ZKTeco turnstiles.', 'Boolean', 'Enterprise', true, 'Active'),
('f-09', 'Leave Types & Applications', 'LEAVE_BASIC', 'Leave', 'Leave', 'Standard paid, sick, and casual leave policy management.', 'Boolean', 'Starter', false, 'Active'),
('f-10', 'Leave Policies & Auto-Accruals', 'LEAVE_AUTO_ACCRUAL', 'Leave', 'Leave', 'Automated monthly/annual accrual rules, sandwich leaves, and encashment calculators.', 'Boolean', 'Professional', true, 'Active'),
('f-11', 'Standard Payroll Run', 'PAYROLL_STANDARD', 'Payroll', 'Payroll', 'Basic salary calculation, deductions, and bank transfer advice generation.', 'Boolean', 'Starter', false, 'Active'),
('f-12', 'Statutory Compliance (PF/ESI/PT)', 'PAYROLL_STATUTORY', 'Payroll', 'Payroll', 'Automated Provident Fund, ESI, Professional Tax, and Form 16 generator.', 'Boolean', 'Professional', true, 'Active'),
('f-13', 'Expense Claims & Travel Desk', 'EXPENSE_REIMBURSEMENTS', 'Payroll', 'Expenses', 'Multi-currency expense claims with receipt OCR and payroll reimbursement sync.', 'Boolean', 'Business', false, 'Active'),
('f-14', 'WhatsApp Payslips & Approvals', 'WHATSAPP_PAYSLIPS', 'WhatsApp & Messaging', 'Communication', 'Automated payslip PDF delivery and leave approval actions directly over WhatsApp Cloud API.', 'Boolean', 'Business', true, 'Active'),
('f-15', 'Recruitment & ATS Pipeline', 'ATS_RECRUITMENT', 'Recruitment', 'Recruitment', 'Job board posting, candidate Kanban pipeline, and resume parsing engine.', 'Boolean', 'Business', false, 'Active'),
('f-16', 'LMS Video & SCORM Player', 'LMS_TRAINING', 'Performance', 'Learning', 'Video course modules, interactive SCORM compliance quizzes, and certificates.', 'Boolean', 'Business', false, 'Active'),
('f-17', 'AI Copilot Policy Search', 'AI_COPILOT', 'AI & Copilot', 'AI Capabilities', 'Natural language HR assistant for company policies, benefits, and query resolution.', 'Boolean', 'Enterprise', true, 'Active'),
('f-18', 'Advanced BI Analytics & Export', 'BI_ANALYTICS', 'Performance', 'Analytics', 'Customizable workforce dashboards, retention heatmaps, and scheduled CSV/PDF exports.', 'Boolean', 'Business', true, 'Active'),
('f-19', 'Custom Webhooks & HMAC API Keys', 'DEV_WEBHOOKS_API', 'Integrations & Security', 'Integrations', 'Full REST API gateway and high-throughput real-time webhook endpoints.', 'Boolean', 'Business', true, 'Active'),
('f-20', '7-Year Immutable Forensic Audit Logs', 'FORENSIC_AUDIT_LOGS', 'Integrations & Security', 'Security', 'Tamper-evident SOC 2 compliant forensic history of all data changes.', 'Boolean', 'Enterprise', true, 'Active'),
('f-21', 'Dedicated VPC Database Isolation', 'DEDICATED_VPC', 'Integrations & Security', 'Infrastructure', 'Single-tenant database cluster with dedicated encryption keys and VPC peering.', 'Boolean', 'Enterprise', true, 'Active'),
('f-22', '24/7 Dedicated Support Lead & 15m SLA', 'SUPPORT_SLA_PREMIUM', 'Support & SLAs', 'Support', 'Named technical account manager with 15-minute response SLA and phone hotline.', 'Boolean', 'Enterprise', true, 'Active')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 10. SEED CORE TIER PLANS
-- ============================================================
INSERT INTO public.plans (
    id, name, code, description, category, target_segment, status, recommended, sort_order,
    currency, billing_model, billing_interval, monthly_price, annual_price,
    minimum_seats, included_seats, maximum_seats, unlimited_seats, allow_overage, additional_seat_price,
    trial_enabled, trial_days, setup_fee
)
VALUES
('plan-starter', 'Starter', 'STARTER', 'Essential core HR, leave, and attendance for small growing teams.', 'Starter', 'Small Business (10-50)', 'Active', false, 1, 'INR', 'Per Seat', 'Both', 18000.00, 180000.00, 10, 50, 50, false, false, 0.00, true, 14, 0.00),
('plan-pro', 'Professional', 'PROFESSIONAL', 'Mid-sized companies needing GPS tracking, leave accruals, and statutory compliance.', 'Professional', 'Growing Business (50-200)', 'Active', true, 2, 'INR', 'Per Seat', 'Both', 45000.00, 450000.00, 50, 200, 200, false, true, 150.00, true, 14, 0.00),
('plan-business', 'Business', 'BUSINESS', 'Advanced workforce management with WhatsApp payslips, recruitment, and deep BI analytics.', 'Business', 'Mid-Market (200-500)', 'Active', false, 3, 'INR', 'Per Seat', 'Both', 85000.00, 850000.00, 100, 500, 500, false, true, 120.00, false, 0, 0.00),
('plan-enterprise', 'Enterprise', 'ENTERPRISE', 'Unlimited scalability with biometric push adapters, AI copilot, VPC isolation, and 24/7 SLA.', 'Enterprise', 'Enterprise (500+)', 'Active', false, 4, 'INR', 'Per Seat', 'Both', 180000.00, 1800000.00, 500, 5000, -1, true, true, 80.00, false, 0, 0.00)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    monthly_price = EXCLUDED.monthly_price,
    annual_price = EXCLUDED.annual_price,
    included_seats = EXCLUDED.included_seats,
    maximum_seats = EXCLUDED.maximum_seats,
    updated_at = now();

-- ============================================================
-- 11. REALTIME VIEW FOR PLAN METRICS & AGGREGATIONS
-- ============================================================
CREATE OR REPLACE VIEW public.vw_plan_subscription_metrics AS
SELECT 
    p.id AS plan_id,
    p.code AS plan_code,
    p.name AS plan_name,
    p.status AS plan_status,
    p.monthly_price,
    p.annual_price,
    p.included_seats,
    p.sort_order,
    COUNT(s.id) FILTER (WHERE s.status IN ('Active', 'Trial')) AS active_subscriptions_count,
    COALESCE(SUM(s.total_amount) FILTER (WHERE s.status IN ('Active', 'Trial')), 0) AS live_mrr_inr,
    COALESCE(SUM(s.seats) FILTER (WHERE s.status IN ('Active', 'Trial')), 0) AS total_provisioned_seats
FROM public.plans p
LEFT JOIN public.subscriptions s ON s.plan_id = p.id
GROUP BY p.id, p.code, p.name, p.status, p.monthly_price, p.annual_price, p.included_seats, p.sort_order;
