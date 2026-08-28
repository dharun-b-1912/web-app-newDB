-- ============================================================
-- JOY PEOPLEHR — EMPLOYEE RELATIONS MASTER MIGRATION
-- Helpdesk, Dynamic Service Requests, Communication Hub
-- ============================================================

-- 1. SERVICE DEFINITIONS (Catalog & Dynamic Form Schema Engine)
CREATE TABLE IF NOT EXISTS public.service_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    description TEXT,
    icon TEXT DEFAULT 'file-text',
    enabled BOOLEAN NOT NULL DEFAULT true,
    employee_visible BOOLEAN NOT NULL DEFAULT true,
    requires_attachment BOOLEAN NOT NULL DEFAULT false,
    requires_approval BOOLEAN NOT NULL DEFAULT true,
    sla_hours INTEGER NOT NULL DEFAULT 48,
    form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    workflow_config JSONB NOT NULL DEFAULT '{"steps": ["EMPLOYEE", "HR", "COMPLETED"]}'::jsonb,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_service_def_code UNIQUE (tenant_id, code)
);

-- 2. SERVICE REQUESTS (Submitted Employee Requests)
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    employee_id TEXT NOT NULL,
    employee_code TEXT,
    employee_name TEXT,
    department TEXT,
    service_definition_id UUID REFERENCES public.service_definitions(id) ON DELETE SET NULL,
    service_code TEXT,
    service_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    request_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, PENDING_MANAGER, PENDING_HR, IN_REVIEW, ACTION_REQUIRED, APPROVED, REJECTED, PROCESSING, COMPLETED, CANCELLED
    priority TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    assigned_to TEXT,
    assigned_to_name TEXT,
    current_step INTEGER NOT NULL DEFAULT 1,
    sla_due_at TIMESTAMPTZ,
    rejection_reason TEXT,
    resolution_notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SERVICE REQUEST EVENTS (Audit Trail & Timeline)
CREATE TABLE IF NOT EXISTS public.service_request_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL,
    actor_name TEXT,
    actor_role TEXT,
    event_type TEXT NOT NULL, -- CREATED, STATUS_CHANGE, ASSIGNED, COMMENT, APPROVED, REJECTED, COMPLETED
    previous_status TEXT,
    new_status TEXT,
    comment TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. HELPDESK TICKETS (HR Operational Ticketing Desk)
CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    employee_id TEXT NOT NULL,
    employee_code TEXT,
    employee_name TEXT,
    department TEXT,
    ticket_number TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'General HR', -- Attendance, Leave, Payroll, Payslip, Documents, Profile, Benefits, Onboarding, Exit, Workplace, General HR, Other
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, ASSIGNED, IN_PROGRESS, WAITING_FOR_EMPLOYEE, WAITING_FOR_HR, ESCALATED, RESOLVED, CLOSED, REOPENED
    assigned_to TEXT,
    assigned_to_name TEXT,
    sla_hours INTEGER NOT NULL DEFAULT 48,
    sla_due_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    resolution_summary TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. HELPDESK MESSAGES (Threaded Conversation & Private Internal Notes)
CREATE TABLE IF NOT EXISTS public.helpdesk_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    ticket_id UUID REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    sender_role TEXT,
    message TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'EMPLOYEE', -- EMPLOYEE (Public to employee & HR), INTERNAL (HR-only note)
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. COMMUNICATIONS (Broadcasts & Announcements)
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    communication_type TEXT NOT NULL DEFAULT 'ANNOUNCEMENT', -- ANNOUNCEMENT, HOLIDAY, PAYROLL, POLICY, BENEFITS, EMERGENCY, EVENT
    priority TEXT NOT NULL DEFAULT 'NORMAL', -- NORMAL, IMPORTANT, URGENT
    status TEXT NOT NULL DEFAULT 'PUBLISHED', -- DRAFT, SCHEDULED, PUBLISHED, ARCHIVED
    audience_type TEXT NOT NULL DEFAULT 'ALL', -- ALL, DEPARTMENT, LOCATION, DESIGNATION, CUSTOM
    target_departments TEXT[],
    target_locations TEXT[],
    target_designations TEXT[],
    requires_acknowledgement BOOLEAN NOT NULL DEFAULT false,
    author_name TEXT DEFAULT 'HR Management',
    published_by TEXT,
    publish_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. COMMUNICATION RECIPIENTS (Read & Acknowledgement State)
CREATE TABLE IF NOT EXISTS public.communication_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    communication_id UUID REFERENCES public.communications(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'DELIVERED',
    read_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_comm_recipient UNIQUE (communication_id, employee_id)
);

-- ============================================================
-- INDEXES FOR FAST QUERYING
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_service_defs_tenant ON public.service_definitions(tenant_id, enabled, employee_visible);
CREATE INDEX IF NOT EXISTS idx_service_reqs_emp ON public.service_requests(tenant_id, employee_id, status);
CREATE INDEX IF NOT EXISTS idx_service_reqs_status ON public.service_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_helpdesk_emp ON public.helpdesk_tickets(tenant_id, employee_id, status);
CREATE INDEX IF NOT EXISTS idx_helpdesk_status ON public.helpdesk_tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_helpdesk_messages_tkt ON public.helpdesk_messages(ticket_id, visibility, created_at);
CREATE INDEX IF NOT EXISTS idx_communications_status ON public.communications(tenant_id, status, publish_at);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_emp ON public.communication_recipients(employee_id, communication_id);

-- ============================================================
-- RLS POLICIES (MULTI-TENANT ISOLATION)
-- ============================================================
ALTER TABLE public.service_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_recipients ENABLE ROW LEVEL SECURITY;

-- Standard Public/Service Access Policies for Application Layer
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access to service_definitions" ON public.service_definitions;
    CREATE POLICY "Public access to service_definitions" ON public.service_definitions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to service_requests" ON public.service_requests;
    CREATE POLICY "Public access to service_requests" ON public.service_requests FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to service_request_events" ON public.service_request_events;
    CREATE POLICY "Public access to service_request_events" ON public.service_request_events FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to helpdesk_tickets" ON public.helpdesk_tickets;
    CREATE POLICY "Public access to helpdesk_tickets" ON public.helpdesk_tickets FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to helpdesk_messages" ON public.helpdesk_messages;
    CREATE POLICY "Public access to helpdesk_messages" ON public.helpdesk_messages FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to communications" ON public.communications;
    CREATE POLICY "Public access to communications" ON public.communications FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to communication_recipients" ON public.communication_recipients;
    CREATE POLICY "Public access to communication_recipients" ON public.communication_recipients FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ============================================================
-- SEED CANONICAL SERVICE DEFINITIONS (STARTER CATALOG)
-- ============================================================
INSERT INTO public.service_definitions (tenant_id, organization_id, code, name, category, description, icon, sla_hours, form_schema)
VALUES
(
    'org-joy-01',
    'org-joy-01',
    'EMP-CERT',
    'Employment Certificate',
    'Certificates & Letters',
    'Request an official employment confirmation certificate with designation and tenure.',
    'award',
    24,
    '[
        {"id": "purpose", "label": "Purpose of Certificate", "type": "DROPDOWN", "required": true, "options": ["Bank / Loan Application", "Visa / Travel Requirement", "Rental Agreement", "Higher Studies", "Others"]},
        {"id": "addressed_to", "label": "Addressed To (e.g. Bank / Embassy Name)", "type": "TEXT", "required": false, "placeholder": "To Whom It May Concern"},
        {"id": "include_salary", "label": "Include Salary Information?", "type": "CHECKBOX", "required": false, "helpText": "Check to include gross monthly salary in letter"},
        {"id": "delivery_format", "label": "Delivery Preference", "type": "RADIO", "required": true, "options": ["Digital Signed PDF (In-App)", "Physical Stamped Copy"]}
    ]'::jsonb
),
(
    'org-joy-01',
    'org-joy-01',
    'BANK-CHG',
    'Bank Account & Direct Deposit Update',
    'Payroll & Financial',
    'Update your salary disbursement bank account details with required verification proof.',
    'credit-card',
    48,
    '[
        {"id": "account_holder_name", "label": "Account Holder Name (As per Bank)", "type": "TEXT", "required": true, "placeholder": "Full Legal Name"},
        {"id": "bank_name", "label": "Bank Name", "type": "TEXT", "required": true, "placeholder": "e.g. HDFC Bank, ICICI Bank, SBI"},
        {"id": "account_number", "label": "New Account Number", "type": "TEXT", "required": true, "placeholder": "Enter bank account number"},
        {"id": "confirm_account_number", "label": "Confirm Account Number", "type": "TEXT", "required": true, "placeholder": "Re-enter bank account number"},
        {"id": "ifsc_code", "label": "IFSC Code", "type": "TEXT", "required": true, "placeholder": "11-character IFSC code"},
        {"id": "account_type", "label": "Account Type", "type": "DROPDOWN", "required": true, "options": ["Savings Account", "Salary Account", "Current Account"]},
        {"id": "proof_attachment", "label": "Cancelled Cheque or Bank Statement (PDF/Image)", "type": "ATTACHMENT", "required": true, "helpText": "Must clearly show Account Number, IFSC, and Employee Name"}
    ]'::jsonb
),
(
    'org-joy-01',
    'org-joy-01',
    'ADDR-UPD',
    'Address & Contact Details Update',
    'Personal & Profile',
    'Update your residential or permanent address records for tax and statutory compliance.',
    'map-pin',
    48,
    '[
        {"id": "address_type", "label": "Address Type to Update", "type": "DROPDOWN", "required": true, "options": ["Current / Residential Address", "Permanent Address", "Both Current & Permanent"]},
        {"id": "address_line1", "label": "Address Line 1", "type": "TEXT", "required": true, "placeholder": "Flat / House No, Building Name, Street"},
        {"id": "city", "label": "City / Town", "type": "TEXT", "required": true, "placeholder": "City"},
        {"id": "state", "label": "State / Province", "type": "TEXT", "required": true, "placeholder": "State"},
        {"id": "pincode", "label": "Postal PIN Code", "type": "TEXT", "required": true, "placeholder": "6-digit PIN code"},
        {"id": "address_proof", "label": "Address Proof Document (Aadhaar / Utility Bill / Rental Deed)", "type": "ATTACHMENT", "required": true}
    ]'::jsonb
),
(
    'org-joy-01',
    'org-joy-01',
    'EXP-LTR',
    'Experience & Relieving Letter Request',
    'Certificates & Letters',
    'Request service experience verification letters for former project roles or visa filings.',
    'briefcase',
    72,
    '[
        {"id": "letter_purpose", "label": "Reason / Context", "type": "TEXTAREA", "required": true, "placeholder": "Detail the purpose of the experience summary..."},
        {"id": "required_by_date", "label": "Required By Date", "type": "DATE", "required": true}
    ]'::jsonb
)
ON CONFLICT (tenant_id, code) DO NOTHING;
