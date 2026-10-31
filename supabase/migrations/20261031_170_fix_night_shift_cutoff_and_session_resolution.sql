-- ============================================================================
-- JOY PeopleHR — Migration 170
-- Fix Night Shift Attendance Cutoff and Checkout Resolution
-- 
-- Description:
-- 1. Upgrades public.fn_record_attendance_punch:
--    - For CHECK-IN: Dynamically checks yesterday's unclosed night shift against
--      the shift's attendance_date_cutoff (default 12:00:00).
--      If current time <= cutoff, instructs employee to check out of yesterday's shift.
--      If current time > cutoff, gracefully auto-closes yesterday's unclosed session
--      with MISSING_CHECKOUT so today's check-in is never permanently locked.
--    - For CHECK-OUT: Uses public.fn_determine_attendance_session_date(v_emp_id, v_now, 'OUT')
--      to authoritatively target yesterday's night shift session regardless of arbitrary
--      time-of-day caps, correctly closing the overnight session and calculating full worked hours.
-- 2. Notifies PostgREST to reload schema.
-- ============================================================================

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
  v_now_time TIME := v_now_ist::TIME;
  v_today DATE := v_now_ist::DATE;
  v_yesterday DATE := (v_now_ist - INTERVAL '1 day')::DATE;
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
  v_shift_cutoff TIME := TIME '12:00:00';
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
    SELECT * INTO v_shift FROM public.shifts WHERE organization_id = v_org_id AND is_overnight = true AND is_active = true LIMIT 1;
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

    -- Check if yesterday has an unclosed night shift session
    SELECT d.*, s.attendance_date_cutoff
    INTO v_daily_yesterday
    FROM public.attendance_daily d
    LEFT JOIN public.shifts s ON s.id = d.shift_id
    WHERE d.employee_id = v_emp_id 
      AND d.attendance_date = v_yesterday
      AND d.first_check_in IS NOT NULL
      AND d.last_check_out IS NULL;

    IF v_daily_yesterday.id IS NOT NULL THEN
      v_shift_cutoff := COALESCE(v_daily_yesterday.attendance_date_cutoff, TIME '12:00:00');
      IF v_now_time <= v_shift_cutoff THEN
        RAISE EXCEPTION 'You have an active night shift from yesterday (started at %). Please check out first.',
          to_char(v_daily_yesterday.first_check_in AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
      ELSE
        -- Cutoff has passed: auto-mark yesterday's session as missing checkout so employee can start today
        UPDATE public.attendance_daily
        SET status = 'PRESENT'::public.attendance_status_enum,
            updated_at = v_now
        WHERE id = v_daily_yesterday.id;
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
    -- Resolve authoritative session date using dynamic cutoff engine
    v_target_date := public.fn_determine_attendance_session_date(v_emp_id, v_now, 'OUT');

    -- Find the open check-in session: first check target_date, then today or yesterday fallback
    SELECT * INTO v_daily 
    FROM public.attendance_daily 
    WHERE employee_id = v_emp_id 
      AND attendance_date = v_target_date 
      AND first_check_in IS NOT NULL 
      AND last_check_out IS NULL;

    IF v_daily.id IS NULL THEN
      -- If target date had no open session, check if today has an open session
      SELECT * INTO v_daily 
      FROM public.attendance_daily 
      WHERE employee_id = v_emp_id 
        AND attendance_date = v_today 
        AND first_check_in IS NOT NULL 
        AND last_check_out IS NULL;

      IF v_daily.id IS NOT NULL THEN
        v_target_date := v_today;
      ELSE
        -- Check if yesterday has an open night shift session
        SELECT * INTO v_daily 
        FROM public.attendance_daily 
        WHERE employee_id = v_emp_id 
          AND attendance_date = v_yesterday 
          AND first_check_in IS NOT NULL 
          AND last_check_out IS NULL;

        IF v_daily.id IS NOT NULL THEN
          v_target_date := v_yesterday;
        END IF;
      END IF;
    END IF;

    IF v_daily.id IS NULL THEN
      -- Check if any record exists today to inform user
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
      'overtime_minutes', v_overtime_minutes,
      'location_authorized', v_is_inside,
      'location_name', CASE WHEN v_is_inside THEN v_matched_loc_name ELSE 'Off-Site' END,
      'message', format('Checked out successfully at %s (%s hours worked%s).',
        to_char(v_now_ist, 'HH12:MI AM'),
        ROUND(v_gross_minutes / 60.0, 1),
        CASE WHEN v_target_date = v_yesterday THEN ' for overnight shift' ELSE '' END
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_attendance_punch(numeric, numeric, numeric, text, text, jsonb) TO authenticated, service_role, anon;

NOTIFY pgrst, 'reload schema';
