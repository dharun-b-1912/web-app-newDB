-- ==============================================================================
-- Migration: 20261022_157_universal_notification_rules.sql
-- Description: Universal Multi-Tenant Notification Rules Engine for Joy PeopleHR
-- Channels: IN_APP, EMAIL, WHATSAPP, SMS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    module TEXT NOT NULL, -- 'ATTENDANCE', 'LEAVE', 'PAYROLL', 'IAM', 'COMPLIANCE', 'OVERTIME'
    event_trigger TEXT NOT NULL, -- e.g. 'LEAVE_APPLIED', 'PUNCH_MISSING', 'PAYSLIP_PUBLISHED'
    description TEXT,
    
    -- Channel Toggles
    enable_in_app BOOLEAN NOT NULL DEFAULT true,
    enable_email BOOLEAN NOT NULL DEFAULT true,
    enable_whatsapp BOOLEAN NOT NULL DEFAULT false,
    enable_sms BOOLEAN NOT NULL DEFAULT false,
    
    -- Recipient Routing (Array of recipient types: 'EMPLOYEE', 'MANAGER', 'HR_HEAD', 'COMPANY_ADMIN', 'DEPT_HEAD')
    target_recipients TEXT[] NOT NULL DEFAULT '{"EMPLOYEE"}',
    specific_user_ids UUID[] DEFAULT '{}',
    
    -- Custom Notification Templates
    subject_template TEXT,
    body_template TEXT NOT NULL,
    whatsapp_template_name TEXT,
    sms_dlt_template_id TEXT,
    
    -- Delivery Controls
    priority TEXT NOT NULL DEFAULT 'NORMAL', -- 'HIGH', 'NORMAL', 'LOW'
    quiet_hours_respect BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_notification_rule_org_trigger UNIQUE(organization_id, event_trigger)
);

-- Index for speedy trigger lookups
CREATE INDEX IF NOT EXISTS idx_notification_rules_org_trigger ON public.notification_rules(organization_id, event_trigger);
CREATE INDEX IF NOT EXISTS idx_notification_rules_module ON public.notification_rules(organization_id, module);

-- Enable Row Level Security
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- Select policy: tenant isolation
DO $$
BEGIN
    DROP POLICY IF EXISTS "notification_rules_tenant_select" ON public.notification_rules;
    CREATE POLICY "notification_rules_tenant_select" ON public.notification_rules
        FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
            OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_profile_id IN (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()) AND r.code IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'COMPANY_ADMIN'))
            OR auth.uid() IS NULL -- allow service key / public reads when authenticated via server
        );
END $$;

-- Modification policy
DO $$
BEGIN
    DROP POLICY IF EXISTS "notification_rules_tenant_all" ON public.notification_rules;
    CREATE POLICY "notification_rules_tenant_all" ON public.notification_rules
        FOR ALL USING (
            organization_id = (SELECT organization_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
            OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_profile_id IN (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()) AND r.code IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'COMPANY_ADMIN'))
            OR auth.uid() IS NULL
        );
END $$;

-- Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notification_rules'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_rules;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping realtime publication for notification_rules: %', SQLERRM;
END $$;

-- Pre-seed standard pre-configured rules for Joy Corporate Solutions (0c621892-e938-4707-9957-13534ea32c19)
INSERT INTO public.notification_rules (
    organization_id, rule_name, module, event_trigger, description,
    enable_in_app, enable_email, enable_whatsapp, enable_sms,
    target_recipients, subject_template, body_template, priority, is_active
) VALUES 
(
    '0c621892-e938-4707-9957-13534ea32c19',
    'Leave Application Submitted',
    'LEAVE',
    'LEAVE_APPLIED',
    'Notifies reporting manager and HR head when an employee applies for leave.',
    true, true, true, false,
    '{"MANAGER", "HR_HEAD"}',
    'Leave Request: {{employee_name}} has applied for {{leave_type}}',
    'Hello {{manager_name}},\n\n{{employee_name}} ({{employee_code}}) has applied for {{leave_type}} from {{start_date}} to {{end_date}} ({{days}} day(s)).\nReason: {{reason}}\n\nPlease review and take action: {{action_url}}',
    'HIGH', true
),
(
    '0c621892-e938-4707-9957-13534ea32c19',
    'Leave Request Approved',
    'LEAVE',
    'LEAVE_APPROVED',
    'Notifies the employee immediately when their leave application is approved.',
    true, true, true, false,
    '{"EMPLOYEE"}',
    'Approved: Your {{leave_type}} request has been sanctioned',
    'Hello {{employee_name}},\n\nYour leave request for {{leave_type}} from {{start_date}} to {{end_date}} has been officially APPROVED by {{approver_name}}.\n\nEnjoy your time off!',
    'NORMAL', true
),
(
    '0c621892-e938-4707-9957-13534ea32c19',
    'Leave Request Rejected',
    'LEAVE',
    'LEAVE_REJECTED',
    'Notifies the employee if their leave application could not be approved.',
    true, true, true, false,
    '{"EMPLOYEE"}',
    'Update: Your {{leave_type}} request was not approved',
    'Hello {{employee_name}},\n\nYour leave request for {{leave_type}} from {{start_date}} to {{end_date}} was not approved by {{approver_name}}.\nRemarks: {{remarks}}\n\nFor queries, contact your People Operations desk.',
    'NORMAL', true
),
(
    '0c621892-e938-4707-9957-13534ea32c19',
    'Biometric Punch Late Arrival Alert',
    'ATTENDANCE',
    'PUNCH_LATE',
    'Notifies employee when a check-in is logged past the shift grace threshold.',
    true, true, false, false,
    '{"EMPLOYEE"}',
    'Attendance Notice: Late arrival recorded on {{date}}',
    'Hello {{employee_name}},\n\nA check-in punch was recorded at {{time}} on {{date}}, which is past the shift start threshold.\nShift scheduled: {{shift_start}}.\nIf regularization is required, apply here: {{action_url}}',
    'NORMAL', true
),
(
    '0c621892-e938-4707-9957-13534ea32c19',
    'Missing Check-Out Anomaly',
    'ATTENDANCE',
    'PUNCH_MISSING',
    'Alerts employee and manager when an active shift lacks an exit biometric punch.',
    true, true, true, false,
    '{"EMPLOYEE", "MANAGER"}',
    'Missing Punch: Exit swipe required for {{date}}',
    'Hello {{employee_name}},\n\nOur biometric system observed a missing check-out punch for your shift on {{date}}.\nPlease regularize your attendance punch before payroll cutoff: {{action_url}}',
    'NORMAL', true
),
(
    '0c621892-e938-4707-9957-13534ea32c19',
    'Monthly Payslip Published',
    'PAYROLL',
    'PAYSLIP_PUBLISHED',
    'Dispatches digital salary slip link and notification to employees upon payroll freeze.',
    true, true, true, true,
    '{"EMPLOYEE"}',
    'Payslip Ready: Your salary slip for {{month_year}} is published',
    'Hello {{employee_name}},\n\nYour encrypted digital payslip for {{month_year}} has been processed and published by Joy PeopleHR.\nNet Pay: {{net_pay}}\nDownload your official payslip here: {{action_url}}',
    'HIGH', true
),
(
    '0c621892-e938-4707-9957-13534ea32c19',
    'New Staff Member Onboarding Invitation',
    'IAM',
    'STAFF_INVITATION',
    'Sends enterprise invitation with secure single-use credential activation link.',
    false, true, true, false,
    '{"EMPLOYEE"}',
    'Invitation to join {{organization_name}} as {{role_name}} — Joy PeopleHR',
    'Hello {{recipient_name}},\n\nYou have been invited by {{invited_by}} to join {{organization_name}} on Joy PeopleHR as {{role_name}}.\nActivation URL: {{action_url}}\nSecurity Code: {{token}}',
    'HIGH', true
),
(
    '0c621892-e938-4707-9957-13534ea32c19',
    'Overtime Reconciliation Variance Alert',
    'OVERTIME',
    'OT_VARIANCE_DETECTED',
    'Alerts Operations lead and HR head when OT exceeds contractual thresholds.',
    true, true, true, false,
    '{"HR_HEAD", "COMPANY_ADMIN"}',
    'Overtime Alert: Variance logged for {{site_name}} ({{period}})',
    'Hello Operations & HR Team,\n\nAn overtime reconciliation variance was recorded for {{site_name}}.\nTotal OT Hours: {{ot_hours}} hrs across {{employee_count}} workers.\nReview audit recon sheet: {{action_url}}',
    'NORMAL', true
)
ON CONFLICT (organization_id, event_trigger) DO UPDATE SET
    rule_name = EXCLUDED.rule_name,
    module = EXCLUDED.module,
    description = EXCLUDED.description,
    enable_in_app = EXCLUDED.enable_in_app,
    enable_email = EXCLUDED.enable_email,
    enable_whatsapp = EXCLUDED.enable_whatsapp,
    enable_sms = EXCLUDED.enable_sms,
    target_recipients = EXCLUDED.target_recipients,
    subject_template = EXCLUDED.subject_template,
    body_template = EXCLUDED.body_template,
    priority = EXCLUDED.priority,
    is_active = EXCLUDED.is_active,
    updated_at = now();
