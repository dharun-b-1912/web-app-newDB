-- ============================================================================
-- JOY PeopleHR — Migration 167
-- Night Shift (7:30 PM to 7:30 AM) Real-Time Midnight Reconciler
-- Description:
-- 1. Configures dedicated Night Shift (NS-01) from 19:30 to 07:30 (next morning).
-- 2. Prevents day-cycle reset at 12:00 midnight for both mobile GPS punches and
--    biometric punches.
-- 3. In fn_record_attendance_punch: When an employee checks out in the morning
--    (before 12:00 PM IST), attributes the check-out to yesterday's night shift,
--    calculates total working minutes across the midnight boundary (e.g. 12 hrs),
--    calculates overtime, and updates attendance_daily on the shift's starting date.
-- 4. In fn_recalculate_daily_attendance: Allows night shift check-outs on Day+1
--    to link to Day's attendance record.
-- ============================================================================

-- 1. Ensure Night Shift (NS-01) exists and is configured for active organizations
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

-- 2. Re-create public.fn_record_attendance_punch with Night Shift & Midnight Awareness
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

  -- 2. Resolve assigned or dynamic shift
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
    -- If punch is in the evening (>= 18:00 IST) fallback to active overnight shift if available
    IF v_ist_hour >= 18.0 THEN
      SELECT * INTO v_shift FROM public.shifts WHERE organization_id = v_org_id AND is_overnight = true AND is_active = true LIMIT 1;
    END IF;
    IF v_shift.id IS NULL THEN
      SELECT * INTO v_shift FROM public.shifts WHERE organization_id = v_org_id AND is_active = true ORDER BY created_at ASC LIMIT 1;
    END IF;
    v_shift_id := v_shift.id;
  END IF;

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
        EXIT; -- Found authorized inside location
      END IF;
    END LOOP;
  ELSE
    -- If no GPS coordinates submitted, assume inside
    v_is_inside := true;
  END IF;

  -- ============================================================================
  -- 4. CHECK-IN RULES (Mobile GPS Check-In)
  -- ============================================================================
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

    -- If morning (< 11:00 IST), check if yesterday's night shift is still unclosed
    IF v_ist_hour < 11.0 THEN
      SELECT * INTO v_daily_yesterday
      FROM public.attendance_daily
      WHERE employee_id = v_emp_id AND attendance_date = v_yesterday;

      IF v_daily_yesterday.first_check_in IS NOT NULL AND v_daily_yesterday.last_check_out IS NULL THEN
        RAISE EXCEPTION 'You have an active night shift from yesterday (started at %). Please check out first.',
          to_char(v_daily_yesterday.first_check_in AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
      END IF;
    END IF;

    -- Record IN punch into attendance_punches
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

    -- Upsert daily record
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

  -- ============================================================================
  -- 5. CHECK-OUT RULES (Mobile GPS Check-Out with Night Shift Reconciler)
  -- ============================================================================
  ELSE
    -- 5A. Check if active check-in exists for TODAY
    SELECT * INTO v_daily 
    FROM public.attendance_daily 
    WHERE employee_id = v_emp_id AND attendance_date = v_today AND first_check_in IS NOT NULL AND last_check_out IS NULL;

    -- 5B. If NO open check-in today and it's morning/forenoon (< 12:00 IST),
    -- check if YESTERDAY has an open check-in (NIGHT SHIFT COMPLETION!)
    IF v_daily.id IS NULL AND v_ist_hour < 12.0 THEN
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

    -- 5C. If still null, check if today has any check-in
    IF v_daily.id IS NULL THEN
      SELECT * INTO v_daily FROM public.attendance_daily WHERE employee_id = v_emp_id AND attendance_date = v_today;
      IF v_daily.id IS NULL OR v_daily.first_check_in IS NULL THEN
        RAISE EXCEPTION 'No active check-in found for today or yesterday night shift. Please check in first.';
      END IF;
    END IF;

    -- Handle outside geofence reason check
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

    -- Calculate overtime beyond 8 hours (480 mins)
    IF v_overtime_eligible AND v_net_minutes > 480 THEN
      v_overtime_minutes := v_net_minutes - 480;
    ELSE
      v_overtime_minutes := 0;
    END IF;

    -- Record OUT punch in attendance_punches with shift's attendance_date
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

    -- Update daily record on shift's target date
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

GRANT EXECUTE ON FUNCTION public.fn_record_attendance_punch(numeric, numeric, numeric, text, text, jsonb) TO authenticated, service_role;

-- 3. Re-create public.fn_recalculate_daily_attendance with Overnight Support
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
    v_shift RECORD;
    v_first_in TIMESTAMPTZ;
    v_last_out TIMESTAMPTZ;
    v_punch_count INTEGER;
    v_total_work_mins INTEGER := 0;
    v_late_mins INTEGER := 0;
    v_early_mins INTEGER := 0;
    v_overtime_mins INTEGER := 0;
    v_status public.attendance_status_enum := 'PRESENT';
    v_payable_status NUMERIC(3, 2) := 1.00;
    v_min_half_day_mins INTEGER := 240; -- 4 hours
    v_min_full_day_mins INTEGER := 480; -- 8 hours
    v_expected_in TIMESTAMPTZ;
    v_expected_out TIMESTAMPTZ;
    v_shift_id UUID := NULL;
    v_is_overnight BOOLEAN := false;
BEGIN
    -- 1. Fetch employee's organization
    SELECT organization_id INTO v_org_id FROM public.employees WHERE id = p_employee_id;
    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
    END IF;

    -- 2. Fetch assigned shift (fallback to default shift if not explicitly assigned)
    SELECT s.* INTO v_shift
    FROM public.employee_shift_assignments esa
    JOIN public.shifts s ON s.id = esa.shift_id
    WHERE esa.employee_id = p_employee_id
      AND esa.valid_from <= p_date
      AND (esa.valid_to IS NULL OR esa.valid_to >= p_date)
    ORDER BY esa.valid_from DESC
    LIMIT 1;

    IF v_shift.id IS NOT NULL THEN
        v_shift_id := v_shift.id;
        v_min_half_day_mins := (v_shift.min_half_day_hours * 60)::INTEGER;
        v_min_full_day_mins := (v_shift.min_full_day_hours * 60)::INTEGER;
        v_is_overnight := COALESCE(v_shift.is_overnight, false);
    ELSE
        -- Fallback to default organization shift
        SELECT * INTO v_shift FROM public.shifts WHERE organization_id = v_org_id AND is_active = true ORDER BY created_at ASC LIMIT 1;
        IF v_shift.id IS NOT NULL THEN
            v_shift_id := v_shift.id;
            v_min_half_day_mins := (v_shift.min_half_day_hours * 60)::INTEGER;
            v_min_full_day_mins := (v_shift.min_full_day_hours * 60)::INTEGER;
            v_is_overnight := COALESCE(v_shift.is_overnight, false);
        END IF;
    END IF;

    -- 3. Fetch all punches for this employee on this attendance date
    SELECT COUNT(*)
    INTO v_punch_count
    FROM public.attendance_punches
    WHERE employee_id = p_employee_id
      AND (
        attendance_date = p_date
        OR (attendance_date IS NULL AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date)
      );

    IF v_punch_count IS NULL OR v_punch_count = 0 THEN
        -- Zero punches recorded for this date: Mark as ABSENT
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
            total_work_minutes = EXCLUDED.total_work_minutes,
            status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.status ELSE EXCLUDED.status END,
            payable_status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.payable_status ELSE EXCLUDED.payable_status END,
            updated_at = now();

        RETURN jsonb_build_object('success', true, 'status', 'ABSENT', 'date', p_date);
    END IF;

    -- 3A. Resolve earliest check-in punch (prioritizing explicit IN/CHECK_IN/MANUAL)
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

    -- 3B. Resolve check-out punch:
    -- If shift is overnight, also consider punches on Day+1 before 12:00 PM IST
    SELECT MAX(punch_time)
    INTO v_last_out
    FROM public.attendance_punches
    WHERE employee_id = p_employee_id
      AND (
        attendance_date = p_date
        OR (
          attendance_date IS NULL AND (
            (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date
            OR (v_is_overnight AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = (p_date + INTERVAL '1 day')::DATE AND EXTRACT(HOUR FROM (punch_time AT TIME ZONE 'Asia/Kolkata')) < 12)
          )
        )
      )
      AND punch_type IN ('OUT', 'CHECK_OUT');

    -- 4. Calculate total work minutes ONLY if employee has legitimately checked out
    IF v_last_out IS NOT NULL AND v_first_in IS NOT NULL AND v_last_out > v_first_in THEN
        v_total_work_mins := (EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 60)::INTEGER;
    ELSE
        -- No checkout punch: shift is still in progress!
        v_total_work_mins := 0;
        v_last_out := NULL;
    END IF;

    -- 5. Calculate Late Entry if shift timings exist
    IF v_shift.start_time IS NOT NULL AND v_first_in IS NOT NULL THEN
        v_expected_in := (p_date || ' ' || v_shift.start_time)::TIMESTAMPTZ;
        IF v_first_in > (v_expected_in + (COALESCE(v_shift.grace_entry_minutes, 15) || ' minutes')::INTERVAL) THEN
            v_late_mins := GREATEST(0, (EXTRACT(EPOCH FROM (v_first_in - v_expected_in)) / 60)::INTEGER);
        END IF;
    END IF;

    -- 5B. Calculate Early Exit ONLY if an authentic check-out punch exists
    IF v_shift.end_time IS NOT NULL AND v_last_out IS NOT NULL THEN
        IF v_is_overnight THEN
            v_expected_out := ((p_date + INTERVAL '1 day')::DATE || ' ' || v_shift.end_time)::TIMESTAMPTZ;
        ELSE
            v_expected_out := (p_date || ' ' || v_shift.end_time)::TIMESTAMPTZ;
        END IF;
        
        IF v_last_out < (v_expected_out - (COALESCE(v_shift.grace_exit_minutes, 15) || ' minutes')::INTERVAL) THEN
            v_early_mins := GREATEST(0, (EXTRACT(EPOCH FROM (v_expected_out - v_last_out)) / 60)::INTEGER);
        END IF;
    ELSE
        v_early_mins := 0;
    END IF;

    -- 6. Calculate Overtime (Beyond full day hours or 480 mins)
    IF v_total_work_mins > (v_min_full_day_mins + 30) THEN
        v_overtime_mins := v_total_work_mins - v_min_full_day_mins;
    END IF;

    -- 7. Determine Attendance Status
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
        -- Day is still in progress (Checked-in, waiting for shift end / check-out punch)
        v_status := 'PRESENT';
        v_payable_status := 1.00;
    END IF;

    -- 8. Idempotent Upsert into attendance_daily
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

    -- 9. Mark processed punches
    UPDATE public.attendance_punches
    SET is_processed = true
    WHERE employee_id = p_employee_id
      AND (
        attendance_date = p_date
        OR (attendance_date IS NULL AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date)
      )
      AND is_processed = false;

    RETURN jsonb_build_object(
        'success', true,
        'employee_id', p_employee_id,
        'date', p_date,
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

GRANT EXECUTE ON FUNCTION public.fn_recalculate_daily_attendance(uuid, date) TO authenticated, service_role;
