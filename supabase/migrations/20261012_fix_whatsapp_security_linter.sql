-- ============================================================================
-- Supabase Security Linter Remediation Migration
-- Fully clears:
--   1. 0010_security_definer_view on v_whatsapp_active_sessions (Resolved via security_invoker = true)
--   2. 0024_permissive_rls_policy on whatsapp_inbound_logs (Resolved by removing public INSERT)
--   3. 0024_permissive_rls_policy on whatsapp_security_audit_logs (Resolved by removing public INSERT)
--
-- Why removing INSERT policy is correct:
--   Inbound WhatsApp webhooks and security audit events are recorded by the backend
--   gateway service using the service_role key, which bypasses RLS by default.
--   Allowing anon or authenticated clients to INSERT with WITH CHECK (true) creates
--   a security vulnerability where external users could spoof logs.
-- ============================================================================

-- 1. Recreate v_whatsapp_active_sessions with security_invoker = true
DROP VIEW IF EXISTS public.v_whatsapp_active_sessions CASCADE;

CREATE OR REPLACE VIEW public.v_whatsapp_active_sessions
WITH (security_invoker = true) AS
SELECT 
    c.id AS conversation_id,
    c.tenant_id,
    o.name AS organization_name,
    c.employee_id,
    e.display_name AS employee_name,
    e.employee_code,
    e.employment_status,
    c.wa_phone_e164,
    c.current_state,
    c.window_expires_at,
    CASE 
        WHEN c.window_expires_at > NOW() THEN TRUE 
        ELSE FALSE 
    END AS is_24h_window_active,
    ROUND(EXTRACT(EPOCH FROM (c.window_expires_at - NOW())) / 60) AS minutes_remaining_in_window,
    l.verification_status,
    l.verified_at,
    c.updated_at AS last_interaction_at
FROM public.whatsapp_conversations c
LEFT JOIN public.organizations o ON o.id = c.tenant_id
LEFT JOIN public.employees e ON e.id = c.employee_id
LEFT JOIN public.whatsapp_employee_identity_links l 
    ON l.tenant_id = c.tenant_id 
    AND l.employee_id = c.employee_id;

GRANT SELECT ON public.v_whatsapp_active_sessions TO anon, authenticated, service_role;


-- 2. Secure whatsapp_inbound_logs
-- Drop all permissive/redundant INSERT and ALL policies
ALTER TABLE public.whatsapp_inbound_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_inbound_logs_policy" ON public.whatsapp_inbound_logs;
DROP POLICY IF EXISTS "wa_inbound_tenant_isolation" ON public.whatsapp_inbound_logs;
DROP POLICY IF EXISTS "wa_inbound_logs_insert" ON public.whatsapp_inbound_logs;
DROP POLICY IF EXISTS "wa_inbound_logs_select" ON public.whatsapp_inbound_logs;

-- Allow authenticated users to view logs (SELECT only)
CREATE POLICY "wa_inbound_logs_select" ON public.whatsapp_inbound_logs
    FOR SELECT TO authenticated
    USING (true);


-- 3. Secure whatsapp_security_audit_logs
-- Drop all permissive/redundant INSERT and ALL policies
ALTER TABLE public.whatsapp_security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_security_audit_logs_policy" ON public.whatsapp_security_audit_logs;
DROP POLICY IF EXISTS "wa_security_audit_logs_insert" ON public.whatsapp_security_audit_logs;
DROP POLICY IF EXISTS "wa_security_audit_logs_select" ON public.whatsapp_security_audit_logs;

-- Allow authenticated users to view audit logs (SELECT only)
CREATE POLICY "wa_security_audit_logs_select" ON public.whatsapp_security_audit_logs
    FOR SELECT TO authenticated
    USING (true);
