-- ============================================================================
-- JOY PeopleHR — Migration 178
-- Complete Break, Lunch & Work Hours Management Engine
--
-- Additive & backward-compatible:
-- 1. break_policies & break_policy_versions (multi-tenant, scoped precedence, versioned)
-- 2. attendance_break_events (event-sourced breaks tied to attendance_daily session)
-- 3. attendance_break_exceptions (policy violations, active/missing break exceptions)
-- 4. attendance_break_corrections (immutable HR audit trail)
-- 5. Additive break/work columns on attendance_daily
-- 6. Authoritative RPCs:
--    - fn_resolve_effective_break_policy
--    - fn_recalculate_daily_attendance (extended with real break & paid/unpaid math)
--    - fn_record_break_event (transactional + row lock + idempotency + state machine)
--    - fn_record_attendance_punch (extended with active-break checkout guard/resolution)
--    - fn_hr_correct_break_event (HR correction & regularization approval with audit)
-- 7. Strict Multi-Tenant RLS + Realtime publication
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BREAK POLICIES (Versioned, Scoped Precedence)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.break_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NULL,
    branch_id UUID NULL,
    department_id UUID NULL,
    designation TEXT NULL,
    employee_group TEXT NULL,
    shift_id UUID NULL REFERENCES public.shifts(id) ON DELETE SET NULL,
    employee_id UUID NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    policy_name TEXT NOT NULL DEFAULT 'Standard Break & Work Hours Policy',
    scope_type TEXT NOT NULL DEFAULT 'ORGANIZATION'
        CHECK (scope_type IN ('ORGANIZATION', 'COMPANY', 'BRANCH', 'DEPARTMENT', 'DESIGNATION', 'SHIFT', 'EMPLOYEE')),
    precedence_rank INTEGER NOT NULL DEFAULT 10,

    -- Policy Parameters
    automatic_break_minutes INTEGER NOT NULL DEFAULT 30,
    automatic_break_after_hours NUMERIC(4,2) NOT NULL DEFAULT 5.00,
    mandatory_breaks BOOLEAN NOT NULL DEFAULT true,
    paid_break_allowance_minutes INTEGER NOT NULL DEFAULT 15,
    max_unpaid_break_minutes INTEGER NOT NULL DEFAULT 60,
    max_daily_break_minutes INTEGER NOT NULL DEFAULT 90,
    max_breaks_per_day INTEGER NOT NULL DEFAULT 4,
    grace_period_minutes INTEGER NOT NULL DEFAULT 5,
    core_hours_start TEXT NOT NULL DEFAULT '10:00',
    core_hours_end TEXT NOT NULL DEFAULT '16:00',
    breaks_prohibited_in_core_hours BOOLEAN NOT NULL DEFAULT false,
    require_approval_on_exceed BOOLEAN NOT NULL DEFAULT true,

    -- Configurable Break Categories (Lunch, Tea, Coffee, Personal, Rest, Other)
    categories JSONB NOT NULL DEFAULT '[
      {"code":"LUNCH","label":"Lunch Break","is_paid":false,"max_duration_minutes":45,"max_occurrences":1,"min_interval_minutes":120,"requires_approval":false,"exception_on_exceed":true,"applicable_days":[1,2,3,4,5,6,7],"enabled":true},
      {"code":"TEA","label":"Tea Break","is_paid":true,"max_duration_minutes":15,"max_occurrences":2,"min_interval_minutes":90,"requires_approval":false,"exception_on_exceed":true,"applicable_days":[1,2,3,4,5,6,7],"enabled":true},
      {"code":"COFFEE","label":"Coffee Break","is_paid":true,"max_duration_minutes":15,"max_occurrences":1,"min_interval_minutes":90,"requires_approval":false,"exception_on_exceed":true,"applicable_days":[1,2,3,4,5,6,7],"enabled":true},
      {"code":"PERSONAL","label":"Personal Break","is_paid":false,"max_duration_minutes":20,"max_occurrences":2,"min_interval_minutes":60,"requires_approval":false,"exception_on_exceed":true,"applicable_days":[1,2,3,4,5,6,7],"enabled":true},
      {"code":"REST","label":"Rest Break","is_paid":true,"max_duration_minutes":15,"max_occurrences":1,"min_interval_minutes":120,"requires_approval":false,"exception_on_exceed":true,"applicable_days":[1,2,3,4,5,6,7],"enabled":false},
      {"code":"OTHER","label":"Other Break","is_paid":false,"max_duration_minutes":20,"max_occurrences":2,"min_interval_minutes":60,"requires_approval":true,"exception_on_exceed":true,"applicable_days":[1,2,3,4,5,6,7],"enabled":true}
    ]'::jsonb,

    version INTEGER NOT NULL DEFAULT 1,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NULL,
    updated_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_break_policies_org_active
    ON public.break_policies (organization_id, status, effective_from DESC);

CREATE TABLE IF NOT EXISTS public.break_policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES public.break_policies(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    change_reason TEXT NOT NULL DEFAULT 'Policy updated',
    changed_by UUID NULL,
    effective_from DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_break_policy_versions_policy
    ON public.break_policy_versions (policy_id, version DESC);

-- Seed default break policy for existing active organizations (idempotent)
INSERT INTO public.break_policies (
    organization_id, policy_name, scope_type, precedence_rank, is_default, status, effective_from
)
SELECT o.id, 'Standard Break & Work Hours Policy', 'ORGANIZATION', 10, true, 'ACTIVE', '2026-01-01'::date
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.break_policies bp WHERE bp.organization_id = o.id
);

-- ----------------------------------------------------------------------------
-- 2. ATTENDANCE BREAK EVENTS (Normalized, Tied to attendance_daily Session)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_break_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_daily_id UUID NOT NULL REFERENCES public.attendance_daily(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    shift_id UUID NULL REFERENCES public.shifts(id) ON DELETE SET NULL,

    break_category TEXT NOT NULL CHECK (break_category IN ('LUNCH', 'TEA', 'COFFEE', 'PERSONAL', 'REST', 'OTHER')),
    break_sequence INTEGER NOT NULL DEFAULT 1,
    is_paid BOOLEAN NOT NULL DEFAULT false,

    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NULL,
    device_started_at TIMESTAMPTZ NULL,
    device_ended_at TIMESTAMPTZ NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    paid_minutes INTEGER NOT NULL DEFAULT 0,
    unpaid_minutes INTEGER NOT NULL DEFAULT 0,

    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CORRECTED', 'CANCELLED')),
    start_source TEXT NOT NULL DEFAULT 'mobile' CHECK (start_source IN ('mobile', 'web', 'admin_correction', 'biometric', 'integration')),
    end_source TEXT NULL CHECK (end_source IN ('mobile', 'web', 'admin_correction', 'biometric', 'integration')),

    policy_id UUID NULL REFERENCES public.break_policies(id) ON DELETE SET NULL,
    policy_version INTEGER NULL,
    policy_snapshot JSONB NULL,

    exceeds_limit BOOLEAN NOT NULL DEFAULT false,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    approval_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED'
        CHECK (approval_status IN ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID NULL,
    approved_at TIMESTAMPTZ NULL,

    start_idempotency_key TEXT NULL,
    end_idempotency_key TEXT NULL,
    correction_reference_id UUID NULL,
    notes TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_break_events_org_date
    ON public.attendance_break_events (organization_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_break_events_emp_date
    ON public.attendance_break_events (employee_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_break_events_daily
    ON public.attendance_break_events (attendance_daily_id, started_at ASC);

-- Prevent more than one ACTIVE break at a time per employee!
CREATE UNIQUE INDEX IF NOT EXISTS uq_break_events_one_active_per_employee
    ON public.attendance_break_events (employee_id)
    WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS uq_break_events_start_idemp
    ON public.attendance_break_events (employee_id, start_idempotency_key)
    WHERE start_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_break_events_end_idemp
    ON public.attendance_break_events (employee_id, end_idempotency_key)
    WHERE end_idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. BREAK EXCEPTIONS & IMMUTABLE CORRECTIONS AUDIT TRAIL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_break_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_daily_id UUID NULL REFERENCES public.attendance_daily(id) ON DELETE CASCADE,
    break_event_id UUID NULL REFERENCES public.attendance_break_events(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,

    exception_type TEXT NOT NULL CHECK (exception_type IN (
        'MISSING_BREAK_END',
        'MISSING_CHECK_OUT',
        'EXCEEDS_MAX_DURATION',
        'UNAPPROVED_BREAK',
        'OUTSIDE_SHIFT',
        'CHECKOUT_WITH_ACTIVE_BREAK',
        'CORE_HOURS_VIOLATION',
        'DUPLICATE_EVENT',
        'INVALID_SEQUENCE',
        'OFFLINE_DELAYED_SUBMISSION',
        'SESSION_CONFLICT',
        'POLICY_MISMATCH',
        'CORRECTION_PENDING'
    )),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT NOT NULL,
    resolution_status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (resolution_status IN ('OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED')),
    reviewer_id UUID NULL,
    resolution_notes TEXT NULL,
    resolved_at TIMESTAMPTZ NULL,
    history JSONB NOT NULL DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_break_exceptions_org_date
    ON public.attendance_break_exceptions (organization_id, attendance_date DESC, resolution_status);

CREATE TABLE IF NOT EXISTS public.attendance_break_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_daily_id UUID NULL REFERENCES public.attendance_daily(id) ON DELETE CASCADE,
    break_event_id UUID NULL REFERENCES public.attendance_break_events(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,

    action_type TEXT NOT NULL CHECK (action_type IN (
        'CORRECTION',
        'MISSED_BREAK_ADD',
        'RESOLVE_ACTIVE',
        'REGULARIZATION_REQUEST',
        'APPROVAL',
        'REJECTION'
    )),
    break_category TEXT NOT NULL,
    original_started_at TIMESTAMPTZ NULL,
    original_ended_at TIMESTAMPTZ NULL,
    new_started_at TIMESTAMPTZ NULL,
    new_ended_at TIMESTAMPTZ NULL,
    reason TEXT NOT NULL,

    changed_by UUID NULL,
    changed_by_name TEXT NULL,
    approval_status TEXT NOT NULL DEFAULT 'APPROVED'
        CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approver_id UUID NULL,
    approved_at TIMESTAMPTZ NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_break_corrections_org_date
    ON public.attendance_break_corrections (organization_id, attendance_date DESC);

-- ----------------------------------------------------------------------------
-- 4. ADDITIVE COLUMNS ON attendance_daily (Backward-Compatible)
-- ----------------------------------------------------------------------------
ALTER TABLE public.attendance_daily
    ADD COLUMN IF NOT EXISTS gross_presence_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paid_break_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unpaid_break_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS auto_deducted_break_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_payable_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_work_state TEXT NOT NULL DEFAULT 'NOT_CHECKED_IN',
    ADD COLUMN IF NOT EXISTS active_break_event_id UUID NULL,
    ADD COLUMN IF NOT EXISTS active_break_category TEXT NULL,
    ADD COLUMN IF NOT EXISTS active_break_started_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS break_policy_id UUID NULL,
    ADD COLUMN IF NOT EXISTS break_policy_version INTEGER NULL,
    ADD COLUMN IF NOT EXISTS has_break_exception BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 5. RESOLVE EFFECTIVE BREAK POLICY (Deterministic Scope Precedence)
--    Precedence: EMPLOYEE (60) > SHIFT (50) > DESIGNATION (40) > DEPARTMENT (30) > BRANCH (20) > COMPANY (15) > ORGANIZATION (10)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_resolve_effective_break_policy(
    p_org_id UUID,
    p_employee_id UUID,
    p_shift_id UUID DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS public.break_policies
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_emp RECORD;
    v_policy public.break_policies;
BEGIN
    SELECT id, company_id, department_id, (to_jsonb(e)->>'designation') AS designation_text
    INTO v_emp
    FROM public.employees e
    WHERE e.id = p_employee_id;

    SELECT bp.*
    INTO v_policy
    FROM public.break_policies bp
    WHERE bp.organization_id = p_org_id
      AND bp.status = 'ACTIVE'
      AND bp.effective_from <= COALESCE(p_date, CURRENT_DATE)
      AND (bp.effective_to IS NULL OR bp.effective_to >= COALESCE(p_date, CURRENT_DATE))
      AND (bp.employee_id IS NULL OR bp.employee_id = p_employee_id)
      AND (bp.shift_id IS NULL OR bp.shift_id = p_shift_id)
      AND (bp.department_id IS NULL OR bp.department_id = v_emp.department_id)
      AND (bp.designation IS NULL OR LOWER(bp.designation) = LOWER(COALESCE(v_emp.designation_text, '')))
      AND (bp.company_id IS NULL OR bp.company_id = v_emp.company_id)
    ORDER BY
      (CASE
        WHEN bp.employee_id IS NOT NULL THEN 600
        WHEN bp.shift_id IS NOT NULL THEN 500
        WHEN bp.designation IS NOT NULL THEN 400
        WHEN bp.department_id IS NOT NULL THEN 300
        WHEN bp.branch_id IS NOT NULL THEN 200
        WHEN bp.company_id IS NOT NULL THEN 150
        ELSE 100
      END) DESC,
      bp.precedence_rank DESC,
      bp.effective_from DESC,
      bp.version DESC,
      bp.created_at DESC
    LIMIT 1;

    RETURN v_policy;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_effective_break_policy(uuid, uuid, uuid, date) TO authenticated, service_role, anon;

-- ----------------------------------------------------------------------------
-- 6. AUTHORITATIVE DAILY WORK HOURS & BREAK RECALCULATION ENGINE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_recalculate_daily_attendance(
    p_employee_id UUID,
    p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_org_id UUID;
    v_existing_daily RECORD;
    v_shift RECORD;
    v_shift_id UUID := NULL;
    v_is_overnight BOOLEAN := false;
    v_scheduled_duration_mins INTEGER := 540;
    v_min_half_day_mins INTEGER := 240;
    v_min_full_day_mins INTEGER := 480;

    v_first_in TIMESTAMPTZ := NULL;
    v_last_out TIMESTAMPTZ := NULL;
    v_punch_count INTEGER := 0;
    v_gross_presence_mins INTEGER := 0;
    v_total_work_mins INTEGER := 0;
    v_late_mins INTEGER := 0;
    v_early_mins INTEGER := 0;
    v_overtime_mins INTEGER := 0;

    -- Break calculation state
    v_policy public.break_policies;
    v_actual_break_mins INTEGER := 0;
    v_raw_paid_break_mins INTEGER := 0;
    v_raw_unpaid_break_mins INTEGER := 0;
    v_paid_allowance_mins INTEGER := 0;
    v_paid_break_mins INTEGER := 0;
    v_unpaid_break_mins INTEGER := 0;
    v_auto_deducted_mins INTEGER := 0;
    v_completed_break_count INTEGER := 0;
    v_active_break RECORD;
    v_work_state TEXT := 'NOT_CHECKED_IN';
    v_has_exception BOOLEAN := false;

    v_status public.attendance_status_enum := 'PRESENT';
    v_payable_status NUMERIC(3, 2) := 1.00;
    v_expected_in TIMESTAMPTZ;
    v_expected_out TIMESTAMPTZ;
    v_earliest_punch_time TIME;
    v_overtime_eligible BOOLEAN := true;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.employees WHERE id = p_employee_id;
    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
    END IF;

    SELECT * INTO v_existing_daily
    FROM public.attendance_daily
    WHERE employee_id = p_employee_id AND attendance_date = p_date;

    -- 1. Resolve Shift (exact existing priority)
    SELECT s.* INTO v_shift
    FROM public.employee_shift_assignments esa
    JOIN public.shifts s ON s.id = esa.shift_id
    WHERE esa.employee_id = p_employee_id
      AND esa.valid_from <= p_date
      AND (esa.valid_to IS NULL OR esa.valid_to >= p_date)
    ORDER BY esa.valid_from DESC
    LIMIT 1;

    IF v_shift.id IS NULL AND v_existing_daily.shift_id IS NOT NULL THEN
        SELECT * INTO v_shift FROM public.shifts WHERE id = v_existing_daily.shift_id AND is_active = true;
    END IF;

    IF v_shift.id IS NULL THEN
        SELECT s.* INTO v_shift
        FROM public.shift_rosters sr
        JOIN public.shifts s ON s.id = sr.shift_id
        WHERE sr.employee_id = p_employee_id
          AND sr.roster_date = p_date
        LIMIT 1;
    END IF;

    IF v_shift.id IS NULL THEN
        SELECT (MIN(punch_time) AT TIME ZONE 'Asia/Kolkata')::TIME
        INTO v_earliest_punch_time
        FROM public.attendance_punches
        WHERE employee_id = p_employee_id
          AND (attendance_date = p_date OR (attendance_date IS NULL AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date));

        IF v_earliest_punch_time IS NOT NULL AND (v_earliest_punch_time >= TIME '18:00:00' OR v_earliest_punch_time < TIME '04:00:00') THEN
            SELECT * INTO v_shift FROM public.shifts WHERE organization_id = v_org_id AND is_overnight = true AND is_active = true LIMIT 1;
        END IF;
    END IF;

    IF v_shift.id IS NULL THEN
        SELECT * INTO v_shift FROM public.shifts WHERE organization_id = v_org_id AND is_active = true ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF v_shift.id IS NOT NULL THEN
        v_shift_id := v_shift.id;
        v_is_overnight := COALESCE(v_shift.is_overnight, false)
            OR (v_shift.start_time IS NOT NULL AND v_shift.end_time < v_shift.start_time);

        IF v_is_overnight THEN
            v_scheduled_duration_mins := (1440 - (EXTRACT(HOUR FROM v_shift.start_time)*60 + EXTRACT(MINUTE FROM v_shift.start_time))::INTEGER)
                + (EXTRACT(HOUR FROM v_shift.end_time)*60 + EXTRACT(MINUTE FROM v_shift.end_time))::INTEGER;
        ELSE
            v_scheduled_duration_mins := GREATEST(60,
                ((EXTRACT(HOUR FROM v_shift.end_time)*60 + EXTRACT(MINUTE FROM v_shift.end_time))
                - (EXTRACT(HOUR FROM v_shift.start_time)*60 + EXTRACT(MINUTE FROM v_shift.start_time)))::INTEGER
            );
        END IF;

        v_min_half_day_mins := COALESCE((v_shift.min_half_day_hours * 60)::INTEGER, 240);
        v_min_full_day_mins := COALESCE((v_shift.min_full_day_hours * 60)::INTEGER, v_scheduled_duration_mins);
    END IF;

    -- 2. Resolve Effective Break Policy for this org/employee/shift/date
    v_policy := public.fn_resolve_effective_break_policy(v_org_id, p_employee_id, v_shift_id, p_date);
    v_paid_allowance_mins := COALESCE(v_policy.paid_break_allowance_minutes, 15);

    -- 3. Fetch punches for this attendance_date
    SELECT
        MIN(CASE WHEN UPPER(punch_type) IN ('IN', 'CHECK_IN') THEN punch_time ELSE NULL END),
        MAX(CASE WHEN UPPER(punch_type) IN ('OUT', 'CHECK_OUT') THEN punch_time ELSE NULL END),
        COUNT(*)
    INTO
        v_first_in,
        v_last_out,
        v_punch_count
    FROM public.attendance_punches
    WHERE employee_id = p_employee_id
      AND (
          attendance_date = p_date
          OR (attendance_date IS NULL AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date)
      );

    -- Fallback for legacy single-punch streams
    IF v_first_in IS NULL AND v_punch_count > 0 THEN
        SELECT MIN(punch_time), MAX(punch_time)
        INTO v_first_in, v_last_out
        FROM public.attendance_punches
        WHERE employee_id = p_employee_id
          AND (
              attendance_date = p_date
              OR (attendance_date IS NULL AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date)
          );
        IF v_punch_count = 1 THEN
            v_last_out := NULL;
        END IF;
    END IF;

    IF v_punch_count IS NULL OR v_punch_count = 0 OR v_first_in IS NULL THEN
        INSERT INTO public.attendance_daily (
            organization_id, employee_id, shift_id, attendance_date,
            first_check_in, last_check_out, total_work_minutes, break_minutes,
            gross_presence_minutes, paid_break_minutes, unpaid_break_minutes,
            auto_deducted_break_minutes, net_payable_minutes,
            current_work_state, active_break_event_id, active_break_category, active_break_started_at,
            break_policy_id, break_policy_version, has_break_exception,
            overtime_minutes, late_entry_minutes, early_exit_minutes,
            status, payable_status, is_regularized, updated_at
        ) VALUES (
            v_org_id, p_employee_id, v_shift_id, p_date,
            NULL, NULL, 0, 0,
            0, 0, 0,
            0, 0,
            'NOT_CHECKED_IN', NULL, NULL, NULL,
            v_policy.id, v_policy.version, false,
            0, 0, 0,
            'ABSENT', 0.00, false, now()
        )
        ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
            shift_id = COALESCE(EXCLUDED.shift_id, public.attendance_daily.shift_id),
            first_check_in = EXCLUDED.first_check_in,
            last_check_out = EXCLUDED.last_check_out,
            total_work_minutes = 0,
            break_minutes = 0,
            gross_presence_minutes = 0,
            paid_break_minutes = 0,
            unpaid_break_minutes = 0,
            auto_deducted_break_minutes = 0,
            net_payable_minutes = 0,
            current_work_state = 'NOT_CHECKED_IN',
            active_break_event_id = NULL,
            active_break_category = NULL,
            active_break_started_at = NULL,
            break_policy_id = EXCLUDED.break_policy_id,
            break_policy_version = EXCLUDED.break_policy_version,
            status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.status ELSE EXCLUDED.status END,
            payable_status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.payable_status ELSE EXCLUDED.payable_status END,
            updated_at = now();

        RETURN jsonb_build_object('success', true, 'status', 'ABSENT', 'date', p_date);
    END IF;

    -- 4. Aggregate recorded break events for this session
    SELECT
        COUNT(*)::INTEGER,
        COALESCE(SUM(duration_minutes), 0)::INTEGER,
        COALESCE(SUM(CASE WHEN is_paid THEN duration_minutes ELSE 0 END), 0)::INTEGER,
        COALESCE(SUM(CASE WHEN NOT is_paid THEN duration_minutes ELSE 0 END), 0)::INTEGER
    INTO
        v_completed_break_count,
        v_actual_break_mins,
        v_raw_paid_break_mins,
        v_raw_unpaid_break_mins
    FROM public.attendance_break_events
    WHERE employee_id = p_employee_id
      AND attendance_date = p_date
      AND status IN ('COMPLETED', 'CORRECTED');

    -- Paid break allowance cap: paid categories are credited up to policy paid allowance;
    -- any excess over the paid allowance is reclassified as unpaid deduction!
    IF v_raw_paid_break_mins > v_paid_allowance_mins THEN
        v_paid_break_mins := v_paid_allowance_mins;
        v_unpaid_break_mins := v_raw_unpaid_break_mins + (v_raw_paid_break_mins - v_paid_allowance_mins);
    ELSE
        v_paid_break_mins := v_raw_paid_break_mins;
        v_unpaid_break_mins := v_raw_unpaid_break_mins;
    END IF;

    -- Check for active (ongoing) break
    SELECT id, break_category, started_at
    INTO v_active_break
    FROM public.attendance_break_events
    WHERE employee_id = p_employee_id
      AND attendance_date = p_date
      AND status = 'ACTIVE'
    ORDER BY started_at DESC
    LIMIT 1;

    -- Check open exceptions for this date
    SELECT EXISTS(
        SELECT 1 FROM public.attendance_break_exceptions
        WHERE employee_id = p_employee_id
          AND attendance_date = p_date
          AND resolution_status IN ('OPEN', 'IN_REVIEW')
    ) INTO v_has_exception;

    -- 5. Compute presence & net payable minutes (ONLY when checked out; never invent open session totals)
    IF v_last_out IS NOT NULL AND v_first_in IS NOT NULL AND v_last_out > v_first_in THEN
        v_gross_presence_mins := GREATEST(0, (EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 60)::INTEGER);

        -- Auto-deduction rule applies ONLY if no real break events were recorded AND mandatory_breaks is enabled
        IF v_completed_break_count = 0
           AND COALESCE(v_policy.mandatory_breaks, false) = true
           AND COALESCE(v_policy.automatic_break_minutes, 0) > 0
           AND v_gross_presence_mins >= (COALESCE(v_policy.automatic_break_after_hours, 5.0) * 60) THEN
            v_auto_deducted_mins := v_policy.automatic_break_minutes;
        ELSE
            v_auto_deducted_mins := 0;
        END IF;

        v_total_work_mins := GREATEST(0, v_gross_presence_mins - v_unpaid_break_mins - v_auto_deducted_mins);
        v_work_state := 'CHECKED_OUT';
    ELSE
        v_gross_presence_mins := 0;
        v_auto_deducted_mins := 0;
        v_total_work_mins := 0;
        v_last_out := NULL;
        v_work_state := CASE WHEN v_active_break.id IS NOT NULL THEN 'ON_BREAK' ELSE 'WORKING' END;
    END IF;

    -- 6. Late Entry & Early Exit
    IF v_shift.start_time IS NOT NULL AND v_first_in IS NOT NULL THEN
        v_expected_in := ((p_date::TEXT || ' ' || v_shift.start_time::TEXT)::TIMESTAMP) AT TIME ZONE 'Asia/Kolkata';
        IF v_first_in > (v_expected_in + (COALESCE(v_shift.grace_entry_minutes, 15) || ' minutes')::INTERVAL) THEN
            v_late_mins := GREATEST(0, (EXTRACT(EPOCH FROM (v_first_in - v_expected_in)) / 60)::INTEGER);
        ELSE
            v_late_mins := 0;
        END IF;
    END IF;

    IF v_shift.end_time IS NOT NULL AND v_last_out IS NOT NULL THEN
        IF v_is_overnight THEN
            v_expected_out := (((p_date + INTERVAL '1 day')::DATE::TEXT || ' ' || v_shift.end_time::TEXT)::TIMESTAMP) AT TIME ZONE 'Asia/Kolkata';
        ELSE
            v_expected_out := ((p_date::TEXT || ' ' || v_shift.end_time::TEXT)::TIMESTAMP) AT TIME ZONE 'Asia/Kolkata';
        END IF;

        IF v_last_out < (v_expected_out - (COALESCE(v_shift.grace_exit_minutes, 15) || ' minutes')::INTERVAL) THEN
            v_early_mins := GREATEST(0, (EXTRACT(EPOCH FROM (v_expected_out - v_last_out)) / 60)::INTEGER);
        ELSE
            v_early_mins := 0;
        END IF;
    ELSE
        v_early_mins := 0;
    END IF;

    -- 7. Overtime calculation (uses net payable minutes after break deductions!)
    v_overtime_eligible := COALESCE(v_existing_daily.overtime_eligible, true);
    IF v_last_out IS NOT NULL AND v_overtime_eligible AND v_total_work_mins > (v_min_full_day_mins + 30) THEN
        v_overtime_mins := v_total_work_mins - v_min_full_day_mins;
    ELSE
        v_overtime_mins := 0;
    END IF;

    -- 8. Status & Payable Fraction
    IF v_last_out IS NOT NULL THEN
        IF v_total_work_mins >= v_min_full_day_mins THEN
            v_status := 'PRESENT';
            v_payable_status := 1.00;
        ELSIF v_total_work_mins >= v_min_half_day_mins THEN
            v_status := 'HALF_DAY';
            v_payable_status := 0.50;
        ELSE
            v_status := 'ABSENT';
            v_payable_status := 0.00;
        END IF;
    ELSE
        v_status := 'PRESENT';
        v_payable_status := 1.00;
    END IF;

    -- 9. Upsert authoritative daily record
    INSERT INTO public.attendance_daily (
        organization_id, employee_id, shift_id, attendance_date,
        first_check_in, last_check_out,
        total_work_minutes, break_minutes,
        gross_presence_minutes, paid_break_minutes, unpaid_break_minutes,
        auto_deducted_break_minutes, net_payable_minutes,
        current_work_state, active_break_event_id, active_break_category, active_break_started_at,
        break_policy_id, break_policy_version, has_break_exception,
        overtime_minutes, late_entry_minutes, early_exit_minutes,
        status, payable_status, is_regularized, updated_at
    ) VALUES (
        v_org_id, p_employee_id, v_shift_id, p_date,
        v_first_in, v_last_out,
        v_total_work_mins, (v_actual_break_mins + v_auto_deducted_mins),
        v_gross_presence_mins, v_paid_break_mins, v_unpaid_break_mins,
        v_auto_deducted_mins, v_total_work_mins,
        v_work_state, v_active_break.id, v_active_break.break_category, v_active_break.started_at,
        v_policy.id, v_policy.version, v_has_exception,
        v_overtime_mins, v_late_mins, v_early_mins,
        v_status, v_payable_status, false, now()
    )
    ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
        shift_id = COALESCE(EXCLUDED.shift_id, public.attendance_daily.shift_id),
        first_check_in = COALESCE(public.attendance_daily.first_check_in, EXCLUDED.first_check_in),
        last_check_out = EXCLUDED.last_check_out,
        total_work_minutes = EXCLUDED.total_work_minutes,
        break_minutes = EXCLUDED.break_minutes,
        gross_presence_minutes = EXCLUDED.gross_presence_minutes,
        paid_break_minutes = EXCLUDED.paid_break_minutes,
        unpaid_break_minutes = EXCLUDED.unpaid_break_minutes,
        auto_deducted_break_minutes = EXCLUDED.auto_deducted_break_minutes,
        net_payable_minutes = EXCLUDED.net_payable_minutes,
        current_work_state = EXCLUDED.current_work_state,
        active_break_event_id = EXCLUDED.active_break_event_id,
        active_break_category = EXCLUDED.active_break_category,
        active_break_started_at = EXCLUDED.active_break_started_at,
        break_policy_id = EXCLUDED.break_policy_id,
        break_policy_version = EXCLUDED.break_policy_version,
        has_break_exception = EXCLUDED.has_break_exception,
        late_entry_minutes = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.late_entry_minutes ELSE EXCLUDED.late_entry_minutes END,
        early_exit_minutes = EXCLUDED.early_exit_minutes,
        overtime_minutes = EXCLUDED.overtime_minutes,
        status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.status ELSE EXCLUDED.status END,
        payable_status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.payable_status ELSE EXCLUDED.payable_status END,
        updated_at = now();

    UPDATE public.attendance_punches
    SET is_processed = true
    WHERE employee_id = p_employee_id
      AND attendance_date = p_date
      AND is_processed = false;

    RETURN jsonb_build_object(
        'success', true,
        'employee_id', p_employee_id,
        'date', p_date,
        'shift_code', v_shift.code,
        'is_overnight', v_is_overnight,
        'status', v_status,
        'work_state', v_work_state,
        'first_check_in', v_first_in,
        'last_check_out', v_last_out,
        'gross_presence_minutes', v_gross_presence_mins,
        'actual_break_minutes', v_actual_break_mins,
        'paid_break_minutes', v_paid_break_mins,
        'unpaid_break_minutes', v_unpaid_break_mins,
        'auto_deducted_break_minutes', v_auto_deducted_mins,
        'work_minutes', v_total_work_mins,
        'net_payable_minutes', v_total_work_mins,
        'overtime_minutes', v_overtime_mins,
        'late_minutes', v_late_mins,
        'early_minutes', v_early_mins
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_recalculate_daily_attendance(uuid, date) TO authenticated, service_role, anon;

-- ----------------------------------------------------------------------------
-- 7. TRANSACTIONAL BREAK EVENT RPC (Start / End Break with Row Lock & Idempotency)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_record_break_event(
    p_event_type TEXT, -- 'BREAK_START' or 'BREAK_END'
    p_break_category TEXT DEFAULT 'LUNCH',
    p_source TEXT DEFAULT 'mobile',
    p_idempotency_key TEXT DEFAULT NULL,
    p_device_timestamp TIMESTAMPTZ DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL -- optional override for service_role/testing
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_emp_id UUID;
    v_org_id UUID;
    v_now TIMESTAMPTZ := NOW();
    v_now_ist TIMESTAMP := NOW() AT TIME ZONE 'Asia/Kolkata';
    v_today DATE := v_now_ist::DATE;
    v_yesterday DATE := (v_now_ist - INTERVAL '1 day')::DATE;
    v_event_type TEXT := UPPER(TRIM(COALESCE(p_event_type, '')));
    v_category TEXT := UPPER(TRIM(COALESCE(p_break_category, 'LUNCH')));
    v_source TEXT := LOWER(TRIM(COALESCE(p_source, 'mobile')));

    v_daily RECORD;
    v_existing_idemp RECORD;
    v_active_break RECORD;
    v_policy public.break_policies;
    v_cat_cfg JSONB := NULL;
    v_is_paid BOOLEAN := false;
    v_max_cat_mins INTEGER := 60;
    v_max_occurrences INTEGER := 2;
    v_min_interval_mins INTEGER := 0;
    v_requires_approval BOOLEAN := false;
    v_exception_on_exceed BOOLEAN := true;
    v_cat_count_today INTEGER := 0;
    v_last_ended_at TIMESTAMPTZ := NULL;
    v_next_seq INTEGER := 1;
    v_duration_mins INTEGER := 0;
    v_exceeds_limit BOOLEAN := false;
    v_new_event_id UUID;
    v_recalc JSONB;
    v_ist_hhmm TEXT;
    v_dow INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL AND p_employee_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    IF p_employee_id IS NOT NULL AND v_user_id IS NULL THEN
        SELECT id, organization_id INTO v_emp_id, v_org_id
        FROM public.employees WHERE id = p_employee_id;
    ELSE
        SELECT e.id, e.organization_id
        INTO v_emp_id, v_org_id
        FROM public.user_profiles up
        JOIN public.employees e ON (
            e.id = up.employee_id
            OR e.user_id = up.id
            OR e.user_id = up.auth_user_id
            OR lower(e.work_email) = lower(up.email)
        )
        WHERE up.auth_user_id = v_user_id
        LIMIT 1;
    END IF;

    IF v_emp_id IS NULL THEN
        RAISE EXCEPTION 'Employee profile not found for current user.';
    END IF;

    IF v_event_type NOT IN ('BREAK_START', 'BREAK_END') THEN
        RAISE EXCEPTION 'INVALID_SEQUENCE: event_type must be BREAK_START or BREAK_END.';
    END IF;

    IF v_category NOT IN ('LUNCH', 'TEA', 'COFFEE', 'PERSONAL', 'REST', 'OTHER') THEN
        RAISE EXCEPTION 'Invalid break category: %', v_category;
    END IF;

    -- Idempotency check
    IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
        IF v_event_type = 'BREAK_START' THEN
            SELECT * INTO v_existing_idemp
            FROM public.attendance_break_events
            WHERE employee_id = v_emp_id AND start_idempotency_key = p_idempotency_key
            LIMIT 1;
        ELSE
            SELECT * INTO v_existing_idemp
            FROM public.attendance_break_events
            WHERE employee_id = v_emp_id AND end_idempotency_key = p_idempotency_key
            LIMIT 1;
        END IF;

        IF v_existing_idemp.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'idempotent_replay', true,
                'event_id', v_existing_idemp.id,
                'break_category', v_existing_idemp.break_category,
                'status', v_existing_idemp.status,
                'started_at', v_existing_idemp.started_at,
                'ended_at', v_existing_idemp.ended_at,
                'duration_minutes', v_existing_idemp.duration_minutes
            );
        END IF;
    END IF;

    -- Lock active open attendance_daily session (check today first, then open overnight session from yesterday)
    SELECT * INTO v_daily
    FROM public.attendance_daily
    WHERE employee_id = v_emp_id
      AND attendance_date = v_today
      AND first_check_in IS NOT NULL
      AND last_check_out IS NULL
    FOR UPDATE;

    IF v_daily.id IS NULL THEN
        SELECT * INTO v_daily
        FROM public.attendance_daily
        WHERE employee_id = v_emp_id
          AND attendance_date = v_yesterday
          AND first_check_in IS NOT NULL
          AND last_check_out IS NULL
        FOR UPDATE;
    END IF;

    IF v_daily.id IS NULL THEN
        RAISE EXCEPTION 'INVALID_SEQUENCE: You must Check In first before starting or ending a break.';
    END IF;

    v_policy := public.fn_resolve_effective_break_policy(v_org_id, v_emp_id, v_daily.shift_id, v_daily.attendance_date);

    -- Extract category config from policy
    IF v_policy.categories IS NOT NULL THEN
        SELECT elem INTO v_cat_cfg
        FROM jsonb_array_elements(v_policy.categories) elem
        WHERE UPPER(elem->>'code') = v_category
        LIMIT 1;
    END IF;

    IF v_cat_cfg IS NOT NULL THEN
        IF COALESCE((v_cat_cfg->>'enabled')::boolean, true) = false THEN
            RAISE EXCEPTION 'POLICY_MISMATCH: % break is not enabled under your assigned break policy.', v_category;
        END IF;
        v_is_paid := COALESCE((v_cat_cfg->>'is_paid')::boolean, false);
        v_max_cat_mins := COALESCE((v_cat_cfg->>'max_duration_minutes')::integer, 60);
        v_max_occurrences := COALESCE((v_cat_cfg->>'max_occurrences')::integer, 2);
        v_min_interval_mins := COALESCE((v_cat_cfg->>'min_interval_minutes')::integer, 0);
        v_requires_approval := COALESCE((v_cat_cfg->>'requires_approval')::boolean, false);
        v_exception_on_exceed := COALESCE((v_cat_cfg->>'exception_on_exceed')::boolean, true);
    ELSE
        v_is_paid := (v_category IN ('TEA', 'COFFEE', 'REST'));
        v_max_cat_mins := CASE WHEN v_category = 'LUNCH' THEN 45 ELSE 15 END;
    END IF;

    -- Check active break
    SELECT * INTO v_active_break
    FROM public.attendance_break_events
    WHERE employee_id = v_emp_id
      AND attendance_daily_id = v_daily.id
      AND status = 'ACTIVE'
    ORDER BY started_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_event_type = 'BREAK_START' THEN
        IF v_active_break.id IS NOT NULL THEN
            RAISE EXCEPTION 'OVERLAPPING_BREAK: You already have an active % break started at %. Please end it first.',
                v_active_break.break_category,
                to_char(v_active_break.started_at AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
        END IF;

        -- Validate max occurrences per session
        SELECT COUNT(*)::INTEGER, MAX(ended_at)
        INTO v_cat_count_today, v_last_ended_at
        FROM public.attendance_break_events
        WHERE attendance_daily_id = v_daily.id
          AND break_category = v_category
          AND status IN ('COMPLETED', 'CORRECTED');

        IF v_cat_count_today >= v_max_occurrences THEN
            RAISE EXCEPTION 'POLICY_MISMATCH: Maximum % break limit (% per shift) has already been reached.',
                v_category, v_max_occurrences;
        END IF;

        IF v_min_interval_mins > 0 AND v_last_ended_at IS NOT NULL THEN
            IF EXTRACT(EPOCH FROM (v_now - v_last_ended_at)) / 60 < v_min_interval_mins THEN
                RAISE EXCEPTION 'POLICY_MISMATCH: Minimum interval of % minutes required between % breaks.',
                    v_min_interval_mins, v_category;
            END IF;
        END IF;

        SELECT COALESCE(MAX(break_sequence), 0) + 1
        INTO v_next_seq
        FROM public.attendance_break_events
        WHERE attendance_daily_id = v_daily.id;

        INSERT INTO public.attendance_break_events (
            organization_id, employee_id, attendance_daily_id, attendance_date, shift_id,
            break_category, break_sequence, is_paid,
            started_at, device_started_at, status, start_source,
            policy_id, policy_version, policy_snapshot,
            requires_approval, approval_status, start_idempotency_key, notes
        ) VALUES (
            v_org_id, v_emp_id, v_daily.id, v_daily.attendance_date, v_daily.shift_id,
            v_category, v_next_seq, v_is_paid,
            v_now, p_device_timestamp, 'ACTIVE', v_source,
            v_policy.id, v_policy.version, v_cat_cfg,
            v_requires_approval, CASE WHEN v_requires_approval THEN 'PENDING' ELSE 'NOT_REQUIRED' END,
            NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''), p_notes
        )
        RETURNING id INTO v_new_event_id;

        -- Core working hours check
        v_ist_hhmm := to_char(v_now_ist, 'HH24:MI');
        IF COALESCE(v_policy.breaks_prohibited_in_core_hours, false) = true
           AND v_ist_hhmm >= v_policy.core_hours_start
           AND v_ist_hhmm <= v_policy.core_hours_end THEN
            INSERT INTO public.attendance_break_exceptions (
                organization_id, employee_id, attendance_daily_id, break_event_id, attendance_date,
                exception_type, severity, description
            ) VALUES (
                v_org_id, v_emp_id, v_daily.id, v_new_event_id, v_daily.attendance_date,
                'CORE_HOURS_VIOLATION', 'MEDIUM',
                format('%s break started at %s during core working hours (%s - %s).',
                    v_category, v_ist_hhmm, v_policy.core_hours_start, v_policy.core_hours_end)
            );
        END IF;

        v_recalc := public.fn_recalculate_daily_attendance(v_emp_id, v_daily.attendance_date);

        RETURN jsonb_build_object(
            'success', true,
            'event_type', 'BREAK_START',
            'event_id', v_new_event_id,
            'break_category', v_category,
            'is_paid', v_is_paid,
            'started_at', v_now,
            'attendance_date', v_daily.attendance_date,
            'work_state', 'ON_BREAK',
            'daily', v_recalc,
            'message', format('%s break started at %s.', INITCAP(LOWER(v_category)), to_char(v_now_ist, 'HH12:MI AM'))
        );

    ELSE
        -- BREAK_END
        IF v_active_break.id IS NULL THEN
            RAISE EXCEPTION 'INVALID_SEQUENCE: No active break found to end.';
        END IF;

        v_duration_mins := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (v_now - v_active_break.started_at)) / 60.0)::INTEGER);
        v_exceeds_limit := v_duration_mins > v_max_cat_mins;

        UPDATE public.attendance_break_events
        SET
            ended_at = v_now,
            device_ended_at = p_device_timestamp,
            duration_minutes = v_duration_mins,
            paid_minutes = CASE WHEN is_paid THEN v_duration_mins ELSE 0 END,
            unpaid_minutes = CASE WHEN is_paid THEN 0 ELSE v_duration_mins END,
            status = 'COMPLETED',
            end_source = v_source,
            end_idempotency_key = NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''),
            exceeds_limit = v_exceeds_limit,
            notes = COALESCE(p_notes, notes),
            updated_at = v_now
        WHERE id = v_active_break.id;

        IF v_exceeds_limit AND v_exception_on_exceed THEN
            INSERT INTO public.attendance_break_exceptions (
                organization_id, employee_id, attendance_daily_id, break_event_id, attendance_date,
                exception_type, severity, description
            ) VALUES (
                v_org_id, v_emp_id, v_daily.id, v_active_break.id, v_daily.attendance_date,
                'EXCEEDS_MAX_DURATION', 'MEDIUM',
                format('%s break duration (%sm) exceeded policy limit (%sm).',
                    v_active_break.break_category, v_duration_mins, v_max_cat_mins)
            );
        END IF;

        v_recalc := public.fn_recalculate_daily_attendance(v_emp_id, v_daily.attendance_date);

        RETURN jsonb_build_object(
            'success', true,
            'event_type', 'BREAK_END',
            'event_id', v_active_break.id,
            'break_category', v_active_break.break_category,
            'is_paid', v_active_break.is_paid,
            'started_at', v_active_break.started_at,
            'ended_at', v_now,
            'duration_minutes', v_duration_mins,
            'exceeds_limit', v_exceeds_limit,
            'attendance_date', v_daily.attendance_date,
            'work_state', 'WORKING',
            'daily', v_recalc,
            'message', format('Resumed work from %s break (%s min).', INITCAP(LOWER(v_active_break.break_category)), v_duration_mins)
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_break_event(text, text, text, text, timestamptz, text, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 8. UPDATE fn_record_attendance_punch WITH ACTIVE-BREAK CHECKOUT GUARD/RESOLVE
--    (Preserves exact 6-parameter signature; reads p_device_info->>'resolve_active_break')
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_record_attendance_punch(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy NUMERIC DEFAULT 20.0,
  p_punch_type TEXT DEFAULT 'IN',
  p_reason TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_user_profile_id UUID;
  v_emp_id UUID;
  v_org_id UUID;
  v_company_id UUID;
  v_emp_name TEXT;
  v_normalized_type TEXT;

  v_now TIMESTAMPTZ := NOW();
  v_now_ist TIMESTAMP := NOW() AT TIME ZONE 'Asia/Kolkata';
  v_today DATE := v_now_ist::DATE;
  v_yesterday DATE := (v_now_ist - INTERVAL '1 day')::DATE;
  v_ist_hour NUMERIC := EXTRACT(HOUR FROM v_now_ist) + (EXTRACT(MINUTE FROM v_now_ist) / 60.0);
  v_target_date DATE := v_today;

  v_shift RECORD;
  v_shift_id UUID := NULL;
  v_shift_full_day_mins INTEGER := 480;

  v_loc RECORD;
  v_dist NUMERIC;
  v_effective_radius NUMERIC;
  v_matched_loc_id UUID := NULL;
  v_matched_loc_name TEXT := NULL;
  v_matched_dist NUMERIC := NULL;
  v_is_inside BOOLEAN := false;
  v_nearest_loc_name TEXT := NULL;
  v_nearest_dist NUMERIC := 999999999;

  v_daily RECORD;
  v_daily_yesterday RECORD;
  v_active_break RECORD;
  v_resolve_break BOOLEAN := COALESCE((p_device_info->>'resolve_active_break')::boolean, false);
  v_break_dur INTEGER := 0;

  v_first_in TIMESTAMPTZ;
  v_last_out TIMESTAMPTZ;
  v_gross_minutes INTEGER := 0;
  v_net_minutes INTEGER := 0;
  v_overtime_minutes INTEGER := 0;
  v_overtime_eligible BOOLEAN := true;
  v_unauthorized_checkout BOOLEAN := false;
  v_saved_punch_id UUID;
  v_saved_daily_id UUID;
  v_recalc JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated.';
  END IF;

  SELECT up.id, e.id, e.organization_id, e.company_id, e.display_name
  INTO v_user_profile_id, v_emp_id, v_org_id, v_company_id, v_emp_name
  FROM public.user_profiles up
  JOIN public.employees e ON (
    e.id = up.employee_id
    OR e.user_id = up.id
    OR e.user_id = up.auth_user_id
    OR lower(e.work_email) = lower(up.email)
  )
  WHERE up.auth_user_id = v_user_id
  LIMIT 1;

  IF v_emp_id IS NULL THEN
    RAISE EXCEPTION 'Employee profile not linked to current authenticated identity.';
  END IF;

  v_normalized_type := UPPER(TRIM(p_punch_type));
  IF v_normalized_type NOT IN ('IN', 'CHECK_IN', 'OUT', 'CHECK_OUT') THEN
    RAISE EXCEPTION 'Invalid punch type. Allowed types: IN, OUT, CHECK_IN, CHECK_OUT.';
  END IF;

  SELECT s.* INTO v_shift
  FROM public.employee_shift_assignments esa
  JOIN public.shifts s ON s.id = esa.shift_id
  WHERE esa.employee_id = v_emp_id
    AND esa.valid_from <= v_today
    AND (esa.valid_to IS NULL OR esa.valid_to >= v_today)
  ORDER BY esa.valid_from DESC
  LIMIT 1;

  IF v_shift.id IS NOT NULL THEN
    v_shift_id := v_shift.id;
  ELSE
    IF v_ist_hour >= 18.0 THEN
      SELECT * INTO v_shift FROM public.shifts WHERE organization_id = v_org_id AND is_overnight = true AND is_active = true LIMIT 1;
    END IF;
    IF v_shift.id IS NULL THEN
      SELECT * INTO v_shift FROM public.shifts WHERE organization_id = v_org_id AND is_active = true ORDER BY created_at ASC LIMIT 1;
    END IF;
    v_shift_id := v_shift.id;
  END IF;

  v_shift_full_day_mins := COALESCE((v_shift.min_full_day_hours * 60)::INTEGER, 480);

  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    FOR v_loc IN (
      SELECT l.id, l.name, l.latitude, l.longitude, l.geofence_radius_meters
      FROM public.fn_get_my_assigned_work_locations() l
      WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL
    ) LOOP
      v_dist := public.fn_calculate_haversine_distance(p_latitude, p_longitude, v_loc.latitude, v_loc.longitude);
      v_effective_radius := v_loc.geofence_radius_meters;
      IF v_dist < v_nearest_dist THEN
        v_nearest_dist := v_dist;
        v_nearest_loc_name := v_loc.name;
      END IF;
      IF v_dist <= v_effective_radius THEN
        v_is_inside := true;
        v_matched_loc_id := v_loc.id;
        v_matched_loc_name := v_loc.name;
        v_matched_dist := v_dist;
        EXIT;
      END IF;
    END LOOP;
  ELSE
    v_is_inside := true;
  END IF;

  IF v_normalized_type IN ('IN', 'CHECK_IN') THEN
    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND NOT v_is_inside THEN
      IF v_nearest_loc_name IS NOT NULL THEN
        RAISE EXCEPTION 'Check-in blocked: You are outside your assigned work locations. Nearest location: % (% m away).',
          v_nearest_loc_name, ROUND(v_nearest_dist);
      ELSE
        RAISE EXCEPTION 'Check-in blocked: No active assigned work locations with valid GPS coordinates found for your profile.';
      END IF;
    END IF;

    SELECT * INTO v_daily FROM public.attendance_daily WHERE employee_id = v_emp_id AND attendance_date = v_today;
    IF v_daily.first_check_in IS NOT NULL AND v_daily.last_check_out IS NULL THEN
      RAISE EXCEPTION 'You are already checked in for today (% at %).',
        v_today, to_char(v_daily.first_check_in AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
    END IF;

    IF v_ist_hour < 12.0 THEN
      SELECT * INTO v_daily_yesterday FROM public.attendance_daily WHERE employee_id = v_emp_id AND attendance_date = v_yesterday;
      IF v_daily_yesterday.first_check_in IS NOT NULL AND v_daily_yesterday.last_check_out IS NULL THEN
        RAISE EXCEPTION 'You have an active night shift from yesterday (started at %). Please check out first.',
          to_char(v_daily_yesterday.first_check_in AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
      END IF;
    END IF;

    INSERT INTO public.attendance_punches (
      organization_id, employee_id, punch_time, punch_type, verification_mode,
      latitude, longitude, accuracy_meters, work_location_id, distance_meters,
      location_authorized, unauthorized_checkout, unauthorized_checkout_reason,
      punch_source, attendance_date, is_processed
    ) VALUES (
      v_org_id, v_emp_id, v_now, 'IN', 'GPS',
      p_latitude, p_longitude, COALESCE(p_accuracy, 20.0), v_matched_loc_id, v_matched_dist,
      v_is_inside, false, NULL, 'MOBILE_GPS', v_today, true
    ) RETURNING id INTO v_saved_punch_id;

    INSERT INTO public.attendance_daily (
      organization_id, employee_id, shift_id, attendance_date,
      first_check_in, last_check_out, status, payable_status,
      total_work_minutes, break_minutes, overtime_minutes, overtime_eligible,
      unauthorized_checkout, check_in_work_location_id, check_in_location_name,
      current_work_state, is_regularized, created_at, updated_at
    ) VALUES (
      v_org_id, v_emp_id, v_shift_id, v_today,
      v_now, NULL, 'PRESENT'::public.attendance_status_enum, 1.0,
      0, 0, 0, true, false, v_matched_loc_id, COALESCE(v_matched_loc_name, 'Mobile GPS Location'),
      'WORKING', false, v_now, v_now
    )
    ON CONFLICT (employee_id, attendance_date)
    DO UPDATE SET
      shift_id = COALESCE(public.attendance_daily.shift_id, EXCLUDED.shift_id),
      first_check_in = COALESCE(public.attendance_daily.first_check_in, EXCLUDED.first_check_in),
      status = 'PRESENT'::public.attendance_status_enum,
      current_work_state = 'WORKING',
      check_in_work_location_id = COALESCE(public.attendance_daily.check_in_work_location_id, EXCLUDED.check_in_work_location_id),
      check_in_location_name = COALESCE(public.attendance_daily.check_in_location_name, EXCLUDED.check_in_location_name),
      updated_at = v_now
    RETURNING id INTO v_saved_daily_id;

    PERFORM public.fn_recalculate_daily_attendance(v_emp_id, v_today);

    RETURN jsonb_build_object(
      'success', true,
      'punch_id', v_saved_punch_id,
      'daily_id', v_saved_daily_id,
      'punch_type', 'IN',
      'attendance_date', v_today,
      'location_authorized', v_is_inside,
      'location_name', v_matched_loc_name,
      'check_in_time', v_now,
      'message', format('Checked in successfully at %s.', to_char(v_now_ist, 'HH12:MI AM'))
    );

  ELSE
    SELECT * INTO v_daily
    FROM public.attendance_daily
    WHERE employee_id = v_emp_id AND attendance_date = v_today AND first_check_in IS NOT NULL AND last_check_out IS NULL
    FOR UPDATE;

    IF v_daily.id IS NULL AND v_ist_hour < 14.0 THEN
      SELECT * INTO v_daily
      FROM public.attendance_daily
      WHERE employee_id = v_emp_id AND attendance_date = v_yesterday AND first_check_in IS NOT NULL AND last_check_out IS NULL
      FOR UPDATE;
      IF v_daily.id IS NOT NULL THEN
        v_target_date := v_yesterday;
      ELSE
        v_target_date := v_today;
      END IF;
    ELSE
      v_target_date := v_today;
    END IF;

    IF v_daily.id IS NULL THEN
      RAISE EXCEPTION 'No active check-in found for today or yesterday night shift. Please check in first.';
    END IF;

    -- Active Break Guard!
    SELECT * INTO v_active_break
    FROM public.attendance_break_events
    WHERE attendance_daily_id = v_daily.id
      AND status = 'ACTIVE'
    ORDER BY started_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_active_break.id IS NOT NULL THEN
      IF NOT v_resolve_break THEN
        RAISE EXCEPTION 'ACTIVE_BREAK_EXISTS: You are currently on a % break. Please end your break before checking out.',
          v_active_break.break_category;
      END IF;

      -- Atomically close the active break at checkout timestamp
      v_break_dur := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (v_now - v_active_break.started_at)) / 60.0)::INTEGER);
      UPDATE public.attendance_break_events
      SET
        ended_at = v_now,
        duration_minutes = v_break_dur,
        paid_minutes = CASE WHEN is_paid THEN v_break_dur ELSE 0 END,
        unpaid_minutes = CASE WHEN is_paid THEN 0 ELSE v_break_dur END,
        status = 'COMPLETED',
        end_source = 'mobile',
        notes = COALESCE(notes || ' | Auto-ended on check-out', 'Auto-ended on check-out'),
        updated_at = v_now
      WHERE id = v_active_break.id;
    END IF;

    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND NOT v_is_inside THEN
      v_unauthorized_checkout := true;
      v_overtime_eligible := false;
      IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
        RAISE EXCEPTION 'Check-out reason is required when checking out outside your assigned work locations.';
      END IF;
    ELSE
      v_unauthorized_checkout := false;
      v_overtime_eligible := true;
    END IF;

    INSERT INTO public.attendance_punches (
      organization_id, employee_id, punch_time, punch_type, verification_mode,
      latitude, longitude, accuracy_meters, work_location_id, distance_meters,
      location_authorized, unauthorized_checkout, unauthorized_checkout_reason,
      punch_source, attendance_date, is_processed
    ) VALUES (
      v_org_id, v_emp_id, v_now, 'OUT', 'GPS',
      p_latitude, p_longitude, COALESCE(p_accuracy, 20.0), v_matched_loc_id,
      CASE WHEN v_is_inside THEN v_matched_dist ELSE v_nearest_dist END,
      v_is_inside, v_unauthorized_checkout,
      CASE WHEN v_unauthorized_checkout THEN TRIM(p_reason) ELSE NULL END,
      'MOBILE_GPS', v_target_date, true
    ) RETURNING id INTO v_saved_punch_id;

    UPDATE public.attendance_daily
    SET
      last_check_out = v_now,
      overtime_eligible = v_overtime_eligible,
      unauthorized_checkout = v_unauthorized_checkout,
      unauthorized_checkout_reason = CASE WHEN v_unauthorized_checkout THEN TRIM(p_reason) ELSE NULL END,
      check_out_work_location_id = v_matched_loc_id,
      check_out_location_name = CASE WHEN v_is_inside THEN COALESCE(v_matched_loc_name, 'Mobile GPS Location') ELSE 'Off-Site / External Location' END,
      current_work_state = 'CHECKED_OUT',
      updated_at = v_now
    WHERE id = v_daily.id
    RETURNING id INTO v_saved_daily_id;

    v_recalc := public.fn_recalculate_daily_attendance(v_emp_id, v_target_date);
    v_net_minutes := COALESCE((v_recalc->>'net_payable_minutes')::INTEGER, 0);
    v_overtime_minutes := COALESCE((v_recalc->>'overtime_minutes')::INTEGER, 0);

    RETURN jsonb_build_object(
      'success', true,
      'punch_id', v_saved_punch_id,
      'daily_id', v_saved_daily_id,
      'punch_type', 'OUT',
      'attendance_date', v_target_date,
      'is_night_shift', (v_target_date = v_yesterday),
      'check_out_time', v_now,
      'resolved_active_break', (v_active_break.id IS NOT NULL),
      'total_work_minutes', v_net_minutes,
      'hours_worked', v_net_minutes / 60,
      'minutes_worked', v_net_minutes % 60,
      'overtime_minutes', v_overtime_minutes,
      'message', format('Checked out successfully. Net payable duration: %s hrs %s mins.', v_net_minutes / 60, v_net_minutes % 60)
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_attendance_punch(numeric, numeric, numeric, text, text, jsonb) TO authenticated, service_role, anon;

-- ----------------------------------------------------------------------------
-- 9. HR CORRECTION, MISSED BREAK & APPROVAL RPC (Immutable Audit Trail)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_hr_correct_break_event(
    p_organization_id UUID,
    p_employee_id UUID,
    p_attendance_date DATE,
    p_action_type TEXT, -- 'CORRECTION' | 'MISSED_BREAK_ADD' | 'RESOLVE_ACTIVE' | 'APPROVE_EXCEPTION' | 'REJECT_EXCEPTION'
    p_break_category TEXT DEFAULT 'LUNCH',
    p_break_event_id UUID DEFAULT NULL,
    p_exception_id UUID DEFAULT NULL,
    p_new_started_at TIMESTAMPTZ DEFAULT NULL,
    p_new_ended_at TIMESTAMPTZ DEFAULT NULL,
    p_reason TEXT DEFAULT '',
    p_actor_id UUID DEFAULT NULL,
    p_actor_name TEXT DEFAULT 'HR Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_daily RECORD;
    v_orig RECORD;
    v_dur INTEGER := 0;
    v_is_paid BOOLEAN := false;
    v_corr_id UUID;
    v_event_id UUID := p_break_event_id;
    v_recalc JSONB;
    v_act TEXT := UPPER(TRIM(COALESCE(p_action_type, 'CORRECTION')));
BEGIN
    IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
        RAISE EXCEPTION 'Mandatory reason (minimum 3 characters) is required for every break correction or decision.';
    END IF;

    SELECT * INTO v_daily
    FROM public.attendance_daily
    WHERE employee_id = p_employee_id AND attendance_date = p_attendance_date
    FOR UPDATE;

    IF v_daily.id IS NULL THEN
        RAISE EXCEPTION 'Attendance session not found for employee on %.', p_attendance_date;
    END IF;

    IF v_act IN ('APPROVE_EXCEPTION', 'REJECT_EXCEPTION') AND p_exception_id IS NOT NULL THEN
        UPDATE public.attendance_break_exceptions
        SET
            resolution_status = CASE WHEN v_act = 'APPROVE_EXCEPTION' THEN 'APPROVED' ELSE 'REJECTED' END,
            reviewer_id = COALESCE(p_actor_id, auth.uid()),
            resolution_notes = TRIM(p_reason),
            resolved_at = now(),
            history = history || jsonb_build_array(jsonb_build_object(
                'action', v_act,
                'by', COALESCE(p_actor_name, 'HR Admin'),
                'reason', TRIM(p_reason),
                'at', now()
            )),
            updated_at = now()
        WHERE id = p_exception_id AND organization_id = p_organization_id;

        INSERT INTO public.attendance_break_corrections (
            organization_id, employee_id, attendance_daily_id, break_event_id, attendance_date,
            action_type, break_category, reason, changed_by, changed_by_name, approval_status, approver_id, approved_at
        ) VALUES (
            p_organization_id, p_employee_id, v_daily.id, p_break_event_id, p_attendance_date,
            CASE WHEN v_act = 'APPROVE_EXCEPTION' THEN 'APPROVAL' ELSE 'REJECTION' END,
            UPPER(p_break_category), TRIM(p_reason), COALESCE(p_actor_id, auth.uid()), p_actor_name,
            CASE WHEN v_act = 'APPROVE_EXCEPTION' THEN 'APPROVED' ELSE 'REJECTED' END,
            COALESCE(p_actor_id, auth.uid()), now()
        ) RETURNING id INTO v_corr_id;

        v_recalc := public.fn_recalculate_daily_attendance(p_employee_id, p_attendance_date);
        RETURN jsonb_build_object('success', true, 'correction_id', v_corr_id, 'daily', v_recalc);
    END IF;

    IF v_act = 'MISSED_BREAK_ADD' THEN
        IF p_new_started_at IS NULL OR p_new_ended_at IS NULL OR p_new_ended_at <= p_new_started_at THEN
            RAISE EXCEPTION 'Valid start and end timestamps are required for adding a missed break.';
        END IF;

        v_dur := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (p_new_ended_at - p_new_started_at)) / 60.0)::INTEGER);
        v_is_paid := UPPER(p_break_category) IN ('TEA', 'COFFEE', 'REST');

        INSERT INTO public.attendance_break_events (
            organization_id, employee_id, attendance_daily_id, attendance_date, shift_id,
            break_category, break_sequence, is_paid,
            started_at, ended_at, duration_minutes,
            paid_minutes, unpaid_minutes,
            status, start_source, end_source, approval_status, approved_by, approved_at, notes
        ) VALUES (
            p_organization_id, p_employee_id, v_daily.id, p_attendance_date, v_daily.shift_id,
            UPPER(p_break_category),
            COALESCE((SELECT MAX(break_sequence) + 1 FROM public.attendance_break_events WHERE attendance_daily_id = v_daily.id), 1),
            v_is_paid, p_new_started_at, p_new_ended_at, v_dur,
            CASE WHEN v_is_paid THEN v_dur ELSE 0 END,
            CASE WHEN v_is_paid THEN 0 ELSE v_dur END,
            'CORRECTED', 'admin_correction', 'admin_correction', 'APPROVED', COALESCE(p_actor_id, auth.uid()), now(), TRIM(p_reason)
        ) RETURNING id INTO v_event_id;

        INSERT INTO public.attendance_break_corrections (
            organization_id, employee_id, attendance_daily_id, break_event_id, attendance_date,
            action_type, break_category, new_started_at, new_ended_at,
            reason, changed_by, changed_by_name, approval_status, approver_id, approved_at
        ) VALUES (
            p_organization_id, p_employee_id, v_daily.id, v_event_id, p_attendance_date,
            'MISSED_BREAK_ADD', UPPER(p_break_category), p_new_started_at, p_new_ended_at,
            TRIM(p_reason), COALESCE(p_actor_id, auth.uid()), p_actor_name, 'APPROVED', COALESCE(p_actor_id, auth.uid()), now()
        ) RETURNING id INTO v_corr_id;

    ELSE
        -- CORRECTION or RESOLVE_ACTIVE on existing break event
        SELECT * INTO v_orig FROM public.attendance_break_events WHERE id = p_break_event_id FOR UPDATE;
        IF v_orig.id IS NULL THEN
            RAISE EXCEPTION 'Break event not found.';
        END IF;

        IF COALESCE(p_new_ended_at, v_orig.ended_at) IS NULL THEN
            RAISE EXCEPTION 'End timestamp is required to resolve or correct this break.';
        END IF;

        v_dur := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (COALESCE(p_new_ended_at, v_orig.ended_at) - COALESCE(p_new_started_at, v_orig.started_at))) / 60.0)::INTEGER);

        INSERT INTO public.attendance_break_corrections (
            organization_id, employee_id, attendance_daily_id, break_event_id, attendance_date,
            action_type, break_category,
            original_started_at, original_ended_at,
            new_started_at, new_ended_at,
            reason, changed_by, changed_by_name, approval_status, approver_id, approved_at
        ) VALUES (
            p_organization_id, p_employee_id, v_daily.id, v_orig.id, p_attendance_date,
            v_act, v_orig.break_category,
            v_orig.started_at, v_orig.ended_at,
            COALESCE(p_new_started_at, v_orig.started_at), COALESCE(p_new_ended_at, v_orig.ended_at),
            TRIM(p_reason), COALESCE(p_actor_id, auth.uid()), p_actor_name, 'APPROVED', COALESCE(p_actor_id, auth.uid()), now()
        ) RETURNING id INTO v_corr_id;

        UPDATE public.attendance_break_events
        SET
            started_at = COALESCE(p_new_started_at, started_at),
            ended_at = COALESCE(p_new_ended_at, ended_at),
            duration_minutes = v_dur,
            paid_minutes = CASE WHEN is_paid THEN v_dur ELSE 0 END,
            unpaid_minutes = CASE WHEN is_paid THEN 0 ELSE v_dur END,
            status = 'CORRECTED',
            end_source = 'admin_correction',
            correction_reference_id = v_corr_id,
            approval_status = 'APPROVED',
            approved_by = COALESCE(p_actor_id, auth.uid()),
            approved_at = now(),
            notes = TRIM(p_reason),
            updated_at = now()
        WHERE id = v_orig.id;
    END IF;

    -- Resolve any open missing/active break exceptions for this event
    UPDATE public.attendance_break_exceptions
    SET resolution_status = 'RESOLVED',
        reviewer_id = COALESCE(p_actor_id, auth.uid()),
        resolution_notes = TRIM(p_reason),
        resolved_at = now(),
        updated_at = now()
    WHERE break_event_id = v_event_id
      AND resolution_status IN ('OPEN', 'IN_REVIEW');

    v_recalc := public.fn_recalculate_daily_attendance(p_employee_id, p_attendance_date);

    RETURN jsonb_build_object(
        'success', true,
        'correction_id', v_corr_id,
        'event_id', v_event_id,
        'daily', v_recalc
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_hr_correct_break_event(uuid, uuid, date, text, text, uuid, uuid, timestamptz, timestamptz, text, uuid, text) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 10. STRICT TENANT-ISOLATED RLS POLICIES + REALTIME PUBLICATION
-- ----------------------------------------------------------------------------
ALTER TABLE public.break_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.break_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_break_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_break_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_break_corrections ENABLE ROW LEVEL SECURITY;

-- Helper expression: user belongs to row's organization_id
DROP POLICY IF EXISTS "break_policies_tenant_select" ON public.break_policies;
CREATE POLICY "break_policies_tenant_select" ON public.break_policies
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = break_policies.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
        )
    );

DROP POLICY IF EXISTS "break_policies_hr_manage" ON public.break_policies;
CREATE POLICY "break_policies_hr_manage" ON public.break_policies
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = break_policies.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
              AND up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'ADMIN', 'ORG_ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = break_policies.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
              AND up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'ADMIN', 'ORG_ADMIN')
        )
    );

DROP POLICY IF EXISTS "break_policy_versions_tenant_select" ON public.break_policy_versions;
CREATE POLICY "break_policy_versions_tenant_select" ON public.break_policy_versions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = break_policy_versions.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
        )
    );

DROP POLICY IF EXISTS "break_policy_versions_hr_insert" ON public.break_policy_versions;
CREATE POLICY "break_policy_versions_hr_insert" ON public.break_policy_versions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = break_policy_versions.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
              AND up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'ADMIN', 'ORG_ADMIN')
        )
    );

-- attendance_break_events: own employee OR HR/Manager in same organization
DROP POLICY IF EXISTS "break_events_tenant_select" ON public.attendance_break_events;
CREATE POLICY "break_events_tenant_select" ON public.attendance_break_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = attendance_break_events.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
              AND (
                  up.employee_id = attendance_break_events.employee_id
                  OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'ADMIN', 'ORG_ADMIN', 'MANAGER', 'PAYROLL_ADMIN')
              )
        )
    );

DROP POLICY IF EXISTS "break_events_own_or_hr_write" ON public.attendance_break_events;
CREATE POLICY "break_events_own_or_hr_write" ON public.attendance_break_events
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = attendance_break_events.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
              AND (
                  up.employee_id = attendance_break_events.employee_id
                  OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'ADMIN', 'ORG_ADMIN')
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = attendance_break_events.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
              AND (
                  up.employee_id = attendance_break_events.employee_id
                  OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'ADMIN', 'ORG_ADMIN')
              )
        )
    );

-- attendance_break_exceptions: own employee OR HR/Manager in same organization
DROP POLICY IF EXISTS "break_exceptions_tenant_select" ON public.attendance_break_exceptions;
CREATE POLICY "break_exceptions_tenant_select" ON public.attendance_break_exceptions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = attendance_break_exceptions.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
              AND (
                  up.employee_id = attendance_break_exceptions.employee_id
                  OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'ADMIN', 'ORG_ADMIN', 'MANAGER')
              )
        )
    );

DROP POLICY IF EXISTS "break_exceptions_hr_manage" ON public.attendance_break_exceptions;
CREATE POLICY "break_exceptions_hr_manage" ON public.attendance_break_exceptions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = attendance_break_exceptions.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
              AND up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'ADMIN', 'ORG_ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = attendance_break_exceptions.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
              AND up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'ADMIN', 'ORG_ADMIN')
        )
    );

-- attendance_break_corrections: HR/Admin/Payroll read & insert in same org
DROP POLICY IF EXISTS "break_corrections_tenant_select" ON public.attendance_break_corrections;
CREATE POLICY "break_corrections_tenant_select" ON public.attendance_break_corrections
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = attendance_break_corrections.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
        )
    );

DROP POLICY IF EXISTS "break_corrections_hr_insert" ON public.attendance_break_corrections;
CREATE POLICY "break_corrections_hr_insert" ON public.attendance_break_corrections
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
              AND (up.organization_id = attendance_break_corrections.organization_id OR up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN'))
              AND up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'ADMIN', 'ORG_ADMIN')
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.break_policies TO authenticated, service_role;
GRANT SELECT, INSERT ON public.break_policy_versions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_break_events TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_break_exceptions TO authenticated, service_role;
GRANT SELECT, INSERT ON public.attendance_break_corrections TO authenticated, service_role;

-- Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_break_events') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_break_events;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_break_exceptions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_break_exceptions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'break_policies') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.break_policies;
    END IF;
END $$;
