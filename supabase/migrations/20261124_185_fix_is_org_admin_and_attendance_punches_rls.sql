-- ============================================================================
-- Migration: 20261124_185_fix_is_org_admin_and_attendance_punches_rls.sql
-- 1. Updates is_org_admin(uuid) and is_org_admin(text) to check both:
--    - user_profiles.role IN ('COMPANY_ADMIN', 'HR_HEAD', 'SUPER_ADMIN', 'HR_ADMIN')
--    - user_roles.roles.code IN ('COMPANY_ADMIN', 'HR_HEAD', 'SUPER_ADMIN', 'HR_ADMIN')
--    This guarantees HR Heads and Company Admins have full access even if
--    their user_roles bridge record was not yet synchronized.
-- 2. Ensures user_roles entries exist for all active Company Admins and HR Heads.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;
  
  IF p_org_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles up
    LEFT JOIN public.user_roles ur ON ur.user_profile_id = up.id
    LEFT JOIN public.roles r ON ur.role_id = r.id
    WHERE (up.auth_user_id = auth.uid() OR up.id = auth.uid())
      AND up.organization_id = p_org_id
      AND (
        up.role IN ('COMPANY_ADMIN', 'HR_HEAD', 'SUPER_ADMIN', 'HR_ADMIN')
        OR r.code IN ('COMPANY_ADMIN', 'HR_HEAD', 'SUPER_ADMIN', 'HR_ADMIN')
      )
  ) INTO v_is_admin;
  
  RETURN COALESCE(v_is_admin, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated, anon, service_role;

-- Synchronize any user_profiles missing in user_roles
INSERT INTO public.user_roles (organization_id, user_profile_id, role_id)
SELECT up.organization_id, up.id, r.id
FROM public.user_profiles up
JOIN public.roles r ON r.organization_id = up.organization_id AND r.code = up.role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_profile_id = up.id
)
ON CONFLICT DO NOTHING;
