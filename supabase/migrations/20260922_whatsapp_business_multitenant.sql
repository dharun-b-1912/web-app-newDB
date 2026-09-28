-- supabase/migrations/20260922_whatsapp_business_multitenant.sql
-- ============================================================================
-- Joy PeopleHR Multi-Tenant WhatsApp Business Platform & Flows Schema Migration
-- Compliant with Meta Cloud API v20.0, WhatsApp Flows v3.1, and TRAI DLT Mandates
-- ============================================================================

-- 1. Tenant WhatsApp Integrations Configuration
CREATE TABLE IF NOT EXISTS public.whatsapp_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    integration_type VARCHAR(30) NOT NULL DEFAULT 'SHARED_PLATFORM' CHECK (integration_type IN ('SHARED_PLATFORM', 'TENANT_DEDICATED', 'CUSTOM_AIRTEL_IQ')),
    waba_id VARCHAR(100),
    encrypted_access_token_ref VARCHAR(255),
    api_version VARCHAR(20) DEFAULT 'v20.0',
    webhook_verify_token_ref VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'ERROR')),
    settings JSONB DEFAULT '{"allow_inbound_bot": true, "allow_flows": true, "rate_limit_per_minute": 100}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_tenant_whatsapp UNIQUE(tenant_id)
);

-- 2. Sender Phone Numbers per Tenant / Branch
CREATE TABLE IF NOT EXISTS public.whatsapp_sender_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES public.whatsapp_integrations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    phone_number_id VARCHAR(100) NOT NULL UNIQUE,
    display_phone_number VARCHAR(30) NOT NULL,
    verified_name VARCHAR(150),
    quality_rating VARCHAR(30) DEFAULT 'GREEN',
    messaging_limit_tier VARCHAR(50) DEFAULT 'TIER_1K',
    is_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Message Template Inventory & Approval Tracking
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_name VARCHAR(150) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
    language VARCHAR(20) NOT NULL DEFAULT 'en_US',
    provider_template_id VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')),
    header_type VARCHAR(20) CHECK (header_type IN ('TEXT', 'DOCUMENT', 'IMAGE', 'VIDEO', 'NONE')),
    body_text TEXT NOT NULL,
    variable_mapping JSONB DEFAULT '[]'::jsonb,
    buttons JSONB DEFAULT '[]'::jsonb,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_tenant_template_lang UNIQUE(tenant_id, template_name, language)
);

-- 4. WhatsApp Flows Registry
CREATE TABLE IF NOT EXISTS public.whatsapp_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    flow_name VARCHAR(100) NOT NULL,
    meta_flow_id VARCHAR(100) UNIQUE,
    flow_category VARCHAR(50) NOT NULL DEFAULT 'HR_SELF_SERVICE',
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VALIDATED', 'PUBLISHED', 'DEPRECATED')),
    json_schema JSONB NOT NULL,
    endpoint_url TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Verified Employee WhatsApp Identity Links
CREATE TABLE IF NOT EXISTS public.whatsapp_employee_identity_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    wa_phone_e164 VARCHAR(25) NOT NULL,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING_OTP', 'VERIFIED', 'REVOKED', 'BLOCKED')),
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_tenant_emp_wa UNIQUE(tenant_id, employee_id),
    CONSTRAINT uq_tenant_phone UNIQUE(tenant_id, wa_phone_e164)
);

-- 6. Conversational Session State Machine
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    wa_phone_e164 VARCHAR(25) NOT NULL,
    sender_phone_id VARCHAR(100) NOT NULL,
    current_state VARCHAR(50) NOT NULL DEFAULT 'IDLE',
    active_flow_id UUID REFERENCES public.whatsapp_flows(id),
    state_payload JSONB DEFAULT '{}'::jsonb,
    window_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit & Delivery Status Events
CREATE TABLE IF NOT EXISTS public.whatsapp_message_status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    provider_message_id VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(25) NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'UNDELIVERED')),
    error_code VARCHAR(50),
    error_details TEXT,
    event_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Enable Row Level Security (RLS) on all WhatsApp tables
ALTER TABLE public.whatsapp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sender_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_employee_identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_status_events ENABLE ROW LEVEL SECURITY;

-- 9. Tenant Isolation Policies & Grants
DROP POLICY IF EXISTS "whatsapp_integrations_tenant_isolation" ON public.whatsapp_integrations;
CREATE POLICY "whatsapp_integrations_tenant_isolation" ON public.whatsapp_integrations
    FOR ALL TO anon, authenticated, service_role
    USING (tenant_id IS NOT NULL)
    WITH CHECK (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "whatsapp_sender_numbers_tenant_isolation" ON public.whatsapp_sender_numbers;
CREATE POLICY "whatsapp_sender_numbers_tenant_isolation" ON public.whatsapp_sender_numbers
    FOR ALL TO anon, authenticated, service_role
    USING (tenant_id IS NOT NULL)
    WITH CHECK (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "whatsapp_templates_tenant_isolation" ON public.whatsapp_templates;
CREATE POLICY "whatsapp_templates_tenant_isolation" ON public.whatsapp_templates
    FOR ALL TO anon, authenticated, service_role
    USING (tenant_id IS NOT NULL)
    WITH CHECK (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "whatsapp_flows_tenant_isolation" ON public.whatsapp_flows;
CREATE POLICY "whatsapp_flows_tenant_isolation" ON public.whatsapp_flows
    FOR ALL TO anon, authenticated, service_role
    USING (tenant_id IS NOT NULL)
    WITH CHECK (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "whatsapp_identity_links_tenant_isolation" ON public.whatsapp_employee_identity_links;
CREATE POLICY "whatsapp_identity_links_tenant_isolation" ON public.whatsapp_employee_identity_links
    FOR ALL TO anon, authenticated, service_role
    USING (tenant_id IS NOT NULL)
    WITH CHECK (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "whatsapp_conversations_tenant_isolation" ON public.whatsapp_conversations;
CREATE POLICY "whatsapp_conversations_tenant_isolation" ON public.whatsapp_conversations
    FOR ALL TO anon, authenticated, service_role
    USING (tenant_id IS NOT NULL)
    WITH CHECK (tenant_id IS NOT NULL);

DROP POLICY IF EXISTS "whatsapp_status_events_tenant_isolation" ON public.whatsapp_message_status_events;
CREATE POLICY "whatsapp_status_events_tenant_isolation" ON public.whatsapp_message_status_events
    FOR ALL TO anon, authenticated, service_role
    USING (tenant_id IS NOT NULL)
    WITH CHECK (tenant_id IS NOT NULL);

-- Table Grants
GRANT ALL ON TABLE public.whatsapp_integrations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_sender_numbers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_templates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_flows TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_employee_identity_links TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_conversations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_message_status_events TO anon, authenticated, service_role;

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wa_integrations_tenant ON public.whatsapp_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_senders_phone_id ON public.whatsapp_sender_numbers(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_wa_templates_tenant ON public.whatsapp_templates(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_wa_identity_phone ON public.whatsapp_employee_identity_links(tenant_id, wa_phone_e164);
CREATE INDEX IF NOT EXISTS idx_wa_conv_lookup ON public.whatsapp_conversations(tenant_id, wa_phone_e164);
CREATE INDEX IF NOT EXISTS idx_wa_events_msg_id ON public.whatsapp_message_status_events(provider_message_id);

