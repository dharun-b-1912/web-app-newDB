-- ============================================================================
-- JOY PeopleHR — Migration 20261029: Universal OT Policies & Calculation Engine
-- Establishes RLS permissions, fallback default policies, and PostgreSQL calculation RPCs
-- ============================================================================

-- 1. Ensure RLS on payroll_ot_policies is accessible to authenticated and service_role
ALTER TABLE IF EXISTS public.payroll_ot_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_ot_policies_permissive_select" ON public.payroll_ot_policies;
CREATE POLICY "payroll_ot_policies_permissive_select" ON public.payroll_ot_policies
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "payroll_ot_policies_permissive_insert" ON public.payroll_ot_policies;
CREATE POLICY "payroll_ot_policies_permissive_insert" ON public.payroll_ot_policies
    FOR INSERT TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "payroll_ot_policies_permissive_update" ON public.payroll_ot_policies;
CREATE POLICY "payroll_ot_policies_permissive_update" ON public.payroll_ot_policies
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "payroll_ot_policies_permissive_delete" ON public.payroll_ot_policies;
CREATE POLICY "payroll_ot_policies_permissive_delete" ON public.payroll_ot_policies
    FOR DELETE TO public
    USING (true);

-- 2. Ensure RLS on payroll_ot_policy_audit_logs is accessible
ALTER TABLE IF EXISTS public.payroll_ot_policy_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_ot_audit_permissive_select" ON public.payroll_ot_policy_audit_logs;
CREATE POLICY "payroll_ot_audit_permissive_select" ON public.payroll_ot_policy_audit_logs
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "payroll_ot_audit_permissive_insert" ON public.payroll_ot_policy_audit_logs;
CREATE POLICY "payroll_ot_audit_permissive_insert" ON public.payroll_ot_policy_audit_logs
    FOR INSERT TO public
    WITH CHECK (true);

-- 3. Ensure RLS on payroll_ot_calculations is accessible
ALTER TABLE IF EXISTS public.payroll_ot_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_ot_calc_permissive_all" ON public.payroll_ot_calculations;
CREATE POLICY "payroll_ot_calc_permissive_all" ON public.payroll_ot_calculations
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- 4. Grant table permissions
GRANT ALL ON TABLE public.payroll_ot_policies TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.payroll_ot_policy_audit_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.payroll_ot_calculations TO anon, authenticated, service_role;

-- 5. Seed default active policy for Joy Corporate Solutions (if not exists)
INSERT INTO public.payroll_ot_policies (
    id,
    organization_id,
    company_id,
    policy_name,
    calculation_method,
    salary_basis,
    working_days_divisor,
    working_hours_per_day,
    company_multiplier,
    government_multiplier,
    statutory_standard_preset,
    enforce_50_percent_wage_rule,
    statutory_quarterly_ot_limit,
    statutory_spreadover_hours_limit,
    statutory_max_daily_ot_hours,
    status,
    effective_from
) VALUES (
    '4f2e9871-bc01-4432-8812-76543210abcd',
    '0c621892-e938-4707-9957-13534ea32c19',
    '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    'Standard Company Overtime Policy',
    'DYNAMIC_MULTIPLIER',
    'MONTHLY_GROSS',
    26.00,
    8.00,
    2.00,
    2.00,
    'FACTORIES_ACT_1948',
    false,
    115.00,
    10.50,
    4.00,
    'ACTIVE',
    '2026-04-01'
) ON CONFLICT (id) DO UPDATE SET
    company_multiplier = EXCLUDED.company_multiplier,
    working_days_divisor = EXCLUDED.working_days_divisor,
    status = 'ACTIVE',
    updated_at = now();

-- 6. RPC: Universal Overtime Calculation Function
CREATE OR REPLACE FUNCTION fn_calculate_overtime(
    p_organization_id UUID,
    p_monthly_salary NUMERIC,
    p_ot_hours NUMERIC,
    p_policy_id UUID DEFAULT NULL
)
RETURNS TABLE (
    policy_id UUID,
    policy_name TEXT,
    calculation_method TEXT,
    divisor_days NUMERIC,
    hours_per_day NUMERIC,
    base_daily_rate NUMERIC,
    base_hourly_rate NUMERIC,
    company_multiplier NUMERIC,
    company_ot_rate NUMERIC,
    company_ot_amount NUMERIC,
    statutory_multiplier NUMERIC,
    statutory_ot_rate NUMERIC,
    statutory_ot_amount NUMERIC,
    statutory_preset TEXT,
    actual_ot_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pol RECORD;
    v_daily NUMERIC;
    v_hourly NUMERIC;
    v_co_rate NUMERIC;
    v_co_amt NUMERIC;
    v_gov_rate NUMERIC;
    v_gov_amt NUMERIC;
BEGIN
    -- 1. Fetch active policy
    IF p_policy_id IS NOT NULL THEN
        SELECT * INTO v_pol FROM public.payroll_ot_policies WHERE id = p_policy_id LIMIT 1;
    ELSE
        SELECT * INTO v_pol FROM public.payroll_ot_policies
        WHERE organization_id = p_organization_id AND status = 'ACTIVE'
        ORDER BY updated_at DESC LIMIT 1;
    END IF;

    -- Fallback default if no record exists
    IF v_pol.id IS NULL THEN
        v_pol.id := '4f2e9871-bc01-4432-8812-76543210abcd'::uuid;
        v_pol.policy_name := 'Standard Factories Act Standard';
        v_pol.calculation_method := 'DYNAMIC_MULTIPLIER';
        v_pol.working_days_divisor := 26.00;
        v_pol.working_hours_per_day := 8.00;
        v_pol.company_multiplier := 2.00;
        v_pol.government_multiplier := 2.00;
        v_pol.statutory_standard_preset := 'FACTORIES_ACT_1948';
    END IF;

    -- 2. Pure deterministic derivation
    v_daily := ROUND(p_monthly_salary / GREATEST(1.0, v_pol.working_days_divisor), 4);
    v_hourly := ROUND(v_daily / GREATEST(1.0, v_pol.working_hours_per_day), 4);

    IF v_pol.calculation_method = 'FIXED_HOURLY_RATE' AND v_pol.fixed_hourly_rate IS NOT NULL THEN
        v_co_rate := v_pol.fixed_hourly_rate;
    ELSE
        v_co_rate := ROUND(v_hourly * COALESCE(v_pol.company_multiplier, 1.50), 2);
    END IF;

    v_co_amt := ROUND(v_co_rate * p_ot_hours, 2);

    v_gov_rate := ROUND(v_hourly * COALESCE(v_pol.government_multiplier, 2.00), 2);
    v_gov_amt := ROUND(v_gov_rate * p_ot_hours, 2);

    RETURN QUERY SELECT
        v_pol.id,
        v_pol.policy_name::TEXT,
        v_pol.calculation_method::TEXT,
        v_pol.working_days_divisor,
        v_pol.working_hours_per_day,
        v_daily,
        v_hourly,
        COALESCE(v_pol.company_multiplier, 1.50),
        v_co_rate,
        v_co_amt,
        COALESCE(v_pol.government_multiplier, 2.00),
        v_gov_rate,
        v_gov_amt,
        COALESCE(v_pol.statutory_standard_preset, 'FACTORIES_ACT_1948')::TEXT,
        p_ot_hours;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_calculate_overtime(UUID, NUMERIC, NUMERIC, UUID) TO anon, authenticated, service_role;
