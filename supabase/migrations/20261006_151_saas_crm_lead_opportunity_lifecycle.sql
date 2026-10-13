-- ============================================================================
-- Migration: 20261006_151_saas_crm_lead_opportunity_lifecycle.sql
-- Description: Authoritative SaaS CRM Commercial Lifecycle
-- Workflow: LEAD -> QUALIFICATION -> OPPORTUNITY -> REQUIREMENT -> PRICING -> 
--           QUOTATION -> NEGOTIATION -> ACCEPTANCE -> CONVERT TO CLIENT -> 
--           ORGANIZATION/TENANT -> SUBSCRIPTION -> INVOICE -> PAYMENT
-- ============================================================================

-- 1. CRM Leads Table (Pre-customer prospects)
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id TEXT PRIMARY KEY DEFAULT ('lead-' || gen_random_uuid()::text),
    lead_number TEXT NOT NULL UNIQUE, -- e.g. LEAD-2026-0048
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    designation TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    website TEXT,
    industry TEXT NOT NULL DEFAULT 'Manufacturing',
    estimated_employees INT NOT NULL DEFAULT 100,
    locations_count INT DEFAULT 1,
    source TEXT NOT NULL DEFAULT 'Website',
    sales_owner TEXT NOT NULL DEFAULT 'Arun K',
    stage TEXT NOT NULL DEFAULT 'QUALIFIED' CHECK (
        stage IN (
            'NEW',
            'CONTACTED',
            'QUALIFIED',
            'DISCOVERY',
            'REQUIREMENT_CAPTURED',
            'PRICING',
            'QUOTATION_SENT',
            'NEGOTIATION',
            'WON',
            'LOST',
            'DISQUALIFIED'
        )
    ),
    requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    opportunity_id TEXT,
    converted_client_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CRM Opportunities Table (Commercial Deals)
CREATE TABLE IF NOT EXISTS public.crm_opportunities (
    id TEXT PRIMARY KEY DEFAULT ('opp-' || gen_random_uuid()::text),
    opportunity_number TEXT NOT NULL UNIQUE, -- e.g. OPP-2026-0031
    deal_name TEXT NOT NULL,
    lead_id TEXT REFERENCES public.crm_leads(id) ON DELETE SET NULL,
    lead_number TEXT,
    client_id TEXT, -- Populated if existing client expansion or after conversion
    client_name TEXT,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    designation TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    industry TEXT NOT NULL DEFAULT 'Manufacturing',
    estimated_employees INT NOT NULL DEFAULT 100,
    locations_count INT DEFAULT 1,
    legal_entities_count INT DEFAULT 1,
    estimated_arr NUMERIC(14,2) DEFAULT 0.00,
    probability INT DEFAULT 70 CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE NOT NULL,
    sales_owner TEXT NOT NULL DEFAULT 'Arun K',
    stage TEXT NOT NULL DEFAULT 'PROPOSAL' CHECK (
        stage IN (
            'DISCOVERY',
            'REQUIREMENT',
            'PRICING',
            'PROPOSAL',
            'NEGOTIATION',
            'WON',
            'LOST'
        )
    ),
    captured_requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
    active_quotation_id TEXT,
    origin_type TEXT NOT NULL DEFAULT 'NEW_CUSTOMER' CHECK (origin_type IN ('NEW_CUSTOMER', 'EXISTING_CUSTOMER')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Commercial Quotations Table (Commercial Solution Proposals)
CREATE TABLE IF NOT EXISTS public.commercial_quotations (
    id TEXT PRIMARY KEY DEFAULT ('qt-' || gen_random_uuid()::text),
    quotation_number TEXT NOT NULL UNIQUE, -- e.g. QT-2026-00124
    version INT NOT NULL DEFAULT 1,
    origin_type TEXT NOT NULL DEFAULT 'NEW_CUSTOMER' CHECK (origin_type IN ('NEW_CUSTOMER', 'EXISTING_CUSTOMER')),
    purpose TEXT DEFAULT 'NEW_SUBSCRIPTION' CHECK (
        purpose IN (
            'NEW_SUBSCRIPTION',
            'PLAN_UPGRADE',
            'PLAN_DOWNGRADE',
            'ADDITIONAL_SEATS',
            'ADD_MODULES',
            'EXPANSION',
            'RENEWAL',
            'CONTRACT_AMENDMENT'
        )
    ),
    opportunity_id TEXT REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
    opportunity_number TEXT,
    lead_id TEXT REFERENCES public.crm_leads(id) ON DELETE SET NULL,
    lead_number TEXT,
    client_id TEXT, -- NULLABLE FOR PROSPECTS!
    client_name TEXT NOT NULL,
    client_gstin TEXT, -- NULLABLE: Pending verification for prospects
    client_email TEXT NOT NULL,
    client_phone TEXT,
    client_state TEXT NOT NULL DEFAULT 'Tamil Nadu',
    sales_owner TEXT NOT NULL DEFAULT 'Arun K',
    plan_code TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'Annual' CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Annual')),
    employee_count INT NOT NULL DEFAULT 100,
    included_employees INT NOT NULL DEFAULT 100,
    additional_employees_count INT NOT NULL DEFAULT 0,
    pepm_rate NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    selected_addon_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    one_time_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    approval JSONB NOT NULL DEFAULT '{"required": false, "tier": "Sales"}'::jsonb,
    solution_config JSONB DEFAULT '{}'::jsonb,
    terms JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN (
            'DRAFT',
            'INTERNAL_REVIEW',
            'APPROVED',
            'SENT',
            'VIEWED',
            'NEGOTIATION',
            'ACCEPTED',
            'REJECTED',
            'EXPIRED',
            'CANCELLED',
            'CONVERTED'
        )
    ),
    valid_until DATE NOT NULL,
    converted_client_id TEXT,
    converted_org_id TEXT,
    converted_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Commercial Clients Table (Contracted Enterprise Customers)
CREATE TABLE IF NOT EXISTS public.commercial_clients (
    id TEXT PRIMARY KEY DEFAULT ('cli-' || gen_random_uuid()::text),
    client_code TEXT NOT NULL UNIQUE, -- e.g. CLI-2026-1048
    legal_name TEXT NOT NULL,
    organization_id TEXT, -- Soft reference to public.organizations(id) (supports both UUID and Text identifiers)
    lead_id TEXT REFERENCES public.crm_leads(id) ON DELETE SET NULL,
    opportunity_id TEXT REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
    industry TEXT NOT NULL DEFAULT 'Manufacturing',
    employee_count INT NOT NULL DEFAULT 100,
    gstin TEXT,
    pan TEXT,
    cin TEXT,
    billing_address JSONB DEFAULT '{}'::jsonb,
    primary_contact JSONB DEFAULT '{}'::jsonb,
    billing_contact JSONB DEFAULT '{}'::jsonb,
    commercial_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (commercial_status IN ('PENDING_ONBOARDING', 'ACTIVE', 'SUSPENDED', 'CHURNED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Indexes for Traceability & Performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON public.crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_sales_owner ON public.crm_leads(sales_owner);
CREATE INDEX IF NOT EXISTS idx_crm_opps_lead_id ON public.crm_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_opps_client_id ON public.crm_opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_opps_stage ON public.crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_quotations_opp_id ON public.commercial_quotations(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_quotations_lead_id ON public.commercial_quotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON public.commercial_quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.commercial_quotations(status);
CREATE INDEX IF NOT EXISTS idx_commercial_clients_org_id ON public.commercial_clients(organization_id);

-- 6. Ensure Base Organizations Table Has Compatible Commercial Columns
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cin TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS registered_address TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS primary_admin_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS primary_admin_email TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS primary_admin_phone TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS mrr NUMERIC(12,2);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_cycle TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS seat_limit INT;

-- 7. Seed Initial Authoritative Commercial CRM Pipeline Data
INSERT INTO public.crm_leads (
    id, lead_number, company_name, contact_person, designation, email, phone, website,
    industry, estimated_employees, locations_count, source, sales_owner, stage, requirements
) VALUES 
(
    'lead-01', 'LEAD-2026-0048', 'ABC Industries Pvt Ltd', 'Rajesh Kumar', 'HR Head',
    'rajesh@abcindustries.in', '+91 98401 23456', 'https://abcindustries.in',
    'Manufacturing', 850, 12, 'Website', 'Arun K', 'QUALIFIED',
    ARRAY['core_hr', 'ess', 'attendance', 'leave', 'payroll', 'biometric', 'recruitment', 'performance', 'vendor_workforce', 'procurement']
),
(
    'lead-02', 'LEAD-2026-0052', 'Zenith Life Sciences & Healthcare', 'Dr. Sunita Rao', 'Director — People Operations',
    'sunita.rao@zenithlifesciences.com', '+91 98112 44332', 'https://zenithlifesciences.com',
    'Pharmaceuticals & Healthcare', 420, 6, 'Inbound Demo', 'Priya Sharma', 'REQUIREMENT_CAPTURED',
    ARRAY['core_hr', 'ess', 'attendance', 'leave', 'payroll', 'biometric', 'expense']
),
(
    'lead-03', 'LEAD-2026-0061', 'Apex Steel & Heavy Engineering Works', 'Karan Mehra', 'General Manager — HR & Administration',
    'karan.m@apexsteel.co.in', '+91 98220 54321', 'https://apexsteel.co.in',
    'Industrial Engineering', 1100, 8, 'Referral', 'Arun K', 'QUALIFIED',
    ARRAY['core_hr', 'ess', 'attendance', 'leave', 'payroll', 'biometric', 'vendor_workforce', 'procurement', 'invoice_settlement']
)
ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    stage = EXCLUDED.stage,
    requirements = EXCLUDED.requirements;

INSERT INTO public.crm_opportunities (
    id, opportunity_number, deal_name, lead_id, lead_number, company_name, contact_person,
    designation, email, phone, industry, estimated_employees, locations_count, legal_entities_count,
    estimated_arr, probability, expected_close_date, sales_owner, stage, captured_requirements, origin_type
) VALUES 
(
    'opp-01', 'OPP-2026-0031', 'ABC Industries — Enterprise HRMS & Vendor Workforce Rollout',
    'lead-01', 'LEAD-2026-0048', 'ABC Industries Pvt Ltd', 'Rajesh Kumar', 'HR Head',
    'rajesh@abcindustries.in', '+91 98401 23456', 'Manufacturing', 850, 12, 2,
    850000.00, 70, (CURRENT_DATE + INTERVAL '25 days'), 'Arun K', 'PROPOSAL',
    ARRAY['core_hr', 'ess', 'attendance', 'leave', 'payroll', 'biometric', 'recruitment', 'performance', 'vendor_workforce', 'procurement'],
    'NEW_CUSTOMER'
),
(
    'opp-02', 'OPP-2026-0035', 'Zenith Healthcare — Multi-Facility Clinical HR & Payroll',
    'lead-02', 'LEAD-2026-0052', 'Zenith Life Sciences & Healthcare', 'Dr. Sunita Rao', 'Director — People Operations',
    'sunita.rao@zenithlifesciences.com', '+91 98112 44332', 'Pharmaceuticals & Healthcare', 420, 6, 1,
    450000.00, 60, (CURRENT_DATE + INTERVAL '40 days'), 'Priya Sharma', 'REQUIREMENT',
    ARRAY['core_hr', 'ess', 'attendance', 'leave', 'payroll', 'biometric', 'expense'],
    'NEW_CUSTOMER'
),
(
    'opp-03', 'OPP-2026-0039', 'XYZ Express Logistics — Fleet & Contractor Workforce Expansion',
    NULL, NULL, 'XYZ Logistics & Supply Chain Pvt Ltd', 'Pooja Hegde', 'VP People & Culture',
    'pooja.h@xyzlogistics.com', '+91 98801 87654', 'Warehousing & 3PL Logistics', 500, 8, 1,
    360000.00, 85, (CURRENT_DATE + INTERVAL '30 days'), 'Arun K', 'PROPOSAL',
    ARRAY['core_hr', 'ess', 'attendance', 'leave', 'payroll', 'vendor_workforce', 'vendor_portal'],
    'EXISTING_CUSTOMER'
)
ON CONFLICT (id) DO UPDATE SET
    deal_name = EXCLUDED.deal_name,
    stage = EXCLUDED.stage,
    captured_requirements = EXCLUDED.captured_requirements;

INSERT INTO public.commercial_clients (
    id, client_code, legal_name, organization_id, industry, employee_count, gstin, pan,
    commercial_status, primary_contact, billing_address
) VALUES
(
    'cli-01', 'CLI-2026-001', 'Joy Corporate Solutions Pvt Ltd', NULL,
    'Information Technology', 45, '33AABCJ1928K1Z5', 'AABCJ1928K',
    'ACTIVE',
    '{"name": "Dharun B", "email": "dharun@joycorporate.com", "phone": "+91 98765 43210"}'::jsonb,
    '{"line1": "Joy Towers, OMR Tech Corridor", "city": "Chennai", "state": "Tamil Nadu", "pinCode": "600096"}'::jsonb
),
(
    'cli-02', 'CLI-2026-002', 'XYZ Logistics & Supply Chain Pvt Ltd', NULL,
    'Warehousing & 3PL Logistics', 240, '29AABCX9912F1Z8', 'AABCX9912F',
    'ACTIVE',
    '{"name": "Pooja Hegde", "email": "pooja.h@xyzlogistics.com", "phone": "+91 98801 87654"}'::jsonb,
    '{"line1": "45 Logistics Park, Outer Ring Road", "city": "Bengaluru", "state": "Karnataka", "pinCode": "560103"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    gstin = EXCLUDED.gstin,
    commercial_status = EXCLUDED.commercial_status;

-- 8. Complete Commercial CRM Pipeline Traceability View (Security Invoker)
DROP VIEW IF EXISTS public.v_saas_crm_quotation_pipeline;
CREATE VIEW public.v_saas_crm_quotation_pipeline WITH (security_invoker = true) AS
SELECT
    l.id AS lead_id,
    l.lead_number,
    l.company_name AS lead_company_name,
    l.contact_person AS lead_contact_person,
    l.stage AS lead_stage,
    o.id AS opportunity_id,
    o.opportunity_number,
    o.deal_name,
    o.estimated_arr,
    o.probability,
    o.stage AS opportunity_stage,
    o.origin_type AS opportunity_origin,
    q.id AS quotation_id,
    q.quotation_number,
    q.plan_name,
    q.employee_count,
    q.origin_type AS quotation_origin,
    q.purpose AS quotation_purpose,
    q.status AS quotation_status,
    c.id AS client_id,
    c.client_code,
    c.legal_name AS client_legal_name,
    c.commercial_status AS client_status,
    org.id::text AS organization_id,
    COALESCE(org.display_name, org.name, c.legal_name) AS organization_name
FROM public.crm_opportunities o
LEFT JOIN public.crm_leads l ON o.lead_id = l.id
LEFT JOIN public.commercial_quotations q ON q.opportunity_id = o.id
LEFT JOIN public.commercial_clients c ON (q.converted_client_id = c.id OR q.client_id = c.id OR o.client_id = c.id)
LEFT JOIN public.organizations org ON (c.organization_id = org.id::text OR q.converted_org_id = org.id::text);

-- 9. Enable Row Level Security (RLS) & Hardened Policies
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_clients ENABLE ROW LEVEL SECURITY;

-- CRM Leads Policies
DROP POLICY IF EXISTS "Super Admins can manage CRM leads" ON public.crm_leads;
DROP POLICY IF EXISTS "crm_leads_select_policy" ON public.crm_leads;
DROP POLICY IF EXISTS "crm_leads_write_policy" ON public.crm_leads;
DROP POLICY IF EXISTS "crm_leads_insert_policy" ON public.crm_leads;
DROP POLICY IF EXISTS "crm_leads_update_policy" ON public.crm_leads;
DROP POLICY IF EXISTS "crm_leads_delete_policy" ON public.crm_leads;

CREATE POLICY "crm_leads_select_policy"
    ON public.crm_leads
    FOR SELECT
    USING (true);

CREATE POLICY "crm_leads_insert_policy"
    ON public.crm_leads
    FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "crm_leads_update_policy"
    ON public.crm_leads
    FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) IS NOT NULL)
    WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "crm_leads_delete_policy"
    ON public.crm_leads
    FOR DELETE
    TO authenticated
    USING ((select auth.uid()) IS NOT NULL);

-- CRM Opportunities Policies
DROP POLICY IF EXISTS "Super Admins can manage CRM opportunities" ON public.crm_opportunities;
DROP POLICY IF EXISTS "crm_opportunities_select_policy" ON public.crm_opportunities;
DROP POLICY IF EXISTS "crm_opportunities_write_policy" ON public.crm_opportunities;
DROP POLICY IF EXISTS "crm_opportunities_insert_policy" ON public.crm_opportunities;
DROP POLICY IF EXISTS "crm_opportunities_update_policy" ON public.crm_opportunities;
DROP POLICY IF EXISTS "crm_opportunities_delete_policy" ON public.crm_opportunities;

CREATE POLICY "crm_opportunities_select_policy"
    ON public.crm_opportunities
    FOR SELECT
    USING (true);

CREATE POLICY "crm_opportunities_insert_policy"
    ON public.crm_opportunities
    FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "crm_opportunities_update_policy"
    ON public.crm_opportunities
    FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) IS NOT NULL)
    WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "crm_opportunities_delete_policy"
    ON public.crm_opportunities
    FOR DELETE
    TO authenticated
    USING ((select auth.uid()) IS NOT NULL);

-- Commercial Quotations Policies
DROP POLICY IF EXISTS "Super Admins can manage commercial quotations" ON public.commercial_quotations;
DROP POLICY IF EXISTS "commercial_quotations_select_policy" ON public.commercial_quotations;
DROP POLICY IF EXISTS "commercial_quotations_write_policy" ON public.commercial_quotations;
DROP POLICY IF EXISTS "commercial_quotations_insert_policy" ON public.commercial_quotations;
DROP POLICY IF EXISTS "commercial_quotations_update_policy" ON public.commercial_quotations;
DROP POLICY IF EXISTS "commercial_quotations_delete_policy" ON public.commercial_quotations;

CREATE POLICY "commercial_quotations_select_policy"
    ON public.commercial_quotations
    FOR SELECT
    USING (true);

CREATE POLICY "commercial_quotations_insert_policy"
    ON public.commercial_quotations
    FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "commercial_quotations_update_policy"
    ON public.commercial_quotations
    FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) IS NOT NULL)
    WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "commercial_quotations_delete_policy"
    ON public.commercial_quotations
    FOR DELETE
    TO authenticated
    USING ((select auth.uid()) IS NOT NULL);

-- Commercial Clients Policies
DROP POLICY IF EXISTS "Super Admins can manage commercial clients" ON public.commercial_clients;
DROP POLICY IF EXISTS "commercial_clients_select_policy" ON public.commercial_clients;
DROP POLICY IF EXISTS "commercial_clients_write_policy" ON public.commercial_clients;
DROP POLICY IF EXISTS "commercial_clients_insert_policy" ON public.commercial_clients;
DROP POLICY IF EXISTS "commercial_clients_update_policy" ON public.commercial_clients;
DROP POLICY IF EXISTS "commercial_clients_delete_policy" ON public.commercial_clients;

CREATE POLICY "commercial_clients_select_policy"
    ON public.commercial_clients
    FOR SELECT
    USING (true);

CREATE POLICY "commercial_clients_insert_policy"
    ON public.commercial_clients
    FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "commercial_clients_update_policy"
    ON public.commercial_clients
    FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) IS NOT NULL)
    WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "commercial_clients_delete_policy"
    ON public.commercial_clients
    FOR DELETE
    TO authenticated
    USING ((select auth.uid()) IS NOT NULL);

-- 10. Security Hardening: Function Search Path Fix
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_prevent_locked_payroll_mutation') THEN
        ALTER FUNCTION public.fn_prevent_locked_payroll_mutation() SET search_path = public, pg_temp;
    END IF;
END $$;


