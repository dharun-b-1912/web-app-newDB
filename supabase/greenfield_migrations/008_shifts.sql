-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 008
-- Target Project: ysiajemrqakfngasehhi
-- Description: Shifts, Rostering and Work Schedules
-- ============================================================================

-- 1. Shifts Master
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(32) NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    grace_entry_minutes INTEGER NOT NULL DEFAULT 15,
    grace_exit_minutes INTEGER NOT NULL DEFAULT 15,
    min_half_day_hours NUMERIC(4, 2) NOT NULL DEFAULT 4.00,
    min_full_day_hours NUMERIC(4, 2) NOT NULL DEFAULT 8.00,
    is_overnight BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_shifts_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shifts_org ON public.shifts(organization_id);

-- 2. Employee Shift Assignments
CREATE TABLE IF NOT EXISTS public.employee_shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    valid_from DATE NOT NULL,
    valid_to DATE,
    weekly_offs INTEGER[] NOT NULL DEFAULT '{0, 6}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_shifts_emp_valid ON public.employee_shift_assignments(employee_id, valid_from);
CREATE INDEX IF NOT EXISTS idx_emp_shifts_org ON public.employee_shift_assignments(organization_id);
