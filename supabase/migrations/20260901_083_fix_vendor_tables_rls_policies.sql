-- supabase/migrations/20260901_083_fix_vendor_tables_rls_policies.sql
-- ============================================================================
-- JOY PEOPLEHR — FIX: rls_enabled_no_policy ON VENDOR SYSTEM TABLES
-- Tables:
-- 1. public.vendor_attendance_records
-- 2. public.vendor_invoices
-- 3. public.vendor_purchase_orders
-- 4. public.vendor_statutory_challans
-- ============================================================================

DO $$
DECLARE
  t_name text;
  tables text[] := ARRAY[
    'vendor_attendance_records',
    'vendor_invoices',
    'vendor_purchase_orders',
    'vendor_statutory_challans'
  ];
  p_rec RECORD;
BEGIN
  FOREACH t_name IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
      
      -- 1. Drop existing policies if any to prevent conflicts
      FOR p_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = t_name
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', p_rec.policyname, t_name);
      END LOOP;

      -- 2. Ensure RLS is active
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);

      -- 3. Create granular RLS policies for authenticated users & service role

      -- SELECT Policy
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated, service_role USING (true);',
        t_name || '_read_policy',
        t_name
      );

      -- INSERT Policy
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated, service_role WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = ''service_role'');',
        t_name || '_insert_policy',
        t_name
      );

      -- UPDATE Policy
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated, service_role USING (auth.uid() IS NOT NULL OR auth.role() = ''service_role'') WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = ''service_role'');',
        t_name || '_update_policy',
        t_name
      );

      -- DELETE Policy
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated, service_role USING (auth.uid() IS NOT NULL OR auth.role() = ''service_role'');',
        t_name || '_delete_policy',
        t_name
      );

      RAISE NOTICE 'Successfully applied granular RLS policies on table %', t_name;
    END IF;
  END LOOP;
END $$;
