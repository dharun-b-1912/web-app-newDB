-- ============================================================
-- Migration: 20260828_067_fix_employee_documents_rls.sql
-- Description: Fixes RLS insert policy and adds flexible columns
--              for public.employee_documents and public.documents
--              to allow Flutter mobile app and Web uploads.
-- ============================================================

-- 1. Ensure employee_documents exists with all necessary columns for Flutter/Web uploads
CREATE TABLE IF NOT EXISTS public.employee_documents (
    id TEXT PRIMARY KEY DEFAULT ('doc-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6)),
    tenant_id TEXT DEFAULT 'org-joy-01',
    organization_id TEXT DEFAULT 'org-joy-01',
    employee_id TEXT NOT NULL,
    document_category TEXT,
    document_type TEXT NOT NULL,
    document_name TEXT,
    file_name TEXT,
    file_path TEXT NOT NULL,
    file_url TEXT,
    storage_path TEXT,
    storage_bucket TEXT DEFAULT 'employee-documents',
    file_size_bytes BIGINT,
    mime_type TEXT,
    verification_status TEXT DEFAULT 'PENDING',
    status TEXT DEFAULT 'ACTIVE',
    uploaded_by TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure missing columns exist in employee_documents if table was already created
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'org-joy-01';
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'org-joy-01';
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS document_category TEXT;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'employee-documents';
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS uploaded_by TEXT;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_emp_doc_emp ON public.employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_doc_tenant ON public.employee_documents(tenant_id, organization_id);

-- 2. ENABLE RLS AND CONFIGURE GRANULAR POLICIES FOR employee_documents
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "employee_documents_select_policy" ON public.employee_documents;
    DROP POLICY IF EXISTS "employee_documents_insert_policy" ON public.employee_documents;
    DROP POLICY IF EXISTS "employee_documents_update_policy" ON public.employee_documents;
    DROP POLICY IF EXISTS "employee_documents_delete_policy" ON public.employee_documents;
    DROP POLICY IF EXISTS "Allow authenticated insert on employee_documents" ON public.employee_documents;
    DROP POLICY IF EXISTS "Allow authenticated select on employee_documents" ON public.employee_documents;
    DROP POLICY IF EXISTS "employee_documents_read_policy" ON public.employee_documents;
    DROP POLICY IF EXISTS "employee_documents_write_policy" ON public.employee_documents;

    CREATE POLICY "employee_documents_select_policy" ON public.employee_documents
        FOR SELECT USING (true);

    CREATE POLICY "employee_documents_insert_policy" ON public.employee_documents
        FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon', 'service_role'));

    CREATE POLICY "employee_documents_update_policy" ON public.employee_documents
        FOR UPDATE USING (auth.role() IN ('authenticated', 'anon', 'service_role'))
        WITH CHECK (auth.role() IN ('authenticated', 'anon', 'service_role'));

    CREATE POLICY "employee_documents_delete_policy" ON public.employee_documents
        FOR DELETE USING (auth.role() IN ('authenticated', 'anon', 'service_role'));
END $$;

GRANT ALL ON public.employee_documents TO anon, authenticated, service_role;

-- 3. ENSURE documents TABLE HAS PROPER RLS POLICIES (used as multi-table index in Flutter)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
        ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
        DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
        DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
        DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;

        CREATE POLICY "documents_select_policy" ON public.documents
            FOR SELECT USING (true);

        CREATE POLICY "documents_insert_policy" ON public.documents
            FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon', 'service_role'));

        CREATE POLICY "documents_update_policy" ON public.documents
            FOR UPDATE USING (auth.role() IN ('authenticated', 'anon', 'service_role'))
            WITH CHECK (auth.role() IN ('authenticated', 'anon', 'service_role'));

        CREATE POLICY "documents_delete_policy" ON public.documents
            FOR DELETE USING (auth.role() IN ('authenticated', 'anon', 'service_role'));

        GRANT ALL ON public.documents TO anon, authenticated, service_role;
    END IF;
END $$;

-- 4. ENSURE document_requirements TABLE HAS PROPER RLS POLICIES
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_requirements') THEN
        ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "document_requirements_select_policy" ON public.document_requirements;
        DROP POLICY IF EXISTS "document_requirements_insert_policy" ON public.document_requirements;
        DROP POLICY IF EXISTS "document_requirements_update_policy" ON public.document_requirements;
        DROP POLICY IF EXISTS "document_requirements_delete_policy" ON public.document_requirements;

        CREATE POLICY "document_requirements_select_policy" ON public.document_requirements
            FOR SELECT USING (true);

        CREATE POLICY "document_requirements_insert_policy" ON public.document_requirements
            FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon', 'service_role'));

        CREATE POLICY "document_requirements_update_policy" ON public.document_requirements
            FOR UPDATE USING (auth.role() IN ('authenticated', 'anon', 'service_role'))
            WITH CHECK (auth.role() IN ('authenticated', 'anon', 'service_role'));

        CREATE POLICY "document_requirements_delete_policy" ON public.document_requirements
            FOR DELETE USING (auth.role() IN ('authenticated', 'anon', 'service_role'));

        GRANT ALL ON public.document_requirements TO anon, authenticated, service_role;
    END IF;
END $$;
