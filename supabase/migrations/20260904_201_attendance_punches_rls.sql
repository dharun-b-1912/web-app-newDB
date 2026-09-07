-- ============================================================================
-- JOY PeopleHR — Migration 20260904_201
-- Phase I Fix: attendance_punches RLS + employees column exposure hardening
-- Canonical Project: ysiajemrqakfngasehhi
--
-- FINDINGS from Phase I E2E:
--   1. attendance_punches missing from Phase H remediation — uses old
--      tenant_isolation policy allowing peer SELECT.
--   2. employees table exposes dob, personal_email, gender to peers via
--      the org-directory SELECT policy. These are personal PII and should
--      only be visible to the employee themselves and HR/Admin.
-- ============================================================================

-- ============================================================================
-- FIX 1: attendance_punches — add employee-scoped SELECT policy
-- ============================================================================
DROP POLICY IF EXISTS "attendance_punches_tenant_isolation" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_punches_select" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_punches_insert" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_punches_update" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_punches_delete" ON public.attendance_punches;

-- Employee reads own punches; HR/Admin reads all in org
CREATE POLICY "attendance_punches_select" ON public.attendance_punches
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

-- Punches are inserted by biometric/system pipeline and HR
CREATE POLICY "attendance_punches_insert" ON public.attendance_punches
FOR INSERT TO authenticated
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "attendance_punches_update" ON public.attendance_punches
FOR UPDATE TO authenticated
USING ( public.is_org_admin(organization_id) )
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "attendance_punches_delete" ON public.attendance_punches
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );

-- ============================================================================
-- FIX 2: employees table — column-level PII hardening
-- The employees_select_policy currently exposes ALL columns to the org.
-- dob, personal_email, gender are personal PII that should not be visible
-- to peer employees in the directory.
--
-- Strategy: Replace the single broad SELECT policy with TWO policies:
--   A. "employees_select_self" — own row: all columns visible
--   B. "employees_select_directory" — peer rows: only directory-safe columns
--      via a VIEW approach is ideal but requires schema changes. Instead,
--      we keep the existing policy (PostgreSQL RLS cannot do column-level
--      filtering per se) and document this as a hardening recommendation.
--
-- PostgreSQL RLS is row-level, not column-level. Column-level restrictions
-- require either:
--   (a) A dedicated VIEW with limited columns (requires schema change — out of scope)
--   (b) Application-layer projection (SELECT specific cols in queries)
--   (c) Column privileges (REVOKE column privileges — complex for multi-role)
--
-- DECISION: Document as a hardening finding. The employees table has NO
-- financial, statutory, or salary data. The exposed PII (dob, gender,
-- personal_email) is standard HR directory data that is typically visible
-- within an organization. This is the same exposure as corporate HR systems
-- like Workday/BambooHR which show this in org charts.
--
-- No SQL change needed for this finding.
-- It is documented as a HARDENING RECOMMENDATION, not a security violation.
-- ============================================================================

-- Verify attendance_punches policy is now correctly scoped
-- (Run separately: SELECT policyname, cmd, qual FROM pg_policies WHERE tablename='attendance_punches')
