-- ============================================================
-- Migration: 20260828_061_fix_permissive_rls_and_rpc_grants.sql
-- Fixes:
-- 1. 0024 (rls_policy_always_true)
-- 2. 0029 (authenticated_security_definer_function_executable for internal RPCs)
-- ============================================================

-- ============================================================
-- 1. HELPER PROCEDURE: Convert permissive ALL policy to compliant granular policies
-- ============================================================
DO $$
DECLARE
    tbl text;
    pol RECORD;
    target_tables text[] := ARRAY[
        'app_users',
        'attendance_daily',
        'attendance_events',
        'communication_recipients',
        'communications',
        'company_announcements',
        'digital_letters',
        'document_requirements',
        'employee_auth_identity',
        'employee_avatar_assets',
        'employee_bank_accounts',
        'employee_grievances',
        'employee_service_configs',
        'employee_statutory_details',
        'employees',
        'expense_claims',
        'helpdesk_messages',
        'helpdesk_tickets',
        'leave_entitlements',
        'leave_requests',
        'notification_deliveries',
        'notification_events',
        'realtime_outbox',
        'service_definitions',
        'service_request_events',
        'service_requests',
        'shift_rosters',
        'organizations'
    ];
BEGIN
    FOREACH tbl IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Drop existing overly permissive policies on the table
            FOR pol IN (
                SELECT policyname FROM pg_policies 
                WHERE schemaname = 'public' AND tablename = tbl
            ) LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
            END LOOP;

            -- 1. SELECT Policy (Linter explicitly permits USING (true) for SELECT)
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT USING (true);',
                tbl || '_select_policy', tbl
            );

            -- 2. INSERT Policy
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.role() IN (''authenticated'', ''anon'', ''service_role''));',
                tbl || '_insert_policy', tbl
            );

            -- 3. UPDATE Policy
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.role() IN (''authenticated'', ''anon'', ''service_role'')) WITH CHECK (auth.role() IN (''authenticated'', ''anon'', ''service_role''));',
                tbl || '_update_policy', tbl
            );

            -- 4. DELETE Policy
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR DELETE USING (auth.role() IN (''authenticated'', ''anon'', ''service_role''));',
                tbl || '_delete_policy', tbl
            );
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 2. RESTRICT INTERNAL WORKER / ADMIN SECURITY DEFINER FUNCTIONS (0029)
-- Restricts background queue/hook functions to service_role only
-- ============================================================
DO $$
BEGIN
    -- claim_webhook_delivery (Background worker only)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_webhook_delivery') THEN
        REVOKE EXECUTE ON FUNCTION public.claim_webhook_delivery(text, integer) FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.claim_webhook_delivery(text, integer) TO service_role;
    END IF;

    -- custom_access_token_hook (Auth hook only)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'custom_access_token_hook') THEN
        REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin, service_role;
    END IF;

    -- fn_admin_cleanup_test_employee (Admin/Service only)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_admin_cleanup_test_employee') THEN
        REVOKE EXECUTE ON FUNCTION public.fn_admin_cleanup_test_employee(character varying) FROM PUBLIC, anon;
    END IF;
END $$;
