-- ============================================================================
-- supabase/migrations/20260921_133_fix_vendor_contracts_tasks_rls.sql
-- Fixes: vendor_contracts and vendor_tasks — no organization_id column.
-- Both tables link to vendor_relationships via relationship_id.
-- Access is controlled by joining through vendor_relationships.
-- ============================================================================

-- ============================================================================
-- 1. vendor_contracts  (scoped via relationship_id → vendor_relationships)
-- ============================================================================
DROP POLICY IF EXISTS "vendor_contracts_select" ON public.vendor_contracts;
DROP POLICY IF EXISTS "vendor_contracts_insert" ON public.vendor_contracts;
DROP POLICY IF EXISTS "vendor_contracts_update" ON public.vendor_contracts;
DROP POLICY IF EXISTS "vendor_contracts_delete" ON public.vendor_contracts;

CREATE POLICY "vendor_contracts_select"
ON public.vendor_contracts FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE
      -- HR/Admin: any relationship in their org
      vr.organization_id IN (
        SELECT up.organization_id FROM public.user_profiles up
        WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
      )
      OR
      -- Vendor portal user: their vendor's relationships
      vr.vendor_id IN (
        SELECT vu.vendor_id FROM public.vendor_users vu
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
    WHERE vr.organization_id IN (
      SELECT up.organization_id FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
  )
);

CREATE POLICY "vendor_contracts_update"
ON public.vendor_contracts FOR UPDATE TO authenticated
USING (
  relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT up.organization_id FROM public.user_profiles up
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
    WHERE vr.organization_id IN (
      SELECT up.organization_id FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
  )
);

-- ============================================================================
-- 2. vendor_tasks  (scoped via relationship_id → vendor_relationships)
-- ============================================================================
DROP POLICY IF EXISTS "vendor_tasks_select" ON public.vendor_tasks;
DROP POLICY IF EXISTS "vendor_tasks_insert" ON public.vendor_tasks;
DROP POLICY IF EXISTS "vendor_tasks_update" ON public.vendor_tasks;
DROP POLICY IF EXISTS "vendor_tasks_delete" ON public.vendor_tasks;

CREATE POLICY "vendor_tasks_select"
ON public.vendor_tasks FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE
      vr.organization_id IN (
        SELECT up.organization_id FROM public.user_profiles up
        WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
      )
      OR
      vr.vendor_id IN (
        SELECT vu.vendor_id FROM public.vendor_users vu
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
    WHERE vr.organization_id IN (
      SELECT up.organization_id FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR vr.vendor_id IN (
      SELECT vu.vendor_id FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
    )
  )
);

CREATE POLICY "vendor_tasks_update"
ON public.vendor_tasks FOR UPDATE TO authenticated
USING (
  relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT up.organization_id FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR vr.vendor_id IN (
      SELECT vu.vendor_id FROM public.vendor_users vu
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
    WHERE vr.organization_id IN (
      SELECT up.organization_id FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
  )
);

DO $$
BEGIN
  RAISE NOTICE 'Migration 133 complete: vendor_contracts + vendor_tasks RLS policies created via relationship_id join';
END $$;
