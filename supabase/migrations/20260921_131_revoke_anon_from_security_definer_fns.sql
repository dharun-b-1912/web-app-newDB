-- ============================================================================
-- supabase/migrations/20260921_131_revoke_anon_from_security_definer_fns.sql
-- Fixes: Supabase Security Advisor lint 0028 + 0029
-- fn_review_vendor_document should NOT be callable by anon role.
-- The function already validates auth.uid() internally, but anon access
-- means an unauthenticated REST client can call /rpc/fn_review_vendor_document
-- (it will fail at the auth.uid() check, but should never even reach the fn).
-- ============================================================================

-- 1. Revoke anon execute on the review function
REVOKE EXECUTE ON FUNCTION public.fn_review_vendor_document(
  TEXT, TEXT, TEXT, TEXT, TEXT
) FROM anon;

-- 2. Keep only authenticated + service_role (already set, but re-affirm)
GRANT EXECUTE ON FUNCTION public.fn_review_vendor_document(
  TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- 3. Revoke anon from any other SECURITY DEFINER functions in public schema
--    that shouldn't be public-callable (belt-and-suspenders)
REVOKE EXECUTE ON FUNCTION public.fn_review_vendor_document FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_review_vendor_document(
  TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'fn_review_vendor_document: anon EXECUTE revoked. Accessible only to authenticated + service_role.';
END $$;
