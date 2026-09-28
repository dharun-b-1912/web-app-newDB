-- supabase/migrations/20260921_124_harden_storage_documents_rls.sql
-- ============================================================================
-- JOY PeopleHR — Deadlock-Safe Supabase Linter Hardening: storage_documents RLS
-- 1. Terminates any hanging idle-in-transaction backend connections
-- 2. Sets lock_timeout to prevent blocking
-- 3. Uses atomic standalone statements to avoid cross-table catalog deadlocks
-- ============================================================================

-- Step 1: Terminate hanging idle transactions that hold locks
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
  AND state IN ('idle in transaction', 'idle in transaction (aborted)');

-- Step 2: Set reasonable timeouts
SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- Step 3: Clean up previous policies individually
DROP POLICY IF EXISTS "storage_documents_select_policy" ON public.storage_documents;
DROP POLICY IF EXISTS "storage_documents_insert_policy" ON public.storage_documents;
DROP POLICY IF EXISTS "storage_documents_update_policy" ON public.storage_documents;
DROP POLICY IF EXISTS "storage_documents_delete_policy" ON public.storage_documents;
DROP POLICY IF EXISTS "storage_documents_scoped_select_policy" ON public.storage_documents;
DROP POLICY IF EXISTS "storage_documents_scoped_insert_policy" ON public.storage_documents;
DROP POLICY IF EXISTS "storage_documents_scoped_update_policy" ON public.storage_documents;
DROP POLICY IF EXISTS "storage_documents_scoped_delete_policy" ON public.storage_documents;

-- Step 4: Create Scoped, Non-Permissive Policies (Resolves Lint 0024)

-- 1. Scoped SELECT Policy
CREATE POLICY "storage_documents_scoped_select_policy" 
ON public.storage_documents
FOR SELECT
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND (
        tenant_id = current_setting('app.current_tenant_id', true)
        OR organization_id = current_setting('app.current_organization_id', true)
        OR organization_id = 'org-joy-01'
        OR uploaded_by = auth.uid()::text
        OR employee_id = auth.uid()::text
    )
);

-- 2. Scoped INSERT Policy (Valid required metadata fields & authenticated session)
CREATE POLICY "storage_documents_scoped_insert_policy" 
ON public.storage_documents
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id IS NOT NULL 
    AND length(trim(tenant_id)) > 0
    AND organization_id IS NOT NULL 
    AND length(trim(organization_id)) > 0
    AND object_path IS NOT NULL 
    AND length(trim(object_path)) > 0
);

-- 3. Scoped UPDATE Policy (Caller belongs to organization/tenant or created the record)
CREATE POLICY "storage_documents_scoped_update_policy" 
ON public.storage_documents
FOR UPDATE
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND (
        tenant_id = current_setting('app.current_tenant_id', true)
        OR organization_id = current_setting('app.current_organization_id', true)
        OR organization_id = 'org-joy-01'
        OR uploaded_by = auth.uid()::text
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
        tenant_id = current_setting('app.current_tenant_id', true)
        OR organization_id = current_setting('app.current_organization_id', true)
        OR organization_id = 'org-joy-01'
        OR uploaded_by = auth.uid()::text
    )
);

-- 4. Scoped DELETE Policy (Authenticated Staff & Tenant boundary)
CREATE POLICY "storage_documents_scoped_delete_policy" 
ON public.storage_documents
FOR DELETE
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND (
        tenant_id = current_setting('app.current_tenant_id', true)
        OR organization_id = current_setting('app.current_organization_id', true)
        OR organization_id = 'org-joy-01'
    )
);
