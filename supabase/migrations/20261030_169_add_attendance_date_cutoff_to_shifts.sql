-- ============================================================================
-- JOY PeopleHR — Migration 169
-- Dynamic Attendance Cutoff Configuration for Shifts
-- 
-- Description:
-- 1. Adds 'attendance_date_cutoff' column (TIME) to public.shifts.
-- 2. Sets standard defaults: '12:00:00' for cross-midnight overnight shifts (NS-01)
--    and '06:00:00' for standard daytime shifts.
-- 3. Enhances public.fn_determine_attendance_session_date:
--    - Replaces hardcoded hour thresholds with dynamic per-shift cutoff (s.attendance_date_cutoff).
--    - Next-day morning checkouts before the cutoff dynamically close yesterday's overnight session.
-- 4. Notifies PostgREST to reload the schema cache.
-- ============================================================================

-- 1. Add attendance_date_cutoff column to public.shifts if not exists
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS attendance_date_cutoff TIME DEFAULT '12:00:00';

COMMENT ON COLUMN public.shifts.attendance_date_cutoff IS 
'Morning cutoff time for cross-midnight shifts. Morning punches before this cutoff on Day+1 are attributed to Day session.';

-- 2. Initialize default values for existing shifts
UPDATE public.shifts
SET attendance_date_cutoff = '12:00:00',
    updated_at = now()
WHERE is_overnight = true 
   OR code = 'NS-01' 
   OR (end_time IS NOT NULL AND start_time IS NOT NULL AND end_time < start_time);

UPDATE public.shifts
SET attendance_date_cutoff = '06:00:00',
    updated_at = now()
WHERE is_overnight = false 
  AND (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
  AND (attendance_date_cutoff IS NULL OR attendance_date_cutoff = '12:00:00');

-- 3. Enhance public.fn_determine_attendance_session_date with dynamic cutoff
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
    v_norm_type TEXT;
    
    -- Yesterday daily record & shift
    v_y_daily RECORD;
    v_y_shift RECORD;
    v_is_y_overnight BOOLEAN := false;
    v_cutoff TIME;
BEGIN
    -- Normalize punch time to Asia/Kolkata
    v_ist_timestamp := p_punch_time AT TIME ZONE 'Asia/Kolkata';
    v_punch_date := v_ist_timestamp::DATE;
    v_punch_time_only := v_ist_timestamp::TIME;
    v_yesterday := (v_ist_timestamp - INTERVAL '1 day')::DATE;
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

        -- Read dynamic cutoff from shift or default to 12:00:00
        v_cutoff := COALESCE(v_y_shift.attendance_date_cutoff, TIME '12:00:00');

        -- If yesterday was overnight, and punch occurs before the cutoff or is explicit OUT/CHECK_OUT,
        -- attribute it to yesterday's night shift session!
        IF v_is_y_overnight AND (v_norm_type IN ('OUT', 'CHECK_OUT') OR v_punch_time_only <= v_cutoff) THEN
            RETURN v_yesterday;
        END IF;
    END IF;

    -- 2. If no open session, but punch is a morning checkout
    IF v_norm_type IN ('OUT', 'CHECK_OUT') THEN
        SELECT s.* INTO v_y_shift
        FROM public.employee_shift_assignments esa
        JOIN public.shifts s ON s.id = esa.shift_id
        WHERE esa.employee_id = p_employee_id
          AND esa.valid_from <= v_yesterday
          AND (esa.valid_to IS NULL OR esa.valid_to >= v_yesterday)
        ORDER BY esa.valid_from DESC
        LIMIT 1;

        v_cutoff := COALESCE(v_y_shift.attendance_date_cutoff, TIME '12:00:00');

        IF v_y_shift.id IS NOT NULL 
           AND (v_y_shift.is_overnight = true OR v_y_shift.end_time < v_y_shift.start_time)
           AND v_punch_time_only <= v_cutoff THEN
            RETURN v_yesterday;
        END IF;
    END IF;

    -- 3. Late check-in for overnight shift (punch IN before 04:00 AM IST)
    IF v_norm_type IN ('IN', 'CHECK_IN') AND v_punch_time_only < TIME '04:00:00' THEN
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

    -- Default: Punch belongs to today's date
    RETURN v_punch_date;
END;
$$;

-- 4. Reload PostgREST schema cache so client immediately recognizes the new column
NOTIFY pgrst, 'reload schema';
