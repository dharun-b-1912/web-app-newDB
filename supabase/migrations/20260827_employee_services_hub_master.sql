-- ============================================================================
-- 20260827_employee_services_hub_master.sql
-- WorkForceOS Enterprise HRMS — Production Employee Services & More Module Engine
-- Tables: employee_service_configs, shift_rosters, expense_claims, digital_letters,
-- announcements, and employee_grievances with Multi-Tenant Support
-- ============================================================================

-- 1. EMPLOYEE SERVICE CONFIGURATIONS (Controls visibility & workflows per tenant)
CREATE TABLE IF NOT EXISTS public.employee_service_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    service_id VARCHAR(50) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    subtitle VARCHAR(150),
    icon_name VARCHAR(50),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_visible_to_employee BOOLEAN NOT NULL DEFAULT true,
    allowed_roles JSONB NOT NULL DEFAULT '["EMPLOYEE", "MANAGER", "HR_ADMIN"]'::jsonb,
    workflow_type VARCHAR(50) DEFAULT 'STANDARD',
    badge_type VARCHAR(50) DEFAULT 'PENDING_COUNT',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_service UNIQUE (tenant_id, service_id)
);

-- Seed default services if not existing
INSERT INTO public.employee_service_configs (tenant_id, organization_id, service_id, service_name, subtitle, icon_name, sort_order)
VALUES 
    ('org-joy-01', 'org-joy-01', 'roster', 'Shift Roster', 'Weekly schedule', 'square_grid_2x2', 1),
    ('org-joy-01', 'org-joy-01', 'payslip', 'Payslips & Form 16', 'Salary statements', 'doc_text', 2),
    ('org-joy-01', 'org-joy-01', 'expense', 'Expense Claims', 'Reimbursements', 'money_dollar_circle', 3),
    ('org-joy-01', 'org-joy-01', 'letters', 'Digital Letters', 'HR & Offer letters', 'rosette', 4),
    ('org-joy-01', 'org-joy-01', 'docs', 'Documents', 'Company & Personal', 'folder', 5),
    ('org-joy-01', 'org-joy-01', 'okrs', 'Performance & Goals', 'Quarterly OKRs', 'scope', 6),
    ('org-joy-01', 'org-joy-01', 'announcements', 'Communication', 'Company Broadcasts', 'speaker_2', 7),
    ('org-joy-01', 'org-joy-01', 'complaint', 'Grievance / Complaint', 'HR Support tickets', 'exclamationmark_triangle', 8)
ON CONFLICT (tenant_id, service_id) DO NOTHING;

-- 2. SHIFT ROSTER & ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.shift_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    employee_id VARCHAR(64) NOT NULL,
    employee_code VARCHAR(50),
    employee_name VARCHAR(150),
    work_date DATE NOT NULL,
    shift_id VARCHAR(64),
    shift_code VARCHAR(50) NOT NULL DEFAULT 'GEN-09',
    shift_name VARCHAR(100) NOT NULL DEFAULT 'General Shift',
    start_time VARCHAR(20) NOT NULL DEFAULT '09:30 AM',
    end_time VARCHAR(20) NOT NULL DEFAULT '06:30 PM',
    duration_hours NUMERIC(4,2) NOT NULL DEFAULT 9.00,
    break_duration_minutes INTEGER NOT NULL DEFAULT 60,
    location_name VARCHAR(150) NOT NULL DEFAULT 'Joy Corporate Solutions Private Limited (HQ)',
    shift_type VARCHAR(50) NOT NULL DEFAULT 'REGULAR',
    is_weekly_off BOOLEAN NOT NULL DEFAULT false,
    is_holiday BOOLEAN NOT NULL DEFAULT false,
    holiday_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_emp_roster_date UNIQUE (tenant_id, employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_roster_emp_date ON public.shift_rosters(employee_id, work_date);

-- 3. EXPENSE CLAIMS TABLE
CREATE TABLE IF NOT EXISTS public.expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(50) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    employee_id VARCHAR(64) NOT NULL,
    employee_code VARCHAR(50),
    employee_name VARCHAR(150),
    department VARCHAR(100),
    category VARCHAR(50) NOT NULL, -- TRAVEL, FOOD, LODGING, CLIENT_MEETING, TOOLS, OTHER
    amount NUMERIC(12, 2) NOT NULL,
    approved_amount NUMERIC(12, 2),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    receipt_url TEXT,
    receipt_filename VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('DRAFT', 'PENDING', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED', 'REIMBURSED')),
    approver_id VARCHAR(64),
    approver_name VARCHAR(150),
    approver_comment TEXT,
    rejection_reason TEXT,
    reimbursement_date DATE,
    reimbursement_reference VARCHAR(100),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_claim_number UNIQUE (tenant_id, claim_number)
);

CREATE INDEX IF NOT EXISTS idx_claims_emp_status ON public.expense_claims(employee_id, status);

-- 4. DIGITAL LETTERS TABLE
CREATE TABLE IF NOT EXISTS public.digital_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    letter_number VARCHAR(50) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    employee_id VARCHAR(64) NOT NULL,
    employee_code VARCHAR(50),
    employee_name VARCHAR(150),
    letter_type VARCHAR(50) NOT NULL, -- OFFER, APPOINTMENT, PROMOTION, INCREMENT, EXPERIENCE, RELIEVING, WARNING
    title VARCHAR(200) NOT NULL,
    description TEXT,
    document_url TEXT,
    file_size_bytes BIGINT,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_date DATE,
    requires_signature BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED'
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'ACKNOWLEDGED', 'SIGNED', 'REVOKED')),
    acknowledged_at TIMESTAMPTZ,
    signature_data TEXT,
    signed_at TIMESTAMPTZ,
    issued_by_id VARCHAR(64),
    issued_by_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_letter_num UNIQUE (tenant_id, letter_number)
);

CREATE INDEX IF NOT EXISTS idx_letters_emp_status ON public.digital_letters(employee_id, status);

-- 5. COMPANY ANNOUNCEMENTS & BROADCASTS TABLE
CREATE TABLE IF NOT EXISTS public.company_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    title VARCHAR(250) NOT NULL,
    summary TEXT NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'COMPANY_NEWS', -- COMPANY_NEWS, HR_POLICY, EVENT, URGENT_ALERT
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    target_scope VARCHAR(50) NOT NULL DEFAULT 'ALL', -- ALL, DEPARTMENT, LOCATION
    target_department VARCHAR(100),
    target_location VARCHAR(150),
    published_by_name VARCHAR(150) NOT NULL DEFAULT 'HR Department',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    banner_url TEXT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. EMPLOYEE GRIEVANCES / COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS public.employee_grievances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    employee_id VARCHAR(64) NOT NULL,
    employee_code VARCHAR(50),
    employee_name VARCHAR(150),
    department VARCHAR(100),
    category VARCHAR(50) NOT NULL, -- WORKPLACE, MANAGER, PAYROLL, ATTENDANCE, LEAVE, HARASSMENT, FACILITIES, OTHER
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    subject VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    attachment_url TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED'
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'CLOSED', 'REJECTED')),
    assigned_hr_id VARCHAR(64),
    assigned_hr_name VARCHAR(150),
    hr_notes TEXT, -- Confidential
    resolution_summary TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_grievance_ticket UNIQUE (tenant_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_grievances_emp_status ON public.employee_grievances(employee_id, status);

-- 7. ROW LEVEL SECURITY (Direct top-level policies to avoid lock conflicts)
ALTER TABLE public.employee_service_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to employee_service_configs" ON public.employee_service_configs;
CREATE POLICY "Public access to employee_service_configs" ON public.employee_service_configs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.shift_rosters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to shift_rosters" ON public.shift_rosters;
CREATE POLICY "Public access to shift_rosters" ON public.shift_rosters FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to expense_claims" ON public.expense_claims;
CREATE POLICY "Public access to expense_claims" ON public.expense_claims FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.digital_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to digital_letters" ON public.digital_letters;
CREATE POLICY "Public access to digital_letters" ON public.digital_letters FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.company_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to company_announcements" ON public.company_announcements;
CREATE POLICY "Public access to company_announcements" ON public.company_announcements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.employee_grievances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to employee_grievances" ON public.employee_grievances;
CREATE POLICY "Public access to employee_grievances" ON public.employee_grievances FOR ALL USING (true) WITH CHECK (true);
