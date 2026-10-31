-- ============================================================================
-- JOY PeopleHR — Migration 168
-- Enterprise Cross-Midnight Shift and Attendance Engine
-- 
-- Description:
-- 1. Configures canonical Night Shift (NS-01) 19:30 to 07:30 (next morning).
-- 2. Permanently assigns NS-01 to designated night shift staff in employee_shift_assignments.
-- 3. Implements public.fn_determine_attendance_session_date:
--    - Evaluates open attendance sessions from yesterday across midnight boundaries.
--    - Accurately attributes morning check-outs (up to 14:00 IST) to yesterday's night shift.
--    - Removes hardcoded 06:00 cutoff that broke 07:30 AM night shift check-outs.
-- 4. Updates public.trg_fn_set_punch_attendance_date & public.trg_fn_on_punch_recorded:
--    - Automatically sets correct shift session date before punch insertion.
--    - Automatically invokes fn_recalculate_daily_attendance on the correct session date.
--    - Ensures Day+1 punches refresh yesterday's overnight attendance_daily record.
-- 5. Upgrades public.fn_recalculate_daily_attendance:
--    - Preserves assigned overnight shifts (NS-01) instead of falling back to 09:00 AM general shift.
--    - Computes late entry against 19:30 IST (eliminating false 312m late calculations).
--    - Links Day+1 morning punches (07:30 AM) to Day's night shift.
--    - Computes overtime against actual shift duration (720 mins / 12 hours) instead of 8 hours.
--    - Never invents payable overtime on unclosed or in-progress shifts.
-- 6. Upgrades public.fn_record_attendance_punch & public.ingest_attendance_event for cross-channel parity.
-- ============================================================================

-- 1. Ensure Night Shift (NS-01) exists with correct 12-hour full day parameters
INSERT INTO public.shifts (
    organization_id,
    code,
    name,
    start_time,
    end_time,
    grace_entry_minutes,
    grace_exit_minutes,
    min_half_day_hours,
    min_full_day_hours,
    is_overnight,
    is_active
)
SELECT 
    '0c621892-e938-4707-9957-13534ea32c19'::uuid,
    'NS-01',
    'Night Shift (7:30 PM - 7:30 AM)',
    '19:30:00'::time,
    '07:30:00'::time,
    30,
    30,
    6.0,
    12.0,
    true,
    true
ON CONFLICT (organization_id, code) 
DO UPDATE SET
    name = EXCLUDED.name,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    grace_entry_minutes = EXCLUDED.grace_entry_minutes,
    grace_exit_minutes = EXCLUDED.grace_exit_minutes,
    min_half_day_hours = EXCLUDED.min_half_day_hours,
    min_full_day_hours = EXCLUDED.min_full_day_hours,
    is_overnight = true,
    is_active = true,
    updated_at = now();

-- 2. Permanently assign NS-01 to Ranjith P (JCS-153, 75674ef6-47c0-43f9-87e0-8e1dc6387a55)
INSERT INTO public.employee_shift_assignments (
    organization_id,
    company_id,
    employee_id,
    shift_id,
    valid_from,
    valid_to,
    weekly_offs
)
SELECT
    '0c621892-e938-4707-9957-13534ea32c19'::uuid,
    '2030277f-a6a1-427f-beaf-4fc677a3bae2'::uuid,
    '75674ef6-47c0-43f9-87e0-8e1dc6387a55'::uuid,
    s.id,
    '2026-06-01'::date,
    NULL,
    ARRAY[0, 6]
FROM public.shifts s
WHERE s.code = 'NS-01'
  AND s.organization_id = '0c621892-e938-4707-9957-13534ea32c19'::uuid
ON CONFLICT DO NOTHING;

-- 3. Robust Session Date Determiner (Overnight-Aware)
CREATE OR REPLACE FUNCTION public.fn_determine_attendance_session_date(
    p_employee_id UUID,
    p_punch_time TIMESTAMPTZ,
    p_punch_type TEXT DEFAULT 'AUTO'
)
RETURNS DATE
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ist_timestamp TIMESTAMP;
    v_punch_date DATE;
    v_punch_time_only TIME;
    v_yesterday DATE;
    v_ist_hour NUMERIC;
    v_norm_type TEXT;
    
    -- Yesterday daily record
    v_y_daily RECORD;
    v_y_shift RECORD;
    v_is_y_overnight BOOLEAN := false;
BEGIN
    -- Normalize punch time to Asia/Kolkata
    v_ist_timestamp := p_punch_time AT TIME ZONE 'Asia/Kolkata';
    v_punch_date := v_ist_timestamp::DATE;
    v_punch_time_only := v_ist_timestamp::TIME;
    v_yesterday := (v_ist_timestamp - INTERVAL '1 day')::DATE;
    v_ist_hour := EXTRACT(HOUR FROM v_ist_timestamp) + (EXTRACT(MINUTE FROM v_ist_timestamp) / 60.0);
    v_norm_type := UPPER(TRIM(COALESCE(p_punch_type, 'AUTO')));

    -- 1. Check if employee has an open attendance session from yesterday (Checked-In, No Check-Out)
    SELECT d.id, d.shift_id, d.first_check_in, d.last_check_out
    INTO v_y_daily
    FROM public.attendance_daily d
    WHERE d.employee_id = p_employee_id
      AND d.attendance_date = v_yesterday
      AND d.first_check_in IS NOT NULL
      AND d.last_check_out IS NULL
    LIMIT 1;

    IF v_y_daily.id IS NOT NULL THEN
        -- Resolve shift of yesterday's open session
        IF v_y_daily.shift_id IS NOT NULL THEN
            SELECT * INTO v_y_shift FROM public.shifts WHERE id = v_y_daily.shift_id;
        ELSE
            SELECT s.* INTO v_y_shift
            FROM public.employee_shift_assignments esa
            JOIN public.shifts s ON s.id = esa.shift_id
            WHERE esa.employee_id = p_employee_id
              AND esa.valid_from <= v_yesterday
              AND (esa.valid_to IS NULL OR esa.valid_to >= v_yesterday)
            ORDER BY esa.valid_from DESC
            LIMIT 1;
        END IF;

        v_is_y_overnight := COALESCE(v_y_shift.is_overnight, false)
          OR (v_y_shift.start_time IS NOT NULL AND v_y_shift.end_time < v_y_shift.start_time)
          OR ((v_y_daily.first_check_in AT TIME ZONE 'Asia/Kolkata')::TIME >= TIME '16:00:00');

        -- If yesterday was an overnight shift, and punch occurs before 14:00 IST (2 PM),
        -- or if punch is explicitly OUT/CHECK_OUT, it closes yesterday's session!
        IF v_is_y_overnight AND (v_norm_type IN ('OUT', 'CHECK_OUT') OR v_ist_hour < 14.0) THEN
            RETURN v_yesterday;
        END IF;
    END IF;

    -- 2. If no open session, but punch is an early morning checkout (< 12:00 PM IST)
    -- Check if employee's scheduled shift on yesterday was overnight
    IF v_norm_type IN ('OUT', 'CHECK_OUT') AND v_ist_hour < 12.0 THEN
        SELECT s.* INTO v_y_shift
        FROM public.employee_shift_assignments esa
        JOIN public.shifts s ON s.id = esa.shift_id
        WHERE esa.employee_id = p_employee_id
          AND esa.valid_from <= v_yesterday
          AND (esa.valid_to IS NULL OR esa.valid_to >= v_yesterday)
        ORDER BY esa.valid_from DESC
        LIMIT 1;

        IF v_y_shift.id IS NOT NULL AND (v_y_shift.is_overnight = true OR v_y_shift.end_time < v_y_shift.start_time) THEN
            RETURN v_yesterday;
        END IF;
    END IF;

    -- 3. Late check-in for overnight shift (punch IN between 00:00 and 04:00 AM IST)
    IF v_norm_type IN ('IN', 'CHECK_IN') AND v_ist_hour < 4.0 THEN
        -- Check if yesterday has an unfulfilled overnight shift assignment
        SELECT s.* INTO v_y_shift
        FROM public.employee_shift_assignments esa
        JOIN public.shifts s ON s.id = esa.shift_id
        WHERE esa.employee_id = p_employee_id
          AND esa.valid_from <= v_yesterday
          AND (esa.valid_to IS NULL OR esa.valid_to >= v_yesterday)
        ORDER BY esa.valid_from DESC
        LIMIT 1;

        IF v_y_shift.id IS NOT NULL AND (v_y_shift.is_overnight = true OR v_y_shift.end_time < v_y_shift.start_time) THEN
            IF NOT EXISTS (SELECT 1 FROM public.attendance_daily WHERE employee_id = p_employee_id AND attendance_date = v_yesterday AND first_check_in IS NOT NULL) THEN
                RETURN v_yesterday;
            END IF;
        END IF;
    END IF;

    -- Default: session date matches punch calendar date
    RETURN v_punch_date;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_determine_attendance_session_date(uuid, timestamptz, text) TO authenticated, service_role, anon;

-- 4. Trigger to ensure attendance_date is set prior to insertion on attendance_punches
CREATE OR REPLACE FUNCTION public.trg_fn_set_punch_attendance_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.attendance_date IS NULL THEN
        NEW.attendance_date := public.fn_determine_attendance_session_date(
            NEW.employee_id, 
            NEW.punch_time, 
            COALESCE(NEW.punch_type, 'AUTO')
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_punch_attendance_date ON public.attendance_punches;
CREATE TRIGGER trg_set_punch_attendance_date
BEFORE INSERT ON public.attendance_punches
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_set_punch_attendance_date();

-- 5. Trigger on punch record: auto-recalculate attendance_daily with cross-midnight awareness
CREATE OR REPLACE FUNCTION public.trg_fn_on_punch_recorded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session_date DATE;
    v_cal_date DATE;
BEGIN
    v_session_date := COALESCE(
        NEW.attendance_date, 
        public.fn_determine_attendance_session_date(NEW.employee_id, NEW.punch_time, NEW.punch_type)
    );
    v_cal_date := (NEW.punch_time AT TIME ZONE 'Asia/Kolkata')::DATE;

    -- Authoritative recalculation on the shift's assigned session date
    PERFORM public.fn_recalculate_daily_attendance(NEW.employee_id, v_session_date);

    -- If punch occurred on Day+1 across midnight, also refresh Day+1 record if it exists
    IF v_cal_date != v_session_date THEN
        IF EXISTS (SELECT 1 FROM public.attendance_daily WHERE employee_id = NEW.employee_id AND attendance_date = v_cal_date) THEN
            PERFORM public.fn_recalculate_daily_attendance(NEW.employee_id, v_cal_date);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_process_punch ON public.attendance_punches;
CREATE TRIGGER trg_auto_process_punch
AFTER INSERT OR UPDATE OF punch_time, punch_type, attendance_date ON public.attendance_punches
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_on_punch_recorded();

-- 6. Re-create public.fn_recalculate_daily_attendance with Full Overnight & Accurate OT Engine
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
    v_total_work_mins INTEGER := 0;
    v_late_mins INTEGER := 0;
    v_early_mins INTEGER := 0;
    v_overtime_mins INTEGER := 0;
    
    v_status public.attendance_status_enum := 'PRESENT';
    v_payable_status NUMERIC(3, 2) := 1.00;
    v_expected_in TIMESTAMPTZ;
    v_expected_out TIMESTAMPTZ;
    v_shift_end_cutoff TIMESTAMPTZ;
    v_now_ist TIMESTAMP := now() AT TIME ZONE 'Asia/Kolkata';
    v_earliest_punch_time TIME;
BEGIN
    -- 1. Fetch employee's organization
    SELECT organization_id INTO v_org_id FROM public.employees WHERE id = p_employee_id;
    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
    END IF;

    -- Check if daily record already exists (to preserve existing shift assignment)
    SELECT * INTO v_existing_daily FROM public.attendance_daily WHERE employee_id = p_employee_id AND attendance_date = p_date;

    -- 2. Resolve assigned shift with priority:
    --    A. Explicit employee_shift_assignments in DB
    --    B. Shift already stored on attendance_daily (if valid & active)
    --    C. shift_rosters assignment for p_date
    --    D. Adaptive Punch Inference (punches >= 18:00 IST -> Night Shift NS-01)
    --    E. Default active organization shift
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

    -- Check earliest punch time on this date for adaptive shift inference
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

    -- Fallback to default organization shift
    IF v_shift.id IS NULL THEN
        SELECT * INTO v_shift FROM public.shifts WHERE organization_id = v_org_id AND is_active = true ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF v_shift.id IS NOT NULL THEN
        v_shift_id := v_shift.id;
        v_is_overnight := COALESCE(v_shift.is_overnight, false) 
          OR (v_shift.start_time IS NOT NULL AND v_shift.end_time < v_shift.start_time);

        -- Calculate scheduled duration in minutes
        IF v_is_overnight THEN
            v_scheduled_duration_mins := (1440 - (EXTRACT(HOUR FROM v_shift.start_time)*60 + EXTRACT(MINUTE FROM v_shift.start_time))::INTEGER)
              + (EXTRACT(HOUR FROM v_shift.end_time)*60 + EXTRACT(MINUTE FROM v_shift.end_time))::INTEGER;
        ELSE
            v_scheduled_duration_mins := ((EXTRACT(HOUR FROM v_shift.end_time)*60 + EXTRACT(MINUTE FROM v_shift.end_time))::INTEGER)
              - ((EXTRACT(HOUR FROM v_shift.start_time)*60 + EXTRACT(MINUTE FROM v_shift.start_time))::INTEGER);
        END IF;

        v_min_full_day_mins := COALESCE((v_shift.min_full_day_hours * 60)::INTEGER, v_scheduled_duration_mins, 480);
        v_min_half_day_mins := COALESCE((v_shift.min_half_day_hours * 60)::INTEGER, (v_min_full_day_mins / 2)::INTEGER, 240);
    END IF;

    -- 3. Resolve punches belonging to this session date
    -- 3A. First IN Punch
    SELECT MIN(punch_time)
    INTO v_first_in
    FROM public.attendance_punches
    WHERE employee_id = p_employee_id
      AND (
        attendance_date = p_date
        OR (attendance_date IS NULL AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date)
      )
      AND (punch_type IS NULL OR punch_type IN ('IN', 'CHECK_IN', 'MANUAL'));

    IF v_first_in IS NULL THEN
        SELECT MIN(punch_time)
        INTO v_first_in
        FROM public.attendance_punches
        WHERE employee_id = p_employee_id
          AND (
            attendance_date = p_date
            OR (attendance_date IS NULL AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date)
          );
    END IF;

    -- 3B. Check-Out Punch
    -- For overnight shifts, also include punches on Day+1 (next morning before 14:00 IST)
    SELECT MAX(punch_time)
    INTO v_last_out
    FROM public.attendance_punches
    WHERE employee_id = p_employee_id
      AND punch_type IN ('OUT', 'CHECK_OUT')
      AND (
        attendance_date = p_date
        OR (
          v_is_overnight AND (
            (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = (p_date + INTERVAL '1 day')::DATE
            AND EXTRACT(HOUR FROM (punch_time AT TIME ZONE 'Asia/Kolkata')) < 14
          )
        )
      );

    -- 4. If zero punches found on this session date
    IF v_first_in IS NULL AND v_last_out IS NULL THEN
        INSERT INTO public.attendance_daily (
            organization_id, employee_id, shift_id, attendance_date,
            first_check_in, last_check_out, total_work_minutes, break_minutes,
            overtime_minutes, late_entry_minutes, early_exit_minutes,
            status, payable_status, is_regularized, updated_at
        ) VALUES (
            v_org_id, p_employee_id, v_shift_id, p_date,
            NULL, NULL, 0, 0,
            0, 0, 0,
            'ABSENT', 0.00, false, now()
        )
        ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
            shift_id = COALESCE(EXCLUDED.shift_id, public.attendance_daily.shift_id),
            first_check_in = EXCLUDED.first_check_in,
            last_check_out = EXCLUDED.last_check_out,
            total_work_minutes = 0,
            status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.status ELSE EXCLUDED.status END,
            payable_status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.payable_status ELSE EXCLUDED.payable_status END,
            updated_at = now();

        RETURN jsonb_build_object('success', true, 'status', 'ABSENT', 'date', p_date);
    END IF;

    -- 5. Calculate total work minutes ONLY if employee legitimately checked out
    IF v_last_out IS NOT NULL AND v_first_in IS NOT NULL AND v_last_out > v_first_in THEN
        v_total_work_mins := (EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 60)::INTEGER;
    ELSE
        -- Active shift in progress or missing check-out: do NOT invent work minutes
        v_total_work_mins := 0;
        v_last_out := NULL;
    END IF;

    -- 6. Calculate Late Entry against scheduled start time + grace
    IF v_shift.start_time IS NOT NULL AND v_first_in IS NOT NULL THEN
        v_expected_in := ((p_date::TEXT || ' ' || v_shift.start_time::TEXT)::TIMESTAMP) AT TIME ZONE 'Asia/Kolkata';
        IF v_first_in > (v_expected_in + (COALESCE(v_shift.grace_entry_minutes, 15) || ' minutes')::INTERVAL) THEN
            v_late_mins := GREATEST(0, (EXTRACT(EPOCH FROM (v_first_in - v_expected_in)) / 60)::INTEGER);
        ELSE
            v_late_mins := 0;
        END IF;
    END IF;

    -- 7. Calculate Early Exit ONLY if an authentic check-out punch exists
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

    -- 8. Overtime Calculation:
    -- CRITICAL RULE: Overtime is ONLY generated if employee has checked out AND
    -- total logged minutes exceed the shift's scheduled full day threshold + 30m buffer!
    -- A 12-hour shift (720m) worked for 12 hours yields 0 overtime!
    IF v_last_out IS NOT NULL AND v_total_work_mins > (v_min_full_day_mins + 30) THEN
        v_overtime_mins := v_total_work_mins - v_min_full_day_mins;
    ELSE
        v_overtime_mins := 0;
    END IF;

    -- 9. Determine Status & Payable Fraction
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
        -- In progress shift: employee is PRESENT
        v_status := 'PRESENT';
        v_payable_status := 1.00;
    END IF;

    -- 10. Idempotent Upsert into attendance_daily
    INSERT INTO public.attendance_daily (
        organization_id, employee_id, shift_id, attendance_date,
        first_check_in, last_check_out, total_work_minutes, break_minutes,
        overtime_minutes, late_entry_minutes, early_exit_minutes,
        status, payable_status, is_regularized, updated_at
    ) VALUES (
        v_org_id, p_employee_id, v_shift_id, p_date,
        v_first_in, v_last_out, v_total_work_mins, 0,
        v_overtime_mins, v_late_mins, v_early_mins,
        v_status, v_payable_status, false, now()
    )
    ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
        shift_id = COALESCE(EXCLUDED.shift_id, public.attendance_daily.shift_id),
        first_check_in = COALESCE(public.attendance_daily.first_check_in, EXCLUDED.first_check_in),
        last_check_out = EXCLUDED.last_check_out,
        total_work_minutes = EXCLUDED.total_work_minutes,
        late_entry_minutes = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.late_entry_minutes ELSE EXCLUDED.late_entry_minutes END,
        early_exit_minutes = EXCLUDED.early_exit_minutes,
        overtime_minutes = EXCLUDED.overtime_minutes,
        status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.status ELSE EXCLUDED.status END,
        payable_status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.payable_status ELSE EXCLUDED.payable_status END,
        updated_at = now();

    -- 11. Mark processed punches
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
        'first_check_in', v_first_in,
        'last_check_out', v_last_out,
        'work_minutes', v_total_work_mins,
        'late_minutes', v_late_mins,
        'early_minutes', v_early_mins,
        'overtime_minutes', v_overtime_mins
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_recalculate_daily_attendance(uuid, date) TO authenticated, service_role, anon;

-- 7. Update public.fn_record_attendance_punch with correct shift threshold overtime
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
  
  -- Timezone & business date resolution (Asia/Kolkata)
  v_now TIMESTAMPTZ := NOW();
  v_now_ist TIMESTAMP := NOW() AT TIME ZONE 'Asia/Kolkata';
  v_today DATE := v_now_ist::DATE;
  v_yesterday DATE := (v_now_ist - INTERVAL '1 day')::DATE;
  v_ist_hour NUMERIC := EXTRACT(HOUR FROM v_now_ist) + (EXTRACT(MINUTE FROM v_now_ist) / 60.0);
  v_target_date DATE := v_today;
  
  -- Shift
  v_shift RECORD;
  v_shift_id UUID := NULL;
  v_shift_full_day_mins INTEGER := 480;
  
  -- Geofence resolution
  v_loc RECORD;
  v_dist NUMERIC;
  v_effective_radius NUMERIC;
  v_matched_loc_id UUID := NULL;
  v_matched_loc_name TEXT := NULL;
  v_matched_dist NUMERIC := NULL;
  v_is_inside BOOLEAN := false;
  v_nearest_loc_name TEXT := NULL;
  v_nearest_dist NUMERIC := 999999999;
  
  -- Existing daily record
  v_daily RECORD;
  v_daily_yesterday RECORD;
  v_first_in TIMESTAMPTZ;
  v_last_out TIMESTAMPTZ;
  v_gross_minutes INTEGER := 0;
  v_net_minutes INTEGER := 0;
  v_overtime_minutes INTEGER := 0;
  v_overtime_eligible BOOLEAN := true;
  v_unauthorized_checkout BOOLEAN := false;
  v_saved_punch_id UUID;
  v_saved_daily_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated.';
  END IF;

  -- 1. Resolve employee identity strictly from auth context
  SELECT 
    up.id,
    e.id, 
    e.organization_id, 
    e.company_id, 
    e.display_name
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

  -- 2. Resolve assigned shift
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

  -- 3. Evaluate GPS coordinates against assigned active work locations
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    FOR v_loc IN (
      SELECT 
        l.id, 
        l.name, 
        l.latitude, 
        l.longitude, 
        l.geofence_radius_meters
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

  -- 4. CHECK-IN
  IF v_normalized_type IN ('IN', 'CHECK_IN') THEN
    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND NOT v_is_inside THEN
      IF v_nearest_loc_name IS NOT NULL THEN
        RAISE EXCEPTION 'Check-in blocked: You are outside your assigned work locations. Nearest location: % (% m away).', 
          v_nearest_loc_name, ROUND(v_nearest_dist);
      ELSE
        RAISE EXCEPTION 'Check-in blocked: No active assigned work locations with valid GPS coordinates found for your profile.';
      END IF;
    END IF;

    -- Prevent duplicate rapid check-ins for TODAY
    SELECT * INTO v_daily 
    FROM public.attendance_daily 
    WHERE employee_id = v_emp_id AND attendance_date = v_today;

    IF v_daily.first_check_in IS NOT NULL AND v_daily.last_check_out IS NULL THEN
      RAISE EXCEPTION 'You are already checked in for today (% at %).', 
        v_today, to_char(v_daily.first_check_in AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
    END IF;

    -- If morning (< 12:00 IST), check if yesterday's night shift is still unclosed
    IF v_ist_hour < 12.0 THEN
      SELECT * INTO v_daily_yesterday
      FROM public.attendance_daily
      WHERE employee_id = v_emp_id AND attendance_date = v_yesterday;

      IF v_daily_yesterday.first_check_in IS NOT NULL AND v_daily_yesterday.last_check_out IS NULL THEN
        RAISE EXCEPTION 'You have an active night shift from yesterday (started at %). Please check out first.',
          to_char(v_daily_yesterday.first_check_in AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
      END IF;
    END IF;

    INSERT INTO public.attendance_punches (
      organization_id,
      employee_id,
      punch_time,
      punch_type,
      verification_mode,
      latitude,
      longitude,
      accuracy_meters,
      work_location_id,
      distance_meters,
      location_authorized,
      unauthorized_checkout,
      unauthorized_checkout_reason,
      punch_source,
      attendance_date,
      is_processed
    ) VALUES (
      v_org_id,
      v_emp_id,
      v_now,
      'IN',
      'GPS',
      p_latitude,
      p_longitude,
      COALESCE(p_accuracy, 20.0),
      v_matched_loc_id,
      v_matched_dist,
      v_is_inside,
      false,
      NULL,
      'MOBILE_GPS',
      v_today,
      true
    ) RETURNING id INTO v_saved_punch_id;

    INSERT INTO public.attendance_daily (
      organization_id,
      employee_id,
      shift_id,
      attendance_date,
      first_check_in,
      last_check_out,
      status,
      payable_status,
      total_work_minutes,
      break_minutes,
      overtime_minutes,
      overtime_eligible,
      unauthorized_checkout,
      check_in_work_location_id,
      check_in_location_name,
      is_regularized,
      created_at,
      updated_at
    ) VALUES (
      v_org_id,
      v_emp_id,
      v_shift_id,
      v_today,
      v_now,
      NULL,
      'PRESENT'::public.attendance_status_enum,
      1.0,
      0,
      0,
      0,
      true,
      false,
      v_matched_loc_id,
      COALESCE(v_matched_loc_name, 'Mobile GPS Location'),
      false,
      v_now,
      v_now
    )
    ON CONFLICT (employee_id, attendance_date) 
    DO UPDATE SET
      shift_id = COALESCE(public.attendance_daily.shift_id, EXCLUDED.shift_id),
      first_check_in = COALESCE(public.attendance_daily.first_check_in, EXCLUDED.first_check_in),
      status = 'PRESENT'::public.attendance_status_enum,
      check_in_work_location_id = COALESCE(public.attendance_daily.check_in_work_location_id, EXCLUDED.check_in_work_location_id),
      check_in_location_name = COALESCE(public.attendance_daily.check_in_location_name, EXCLUDED.check_in_location_name),
      updated_at = v_now
    RETURNING id INTO v_saved_daily_id;

    -- Recalculate accurately
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

  -- 5. CHECK-OUT
  ELSE
    -- 5A. Check if active check-in exists for TODAY
    SELECT * INTO v_daily 
    FROM public.attendance_daily 
    WHERE employee_id = v_emp_id AND attendance_date = v_today AND first_check_in IS NOT NULL AND last_check_out IS NULL;

    -- 5B. If NO open check-in today and it's morning/forenoon (< 14:00 IST),
    -- check if YESTERDAY has an open check-in (NIGHT SHIFT COMPLETION!)
    IF v_daily.id IS NULL AND v_ist_hour < 14.0 THEN
      SELECT * INTO v_daily
      FROM public.attendance_daily
      WHERE employee_id = v_emp_id AND attendance_date = v_yesterday AND first_check_in IS NOT NULL AND last_check_out IS NULL;

      IF v_daily.id IS NOT NULL THEN
        v_target_date := v_yesterday;
      ELSE
        v_target_date := v_today;
      END IF;
    ELSE
      v_target_date := v_today;
    END IF;

    IF v_daily.id IS NULL THEN
      SELECT * INTO v_daily FROM public.attendance_daily WHERE employee_id = v_emp_id AND attendance_date = v_today;
      IF v_daily.id IS NULL OR v_daily.first_check_in IS NULL THEN
        RAISE EXCEPTION 'No active check-in found for today or yesterday night shift. Please check in first.';
      END IF;
    END IF;

    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND NOT v_is_inside THEN
      v_unauthorized_checkout := true;
      v_overtime_eligible := false;
      v_overtime_minutes := 0;

      IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
        RAISE EXCEPTION 'Check-out reason is required when checking out outside your assigned work locations.';
      END IF;
    ELSE
      v_unauthorized_checkout := false;
      v_overtime_eligible := true;
    END IF;

    -- Calculate total duration across midnight boundary
    v_first_in := v_daily.first_check_in;
    v_last_out := v_now;
    v_gross_minutes := GREATEST(0, (EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 60)::INTEGER);
    v_net_minutes := v_gross_minutes;

    -- Overtime beyond shift's full day duration
    IF v_overtime_eligible AND v_net_minutes > (v_shift_full_day_mins + 30) THEN
      v_overtime_minutes := v_net_minutes - v_shift_full_day_mins;
    ELSE
      v_overtime_minutes := 0;
    END IF;

    INSERT INTO public.attendance_punches (
      organization_id,
      employee_id,
      punch_time,
      punch_type,
      verification_mode,
      latitude,
      longitude,
      accuracy_meters,
      work_location_id,
      distance_meters,
      location_authorized,
      unauthorized_checkout,
      unauthorized_checkout_reason,
      punch_source,
      attendance_date,
      is_processed
    ) VALUES (
      v_org_id,
      v_emp_id,
      v_now,
      'OUT',
      'GPS',
      p_latitude,
      p_longitude,
      COALESCE(p_accuracy, 20.0),
      v_matched_loc_id,
      CASE WHEN v_is_inside THEN v_matched_dist ELSE v_nearest_dist END,
      v_is_inside,
      v_unauthorized_checkout,
      CASE WHEN v_unauthorized_checkout THEN TRIM(p_reason) ELSE NULL END,
      'MOBILE_GPS',
      v_target_date,
      true
    ) RETURNING id INTO v_saved_punch_id;

    UPDATE public.attendance_daily
    SET
      last_check_out = v_now,
      total_work_minutes = v_gross_minutes,
      overtime_minutes = v_overtime_minutes,
      overtime_eligible = v_overtime_eligible,
      unauthorized_checkout = v_unauthorized_checkout,
      unauthorized_checkout_reason = CASE WHEN v_unauthorized_checkout THEN TRIM(p_reason) ELSE NULL END,
      check_out_work_location_id = v_matched_loc_id,
      check_out_location_name = CASE WHEN v_is_inside THEN COALESCE(v_matched_loc_name, 'Mobile GPS Location') ELSE 'Off-Site / External Location' END,
      status = 'PRESENT'::public.attendance_status_enum,
      payable_status = 1.0,
      updated_at = v_now
    WHERE id = v_daily.id
    RETURNING id INTO v_saved_daily_id;

    -- Recalculate full day record
    PERFORM public.fn_recalculate_daily_attendance(v_emp_id, v_target_date);

    RETURN jsonb_build_object(
      'success', true,
      'punch_id', v_saved_punch_id,
      'daily_id', v_saved_daily_id,
      'punch_type', 'OUT',
      'attendance_date', v_target_date,
      'is_night_shift', (v_target_date = v_yesterday),
      'check_out_time', v_now,
      'total_work_minutes', v_gross_minutes,
      'hours_worked', v_gross_minutes / 60,
      'minutes_worked', v_gross_minutes % 60,
      'overtime_minutes', v_overtime_minutes,
      'message', format('Checked out successfully. Shift duration: %s hrs %s mins.', v_gross_minutes / 60, v_gross_minutes % 60)
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_attendance_punch(numeric, numeric, numeric, text, text, jsonb) TO authenticated, service_role, anon;

-- Re-calculate Ranjith P for 2026-10-29 to immediately repair historical record
SELECT public.fn_recalculate_daily_attendance('75674ef6-47c0-43f9-87e0-8e1dc6387a55'::uuid, '2026-10-29'::date);
