-- Migration: 20261026_164_resolve_all_supabase_linter_security_warnings.sql
-- Resolution of all Supabase Database Linter Errors and Warnings:
-- 1. ERROR: rls_references_user_metadata (mis_report_recipients, mis_delivery_audit_logs)
-- 2. WARN: function_search_path_mutable (fn_resolve_daily_shift_roster, fn_bulk_assign_shift_roster)
-- 3. WARN: rls_policy_always_true (attendance_report_logs, attendance_report_schedules, employee_live_locations, employee_location_trails, employee_shift_assignments, shift_rosters, shifts)
-- 4. WARN: anon_security_definer_function_executable & authenticated_security_definer_function_executable (fn_bulk_assign_shift_roster, fn_determine_attendance_session_date, fn_dispatch_scheduled_attendance_report, fn_recalculate_daily_attendance, fn_resolve_daily_shift_roster, ingest_attendance_event, trg_fn_set_punch_attendance_date)

-- ============================================================================
-- 0. HELPER FUNCTION: is_org_admin() 0-arg overload for clean RLS expressions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_org_admin(public.get_active_user_org_id()::text);
$$;

REVOKE ALL ON FUNCTION public.is_org_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin() TO authenticated, service_role;


-- ============================================================================
-- 1. RESOLVE ERROR: rls_references_user_metadata (Linter 0015)
-- Replace end-user editable auth.jwt() -> 'user_metadata' with public.get_active_user_org_id()
-- ============================================================================

-- 1.1 Table: public.mis_report_recipients
DROP POLICY IF EXISTS "mis_recipients_org_access" ON public.mis_report_recipients;
DROP POLICY IF EXISTS "mis_recipients_select" ON public.mis_report_recipients;
DROP POLICY IF EXISTS "mis_recipients_write" ON public.mis_report_recipients;

CREATE POLICY "mis_recipients_select"
    ON public.mis_report_recipients
    FOR SELECT
    TO authenticated
    USING (
        organization_id::text = (SELECT public.get_active_user_org_id()::text)
        OR auth.role() = 'service_role'
    );

CREATE POLICY "mis_recipients_write"
    ON public.mis_report_recipients
    FOR ALL
    TO authenticated
    USING (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    );

-- 1.2 Table: public.mis_delivery_audit_logs
DROP POLICY IF EXISTS "mis_audit_org_access" ON public.mis_delivery_audit_logs;
DROP POLICY IF EXISTS "mis_audit_select" ON public.mis_delivery_audit_logs;
DROP POLICY IF EXISTS "mis_audit_insert" ON public.mis_delivery_audit_logs;

CREATE POLICY "mis_audit_select"
    ON public.mis_delivery_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        organization_id::text = (SELECT public.get_active_user_org_id()::text)
        OR auth.role() = 'service_role'
    );

CREATE POLICY "mis_audit_insert"
    ON public.mis_delivery_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id::text = (SELECT public.get_active_user_org_id()::text)
        OR auth.role() = 'service_role'
    );


-- ============================================================================
-- 2. RESOLVE WARN: rls_policy_always_true (Linter 0024)
-- Replace permissive USING (true) / WITH CHECK (true) write policies with strict multi-tenant boundaries
-- ============================================================================

-- 2.1 Table: public.attendance_report_logs
DROP POLICY IF EXISTS "allow_all_attendance_report_logs" ON public.attendance_report_logs;
DROP POLICY IF EXISTS "attendance_report_logs_select" ON public.attendance_report_logs;
DROP POLICY IF EXISTS "attendance_report_logs_write" ON public.attendance_report_logs;

CREATE POLICY "attendance_report_logs_select"
    ON public.attendance_report_logs
    FOR SELECT
    TO authenticated
    USING (
        organization_id::text = (SELECT public.get_active_user_org_id()::text)
        OR auth.role() = 'service_role'
    );

CREATE POLICY "attendance_report_logs_write"
    ON public.attendance_report_logs
    FOR ALL
    TO authenticated
    USING (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    );

-- 2.2 Table: public.attendance_report_schedules
DROP POLICY IF EXISTS "allow_all_attendance_report_schedules" ON public.attendance_report_schedules;
DROP POLICY IF EXISTS "attendance_report_schedules_select" ON public.attendance_report_schedules;
DROP POLICY IF EXISTS "attendance_report_schedules_write" ON public.attendance_report_schedules;

CREATE POLICY "attendance_report_schedules_select"
    ON public.attendance_report_schedules
    FOR SELECT
    TO authenticated
    USING (
        organization_id::text = (SELECT public.get_active_user_org_id()::text)
        OR auth.role() = 'service_role'
    );

CREATE POLICY "attendance_report_schedules_write"
    ON public.attendance_report_schedules
    FOR ALL
    TO authenticated
    USING (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    );

-- 2.3 Table: public.employee_shift_assignments
DROP POLICY IF EXISTS "esa_write_auth" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "esa_select_auth" ON public.employee_shift_assignments;

CREATE POLICY "esa_select_auth"
    ON public.employee_shift_assignments
    FOR SELECT
    TO authenticated
    USING (
        organization_id::text = (SELECT public.get_active_user_org_id()::text)
        OR auth.role() = 'service_role'
    );

CREATE POLICY "esa_write_auth"
    ON public.employee_shift_assignments
    FOR ALL
    TO authenticated
    USING (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    );

-- 2.4 Table: public.shift_rosters
DROP POLICY IF EXISTS "shift_rosters_write_auth" ON public.shift_rosters;
DROP POLICY IF EXISTS "shift_rosters_select_auth" ON public.shift_rosters;

CREATE POLICY "shift_rosters_select_auth"
    ON public.shift_rosters
    FOR SELECT
    TO authenticated
    USING (
        organization_id::text = (SELECT public.get_active_user_org_id()::text)
        OR auth.role() = 'service_role'
    );

CREATE POLICY "shift_rosters_write_auth"
    ON public.shift_rosters
    FOR ALL
    TO authenticated
    USING (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    );

-- 2.5 Table: public.shifts
DROP POLICY IF EXISTS "shifts_write_auth" ON public.shifts;
DROP POLICY IF EXISTS "shifts_select_auth" ON public.shifts;

CREATE POLICY "shifts_select_auth"
    ON public.shifts
    FOR SELECT
    TO authenticated
    USING (
        organization_id::text = (SELECT public.get_active_user_org_id()::text)
        OR auth.role() = 'service_role'
    );

CREATE POLICY "shifts_write_auth"
    ON public.shifts
    FOR ALL
    TO authenticated
    USING (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        (organization_id::text = (SELECT public.get_active_user_org_id()::text) AND public.is_org_admin(organization_id::text))
        OR auth.role() = 'service_role'
    );

-- 2.6 Table: public.employee_live_locations (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_live_locations') THEN
        DROP POLICY IF EXISTS "emp_live_loc_insert_upsert" ON public.employee_live_locations;
        DROP POLICY IF EXISTS "emp_live_loc_select" ON public.employee_live_locations;

        CREATE POLICY "emp_live_loc_select"
            ON public.employee_live_locations
            FOR SELECT
            TO authenticated
            USING (
                organization_id::text = (SELECT public.get_active_user_org_id()::text)
                OR auth.role() = 'service_role'
            );

        CREATE POLICY "emp_live_loc_insert_upsert"
            ON public.employee_live_locations
            FOR ALL
            TO authenticated
            USING (
                employee_id::text IN (SELECT id::text FROM public.employees WHERE user_id = auth.uid())
                OR public.is_org_admin(organization_id::text)
                OR auth.role() = 'service_role'
            )
            WITH CHECK (
                employee_id::text IN (SELECT id::text FROM public.employees WHERE user_id = auth.uid())
                OR public.is_org_admin(organization_id::text)
                OR auth.role() = 'service_role'
            );
    END IF;
END $$;

-- 2.7 Table: public.employee_location_trails (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_location_trails') THEN
        DROP POLICY IF EXISTS "emp_trails_insert" ON public.employee_location_trails;
        DROP POLICY IF EXISTS "emp_trails_select" ON public.employee_location_trails;

        CREATE POLICY "emp_trails_select"
            ON public.employee_location_trails
            FOR SELECT
            TO authenticated
            USING (
                employee_id::text IN (SELECT id::text FROM public.employees WHERE user_id = auth.uid())
                OR public.is_org_admin((SELECT organization_id::text FROM public.employees WHERE id::text = employee_location_trails.employee_id::text))
                OR auth.role() = 'service_role'
            );

        CREATE POLICY "emp_trails_insert"
            ON public.employee_location_trails
            FOR INSERT
            TO authenticated
            WITH CHECK (
                employee_id::text IN (SELECT id::text FROM public.employees WHERE user_id = auth.uid())
                OR public.is_org_admin((SELECT organization_id::text FROM public.employees WHERE id::text = employee_location_trails.employee_id::text))
                OR auth.role() = 'service_role'
            );
    END IF;
END $$;


-- ============================================================================
-- 3. RESOLVE WARN: function_search_path_mutable (Linter 0011)
-- Set explicit, immutable search_path on functions to prevent search path hijacking
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_resolve_daily_shift_roster') THEN
        ALTER FUNCTION public.fn_resolve_daily_shift_roster(UUID, UUID, DATE) SET search_path = public, pg_temp;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_bulk_assign_shift_roster') THEN
        ALTER FUNCTION public.fn_bulk_assign_shift_roster(UUID, UUID, UUID[], DATE, DATE, UUID, INTEGER[], TEXT) SET search_path = public, pg_temp;
    END IF;
END $$;


-- ============================================================================
-- 4. RESOLVE WARN: anon_security_definer_function_executable & 
--    authenticated_security_definer_function_executable (Linter 0028 & 0029)
-- Convert read/helper functions to SECURITY INVOKER; revoke anon & public execution
-- ============================================================================

-- 4.1 Trigger Function: trg_fn_set_punch_attendance_date()
-- Trigger functions must NOT be callable directly via RPC by public or anon
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_fn_set_punch_attendance_date') THEN
        ALTER FUNCTION public.trg_fn_set_punch_attendance_date() SECURITY INVOKER;
        ALTER FUNCTION public.trg_fn_set_punch_attendance_date() SET search_path = public, pg_temp;
        REVOKE ALL ON FUNCTION public.trg_fn_set_punch_attendance_date() FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

-- 4.2 Calculation Helper: fn_determine_attendance_session_date
-- Reads shift metadata; can execute cleanly as SECURITY INVOKER under caller permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_determine_attendance_session_date') THEN
        ALTER FUNCTION public.fn_determine_attendance_session_date(UUID, TIMESTAMPTZ) SECURITY INVOKER;
        ALTER FUNCTION public.fn_determine_attendance_session_date(UUID, TIMESTAMPTZ) SET search_path = public, pg_temp;
        REVOKE ALL ON FUNCTION public.fn_determine_attendance_session_date(UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.fn_determine_attendance_session_date(UUID, TIMESTAMPTZ) TO authenticated, service_role;
    END IF;
END $$;

-- 4.3 Scheduled Background Task: fn_dispatch_scheduled_attendance_report
-- Strictly a backend cron runner function; must NOT be callable by anon or regular authenticated users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_dispatch_scheduled_attendance_report') THEN
        ALTER FUNCTION public.fn_dispatch_scheduled_attendance_report(TEXT) SET search_path = public, pg_temp;
        REVOKE ALL ON FUNCTION public.fn_dispatch_scheduled_attendance_report(TEXT) FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.fn_dispatch_scheduled_attendance_report(TEXT) TO service_role;
    END IF;
END $$;

-- 4.4 Shift Roster Resolver: fn_resolve_daily_shift_roster
-- Pure lookup query; switch to SECURITY INVOKER and revoke from anon
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_resolve_daily_shift_roster') THEN
        ALTER FUNCTION public.fn_resolve_daily_shift_roster(UUID, UUID, DATE) SECURITY INVOKER;
        ALTER FUNCTION public.fn_resolve_daily_shift_roster(UUID, UUID, DATE) SET search_path = public, pg_temp;
        REVOKE ALL ON FUNCTION public.fn_resolve_daily_shift_roster(UUID, UUID, DATE) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.fn_resolve_daily_shift_roster(UUID, UUID, DATE) TO authenticated, service_role;
    END IF;
END $$;

-- 4.5 Shift Roster Bulk Assign: fn_bulk_assign_shift_roster
-- Operates under authenticated admin permissions; switch to SECURITY INVOKER and revoke from anon
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_bulk_assign_shift_roster') THEN
        ALTER FUNCTION public.fn_bulk_assign_shift_roster(UUID, UUID, UUID[], DATE, DATE, UUID, INTEGER[], TEXT) SECURITY INVOKER;
        ALTER FUNCTION public.fn_bulk_assign_shift_roster(UUID, UUID, UUID[], DATE, DATE, UUID, INTEGER[], TEXT) SET search_path = public, pg_temp;
        REVOKE ALL ON FUNCTION public.fn_bulk_assign_shift_roster(UUID, UUID, UUID[], DATE, DATE, UUID, INTEGER[], TEXT) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.fn_bulk_assign_shift_roster(UUID, UUID, UUID[], DATE, DATE, UUID, INTEGER[], TEXT) TO authenticated, service_role;
    END IF;
END $$;

-- 4.6 Daily Attendance Recalculation: fn_recalculate_daily_attendance
-- Respects caller's RLS on attendance_daily; switch to SECURITY INVOKER, revoke from anon
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_recalculate_daily_attendance') THEN
        ALTER FUNCTION public.fn_recalculate_daily_attendance(UUID, DATE) SECURITY INVOKER;
        ALTER FUNCTION public.fn_recalculate_daily_attendance(UUID, DATE) SET search_path = public, pg_temp;
        REVOKE ALL ON FUNCTION public.fn_recalculate_daily_attendance(UUID, DATE) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.fn_recalculate_daily_attendance(UUID, DATE) TO authenticated, service_role;
    END IF;
END $$;

-- 4.7 Attendance Ingestion RPC: ingest_attendance_event
-- Ensure attendance_ingestion_audit_logs allows authenticated tenant inserts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_ingestion_audit_logs') THEN
        DROP POLICY IF EXISTS "attendance_audit_insert_auth" ON public.attendance_ingestion_audit_logs;
        CREATE POLICY "attendance_audit_insert_auth"
            ON public.attendance_ingestion_audit_logs
            FOR INSERT
            TO authenticated
            WITH CHECK (
                organization_id::text = (SELECT public.get_active_user_org_id()::text)
                OR auth.role() = 'service_role'
            );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'ingest_attendance_event') THEN
        ALTER FUNCTION public.ingest_attendance_event(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, NUMERIC, JSONB) SECURITY INVOKER;
        ALTER FUNCTION public.ingest_attendance_event(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, NUMERIC, JSONB) SET search_path = public, pg_temp;
        REVOKE ALL ON FUNCTION public.ingest_attendance_event(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, NUMERIC, JSONB) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.ingest_attendance_event(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, NUMERIC, JSONB) TO authenticated, service_role;
    END IF;
END $$;

-- Successfully resolved all Supabase Database Linter 0015, 0011, 0024, 0028, and 0029 security errors and warnings.
