-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 012
-- Target Project: ysiajemrqakfngasehhi
-- Description: Payroll, Compensation Structures, Monthly Runs & Payslips
-- ============================================================================

-- 1. Salary Components Master
CREATE TABLE IF NOT EXISTS public.salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('EARNING', 'DEDUCTION', 'REIMBURSEMENT', 'STATUTORY_EMPLOYER')),
    calculation_type VARCHAR(20) NOT NULL DEFAULT 'FLAT' CHECK (calculation_type IN ('FLAT', 'PERCENTAGE', 'FORMULA')),
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    is_statutory BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_salary_comp_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_salary_comp_org ON public.salary_components(organization_id);

-- 2. Salary Structures
CREATE TABLE IF NOT EXISTS public.salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_salary_struc_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_salary_struc_org ON public.salary_structures(organization_id);

-- 3. Salary Structure Components Mapping
CREATE TABLE IF NOT EXISTS public.salary_structure_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE CASCADE,
    salary_component_id UUID NOT NULL REFERENCES public.salary_components(id) ON DELETE CASCADE,
    value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    formula_expression TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT uq_struc_comp UNIQUE (salary_structure_id, salary_component_id)
);

CREATE INDEX IF NOT EXISTS idx_struc_comp_org ON public.salary_structure_components(organization_id);

-- 4. Employee Salary Assignments
CREATE TABLE IF NOT EXISTS public.employee_salary_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id),
    annual_ctc NUMERIC(15, 2) NOT NULL,
    monthly_gross NUMERIC(15, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_salary_assign ON public.employee_salary_assignments(employee_id, effective_from);
CREATE INDEX IF NOT EXISTS idx_emp_salary_org ON public.employee_salary_assignments(organization_id);

-- 5. Payroll Monthly Batch Runs
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    total_employees INTEGER NOT NULL DEFAULT 0,
    total_gross_pay NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_net_pay NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status public.payroll_status_enum NOT NULL DEFAULT 'DRAFT',
    processed_by UUID REFERENCES public.user_profiles(id),
    approved_by UUID REFERENCES public.user_profiles(id),
    disbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payroll_runs_comp_period UNIQUE (company_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON public.payroll_runs(organization_id);

-- 6. Payroll Line Items (Immutable Point-in-Time Calculation Lines)
CREATE TABLE IF NOT EXISTS public.payroll_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    total_working_days NUMERIC(4, 2) NOT NULL,
    payable_days NUMERIC(4, 2) NOT NULL,
    lop_days NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    gross_earnings NUMERIC(15, 2) NOT NULL,
    total_deductions NUMERIC(15, 2) NOT NULL,
    net_pay NUMERIC(15, 2) NOT NULL,
    earnings_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    deductions_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    statutory_employer_contributions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payroll_line_emp UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_line_emp ON public.payroll_line_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_line_org ON public.payroll_line_items(organization_id);

-- 7. Digital Payslips
CREATE TABLE IF NOT EXISTS public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    payroll_line_item_id UUID NOT NULL UNIQUE REFERENCES public.payroll_line_items(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    payslip_number VARCHAR(50) NOT NULL UNIQUE,
    storage_path TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payslips_emp ON public.payslips(employee_id, is_published);
CREATE INDEX IF NOT EXISTS idx_payslips_org ON public.payslips(organization_id);
