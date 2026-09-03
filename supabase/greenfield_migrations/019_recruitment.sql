-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 019
-- Target Project: ysiajemrqakfngasehhi
-- Description: Talent Acquisition, Job Requisitions & Applicant Tracking
-- ============================================================================

-- 1. Job Openings / Career Requisitions
CREATE TABLE IF NOT EXISTS public.job_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    requisition_code VARCHAR(50) NOT NULL,
    vacancies_count INTEGER NOT NULL DEFAULT 1,
    experience_years_required NUMERIC(3, 1),
    job_description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_job_openings_org_code UNIQUE (organization_id, requisition_code)
);

CREATE INDEX IF NOT EXISTS idx_job_openings_org ON public.job_openings(organization_id);

-- 2. Job Applicants Pipeline
CREATE TABLE IF NOT EXISTS public.job_applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    job_opening_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
    candidate_name VARCHAR(150) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    candidate_phone VARCHAR(30),
    resume_url TEXT,
    stage VARCHAR(32) NOT NULL DEFAULT 'APPLIED' CHECK (stage IN ('APPLIED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'OFFER_EXTENDED', 'HIRED', 'REJECTED')),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applicants_job_stage ON public.job_applicants(job_opening_id, stage);
CREATE INDEX IF NOT EXISTS idx_applicants_org ON public.job_applicants(organization_id);
