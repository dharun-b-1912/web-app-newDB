-- =====================================================================================
-- Enterprise Vendor & Manpower Management Master Schema (WorkforceOS v2.0)
-- Migration: 20260829_068_enterprise_vendor_and_manpower_management_master.sql
-- Description: Complete production schema for Vendors, Contracts, Compliance,
--              Assigned Manpower Directory, Deployments, 3-Way Match Invoices,
--              Returned Disbursements, and Immutable Audit Trails.
-- =====================================================================================

-- 1. EXTENSIONS & TYPES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum Types (with safe IF NOT EXISTS pattern)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_type_enum') THEN
        CREATE TYPE vendor_type_enum AS ENUM (
            'MANPOWER_PROVIDER',
            'RECRUITMENT_AGENCY',
            'CONTRACTOR',
            'IT_SERVICE_PROVIDER',
            'FACILITY_SERVICE_PROVIDER',
            'CONSULTING',
            'OTHER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_status_enum') THEN
        CREATE TYPE vendor_status_enum AS ENUM (
            'DRAFT',
            'PENDING_VERIFICATION',
            'ACTIVE',
            'SUSPENDED',
            'TERMINATED',
            'BLACKLISTED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_worker_category_enum') THEN
        CREATE TYPE vendor_worker_category_enum AS ENUM (
            'Highly Skilled',
            'Skilled',
            'Semi-Skilled',
            'Unskilled'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_worker_status_enum') THEN
        CREATE TYPE vendor_worker_status_enum AS ENUM (
            'ACTIVE',
            'PENDING_COMPANY_APPROVAL',
            'EXIT_REQUESTED',
            'EXIT_APPROVED',
            'INACTIVE'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_payment_status_enum') THEN
        CREATE TYPE vendor_payment_status_enum AS ENUM (
            'PENDING',
            'PROCESSED',
            'PAID',
            'RETURNED',
            'CANCELLED',
            'ON_HOLD'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_return_reason_enum') THEN
        CREATE TYPE vendor_return_reason_enum AS ENUM (
            'INVALID_ACCOUNT',
            'IFSC_DISCREPANCY',
            'BENEFICIARY_MISMATCH',
            'BANK_REJECTION',
            'ACCOUNT_CLOSED',
            'DUPLICATE_PAYMENT',
            'COMPLIANCE_HOLD',
            'OTHER'
        );
    END IF;
END$$;

-- =====================================================================================
-- 2. CORE VENDORS MASTER TABLE
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY DEFAULT ('vnd-' || gen_random_uuid()::TEXT),
    organization_id TEXT NOT NULL,
    legal_entity_id TEXT,
    legal_entity_name VARCHAR(255),
    vendor_code VARCHAR(50) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    vendor_type VARCHAR(100) NOT NULL DEFAULT 'MANPOWER_PROVIDER',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    pan VARCHAR(20),
    gstin VARCHAR(20),
    logo_url TEXT,
    primary_contact_name VARCHAR(150) NOT NULL,
    primary_contact_designation VARCHAR(100),
    primary_contact_email VARCHAR(255) NOT NULL,
    primary_contact_phone VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    website VARCHAR(255),
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(100) DEFAULT 'Coimbatore',
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    manpower_license_no VARCHAR(100),
    manpower_license_expiry DATE,
    max_workforce_capacity INTEGER DEFAULT 100 CHECK (max_workforce_capacity >= 0),
    authorized_workforce_categories TEXT[] DEFAULT ARRAY['Contract Labour', 'Facility Operations'],
    contract_start_date DATE,
    contract_end_date DATE,
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    currency VARCHAR(10) DEFAULT 'INR',
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
    bank_name VARCHAR(150),
    account_name VARCHAR(255),
    account_number_masked VARCHAR(50),
    account_number_encrypted TEXT,
    ifsc_code VARCHAR(20),
    swift_code VARCHAR(20),
    bank_branch VARCHAR(150),
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 3. VENDOR CONTRACTS & SERVICE LEVEL AGREEMENTS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_contracts (
    id TEXT PRIMARY KEY DEFAULT ('cnt-' || gen_random_uuid()::TEXT),
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    legal_entity_id TEXT,
    legal_entity_name VARCHAR(255),
    contract_number VARCHAR(100) NOT NULL,
    contract_type VARCHAR(100) NOT NULL DEFAULT 'Master Service Agreement (MSA)',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_date DATE,
    notice_period_days INTEGER DEFAULT 30,
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    currency VARCHAR(10) DEFAULT 'INR',
    rate_card_type VARCHAR(50) DEFAULT 'Per Head Per Month',
    service_charge_percentage NUMERIC(5, 2) DEFAULT 8.50,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 4. VENDOR STATUTORY & COMPLIANCE DOCUMENTS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_documents (
    id TEXT PRIMARY KEY DEFAULT ('vdoc-' || gen_random_uuid()::TEXT),
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    document_url TEXT,
    file_url TEXT,
    file_size_bytes BIGINT,
    expiry_date DATE,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 5. VENDOR ASSIGNED MANPOWER DIRECTORY (EMPLOYEES)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_employees (
    id TEXT PRIMARY KEY DEFAULT ('vemp-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255),
    employee_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    display_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    worker_category VARCHAR(100) NOT NULL DEFAULT 'Skilled',
    skill_category VARCHAR(150) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    date_of_joining DATE DEFAULT CURRENT_DATE,
    current_client_id VARCHAR(100) DEFAULT 'comp-joy-01',
    current_client_name VARCHAR(255) DEFAULT 'Joy Corporate Solutions Pvt Ltd',
    work_location VARCHAR(255) DEFAULT 'Coimbatore Plant 1',
    project_name VARCHAR(255) DEFAULT 'Core Manufacturing Operations',
    shift_name VARCHAR(100) DEFAULT 'General Shift (08:30 - 17:30)',
    uan VARCHAR(50),
    esic_number VARCHAR(50),
    aadhaar_masked VARCHAR(20),
    pan VARCHAR(20),
    monthly_gross NUMERIC(12, 2) DEFAULT 18500.00,
    daily_wage_rate NUMERIC(10, 2) DEFAULT 712.00,
    ot_hourly_rate NUMERIC(10, 2) DEFAULT 178.00,
    bank_name VARCHAR(150),
    bank_account_number VARCHAR(100),
    ifsc_code VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_vendor_emp_code UNIQUE (vendor_id, employee_code)
);

-- =====================================================================================
-- 6. WORKFORCE DEPLOYMENTS & CLIENT SITE ALLOCATIONS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_employee_assignments (
    id TEXT PRIMARY KEY DEFAULT ('vasgn-' || gen_random_uuid()::TEXT),
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.vendor_employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    worker_category VARCHAR(50) NOT NULL,
    client_name VARCHAR(255) NOT NULL DEFAULT 'Joy Corporate Solutions Pvt Ltd',
    work_location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 7. ATTENDANCE PUNCHES & BIOMETRIC SYNC
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_attendance_records (
    id TEXT PRIMARY KEY DEFAULT ('vatt-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.vendor_employees(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    shift_code VARCHAR(50) DEFAULT 'GEN',
    first_in TIME,
    last_out TIME,
    total_hours_worked NUMERIC(5, 2) DEFAULT 8.00,
    ot_hours NUMERIC(5, 2) DEFAULT 0.00,
    late_minutes INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'P',
    is_client_verified BOOLEAN DEFAULT TRUE,
    is_overtime_approved BOOLEAN DEFAULT FALSE,
    source VARCHAR(50) DEFAULT 'BIOMETRIC_DEVICE',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_vendor_emp_date UNIQUE (employee_id, date)
);

-- =====================================================================================
-- 8. PURCHASE ORDERS & SOWS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_purchase_orders (
    id TEXT PRIMARY KEY DEFAULT ('vpo-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    po_number VARCHAR(100) NOT NULL UNIQUE,
    po_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    department VARCHAR(100) NOT NULL,
    cost_center VARCHAR(100) NOT NULL,
    description TEXT,
    currency VARCHAR(10) DEFAULT 'INR',
    total_budget NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    utilized_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 9. INVOICES & 3-WAY MATCHING (PO + ATTENDANCE + INVOICE)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
    id TEXT PRIMARY KEY DEFAULT ('vinv-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    billing_period VARCHAR(20) NOT NULL, -- e.g. '2026-08'
    po_id TEXT REFERENCES public.vendor_purchase_orders(id),
    po_number VARCHAR(100),
    base_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    service_charge_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tds_deduction_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_payable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    three_way_match_status VARCHAR(50) DEFAULT 'MATCH_CONFIRMED',
    attendance_variance_hours NUMERIC(6, 2) DEFAULT 0.00,
    rate_variance_amount NUMERIC(10, 2) DEFAULT 0.00,
    invoice_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_vendor_inv UNIQUE (vendor_id, invoice_number)
);

-- =====================================================================================
-- 10. PAYMENTS, DISBURSEMENTS & RETURN RECONCILIATION
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_payments (
    id TEXT PRIMARY KEY DEFAULT ('vpay-' || gen_random_uuid()::TEXT),
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    invoice_id TEXT REFERENCES public.vendor_invoices(id),
    invoice_reference VARCHAR(100),
    invoice_number VARCHAR(100),
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(50) DEFAULT 'NEFT / RTGS',
    transaction_reference_utr VARCHAR(100),
    bank_account_number VARCHAR(100),
    ifsc_code VARCHAR(20),
    payment_date DATE,
    return_reason VARCHAR(100),
    return_notes TEXT,
    returned_date DATE,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 11. STATUTORY PF / ESIC ECR CHALLANS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_statutory_challans (
    id TEXT PRIMARY KEY DEFAULT ('vchl-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    billing_period VARCHAR(20) NOT NULL,
    challan_type VARCHAR(50) NOT NULL, -- 'EPFO_ECR', 'ESIC_CHALLAN', 'PT_REMITTANCE'
    challan_number VARCHAR(100) NOT NULL,
    remitted_amount NUMERIC(12, 2) NOT NULL,
    employee_count INTEGER NOT NULL,
    ecr_receipt_number VARCHAR(100),
    challan_file_url TEXT,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED',
    verified_by TEXT,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 12. IMMUTABLE AUDIT TRAIL
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('vaudit-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    performed_by VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT 'Company Admin',
    ip_address VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 13. INDEXES FOR LIGHTNING-FAST SEARCH & MULTI-CRITERIA FILTERING
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_vendors_tenant_status ON public.vendors(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON public.vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON public.vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_city_state ON public.vendors(city, state);
CREATE INDEX IF NOT EXISTS idx_vendors_legal_name_trgm ON public.vendors USING gin (legal_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vendors_contact_trgm ON public.vendors USING gin (primary_contact_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_v_emp_vendor_status ON public.vendor_employees(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_v_emp_category ON public.vendor_employees(worker_category);
CREATE INDEX IF NOT EXISTS idx_v_emp_dept ON public.vendor_employees(department);
CREATE INDEX IF NOT EXISTS idx_v_emp_code ON public.vendor_employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_v_emp_name_trgm ON public.vendor_employees USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_v_att_emp_date ON public.vendor_attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_v_att_vendor_date ON public.vendor_attendance_records(vendor_id, date);

CREATE INDEX IF NOT EXISTS idx_v_inv_vendor_period ON public.vendor_invoices(vendor_id, billing_period);
CREATE INDEX IF NOT EXISTS idx_v_inv_status ON public.vendor_invoices(status);

CREATE INDEX IF NOT EXISTS idx_v_pay_vendor_status ON public.vendor_payments(vendor_id, status);

-- =====================================================================================
-- 14. AUTO-UPDATING TIMESTAMP TRIGGER
-- =====================================================================================
CREATE OR REPLACE FUNCTION update_vendor_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_vendors_modtime ON public.vendors;
CREATE TRIGGER trg_update_vendors_modtime
BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION update_vendor_timestamp();

DROP TRIGGER IF EXISTS trg_update_vendor_employees_modtime ON public.vendor_employees;
CREATE TRIGGER trg_update_vendor_employees_modtime
BEFORE UPDATE ON public.vendor_employees
FOR EACH ROW EXECUTE FUNCTION update_vendor_timestamp();

-- =====================================================================================
-- 15. ROW-LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated tenant access
DROP POLICY IF EXISTS "Tenant isolation for vendors" ON public.vendors;
CREATE POLICY "Tenant isolation for vendors" ON public.vendors
    FOR ALL TO authenticated
    USING (organization_id = (auth.jwt() ->> 'organization_id')::TEXT);

DROP POLICY IF EXISTS "Tenant isolation for vendor_employees" ON public.vendor_employees;
CREATE POLICY "Tenant isolation for vendor_employees" ON public.vendor_employees
    FOR ALL TO authenticated
    USING (tenant_id = (auth.jwt() ->> 'organization_id')::TEXT);

-- =====================================================================================
-- 16. SEED DATA FOR TESTING & INSTANT DEMO INITIALIZATION
-- =====================================================================================
INSERT INTO public.vendors (
    id, organization_id, vendor_code, legal_name, trade_name, vendor_type, status,
    registration_number, tax_id, pan, gstin, primary_contact_name, primary_contact_designation,
    primary_contact_email, primary_contact_phone, city, state, postal_code,
    manpower_license_no, max_workforce_capacity, bank_name, account_name, account_number_masked, ifsc_code
) VALUES (
    'vnd-apex-01',
    'org-joy-01',
    'VEN-000001',
    'Apex Industrial Manpower & Staffing Solutions',
    'Apex Workforce Global',
    'MANPOWER_PROVIDER',
    'ACTIVE',
    'U74999TZ2018PTC030112',
    '33AAACA1234F1Z8',
    'AAACA1234F',
    '33AAACA1234F1Z8',
    'Ramesh Varma',
    'Operations Director',
    'ramesh.varma@apexstaffing.in',
    '+91 98402 11223',
    'Coimbatore',
    'Tamil Nadu',
    '641021',
    'TN-CBE-CLA-2024-8891',
    250,
    'HDFC Bank Ltd',
    'Apex Industrial Manpower & Staffing Solutions',
    '•••• •••• 1122',
    'HDFC0001234'
) ON CONFLICT (id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    vendor_type = EXCLUDED.vendor_type,
    status = EXCLUDED.status;

INSERT INTO public.vendors (
    id, organization_id, vendor_code, legal_name, trade_name, vendor_type, status,
    registration_number, tax_id, pan, gstin, primary_contact_name, primary_contact_designation,
    primary_contact_email, primary_contact_phone, city, state, postal_code,
    manpower_license_no, max_workforce_capacity, bank_name, account_name, account_number_masked, ifsc_code
) VALUES (
    'vnd-precision-02',
    'org-joy-01',
    'VEN-000002',
    'Precision Tech & Security Logistics LLP',
    'Precision Security & Facility',
    'FACILITY_SERVICE_PROVIDER',
    'ACTIVE',
    'LLPIN-AAB-9988',
    '33AABCP9988G1Z2',
    'AABCP9988G',
    '33AABCP9988G1Z2',
    'Col. Sanjeev Nair (Retd.)',
    'Managing Partner',
    'ops@precisionlogistics.in',
    '+91 97890 55443',
    'Coimbatore',
    'Tamil Nadu',
    '641014',
    'TN-PSARA-2025-1044',
    150,
    'ICICI Bank',
    'Precision Tech & Security Logistics LLP',
    '•••• •••• 2389',
    'ICIC0000034'
) ON CONFLICT (id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    vendor_type = EXCLUDED.vendor_type,
    status = EXCLUDED.status;

INSERT INTO public.vendors (
    id, organization_id, vendor_code, legal_name, trade_name, vendor_type, status,
    registration_number, tax_id, pan, gstin, primary_contact_name, primary_contact_designation,
    primary_contact_email, primary_contact_phone, city, state, postal_code,
    max_workforce_capacity, bank_name, account_name, account_number_masked, ifsc_code
) VALUES (
    'vnd-matrix-03',
    'org-joy-01',
    'VEN-000003',
    'Matrix Talent & Contingent Staffing Services',
    'Matrix Contingent Workforce',
    'RECRUITMENT_AGENCY',
    'PENDING_VERIFICATION',
    'U72900KA2021PTC145566',
    '29AACCM5544H1Z4',
    'AACCM5544H',
    '29AACCM5544H1Z4',
    'Ananya Deshmukh',
    'Client Relationship Head',
    'ananya.d@matrixtalent.in',
    '+91 91234 56789',
    'Bengaluru',
    'Karnataka',
    '560103',
    100,
    'Axis Bank',
    'Matrix Talent & Contingent Staffing Services',
    '•••• •••• 8901',
    'UTIB0000123'
) ON CONFLICT (id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    vendor_type = EXCLUDED.vendor_type,
    status = EXCLUDED.status;
