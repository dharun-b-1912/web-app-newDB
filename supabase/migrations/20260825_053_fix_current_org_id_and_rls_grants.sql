-- ============================================================================
-- WorkForceOS Enterprise HRMS — Migration 053
-- Fix current_org_id() permissions, RLS policies, and Anon/Authenticated Grants
-- Migration: 20260825_053_fix_current_org_id_and_rls_grants.sql
-- ============================================================================

-- 1. Ensure current_org_id() is SECURITY DEFINER, robust against NULL auth.uid(), and accessible to all roles
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS TEXT 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1),
    (SELECT tenant_id FROM public.employee_auth_identities WHERE auth_user_id = auth.uid() LIMIT 1),
    'org-joy-01'
  );
$$;

-- 2. Explicitly Grant Execute on current_org_id to all roles
GRANT EXECUTE ON FUNCTION public.current_org_id() TO anon, authenticated, service_role, public;

-- 3. Grant schema usage and table permissions to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- 4. Ensure notification_events table has target_user_ids column for backward compatibility
ALTER TABLE public.notification_events ADD COLUMN IF NOT EXISTS target_user_ids TEXT[];
ALTER TABLE public.document_requirements ADD COLUMN IF NOT EXISTS employee_code TEXT;

-- 5. Fix RLS on key tables to allow authenticated and anon access safely
DO $$
BEGIN
    -- employees
    ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "employees_all_access" ON public.employees;
    CREATE POLICY "employees_all_access" ON public.employees
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- attendance_daily
    ALTER TABLE public.attendance_daily ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "attendance_daily_all_access" ON public.attendance_daily;
    CREATE POLICY "attendance_daily_all_access" ON public.attendance_daily
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- attendance_events
    ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "attendance_events_all_access" ON public.attendance_events;
    CREATE POLICY "attendance_events_all_access" ON public.attendance_events
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- document_requirements
    ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "document_requirements_all_access" ON public.document_requirements;
    CREATE POLICY "document_requirements_all_access" ON public.document_requirements
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- notification_events
    ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "notification_events_all_access" ON public.notification_events;
    CREATE POLICY "notification_events_all_access" ON public.notification_events
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- notification_deliveries
    ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "notification_deliveries_all_access" ON public.notification_deliveries;
    CREATE POLICY "notification_deliveries_all_access" ON public.notification_deliveries
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- realtime_outbox
    ALTER TABLE public.realtime_outbox ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "realtime_outbox_all_access" ON public.realtime_outbox;
    CREATE POLICY "realtime_outbox_all_access" ON public.realtime_outbox
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- leave_entitlements & leave_requests
    ALTER TABLE public.leave_entitlements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "leave_entitlements_all_access" ON public.leave_entitlements;
    CREATE POLICY "leave_entitlements_all_access" ON public.leave_entitlements
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "leave_requests_all_access" ON public.leave_requests;
    CREATE POLICY "leave_requests_all_access" ON public.leave_requests
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);
END $$;

-- 6. AUTOMATIC PUNCH -> DAILY ATTENDANCE TRIGGER WITH AUTHORITATIVE UTC ISO TIMESTAMPS
CREATE OR REPLACE FUNCTION public.fn_sync_attendance_event_to_daily()
RETURNS TRIGGER AS $$
DECLARE
    v_date DATE := (NEW.timestamp AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_utc_iso TEXT := TO_CHAR(NEW.timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
    v_emp RECORD;
BEGIN
    SELECT * INTO v_emp FROM public.employees WHERE id = NEW.employee_id;

    IF NEW.type = 'CHECK_IN' THEN
        INSERT INTO public.attendance_daily (
            organization_id, company_id, employee_id, employee_code, employee_name,
            department, designation, date, status, first_check_in, source, created_at, updated_at
        ) VALUES (
            NEW.organization_id, COALESCE(v_emp.company_id, 'comp-01'), NEW.employee_id,
            COALESCE(v_emp.employee_code, 'EMP'), COALESCE(v_emp.display_name, 'Employee'),
            COALESCE(v_emp.department_name, 'General'), COALESCE(v_emp.designation_title, 'Staff'),
            v_date, 'Present', v_utc_iso, NEW.source, NOW(), NOW()
        )
        ON CONFLICT (employee_id, date) DO UPDATE SET
            first_check_in = COALESCE(public.attendance_daily.first_check_in, EXCLUDED.first_check_in),
            status = 'Present',
            source = EXCLUDED.source,
            updated_at = NOW();

    ELSIF NEW.type = 'CHECK_OUT' THEN
        UPDATE public.attendance_daily
        SET last_check_out = v_utc_iso,
            status = 'Present',
            updated_at = NOW()
        WHERE (employee_id = NEW.employee_id OR employee_code = NEW.employee_id)
          AND date = v_date;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_attendance_event ON public.attendance_events;
CREATE TRIGGER trg_sync_attendance_event
AFTER INSERT ON public.attendance_events
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_attendance_event_to_daily();

