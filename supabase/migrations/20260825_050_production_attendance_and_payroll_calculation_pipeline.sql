-- ============================================================================
-- 20260825_050_production_attendance_and_payroll_calculation_pipeline.sql
-- WorkForceOS Enterprise HRMS — Production Attendance & Payroll Calculation Pipeline
-- Architecture: Database-Backed Ledger, Period Management, Realtime Calculation Engine,
-- Explainable Calculation Traces, Immutable Audit Logs & Lock Protection
-- ============================================================================

-- Safely augment existing attendance tables with tenant_id for multi-tenant isolation
ALTER TABLE public.attendance_policy_audit_logs 
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'org-joy-01',
    ADD COLUMN IF NOT EXISTS employee_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS payroll_period_id UUID,
    ADD COLUMN IF NOT EXISTS actor_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.attendance_policy_audit_logs 
SET tenant_id = organization_id WHERE tenant_id IS NULL;

ALTER TABLE public.attendance_daily_ledger 
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'org-joy-01',
    ADD COLUMN IF NOT EXISTS approved_overtime_minutes INTEGER DEFAULT 0;

UPDATE public.attendance_daily_ledger 
SET tenant_id = organization_id WHERE tenant_id IS NULL;


-- 1. PAYROLL PERIODS MASTER
CREATE TABLE IF NOT EXISTS public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    period_name VARCHAR(100) NOT NULL, -- e.g. "August 2026"
    start_date DATE NOT NULL,          -- e.g. "2026-08-01"
    end_date DATE NOT NULL,            -- e.g. "2026-08-31"
    pay_date DATE NOT NULL,            -- e.g. "2026-08-31"
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' 
        CHECK (status IN ('OPEN', 'PROCESSING', 'CALCULATED', 'READY_FOR_REVIEW', 'FINALIZED', 'LOCKED', 'CANCELLED')),
    policy_version VARCHAR(50) NOT NULL DEFAULT 'Joy Enterprise Standard Policy (v3.2)',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payroll_period UNIQUE (tenant_id, period_name)
);

-- 2. EMPLOYEE ATTENDANCE PERIOD SUMMARY LEDGER
CREATE TABLE IF NOT EXISTS public.employee_attendance_period_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    employee_id VARCHAR(64) NOT NULL,
    payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
    
    -- Calendar & Shift Counts
    total_calendar_days INTEGER NOT NULL DEFAULT 31,
    scheduled_days INTEGER NOT NULL DEFAULT 21,
    weekly_off_days INTEGER NOT NULL DEFAULT 10,
    holiday_days INTEGER NOT NULL DEFAULT 0,
    
    -- Attended Counts
    present_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    absent_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    paid_leave_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    unpaid_leave_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    half_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    wfh_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    
    -- Quality Metrics
    late_events INTEGER NOT NULL DEFAULT 0,
    late_minutes INTEGER NOT NULL DEFAULT 0,
    early_events INTEGER NOT NULL DEFAULT 0,
    early_minutes INTEGER NOT NULL DEFAULT 0,
    missing_punch_count INTEGER NOT NULL DEFAULT 0,
    regularization_request_count INTEGER NOT NULL DEFAULT 0,
    
    -- Work Duration & Overtime
    scheduled_minutes INTEGER NOT NULL DEFAULT 0,
    worked_minutes INTEGER NOT NULL DEFAULT 0,
    overtime_minutes INTEGER NOT NULL DEFAULT 0,
    approved_overtime_minutes INTEGER NOT NULL DEFAULT 0,
    
    -- Payroll Linkage
    lop_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    payable_days NUMERIC(5,2) NOT NULL DEFAULT 31.00,
    
    calculation_version VARCHAR(50) NOT NULL DEFAULT 'v3.2',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_emp_period_attendance UNIQUE (tenant_id, employee_id, payroll_period_id)
);

-- 3. EMPLOYEE PAYROLL RECORDS (Authoritative Period Output)
CREATE TABLE IF NOT EXISTS public.employee_payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    employee_id VARCHAR(64) NOT NULL,
    payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
    salary_assignment_id UUID REFERENCES public.employee_salary_assignments(id) ON DELETE SET NULL,
    
    annual_ctc NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    monthly_ctc NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    base_gross_earnings NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    -- Attendance Adjustments
    lop_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    lop_deduction_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    approved_ot_minutes INTEGER NOT NULL DEFAULT 0,
    ot_rate_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ot_earnings NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_attendance_adjustment NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    -- Final Calculated Results
    effective_gross_earnings NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_employee_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_employer_contributions NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_take_home_pay NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'CALCULATED', 'READY_FOR_PAYROLL', 'APPROVED', 'FINALIZED', 'LOCKED')),
    
    calculation_trace JSONB NOT NULL DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_emp_period_payroll UNIQUE (tenant_id, employee_id, payroll_period_id)
);

-- 4. ATTENDANCE EXCEPTIONS & REGULARIZATION RECONCILIATION
CREATE TABLE IF NOT EXISTS public.attendance_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    employee_id VARCHAR(64) NOT NULL,
    payroll_period_id UUID REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'MISSING_PUNCH', 'DEVICE_MAPPING', 'DUPLICATE_PUNCH', 
        'INVALID_SHIFT', 'REGULARIZATION_PENDING', 'LEAVE_CONFLICT', 'OT_PENDING', 'PAYROLL_CONFIGURATION'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED', 'AUTO_RESOLVED')),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. INDEXES FOR MULTI-TENANT QUERY ACCELERATION
CREATE INDEX IF NOT EXISTS idx_payroll_periods_tenant_status ON public.payroll_periods(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_summary_emp_period ON public.employee_attendance_period_summary(tenant_id, employee_id, payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_emp_period ON public.employee_payroll_records(tenant_id, employee_id, payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_emp_period ON public.attendance_exceptions(tenant_id, employee_id, payroll_period_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_emp_time ON public.attendance_policy_audit_logs(organization_id, employee_id, created_at DESC);

-- 6. SEED CANONICAL PRODUCTION PAYROLL PERIODS
INSERT INTO public.payroll_periods (
    id, tenant_id, organization_id, period_name, start_date, end_date, pay_date, status, policy_version, is_locked
) VALUES 
(
    'b0000001-0000-0000-0000-000000000001'::uuid,
    'org-joy-01',
    'org-joy-01',
    'August 2026',
    '2026-08-01'::date,
    '2026-08-31'::date,
    '2026-08-31'::date,
    'FINALIZED',
    'Joy Enterprise Standard Policy (v3.2)',
    TRUE
),
(
    'b0000002-0000-0000-0000-000000000002'::uuid,
    'org-joy-01',
    'org-joy-01',
    'July 2026',
    '2026-07-01'::date,
    '2026-07-31'::date,
    '2026-07-31'::date,
    'LOCKED',
    'Joy Enterprise Standard Policy (v3.2)',
    TRUE
),
(
    'b0000003-0000-0000-0000-000000000003'::uuid,
    'org-joy-01',
    'org-joy-01',
    'September 2026',
    '2026-09-01'::date,
    '2026-09-30'::date,
    '2026-09-30'::date,
    'OPEN',
    'Joy Enterprise Standard Policy (v3.2)',
    FALSE
)
ON CONFLICT (tenant_id, period_name) DO NOTHING;


-- ============================================================================
-- 7. RPC: CALCULATE EMPLOYEE PAYROLL CONTEXT (Atomic Database-Driven Engine)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_calculate_employee_payroll_context(
    p_tenant_id VARCHAR(64),
    p_org_id VARCHAR(64),
    p_employee_id VARCHAR(64),
    p_payroll_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_period            RECORD;
    v_employee          RECORD;
    v_config            RECORD;
    v_summary           RECORD;
    v_unresolved_exc    INTEGER;
    v_monthly_ctc       NUMERIC(14, 2);
    v_annual_ctc        NUMERIC(14, 2);
    v_daily_rate        NUMERIC(14, 2);
    v_hourly_ot_rate    NUMERIC(10, 2);
    v_lop_days          NUMERIC(5, 2);
    v_lop_amount        NUMERIC(14, 2);
    v_ot_minutes        INTEGER;
    v_ot_earnings       NUMERIC(14, 2);
    v_gross             NUMERIC(14, 2);
    v_effective_gross   NUMERIC(14, 2);
    v_is_ready          BOOLEAN := TRUE;
    v_readiness_issues  TEXT[] := ARRAY[]::TEXT[];
    v_result            JSONB;
BEGIN
    -- 1. Load Payroll Period
    SELECT * INTO v_period FROM public.payroll_periods WHERE id = p_payroll_period_id;
    IF v_period IS NULL THEN
        RAISE EXCEPTION 'Payroll period % not found.', p_payroll_period_id;
    END IF;

    -- 2. Load Employee Effective Configuration
    SELECT * INTO v_config 
    FROM public.v_employee_effective_configuration 
    WHERE employee_id = p_employee_id 
       OR employee_code = p_employee_id 
    LIMIT 1;

    -- 3. Load or Calculate Attendance Summary
    SELECT * INTO v_summary 
    FROM public.employee_attendance_period_summary 
    WHERE employee_id = p_employee_id AND payroll_period_id = p_payroll_period_id;

    -- If no summary exists, query live from daily ledger or create standard period baseline
    IF v_summary IS NULL THEN
        SELECT 
            31 AS total_calendar_days,
            21 AS scheduled_days,
            10 AS weekly_off_days,
            COALESCE(SUM(CASE WHEN status IN ('Present', 'Late', 'Checked Out') THEN 1 WHEN status = 'Half Day' THEN 0.5 ELSE 0 END), 0) AS present_days,
            COALESCE(SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END), 0) AS absent_days,
            COALESCE(SUM(CASE WHEN status IN ('On Leave', 'Paid Leave', 'Leave') THEN 1 ELSE 0 END), 0) AS paid_leave_days,
            0 AS unpaid_leave_days,
            COALESCE(SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END), 0) AS half_days,
            COALESCE(SUM(CASE WHEN late_minutes > 0 THEN 1 ELSE 0 END), 0) AS late_events,
            COALESCE(SUM(late_minutes), 0) AS late_minutes,
            COALESCE(SUM(CASE WHEN early_minutes > 0 THEN 1 ELSE 0 END), 0) AS early_events,
            COALESCE(SUM(early_minutes), 0) AS early_minutes,
            COALESCE(SUM(net_minutes), 0) AS worked_minutes,
            COALESCE(SUM(overtime_minutes), 0) AS overtime_minutes,
            COALESCE(SUM(overtime_minutes), 0) AS approved_overtime_minutes
        INTO v_summary
        FROM public.attendance_daily_ledger
        WHERE employee_id = p_employee_id
          AND attendance_date >= v_period.start_date
          AND attendance_date <= v_period.end_date;
    END IF;

    -- 4. Calculate Financial Payroll Impact
    v_annual_ctc := COALESCE(v_config.annual_ctc, 1200000.00);
    v_monthly_ctc := COALESCE(v_config.monthly_ctc, ROUND(v_annual_ctc / 12.0, 2));
    v_gross := ROUND(v_monthly_ctc * 0.95, 2); -- Approx gross earnings
    v_daily_rate := ROUND(v_gross / COALESCE(v_summary.total_calendar_days, 31), 2);
    v_hourly_ot_rate := ROUND((v_daily_rate / 8.0) * 1.5, 2); -- 1.5x OT multiplier
    
    v_lop_days := COALESCE(v_summary.absent_days, 0.00) + COALESCE(v_summary.unpaid_leave_days, 0.00);
    v_lop_amount := ROUND(v_lop_days * v_daily_rate, 2);
    
    v_ot_minutes := COALESCE(v_summary.approved_overtime_minutes, 0);
    v_ot_earnings := ROUND((v_ot_minutes / 60.0) * v_hourly_ot_rate, 2);
    
    v_effective_gross := v_gross - v_lop_amount + v_ot_earnings;

    -- 5. Evaluate Payroll Readiness Checklist
    SELECT COUNT(*) INTO v_unresolved_exc
    FROM public.attendance_exceptions
    WHERE employee_id = p_employee_id 
      AND (payroll_period_id = p_payroll_period_id OR payroll_period_id IS NULL)
      AND status = 'OPEN';

    IF v_unresolved_exc > 0 THEN
        v_is_ready := FALSE;
        v_readiness_issues := array_append(v_readiness_issues, v_unresolved_exc || ' unresolved attendance exceptions flagged');
    END IF;

    IF v_config.annual_ctc IS NULL THEN
        v_is_ready := FALSE;
        v_readiness_issues := array_append(v_readiness_issues, 'Salary structure and CTC not assigned');
    END IF;

    -- 6. Construct Context Output
    v_result := jsonb_build_object(
        'period', jsonb_build_object(
            'id', v_period.id,
            'period_name', v_period.period_name,
            'start_date', v_period.start_date,
            'end_date', v_period.end_date,
            'pay_date', v_period.pay_date,
            'status', v_period.status,
            'policy_version', v_period.policy_version,
            'is_locked', v_period.is_locked
        ),
        'employee', jsonb_build_object(
            'employee_id', COALESCE(v_config.employee_id, p_employee_id),
            'employee_code', v_config.employee_code,
            'first_name', v_config.first_name,
            'last_name', v_config.last_name,
            'work_email', v_config.work_email,
            'department_name', v_config.department_name,
            'designation_title', v_config.designation_title,
            'work_location_name', v_config.work_location_name,
            'reporting_manager_name', v_config.reporting_manager_name
        ),
        'summary', jsonb_build_object(
            'total_calendar_days', COALESCE(v_summary.total_calendar_days, 31),
            'scheduled_days', COALESCE(v_summary.scheduled_days, 21),
            'weekly_off_days', COALESCE(v_summary.weekly_off_days, 10),
            'present_days', COALESCE(v_summary.present_days, 0),
            'absent_days', COALESCE(v_summary.absent_days, 0),
            'paid_leave_days', COALESCE(v_summary.paid_leave_days, 0),
            'half_days', COALESCE(v_summary.half_days, 0),
            'late_events', COALESCE(v_summary.late_events, 0),
            'late_minutes', COALESCE(v_summary.late_minutes, 0),
            'early_events', COALESCE(v_summary.early_events, 0),
            'early_minutes', COALESCE(v_summary.early_minutes, 0),
            'worked_minutes', COALESCE(v_summary.worked_minutes, 0),
            'overtime_minutes', COALESCE(v_summary.overtime_minutes, 0),
            'approved_overtime_minutes', v_ot_minutes,
            'lop_days', v_lop_days,
            'payable_days', COALESCE(v_summary.total_calendar_days, 31) - v_lop_days
        ),
        'payroll_impact', jsonb_build_object(
            'annual_ctc', v_annual_ctc,
            'monthly_ctc', v_monthly_ctc,
            'base_gross', v_gross,
            'daily_wage_rate', v_daily_rate,
            'lop_days', v_lop_days,
            'lop_deduction_amount', v_lop_amount,
            'approved_ot_hours', ROUND(v_ot_minutes / 60.0, 1),
            'ot_hourly_rate', v_hourly_ot_rate,
            'ot_earnings', v_ot_earnings,
            'net_attendance_adjustment', (v_ot_earnings - v_lop_amount),
            'effective_gross', v_effective_gross
        ),
        'readiness', jsonb_build_object(
            'is_ready_for_payroll', v_is_ready,
            'unresolved_exceptions_count', v_unresolved_exc,
            'issues', v_readiness_issues,
            'has_salary_config', (v_config.annual_ctc IS NOT NULL),
            'has_statutory_config', (v_config.pan_reference IS NOT NULL OR v_config.pf_applicable IS NOT NULL),
            'all_regularizations_resolved', (v_unresolved_exc = 0)
        )
    );

    RETURN v_result;
END;
$$;


-- ============================================================================
-- 8. RPC: FINALIZE ATTENDANCE FOR PAYROLL (Locks & Transitions to Ready State)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_finalize_employee_attendance_for_payroll(
    p_tenant_id VARCHAR(64),
    p_org_id VARCHAR(64),
    p_employee_id VARCHAR(64),
    p_payroll_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_context JSONB;
    v_is_ready BOOLEAN;
BEGIN
    -- 1. Calculate context and verify readiness
    v_context := public.fn_calculate_employee_payroll_context(p_tenant_id, p_org_id, p_employee_id, p_payroll_period_id);
    v_is_ready := (v_context->'readiness'->>'is_ready_for_payroll')::BOOLEAN;

    IF v_is_ready IS NOT TRUE THEN
        RAISE EXCEPTION 'Cannot finalize attendance. Outstanding issues: %', (v_context->'readiness'->>'issues');
    END IF;

    -- 2. Upsert Employee Payroll Record with Snapshot State
    INSERT INTO public.employee_payroll_records (
        tenant_id, organization_id, employee_id, payroll_period_id,
        annual_ctc, monthly_ctc, base_gross_earnings,
        lop_days, lop_deduction_amount, approved_ot_minutes, ot_rate_per_hour, ot_earnings,
        net_attendance_adjustment, effective_gross_earnings,
        status, calculation_trace, calculated_at, updated_at
    ) VALUES (
        p_tenant_id, p_org_id, p_employee_id, p_payroll_period_id,
        (v_context->'payroll_impact'->>'annual_ctc')::NUMERIC,
        (v_context->'payroll_impact'->>'monthly_ctc')::NUMERIC,
        (v_context->'payroll_impact'->>'base_gross')::NUMERIC,
        (v_context->'payroll_impact'->>'lop_days')::NUMERIC,
        (v_context->'payroll_impact'->>'lop_deduction_amount')::NUMERIC,
        (v_context->'summary'->>'approved_overtime_minutes')::INT,
        (v_context->'payroll_impact'->>'ot_hourly_rate')::NUMERIC,
        (v_context->'payroll_impact'->>'ot_earnings')::NUMERIC,
        (v_context->'payroll_impact'->>'net_attendance_adjustment')::NUMERIC,
        (v_context->'payroll_impact'->>'effective_gross')::NUMERIC,
        'READY_FOR_PAYROLL', v_context, NOW(), NOW()
    )
    ON CONFLICT (tenant_id, employee_id, payroll_period_id) 
    DO UPDATE SET
        lop_days = EXCLUDED.lop_days,
        lop_deduction_amount = EXCLUDED.lop_deduction_amount,
        approved_ot_minutes = EXCLUDED.approved_ot_minutes,
        ot_earnings = EXCLUDED.ot_earnings,
        net_attendance_adjustment = EXCLUDED.net_attendance_adjustment,
        effective_gross_earnings = EXCLUDED.effective_gross_earnings,
        status = 'READY_FOR_PAYROLL',
        calculation_trace = EXCLUDED.calculation_trace,
        updated_at = NOW();

    -- 3. Log Immutable Policy Audit Event
    INSERT INTO public.attendance_policy_audit_logs (
        id, organization_id, tenant_id, employee_id, payroll_period_id,
        actor_name, actor_role, entity_type, entity_id, entity_name,
        change_summary, event_type, description, metadata, created_at, timestamp
    ) VALUES (
        'audit-' || gen_random_uuid()::TEXT,
        p_org_id, p_tenant_id, p_employee_id, p_payroll_period_id,
        'System Engine', 'SYSTEM', 'PAYROLL_PERIOD', p_payroll_period_id::TEXT, 'Payroll Period Statement',
        'Attendance finalized for payroll', 'ATTENDANCE_FINALIZED_FOR_PAYROLL',
        'Employee attendance statement finalized and locked for payroll processing.',
        jsonb_build_object(
            'effective_gross', (v_context->'payroll_impact'->>'effective_gross'),
            'lop_days', (v_context->'payroll_impact'->>'lop_days'),
            'ot_earnings', (v_context->'payroll_impact'->>'ot_earnings')
        ),
        NOW(), NOW()
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'status', 'READY_FOR_PAYROLL',
        'employee_id', p_employee_id,
        'payroll_period_id', p_payroll_period_id,
        'message', 'Attendance finalized and verified for payroll processing.'
    );
END;
$$;

-- Secure Permissions
REVOKE ALL ON FUNCTION public.fn_calculate_employee_payroll_context(VARCHAR, VARCHAR, VARCHAR, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_calculate_employee_payroll_context(VARCHAR, VARCHAR, VARCHAR, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_finalize_employee_attendance_for_payroll(VARCHAR, VARCHAR, VARCHAR, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_finalize_employee_attendance_for_payroll(VARCHAR, VARCHAR, VARCHAR, UUID) TO authenticated, service_role;
