-- ============================================================================
-- Migration 179: Fix Morning Mobile Check-In After Previous Day Missed Check-Out
-- ============================================================================
-- Root Cause Fixed:
-- 1. In `fn_record_attendance_punch`, checking in before 12:00 PM IST threw
--    "You have an active night shift from yesterday" whenever `v_daily_yesterday`
--    had `last_check_out IS NULL` — even if yesterday was a normal morning day
--    shift where the employee simply forgot to check out!
-- 2. When that exception was thrown, the mobile fallback path accidentally
--    resolved `fallbackSessionDate` to yesterday (`2026-11-12`) instead of
--    today (`2026-11-13`), causing morning mobile check-ins (e.g. Vaishnavi R
--    JCS-027 and Saravanakumar B JCS-015) to be stored under yesterday's date.
-- 3. In `fn_recalculate_daily_attendance`, `first_check_in` now uses `LEAST(...)`
--    so the earliest check-in punch of the day (Mobile GPS or Biometric) is
--    always preserved.
-- ============================================================================

-- 1. Update fn_recalculate_daily_attendance to always preserve earliest first_check_in
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
    IF v_last_out IS NOT NULL AND v_last_out > v_first_in THEN
        v_gross_presence_mins := GREATEST(0, (EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 60)::INTEGER);

        IF COALESCE(v_policy.deduction_mode, 'HYBRID') = 'AUTO_FIXED' THEN
            IF v_gross_presence_mins >= COALESCE(v_policy.auto_deduct_threshold_minutes, 300) THEN
                v_auto_deducted_mins := GREATEST(0, COALESCE(v_policy.auto_deduct_minutes, 30) - v_unpaid_break_mins);
            END IF;
        ELSIF COALESCE(v_policy.deduction_mode, 'HYBRID') = 'HYBRID' THEN
            IF v_completed_break_count = 0 AND v_gross_presence_mins >= COALESCE(v_policy.auto_deduct_threshold_minutes, 300) THEN
                v_auto_deducted_mins := COALESCE(v_policy.auto_deduct_minutes, 30);
            END IF;
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
        first_check_in = LEAST(public.attendance_daily.first_check_in, EXCLUDED.first_check_in),
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

-- 2. Update fn_record_attendance_punch so yesterday's missed day-shift checkout NEVER blocks today's morning check-in
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
        -- Only block if yesterday's session was actually an overnight shift started >= 17:00 IST and < 16 hours ago
        IF EXTRACT(HOUR FROM (v_daily_yesterday.first_check_in AT TIME ZONE 'Asia/Kolkata')) >= 17
           AND EXTRACT(EPOCH FROM (v_now - v_daily_yesterday.first_check_in)) < (16 * 3600) THEN
          RAISE EXCEPTION 'You have an active night shift from yesterday (started at %). Please check out first.',
            to_char(v_daily_yesterday.first_check_in AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
        ELSE
          -- Previous day was a day shift with a missed checkout: mark its work state as CHECKED_OUT so today's check-in proceeds cleanly
          UPDATE public.attendance_daily
          SET current_work_state = 'CHECKED_OUT', updated_at = v_now
          WHERE id = v_daily_yesterday.id AND current_work_state = 'WORKING';
        END IF;
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
      first_check_in = LEAST(public.attendance_daily.first_check_in, EXCLUDED.first_check_in),
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
      WHERE employee_id = v_emp_id
        AND attendance_date = v_yesterday
        AND first_check_in IS NOT NULL
        AND last_check_out IS NULL
        AND EXTRACT(HOUR FROM (first_check_in AT TIME ZONE 'Asia/Kolkata')) >= 17
        AND EXTRACT(EPOCH FROM (v_now - first_check_in)) < (18 * 3600)
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

    -- Active Break Guard
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

-- 3. Repair any morning IN/CHECK_IN punches from today (2026-11-13) that were mis-tagged with attendance_date = '2026-11-12'
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN (
    SELECT id, employee_id, punch_time
    FROM public.attendance_punches
    WHERE punch_type IN ('IN', 'CHECK_IN')
      AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = '2026-11-13'::DATE
      AND EXTRACT(HOUR FROM (punch_time AT TIME ZONE 'Asia/Kolkata')) >= 5
      AND attendance_date = '2026-11-12'::DATE
  ) LOOP
    UPDATE public.attendance_punches
    SET attendance_date = '2026-11-13'::DATE
    WHERE id = v_rec.id;

    UPDATE public.attendance_daily
    SET current_work_state = 'CHECKED_OUT'
    WHERE employee_id = v_rec.employee_id
      AND attendance_date = '2026-11-12'::DATE
      AND last_check_out IS NULL;

    PERFORM public.fn_recalculate_daily_attendance(v_rec.employee_id, '2026-11-12'::DATE);
    PERFORM public.fn_recalculate_daily_attendance(v_rec.employee_id, '2026-11-13'::DATE);
  END LOOP;
END;
$$;

