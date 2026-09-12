-- ============================================================================
-- JOY PeopleHR — Migration 100
-- Server-Authoritative Attendance Processing Engine
-- Idempotently aggregates raw biometric and mobile punches into attendance_daily
-- ============================================================================

-- Function: Recalculate daily attendance for an employee and date
CREATE OR REPLACE FUNCTION public.fn_recalculate_daily_attendance(
    p_employee_id UUID,
    p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    v_res RECORD;
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
    ELSE
        -- Fallback to default organization shift
        SELECT * INTO v_shift FROM public.shifts WHERE organization_id = v_org_id AND is_active = true ORDER BY created_at ASC LIMIT 1;
        IF v_shift.id IS NOT NULL THEN
            v_shift_id := v_shift.id;
            v_min_half_day_mins := (v_shift.min_half_day_hours * 60)::INTEGER;
            v_min_full_day_mins := (v_shift.min_full_day_hours * 60)::INTEGER;
        END IF;
    END IF;

    -- 3. Fetch all punches for this employee on this attendance date (using Asia/Kolkata timezone standard)
    SELECT 
        MIN(punch_time),
        MAX(punch_time),
        COUNT(*)
    INTO 
        v_first_in,
        v_last_out,
        v_punch_count
    FROM public.attendance_punches
    WHERE employee_id = p_employee_id
      AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date;

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
            shift_id = EXCLUDED.shift_id,
            first_check_in = EXCLUDED.first_check_in,
            last_check_out = EXCLUDED.last_check_out,
            total_work_minutes = EXCLUDED.total_work_minutes,
            status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.status ELSE EXCLUDED.status END,
            payable_status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.payable_status ELSE EXCLUDED.payable_status END,
            updated_at = now();

        RETURN jsonb_build_object('success', true, 'status', 'ABSENT', 'date', p_date);
    END IF;

    -- 4. Calculate total work minutes
    IF v_punch_count > 1 AND v_last_out > v_first_in THEN
        v_total_work_mins := EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 60;
    ELSE
        -- Single punch (e.g. checked in this morning, day in progress)
        v_total_work_mins := 0;
        v_last_out := NULL;
    END IF;

    -- 5. Calculate Late Entry and Early Exit if shift timings exist
    IF v_shift.start_time IS NOT NULL THEN
        v_expected_in := (p_date || ' ' || v_shift.start_time)::TIMESTAMPTZ;
        IF v_first_in > (v_expected_in + (COALESCE(v_shift.grace_entry_minutes, 15) || ' minutes')::INTERVAL) THEN
            v_late_mins := GREATEST(0, (EXTRACT(EPOCH FROM (v_first_in - v_expected_in)) / 60)::INTEGER);
        END IF;
    END IF;

    IF v_shift.end_time IS NOT NULL AND v_last_out IS NOT NULL THEN
        v_expected_out := (p_date || ' ' || v_shift.end_time)::TIMESTAMPTZ;
        IF v_last_out < (v_expected_out - (COALESCE(v_shift.grace_exit_minutes, 15) || ' minutes')::INTERVAL) THEN
            v_early_mins := GREATEST(0, (EXTRACT(EPOCH FROM (v_expected_out - v_last_out)) / 60)::INTEGER);
        END IF;
    END IF;

    -- 6. Calculate Overtime (Beyond full day + 30m buffer)
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
        -- In progress check-in
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
        first_check_in = EXCLUDED.first_check_in,
        last_check_out = EXCLUDED.last_check_out,
        total_work_minutes = EXCLUDED.total_work_minutes,
        late_entry_minutes = EXCLUDED.late_entry_minutes,
        early_exit_minutes = EXCLUDED.early_exit_minutes,
        overtime_minutes = EXCLUDED.overtime_minutes,
        status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.status ELSE EXCLUDED.status END,
        payable_status = CASE WHEN public.attendance_daily.is_regularized THEN public.attendance_daily.payable_status ELSE EXCLUDED.payable_status END,
        updated_at = now();

    -- 9. Mark processed punches
    UPDATE public.attendance_punches
    SET is_processed = true
    WHERE employee_id = p_employee_id
      AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date
      AND is_processed = false;

    RETURN jsonb_build_object(
        'success', true,
        'employee_id', p_employee_id,
        'date', p_date,
        'status', v_status,
        'work_minutes', v_total_work_mins,
        'late_minutes', v_late_mins,
        'overtime_minutes', v_overtime_mins
    );
END;
$$;

-- Trigger Function: Process newly inserted punches automatically
CREATE OR REPLACE FUNCTION public.trg_fn_on_punch_recorded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_punch_date DATE;
BEGIN
    v_punch_date := (NEW.punch_time AT TIME ZONE 'Asia/Kolkata')::DATE;
    PERFORM public.fn_recalculate_daily_attendance(NEW.employee_id, v_punch_date);
    RETURN NEW;
END;
$$;

-- Attach trigger to attendance_punches
DROP TRIGGER IF EXISTS trg_auto_process_punch ON public.attendance_punches;
CREATE TRIGGER trg_auto_process_punch
AFTER INSERT OR UPDATE OF punch_time ON public.attendance_punches
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_on_punch_recorded();
