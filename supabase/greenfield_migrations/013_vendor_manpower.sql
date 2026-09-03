-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 013
-- Target Project: ysiajemrqakfngasehhi
-- Description: Vendor Manpower OS, Contractors & Agency Billing
-- ============================================================================

-- 1. Vendors Master (Staffing & Contractor Agencies)
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    legal_name VARCHAR(200) NOT NULL,
    vendor_code VARCHAR(50) NOT NULL,
    pan_number VARCHAR(20),
    gstin VARCHAR(30),
    labour_license_number VARCHAR(50),
    contact_person VARCHAR(150),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(30),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'TERMINATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_vendors_org_code UNIQUE (organization_id, vendor_code)
);

CREATE INDEX IF NOT EXISTS idx_vendors_org ON public.vendors(organization_id);

-- 2. Vendor Contractual Workers
CREATE TABLE IF NOT EXISTS public.vendor_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    worker_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    aadhaar_number VARCHAR(20),
    deployed_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    deployed_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    daily_wage_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_vendor_workers_code UNIQUE (vendor_id, worker_code)
);

CREATE INDEX IF NOT EXISTS idx_vendor_workers_org ON public.vendor_workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_workers_vendor ON public.vendor_workers(vendor_id);

-- 3. Vendor Monthly Service Invoices
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    total_workers INTEGER NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_AUDIT', 'APPROVED', 'PAID', 'REJECTED')),
    document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_vendor_inv_org_num UNIQUE (organization_id, vendor_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_vendor_inv_org ON public.vendor_invoices(organization_id);
