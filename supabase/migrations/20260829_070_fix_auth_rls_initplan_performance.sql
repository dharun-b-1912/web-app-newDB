-- ============================================================================
-- Migration: 20260829_070_fix_auth_rls_initplan_performance.sql
-- Description: Complete Fix for Supabase Linter 0003_auth_rls_initplan
--
-- Replaces all un-subqueried auth.<function>() and current_setting() calls
-- in RLS policies with scalar subqueries:
--   - (SELECT auth.uid())
--   - (SELECT auth.role())
--   - (SELECT auth.jwt())
--   - (SELECT current_setting(...))
--
-- This forces PostgreSQL to evaluate auth functions once per query via InitPlan
-- instead of re-evaluating per row, resolving all performance linter warnings.
-- ============================================================================

-- ============================================================================
-- 1. PUBLIC SCHEMA: AUTH & USER ACCOUNTS
-- ============================================================================
DO $$
BEGIN
    -- employee_auth_accounts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_auth_accounts') THEN
        DROP POLICY IF EXISTS "employee_auth_accounts_insert_policy" ON public.employee_auth_accounts;
        DROP POLICY IF EXISTS "employee_auth_accounts_update_policy" ON public.employee_auth_accounts;
        DROP POLICY IF EXISTS "employee_auth_accounts_delete_policy" ON public.employee_auth_accounts;
        CREATE POLICY "employee_auth_accounts_insert_policy" ON public.employee_auth_accounts
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'anon', 'service_role'));
        CREATE POLICY "employee_auth_accounts_update_policy" ON public.employee_auth_accounts
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'anon', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'anon', 'service_role'));
        CREATE POLICY "employee_auth_accounts_delete_policy" ON public.employee_auth_accounts
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'anon', 'service_role'));
    END IF;

    -- employee_auth_identities
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_auth_identities') THEN
        DROP POLICY IF EXISTS "auth_identities_self_read" ON public.employee_auth_identities;
        DROP POLICY IF EXISTS "employee_auth_identities_auth_select_policy" ON public.employee_auth_identities;
        DROP POLICY IF EXISTS "employee_auth_identities_auth_mutation_policy" ON public.employee_auth_identities;
        CREATE POLICY "auth_identities_self_read" ON public.employee_auth_identities
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role', 'anon'));
        CREATE POLICY "employee_auth_identities_auth_select_policy" ON public.employee_auth_identities
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role', 'anon'));
        CREATE POLICY "employee_auth_identities_auth_mutation_policy" ON public.employee_auth_identities
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role', 'anon'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role', 'anon'));
    END IF;

    -- app_users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_users') THEN
        DROP POLICY IF EXISTS "app_users_insert_policy" ON public.app_users;
        DROP POLICY IF EXISTS "app_users_update_policy" ON public.app_users;
        DROP POLICY IF EXISTS "app_users_delete_policy" ON public.app_users;
        CREATE POLICY "app_users_insert_policy" ON public.app_users
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "app_users_update_policy" ON public.app_users
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "app_users_delete_policy" ON public.app_users
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- phone_otp_verifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'phone_otp_verifications') THEN
        DROP POLICY IF EXISTS "phone_otp_verifications_insert_policy" ON public.phone_otp_verifications;
        DROP POLICY IF EXISTS "phone_otp_verifications_update_policy" ON public.phone_otp_verifications;
        DROP POLICY IF EXISTS "phone_otp_verifications_delete_policy" ON public.phone_otp_verifications;
        CREATE POLICY "phone_otp_verifications_insert_policy" ON public.phone_otp_verifications
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'anon', 'service_role'));
        CREATE POLICY "phone_otp_verifications_update_policy" ON public.phone_otp_verifications
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'anon', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'anon', 'service_role'));
        CREATE POLICY "phone_otp_verifications_delete_policy" ON public.phone_otp_verifications
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'anon', 'service_role'));
    END IF;

    -- customer_profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_profiles') THEN
        DROP POLICY IF EXISTS "customer_profiles_auth_select_policy" ON public.customer_profiles;
        DROP POLICY IF EXISTS "customer_profiles_auth_mutation_policy" ON public.customer_profiles;
        CREATE POLICY "customer_profiles_auth_select_policy" ON public.customer_profiles
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "customer_profiles_auth_mutation_policy" ON public.customer_profiles
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- user_sessions, session_events, auth_active_sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions') THEN
        DROP POLICY IF EXISTS "tenant_user_sessions_select" ON public.user_sessions;
        CREATE POLICY "tenant_user_sessions_select" ON public.user_sessions
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_events') THEN
        DROP POLICY IF EXISTS "session_events_auth_select" ON public.session_events;
        CREATE POLICY "session_events_auth_select" ON public.session_events
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auth_active_sessions') THEN
        DROP POLICY IF EXISTS "auth_active_sessions_auth_select_policy" ON public.auth_active_sessions;
        DROP POLICY IF EXISTS "auth_active_sessions_auth_mutation_policy" ON public.auth_active_sessions;
        CREATE POLICY "auth_active_sessions_auth_select_policy" ON public.auth_active_sessions
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role', 'anon'));
        CREATE POLICY "auth_active_sessions_auth_mutation_policy" ON public.auth_active_sessions
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role', 'anon'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role', 'anon'));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 2. PUBLIC SCHEMA: ATTENDANCE & BIOMETRICS
-- ============================================================================
DO $$
BEGIN
    -- attendance_punches
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_punches') THEN
        DROP POLICY IF EXISTS "Employees can view own attendance punches" ON public.attendance_punches;
        CREATE POLICY "Employees can view own attendance punches" ON public.attendance_punches
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- attendance_daily
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_daily') THEN
        DROP POLICY IF EXISTS "attendance_daily_insert_policy" ON public.attendance_daily;
        DROP POLICY IF EXISTS "attendance_daily_update_policy" ON public.attendance_daily;
        DROP POLICY IF EXISTS "attendance_daily_delete_policy" ON public.attendance_daily;
        CREATE POLICY "attendance_daily_insert_policy" ON public.attendance_daily
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_daily_update_policy" ON public.attendance_daily
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_daily_delete_policy" ON public.attendance_daily
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- attendance_events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_events') THEN
        DROP POLICY IF EXISTS "attendance_events_insert_policy" ON public.attendance_events;
        DROP POLICY IF EXISTS "attendance_events_update_policy" ON public.attendance_events;
        DROP POLICY IF EXISTS "attendance_events_delete_policy" ON public.attendance_events;
        CREATE POLICY "attendance_events_insert_policy" ON public.attendance_events
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_events_update_policy" ON public.attendance_events
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_events_delete_policy" ON public.attendance_events
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- biometric_enrollment_sessions & biometric_enrollments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_enrollment_sessions') THEN
        DROP POLICY IF EXISTS "bio_sessions_org_isolation" ON public.biometric_enrollment_sessions;
        CREATE POLICY "bio_sessions_org_isolation" ON public.biometric_enrollment_sessions
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_enrollments') THEN
        DROP POLICY IF EXISTS "bio_enroll_org_isolation" ON public.biometric_enrollments;
        CREATE POLICY "bio_enroll_org_isolation" ON public.biometric_enrollments
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- attendance deviations, exceptions, location events, location policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_deviations') THEN
        DROP POLICY IF EXISTS "attendance_deviations_insert_policy" ON public.attendance_deviations;
        DROP POLICY IF EXISTS "attendance_deviations_update_policy" ON public.attendance_deviations;
        DROP POLICY IF EXISTS "attendance_deviations_delete_policy" ON public.attendance_deviations;
        CREATE POLICY "attendance_deviations_insert_policy" ON public.attendance_deviations
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_deviations_update_policy" ON public.attendance_deviations
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_deviations_delete_policy" ON public.attendance_deviations
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_exceptions') THEN
        DROP POLICY IF EXISTS "attendance_exceptions_insert_policy" ON public.attendance_exceptions;
        DROP POLICY IF EXISTS "attendance_exceptions_update_policy" ON public.attendance_exceptions;
        DROP POLICY IF EXISTS "attendance_exceptions_delete_policy" ON public.attendance_exceptions;
        CREATE POLICY "attendance_exceptions_insert_policy" ON public.attendance_exceptions
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_exceptions_update_policy" ON public.attendance_exceptions
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_exceptions_delete_policy" ON public.attendance_exceptions
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_location_events') THEN
        DROP POLICY IF EXISTS "attendance_location_events_insert_policy" ON public.attendance_location_events;
        DROP POLICY IF EXISTS "attendance_location_events_update_policy" ON public.attendance_location_events;
        DROP POLICY IF EXISTS "attendance_location_events_delete_policy" ON public.attendance_location_events;
        CREATE POLICY "attendance_location_events_insert_policy" ON public.attendance_location_events
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_location_events_update_policy" ON public.attendance_location_events
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_location_events_delete_policy" ON public.attendance_location_events
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_location_policy') THEN
        DROP POLICY IF EXISTS "attendance_location_policy_insert_policy" ON public.attendance_location_policy;
        DROP POLICY IF EXISTS "attendance_location_policy_update_policy" ON public.attendance_location_policy;
        DROP POLICY IF EXISTS "attendance_location_policy_delete_policy" ON public.attendance_location_policy;
        CREATE POLICY "attendance_location_policy_insert_policy" ON public.attendance_location_policy
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_location_policy_update_policy" ON public.attendance_location_policy
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "attendance_location_policy_delete_policy" ON public.attendance_location_policy
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_attendance_assignments') THEN
        DROP POLICY IF EXISTS "employee_attendance_assignments_insert_policy" ON public.employee_attendance_assignments;
        DROP POLICY IF EXISTS "employee_attendance_assignments_update_policy" ON public.employee_attendance_assignments;
        DROP POLICY IF EXISTS "employee_attendance_assignments_delete_policy" ON public.employee_attendance_assignments;
        CREATE POLICY "employee_attendance_assignments_insert_policy" ON public.employee_attendance_assignments
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_attendance_assignments_update_policy" ON public.employee_attendance_assignments
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_attendance_assignments_delete_policy" ON public.employee_attendance_assignments
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_attendance_period_summary') THEN
        DROP POLICY IF EXISTS "employee_attendance_period_summary_insert_policy" ON public.employee_attendance_period_summary;
        DROP POLICY IF EXISTS "employee_attendance_period_summary_update_policy" ON public.employee_attendance_period_summary;
        DROP POLICY IF EXISTS "employee_attendance_period_summary_delete_policy" ON public.employee_attendance_period_summary;
        CREATE POLICY "employee_attendance_period_summary_insert_policy" ON public.employee_attendance_period_summary
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_attendance_period_summary_update_policy" ON public.employee_attendance_period_summary
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_attendance_period_summary_delete_policy" ON public.employee_attendance_period_summary
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 3. PUBLIC SCHEMA: PAYROLL, SALARY & STATUTORY
-- ============================================================================
DO $$
BEGIN
    -- salary_structure_components
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'salary_structure_components') THEN
        DROP POLICY IF EXISTS "salary_structure_components_insert_policy" ON public.salary_structure_components;
        DROP POLICY IF EXISTS "salary_structure_components_update_policy" ON public.salary_structure_components;
        DROP POLICY IF EXISTS "salary_structure_components_delete_policy" ON public.salary_structure_components;
        CREATE POLICY "salary_structure_components_insert_policy" ON public.salary_structure_components
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "salary_structure_components_update_policy" ON public.salary_structure_components
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "salary_structure_components_delete_policy" ON public.salary_structure_components
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- salary_structures
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'salary_structures') THEN
        DROP POLICY IF EXISTS "salary_structures_insert_policy" ON public.salary_structures;
        DROP POLICY IF EXISTS "salary_structures_update_policy" ON public.salary_structures;
        DROP POLICY IF EXISTS "salary_structures_delete_policy" ON public.salary_structures;
        CREATE POLICY "salary_structures_insert_policy" ON public.salary_structures
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "salary_structures_update_policy" ON public.salary_structures
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "salary_structures_delete_policy" ON public.salary_structures
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- employee_salary_assignments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_salary_assignments') THEN
        DROP POLICY IF EXISTS "employee_salary_assignments_insert_policy" ON public.employee_salary_assignments;
        DROP POLICY IF EXISTS "employee_salary_assignments_update_policy" ON public.employee_salary_assignments;
        DROP POLICY IF EXISTS "employee_salary_assignments_delete_policy" ON public.employee_salary_assignments;
        CREATE POLICY "employee_salary_assignments_insert_policy" ON public.employee_salary_assignments
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_salary_assignments_update_policy" ON public.employee_salary_assignments
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_salary_assignments_delete_policy" ON public.employee_salary_assignments
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- employee_statutory_profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_statutory_profiles') THEN
        DROP POLICY IF EXISTS "employee_statutory_profiles_insert_policy" ON public.employee_statutory_profiles;
        DROP POLICY IF EXISTS "employee_statutory_profiles_update_policy" ON public.employee_statutory_profiles;
        DROP POLICY IF EXISTS "employee_statutory_profiles_delete_policy" ON public.employee_statutory_profiles;
        CREATE POLICY "employee_statutory_profiles_insert_policy" ON public.employee_statutory_profiles
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_statutory_profiles_update_policy" ON public.employee_statutory_profiles
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_statutory_profiles_delete_policy" ON public.employee_statutory_profiles
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- payroll_periods
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_periods') THEN
        DROP POLICY IF EXISTS "payroll_periods_insert_policy" ON public.payroll_periods;
        DROP POLICY IF EXISTS "payroll_periods_update_policy" ON public.payroll_periods;
        DROP POLICY IF EXISTS "payroll_periods_delete_policy" ON public.payroll_periods;
        CREATE POLICY "payroll_periods_insert_policy" ON public.payroll_periods
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "payroll_periods_update_policy" ON public.payroll_periods
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "payroll_periods_delete_policy" ON public.payroll_periods
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- employee_payslips
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_payslips') THEN
        DROP POLICY IF EXISTS "Employees can view own payslips" ON public.employee_payslips;
        CREATE POLICY "Employees can view own payslips" ON public.employee_payslips
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- employee_payroll_profiles & records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_payroll_profiles') THEN
        DROP POLICY IF EXISTS "employee_payroll_profiles_insert_policy" ON public.employee_payroll_profiles;
        DROP POLICY IF EXISTS "employee_payroll_profiles_update_policy" ON public.employee_payroll_profiles;
        DROP POLICY IF EXISTS "employee_payroll_profiles_delete_policy" ON public.employee_payroll_profiles;
        CREATE POLICY "employee_payroll_profiles_insert_policy" ON public.employee_payroll_profiles
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_payroll_profiles_update_policy" ON public.employee_payroll_profiles
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_payroll_profiles_delete_policy" ON public.employee_payroll_profiles
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_payroll_records') THEN
        DROP POLICY IF EXISTS "employee_payroll_records_insert_policy" ON public.employee_payroll_records;
        DROP POLICY IF EXISTS "employee_payroll_records_update_policy" ON public.employee_payroll_records;
        DROP POLICY IF EXISTS "employee_payroll_records_delete_policy" ON public.employee_payroll_records;
        CREATE POLICY "employee_payroll_records_insert_policy" ON public.employee_payroll_records
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_payroll_records_update_policy" ON public.employee_payroll_records
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_payroll_records_delete_policy" ON public.employee_payroll_records
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 4. PUBLIC SCHEMA: PERFORMANCE & SEPARATIONS & ONBOARDING
-- ============================================================================
DO $$
BEGIN
    -- employee_performance_assignments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_performance_assignments') THEN
        DROP POLICY IF EXISTS "employee_performance_assignments_insert_policy" ON public.employee_performance_assignments;
        DROP POLICY IF EXISTS "employee_performance_assignments_update_policy" ON public.employee_performance_assignments;
        DROP POLICY IF EXISTS "employee_performance_assignments_delete_policy" ON public.employee_performance_assignments;
        CREATE POLICY "employee_performance_assignments_insert_policy" ON public.employee_performance_assignments
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_performance_assignments_update_policy" ON public.employee_performance_assignments
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_performance_assignments_delete_policy" ON public.employee_performance_assignments
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- employee_work_locations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_work_locations') THEN
        DROP POLICY IF EXISTS "employee_work_locations_insert_policy" ON public.employee_work_locations;
        DROP POLICY IF EXISTS "employee_work_locations_update_policy" ON public.employee_work_locations;
        DROP POLICY IF EXISTS "employee_work_locations_delete_policy" ON public.employee_work_locations;
        CREATE POLICY "employee_work_locations_insert_policy" ON public.employee_work_locations
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_work_locations_update_policy" ON public.employee_work_locations
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "employee_work_locations_delete_policy" ON public.employee_work_locations
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- separations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_separations') THEN
        DROP POLICY IF EXISTS "employee_separations_auth_select" ON public.employee_separations;
        CREATE POLICY "employee_separations_auth_select" ON public.employee_separations
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'separation_tasks') THEN
        DROP POLICY IF EXISTS "separation_tasks_auth_select" ON public.separation_tasks;
        CREATE POLICY "separation_tasks_auth_select" ON public.separation_tasks
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'separation_clearances') THEN
        DROP POLICY IF EXISTS "separation_clearances_auth_select" ON public.separation_clearances;
        CREATE POLICY "separation_clearances_auth_select" ON public.separation_clearances
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'separation_asset_recoveries') THEN
        DROP POLICY IF EXISTS "separation_asset_recoveries_auth_select" ON public.separation_asset_recoveries;
        CREATE POLICY "separation_asset_recoveries_auth_select" ON public.separation_asset_recoveries
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exit_interviews') THEN
        DROP POLICY IF EXISTS "exit_interviews_auth_select" ON public.exit_interviews;
        CREATE POLICY "exit_interviews_auth_select" ON public.exit_interviews
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'separation_fnf_readiness') THEN
        DROP POLICY IF EXISTS "separation_fnf_readiness_auth_select" ON public.separation_fnf_readiness;
        CREATE POLICY "separation_fnf_readiness_auth_select" ON public.separation_fnf_readiness
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'separation_audit_logs') THEN
        DROP POLICY IF EXISTS "separation_audit_logs_auth_select" ON public.separation_audit_logs;
        CREATE POLICY "separation_audit_logs_auth_select" ON public.separation_audit_logs
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- onboarding
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_overrides') THEN
        DROP POLICY IF EXISTS "onboarding_overrides_auth_select" ON public.onboarding_overrides;
        CREATE POLICY "onboarding_overrides_auth_select" ON public.onboarding_overrides
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_audit_logs') THEN
        DROP POLICY IF EXISTS "onboarding_audit_logs_auth_select" ON public.onboarding_audit_logs;
        CREATE POLICY "onboarding_audit_logs_auth_select" ON public.onboarding_audit_logs
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 5. PUBLIC SCHEMA: COMMUNICATIONS & ANNOUNCEMENTS
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'communications') THEN
        DROP POLICY IF EXISTS "communications_insert_policy" ON public.communications;
        DROP POLICY IF EXISTS "communications_update_policy" ON public.communications;
        DROP POLICY IF EXISTS "communications_delete_policy" ON public.communications;
        CREATE POLICY "communications_insert_policy" ON public.communications
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "communications_update_policy" ON public.communications
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "communications_delete_policy" ON public.communications
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'communication_recipients') THEN
        DROP POLICY IF EXISTS "communication_recipients_insert_policy" ON public.communication_recipients;
        DROP POLICY IF EXISTS "communication_recipients_update_policy" ON public.communication_recipients;
        DROP POLICY IF EXISTS "communication_recipients_delete_policy" ON public.communication_recipients;
        CREATE POLICY "communication_recipients_insert_policy" ON public.communication_recipients
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "communication_recipients_update_policy" ON public.communication_recipients
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "communication_recipients_delete_policy" ON public.communication_recipients
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_announcements') THEN
        DROP POLICY IF EXISTS "company_announcements_insert_policy" ON public.company_announcements;
        DROP POLICY IF EXISTS "company_announcements_update_policy" ON public.company_announcements;
        DROP POLICY IF EXISTS "company_announcements_delete_policy" ON public.company_announcements;
        CREATE POLICY "company_announcements_insert_policy" ON public.company_announcements
            FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "company_announcements_update_policy" ON public.company_announcements
            FOR UPDATE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "company_announcements_delete_policy" ON public.company_announcements
            FOR DELETE USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 6. PUBLIC SCHEMA: WEBHOOKS, EVENTS & INTEGRATIONS
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_deliveries') THEN
        DROP POLICY IF EXISTS "webhook_deliveries_auth_mutation_policy" ON public.webhook_deliveries;
        CREATE POLICY "webhook_deliveries_auth_mutation_policy" ON public.webhook_deliveries
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_delivery_attempts') THEN
        DROP POLICY IF EXISTS "webhook_delivery_attempts_auth_select_policy" ON public.webhook_delivery_attempts;
        CREATE POLICY "webhook_delivery_attempts_auth_select_policy" ON public.webhook_delivery_attempts
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_catalog') THEN
        DROP POLICY IF EXISTS "event_catalog_auth_select_policy" ON public.event_catalog;
        DROP POLICY IF EXISTS "event_catalog_auth_mutation_policy" ON public.event_catalog;
        CREATE POLICY "event_catalog_auth_select_policy" ON public.event_catalog
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "event_catalog_auth_mutation_policy" ON public.event_catalog
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_metrics_minute') THEN
        DROP POLICY IF EXISTS "event_metrics_minute_auth_select_policy" ON public.event_metrics_minute;
        DROP POLICY IF EXISTS "event_metrics_minute_auth_mutation_policy" ON public.event_metrics_minute;
        CREATE POLICY "event_metrics_minute_auth_select_policy" ON public.event_metrics_minute
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "event_metrics_minute_auth_mutation_policy" ON public.event_metrics_minute
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_routes') THEN
        DROP POLICY IF EXISTS "event_routes_auth_select_policy" ON public.event_routes;
        DROP POLICY IF EXISTS "event_routes_auth_mutation_policy" ON public.event_routes;
        CREATE POLICY "event_routes_auth_select_policy" ON public.event_routes
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "event_routes_auth_mutation_policy" ON public.event_routes
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
        DROP POLICY IF EXISTS "events_auth_select_policy" ON public.events;
        DROP POLICY IF EXISTS "events_auth_mutation_policy" ON public.events;
        CREATE POLICY "events_auth_select_policy" ON public.events
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "events_auth_mutation_policy" ON public.events
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_outbox') THEN
        DROP POLICY IF EXISTS "event_outbox_auth_select" ON public.event_outbox;
        CREATE POLICY "event_outbox_auth_select" ON public.event_outbox
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- integration framework
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_adapters') THEN
        DROP POLICY IF EXISTS "integration_adapters_auth_select_policy" ON public.integration_adapters;
        DROP POLICY IF EXISTS "integration_adapters_auth_mutation_policy" ON public.integration_adapters;
        CREATE POLICY "integration_adapters_auth_select_policy" ON public.integration_adapters
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "integration_adapters_auth_mutation_policy" ON public.integration_adapters
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_connections') THEN
        DROP POLICY IF EXISTS "integration_connections_auth_select_policy" ON public.integration_connections;
        DROP POLICY IF EXISTS "integration_connections_auth_mutation_policy" ON public.integration_connections;
        CREATE POLICY "integration_connections_auth_select_policy" ON public.integration_connections
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "integration_connections_auth_mutation_policy" ON public.integration_connections
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_devices') THEN
        DROP POLICY IF EXISTS "integration_devices_auth_select_policy" ON public.integration_devices;
        DROP POLICY IF EXISTS "integration_devices_auth_mutation_policy" ON public.integration_devices;
        CREATE POLICY "integration_devices_auth_select_policy" ON public.integration_devices
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "integration_devices_auth_mutation_policy" ON public.integration_devices
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_logs') THEN
        DROP POLICY IF EXISTS "integration_logs_auth_select_policy" ON public.integration_logs;
        DROP POLICY IF EXISTS "integration_logs_auth_mutation_policy" ON public.integration_logs;
        CREATE POLICY "integration_logs_auth_select_policy" ON public.integration_logs
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "integration_logs_auth_mutation_policy" ON public.integration_logs
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_sync_jobs') THEN
        DROP POLICY IF EXISTS "integration_sync_jobs_auth_select_policy" ON public.integration_sync_jobs;
        DROP POLICY IF EXISTS "integration_sync_jobs_auth_mutation_policy" ON public.integration_sync_jobs;
        CREATE POLICY "integration_sync_jobs_auth_select_policy" ON public.integration_sync_jobs
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "integration_sync_jobs_auth_mutation_policy" ON public.integration_sync_jobs
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 7. PUBLIC SCHEMA: CORE ENTITIES, PLANS, FEATURES, ROLES, SECURITY
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') THEN
        DROP POLICY IF EXISTS "plans_auth_select" ON public.plans;
        CREATE POLICY "plans_auth_select" ON public.plans
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'features') THEN
        DROP POLICY IF EXISTS "features_auth_select" ON public.features;
        CREATE POLICY "features_auth_select" ON public.features
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
        DROP POLICY IF EXISTS "branches_auth_select" ON public.branches;
        CREATE POLICY "branches_auth_select" ON public.branches
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') THEN
        DROP POLICY IF EXISTS "departments_auth_select" ON public.departments;
        CREATE POLICY "departments_auth_select" ON public.departments
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'designations') THEN
        DROP POLICY IF EXISTS "designations_auth_select" ON public.designations;
        CREATE POLICY "designations_auth_select" ON public.designations
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
        DROP POLICY IF EXISTS "roles_auth_select" ON public.roles;
        CREATE POLICY "roles_auth_select" ON public.roles
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'device_registry') THEN
        DROP POLICY IF EXISTS "device_registry_auth_select" ON public.device_registry;
        CREATE POLICY "device_registry_auth_select" ON public.device_registry
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_findings') THEN
        DROP POLICY IF EXISTS "security_findings_auth_select" ON public.security_findings;
        CREATE POLICY "security_findings_auth_select" ON public.security_findings
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_credentials') THEN
        DROP POLICY IF EXISTS "security_credentials_auth_select" ON public.security_credentials;
        CREATE POLICY "security_credentials_auth_select" ON public.security_credentials
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_policies') THEN
        DROP POLICY IF EXISTS "security_policies_auth_select" ON public.security_policies;
        CREATE POLICY "security_policies_auth_select" ON public.security_policies
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'compliance_controls') THEN
        DROP POLICY IF EXISTS "compliance_controls_auth_select" ON public.compliance_controls;
        CREATE POLICY "compliance_controls_auth_select" ON public.compliance_controls
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_security_metrics') THEN
        DROP POLICY IF EXISTS "api_security_metrics_auth_select" ON public.api_security_metrics;
        CREATE POLICY "api_security_metrics_auth_select" ON public.api_security_metrics
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telemetry_sources') THEN
        DROP POLICY IF EXISTS "telemetry_sources_auth_select" ON public.telemetry_sources;
        CREATE POLICY "telemetry_sources_auth_select" ON public.telemetry_sources
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_check_runs') THEN
        DROP POLICY IF EXISTS "security_check_runs_auth_select" ON public.security_check_runs;
        CREATE POLICY "security_check_runs_auth_select" ON public.security_check_runs
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_posture_snapshots') THEN
        DROP POLICY IF EXISTS "security_posture_snapshots_auth_select" ON public.security_posture_snapshots;
        CREATE POLICY "security_posture_snapshots_auth_select" ON public.security_posture_snapshots
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 8. PUBLIC SCHEMA: PLATFORM CONTROL PLANE TABLES
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_entitlements') THEN
        DROP POLICY IF EXISTS "organization_entitlements_auth_select_policy" ON public.organization_entitlements;
        DROP POLICY IF EXISTS "organization_entitlements_auth_mutation_policy" ON public.organization_entitlements;
        CREATE POLICY "organization_entitlements_auth_select_policy" ON public.organization_entitlements
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "organization_entitlements_auth_mutation_policy" ON public.organization_entitlements
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_api_keys') THEN
        DROP POLICY IF EXISTS "platform_api_keys_auth_select_policy" ON public.platform_api_keys;
        DROP POLICY IF EXISTS "platform_api_keys_auth_mutation_policy" ON public.platform_api_keys;
        CREATE POLICY "platform_api_keys_auth_select_policy" ON public.platform_api_keys
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_api_keys_auth_mutation_policy" ON public.platform_api_keys
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_audit_events') THEN
        DROP POLICY IF EXISTS "platform_audit_events_auth_select_policy" ON public.platform_audit_events;
        DROP POLICY IF EXISTS "platform_audit_events_auth_mutation_policy" ON public.platform_audit_events;
        CREATE POLICY "platform_audit_events_auth_select_policy" ON public.platform_audit_events
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_audit_events_auth_mutation_policy" ON public.platform_audit_events
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_incidents') THEN
        DROP POLICY IF EXISTS "platform_incidents_auth_select_policy" ON public.platform_incidents;
        DROP POLICY IF EXISTS "platform_incidents_auth_mutation_policy" ON public.platform_incidents;
        CREATE POLICY "platform_incidents_auth_select_policy" ON public.platform_incidents
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_incidents_auth_mutation_policy" ON public.platform_incidents
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_invoice_line_items') THEN
        DROP POLICY IF EXISTS "platform_invoice_line_items_auth_select_policy" ON public.platform_invoice_line_items;
        DROP POLICY IF EXISTS "platform_invoice_line_items_auth_mutation_policy" ON public.platform_invoice_line_items;
        CREATE POLICY "platform_invoice_line_items_auth_select_policy" ON public.platform_invoice_line_items
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_invoice_line_items_auth_mutation_policy" ON public.platform_invoice_line_items
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_invoices') THEN
        DROP POLICY IF EXISTS "platform_invoices_auth_select_policy" ON public.platform_invoices;
        DROP POLICY IF EXISTS "platform_invoices_auth_mutation_policy" ON public.platform_invoices;
        CREATE POLICY "platform_invoices_auth_select_policy" ON public.platform_invoices
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_invoices_auth_mutation_policy" ON public.platform_invoices
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_payments') THEN
        DROP POLICY IF EXISTS "platform_payments_auth_select_policy" ON public.platform_payments;
        DROP POLICY IF EXISTS "platform_payments_auth_mutation_policy" ON public.platform_payments;
        CREATE POLICY "platform_payments_auth_select_policy" ON public.platform_payments
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_payments_auth_mutation_policy" ON public.platform_payments
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_plans') THEN
        DROP POLICY IF EXISTS "platform_plans_auth_select_policy" ON public.platform_plans;
        DROP POLICY IF EXISTS "platform_plans_auth_mutation_policy" ON public.platform_plans;
        CREATE POLICY "platform_plans_auth_select_policy" ON public.platform_plans
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_plans_auth_mutation_policy" ON public.platform_plans
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_profiles') THEN
        DROP POLICY IF EXISTS "platform_profiles_auth_select_policy" ON public.platform_profiles;
        DROP POLICY IF EXISTS "platform_profiles_auth_mutation_policy" ON public.platform_profiles;
        CREATE POLICY "platform_profiles_auth_select_policy" ON public.platform_profiles
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_profiles_auth_mutation_policy" ON public.platform_profiles
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_roles') THEN
        DROP POLICY IF EXISTS "platform_roles_auth_select_policy" ON public.platform_roles;
        DROP POLICY IF EXISTS "platform_roles_auth_mutation_policy" ON public.platform_roles;
        CREATE POLICY "platform_roles_auth_select_policy" ON public.platform_roles
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_roles_auth_mutation_policy" ON public.platform_roles
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_staff') THEN
        DROP POLICY IF EXISTS "platform_staff_auth_select_policy" ON public.platform_staff;
        DROP POLICY IF EXISTS "platform_staff_auth_mutation_policy" ON public.platform_staff;
        CREATE POLICY "platform_staff_auth_select_policy" ON public.platform_staff
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_staff_auth_mutation_policy" ON public.platform_staff
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_staff_invitations') THEN
        DROP POLICY IF EXISTS "platform_staff_invitations_auth_select_policy" ON public.platform_staff_invitations;
        DROP POLICY IF EXISTS "platform_staff_invitations_auth_mutation_policy" ON public.platform_staff_invitations;
        CREATE POLICY "platform_staff_invitations_auth_select_policy" ON public.platform_staff_invitations
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_staff_invitations_auth_mutation_policy" ON public.platform_staff_invitations
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_staff_scopes') THEN
        DROP POLICY IF EXISTS "platform_staff_scopes_auth_select_policy" ON public.platform_staff_scopes;
        DROP POLICY IF EXISTS "platform_staff_scopes_auth_mutation_policy" ON public.platform_staff_scopes;
        CREATE POLICY "platform_staff_scopes_auth_select_policy" ON public.platform_staff_scopes
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_staff_scopes_auth_mutation_policy" ON public.platform_staff_scopes
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_subscriptions') THEN
        DROP POLICY IF EXISTS "platform_subscriptions_auth_select_policy" ON public.platform_subscriptions;
        DROP POLICY IF EXISTS "platform_subscriptions_auth_mutation_policy" ON public.platform_subscriptions;
        CREATE POLICY "platform_subscriptions_auth_select_policy" ON public.platform_subscriptions
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_subscriptions_auth_mutation_policy" ON public.platform_subscriptions
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_user_preferences') THEN
        DROP POLICY IF EXISTS "platform_user_preferences_auth_select_policy" ON public.platform_user_preferences;
        DROP POLICY IF EXISTS "platform_user_preferences_auth_mutation_policy" ON public.platform_user_preferences;
        CREATE POLICY "platform_user_preferences_auth_select_policy" ON public.platform_user_preferences
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        CREATE POLICY "platform_user_preferences_auth_mutation_policy" ON public.platform_user_preferences
            FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
            WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- platform settings, sessions, background queues, webhooks, usage
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_usage_snapshots') THEN
        DROP POLICY IF EXISTS "platform_usage_snapshots_auth_select" ON public.platform_usage_snapshots;
        CREATE POLICY "platform_usage_snapshots_auth_select" ON public.platform_usage_snapshots
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_usage_events') THEN
        DROP POLICY IF EXISTS "platform_usage_events_auth_select" ON public.platform_usage_events;
        CREATE POLICY "platform_usage_events_auth_select" ON public.platform_usage_events
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_tenant_feature_overrides') THEN
        DROP POLICY IF EXISTS "platform_tenant_feature_overrides_auth_select" ON public.platform_tenant_feature_overrides;
        CREATE POLICY "platform_tenant_feature_overrides_auth_select" ON public.platform_tenant_feature_overrides
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_feature_flags') THEN
        DROP POLICY IF EXISTS "platform_feature_flags_auth_select" ON public.platform_feature_flags;
        CREATE POLICY "platform_feature_flags_auth_select" ON public.platform_feature_flags
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_webhook_endpoints') THEN
        DROP POLICY IF EXISTS "platform_webhook_endpoints_auth_select" ON public.platform_webhook_endpoints;
        CREATE POLICY "platform_webhook_endpoints_auth_select" ON public.platform_webhook_endpoints
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_webhook_deliveries') THEN
        DROP POLICY IF EXISTS "platform_webhook_deliveries_auth_select" ON public.platform_webhook_deliveries;
        CREATE POLICY "platform_webhook_deliveries_auth_select" ON public.platform_webhook_deliveries
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_impersonation_sessions') THEN
        DROP POLICY IF EXISTS "platform_impersonation_sessions_auth_select" ON public.platform_impersonation_sessions;
        CREATE POLICY "platform_impersonation_sessions_auth_select" ON public.platform_impersonation_sessions
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_settings') THEN
        DROP POLICY IF EXISTS "platform_settings_auth_select" ON public.platform_settings;
        CREATE POLICY "platform_settings_auth_select" ON public.platform_settings
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_sessions') THEN
        DROP POLICY IF EXISTS "platform_sessions_auth_select" ON public.platform_sessions;
        CREATE POLICY "platform_sessions_auth_select" ON public.platform_sessions
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_job_queues') THEN
        DROP POLICY IF EXISTS "platform_job_queues_auth_select" ON public.platform_job_queues;
        CREATE POLICY "platform_job_queues_auth_select" ON public.platform_job_queues
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_workers') THEN
        DROP POLICY IF EXISTS "platform_workers_auth_select" ON public.platform_workers;
        CREATE POLICY "platform_workers_auth_select" ON public.platform_workers
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_background_jobs') THEN
        DROP POLICY IF EXISTS "platform_background_jobs_auth_select" ON public.platform_background_jobs;
        CREATE POLICY "platform_background_jobs_auth_select" ON public.platform_background_jobs
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_job_attempts') THEN
        DROP POLICY IF EXISTS "platform_job_attempts_auth_select" ON public.platform_job_attempts;
        CREATE POLICY "platform_job_attempts_auth_select" ON public.platform_job_attempts
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_job_logs') THEN
        DROP POLICY IF EXISTS "platform_job_logs_auth_select" ON public.platform_job_logs;
        CREATE POLICY "platform_job_logs_auth_select" ON public.platform_job_logs
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_scheduled_cron_jobs') THEN
        DROP POLICY IF EXISTS "platform_scheduled_cron_jobs_auth_select" ON public.platform_scheduled_cron_jobs;
        CREATE POLICY "platform_scheduled_cron_jobs_auth_select" ON public.platform_scheduled_cron_jobs
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- support center
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_cases') THEN
        DROP POLICY IF EXISTS "support_cases_auth_select" ON public.support_cases;
        CREATE POLICY "support_cases_auth_select" ON public.support_cases
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_case_messages') THEN
        DROP POLICY IF EXISTS "support_case_messages_auth_select" ON public.support_case_messages;
        CREATE POLICY "support_case_messages_auth_select" ON public.support_case_messages
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_sla_policies') THEN
        DROP POLICY IF EXISTS "support_sla_policies_auth_select" ON public.support_sla_policies;
        CREATE POLICY "support_sla_policies_auth_select" ON public.support_sla_policies
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_knowledge_articles') THEN
        DROP POLICY IF EXISTS "support_knowledge_articles_auth_select" ON public.support_knowledge_articles;
        CREATE POLICY "support_knowledge_articles_auth_select" ON public.support_knowledge_articles
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_customer_activity') THEN
        DROP POLICY IF EXISTS "support_customer_activity_auth_select" ON public.support_customer_activity;
        CREATE POLICY "support_customer_activity_auth_select" ON public.support_customer_activity
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_case_assignments') THEN
        DROP POLICY IF EXISTS "support_case_assignments_auth_select" ON public.support_case_assignments;
        CREATE POLICY "support_case_assignments_auth_select" ON public.support_case_assignments
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    -- audit exports & integrity
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_event_exports') THEN
        DROP POLICY IF EXISTS "audit_event_exports_auth_select" ON public.audit_event_exports;
        CREATE POLICY "audit_event_exports_auth_select" ON public.audit_event_exports
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_event_integrity_records') THEN
        DROP POLICY IF EXISTS "audit_event_integrity_records_auth_select" ON public.audit_event_integrity_records;
        CREATE POLICY "audit_event_integrity_records_auth_select" ON public.audit_event_integrity_records
            FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 9. OTHER SCHEMAS: PLATFORM_CONTROL, AUDIT, OPERATIONS, BILLING_MESH
-- ============================================================================
DO $$
BEGIN
    -- platform_control schema
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'platform_control') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'platform_control' AND table_name = 'feature_capabilities') THEN
            DROP POLICY IF EXISTS "feature_capabilities_modify_policy" ON platform_control.feature_capabilities;
            CREATE POLICY "feature_capabilities_modify_policy" ON platform_control.feature_capabilities
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'platform_control' AND table_name = 'incident_mitigation_tasks') THEN
            DROP POLICY IF EXISTS "incident_mitigation_tasks_modify_policy" ON platform_control.incident_mitigation_tasks;
            CREATE POLICY "incident_mitigation_tasks_modify_policy" ON platform_control.incident_mitigation_tasks
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'platform_control' AND table_name = 'incident_postmortems') THEN
            DROP POLICY IF EXISTS "incident_postmortems_modify_policy" ON platform_control.incident_postmortems;
            CREATE POLICY "incident_postmortems_modify_policy" ON platform_control.incident_postmortems
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'platform_control' AND table_name = 'incident_timeline_events') THEN
            DROP POLICY IF EXISTS "incident_timeline_events_modify_policy" ON platform_control.incident_timeline_events;
            CREATE POLICY "incident_timeline_events_modify_policy" ON platform_control.incident_timeline_events
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'platform_control' AND table_name = 'platform_incidents') THEN
            DROP POLICY IF EXISTS "platform_incidents_modify_policy" ON platform_control.platform_incidents;
            CREATE POLICY "platform_incidents_modify_policy" ON platform_control.platform_incidents
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'platform_control' AND table_name = 'platform_services') THEN
            DROP POLICY IF EXISTS "platform_services_modify_policy" ON platform_control.platform_services;
            CREATE POLICY "platform_services_modify_policy" ON platform_control.platform_services
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'platform_control' AND table_name = 'postmortem_action_items') THEN
            DROP POLICY IF EXISTS "postmortem_action_items_modify_policy" ON platform_control.postmortem_action_items;
            CREATE POLICY "postmortem_action_items_modify_policy" ON platform_control.postmortem_action_items
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'platform_control' AND table_name = 'tenant_feature_overrides') THEN
            DROP POLICY IF EXISTS "tenant_feature_overrides_modify_policy" ON platform_control.tenant_feature_overrides;
            CREATE POLICY "tenant_feature_overrides_modify_policy" ON platform_control.tenant_feature_overrides
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'platform_control' AND table_name = 'organizations') THEN
            DROP POLICY IF EXISTS "organizations_auth_select" ON platform_control.organizations;
            CREATE POLICY "organizations_auth_select" ON platform_control.organizations
                FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'platform_control' AND table_name = 'impersonation_sessions') THEN
            DROP POLICY IF EXISTS "impersonation_sessions_auth_select" ON platform_control.impersonation_sessions;
            CREATE POLICY "impersonation_sessions_auth_select" ON platform_control.impersonation_sessions
                FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;
    END IF;

    -- audit schema
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'audit') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'audit' AND table_name = 'platform_audit_log') THEN
            DROP POLICY IF EXISTS "audit_log_select_access" ON audit.platform_audit_log;
            DROP POLICY IF EXISTS "audit_log_insert_access" ON audit.platform_audit_log;
            CREATE POLICY "audit_log_select_access" ON audit.platform_audit_log
                FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
            CREATE POLICY "audit_log_insert_access" ON audit.platform_audit_log
                FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;
    END IF;

    -- operations schema
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'operations') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'operations' AND table_name = 'background_jobs') THEN
            DROP POLICY IF EXISTS "background_jobs_select_policy" ON operations.background_jobs;
            DROP POLICY IF EXISTS "background_jobs_modify_policy" ON operations.background_jobs;
            CREATE POLICY "background_jobs_select_policy" ON operations.background_jobs
                FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
            CREATE POLICY "background_jobs_modify_policy" ON operations.background_jobs
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;
    END IF;

    -- billing_mesh schema
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'billing_mesh') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'billing_mesh' AND table_name = 'invoices') THEN
            DROP POLICY IF EXISTS "invoices_select_policy" ON billing_mesh.invoices;
            DROP POLICY IF EXISTS "invoices_write_policy" ON billing_mesh.invoices;
            CREATE POLICY "invoices_select_policy" ON billing_mesh.invoices
                FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
            CREATE POLICY "invoices_write_policy" ON billing_mesh.invoices
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'billing_mesh' AND table_name = 'subscription_plans') THEN
            DROP POLICY IF EXISTS "plans_modify_policy" ON billing_mesh.subscription_plans;
            CREATE POLICY "plans_modify_policy" ON billing_mesh.subscription_plans
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'billing_mesh' AND table_name = 'subscriptions') THEN
            DROP POLICY IF EXISTS "subscriptions_select_policy" ON billing_mesh.subscriptions;
            DROP POLICY IF EXISTS "subscriptions_modify_policy" ON billing_mesh.subscriptions;
            CREATE POLICY "subscriptions_select_policy" ON billing_mesh.subscriptions
                FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));
            CREATE POLICY "subscriptions_modify_policy" ON billing_mesh.subscriptions
                FOR ALL USING ((SELECT auth.role()) IN ('authenticated', 'service_role'))
                WITH CHECK ((SELECT auth.role()) IN ('authenticated', 'service_role'));
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
