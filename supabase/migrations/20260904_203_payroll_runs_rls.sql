-- ============================================================================
-- JOY PeopleHR — Migration 20260904_203
-- Payroll Runs Mutation & Authorization Hardening
-- Canonical Project: ysiajemrqakfngasehhi
-- ============================================================================

DROP POLICY IF EXISTS "payroll_runs_tenant_isolation" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_select" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_insert" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_update" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_delete" ON public.payroll_runs;

-- Only Admins and HR can view/manage payroll runs
CREATE POLICY "payroll_runs_select" ON public.payroll_runs
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
);

CREATE POLICY "payroll_runs_insert" ON public.payroll_runs
FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
);

CREATE POLICY "payroll_runs_update" ON public.payroll_runs
FOR UPDATE TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
)
WITH CHECK (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
);

CREATE POLICY "payroll_runs_delete" ON public.payroll_runs
FOR DELETE TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
);
