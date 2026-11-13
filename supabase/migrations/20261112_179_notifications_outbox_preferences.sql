-- ============================================================================
-- JOY PeopleHR — Migration 179: Notification Preferences, Reliable Outbox,
-- Secure Device Token Registration & Attendance/Break Event Triggers
-- ============================================================================

-- 1. Enhance employee_device_tokens for multi-device, status, and strict RLS
ALTER TABLE public.employee_device_tokens
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS token_status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (token_status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_device_tokens_user_token
  ON public.employee_device_tokens (auth_user_id, fcm_token)
  WHERE auth_user_id IS NOT NULL AND fcm_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_device_tokens_user_device
  ON public.employee_device_tokens (auth_user_id, device_id)
  WHERE auth_user_id IS NOT NULL AND device_id IS NOT NULL;

ALTER TABLE public.employee_device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own device tokens" ON public.employee_device_tokens;
CREATE POLICY "Users manage own device tokens"
  ON public.employee_device_tokens
  FOR ALL
  USING (auth_user_id = auth.uid()::text)
  WITH CHECK (auth_user_id = auth.uid()::text);

-- 2. Notification Preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  category text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('IN_APP', 'PUSH', 'WEB_PUSH', 'EMAIL', 'WHATSAPP')),
  enabled boolean NOT NULL DEFAULT true,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start text DEFAULT '22:00',
  quiet_hours_end text DEFAULT '08:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, channel)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Reliable Notification Outbox (idempotency + retry + delivery audit)
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  category text NOT NULL,
  recipient_user_id uuid NOT NULL,
  employee_id uuid,
  related_attendance_date date,
  related_break_event_id uuid,
  related_exception_id uuid,
  channel text NOT NULL CHECK (channel IN ('PUSH', 'WEB_PUSH', 'EMAIL', 'IN_APP')),
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_status text NOT NULL DEFAULT 'PENDING'
    CHECK (delivery_status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'SKIPPED')),
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  error_details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
  ON public.notification_outbox (delivery_status, created_at)
  WHERE delivery_status IN ('PENDING', 'FAILED');

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipients read own outbox items" ON public.notification_outbox;
CREATE POLICY "Recipients read own outbox items"
  ON public.notification_outbox
  FOR SELECT
  USING (recipient_user_id = auth.uid());

-- 4. Helper: Check if a user enabled a notification channel for a category
CREATE OR REPLACE FUNCTION public.is_notification_channel_enabled(
  p_user_id uuid,
  p_category text,
  p_channel text,
  p_default boolean DEFAULT true
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT np.enabled
      FROM public.notification_preferences np
      WHERE np.user_id = p_user_id
        AND np.category = p_category
        AND np.channel = p_channel
      LIMIT 1
    ),
    p_default
  );
$$;

-- 5. Core Idempotent Enqueue Function (creates IN_APP event + PUSH outbox)
CREATE OR REPLACE FUNCTION public.enqueue_attendance_break_notification(
  p_organization_id uuid,
  p_idempotency_key text,
  p_event_type text,
  p_category text,
  p_recipient_user_id uuid,
  p_employee_id uuid,
  p_attendance_date date,
  p_break_event_id uuid,
  p_exception_id uuid,
  p_title text,
  p_message text,
  p_action_url text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_is_mandatory boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_push_enabled boolean;
  v_inapp_enabled boolean;
  v_inserted_id uuid;
  v_profile_id uuid;
BEGIN
  IF p_recipient_user_id IS NULL OR p_organization_id IS NULL THEN
    RETURN;
  END IF;

  SELECT up.id INTO v_profile_id
  FROM public.user_profiles up
  WHERE up.id = p_recipient_user_id OR up.auth_user_id = p_recipient_user_id
  LIMIT 1;

  v_inapp_enabled := p_is_mandatory OR public.is_notification_channel_enabled(p_recipient_user_id, p_category, 'IN_APP', true);
  v_push_enabled := public.is_notification_channel_enabled(p_recipient_user_id, p_category, 'PUSH', true);

  -- Use outbox idempotency_key as single-source deduplication gate
  INSERT INTO public.notification_outbox (
    organization_id,
    idempotency_key,
    event_type,
    category,
    recipient_user_id,
    employee_id,
    related_attendance_date,
    related_break_event_id,
    related_exception_id,
    channel,
    title,
    message,
    action_url,
    payload,
    delivery_status
  )
  VALUES (
    p_organization_id,
    p_idempotency_key,
    p_event_type,
    p_category,
    p_recipient_user_id,
    p_employee_id,
    p_attendance_date,
    p_break_event_id,
    p_exception_id,
    'PUSH',
    p_title,
    p_message,
    p_action_url,
    p_payload,
    CASE WHEN v_push_enabled THEN 'PENDING' ELSE 'SKIPPED' END
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_inserted_id;

  -- Only create the in-app notification_events row if this is NOT a duplicate and profile exists
  IF v_inserted_id IS NOT NULL AND v_inapp_enabled AND v_profile_id IS NOT NULL THEN
    INSERT INTO public.notification_events (
      organization_id,
      recipient_user_id,
      channel,
      title,
      message,
      action_url,
      is_read,
      is_sent
    )
    VALUES (
      p_organization_id,
      v_profile_id,
      'IN_APP',
      p_title,
      p_message,
      p_action_url,
      false,
      true
    );
  END IF;
END;
$$;

-- 6. Trigger: Break Start & Break End
CREATE OR REPLACE FUNCTION public.trg_fn_notify_break_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emp_user_id uuid;
  v_emp_name text;
  v_mgr_user_id uuid;
  v_cat_label text;
  v_time_str text;
BEGIN
  SELECT e.user_id,
         COALESCE(NULLIF(e.display_name, ''), TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')), e.employee_code, 'Employee'),
         mgr.user_id
    INTO v_emp_user_id, v_emp_name, v_mgr_user_id
  FROM public.employees e
  LEFT JOIN public.employees mgr ON mgr.id = e.reporting_manager_id
  WHERE e.id = NEW.employee_id;

  v_cat_label := INITCAP(LOWER(REPLACE(COALESCE(NEW.break_category, 'Break'), '_', ' ')));

  IF TG_OP = 'INSERT' AND NEW.status = 'ACTIVE' THEN
    v_time_str := TO_CHAR(NEW.started_at AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');

    PERFORM public.enqueue_attendance_break_notification(
      NEW.organization_id,
      'brk_start_' || NEW.id::text,
      'BREAK_STARTED',
      'BREAKS',
      v_emp_user_id,
      NEW.employee_id,
      NEW.attendance_date,
      NEW.id,
      NULL,
      v_cat_label || ' Break Started',
      'Your ' || LOWER(v_cat_label) || ' break started at ' || v_time_str || '. Remember to resume work before your permitted duration expires.',
      '/attendance',
      jsonb_build_object('route', 'attendance', 'break_id', NEW.id, 'category', NEW.break_category),
      false
    );

    IF v_mgr_user_id IS NOT NULL AND v_mgr_user_id <> v_emp_user_id THEN
      PERFORM public.enqueue_attendance_break_notification(
        NEW.organization_id,
        'mgr_brk_start_' || NEW.id::text,
        'EMPLOYEE_ON_BREAK',
        'BREAKS',
        v_mgr_user_id,
        NEW.employee_id,
        NEW.attendance_date,
        NEW.id,
        NULL,
        v_emp_name || ' Started ' || v_cat_label || ' Break',
        v_emp_name || ' started a ' || LOWER(v_cat_label) || ' break at ' || v_time_str || '.',
        '/breaks?date=' || NEW.attendance_date::text || '&employeeId=' || NEW.employee_id::text,
        jsonb_build_object('route', 'breaks', 'employee_id', NEW.employee_id, 'date', NEW.attendance_date),
        false
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'ACTIVE' AND NEW.status = 'COMPLETED' AND NEW.ended_at IS NOT NULL THEN
    v_time_str := TO_CHAR(NEW.ended_at AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');

    PERFORM public.enqueue_attendance_break_notification(
      NEW.organization_id,
      'brk_end_' || NEW.id::text,
      'BREAK_ENDED',
      'BREAKS',
      v_emp_user_id,
      NEW.employee_id,
      NEW.attendance_date,
      NEW.id,
      NULL,
      'Work Resumed',
      'Your ' || LOWER(v_cat_label) || ' break ended at ' || v_time_str || '. Recorded duration: ' || COALESCE(NEW.duration_minutes, 0) || ' minutes.',
      '/attendance',
      jsonb_build_object('route', 'attendance', 'break_id', NEW.id, 'duration_minutes', COALESCE(NEW.duration_minutes, 0)),
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_break_event ON public.attendance_break_events;
CREATE TRIGGER trg_notify_break_event
  AFTER INSERT OR UPDATE OF status, ended_at
  ON public.attendance_break_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_notify_break_event();

-- 7. Trigger: Break Policy Exception Created (Scoped HR + Manager + Employee)
CREATE OR REPLACE FUNCTION public.trg_fn_notify_break_exception()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emp_user_id uuid;
  v_emp_name text;
  v_mgr_user_id uuid;
  v_hr_rec record;
  v_action_url text;
BEGIN
  SELECT e.user_id,
         COALESCE(NULLIF(e.display_name, ''), TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')), e.employee_code, 'Employee'),
         mgr.user_id
    INTO v_emp_user_id, v_emp_name, v_mgr_user_id
  FROM public.employees e
  LEFT JOIN public.employees mgr ON mgr.id = e.reporting_manager_id
  WHERE e.id = NEW.employee_id;

  v_action_url := '/breaks?date=' || NEW.attendance_date::text || '&employeeId=' || NEW.employee_id::text;

  -- Notify employee (mandatory audit notice)
  PERFORM public.enqueue_attendance_break_notification(
    NEW.organization_id,
    'emp_exc_' || NEW.id::text,
    'BREAK_EXCEPTION_CREATED',
    'BREAKS',
    v_emp_user_id,
    NEW.employee_id,
    NEW.attendance_date,
    NEW.break_event_id,
    NEW.id,
    'Break Policy Alert',
    COALESCE(NEW.description, 'A break policy exception was recorded for ' || NEW.attendance_date::text || '.'),
    '/attendance',
    jsonb_build_object('route', 'attendance', 'exception_id', NEW.id),
    true
  );

  -- Notify reporting manager if distinct
  IF v_mgr_user_id IS NOT NULL AND v_mgr_user_id <> v_emp_user_id THEN
    PERFORM public.enqueue_attendance_break_notification(
      NEW.organization_id,
      'mgr_exc_' || NEW.id::text || '_' || v_mgr_user_id::text,
      'HR_BREAK_EXCEPTION',
      'APPROVAL',
      v_mgr_user_id,
      NEW.employee_id,
      NEW.attendance_date,
      NEW.break_event_id,
      NEW.id,
      'Break Policy Exception',
      v_emp_name || ': ' || COALESCE(NEW.description, 'Break limit exceeded. Review the attendance record.'),
      v_action_url,
      jsonb_build_object('route', 'breaks', 'employee_id', NEW.employee_id, 'date', NEW.attendance_date, 'exception_id', NEW.id),
      true
    );
  END IF;

  -- Notify organization HR_HEAD / COMPANY_ADMIN users (strictly tenant-scoped)
  FOR v_hr_rec IN
    SELECT DISTINCT up.id AS target_uid
    FROM public.user_profiles up
    WHERE up.organization_id = NEW.organization_id
      AND UPPER(COALESCE(up.role, '')) IN ('HR_HEAD', 'COMPANY_ADMIN', 'HR_ADMIN')
      AND COALESCE(up.auth_user_id, up.id) IS DISTINCT FROM v_emp_user_id
  LOOP
    PERFORM public.enqueue_attendance_break_notification(
      NEW.organization_id,
      'hr_exc_' || NEW.id::text || '_' || v_hr_rec.target_uid::text,
      'HR_BREAK_EXCEPTION',
      'APPROVAL',
      v_hr_rec.target_uid,
      NEW.employee_id,
      NEW.attendance_date,
      NEW.break_event_id,
      NEW.id,
      'Break Policy Exception',
      v_emp_name || ': ' || COALESCE(NEW.description, 'Exceeded configured break policy limit. Review the attendance record.'),
      v_action_url,
      jsonb_build_object('route', 'breaks', 'employee_id', NEW.employee_id, 'date', NEW.attendance_date, 'exception_id', NEW.id),
      true
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_break_exception ON public.attendance_break_exceptions;
CREATE TRIGGER trg_notify_break_exception
  AFTER INSERT
  ON public.attendance_break_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_notify_break_exception();

-- 8. Trigger: Daily Check-In & Check-Out Notifications
CREATE OR REPLACE FUNCTION public.trg_fn_notify_daily_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emp_user_id uuid;
  v_emp_name text;
  v_mgr_user_id uuid;
  v_time_str text;
BEGIN
  SELECT e.user_id,
         COALESCE(NULLIF(e.display_name, ''), TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')), e.employee_code, 'Employee'),
         mgr.user_id
    INTO v_emp_user_id, v_emp_name, v_mgr_user_id
  FROM public.employees e
  LEFT JOIN public.employees mgr ON mgr.id = e.reporting_manager_id
  WHERE e.id = NEW.employee_id;

  IF NEW.first_check_in IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.first_check_in IS NULL) THEN
    v_time_str := TO_CHAR(NEW.first_check_in AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');

    PERFORM public.enqueue_attendance_break_notification(
      NEW.organization_id,
      'checkin_' || NEW.id::text,
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
      jsonb_build_object('route', 'attendance', 'date', NEW.attendance_date),
      false
    );

    IF v_mgr_user_id IS NOT NULL AND v_mgr_user_id <> v_emp_user_id THEN
      PERFORM public.enqueue_attendance_break_notification(
        NEW.organization_id,
        'mgr_checkin_' || NEW.id::text,
        'EMPLOYEE_CHECKED_IN',
        'ATTENDANCE',
        v_mgr_user_id,
        NEW.employee_id,
        NEW.attendance_date,
        NULL,
        NULL,
        v_emp_name || ' Checked In',
        v_emp_name || ' checked in at ' || v_time_str || '.',
        '/breaks?date=' || NEW.attendance_date::text || '&employeeId=' || NEW.employee_id::text,
        jsonb_build_object('route', 'breaks', 'employee_id', NEW.employee_id, 'date', NEW.attendance_date),
        false
      );
    END IF;
  END IF;

  IF NEW.last_check_out IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.last_check_out IS NULL) THEN
    v_time_str := TO_CHAR(NEW.last_check_out AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');

    PERFORM public.enqueue_attendance_break_notification(
      NEW.organization_id,
      'checkout_' || NEW.id::text,
      'CHECK_OUT_CONFIRMED',
      'ATTENDANCE',
      v_emp_user_id,
      NEW.employee_id,
      NEW.attendance_date,
      NULL,
      NULL,
      'Checked Out Successfully',
      'Your shift check-out was recorded at ' || v_time_str || '. Net payable: ' || COALESCE(NEW.net_payable_minutes, 0) || 'm.',
      '/attendance',
      jsonb_build_object('route', 'attendance', 'date', NEW.attendance_date),
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_daily_attendance ON public.attendance_daily;
CREATE TRIGGER trg_notify_daily_attendance
  AFTER INSERT OR UPDATE OF first_check_in, last_check_out
  ON public.attendance_daily
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_notify_daily_attendance();
