-- Drop and recreate punch_type constraint on attendance_punches
ALTER TABLE public.attendance_punches DROP CONSTRAINT IF EXISTS attendance_punches_punch_type_check;
ALTER TABLE public.attendance_punches ADD CONSTRAINT attendance_punches_punch_type_check 
  CHECK (punch_type IN ('IN', 'OUT', 'CHECK_IN', 'CHECK_OUT', 'AUTO'));

-- Re-create fn_record_attendance_punch with correct audit_logs schema
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
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_profile_id UUID;
  v_emp_id UUID;
  v_org_id UUID;
  v_company_id UUID;
  v_emp_name TEXT;
  v_normalized_type TEXT;
  v_db_punch_type TEXT;
  v_today DATE := CURRENT_DATE;
  v_now TIMESTAMPTZ := NOW();
  
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
  v_first_in TIMESTAMPTZ;
  v_last_out TIMESTAMPTZ;
  v_gross_minutes INTEGER := 0;
  v_net_minutes INTEGER := 0;
  v_overtime_minutes INTEGER := 0;
  v_late_minutes INTEGER := 0;
  v_early_minutes INTEGER := 0;
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

  IF v_normalized_type IN ('IN', 'CHECK_IN') THEN
    v_db_punch_type := 'IN';
  ELSE
    v_db_punch_type := 'OUT';
  END IF;

  -- 2. Evaluate GPS coordinates against assigned active work locations
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
  END IF;

  -- 3. CHECK-IN RULES: Strict Geofence Enforcement
  IF v_db_punch_type = 'IN' THEN
    IF NOT v_is_inside THEN
      IF v_nearest_loc_name IS NOT NULL THEN
        RAISE EXCEPTION 'Check-in blocked: You are outside your assigned work locations. Nearest location: % (% m away).', 
          v_nearest_loc_name, v_nearest_dist;
      ELSE
        RAISE EXCEPTION 'Check-in blocked: No active assigned work locations with valid GPS coordinates found for your profile.';
      END IF;
    END IF;

    -- Prevent duplicate rapid check-ins
    SELECT * INTO v_daily 
    FROM public.attendance_daily 
    WHERE employee_id = v_emp_id AND attendance_date = v_today;

    IF v_daily.first_check_in IS NOT NULL AND v_daily.last_check_out IS NULL THEN
      RAISE EXCEPTION 'You are already checked in for today.';
    END IF;

    -- Record IN punch
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
      true,
      false,
      NULL,
      'WEB_GPS',
      true
    ) RETURNING id INTO v_saved_punch_id;

    -- Upsert daily record
    INSERT INTO public.attendance_daily (
      organization_id,
      employee_id,
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
      v_matched_loc_name,
      false,
      v_now,
      v_now
    )
    ON CONFLICT (employee_id, attendance_date) 
    DO UPDATE SET
      first_check_in = COALESCE(public.attendance_daily.first_check_in, EXCLUDED.first_check_in),
      status = 'PRESENT'::public.attendance_status_enum,
      check_in_work_location_id = EXCLUDED.check_in_work_location_id,
      check_in_location_name = EXCLUDED.check_in_location_name,
      updated_at = v_now
    RETURNING id INTO v_saved_daily_id;

    RETURN jsonb_build_object(
      'success', true,
      'punch_id', v_saved_punch_id,
      'daily_id', v_saved_daily_id,
      'punch_type', 'IN',
      'location_authorized', true,
      'location_name', v_matched_loc_name,
      'distance_meters', v_matched_dist,
      'check_in_time', v_now,
      'message', format('Checked in successfully at %s (%s m from center).', v_matched_loc_name, v_matched_dist)
    );

  -- 4. CHECK-OUT RULES: Outside Allowed With Mandatory Reason & Overtime Suppression
  ELSE
    -- Check if open check-in session exists
    SELECT * INTO v_daily 
    FROM public.attendance_daily 
    WHERE employee_id = v_emp_id AND attendance_date = v_today;

    IF v_daily.id IS NULL OR v_daily.first_check_in IS NULL THEN
      RAISE EXCEPTION 'No active check-in found for today. Please check in first.';
    END IF;

    IF NOT v_is_inside THEN
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

    -- Calculate total duration
    v_first_in := v_daily.first_check_in;
    v_last_out := v_now;
    v_gross_minutes := GREATEST(0, EXTRACT(EPOCH FROM (v_last_out - v_first_in))::INTEGER / 60);
    v_net_minutes := v_gross_minutes;

    -- Calculate overtime: only eligible if NOT an unauthorized checkout
    IF v_overtime_eligible AND v_net_minutes > 480 THEN
      v_overtime_minutes := v_net_minutes - 480;
    ELSE
      v_overtime_minutes := 0;
    END IF;

    -- Record OUT punch
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
      v_matched_dist,
      v_is_inside,
      v_unauthorized_checkout,
      CASE WHEN v_unauthorized_checkout THEN TRIM(p_reason) ELSE NULL END,
      'WEB_GPS',
      true
    ) RETURNING id INTO v_saved_punch_id;

    -- Update daily record
    UPDATE public.attendance_daily
    SET
      last_check_out = v_last_out,
      total_work_minutes = v_net_minutes,
      overtime_minutes = v_overtime_minutes,
      overtime_eligible = v_overtime_eligible,
      unauthorized_checkout = v_unauthorized_checkout,
      unauthorized_checkout_reason = CASE WHEN v_unauthorized_checkout THEN TRIM(p_reason) ELSE attendance_daily.unauthorized_checkout_reason END,
      check_out_work_location_id = v_matched_loc_id,
      check_out_location_name = COALESCE(v_matched_loc_name, 'Outside Work Locations'),
      updated_at = v_now
    WHERE id = v_daily.id
    RETURNING id INTO v_saved_daily_id;

    -- If unauthorized checkout, create security audit trail log
    IF v_unauthorized_checkout THEN
      INSERT INTO public.audit_logs (
        organization_id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_values
      ) VALUES (
        v_org_id,
        v_user_profile_id,
        'ATTENDANCE_UNAUTHORIZED_CHECKOUT',
        'employees',
        v_emp_id,
        jsonb_build_object(
          'employee_id', v_emp_id,
          'employee_name', v_emp_name,
          'punch_id', v_saved_punch_id,
          'daily_id', v_saved_daily_id,
          'latitude', p_latitude,
          'longitude', p_longitude,
          'reason', TRIM(p_reason),
          'overtime_suppressed', true,
          'timestamp', v_now
        )
      );
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'punch_id', v_saved_punch_id,
      'daily_id', v_saved_daily_id,
      'punch_type', 'OUT',
      'location_authorized', v_is_inside,
      'location_name', COALESCE(v_matched_loc_name, 'Outside Work Locations'),
      'distance_meters', v_matched_dist,
      'unauthorized_checkout', v_unauthorized_checkout,
      'unauthorized_reason', CASE WHEN v_unauthorized_checkout THEN TRIM(p_reason) ELSE NULL END,
      'total_work_minutes', v_net_minutes,
      'overtime_minutes', v_overtime_minutes,
      'overtime_eligible', v_overtime_eligible,
      'check_out_time', v_last_out,
      'message', CASE 
        WHEN v_unauthorized_checkout THEN format('Checked out outside assigned locations. Reason recorded. Overtime set to 0.')
        ELSE format('Checked out successfully at %s (%s m from center).', v_matched_loc_name, v_matched_dist)
      END
    );
  END IF;
END;
$$;
