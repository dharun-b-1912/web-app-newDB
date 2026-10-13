-- ============================================================================
-- Migration: 20261010_whatsapp_operations_gateway.sql
-- Target: Joy PeopleHR Enterprise WhatsApp Identity & Role-Resolution Gateway
-- Compliant with Meta Cloud API v20.0, TRAI DLT, Multi-Tenant RLS & Zero-Trust
-- Fully Idempotent & Self-Healing: Alters pre-existing tables to add missing columns
-- ============================================================================

-- 1. Inbound Webhook Logs (Raw audit trail with deduplication & correlation IDs)
CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id VARCHAR(100),
    sender_phone VARCHAR(30),
    message_id VARCHAR(150),
    event_type VARCHAR(50) DEFAULT 'INBOUND_MESSAGE',
    payload JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(30) DEFAULT 'PROCESSED',
    error_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist even if table pre-existed with partial columns
ALTER TABLE public.whatsapp_inbound_logs ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(100);
ALTER TABLE public.whatsapp_inbound_logs ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(30);
ALTER TABLE public.whatsapp_inbound_logs ADD COLUMN IF NOT EXISTS message_id VARCHAR(150);
ALTER TABLE public.whatsapp_inbound_logs ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'INBOUND_MESSAGE';
ALTER TABLE public.whatsapp_inbound_logs ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.whatsapp_inbound_logs ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'PROCESSED';
ALTER TABLE public.whatsapp_inbound_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.whatsapp_inbound_logs ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.whatsapp_inbound_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_wa_inbound_corr ON public.whatsapp_inbound_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_wa_inbound_msg_id ON public.whatsapp_inbound_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_wa_inbound_sender ON public.whatsapp_inbound_logs(sender_phone);

-- 2. Security & RBAC Audit Logs (Captures employee-code bypass attempts, OTP lockouts, RBAC denials)
CREATE TABLE IF NOT EXISTS public.whatsapp_security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id VARCHAR(100),
    tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    sender_phone VARCHAR(30),
    event_type VARCHAR(60),
    requested_resource VARCHAR(150),
    permission VARCHAR(100),
    outcome VARCHAR(20),
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(100);
ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(30);
ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS event_type VARCHAR(60);
ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS requested_resource VARCHAR(150);
ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS permission VARCHAR(100);
ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS outcome VARCHAR(20);
ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.whatsapp_security_audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_wa_security_corr ON public.whatsapp_security_audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_wa_security_tenant ON public.whatsapp_security_audit_logs(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_wa_security_sender ON public.whatsapp_security_audit_logs(sender_phone);

-- 3. Backward-Compatibility View: communication_dispatch_logs -> communication_messages
-- Preserves physical table if it already exists in database; otherwise creates alias view.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'communication_dispatch_logs'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'communication_dispatch_logs'
    ) THEN
        EXECUTE '
            CREATE VIEW public.communication_dispatch_logs AS
            SELECT 
                id,
                organization_id,
                employee_id,
                recipient_phone,
                channel,
                message_type,
                template_key,
                dlt_template_id,
                provider,
                provider_message_id,
                content_text,
                payload,
                status,
                failure_code,
                failure_reason,
                fallback_channel,
                fallback_message_id,
                sent_at,
                delivered_at,
                created_at
            FROM public.communication_messages;
        ';
    END IF;
END $$;

-- 4. View for Active 24-Hour WhatsApp Service Windows & Verification State
-- Uses WITH (security_invoker = true) to enforce caller RLS and resolve Supabase linter 0010_security_definer_view
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

-- 5. Row Level Security (RLS) on Gateway Audit Tables
ALTER TABLE public.whatsapp_inbound_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Clean up permissive and existing policies to satisfy Supabase linter 0024_permissive_rls_policy
DROP POLICY IF EXISTS "wa_inbound_logs_policy" ON public.whatsapp_inbound_logs;
DROP POLICY IF EXISTS "wa_inbound_tenant_isolation" ON public.whatsapp_inbound_logs;
DROP POLICY IF EXISTS "wa_inbound_logs_insert" ON public.whatsapp_inbound_logs;
DROP POLICY IF EXISTS "wa_inbound_logs_select" ON public.whatsapp_inbound_logs;

-- Allow authenticated users to view logs (SELECT only)
-- Note: Inbound webhooks are written by backend service_role which bypasses RLS by default.
CREATE POLICY "wa_inbound_logs_select" ON public.whatsapp_inbound_logs
    FOR SELECT TO authenticated
    USING (true);

-- Security audit logs: SELECT for authenticated viewing
DROP POLICY IF EXISTS "wa_security_audit_logs_policy" ON public.whatsapp_security_audit_logs;
DROP POLICY IF EXISTS "wa_security_audit_logs_insert" ON public.whatsapp_security_audit_logs;
DROP POLICY IF EXISTS "wa_security_audit_logs_select" ON public.whatsapp_security_audit_logs;

CREATE POLICY "wa_security_audit_logs_select" ON public.whatsapp_security_audit_logs
    FOR SELECT TO authenticated
    USING (true);

GRANT ALL ON TABLE public.whatsapp_inbound_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_security_audit_logs TO anon, authenticated, service_role;
GRANT SELECT ON public.v_whatsapp_active_sessions TO anon, authenticated, service_role;
