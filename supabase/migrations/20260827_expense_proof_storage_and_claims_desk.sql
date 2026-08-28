-- ============================================================================
-- WorkForceOS Enterprise HRMS — Expense Proof Storage & Reimbursement Desk
-- Configures Storage Policies for employee-documents, claims proof & letters
-- ============================================================================

-- 1. Ensure storage buckets exist with generous limits for compressed media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'employee-documents',
        'employee-documents',
        true,
        52428800, -- 50MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    ),
    (
        'workforce-documents',
        'workforce-documents',
        true,
        52428800,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    )
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- 2. Storage Policies for Object CRUD Access
DROP POLICY IF EXISTS "Public Read Access for Documents and Receipts" ON storage.objects;
CREATE POLICY "Public Read Access for Documents and Receipts"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('employee-documents', 'workforce-documents', 'workforce-avatars'));

DROP POLICY IF EXISTS "Public Upload Access for Documents and Receipts" ON storage.objects;
CREATE POLICY "Public Upload Access for Documents and Receipts"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('employee-documents', 'workforce-documents', 'workforce-avatars'));

DROP POLICY IF EXISTS "Public Update Access for Documents and Receipts" ON storage.objects;
CREATE POLICY "Public Update Access for Documents and Receipts"
    ON storage.objects FOR UPDATE
    USING (bucket_id IN ('employee-documents', 'workforce-documents', 'workforce-avatars'));

DROP POLICY IF EXISTS "Public Delete Access for Documents and Receipts" ON storage.objects;
CREATE POLICY "Public Delete Access for Documents and Receipts"
    ON storage.objects FOR DELETE
    USING (bucket_id IN ('employee-documents', 'workforce-documents', 'workforce-avatars'));

-- 3. Ensure columns on expense_claims table
ALTER TABLE IF EXISTS public.expense_claims 
    ADD COLUMN IF NOT EXISTS approved_amount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reimbursement_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reimbursement_reference TEXT,
    ADD COLUMN IF NOT EXISTS receipt_filename TEXT,
    ADD COLUMN IF NOT EXISTS approver_comment TEXT;
