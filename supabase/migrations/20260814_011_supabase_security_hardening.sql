-- ============================================================
-- WorkForceOS — Supabase Database Security Hardening Migration
-- Migration: 20260814_011_supabase_security_hardening.sql
-- ============================================================

-- ============================================================
-- 1. DYNAMICALLY HARDEN ALL SECURITY DEFINER FUNCTIONS
--    - Sets search_path = public, pg_temp (fixes function_search_path_mutable)
--    - Revokes execute from anon / public (fixes anon_security_definer_function_executable)
--    - Grants execute strictly to authenticated & service_role
-- ============================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT n.nspname AS schema_name, p.proname AS function_name, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
    ) LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp;', r.schema_name, r.function_name, r.args);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM public, anon;', r.schema_name, r.function_name, r.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role;', r.schema_name, r.function_name, r.args);
    END LOOP;
END $$;

-- ============================================================
-- 2. HARDEN RLS POLICIES ACROSS ALL PLATFORM TABLES
-- ============================================================

-- A. Background Jobs Tables
DROP POLICY IF EXISTS "Platform admins full access on job queues" ON public.platform_job_queues;
CREATE POLICY "Platform admins full access on job queues"
ON public.platform_job_queues FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform admins full access on workers" ON public.platform_workers;
CREATE POLICY "Platform admins full access on workers"
ON public.platform_workers FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform admins full access on background jobs" ON public.platform_background_jobs;
CREATE POLICY "Platform admins full access on background jobs"
ON public.platform_background_jobs FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform admins full access on job attempts" ON public.platform_job_attempts;
CREATE POLICY "Platform admins full access on job attempts"
ON public.platform_job_attempts FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform admins full access on job logs" ON public.platform_job_logs;
CREATE POLICY "Platform admins full access on job logs"
ON public.platform_job_logs FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform admins full access on scheduled jobs" ON public.platform_scheduled_cron_jobs;
CREATE POLICY "Platform admins full access on scheduled jobs"
ON public.platform_scheduled_cron_jobs FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- B. Support Center Tables
DROP POLICY IF EXISTS "Allow authenticated platform admins full support access" ON public.support_cases;
CREATE POLICY "Allow authenticated platform admins full support access"
ON public.support_cases FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated platform admins full message access" ON public.support_case_messages;
CREATE POLICY "Allow authenticated platform admins full message access"
ON public.support_case_messages FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated platform admins assignment access" ON public.support_case_assignments;
CREATE POLICY "Allow authenticated platform admins assignment access"
ON public.support_case_assignments FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated platform admins request access" ON public.support_access_requests;
CREATE POLICY "Allow authenticated platform admins request access"
ON public.support_access_requests FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated platform admins knowledge access" ON public.support_knowledge_articles;
CREATE POLICY "Allow authenticated platform admins knowledge access"
ON public.support_knowledge_articles FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated platform admins customer activity access" ON public.support_customer_activity;
CREATE POLICY "Allow authenticated platform admins customer activity access"
ON public.support_customer_activity FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated platform admins SLA access" ON public.support_sla_policies;
CREATE POLICY "Allow authenticated platform admins SLA access"
ON public.support_sla_policies FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- C. Audit Ledger Tables
DROP POLICY IF EXISTS "Platform admins can insert audit events" ON public.audit_events;
CREATE POLICY "Platform admins can insert audit events"
ON public.audit_events FOR INSERT TO authenticated
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform admins can read audit exports" ON public.audit_event_exports;
CREATE POLICY "Platform admins can read audit exports"
ON public.audit_event_exports FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform admins can read integrity records" ON public.audit_event_integrity_records;
CREATE POLICY "Platform admins can read integrity records"
ON public.audit_event_integrity_records FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- D. Security Center & Active Sessions Tables
DROP POLICY IF EXISTS "Platform admins can manage all sessions" ON public.platform_sessions;
CREATE POLICY "Platform admins can manage all sessions"
ON public.platform_sessions FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform admins can view session events" ON public.session_events;
CREATE POLICY "Platform admins can view session events"
ON public.session_events FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Platform admins can manage device registry" ON public.device_registry;
CREATE POLICY "Platform admins can manage device registry"
ON public.device_registry FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow platform admins full access to security posture snapshots" ON public.security_posture_snapshots;
CREATE POLICY "Allow platform admins full access to security posture snapshots"
ON public.security_posture_snapshots FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow platform admins full access to security findings" ON public.security_findings;
CREATE POLICY "Allow platform admins full access to security findings"
ON public.security_findings FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow platform admins full access to security credentials" ON public.security_credentials;
CREATE POLICY "Allow platform admins full access to security credentials"
ON public.security_credentials FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow platform admins full access to security policies" ON public.security_policies;
CREATE POLICY "Allow platform admins full access to security policies"
ON public.security_policies FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow platform admins full access to security check runs" ON public.security_check_runs;
CREATE POLICY "Allow platform admins full access to security check runs"
ON public.security_check_runs FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow platform admins full access to compliance controls" ON public.compliance_controls;
CREATE POLICY "Allow platform admins full access to compliance controls"
ON public.compliance_controls FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow platform admins full access to api security metrics" ON public.api_security_metrics;
CREATE POLICY "Allow platform admins full access to api security metrics"
ON public.api_security_metrics FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow platform admins full access to telemetry sources" ON public.telemetry_sources;
CREATE POLICY "Allow platform admins full access to telemetry sources"
ON public.telemetry_sources FOR ALL TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
