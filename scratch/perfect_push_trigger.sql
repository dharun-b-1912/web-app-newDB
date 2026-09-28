-- ============================================================
-- Perfect Auto-Push Trigger for notification_events
-- ============================================================

CREATE OR REPLACE FUNCTION public.send_push_on_notification_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _employee_id text;
  _auth_user_id text;
  _topic text;
  _title text;
  _body text;
  _route text;
  _meta jsonb;
  _payload jsonb;
BEGIN
  _title := coalesce(new.title, 'JOY PeopleHR');
  _body := coalesce(new.message, new.body, '');
  _route := coalesce(new.action_url, new.event_type, 'home');

  _meta := coalesce(new.metadata, '{}'::jsonb);
  _employee_id := coalesce(
    _meta->>'target_employee_id',
    _meta->>'employee_id',
    _meta->>'recipient_employee_id',
    new.resource_id,
    ''
  );
  
  _auth_user_id := coalesce(
    _meta->>'target_user_id',
    _meta->>'auth_user_id',
    new.recipient_user_id::text,
    ''
  );

  -- If no employee_id but auth_user_id is present, try looking up employee_id
  IF (_employee_id = '' OR _employee_id IS NULL) AND _auth_user_id != '' THEN
    SELECT id::text INTO _employee_id
    FROM public.employees
    WHERE user_id = _auth_user_id::uuid OR id::text = _auth_user_id
    LIMIT 1;
  END IF;

  -- If neither recipient is known, this is a company-wide broadcast announcement
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
      'event_id', new.id::text,
      'title', _title,
      'body', _body,
      'route', _route,
      'recipient_user_id', coalesce(new.recipient_user_id::text, ''),
      'created_at', coalesce(new.created_at::text, now()::text)
    )
  );

  -- Dispatch to send-push Edge Function via pg_net
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
