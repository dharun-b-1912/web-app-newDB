-- supabase/migrations/20260901_088_fix_production_data_fetch_anon_rls.sql
-- ============================================================================
-- JOY PEOPLEHR — FIX PRODUCTION DATA FETCH (ENABLE ANON + AUTHENTICATED ACCESS)
-- Reason: Client application connects via Supabase anon key. Restricting to
-- authenticated-only caused RLS to return 0 rows (empty array) in production.
-- This migration grants full read/write access to `public` (anon + authenticated + service_role).
-- Dynamically checks existing schemas to prevent 3F000 schema errors.
-- ============================================================================

DO $$
DECLARE
  sch RECORD;
  r RECORD;
  pol RECORD;
BEGIN
  -- 1. Loop through all existing project schemas
  FOR sch IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name IN ('public', 'operations', 'platform_control', 'billing_mesh', 'audit')
  LOOP
    -- Grant schema usage
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role;', sch.schema_name);

    -- Loop through all tables in the schema
    FOR r IN (
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = sch.schema_name
        AND table_type = 'BASE TABLE'
    ) LOOP
      -- 1. Enable RLS
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', sch.schema_name, r.table_name);

      -- 2. Drop existing restrictive policies
      FOR pol IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = sch.schema_name AND tablename = r.table_name
      ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, sch.schema_name, r.table_name);
      END LOOP;

      -- 3. Create universal clean policies granting access to 'public' (includes anon, authenticated, service_role)
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT TO public USING (true);',
        r.table_name || '_select_universal', sch.schema_name, r.table_name);

      EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO public WITH CHECK (true);',
        r.table_name || '_insert_universal', sch.schema_name, r.table_name);

      EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO public USING (true) WITH CHECK (true);',
        r.table_name || '_update_universal', sch.schema_name, r.table_name);

      EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE TO public USING (true);',
        r.table_name || '_delete_universal', sch.schema_name, r.table_name);

      -- 4. Grant table permissions
      EXECUTE format('GRANT ALL ON %I.%I TO anon, authenticated, service_role;', sch.schema_name, r.table_name);
    END LOOP;

    -- Grant sequence permissions safely
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO anon, authenticated, service_role;', sch.schema_name);
  END LOOP;

  RAISE NOTICE 'Production data access successfully restored for anon and authenticated users across all schemas.';
END $$;
