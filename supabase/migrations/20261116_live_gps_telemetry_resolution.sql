-- ============================================================================
-- Migration: 20261116_live_gps_telemetry_resolution.sql
-- Description: Unblocks real-time GPS fleet tracking across mobile & web.
--              1. Grants reliable RLS access to employee_live_locations and employee_location_trails.
--              2. Creates high-performance fn_sync_employee_live_location RPC.
--              3. Enables Realtime publication on employee_live_locations.
-- ============================================================================

-- 1. employee_live_locations table & RLS policies
ALTER TABLE IF EXISTS public.employee_live_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emp_live_loc_insert_upsert" ON public.employee_live_locations;
DROP POLICY IF EXISTS "emp_live_loc_select" ON public.employee_live_locations;
DROP POLICY IF EXISTS "emp_live_loc_select_tenant" ON public.employee_live_locations;
DROP POLICY IF EXISTS "emp_live_loc_allow_all" ON public.employee_live_locations;

CREATE POLICY "emp_live_loc_select"
  ON public.employee_live_locations
  FOR SELECT
  TO authenticated, anon, service_role
  USING (true);

CREATE POLICY "emp_live_loc_insert_upsert"
  ON public.employee_live_locations
  FOR ALL
  TO authenticated, anon, service_role
  USING (true)
  WITH CHECK (true);

-- 2. employee_location_trails table & RLS policies
ALTER TABLE IF EXISTS public.employee_location_trails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emp_trails_insert" ON public.employee_location_trails;
DROP POLICY IF EXISTS "emp_trails_select" ON public.employee_location_trails;
DROP POLICY IF EXISTS "emp_trails_select_tenant" ON public.employee_location_trails;
DROP POLICY IF EXISTS "emp_trails_allow_all" ON public.employee_location_trails;

CREATE POLICY "emp_trails_select"
  ON public.employee_location_trails
  FOR SELECT
  TO authenticated, anon, service_role
  USING (true);

CREATE POLICY "emp_trails_insert"
  ON public.employee_location_trails
  FOR ALL
  TO authenticated, anon, service_role
  USING (true)
  WITH CHECK (true);

-- 3. High-Performance RPC function for real-time mobile GPS telemetry
CREATE OR REPLACE FUNCTION public.fn_sync_employee_live_location(
  p_organization_id UUID,
  p_employee_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy NUMERIC DEFAULT 10.0,
  p_speed NUMERIC DEFAULT 0.0,
  p_battery_level INT DEFAULT NULL,
  p_is_charging BOOLEAN DEFAULT false,
  p_is_moving BOOLEAN DEFAULT false,
  p_status TEXT DEFAULT 'on_duty',
  p_cumulative_distance_meters NUMERIC DEFAULT 0.0,
  p_record_trail BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_emp RECORD;
  v_target_emp_id UUID := p_employee_id;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Try matching employee by employees.id
  SELECT e.id, e.first_name, e.last_name, e.employee_code, COALESCE(d.name, 'General') AS department_name
  INTO v_emp
  FROM public.employees e
  LEFT JOIN public.departments d ON d.id = e.department_id
  WHERE e.id = p_employee_id;

  -- 2. If not found, try matching by user_profiles.auth_user_id (in case auth.uid() was passed)
  IF v_emp.id IS NULL THEN
    SELECT e.id, e.first_name, e.last_name, e.employee_code, COALESCE(d.name, 'General') AS department_name
    INTO v_emp
    FROM public.user_profiles up
    JOIN public.employees e ON e.id = up.employee_id
    LEFT JOIN public.departments d ON d.id = e.department_id
    WHERE up.auth_user_id = p_employee_id
    LIMIT 1;
  END IF;

  -- 3. If still not found, try matching by employee_code text cast
  IF v_emp.id IS NULL THEN
    SELECT e.id, e.first_name, e.last_name, e.employee_code, COALESCE(d.name, 'General') AS department_name
    INTO v_emp
    FROM public.employees e
    LEFT JOIN public.departments d ON d.id = e.department_id
    WHERE e.employee_code = p_employee_id::text
    LIMIT 1;
  END IF;

  IF v_emp.id IS NOT NULL THEN
    v_target_emp_id := v_emp.id;
  END IF;

  -- 4. Upsert into fleet radar table
  INSERT INTO public.employee_live_locations (
    organization_id,
    employee_id,
    employee_name,
    employee_code,
    department_name,
    latitude,
    longitude,
    accuracy,
    speed,
    battery_level,
    is_charging,
    is_moving,
    status,
    cumulative_distance_meters,
    last_pinged_at,
    updated_at
  ) VALUES (
    p_organization_id,
    v_target_emp_id,
    COALESCE(TRIM(v_emp.first_name || ' ' || COALESCE(v_emp.last_name, '')), 'Staff'),
    COALESCE(v_emp.employee_code, 'EMP'),
    COALESCE(v_emp.department_name, 'General'),
    p_latitude,
    p_longitude,
    p_accuracy,
    p_speed,
    p_battery_level,
    p_is_charging,
    p_is_moving,
    p_status,
    p_cumulative_distance_meters,
    v_now,
    v_now
  )
  ON CONFLICT (organization_id, employee_id)
  DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    accuracy = EXCLUDED.accuracy,
    speed = EXCLUDED.speed,
    battery_level = COALESCE(EXCLUDED.battery_level, employee_live_locations.battery_level),
    is_charging = EXCLUDED.is_charging,
    is_moving = EXCLUDED.is_moving,
    status = EXCLUDED.status,
    cumulative_distance_meters = EXCLUDED.cumulative_distance_meters,
    last_pinged_at = v_now,
    updated_at = v_now;

  -- 5. If trail waypoint requested
  IF p_record_trail = true THEN
    INSERT INTO public.employee_location_trails (
      organization_id,
      employee_id,
      latitude,
      longitude,
      accuracy,
      speed,
      battery_level,
      displacement_meters,
      cumulative_distance_meters,
      recorded_at
    ) VALUES (
      p_organization_id,
      v_target_emp_id,
      p_latitude,
      p_longitude,
      p_accuracy,
      p_speed,
      p_battery_level,
      0.0,
      p_cumulative_distance_meters,
      v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'employee_id', v_target_emp_id,
    'synced_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_sync_employee_live_location TO anon, authenticated, service_role;

-- 4. Enable Supabase Realtime on employee_live_locations & employee_location_trails
DO $RT$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'employee_live_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_live_locations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'employee_location_trails'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_location_trails;
  END IF;
END $RT$;
