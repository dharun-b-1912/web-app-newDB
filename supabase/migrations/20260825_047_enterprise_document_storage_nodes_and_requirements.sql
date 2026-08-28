-- ============================================================================
-- WorkForceOS Enterprise HRMS — Migration 047
-- Enterprise Multi-Tenant Document Repository & Storage Node Architecture
-- Migration: 20260825_047_enterprise_document_storage_nodes_and_requirements.sql
-- ============================================================================

-- 1. DOCUMENT CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.document_categories (
    id TEXT PRIMARY KEY DEFAULT ('doc-cat-' || gen_random_uuid()::text),
    organization_id TEXT,
    tenant_id TEXT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INT DEFAULT 0,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.document_categories ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.document_categories ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_cat_org ON public.document_categories(organization_id);

-- 2. DOCUMENT TYPE MASTER TABLE
CREATE TABLE IF NOT EXISTS public.document_type_master (
    id TEXT PRIMARY KEY DEFAULT ('doc-type-' || gen_random_uuid()::text),
    organization_id TEXT,
    tenant_id TEXT,
    category_id TEXT REFERENCES public.document_categories(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    allowed_subject_types TEXT[] NOT NULL DEFAULT ARRAY['employee'],
    allowed_file_types TEXT[] NOT NULL DEFAULT ARRAY['application/pdf', 'image/jpeg', 'image/png'],
    max_size_bytes BIGINT DEFAULT 10485760,
    requires_expiry BOOLEAN DEFAULT FALSE,
    requires_verification BOOLEAN DEFAULT TRUE,
    requires_signature BOOLEAN DEFAULT FALSE,
    default_classification TEXT NOT NULL DEFAULT 'restricted',
    retention_period_years INT DEFAULT 7,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.document_type_master ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.document_type_master ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_type_org ON public.document_type_master(organization_id);

-- 3. DOCUMENT FOLDERS TABLE
CREATE TABLE IF NOT EXISTS public.document_folders (
    id TEXT PRIMARY KEY DEFAULT ('doc-fld-' || gen_random_uuid()::text),
    organization_id TEXT,
    tenant_id TEXT,
    parent_folder_id TEXT REFERENCES public.document_folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.document_folders ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.document_folders ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_folders_org ON public.document_folders(organization_id);

-- 4. STORAGE POOLS & STORAGE NODES
CREATE TABLE IF NOT EXISTS public.storage_pools (
    id TEXT PRIMARY KEY DEFAULT ('pool-' || gen_random_uuid()::text),
    name TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'SUPABASE_STORAGE' CHECK (provider IN ('SUPABASE_STORAGE', 'AWS_S3', 'GCS', 'AZURE_BLOB')),
    region TEXT DEFAULT 'ap-south-1',
    status TEXT NOT NULL DEFAULT 'HEALTHY' CHECK (status IN ('HEALTHY', 'DEGRADED', 'FULL', 'MAINTENANCE')),
    capacity_bytes BIGINT DEFAULT 1099511627776,
    used_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.storage_nodes (
    id TEXT PRIMARY KEY DEFAULT ('node-' || gen_random_uuid()::text),
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    storage_pool_id TEXT REFERENCES public.storage_pools(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'READ_ONLY', 'SUSPENDED', 'MAINTENANCE')),
    storage_quota_bytes BIGINT DEFAULT 107374182400,
    used_bytes BIGINT DEFAULT 0,
    original_bytes BIGINT DEFAULT 0,
    compressed_bytes BIGINT DEFAULT 0,
    document_count INT DEFAULT 0,
    encryption_policy TEXT DEFAULT 'KMS_ENVELOPE',
    retention_policy TEXT DEFAULT 'STANDARD_7_YEARS',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.storage_nodes ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.storage_nodes ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_storage_nodes_tenant ON public.storage_nodes(tenant_id);

INSERT INTO public.storage_pools (id, name, provider, region, status)
VALUES ('pool-default-01', 'Default Enterprise Primary Pool', 'SUPABASE_STORAGE', 'ap-south-1', 'HEALTHY')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.storage_nodes (id, tenant_id, organization_id, storage_pool_id, name, storage_quota_bytes)
VALUES ('node-joy-01', 'org-joy-01', 'org-joy-01', 'pool-default-01', 'Joy Primary Tenant Storage Node', 107374182400)
ON CONFLICT (id) DO NOTHING;

-- 5. DOCUMENT MASTER TABLE
CREATE TABLE IF NOT EXISTS public.document_master (
    id TEXT PRIMARY KEY DEFAULT ('doc-' || gen_random_uuid()::text),
    organization_id TEXT,
    tenant_id TEXT,
    storage_node_id TEXT REFERENCES public.storage_nodes(id) ON DELETE SET NULL,
    legal_entity_id TEXT,
    branch_id TEXT,
    department_id TEXT,
    document_type_code TEXT NOT NULL,
    folder_id TEXT REFERENCES public.document_folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    document_number TEXT,
    subject_type TEXT NOT NULL DEFAULT 'EMPLOYEE',
    subject_id TEXT,
    subject_name TEXT,
    current_version_id TEXT,
    current_version_number INT DEFAULT 1,
    classification TEXT NOT NULL DEFAULT 'restricted',
    verification_status TEXT NOT NULL DEFAULT 'unverified',
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    expiry_date DATE,
    reminder_days INT[] DEFAULT ARRAY[90, 60, 30, 7],
    is_encrypted BOOLEAN DEFAULT TRUE,
    is_template BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    storage_bucket TEXT DEFAULT 'workforce-documents',
    storage_path TEXT,
    original_filename TEXT,
    original_size_bytes BIGINT DEFAULT 0,
    stored_size_bytes BIGINT DEFAULT 0,
    compression_ratio NUMERIC(5,2) DEFAULT 0.00,
    checksum_sha256 TEXT,
    record_version INT DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS storage_node_id TEXT;
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'workforce-documents';
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS original_size_bytes BIGINT DEFAULT 0;
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS stored_size_bytes BIGINT DEFAULT 0;
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS compression_ratio NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT;
ALTER TABLE public.document_master ADD COLUMN IF NOT EXISTS record_version INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_doc_master_org ON public.document_master(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_master_subject ON public.document_master(subject_type, subject_id);

-- 6. DOCUMENT REQUIREMENTS
CREATE TABLE IF NOT EXISTS public.document_requirements (
    id TEXT PRIMARY KEY DEFAULT ('doc-req-' || gen_random_uuid()::text),
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    employee_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT TRUE,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'REQUIRED'
        CHECK (status IN ('REQUIRED', 'UPLOADING', 'PROCESSING', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'REUPLOAD_REQUIRED')),
    rejection_reason TEXT,
    requested_by TEXT,
    document_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.document_requirements ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.document_requirements ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_req_employee ON public.document_requirements(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_doc_req_tenant ON public.document_requirements(tenant_id);

-- 7. DOCUMENT VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.document_versions (
    id TEXT PRIMARY KEY DEFAULT ('doc-ver-' || gen_random_uuid()::text),
    tenant_id TEXT,
    organization_id TEXT,
    document_id TEXT NOT NULL REFERENCES public.document_master(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    storage_bucket TEXT NOT NULL DEFAULT 'workforce-documents',
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    original_size_bytes BIGINT NOT NULL DEFAULT 0,
    stored_size_bytes BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 TEXT,
    compression_status TEXT DEFAULT 'OPTIMIZED',
    compression_ratio NUMERIC(5,2) DEFAULT 0.00,
    uploaded_by TEXT,
    change_reason TEXT,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.document_versions ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.document_versions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_ver_doc ON public.document_versions(document_id, version_number);
CREATE INDEX IF NOT EXISTS idx_doc_ver_tenant ON public.document_versions(tenant_id);

-- 8. DOCUMENT SHARE LINKS TABLE
CREATE TABLE IF NOT EXISTS public.document_share_links (
    id TEXT PRIMARY KEY DEFAULT ('share-' || gen_random_uuid()::text),
    tenant_id TEXT,
    organization_id TEXT,
    document_id TEXT NOT NULL REFERENCES public.document_master(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL,
    recipient_type TEXT NOT NULL DEFAULT 'EMPLOYEE',
    recipient_email TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    password_hash TEXT,
    download_limit INT DEFAULT 10,
    access_count INT DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'LIMIT_REACHED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.document_share_links ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.document_share_links ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_shares_doc ON public.document_share_links(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_shares_tenant ON public.document_share_links(tenant_id);

-- 9. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_type_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_categories_isolation" ON public.document_categories;
CREATE POLICY "doc_categories_isolation" ON public.document_categories FOR ALL USING (
    COALESCE(organization_id, tenant_id, 'org-joy-01') = public.current_org_id() 
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "doc_types_isolation" ON public.document_type_master;
CREATE POLICY "doc_types_isolation" ON public.document_type_master FOR ALL USING (
    COALESCE(organization_id, tenant_id, 'org-joy-01') = public.current_org_id() 
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "doc_folders_isolation" ON public.document_folders;
CREATE POLICY "doc_folders_isolation" ON public.document_folders FOR ALL USING (
    COALESCE(organization_id, tenant_id, 'org-joy-01') = public.current_org_id() 
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "doc_master_isolation" ON public.document_master;
CREATE POLICY "doc_master_isolation" ON public.document_master FOR ALL USING (
    COALESCE(organization_id, tenant_id, 'org-joy-01') = public.current_org_id() 
    OR subject_id IN (SELECT employee_id FROM public.app_users WHERE auth_user_id = auth.uid())
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "storage_nodes_isolation" ON public.storage_nodes;
CREATE POLICY "storage_nodes_isolation" ON public.storage_nodes FOR ALL USING (
    COALESCE(tenant_id, organization_id, 'org-joy-01') = public.current_org_id() 
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "doc_requirements_isolation" ON public.document_requirements;
CREATE POLICY "doc_requirements_isolation" ON public.document_requirements FOR ALL USING (
    COALESCE(tenant_id, organization_id, 'org-joy-01') = public.current_org_id() 
    OR employee_id IN (SELECT employee_id FROM public.app_users WHERE auth_user_id = auth.uid())
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "doc_versions_isolation" ON public.document_versions;
CREATE POLICY "doc_versions_isolation" ON public.document_versions FOR ALL USING (
    COALESCE(tenant_id, organization_id, 'org-joy-01') = public.current_org_id() 
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "doc_shares_isolation" ON public.document_share_links;
CREATE POLICY "doc_shares_isolation" ON public.document_share_links FOR ALL USING (
    COALESCE(tenant_id, organization_id, 'org-joy-01') = public.current_org_id() 
    OR auth.role() = 'service_role'
);

-- 10. ATOMIC MOBILE UPLOAD CONFIRMATION RPC
CREATE OR REPLACE FUNCTION public.fn_confirm_employee_document_upload(
    p_requirement_id TEXT,
    p_document_title TEXT,
    p_document_type TEXT,
    p_storage_bucket TEXT,
    p_storage_path TEXT,
    p_original_filename TEXT,
    p_mime_type TEXT,
    p_original_size_bytes BIGINT,
    p_stored_size_bytes BIGINT,
    p_checksum_sha256 TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req public.document_requirements%ROWTYPE;
    v_doc_id TEXT := 'doc-' || gen_random_uuid()::text;
    v_ver_id TEXT := 'doc-ver-' || gen_random_uuid()::text;
    v_emp public.employees%ROWTYPE;
    v_compression_ratio NUMERIC(5,2) := 0.00;
BEGIN
    SELECT * INTO v_req FROM public.document_requirements WHERE id = p_requirement_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'DOCUMENT_REQUIREMENT_NOT_FOUND: Requirement % does not exist', p_requirement_id;
    END IF;

    SELECT * INTO v_emp FROM public.employees WHERE id = v_req.employee_id;

    IF p_original_size_bytes > 0 AND p_stored_size_bytes > 0 THEN
        v_compression_ratio := ROUND(((p_original_size_bytes - p_stored_size_bytes)::NUMERIC / p_original_size_bytes::NUMERIC) * 100, 2);
    END IF;

    INSERT INTO public.document_master (
        id, organization_id, tenant_id, document_type_code, title,
        subject_type, subject_id, subject_name, classification,
        verification_status, storage_bucket, storage_path, original_filename,
        original_size_bytes, stored_size_bytes, compression_ratio,
        checksum_sha256, created_by, created_at, updated_at
    ) VALUES (
        v_doc_id, v_req.organization_id, v_req.tenant_id, p_document_type, p_document_title,
        'EMPLOYEE', v_req.employee_id, COALESCE(v_emp.display_name, 'Employee'), 'restricted',
        'unverified', p_storage_bucket, p_storage_path, p_original_filename,
        p_original_size_bytes, p_stored_size_bytes, v_compression_ratio,
        p_checksum_sha256, COALESCE(auth.uid()::text, v_req.employee_id), NOW(), NOW()
    );

    INSERT INTO public.document_versions (
        id, tenant_id, document_id, version_number, storage_bucket, storage_path,
        original_filename, mime_type, original_size_bytes, stored_size_bytes,
        checksum_sha256, compression_status, compression_ratio, uploaded_by,
        is_current, created_at
    ) VALUES (
        v_ver_id, v_req.tenant_id, v_doc_id, 1, p_storage_bucket, p_storage_path,
        p_original_filename, p_mime_type, p_original_size_bytes, p_stored_size_bytes,
        p_checksum_sha256, 'OPTIMIZED', v_compression_ratio, COALESCE(auth.uid()::text, v_req.employee_id),
        TRUE, NOW()
    );

    UPDATE public.document_requirements
    SET status = 'SUBMITTED',
        document_id = v_doc_id,
        updated_at = NOW()
    WHERE id = p_requirement_id;

    UPDATE public.storage_nodes
    SET used_bytes = used_bytes + p_stored_size_bytes,
        original_bytes = original_bytes + p_original_size_bytes,
        compressed_bytes = compressed_bytes + p_stored_size_bytes,
        document_count = document_count + 1,
        updated_at = NOW()
    WHERE tenant_id = v_req.tenant_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'document_id', v_doc_id,
        'version_id', v_ver_id,
        'status', 'SUBMITTED'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_confirm_employee_document_upload(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, BIGINT, TEXT) TO anon, authenticated, service_role, public;

-- 11. INITIAL SEED DOCUMENT REQUIREMENTS
INSERT INTO public.document_requirements (
    id, tenant_id, organization_id, employee_id, document_type, title, description, required, due_date, status
) VALUES 
(
    'req-dharun-01', 'org-joy-01', 'org-joy-01', 'emp-admin-001',
    'NATIONAL_ID_PROOF', 'Aadhaar / National Identity Card', 'Upload clear front & back copy for KYC verification', TRUE, '2026-09-30', 'REQUIRED'
),
(
    'req-dharun-02', 'org-joy-01', 'org-joy-01', 'emp-admin-001',
    'EDUCATION_CERTIFICATE', 'Highest Degree Certificate', 'University degree certificate or final transcript', TRUE, '2026-09-30', 'REQUIRED'
)
ON CONFLICT (id) DO NOTHING;

-- 12. ENABLE REALTIME PUBLICATION
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.document_master;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requirements;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.document_versions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
