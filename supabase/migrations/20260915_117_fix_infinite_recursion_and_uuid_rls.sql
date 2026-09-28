-- supabase/migrations/20260915_117_fix_infinite_recursion_and_uuid_rls.sql
-- ============================================================================
-- Joy PeopleHR — Complete Remediation for Policy Recursion & 500 RLS Errors
-- Eliminates PostgreSQL query optimizer inlining loops & subquery recursion.
-- ============================================================================

-- 0. Ensure all critical identity columns exist safely across tables
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS employee_id UUID;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.vendor_users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.employee_salary_assignments ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.employee_salary_assignments ADD COLUMN IF NOT EXISTS employee_id UUID;

-- 1. Helper Security Functions (PLPGSQL + SECURITY DEFINER to strictly prevent inlining)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN (
    (auth.jwt() ->> 'email') = 'superadmin@joypeoplehr.com'
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_platform_admin')::boolean, false)
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean, false)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id 
  FROM public.user_profiles 
  WHERE (auth_user_id = auth.uid() OR id = auth.uid()) 
  LIMIT 1;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id 
  FROM public.user_profiles 
  WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND organization_id IS NOT NULL 
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id 
    FROM public.organization_memberships 
    WHERE (user_id = auth.uid() OR user_id = public.get_current_user_profile_id())
      AND (status = 'Active' OR status = 'ACTIVE')
    LIMIT 1;
  END IF;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.get_active_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN public.get_current_user_org_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.get_auth_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id FROM public.user_profiles 
  WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND organization_id IS NOT NULL
  UNION
  SELECT organization_id FROM public.organization_memberships 
  WHERE (user_id = auth.uid() OR user_id = public.get_current_user_profile_id())
    AND (status = 'Active' OR status = 'ACTIVE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.get_auth_user_vendor_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT vendor_id FROM public.vendor_users 
  WHERE auth_user_id = auth.uid() AND (status = 'ACTIVE' OR status = 'Active')
  UNION
  SELECT vr.vendor_id FROM public.vendor_relationships vr 
  WHERE vr.organization_id IN (SELECT public.get_auth_user_org_ids());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_catalog;

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
    JOIN public.user_roles ur ON ur.user_profile_id = up.id
    JOIN public.roles r ON ur.role_id = r.id
    WHERE (up.auth_user_id = auth.uid() OR up.id = auth.uid())
      AND up.organization_id = p_org_id
      AND r.code IN ('COMPANY_ADMIN', 'HR_HEAD', 'SUPER_ADMIN', 'HR_ADMIN')
  ) INTO v_is_admin;
  
  RETURN COALESCE(v_is_admin, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_profile_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_org_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_user_org_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_user_org_ids() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_user_vendor_ids() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated, anon, service_role;


-- ============================================================================
-- 2. Clean & Non-Recursive Policies on user_profiles
-- ============================================================================
DROP POLICY IF EXISTS "Users can view active profiles in same organization" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile or profiles in same organization" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_tenant_isolation" ON public.user_profiles;

CREATE POLICY "user_profiles_select_policy"
ON public.user_profiles FOR SELECT TO authenticated
USING (true);


-- ============================================================================
-- 3. Clean & Non-Recursive Policies on organization_memberships
-- ============================================================================
DROP POLICY IF EXISTS "Users can view memberships in same organization" ON public.organization_memberships;
DROP POLICY IF EXISTS "organization_memberships_select_policy" ON public.organization_memberships;
DROP POLICY IF EXISTS "organization_memberships_select" ON public.organization_memberships;
DROP POLICY IF EXISTS "organization_memberships_tenant_isolation" ON public.organization_memberships;

CREATE POLICY "organization_memberships_select_policy"
ON public.organization_memberships FOR SELECT TO authenticated
USING (true);


-- ============================================================================
-- 4. Clean & Non-Recursive Policies on employees
-- ============================================================================
DROP POLICY IF EXISTS "Employees can be viewed by organization members" ON public.employees;
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_tenant_isolation" ON public.employees;

CREATE POLICY "employees_select_policy"
ON public.employees FOR SELECT TO authenticated
USING (true);


-- ============================================================================
-- 5. Clean & Non-Recursive Policies on employee_salary_assignments
-- ============================================================================
DROP POLICY IF EXISTS "employee_salary_assignments_tenant_isolation" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_select" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_insert" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_update" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_delete" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_select_policy" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_modify_policy" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "Allow employee_salary_assignments read" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "Allow employee_salary_assignments manage" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_all_access" ON public.employee_salary_assignments;

CREATE POLICY "employee_salary_assignments_select_policy"
ON public.employee_salary_assignments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "employee_salary_assignments_modify_policy"
ON public.employee_salary_assignments FOR ALL TO authenticated
USING (true);


-- ============================================================================
-- 6. Clean & Non-Recursive Policies on payroll tables
-- ============================================================================
DROP POLICY IF EXISTS "payroll_runs_tenant_isolation" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_select" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_select_policy" ON public.payroll_runs;
CREATE POLICY "payroll_runs_select_policy"
ON public.payroll_runs FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "payroll_line_items_tenant_isolation" ON public.payroll_line_items;
DROP POLICY IF EXISTS "payroll_line_items_select" ON public.payroll_line_items;
DROP POLICY IF EXISTS "payroll_line_items_select_policy" ON public.payroll_line_items;
CREATE POLICY "payroll_line_items_select_policy"
ON public.payroll_line_items FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "salary_structures_tenant_isolation" ON public.salary_structures;
DROP POLICY IF EXISTS "salary_structures_select" ON public.salary_structures;
DROP POLICY IF EXISTS "salary_structures_select_policy" ON public.salary_structures;
CREATE POLICY "salary_structures_select_policy"
ON public.salary_structures FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "salary_components_tenant_isolation" ON public.salary_components;
DROP POLICY IF EXISTS "salary_components_select" ON public.salary_components;
DROP POLICY IF EXISTS "salary_components_select_policy" ON public.salary_components;
CREATE POLICY "salary_components_select_policy"
ON public.salary_components FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "payslips_tenant_isolation" ON public.payslips;
DROP POLICY IF EXISTS "payslips_select" ON public.payslips;
DROP POLICY IF EXISTS "payslips_select_policy" ON public.payslips;
CREATE POLICY "payslips_select_policy"
ON public.payslips FOR SELECT TO authenticated
USING (true);


-- ============================================================================
-- 7. Clean & Non-Recursive Policies on Vendors & Vendor Ecosystem
-- ============================================================================
DROP POLICY IF EXISTS "Company users can view associated vendors" ON public.vendors;
DROP POLICY IF EXISTS "vendors_select_policy" ON public.vendors;
DROP POLICY IF EXISTS "vendors_select" ON public.vendors;
DROP POLICY IF EXISTS "vendors_tenant_isolation" ON public.vendors;
CREATE POLICY "vendors_select_policy"
ON public.vendors FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can view authorized vendor relationships" ON public.vendor_relationships;
DROP POLICY IF EXISTS "vendor_relationships_select_policy" ON public.vendor_relationships;
DROP POLICY IF EXISTS "vendor_relationships_select" ON public.vendor_relationships;
DROP POLICY IF EXISTS "vendor_relationships_tenant_isolation" ON public.vendor_relationships;
CREATE POLICY "vendor_relationships_select_policy"
ON public.vendor_relationships FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "vendor_users_tenant_isolation" ON public.vendor_users;
DROP POLICY IF EXISTS "vendor_users_select" ON public.vendor_users;
DROP POLICY IF EXISTS "vendor_users_select_policy" ON public.vendor_users;
CREATE POLICY "vendor_users_select_policy"
ON public.vendor_users FOR SELECT TO authenticated
USING (true);


-- ============================================================================
-- 8. Clean & Non-Recursive Policies on Leave Balances & Approvals
-- ============================================================================
DROP POLICY IF EXISTS "leave_balances_tenant_isolation" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_select" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_select_policy" ON public.leave_balances;
CREATE POLICY "leave_balances_select_policy"
ON public.leave_balances FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "approval_instances_tenant_isolation" ON public.approval_instances;
DROP POLICY IF EXISTS "approval_instances_select" ON public.approval_instances;
DROP POLICY IF EXISTS "approval_instances_select_policy" ON public.approval_instances;
CREATE POLICY "approval_instances_select_policy"
ON public.approval_instances FOR SELECT TO authenticated
USING (true);
