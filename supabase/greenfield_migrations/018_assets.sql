-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 018
-- Target Project: ysiajemrqakfngasehhi
-- Description: Company Assets Inventory & Allocation Ledger
-- ============================================================================

-- 1. Assets Inventory Master
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    asset_code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('HARDWARE', 'SOFTWARE_LICENSE', 'FURNITURE', 'VEHICLE', 'KEY_CARD')),
    serial_number VARCHAR(100),
    purchase_date DATE,
    purchase_cost NUMERIC(15, 2),
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_assets_org_code UNIQUE (organization_id, asset_code)
);

CREATE INDEX IF NOT EXISTS idx_assets_org ON public.assets(organization_id);

-- 2. Asset Allocation & Return History
CREATE TABLE IF NOT EXISTS public.asset_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    returned_date DATE,
    condition_on_assignment TEXT,
    condition_on_return TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_assign_emp ON public.asset_assignments(employee_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assign_org ON public.asset_assignments(organization_id);
