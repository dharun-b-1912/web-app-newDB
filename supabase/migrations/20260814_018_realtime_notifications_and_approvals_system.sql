-- ============================================================================
-- Migration: 20260814_018_realtime_notifications_and_approvals_system.sql
-- Description: Production-Grade Multi-Tenant Realtime Notification & Approval Engine
--              Includes canonical events, multi-channel deliveries, outbox pattern,
--              push subscriptions, and source-of-truth business approvals.
-- ============================================================================

-- 1. Create notification_events Table (Canonical Notification Record)
CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    event_type TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('APPROVAL', 'SECURITY', 'INTEGRATION', 'PLATFORM', 'BILLING', 'SUPPORT', 'ATTENDANCE', 'PAYROLL', 'SYSTEM')),
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    actor_id UUID,
    actor_name TEXT,
    actor_avatar TEXT,
    resource_type TEXT,
    resource_id TEXT,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notif_events_org ON notification_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_notif_events_type ON notification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_notif_events_category ON notification_events(category);
CREATE INDEX IF NOT EXISTS idx_notif_events_severity ON notification_events(severity);
CREATE INDEX IF NOT EXISTS idx_notif_events_created ON notification_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_events_resource ON notification_events(resource_type, resource_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_events_idempotency ON notification_events(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Create notification_deliveries Table (Multi-Channel Delivery Ledger)
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notification_events(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP', 'SMS')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DELIVERED', 'READ', 'DISMISSED', 'FAILED', 'EXPIRED')),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_deliv_recipient_created ON notification_deliveries(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_deliv_recipient_read ON notification_deliveries(recipient_user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notif_deliv_notification ON notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_notif_deliv_status ON notification_deliveries(status);

-- 3. Create notification_preferences Table (User & Organization Preferences)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID,
    category TEXT NOT NULL CHECK (category IN ('APPROVAL', 'SECURITY', 'INTEGRATION', 'PLATFORM', 'BILLING', 'SUPPORT', 'ATTENDANCE', 'PAYROLL', 'SYSTEM')),
    channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP', 'SMS')),
    enabled BOOLEAN DEFAULT true,
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TEXT DEFAULT '22:00',
    quiet_hours_end TEXT DEFAULT '08:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_pref_user_cat_channel ON notification_preferences(user_id, category, channel);

-- 4. Create notification_templates Table (Versioned Message Templates)
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP', 'SMS')),
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_templates_type_channel ON notification_templates(event_type, channel, version);

-- 5. Create notification_outbox Table (Transactional Outbox Pattern)
CREATE TABLE IF NOT EXISTS notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER')),
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    available_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_outbox_status_available ON notification_outbox(status, available_at);
CREATE INDEX IF NOT EXISTS idx_notif_outbox_aggregate ON notification_outbox(aggregate_type, aggregate_id);

-- 6. Create push_subscriptions Table (Web Push API Endpoints)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    browser TEXT,
    os TEXT,
    device TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_sub_user_endpoint ON push_subscriptions(user_id, endpoint);

-- 7. Create approval_requests Table (Source-of-Truth Business Approvals)
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    type TEXT NOT NULL CHECK (type IN ('Leave', 'Expense', 'Travel', 'Document', 'ShiftChange', 'PayrollSignoff', 'RoleChange', 'AccessRequest')),
    title TEXT NOT NULL,
    details TEXT,
    amount_or_duration TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    requested_by_id UUID NOT NULL,
    requested_by_name TEXT NOT NULL,
    requested_by_email TEXT NOT NULL,
    requested_by_avatar TEXT DEFAULT '',
    department TEXT DEFAULT '',
    assigned_approver_id UUID,
    assigned_approver_role TEXT DEFAULT 'Manager',
    decision_comment TEXT,
    decided_at TIMESTAMPTZ,
    decided_by_id UUID,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_org_status ON approval_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_requested_by ON approval_requests(requested_by_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approval_requests(assigned_approver_id);
CREATE INDEX IF NOT EXISTS idx_approvals_created ON approval_requests(created_at DESC);

-- 8. Seed Default Notification Templates
INSERT INTO notification_templates (event_type, channel, subject_template, body_template, version)
VALUES
    -- Approvals
    ('leave.request.created', 'IN_APP', 'Leave Request from {{actor_name}}', '{{actor_name}} submitted a {{leave_type}} request for {{duration}}.', 1),
    ('leave.request.created', 'EMAIL', 'Action Required: Leave Request from {{actor_name}}', 'Hello, {{actor_name}} from {{department}} has requested {{duration}} of {{leave_type}} starting on {{start_date}}. Please review.', 1),
    ('expense.claim.created', 'IN_APP', 'Expense Claim from {{actor_name}}', '{{actor_name}} submitted an expense claim for {{amount}} ({{category}}).', 1),
    ('leave.request.approved', 'IN_APP', 'Leave Request Approved', 'Your leave request for {{duration}} has been approved by {{approver_name}}.', 1),
    ('leave.request.rejected', 'IN_APP', 'Leave Request Declined', 'Your leave request was declined. Reason: {{reason}}.', 1),
    -- Security
    ('security.suspicious_login', 'IN_APP', 'Suspicious Login Detected', 'New sign-in detected from {{city}}, {{country}} on {{browser}} ({{ip}}).', 1),
    ('security.suspicious_login', 'EMAIL', 'Security Alert: Suspicious Login Detected', 'We noticed a sign-in to your WorkForceOS account from {{city}}, {{country}} on {{browser}} at {{timestamp}}.', 1),
    ('security.mfa_changed', 'IN_APP', 'MFA Configuration Changed', 'Multi-factor authentication was updated on your account.', 1),
    -- Integrations
    ('integration.failed', 'IN_APP', 'Integration Connection Failed', '{{integration_name}} encountered a synchronization failure. Error: {{error_message}}.', 1),
    ('webhook.dead_letter', 'IN_APP', 'Webhook Delivery Failed', '{{count}} webhook events failed to deliver to {{endpoint}}.', 1),
    -- Platform
    ('platform.incident.created', 'IN_APP', 'Platform Incident Declared', 'Incident {{incident_code}}: {{title}} (Severity: {{severity}}).', 1),
    ('platform.maintenance.started', 'IN_APP', 'Scheduled Maintenance in Progress', 'Platform maintenance is underway. Minimal service degradation may occur.', 1),
    -- System
    ('job.completed', 'IN_APP', 'Background Job Completed', '{{job_name}} completed successfully in {{duration_ms}}ms.', 1),
    ('import.completed', 'IN_APP', 'Employee Import Completed', '{{record_count}} employee records were successfully imported.', 1)
ON CONFLICT DO NOTHING;

-- 9. Enable Row Level Security (RLS)
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
DROP POLICY IF EXISTS "Allow users to read their deliveries" ON notification_deliveries;
CREATE POLICY "Allow users to read their deliveries" ON notification_deliveries
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to update their deliveries" ON notification_deliveries;
CREATE POLICY "Allow users to update their deliveries" ON notification_deliveries
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow notification events read" ON notification_events;
CREATE POLICY "Allow notification events read" ON notification_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow notification events manage" ON notification_events;
CREATE POLICY "Allow notification events manage" ON notification_events
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow preferences manage" ON notification_preferences;
CREATE POLICY "Allow preferences manage" ON notification_preferences
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow push subscriptions manage" ON push_subscriptions;
CREATE POLICY "Allow push subscriptions manage" ON push_subscriptions
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow approval requests read" ON approval_requests;
CREATE POLICY "Allow approval requests read" ON approval_requests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow approval requests manage" ON approval_requests;
CREATE POLICY "Allow approval requests manage" ON approval_requests
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow outbox manage" ON notification_outbox;
CREATE POLICY "Allow outbox manage" ON notification_outbox
    FOR ALL USING (true);
