-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 020
-- Target Project: ysiajemrqakfngasehhi
-- Description: Notifications Outbox, Webhooks & Event Mesh
-- ============================================================================

-- 1. Notifications Outbox Events
CREATE TABLE IF NOT EXISTS public.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP' CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_sent BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifs_user_unread ON public.notification_events(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifs_org_sent ON public.notification_events(organization_id, is_sent);

-- 2. Webhook Endpoints
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    secret_key VARCHAR(255) NOT NULL,
    subscribed_events TEXT[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON public.webhook_endpoints(organization_id);

-- 3. Webhook Deliveries Log
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    webhook_endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status_code INTEGER,
    response_body TEXT,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliv_endpoint ON public.webhook_deliveries(webhook_endpoint_id, delivered_at);
