-- ============================================================================
-- WorkForceOS Enterprise HRMS — Migration 048
-- Employee Profile Media, Private Storage & Realtime Synchronization Architecture
-- Migration: 20260825_048_employee_profile_media_and_secure_storage.sql
-- ============================================================================

-- 1. EMPLOYEE PROFILE MEDIA TABLE
CREATE TABLE IF NOT EXISTS public.employee_profile_media (
    id TEXT PRIMARY KEY DEFAULT ('pmed-' || gen_random_uuid()::text),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    employee_id TEXT NOT NULL,
    
    storage_bucket TEXT NOT NULL DEFAULT 'employee-profile-media',
    storage_path TEXT NOT NULL,
    
    mime_type TEXT NOT NULL DEFAULT 'image/webp',
    file_extension TEXT NOT NULL DEFAULT 'webp',
    width INT DEFAULT 512,
    height INT DEFAULT 512,
    
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    optimized_size_bytes BIGINT NOT NULL DEFAULT 0,
    
    sha256 TEXT NOT NULL,
    media_version INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REPLACED', 'DELETED', 'CORRUPT')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT,
    deleted_at TIMESTAMPTZ
);

ALTER TABLE public.employee_profile_media ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'org-joy-01';
ALTER TABLE public.employee_profile_media ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'org-joy-01';
ALTER TABLE public.employee_profile_media ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.employee_profile_media ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'employee-profile-media';
ALTER TABLE public.employee_profile_media ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.employee_profile_media ADD COLUMN IF NOT EXISTS sha256 TEXT;
ALTER TABLE public.employee_profile_media ADD COLUMN IF NOT EXISTS media_version INT DEFAULT 1;
ALTER TABLE public.employee_profile_media ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_profile_media_employee ON public.employee_profile_media(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_profile_media_tenant ON public.employee_profile_media(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_profile_media_sha256 ON public.employee_profile_media(employee_id, sha256);

-- 2. ALTER EMPLOYEES TABLE TO STORE CANONICAL MEDIA REFERENCE
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS current_profile_media_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS media_version INT DEFAULT 1;

-- 3. ASYNC MEDIA CLEANUP JOBS TABLE
CREATE TABLE IF NOT EXISTS public.profile_media_cleanup_jobs (
    id TEXT PRIMARY KEY DEFAULT ('pclean-' || gen_random_uuid()::text),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    employee_id TEXT NOT NULL,
    old_media_id TEXT NOT NULL,
    old_storage_bucket TEXT NOT NULL DEFAULT 'employee-profile-media',
    old_storage_path TEXT NOT NULL,
    attempt_count INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_profile_cleanup_pending ON public.profile_media_cleanup_jobs(status, attempt_count);

-- 4. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.employee_profile_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_media_cleanup_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_media_tenant_isolation" ON public.employee_profile_media;
CREATE POLICY "profile_media_tenant_isolation" ON public.employee_profile_media FOR ALL USING (
    COALESCE(organization_id, tenant_id, 'org-joy-01') = public.current_org_id() 
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "profile_cleanup_isolation" ON public.profile_media_cleanup_jobs;
CREATE POLICY "profile_cleanup_isolation" ON public.profile_media_cleanup_jobs FOR ALL USING (
    COALESCE(organization_id, tenant_id, 'org-joy-01') = public.current_org_id() 
    OR auth.role() = 'service_role'
);
