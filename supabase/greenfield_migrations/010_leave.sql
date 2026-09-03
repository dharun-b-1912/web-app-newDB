-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 010
-- Target Project: ysiajemrqakfngasehhi
-- Description: Leave Management, Balances, Immutable Ledger & Holidays
-- ============================================================================

-- 1. Leave Types Catalog
CREATE TABLE IF NOT EXISTS public.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(32) NOT NULL,
    annual_quota NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    accrual_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (accrual_frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'NONE')),
    is_carry_forward_allowed BOOLEAN NOT NULL DEFAULT true,
    max_carry_forward_days NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    is_encashable BOOLEAN NOT NULL DEFAULT false,
    is_paid BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_leave_types_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_leave_types_org ON public.leave_types(organization_id);

-- 2. Leave Balances Live Snapshot
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
    calendar_year INTEGER NOT NULL,
    opening_balance NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    accrued NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    consumed NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    closing_balance NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_leave_bal_emp_year UNIQUE (employee_id, leave_type_id, calendar_year)
);

CREATE INDEX IF NOT EXISTS idx_leave_bal_org ON public.leave_balances(organization_id);

-- 3. Leave Requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4, 2) NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT false,
    reason TEXT NOT NULL,
    status public.leave_status_enum NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_req_emp ON public.leave_requests(employee_id, start_date);
CREATE INDEX IF NOT EXISTS idx_leave_req_org_status ON public.leave_requests(organization_id, status);

-- 4. Leave Ledger Entries (Immutable Financial-Grade Log)
CREATE TABLE IF NOT EXISTS public.leave_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
    leave_request_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL,
    entry_type VARCHAR(32) NOT NULL CHECK (entry_type IN ('ACCRUAL', 'CONSUMPTION', 'ADJUSTMENT', 'CARRY_FORWARD', 'ENCASHMENT', 'LAPSE')),
    units NUMERIC(5, 2) NOT NULL,
    running_balance_after NUMERIC(6, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_ledger_emp ON public.leave_ledger_entries(employee_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_leave_ledger_org ON public.leave_ledger_entries(organization_id);

-- 5. Organization Holidays
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    holiday_date DATE NOT NULL,
    is_restricted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holidays_org_date ON public.holidays(organization_id, holiday_date);
