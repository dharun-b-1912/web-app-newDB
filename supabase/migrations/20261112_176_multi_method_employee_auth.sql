-- Migration: 20261112_176_multi_method_employee_auth.sql
-- Purpose: Multi-Method Employee Authentication configuration, OTP challenge store,
--          account lockout tracking, security audit logging, and safety constraints
--          for JOY PeopleHR (Web, Flutter Mobile, and Supabase Edge Gateway).

-- 1. Authentication Method Configurations (Global fallback + per-organization overrides)
CREATE TABLE IF NOT EXISTS public.auth_method_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  enable_employee_id_password boolean NOT NULL DEFAULT true,
  enable_mobile_password boolean NOT NULL DEFAULT true,
  enable_mobile_otp boolean NOT NULL DEFAULT true,
  enable_email_password boolean NOT NULL DEFAULT true,
  default_login_method text NOT NULL DEFAULT 'employee_id_password'
    CHECK (default_login_method IN ('employee_id_password', 'mobile_password', 'mobile_otp', 'email_password')),
  factory_recommended_method text NOT NULL DEFAULT 'employee_id_password'
    CHECK (factory_recommended_method IN ('employee_id_password', 'mobile_password', 'mobile_otp', 'email_password')),
  allowed_employee_groups jsonb NOT NULL DEFAULT '{
    "employee_id_password": ["all"],
    "mobile_password": ["all"],
    "mobile_otp": ["all"],
    "email_password": ["all"]
  }'::jsonb,
  role_specific_policies jsonb NOT NULL DEFAULT '{}'::jsonb,
  otp_provider text NOT NULL DEFAULT 'airtel_iq'
    CHECK (otp_provider IN ('airtel_iq', 'supabase_phone')),
  otp_expiry_seconds integer NOT NULL DEFAULT 300
    CHECK (otp_expiry_seconds BETWEEN 60 AND 900),
  otp_resend_cooldown_seconds integer NOT NULL DEFAULT 30
    CHECK (otp_resend_cooldown_seconds BETWEEN 15 AND 300),
  otp_max_attempts integer NOT NULL DEFAULT 5
    CHECK (otp_max_attempts BETWEEN 3 AND 10),
  password_policy jsonb NOT NULL DEFAULT '{
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumber": true,
    "requireSpecial": false
  }'::jsonb,
  lockout_policy jsonb NOT NULL DEFAULT '{
    "maxFailedAttempts": 5,
    "lockoutMinutes": 15,
    "trackByIdentifier": true
  }'::jsonb,
  session_policy jsonb NOT NULL DEFAULT '{
    "webSessionHours": 24,
    "mobileSessionDays": 30,
    "requireReauthSensitiveActions": true
  }'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_method_configs_org_unique
  ON public.auth_method_configs (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Trigger function: Prevent disabling all authentication methods and ensure default_login_method is enabled
CREATE OR REPLACE FUNCTION public.fn_enforce_auth_method_config_safety()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT (
    NEW.enable_employee_id_password OR
    NEW.enable_mobile_password OR
    NEW.enable_mobile_otp OR
    NEW.enable_email_password
  ) THEN
    RAISE EXCEPTION 'At least one employee login method must remain enabled.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.default_login_method = 'employee_id_password' AND NOT NEW.enable_employee_id_password)
     OR (NEW.default_login_method = 'mobile_password' AND NOT NEW.enable_mobile_password)
     OR (NEW.default_login_method = 'mobile_otp' AND NOT NEW.enable_mobile_otp)
     OR (NEW.default_login_method = 'email_password' AND NOT NEW.enable_email_password) THEN
    RAISE EXCEPTION 'Default login method (%) must be enabled.', NEW.default_login_method
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_auth_method_config_safety ON public.auth_method_configs;
CREATE TRIGGER trg_enforce_auth_method_config_safety
  BEFORE INSERT OR UPDATE ON public.auth_method_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_auth_method_config_safety();

-- 2. Cryptographic OTP Challenge Store (Server-only, never stores plaintext OTP)
CREATE TABLE IF NOT EXISTS public.auth_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_profile_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  auth_user_id uuid,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('login', 'password_reset', 'hr_recovery')),
  phone_e164 text NOT NULL,
  otp_hash text NOT NULL,
  provider text NOT NULL DEFAULT 'airtel_iq',
  provider_message_id text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  resend_available_at timestamptz NOT NULL,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  ip_address text,
  user_agent text,
  device_platform text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_challenges_phone_purpose
  ON public.auth_otp_challenges (phone_e164, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_otp_challenges_auth_user
  ON public.auth_otp_challenges (auth_user_id, created_at DESC);

-- 3. Account Lockout & Brute-Force Guard (Server-only)
CREATE TABLE IF NOT EXISTS public.auth_account_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_key text NOT NULL UNIQUE,
  auth_user_id uuid,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_failed_at timestamptz,
  last_reason text,
  unlocked_by uuid,
  unlocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_account_lockouts_org
  ON public.auth_account_lockouts (organization_id, locked_until DESC);

-- 4. Authentication & Security Audit Log (Server writes; HR/Admin reads)
CREATE TABLE IF NOT EXISTS public.auth_login_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  auth_user_id uuid,
  user_profile_id uuid,
  employee_id uuid,
  employee_code text,
  login_method text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'blocked')),
  failure_reason text,
  masked_identifier text,
  device_platform text,
  user_agent text,
  ip_address text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_login_audit_logs_org_created
  ON public.auth_login_audit_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_login_audit_logs_user_created
  ON public.auth_login_audit_logs (auth_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_login_audit_logs_method_created
  ON public.auth_login_audit_logs (login_method, event_type, created_at DESC);

-- 5. Safe Lookup Performance Indexes on public.employees (Additive only)
CREATE INDEX IF NOT EXISTS idx_employees_code_lower
  ON public.employees (lower(employee_code));

CREATE INDEX IF NOT EXISTS idx_employees_phone_last10
  ON public.employees (right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10));

-- 6. Strict Row Level Security (RLS)
ALTER TABLE public.auth_method_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_login_audit_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated org members may read their org or global default auth config
DROP POLICY IF EXISTS "auth_method_configs_member_read" ON public.auth_method_configs;
CREATE POLICY "auth_method_configs_member_read"
  ON public.auth_method_configs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.organization_id = auth_method_configs.organization_id
    )
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships om
      JOIN public.user_profiles up ON up.id = om.user_id
      WHERE up.auth_user_id = auth.uid()
        AND om.organization_id = auth_method_configs.organization_id
        AND om.status = 'active'
    )
  );

-- Org admins / HR Heads may read audit logs for their organization
DROP POLICY IF EXISTS "auth_login_audit_logs_org_admin_read" ON public.auth_login_audit_logs;
CREATE POLICY "auth_login_audit_logs_org_admin_read"
  ON public.auth_login_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.organization_memberships om ON om.user_id = up.id
      WHERE up.auth_user_id = auth.uid()
        AND om.organization_id = auth_login_audit_logs.organization_id
        AND om.status = 'active'
        AND lower(coalesce(om.role_code, '')) IN (
          'admin', 'super_admin', 'platform_admin', 'company_admin', 'hr_head', 'hr_admin', 'hr_manager'
        )
    )
    OR auth_user_id = auth.uid()
  );

-- Note: auth_otp_challenges and auth_account_lockouts intentionally have zero client policies.
-- Only service_role (Edge Function auth-gateway) can read/write them.

-- 7. Seed Global Default + All Existing Organizations (Idempotent)
INSERT INTO public.auth_method_configs (
  organization_id,
  enable_employee_id_password,
  enable_mobile_password,
  enable_mobile_otp,
  enable_email_password,
  default_login_method,
  factory_recommended_method
)
SELECT
  NULL,
  true,
  true,
  true,
  true,
  'employee_id_password',
  'employee_id_password'
WHERE NOT EXISTS (
  SELECT 1 FROM public.auth_method_configs WHERE organization_id IS NULL
);

INSERT INTO public.auth_method_configs (
  organization_id,
  enable_employee_id_password,
  enable_mobile_password,
  enable_mobile_otp,
  enable_email_password,
  default_login_method,
  factory_recommended_method
)
SELECT
  o.id,
  true,
  true,
  true,
  true,
  'employee_id_password',
  'employee_id_password'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.auth_method_configs c WHERE c.organization_id = o.id
);

