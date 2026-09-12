-- ============================================================================
-- JOY PeopleHR — Migration 106
-- Dedicated Overtime (OT) Policy Configuration & Calculation Engine Schema
-- Pure Deterministic Math • Company-Scoped • Effective-Dated • Auditable
-- ============================================================================

-- 1. Table: payroll_ot_policies
CREATE TABLE IF NOT EXISTS public.payroll_ot_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    company_id UUID,
    policy_name VARCHAR(128) NOT NULL,
    calculation_method VARCHAR(32) NOT NULL CHECK (calculation_method IN ('DYNAMIC_MULTIPLIER', 'FIXED_HOURLY_RATE')),
    salary_basis VARCHAR(32) NOT NULL DEFAULT 'MONTHLY_GROSS',
    working_days_divisor NUMERIC(5, 2) NOT NULL DEFAULT 26.00 CHECK (working_days_divisor > 0),
    working_hours_per_day NUMERIC(5, 2) NOT NULL DEFAULT 8.00 CHECK (working_hours_per_day > 0),
    company_multiplier NUMERIC(5, 2) CHECK (company_multiplier IS NULL OR company_multiplier > 0),
    fixed_hourly_rate NUMERIC(10, 2) CHECK (fixed_hourly_rate IS NULL OR fixed_hourly_rate >= 0),
    government_calculation_method VARCHAR(32) NOT NULL DEFAULT 'DYNAMIC_MULTIPLIER',
    government_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 2.00 CHECK (government_multiplier > 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    rounding_mode VARCHAR(32) NOT NULL DEFAULT 'ROUND_HALF_UP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT check_ot_method_params CHECK (
        (calculation_method = 'DYNAMIC_MULTIPLIER' AND company_multiplier IS NOT NULL) OR
        (calculation_method = 'FIXED_HOURLY_RATE' AND fixed_hourly_rate IS NOT NULL)
    ),
    CONSTRAINT check_ot_effective_dates CHECK (
        effective_to IS NULL OR effective_to >= effective_from
    )
);

CREATE INDEX IF NOT EXISTS idx_ot_policies_org_co ON public.payroll_ot_policies(organization_id, company_id);
CREATE INDEX IF NOT EXISTS idx_ot_policies_effective ON public.payroll_ot_policies(effective_from, effective_to);

-- 2. Table: payroll_ot_calculations (Tracks line-item OT calculation trace per employee per run)
CREATE TABLE IF NOT EXISTS public.payroll_ot_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    company_id UUID,
    employee_id VARCHAR(64) NOT NULL,
    payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    ot_policy_id UUID REFERENCES public.payroll_ot_policies(id) ON DELETE SET NULL,
    actual_ot_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    company_ot_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    company_ot_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    government_ot_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    government_equivalent_ot_hours NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    government_ot_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    calculation_method VARCHAR(32) NOT NULL,
    calculation_version INT NOT NULL DEFAULT 1,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ot_calc_run_emp ON public.payroll_ot_calculations(payroll_run_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_ot_calc_org ON public.payroll_ot_calculations(organization_id);

-- 3. Table: payroll_ot_policy_audit_logs (Immutable audit trail of policy updates)
CREATE TABLE IF NOT EXISTS public.payroll_ot_policy_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    ot_policy_id UUID REFERENCES public.payroll_ot_policies(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_name VARCHAR(128),
    action VARCHAR(32) NOT NULL CHECK (action IN ('CREATED', 'UPDATED', 'DEACTIVATED')),
    old_values JSONB DEFAULT '{}'::jsonb,
    new_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ot_audit_policy ON public.payroll_ot_policy_audit_logs(ot_policy_id);
CREATE INDEX IF NOT EXISTS idx_ot_audit_org ON public.payroll_ot_policy_audit_logs(organization_id);

-- 4. Enable Row Level Security
ALTER TABLE public.payroll_ot_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_ot_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_ot_policy_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "payroll_ot_policies_org_isolation" ON public.payroll_ot_policies;
CREATE POLICY "payroll_ot_policies_org_isolation" ON public.payroll_ot_policies
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR public.is_org_admin(organization_id)
    )
    WITH CHECK (
        public.is_platform_admin()
        OR organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR public.is_org_admin(organization_id)
    );

DROP POLICY IF EXISTS "payroll_ot_calculations_org_isolation" ON public.payroll_ot_calculations;
CREATE POLICY "payroll_ot_calculations_org_isolation" ON public.payroll_ot_calculations
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR public.is_org_admin(organization_id)
    )
    WITH CHECK (
        public.is_platform_admin()
        OR organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR public.is_org_admin(organization_id)
    );

DROP POLICY IF EXISTS "payroll_ot_policy_audit_logs_org_isolation" ON public.payroll_ot_policy_audit_logs;
CREATE POLICY "payroll_ot_policy_audit_logs_org_isolation" ON public.payroll_ot_policy_audit_logs
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR public.is_org_admin(organization_id)
    )
    WITH CHECK (
        public.is_platform_admin()
        OR organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR public.is_org_admin(organization_id)
    );
