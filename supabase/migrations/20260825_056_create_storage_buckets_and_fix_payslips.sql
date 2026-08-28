-- ============================================================================
-- WorkForceOS Enterprise HRMS — Migration 056
-- Ensure Storage Buckets (workforce-documents & employee-documents) & Policies
-- ============================================================================

-- 1. Create workforce-documents storage bucket (public access for HRMS documents)
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'workforce-documents',
        'workforce-documents',
        true,
        20971520, -- 20MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    )
    ON CONFLICT (id) DO UPDATE SET
        public = true,
        file_size_limit = 20971520,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Create employee-documents storage bucket
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'employee-documents',
        'employee-documents',
        true,
        20971520, -- 20MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    )
    ON CONFLICT (id) DO UPDATE SET
        public = true,
        file_size_limit = 20971520,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Storage Policies for workforce-documents and employee-documents
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Access for workforce-documents" ON storage.objects;
    CREATE POLICY "Public Read Access for workforce-documents"
        ON storage.objects FOR SELECT
        USING (bucket_id IN ('workforce-documents', 'employee-documents'));

    DROP POLICY IF EXISTS "Authenticated Upload Access for workforce-documents" ON storage.objects;
    CREATE POLICY "Authenticated Upload Access for workforce-documents"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id IN ('workforce-documents', 'employee-documents'));

    DROP POLICY IF EXISTS "Authenticated Update Access for workforce-documents" ON storage.objects;
    CREATE POLICY "Authenticated Update Access for workforce-documents"
        ON storage.objects FOR UPDATE
        USING (bucket_id IN ('workforce-documents', 'employee-documents'));

    DROP POLICY IF EXISTS "Authenticated Delete Access for workforce-documents" ON storage.objects;
    CREATE POLICY "Authenticated Delete Access for workforce-documents"
        ON storage.objects FOR DELETE
        USING (bucket_id IN ('workforce-documents', 'employee-documents'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 4. Ensure employee_payslips has employee_code column if missing to prevent 400 bad requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_payslips') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employee_payslips' AND column_name = 'employee_code') THEN
            ALTER TABLE public.employee_payslips ADD COLUMN employee_code TEXT;
        END IF;
    END IF;
END $$;
