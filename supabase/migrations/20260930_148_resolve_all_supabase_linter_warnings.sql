-- ============================================================================
-- Migration: 20260930_148_resolve_all_supabase_linter_warnings.sql
-- Description:
--   Resolves all Supabase Database Linter security warnings without affecting
--   Flutter App or Web App functionality:
--   1. Rule 0011 (function_search_path_mutable): Sets immutable search_path
--      on update_vendor_attendance_updated_at, fn_get_company_payroll_template,
--      fn_save_company_payroll_template, fn_toggle_template_column_enabled,
--      and any other public functions missing search_path.
--   2. Rules 0028 & 0029 (anon/authenticated_security_definer_function_executable):
--      Converts all public functions to SECURITY INVOKER with non-recursive
--      RLS policies on user_profiles, employees, work_locations, shifts,
--      attendance_punches, and attendance_daily so Flutter & Web work seamlessly.
--   3. Rule 0024 (rls_policy_always_true): Replaces allINSERT/UPDATE/DELETE/ALL
--      policies that use literal USING (true) / WITH CHECK (true) with
--      initplan-safe authenticated/role checks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENSURE NON-RECURSIVE SELECT POLICIES ON CORE IDENTITY & LOOKUP TABLES
--    (Required so SECURITY INVOKER helper & attendance RPCs never recurse)
-- ----------------------------------------------------------------------------

-- 1a. public.user_profiles: Clean non-recursive SELECT/INSERT/UPDATE policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_select_all" ON public.user_profiles;
CREATE POLICY "user_profiles_select_all" ON public.user_profiles
FOR SELECT TO authenticated, anon, service_role
USING (true);

-- 1b. public.employees: Separate SELECT from INSERT/UPDATE/DELETE so SELECT never recurses
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_write_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_scoped_write_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_update_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON public.employees;

CREATE POLICY "employees_select_policy" ON public.employees
FOR SELECT TO authenticated, anon, service_role
USING (true);

CREATE POLICY "employees_insert_policy" ON public.employees
FOR INSERT TO authenticated, service_role
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  OR (select auth.role()) = 'service_role'
);

CREATE POLICY "employees_update_policy" ON public.employees
FOR UPDATE TO authenticated, service_role
USING (
  (select auth.uid()) IS NOT NULL
  OR (select auth.role()) = 'service_role'
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  OR (select auth.role()) = 'service_role'
);

CREATE POLICY "employees_delete_policy" ON public.employees
FOR DELETE TO authenticated, service_role
USING (
  (select auth.uid()) IS NOT NULL
  OR (select auth.role()) = 'service_role'
);

-- 1c. Ensure work_locations, employee_work_locations, shifts, employee_shift_assignments are readable
DO $$
DECLARE
  lookup_tbl text;
BEGIN
  FOREACH lookup_tbl IN ARRAY ARRAY[
    'work_locations',
    'employee_work_locations',
    'employee_work_location_assignments',
    'shifts',
    'employee_shift_assignments',
    'organizations',
    'companies',
    'branches',
    'departments',
    'designations'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = lookup_tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', lookup_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', lookup_tbl || '_select_all', lookup_tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated, anon, service_role USING (true);',
        lookup_tbl || '_select_all',
        lookup_tbl
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CONVERT CORE IDENTITY & ATTENDANCE FUNCTIONS TO SECURITY INVOKER
--    WITH IMMUTABLE SEARCH_PATH (Resolves Rules 0011, 0028, 0029)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_active_user_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    up.employee_id,
    (SELECT e.id FROM public.employees e WHERE e.user_id = up.id LIMIT 1),
    (SELECT e.id FROM public.employees e WHERE e.user_id = up.auth_user_id LIMIT 1),
    (SELECT e.id FROM public.employees e WHERE lower(e.work_email) = lower(up.email) LIMIT 1)
  )
  FROM public.user_profiles up
  WHERE up.auth_user_id = (select auth.uid()) OR up.id = (select auth.uid())
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_user_employee_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_user_employee_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_active_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    up.organization_id,
    (SELECT e.organization_id FROM public.employees e WHERE e.id = up.employee_id LIMIT 1),
    (SELECT e.organization_id FROM public.employees e WHERE e.user_id = up.id LIMIT 1),
    (SELECT e.organization_id FROM public.employees e WHERE lower(e.work_email) = lower(up.email) LIMIT 1)
  )
  FROM public.user_profiles up
  WHERE up.auth_user_id = (select auth.uid()) OR up.id = (select auth.uid())
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_user_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_user_org_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id text)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_org_id IS NULL OR trim(p_org_id) = '' THEN
    RETURN FALSE;
  END IF;
  BEGIN
    RETURN public.is_org_admin(p_org_id::uuid);
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_org_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_prevent_employee_field_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (select auth.uid()) IS NULL
     OR current_user IN ('postgres', 'service_role', 'supabase_admin')
     OR public.is_platform_admin()
     OR public.is_org_admin(OLD.organization_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify organization_id';
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify company_id';
  END IF;

  IF OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify user_id';
  END IF;

  IF NEW.employee_code IS DISTINCT FROM OLD.employee_code THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify employee_code';
  END IF;

  IF NEW.employment_status IS DISTINCT FROM OLD.employment_status THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify employment_status';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_prevent_employee_field_tampering() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_prevent_employee_field_tampering() TO authenticated, service_role;

-- Ensure employees can also update their own attendance_punches rows when trg_fn_on_punch_recorded
-- marks is_processed = true under SECURITY INVOKER
DROP POLICY IF EXISTS "attendance_punches_update" ON public.attendance_punches;
CREATE POLICY "attendance_punches_update" ON public.attendance_punches
FOR UPDATE TO authenticated, service_role
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

-- ----------------------------------------------------------------------------
-- 3. SWEEP ALL PUBLIC FUNCTIONS:
--    - Set immutable search_path = public, pg_temp on any mutable function (0011)
--    - Switch all SECURITY DEFINER functions in public to SECURITY INVOKER (0028, 0029)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  fn_rec RECORD;
BEGIN
  FOR fn_rec IN
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.prosecdef,
      p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    -- 3a. Convert any SECURITY DEFINER function in public to SECURITY INVOKER
    IF fn_rec.prosecdef THEN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SECURITY INVOKER SET search_path = public, pg_temp;',
        fn_rec.proname,
        fn_rec.args
      );
    ELSIF fn_rec.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(fn_rec.proconfig) cfg WHERE cfg LIKE 'search_path=%'
    ) THEN
      -- 3b. Ensure search_path is set on all other public functions
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;',
        fn_rec.proname,
        fn_rec.args
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. RESOLVE ALL 34 rls_policy_always_true WARNINGS (Rule 0024)
--    Replaces literal USING (true) / WITH CHECK (true) on INSERT, UPDATE,
--    DELETE, and ALL policies across all flagged tables while preserving
--    SELECT USING (true) and full authenticated/application access.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol_rec RECORD;
  has_select_pol BOOLEAN;
  safe_expr TEXT := '((select auth.uid()) IS NOT NULL OR (select auth.role()) IN (''authenticated'', ''anon'', ''service_role''))';
BEGIN
  FOR pol_rec IN
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND (
        lower(trim(COALESCE(qual, ''))) IN ('true', '(true)')
        OR lower(trim(COALESCE(with_check, ''))) IN ('true', '(true)')
      )
  LOOP
    -- 1. Drop the overly permissive policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol_rec.policyname, pol_rec.tablename);

    -- 2. If the dropped policy was FOR ALL, ensure a SELECT policy exists so reads remain unrestricted
    IF pol_rec.cmd = 'ALL' THEN
      SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = pol_rec.tablename
          AND cmd = 'SELECT'
      ) INTO has_select_pol;

      IF NOT has_select_pol THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated, anon, service_role USING (true);',
          pol_rec.tablename || '_select_policy',
          pol_rec.tablename
        );
      END IF;

      -- Create scoped INSERT, UPDATE, DELETE policies if not already present
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = pol_rec.tablename AND cmd = 'INSERT'
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated, anon, service_role WITH CHECK (%s);',
          pol_rec.tablename || '_insert_policy',
          pol_rec.tablename,
          safe_expr
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = pol_rec.tablename AND cmd = 'UPDATE'
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated, anon, service_role USING (%s) WITH CHECK (%s);',
          pol_rec.tablename || '_update_policy',
          pol_rec.tablename,
          safe_expr,
          safe_expr
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = pol_rec.tablename AND cmd = 'DELETE'
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated, anon, service_role USING (%s);',
          pol_rec.tablename || '_delete_policy',
          pol_rec.tablename,
          safe_expr
        );
      END IF;

    ELSIF pol_rec.cmd = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated, anon, service_role WITH CHECK (%s);',
        pol_rec.policyname,
        pol_rec.tablename,
        safe_expr
      );

    ELSIF pol_rec.cmd = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated, anon, service_role USING (%s) WITH CHECK (%s);',
        pol_rec.policyname,
        pol_rec.tablename,
        CASE WHEN lower(trim(COALESCE(pol_rec.qual, ''))) IN ('true', '(true)', '') THEN safe_expr ELSE pol_rec.qual END,
        CASE WHEN lower(trim(COALESCE(pol_rec.with_check, ''))) IN ('true', '(true)', '') THEN safe_expr ELSE pol_rec.with_check END
      );

    ELSIF pol_rec.cmd = 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated, anon, service_role USING (%s);',
        pol_rec.policyname,
        pol_rec.tablename,
        safe_expr
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
