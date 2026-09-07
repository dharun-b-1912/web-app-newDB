-- ============================================================================
-- JOY PeopleHR — Migration 20260904_204
-- HR Operations & Master Data Authorization Hardening
-- Canonical Project: ysiajemrqakfngasehhi
-- ============================================================================

-- 1. DEPARTMENTS
DROP POLICY IF EXISTS "departments_tenant_isolation" ON public.departments;
DROP POLICY IF EXISTS "departments_select" ON public.departments;
DROP POLICY IF EXISTS "departments_insert" ON public.departments;
DROP POLICY IF EXISTS "departments_update" ON public.departments;
DROP POLICY IF EXISTS "departments_delete" ON public.departments;

CREATE POLICY "departments_select" ON public.departments
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

CREATE POLICY "departments_insert" ON public.departments
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "departments_update" ON public.departments
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "departments_delete" ON public.departments
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 2. DESIGNATIONS
DROP POLICY IF EXISTS "designations_tenant_isolation" ON public.designations;
DROP POLICY IF EXISTS "designations_select" ON public.designations;
DROP POLICY IF EXISTS "designations_insert" ON public.designations;
DROP POLICY IF EXISTS "designations_update" ON public.designations;
DROP POLICY IF EXISTS "designations_delete" ON public.designations;

CREATE POLICY "designations_select" ON public.designations
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

CREATE POLICY "designations_insert" ON public.designations
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "designations_update" ON public.designations
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "designations_delete" ON public.designations
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 3. BRANCHES
DROP POLICY IF EXISTS "branches_tenant_isolation" ON public.branches;
DROP POLICY IF EXISTS "branches_select" ON public.branches;
DROP POLICY IF EXISTS "branches_insert" ON public.branches;
DROP POLICY IF EXISTS "branches_update" ON public.branches;
DROP POLICY IF EXISTS "branches_delete" ON public.branches;

CREATE POLICY "branches_select" ON public.branches
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

CREATE POLICY "branches_insert" ON public.branches
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "branches_update" ON public.branches
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "branches_delete" ON public.branches
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 4. WORK LOCATIONS
DROP POLICY IF EXISTS "work_locations_tenant_isolation" ON public.work_locations;
DROP POLICY IF EXISTS "work_locations_select" ON public.work_locations;
DROP POLICY IF EXISTS "work_locations_insert" ON public.work_locations;
DROP POLICY IF EXISTS "work_locations_update" ON public.work_locations;
DROP POLICY IF EXISTS "work_locations_delete" ON public.work_locations;

CREATE POLICY "work_locations_select" ON public.work_locations
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

CREATE POLICY "work_locations_insert" ON public.work_locations
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "work_locations_update" ON public.work_locations
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "work_locations_delete" ON public.work_locations
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 5. SHIFTS
DROP POLICY IF EXISTS "shifts_tenant_isolation" ON public.shifts;
DROP POLICY IF EXISTS "shifts_select" ON public.shifts;
DROP POLICY IF EXISTS "shifts_insert" ON public.shifts;
DROP POLICY IF EXISTS "shifts_update" ON public.shifts;
DROP POLICY IF EXISTS "shifts_delete" ON public.shifts;

CREATE POLICY "shifts_select" ON public.shifts
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

CREATE POLICY "shifts_insert" ON public.shifts
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "shifts_update" ON public.shifts
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "shifts_delete" ON public.shifts
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 6. LEAVE TYPES
DROP POLICY IF EXISTS "leave_types_tenant_isolation" ON public.leave_types;
DROP POLICY IF EXISTS "leave_types_select" ON public.leave_types;
DROP POLICY IF EXISTS "leave_types_insert" ON public.leave_types;
DROP POLICY IF EXISTS "leave_types_update" ON public.leave_types;
DROP POLICY IF EXISTS "leave_types_delete" ON public.leave_types;

CREATE POLICY "leave_types_select" ON public.leave_types
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

CREATE POLICY "leave_types_insert" ON public.leave_types
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "leave_types_update" ON public.leave_types
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "leave_types_delete" ON public.leave_types
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 7. HOLIDAYS
DROP POLICY IF EXISTS "holidays_tenant_isolation" ON public.holidays;
DROP POLICY IF EXISTS "holidays_select" ON public.holidays;
DROP POLICY IF EXISTS "holidays_insert" ON public.holidays;
DROP POLICY IF EXISTS "holidays_update" ON public.holidays;
DROP POLICY IF EXISTS "holidays_delete" ON public.holidays;

CREATE POLICY "holidays_select" ON public.holidays
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

CREATE POLICY "holidays_insert" ON public.holidays
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "holidays_update" ON public.holidays
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "holidays_delete" ON public.holidays
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 8. APPROVAL WORKFLOWS
DROP POLICY IF EXISTS "approval_workflows_tenant_isolation" ON public.approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_select" ON public.approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_insert" ON public.approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_update" ON public.approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_delete" ON public.approval_workflows;

CREATE POLICY "approval_workflows_select" ON public.approval_workflows
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

CREATE POLICY "approval_workflows_insert" ON public.approval_workflows
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "approval_workflows_update" ON public.approval_workflows
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "approval_workflows_delete" ON public.approval_workflows
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 9. AUDIT LOGS
DROP POLICY IF EXISTS "audit_logs_tenant_isolation" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "audit_logs_insert" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- 10. EMPLOYEE ONBOARDING
DROP POLICY IF EXISTS "employee_onboarding_tenant_isolation" ON public.employee_onboarding;
DROP POLICY IF EXISTS "employee_onboarding_select" ON public.employee_onboarding;
DROP POLICY IF EXISTS "employee_onboarding_insert" ON public.employee_onboarding;
DROP POLICY IF EXISTS "employee_onboarding_update" ON public.employee_onboarding;
DROP POLICY IF EXISTS "employee_onboarding_delete" ON public.employee_onboarding;

CREATE POLICY "employee_onboarding_select" ON public.employee_onboarding
FOR SELECT TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
  OR employee_id IN (
    SELECT id FROM public.employees 
    WHERE user_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY "employee_onboarding_insert" ON public.employee_onboarding
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "employee_onboarding_update" ON public.employee_onboarding
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

CREATE POLICY "employee_onboarding_delete" ON public.employee_onboarding
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);
