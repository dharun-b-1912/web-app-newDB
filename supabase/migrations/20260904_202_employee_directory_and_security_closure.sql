-- ============================================================================
-- JOY PeopleHR — Migration 20260904_202
-- Security Closure: Directory Privacy Projection & Function Permission Hardening
-- Canonical Project: ysiajemrqakfngasehhi
-- ============================================================================

-- 1. Hardening Function Grants (Task C)
-- Revoke PUBLIC and anon execute grants on security-critical helper functions
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_active_user_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_user_org_id() TO authenticated, service_role;

-- 2. Restrict Direct SELECT on public.employees (Task D)
-- Only own-row for employees; full organization access for HR/Admin and Platform Admin
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;

CREATE POLICY "employees_select_policy" ON public.employees
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR user_id = (
    SELECT up.id
    FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

-- 3. Create Secure Employee Directory Projection (Task D & E)
-- Exposes only safe directory columns for peer employee discovery within the organization
CREATE OR REPLACE VIEW public.employee_directory
WITH (security_invoker = true)
AS
SELECT
  e.id,
  e.organization_id,
  e.company_id,
  e.branch_id,
  e.department_id,
  e.designation_id,
  e.reporting_manager_id,
  e.employee_code,
  e.first_name,
  e.last_name,
  e.display_name,
  e.work_email,
  e.phone,
  e.avatar_url,
  e.employment_status,
  e.employment_type
FROM public.employees e
WHERE e.organization_id = public.get_active_user_org_id()
   OR public.is_platform_admin();

-- Restrict view access to authenticated users
GRANT SELECT ON public.employee_directory TO authenticated, service_role;
REVOKE ALL ON public.employee_directory FROM PUBLIC, anon;
