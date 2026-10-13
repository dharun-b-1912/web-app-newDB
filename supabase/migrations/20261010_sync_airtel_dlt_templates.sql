-- ============================================================================
-- Migration: 20261010_sync_airtel_dlt_templates.sql
-- Description: Synchronize live approved Airtel DLT Templates, Header JCSPRL, 
--              and 19-digit TRAI DLT Template IDs & PE ID into public.communication_templates
-- ============================================================================

-- 1. Ensure table exists with correct schema
CREATE TABLE IF NOT EXISTS public.communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_key VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('WHATSAPP', 'SMS', 'VOICE')),
    provider VARCHAR(50) NOT NULL DEFAULT 'AIRTEL' CHECK (provider IN ('AIRTEL', 'META', 'TWILIO', 'CUSTOM')),
    dlt_template_id VARCHAR(100),
    dlt_pe_id VARCHAR(100),
    sender_id VARCHAR(20),
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

-- 2. Upsert approved Airtel DLT templates across all existing organizations
DO $$
DECLARE
    org_rec RECORD;
    pe_id CONSTANT VARCHAR(100) := '1001333025440167393';
BEGIN
    FOR org_rec IN SELECT id FROM public.organizations LOOP

        -- JOYHR_LOGIN_OTP / SMS_OTP (1077449880060256831)
        INSERT INTO public.communication_templates (
            organization_id, template_key, channel, provider, dlt_template_id, dlt_pe_id, sender_id, language, category, body_pattern, active, updated_at
        ) VALUES (
            org_rec.id, 'SMS_OTP', 'SMS', 'AIRTEL', '1077449880060256831', pe_id, 'JCSPRL', 'en', 'AUTHENTICATION',
            'Your login OTP for Joy PeopleHR is {{1}}. Valid for {{2}} minutes. Do not share this OTP with anyone. - Joy PeopleHR', true, now()
        )
        ON CONFLICT (organization_id, template_key, channel) 
        DO UPDATE SET 
            dlt_template_id = EXCLUDED.dlt_template_id,
            dlt_pe_id = EXCLUDED.dlt_pe_id,
            sender_id = EXCLUDED.sender_id,
            body_pattern = EXCLUDED.body_pattern,
            updated_at = now();

        -- JOYHR_ATTENDANCE_CHECKIN / SMS_CHECK_IN (1077076930061928891)
        INSERT INTO public.communication_templates (
            organization_id, template_key, channel, provider, dlt_template_id, dlt_pe_id, sender_id, language, category, body_pattern, active, updated_at
        ) VALUES (
            org_rec.id, 'SMS_CHECK_IN', 'SMS', 'AIRTEL', '1077076930061928891', pe_id, 'JCSPRL', 'en', 'UTILITY',
            'Dear {{1}}, your check-in has been recorded at {{2}} on {{3}}. Have a productive day! - Joy PeopleHR', true, now()
        )
        ON CONFLICT (organization_id, template_key, channel) 
        DO UPDATE SET 
            dlt_template_id = EXCLUDED.dlt_template_id,
            dlt_pe_id = EXCLUDED.dlt_pe_id,
            sender_id = EXCLUDED.sender_id,
            body_pattern = EXCLUDED.body_pattern,
            updated_at = now();

        -- JOYHR_ATTENDANCE_CHECKOUT / SMS_CHECK_OUT (1077188040062422070)
        INSERT INTO public.communication_templates (
            organization_id, template_key, channel, provider, dlt_template_id, dlt_pe_id, sender_id, language, category, body_pattern, active, updated_at
        ) VALUES (
            org_rec.id, 'SMS_CHECK_OUT', 'SMS', 'AIRTEL', '1077188040062422070', pe_id, 'JCSPRL', 'en', 'UTILITY',
            'Dear {{1}}, your check-out has been recorded at {{2}} today. Your total logged time is {{3}}. Status: Present. - Joy PeopleHR.', true, now()
        )
        ON CONFLICT (organization_id, template_key, channel) 
        DO UPDATE SET 
            dlt_template_id = EXCLUDED.dlt_template_id,
            dlt_pe_id = EXCLUDED.dlt_pe_id,
            sender_id = EXCLUDED.sender_id,
            body_pattern = EXCLUDED.body_pattern,
            updated_at = now();

        -- JOYHR_DAILY_ATTENDANCE_STATUS / SMS_DAILY_ATTENDANCE (1077017600060238275)
        INSERT INTO public.communication_templates (
            organization_id, template_key, channel, provider, dlt_template_id, dlt_pe_id, sender_id, language, category, body_pattern, active, updated_at
        ) VALUES (
            org_rec.id, 'SMS_DAILY_ATTENDANCE', 'SMS', 'AIRTEL', '1077017600060238275', pe_id, 'JCSPRL', 'en', 'UTILITY',
            'Dear {{1}}, your attendance status for {{2}} is marked as {{3}}. For queries, contact HR. Joy PeopleHR', true, now()
        )
        ON CONFLICT (organization_id, template_key, channel) 
        DO UPDATE SET 
            dlt_template_id = EXCLUDED.dlt_template_id,
            dlt_pe_id = EXCLUDED.dlt_pe_id,
            sender_id = EXCLUDED.sender_id,
            body_pattern = EXCLUDED.body_pattern,
            updated_at = now();

        -- JOYHR_ABSENT_PUNCH_ALERT / SMS_ABSENT_ALERT (1077182330060192197)
        INSERT INTO public.communication_templates (
            organization_id, template_key, channel, provider, dlt_template_id, dlt_pe_id, sender_id, language, category, body_pattern, active, updated_at
        ) VALUES (
            org_rec.id, 'SMS_ABSENT_ALERT', 'SMS', 'AIRTEL', '1077182330060192197', pe_id, 'JCSPRL', 'en', 'UTILITY',
            'Dear {{1}}, no punch was recorded for your shift on {{2}}. Please apply for regularization or leave on the app. - Joy PeopleHR', true, now()
        )
        ON CONFLICT (organization_id, template_key, channel) 
        DO UPDATE SET 
            dlt_template_id = EXCLUDED.dlt_template_id,
            dlt_pe_id = EXCLUDED.dlt_pe_id,
            sender_id = EXCLUDED.sender_id,
            body_pattern = EXCLUDED.body_pattern,
            updated_at = now();

        -- JOYHR_LEAVE_STATUS_UPDATE / SMS_LEAVE_STATUS (1077171710060293148)
        INSERT INTO public.communication_templates (
            organization_id, template_key, channel, provider, dlt_template_id, dlt_pe_id, sender_id, language, category, body_pattern, active, updated_at
        ) VALUES (
            org_rec.id, 'SMS_LEAVE_STATUS', 'SMS', 'AIRTEL', '1077171710060293148', pe_id, 'JCSPRL', 'en', 'UTILITY',
            'Dear {{1}}, your leave request for {{2}} has been {{3}}. Check details on the portal. - Joy PeopleHR', true, now()
        )
        ON CONFLICT (organization_id, template_key, channel) 
        DO UPDATE SET 
            dlt_template_id = EXCLUDED.dlt_template_id,
            dlt_pe_id = EXCLUDED.dlt_pe_id,
            sender_id = EXCLUDED.sender_id,
            body_pattern = EXCLUDED.body_pattern,
            updated_at = now();

        -- JOYHR_SALARY_PROCESSING_ALERT / SMS_SALARY_PROCESSING (1077377200060159599)
        INSERT INTO public.communication_templates (
            organization_id, template_key, channel, provider, dlt_template_id, dlt_pe_id, sender_id, language, category, body_pattern, active, updated_at
        ) VALUES (
            org_rec.id, 'SMS_SALARY_PROCESSING', 'SMS', 'AIRTEL', '1077377200060159599', pe_id, 'JCSPRL', 'en', 'UTILITY',
            'Dear {{1}}, your salary for the month of {{2}} is processed and will be credited to your registered bank account soon. - Joy PeopleHR', true, now()
        )
        ON CONFLICT (organization_id, template_key, channel) 
        DO UPDATE SET 
            dlt_template_id = EXCLUDED.dlt_template_id,
            dlt_pe_id = EXCLUDED.dlt_pe_id,
            sender_id = EXCLUDED.sender_id,
            body_pattern = EXCLUDED.body_pattern,
            updated_at = now();

        -- JOYHR_SALARY_CREDITED_SUCCESS / SMS_SALARY_CREDITED (1077195070060448349)
        INSERT INTO public.communication_templates (
            organization_id, template_key, channel, provider, dlt_template_id, dlt_pe_id, sender_id, language, category, body_pattern, active, updated_at
        ) VALUES (
            org_rec.id, 'SMS_SALARY_CREDITED', 'SMS', 'AIRTEL', '1077195070060448349', pe_id, 'JCSPRL', 'en', 'UTILITY',
            'Dear {{1}}, your salary for {{2}} has been credited. You can download your payslip from the JOY People HR application. - Joy PeopleHR', true, now()
        )
        ON CONFLICT (organization_id, template_key, channel) 
        DO UPDATE SET 
            dlt_template_id = EXCLUDED.dlt_template_id,
            dlt_pe_id = EXCLUDED.dlt_pe_id,
            sender_id = EXCLUDED.sender_id,
            body_pattern = EXCLUDED.body_pattern,
            updated_at = now();

        -- Welcome JCS / SMS_WELCOME (1007711994736460605)
        INSERT INTO public.communication_templates (
            organization_id, template_key, channel, provider, dlt_template_id, dlt_pe_id, sender_id, language, category, body_pattern, active, updated_at
        ) VALUES (
            org_rec.id, 'SMS_WELCOME', 'SMS', 'AIRTEL', '1007711994736460605', pe_id, 'JCSPRL', 'en', 'UTILITY',
            'Welcome to Joy Corporate Solutions, {{1}}! From now on your reporting manager is {{2}}. Have a great day', true, now()
        )
        ON CONFLICT (organization_id, template_key, channel) 
        DO UPDATE SET 
            dlt_template_id = EXCLUDED.dlt_template_id,
            dlt_pe_id = EXCLUDED.dlt_pe_id,
            sender_id = EXCLUDED.sender_id,
            body_pattern = EXCLUDED.body_pattern,
            updated_at = now();

    END LOOP;
END $$;
