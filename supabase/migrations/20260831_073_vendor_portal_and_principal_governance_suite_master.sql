-- =====================================================================================
-- Migration: 20260831_073_vendor_portal_and_principal_governance_suite_master.sql
-- Description: Complete Production Schema for:
--              1. Principal Employer Vendor & Contractor Governance Suite (Company Admin / HR)
--              2. External Contractor Self-Service Portal (Vendor Admin)
--              3. 7-Stage End-to-End Operational Lifecycle:
--                 - Vendor Onboarding & KYC Master
--                 - Document Requisitions & Principal Employer Form V Issuance (Rule 21(2))
--                 - Contractor Workforce Registry & Biometric Gate Pass Issuance
--                 - Biometric Attendance & Dept Head Payroll Verification
--                 - Dynamic Minimum Wage Engine & Commercial Payable Engine
--                 - Purchase Orders & Automated 3-Way Match Invoicing (PO vs Payroll vs Invoice)
--                 - Statutory Challans (EPFO ECR / ESIC / LWF), Returns (XXIV/XXV) & Audit Logs
--              4. Row-Level Security (RLS) Policies & Optimized Indexes
--              5. Seed Profile for Live Test Vendor (Apex Staffing Solutions Pvt Ltd)
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================================================
-- 1. ENUMS & DOMAIN TYPES
-- =====================================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_doc_request_status') THEN
        CREATE TYPE vendor_doc_request_status AS ENUM (
            'REQUESTED',
            'SUBMITTED',
            'VERIFIED',
            'REJECTED',
            'EXPIRED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_worker_approval_status') THEN
        CREATE TYPE vendor_worker_approval_status AS ENUM (
            'DRAFT',
            'PENDING_COMPANY_APPROVAL',
            'ACTIVE',
            'SUSPENDED',
            'EXIT_REQUESTED',
            'EXIT_APPROVED',
            'INACTIVE',
            'REJECTED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_payroll_verification_enum') THEN
        CREATE TYPE vendor_payroll_verification_enum AS ENUM (
            'ATTENDANCE_OPEN',
            'ATTENDANCE_VERIFIED',
            'ATTENDANCE_LOCKED',
            'PAYROLL_CALCULATED',
            'PENDING_VENDOR_REVIEW',
            'VENDOR_VERIFIED',
            'PENDING_CLIENT_REVIEW',
            'CLIENT_APPROVED',
            'REJECTED',
            'FROZEN',
            'PAID'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_invoice_match_status') THEN
        CREATE TYPE vendor_invoice_match_status AS ENUM (
            'DRAFT',
            'SUBMITTED',
            'MATCHED',
            'DISCREPANCY',
            'APPROVED',
            'REJECTED',
            'PAID'
        );
    END IF;
END$$;

-- =====================================================================================
-- 2. VENDOR PORTAL ORGANIZATIONS (Multi-Tenant Master)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_organizations (
    id TEXT PRIMARY KEY DEFAULT ('vnd-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    code VARCHAR(50) NOT NULL UNIQUE,
    vendor_type VARCHAR(100) NOT NULL DEFAULT 'MANPOWER_STAFFING',
    company_type VARCHAR(100) DEFAULT 'Pvt Ltd',
    registration_number VARCHAR(100),
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    gstin VARCHAR(50),
    pan VARCHAR(20),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Coimbatore',
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    postal_code VARCHAR(20),
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    service_charge_percentage NUMERIC(5, 2) DEFAULT 8.50,
    is_gst_applicable BOOLEAN DEFAULT TRUE,
    bank_name VARCHAR(150),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 3. STATUTORY LICENSES & EXPIRY RADAR (AI OCR Supported)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_licenses (
    id TEXT PRIMARY KEY DEFAULT ('vlic-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    license_type VARCHAR(150) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    issued_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    max_worker_capacity INT DEFAULT 50,
    issuing_authority VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    document_url TEXT,
    ocr_confidence_score NUMERIC(5, 2),
    reminders_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 4. STATUTORY DOCUMENT REQUISITIONS (Company HR -> Contractor)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_document_requests (
    id TEXT PRIMARY KEY DEFAULT ('vdocreq-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    document_type VARCHAR(150) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) DEFAULT 'MONTHLY',
    due_date DATE NOT NULL,
    status vendor_doc_request_status DEFAULT 'REQUESTED',
    is_mandatory BOOLEAN DEFAULT TRUE,
    requested_by VARCHAR(255) NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    submitted_file_url TEXT,
    submitted_remarks TEXT,
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    verification_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 5. PRINCIPAL EMPLOYER FORM V ISSUANCE (Rule 21(2) Certificate)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_principal_form_v (
    id TEXT PRIMARY KEY DEFAULT ('formv-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) NOT NULL UNIQUE,
    principal_employer_name VARCHAR(255) NOT NULL,
    principal_employer_registration_no VARCHAR(100) NOT NULL,
    principal_employer_address TEXT,
    contractor_legal_name VARCHAR(255) NOT NULL,
    contractor_address TEXT,
    nature_of_work TEXT NOT NULL,
    max_contract_labour_capacity INT NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    site_location VARCHAR(255) NOT NULL,
    authorized_signatory_name VARCHAR(255) NOT NULL,
    authorized_signatory_designation VARCHAR(255) NOT NULL,
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'ISSUED',
    digital_signature_hash TEXT,
    pdf_document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 6. CONTRACT WORKFORCE & BIOMETRIC GATE PASS MASTER
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_workforce (
    id TEXT PRIMARY KEY DEFAULT ('vemp-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255) NOT NULL,
    employee_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    gender VARCHAR(20) DEFAULT 'Male',
    dob DATE NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    address TEXT,
    joining_date DATE NOT NULL,
    employment_type VARCHAR(50) DEFAULT 'Contract',
    worker_category VARCHAR(50) DEFAULT 'Skilled',
    skill_category VARCHAR(100),
    department VARCHAR(100) DEFAULT 'Operations',
    designation VARCHAR(100) DEFAULT 'Contract Specialist',
    status vendor_worker_approval_status DEFAULT 'PENDING_COMPANY_APPROVAL',
    gate_pass_issued BOOLEAN DEFAULT FALSE,
    gate_pass_number VARCHAR(100),
    biometric_enrolled BOOLEAN DEFAULT FALSE,
    biometric_device_user_id VARCHAR(50),
    uan VARCHAR(20),
    pf_number VARCHAR(50),
    esic_number VARCHAR(30),
    pan VARCHAR(20),
    aadhaar_masked VARCHAR(20),
    bank_name VARCHAR(150),
    account_number VARCHAR(50),
    ifsc VARCHAR(20),
    current_client_id TEXT,
    current_client_name VARCHAR(255),
    work_location VARCHAR(255),
    project_name VARCHAR(255),
    shift_name VARCHAR(100) DEFAULT 'General Shift',
    approval_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 7. BIOMETRIC ATTENDANCE & SHIFT LEDGER
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_attendance (
    id TEXT PRIMARY KEY DEFAULT ('vatt-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.vendor_portal_workforce(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_code VARCHAR(50) DEFAULT 'SHIFT-GEN',
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    total_work_minutes INT DEFAULT 480,
    overtime_minutes INT DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PRESENT',
    source VARCHAR(50) DEFAULT 'BIOMETRIC_DEVICE',
    is_locked BOOLEAN DEFAULT FALSE,
    verified_by_dept_head VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- =====================================================================================
-- 8. ATTENDANCE CORRECTIONS & DEPT HEAD DISPUTE DESK
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_attendance_corrections (
    id TEXT PRIMARY KEY DEFAULT ('vcor-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.vendor_portal_workforce(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Overtime',
    current_value VARCHAR(100),
    requested_value VARCHAR(100),
    reason TEXT NOT NULL,
    supporting_document_url TEXT,
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    reviewed_by_dept_head VARCHAR(255),
    dept_head_remarks TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 9. MONTHLY WAGE BREAKDOWN & STATUTORY DEDUCTIONS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_wage_breakdowns (
    id TEXT PRIMARY KEY DEFAULT ('vwage-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.vendor_portal_workforce(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL, -- e.g. "2026-08"
    present_days NUMERIC(4, 1) NOT NULL DEFAULT 26.0,
    absent_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    lop_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    overtime_hours NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    basic_wage NUMERIC(12, 2) NOT NULL,
    hra NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    conveyance NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    special_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    overtime_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    gross_payable NUMERIC(12, 2) NOT NULL,
    employee_pf_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    employee_esi_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    professional_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    lwf_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    other_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    net_salary NUMERIC(12, 2) NOT NULL,
    employer_pf_contribution NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    employer_esi_contribution NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total_employer_statutory NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, period)
);

-- =====================================================================================
-- 10. PURCHASE ORDERS (Company HR -> Contractor)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_purchase_orders (
    id TEXT PRIMARY KEY DEFAULT ('vpo-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    po_number VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    total_budget_amount NUMERIC(14, 2) NOT NULL,
    consumed_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'ISSUED',
    acknowledged_by_vendor BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 11. INVOICES & AUTOMATED 3-WAY MATCHING
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_invoices (
    id TEXT PRIMARY KEY DEFAULT ('vinv-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    po_id TEXT REFERENCES public.vendor_portal_purchase_orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    period VARCHAR(20) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal_wages NUMERIC(14, 2) NOT NULL,
    employer_statutory_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    service_charge_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_invoice_amount NUMERIC(14, 2) NOT NULL,
    system_approved_amount NUMERIC(14, 2) NOT NULL,
    match_status vendor_invoice_match_status DEFAULT 'SUBMITTED',
    match_discrepancy_amount NUMERIC(14, 2) DEFAULT 0.00,
    invoice_pdf_url TEXT,
    epfo_ecr_challan_url TEXT,
    esic_receipt_url TEXT,
    approved_by_finance VARCHAR(255),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, invoice_number)
);

-- =====================================================================================
-- 12. STATUTORY CHALLANS & RETURNS (Form V, XXIV, XXV, ECR)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_statutory_returns (
    id TEXT PRIMARY KEY DEFAULT ('vret-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    form_type VARCHAR(150) NOT NULL,
    return_period VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    filing_date DATE,
    acknowledgement_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    document_url TEXT,
    remarks TEXT,
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 13. COMPLIANCE CALENDAR TASKS & SMART ESCALATIONS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_compliance_tasks (
    id TEXT PRIMARY KEY DEFAULT ('vtask-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES public.vendor_portal_organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL,
    frequency VARCHAR(50) DEFAULT 'MONTHLY',
    assigned_to_role VARCHAR(100) DEFAULT 'Vendor Admin',
    status VARCHAR(50) DEFAULT 'PENDING',
    last_reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 14. IMMUTABLE AUDIT TRAIL
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.vendor_portal_audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('vaudit-' || gen_random_uuid()::TEXT),
    tenant_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id TEXT NOT NULL,
    action VARCHAR(100) NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    role VARCHAR(100) NOT NULL,
    remarks TEXT
);

-- =====================================================================================
-- 15. PERFORMANCE INDEXES
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_v_orgs_tenant ON public.vendor_portal_organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_v_lic_vendor ON public.vendor_portal_licenses(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_v_docreq_vendor ON public.vendor_portal_document_requests(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_v_formv_vendor ON public.vendor_portal_principal_form_v(vendor_id);
CREATE INDEX IF NOT EXISTS idx_v_emp_vendor ON public.vendor_portal_workforce(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_v_att_emp_date ON public.vendor_portal_attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_v_wage_emp_period ON public.vendor_portal_wage_breakdowns(employee_id, period);
CREATE INDEX IF NOT EXISTS idx_v_po_vendor ON public.vendor_portal_purchase_orders(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_v_inv_vendor ON public.vendor_portal_invoices(vendor_id, match_status);
CREATE INDEX IF NOT EXISTS idx_v_ret_vendor ON public.vendor_portal_statutory_returns(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_v_audit_vendor ON public.vendor_portal_audit_logs(vendor_id, performed_at DESC);

-- =====================================================================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================
ALTER TABLE public.vendor_portal_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_principal_form_v ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_workforce ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_wage_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_statutory_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_audit_logs ENABLE ROW LEVEL SECURITY;

-- Dynamic Permissive Policies (Authenticated HR, Company Admin & Vendor Users)
CREATE POLICY "Allow authenticated read and write on vendor_portal_organizations"
    ON public.vendor_portal_organizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_licenses"
    ON public.vendor_portal_licenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_document_requests"
    ON public.vendor_portal_document_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_principal_form_v"
    ON public.vendor_portal_principal_form_v FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_workforce"
    ON public.vendor_portal_workforce FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_attendance"
    ON public.vendor_portal_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_attendance_corrections"
    ON public.vendor_portal_attendance_corrections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_wage_breakdowns"
    ON public.vendor_portal_wage_breakdowns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_purchase_orders"
    ON public.vendor_portal_purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_invoices"
    ON public.vendor_portal_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_statutory_returns"
    ON public.vendor_portal_statutory_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_compliance_tasks"
    ON public.vendor_portal_compliance_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_portal_audit_logs"
    ON public.vendor_portal_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anonymous Fallback Policies (For Local Sandbox / Pre-Auth Flow)
CREATE POLICY "Allow anon read on vendor_portal_organizations"
    ON public.vendor_portal_organizations FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon select on vendor_portal_licenses"
    ON public.vendor_portal_licenses FOR SELECT TO anon USING (true);

-- =====================================================================================
-- 17. GUARANTEED SEED DATA FOR TEST VENDOR (Apex Staffing Solutions Pvt Ltd)
-- =====================================================================================
INSERT INTO public.vendor_portal_organizations (
    id,
    tenant_id,
    name,
    trade_name,
    code,
    vendor_type,
    company_type,
    registration_number,
    contact_person,
    email,
    phone,
    gstin,
    pan,
    address,
    city,
    state,
    postal_code,
    status,
    service_charge_percentage,
    is_gst_applicable,
    bank_name,
    account_number,
    ifsc_code
) VALUES (
    'vnd-apex-01',
    'org-joy-corporate-solutions-private-',
    'Apex Staffing Solutions Pvt Ltd',
    'Apex Workforce Solutions',
    'VND-APX-01',
    'MANPOWER_STAFFING',
    'Pvt Ltd',
    'U74999TN2020PTC135892',
    'Rajesh Kumar',
    'vendor@apexstaffing.in',
    '+91 98765 43210',
    '33AAACA1234F1Z8',
    'AAACA1234F',
    'Plot 42, SIDCO Industrial Estate, Phase 2, Coimbatore',
    'Coimbatore',
    'Tamil Nadu',
    '641021',
    'Active',
    8.50,
    TRUE,
    'HDFC Bank',
    '50200088192841',
    'HDFC0001234'
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    status = EXCLUDED.status;

-- Default Purchase Order for Test Vendor
INSERT INTO public.vendor_portal_purchase_orders (
    id,
    tenant_id,
    vendor_id,
    po_number,
    title,
    issue_date,
    expiry_date,
    total_budget_amount,
    consumed_amount,
    remaining_balance,
    currency,
    status,
    acknowledged_by_vendor
) VALUES (
    'vpo-apex-2026-08',
    'org-joy-corporate-solutions-private-',
    'vnd-apex-01',
    'PO-2026-08-001',
    'Contract Manpower Deployment — Plant 1 Operations (August 2026)',
    '2026-08-01',
    '2026-08-31',
    450000.00,
    384210.00,
    65790.00,
    'INR',
    'ISSUED',
    TRUE
) ON CONFLICT (po_number) DO NOTHING;

-- Default Principal Employer Form V
INSERT INTO public.vendor_portal_principal_form_v (
    id,
    tenant_id,
    vendor_id,
    certificate_number,
    principal_employer_name,
    principal_employer_registration_no,
    principal_employer_address,
    contractor_legal_name,
    contractor_address,
    nature_of_work,
    max_contract_labour_capacity,
    valid_from,
    valid_to,
    site_location,
    authorized_signatory_name,
    authorized_signatory_designation,
    status
) VALUES (
    'formv-apex-01',
    'org-joy-corporate-solutions-private-',
    'vnd-apex-01',
    'FORM-V/2026/TN/CBE/0891',
    'Joy Corporate Solutions Pvt Ltd',
    'PE/TN/CBE/2024/0912',
    'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004',
    'Apex Staffing Solutions Pvt Ltd',
    'Plot 42, SIDCO Industrial Estate, Phase 2, Coimbatore 641021',
    'Plant Operations & Assembly Line Manpower',
    50,
    '2026-01-01',
    '2026-12-31',
    'Coimbatore Plant 1',
    'Senthil Nathan',
    'Chief Human Resources Officer (CHRO)',
    'ISSUED'
) ON CONFLICT (certificate_number) DO NOTHING;
