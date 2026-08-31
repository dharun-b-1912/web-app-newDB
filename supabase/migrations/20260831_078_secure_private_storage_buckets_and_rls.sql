-- supabase/migrations/20260831_078_secure_private_storage_buckets_and_rls.sql
-- ============================================================================
-- Joy PeopleHR Enterprise — Secure Private Storage & Bucket Isolation Master
-- 1. Sets sensitive document buckets to strictly PRIVATE (public = false).
-- 2. Enforces Storage Policies on storage.objects for authenticated users only.
-- 3. Enables secure, expiring signed URLs for document inspection & preview.
-- NOTE: storage.objects ALREADY has RLS enabled by default. Do NOT run ALTER TABLE.
-- ============================================================================

-- 1. Ensure Sensitive Buckets Exist and are Strictly PRIVATE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('employee-documents', 'employee-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('workforce-documents', 'workforce-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('restricted-kyc', 'restricted-kyc', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('signed-documents', 'signed-documents', false, 20971520, ARRAY['application/pdf']),
  ('company-documents', 'company-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/zip', 'text/csv'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Avatars / Public Logos Bucket Remains Public for Fast Edge Delivery
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Clean up any previous conflicting storage policies
DROP POLICY IF EXISTS "Public storage read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated document access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated document insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated document update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated document delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public avatar read" ON storage.objects;

-- 4. Policy 1: Public Read ONLY for Avatars and Company Logos
CREATE POLICY "Allow public avatar read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('avatars', 'company-logos'));

-- 5. Policy 2: Authenticated Users Read Private Documents
CREATE POLICY "Allow authenticated document access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN ('employee-documents', 'workforce-documents', 'restricted-kyc', 'signed-documents', 'company-documents', 'avatars', 'company-logos')
  AND (
    -- User is Super Admin / Platform Staff
    auth.jwt() ->> 'role' IN ('Super Admin', 'SUPER_ADMIN', 'Security Officer')
    -- Or user belongs to active authenticated session
    OR auth.uid() IS NOT NULL
  )
);

-- 6. Policy 3: Authenticated Document Uploads
CREATE POLICY "Allow authenticated document insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND bucket_id IN ('employee-documents', 'workforce-documents', 'restricted-kyc', 'signed-documents', 'company-documents', 'avatars', 'company-logos')
);

-- 7. Policy 4: Authenticated Document Updates
CREATE POLICY "Allow authenticated document update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 8. Policy 5: Authenticated Document Deletes
CREATE POLICY "Allow authenticated document delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  OR auth.jwt() ->> 'role' IN ('Super Admin', 'SUPER_ADMIN')
);
