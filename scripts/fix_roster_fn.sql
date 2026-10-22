-- Fix return column types for fn_resolve_daily_shift_roster
DROP FUNCTION IF EXISTS public.fn_resolve_daily_shift_roster(UUID, UUID, DATE);

CREATE OR REPLACE FUNCTION public.fn_resolve_daily_shift_roster(
  p_org_id UUID,
  p_employee_id UUID,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  employee_id UUID,
  employee_code TEXT,
  employee_name TEXT,
  roster_date DATE,
  shift_id UUID,
  shift_code TEXT,
  shift_name TEXT,
  start_time TIME,
  end_time TIME,
  is_weekly_off BOOLEAN,
  is_holiday BOOLEAN,
  is_override BOOLEAN,
  assigned_by TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dow INTEGER;
  v_assign RECORD;
  v_roster RECORD;
  v_default_shift RECORD;
  v_emp RECORD;
  v_is_off BOOLEAN := FALSE;
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::INTEGER;

  -- 1. Check if an explicit roster entry already exists in shift_rosters
  SELECT 
    sr.id, sr.organization_id, sr.employee_id, sr.employee_code::TEXT, sr.employee_name::TEXT,
    sr.roster_date, sr.shift_id, sr.shift_code::TEXT, sr.shift_name::TEXT,
    s.start_time, s.end_time, sr.is_weekly_off, sr.is_holiday, sr.is_override, sr.assigned_by::TEXT
  INTO v_roster
  FROM public.shift_rosters sr
  JOIN public.shifts s ON s.id = sr.shift_id
  WHERE sr.organization_id = p_org_id
    AND sr.employee_id = p_employee_id
    AND sr.roster_date = p_date;

  IF FOUND THEN
    RETURN QUERY SELECT 
      v_roster.id, v_roster.organization_id, v_roster.employee_id, v_roster.employee_code, v_roster.employee_name,
      v_roster.roster_date, v_roster.shift_id, v_roster.shift_code, v_roster.shift_name,
      v_roster.start_time, v_roster.end_time, v_roster.is_weekly_off, v_roster.is_holiday, v_roster.is_override, v_roster.assigned_by;
    RETURN;
  END IF;

  -- 2. Fetch employee details
  SELECT e.id, e.employee_code::TEXT, TRIM(CONCAT(e.first_name, ' ', e.last_name))::TEXT AS emp_name
  INTO v_emp
  FROM public.employees e
  WHERE e.id = p_employee_id;

  -- 3. Fetch employee shift assignment
  SELECT 
    esa.shift_id,
    s.code::TEXT AS shift_code,
    s.name::TEXT AS shift_name,
    s.start_time,
    s.end_time,
    esa.weekly_offs
  INTO v_assign
  FROM public.employee_shift_assignments esa
  JOIN public.shifts s ON s.id = esa.shift_id
  WHERE esa.employee_id = p_employee_id
  ORDER BY esa.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_assign.weekly_offs IS NOT NULL AND v_dow = ANY(v_assign.weekly_offs) THEN
      v_is_off := TRUE;
    ELSE
      v_is_off := (v_dow = 0 OR v_dow = 6);
    END IF;

    RETURN QUERY SELECT
      gen_random_uuid(),
      p_org_id,
      p_employee_id,
      COALESCE(v_emp.employee_code, 'EMP')::TEXT,
      COALESCE(v_emp.emp_name, 'Employee')::TEXT,
      p_date,
      v_assign.shift_id,
      v_assign.shift_code,
      v_assign.shift_name,
      v_assign.start_time,
      v_assign.end_time,
      v_is_off,
      FALSE,
      FALSE,
      'Employee Default Shift Assignment'::TEXT;
    RETURN;
  END IF;

  -- 4. Fallback to organization default shift
  SELECT s.id, s.code::TEXT AS code, s.name::TEXT AS name, s.start_time, s.end_time
  INTO v_default_shift
  FROM public.shifts s
  WHERE s.organization_id = p_org_id AND s.is_active = TRUE
  ORDER BY (s.code = 'GEN-10' OR s.code = 'GEN-09') DESC, s.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT s.id, s.code::TEXT AS code, s.name::TEXT AS name, s.start_time, s.end_time
    INTO v_default_shift
    FROM public.shifts s
    WHERE s.is_active = TRUE
    LIMIT 1;
  END IF;

  v_is_off := (v_dow = 0 OR v_dow = 6);

  RETURN QUERY SELECT
    gen_random_uuid(),
    p_org_id,
    p_employee_id,
    COALESCE(v_emp.employee_code, 'EMP')::TEXT,
    COALESCE(v_emp.emp_name, 'Employee')::TEXT,
    p_date,
    COALESCE(v_default_shift.id, 'f847c561-4bbb-4b9f-a2dd-003162897eef'::uuid),
    COALESCE(v_default_shift.code, 'GEN-09')::TEXT,
    COALESCE(v_default_shift.name, 'General Day Shift (Corporate)')::TEXT,
    COALESCE(v_default_shift.start_time, '09:00:00'::time),
    COALESCE(v_default_shift.end_time, '18:00:00'::time),
    v_is_off,
    FALSE,
    FALSE,
    'System Auto-Roster Fallback'::TEXT;
END;
$$;
