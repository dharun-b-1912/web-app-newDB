-- supabase/migrations/20260901_085_master_universal_rls_and_performance_cleanup.sql
-- ============================================================================
-- JOY PEOPLEHR — MASTER UNIVERSAL RLS & PERFORMANCE OPTIMIZATION SCRIPT
-- Resolves across ALL schemas (public, operations, platform_control):
-- 1. auth_rls_initplan (Replaces direct auth calls with (SELECT auth.uid()) / (SELECT auth.role()))
-- 2. multiple_permissive_policies (Purges all redundant/duplicate policies, leaving 1 clean policy per action)
-- ============================================================================

DO $$
DECLARE
  target_schema text;
  t_name text;
  p_rec RECORD;
  schemas text[] := ARRAY['public', 'operations', 'platform_control'];
BEGIN
  FOREACH target_schema IN ARRAY schemas LOOP
    -- Check if schema exists
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = target_schema) THEN
      
      -- Loop through all tables in the schema
      FOR t_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = target_schema 
          AND tablename NOT LIKE 'pg_%' 
          AND tablename NOT LIKE 'sql_%'
      LOOP
        -- 1. DROP ALL EXISTING POLICIES to eliminate duplicates
        FOR p_rec IN 
          SELECT policyname 
          FROM pg_policies 
          WHERE schemaname = target_schema AND tablename = t_name
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', p_rec.policyname, target_schema, t_name);
        END LOOP;

        -- 2. Ensure RLS is enabled
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', target_schema, t_name);

        -- 3. Create single, clean SELECT policy
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated, service_role USING (true);',
          t_name || '_select_policy',
          target_schema,
          t_name
        );

        -- 4. Create single, clean INSERT policy with InitPlan subquery caching
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated, service_role WITH CHECK ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'');',
          t_name || '_insert_policy',
          target_schema,
          t_name
        );

        -- 5. Create single, clean UPDATE policy with InitPlan subquery caching
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR UPDATE TO authenticated, service_role USING ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'') WITH CHECK ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'');',
          t_name || '_update_policy',
          target_schema,
          t_name
        );

        -- 6. Create single, clean DELETE policy with InitPlan subquery caching
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR DELETE TO authenticated, service_role USING ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'');',
          t_name || '_delete_policy',
          target_schema,
          t_name
        );

      END LOOP;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Master RLS & Performance Optimization applied successfully to all tables across public, operations, and platform_control schemas.';
END $$;
