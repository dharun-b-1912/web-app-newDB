-- ============================================================
-- Fail-safe Auto-Push Trigger using to_jsonb(new)
-- ============================================================

CREATE OR REPLACE FUNCTION public.send_push_on_notification_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row jsonb;
  _employee_id text;
  _auth_user_id text;
  _topic text;
  _title text;
  _body text;
  _route text;
  _payload jsonb;
BEGIN
  -- Safely convert new record to jsonb to avoid any missing column errors
  _row := to_jsonb(new);

  _title := coalesce(_row->>'title', 'JOY PeopleHR');
  _body := coalesce(_row->>'message', _row->>'body', '');
  _route := coalesce(_row->>'action_url', _row->>'event_type', 'home');

  _auth_user_id := coalesce(
    _row->'metadata'->>'target_user_id',
    _row->'metadata'->>'auth_user_id',
    _row->>'recipient_user_id',
    ''
  );

  _employee_id := coalesce(
    _row->'metadata'->>'target_employee_id',
    _row->'metadata'->>'employee_id',
    _row->'metadata'->>'recipient_employee_id',
    _row->>'resource_id',
    ''
  );

  -- If no employee_id but auth_user_id is present, resolve employee_id
  IF (_employee_id = '' OR _employee_id IS NULL) AND _auth_user_id != '' THEN
    SELECT id::text INTO _employee_id
    FROM public.employees
    WHERE user_id = _auth_user_id::uuid OR id::text = _auth_user_id
    LIMIT 1;
  END IF;

  -- Broadcast if no specific recipient
  IF (_employee_id IS NULL OR _employee_id = '') AND (_auth_user_id IS NULL OR _auth_user_id = '') THEN
    _topic := 'all_employees';
  ELSE
    _topic := NULL;
  END IF;

  _payload := jsonb_build_object(
    'employee_id', coalesce(_employee_id, ''),
    'auth_user_id', coalesce(_auth_user_id, ''),
    'topic', _topic,
    'title', _title,
    'body', _body,
    'route', _route,
    'data', jsonb_build_object(
      'event_id', coalesce(_row->>'id', ''),
      'title', _title,
      'body', _body,
      'route', _route,
      'recipient_user_id', coalesce(_auth_user_id, ''),
      'created_at', coalesce(_row->>'created_at', now()::text)
    )
  );

  BEGIN
    PERFORM net.http_post(
      url := 'https://ysiajemrqakfngasehhi.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
      ),
      body := _payload::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'send_push pg_net dispatch error: %', SQLERRM;
  END;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trigger_send_push_on_notification ON public.notification_events;
CREATE TRIGGER trigger_send_push_on_notification
  AFTER INSERT ON public.notification_events
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification_event();
