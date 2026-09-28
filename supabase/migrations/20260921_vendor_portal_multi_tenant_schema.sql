-- ============================================================================
-- Joy People HR — Vendor Portal & Multi-Tenant Data Isolation Schema
-- Production Migration: Vendor Master, Site Contracts, Compliance Vault,
-- Dual Ingestion Attendance, Daily OT, Miss Exceptions & Deductions
-- ============================================================================

-- 1. Vendor Company Profiles Table
CREATE TABLE IF NOT EXISTS public.vendor_company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(100) NOT NULL,
    vendor_code VARCHAR(50) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    pan VARCHAR(20) NOT NULL,
    gstin VARCHAR(30) NOT NULL,
    msme_number VARCHAR(100),
    incorporation_number VARCHAR(100),
    company_type VARCHAR(50) DEFAULT 'PRIVATE_LIMITED',
    esi_registration_number VARCHAR(100),
    pf_registration_number VARCHAR(100),
    sez_lutc_copy_number VARCHAR(100),
    bank_account_number VARCHAR(100),
    bank_name VARCHAR(255),
    bank_ifsc VARCHAR(50),
    bank_branch VARCHAR(255),
    bank_is_verified BOOLEAN DEFAULT FALSE,
    bank_verified_at TIMESTAMPTZ,
    authorized_contact JSONB NOT NULL DEFAULT '{}'::jsonb,
    compliance_contact JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vendor_company_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Client Site Contract Mappings Table
CREATE TABLE IF NOT EXISTS public.vendor_site_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id VARCHAR(100) NOT NULL,
    organization_id VARCHAR(100) NOT NULL,
    company_id VARCHAR(100) NOT NULL, -- Client Company ID (e.g. comp-joy-che)
    company_name VARCHAR(255) NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    contract_code VARCHAR(100) NOT NULL,
    sow_number VARCHAR(100),
    master_po_number VARCHAR(100),
    clra_form_v_number VARCHAR(100),
    max_workforce_capacity INTEGER DEFAULT 50,
    active_workforce_count INTEGER DEFAULT 0,
    service_charge_percentage NUMERIC(5, 2) DEFAULT 8.50,
    contract_start_date DATE NOT NULL,
    contract_end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendor_site_contracts ENABLE ROW LEVEL SECURITY;

-- 3. Vendor Compliance Documents Repository Table
CREATE TABLE IF NOT EXISTS public.vendor_compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(100) NOT NULL,
    vendor_id VARCHAR(100) NOT NULL,
    client_site_contract_id VARCHAR(100),
    category VARCHAR(100) NOT NULL, -- COMPANY_REGISTRATION, STATUTORY_ESI_PF, LABOUR_LICENSE, etc.
    document_type VARCHAR(100) NOT NULL,
    reporting_period VARCHAR(50) NOT NULL, -- '2026-09' or '2026-FY'
    period_type VARCHAR(50) DEFAULT 'MONTHLY',
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'SUBMITTED', -- DRAFT, SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    reviewer_remarks TEXT,
    official_portal_url TEXT,
    external_reference_number VARCHAR(100),
    due_date DATE
);

ALTER TABLE public.vendor_compliance_documents ENABLE ROW LEVEL SECURITY;

-- 4. Vendor Attendance Batches (Mode B Uploads)
CREATE TABLE IF NOT EXISTS public.vendor_attendance_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(100) NOT NULL,
    vendor_id VARCHAR(100) NOT NULL,
    client_site_contract_id VARCHAR(100) NOT NULL,
    batch_name VARCHAR(255) NOT NULL,
    period_month VARCHAR(20) NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by VARCHAR(255) NOT NULL,
    total_records INTEGER DEFAULT 0,
    valid_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'STAGED',
    raw_payload JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.vendor_attendance_batches ENABLE ROW LEVEL SECURITY;

-- 5. Daily Overtime (OT) Records Table
CREATE TABLE IF NOT EXISTS public.vendor_daily_ot_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(100) NOT NULL,
    vendor_id VARCHAR(100) NOT NULL,
    client_site_contract_id VARCHAR(100) NOT NULL,
    employee_id VARCHAR(100) NOT NULL,
    employee_code VARCHAR(100) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    shift_hours NUMERIC(4, 2) DEFAULT 8.00,
    actual_worked_hours NUMERIC(4, 2) NOT NULL,
    break_duration_minutes INTEGER DEFAULT 60,
    potential_ot_hours NUMERIC(4, 2) DEFAULT 0.00,
    approved_ot_hours NUMERIC(4, 2) DEFAULT 0.00,
    ot_hourly_rate NUMERIC(10, 2) NOT NULL,
    ot_payable_amount NUMERIC(10, 2) NOT NULL,
    approval_status VARCHAR(50) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    remarks TEXT
);

ALTER TABLE public.vendor_daily_ot_records ENABLE ROW LEVEL SECURITY;

-- 6. Hierarchical Attendance Miss Exceptions Table
CREATE TABLE IF NOT EXISTS public.vendor_attendance_miss_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(100) NOT NULL,
    vendor_id VARCHAR(100) NOT NULL,
    client_site_contract_id VARCHAR(100) NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    manager_id VARCHAR(100) NOT NULL,
    manager_name VARCHAR(255) NOT NULL,
    tl_supervisor_id VARCHAR(100),
    tl_supervisor_name VARCHAR(255),
    employee_id VARCHAR(100) NOT NULL,
    employee_code VARCHAR(100) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    exception_type VARCHAR(100) NOT NULL,
    in_time VARCHAR(20),
    out_time VARCHAR(20),
    standard_hours NUMERIC(4, 2) DEFAULT 8.00,
    actual_hours NUMERIC(4, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'OPEN',
    escalation_level INTEGER DEFAULT 0,
    last_notified_at TIMESTAMPTZ,
    resolution_remarks TEXT,
    resolved_by VARCHAR(255)
);

ALTER TABLE public.vendor_attendance_miss_exceptions ENABLE ROW LEVEL SECURITY;

-- 7. Governed Deductions & Recoveries Table
CREATE TABLE IF NOT EXISTS public.vendor_payroll_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(100) NOT NULL,
    vendor_id VARCHAR(100) NOT NULL,
    period_month VARCHAR(20) NOT NULL,
    employee_id VARCHAR(100),
    canteen_deduction NUMERIC(10, 2) DEFAULT 0.00,
    room_rent_deduction NUMERIC(10, 2) DEFAULT 0.00,
    meal_deduction NUMERIC(10, 2) DEFAULT 0.00,
    transport_deduction NUMERIC(10, 2) DEFAULT 0.00,
    short_hours_deduction NUMERIC(10, 2) DEFAULT 0.00,
    physical_damage_recovery NUMERIC(10, 2) DEFAULT 0.00,
    disciplinary_fine NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'APPROVED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendor_payroll_deductions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict boundary: Vendor users access only their own vendor_id; HR Admins access tenant scope
-- ============================================================================

CREATE POLICY "Vendor profiles isolation policy"
    ON public.vendor_company_profiles
    FOR ALL
    USING (
        organization_id = current_setting('app.current_organization_id', true)
        AND (
            current_setting('app.current_user_role', true) IN ('HR Admin', 'HR Head', 'Company Admin', 'Super Admin')
            OR vendor_code = current_setting('app.current_vendor_code', true)
        )
    );

CREATE POLICY "Vendor compliance documents isolation policy"
    ON public.vendor_compliance_documents
    FOR ALL
    USING (
        organization_id = current_setting('app.current_organization_id', true)
        AND (
            current_setting('app.current_user_role', true) IN ('HR Admin', 'HR Head', 'Company Admin', 'Super Admin')
            OR vendor_id = current_setting('app.current_vendor_id', true)
        )
    );

CREATE POLICY "Vendor daily OT isolation policy"
    ON public.vendor_daily_ot_records
    FOR ALL
    USING (
        organization_id = current_setting('app.current_organization_id', true)
        AND (
            current_setting('app.current_user_role', true) IN ('HR Admin', 'HR Head', 'Company Admin', 'Super Admin', 'Manager')
            OR vendor_id = current_setting('app.current_vendor_id', true)
        )
    );

CREATE POLICY "Vendor attendance miss exceptions isolation policy"
    ON public.vendor_attendance_miss_exceptions
    FOR ALL
    USING (
        organization_id = current_setting('app.current_organization_id', true)
        AND (
            current_setting('app.current_user_role', true) IN ('HR Admin', 'HR Head', 'Company Admin', 'Super Admin', 'Manager', 'Team Lead')
            OR vendor_id = current_setting('app.current_vendor_id', true)
        )
    );
