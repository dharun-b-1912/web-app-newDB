-- ============================================================================
-- Migration: 20260928_144_fix_attendance_punches_and_daily_rls.sql
-- Description: Fix RLS policies for attendance_punches & attendance_daily,
--              restore SECURITY DEFINER on fn_record_attendance_punch and
--              fn_recalculate_daily_attendance for mobile & ESS clocking.
-- ============================================================================

-- 1. Ensure get_active_user_employee_id is SECURITY DEFINER with safe search_path
CREATE OR REPLACE FUNCTION public.get_active_user_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    up.employee_id,
    (SELECT e.id FROM public.employees e WHERE e.user_id = up.id LIMIT 1),
    (SELECT e.id FROM public.employees e WHERE e.user_id = up.auth_user_id LIMIT 1),
    (SELECT e.id FROM public.employees e WHERE lower(e.work_email) = lower(up.email) LIMIT 1)
  )
  FROM public.user_profiles up
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 2. Restore fn_record_attendance_punch to SECURITY DEFINER
ALTER FUNCTION public.fn_record_attendance_punch(numeric, numeric, numeric, text, text, jsonb) 
SECURITY DEFINER 
SET search_path = public, pg_temp;

-- 3. Restore fn_recalculate_daily_attendance & trigger function to SECURITY DEFINER
ALTER FUNCTION public.fn_recalculate_daily_attendance(uuid, date) 
SECURITY DEFINER 
SET search_path = public, pg_temp;
GRANT EXECUTE ON FUNCTION public.fn_recalculate_daily_attendance(uuid, date) TO authenticated, service_role;

ALTER FUNCTION public.trg_fn_on_punch_recorded() 
SECURITY DEFINER 
SET search_path = public, pg_temp;
GRANT EXECUTE ON FUNCTION public.trg_fn_on_punch_recorded() TO authenticated, service_role;

-- 4. ATTENDANCE PUNCHES RLS POLICIES
DROP POLICY IF EXISTS "attendance_punches_admin_modify" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_punches_insert" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_punches_select" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_punches_update" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_punches_delete" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_punches_tenant_isolation" ON public.attendance_punches;

ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;

-- 4a. SELECT: Employees can view their own punches; Admins can view org punches
CREATE POLICY "attendance_punches_select" ON public.attendance_punches
FOR SELECT TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
  OR employee_id = public.get_active_user_employee_id()
);

-- 4b. INSERT: Employees can insert their own punches; Admins can insert org punches
CREATE POLICY "attendance_punches_insert" ON public.attendance_punches
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
  OR employee_id = public.get_active_user_employee_id()
  OR employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON (
      e.id = up.employee_id 
      OR e.user_id = up.id 
      OR e.user_id = up.auth_user_id 
      OR lower(e.work_email) = lower(up.email)
    )
    WHERE up.auth_user_id = auth.uid()
  )
);

-- 4c. UPDATE: Admins can update punches
CREATE POLICY "attendance_punches_update" ON public.attendance_punches
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 4d. DELETE: Admins can delete punches
CREATE POLICY "attendance_punches_delete" ON public.attendance_punches
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 5. ATTENDANCE DAILY RLS POLICIES
DROP POLICY IF EXISTS "attendance_daily_admin_modify" ON public.attendance_daily;
DROP POLICY IF EXISTS "attendance_daily_insert" ON public.attendance_daily;
DROP POLICY IF EXISTS "attendance_daily_select" ON public.attendance_daily;
DROP POLICY IF EXISTS "attendance_daily_update" ON public.attendance_daily;
DROP POLICY IF EXISTS "attendance_daily_delete" ON public.attendance_daily;
DROP POLICY IF EXISTS "tenant_isolation_attendance_daily" ON public.attendance_daily;

ALTER TABLE public.attendance_daily ENABLE ROW LEVEL SECURITY;

-- 5a. SELECT: Employees can view their own daily attendance; Admins can view org records
CREATE POLICY "attendance_daily_select" ON public.attendance_daily
FOR SELECT TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
  OR employee_id = public.get_active_user_employee_id()
);

-- 5b. INSERT: Employees can insert their own daily records; Admins can insert org records
CREATE POLICY "attendance_daily_insert" ON public.attendance_daily
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
  OR employee_id = public.get_active_user_employee_id()
  OR employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON (
      e.id = up.employee_id 
      OR e.user_id = up.id 
      OR e.user_id = up.auth_user_id 
      OR lower(e.work_email) = lower(up.email)
    )
    WHERE up.auth_user_id = auth.uid()
  )
);

-- 5c. UPDATE: Employees can update their own daily records (for checkout/refresh); Admins can update
CREATE POLICY "attendance_daily_update" ON public.attendance_daily
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
  OR employee_id = public.get_active_user_employee_id()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
  OR employee_id = public.get_active_user_employee_id()
);

-- 5d. DELETE: Admins can delete daily records
CREATE POLICY "attendance_daily_delete" ON public.attendance_daily
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);
