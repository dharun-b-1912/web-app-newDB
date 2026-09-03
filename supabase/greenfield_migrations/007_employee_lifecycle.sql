-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 007
-- Target Project: ysiajemrqakfngasehhi
-- Description: Employee Lifecycle and Career Progression Events
-- ============================================================================

-- 1. Employee Onboarding Tracker
CREATE TABLE IF NOT EXISTS public.employee_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
    stage VARCHAR(32) NOT NULL DEFAULT 'PRE_JOINING' CHECK (stage IN ('PRE_JOINING', 'DOCUMENT_SUBMISSION', 'HR_VERIFICATION', 'COMPLETED')),
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    target_completion_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_onboarding_org ON public.employee_onboarding(organization_id);

-- 2. Employee Lifecycle Events (Historical Log)
CREATE TABLE IF NOT EXISTS public.employee_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('JOINING', 'PROBATION_CONFIRMATION', 'PROMOTION', 'TRANSFER', 'SALARY_REVISION', 'RESIGNATION', 'TERMINATION')),
    effective_date DATE NOT NULL,
    previous_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    remarks TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_events_emp_date ON public.employee_lifecycle_events(employee_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_emp_events_org ON public.employee_lifecycle_events(organization_id);

-- 3. Employee Separations & Resignations
CREATE TABLE IF NOT EXISTS public.employee_separations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    resignation_date DATE NOT NULL,
    requested_last_working_day DATE NOT NULL,
    approved_last_working_day DATE,
    reason_category VARCHAR(100) NOT NULL,
    reason_notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXIT_CLEARANCE_IN_PROGRESS', 'SETTLED')),
    exit_interview_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_separations_org ON public.employee_separations(organization_id, status);
