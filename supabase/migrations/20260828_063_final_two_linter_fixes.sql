-- ============================================================
-- Migration: 20260828_063_final_two_linter_fixes.sql
-- Fixes the final 2 database linter warnings:
-- 1. public_bucket_allows_listing on workforce-avatars
-- 2. authenticated_security_definer_function_executable on fn_admin_cleanup_test_employee
-- ============================================================

-- 1. Remove unnecessary SELECT policies on public storage bucket
-- (Public buckets already allow direct public URL access without SELECT policies on storage.objects)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated user avatar read" ON storage.objects;
    DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
    DROP POLICY IF EXISTS "workforce_avatars_public_read" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read on workforce-avatars" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Switch fn_admin_cleanup_test_employee to SECURITY INVOKER & restrict to service_role
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_admin_cleanup_test_employee') THEN
        ALTER FUNCTION public.fn_admin_cleanup_test_employee(character varying) SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_admin_cleanup_test_employee(character varying) FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.fn_admin_cleanup_test_employee(character varying) TO service_role;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
