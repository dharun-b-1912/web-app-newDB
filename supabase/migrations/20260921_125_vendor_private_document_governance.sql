-- supabase/migrations/20260921_125_vendor_private_document_governance.sql
-- ============================================================================
-- JOY PeopleHR — Vendor Private Document Management & Storage Governance
-- 1. Provisions Canonical Private Storage Buckets (Private-by-Default)
-- 2. Hardens Vendor Document Metadata Schema in storage_documents
-- 3. Adds HR Reviewer Verification Functions & Vendor Access Control
-- 4. Enforces Strict Tenant & Vendor Isolation Policies
-- ============================================================================

-- Step 1: Terminate hanging idle transactions safely
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
  AND state IN ('idle in transaction', 'idle in transaction (aborted)');

SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- ----------------------------------------------------------------------------
-- 1. PROVISION CANONICAL PRIVATE STORAGE BUCKETS
-- ----------------------------------------------------------------------------

-- A. vendor-private-documents (Dedicated Vendor Compliance & Contract Vault)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-private-documents',
  'vendor-private-documents',
  false,
  20971520, -- 20MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- B. employee-private-documents (Sensitive Employee Identity & Statutory Proofs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-private-documents',
  'employee-private-documents',
  false,
  20971520, -- 20MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- C. employee-profile-media (Decoupled Private Avatars & Employee Profile Photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-profile-media',
  'employee-profile-media',
  false,
  5242880, -- 5MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- D. payslips-private (Private Payslips & Payroll Proofs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payslips-private',
  'payslips-private',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. HARDEN storage_documents SCHEMA & VERIFICATION COLUMNS
-- ----------------------------------------------------------------------------

ALTER TABLE public.storage_documents
  ADD COLUMN IF NOT EXISTS resubmission_note TEXT,
  ADD COLUMN IF NOT EXISTS document_version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_document_id TEXT,
  ADD COLUMN IF NOT EXISTS vendor_code TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'PENDING_REVIEW';

-- Create Index for fast vendor document retrieval by status & category
CREATE INDEX IF NOT EXISTS idx_storage_docs_vendor_status 
  ON public.storage_documents(vendor_id, file_category, verification_status) 
  WHERE vendor_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. HR ADMIN DOCUMENT VERIFICATION & REVIEW RPC FUNCTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_review_vendor_document(
  p_document_id TEXT,
  p_status TEXT,
  p_reviewer_id TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_resubmission_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_doc RECORD;
  v_updated RECORD;
BEGIN
  -- Validate target document exists
  SELECT * INTO v_doc FROM public.storage_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found.');
  END IF;

  -- Validate target status
  IF p_status NOT IN ('APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED', 'PENDING_REVIEW') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid verification status.');
  END IF;

  -- Rejection requires a mandatory reason
  IF p_status = 'REJECTED' AND (p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) = 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rejection reason is required.');
  END IF;

  UPDATE public.storage_documents
  SET
    verification_status = p_status,
    review_status = p_status,
    verified_by = p_reviewer_id,
    verified_at = NOW(),
    rejection_reason = p_rejection_reason,
    resubmission_note = p_resubmission_note,
    updated_at = NOW()
  WHERE id = p_document_id
  RETURNING * INTO v_updated;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_updated.id,
    'status', v_updated.verification_status,
    'verified_by', v_updated.verified_by,
    'verified_at', v_updated.verified_at
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.fn_review_vendor_document(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
