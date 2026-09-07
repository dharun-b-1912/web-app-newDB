-- ============================================================================
-- Migration: 20260904_100_employee_row_level_authorization.sql
-- Target Project: ysiajemrqakfngasehhi
-- Description: Enforce strict row-level authorization on employees table & domain tables
-- ============================================================================

-- 1. Helper: Check if active user is an Organization Admin (Company Admin or HR Head) or Platform Admin
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 
      FROM public.user_profiles up
      JOIN public.user_roles ur ON ur.user_profile_id = up.id
      JOIN public.roles r ON ur.role_id = r.id
      WHERE up.auth_user_id = auth.uid()
        AND up.organization_id = p_org_id
        AND r.code IN ('COMPANY_ADMIN', 'HR_HEAD', 'SUPER_ADMIN')
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO anon, authenticated, service_role, public;

-- 2. Drop existing monolithic policies on public.employees
DROP POLICY IF EXISTS "employees_tenant_isolation" ON public.employees;
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_update_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON public.employees;

-- 3. Create command-specific policies on public.employees

-- SELECT: Organization-scoped (Employees can view directory within their tenant, Platform Admin across all)
CREATE POLICY "employees_select_policy" ON public.employees
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR (SELECT public.is_platform_admin())
);

-- INSERT: Only Company Admin, HR Head, or Platform Admin
CREATE POLICY "employees_insert_policy" ON public.employees
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
);

-- UPDATE: Company Admin / HR Head / Platform Admin can update any employee in org; Ordinary Employee can ONLY update their own row
CREATE POLICY "employees_update_policy" ON public.employees
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR (
    user_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
    AND organization_id = (SELECT public.get_active_user_org_id())
  )
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR (
    user_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
    AND organization_id = (SELECT public.get_active_user_org_id())
  )
);

-- DELETE: Only Company Admin, HR Head, or Platform Admin
CREATE POLICY "employees_delete_policy" ON public.employees
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
);

-- 4. Trigger: Protect immutable & HR-controlled fields when ordinary employees update their own row
CREATE OR REPLACE FUNCTION public.fn_prevent_employee_field_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If caller is Org Admin (Company Admin / HR Head) or Platform Admin, allow full modification
  IF public.is_org_admin(OLD.organization_id) THEN
    RETURN NEW;
  END IF;

  -- For non-admin employees updating their own record, ensure protected fields are untouched:
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify organization_id';
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify company_id';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify user_id';
  END IF;

  IF NEW.employee_code IS DISTINCT FROM OLD.employee_code THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify employee_code';
  END IF;

  IF NEW.employment_status IS DISTINCT FROM OLD.employment_status THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify employment_status';
  END IF;

  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify department_id';
  END IF;

  IF NEW.designation_id IS DISTINCT FROM OLD.designation_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify designation_id';
  END IF;

  IF NEW.reporting_manager_id IS DISTINCT FROM OLD.reporting_manager_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify reporting_manager_id';
  END IF;

  IF NEW.doj IS DISTINCT FROM OLD.doj THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify date of joining';
  END IF;

  IF NEW.employment_type IS DISTINCT FROM OLD.employment_type THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify employment_type';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_employee_field_tampering ON public.employees;
CREATE TRIGGER trg_prevent_employee_field_tampering
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_employee_field_tampering();
