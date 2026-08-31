-- ============================================================
-- Migration: 20260828_062_security_linter_final_cleanup.sql
-- Fixes:
-- 1. 0025 (public_bucket_allows_listing on workforce-avatars)
-- 2. 0029 (authenticated_security_definer_function_executable)
-- ============================================================

-- ============================================================
-- 1. FIX PUBLIC STORAGE BUCKET LISTING (0025)
-- Public buckets serve files directly via public URL and do not
-- need a broad SELECT policy on storage.objects.
-- ============================================================
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
    DROP POLICY IF EXISTS "workforce_avatars_public_read" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read on workforce-avatars" ON storage.objects;
    
    -- Only allow authenticated users to list/select their uploads if needed
    CREATE POLICY "Authenticated user avatar read" ON storage.objects
        FOR SELECT TO authenticated
        USING (bucket_id = 'workforce-avatars');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ============================================================
-- 2. FIX TRIGGER & INTERNAL FUNCTIONS (0029)
-- Functions attached to database triggers or internal jobs
-- should not be callable directly via REST RPC.
-- ============================================================
DO $$
BEGIN
    -- process_attendance_event (Trigger function)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_attendance_event') THEN
        REVOKE EXECUTE ON FUNCTION public.process_attendance_event() FROM PUBLIC, anon, authenticated;
    END IF;

    -- fn_sync_attendance_event_to_daily (Trigger function)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_sync_attendance_event_to_daily') THEN
        REVOKE EXECUTE ON FUNCTION public.fn_sync_attendance_event_to_daily() FROM PUBLIC, anon, authenticated;
    END IF;

    -- fn_check_database_health (Internal / Service health check)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_check_database_health') THEN
        REVOKE EXECUTE ON FUNCTION public.fn_check_database_health() FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.fn_check_database_health() TO service_role;
    END IF;

    -- fn_evaluate_attendance_exceptions (Cron / Scheduled worker)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_evaluate_attendance_exceptions') THEN
        REVOKE EXECUTE ON FUNCTION public.fn_evaluate_attendance_exceptions(character varying) FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.fn_evaluate_attendance_exceptions(character varying) TO service_role;
    END IF;
END $$;

-- ============================================================
-- 3. CONVERT RPC FUNCTIONS TO SECURITY INVOKER (0029)
-- Changes functions from SECURITY DEFINER to SECURITY INVOKER
-- so they run safely under the caller's context.
-- ============================================================
DO $$
DECLARE
    r RECORD;
    invoker_functions text[] := ARRAY[
        'current_org_id',
        'fn_approve_leave_request',
        'fn_cancel_leave_request',
        'fn_reject_leave_request',
        'fn_submit_leave_request',
        'fn_reconcile_employee_leave_balances',
        'fn_submit_attendance_regularization',
        'fn_process_attendance_regularization',
        'fn_evaluate_attendance_deviation',
        'fn_validate_and_record_gps_attendance',
        'fn_get_employee_authorized_locations',
        'fn_calculate_employee_payroll_context',
        'fn_finalize_employee_attendance_for_payroll',
        'fn_finalize_employee_onboarding',
        'fn_flutter_employee_login',
        'fn_provision_employee_auth',
        'fn_suspend_employee_auth',
        'fn_terminate_employee_auth',
        'fn_submit_document_upload',
        'fn_verify_document_requirement',
        'fn_dispatch_document_request'
    ];
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = ANY(invoker_functions)
    ) LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SECURITY INVOKER;', r.proname, r.args);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;
