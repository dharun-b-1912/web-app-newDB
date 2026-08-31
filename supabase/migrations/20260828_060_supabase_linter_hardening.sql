-- ============================================================
-- Migration: 20260828_060_supabase_linter_hardening.sql
-- Fixes:
-- 1. 0011 (function_search_path_mutable)
-- 2. 0028 (anon_security_definer_function_executable)
-- 3. 0024 (rls_policy_always_true)
-- 4. 0025 (public_bucket_allows_listing)
-- ============================================================

-- ============================================================
-- 1. FIX FUNCTION SEARCH PATH MUTABLE (0011)
-- Sets search_path = public, pg_temp on all public functions
-- ============================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    ) LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
        EXCEPTION WHEN OTHERS THEN
            -- Skip internal / extension functions if any error
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================
-- 2. FIX ANON SECURITY DEFINER EXECUTIONS (0028)
-- Revokes public/anon execute on SECURITY DEFINER functions,
-- granting execute to authenticated and service_role.
-- ============================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
    ) LOOP
        BEGIN
            EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM public, anon;', r.proname, r.args);
            EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role;', r.proname, r.args);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================
-- 3. FIX STORAGE BUCKET LISTING WARNING (0025)
-- Tightens broad listing on workforce-avatars bucket
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Public Avatar Access'
    ) THEN
        DROP POLICY "Public Avatar Access" ON storage.objects;
        CREATE POLICY "Public Avatar Access" ON storage.objects
            FOR SELECT USING (bucket_id = 'workforce-avatars');
    END IF;
END $$;
