-- ============================================================================
-- Migration: 20261104_171_super_admin_communication_hub_engine.sql
-- Target: Joy PeopleHR Enterprise Platform Super Admin
-- Description: Centralized Multi-Channel Messaging Infrastructure & Realtime Audit Ledger
-- Channels: Hostinger SMTP / Resend Email, Meta WhatsApp Cloud API, Airtel IQ TRAI DLT SMS
-- ============================================================================

BEGIN;

-- 1. Extend communication_messages with Email support & performance telemetry
DO $$
BEGIN
    -- Drop restrictive constraints if they exist
    ALTER TABLE public.communication_messages DROP CONSTRAINT IF EXISTS communication_messages_channel_check;
    ALTER TABLE public.communication_messages DROP CONSTRAINT IF EXISTS communication_messages_message_type_check;
    ALTER TABLE public.communication_messages DROP CONSTRAINT IF EXISTS chk_comm_channel;
    
    -- Re-add flexible channel constraint supporting EMAIL, WHATSAPP, SMS, VOICE
    ALTER TABLE public.communication_messages ADD CONSTRAINT chk_comm_channel 
      CHECK (channel IN ('EMAIL', 'WHATSAPP', 'SMS', 'VOICE'));
      
    -- Make recipient_phone nullable so pure EMAIL dispatches don't require dummy phone numbers
    ALTER TABLE public.communication_messages ALTER COLUMN recipient_phone DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Add auxiliary columns for cross-channel delivery & metering
ALTER TABLE public.communication_messages ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255);
ALTER TABLE public.communication_messages ADD COLUMN IF NOT EXISTS cost_inr NUMERIC(10, 4) DEFAULT 0.00;
ALTER TABLE public.communication_messages ADD COLUMN IF NOT EXISTS latency_ms INTEGER DEFAULT 0;
ALTER TABLE public.communication_messages ADD COLUMN IF NOT EXISTS bounce_reason TEXT;
ALTER TABLE public.communication_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.communication_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_comm_messages_channel_created ON public.communication_messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_messages_org_created ON public.communication_messages(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_messages_status_created ON public.communication_messages(status, created_at DESC);

-- 2. Platform Communication Providers Master Registry
CREATE TABLE IF NOT EXISTS public.communication_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_key VARCHAR(100) UNIQUE NOT NULL,
    provider_name VARCHAR(150) NOT NULL,
    channel VARCHAR(30) NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP', 'SMS', 'OMNICHANNEL')),
    status VARCHAR(30) NOT NULL DEFAULT 'CONNECTED' CHECK (status IN ('CONNECTED', 'DEGRADED', 'DISCONNECTED', 'CONFIGURING')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    daily_quota INTEGER DEFAULT 50000,
    daily_usage INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}'::jsonb,
    last_health_check_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed core enterprise providers if not present
INSERT INTO public.communication_providers (provider_key, provider_name, channel, status, is_primary, daily_quota, daily_usage, config)
VALUES 
    ('HOSTINGER_SMTP', 'Hostinger Enterprise SMTP Relay', 'EMAIL', 'CONNECTED', true, 50000, 12840, '{"host":"s11777.bom1.stableserver.net","port":465,"security":"SSL","from_email":"noreply@joypeoplehr.com","from_name":"JOY PeopleHR System"}'::jsonb),
    ('META_WHATSAPP_CLOUD', 'Meta WhatsApp Cloud Business API v20.0', 'WHATSAPP', 'CONNECTED', true, 100000, 4280, '{"waba_id":"1550382319749383","phone_number_id":"1352826481241407","display_phone":"+91 90430 22330","quality":"GREEN","tier":"Tier 3"}'::jsonb),
    ('AIRTEL_IQ_SMS', 'Airtel IQ Prepaid SMS Gateway (DLT Compliant)', 'SMS', 'CONNECTED', true, 200000, 8120, '{"base_url":"https://iqsms.airtel.in/api/v1/send-prepaid-sms","sender_id":"JCSPRL","dlt_pe_id":"1001333025440167393","cost_per_sms":0.12,"balance":42850.50}'::jsonb)
ON CONFLICT (provider_key) DO UPDATE SET
    status = EXCLUDED.status,
    is_primary = EXCLUDED.is_primary,
    config = EXCLUDED.config,
    updated_at = now();

-- 3. Platform Event-to-Channel Centralized Routing Rules
CREATE TABLE IF NOT EXISTS public.communication_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Platform Global Default
    event_key VARCHAR(100) NOT NULL,
    event_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'HR_OPS',
    description TEXT,
    primary_channel VARCHAR(30) NOT NULL CHECK (primary_channel IN ('EMAIL', 'WHATSAPP', 'SMS')),
    fallback_channel VARCHAR(30) NOT NULL DEFAULT 'NONE' CHECK (fallback_channel IN ('EMAIL', 'WHATSAPP', 'SMS', 'NONE')),
    fallback_timeout_minutes INTEGER NOT NULL DEFAULT 5,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    allow_tenant_override BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_comm_routes_org_event UNIQUE(organization_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_comm_routes_event ON public.communication_routes(event_key);

-- Seed authoritative global routing rules (organization_id IS NULL)
INSERT INTO public.communication_routes (organization_id, event_key, event_name, category, description, primary_channel, fallback_channel, fallback_timeout_minutes, is_enabled, allow_tenant_override)
VALUES
    (NULL, 'EMPLOYEE_ONBOARDING', 'Employee Onboarding Welcome', 'ONBOARDING', 'Welcome email with employee portal credentials, KYC links, and company handbook.', 'EMAIL', 'SMS', 5, true, false),
    (NULL, 'OTP_VERIFICATION', 'OTP & MFA Verification', 'AUTH', 'High-priority time-sensitive login token or password reset 6-digit passcode.', 'SMS', 'WHATSAPP', 1, true, false),
    (NULL, 'PAYSLIP_GENERATED', 'Monthly Payslip Published', 'PAYROLL', 'Signed PDF salary statement with earnings, deductions, and PF/ESI breakdown.', 'EMAIL', 'WHATSAPP', 15, true, true),
    (NULL, 'LEAVE_APPROVAL', 'Leave Request Approved / Rejected', 'LEAVE', 'Instant notification on leave status changes with remaining balance counters.', 'WHATSAPP', 'EMAIL', 10, true, true),
    (NULL, 'SALARY_CREDITED', 'Salary Payment & Bank Credit', 'PAYROLL', 'Confirmation alert once payroll batch is settled and net salary is disbursed.', 'WHATSAPP', 'SMS', 5, true, true),
    (NULL, 'PASSWORD_RESET', 'Password Reset Request', 'AUTH', 'Security password reset link with 15-minute token expiry.', 'EMAIL', 'SMS', 2, true, false),
    (NULL, 'ATTENDANCE_ANOMALY', 'Attendance Missing Punch / Late Alert', 'ATTENDANCE', 'Daily alert when morning punch is missing or shift regularization is required.', 'WHATSAPP', 'SMS', 30, true, true),
    (NULL, 'BIOMETRIC_OFFLINE', 'Biometric Device Hardware Offline', 'HR_OPS', 'Critical alert to IT/HR admin when biometric machine heartbeat is lost.', 'SMS', 'EMAIL', 3, true, false)
ON CONFLICT (organization_id, event_key) DO UPDATE SET
    primary_channel = EXCLUDED.primary_channel,
    fallback_channel = EXCLUDED.fallback_channel,
    fallback_timeout_minutes = EXCLUDED.fallback_timeout_minutes,
    is_enabled = EXCLUDED.is_enabled,
    updated_at = now();

-- 4. Enable Row Level Security (RLS) & Realtime Publication
ALTER TABLE public.communication_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comm_providers_read_all" ON public.communication_providers;
CREATE POLICY "comm_providers_read_all" ON public.communication_providers
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "comm_routes_read_all" ON public.communication_routes;
CREATE POLICY "comm_routes_read_all" ON public.communication_routes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "comm_routes_admin_manage" ON public.communication_routes;
CREATE POLICY "comm_routes_admin_manage" ON public.communication_routes
FOR ALL TO authenticated USING (public.is_platform_admin() OR organization_id = (SELECT public.get_active_user_org_id()));

-- 5. Realtime Publication Registration
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_messages;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

COMMIT;

