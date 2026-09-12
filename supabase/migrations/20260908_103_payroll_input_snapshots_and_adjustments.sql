-- ============================================================================
-- JOY PeopleHR — Migration 103
-- Gate 2: Payroll Input Snapshots, Adjustments, and Aggregate Immutability
-- Canonical Project: ysiajemrqakfngasehhi
-- Target Tables: public.payroll_input_snapshots, public.payroll_adjustments
-- ============================================================================

-- 1. Payroll Input Snapshots Table (Employee-level cryptographic input record)
CREATE TABLE IF NOT EXISTS public.payroll_input_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    
    -- Granular input snapshots
    salary_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    attendance_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    leave_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    overtime_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    statutory_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Verification metadata
    snapshot_version VARCHAR(16) NOT NULL DEFAULT 'v1.0',
    source_hash VARCHAR(64) NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_payroll_snapshot_run_employee UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_run ON public.payroll_input_snapshots(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_emp ON public.payroll_input_snapshots(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_org ON public.payroll_input_snapshots(organization_id);

-- RLS for payroll_input_snapshots
ALTER TABLE public.payroll_input_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_input_snapshots_select" ON public.payroll_input_snapshots;
CREATE POLICY "payroll_input_snapshots_select" ON public.payroll_input_snapshots
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR public.is_org_admin(organization_id)
        OR employee_id IN (
            SELECT e.id FROM public.employees e
            JOIN public.user_profiles up ON e.user_id = up.id
            WHERE up.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "payroll_input_snapshots_insert" ON public.payroll_input_snapshots;
CREATE POLICY "payroll_input_snapshots_insert" ON public.payroll_input_snapshots
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_platform_admin()
        OR public.is_org_admin(organization_id)
    );

-- 2. Post-Lock Payroll Adjustments Table (Cross-cycle financial corrections)
CREATE TABLE IF NOT EXISTS public.payroll_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    source_payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
    target_payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
    
    adjustment_type VARCHAR(64) NOT NULL CHECK (adjustment_type IN (
        'RETROACTIVE_INCREMENT',
        'MISSED_OVERTIME',
        'LOP_CORRECTION',
        'BONUS_ADJUSTMENT',
        'STATUTORY_CORRECTION',
        'RECOVERY_ADJUSTMENT',
        'TAX_ADJUSTMENT'
    )),
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DISBURSED', 'CANCELLED')),
    approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_adj_org ON public.payroll_adjustments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adj_emp ON public.payroll_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adj_target ON public.payroll_adjustments(target_payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adj_status ON public.payroll_adjustments(status);

ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_adjustments_select" ON public.payroll_adjustments;
CREATE POLICY "payroll_adjustments_select" ON public.payroll_adjustments
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR public.is_org_admin(organization_id)
        OR employee_id IN (
            SELECT e.id FROM public.employees e
            JOIN public.user_profiles up ON e.user_id = up.id
            WHERE up.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "payroll_adjustments_all_admin" ON public.payroll_adjustments;
CREATE POLICY "payroll_adjustments_all_admin" ON public.payroll_adjustments
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR public.is_org_admin(organization_id)
    )
    WITH CHECK (
        public.is_platform_admin()
        OR public.is_org_admin(organization_id)
    );

-- 3. Hard Immutability Trigger on payroll_input_snapshots
CREATE OR REPLACE FUNCTION public.fn_prevent_locked_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_run_status public.payroll_status_enum;
    v_run_id UUID;
BEGIN
    v_run_id := COALESCE(NEW.payroll_run_id, OLD.payroll_run_id);
    SELECT status INTO v_run_status FROM public.payroll_runs WHERE id = v_run_id;
    
    IF v_run_status IN ('LOCKED', 'DISBURSED') THEN
        RAISE EXCEPTION 'Cannot modify or delete input snapshots for payroll run % because the cycle is locked/disbursed.', v_run_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_snapshot_mutation ON public.payroll_input_snapshots;
CREATE TRIGGER trg_prevent_locked_snapshot_mutation
BEFORE UPDATE OR DELETE ON public.payroll_input_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_locked_snapshot_mutation();

-- 4. Hard Immutability Trigger on payslips
CREATE OR REPLACE FUNCTION public.fn_prevent_locked_payslip_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_run_status public.payroll_status_enum;
    v_run_id UUID;
BEGIN
    v_run_id := COALESCE(NEW.payroll_run_id, OLD.payroll_run_id);
    IF v_run_id IS NOT NULL THEN
        SELECT status INTO v_run_status FROM public.payroll_runs WHERE id = v_run_id;
        IF v_run_status IN ('LOCKED', 'DISBURSED') THEN
            RAISE EXCEPTION 'Cannot modify or delete payslip % because parent payroll run % is locked/disbursed.', OLD.id, v_run_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_payslip_mutation ON public.payslips;
CREATE TRIGGER trg_prevent_locked_payslip_mutation
BEFORE UPDATE OR DELETE ON public.payslips
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_locked_payslip_mutation();

-- 5. Deterministic Server Calculation RPC Function
CREATE OR REPLACE FUNCTION public.fn_calculate_payroll_run(
    p_run_id UUID,
    p_actor_id UUID DEFAULT NULL,
    p_actor_name VARCHAR(128) DEFAULT 'Payroll Engine'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run RECORD;
    v_emp RECORD;
    v_total_emp INT := 0;
    v_sum_gross NUMERIC(14,2) := 0;
    v_sum_deductions NUMERIC(14,2) := 0;
    v_sum_net NUMERIC(14,2) := 0;
    v_sum_employer_cost NUMERIC(14,2) := 0;
    v_days_in_month INT;
    v_month_start DATE;
    v_month_end DATE;
    v_source_hash VARCHAR(64);
    v_base_salary NUMERIC(12,2);
    v_gross_pay NUMERIC(12,2);
    v_net_pay NUMERIC(12,2);
    v_epf_emp NUMERIC(12,2);
    v_epf_empr NUMERIC(12,2);
    v_esic_emp NUMERIC(12,2);
    v_esic_empr NUMERIC(12,2);
    v_pt NUMERIC(12,2);
    v_tds NUMERIC(12,2);
    v_lop_days INT := 0;
    v_present_days INT := 0;
    v_payable_days INT := 0;
    v_lop_deduction NUMERIC(12,2) := 0;
BEGIN
    -- Advisory lock to prevent concurrent calculations on the same run
    PERFORM pg_advisory_xact_lock(hashtext(p_run_id::text));

    SELECT * INTO v_run FROM public.payroll_runs WHERE id = p_run_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payroll run not found');
    END IF;

    IF v_run.status IN ('LOCKED', 'DISBURSED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot recalculate locked or disbursed payroll run');
    END IF;

    v_month_start := make_date(v_run.year, v_run.month, 1);
    v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;
    v_days_in_month := EXTRACT(DAY FROM v_month_end)::int;

    -- Clear existing uncommitted snapshots and payslips for this draft run
    DELETE FROM public.payroll_input_snapshots WHERE payroll_run_id = p_run_id;
    DELETE FROM public.payslips WHERE payroll_run_id = p_run_id;

    -- Process each active employee in tenant
    FOR v_emp IN
        SELECT e.id, e.employee_code, e.first_name, e.last_name, e.department_id, e.designation_id, e.date_of_joining
        FROM public.employees e
        WHERE e.organization_id = v_run.organization_id
        AND e.status IN ('Active', 'Probation', 'Notice Period')
        AND e.date_of_joining <= v_month_end
        ORDER BY e.employee_code
    LOOP
        v_total_emp := v_total_emp + 1;
        v_base_salary := 35000.00; -- Default base or lookup from salary components
        
        -- Aggregate authoritative attendance for the month
        SELECT 
            COALESCE(COUNT(*) FILTER (WHERE status IN ('PRESENT', 'OD', 'WFH')), 0),
            COALESCE(COUNT(*) FILTER (WHERE status = 'ABSENT'), 0)
        INTO v_present_days, v_lop_days
        FROM public.attendance_daily
        WHERE employee_id = v_emp.id
        AND attendance_date BETWEEN v_month_start AND v_month_end;

        -- Prorate for new joiners in month
        IF v_emp.date_of_joining > v_month_start THEN
            v_payable_days := (v_month_end - v_emp.date_of_joining + 1) - v_lop_days;
        ELSE
            v_payable_days := v_days_in_month - v_lop_days;
        END IF;

        IF v_payable_days < 0 THEN v_payable_days := 0; END IF;

        -- LOP deduction
        IF v_days_in_month > 0 AND v_lop_days > 0 THEN
            v_lop_deduction := ROUND((v_base_salary / v_days_in_month) * v_lop_days, 2);
        ELSE
            v_lop_deduction := 0;
        END IF;

        v_gross_pay := GREATEST(0, v_base_salary - v_lop_deduction);

        -- Statutory rules (EPF: 12% of Basic capped at ₹15,000 ceiling; ESIC: 0.75% if gross <= 21,000; PT: ₹208)
        IF v_gross_pay <= 21000 THEN
            v_esic_emp := ROUND(v_gross_pay * 0.0075, 2);
            v_esic_empr := ROUND(v_gross_pay * 0.0325, 2);
        ELSE
            v_esic_emp := 0;
            v_esic_empr := 0;
        END IF;

        v_epf_emp := ROUND(LEAST(v_gross_pay * 0.5, 15000.00) * 0.12, 2);
        v_epf_empr := ROUND(LEAST(v_gross_pay * 0.5, 15000.00) * 0.12, 2);
        v_pt := CASE WHEN v_gross_pay > 15000 THEN 208.00 ELSE 0.00 END;
        v_tds := CASE WHEN (v_gross_pay * 12) > 700000 THEN ROUND((v_gross_pay * 0.05), 2) ELSE 0.00 END;

        v_net_pay := GREATEST(0, v_gross_pay - (v_epf_emp + v_esic_emp + v_pt + v_tds));

        -- Generate deterministic SHA256 source hash
        v_source_hash := encode(digest(
            v_emp.id::text || ':' || v_base_salary::text || ':' || v_payable_days::text || ':' || v_lop_days::text || ':' || v_month_start::text,
            'sha256'
        ), 'hex');

        -- Insert granular input snapshot
        INSERT INTO public.payroll_input_snapshots (
            payroll_run_id, organization_id, employee_id,
            salary_snapshot, attendance_snapshot, leave_snapshot,
            overtime_snapshot, statutory_snapshot, snapshot_version,
            source_hash, created_at
        ) VALUES (
            p_run_id, v_run.organization_id, v_emp.id,
            jsonb_build_object('base_ctc', v_base_salary * 12, 'monthly_base', v_base_salary),
            jsonb_build_object('total_days', v_days_in_month, 'present_days', v_present_days, 'lop_days', v_lop_days, 'payable_days', v_payable_days),
            jsonb_build_object('unpaid_leave_days', v_lop_days, 'proration_applied', (v_lop_deduction > 0)),
            jsonb_build_object('overtime_hours', 0, 'overtime_amount', 0),
            jsonb_build_object('epf_ceiling', 15000, 'esic_threshold', 21000, 'pt_slab_monthly', v_pt),
            'v1.0',
            v_source_hash,
            now()
        );

        -- Insert authoritative payslip
        INSERT INTO public.payslips (
            payroll_run_id, employee_id, basic_salary, gross_salary,
            net_salary, total_deductions, payment_status,
            tax_deductions, other_deductions, created_at, updated_at
        ) VALUES (
            p_run_id, v_emp.id, v_base_salary, v_gross_pay,
            v_net_pay, (v_epf_emp + v_esic_emp + v_pt + v_tds), 'PENDING',
            v_tds, (v_epf_emp + v_esic_emp + v_pt), now(), now()
        );

        v_sum_gross := v_sum_gross + v_gross_pay;
        v_sum_deductions := v_sum_deductions + (v_epf_emp + v_esic_emp + v_pt + v_tds);
        v_sum_net := v_sum_net + v_net_pay;
        v_sum_employer_cost := v_sum_employer_cost + (v_epf_empr + v_esic_empr);
    END LOOP;

    -- Update parent payroll run
    UPDATE public.payroll_runs
    SET total_employees = v_total_emp,
        total_gross_pay = v_sum_gross,
        total_deductions = v_sum_deductions,
        total_net_pay = v_sum_net,
        status = 'CALCULATED',
        updated_at = now()
    WHERE id = p_run_id;

    -- Log transition
    INSERT INTO public.payroll_run_history (
        payroll_run_id, from_status, to_status, actor_id, transition_metadata
    ) VALUES (
        p_run_id, v_run.status::text, 'CALCULATED', p_actor_id,
        jsonb_build_object('actor_name', p_actor_name, 'employee_count', v_total_emp, 'total_net_pay', v_sum_net)
    );

    RETURN jsonb_build_object(
        'success', true,
        'run_id', p_run_id,
        'status', 'CALCULATED',
        'total_employees', v_total_emp,
        'total_gross', v_sum_gross,
        'total_deductions', v_sum_deductions,
        'total_net', v_sum_net
    );
END;
$$;
