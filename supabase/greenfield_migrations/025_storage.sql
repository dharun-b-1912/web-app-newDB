-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 025
-- Target Project: ysiajemrqakfngasehhi
-- Description: Supabase Storage Buckets & File Access RLS Policies
-- ============================================================================

-- 1. Create Private Storage Buckets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
    ('documents', 'documents', false, false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('payslips', 'payslips', false, false, 10485760, ARRAY['application/pdf']),
    ('avatars', 'avatars', true, true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage RLS Policies for 'documents' Bucket
DROP POLICY IF EXISTS "documents_tenant_read" ON storage.objects;
CREATE POLICY "documents_tenant_read" ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'documents'
    AND (
        (storage.foldername(name))[1]::text = (SELECT public.get_active_user_org_id())::text
        OR (SELECT public.is_platform_admin())
    )
);

DROP POLICY IF EXISTS "documents_tenant_upload" ON storage.objects;
CREATE POLICY "documents_tenant_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1]::text = (SELECT public.get_active_user_org_id())::text
);

-- 3. Storage RLS Policies for 'payslips' Bucket
DROP POLICY IF EXISTS "payslips_tenant_read" ON storage.objects;
CREATE POLICY "payslips_tenant_read" ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'payslips'
    AND (
        (storage.foldername(name))[1]::text = (SELECT public.get_active_user_org_id())::text
        OR (SELECT public.is_platform_admin())
    )
);

-- 4. Storage RLS Policies for 'avatars' Bucket (Public Read)
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_upload" ON storage.objects;
CREATE POLICY "avatars_auth_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');
