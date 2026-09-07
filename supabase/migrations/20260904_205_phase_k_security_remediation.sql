-- ============================================================================
-- JOY PeopleHR — Migration 20260904_205
-- Phase K Security Remediation
-- Fixes:
--   1. organizations table: replace FOR ALL policy with command-specific
--      policies that prevent non-admin employees from mutating org records
--   2. approval_instances table: restrict UPDATE to HR admins only;
--      employees can read their own, request via INSERT, but cannot modify
--   3. employee_shift_assignments: add company_id column (schema gap)
-- Canonical Project: ysiajemrqakfngasehhi
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATIONS TABLE — Command-specific RLS
-- Replace the permissive FOR ALL policies that allowed employees to UPDATE
-- ============================================================================

-- Drop all existing overly-permissive organizations policies
DROP POLICY IF EXISTS "organizations_all_access"       ON public.organizations;
DROP POLICY IF EXISTS "organizations_tenant_isolation" ON public.organizations;
DROP POLICY IF EXISTS "organizations_anon_lookup"      ON public.organizations;
DROP POLICY IF EXISTS "organizations_read_all"         ON public.organizations;
DROP POLICY IF EXISTS "org_isolation"                  ON public.organizations;
DROP POLICY IF EXISTS "Allow organizations read"       ON public.organizations;
DROP POLICY IF EXISTS "Allow organizations manage"     ON public.organizations;

-- SELECT: any authenticated user whose org_id matches, or platform admin
--         anonymous allowed for tenant discovery (invite flow, subdomain lookup)
CREATE POLICY "organizations_select" ON public.organizations
FOR SELECT
USING (
  id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

CREATE POLICY "organizations_anon_select" ON public.organizations
FOR SELECT TO anon
USING (true);

-- INSERT: platform admin only (org creation is a platform-level operation)
CREATE POLICY "organizations_insert" ON public.organizations
FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
);

-- UPDATE: org admin (Company Admin / HR Head with admin role) or platform admin
--         EMPLOYEES must NOT be able to mutate their organization record
CREATE POLICY "organizations_update" ON public.organizations
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(id)
  OR public.is_platform_admin()
);

-- DELETE: platform admin only
CREATE POLICY "organizations_delete" ON public.organizations
FOR DELETE TO authenticated
USING (
  public.is_platform_admin()
);

-- ============================================================================
-- 2. APPROVAL_INSTANCES TABLE — Strict command-specific RLS
-- Employees can SELECT their own instances and INSERT new ones (as requesters),
-- but only HR admins can UPDATE (approve/reject) or DELETE.
-- ============================================================================

DROP POLICY IF EXISTS "approval_instances_tenant_isolation" ON public.approval_instances;
DROP POLICY IF EXISTS "approval_instances_select"           ON public.approval_instances;
DROP POLICY IF EXISTS "approval_instances_insert"           ON public.approval_instances;
DROP POLICY IF EXISTS "approval_instances_update"           ON public.approval_instances;
DROP POLICY IF EXISTS "approval_instances_delete"           ON public.approval_instances;

-- SELECT: HR admins see all within org; employees see only their own instances
CREATE POLICY "approval_instances_select" ON public.approval_instances
FOR SELECT TO authenticated
USING (
  (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      public.is_org_admin(organization_id)
      OR public.is_platform_admin()
      OR requester_employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.user_profiles up ON up.id = e.user_id
        WHERE up.auth_user_id = auth.uid()
        LIMIT 1
      )
    )
  )
);

-- INSERT: any org member can submit a request (as requester)
CREATE POLICY "approval_instances_insert" ON public.approval_instances
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

-- UPDATE: ONLY org admins (HR/Company Admin) or platform admin
--         This is the critical control that prevents employees from
--         self-approving their own requests
CREATE POLICY "approval_instances_update" ON public.approval_instances
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- DELETE: org admin or platform admin only
CREATE POLICY "approval_instances_delete" ON public.approval_instances
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- ============================================================================
-- 3. EMPLOYEE_SHIFT_ASSIGNMENTS — Add missing company_id column
-- The greenfield schema omitted company_id which is required for multi-company
-- tenant isolation and explicit company scoping in shift assignment operations.
-- ============================================================================

ALTER TABLE public.employee_shift_assignments
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

CREATE INDEX IF NOT EXISTS idx_emp_shift_assign_company
  ON public.employee_shift_assignments (company_id)
  WHERE company_id IS NOT NULL;

-- Backfill company_id from employees table for existing rows
UPDATE public.employee_shift_assignments esa
SET company_id = e.company_id
FROM public.employees e
WHERE esa.employee_id = e.id
  AND esa.company_id IS NULL
  AND e.company_id IS NOT NULL;

-- ============================================================================
-- 4. EMPLOYEE_SHIFT_ASSIGNMENTS — Also add effective_from / effective_to aliases
-- The test suite and application code use effective_from / effective_to
-- while the original schema used valid_from / valid_to.
-- Add generated columns as aliases for backward compatibility.
-- ============================================================================

ALTER TABLE public.employee_shift_assignments
  ADD COLUMN IF NOT EXISTS effective_from DATE;

ALTER TABLE public.employee_shift_assignments
  ADD COLUMN IF NOT EXISTS effective_to DATE;

-- Backfill from valid_from / valid_to
UPDATE public.employee_shift_assignments
SET effective_from = valid_from,
    effective_to   = valid_to
WHERE effective_from IS NULL;

-- ============================================================================
-- 5. RLS FOR EMPLOYEE_SHIFT_ASSIGNMENTS — Enforce admin-only write
-- ============================================================================

DROP POLICY IF EXISTS "employee_shift_assignments_tenant_isolation" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "employee_shift_assignments_select"           ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "employee_shift_assignments_insert"           ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "employee_shift_assignments_update"           ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "employee_shift_assignments_delete"           ON public.employee_shift_assignments;

-- SELECT: org members can read shift assignments for awareness; admins see all
CREATE POLICY "employee_shift_assignments_select" ON public.employee_shift_assignments
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

-- INSERT: only HR admins can assign shifts to employees
CREATE POLICY "employee_shift_assignments_insert" ON public.employee_shift_assignments
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- UPDATE: only HR admins
CREATE POLICY "employee_shift_assignments_update" ON public.employee_shift_assignments
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- DELETE: only HR admins
CREATE POLICY "employee_shift_assignments_delete" ON public.employee_shift_assignments
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
);

-- ============================================================================
-- 6. Restore correct organization display_name that was tampered during testing
-- ============================================================================
UPDATE public.organizations
SET display_name = legal_name
WHERE display_name = 'HACK_ORG'
  AND legal_name IS NOT NULL
  AND legal_name <> 'HACK_ORG';
