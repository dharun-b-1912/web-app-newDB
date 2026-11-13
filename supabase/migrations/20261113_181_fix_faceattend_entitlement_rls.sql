-- ============================================================================
-- Migration 181: Permissive Read RLS for Organization Addon Entitlements
-- ============================================================================
-- Ensures authenticated users can read the organization's addon entitlements
-- (such as face_attend) and faceattend_org_settings, avoiding false
-- "Disabled Add-on" screens in production web dashboard.
-- ============================================================================

DROP POLICY IF EXISTS "addon_entitlements_select" ON public.organization_addon_entitlements;
DROP POLICY IF EXISTS "addon_entitlements_select_v2" ON public.organization_addon_entitlements;

CREATE POLICY "addon_entitlements_select_v2" ON public.organization_addon_entitlements
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "faceattend_org_settings_select" ON public.faceattend_org_settings;
CREATE POLICY "faceattend_org_settings_select" ON public.faceattend_org_settings
FOR SELECT TO authenticated
USING (true);
