-- ====================================================================
-- WorkforceOS Enterprise HRMS: Canonical Employee Avatar Assets Schema
-- ====================================================================

-- 1. Create employee_avatar_assets table
CREATE TABLE IF NOT EXISTS public.employee_avatar_assets (
    id TEXT PRIMARY KEY DEFAULT ('avt-' || gen_random_uuid()::text),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    organisation_id TEXT NOT NULL DEFAULT 'org-joy-01',
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    storage_bucket TEXT NOT NULL DEFAULT 'workforce-avatars',
    storage_path TEXT NOT NULL,
    master_path TEXT,
    small_path TEXT,
    medium_path TEXT,
    large_path TEXT,
    mime_type TEXT NOT NULL DEFAULT 'image/webp',
    width INTEGER DEFAULT 1024,
    height INTEGER DEFAULT 1024,
    master_width INTEGER DEFAULT 1024,
    master_height INTEGER DEFAULT 1024,
    original_size_bytes BIGINT DEFAULT 0,
    stored_size_bytes BIGINT DEFAULT 0,
    master_size_bytes BIGINT DEFAULT 0,
    checksum_sha256 TEXT DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUPERSEDED', 'DELETED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure newly added columns exist if table was already created
ALTER TABLE public.employee_avatar_assets ADD COLUMN IF NOT EXISTS master_path TEXT;
ALTER TABLE public.employee_avatar_assets ADD COLUMN IF NOT EXISTS small_path TEXT;
ALTER TABLE public.employee_avatar_assets ADD COLUMN IF NOT EXISTS medium_path TEXT;
ALTER TABLE public.employee_avatar_assets ADD COLUMN IF NOT EXISTS large_path TEXT;
ALTER TABLE public.employee_avatar_assets ADD COLUMN IF NOT EXISTS master_width INTEGER DEFAULT 1024;
ALTER TABLE public.employee_avatar_assets ADD COLUMN IF NOT EXISTS master_height INTEGER DEFAULT 1024;
ALTER TABLE public.employee_avatar_assets ADD COLUMN IF NOT EXISTS master_size_bytes BIGINT DEFAULT 0;

-- 2. Alter employees table to add avatar_asset_id and avatar_version columns if not exists
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_asset_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_version INTEGER DEFAULT 1;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.employee_avatar_assets ENABLE ROW LEVEL SECURITY;

-- 4. Open Policies for authorized HR & Employee self-service operations
DROP POLICY IF EXISTS "Allow full access on employee_avatar_assets" ON public.employee_avatar_assets;
CREATE POLICY "Allow full access on employee_avatar_assets" ON public.employee_avatar_assets
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Provision storage bucket and storage RLS policies if storage schema exists
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'workforce-avatars',
        'workforce-avatars',
        true,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET public = true;

    -- Storage policies
    DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
    CREATE POLICY "Public Avatar Access" ON storage.objects FOR SELECT USING (bucket_id = 'workforce-avatars');

    DROP POLICY IF EXISTS "Public Avatar Upload" ON storage.objects;
    CREATE POLICY "Public Avatar Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'workforce-avatars');

    DROP POLICY IF EXISTS "Public Avatar Update" ON storage.objects;
    CREATE POLICY "Public Avatar Update" ON storage.objects FOR UPDATE USING (bucket_id = 'workforce-avatars');

    DROP POLICY IF EXISTS "Public Avatar Delete" ON storage.objects;
    CREATE POLICY "Public Avatar Delete" ON storage.objects FOR DELETE USING (bucket_id = 'workforce-avatars');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

