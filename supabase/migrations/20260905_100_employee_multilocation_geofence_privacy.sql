-- supabase/migrations/20260905_100_employee_multilocation_geofence_privacy.sql
-- ============================================================================
-- Joy PeopleHR Enterprise — Multi-Location GPS Geofence Attendance & Employee Privacy
-- Authoritative server-side identity resolution, Haversine geofence, and overtime suppression
-- ============================================================================

BEGIN;

-- 1. Create employee_work_location_assignments table
CREATE TABLE IF NOT EXISTS public.employee_work_location_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_location_id UUID NOT NULL REFERENCES public.work_locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  attendance_allowed BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_employee_work_location UNIQUE (employee_id, work_location_id)
);

-- Index for high-performance assignment lookups
CREATE INDEX IF NOT EXISTS idx_emp_work_loc_lookup 
ON public.employee_work_location_assignments(employee_id, is_active, effective_from, effective_to);

-- 2. Alter attendance_punches to add rich geofence & verification columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_punches' AND column_name = 'work_location_id') THEN
    ALTER TABLE public.attendance_punches ADD COLUMN work_location_id UUID REFERENCES public.work_locations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_punches' AND column_name = 'distance_meters') THEN
    ALTER TABLE public.attendance_punches ADD COLUMN distance_meters NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_punches' AND column_name = 'location_authorized') THEN
    ALTER TABLE public.attendance_punches ADD COLUMN location_authorized BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_punches' AND column_name = 'unauthorized_checkout') THEN
    ALTER TABLE public.attendance_punches ADD COLUMN unauthorized_checkout BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_punches' AND column_name = 'unauthorized_checkout_reason') THEN
    ALTER TABLE public.attendance_punches ADD COLUMN unauthorized_checkout_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_punches' AND column_name = 'accuracy_meters') THEN
    ALTER TABLE public.attendance_punches ADD COLUMN accuracy_meters NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_punches' AND column_name = 'punch_source') THEN
    ALTER TABLE public.attendance_punches ADD COLUMN punch_source TEXT NOT NULL DEFAULT 'WEB';
  END IF;
END $$;

-- 3. Alter attendance_daily to add overtime eligibility & location tracking columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_daily' AND column_name = 'overtime_eligible') THEN
    ALTER TABLE public.attendance_daily ADD COLUMN overtime_eligible BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_daily' AND column_name = 'unauthorized_checkout') THEN
    ALTER TABLE public.attendance_daily ADD COLUMN unauthorized_checkout BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_daily' AND column_name = 'unauthorized_checkout_reason') THEN
    ALTER TABLE public.attendance_daily ADD COLUMN unauthorized_checkout_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_daily' AND column_name = 'check_in_work_location_id') THEN
    ALTER TABLE public.attendance_daily ADD COLUMN check_in_work_location_id UUID REFERENCES public.work_locations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_daily' AND column_name = 'check_out_work_location_id') THEN
    ALTER TABLE public.attendance_daily ADD COLUMN check_out_work_location_id UUID REFERENCES public.work_locations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_daily' AND column_name = 'check_in_location_name') THEN
    ALTER TABLE public.attendance_daily ADD COLUMN check_in_location_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_daily' AND column_name = 'check_out_location_name') THEN
    ALTER TABLE public.attendance_daily ADD COLUMN check_out_location_name TEXT;
  END IF;
END $$;

-- 4. Create authoritative Haversine distance function (meters)
CREATE OR REPLACE FUNCTION public.fn_calculate_haversine_distance(
  lat1 NUMERIC, 
  lon1 NUMERIC, 
  lat2 NUMERIC, 
  lon2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r CONSTANT NUMERIC := 6371000.0; -- Earth radius in meters
  phi1 NUMERIC;
  phi2 NUMERIC;
  delta_phi NUMERIC;
  delta_lambda NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;

  phi1 := radians(lat1);
  phi2 := radians(lat2);
  delta_phi := radians(lat2 - lat1);
  delta_lambda := radians(lon2 - lon1);

  a := sin(delta_phi / 2.0)^2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2.0)^2;
  c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));

  RETURN round(r * c, 1);
END;
$$;

-- 5. Helper function: get current authenticated employee id
CREATE OR REPLACE FUNCTION public.get_active_user_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    up.employee_id,
    (SELECT e.id FROM public.employees e WHERE e.user_id = up.id LIMIT 1),
    (SELECT e.id FROM public.employees e WHERE e.user_id = up.auth_user_id LIMIT 1)
  )
  FROM public.user_profiles up
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 6. RPC: Retrieve authenticated employee's active assigned work locations
CREATE OR REPLACE FUNCTION public.fn_get_my_assigned_work_locations()
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  name VARCHAR,
  address_line1 TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  geofence_radius_meters INTEGER,
  is_geofencing_enabled BOOLEAN,
  is_active BOOLEAN,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp_id UUID;
  v_org_id UUID;
  v_has_explicit_assignments BOOLEAN;
BEGIN
  v_emp_id := public.get_active_user_employee_id();
  v_org_id := public.get_active_user_org_id();

  IF v_emp_id IS NULL THEN
    -- If platform admin or no employee profile, return all active org locations
    RETURN QUERY
    SELECT 
      wl.id,
      wl.organization_id,
      wl.name,
      wl.address_line1,
      wl.latitude,
      wl.longitude,
      wl.geofence_radius_meters,
      wl.is_geofencing_enabled,
      wl.is_active,
      false AS is_primary
    FROM public.work_locations wl
    WHERE (v_org_id IS NULL OR wl.organization_id = v_org_id)
      AND wl.is_active = true
    ORDER BY wl.name;
    RETURN;
  END IF;

  -- Check if employee has explicit assignments
  SELECT EXISTS (
    SELECT 1 FROM public.employee_work_location_assignments a
    WHERE a.employee_id = v_emp_id 
      AND a.is_active = true
      AND a.attendance_allowed = true
      AND a.effective_from <= CURRENT_DATE
      AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
  ) INTO v_has_explicit_assignments;

  IF v_has_explicit_assignments THEN
    RETURN QUERY
    SELECT 
      wl.id,
      wl.organization_id,
      wl.name,
      wl.address_line1,
      wl.latitude,
      wl.longitude,
      wl.geofence_radius_meters,
      wl.is_geofencing_enabled,
      wl.is_active,
      a.is_primary
    FROM public.employee_work_location_assignments a
    JOIN public.work_locations wl ON a.work_location_id = wl.id
    WHERE a.employee_id = v_emp_id
      AND a.is_active = true
      AND a.attendance_allowed = true
      AND a.effective_from <= CURRENT_DATE
      AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
      AND wl.is_active = true
    ORDER BY a.is_primary DESC, wl.name ASC;
  ELSE
    -- Default: Fallback to all active locations belonging to employee's organization
    RETURN QUERY
    SELECT 
      wl.id,
      wl.organization_id,
      wl.name,
      wl.address_line1,
      wl.latitude,
      wl.longitude,
      wl.geofence_radius_meters,
      wl.is_geofencing_enabled,
      wl.is_active,
      false AS is_primary
    FROM public.work_locations wl
    JOIN public.employees e ON e.id = v_emp_id
    WHERE wl.organization_id = e.organization_id
      AND wl.is_active = true
    ORDER BY wl.name ASC;
  END IF;
END;
$$;

-- 7. Authoritative Server-Side GPS Punch & Overtime Invariant Engine
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
  IF v_normalized_type IN ('IN', 'CHECK_IN') THEN
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
      CASE WHEN v_is_inside THEN v_matched_dist ELSE v_nearest_dist END,
      v_is_inside,
      v_unauthorized_checkout,
      CASE WHEN v_unauthorized_checkout THEN TRIM(p_reason) ELSE NULL END,
      'WEB_GPS',
      true
    ) RETURNING id INTO v_saved_punch_id;

    -- Update daily record
    UPDATE public.attendance_daily
    SET
      last_check_out = v_now,
      total_work_minutes = v_gross_minutes,
      overtime_minutes = v_overtime_minutes,
      overtime_eligible = v_overtime_eligible,
      unauthorized_checkout = v_unauthorized_checkout,
      unauthorized_checkout_reason = CASE WHEN v_unauthorized_checkout THEN TRIM(p_reason) ELSE NULL END,
      check_out_work_location_id = v_matched_loc_id,
      check_out_location_name = CASE WHEN v_is_inside THEN v_matched_loc_name ELSE 'Off-Site / External Location' END,
      updated_at = v_now
    WHERE id = v_daily.id;

    -- Audit    -- If unauthorized checkout, create security audit trail log
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
      'daily_id', v_daily.id,
      'punch_type', 'OUT',
      'location_authorized', v_is_inside,
      'unauthorized_checkout', v_unauthorized_checkout,
      'unauthorized_checkout_reason', CASE WHEN v_unauthorized_checkout THEN TRIM(p_reason) ELSE NULL END,
      'overtime_eligible', v_overtime_eligible,
      'overtime_minutes', v_overtime_minutes,
      'total_work_minutes', v_net_minutes,
      'check_out_time', v_now,
      'message', CASE 
        WHEN v_unauthorized_checkout THEN 'Checkout recorded outside assigned location. Overtime for today is set to 0.'
        ELSE format('Checked out successfully at %s.', v_matched_loc_name)
      END
    );
  END IF;
END;
$$;

-- 8. Row Level Security Policies Configuration

-- Enable RLS on all related tables
ALTER TABLE public.employee_work_location_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_statutory_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- 8a. employee_work_location_assignments RLS
DROP POLICY IF EXISTS "Assignments Select Policy" ON public.employee_work_location_assignments;
CREATE POLICY "Assignments Select Policy" ON public.employee_work_location_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR employee_id = public.get_active_user_employee_id()
  );

DROP POLICY IF EXISTS "Assignments Admin Modify Policy" ON public.employee_work_location_assignments;
CREATE POLICY "Assignments Admin Modify Policy" ON public.employee_work_location_assignments
  FOR ALL TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- 8b. attendance_punches RLS
DROP POLICY IF EXISTS "attendance_punches_select" ON public.attendance_punches;
CREATE POLICY "attendance_punches_select" ON public.attendance_punches
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR employee_id = public.get_active_user_employee_id()
  );

DROP POLICY IF EXISTS "attendance_punches_admin_modify" ON public.attendance_punches;
CREATE POLICY "attendance_punches_admin_modify" ON public.attendance_punches
  FOR ALL TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- 8c. attendance_daily RLS
DROP POLICY IF EXISTS "attendance_daily_select" ON public.attendance_daily;
CREATE POLICY "attendance_daily_select" ON public.attendance_daily
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR employee_id = public.get_active_user_employee_id()
  );

DROP POLICY IF EXISTS "attendance_daily_admin_modify" ON public.attendance_daily;
CREATE POLICY "attendance_daily_admin_modify" ON public.attendance_daily
  FOR ALL TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- 8d. employees RLS
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
CREATE POLICY "employees_select_policy" ON public.employees
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR id = public.get_active_user_employee_id()
    OR user_id = auth.uid()
  );

-- 8e. employee_bank_details RLS
DROP POLICY IF EXISTS "employee_bank_details_select" ON public.employee_bank_details;
CREATE POLICY "employee_bank_details_select" ON public.employee_bank_details
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR employee_id = public.get_active_user_employee_id()
  );

-- 8f. employee_statutory_details RLS
DROP POLICY IF EXISTS "employee_statutory_details_select" ON public.employee_statutory_details;
CREATE POLICY "employee_statutory_details_select" ON public.employee_statutory_details
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR employee_id = public.get_active_user_employee_id()
  );

-- 8g. employee_documents RLS
DROP POLICY IF EXISTS "employee_documents_select" ON public.employee_documents;
CREATE POLICY "employee_documents_select" ON public.employee_documents
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR employee_id = public.get_active_user_employee_id()
  );

-- 8h. payslips RLS
DROP POLICY IF EXISTS "payslips_select" ON public.payslips;
CREATE POLICY "payslips_select" ON public.payslips
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR employee_id = public.get_active_user_employee_id()
  );

-- 8i. leave_requests RLS
DROP POLICY IF EXISTS "leave_requests_select" ON public.leave_requests;
CREATE POLICY "leave_requests_select" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR employee_id = public.get_active_user_employee_id()
  );

DROP POLICY IF EXISTS "leave_requests_insert" ON public.leave_requests;
CREATE POLICY "leave_requests_insert" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR employee_id = public.get_active_user_employee_id()
  );

COMMIT;
