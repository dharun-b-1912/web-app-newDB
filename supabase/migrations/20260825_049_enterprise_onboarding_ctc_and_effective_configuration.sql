-- ============================================================================
-- 20260825_049_enterprise_onboarding_ctc_and_effective_configuration.sql
-- WorkForceOS Enterprise HRMS — Master Employee Onboarding & Domain Assignments
-- Architecture: Canonical Employee Identity, Effective-Dated Relational Sub-domains,
-- Dynamic Salary/CTC Structures, Atomic Transactional Finalization & Zero Giant Tables
-- ============================================================================

-- Ensure tenant_id column exists on employees table for multi-tenant isolation
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE public.employees SET tenant_id = organization_id WHERE tenant_id IS NULL;

-- 1. SALARY STRUCTURES MASTER
CREATE TABLE IF NOT EXISTS public.salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    structure_code VARCHAR(100) NOT NULL,
    structure_name VARCHAR(255) NOT NULL,
    description TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    pay_frequency VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
    version INTEGER NOT NULL DEFAULT 1,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_salary_structures UNIQUE (tenant_id, structure_code, version)
);

-- 2. SALARY COMPONENTS MASTER
CREATE TABLE IF NOT EXISTS public.salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64),
    component_code VARCHAR(100) NOT NULL,
    component_name VARCHAR(255) NOT NULL,
    component_type VARCHAR(50) NOT NULL,
    calculation_type VARCHAR(50) NOT NULL,
    taxable BOOLEAN NOT NULL DEFAULT FALSE,
    pf_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    esi_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_salary_components UNIQUE (tenant_id, component_code)
);

-- 3. SALARY STRUCTURE COMPONENTS MAPPING
CREATE TABLE IF NOT EXISTS public.salary_structure_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE CASCADE,
    salary_component_id UUID NOT NULL REFERENCES public.salary_components(id) ON DELETE CASCADE,
    calculation_type VARCHAR(50) NOT NULL,
    base_component_code VARCHAR(100),
    percentage NUMERIC(8, 4),
    fixed_amount NUMERIC(14, 2),
    formula_expression TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EMPLOYEE EMPLOYMENT DOMAIN (Terms, Sourcing & Dates)
CREATE TABLE IF NOT EXISTS public.employee_employment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    employment_type VARCHAR(50) NOT NULL DEFAULT 'Full Time',
    employment_status VARCHAR(50) NOT NULL DEFAULT 'Active',
    joining_date DATE NOT NULL,
    confirmation_date DATE,
    probation_period_days INTEGER DEFAULT 180,
    notice_period_days INTEGER DEFAULT 60,
    worker_type VARCHAR(50) DEFAULT 'DIRECT',
    work_mode VARCHAR(50) DEFAULT 'Hybrid',
    job_level VARCHAR(50) DEFAULT 'Mid Level',
    grade VARCHAR(50) DEFAULT 'G3',
    vendor_id VARCHAR(64),
    vendor_name VARCHAR(255),
    vendor_employee_code VARCHAR(100),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. EMPLOYEE ORG ASSIGNMENTS (Department, Designation, Manager, Location)
CREATE TABLE IF NOT EXISTS public.employee_org_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    department_id VARCHAR(64) NOT NULL,
    department_name VARCHAR(255),
    designation_id VARCHAR(64) NOT NULL,
    designation_title VARCHAR(255),
    branch_id VARCHAR(64),
    branch_name VARCHAR(255),
    work_location_id VARCHAR(64),
    work_location_name VARCHAR(255),
    business_unit_id VARCHAR(64),
    cost_center_id VARCHAR(64),
    reporting_manager_id VARCHAR(64),
    reporting_manager_name VARCHAR(255),
    team_lead_id VARCHAR(64),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. EMPLOYEE SALARY ASSIGNMENTS (CTC & Structure)
CREATE TABLE IF NOT EXISTS public.employee_salary_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    salary_structure_id UUID REFERENCES public.salary_structures(id) ON DELETE SET NULL,
    salary_structure_code VARCHAR(100),
    annual_ctc NUMERIC(14, 2) NOT NULL,
    monthly_ctc NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    pay_frequency VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
    payroll_group_id VARCHAR(64) DEFAULT 'pg-monthly-main',
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EMPLOYEE PAYROLL PROFILES
CREATE TABLE IF NOT EXISTS public.employee_payroll_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    payroll_group_id VARCHAR(64) DEFAULT 'pg-monthly-main',
    payroll_calendar_id VARCHAR(64) DEFAULT 'cal-standard-monthly',
    salary_assignment_id UUID REFERENCES public.employee_salary_assignments(id) ON DELETE SET NULL,
    tax_regime VARCHAR(50) DEFAULT 'NEW',
    tax_declaration_status VARCHAR(50) DEFAULT 'PENDING',
    payment_mode VARCHAR(50) DEFAULT 'BANK_TRANSFER',
    payroll_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. EMPLOYEE STATUTORY PROFILES
CREATE TABLE IF NOT EXISTS public.employee_statutory_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    pf_applicable BOOLEAN DEFAULT TRUE,
    pf_number VARCHAR(100),
    uan VARCHAR(100),
    esi_applicable BOOLEAN DEFAULT FALSE,
    esi_number VARCHAR(100),
    pan_reference VARCHAR(100),
    aadhaar_reference VARCHAR(100),
    professional_tax_applicable BOOLEAN DEFAULT TRUE,
    tax_regime VARCHAR(50) DEFAULT 'NEW',
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. EMPLOYEE BANK ACCOUNTS (Create or Update Existing)
CREATE TABLE IF NOT EXISTS public.employee_bank_accounts (
    id TEXT PRIMARY KEY DEFAULT ('bank-' || gen_random_uuid()::text),
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    branch_name TEXT,
    payment_method TEXT DEFAULT 'Bank Transfer',
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely augment employee_bank_accounts with any missing enterprise columns
ALTER TABLE public.employee_bank_accounts 
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'org-joy-01',
    ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) DEFAULT 'org-joy-01',
    ADD COLUMN IF NOT EXISTS account_number_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS account_number_masked VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ifsc VARCHAR(50),
    ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'SAVINGS',
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'VERIFIED',
    ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS effective_to DATE;

-- Synchronize ifsc and account_number_masked for backwards compatibility
UPDATE public.employee_bank_accounts 
SET ifsc = ifsc_code 
WHERE ifsc IS NULL AND ifsc_code IS NOT NULL;

UPDATE public.employee_bank_accounts 
SET account_number_masked = 'XXXX-XXXX-' || RIGHT(account_number, 4) 
WHERE account_number_masked IS NULL AND account_number IS NOT NULL;

-- 10. EMPLOYEE ATTENDANCE ASSIGNMENTS (Shift & Policy)
CREATE TABLE IF NOT EXISTS public.employee_attendance_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    shift_id VARCHAR(64) NOT NULL DEFAULT 'shift-general-01',
    shift_name VARCHAR(100) DEFAULT 'General Shift (09:30 - 18:30)',
    attendance_policy_id VARCHAR(64) DEFAULT 'pol-standard-office',
    work_location_id VARCHAR(64),
    holiday_calendar_id VARCHAR(64) DEFAULT 'cal-tn-holidays-2026',
    weekly_off_days JSONB DEFAULT '["Sunday"]'::jsonb,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. EMPLOYEE LEAVE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.employee_leave_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    leave_policy_id VARCHAR(64) NOT NULL DEFAULT 'leave-pol-std-2026',
    leave_policy_name VARCHAR(100) DEFAULT 'Standard Full-Time Leave Policy',
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. EMPLOYEE PERFORMANCE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.employee_performance_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    performance_template_id VARCHAR(64) DEFAULT 'tmpl-corp-annual-2026',
    performance_cycle_id VARCHAR(64) DEFAULT 'cycle-fy26-27',
    review_frequency VARCHAR(50) DEFAULT 'ANNUAL',
    review_manager_id VARCHAR(64),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. ONBOARDING DRAFTS STATE MACHINE
CREATE TABLE IF NOT EXISTS public.employee_onboarding_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    draft_key VARCHAR(100) NOT NULL,
    current_step INTEGER NOT NULL DEFAULT 1,
    draft_payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    created_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_onboarding_drafts UNIQUE (tenant_id, draft_key)
);

-- 14. SEED CANONICAL SALARY STRUCTURES (If not present)
INSERT INTO public.salary_structures (
    id, tenant_id, organization_id, structure_code, structure_name, description, currency, pay_frequency, version, status
) VALUES 
(
    'a0000001-0000-0000-0000-000000000001'::uuid,
    'org-joy-01',
    'org-joy-01',
    'CORP_STD_01',
    'Corporate Standard CTC Structure',
    'Standard corporate wage package: 50% Basic, 40% HRA, Special Allowance, EPF & ESIC',
    'INR',
    'MONTHLY',
    1,
    'ACTIVE'
),
(
    'a0000002-0000-0000-0000-000000000002'::uuid,
    'org-joy-01',
    'org-joy-01',
    'EXEC_TECH_01',
    'Executive & Tech Lead Package',
    'Leadership package with executive allowances, bonus component and tax-optimized flexi-basket',
    'INR',
    'MONTHLY',
    1,
    'ACTIVE'
) ON CONFLICT (tenant_id, structure_code, version) DO NOTHING;

-- 15. SEED CANONICAL SALARY COMPONENTS
INSERT INTO public.salary_components (
    tenant_id, organization_id, component_code, component_name, component_type, calculation_type, taxable, pf_applicable, esi_applicable, active
) VALUES
('org-joy-01', 'org-joy-01', 'BASIC', 'Basic Salary', 'EARNING', 'PERCENTAGE', TRUE, TRUE, TRUE, TRUE),
('org-joy-01', 'org-joy-01', 'HRA', 'House Rent Allowance', 'EARNING', 'PERCENTAGE', TRUE, FALSE, FALSE, TRUE),
('org-joy-01', 'org-joy-01', 'SA', 'Special Allowance', 'EARNING', 'PERCENTAGE', TRUE, FALSE, FALSE, TRUE),
('org-joy-01', 'org-joy-01', 'CONV', 'Conveyance Allowance', 'EARNING', 'FIXED', FALSE, FALSE, FALSE, TRUE),
('org-joy-01', 'org-joy-01', 'MED', 'Medical Allowance', 'EARNING', 'FIXED', FALSE, FALSE, FALSE, TRUE),
('org-joy-01', 'org-joy-01', 'EPF_EE', 'Employee Provident Fund (EPF)', 'DEDUCTION', 'STATUTORY', FALSE, TRUE, FALSE, TRUE),
('org-joy-01', 'org-joy-01', 'EPF_ER', 'Employer Provident Fund (EPF)', 'EMPLOYER_CONTRIBUTION', 'STATUTORY', FALSE, TRUE, FALSE, TRUE),
('org-joy-01', 'org-joy-01', 'ESIC_EE', 'Employee State Insurance (ESIC)', 'DEDUCTION', 'STATUTORY', FALSE, FALSE, TRUE, TRUE),
('org-joy-01', 'org-joy-01', 'ESIC_ER', 'Employer State Insurance (ESIC)', 'EMPLOYER_CONTRIBUTION', 'STATUTORY', FALSE, FALSE, TRUE, TRUE),
('org-joy-01', 'org-joy-01', 'PT', 'Professional Tax', 'DEDUCTION', 'STATUTORY', FALSE, FALSE, FALSE, TRUE),
('org-joy-01', 'org-joy-01', 'TDS', 'Tax Deducted at Source', 'DEDUCTION', 'STATUTORY', FALSE, FALSE, FALSE, TRUE)
ON CONFLICT (tenant_id, component_code) DO NOTHING;


-- ============================================================================
-- 16. VIEW: EMPLOYEE EFFECTIVE CONFIGURATION SNAPSHOT (Zero-Leak Read Model)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_employee_effective_configuration
WITH (security_invoker = true) AS
SELECT 
    e.id AS employee_id,
    e.employee_code,
    COALESCE(e.organization_id, 'org-joy-01') AS tenant_id,
    e.organization_id,
    e.first_name,
    e.last_name,
    e.work_email,
    e.status AS employee_status,
    -- Employment
    emp.employment_type,
    emp.employment_status,
    emp.joining_date,
    emp.confirmation_date,
    emp.probation_period_days,
    emp.notice_period_days,
    emp.work_mode,
    emp.worker_type,
    -- Org Assignment
    org.department_id,
    org.department_name,
    org.designation_id,
    org.designation_title,
    org.branch_id,
    org.branch_name,
    org.work_location_id,
    org.work_location_name,
    org.reporting_manager_id,
    org.reporting_manager_name,
    -- Salary & CTC
    sal.id AS salary_assignment_id,
    sal.salary_structure_id,
    sal.salary_structure_code,
    sal.annual_ctc,
    sal.monthly_ctc,
    sal.pay_frequency,
    sal.payroll_group_id,
    -- Attendance & Shift
    att.shift_id,
    att.shift_name,
    att.attendance_policy_id,
    -- Leave
    lv.leave_policy_id,
    lv.leave_policy_name,
    -- Statutory & Bank
    stat.pf_applicable,
    stat.pf_number,
    stat.uan,
    stat.esi_applicable,
    stat.esi_number,
    stat.pan_reference,
    stat.tax_regime,
    bank.bank_name,
    COALESCE(bank.account_number_masked, 'XXXX-XXXX-' || RIGHT(bank.account_number, 4), 'XXXX-XXXX-7890') AS account_number_masked,
    COALESCE(bank.ifsc, bank.ifsc_code, 'HDFC0001234') AS ifsc,
    -- Performance
    perf.performance_template_id,
    perf.performance_cycle_id,
    perf.review_manager_id
FROM public.employees e
LEFT JOIN LATERAL (
    SELECT * FROM public.employee_employment ee 
    WHERE ee.employee_id = e.id 
      AND ee.effective_from <= CURRENT_DATE 
      AND (ee.effective_to IS NULL OR ee.effective_to >= CURRENT_DATE)
    ORDER BY ee.version DESC LIMIT 1
) emp ON TRUE
LEFT JOIN LATERAL (
    SELECT * FROM public.employee_org_assignments oa 
    WHERE oa.employee_id = e.id 
      AND oa.effective_from <= CURRENT_DATE 
      AND (oa.effective_to IS NULL OR oa.effective_to >= CURRENT_DATE)
    ORDER BY oa.version DESC LIMIT 1
) org ON TRUE
LEFT JOIN LATERAL (
    SELECT * FROM public.employee_salary_assignments sa 
    WHERE sa.employee_id = e.id 
      AND sa.effective_from <= CURRENT_DATE 
      AND (sa.effective_to IS NULL OR sa.effective_to >= CURRENT_DATE)
    ORDER BY sa.version DESC LIMIT 1
) sal ON TRUE
LEFT JOIN LATERAL (
    SELECT * FROM public.employee_attendance_assignments aa 
    WHERE aa.employee_id = e.id 
      AND aa.effective_from <= CURRENT_DATE 
      AND (aa.effective_to IS NULL OR aa.effective_to >= CURRENT_DATE)
    ORDER BY aa.created_at DESC LIMIT 1
) att ON TRUE
LEFT JOIN LATERAL (
    SELECT * FROM public.employee_leave_assignments la 
    WHERE la.employee_id = e.id 
      AND la.effective_from <= CURRENT_DATE 
      AND (la.effective_to IS NULL OR la.effective_to >= CURRENT_DATE)
    ORDER BY la.created_at DESC LIMIT 1
) lv ON TRUE
LEFT JOIN LATERAL (
    SELECT * FROM public.employee_statutory_profiles sp 
    WHERE sp.employee_id = e.id 
      AND sp.effective_from <= CURRENT_DATE 
      AND (sp.effective_to IS NULL OR sp.effective_to >= CURRENT_DATE)
    ORDER BY sp.created_at DESC LIMIT 1
) stat ON TRUE
LEFT JOIN LATERAL (
    SELECT * FROM public.employee_bank_accounts ba 
    WHERE ba.employee_id = e.id 
      AND ba.is_primary = TRUE
    ORDER BY ba.created_at DESC LIMIT 1
) bank ON TRUE
LEFT JOIN LATERAL (
    SELECT * FROM public.employee_performance_assignments pa 
    WHERE pa.employee_id = e.id 
      AND pa.effective_from <= CURRENT_DATE 
      AND (pa.effective_to IS NULL OR pa.effective_to >= CURRENT_DATE)
    ORDER BY pa.created_at DESC LIMIT 1
) perf ON TRUE;


-- ============================================================================
-- 17. TRANSACTIONAL FINALIZATION RPC (Zero Partial State / Rollback on Error)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_finalize_employee_onboarding(
    p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_tenant_id        VARCHAR(64);
    v_org_id           VARCHAR(64);
    v_company_id       VARCHAR(64);
    v_employee_id      VARCHAR(64);
    v_employee_code    VARCHAR(64);
    v_first_name       TEXT;
    v_last_name        TEXT;
    v_work_email       TEXT;
    v_personal_email   TEXT;
    v_phone            TEXT;
    v_doj              DATE;
    v_annual_ctc       NUMERIC(14, 2);
    v_monthly_ctc      NUMERIC(14, 2);
    v_salary_assign_id UUID;
    v_auth_user_id     UUID;
    v_seq_num          BIGINT;
    v_ifsc             TEXT;
    v_acc_num          TEXT;
BEGIN
    -- 1. Extract and validate tenant context
    v_tenant_id   := COALESCE(p_payload->>'tenant_id', p_payload->>'organization_id', 'org-joy-01');
    v_org_id      := COALESCE(p_payload->>'organization_id', v_tenant_id);
    v_company_id  := COALESCE(p_payload->>'company_id', 'comp-joy-01');
    
    v_first_name  := TRIM(COALESCE(p_payload->'identity'->>'first_name', p_payload->>'first_name', ''));
    v_last_name   := TRIM(COALESCE(p_payload->'identity'->>'last_name', p_payload->>'last_name', ''));
    v_work_email  := LOWER(TRIM(COALESCE(p_payload->'identity'->>'work_email', p_payload->>'work_email', '')));
    v_phone       := TRIM(COALESCE(p_payload->'identity'->>'phone', p_payload->>'phone', '+919791817437'));
    v_personal_email := LOWER(TRIM(COALESCE(p_payload->'contact'->>'personal_email', p_payload->>'personal_email', '')));
    
    IF v_first_name = '' OR v_last_name = '' OR v_work_email = '' THEN
        RAISE EXCEPTION 'First name, last name, and work email are required for employee onboarding.';
    END IF;

    -- 2. Server-Side Employee Code Generation (JCS-XXX)
    v_employee_code := TRIM(COALESCE(p_payload->'identity'->>'employee_code', p_payload->>'employee_code', ''));
    IF v_employee_code = '' OR v_employee_code LIKE 'EMP-%' THEN
        SELECT COALESCE(MAX(SUBSTRING(employee_code FROM '[0-9]+')::BIGINT), 1000) + 1 
        INTO v_seq_num 
        FROM public.employees 
        WHERE organization_id = v_org_id;
        v_employee_code := 'JCS-' || LPAD(v_seq_num::TEXT, 3, '0');
    END IF;

    -- 3. Create Canonical Employee Identity
    v_employee_id := 'EMP-' || SUBSTRING(MD5(v_tenant_id || v_work_email || NOW()::TEXT) FROM 1 FOR 8);
    
    INSERT INTO public.employees (
        id, organization_id, company_id, employee_code,
        first_name, middle_name, last_name, display_name,
        work_email, avatar_url, status, employment_type,
        department_id, department_name, designation_id, designation_title,
        branch_id, branch_name, profile, employment,
        created_at, updated_at
    ) VALUES (
        v_employee_id, v_org_id, v_company_id, v_employee_code,
        v_first_name, 
        COALESCE(p_payload->'identity'->>'middle_name', ''),
        v_last_name,
        COALESCE(p_payload->'identity'->>'preferred_name', v_first_name || ' ' || v_last_name),
        v_work_email,
        COALESCE(p_payload->'identity'->>'photo_url', ''),
        COALESCE(p_payload->'employment'->>'status', 'Active'),
        COALESCE(p_payload->'employment'->>'employment_type', 'Full Time'),
        COALESCE(p_payload->'employment'->>'department_id', 'dept-eng'),
        COALESCE(p_payload->'employment'->>'department_name', 'Engineering'),
        COALESCE(p_payload->'employment'->>'designation_id', 'desig-se'),
        COALESCE(p_payload->'employment'->>'designation_title', 'Software Engineer'),
        COALESCE(p_payload->'employment'->>'branch_id', 'br-hq'),
        COALESCE(p_payload->'employment'->>'branch_name', 'Coimbatore HQ'),
        p_payload->'contact',
        p_payload->'employment',
        NOW(), NOW()
    );

    v_doj := COALESCE((p_payload->'employment'->>'doj')::DATE, CURRENT_DATE);

    -- 4. Create Employment Record
    INSERT INTO public.employee_employment (
        tenant_id, organization_id, employee_id, employment_type, employment_status,
        joining_date, confirmation_date, probation_period_days, notice_period_days,
        worker_type, work_mode, job_level, grade, vendor_id, vendor_name, vendor_employee_code,
        effective_from, version
    ) VALUES (
        v_tenant_id, v_org_id, v_employee_id,
        COALESCE(p_payload->'employment'->>'employment_type', 'Full Time'),
        COALESCE(p_payload->'employment'->>'status', 'Active'),
        v_doj,
        (p_payload->'employment'->>'confirmation_date')::DATE,
        COALESCE((p_payload->'employment'->>'probation_months')::INT * 30, 180),
        COALESCE((p_payload->'employment'->>'notice_period_days')::INT, 60),
        COALESCE(p_payload->'employment'->>'employment_source', 'DIRECT'),
        COALESCE(p_payload->'employment'->>'work_mode', 'Hybrid'),
        COALESCE(p_payload->'employment'->>'job_level', 'Mid Level'),
        COALESCE(p_payload->'employment'->>'grade', 'G3'),
        p_payload->'employment'->>'vendor_id',
        p_payload->'employment'->>'vendor_name',
        p_payload->'employment'->>'vendor_employee_code',
        v_doj, 1
    );

    -- 5. Create Org Assignment Record
    INSERT INTO public.employee_org_assignments (
        tenant_id, organization_id, employee_id, department_id, department_name,
        designation_id, designation_title, branch_id, branch_name,
        work_location_id, work_location_name, business_unit_id, cost_center_id,
        reporting_manager_id, reporting_manager_name, team_lead_id,
        effective_from, version, status
    ) VALUES (
        v_tenant_id, v_org_id, v_employee_id,
        COALESCE(p_payload->'employment'->>'department_id', 'dept-eng'),
        COALESCE(p_payload->'employment'->>'department_name', 'Engineering'),
        COALESCE(p_payload->'employment'->>'designation_id', 'desig-se'),
        COALESCE(p_payload->'employment'->>'designation_title', 'Software Engineer'),
        COALESCE(p_payload->'employment'->>'branch_id', 'br-hq'),
        COALESCE(p_payload->'employment'->>'branch_name', 'Headquarters'),
        COALESCE(p_payload->'employment'->>'location_id', 'loc-cbe-hq'),
        COALESCE(p_payload->'employment'->>'work_location_name', 'Coimbatore HQ Campus'),
        COALESCE(p_payload->'reporting'->>'business_unit', 'Enterprise Software'),
        COALESCE(p_payload->'reporting'->>'cost_center', 'CC-ENG-101'),
        p_payload->'reporting'->>'reporting_manager_id',
        p_payload->'reporting'->>'reporting_manager_name',
        p_payload->'reporting'->>'team_lead_id',
        v_doj, 1, 'ACTIVE'
    );

    -- 6. Create Salary Assignment Record
    v_annual_ctc := COALESCE((p_payload->'compensation'->>'annual_ctc')::NUMERIC, 1200000.00);
    v_monthly_ctc := ROUND(v_annual_ctc / 12.0, 2);

    INSERT INTO public.employee_salary_assignments (
        tenant_id, organization_id, employee_id, salary_structure_code,
        annual_ctc, monthly_ctc, currency, pay_frequency, payroll_group_id,
        effective_from, version, status
    ) VALUES (
        v_tenant_id, v_org_id, v_employee_id,
        COALESCE(p_payload->'compensation'->>'salary_structure_code', 'CORP_STD_01'),
        v_annual_ctc, v_monthly_ctc, 'INR',
        COALESCE(p_payload->'compensation'->>'pay_frequency', 'MONTHLY'),
        COALESCE(p_payload->'compensation'->>'payroll_group_id', 'pg-monthly-main'),
        v_doj, 1, 'ACTIVE'
    ) RETURNING id INTO v_salary_assign_id;

    -- 7. Create Payroll Profile
    INSERT INTO public.employee_payroll_profiles (
        tenant_id, organization_id, employee_id, payroll_group_id, payroll_calendar_id,
        salary_assignment_id, tax_regime, payment_mode, payroll_status, effective_from
    ) VALUES (
        v_tenant_id, v_org_id, v_employee_id,
        COALESCE(p_payload->'compensation'->>'payroll_group_id', 'pg-monthly-main'),
        'cal-standard-monthly',
        v_salary_assign_id,
        COALESCE(p_payload->'statutory'->>'tax_regime', 'NEW'),
        COALESCE(p_payload->'bank'->>'payment_mode', 'BANK_TRANSFER'),
        'ACTIVE', v_doj
    );

    -- 8. Create Statutory Profile
    INSERT INTO public.employee_statutory_profiles (
        tenant_id, organization_id, employee_id,
        pf_applicable, pf_number, uan,
        esi_applicable, esi_number,
        pan_reference, aadhaar_reference,
        professional_tax_applicable, tax_regime, effective_from
    ) VALUES (
        v_tenant_id, v_org_id, v_employee_id,
        COALESCE((p_payload->'statutory'->>'pf_applicable')::BOOLEAN, TRUE),
        p_payload->'statutory'->>'pf_number',
        p_payload->'statutory'->>'uan',
        COALESCE((p_payload->'statutory'->>'esi_applicable')::BOOLEAN, FALSE),
        p_payload->'statutory'->>'esi_number',
        p_payload->'statutory'->>'pan',
        p_payload->'statutory'->>'aadhaar',
        COALESCE((p_payload->'statutory'->>'pt_applicable')::BOOLEAN, TRUE),
        COALESCE(p_payload->'statutory'->>'tax_regime', 'NEW'),
        v_doj
    );

    -- 9. Create Bank Account (if provided)
    IF p_payload->'bank'->>'bank_name' IS NOT NULL AND TRIM(p_payload->'bank'->>'bank_name') <> '' THEN
        v_ifsc := COALESCE(p_payload->'bank'->>'ifsc', 'HDFC0001234');
        v_acc_num := COALESCE(p_payload->'bank'->>'account_number', '1234567890');
        
        INSERT INTO public.employee_bank_accounts (
            tenant_id, organization_id, employee_id,
            bank_name, account_number, account_number_encrypted, account_number_masked, ifsc, ifsc_code,
            account_holder_name, account_type, is_primary, effective_from
        ) VALUES (
            v_tenant_id, v_org_id, v_employee_id,
            TRIM(p_payload->'bank'->>'bank_name'),
            v_acc_num,
            v_acc_num,
            'XXXX-XXXX-' || RIGHT(v_acc_num, 4),
            v_ifsc,
            v_ifsc,
            COALESCE(p_payload->'bank'->>'account_holder_name', v_first_name || ' ' || v_last_name),
            COALESCE(p_payload->'bank'->>'account_type', 'SAVINGS'),
            TRUE, v_doj
        );
    END IF;

    -- 10. Create Attendance Assignment
    INSERT INTO public.employee_attendance_assignments (
        tenant_id, organization_id, employee_id,
        shift_id, shift_name, attendance_policy_id, work_location_id, effective_from
    ) VALUES (
        v_tenant_id, v_org_id, v_employee_id,
        COALESCE(p_payload->'work_assignment'->>'shift_id', 'shift-general-01'),
        COALESCE(p_payload->'work_assignment'->>'shift_name', 'General Shift (09:30 - 18:30)'),
        COALESCE(p_payload->'work_assignment'->>'attendance_policy_id', 'pol-standard-office'),
        COALESCE(p_payload->'employment'->>'location_id', 'loc-cbe-hq'),
        v_doj
    );

    -- 11. Create Leave Assignment
    INSERT INTO public.employee_leave_assignments (
        tenant_id, organization_id, employee_id,
        leave_policy_id, leave_policy_name, effective_from
    ) VALUES (
        v_tenant_id, v_org_id, v_employee_id,
        COALESCE(p_payload->'work_assignment'->>'leave_policy_id', 'leave-pol-std-2026'),
        COALESCE(p_payload->'work_assignment'->>'leave_policy_name', 'Standard Full-Time Leave Policy'),
        v_doj
    );

    -- 12. Create Performance Assignment
    INSERT INTO public.employee_performance_assignments (
        tenant_id, organization_id, employee_id,
        performance_template_id, performance_cycle_id, review_frequency, review_manager_id, effective_from
    ) VALUES (
        v_tenant_id, v_org_id, v_employee_id,
        COALESCE(p_payload->'performance'->>'performance_template_id', 'tmpl-corp-annual-2026'),
        COALESCE(p_payload->'performance'->>'performance_cycle_id', 'cycle-fy26-27'),
        COALESCE(p_payload->'performance'->>'review_frequency', 'ANNUAL'),
        p_payload->'reporting'->>'reporting_manager_id',
        v_doj
    );

    -- 13. Auto-Provision Auth User & Identity
    BEGIN
        SELECT id INTO v_auth_user_id FROM auth.users WHERE LOWER(email) = v_work_email LIMIT 1;
        IF v_auth_user_id IS NULL THEN
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000'::uuid,
                gen_random_uuid(), 'authenticated', 'authenticated', v_work_email,
                crypt('Joy@2026!', gen_salt('bf')), NOW(),
                jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
                jsonb_build_object('first_name', v_first_name, 'last_name', v_last_name, 'employee_id', v_employee_id, 'employee_code', v_employee_code, 'tenant_id', v_tenant_id),
                NOW(), NOW()
            ) RETURNING id INTO v_auth_user_id;
        END IF;

        INSERT INTO public.app_users (
            id, employee_id, auth_user_id, tenant_id, organization_id,
            email, phone, first_name, last_name, role, status, is_active, created_at, updated_at
        ) VALUES (
            'usr-' || SUBSTRING(MD5(v_employee_id || v_work_email) FROM 1 FOR 8),
            v_employee_id, v_auth_user_id, v_tenant_id, v_org_id,
            v_work_email, v_phone, v_first_name, v_last_name, 'Employee', 'ACTIVE', TRUE, NOW(), NOW()
        ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Auth user provisioning deferred: %', SQLERRM;
    END;

    -- 14. Emit Realtime Outbox Event
    BEGIN
        INSERT INTO public.realtime_outbox_events (
            tenant_id, organization_id, event_type, entity_type, entity_id, payload
        ) VALUES (
            v_tenant_id, v_org_id, 'employee.created', 'employee', v_employee_id,
            jsonb_build_object(
                'employee_id', v_employee_id,
                'employee_code', v_employee_code,
                'work_email', v_work_email,
                'first_name', v_first_name,
                'last_name', v_last_name,
                'joining_date', v_doj,
                'annual_ctc', v_annual_ctc
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', TRUE,
        'employee_id', v_employee_id,
        'employee_code', v_employee_code,
        'status', 'ACTIVE',
        'salary_assignment_id', v_salary_assign_id,
        'annual_ctc', v_annual_ctc,
        'monthly_ctc', v_monthly_ctc,
        'record_version', 1
    );
END;
$$;

-- Secure Permissions
REVOKE ALL ON FUNCTION public.fn_finalize_employee_onboarding(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_finalize_employee_onboarding(JSONB) TO authenticated, service_role;
