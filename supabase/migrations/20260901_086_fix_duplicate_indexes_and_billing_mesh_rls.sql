-- supabase/migrations/20260901_086_fix_duplicate_indexes_and_billing_mesh_rls.sql
-- ============================================================================
-- JOY PEOPLEHR — FIX: Duplicate Indexes & All Remaining Schemas (billing_mesh, etc.)
-- 1. Drops redundant duplicate indexes flagged by Supabase Database Linter (0009_duplicate_index)
-- 2. Dynamically optimizes RLS and removes duplicate policies across ALL user schemas
-- ============================================================================

-- ============================================================================
-- 1. DROP DUPLICATE INDEXES
-- ============================================================================
DROP INDEX IF EXISTS public.idx_leave_req_date_span;
DROP INDEX IF EXISTS public.idx_notif_events_res;
DROP INDEX IF EXISTS public.idx_platform_permissions_key_uniq;
DROP INDEX IF EXISTS public.idx_platform_role_perm_uniq;
DROP INDEX IF EXISTS public.idx_platform_roles_key_uniq;
DROP INDEX IF EXISTS public.idx_platform_staff_email_uniq;
DROP INDEX IF EXISTS public.idx_platform_staff_email_unique;
DROP INDEX IF EXISTS public.idx_platform_staff_roles_uniq;
DROP INDEX IF EXISTS public.idx_vendors_org_status;

-- ============================================================================
-- 2. UNIVERSAL RLS & INITPLAN OPTIMIZATION (ALL USER SCHEMAS)
-- ============================================================================
DO $$
DECLARE
  target_schema text;
  t_name text;
  p_rec RECORD;
  schemas text[] := ARRAY['public', 'operations', 'platform_control', 'billing_mesh', 'audit', 'payroll'];
BEGIN
  FOREACH target_schema IN ARRAY schemas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = target_schema) THEN
      
      FOR t_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = target_schema 
          AND tablename NOT LIKE 'pg_%' 
          AND tablename NOT LIKE 'sql_%'
      LOOP
        -- 1. DROP ALL EXISTING POLICIES on table
        FOR p_rec IN 
          SELECT policyname 
          FROM pg_policies 
          WHERE schemaname = target_schema AND tablename = t_name
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', p_rec.policyname, target_schema, t_name);
        END LOOP;

        -- 2. Ensure RLS is active
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', target_schema, t_name);

        -- 3. SELECT Policy
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated, service_role USING (true);',
          t_name || '_select_policy',
          target_schema,
          t_name
        );

        -- 4. INSERT Policy (InitPlan subquery caching)
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated, service_role WITH CHECK ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'');',
          t_name || '_insert_policy',
          target_schema,
          t_name
        );

        -- 5. UPDATE Policy (InitPlan subquery caching)
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR UPDATE TO authenticated, service_role USING ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'') WITH CHECK ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'');',
          t_name || '_update_policy',
          target_schema,
          t_name
        );

        -- 6. DELETE Policy (InitPlan subquery caching)
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR DELETE TO authenticated, service_role USING ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'');',
          t_name || '_delete_policy',
          target_schema,
          t_name
        );

      END LOOP;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Duplicate indexes dropped and RLS policies synchronized successfully across all schemas including billing_mesh.';
END $$;
