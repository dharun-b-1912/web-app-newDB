-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 015
-- Target Project: ysiajemrqakfngasehhi
-- Description: Learning Management System (LMS) & Training Programs
-- ============================================================================

-- 1. Courses Catalog
CREATE TABLE IF NOT EXISTS public.lms_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT false,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_lms_courses_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_lms_courses_org ON public.lms_courses(organization_id);

-- 2. Course Enrollments & Certifications
CREATE TABLE IF NOT EXISTS public.lms_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    score NUMERIC(5, 2),
    status VARCHAR(32) NOT NULL DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    certificate_url TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_lms_enroll UNIQUE (course_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_enroll_emp ON public.lms_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_lms_enroll_org ON public.lms_enrollments(organization_id);
