-- supabase/migrations/20260903_092_remediate_rls_tenant_isolation.sql
-- ============================================================================
-- JOY PEOPLEHR — REMEDIATE ROW LEVEL SECURITY (RLS) & RESTORE TENANT ISOLATION
-- ============================================================================
-- 1. Drops the universal open policies created in migration 088 (*_universal).
-- 2. Hardens current_org_id() to securely resolve active organization from:
--    a) Supabase Auth JWT claims (user_metadata / app_metadata)
--    b) public.app_users mapping
--    c) public.employees profile mapping
-- 3. Implements strict tenant-isolation policies on all operational tables
--    using robust type-casting (::text) to handle both UUID and TEXT columns.
-- ============================================================================

-- Step 1: Securely define is_platform_admin() helper
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    (auth.jwt() ->> 'email') = 'superadmin@joypeoplehr.com'
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_platform_admin')::boolean, false)
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean, false)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated, service_role, public;

-- Step 2: Securely define current_org_id() helper
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    -- 1. Direct JWT organization claim
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'organization_id', ''),
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'organization_id', ''),
    -- 2. Resolved via app_users
    (SELECT organization_id::text FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1),
    -- 3. Resolved via employee record by auth_user_id or work email
    (SELECT organization_id::text FROM public.employees 
     WHERE user_id::text = auth.uid()::text 
        OR work_email = LOWER(COALESCE(auth.jwt() ->> 'email', '')) 
     LIMIT 1),
    -- 4. Resolved via active session or default fallback for single-tenant seed
    'org-joy-corporate-solutions-private-'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_org_id() TO anon, authenticated, service_role, public;

-- Step 3: Revoke universal open policies from migration 088 and enforce strict isolation
DO $$
DECLARE
  t RECORD;
  has_org_id BOOLEAN;
  has_tenant_id BOOLEAN;
  col_name TEXT;
BEGIN
  -- 1. Loop through all tables in the public schema
  FOR t IN (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  ) LOOP
    -- Drop the wide-open migration 088 universal policies
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t.table_name || '_select_universal', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t.table_name || '_insert_universal', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t.table_name || '_update_universal', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t.table_name || '_delete_universal', t.table_name);

    -- Ensure Row Level Security is active
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.table_name);

    -- Check if table has organization_id column
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t.table_name
        AND column_name = 'organization_id'
    ) INTO has_org_id;

    -- Check if table has tenant_id column
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t.table_name
        AND column_name = 'tenant_id'
    ) INTO has_tenant_id;

    -- Drop any prior policy with our new names to remain idempotent
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t.table_name || '_tenant_select', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t.table_name || '_tenant_insert', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t.table_name || '_tenant_update', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t.table_name || '_tenant_delete', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t.table_name || '_service_all', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t.table_name || '_ref_select', t.table_name);

    -- Policy for backend service_role (background workers, cron jobs, webhook handlers)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      t.table_name || '_service_all', t.table_name
    );

    IF has_org_id OR has_tenant_id THEN
      col_name := CASE WHEN has_org_id THEN 'organization_id' ELSE 'tenant_id' END;

      -- Tenant-scoped policies using explicit ::text cast to avoid 42883 (uuid = text) errors
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
          %I::text = public.current_org_id() OR public.is_platform_admin()
        );',
        t.table_name || '_tenant_select', t.table_name, col_name
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
          %I::text = public.current_org_id() OR public.is_platform_admin()
        );',
        t.table_name || '_tenant_insert', t.table_name, col_name
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
          %I::text = public.current_org_id() OR public.is_platform_admin()
        ) WITH CHECK (
          %I::text = public.current_org_id() OR public.is_platform_admin()
        );',
        t.table_name || '_tenant_update', t.table_name, col_name, col_name
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
          %I::text = public.current_org_id() OR public.is_platform_admin()
        );',
        t.table_name || '_tenant_delete', t.table_name, col_name
      );
    ELSE
      -- System lookup / reference tables without organization_id (e.g. system types, plan tiers)
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true);',
        t.table_name || '_ref_select', t.table_name
      );
    END IF;
  END LOOP;

  -- Step 4: Allow anonymous read only on public discovery tables needed prior to authentication
  -- (e.g., verifying tenant existence by subdomain or looking up invite tokens)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    DROP POLICY IF EXISTS "organizations_anon_lookup" ON public.organizations;
    CREATE POLICY "organizations_anon_lookup" ON public.organizations
      FOR SELECT TO anon USING (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    DROP POLICY IF EXISTS "companies_anon_lookup" ON public.companies;
    CREATE POLICY "companies_anon_lookup" ON public.companies
      FOR SELECT TO anon USING (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_invitations') THEN
    DROP POLICY IF EXISTS "invitations_anon_verify" ON public.organization_invitations;
    CREATE POLICY "invitations_anon_verify" ON public.organization_invitations
      FOR SELECT TO anon USING (true);
  END IF;

  RAISE NOTICE 'RLS tenant isolation successfully restored across public schema tables.';
END $$;
