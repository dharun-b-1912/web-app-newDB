-- ============================================================================
-- JOY PeopleHR — Migration 161
-- Unified MIS Report Recipients & WhatsApp Self-Service Access Control
-- Multi-Tenant Authorized Distribution & Delivery Audit Logs
-- ============================================================================

-- 1. Create table: mis_report_recipients
CREATE TABLE IF NOT EXISTS public.mis_report_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL, -- Normalized e.g. 919840209900 or 917825906580
    designation TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    role_type TEXT NOT NULL DEFAULT 'RECIPIENT', -- 'HR_LEAD', 'MANAGEMENT', 'SUPERVISOR', 'AUDITOR', 'RECIPIENT'
    
    -- Report Permissions
    permitted_report_types TEXT[] NOT NULL DEFAULT ARRAY['MORNING_CHECKIN', 'EVENING_FINAL'],
    -- Channel Permissions
    delivery_channels TEXT[] NOT NULL DEFAULT ARRAY['EMAIL', 'WHATSAPP'],
    
    -- Scheduled Delivery Preferences
    scheduled_morning BOOLEAN NOT NULL DEFAULT true,
    scheduled_evening BOOLEAN NOT NULL DEFAULT true,
    
    -- WhatsApp Bot Self-Service Permission
    allow_bot_self_service BOOLEAN NOT NULL DEFAULT true,
    
    -- Scope restriction: 'ORGANIZATION', 'DEPARTMENT', 'DIRECT_REPORTS'
    workforce_scope TEXT NOT NULL DEFAULT 'ORGANIZATION',
    
    -- Verification & Status
    is_verified BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    verified_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_mis_recipient_org_phone UNIQUE (organization_id, phone)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mis_recipients_org ON public.mis_report_recipients(organization_id);
CREATE INDEX IF NOT EXISTS idx_mis_recipients_phone ON public.mis_report_recipients(phone);
CREATE INDEX IF NOT EXISTS idx_mis_recipients_active ON public.mis_report_recipients(organization_id, is_active);

-- Enable RLS
ALTER TABLE public.mis_report_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mis_recipients_org_access"
    ON public.mis_report_recipients
    FOR ALL
    USING (
        organization_id = (
            SELECT COALESCE(
                (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'organization_id')::uuid,
                (SELECT organization_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
            )
        )
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        organization_id = (
            SELECT COALESCE(
                (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'organization_id')::uuid,
                (SELECT organization_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
            )
        )
        OR auth.role() = 'service_role'
    );

-- 2. Create table: mis_delivery_audit_logs
CREATE TABLE IF NOT EXISTS public.mis_delivery_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.mis_report_recipients(id) ON DELETE SET NULL,
    run_id TEXT,
    report_type TEXT NOT NULL, -- 'MORNING_CHECKIN', 'EVENING_FINAL', 'BIOMETRIC_AUDIT', etc.
    reporting_date DATE NOT NULL,
    cutoff_time TEXT,
    channel TEXT NOT NULL, -- 'EMAIL', 'WHATSAPP'
    recipient_target TEXT NOT NULL, -- Email address or Phone number
    recipient_name TEXT,
    dispatch_mode TEXT NOT NULL DEFAULT 'AUTOMATED_SCHEDULE', -- 'AUTOMATED_SCHEDULE', 'MANUAL_DISPATCH', 'BOT_SELF_SERVICE'
    
    -- Status progression
    status TEXT NOT NULL DEFAULT 'QUEUED', -- 'QUEUED', 'PROCESSING', 'PROVIDER_ACCEPTED', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED'
    provider TEXT, -- 'HOSTINGER_SMTP', 'RESEND_API', 'META_WHATSAPP_CLOUD'
    provider_message_id TEXT,
    sha256_checksum TEXT,
    file_name TEXT,
    document_url TEXT,
    error_message TEXT,
    
    -- Deduplication / idempotency
    idempotency_key TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit querying & idempotency
CREATE INDEX IF NOT EXISTS idx_mis_audit_org_date ON public.mis_delivery_audit_logs(organization_id, reporting_date, report_type);
CREATE INDEX IF NOT EXISTS idx_mis_audit_recipient ON public.mis_delivery_audit_logs(recipient_target, channel);
CREATE INDEX IF NOT EXISTS idx_mis_audit_idempotency ON public.mis_delivery_audit_logs(idempotency_key);

-- Enable RLS
ALTER TABLE public.mis_delivery_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mis_audit_org_access"
    ON public.mis_delivery_audit_logs
    FOR ALL
    USING (
        organization_id = (
            SELECT COALESCE(
                (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'organization_id')::uuid,
                (SELECT organization_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
            )
        )
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        organization_id = (
            SELECT COALESCE(
                (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'organization_id')::uuid,
                (SELECT organization_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
            )
        )
        OR auth.role() = 'service_role'
    );

-- 3. Initial Seeding for Joy Corporate Solutions (0c621892-e938-4707-9957-13534ea32c19)
-- 3a. Executive Leadership (Director) -> 919840209900
INSERT INTO public.mis_report_recipients (
    organization_id,
    name,
    email,
    phone,
    designation,
    role_type,
    permitted_report_types,
    delivery_channels,
    scheduled_morning,
    scheduled_evening,
    allow_bot_self_service,
    workforce_scope,
    is_verified,
    is_active
) VALUES (
    '0c621892-e938-4707-9957-13534ea32c19',
    'Executive Leadership (Director)',
    'thirumalai@joyglobalcorp.com',
    '919840209900',
    'Managing Director',
    'MANAGEMENT',
    ARRAY['MORNING_CHECKIN', 'EVENING_FINAL', 'BIOMETRIC_AUDIT', 'DEPARTMENT_SUMMARY'],
    ARRAY['EMAIL', 'WHATSAPP'],
    true,
    true,
    true,
    'ORGANIZATION',
    true,
    true
)
ON CONFLICT (organization_id, phone) DO UPDATE SET
    email = EXCLUDED.email,
    delivery_channels = EXCLUDED.delivery_channels,
    scheduled_morning = true,
    scheduled_evening = true,
    allow_bot_self_service = true,
    is_active = true;

-- 3b. Manager Praveen B (JMS-102) -> 917825906580
INSERT INTO public.mis_report_recipients (
    organization_id,
    employee_id,
    name,
    email,
    phone,
    designation,
    role_type,
    permitted_report_types,
    delivery_channels,
    scheduled_morning,
    scheduled_evening,
    allow_bot_self_service,
    workforce_scope,
    is_verified,
    is_active
) VALUES (
    '0c621892-e938-4707-9957-13534ea32c19',
    '55f486f8-e3aa-4133-9e85-dfc519ed2825', -- Praveen B ID
    'Praveen B',
    'praveen.b@joyglobalcorp.com',
    '917825906580',
    'Manager',
    'SUPERVISOR',
    ARRAY['MORNING_CHECKIN', 'EVENING_FINAL'],
    ARRAY['EMAIL', 'WHATSAPP'],
    true,
    true,
    true,
    'ORGANIZATION',
    true,
    true
)
ON CONFLICT (organization_id, phone) DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    delivery_channels = EXCLUDED.delivery_channels,
    scheduled_morning = true,
    scheduled_evening = true,
    allow_bot_self_service = true,
    is_active = true;
