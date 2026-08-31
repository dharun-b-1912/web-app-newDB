-- ============================================================
-- Migration: 20260828_064_add_missing_table_rls_policies.sql
-- Fixes:
-- 0008 (rls_enabled_no_policy) on all remaining tables
-- ============================================================

DO $$
DECLARE
    tbl text;
    pol RECORD;
    target_tables text[] := ARRAY[
        'attendance_deviations',
        'attendance_exceptions',
        'attendance_location_events',
        'attendance_location_policy',
        'employee_attendance_assignments',
        'employee_attendance_period_summary',
        'employee_employment',
        'employee_leave_assignments',
        'employee_onboarding_drafts',
        'employee_org_assignments',
        'employee_payroll_profiles',
        'employee_payroll_records',
        'employee_performance_assignments',
        'employee_salary_assignments',
        'employee_statutory_profiles',
        'employee_work_locations',
        'payroll_periods',
        'phone_otp_verifications',
        'salary_components',
        'salary_structure_components',
        'salary_structures',
        'storage_pools',
        'work_locations'
    ];
BEGIN
    FOREACH tbl IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Drop any partial / dangling policies
            FOR pol IN (
                SELECT policyname FROM pg_policies 
                WHERE schemaname = 'public' AND tablename = tbl
            ) LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
            END LOOP;

            -- 1. SELECT Policy
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
