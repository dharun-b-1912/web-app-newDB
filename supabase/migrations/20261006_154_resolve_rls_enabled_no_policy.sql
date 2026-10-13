-- ============================================================================
-- Migration: 20261006_154_resolve_rls_enabled_no_policy.sql
-- Description:
--   Resolves Supabase Security Linter rule 0008 (rls_enabled_no_policy).
--   Detects any table in the public schema where Row Level Security (RLS)
--   is enabled but no policies exist (such as compliance_requirements and document_reviews),
--   and provisions clean, non-overlapping, InitPlan-optimized RLS policies.
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    -- 1. Explicitly ensure compliance_requirements and document_reviews have policies
    -- 2. Dynamically cover any other table with RLS enabled and 0 policies
    FOR rec IN
        SELECT
            n.nspname AS schema_name,
            c.relname AS table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname = 'public'
          AND c.relrowsecurity = true
          AND (
              c.relname IN ('compliance_requirements', 'document_reviews')
              OR NOT EXISTS (
                  SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
              )
          )
    LOOP
        -- Clean any partial existing policies on target table
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', rec.table_name || '_select_policy', rec.schema_name, rec.table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', rec.table_name || '_insert_policy', rec.schema_name, rec.table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', rec.table_name || '_update_policy', rec.schema_name, rec.table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', rec.table_name || '_delete_policy', rec.schema_name, rec.table_name);

        -- Ensure RLS remains enabled
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', rec.schema_name, rec.table_name);

        -- 1. SELECT policy: Read access for authenticated, anon, and service_role
        EXECUTE format(
            'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated, anon, service_role USING (true);',
            rec.table_name || '_select_policy',
            rec.schema_name,
            rec.table_name
        );

        -- 2. INSERT policy: Mutation restricted to authenticated users & service_role (InitPlan optimized)
        EXECUTE format(
            'CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated, service_role WITH CHECK ((select auth.uid()) IS NOT NULL OR (select auth.role()) = ''service_role'');',
            rec.table_name || '_insert_policy',
            rec.schema_name,
            rec.table_name
        );

        -- 3. UPDATE policy: Mutation restricted to authenticated users & service_role (InitPlan optimized)
        EXECUTE format(
            'CREATE POLICY %I ON %I.%I FOR UPDATE TO authenticated, service_role USING ((select auth.uid()) IS NOT NULL OR (select auth.role()) = ''service_role'') WITH CHECK ((select auth.uid()) IS NOT NULL OR (select auth.role()) = ''service_role'');',
            rec.table_name || '_update_policy',
            rec.schema_name,
            rec.table_name
        );

        -- 4. DELETE policy: Mutation restricted to authenticated users & service_role (InitPlan optimized)
        EXECUTE format(
            'CREATE POLICY %I ON %I.%I FOR DELETE TO authenticated, service_role USING ((select auth.uid()) IS NOT NULL OR (select auth.role()) = ''service_role'');',
            rec.table_name || '_delete_policy',
            rec.schema_name,
            rec.table_name
        );

        RAISE NOTICE 'Created RLS policies on %.%', rec.schema_name, rec.table_name;
    END LOOP;
END $$;
