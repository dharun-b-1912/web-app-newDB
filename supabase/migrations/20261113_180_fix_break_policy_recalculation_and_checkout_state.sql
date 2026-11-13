-- ============================================================================
-- Migration 180: Fix Break Policy Field Reference & Checkout State In fn_recalculate_daily_attendance
-- ============================================================================
-- 1. Fixes bug in fn_recalculate_daily_attendance:
--    - Replaces non-existent `v_policy.deduction_mode` with canonical `v_policy.mandatory_breaks`
--    - Replaces non-existent `v_policy.auto_deduct_minutes` with canonical `v_policy.automatic_break_minutes`
--    - Replaces non-existent `v_policy.auto_deduct_threshold_minutes` with canonical `v_policy.automatic_break_after_hours * 60`
-- 2. Ensures `current_work_state` is always 'CHECKED_OUT' when `v_last_out IS NOT NULL AND v_last_out >= v_first_in`
-- 3. Restores ability to insert punches into `attendance_punches` without 42703 error
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_recalculate_daily_attendance(
    p_employee_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_org_id UUID;
    v_shift_id UUID;
    v_shift RECORD;
    v_policy public.break_policies;
    v_first_in TIMESTAMPTZ;
    v_last_out TIMESTAMPTZ;
    v_punch_count INTEGER;
    v_actual_break_mins INTEGER := 0;
    v_raw_paid_break_mins INTEGER := 0;
    v_raw_unpaid_break_mins INTEGER := 0;
    v_paid_break_mins INTEGER := 0;
    v_unpaid_break_mins INTEGER := 0;
    v_completed_break_count INTEGER := 0;
    v_paid_allowance_mins INTEGER := 15;
    v_active_break RECORD;
    v_has_exception BOOLEAN := false;
    v_gross_presence_mins INTEGER := 0;
    v_auto_deducted_mins INTEGER := 0;
    v_total_work_mins INTEGER := 0;
    v_work_state TEXT := 'NOT_CHECKED_IN';
    v_status public.attendance_status_enum;
    v_payable_status NUMERIC(3,2) := 0.00;
    v_scheduled_duration_mins INTEGER := 480;
    v_min_half_day_mins INTEGER := 240;
    v_min_full_day_mins INTEGER := 480;
    v_is_overnight BOOLEAN := false;
    v_expected_in TIMESTAMPTZ;
    v_expected_out TIMESTAMPTZ;
    v_late_mins INTEGER := 0;
    v_early_mins INTEGER := 0;
    v_overtime_mins INTEGER := 0;
    v_overtime_eligible BOOLEAN := true;
    v_existing_daily RECORD;
    v_earliest_punch_time TIME;
BEGIN
    -- Check employee
    SELECT organization_id INTO v_org_id
    FROM public.employees
    WHERE id = p_employee_id;

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

    -- Also check existing daily record in case a direct checkout was saved on attendance_daily
    IF v_last_out IS NULL AND v_existing_daily.last_check_out IS NOT NULL THEN
        v_last_out := v_existing_daily.last_check_out;
    END IF;
    IF v_first_in IS NULL AND v_existing_daily.first_check_in IS NOT NULL THEN
        v_first_in := v_existing_daily.first_check_in;
    END IF;

    IF (v_punch_count IS NULL OR v_punch_count = 0) AND v_first_in IS NULL THEN
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
            has_break_exception = false,
            overtime_minutes = 0,
            late_entry_minutes = 0,
            early_exit_minutes = 0,
            status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.status ELSE 'ABSENT'::public.attendance_status_enum END,
            payable_status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.payable_status ELSE 0.00 END,
            updated_at = now();

        RETURN jsonb_build_object(
            'success', true,
            'status', 'ABSENT',
            'work_minutes', 0,
            'net_payable_minutes', 0
        );
    END IF;

    -- 4. Aggregate Break Events for this attendance_date
    SELECT
        COALESCE(SUM(COALESCE(duration_minutes, GREATEST(0, ROUND(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60.0)::INTEGER))), 0)::INTEGER,
        COALESCE(SUM(CASE WHEN is_paid THEN COALESCE(duration_minutes, GREATEST(0, ROUND(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60.0)::INTEGER)) ELSE 0 END), 0)::INTEGER,
        COALESCE(SUM(CASE WHEN NOT is_paid THEN COALESCE(duration_minutes, GREATEST(0, ROUND(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60.0)::INTEGER)) ELSE 0 END), 0)::INTEGER,
        COUNT(*)::INTEGER
    INTO
        v_actual_break_mins,
        v_raw_paid_break_mins,
        v_raw_unpaid_break_mins,
        v_completed_break_count
    FROM public.attendance_break_events
    WHERE employee_id = p_employee_id
      AND attendance_date = p_date
      AND status IN ('COMPLETED', 'AUTO_CLOSED', 'CORRECTED')
      AND (NOT requires_approval OR approval_status = 'APPROVED');

    -- Apply paid break allowance cap
    IF v_raw_paid_break_mins <= v_paid_allowance_mins THEN
        v_paid_break_mins := v_raw_paid_break_mins;
        v_unpaid_break_mins := v_raw_unpaid_break_mins;
    ELSE
        v_paid_break_mins := v_paid_allowance_mins;
        v_unpaid_break_mins := v_raw_unpaid_break_mins + (v_raw_paid_break_mins - v_paid_allowance_mins);
    END IF;

    -- Update individual break events with paid/unpaid split for audit clarity
    UPDATE public.attendance_break_events
    SET
        paid_minutes = CASE WHEN is_paid THEN LEAST(COALESCE(duration_minutes, 0), v_paid_allowance_mins) ELSE 0 END,
        unpaid_minutes = CASE
            WHEN NOT is_paid THEN COALESCE(duration_minutes, 0)
            ELSE GREATEST(0, COALESCE(duration_minutes, 0) - v_paid_allowance_mins)
        END
    WHERE employee_id = p_employee_id
      AND attendance_date = p_date
      AND status IN ('COMPLETED', 'AUTO_CLOSED', 'CORRECTED');

    -- Check for currently active break
    SELECT * INTO v_active_break
    FROM public.attendance_break_events
    WHERE employee_id = p_employee_id
      AND attendance_date = p_date
      AND status = 'ACTIVE'
    ORDER BY started_at DESC
    LIMIT 1;

    SELECT EXISTS (
        SELECT 1 FROM public.attendance_break_exceptions
        WHERE employee_id = p_employee_id
          AND attendance_date = p_date
          AND resolution_status IN ('OPEN', 'IN_REVIEW')
    ) INTO v_has_exception;

    -- 5. Compute Gross Presence, Auto-Deduction & Net Payable Work Minutes
    IF v_last_out IS NOT NULL AND v_last_out >= v_first_in THEN
        v_gross_presence_mins := GREATEST(0, (EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 60)::INTEGER);

        -- Canonical auto-deduction: applies only if mandatory_breaks is enabled and no actual break events were logged
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

    -- 7. Overtime calculation
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

    -- 9. Upsert authoritative daily record (using LEAST for first_check_in so earliest punch always wins)
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
        v_total_work_mins, (v_paid_break_mins + v_unpaid_break_mins + v_auto_deducted_mins),
        v_gross_presence_mins, v_paid_break_mins, v_unpaid_break_mins,
        v_auto_deducted_mins, v_total_work_mins,
        v_work_state, v_active_break.id, v_active_break.break_category, v_active_break.started_at,
        v_policy.id, v_policy.version, v_has_exception,
        v_overtime_mins, v_late_mins, v_early_mins,
        v_status, v_payable_status, false, now()
    )
    ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
        shift_id = COALESCE(EXCLUDED.shift_id, public.attendance_daily.shift_id),
        first_check_in = CASE
            WHEN public.attendance_daily.first_check_in IS NOT NULL AND EXCLUDED.first_check_in IS NOT NULL
                THEN LEAST(public.attendance_daily.first_check_in, EXCLUDED.first_check_in)
            ELSE COALESCE(public.attendance_daily.first_check_in, EXCLUDED.first_check_in)
        END,
        last_check_out = CASE
            WHEN public.attendance_daily.last_check_out IS NOT NULL AND EXCLUDED.last_check_out IS NOT NULL
                THEN GREATEST(public.attendance_daily.last_check_out, EXCLUDED.last_check_out)
            ELSE COALESCE(EXCLUDED.last_check_out, public.attendance_daily.last_check_out)
        END,
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
        overtime_minutes = EXCLUDED.overtime_minutes,
        late_entry_minutes = EXCLUDED.late_entry_minutes,
        early_exit_minutes = EXCLUDED.early_exit_minutes,
        status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.status ELSE EXCLUDED.status END,
        payable_status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.payable_status ELSE EXCLUDED.payable_status END,
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'status', v_status,
        'current_work_state', v_work_state,
        'first_check_in', v_first_in,
        'last_check_out', v_last_out,
        'work_minutes', v_total_work_mins,
        'break_minutes', (v_paid_break_mins + v_unpaid_break_mins + v_auto_deducted_mins),
        'net_payable_minutes', v_total_work_mins,
        'overtime_minutes', v_overtime_mins
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_recalculate_daily_attendance(uuid, date) TO authenticated, service_role, anon;
