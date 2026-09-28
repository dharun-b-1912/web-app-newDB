-- ============================================================
-- Create employee_device_tokens and push_subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.employee_device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  auth_user_id TEXT DEFAULT '',
  fcm_token TEXT NOT NULL,
  platform TEXT DEFAULT 'android',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_device_tokens_fcm_token
  ON public.employee_device_tokens (fcm_token);

CREATE INDEX IF NOT EXISTS idx_employee_device_tokens_employee_id
  ON public.employee_device_tokens (employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_device_tokens_auth_user_id
  ON public.employee_device_tokens (auth_user_id);

ALTER TABLE public.employee_device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to employee_device_tokens" ON public.employee_device_tokens;
CREATE POLICY "Public full access to employee_device_tokens"
  ON public.employee_device_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT DEFAULT '',
  auth_key TEXT DEFAULT '',
  browser TEXT DEFAULT '',
  os TEXT DEFAULT '',
  device TEXT DEFAULT '',
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subs_user_endpoint
  ON public.push_subscriptions (user_id, endpoint);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Public full access to push_subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);
