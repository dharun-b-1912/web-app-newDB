-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 017
-- Target Project: ysiajemrqakfngasehhi
-- Description: Employee Requests, Service Catalog & POSH Inquiries
-- ============================================================================

-- 1. Employee Requests & Helpdesk Tickets
CREATE TABLE IF NOT EXISTS public.employee_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_requests_org_status ON public.employee_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_emp_requests_emp ON public.employee_requests(employee_id);

-- 2. POSH & Grievance Cases (Confidential Investigation Vault)
CREATE TABLE IF NOT EXISTS public.posh_and_grievance_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    case_number VARCHAR(50) NOT NULL UNIQUE,
    complainant_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    respondent_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    incident_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'UNDER_INVESTIGATION',
    presiding_officer_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    findings_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posh_org ON public.posh_and_grievance_cases(organization_id);
