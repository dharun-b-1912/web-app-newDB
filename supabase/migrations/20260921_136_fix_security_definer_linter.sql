-- ============================================================================
-- Migration: 20260921_136_fix_security_definer_linter.sql
-- Description: Convert fn_review_vendor_document to SECURITY INVOKER
--              to resolve Supabase Linter Rule 0029.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_review_vendor_document(
  p_document_id TEXT,
  p_status TEXT,
  p_reviewer_id TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_resubmission_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_doc RECORD;
  v_caller_role TEXT;
  v_is_authorized BOOLEAN := false;
BEGIN
  -- 1. Ensure caller is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- 2. Verify caller is not a VENDOR_ADMIN (they cannot self-approve)
  SELECT role INTO v_caller_role
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_caller_role IN ('VENDOR_ADMIN', 'vendor_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendor Admin cannot review or approve compliance documents.');
  END IF;

  -- 3. Check document existence
  SELECT * INTO v_doc FROM public.storage_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found.');
  END IF;

  -- 4. Validate status
  IF p_status NOT IN ('APPROVED', 'VERIFIED', 'REJECTED', 'RESUBMISSION_REQUIRED', 'PENDING_REVIEW') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid verification status.');
  END IF;

  -- 5. Mandatory rejection reason check
  IF p_status = 'REJECTED' AND (p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) = 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rejection reason is required when rejecting a document.');
  END IF;

  -- 6. Perform review update using authenticated auth.uid()
  UPDATE public.storage_documents
  SET
    verification_status = p_status,
    review_status = p_status,
    verified_by = auth.uid()::text,
    verified_at = NOW(),
    rejection_reason = p_rejection_reason,
    resubmission_note = p_resubmission_note,
    updated_at = NOW()
  WHERE id = p_document_id;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', p_document_id,
    'status', p_status,
    'verified_by', auth.uid()::text,
    'verified_at', NOW()
  );
END;
$$;

-- Grant execute to authenticated users and service_role
REVOKE EXECUTE ON FUNCTION public.fn_review_vendor_document FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_review_vendor_document(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
