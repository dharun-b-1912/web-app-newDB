-- ============================================================================
-- Migration: 20261006_150_workforceos_communication_engine.sql
-- Target: Joy PeopleHR Enterprise Workforce Management
-- Description: Unified Employee Communication Engine (WhatsApp Rich + Airtel SMS DLT Fallback)
-- ============================================================================

-- 1. Extend Employees table with Communication & Phone Capability Attributes
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS communication_preference VARCHAR(50) DEFAULT 'WHATSAPP_SMS',
  ADD COLUMN IF NOT EXISTS phone_type VARCHAR(50) DEFAULT 'SMARTPHONE_WHATSAPP';

-- Constrain preferences and phone types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_emp_comm_preference') THEN
    ALTER TABLE public.employees ADD CONSTRAINT chk_emp_comm_preference 
      CHECK (communication_preference IN ('WHATSAPP', 'SMS', 'WHATSAPP_SMS', 'IVR', 'BIOMETRIC_ONLY'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_emp_phone_type') THEN
    ALTER TABLE public.employees ADD CONSTRAINT chk_emp_phone_type 
      CHECK (phone_type IN ('SMARTPHONE_WHATSAPP', 'SMARTPHONE_SMS', 'FEATURE_PHONE_SMS', 'UNKNOWN'));
  END IF;
END $$;

-- 2. Communication Templates (TRAI DLT & WhatsApp Template Governance)
CREATE TABLE IF NOT EXISTS public.communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_key VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('WHATSAPP', 'SMS', 'VOICE')),
    provider VARCHAR(50) NOT NULL DEFAULT 'AIRTEL' CHECK (provider IN ('AIRTEL', 'META', 'TWILIO', 'CUSTOM')),
    dlt_template_id VARCHAR(100), -- India TRAI DLT Content Template ID for Airtel SMS
    dlt_pe_id VARCHAR(100),       -- India TRAI Principal Entity ID
    sender_id VARCHAR(20),        -- Approved Header e.g. JOYHR, JOYCRP
    provider_template_id VARCHAR(150),
    language VARCHAR(10) DEFAULT 'en',
    category VARCHAR(50) DEFAULT 'UTILITY' CHECK (category IN ('AUTHENTICATION', 'UTILITY', 'MARKETING', 'SERVICE_EXPLICIT')),
    body_pattern TEXT NOT NULL,
    sample_values JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_comm_templates UNIQUE(organization_id, template_key, channel)
);

CREATE INDEX IF NOT EXISTS idx_comm_templates_org_key ON public.communication_templates(organization_id, template_key);
CREATE INDEX IF NOT EXISTS idx_comm_templates_channel ON public.communication_templates(channel, active);

-- 3. Communication Messages (Unified Audit Log & Delivery Trace with Fallback Linkage)
CREATE TABLE IF NOT EXISTS public.communication_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(30) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('WHATSAPP', 'SMS', 'VOICE')),
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN (
        'OTP',
        'CHECK_IN',
        'CHECK_OUT',
        'DAILY_ATTENDANCE',
        'LEAVE_STATUS',
        'REGULARIZATION',
        'ANNOUNCEMENT',
        'DOCUMENT_READY'
    )),
    template_key VARCHAR(100),
    dlt_template_id VARCHAR(100),
    provider VARCHAR(50) NOT NULL DEFAULT 'AIRTEL',
    provider_message_id VARCHAR(150),
    content_text TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(40) NOT NULL DEFAULT 'QUEUED' CHECK (status IN (
        'QUEUED',
        'SENT',
        'DELIVERED',
        'READ',
        'FAILED',
        'FALLBACK_INITIATED'
    )),
    failure_code VARCHAR(100),
    failure_reason TEXT,
    fallback_channel VARCHAR(20),
    fallback_message_id UUID REFERENCES public.communication_messages(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_messages_org_emp ON public.communication_messages(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_comm_messages_phone ON public.communication_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_comm_messages_status ON public.communication_messages(status);
CREATE INDEX IF NOT EXISTS idx_comm_messages_provider_id ON public.communication_messages(provider_message_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "comm_templates_select_policy" ON public.communication_templates;
DROP POLICY IF EXISTS "comm_templates_admin_policy" ON public.communication_templates;
DROP POLICY IF EXISTS "comm_messages_select_policy" ON public.communication_messages;
DROP POLICY IF EXISTS "comm_messages_insert_policy" ON public.communication_messages;

-- Templates: Selectable by authenticated users in the org
CREATE POLICY "comm_templates_select_policy" ON public.communication_templates
FOR SELECT TO authenticated
USING (
    organization_id = (SELECT public.get_active_user_org_id())
    OR (SELECT public.is_platform_admin())
);

-- Templates: Manageable by Platform / Org Admins
CREATE POLICY "comm_templates_admin_policy" ON public.communication_templates
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR public.is_org_admin(organization_id)
);

-- Messages: Selectable by authenticated users in the org
CREATE POLICY "comm_messages_select_policy" ON public.communication_messages
FOR SELECT TO authenticated
USING (
    organization_id = (SELECT public.get_active_user_org_id())
    OR (SELECT public.is_platform_admin())
);

-- Messages: Insertable by service roles or authenticated users in the org
CREATE POLICY "comm_messages_insert_policy" ON public.communication_messages
FOR INSERT TO authenticated
WITH CHECK (
    organization_id = (SELECT public.get_active_user_org_id())
    OR (SELECT public.is_platform_admin())
);

-- 5. Seed Core Communication Templates
INSERT INTO public.communication_templates (
    organization_id,
    template_key,
    channel,
    provider,
    dlt_template_id,
    sender_id,
    language,
    category,
    body_pattern,
    active
)
SELECT 
    org.id,
    t.template_key,
    t.channel,
    t.provider,
    t.dlt_template_id,
    t.sender_id,
    t.language,
    t.category,
    t.body_pattern,
    true
FROM public.organizations org
CROSS JOIN (
    VALUES
    -- Authentication
    ('WA_OTP', 'WHATSAPP', 'AIRTEL', NULL, 'JOYHR', 'en', 'AUTHENTICATION', 'JOY PeopleHR: Your verification code is {{1}}. This code expires in {{2}} minutes. Do not share this code with anyone.'),
    ('SMS_OTP', 'SMS', 'AIRTEL', '1407169000000001001', 'JOYHR', 'en', 'AUTHENTICATION', 'Your JOY PeopleHR verification code is {{1}}. It is valid for {{2}} minutes. Do not share this code with anyone.'),

    -- Attendance Check-In
    ('WA_CHECK_IN', 'WHATSAPP', 'AIRTEL', NULL, 'JOYHR', 'en', 'UTILITY', '✅ *Attendance Checked In*\n\nHello {{1}},\nYour attendance has been recorded.\n\n📅 *Date:* {{2}}\n🕐 *Check-in:* {{3}}\n🏢 *Company:* {{4}}\n\n*Status:* Present\nHave a productive day! — *JOY PeopleHR*'),
    ('SMS_CHECK_IN', 'SMS', 'AIRTEL', '1407169000000001002', 'JOYHR', 'en', 'UTILITY', 'JOY PeopleHR: Attendance recorded for {{1}}. Check-in: {{2}}. Date: {{3}}. Status: Present.'),

    -- Attendance Check-Out
    ('WA_CHECK_OUT', 'WHATSAPP', 'AIRTEL', NULL, 'JOYHR', 'en', 'UTILITY', '✅ *Attendance Checked Out*\n\nHello {{1}},\nYour workday has been completed.\n\n📅 *Date:* {{2}}\n🟢 *Check-in:* {{3}}\n🔴 *Check-out:* {{4}}\n⏱️ *Working time:* {{5}}\n\n*Attendance:* Present — *JOY PeopleHR*'),
    ('SMS_CHECK_OUT', 'SMS', 'AIRTEL', '1407169000000001003', 'JOYHR', 'en', 'UTILITY', 'JOY PeopleHR: Check-out recorded. In: {{1}} | Out: {{2}} | Hours: {{3}} | Date: {{4}}.'),

    -- Daily Attendance Summary
    ('WA_DAILY_ATTENDANCE', 'WHATSAPP', 'AIRTEL', NULL, 'JOYHR', 'en', 'UTILITY', '📊 *Daily Attendance Summary*\n\n👤 *Employee:* {{1}}\n📅 *Date:* {{2}}\n🟢 *Check-in:* {{3}}\n🔴 *Check-out:* {{4}}\n⏱️ *Working Hours:* {{5}}\n📋 *Attendance:* {{6}}\n\nThank you, *JOY PeopleHR*'),
    ('SMS_DAILY_ATTENDANCE', 'SMS', 'AIRTEL', '1407169000000001004', 'JOYHR', 'en', 'UTILITY', 'JOY PeopleHR: {{1}} | In: {{2}} | Out: {{3}} | Hours: {{4}} | Status: {{5}}.')
) AS t(template_key, channel, provider, dlt_template_id, sender_id, language, category, body_pattern)
ON CONFLICT (organization_id, template_key, channel) DO NOTHING;
