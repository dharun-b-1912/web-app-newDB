-- ============================================================================
-- JOY PeopleHR — Migration 189: Hierarchical Notification Gateway &
-- Authoritative Attendance Event Routing (Deduplication + Recipient Hierarchy)
-- ============================================================================

-- 1. Ensure 'organization_attendance_master' permission exists in system permissions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permissions') THEN
    INSERT INTO public.permissions (code, name, module, action, description)
    VALUES (
      'organization_attendance_master',
      'Organization Attendance Master & Oversight',
      'attendance',
      'oversight',
      'Whole-organization attendance oversight, real-time check-in/out monitoring, and exception tracking within own organization'
    )
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- 2. Helper: Check if a user is an authorized attendance master within an organization
CREATE OR REPLACE FUNCTION public.is_organization_attendance_master(
  p_user_id uuid,
  p_org_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_has_access boolean := false;
BEGIN
  IF p_user_id IS NULL OR p_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check user_profiles for HR_HEAD, COMPANY_ADMIN, or explicit attendance master role
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE (up.id = p_user_id OR up.auth_user_id = p_user_id)
      AND up.organization_id = p_org_id
      AND up.status = 'ACTIVE'
      AND UPPER(COALESCE(up.role, '')) IN ('HR_HEAD', 'COMPANY_ADMIN', 'HR_ADMIN', 'ATTENDANCE_MASTER')
  ) INTO v_has_access;

  IF v_has_access THEN
    RETURN true;
  END IF;

  -- Check explicit role_permissions or user_permissions if present
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_permissions') THEN
    EXECUTE '
      SELECT EXISTS (
        SELECT 1
        FROM public.user_permissions upm
        JOIN public.permissions p ON p.id = upm.permission_id
        WHERE upm.user_id = $1
          AND upm.organization_id = $2
          AND p.code = ''organization_attendance_master''
      )'
      INTO v_has_access
      USING p_user_id, p_org_id;
  END IF;

  RETURN COALESCE(v_has_access, false);
END;
$$;

-- 3. Upgrade Authoritative Attendance Trigger Function: trg_fn_notify_daily_attendance
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
BEGIN
  -- Strict Tenant Validation: organization_id must be present
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

    -- [A] EMPLOYEE: Self Check-In Confirmation (Strictly personal to the employee)
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

    -- [B] REPORTING MANAGER: Direct Report Check-In Notice (Only assigned manager)
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

    -- [C] HR MASTER: Organization-wide oversight for designated HR Master users (opt-in)
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
    v_net_mins := COALESCE(NEW.net_payable_minutes, 0);

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
        v_emp_name || ' (' || v_emp_code || ') checked out at ' || v_time_str || '. Net payable: ' || (v_net_mins / 60)::text || 'h ' || (v_net_mins % 60)::text || 'm.',
        '/attendance?emp=' || NEW.employee_id::text || '&date=' || NEW.attendance_date::text,
        jsonb_build_object('route', 'attendance', 'employee_id', NEW.employee_id, 'date', NEW.attendance_date, 'event', 'CHECK_OUT'),
        false
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Re-attach trigger on public.attendance_daily
DROP TRIGGER IF EXISTS trg_notify_daily_attendance ON public.attendance_daily;
CREATE TRIGGER trg_notify_daily_attendance
  AFTER INSERT OR UPDATE OF first_check_in, last_check_out
  ON public.attendance_daily
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_notify_daily_attendance();

-- 5. Deduplicate recent duplicate attendance notifications in notification_events
DELETE FROM public.notification_events ne1
WHERE ne1.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY organization_id, recipient_user_id, title, (created_at::date)
             ORDER BY created_at ASC
           ) as rn
    FROM public.notification_events
    WHERE title ILIKE '%Checked In%'
       OR title ILIKE '%Checked Out%'
       OR title ILIKE '%Biometric Check-%'
  ) ranked
  WHERE ranked.rn > 1
);

