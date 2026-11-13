-- ============================================================================
-- JOY FaceAttend — Migration 175
-- Multi-Tenant SaaS Add-On: GPS + 1:1 Face Verification + Liveness Attendance
-- Strictly Additive: Reuses employees, work_locations, employee_work_locations,
-- shifts, attendance_punches, attendance_daily, organization_addon_entitlements
-- ============================================================================

-- 1. ISOLATED PRIVATE STORAGE BUCKET FOR FACEATTEND ENROLMENT & AUDIT IMAGES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'faceattend-private',
  'faceattend-private',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Strict tenant & role-scoped storage RLS on faceattend-private
-- Path convention: {organization_id}/{employee_id}/...
DROP POLICY IF EXISTS "faceattend_storage_select" ON storage.objects;
CREATE POLICY "faceattend_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'faceattend-private'
  AND (
    public.is_platform_admin()
    OR (
      (storage.foldername(name))[1] = (SELECT public.get_active_user_org_id()::text)
      AND (
        public.is_org_admin((storage.foldername(name))[1])
        OR (storage.foldername(name))[2] IN (
          SELECT e.id::text FROM public.employees e
          JOIN public.user_profiles up ON (e.id = up.employee_id OR e.user_id = up.id OR e.user_id = up.auth_user_id)
          WHERE up.auth_user_id = auth.uid()
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "faceattend_storage_insert" ON storage.objects;
CREATE POLICY "faceattend_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'faceattend-private'
  AND (
    public.is_platform_admin()
    OR (
      (storage.foldername(name))[1] = (SELECT public.get_active_user_org_id()::text)
      AND (
        public.is_org_admin((storage.foldername(name))[1])
        OR (storage.foldername(name))[2] IN (
          SELECT e.id::text FROM public.employees e
          JOIN public.user_profiles up ON (e.id = up.employee_id OR e.user_id = up.id OR e.user_id = up.auth_user_id)
          WHERE up.auth_user_id = auth.uid()
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "faceattend_storage_delete" ON storage.objects;
CREATE POLICY "faceattend_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'faceattend-private'
  AND (
    public.is_platform_admin()
    OR (
      (storage.foldername(name))[1] = (SELECT public.get_active_user_org_id()::text)
      AND (
        public.is_org_admin((storage.foldername(name))[1])
        OR (storage.foldername(name))[2] IN (
          SELECT e.id::text FROM public.employees e
          JOIN public.user_profiles up ON (e.id = up.employee_id OR e.user_id = up.id OR e.user_id = up.auth_user_id)
          WHERE up.auth_user_id = auth.uid()
        )
      )
    )
  )
);

-- ============================================================================
-- 2. FACEATTEND VERSIONED ORGANIZATION SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.faceattend_org_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_version INTEGER NOT NULL DEFAULT 1,
  module_enabled BOOLEAN NOT NULL DEFAULT true,
  face_verification_enabled BOOLEAN NOT NULL DEFAULT true,
  liveness_enabled BOOLEAN NOT NULL DEFAULT true,
  gps_verification_enabled BOOLEAN NOT NULL DEFAULT true,
  geofence_mode TEXT NOT NULL DEFAULT 'REQUIRED'
    CHECK (geofence_mode IN ('REQUIRED', 'OPTIONAL', 'WARN_ONLY')),
  require_face_on_checkin BOOLEAN NOT NULL DEFAULT true,
  require_face_on_checkout BOOLEAN NOT NULL DEFAULT true,
  offline_queue_enabled BOOLEAN NOT NULL DEFAULT false,
  manual_fallback_enabled BOOLEAN NOT NULL DEFAULT true,
  self_enrolment_requires_approval BOOLEAN NOT NULL DEFAULT true,
  match_threshold NUMERIC(5,2) NOT NULL DEFAULT 88.00
    CHECK (match_threshold >= 50.00 AND match_threshold <= 99.90),
  liveness_threshold NUMERIC(5,2) NOT NULL DEFAULT 80.00
    CHECK (liveness_threshold >= 50.00 AND liveness_threshold <= 99.90),
  max_gps_accuracy_meters NUMERIC(8,2) NOT NULL DEFAULT 80.00,
  gps_freshness_seconds INTEGER NOT NULL DEFAULT 60,
  retention_days_images INTEGER NOT NULL DEFAULT 90,
  consent_version_required TEXT NOT NULL DEFAULT 'v1.0',
  provider_preference TEXT NOT NULL DEFAULT 'AUTO'
    CHECK (provider_preference IN ('AUTO', 'AWS_REKOGNITION', 'AZURE_FACE', 'HTTP_WEBHOOK', 'SANDBOX_CHALLENGE')),
  allow_non_face_fallback_on_provider_outage BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. SAAS SUBSCRIPTION & IMMUTABLE BILLING SNAPSHOTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.faceattend_subscriptions (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL DEFAULT 'PRO'
    CHECK (plan_code IN ('BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM', 'TRIAL')),
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY'
    CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
  price_per_employee NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  minimum_monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  setup_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  usage_fee_per_call NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
  max_enrolled_employees INTEGER DEFAULT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'TRIAL', 'GRACE', 'SUSPENDED', 'CANCELLED', 'EXPIRED')),
  trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  grace_ends_at TIMESTAMPTZ DEFAULT NULL,
  current_period_start DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  current_period_end DATE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month - 1 day')::date,
  notes TEXT DEFAULT NULL,
  updated_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faceattend_billing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  snapshot_status TEXT NOT NULL DEFAULT 'FINALIZED'
    CHECK (snapshot_status IN ('FINALIZED', 'INVOICED', 'PAID')),
  plan_code_snapshot TEXT NOT NULL,
  billing_cycle_snapshot TEXT NOT NULL,
  active_enrolled_count INTEGER NOT NULL DEFAULT 0,
  verified_checks_count INTEGER NOT NULL DEFAULT 0,
  failed_checks_count INTEGER NOT NULL DEFAULT 0,
  unit_price_snapshot NUMERIC(10,2) NOT NULL,
  minimum_fee_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  setup_fee_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  usage_charges_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  subtotal_amount NUMERIC(12,2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  pricing_rule_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID DEFAULT NULL,
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_faceattend_billing_period UNIQUE (organization_id, billing_period_start, billing_period_end)
);

-- Immutability guard: finalized billing snapshots cannot have numbers, period, or pricing altered or deleted
CREATE OR REPLACE FUNCTION public.fn_guard_faceattend_billing_snapshot_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Finalized billing snapshots are immutable and cannot be deleted.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.organization_id IS DISTINCT FROM NEW.organization_id
      OR OLD.billing_period_start IS DISTINCT FROM NEW.billing_period_start
      OR OLD.billing_period_end IS DISTINCT FROM NEW.billing_period_end
      OR OLD.plan_code_snapshot IS DISTINCT FROM NEW.plan_code_snapshot
      OR OLD.billing_cycle_snapshot IS DISTINCT FROM NEW.billing_cycle_snapshot
      OR OLD.active_enrolled_count IS DISTINCT FROM NEW.active_enrolled_count
      OR OLD.verified_checks_count IS DISTINCT FROM NEW.verified_checks_count
      OR OLD.failed_checks_count IS DISTINCT FROM NEW.failed_checks_count
      OR OLD.unit_price_snapshot IS DISTINCT FROM NEW.unit_price_snapshot
      OR OLD.minimum_fee_snapshot IS DISTINCT FROM NEW.minimum_fee_snapshot
      OR OLD.setup_fee_snapshot IS DISTINCT FROM NEW.setup_fee_snapshot
      OR OLD.usage_charges_snapshot IS DISTINCT FROM NEW.usage_charges_snapshot
      OR OLD.subtotal_amount IS DISTINCT FROM NEW.subtotal_amount
      OR OLD.currency_code IS DISTINCT FROM NEW.currency_code
      OR OLD.pricing_rule_snapshot IS DISTINCT FROM NEW.pricing_rule_snapshot
      OR OLD.finalized_at IS DISTINCT FROM NEW.finalized_at
    THEN
      RAISE EXCEPTION 'Finalized billing snapshot financial values and pricing rules are immutable.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_faceattend_billing_snapshot ON public.faceattend_billing_snapshots;
CREATE TRIGGER trg_guard_faceattend_billing_snapshot
  BEFORE UPDATE OR DELETE ON public.faceattend_billing_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_faceattend_billing_snapshot_immutable();

-- ============================================================================
-- 4. EXPLICIT BIOMETRIC CONSENTS & ISOLATED 1:1 FACE TEMPLATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.faceattend_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL DEFAULT 'v1.0',
  language_code TEXT NOT NULL DEFAULT 'en',
  consent_notice_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'GRANTED' CHECK (status IN ('GRANTED', 'WITHDRAWN')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ DEFAULT NULL,
  withdrawn_reason TEXT DEFAULT NULL,
  device_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faceattend_consents_emp ON public.faceattend_consents(organization_id, employee_id, status, granted_at DESC);

CREATE TABLE IF NOT EXISTS public.faceattend_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  enrolment_status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (enrolment_status IN ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'REVOKED', 'DELETED')),
  capture_method TEXT NOT NULL DEFAULT 'SELF'
    CHECK (capture_method IN ('SELF', 'SUPERVISOR_ASSISTED', 'ADMIN')),
  template_version INTEGER NOT NULL DEFAULT 1,
  primary_image_path TEXT DEFAULT NULL,
  liveness_audit_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider_code TEXT NOT NULL DEFAULT 'SANDBOX_CHALLENGE',
  provider_face_token_encrypted TEXT DEFAULT NULL,
  sandbox_feature_digest TEXT DEFAULT NULL,
  quality_score NUMERIC(5,2) DEFAULT NULL,
  enrolled_by UUID DEFAULT NULL,
  approved_by UUID DEFAULT NULL,
  approved_at TIMESTAMPTZ DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  revoked_by UUID DEFAULT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NULL,
  revocation_reason TEXT DEFAULT NULL,
  deletion_requested_at TIMESTAMPTZ DEFAULT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  retention_expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Strictly at most ONE non-deleted ACTIVE or PENDING template per employee at a time
CREATE UNIQUE INDEX IF NOT EXISTS uq_faceattend_active_template_per_emp
  ON public.faceattend_templates(organization_id, employee_id)
  WHERE enrolment_status IN ('PENDING_APPROVAL', 'ACTIVE');

CREATE INDEX IF NOT EXISTS idx_faceattend_templates_org_status
  ON public.faceattend_templates(organization_id, enrolment_status, created_at DESC);

-- ============================================================================
-- 5. SINGLE-USE SERVER LIVENESS CHALLENGES & VERIFICATION ATTEMPTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.faceattend_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  challenge_nonce TEXT NOT NULL UNIQUE,
  challenge_type TEXT NOT NULL DEFAULT 'BLINK_AND_TURN'
    CHECK (challenge_type IN ('BLINK_AND_TURN', 'SMILE_AND_LOOK', 'PASSIVE_CAPTURE')),
  challenge_prompt TEXT NOT NULL DEFAULT 'Blink once and turn slightly left',
  device_id TEXT DEFAULT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 minutes'),
  consumed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faceattend_challenges_emp ON public.faceattend_challenges(organization_id, employee_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.faceattend_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_id UUID DEFAULT NULL REFERENCES public.faceattend_templates(id) ON DELETE SET NULL,
  challenge_id UUID DEFAULT NULL REFERENCES public.faceattend_challenges(id) ON DELETE SET NULL,
  punch_type TEXT NOT NULL CHECK (punch_type IN ('CHECK_IN', 'CHECK_OUT')),
  decision TEXT NOT NULL CHECK (decision IN (
    'MATCH',
    'NO_MATCH',
    'LOW_CONFIDENCE',
    'LIVENESS_FAILED',
    'IMAGE_QUALITY_FAILED',
    'TEMPLATE_NOT_AVAILABLE',
    'PROVIDER_UNAVAILABLE',
    'CONSENT_REQUIRED',
    'MANUAL_REVIEW_REQUIRED',
    'MODULE_DISABLED',
    'GEOFENCE_FAILED'
  )),
  face_similarity_score NUMERIC(5,2) DEFAULT NULL,
  liveness_score NUMERIC(5,2) DEFAULT NULL,
  liveness_passed BOOLEAN NOT NULL DEFAULT false,
  latitude NUMERIC(10,7) DEFAULT NULL,
  longitude NUMERIC(10,7) DEFAULT NULL,
  gps_accuracy_meters NUMERIC(8,2) DEFAULT NULL,
  gps_captured_at TIMESTAMPTZ DEFAULT NULL,
  is_mock_location BOOLEAN NOT NULL DEFAULT false,
  work_location_id UUID DEFAULT NULL REFERENCES public.work_locations(id) ON DELETE SET NULL,
  distance_meters NUMERIC(10,2) DEFAULT NULL,
  geofence_passed BOOLEAN NOT NULL DEFAULT false,
  provider_code TEXT NOT NULL DEFAULT 'SANDBOX_CHALLENGE',
  is_production_biometric BOOLEAN NOT NULL DEFAULT false,
  policy_version_applied INTEGER NOT NULL DEFAULT 1,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT DEFAULT NULL,
  attendance_punch_id UUID DEFAULT NULL,
  attendance_daily_id UUID DEFAULT NULL,
  is_offline_sync BOOLEAN NOT NULL DEFAULT false,
  device_id TEXT DEFAULT NULL,
  device_risk_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  capture_image_path TEXT DEFAULT NULL,
  failure_reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faceattend_attempts_org_time
  ON public.faceattend_verification_attempts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faceattend_attempts_emp_time
  ON public.faceattend_verification_attempts(organization_id, employee_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_faceattend_attempts_idempotency
  ON public.faceattend_verification_attempts(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 6. NON-BIOMETRIC EXCEPTION REVIEWS & AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.faceattend_exception_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attempt_id UUID DEFAULT NULL REFERENCES public.faceattend_verification_attempts(id) ON DELETE SET NULL,
  requested_punch_type TEXT NOT NULL CHECK (requested_punch_type IN ('CHECK_IN', 'CHECK_OUT')),
  fallback_reason TEXT NOT NULL,
  latitude NUMERIC(10,7) DEFAULT NULL,
  longitude NUMERIC(10,7) DEFAULT NULL,
  work_location_id UUID DEFAULT NULL REFERENCES public.work_locations(id) ON DELETE SET NULL,
  distance_meters NUMERIC(10,2) DEFAULT NULL,
  review_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (review_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by UUID DEFAULT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  review_notes TEXT DEFAULT NULL,
  committed_punch_id UUID DEFAULT NULL,
  committed_daily_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faceattend_exceptions_org_status
  ON public.faceattend_exception_reviews(organization_id, review_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.faceattend_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID DEFAULT NULL,
  actor_employee_id UUID DEFAULT NULL,
  event_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID DEFAULT NULL,
  correlation_id TEXT DEFAULT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faceattend_audit_org_time
  ON public.faceattend_audit_logs(organization_id, created_at DESC);

-- ============================================================================
-- 7. ADDITIVE METADATA LINKS ON ATTENDANCE TABLES
-- ============================================================================
ALTER TABLE public.attendance_punches
  ADD COLUMN IF NOT EXISTS faceattend_attempt_id UUID DEFAULT NULL;

ALTER TABLE public.attendance_daily
  ADD COLUMN IF NOT EXISTS faceattend_attempt_id UUID DEFAULT NULL;

-- ============================================================================
-- 8. UPDATED_AT TRIGGERS
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'faceattend_org_settings',
    'faceattend_subscriptions',
    'faceattend_consents',
    'faceattend_templates',
    'faceattend_exception_reviews'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON public.%I;', tbl);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();', tbl);
  END LOOP;
END $$;

-- ============================================================================
-- 9. STRICT MULTI-TENANT & ROLE-SCOPED ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.faceattend_org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceattend_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceattend_billing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceattend_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceattend_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceattend_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceattend_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceattend_exception_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceattend_audit_logs ENABLE ROW LEVEL SECURITY;

-- Org Settings & Subscriptions: Authenticated org members can read own org; Admins/Platform manage
DROP POLICY IF EXISTS "faceattend_org_settings_select" ON public.faceattend_org_settings;
CREATE POLICY "faceattend_org_settings_select" ON public.faceattend_org_settings
FOR SELECT TO authenticated
USING (organization_id = (SELECT public.get_active_user_org_id()) OR public.is_platform_admin());

DROP POLICY IF EXISTS "faceattend_org_settings_write" ON public.faceattend_org_settings;
CREATE POLICY "faceattend_org_settings_write" ON public.faceattend_org_settings
FOR ALL TO authenticated
USING ((organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text)) OR public.is_platform_admin())
WITH CHECK ((organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text)) OR public.is_platform_admin());

DROP POLICY IF EXISTS "faceattend_subscriptions_select" ON public.faceattend_subscriptions;
CREATE POLICY "faceattend_subscriptions_select" ON public.faceattend_subscriptions
FOR SELECT TO authenticated
USING (organization_id = (SELECT public.get_active_user_org_id()) OR public.is_platform_admin());

DROP POLICY IF EXISTS "faceattend_subscriptions_write" ON public.faceattend_subscriptions;
CREATE POLICY "faceattend_subscriptions_write" ON public.faceattend_subscriptions
FOR ALL TO authenticated
USING ((organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text)) OR public.is_platform_admin())
WITH CHECK ((organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text)) OR public.is_platform_admin());

-- Billing Snapshots: Admin / Platform read & insert only (immutable trigger prevents edit/delete)
DROP POLICY IF EXISTS "faceattend_billing_select" ON public.faceattend_billing_snapshots;
CREATE POLICY "faceattend_billing_select" ON public.faceattend_billing_snapshots
FOR SELECT TO authenticated
USING ((organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text)) OR public.is_platform_admin());

DROP POLICY IF EXISTS "faceattend_billing_insert" ON public.faceattend_billing_snapshots;
CREATE POLICY "faceattend_billing_insert" ON public.faceattend_billing_snapshots
FOR INSERT TO authenticated
WITH CHECK ((organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text)) OR public.is_platform_admin());

-- Helper to resolve current authenticated employee_id safely
CREATE OR REPLACE FUNCTION public.fn_current_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.user_profiles up
  JOIN public.employees e ON (
    e.id = up.employee_id
    OR e.user_id = up.id
    OR e.user_id = up.auth_user_id
    OR lower(e.work_email) = lower(up.email)
  )
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Consents: Own employee OR Org Admin / Platform Admin
DROP POLICY IF EXISTS "faceattend_consents_select" ON public.faceattend_consents;
CREATE POLICY "faceattend_consents_select" ON public.faceattend_consents
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.fn_current_employee_id())
      OR public.is_org_admin(organization_id::text)
    )
  )
);

DROP POLICY IF EXISTS "faceattend_consents_write" ON public.faceattend_consents;
CREATE POLICY "faceattend_consents_write" ON public.faceattend_consents
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.fn_current_employee_id())
      OR public.is_org_admin(organization_id::text)
    )
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.fn_current_employee_id())
      OR public.is_org_admin(organization_id::text)
    )
  )
);

-- Templates: Strict read & write isolation (Own employee OR Org Admin / Platform Admin; managers/supervisors restricted unless Admin or delegated)
DROP POLICY IF EXISTS "faceattend_templates_select" ON public.faceattend_templates;
CREATE POLICY "faceattend_templates_select" ON public.faceattend_templates
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.fn_current_employee_id())
      OR public.is_org_admin(organization_id::text)
    )
  )
);

DROP POLICY IF EXISTS "faceattend_templates_insert" ON public.faceattend_templates;
CREATE POLICY "faceattend_templates_insert" ON public.faceattend_templates
FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.fn_current_employee_id())
      OR public.is_org_admin(organization_id::text)
    )
  )
);

DROP POLICY IF EXISTS "faceattend_templates_update" ON public.faceattend_templates;
CREATE POLICY "faceattend_templates_update" ON public.faceattend_templates
FOR UPDATE TO authenticated
USING (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      public.is_org_admin(organization_id::text)
      OR employee_id = (SELECT public.fn_current_employee_id())
    )
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      public.is_org_admin(organization_id::text)
      OR employee_id = (SELECT public.fn_current_employee_id())
    )
  )
);

-- Challenges: Own employee create/read within same tenant
DROP POLICY IF EXISTS "faceattend_challenges_rw" ON public.faceattend_challenges;
CREATE POLICY "faceattend_challenges_rw" ON public.faceattend_challenges
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (employee_id = (SELECT public.fn_current_employee_id()) OR public.is_org_admin(organization_id::text))
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (employee_id = (SELECT public.fn_current_employee_id()) OR public.is_org_admin(organization_id::text))
  )
);

-- Verification Attempts & Exception Reviews: Own employee OR Org Admin / Supervisor for subordinates / Platform Admin
DROP POLICY IF EXISTS "faceattend_attempts_select" ON public.faceattend_verification_attempts;
CREATE POLICY "faceattend_attempts_select" ON public.faceattend_verification_attempts
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.fn_current_employee_id())
      OR public.is_org_admin(organization_id::text)
      OR public.is_garment_supervisor(organization_id)
      OR employee_id IN (
        SELECT emp.id FROM public.employees emp
        WHERE emp.reporting_manager_id = (SELECT public.fn_current_employee_id())
      )
    )
  )
);

DROP POLICY IF EXISTS "faceattend_attempts_service_write" ON public.faceattend_verification_attempts;
CREATE POLICY "faceattend_attempts_service_write" ON public.faceattend_verification_attempts
FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "faceattend_exceptions_select" ON public.faceattend_exception_reviews;
CREATE POLICY "faceattend_exceptions_select" ON public.faceattend_exception_reviews
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.fn_current_employee_id())
      OR public.is_org_admin(organization_id::text)
      OR public.is_garment_supervisor(organization_id)
      OR employee_id IN (
        SELECT emp.id FROM public.employees emp
        WHERE emp.reporting_manager_id = (SELECT public.fn_current_employee_id())
      )
    )
  )
);

DROP POLICY IF EXISTS "faceattend_exceptions_write" ON public.faceattend_exception_reviews;
CREATE POLICY "faceattend_exceptions_write" ON public.faceattend_exception_reviews
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.fn_current_employee_id())
      OR public.is_org_admin(organization_id::text)
      OR public.is_garment_supervisor(organization_id)
      OR employee_id IN (
        SELECT emp.id FROM public.employees emp
        WHERE emp.reporting_manager_id = (SELECT public.fn_current_employee_id())
      )
    )
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.fn_current_employee_id())
      OR public.is_org_admin(organization_id::text)
      OR public.is_garment_supervisor(organization_id)
    )
  )
);

-- Audit Logs: Admin / Platform Admin read; insert via authenticated/service within tenant
DROP POLICY IF EXISTS "faceattend_audit_select" ON public.faceattend_audit_logs;
CREATE POLICY "faceattend_audit_select" ON public.faceattend_audit_logs
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR (organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text))
);

DROP POLICY IF EXISTS "faceattend_audit_insert" ON public.faceattend_audit_logs;
CREATE POLICY "faceattend_audit_insert" ON public.faceattend_audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR organization_id = (SELECT public.get_active_user_org_id())
);

-- ============================================================================
-- 10. ATOMIC TRANSACTIONAL FACEATTEND PUNCH COMMIT RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_commit_faceattend_punch(
  p_organization_id UUID,
  p_employee_id UUID,
  p_attempt_id UUID,
  p_punch_type TEXT, -- 'CHECK_IN' | 'CHECK_OUT'
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_accuracy NUMERIC DEFAULT 20.0,
  p_work_location_id UUID DEFAULT NULL,
  p_work_location_name TEXT DEFAULT NULL,
  p_distance_meters NUMERIC DEFAULT 0.0,
  p_location_authorized BOOLEAN DEFAULT true,
  p_reason TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_punch_time TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entitlement_enabled BOOLEAN := false;
  v_sub_status TEXT := NULL;
  v_norm_type TEXT := UPPER(TRIM(COALESCE(p_punch_type, 'CHECK_IN')));
  v_now TIMESTAMPTZ := COALESCE(p_punch_time, now());
  v_now_ist TIMESTAMP := (COALESCE(p_punch_time, now()) AT TIME ZONE 'Asia/Kolkata');
  v_today DATE := (COALESCE(p_punch_time, now()) AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_yesterday DATE := ((COALESCE(p_punch_time, now()) AT TIME ZONE 'Asia/Kolkata')::DATE - INTERVAL '1 day')::DATE;
  v_now_time TIME := (COALESCE(p_punch_time, now()) AT TIME ZONE 'Asia/Kolkata')::TIME;
  v_existing_punch RECORD;
  v_shift RECORD;
  v_shift_id UUID := NULL;
  v_shift_full_day_mins INTEGER := 480;
  v_daily RECORD;
  v_daily_yesterday RECORD;
  v_shift_cutoff TIME := TIME '12:00:00';
  v_target_date DATE := v_today;
  v_saved_punch_id UUID;
  v_saved_daily_id UUID;
  v_first_in TIMESTAMPTZ;
  v_last_out TIMESTAMPTZ;
  v_gross_minutes INTEGER := 0;
  v_overtime_minutes INTEGER := 0;
  v_overtime_eligible BOOLEAN := true;
  v_unauthorized_checkout BOOLEAN := false;
BEGIN
  -- Acquire advisory transaction lock scoped to employee to guarantee concurrency safety
  PERFORM pg_advisory_xact_lock(hashtext('faceattend_' || p_employee_id::text));

  -- 1. Enforce Tenant SaaS Entitlement & Subscription at DB Layer
  SELECT oae.is_enabled INTO v_entitlement_enabled
  FROM public.organization_addon_entitlements oae
  WHERE oae.organization_id = p_organization_id
    AND oae.addon_key = 'face_attend';

  IF COALESCE(v_entitlement_enabled, false) = false THEN
    RAISE EXCEPTION 'MODULE_DISABLED: JOY FaceAttend add-on is not enabled for this organization.';
  END IF;

  SELECT s.status INTO v_sub_status
  FROM public.faceattend_subscriptions s
  WHERE s.organization_id = p_organization_id;

  IF v_sub_status IN ('SUSPENDED', 'CANCELLED', 'EXPIRED') THEN
    RAISE EXCEPTION 'SUBSCRIPTION_INACTIVE: JOY FaceAttend subscription status is %.', v_sub_status;
  END IF;

  -- 2. Idempotency Guard
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, attendance_date, punch_type, punch_time
    INTO v_existing_punch
    FROM public.attendance_punches
    WHERE organization_id = p_organization_id
      AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_existing_punch.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'punch_id', v_existing_punch.id,
        'attendance_date', v_existing_punch.attendance_date,
        'punch_type', v_existing_punch.punch_type,
        'punch_time', v_existing_punch.punch_time
      );
    END IF;
  END IF;

  -- 3. Normalize punch type ('IN' | 'OUT' stored in attendance_punches as 'IN' / 'OUT')
  IF v_norm_type IN ('IN', 'CHECK_IN') THEN
    v_norm_type := 'IN';
  ELSIF v_norm_type IN ('OUT', 'CHECK_OUT') THEN
    v_norm_type := 'OUT';
  ELSE
    RAISE EXCEPTION 'INVALID_PUNCH_TYPE: %', p_punch_type;
  END IF;

  -- 4. Resolve active shift for employee
  SELECT s.* INTO v_shift
  FROM public.employee_shift_assignments esa
  JOIN public.shifts s ON s.id = esa.shift_id
  WHERE esa.employee_id = p_employee_id
    AND esa.valid_from <= v_today
    AND (esa.valid_to IS NULL OR esa.valid_to >= v_today)
  ORDER BY esa.valid_from DESC
  LIMIT 1;

  IF v_shift.id IS NULL THEN
    SELECT * INTO v_shift
    FROM public.shifts
    WHERE organization_id = p_organization_id AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  v_shift_id := v_shift.id;
  v_shift_full_day_mins := COALESCE((v_shift.min_full_day_hours * 60)::INTEGER, 480);

  -- 5. CHECK-IN PATH
  IF v_norm_type = 'IN' THEN
    SELECT * INTO v_daily
    FROM public.attendance_daily
    WHERE employee_id = p_employee_id AND attendance_date = v_today;

    IF v_daily.id IS NOT NULL AND v_daily.first_check_in IS NOT NULL AND v_daily.last_check_out IS NULL THEN
      RAISE EXCEPTION 'DUPLICATE_CHECK_IN: Employee already has an active check-in for today (%).', v_today;
    END IF;

    -- Check unclosed yesterday night shift before starting today
    SELECT d.*, s.attendance_date_cutoff INTO v_daily_yesterday
    FROM public.attendance_daily d
    LEFT JOIN public.shifts s ON s.id = d.shift_id
    WHERE d.employee_id = p_employee_id
      AND d.attendance_date = v_yesterday
      AND d.first_check_in IS NOT NULL
      AND d.last_check_out IS NULL;

    IF v_daily_yesterday.id IS NOT NULL THEN
      v_shift_cutoff := COALESCE(v_daily_yesterday.attendance_date_cutoff, TIME '12:00:00');
      IF v_now_time <= v_shift_cutoff THEN
        RAISE EXCEPTION 'OPEN_NIGHT_SHIFT: Active night shift from yesterday (%) must be checked out first.', v_yesterday;
      END IF;
    END IF;

    INSERT INTO public.attendance_punches (
      organization_id, employee_id, punch_time, punch_type, verification_mode,
      latitude, longitude, accuracy_meters, work_location_id, distance_meters,
      location_authorized, unauthorized_checkout, unauthorized_checkout_reason,
      punch_source, attendance_date, idempotency_key, faceattend_attempt_id, is_processed
    ) VALUES (
      p_organization_id, p_employee_id, v_now, 'IN', 'FACE',
      p_latitude, p_longitude, COALESCE(p_accuracy, 20.0), p_work_location_id, COALESCE(p_distance_meters, 0),
      COALESCE(p_location_authorized, true), false, NULL,
      'JOY_FACEATTEND', v_today, p_idempotency_key, p_attempt_id, true
    ) RETURNING id INTO v_saved_punch_id;

    INSERT INTO public.attendance_daily (
      organization_id, employee_id, shift_id, attendance_date,
      first_check_in, last_check_out, status, payable_status,
      total_work_minutes, break_minutes, overtime_minutes, overtime_eligible,
      unauthorized_checkout, check_in_work_location_id, check_in_location_name,
      is_regularized, faceattend_attempt_id, created_at, updated_at
    ) VALUES (
      p_organization_id, p_employee_id, v_shift_id, v_today,
      v_now, NULL, 'PRESENT'::public.attendance_status_enum, 1.0,
      0, 0, 0, true,
      false, p_work_location_id, COALESCE(p_work_location_name, 'FaceAttend Verified Location'),
      false, p_attempt_id, v_now, v_now
    )
    ON CONFLICT (employee_id, attendance_date)
    DO UPDATE SET
      shift_id = COALESCE(public.attendance_daily.shift_id, EXCLUDED.shift_id),
      first_check_in = COALESCE(public.attendance_daily.first_check_in, EXCLUDED.first_check_in),
      status = 'PRESENT'::public.attendance_status_enum,
      check_in_work_location_id = COALESCE(public.attendance_daily.check_in_work_location_id, EXCLUDED.check_in_work_location_id),
      check_in_location_name = COALESCE(public.attendance_daily.check_in_location_name, EXCLUDED.check_in_location_name),
      faceattend_attempt_id = COALESCE(EXCLUDED.faceattend_attempt_id, public.attendance_daily.faceattend_attempt_id),
      updated_at = v_now
    RETURNING id INTO v_saved_daily_id;

    PERFORM public.fn_recalculate_daily_attendance(p_employee_id, v_today);

    RETURN jsonb_build_object(
      'success', true,
      'punch_id', v_saved_punch_id,
      'daily_id', v_saved_daily_id,
      'punch_type', 'CHECK_IN',
      'attendance_date', v_today,
      'punch_time', v_now,
      'location_name', COALESCE(p_work_location_name, 'FaceAttend Verified Location')
    );

  -- 6. CHECK-OUT PATH
  ELSE
    v_target_date := public.fn_determine_attendance_session_date(p_employee_id, v_now, 'OUT');

    SELECT * INTO v_daily
    FROM public.attendance_daily
    WHERE employee_id = p_employee_id
      AND attendance_date = v_target_date
      AND first_check_in IS NOT NULL
      AND last_check_out IS NULL;

    IF v_daily.id IS NULL THEN
      SELECT * INTO v_daily
      FROM public.attendance_daily
      WHERE employee_id = p_employee_id
        AND attendance_date = v_today
        AND first_check_in IS NOT NULL
        AND last_check_out IS NULL;
      IF v_daily.id IS NOT NULL THEN
        v_target_date := v_today;
      ELSE
        SELECT * INTO v_daily
        FROM public.attendance_daily
        WHERE employee_id = p_employee_id
          AND attendance_date = v_yesterday
          AND first_check_in IS NOT NULL
          AND last_check_out IS NULL;
        IF v_daily.id IS NOT NULL THEN
          v_target_date := v_yesterday;
        END IF;
      END IF;
    END IF;

    IF v_daily.id IS NULL THEN
      RAISE EXCEPTION 'NO_ACTIVE_CHECKIN: No active check-in session found for check-out.';
    END IF;

    IF COALESCE(p_location_authorized, true) = false THEN
      v_unauthorized_checkout := true;
      v_overtime_eligible := false;
      v_overtime_minutes := 0;
    ELSE
      v_unauthorized_checkout := false;
      v_overtime_eligible := true;
    END IF;

    v_first_in := v_daily.first_check_in;
    v_last_out := v_now;
    v_gross_minutes := GREATEST(0, (EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 60)::INTEGER);

    IF v_overtime_eligible AND v_gross_minutes > (v_shift_full_day_mins + 30) THEN
      v_overtime_minutes := v_gross_minutes - v_shift_full_day_mins;
    ELSE
      v_overtime_minutes := 0;
    END IF;

    INSERT INTO public.attendance_punches (
      organization_id, employee_id, punch_time, punch_type, verification_mode,
      latitude, longitude, accuracy_meters, work_location_id, distance_meters,
      location_authorized, unauthorized_checkout, unauthorized_checkout_reason,
      punch_source, attendance_date, idempotency_key, faceattend_attempt_id, is_processed
    ) VALUES (
      p_organization_id, p_employee_id, v_now, 'OUT', 'FACE',
      p_latitude, p_longitude, COALESCE(p_accuracy, 20.0), p_work_location_id, COALESCE(p_distance_meters, 0),
      COALESCE(p_location_authorized, true), v_unauthorized_checkout,
      CASE WHEN v_unauthorized_checkout THEN NULLIF(TRIM(COALESCE(p_reason, '')), '') ELSE NULL END,
      'JOY_FACEATTEND', v_target_date, p_idempotency_key, p_attempt_id, true
    ) RETURNING id INTO v_saved_punch_id;

    UPDATE public.attendance_daily
    SET
      last_check_out = v_now,
      total_work_minutes = v_gross_minutes,
      overtime_minutes = v_overtime_minutes,
      overtime_eligible = v_overtime_eligible,
      unauthorized_checkout = v_unauthorized_checkout,
      unauthorized_checkout_reason = CASE WHEN v_unauthorized_checkout THEN NULLIF(TRIM(COALESCE(p_reason, '')), '') ELSE NULL END,
      check_out_work_location_id = p_work_location_id,
      check_out_location_name = CASE WHEN COALESCE(p_location_authorized, true) THEN COALESCE(p_work_location_name, 'FaceAttend Verified Location') ELSE 'Off-Site / External Location' END,
      faceattend_attempt_id = COALESCE(p_attempt_id, faceattend_attempt_id),
      updated_at = v_now
    WHERE id = v_daily.id
    RETURNING id INTO v_saved_daily_id;

    PERFORM public.fn_recalculate_daily_attendance(p_employee_id, v_target_date);

    RETURN jsonb_build_object(
      'success', true,
      'punch_id', v_saved_punch_id,
      'daily_id', v_saved_daily_id,
      'punch_type', 'CHECK_OUT',
      'attendance_date', v_target_date,
      'punch_time', v_now,
      'total_work_minutes', v_gross_minutes
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_commit_faceattend_punch(UUID, UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, UUID, TEXT, NUMERIC, BOOLEAN, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_commit_faceattend_punch(UUID, UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, UUID, TEXT, NUMERIC, BOOLEAN, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- ============================================================================
-- 11. BILLING SNAPSHOT GENERATOR & BIOMETRIC DELETION RPCs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_generate_faceattend_billing_snapshot(
  p_organization_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS public.faceattend_billing_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_enrolled INTEGER := 0;
  v_verified INTEGER := 0;
  v_failed INTEGER := 0;
  v_base_amount NUMERIC(12,2) := 0.00;
  v_usage_amount NUMERIC(12,2) := 0.00;
  v_subtotal NUMERIC(12,2) := 0.00;
  v_existing public.faceattend_billing_snapshots;
  v_created public.faceattend_billing_snapshots;
BEGIN
  IF NOT (public.is_platform_admin() OR (p_organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(p_organization_id::text))) THEN
    RAISE EXCEPTION 'Unauthorized to generate billing snapshots for this organization.';
  END IF;

  SELECT * INTO v_existing
  FROM public.faceattend_billing_snapshots
  WHERE organization_id = p_organization_id
    AND billing_period_start = p_period_start
    AND billing_period_end = p_period_end;

  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT * INTO v_sub
  FROM public.faceattend_subscriptions
  WHERE organization_id = p_organization_id;

  SELECT COUNT(*)::INTEGER INTO v_enrolled
  FROM public.faceattend_templates
  WHERE organization_id = p_organization_id
    AND enrolment_status = 'ACTIVE'
    AND deleted_at IS NULL;

  SELECT
    COUNT(*) FILTER (WHERE decision = 'MATCH')::INTEGER,
    COUNT(*) FILTER (WHERE decision <> 'MATCH')::INTEGER
  INTO v_verified, v_failed
  FROM public.faceattend_verification_attempts
  WHERE organization_id = p_organization_id
    AND (created_at AT TIME ZONE 'Asia/Kolkata')::DATE BETWEEN p_period_start AND p_period_end;

  v_base_amount := GREATEST(
    COALESCE(v_sub.minimum_monthly_fee, 0.00),
    v_enrolled * COALESCE(v_sub.price_per_employee, 25.00)
  );
  v_usage_amount := ROUND((v_verified + v_failed) * COALESCE(v_sub.usage_fee_per_call, 0.0000), 2);
  v_subtotal := ROUND(v_base_amount + COALESCE(v_sub.setup_fee, 0.00) + v_usage_amount, 2);

  INSERT INTO public.faceattend_billing_snapshots (
    organization_id, billing_period_start, billing_period_end,
    snapshot_status, plan_code_snapshot, billing_cycle_snapshot,
    active_enrolled_count, verified_checks_count, failed_checks_count,
    unit_price_snapshot, minimum_fee_snapshot, setup_fee_snapshot,
    usage_charges_snapshot, subtotal_amount, currency_code,
    pricing_rule_snapshot, created_by
  ) VALUES (
    p_organization_id, p_period_start, p_period_end,
    'FINALIZED',
    COALESCE(v_sub.plan_code, 'PRO'),
    COALESCE(v_sub.billing_cycle, 'MONTHLY'),
    v_enrolled, v_verified, v_failed,
    COALESCE(v_sub.price_per_employee, 25.00),
    COALESCE(v_sub.minimum_monthly_fee, 0.00),
    COALESCE(v_sub.setup_fee, 0.00),
    v_usage_amount,
    v_subtotal,
    COALESCE(v_sub.currency_code, 'INR'),
    jsonb_build_object(
      'price_per_employee', COALESCE(v_sub.price_per_employee, 25.00),
      'minimum_monthly_fee', COALESCE(v_sub.minimum_monthly_fee, 0.00),
      'usage_fee_per_call', COALESCE(v_sub.usage_fee_per_call, 0.0000),
      'max_enrolled_employees', v_sub.max_enrolled_employees
    ),
    auth.uid()
  )
  RETURNING * INTO v_created;

  INSERT INTO public.faceattend_audit_logs (
    organization_id, actor_user_id, event_type, target_type, target_id, metadata
  ) VALUES (
    p_organization_id, auth.uid(), 'BILLING_SNAPSHOT_GENERATED', 'faceattend_billing_snapshots', v_created.id,
    jsonb_build_object('subtotal_amount', v_subtotal, 'active_enrolled_count', v_enrolled)
  );

  RETURN v_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_withdraw_faceattend_consent_and_delete(
  p_organization_id UUID,
  p_employee_id UUID,
  p_reason TEXT DEFAULT 'Employee withdrew biometric consent'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_emp UUID := public.fn_current_employee_id();
  v_paths TEXT[];
BEGIN
  IF NOT (
    public.is_platform_admin()
    OR (p_organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(p_organization_id::text))
    OR v_caller_emp = p_employee_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized to withdraw consent or delete biometric data for this employee.';
  END IF;

  UPDATE public.faceattend_consents
  SET status = 'WITHDRAWN',
      withdrawn_at = now(),
      withdrawn_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'Consent withdrawn')
  WHERE organization_id = p_organization_id
    AND employee_id = p_employee_id
    AND status = 'GRANTED';

  SELECT ARRAY_AGG(primary_image_path) FILTER (WHERE primary_image_path IS NOT NULL)
  INTO v_paths
  FROM public.faceattend_templates
  WHERE organization_id = p_organization_id
    AND employee_id = p_employee_id
    AND enrolment_status <> 'DELETED';

  UPDATE public.faceattend_templates
  SET enrolment_status = 'DELETED',
      provider_face_token_encrypted = NULL,
      sandbox_feature_digest = NULL,
      deletion_requested_at = now(),
      deleted_at = now(),
      revocation_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'Consent withdrawn')
  WHERE organization_id = p_organization_id
    AND employee_id = p_employee_id
    AND enrolment_status <> 'DELETED';

  INSERT INTO public.faceattend_audit_logs (
    organization_id, actor_user_id, actor_employee_id, event_type, target_type, metadata
  ) VALUES (
    p_organization_id, auth.uid(), v_caller_emp, 'BIOMETRIC_CONSENT_WITHDRAWN_AND_DELETED', 'employees',
    jsonb_build_object('employee_id', p_employee_id, 'reason', p_reason, 'purged_paths', COALESCE(v_paths, ARRAY[]::TEXT[]))
  );

  RETURN jsonb_build_object(
    'ok', true,
    'employee_id', p_employee_id,
    'purged_storage_paths', COALESCE(v_paths, ARRAY[]::TEXT[])
  );
END;
$$;

-- ============================================================================
-- 12. ENABLE REALTIME & SEED PRIMARY TENANT ADD-ON ENTITLEMENT
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.faceattend_verification_attempts;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.faceattend_exception_reviews;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.faceattend_templates;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

INSERT INTO public.organization_addon_entitlements (
  organization_id, addon_key, is_enabled, plan_tier, config_json, enabled_at
)
SELECT
  id,
  'face_attend',
  true,
  'PRO',
  jsonb_build_object(
    'pricing_model', 'PER_EMPLOYEE_MONTHLY',
    'default_price_per_employee', 25,
    'currency', 'INR'
  ),
  now()
FROM public.organizations
WHERE id = '0c621892-e938-4707-9957-13534ea32c19'
ON CONFLICT (organization_id, addon_key) DO NOTHING;

INSERT INTO public.faceattend_org_settings (organization_id)
SELECT id FROM public.organizations WHERE id = '0c621892-e938-4707-9957-13534ea32c19'
ON CONFLICT (organization_id) DO NOTHING;

INSERT INTO public.faceattend_subscriptions (organization_id, plan_code, price_per_employee)
SELECT id, 'PRO', 25.00 FROM public.organizations WHERE id = '0c621892-e938-4707-9957-13534ea32c19'
ON CONFLICT (organization_id) DO NOTHING;

