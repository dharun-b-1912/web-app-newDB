-- ============================================================================
-- Migration: 20261115_185_phase_a_security_hardening_and_tenant_isolation.sql
-- Joy PeopleHR — Phase A: Multi-Tenant Security Hardening & Zero-Leakage Governance
-- 1. Secure is_platform_admin() against user_metadata privilege escalation.
-- 2. Seal RLS on organization_addon_entitlements, faceattend_org_settings, and biometrics.
-- 3. Deploy authoritative evaluate_tenant_feature() RPC for centralized server-side decisions.
-- ============================================================================

-- ============================================================================
-- 1. SECURE is_platform_admin() FUNCTION
-- ============================================================================
-- Strict server-side verification:
-- 1. Explicit app_metadata (immutable by users, set only by Supabase service_role / backend auth)
-- 2. Root Super Admin email
-- 3. Verified active membership in public.platform_staff
-- NOTE: user_metadata is intentionally EXCLUDED because end-users can mutate it via auth.updateUser()!
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean, false) = true
    OR (auth.jwt() ->> 'email') = 'superadmin@joypeoplehr.com'
    OR EXISTS (
      SELECT 1 FROM public.platform_staff ps
      WHERE (ps.auth_user_id = auth.uid() OR ps.email = (auth.jwt() ->> 'email'))
        AND ps.status = 'Active'
        AND ps.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'OPS_ADMIN')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- ============================================================================
-- 2. AUTHORITATIVE SERVER-SIDE ENTITLEMENT RPC: evaluate_tenant_feature()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.evaluate_tenant_feature(
  p_organization_id UUID,
  p_feature_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_is_globally_enabled BOOLEAN := true;
  v_org_status TEXT;
  v_org_plan TEXT;
  v_override_enabled BOOLEAN;
  v_plan_has_feature BOOLEAN := false;
  v_res_allowed BOOLEAN := false;
  v_res_reason TEXT := 'Feature is locked by default';
  v_res_source TEXT := 'SYSTEM_DEFAULT';
BEGIN
  -- 1. Check Platform Security Kill Switch
  SELECT COALESCE(is_enabled, true) INTO v_is_globally_enabled
  FROM public.platform_feature_flags
  WHERE flag_key = p_feature_key
  LIMIT 1;

  IF v_is_globally_enabled = false THEN
    RETURN jsonb_build_object(
      'is_allowed', false,
      'reason', 'Module temporarily disabled for system maintenance',
      'source', 'GLOBAL_KILL_SWITCH'
    );
  END IF;

  -- 2. Check Organization Status & Subscription
  SELECT status, plan INTO v_org_status, v_org_plan
  FROM public.organizations
  WHERE id = p_organization_id::text OR id::text = p_organization_id::text
  LIMIT 1;

  IF v_org_status IS NULL THEN
    RETURN jsonb_build_object(
      'is_allowed', false,
      'reason', 'Organization record not found',
      'source', 'ORGANIZATION_NOT_FOUND'
    );
  END IF;

  IF v_org_status IN ('Suspended', 'SUSPENDED', 'Locked', 'Archived', 'Cancelled') THEN
    RETURN jsonb_build_object(
      'is_allowed', false,
      'reason', 'Organization account is currently suspended or inactive',
      'source', 'ORGANIZATION_SUSPENDED'
    );
  END IF;

  -- 3. Check Tenant-Specific Override (Addon / Admin Override)
  SELECT is_enabled INTO v_override_enabled
  FROM public.organization_addon_entitlements
  WHERE organization_id = p_organization_id AND addon_key = p_feature_key
  LIMIT 1;

  IF v_override_enabled IS NOT NULL THEN
    IF v_override_enabled = true THEN
      RETURN jsonb_build_object(
        'is_allowed', true,
        'reason', 'Feature unlocked via commercial addon / administrative entitlement',
        'source', 'TENANT_ADDON_ENTITLEMENT'
      );
    ELSE
      RETURN jsonb_build_object(
        'is_allowed', false,
        'reason', 'Feature explicitly locked by platform administrator',
        'source', 'TENANT_ADMIN_LOCK'
      );
    END IF;
  END IF;

  -- Also check platform_tenant_feature_overrides
  SELECT is_enabled INTO v_override_enabled
  FROM public.platform_tenant_feature_overrides
  WHERE tenant_id = p_organization_id::text AND flag_key = p_feature_key
  LIMIT 1;

  IF v_override_enabled IS NOT NULL THEN
    IF v_override_enabled = true THEN
      RETURN jsonb_build_object(
        'is_allowed', true,
        'reason', 'Feature enabled via platform tenant feature override',
        'source', 'PLATFORM_FEATURE_OVERRIDE'
      );
    ELSE
      RETURN jsonb_build_object(
        'is_allowed', false,
        'reason', 'Feature disabled via platform tenant feature override',
        'source', 'PLATFORM_FEATURE_OVERRIDE'
      );
    END IF;
  END IF;

  -- 4. Baseline Plan Matrix Evaluation
  -- Starter includes basic Core HR, Attendance, Leave, Documents
  -- Professional adds Shifts, GPS Geofencing, Onboarding, Offboarding, Assets
  -- Business adds Payroll Engine, Biometric Devices, Vendor Management, Analytics
  -- Enterprise adds FaceAttend, Garment/Manufacturing Piece-Rate
  IF v_org_plan ILIKE '%Enterprise%' THEN
    v_plan_has_feature := true;
  ELSIF v_org_plan ILIKE '%Business%' THEN
    IF p_feature_key IN ('face_attend', 'garment_workforce') THEN
      v_plan_has_feature := false;
    ELSE
      v_plan_has_feature := true;
    END IF;
  ELSIF v_org_plan ILIKE '%Professional%' THEN
    IF p_feature_key IN ('face_attend', 'garment_workforce', 'payroll_engine', 'biometric_hardware', 'vendor_governance') THEN
      v_plan_has_feature := false;
    ELSE
      v_plan_has_feature := true;
    END IF;
  ELSE -- Starter / Free
    IF p_feature_key IN ('core_hr', 'ess', 'attendance', 'leave', 'documents', 'id_card_press', 'helpdesk') THEN
      v_plan_has_feature := true;
    ELSE
      v_plan_has_feature := false;
    END IF;
  END IF;

  IF v_plan_has_feature = true THEN
    RETURN jsonb_build_object(
      'is_allowed', true,
      'reason', 'Feature included in organization active plan tier (' || COALESCE(v_org_plan, 'Starter') || ')',
      'source', 'PLAN_BASELINE'
    );
  ELSE
    RETURN jsonb_build_object(
      'is_allowed', false,
      'reason', 'Feature not included in current plan tier (' || COALESCE(v_org_plan, 'Starter') || '). Upgrade required.',
      'source', 'PLAN_LOCKED'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_tenant_feature(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_tenant_feature(UUID, TEXT) TO anon, authenticated, service_role;

-- ============================================================================
-- 3. HARDEN RLS ON organization_addon_entitlements
-- ============================================================================
ALTER TABLE public.organization_addon_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addon_entitlements_select" ON public.organization_addon_entitlements;
DROP POLICY IF EXISTS "addon_entitlements_select_v2" ON public.organization_addon_entitlements;
DROP POLICY IF EXISTS "addon_entitlements_select_v3" ON public.organization_addon_entitlements;
DROP POLICY IF EXISTS "addon_entitlements_all" ON public.organization_addon_entitlements;
DROP POLICY IF EXISTS "addon_entitlements_super_admin" ON public.organization_addon_entitlements;
DROP POLICY IF EXISTS "addon_entitlements_tenant_isolated_select" ON public.organization_addon_entitlements;
DROP POLICY IF EXISTS "addon_entitlements_tenant_isolated_write" ON public.organization_addon_entitlements;

-- Tenant users can only read their own organization addons; Platform Super Admins can read all
CREATE POLICY "addon_entitlements_tenant_isolated_select" ON public.organization_addon_entitlements
FOR SELECT TO authenticated, anon
USING (
  public.is_platform_admin() = true
  OR organization_id IN (SELECT public.get_auth_user_org_ids())
  OR organization_id = (SELECT public.get_current_user_org_id())
  OR organization_id::text = public.current_org_id()
);

-- Only verified Platform Super Admins or authorized Org Admins can mutate addon entitlements
CREATE POLICY "addon_entitlements_tenant_isolated_write" ON public.organization_addon_entitlements
FOR ALL TO authenticated
USING (
  public.is_platform_admin() = true
  OR (
    (
      organization_id IN (SELECT public.get_auth_user_org_ids())
      OR organization_id = (SELECT public.get_current_user_org_id())
      OR organization_id::text = public.current_org_id()
    )
    AND public.is_org_admin(organization_id::text)
  )
)
WITH CHECK (
  public.is_platform_admin() = true
  OR (
    (
      organization_id IN (SELECT public.get_auth_user_org_ids())
      OR organization_id = (SELECT public.get_current_user_org_id())
      OR organization_id::text = public.current_org_id()
    )
    AND public.is_org_admin(organization_id::text)
  )
);

-- ============================================================================
-- 4. HARDEN RLS ON faceattend_org_settings
-- ============================================================================
ALTER TABLE public.faceattend_org_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faceattend_org_settings_select" ON public.faceattend_org_settings;
DROP POLICY IF EXISTS "faceattend_org_settings_select_v2" ON public.faceattend_org_settings;
DROP POLICY IF EXISTS "faceattend_org_settings_all" ON public.faceattend_org_settings;
DROP POLICY IF EXISTS "faceattend_settings_isolated_select" ON public.faceattend_org_settings;
DROP POLICY IF EXISTS "faceattend_settings_isolated_write" ON public.faceattend_org_settings;

CREATE POLICY "faceattend_settings_isolated_select" ON public.faceattend_org_settings
FOR SELECT TO authenticated, anon
USING (
  public.is_platform_admin() = true
  OR organization_id IN (SELECT public.get_auth_user_org_ids())
  OR organization_id = (SELECT public.get_current_user_org_id())
  OR organization_id::text = public.current_org_id()
);

CREATE POLICY "faceattend_settings_isolated_write" ON public.faceattend_org_settings
FOR ALL TO authenticated
USING (
  public.is_platform_admin() = true
  OR (
    (
      organization_id IN (SELECT public.get_auth_user_org_ids())
      OR organization_id = (SELECT public.get_current_user_org_id())
      OR organization_id::text = public.current_org_id()
    )
    AND public.is_org_admin(organization_id::text)
  )
)
WITH CHECK (
  public.is_platform_admin() = true
  OR (
    (
      organization_id IN (SELECT public.get_auth_user_org_ids())
      OR organization_id = (SELECT public.get_current_user_org_id())
      OR organization_id::text = public.current_org_id()
    )
    AND public.is_org_admin(organization_id::text)
  )
);

-- ============================================================================
-- 5. HARDEN RLS ON BIOMETRICS FLEET TABLES
-- ============================================================================
ALTER TABLE public.biometric_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_raw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_device_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bio_connectors_super_admin ON public.biometric_connectors;
DROP POLICY IF EXISTS bio_raw_events_super_admin ON public.biometric_raw_events;
DROP POLICY IF EXISTS bio_commands_super_admin ON public.biometric_device_commands;
DROP POLICY IF EXISTS bio_incidents_super_admin ON public.biometric_device_incidents;
DROP POLICY IF EXISTS bio_backups_super_admin ON public.biometric_backups;

CREATE POLICY bio_connectors_isolated ON public.biometric_connectors
FOR ALL TO authenticated
USING (
  public.is_platform_admin() = true
  OR organization_id IN (SELECT public.get_auth_user_org_ids())
  OR organization_id = (SELECT public.get_current_user_org_id())
  OR organization_id::text = public.current_org_id()
)
WITH CHECK (
  public.is_platform_admin() = true
  OR (
    (
      organization_id IN (SELECT public.get_auth_user_org_ids())
      OR organization_id = (SELECT public.get_current_user_org_id())
      OR organization_id::text = public.current_org_id()
    )
    AND public.is_org_admin(organization_id::text)
  )
);

CREATE POLICY bio_commands_isolated ON public.biometric_device_commands
FOR ALL TO authenticated
USING (
  public.is_platform_admin() = true
  OR organization_id IN (SELECT public.get_auth_user_org_ids())
  OR organization_id = (SELECT public.get_current_user_org_id())
  OR organization_id::text = public.current_org_id()
)
WITH CHECK (
  public.is_platform_admin() = true
  OR (
    (
      organization_id IN (SELECT public.get_auth_user_org_ids())
      OR organization_id = (SELECT public.get_current_user_org_id())
      OR organization_id::text = public.current_org_id()
    )
    AND public.is_org_admin(organization_id::text)
  )
);

CREATE POLICY bio_incidents_isolated ON public.biometric_device_incidents
FOR ALL TO authenticated
USING (
  public.is_platform_admin() = true
  OR organization_id IN (SELECT public.get_auth_user_org_ids())
  OR organization_id = (SELECT public.get_current_user_org_id())
  OR organization_id::text = public.current_org_id()
)
WITH CHECK (
  public.is_platform_admin() = true
  OR (
    (
      organization_id IN (SELECT public.get_auth_user_org_ids())
      OR organization_id = (SELECT public.get_current_user_org_id())
      OR organization_id::text = public.current_org_id()
    )
    AND public.is_org_admin(organization_id::text)
  )
);

CREATE POLICY bio_backups_isolated ON public.biometric_backups
FOR ALL TO authenticated
USING (
  public.is_platform_admin() = true
  OR organization_id IN (SELECT public.get_auth_user_org_ids())
  OR organization_id = (SELECT public.get_current_user_org_id())
  OR organization_id::text = public.current_org_id()
)
WITH CHECK (
  public.is_platform_admin() = true
  OR (
    (
      organization_id IN (SELECT public.get_auth_user_org_ids())
      OR organization_id = (SELECT public.get_current_user_org_id())
      OR organization_id::text = public.current_org_id()
    )
    AND public.is_org_admin(organization_id::text)
  )
);

CREATE POLICY bio_raw_events_isolated ON public.biometric_raw_events
FOR ALL TO authenticated
USING (
  public.is_platform_admin() = true
  OR organization_id IN (SELECT public.get_auth_user_org_ids())
  OR organization_id = (SELECT public.get_current_user_org_id())
  OR organization_id::text = public.current_org_id()
)
WITH CHECK (
  public.is_platform_admin() = true
  OR (
    (
      organization_id IN (SELECT public.get_auth_user_org_ids())
      OR organization_id = (SELECT public.get_current_user_org_id())
      OR organization_id::text = public.current_org_id()
    )
    AND public.is_org_admin(organization_id::text)
  )
);

