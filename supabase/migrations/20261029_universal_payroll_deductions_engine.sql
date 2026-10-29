-- ============================================================================
-- Migration: 20261029_universal_payroll_deductions_engine.sql
-- Joy PeopleHR: Configurable Payroll Deductions, Loans & EMI, Salary Advances,
-- Loss of Pay (LOP) and Monthly Deduction Recovery Engine.
-- ============================================================================

-- 1. PAYROLL DEDUCTION & RECOVERY POLICIES
CREATE TABLE IF NOT EXISTS public.payroll_deduction_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    company_id TEXT DEFAULT 'default',
    policy_name TEXT NOT NULL,
    lop_calculation_method TEXT NOT NULL DEFAULT 'CALENDAR_DAYS', -- 'CALENDAR_DAYS', 'FIXED_30_DAYS', 'SCHEDULED_WORKING_DAYS'
    lop_days_divisor NUMERIC(8,2) NOT NULL DEFAULT 30.00,
    max_total_deduction_percent NUMERIC(5,2) NOT NULL DEFAULT 50.00, -- Maximum 50% limit per Payment of Wages Act Sec. 7(3)
    max_salary_advance_percent NUMERIC(5,2) NOT NULL DEFAULT 50.00, -- Up to 50% of monthly gross
    max_active_loans_per_employee INT NOT NULL DEFAULT 2,
    max_active_advances_per_employee INT NOT NULL DEFAULT 1,
    loan_interest_method TEXT NOT NULL DEFAULT 'INTEREST_FREE', -- 'INTEREST_FREE', 'REDUCING_BALANCE', 'FLAT_RATE'
    default_loan_annual_interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    loan_tenure_min_months INT NOT NULL DEFAULT 1,
    loan_tenure_max_months INT NOT NULL DEFAULT 36,
    deduction_priority_order JSONB NOT NULL DEFAULT '["STATUTORY", "LOP", "SALARY_ADVANCE", "LOAN_EMI", "OTHER"]'::jsonb,
    insufficient_salary_handling TEXT NOT NULL DEFAULT 'PARTIAL_AND_CARRY_FORWARD', -- 'PARTIAL_AND_CARRY_FORWARD', 'DEFER_INSTALLMENT', 'STOP_RECOVERY'
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'DRAFT', 'ACTIVE', 'ARCHIVED'
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_payroll_deduction_policies_org ON public.payroll_deduction_policies(organization_id, status);

-- 2. EMPLOYEE LOANS & EMI RECOVERY
CREATE TABLE IF NOT EXISTS public.employee_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    company_id TEXT DEFAULT 'default',
    employee_id UUID NOT NULL,
    employee_name TEXT NOT NULL,
    employee_code TEXT NOT NULL,
    loan_code TEXT NOT NULL,
    loan_type TEXT NOT NULL, -- 'Personal Emergency', 'Salary-Linked Loan', 'Equipment / Asset Loan', 'Festival Advance', 'Medical Assistance'
    principal_amount NUMERIC(12,2) NOT NULL,
    annual_interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    interest_method TEXT NOT NULL DEFAULT 'INTEREST_FREE', -- 'INTEREST_FREE', 'REDUCING_BALANCE', 'FLAT_RATE'
    tenure_months INT NOT NULL,
    monthly_emi NUMERIC(12,2) NOT NULL,
    total_interest NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_repayable NUMERIC(12,2) NOT NULL,
    amount_recovered NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12,2) NOT NULL,
    disbursement_date DATE,
    disbursement_reference TEXT,
    disbursement_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'DISBURSED', 'CANCELLED'
    emi_start_period TEXT NOT NULL, -- 'YYYY-MM'
    emi_end_period TEXT NOT NULL,   -- 'YYYY-MM'
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISBURSED', 'ACTIVE', 'PAUSED', 'SETTLED', 'REJECTED', 'CANCELLED'
    approval_status TEXT NOT NULL DEFAULT 'APPROVED',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_loans_emp ON public.employee_loans(organization_id, employee_id, status);

-- 3. LOAN REPAYMENT SCHEDULES (AMORTIZATION LEDGER)
CREATE TABLE IF NOT EXISTS public.loan_repayment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    loan_id UUID NOT NULL REFERENCES public.employee_loans(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    installment_number INT NOT NULL,
    payroll_period TEXT NOT NULL, -- 'YYYY-MM'
    due_date DATE NOT NULL,
    opening_balance NUMERIC(12,2) NOT NULL,
    principal_component NUMERIC(12,2) NOT NULL,
    interest_component NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_installment_amount NUMERIC(12,2) NOT NULL,
    recovered_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    outstanding_amount NUMERIC(12,2) NOT NULL,
    closing_balance NUMERIC(12,2) NOT NULL,
    recovery_status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'RECOVERED', 'PARTIALLY_RECOVERED', 'DEFERRED', 'WAIVED'
    payroll_run_id UUID,
    recovered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loan_repayment_schedules_period ON public.loan_repayment_schedules(organization_id, payroll_period, recovery_status);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_schedules_loan ON public.loan_repayment_schedules(loan_id, installment_number);

-- 4. SALARY ADVANCE REQUESTS
CREATE TABLE IF NOT EXISTS public.salary_advance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    company_id TEXT DEFAULT 'default',
    employee_id UUID NOT NULL,
    employee_name TEXT NOT NULL,
    employee_code TEXT NOT NULL,
    advance_code TEXT NOT NULL,
    advance_amount NUMERIC(12,2) NOT NULL,
    recovery_period TEXT NOT NULL, -- 'YYYY-MM'
    recovery_installments_count INT NOT NULL DEFAULT 1,
    monthly_recovery_amount NUMERIC(12,2) NOT NULL,
    amount_recovered NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'PENDING_APPROVAL', 'APPROVED', 'DISBURSED', 'ACTIVE', 'SETTLED', 'REJECTED', 'CANCELLED'
    disbursement_status TEXT NOT NULL DEFAULT 'DISBURSED', -- 'PENDING', 'DISBURSED'
    disbursement_date DATE,
    disbursement_reference TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_advance_emp ON public.salary_advance_requests(organization_id, employee_id, status);

-- 5. SALARY ADVANCE RECOVERY SCHEDULES
CREATE TABLE IF NOT EXISTS public.salary_advance_recovery_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    advance_id UUID NOT NULL REFERENCES public.salary_advance_requests(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    installment_number INT NOT NULL DEFAULT 1,
    payroll_period TEXT NOT NULL, -- 'YYYY-MM'
    scheduled_amount NUMERIC(12,2) NOT NULL,
    recovered_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'RECOVERED', 'PARTIALLY_RECOVERED', 'DEFERRED'
    payroll_run_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_advance_schedules_period ON public.salary_advance_recovery_schedules(organization_id, payroll_period, status);

-- 6. LOSS OF PAY (LOP) CALCULATIONS
CREATE TABLE IF NOT EXISTS public.payroll_lop_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    payroll_period TEXT NOT NULL, -- 'YYYY-MM'
    employee_id UUID NOT NULL,
    employee_name TEXT NOT NULL,
    employee_code TEXT NOT NULL,
    monthly_gross NUMERIC(12,2) NOT NULL,
    calculation_basis TEXT NOT NULL DEFAULT 'CALENDAR_DAYS', -- 'CALENDAR_DAYS', 'FIXED_30_DAYS', 'SCHEDULED_WORKING_DAYS'
    divisor_used NUMERIC(6,2) NOT NULL DEFAULT 30.00,
    daily_wage_rate NUMERIC(10,2) NOT NULL,
    unpaid_absence_days NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    unpaid_leave_days NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    unregularized_missing_punch_days NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    total_lop_days NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    computed_lop_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    source_attendance_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'CALCULATED', -- 'CALCULATED', 'FINALIZED', 'OVERRIDDEN'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_lop_calculations_unique 
    ON public.payroll_lop_calculations(organization_id, payroll_period, employee_id);

-- 7. UNIFIED PAYROLL DEDUCTION ITEMS
CREATE TABLE IF NOT EXISTS public.payroll_deduction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    payroll_period TEXT NOT NULL, -- 'YYYY-MM'
    employee_id UUID NOT NULL,
    deduction_category TEXT NOT NULL, -- 'LOP', 'LOAN_EMI', 'SALARY_ADVANCE', 'VOLUNTARY', 'STATUTORY'
    source_id UUID,
    scheduled_amount NUMERIC(12,2) NOT NULL,
    applied_amount NUMERIC(12,2) NOT NULL,
    deferred_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    reason_for_deferral TEXT,
    status TEXT NOT NULL DEFAULT 'APPLIED', -- 'PENDING', 'APPLIED', 'DEFERRED', 'REVERSED'
    payroll_run_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_deduction_items_lookup 
    ON public.payroll_deduction_items(organization_id, payroll_period, employee_id);

-- 8. AUDIT LOGS FOR DEDUCTIONS & RECOVERIES
CREATE TABLE IF NOT EXISTS public.payroll_deduction_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    record_type TEXT NOT NULL, -- 'LOAN', 'ADVANCE', 'POLICY', 'LOP', 'DEDUCTION'
    record_id UUID NOT NULL,
    actor_id TEXT,
    actor_name TEXT,
    action TEXT NOT NULL, -- 'CREATE', 'APPROVE', 'DISBURSE', 'RECOVER', 'DEFER', 'SETTLE', 'REVERSE', 'UPDATE_POLICY'
    old_values JSONB,
    new_values JSONB,
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_deduction_audit_logs_record 
    ON public.payroll_deduction_audit_logs(organization_id, record_type, record_id);

-- ============================================================================
-- 9. ROW-LEVEL SECURITY POLICIES
-- ============================================================================
ALTER TABLE public.payroll_deduction_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advance_recovery_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_lop_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deduction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deduction_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissive policy for payroll_deduction_policies" ON public.payroll_deduction_policies;
CREATE POLICY "Permissive policy for payroll_deduction_policies" ON public.payroll_deduction_policies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive policy for employee_loans" ON public.employee_loans;
CREATE POLICY "Permissive policy for employee_loans" ON public.employee_loans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive policy for loan_repayment_schedules" ON public.loan_repayment_schedules;
CREATE POLICY "Permissive policy for loan_repayment_schedules" ON public.loan_repayment_schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive policy for salary_advance_requests" ON public.salary_advance_requests;
CREATE POLICY "Permissive policy for salary_advance_requests" ON public.salary_advance_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive policy for salary_advance_recovery_schedules" ON public.salary_advance_recovery_schedules;
CREATE POLICY "Permissive policy for salary_advance_recovery_schedules" ON public.salary_advance_recovery_schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive policy for payroll_lop_calculations" ON public.payroll_lop_calculations;
CREATE POLICY "Permissive policy for payroll_lop_calculations" ON public.payroll_lop_calculations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive policy for payroll_deduction_items" ON public.payroll_deduction_items;
CREATE POLICY "Permissive policy for payroll_deduction_items" ON public.payroll_deduction_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive policy for payroll_deduction_audit_logs" ON public.payroll_deduction_audit_logs;
CREATE POLICY "Permissive policy for payroll_deduction_audit_logs" ON public.payroll_deduction_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 10. SEED DEFAULT DEDUCTION POLICY FOR JOY CORPORATE SOLUTIONS
-- ============================================================================
INSERT INTO public.payroll_deduction_policies (
    id,
    organization_id,
    company_id,
    policy_name,
    lop_calculation_method,
    lop_days_divisor,
    max_total_deduction_percent,
    max_salary_advance_percent,
    max_active_loans_per_employee,
    max_active_advances_per_employee,
    loan_interest_method,
    default_loan_annual_interest_rate,
    loan_tenure_min_months,
    loan_tenure_max_months,
    insufficient_salary_handling,
    effective_from,
    status,
    version
) VALUES (
    '5a2b1c3d-e4f5-4678-9012-3456789abcde',
    '0c621892-e938-4707-9957-13534ea32c19',
    '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    'Standard Corporate Deductions & Recoveries Policy (2026)',
    'CALENDAR_DAYS', -- 31 days in October 2026, dynamic calendar divisor
    30.00,
    50.00, -- 50% cap as per Payment of Wages Act Sec. 7(3)
    50.00,
    2,
    1,
    'INTEREST_FREE',
    0.00,
    1,
    24,
    'PARTIAL_AND_CARRY_FORWARD',
    '2026-04-01',
    'ACTIVE',
    1
) ON CONFLICT (id) DO NOTHING;
