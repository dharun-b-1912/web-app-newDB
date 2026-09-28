-- ============================================================================
-- supabase/migrations/20260923_140_remove_sample_and_seed_vendor_data.sql
-- Joy PeopleHR — Complete Removal of Sample, Mock & Seed Vendor Data
-- Uses dynamic SQL (EXECUTE) to prevent PL/pgSQL parse-time column errors
-- ============================================================================

DO $$
DECLARE
  v_count INT := 0;
BEGIN
  -- 1. Purge Vendor Attendance Miss Exceptions (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'vendor_attendance_miss_exceptions'
  ) THEN
    EXECUTE 'DELETE FROM public.vendor_attendance_miss_exceptions 
             WHERE employee_name IN (''Murugan P'', ''Anand Kumar'', ''Sangeetha M'', ''Vignesh K'', ''Selvam R'', ''Rajesh S'', ''Priya R'')';
  END IF;

  -- 2. Purge Vendor Daily OT Records (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'vendor_daily_ot_records'
  ) THEN
    EXECUTE 'DELETE FROM public.vendor_daily_ot_records 
             WHERE employee_name IN (''Murugan P'', ''Anand Kumar'', ''Sangeetha M'', ''Vignesh K'', ''Selvam R'', ''Rajesh S'', ''Priya R'')';
  END IF;

  -- 3. Purge Mock Vendor Workers directly if any exist unlinked
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'vendor_workers'
  ) THEN
    EXECUTE 'DELETE FROM public.vendor_workers 
             WHERE worker_code LIKE ''VEN01-%'' 
                OR full_name IN (''Murugan P'', ''Anand Kumar'', ''Sangeetha M'', ''Vignesh K'', ''Selvam R'', ''Rajesh S'', ''Priya R'')';
  END IF;

  -- 4. Purge Vendor Contracts with fake seed IDs (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'vendor_contracts'
  ) THEN
    EXECUTE 'DELETE FROM public.vendor_contracts 
             WHERE id::text = ''b0000001-0000-0000-0000-000000000001''
                OR contract_number IN (''CON-JOY-CHE-2026-01'', ''CON-JOY-CBE-2026-04'')';
  END IF;

  -- 5. Purge Demo/Seed Vendors from Vendor Master
  -- Automatically cascades through ON DELETE CASCADE to:
  --   - public.vendor_relationships
  --   - public.vendor_contracts
  --   - public.vendor_documents
  --   - public.vendor_workers
  --   - public.vendor_users
  --   - public.vendor_invoices
  --   - public.vendor_requests
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'vendors'
  ) THEN
    DELETE FROM public.vendors
    WHERE vendor_code IN ('VEN-000001', 'VND-TEST-001', 'VND_TEST_MUARMMVV')
       OR legal_name ILIKE '%ABC Workforce%'
       OR legal_name ILIKE '%Test Manpower%'
       OR legal_name ILIKE '%Test Vendor%';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % seed vendor records from vendors table (all linked records cascaded).', v_count;
  END IF;

  RAISE NOTICE 'Complete cleanup of sample and seed vendor data finished successfully.';
END $$;
