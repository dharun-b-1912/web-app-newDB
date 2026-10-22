-- Stored procedure for multi-tenant bulk roster assignment in PostgreSQL
CREATE OR REPLACE FUNCTION public.fn_bulk_assign_shift_roster(
  p_org_id UUID,
  p_company_id UUID,
  p_employee_ids UUID[],
  p_start_date DATE,
  p_end_date DATE,
  p_shift_id UUID,
  p_weekly_off_days INTEGER[] DEFAULT ARRAY[0, 6],
  p_assigned_by TEXT DEFAULT 'HR Admin'
)
RETURNS TABLE (
  assigned_count INTEGER,
  success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift RECORD;
  v_emp RECORD;
  v_curr_date DATE;
  v_emp_id UUID;
  v_dow INTEGER;
  v_is_off BOOLEAN;
  v_count INTEGER := 0;
BEGIN
  -- Fetch shift details
  SELECT s.id, s.code, s.name INTO v_shift
  FROM public.shifts s
  WHERE s.id = p_shift_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift with ID % not found', p_shift_id;
  END IF;

  FOREACH v_emp_id IN ARRAY p_employee_ids
  LOOP
    -- Fetch employee info
    SELECT e.employee_code, TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS emp_name
    INTO v_emp
    FROM public.employees e
    WHERE e.id = v_emp_id;

    v_curr_date := p_start_date;
    WHILE v_curr_date <= p_end_date
    LOOP
      v_dow := EXTRACT(DOW FROM v_curr_date)::INTEGER;
      v_is_off := (p_weekly_off_days IS NOT NULL AND v_dow = ANY(p_weekly_off_days));

      INSERT INTO public.shift_rosters (
        organization_id,
        company_id,
        employee_id,
        employee_code,
        employee_name,
        roster_date,
        shift_id,
        shift_code,
        shift_name,
        is_weekly_off,
        is_holiday,
        is_override,
        assigned_by,
        updated_at
      )
      VALUES (
        p_org_id,
        p_company_id,
        v_emp_id,
        COALESCE(v_emp.employee_code, 'EMP'),
        COALESCE(v_emp.emp_name, 'Employee'),
        v_curr_date,
        v_shift.id,
        v_shift.code,
        v_shift.name,
        v_is_off,
        FALSE,
        TRUE,
        p_assigned_by,
        NOW()
      )
      ON CONFLICT (organization_id, employee_id, roster_date)
      DO UPDATE SET
        shift_id = EXCLUDED.shift_id,
        shift_code = EXCLUDED.shift_code,
        shift_name = EXCLUDED.shift_name,
        is_weekly_off = EXCLUDED.is_weekly_off,
        is_override = TRUE,
        assigned_by = EXCLUDED.assigned_by,
        updated_at = NOW();

      v_count := v_count + 1;
      v_curr_date := v_curr_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_count, TRUE;
END;
$$;
