-- ============================================================================
-- JOY PeopleHR — Migration 190: Electra EV Biometric Attendance, Break Policy & SMS Isolation
-- Organization: Electra EV (c5ab6b03-adde-47cc-a033-064f4c39b21e)
-- ============================================================================

-- Step 1: Add Biometric SMS suppression flag to public.organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS biometric_attendance_sms_enabled BOOLEAN DEFAULT true;

-- Step 2: Explicitly disable Biometric SMS for Electra EV (In-App + Mobile Push only)
UPDATE public.organizations
SET biometric_attendance_sms_enabled = false
WHERE id = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';

-- Step 3: Configure Electra EV Shifts with strict 4-minute Grace Period
UPDATE public.shifts
SET grace_entry_minutes = 4,
    grace_exit_minutes = 4,
    updated_at = NOW()
WHERE organization_id = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';

-- Step 4: Seed Authoritative Break Policy for Electra EV
INSERT INTO public.break_policies (
  id,
  organization_id,
  policy_name,
  scope_type,
  precedence_rank,
  automatic_break_minutes,
  automatic_break_after_hours,
  mandatory_breaks,
  paid_break_allowance_minutes,
  max_unpaid_break_minutes,
  max_daily_break_minutes,
  max_breaks_per_day,
  grace_period_minutes,
  core_hours_start,
  core_hours_end,
  breaks_prohibited_in_core_hours,
  require_approval_on_exceed,
  categories,
  version,
  effective_from,
  status,
  is_default,
  created_at,
  updated_at
) VALUES (
  'e0b3c419-7432-4d1a-8e2b-f1a23890c001',
  'c5ab6b03-adde-47cc-a033-064f4c39b21e',
  'Electra EV Plant Biometric Break Policy',
  'ORGANIZATION',
  10,
  30,
  5,
  true,
  30, -- 15m Morning Tea + 15m Evening Tea
  45, -- 45m Lunch
  75, -- 75m Total Daily Max
  4,
  4,  -- 4-minute Grace Period
  '10:00',
  '16:00',
  false,
  true,
  '[
    {
      "code": "TEA_MORNING",
      "label": "Morning Tea Break",
      "enabled": true,
      "is_paid": true,
      "max_occurrences": 1,
      "max_duration_minutes": 15,
      "grace_period_minutes": 4,
      "min_interval_minutes": 90,
      "requires_approval": false,
      "exception_on_exceed": true
    },
    {
      "code": "LUNCH",
      "label": "Lunch Break",
      "enabled": true,
      "is_paid": false,
      "max_occurrences": 1,
      "max_duration_minutes": 45,
      "grace_period_minutes": 4,
      "min_interval_minutes": 120,
      "requires_approval": false,
      "exception_on_exceed": true
    },
    {
      "code": "TEA_EVENING",
      "label": "Evening Tea Break",
      "enabled": true,
      "is_paid": true,
      "max_occurrences": 1,
      "max_duration_minutes": 15,
      "grace_period_minutes": 4,
      "min_interval_minutes": 90,
      "requires_approval": false,
      "exception_on_exceed": true
    },
    {
      "code": "PERSONAL",
      "label": "Personal Break",
      "enabled": true,
      "is_paid": false,
      "max_occurrences": 2,
      "max_duration_minutes": 20,
      "grace_period_minutes": 4,
      "min_interval_minutes": 60,
      "requires_approval": true,
      "exception_on_exceed": true
    }
  ]'::jsonb,
  1,
  '2026-01-01',
  'ACTIVE',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  grace_period_minutes = 4,
  max_daily_break_minutes = 75,
  paid_break_allowance_minutes = 30,
  max_unpaid_break_minutes = 45,
  categories = EXCLUDED.categories,
  status = 'ACTIVE',
  is_default = true,
  updated_at = NOW();

-- Step 5: Associate all 171 Electra EV factory workers to Joy Manpower Services Vendor
UPDATE public.employees
SET vendor_id = 'efa06c62-4197-4c85-93eb-6d490dfd4302',
    employment_type = 'CONTRACT',
    updated_at = NOW()
WHERE organization_id = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';

-- Step 6: Extend trg_fn_notify_daily_attendance to handle Late Arrival alerts
CREATE OR REPLACE FUNCTION public.trg_fn_notify_daily_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emp_user_id uuid;
  v_emp_name text;
  v_emp_code text;
  v_mgr_user_id uuid;
  v_time_str text;
  v_hr_rec record;
  v_net_mins integer;
  v_shift_start time;
  v_grace_mins integer;
  v_punch_time time;
  v_late_mins integer;
  v_shift_start_str text;
BEGIN
  -- Strict Tenant Validation
  IF NEW.organization_id IS NULL OR NEW.employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch employee identity and direct reporting manager identity
  SELECT e.user_id,
         COALESCE(NULLIF(e.display_name, ''), TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')), e.employee_code, 'Employee'),
         COALESCE(e.employee_code, ''),
         mgr.user_id
    INTO v_emp_user_id, v_emp_name, v_emp_code, v_mgr_user_id
  FROM public.employees e
  LEFT JOIN public.employees mgr ON mgr.id = e.reporting_manager_id
  WHERE e.id = NEW.employee_id
    AND e.organization_id = NEW.organization_id;

  -- --------------------------------------------------------------------------
  -- EVENT: FIRST CHECK-IN OF THE DAY
  -- --------------------------------------------------------------------------
  IF NEW.first_check_in IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.first_check_in IS NULL) THEN
    v_time_str := TO_CHAR(NEW.first_check_in AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');

    -- [A] EMPLOYEE: Self Check-In Confirmation
    IF v_emp_user_id IS NOT NULL THEN
      PERFORM public.enqueue_attendance_break_notification(
        NEW.organization_id,
        'attn_self_' || NEW.organization_id::text || '_' || NEW.employee_id::text || '_' || NEW.attendance_date::text || '_IN',
        'CHECK_IN_CONFIRMED',
        'ATTENDANCE',
        v_emp_user_id,
        NEW.employee_id,
        NEW.attendance_date,
        NULL,
        NULL,
        'Checked In Successfully',
        'Your attendance check-in was recorded at ' || v_time_str || '.',
        '/attendance',
        jsonb_build_object('route', 'attendance', 'date', NEW.attendance_date, 'event', 'CHECK_IN'),
        false
      );
    END IF;

    -- [B] REPORTING MANAGER: Direct Report Check-In Notice
    IF v_mgr_user_id IS NOT NULL AND v_mgr_user_id <> v_emp_user_id THEN
      PERFORM public.enqueue_attendance_break_notification(
        NEW.organization_id,
        'attn_mgr_' || NEW.organization_id::text || '_' || v_mgr_user_id::text || '_' || NEW.employee_id::text || '_' || NEW.attendance_date::text || '_IN',
        'EMPLOYEE_CHECKED_IN',
        'ATTENDANCE',
        v_mgr_user_id,
        NEW.employee_id,
        NEW.attendance_date,
        NULL,
        NULL,
        '🟢 ' || v_emp_name || ' Checked In',
        v_emp_name || ' (' || v_emp_code || ') checked in at ' || v_time_str || '.',
        '/attendance?emp=' || NEW.employee_id::text || '&date=' || NEW.attendance_date::text,
        jsonb_build_object('route', 'attendance', 'employee_id', NEW.employee_id, 'date', NEW.attendance_date, 'event', 'CHECK_IN'),
        false
      );
    END IF;

    -- [C] LATE ARRIVAL EVALUATION (Using Shift Start + Grace Period)
    SELECT s.start_time, COALESCE(s.grace_entry_minutes, 4)
      INTO v_shift_start, v_grace_mins
    FROM public.employee_shift_assignments esa
    JOIN public.shifts s ON s.id = esa.shift_id
    WHERE esa.employee_id = NEW.employee_id
      AND esa.organization_id = NEW.organization_id
    LIMIT 1;

    -- Fallback to default shift for org if not explicitly assigned
    IF v_shift_start IS NULL THEN
      SELECT s.start_time, COALESCE(s.grace_entry_minutes, 4)
        INTO v_shift_start, v_grace_mins
      FROM public.shifts s
      WHERE s.organization_id = NEW.organization_id
        AND s.is_active = true
      ORDER BY s.created_at ASC
      LIMIT 1;
    END IF;

    IF v_shift_start IS NOT NULL THEN
      v_punch_time := (NEW.first_check_in AT TIME ZONE 'Asia/Kolkata')::time;
      -- If punch time exceeds shift_start + grace_mins
      IF v_punch_time > (v_shift_start + (v_grace_mins || ' minutes')::interval) THEN
        v_late_mins := ROUND(EXTRACT(EPOCH FROM (v_punch_time - v_shift_start)) / 60);
        v_shift_start_str := TO_CHAR(v_shift_start, 'HH12:MI AM');

        -- Update attendance_daily late_entry_minutes
        NEW.late_entry_minutes := v_late_mins;

        -- [C1] Late alert to Employee
        IF v_emp_user_id IS NOT NULL THEN
          PERFORM public.enqueue_attendance_break_notification(
            NEW.organization_id,
            'attn_late_emp_' || NEW.organization_id::text || '_' || NEW.employee_id::text || '_' || NEW.attendance_date::text,
            'LATE_ARRIVAL_NOTICE',
            'ATTENDANCE',
            v_emp_user_id,
            NEW.employee_id,
            NEW.attendance_date,
            NULL,
            NULL,
            '⚠️ Late Arrival Recorded',
            'You checked in at ' || v_time_str || ', which is ' || v_late_mins::text || ' minutes after scheduled shift start (' || v_shift_start_str || '). Grace period: ' || v_grace_mins::text || ' mins.',
            '/attendance',
            jsonb_build_object('route', 'attendance', 'date', NEW.attendance_date, 'event', 'LATE_ARRIVAL', 'late_mins', v_late_mins),
            false
          );
        END IF;

        -- [C2] Late alert to Reporting Manager
        IF v_mgr_user_id IS NOT NULL AND v_mgr_user_id <> v_emp_user_id THEN
          PERFORM public.enqueue_attendance_break_notification(
            NEW.organization_id,
            'attn_late_mgr_' || NEW.organization_id::text || '_' || v_mgr_user_id::text || '_' || NEW.employee_id::text || '_' || NEW.attendance_date::text,
            'EMPLOYEE_LATE_ALERT',
            'ATTENDANCE',
            v_mgr_user_id,
            NEW.employee_id,
            NEW.attendance_date,
            NULL,
            NULL,
            '⚠️ Late Arrival: ' || v_emp_name,
            v_emp_name || ' (' || v_emp_code || ') checked in at ' || v_time_str || ' (' || v_late_mins::text || 'm late past ' || v_shift_start_str || ').',
            '/attendance?emp=' || NEW.employee_id::text || '&date=' || NEW.attendance_date::text,
            jsonb_build_object('route', 'attendance', 'employee_id', NEW.employee_id, 'date', NEW.attendance_date, 'event', 'LATE_ARRIVAL', 'late_mins', v_late_mins),
            false
          );
        END IF;
      END IF;
    END IF;

    -- [D] HR MASTER: Organization-wide oversight for designated HR Master users (opt-in)
    FOR v_hr_rec IN
      SELECT DISTINCT up.id AS target_uid
      FROM public.user_profiles up
      WHERE up.organization_id = NEW.organization_id
        AND up.status = 'ACTIVE'
        AND UPPER(COALESCE(up.role, '')) IN ('HR_HEAD', 'COMPANY_ADMIN', 'ATTENDANCE_MASTER')
        AND COALESCE(up.auth_user_id, up.id) NOT IN (COALESCE(v_emp_user_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(v_mgr_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
        AND public.is_notification_channel_enabled(up.id, 'ORGANIZATION_ATTENDANCE', 'IN_APP', false)
    LOOP
      PERFORM public.enqueue_attendance_break_notification(
        NEW.organization_id,
        'attn_hr_' || NEW.organization_id::text || '_' || v_hr_rec.target_uid::text || '_' || NEW.employee_id::text || '_' || NEW.attendance_date::text || '_IN',
        'ORGANIZATION_ATTENDANCE_EVENT',
        'ORGANIZATION_ATTENDANCE',
        v_hr_rec.target_uid,
        NEW.employee_id,
        NEW.attendance_date,
        NULL,
        NULL,
        'Workforce Check-In: ' || v_emp_name,
        v_emp_name || ' (' || v_emp_code || ') checked in at ' || v_time_str || '.',
        '/attendance?emp=' || NEW.employee_id::text || '&date=' || NEW.attendance_date::text,
        jsonb_build_object('route', 'attendance', 'employee_id', NEW.employee_id, 'date', NEW.attendance_date, 'scope', 'ORGANIZATION'),
        false
      );
    END LOOP;
  END IF;

  -- --------------------------------------------------------------------------
  -- EVENT: SHIFT CHECK-OUT
  -- --------------------------------------------------------------------------
  IF NEW.last_check_out IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.last_check_out IS NULL OR OLD.last_check_out <> NEW.last_check_out) THEN
    v_time_str := TO_CHAR(NEW.last_check_out AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
    v_net_mins := COALESCE(NEW.net_payable_minutes, NEW.total_work_minutes, 0);

    -- [A] EMPLOYEE: Self Check-Out Confirmation
    IF v_emp_user_id IS NOT NULL THEN
      PERFORM public.enqueue_attendance_break_notification(
        NEW.organization_id,
        'attn_self_' || NEW.organization_id::text || '_' || NEW.employee_id::text || '_' || NEW.attendance_date::text || '_OUT',
        'CHECK_OUT_CONFIRMED',
        'ATTENDANCE',
        v_emp_user_id,
        NEW.employee_id,
        NEW.attendance_date,
        NULL,
        NULL,
        'Checked Out Successfully',
        'Your shift check-out was recorded at ' || v_time_str || '. Net duration: ' || (v_net_mins / 60)::text || 'h ' || (v_net_mins % 60)::text || 'm.',
        '/attendance',
        jsonb_build_object('route', 'attendance', 'date', NEW.attendance_date, 'event', 'CHECK_OUT'),
        false
      );
    END IF;

    -- [B] REPORTING MANAGER: Direct Report Check-Out Notice
    IF v_mgr_user_id IS NOT NULL AND v_mgr_user_id <> v_emp_user_id THEN
      PERFORM public.enqueue_attendance_break_notification(
        NEW.organization_id,
        'attn_mgr_' || NEW.organization_id::text || '_' || v_mgr_user_id::text || '_' || NEW.employee_id::text || '_' || NEW.attendance_date::text || '_OUT',
        'EMPLOYEE_CHECKED_OUT',
        'ATTENDANCE',
        v_mgr_user_id,
        NEW.employee_id,
        NEW.attendance_date,
        NULL,
        NULL,
        '👋 ' || v_emp_name || ' Checked Out',
        v_emp_name || ' (' || v_emp_code || ') checked out at ' || v_time_str || '. Net duration: ' || (v_net_mins / 60)::text || 'h ' || (v_net_mins % 60)::text || 'm.',
        '/attendance?emp=' || NEW.employee_id::text || '&date=' || NEW.attendance_date::text,
        jsonb_build_object('route', 'attendance', 'employee_id', NEW.employee_id, 'date', NEW.attendance_date, 'event', 'CHECK_OUT'),
        false
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

