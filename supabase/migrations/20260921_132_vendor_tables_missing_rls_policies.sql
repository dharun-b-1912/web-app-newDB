-- ============================================================================
-- supabase/migrations/20260921_132_vendor_tables_missing_rls_policies.sql
-- Fixes: Supabase Security Advisor lint 0008 (RLS enabled but no policies)
-- Tables: 
--   1. vendor_attendance_batches (has organization_id, vendor_id)
--   2. vendor_site_contracts     (has organization_id, vendor_id)
--   3. vendor_payroll_deductions (has organization_id, vendor_id)
--   4. vendor_contracts          (has relationship_id -> vendor_relationships)
--   5. vendor_tasks              (has relationship_id -> vendor_relationships)
--
-- Pattern: 
--   HR/Admin access via user_profiles.organization_id match;
--   Vendor access via vendor_users.vendor_id match
-- ============================================================================

-- Ensure RLS is enabled on all target tables
ALTER TABLE IF EXISTS public.vendor_attendance_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_site_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. vendor_attendance_batches (columns: organization_id, vendor_id)
-- ============================================================================
DROP POLICY IF EXISTS "vendor_attendance_batches_select" ON public.vendor_attendance_batches;
DROP POLICY IF EXISTS "vendor_attendance_batches_insert" ON public.vendor_attendance_batches;
DROP POLICY IF EXISTS "vendor_attendance_batches_update" ON public.vendor_attendance_batches;
DROP POLICY IF EXISTS "vendor_attendance_batches_delete" ON public.vendor_attendance_batches;

CREATE POLICY "vendor_attendance_batches_select"
ON public.vendor_attendance_batches FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    organization_id::text IN (
      SELECT up.organization_id::text FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR vendor_id::text IN (
      SELECT vu.vendor_id::text FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
    )
  )
);

CREATE POLICY "vendor_attendance_batches_insert"
ON public.vendor_attendance_batches FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    organization_id::text IN (
      SELECT up.organization_id::text FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR vendor_id::text IN (
      SELECT vu.vendor_id::text FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
    )
  )
);

CREATE POLICY "vendor_attendance_batches_update"
ON public.vendor_attendance_batches FOR UPDATE TO authenticated
USING (
  organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
  )
)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vendor_attendance_batches_delete"
ON public.vendor_attendance_batches FOR DELETE TO authenticated
USING (
  organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
  )
);

-- ============================================================================
-- 2. vendor_site_contracts (columns: organization_id, vendor_id)
-- ============================================================================
DROP POLICY IF EXISTS "vendor_site_contracts_select" ON public.vendor_site_contracts;
DROP POLICY IF EXISTS "vendor_site_contracts_insert" ON public.vendor_site_contracts;
DROP POLICY IF EXISTS "vendor_site_contracts_update" ON public.vendor_site_contracts;
DROP POLICY IF EXISTS "vendor_site_contracts_delete" ON public.vendor_site_contracts;

CREATE POLICY "vendor_site_contracts_select"
ON public.vendor_site_contracts FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    organization_id::text IN (
      SELECT up.organization_id::text FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR vendor_id::text IN (
      SELECT vu.vendor_id::text FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
    )
  )
);

CREATE POLICY "vendor_site_contracts_insert"
ON public.vendor_site_contracts FOR INSERT TO authenticated
WITH CHECK (
  organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
  )
);

CREATE POLICY "vendor_site_contracts_update"
ON public.vendor_site_contracts FOR UPDATE TO authenticated
USING (
  organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
  )
)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vendor_site_contracts_delete"
ON public.vendor_site_contracts FOR DELETE TO authenticated
USING (
  organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
  )
);

-- ============================================================================
-- 3. vendor_payroll_deductions (columns: organization_id, vendor_id)
-- ============================================================================
DROP POLICY IF EXISTS "vendor_payroll_deductions_select" ON public.vendor_payroll_deductions;
DROP POLICY IF EXISTS "vendor_payroll_deductions_insert" ON public.vendor_payroll_deductions;
DROP POLICY IF EXISTS "vendor_payroll_deductions_update" ON public.vendor_payroll_deductions;
DROP POLICY IF EXISTS "vendor_payroll_deductions_delete" ON public.vendor_payroll_deductions;

CREATE POLICY "vendor_payroll_deductions_select"
ON public.vendor_payroll_deductions FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    organization_id::text IN (
      SELECT up.organization_id::text FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR vendor_id::text IN (
      SELECT vu.vendor_id::text FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
    )
  )
);

CREATE POLICY "vendor_payroll_deductions_insert"
ON public.vendor_payroll_deductions FOR INSERT TO authenticated
WITH CHECK (
  organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
  )
);

CREATE POLICY "vendor_payroll_deductions_update"
ON public.vendor_payroll_deductions FOR UPDATE TO authenticated
USING (
  organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
  )
)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vendor_payroll_deductions_delete"
ON public.vendor_payroll_deductions FOR DELETE TO authenticated
USING (
  organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
  )
);

-- ============================================================================
-- 4. vendor_contracts (scoped via relationship_id -> vendor_relationships)
-- ============================================================================
DO $$
DECLARE
  has_relationship_id BOOLEAN;
  has_org_id          BOOLEAN;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vendor_contracts'
  ) THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'vendor_contracts' AND column_name = 'relationship_id'
    ) INTO has_relationship_id;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'vendor_contracts' AND column_name = 'organization_id'
    ) INTO has_org_id;

    EXECUTE 'DROP POLICY IF EXISTS "vendor_contracts_select" ON public.vendor_contracts';
    EXECUTE 'DROP POLICY IF EXISTS "vendor_contracts_insert" ON public.vendor_contracts';
    EXECUTE 'DROP POLICY IF EXISTS "vendor_contracts_update" ON public.vendor_contracts';
    EXECUTE 'DROP POLICY IF EXISTS "vendor_contracts_delete" ON public.vendor_contracts';

    IF has_relationship_id THEN
      -- Standard multi-tenant ecosystem pattern: links to vendor_relationships
      EXECUTE $p$
        CREATE POLICY "vendor_contracts_select"
        ON public.vendor_contracts FOR SELECT TO authenticated
        USING (
          auth.uid() IS NOT NULL AND
          relationship_id IN (
            SELECT vr.id FROM public.vendor_relationships vr
            WHERE
              vr.organization_id::text IN (
                SELECT up.organization_id::text FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
              )
              OR
              vr.vendor_id::text IN (
                SELECT vu.vendor_id::text FROM public.vendor_users vu
                WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
              )
          )
        );

        CREATE POLICY "vendor_contracts_insert"
        ON public.vendor_contracts FOR INSERT TO authenticated
        WITH CHECK (
          auth.uid() IS NOT NULL AND
          relationship_id IN (
            SELECT vr.id FROM public.vendor_relationships vr
            WHERE vr.organization_id::text IN (
              SELECT up.organization_id::text FROM public.user_profiles up
              WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
            )
          )
        );

        CREATE POLICY "vendor_contracts_update"
        ON public.vendor_contracts FOR UPDATE TO authenticated
        USING (
          relationship_id IN (
            SELECT vr.id FROM public.vendor_relationships vr
            WHERE vr.organization_id::text IN (
              SELECT up.organization_id::text FROM public.user_profiles up
              WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
            )
          )
        )
        WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "vendor_contracts_delete"
        ON public.vendor_contracts FOR DELETE TO authenticated
        USING (
          relationship_id IN (
            SELECT vr.id FROM public.vendor_relationships vr
            WHERE vr.organization_id::text IN (
              SELECT up.organization_id::text FROM public.user_profiles up
              WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
            )
          )
        );
      $p$;
      RAISE NOTICE 'vendor_contracts: RLS policies created using relationship_id';

    ELSIF has_org_id THEN
      -- Direct organization_id column fallback
      EXECUTE $p$
        CREATE POLICY "vendor_contracts_select"
        ON public.vendor_contracts FOR SELECT TO authenticated
        USING (
          auth.uid() IS NOT NULL AND (
            organization_id::text IN (
              SELECT up.organization_id::text FROM public.user_profiles up
              WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
            )
            OR vendor_id::text IN (
              SELECT vu.vendor_id::text FROM public.vendor_users vu
              WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
            )
          )
        );

        CREATE POLICY "vendor_contracts_insert"
        ON public.vendor_contracts FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "vendor_contracts_update"
        ON public.vendor_contracts FOR UPDATE TO authenticated
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "vendor_contracts_delete"
        ON public.vendor_contracts FOR DELETE TO authenticated
        USING (
          organization_id::text IN (
            SELECT up.organization_id::text FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
          )
        );
      $p$;
      RAISE NOTICE 'vendor_contracts: RLS policies created using organization_id';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 5. vendor_tasks (scoped via relationship_id -> vendor_relationships)
-- ============================================================================
DO $$
DECLARE
  has_relationship_id BOOLEAN;
  has_org_id          BOOLEAN;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vendor_tasks'
  ) THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'vendor_tasks' AND column_name = 'relationship_id'
    ) INTO has_relationship_id;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'vendor_tasks' AND column_name = 'organization_id'
    ) INTO has_org_id;

    EXECUTE 'DROP POLICY IF EXISTS "vendor_tasks_select" ON public.vendor_tasks';
    EXECUTE 'DROP POLICY IF EXISTS "vendor_tasks_insert" ON public.vendor_tasks';
    EXECUTE 'DROP POLICY IF EXISTS "vendor_tasks_update" ON public.vendor_tasks';
    EXECUTE 'DROP POLICY IF EXISTS "vendor_tasks_delete" ON public.vendor_tasks';

    IF has_relationship_id THEN
      -- Both HR Admin and Vendor can collaborate on tasks
      EXECUTE $p$
        CREATE POLICY "vendor_tasks_select"
        ON public.vendor_tasks FOR SELECT TO authenticated
        USING (
          auth.uid() IS NOT NULL AND
          relationship_id IN (
            SELECT vr.id FROM public.vendor_relationships vr
            WHERE
              vr.organization_id::text IN (
                SELECT up.organization_id::text FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
              )
              OR
              vr.vendor_id::text IN (
                SELECT vu.vendor_id::text FROM public.vendor_users vu
                WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
              )
          )
        );

        CREATE POLICY "vendor_tasks_insert"
        ON public.vendor_tasks FOR INSERT TO authenticated
        WITH CHECK (
          auth.uid() IS NOT NULL AND
          relationship_id IN (
            SELECT vr.id FROM public.vendor_relationships vr
            WHERE
              vr.organization_id::text IN (
                SELECT up.organization_id::text FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
              )
              OR
              vr.vendor_id::text IN (
                SELECT vu.vendor_id::text FROM public.vendor_users vu
                WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
              )
          )
        );

        CREATE POLICY "vendor_tasks_update"
        ON public.vendor_tasks FOR UPDATE TO authenticated
        USING (
          relationship_id IN (
            SELECT vr.id FROM public.vendor_relationships vr
            WHERE
              vr.organization_id::text IN (
                SELECT up.organization_id::text FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
              )
              OR
              vr.vendor_id::text IN (
                SELECT vu.vendor_id::text FROM public.vendor_users vu
                WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
              )
          )
        )
        WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "vendor_tasks_delete"
        ON public.vendor_tasks FOR DELETE TO authenticated
        USING (
          relationship_id IN (
            SELECT vr.id FROM public.vendor_relationships vr
            WHERE vr.organization_id::text IN (
              SELECT up.organization_id::text FROM public.user_profiles up
              WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
            )
          )
        );
      $p$;
      RAISE NOTICE 'vendor_tasks: RLS policies created using relationship_id';

    ELSIF has_org_id THEN
      EXECUTE $p$
        CREATE POLICY "vendor_tasks_select"
        ON public.vendor_tasks FOR SELECT TO authenticated
        USING (
          auth.uid() IS NOT NULL AND (
            organization_id::text IN (
              SELECT up.organization_id::text FROM public.user_profiles up
              WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
            )
            OR vendor_id::text IN (
              SELECT vu.vendor_id::text FROM public.vendor_users vu
              WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
            )
          )
        );

        CREATE POLICY "vendor_tasks_insert"
        ON public.vendor_tasks FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "vendor_tasks_update"
        ON public.vendor_tasks FOR UPDATE TO authenticated
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "vendor_tasks_delete"
        ON public.vendor_tasks FOR DELETE TO authenticated
        USING (auth.uid() IS NOT NULL);
      $p$;
      RAISE NOTICE 'vendor_tasks: RLS policies created using organization_id';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migration 132 complete: RLS policies successfully applied for all 5 vendor tables';
END $$;
