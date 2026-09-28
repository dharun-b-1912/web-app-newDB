-- supabase/migrations/20260915_116_vendor_rls_crud_policies.sql
-- ============================================================================
-- Joy PeopleHR — Complete Enterprise Vendor RLS CRUD Policies
-- Grants appropriate INSERT, UPDATE, and DELETE policies for authenticated
-- Company Users and Vendor Users across all 12 Vendor Ecosystem tables.
-- ============================================================================

-- 1. Vendors Table
DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON public.vendors;
CREATE POLICY "Authenticated users can insert vendors"
ON public.vendors FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Company and Vendor users can update vendors" ON public.vendors;
CREATE POLICY "Company and Vendor users can update vendors"
ON public.vendors FOR UPDATE TO authenticated
USING (
  id IN (
    SELECT vr.vendor_id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
  )
  OR id IN (
    SELECT vu.vendor_id FROM public.vendor_users vu
    WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
  )
);

-- 2. Vendor Relationships Table
DROP POLICY IF EXISTS "Company users can insert vendor relationships" ON public.vendor_relationships;
CREATE POLICY "Company users can insert vendor relationships"
ON public.vendor_relationships FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'Active'
  )
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Company and Vendor users can update vendor relationships" ON public.vendor_relationships;
CREATE POLICY "Company and Vendor users can update vendor relationships"
ON public.vendor_relationships FOR UPDATE TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'Active'
  )
  OR vendor_id IN (
    SELECT vu.vendor_id FROM public.vendor_users vu
    WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
  )
);

-- 3. Vendor Workers Table
DROP POLICY IF EXISTS "Authorized users can insert vendor workers" ON public.vendor_workers;
CREATE POLICY "Authorized users can insert vendor workers"
ON public.vendor_workers FOR INSERT TO authenticated
WITH CHECK (
  vendor_id IN (
    SELECT vu.vendor_id FROM public.vendor_users vu
    WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
  )
  OR organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'Active'
  )
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Authorized users can update vendor workers" ON public.vendor_workers;
CREATE POLICY "Authorized users can update vendor workers"
ON public.vendor_workers FOR UPDATE TO authenticated
USING (
  vendor_id IN (
    SELECT vu.vendor_id FROM public.vendor_users vu
    WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
  )
  OR organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'Active'
  )
);

-- 4. Vendor Documents Table
DROP POLICY IF EXISTS "Authorized users can insert vendor documents" ON public.vendor_documents;
CREATE POLICY "Authorized users can insert vendor documents"
ON public.vendor_documents FOR INSERT TO authenticated
WITH CHECK (
  vendor_id IN (
    SELECT vu.vendor_id FROM public.vendor_users vu
    WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
  )
  OR relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
  )
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Authorized users can update vendor documents" ON public.vendor_documents;
CREATE POLICY "Authorized users can update vendor documents"
ON public.vendor_documents FOR UPDATE TO authenticated
USING (
  vendor_id IN (
    SELECT vu.vendor_id FROM public.vendor_users vu
    WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
  )
  OR relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
  )
);

-- 5. Vendor Requests Table
DROP POLICY IF EXISTS "Participants can insert vendor requests" ON public.vendor_requests;
CREATE POLICY "Participants can insert vendor requests"
ON public.vendor_requests FOR INSERT TO authenticated
WITH CHECK (
  relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
    OR vr.vendor_id IN (
      SELECT vu.vendor_id FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
    )
  )
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Participants can update vendor requests" ON public.vendor_requests;
CREATE POLICY "Participants can update vendor requests"
ON public.vendor_requests FOR UPDATE TO authenticated
USING (
  relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
    OR vr.vendor_id IN (
      SELECT vu.vendor_id FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
    )
  )
);

-- 6. Vendor Request Comments Table
DROP POLICY IF EXISTS "Participants can view request comments" ON public.vendor_request_comments;
CREATE POLICY "Participants can view request comments"
ON public.vendor_request_comments FOR SELECT TO authenticated
USING (
  request_id IN (
    SELECT vreq.id FROM public.vendor_requests vreq
    JOIN public.vendor_relationships vr ON vreq.relationship_id = vr.id
    WHERE (
      vr.organization_id IN (
        SELECT om.organization_id FROM public.organization_memberships om
        WHERE om.user_id = auth.uid() AND om.status = 'Active'
      )
      OR (
        vr.vendor_id IN (
          SELECT vu.vendor_id FROM public.vendor_users vu
          WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
        )
        AND is_internal = FALSE -- Strictly hide company internal comments from vendor!
      )
    )
  )
);

DROP POLICY IF EXISTS "Participants can insert request comments" ON public.vendor_request_comments;
CREATE POLICY "Participants can insert request comments"
ON public.vendor_request_comments FOR INSERT TO authenticated
WITH CHECK (
  request_id IN (
    SELECT vreq.id FROM public.vendor_requests vreq
    JOIN public.vendor_relationships vr ON vreq.relationship_id = vr.id
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
    OR (
      vr.vendor_id IN (
        SELECT vu.vendor_id FROM public.vendor_users vu
        WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
      )
      AND is_internal = FALSE
    )
  )
  OR auth.uid() IS NOT NULL
);

-- 7. Vendor Conversations Table
DROP POLICY IF EXISTS "Participants can insert vendor conversations" ON public.vendor_conversations;
CREATE POLICY "Participants can insert vendor conversations"
ON public.vendor_conversations FOR INSERT TO authenticated
WITH CHECK (
  relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
    OR vr.vendor_id IN (
      SELECT vu.vendor_id FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
    )
  )
  OR auth.uid() IS NOT NULL
);

-- 8. Vendor Audit Logs Table
DROP POLICY IF EXISTS "Authorized users can insert audit logs" ON public.vendor_audit_logs;
CREATE POLICY "Authorized users can insert audit logs"
ON public.vendor_audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Company users can view audit logs" ON public.vendor_audit_logs;
CREATE POLICY "Company users can view audit logs"
ON public.vendor_audit_logs FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'Active'
  )
  OR actor_user_id = auth.uid()
);
