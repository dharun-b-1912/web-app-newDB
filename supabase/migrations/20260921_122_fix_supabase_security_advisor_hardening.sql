-- ============================================================================
-- Joy People HR — Supabase Security Advisor & Database Linter Remediation
-- Fixes:
-- 1. extension_in_public: Moves pg_trgm and citext to extensions schema
-- 2. function_search_path_mutable: Sets immutable search_path on all functions
-- 3. rls_policy_always_true: Replaces wildcard true policies with scoped rules
-- 4. anon/authenticated_security_definer_executable: Revokes anon/public execute
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: EXTENSIONS SECURITY (Move from public to extensions schema)
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'citext' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION citext SET SCHEMA extensions;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- SECTION 2: FUNCTION SEARCH PATH MUTABILITY (Prevent search_path hijacking)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    -- 1. Generic Trigger and Helper Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
        ALTER FUNCTION public.set_updated_at_timestamp() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_vendor_timestamp') THEN
        ALTER FUNCTION public.update_vendor_timestamp() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_biometric_tenant_identifiers') THEN
        ALTER FUNCTION public.sync_biometric_tenant_identifiers() SET search_path = public, pg_temp;
    END IF;

    -- 2. Haversine Calculation
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_calculate_haversine_distance') THEN
        ALTER FUNCTION public.fn_calculate_haversine_distance(numeric, numeric, numeric, numeric) SET search_path = public, pg_temp;
    END IF;

    -- 3. Payroll Immutability Guard Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_prevent_locked_payroll_mutation') THEN
        ALTER FUNCTION public.fn_prevent_locked_payroll_mutation() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_prevent_locked_line_item_mutation') THEN
        ALTER FUNCTION public.fn_prevent_locked_line_item_mutation() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_prevent_locked_snapshot_mutation') THEN
        ALTER FUNCTION public.fn_prevent_locked_snapshot_mutation() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_prevent_locked_payslip_mutation') THEN
        ALTER FUNCTION public.fn_prevent_locked_payslip_mutation() SET search_path = public, pg_temp;
    END IF;

    -- 4. Identity & Tenant Helpers
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_authenticated_org_id') THEN
        ALTER FUNCTION public.current_authenticated_org_id() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_org_id') THEN
        ALTER FUNCTION public.current_org_id() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_tenant_id') THEN
        ALTER FUNCTION public.current_tenant_id() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_org_id') THEN
        ALTER FUNCTION public.get_current_user_org_id() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_profile_id') THEN
        ALTER FUNCTION public.get_current_user_profile_id() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_auth_user_org_ids') THEN
        ALTER FUNCTION public.get_auth_user_org_ids() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_auth_user_vendor_ids') THEN
        ALTER FUNCTION public.get_auth_user_vendor_ids() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_user_employee_id') THEN
        ALTER FUNCTION public.get_active_user_employee_id() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_user_org_id') THEN
        ALTER FUNCTION public.get_active_user_org_id() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_org_admin') THEN
        ALTER FUNCTION public.is_org_admin(uuid) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_platform_admin') THEN
        ALTER FUNCTION public.is_platform_admin() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_user_organization_access') THEN
        ALTER FUNCTION public.check_user_organization_access(text) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_organization_system_roles') THEN
        ALTER FUNCTION public.seed_organization_system_roles(uuid) SET search_path = public, pg_temp;
    END IF;

    -- 5. Business Operations Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_auto_dispatch_separation_fnf') THEN
        ALTER FUNCTION public.fn_auto_dispatch_separation_fnf(uuid, uuid) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_batch_settle_daily_attendance') THEN
        ALTER FUNCTION public.fn_batch_settle_daily_attendance(date) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_calculate_payroll_run') THEN
        ALTER FUNCTION public.fn_calculate_payroll_run(uuid, uuid, varchar) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_check_biometric_device_heartbeats') THEN
        ALTER FUNCTION public.fn_check_biometric_device_heartbeats() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_claim_domain_events') THEN
        ALTER FUNCTION public.fn_claim_domain_events(text, integer) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_cleanup_expired_sessions') THEN
        ALTER FUNCTION public.fn_cleanup_expired_sessions() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_complete_domain_event') THEN
        ALTER FUNCTION public.fn_complete_domain_event(uuid) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_fail_domain_event') THEN
        ALTER FUNCTION public.fn_fail_domain_event(uuid, text) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_get_my_assigned_work_locations') THEN
        ALTER FUNCTION public.fn_get_my_assigned_work_locations() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_process_monthly_leave_accruals') THEN
        ALTER FUNCTION public.fn_process_monthly_leave_accruals() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_recalculate_daily_attendance') THEN
        ALTER FUNCTION public.fn_recalculate_daily_attendance(uuid, date) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_record_attendance_punch') THEN
        ALTER FUNCTION public.fn_record_attendance_punch(numeric, numeric, numeric, text, text, jsonb) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_transition_payroll_status') THEN
        ALTER FUNCTION public.fn_transition_payroll_status(uuid, varchar, uuid, jsonb) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_storage_object') THEN
        ALTER FUNCTION public.can_access_storage_object(text, text) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_prevent_employee_field_tampering') THEN
        ALTER FUNCTION public.fn_prevent_employee_field_tampering() SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_fn_on_punch_recorded') THEN
        ALTER FUNCTION public.trg_fn_on_punch_recorded() SET search_path = public, pg_temp;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- SECTION 3: PERMISSIVE RLS POLICY HARDENING (Eliminate USING true / WITH CHECK true)
-- ----------------------------------------------------------------------------

-- 1. public.employee_addresses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_addresses') THEN
        DROP POLICY IF EXISTS "employee_addresses_all_policy" ON public.employee_addresses;
        DROP POLICY IF EXISTS "employee_addresses_scoped_policy" ON public.employee_addresses;
        CREATE POLICY "employee_addresses_scoped_policy" ON public.employee_addresses
            FOR ALL
            TO authenticated
            USING (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                       OR user_id = auth.uid()
                )
            )
            WITH CHECK (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                       OR user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 2. public.employee_bank_details
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_bank_details') THEN
        DROP POLICY IF EXISTS "employee_bank_details_all_policy" ON public.employee_bank_details;
        DROP POLICY IF EXISTS "employee_bank_details_scoped_policy" ON public.employee_bank_details;
        CREATE POLICY "employee_bank_details_scoped_policy" ON public.employee_bank_details
            FOR ALL
            TO authenticated
            USING (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                       OR user_id = auth.uid()
                )
            )
            WITH CHECK (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                )
            );
    END IF;
END $$;

-- 3. public.employee_documents
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_documents') THEN
        DROP POLICY IF EXISTS "employee_documents_all_policy" ON public.employee_documents;
        DROP POLICY IF EXISTS "employee_documents_scoped_policy" ON public.employee_documents;
        CREATE POLICY "employee_documents_scoped_policy" ON public.employee_documents
            FOR ALL
            TO authenticated
            USING (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                       OR user_id = auth.uid()
                )
            )
            WITH CHECK (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                       OR user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 4. public.employee_emergency_contacts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_emergency_contacts') THEN
        DROP POLICY IF EXISTS "employee_emergency_contacts_all_policy" ON public.employee_emergency_contacts;
        DROP POLICY IF EXISTS "employee_emergency_contacts_scoped_policy" ON public.employee_emergency_contacts;
        CREATE POLICY "employee_emergency_contacts_scoped_policy" ON public.employee_emergency_contacts
            FOR ALL
            TO authenticated
            USING (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                       OR user_id = auth.uid()
                )
            )
            WITH CHECK (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                       OR user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 5. public.employee_profiles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_profiles') THEN
        DROP POLICY IF EXISTS "employee_profiles_all_policy" ON public.employee_profiles;
        DROP POLICY IF EXISTS "employee_profiles_scoped_policy" ON public.employee_profiles;
        CREATE POLICY "employee_profiles_scoped_policy" ON public.employee_profiles
            FOR ALL
            TO authenticated
            USING (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                       OR user_id = auth.uid()
                )
            )
            WITH CHECK (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                )
            );
    END IF;
END $$;

-- 6. public.employee_salary_assignments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_salary_assignments') THEN
        DROP POLICY IF EXISTS "employee_salary_assignments_modify_policy" ON public.employee_salary_assignments;
        DROP POLICY IF EXISTS "employee_salary_assignments_scoped_policy" ON public.employee_salary_assignments;
        CREATE POLICY "employee_salary_assignments_scoped_policy" ON public.employee_salary_assignments
            FOR ALL
            TO authenticated
            USING (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                )
            )
            WITH CHECK (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                )
            );
    END IF;
END $$;

-- 7. public.employee_statutory_details
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_statutory_details') THEN
        DROP POLICY IF EXISTS "employee_statutory_details_all_policy" ON public.employee_statutory_details;
        DROP POLICY IF EXISTS "employee_statutory_details_scoped_policy" ON public.employee_statutory_details;
        CREATE POLICY "employee_statutory_details_scoped_policy" ON public.employee_statutory_details
            FOR ALL
            TO authenticated
            USING (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                       OR user_id = auth.uid()
                )
            )
            WITH CHECK (
                employee_id::text IN (
                    SELECT id::text FROM public.employees 
                    WHERE organization_id::text = current_setting('app.current_organization_id', true)
                )
            );
    END IF;
END $$;

-- 8. public.employees write policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees') THEN
        DROP POLICY IF EXISTS "employees_write_policy" ON public.employees;
        DROP POLICY IF EXISTS "employees_scoped_write_policy" ON public.employees;
        CREATE POLICY "employees_scoped_write_policy" ON public.employees
            FOR ALL
            TO authenticated
            USING (
                organization_id::text = current_setting('app.current_organization_id', true)
                OR user_id = auth.uid()
            )
            WITH CHECK (
                organization_id::text = current_setting('app.current_organization_id', true)
            );
    END IF;
END $$;

-- 9. public.expense_claims
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_claims') THEN
        DROP POLICY IF EXISTS "Authenticated users can access expense_claims" ON public.expense_claims;
        DROP POLICY IF EXISTS "expense_claims_scoped_policy" ON public.expense_claims;
        CREATE POLICY "expense_claims_scoped_policy" ON public.expense_claims
            FOR ALL
            TO authenticated
            USING (
                organization_id::text = current_setting('app.current_organization_id', true)
                OR employee_id::text IN (
                    SELECT id::text FROM public.employees WHERE user_id = auth.uid()
                )
            )
            WITH CHECK (
                organization_id::text = current_setting('app.current_organization_id', true)
            );
    END IF;
END $$;

-- 10. public.vendor_audit_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vendor_audit_logs') THEN
        DROP POLICY IF EXISTS "Authorized users can insert audit logs" ON public.vendor_audit_logs;
        DROP POLICY IF EXISTS "vendor_audit_logs_scoped_insert_policy" ON public.vendor_audit_logs;
        CREATE POLICY "vendor_audit_logs_scoped_insert_policy" ON public.vendor_audit_logs
            FOR INSERT
            TO authenticated
            WITH CHECK (
                organization_id::text = current_setting('app.current_organization_id', true)
            );
    END IF;
END $$;

-- 11. public.vendors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vendors') THEN
        DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON public.vendors;
        DROP POLICY IF EXISTS "vendors_scoped_insert_policy" ON public.vendors;
        CREATE POLICY "vendors_scoped_insert_policy" ON public.vendors
            FOR INSERT
            TO authenticated
            WITH CHECK (
                organization_id::text = current_setting('app.current_organization_id', true)
            );
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- SECTION 4: REMEDIATE SECURITY DEFINER FUNCTIONS (Switch to SECURITY INVOKER & Restrict Execution)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    -- 1. Switch User-Facing RPCs and Helpers to SECURITY INVOKER
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_storage_object') THEN
        ALTER FUNCTION public.can_access_storage_object(text, text) SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_user_organization_access') THEN
        ALTER FUNCTION public.check_user_organization_access(text) SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_authenticated_org_id') THEN
        ALTER FUNCTION public.current_authenticated_org_id() SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_org_id') THEN
        ALTER FUNCTION public.current_org_id() SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_tenant_id') THEN
        ALTER FUNCTION public.current_tenant_id() SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_get_my_assigned_work_locations') THEN
        ALTER FUNCTION public.fn_get_my_assigned_work_locations() SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_record_attendance_punch') THEN
        ALTER FUNCTION public.fn_record_attendance_punch(numeric, numeric, numeric, text, text, jsonb) SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_user_employee_id') THEN
        ALTER FUNCTION public.get_active_user_employee_id() SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_user_org_id') THEN
        ALTER FUNCTION public.get_active_user_org_id() SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_auth_user_org_ids') THEN
        ALTER FUNCTION public.get_auth_user_org_ids() SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_auth_user_vendor_ids') THEN
        ALTER FUNCTION public.get_auth_user_vendor_ids() SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_org_id') THEN
        ALTER FUNCTION public.get_current_user_org_id() SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_profile_id') THEN
        ALTER FUNCTION public.get_current_user_profile_id() SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_org_admin') THEN
        ALTER FUNCTION public.is_org_admin(uuid) SECURITY INVOKER;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_platform_admin') THEN
        ALTER FUNCTION public.is_platform_admin() SECURITY INVOKER;
    END IF;

    -- 2. Trigger Functions: Switch to SECURITY INVOKER & Revoke from authenticated/anon/public
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_fn_on_punch_recorded') THEN
        ALTER FUNCTION public.trg_fn_on_punch_recorded() SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.trg_fn_on_punch_recorded() FROM authenticated, anon, PUBLIC;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_prevent_employee_field_tampering') THEN
        ALTER FUNCTION public.fn_prevent_employee_field_tampering() SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_prevent_employee_field_tampering() FROM authenticated, anon, PUBLIC;
    END IF;

    -- 3. Internal Admin & Batch Processing Functions: Switch to SECURITY INVOKER & Restrict strictly to service_role
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_organization_system_roles') THEN
        ALTER FUNCTION public.seed_organization_system_roles(uuid) SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.seed_organization_system_roles(uuid) FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.seed_organization_system_roles(uuid) TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_auto_dispatch_separation_fnf') THEN
        ALTER FUNCTION public.fn_auto_dispatch_separation_fnf(uuid, uuid) SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_auto_dispatch_separation_fnf(uuid, uuid) FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_auto_dispatch_separation_fnf(uuid, uuid) TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_calculate_payroll_run') THEN
        ALTER FUNCTION public.fn_calculate_payroll_run(uuid, uuid, varchar) SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_calculate_payroll_run(uuid, uuid, varchar) FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_calculate_payroll_run(uuid, uuid, varchar) TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_recalculate_daily_attendance') THEN
        ALTER FUNCTION public.fn_recalculate_daily_attendance(uuid, date) SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_recalculate_daily_attendance(uuid, date) FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_recalculate_daily_attendance(uuid, date) TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_transition_payroll_status') THEN
        ALTER FUNCTION public.fn_transition_payroll_status(uuid, varchar, uuid, jsonb) SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_transition_payroll_status(uuid, varchar, uuid, jsonb) FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_transition_payroll_status(uuid, varchar, uuid, jsonb) TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_cleanup_expired_sessions') THEN
        ALTER FUNCTION public.fn_cleanup_expired_sessions() SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_cleanup_expired_sessions() FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_cleanup_expired_sessions() TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_check_biometric_device_heartbeats') THEN
        ALTER FUNCTION public.fn_check_biometric_device_heartbeats() SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_check_biometric_device_heartbeats() FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_check_biometric_device_heartbeats() TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_claim_domain_events') THEN
        ALTER FUNCTION public.fn_claim_domain_events(text, integer) SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_claim_domain_events(text, integer) FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_claim_domain_events(text, integer) TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_complete_domain_event') THEN
        ALTER FUNCTION public.fn_complete_domain_event(uuid) SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_complete_domain_event(uuid) FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_complete_domain_event(uuid) TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_fail_domain_event') THEN
        ALTER FUNCTION public.fn_fail_domain_event(uuid, text) SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_fail_domain_event(uuid, text) FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_fail_domain_event(uuid, text) TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_batch_settle_daily_attendance') THEN
        ALTER FUNCTION public.fn_batch_settle_daily_attendance(date) SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_batch_settle_daily_attendance(date) FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_batch_settle_daily_attendance(date) TO service_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_process_monthly_leave_accruals') THEN
        ALTER FUNCTION public.fn_process_monthly_leave_accruals() SECURITY INVOKER;
        REVOKE EXECUTE ON FUNCTION public.fn_process_monthly_leave_accruals() FROM authenticated, anon, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.fn_process_monthly_leave_accruals() TO service_role;
    END IF;
END $$;

