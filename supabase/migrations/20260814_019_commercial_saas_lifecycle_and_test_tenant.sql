-- ============================================================================
-- Migration: 20260814_019_commercial_saas_lifecycle_and_test_tenant.sql
-- Description: Data-First Commercial SaaS Lifecycle Engine & Joy Corporate Solutions Test Organization
-- ============================================================================

-- 1. Ensure/Create organizations Table with Full Commercial Metadata
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT ('org-' || gen_random_uuid()::text),
    tenant_id TEXT,
    legal_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    organization_type TEXT NOT NULL DEFAULT 'Private Limited Company',
    domain TEXT,
    industry TEXT DEFAULT 'Information Technology',
    country TEXT NOT NULL DEFAULT 'India',
    state TEXT DEFAULT 'Tamil Nadu',
    city TEXT DEFAULT 'Chennai',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    currency TEXT NOT NULL DEFAULT 'INR',
    environment TEXT NOT NULL DEFAULT 'Production Test Tenant',
    
    -- Nullable Legal / Tax Identifiers (Never fabricated, shows "Not provided" if null)
    gstin TEXT,
    pan TEXT,
    cin TEXT,
    registered_address TEXT,
    
    -- Primary Contact & Ownership
    primary_admin_id UUID,
    primary_admin_name TEXT DEFAULT 'Dharun B',
    primary_admin_email TEXT DEFAULT 'dharun@joycorporate.com',
    primary_admin_phone TEXT DEFAULT '+91 98765 43210',
    account_owner_name TEXT DEFAULT 'Arun Kumar (Super Admin)',
    account_owner_team TEXT DEFAULT 'Customer Success',
    
    -- Commercial & Lifecycle Status
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Trial', 'Suspended', 'Payment Pending', 'Archived')),
    lifecycle_state TEXT NOT NULL DEFAULT 'Active' CHECK (lifecycle_state IN ('Onboarding', 'Trial', 'Active', 'Growing', 'Renewal', 'At Risk', 'Suspended', 'Churned')),
    billing_status TEXT NOT NULL DEFAULT 'Paid' CHECK (billing_status IN ('Paid', 'Past Due', 'Payment Failed', 'Pending', 'Canceled')),
    is_watchlisted BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT ARRAY['Customer', 'Priority', 'India'],
    
    -- Plan & Financial Overview
    plan TEXT NOT NULL DEFAULT 'Professional',
    mrr NUMERIC(12,2) NOT NULL DEFAULT 45000.00,
    billing_cycle TEXT NOT NULL DEFAULT 'Monthly' CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Annual')),
    renewal_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    auto_renew BOOLEAN DEFAULT true,
    
    -- Headcount & Usage Telemetry
    active_employees INT DEFAULT 42,
    total_employees INT DEFAULT 45,
    seat_limit INT DEFAULT 100,
    storage_used_gb NUMERIC(8,2) DEFAULT 4.2,
    storage_quota_gb INT DEFAULT 50,
    api_calls_this_month INT DEFAULT 18450,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on pre-existing organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Joy Corporate Solutions Pvt Ltd';
ALTER TABLE organizations ALTER COLUMN name DROP NOT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_name TEXT DEFAULT 'Joy Corporate Solutions Pvt Ltd';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT 'Joy Corporate Solutions';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'Private Limited Company';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'Information Technology';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Tamil Nadu';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Chennai';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'Production Test Tenant';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cin TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS registered_address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_admin_id UUID;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_admin_name TEXT DEFAULT 'Dharun B';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_admin_email TEXT DEFAULT 'dharun@joycorporate.com';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_admin_phone TEXT DEFAULT '+91 98765 43210';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS account_owner_name TEXT DEFAULT 'Arun Kumar (Super Admin)';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS account_owner_team TEXT DEFAULT 'Customer Success';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS lifecycle_state TEXT DEFAULT 'Active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'Paid';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_watchlisted BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY['Customer', 'Priority', 'India'];
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Professional';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mrr NUMERIC(12,2) DEFAULT 45000.00;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'Monthly';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS renewal_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS active_employees INT DEFAULT 42;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS total_employees INT DEFAULT 45;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS seat_limit INT DEFAULT 100;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS storage_used_gb NUMERIC(8,2) DEFAULT 4.2;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS storage_quota_gb INT DEFAULT 50;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS api_calls_this_month INT DEFAULT 18450;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create customer_profiles Table (Dedicated Customer Relationship & Verification Profile)
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    legal_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    organization_type TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    currency TEXT NOT NULL DEFAULT 'INR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    industry TEXT DEFAULT 'Information Technology',
    website TEXT DEFAULT 'https://joycorporate.com',
    primary_contact_name TEXT DEFAULT 'Dharun B',
    primary_contact_email TEXT DEFAULT 'dharun@joycorporate.com',
    primary_contact_phone TEXT DEFAULT '+91 98765 43210',
    billing_contact_name TEXT DEFAULT 'Accounts Dept',
    billing_contact_email TEXT DEFAULT 'billing@joycorporate.com',
    technical_contact_name TEXT DEFAULT 'DevOps Lead',
    technical_contact_email TEXT DEFAULT 'devops@joycorporate.com',
    verification_status TEXT NOT NULL DEFAULT 'Provided' CHECK (verification_status IN ('Verified', 'Provided', 'Missing', 'Pending Verification')),
    customer_status TEXT NOT NULL DEFAULT 'Active',
    customer_since TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_profiles_org ON customer_profiles(organization_id);

-- 3. Ensure Plans Tables with Authoritative Configured Pricing
CREATE TABLE IF NOT EXISTS platform_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tier_code TEXT NOT NULL UNIQUE,
    max_employees INT NOT NULL DEFAULT 50,
    max_admins INT NOT NULL DEFAULT 3,
    storage_gb INT NOT NULL DEFAULT 20,
    api_requests_per_month INT NOT NULL DEFAULT 100000,
    whatsapp_limit INT NOT NULL DEFAULT 1000,
    price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
    price_annual NUMERIC(12,2) NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_plans (id, name, tier_code, max_employees, price_monthly, price_annual, is_active)
VALUES
    ('plan-starter', 'Starter', 'starter', 50, 18000.00, 180000.00, true),
    ('plan-professional', 'Professional', 'professional', 200, 45000.00, 450000.00, true),
    ('plan-business', 'Business', 'business', 500, 85000.00, 850000.00, true),
    ('plan-enterprise', 'Enterprise', 'enterprise', 5000, 180000.00, 1800000.00, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tier_code = EXCLUDED.tier_code,
    price_monthly = EXCLUDED.price_monthly,
    price_annual = EXCLUDED.price_annual,
    max_employees = EXCLUDED.max_employees,
    is_active = true;

CREATE TABLE IF NOT EXISTS public.plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    billing_interval VARCHAR(16) NOT NULL DEFAULT 'Both',
    monthly_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    annual_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    minimum_seats INT NOT NULL DEFAULT 10,
    included_seats INT NOT NULL DEFAULT 50,
    maximum_seats INT NOT NULL DEFAULT 500,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed/Ensure Authoritative Plan Tiers in public.plans
INSERT INTO public.plans (id, name, code, description, status, currency, billing_interval, monthly_price, annual_price, minimum_seats, included_seats, maximum_seats)
VALUES
    ('plan-starter', 'Starter', 'starter', 'Essential HR, Self-Service & Attendance for small businesses.', 'Active', 'INR', 'Both', 18000.00, 180000.00, 5, 25, 50),
    ('plan-professional', 'Professional', 'professional', 'Advanced GPS attendance, shift scheduling, and leave approvals.', 'Active', 'INR', 'Both', 45000.00, 450000.00, 10, 100, 200),
    ('plan-business', 'Business', 'business', 'Comprehensive payroll, expense management, recruitment & WhatsApp.', 'Active', 'INR', 'Both', 85000.00, 850000.00, 25, 250, 500),
    ('plan-enterprise', 'Enterprise', 'enterprise', 'Unlimited capacity, AI Copilot, biometric adapters & master APIs.', 'Active', 'INR', 'Both', 180000.00, 1800000.00, 50, 500, 5000)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    monthly_price = EXCLUDED.monthly_price,
    annual_price = EXCLUDED.annual_price,
    included_seats = EXCLUDED.included_seats,
    maximum_seats = EXCLUDED.maximum_seats;

-- 4. Ensure platform_subscriptions Table
CREATE TABLE IF NOT EXISTS platform_subscriptions (
    id TEXT PRIMARY KEY DEFAULT ('sub-' || gen_random_uuid()::text),
    tenant_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    subscription_number TEXT UNIQUE,
    billing_cycle TEXT NOT NULL DEFAULT 'Monthly' CHECK (billing_cycle IN ('Monthly', 'Annual')),
    seats_allocated INT NOT NULL DEFAULT 100,
    seats_used INT NOT NULL DEFAULT 42,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 450.00,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 45000.00,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(12,2) NOT NULL DEFAULT 8100.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 53100.00,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Trial', 'Active', 'Grace Period', 'Past Due', 'Suspended', 'Cancelled')),
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    payment_provider TEXT DEFAULT 'Razorpay Sandbox',
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS subscription_number TEXT;
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 45000.00;
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS tax NUMERIC(12,2) DEFAULT 8100.00;
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'Razorpay Sandbox';
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS provider_customer_id TEXT;
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT;

-- 5. Ensure platform_invoices and Line Items Tables
CREATE TABLE IF NOT EXISTS platform_invoices (
    id TEXT PRIMARY KEY DEFAULT ('inv-' || gen_random_uuid()::text),
    invoice_number TEXT NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id TEXT REFERENCES platform_subscriptions(id),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 45000.00,
    gst_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    gst_amount NUMERIC(12,2) NOT NULL DEFAULT 8100.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 53100.00,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 53100.00,
    amount_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Draft', 'Issued', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled', 'Refunded')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT DEFAULT 'UPI / NetBanking (Sandbox)',
    payment_gateway_ref TEXT DEFAULT 'PAY-TEST-000001',
    reconciliation_status TEXT NOT NULL DEFAULT 'Matched' CHECK (reconciliation_status IN ('Matched', 'Unmatched', 'Needs Review', 'Resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns on platform_invoices
ALTER TABLE platform_invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 53100.00;
ALTER TABLE platform_invoices ADD COLUMN IF NOT EXISTS amount_due NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE platform_invoices ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;

CREATE TABLE IF NOT EXISTS platform_invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id TEXT NOT NULL REFERENCES platform_invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    plan_or_feature_code TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 45000.00,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(12,2) NOT NULL DEFAULT 8100.00,
    line_total NUMERIC(12,2) NOT NULL DEFAULT 53100.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ensure platform_payments Table (Test / Sandbox Payments)
CREATE TABLE IF NOT EXISTS platform_payments (
    id TEXT PRIMARY KEY DEFAULT ('pay-' || gen_random_uuid()::text),
    tenant_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id TEXT REFERENCES platform_invoices(id),
    subscription_id TEXT REFERENCES platform_subscriptions(id),
    provider TEXT NOT NULL DEFAULT 'Razorpay Sandbox',
    provider_payment_id TEXT NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 53100.00,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
    payment_method_type TEXT DEFAULT 'UPI',
    failure_reason TEXT,
    idempotency_key TEXT UNIQUE,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Ensure organization_entitlements Table
CREATE TABLE IF NOT EXISTS organization_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_code TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    limit_value NUMERIC(14,2),
    usage_value NUMERIC(14,2) DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'Subscription:Professional',
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_entitlement UNIQUE (organization_id, feature_code)
);

-- ============================================================
-- 8. SEED PRIMARY REAL TEST TENANT: Joy Corporate Solutions Pvt Ltd
-- ============================================================

-- A. Insert/Update Organization
INSERT INTO organizations (
    id, tenant_id, name, legal_name, display_name, organization_type, domain, industry,
    country, state, city, timezone, currency, environment,
    primary_admin_name, primary_admin_email, primary_admin_phone,
    account_owner_name, account_owner_team,
    status, lifecycle_state, billing_status, is_watchlisted, tags,
    plan, mrr, billing_cycle, renewal_date, auto_renew,
    active_employees, total_employees, seat_limit, storage_used_gb, storage_quota_gb, api_calls_this_month,
    created_at, updated_at
) VALUES (
    'org-joy-corp',
    'org-joy-corp',
    'Joy Corporate Solutions Pvt Ltd',
    'Joy Corporate Solutions Pvt Ltd',
    'Joy Corporate Solutions',
    'Private Limited Company',
    'joycorporate.com',
    'Enterprise Cloud & HR Operations',
    'India',
    'Tamil Nadu',
    'Chennai',
    'Asia/Kolkata',
    'INR',
    'Production Test Tenant',
    'Dharun B',
    'dharun@joycorporate.com',
    '+91 98765 43210',
    'Arun Kumar (Super Admin)',
    'Customer Success',
    'Active',
    'Active',
    'Paid',
    false,
    ARRAY['Primary Test Tenant', 'Enterprise', 'India', 'Paid Customer'],
    'Professional',
    45000.00,
    'Monthly',
    (NOW() + INTERVAL '30 days'),
    true,
    42,
    45,
    100,
    4.20,
    50,
    18450,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.legal_name,
    legal_name = EXCLUDED.legal_name,
    display_name = EXCLUDED.display_name,
    plan = EXCLUDED.plan,
    mrr = EXCLUDED.mrr,
    status = 'Active',
    lifecycle_state = 'Active',
    billing_status = 'Paid',
    seat_limit = 100;

-- B. Customer Profile for Joy Corporate Solutions
INSERT INTO customer_profiles (
    organization_id, legal_name, display_name, organization_type, country, currency, timezone,
    industry, website, primary_contact_name, primary_contact_email, primary_contact_phone,
    billing_contact_name, billing_contact_email, verification_status, customer_status
) VALUES (
    'org-joy-corp',
    'Joy Corporate Solutions Pvt Ltd',
    'Joy Corporate Solutions',
    'Private Limited Company',
    'India',
    'INR',
    'Asia/Kolkata',
    'Enterprise Cloud & HR Operations',
    'https://joycorporate.com',
    'Dharun B',
    'dharun@joycorporate.com',
    '+91 98765 43210',
    'Accounts Dept',
    'billing@joycorporate.com',
    'Provided',
    'Active'
)
ON CONFLICT (organization_id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    display_name = EXCLUDED.display_name,
    customer_status = 'Active';

-- C. Professional Plan Subscription for Joy Corporate Solutions
INSERT INTO platform_subscriptions (
    id, tenant_id, plan_id, plan_name, subscription_number, billing_cycle,
    seats_allocated, seats_used, unit_price, subtotal, discount, tax, total_amount, currency,
    status, auto_renew, current_period_start, current_period_end, payment_provider,
    created_at, updated_at
) VALUES (
    'sub-joy-prof-01',
    'org-joy-corp',
    'plan-professional',
    'Professional',
    'SUB-2026-JOY01',
    'Monthly',
    100,
    42,
    450.00,
    45000.00,
    0.00,
    8100.00,
    53100.00,
    'INR',
    'Active',
    true,
    NOW(),
    (NOW() + INTERVAL '30 days'),
    'Razorpay Sandbox',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    status = 'Active',
    subtotal = 45000.00,
    total_amount = 53100.00;

-- D. Paid Invoice for Joy Corporate Solutions
INSERT INTO platform_invoices (
    id, invoice_number, tenant_id, subscription_id, subtotal, gst_rate_percent, gst_amount, total_amount,
    amount_paid, amount_due, currency, status, issue_date, due_date, paid_at,
    payment_method, payment_gateway_ref, reconciliation_status
) VALUES (
    'inv-joy-000001',
    'INV-2026-000001',
    'org-joy-corp',
    'sub-joy-prof-01',
    45000.00,
    18.00,
    8100.00,
    53100.00,
    53100.00,
    0.00,
    'INR',
    'Paid',
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '15 days'),
    NOW(),
    'UPI / NetBanking (Sandbox)',
    'PAY-TEST-000001',
    'Matched'
)
ON CONFLICT (invoice_number) DO UPDATE SET
    status = 'Paid',
    total_amount = 53100.00,
    amount_paid = 53100.00,
    amount_due = 0.00;

-- Line Items for Invoice
DELETE FROM platform_invoice_line_items WHERE invoice_id = 'inv-joy-000001';
INSERT INTO platform_invoice_line_items (
    invoice_id, description, plan_or_feature_code, quantity, unit_price, discount, tax, line_total
) VALUES (
    'inv-joy-000001',
    'Professional Plan Monthly Subscription (100 Included Seats)',
    'professional',
    1,
    45000.00,
    0.00,
    8100.00,
    53100.00
);

-- E. Payment Record in Sandbox
INSERT INTO platform_payments (
    id, tenant_id, invoice_id, subscription_id, provider, provider_payment_id,
    amount, currency, status, payment_method_type, paid_at
) VALUES (
    'pay-joy-000001',
    'org-joy-corp',
    'inv-joy-000001',
    'sub-joy-prof-01',
    'Razorpay Sandbox',
    'PAY-TEST-000001',
    53100.00,
    'INR',
    'succeeded',
    'UPI / NetBanking',
    NOW()
)
ON CONFLICT (provider_payment_id) DO UPDATE SET
    status = 'succeeded',
    amount = 53100.00;

-- F. Entitlements for Joy Corporate Solutions
INSERT INTO organization_entitlements (organization_id, feature_code, feature_name, enabled, limit_value, usage_value, source)
VALUES
    ('org-joy-corp', 'core.hr.directory', 'Core Employee Directory', true, 100, 42, 'Subscription:Professional'),
    ('org-joy-corp', 'core.ess.portal', 'Employee Self-Service Portal', true, 100, 42, 'Subscription:Professional'),
    ('org-joy-corp', 'attendance.gps', 'GPS & Geofenced Attendance', true, 100, 38, 'Subscription:Professional'),
    ('org-joy-corp', 'attendance.shifts', 'Shift Scheduling & Roster Management', true, 50, 6, 'Subscription:Professional'),
    ('org-joy-corp', 'leave.workflows', 'Multi-Level Leave Approval Workflows', true, 100, 14, 'Subscription:Professional'),
    ('org-joy-corp', 'messaging.alerts', 'Automated Email & Push Alerts', true, 10000, 1280, 'Subscription:Professional')
ON CONFLICT (organization_id, feature_code) DO UPDATE SET
    enabled = true,
    limit_value = EXCLUDED.limit_value;

-- G. RLS Policies for Commercial Tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow organizations read" ON organizations;
CREATE POLICY "Allow organizations read" ON organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow organizations manage" ON organizations;
CREATE POLICY "Allow organizations manage" ON organizations FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow customer profiles manage" ON customer_profiles;
CREATE POLICY "Allow customer profiles manage" ON customer_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow subscriptions manage" ON platform_subscriptions;
CREATE POLICY "Allow subscriptions manage" ON platform_subscriptions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow invoices manage" ON platform_invoices;
CREATE POLICY "Allow invoices manage" ON platform_invoices FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow invoice items manage" ON platform_invoice_line_items;
CREATE POLICY "Allow invoice items manage" ON platform_invoice_line_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow payments manage" ON platform_payments;
CREATE POLICY "Allow payments manage" ON platform_payments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow entitlements manage" ON organization_entitlements;
CREATE POLICY "Allow entitlements manage" ON organization_entitlements FOR ALL USING (true);
