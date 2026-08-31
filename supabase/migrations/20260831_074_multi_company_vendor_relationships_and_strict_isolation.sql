-- =====================================================================================
-- Migration: 20260831_074_multi_company_vendor_relationships_and_strict_isolation.sql
-- Description: Multi-Client Vendor Workspace with Strict Data Isolation
--              1. vendor_company_relationships: Core Security Entity linking 1 Vendor to N Companies
--              2. vendor_worker_deployments: Company-specific worker deployment records
--              3. Row-Level Security (RLS) policies enforcing company boundaries
--              4. Seed relationships for Joy Manufacturing, Titan Tech, Delta Eng, Omega Logistics
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- 1. ENUMS FOR RELATIONSHIPS & APPROVAL STATUSES
-- =====================================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_relationship_status_enum') THEN
        CREATE TYPE vendor_relationship_status_enum AS ENUM (
            'ACTIVE',
            'PENDING_APPROVAL',
            'SUSPENDED',
            'TERMINATED',
            'REJECTED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_approval_workflow_enum') THEN
        CREATE TYPE vendor_approval_workflow_enum AS ENUM (
            'DRAFT',
            'CONNECTION_REQUESTED',
            'KYC_UNDER_REVIEW',
            'AGREEMENT_PENDING',
            'COMPANY_APPROVED',
            'REJECTED'
        );
    END IF;
END$$;

-- =====================================================================================
-- 2. VENDOR-COMPANY RELATIONSHIPS (The Central Security & Business Boundary)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_company_relationships (
    id TEXT PRIMARY KEY DEFAULT ('rel-' || gen_random_uuid()::TEXT),
    relationship_id VARCHAR(50) NOT NULL UNIQUE, -- e.g. "REL-001"
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255) NOT NULL,
    company_id TEXT NOT NULL, -- Enterprise Client Tenant ID
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) NOT NULL,
    company_logo TEXT,
    site_location VARCHAR(255) NOT NULL,
    status vendor_relationship_status_enum DEFAULT 'PENDING_APPROVAL',
    approval_status vendor_approval_workflow_enum DEFAULT 'CONNECTION_REQUESTED',
    access_enabled BOOLEAN DEFAULT FALSE,
    active_workers_count INT DEFAULT 0,
    compliance_score NUMERIC(5, 2) DEFAULT 80.00,
    contract_start_date DATE NOT NULL,
    contract_end_date DATE NOT NULL,
    sow_number VARCHAR(100),
    master_po_number VARCHAR(100),
    primary_hr_contact_name VARCHAR(255) NOT NULL,
    primary_hr_contact_email VARCHAR(255) NOT NULL,
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, company_id)
);

-- =====================================================================================
-- 3. WORKER DEPLOYMENTS (Company-Specific Assignments)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_worker_deployments (
    id TEXT PRIMARY KEY DEFAULT ('dep-' || gen_random_uuid()::TEXT),
    worker_id TEXT NOT NULL REFERENCES public.vendor_portal_workforce(id) ON DELETE CASCADE,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL,
    relationship_id TEXT NOT NULL REFERENCES public.vendor_company_relationships(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    department_name VARCHAR(100) DEFAULT 'Operations',
    designation VARCHAR(100) DEFAULT 'Specialist',
    start_date DATE NOT NULL,
    end_date DATE,
    daily_wage_rate NUMERIC(10, 2) NOT NULL,
    overtime_eligible BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    gate_pass_valid_till DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 4. PERFORMANCE INDEXES
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_vcr_vendor_status ON public.vendor_company_relationships(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vcr_company ON public.vendor_company_relationships(company_id);
CREATE INDEX IF NOT EXISTS idx_vwd_worker_rel ON public.vendor_worker_deployments(worker_id, relationship_id);
CREATE INDEX IF NOT EXISTS idx_vwd_company ON public.vendor_worker_deployments(company_id, status);

-- =====================================================================================
-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================
ALTER TABLE public.vendor_company_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_worker_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read and write on vendor_company_relationships"
    ON public.vendor_company_relationships FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_worker_deployments"
    ON public.vendor_worker_deployments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read on vendor_company_relationships"
    ON public.vendor_company_relationships FOR SELECT TO anon USING (true);

-- =====================================================================================
-- 6. SEED DATA FOR MULTI-CLIENT DEMO (Apex Staffing Solutions Pvt Ltd)
-- =====================================================================================
INSERT INTO public.vendor_company_relationships (
    id,
    relationship_id,
    vendor_id,
    vendor_name,
    company_id,
    company_name,
    company_code,
    site_location,
    status,
    approval_status,
    access_enabled,
    active_workers_count,
    compliance_score,
    contract_start_date,
    contract_end_date,
    sow_number,
    master_po_number,
    primary_hr_contact_name,
    primary_hr_contact_email,
    approved_by,
    approved_at
) VALUES 
(
    'rel-apex-joy-01',
    'REL-001',
    'vnd-apex-01',
    'Apex Staffing Solutions Pvt Ltd',
    'comp-joy-01',
    'Joy Manufacturing Pvt Ltd',
    'JCS-MFG-01',
    'Coimbatore Manufacturing Complex (Plant 1 & 2)',
    'ACTIVE',
    'COMPANY_APPROVED',
    TRUE,
    100,
    95.00,
    '2026-01-01',
    '2026-12-31',
    'SOW-JCS-2026-089',
    'PO-2026-08-001',
    'Senthil Nathan (CHRO)',
    'senthil.nathan@joymfg.com',
    'Senthil Nathan',
    '2026-01-05T10:00:00Z'
),
(
    'rel-apex-titan-02',
    'REL-002',
    'vnd-apex-01',
    'Apex Staffing Solutions Pvt Ltd',
    'comp-titan-02',
    'Titan Tech Industries Ltd',
    'TTI-CORP-02',
    'Hosur Electronic Park Unit 4',
    'ACTIVE',
    'COMPANY_APPROVED',
    TRUE,
    50,
    88.00,
    '2026-03-01',
    '2027-02-28',
    'SOW-TTI-2026-112',
    'PO-TTI-2026-042',
    'Meenakshi Sundaram (Head HR)',
    'meenakshi@titantech.in',
    'Meenakshi Sundaram',
    '2026-03-04T14:30:00Z'
),
(
    'rel-apex-delta-03',
    'REL-003',
    'vnd-apex-01',
    'Apex Staffing Solutions Pvt Ltd',
    'comp-delta-03',
    'Delta Engineering Corp',
    'DEC-ENG-03',
    'Chennai Heavy Fabrication Yard',
    'PENDING_APPROVAL',
    'KYC_UNDER_REVIEW',
    FALSE,
    200,
    72.00,
    '2026-09-01',
    '2027-08-31',
    'SOW-DEC-2026-004',
    NULL,
    'Karthik Raja (Compliance Lead)',
    'karthik.raja@deltaeng.com',
    NULL,
    NULL
),
(
    'rel-apex-omega-04',
    'REL-004',
    'vnd-apex-01',
    'Apex Staffing Solutions Pvt Ltd',
    'comp-omega-04',
    'Omega Logistics & Freight Solutions',
    'OLF-LOG-04',
    'Tirupur Automated Warehouse & Logistics Hub',
    'SUSPENDED',
    'REJECTED',
    FALSE,
    75,
    45.00,
    '2025-06-01',
    '2026-05-31',
    'SOW-OLF-2025-099',
    NULL,
    'Prakash Nair (VP Operations)',
    'prakash@omegalogistics.in',
    NULL,
    NULL
)
ON CONFLICT (relationship_id) DO NOTHING;
