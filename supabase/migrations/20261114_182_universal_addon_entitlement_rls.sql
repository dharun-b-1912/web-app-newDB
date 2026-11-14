-- ============================================================================
-- Migration 182: Universal Read & Write RLS for Organization Addon Entitlements
-- ============================================================================
-- Allows both anon and authenticated clients to read addon entitlements so the
-- web dashboard and mobile app instantly reflect active modules without race conditions.
-- Also grants full management (INSERT, UPDATE, DELETE) for authenticated users.
-- ============================================================================

DROP POLICY IF EXISTS "addon_entitlements_select" ON public.organization_addon_entitlements;
DROP POLICY IF EXISTS "addon_entitlements_select_v2" ON public.organization_addon_entitlements;
DROP POLICY IF EXISTS "addon_entitlements_select_v3" ON public.organization_addon_entitlements;
DROP POLICY IF EXISTS "addon_entitlements_all" ON public.organization_addon_entitlements;

CREATE POLICY "addon_entitlements_select_v3" ON public.organization_addon_entitlements
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "addon_entitlements_all" ON public.organization_addon_entitlements
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Ensure faceattend_org_settings is readable and writable
DROP POLICY IF EXISTS "faceattend_org_settings_select" ON public.faceattend_org_settings;
DROP POLICY IF EXISTS "faceattend_org_settings_select_v2" ON public.faceattend_org_settings;
DROP POLICY IF EXISTS "faceattend_org_settings_all" ON public.faceattend_org_settings;

CREATE POLICY "faceattend_org_settings_select_v2" ON public.faceattend_org_settings
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "faceattend_org_settings_all" ON public.faceattend_org_settings
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Ensure faceattend_audit_logs can be inserted
DROP POLICY IF EXISTS "faceattend_audit_logs_select" ON public.faceattend_audit_logs;
DROP POLICY IF EXISTS "faceattend_audit_logs_insert" ON public.faceattend_audit_logs;
DROP POLICY IF EXISTS "faceattend_audit_logs_all" ON public.faceattend_audit_logs;

CREATE POLICY "faceattend_audit_logs_all" ON public.faceattend_audit_logs
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);
