-- ============================================================================
-- JOY PeopleHR — Migration 102
-- Phase 2, Step 1: Offboarding to FnF Automated Integration Engine
-- Targets: public.separation_clearances, public.separation_asset_recoveries,
--          public.fnf_settlements, and fn_auto_dispatch_separation_fnf RPC
-- Canonical Database: ysiajemrqakfngasehhi
-- ============================================================================

-- 1. Department Exit Clearances Table
CREATE TABLE IF NOT EXISTS public.separation_clearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    separation_id UUID NOT NULL REFERENCES public.employee_separations(id) ON DELETE CASCADE,
    department VARCHAR(32) NOT NULL CHECK (department IN ('MANAGER', 'TEAM_LEAD', 'IT', 'ASSET', 'FINANCE', 'PAYROLL', 'HR', 'ADMIN', 'LEGAL')),
    clearance_item VARCHAR(200) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'CLEARED', 'REJECTED', 'WAIVED')),
    comments TEXT,
    cleared_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    cleared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sep_clearances_sep ON public.separation_clearances(separation_id);
CREATE INDEX IF NOT EXISTS idx_sep_clearances_org ON public.separation_clearances(organization_id);

-- 2. Separation Asset Recoveries Table
CREATE TABLE IF NOT EXISTS public.separation_asset_recoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    separation_id UUID NOT NULL REFERENCES public.employee_separations(id) ON DELETE CASCADE,
    asset_id UUID,
    asset_name VARCHAR(150) NOT NULL,
    serial_number VARCHAR(100),
    recovery_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (recovery_status IN ('PENDING', 'RETURN_SCHEDULED', 'RETURNED', 'DAMAGED', 'MISSING', 'WAIVED')),
    condition VARCHAR(32) DEFAULT 'GOOD',
    financial_recovery_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    returned_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sep_assets_sep ON public.separation_asset_recoveries(separation_id);
CREATE INDEX IF NOT EXISTS idx_sep_assets_org ON public.separation_asset_recoveries(organization_id);

-- 3. Canonical Full & Final (FnF) Settlements Table
CREATE TABLE IF NOT EXISTS public.fnf_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    separation_id UUID REFERENCES public.employee_separations(id) ON DELETE SET NULL,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    resignation_date DATE NOT NULL,
    last_working_date DATE NOT NULL,
    notice_period_required_days INTEGER NOT NULL DEFAULT 30,
    notice_period_served_days INTEGER NOT NULL DEFAULT 30,
    notice_shortfall_days INTEGER NOT NULL DEFAULT 0,
    unpaid_salary_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    unpaid_salary_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    earned_leave_balance_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    leave_encashment_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    gratuity_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    bonus_incentive_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    reimbursement_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_gross_settlement NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    notice_shortfall_recovery NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    loan_outstanding_recovery NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    advance_outstanding_recovery NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    asset_recovery_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    statutory_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_deductions_settlement NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    net_settlement_payable NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(32) NOT NULL DEFAULT 'CALCULATED' CHECK (payment_status IN ('CALCULATED', 'HR_APPROVED', 'FINANCE_APPROVED', 'DISBURSED', 'SETTLED')),
    settled_at TIMESTAMPTZ,
    processed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_fnf_separation UNIQUE (separation_id)
);

CREATE INDEX IF NOT EXISTS idx_fnf_settlements_org ON public.fnf_settlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_fnf_settlements_emp ON public.fnf_settlements(employee_id);
CREATE INDEX IF NOT EXISTS idx_fnf_settlements_status ON public.fnf_settlements(payment_status);

-- 4. RLS Policies for Clearance, Asset Recovery & FnF
ALTER TABLE public.separation_clearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.separation_asset_recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnf_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "separation_clearances_policy" ON public.separation_clearances;
CREATE POLICY "separation_clearances_policy" ON public.separation_clearances
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR public.is_org_admin(organization_id)
        OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
            AND up.organization_id = separation_clearances.organization_id
        )
    );

DROP POLICY IF EXISTS "separation_asset_recoveries_policy" ON public.separation_asset_recoveries;
CREATE POLICY "separation_asset_recoveries_policy" ON public.separation_asset_recoveries
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR public.is_org_admin(organization_id)
        OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
            AND up.organization_id = separation_asset_recoveries.organization_id
        )
    );

DROP POLICY IF EXISTS "fnf_settlements_select" ON public.fnf_settlements;
CREATE POLICY "fnf_settlements_select" ON public.fnf_settlements
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR public.is_org_admin(organization_id)
    );

DROP POLICY IF EXISTS "fnf_settlements_modify" ON public.fnf_settlements;
CREATE POLICY "fnf_settlements_modify" ON public.fnf_settlements
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR public.is_org_admin(organization_id)
    );

-- 5. Atomic Cross-Module FnF Settlement Dispatch RPC
-- Bridges separation clearances -> leave ledger -> asset deductions -> payroll FnF
CREATE OR REPLACE FUNCTION public.fn_auto_dispatch_separation_fnf(
    p_separation_id UUID,
    p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sep RECORD;
    v_emp RECORD;
    v_sal RECORD;
    v_monthly_gross NUMERIC(15, 2) := 50000.00;
    v_basic NUMERIC(15, 2) := 25000.00;
    v_daily_rate NUMERIC(15, 2);
    v_lwd DATE;
    v_served_days INTEGER;
    v_required_days INTEGER := 30;
    v_shortfall_days INTEGER := 0;
    v_shortfall_recovery NUMERIC(15, 2) := 0.00;
    v_unpaid_days NUMERIC(5, 2) := 0.00;
    v_unpaid_salary NUMERIC(15, 2) := 0.00;
    v_encashable_leave NUMERIC(5, 2) := 0.00;
    v_leave_encashment NUMERIC(15, 2) := 0.00;
    v_tenure_years NUMERIC(5, 2) := 0.00;
    v_gratuity NUMERIC(15, 2) := 0.00;
    v_asset_deductions NUMERIC(15, 2) := 0.00;
    v_statutory_pt NUMERIC(15, 2) := 200.00;
    v_total_gross NUMERIC(15, 2);
    v_total_deductions NUMERIC(15, 2);
    v_net_payable NUMERIC(15, 2);
    v_settlement_id UUID;
BEGIN
    -- 1. Fetch Separation
    SELECT * INTO v_sep FROM public.employee_separations WHERE id = p_separation_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Separation record not found');
    END IF;

    -- 2. Fetch Employee Profile
    SELECT * INTO v_emp FROM public.employees WHERE id = v_sep.employee_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee record not found');
    END IF;

    v_lwd := COALESCE(v_sep.approved_last_working_day, v_sep.requested_last_working_day, CURRENT_DATE);

    -- 3. Calculate Tenure
    IF v_emp.doj IS NOT NULL AND v_lwd >= v_emp.doj THEN
        v_tenure_years := ROUND((v_lwd - v_emp.doj)::numeric / 365.25, 2);
    END IF;

    -- 4. Calculate Notice Served vs Required
    v_served_days := GREATEST(0, (v_lwd - v_sep.resignation_date));
    IF v_served_days < v_required_days THEN
        v_shortfall_days := v_required_days - v_served_days;
    END IF;

    -- 5. Fetch Active Salary Assignment
    SELECT * INTO v_sal FROM public.employee_salary_assignments
    WHERE employee_id = v_sep.employee_id AND is_active = true
    ORDER BY effective_from DESC LIMIT 1;

    IF FOUND THEN
        v_monthly_gross := COALESCE(v_sal.monthly_gross, 50000.00);
        v_basic := ROUND(v_monthly_gross * 0.50, 2);
    END IF;
    v_daily_rate := ROUND(v_monthly_gross / 30.0, 2);

    -- 6. Unpaid Salary in Final Working Month
    v_unpaid_days := EXTRACT(DAY FROM v_lwd);
    v_unpaid_salary := ROUND(v_unpaid_days * v_daily_rate, 2);

    -- 7. Notice Shortfall Recovery
    v_shortfall_recovery := ROUND(v_shortfall_days * v_daily_rate, 2);

    -- 8. Unencashed Leave Balance
    SELECT COALESCE(SUM(lb.closing_balance), 0.00) INTO v_encashable_leave
    FROM public.leave_balances lb
    JOIN public.leave_types lt ON lb.leave_type_id = lt.id
    WHERE lb.employee_id = v_sep.employee_id
      AND lt.is_encashable = true
      AND lb.calendar_year = EXTRACT(YEAR FROM v_lwd);

    IF v_encashable_leave > 0 THEN
        v_leave_encashment := ROUND(v_encashable_leave * (v_basic / 30.0), 2);
    END IF;

    -- 9. Asset Damage / Missing Deductions
    SELECT COALESCE(SUM(financial_recovery_amount), 0.00) INTO v_asset_deductions
    FROM public.separation_asset_recoveries
    WHERE separation_id = p_separation_id
      AND recovery_status IN ('DAMAGED', 'MISSING');

    -- 10. Gratuity Calculation (Eligibility: >= 5 years of service)
    IF v_tenure_years >= 5.0 THEN
        v_gratuity := ROUND((15.0 * v_basic * v_tenure_years) / 26.0, 2);
    END IF;

    -- 11. Final Aggregations
    v_total_gross := v_unpaid_salary + v_leave_encashment + v_gratuity;
    v_total_deductions := v_shortfall_recovery + v_asset_deductions + v_statutory_pt;
    v_net_payable := GREATEST(0.00, v_total_gross - v_total_deductions);

    -- 12. Upsert into public.fnf_settlements
    INSERT INTO public.fnf_settlements (
        organization_id,
        separation_id,
        employee_id,
        resignation_date,
        last_working_date,
        notice_period_required_days,
        notice_period_served_days,
        notice_shortfall_days,
        unpaid_salary_days,
        unpaid_salary_amount,
        earned_leave_balance_days,
        leave_encashment_amount,
        gratuity_amount,
        bonus_incentive_amount,
        reimbursement_amount,
        total_gross_settlement,
        notice_shortfall_recovery,
        loan_outstanding_recovery,
        advance_outstanding_recovery,
        asset_recovery_deduction,
        statutory_deductions,
        total_deductions_settlement,
        net_settlement_payable,
        payment_status,
        processed_by,
        updated_at
    ) VALUES (
        v_sep.organization_id,
        p_separation_id,
        v_sep.employee_id,
        v_sep.resignation_date,
        v_lwd,
        v_required_days,
        v_served_days,
        v_shortfall_days,
        v_unpaid_days,
        v_unpaid_salary,
        v_encashable_leave,
        v_leave_encashment,
        v_gratuity,
        0.00,
        0.00,
        v_total_gross,
        v_shortfall_recovery,
        0.00,
        0.00,
        v_asset_deductions,
        v_statutory_pt,
        v_total_deductions,
        v_net_payable,
        'CALCULATED',
        p_actor_id,
        now()
    )
    ON CONFLICT (separation_id) DO UPDATE SET
        last_working_date = EXCLUDED.last_working_date,
        notice_period_served_days = EXCLUDED.notice_period_served_days,
        notice_shortfall_days = EXCLUDED.notice_shortfall_days,
        unpaid_salary_days = EXCLUDED.unpaid_salary_days,
        unpaid_salary_amount = EXCLUDED.unpaid_salary_amount,
        earned_leave_balance_days = EXCLUDED.earned_leave_balance_days,
        leave_encashment_amount = EXCLUDED.leave_encashment_amount,
        gratuity_amount = EXCLUDED.gratuity_amount,
        total_gross_settlement = EXCLUDED.total_gross_settlement,
        notice_shortfall_recovery = EXCLUDED.notice_shortfall_recovery,
        asset_recovery_deduction = EXCLUDED.asset_recovery_deduction,
        total_deductions_settlement = EXCLUDED.total_deductions_settlement,
        net_settlement_payable = EXCLUDED.net_settlement_payable,
        updated_at = now()
    RETURNING id INTO v_settlement_id;

    -- 13. Update Separation Status
    UPDATE public.employee_separations
    SET status = 'EXIT_CLEARANCE_IN_PROGRESS',
        updated_at = now()
    WHERE id = p_separation_id;

    RETURN jsonb_build_object(
        'success', true,
        'settlement_id', v_settlement_id,
        'employee_id', v_sep.employee_id,
        'net_settlement_payable', v_net_payable,
        'breakdown', jsonb_build_object(
            'unpaid_salary', v_unpaid_salary,
            'leave_encashment', v_leave_encashment,
            'gratuity', v_gratuity,
            'notice_recovery', v_shortfall_recovery,
            'asset_deductions', v_asset_deductions,
            'statutory_pt', v_statutory_pt
        ),
        'timestamp', now()
    );
END;
$$;
