-- Migration: 20261027_166_fix_employee_work_location_assignments_rls.sql
-- ============================================================================
-- Joy PeopleHR Enterprise — Work Location Geofence & Employee Assignment RLS Fix
-- Resolves: 401 / RLS Policy Rejection when mapping employee work locations
-- ============================================================================

BEGIN;

-- 1. Ensure employee_work_location_assignments RLS is properly configured
ALTER TABLE public.employee_work_location_assignments ENABLE ROW LEVEL SECURITY;

-- Drop legacy & restrictive policies
DROP POLICY IF EXISTS "Assignments Select Policy" ON public.employee_work_location_assignments;
DROP POLICY IF EXISTS "Assignments Admin Modify Policy" ON public.employee_work_location_assignments;
DROP POLICY IF EXISTS "emp_work_loc_assignments_scoped_select" ON public.employee_work_location_assignments;
DROP POLICY IF EXISTS "emp_work_loc_assignments_scoped_modify" ON public.employee_work_location_assignments;
DROP POLICY IF EXISTS "emp_work_loc_assignments_scoped_all" ON public.employee_work_location_assignments;

-- Create comprehensive scoped policy for SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "emp_work_loc_assignments_scoped_all"
ON public.employee_work_location_assignments
FOR ALL
TO authenticated, service_role
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = (SELECT public.get_active_user_org_id()::text)
  OR employee_id::text = (SELECT public.get_active_user_employee_id()::text)
  OR auth.uid() IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 2. Ensure work_locations has modify permissions for authorized admins
ALTER TABLE public.work_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_locations_scoped_modify" ON public.work_locations;
CREATE POLICY "work_locations_scoped_modify"
ON public.work_locations
FOR ALL
TO authenticated, service_role
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = (SELECT public.get_active_user_org_id()::text)
  OR auth.uid() IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 3. Ensure role grants are active
GRANT ALL ON public.employee_work_location_assignments TO authenticated, service_role;
GRANT ALL ON public.work_locations TO authenticated, service_role;

COMMIT;
