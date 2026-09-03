-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 014
-- Target Project: ysiajemrqakfngasehhi
-- Description: Performance Management, Goals, OKRs and Review Cycles
-- ============================================================================

-- 1. Performance Appraisal Cycles
CREATE TABLE IF NOT EXISTS public.performance_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'IN_REVIEW', 'COMPLETED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_cycles_org ON public.performance_cycles(organization_id);

-- 2. Performance Goals / OKRs / KPIs
CREATE TABLE IF NOT EXISTS public.performance_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    metric_type VARCHAR(32) NOT NULL DEFAULT 'PERCENTAGE' CHECK (metric_type IN ('PERCENTAGE', 'NUMERIC', 'MILESTONE', 'CURRENCY')),
    target_value NUMERIC(15, 2) NOT NULL DEFAULT 100.00,
    current_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    weightage INTEGER NOT NULL DEFAULT 20,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_goals_emp ON public.performance_goals(employee_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_perf_goals_org ON public.performance_goals(organization_id);

-- 3. Performance Reviews & 9-Box Coordinates
CREATE TABLE IF NOT EXISTS public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    reviewer_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    self_rating NUMERIC(3, 2),
    manager_rating NUMERIC(3, 2),
    final_normalized_score NUMERIC(3, 2),
    talent_matrix_box VARCHAR(50),
    feedback_summary TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'FINALIZED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_perf_review_cycle_emp UNIQUE (cycle_id, employee_id, reviewer_employee_id)
);

CREATE INDEX IF NOT EXISTS idx_perf_reviews_org ON public.performance_reviews(organization_id);
