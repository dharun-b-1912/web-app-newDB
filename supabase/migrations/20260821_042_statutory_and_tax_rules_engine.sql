-- ============================================================================
-- WORKFORCEOS ENTERPRISE HRMS — MIGRATION 042: STATUTORY & TAX RULES ENGINE
-- Multi-Tenant Persisted Rules for EPF, ESIC, Professional Tax, TDS & LWF
-- ============================================================================

-- 1. Table: statutory_configs (Multi-Tenant Persisted Statutory Rules)
CREATE TABLE IF NOT EXISTS public.statutory_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    pf_enabled BOOLEAN NOT NULL DEFAULT true,
    pf_employee_percent NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    pf_employer_percent NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    pf_wage_ceiling NUMERIC(12, 2) NOT NULL DEFAULT 15000.00,
    esi_enabled BOOLEAN NOT NULL DEFAULT true,
    esi_employee_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.75,
    esi_employer_percent NUMERIC(5, 2) NOT NULL DEFAULT 3.25,
    esi_wage_ceiling NUMERIC(12, 2) NOT NULL DEFAULT 21000.00,
    pt_enabled BOOLEAN NOT NULL DEFAULT true,
    pt_monthly_slab NUMERIC(10, 2) NOT NULL DEFAULT 208.00,
    tds_auto_deduct BOOLEAN NOT NULL DEFAULT true,
    lwf_enabled BOOLEAN NOT NULL DEFAULT true,
    lwf_amount NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT DEFAULT 'HR Head',
    CONSTRAINT uq_statutory_tenant UNIQUE (organization_id)
);

-- Enable RLS
ALTER TABLE public.statutory_configs ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant RLS Policies
DROP POLICY IF EXISTS "statutory_configs_tenant_isolation" ON public.statutory_configs;
CREATE POLICY "statutory_configs_tenant_isolation" ON public.statutory_configs
    FOR ALL
    USING (
        organization_id = auth.jwt()->>'organization_id'::UUID
        OR organization_id = '00000000-0000-0000-0000-000000000001'::UUID
    );

-- 2. Table: professional_tax_jurisdictions
CREATE TABLE IF NOT EXISTS public.professional_tax_jurisdictions (
    id TEXT PRIMARY KEY,
    organization_id UUID,
    jurisdiction_name TEXT NOT NULL,
    local_authority_type TEXT NOT NULL DEFAULT 'Corporation',
    half_year_period TEXT NOT NULL DEFAULT 'Period I (Apr - Sep)',
    effective_from DATE NOT NULL DEFAULT '2026-04-01',
    slabs JSONB NOT NULL DEFAULT '[]'::JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.professional_tax_jurisdictions ENABLE ROW LEVEL SECURITY;

-- 3. Stored Procedure: fn_upsert_statutory_config
CREATE OR REPLACE FUNCTION public.fn_upsert_statutory_config(
    p_organization_id UUID,
    p_pf_enabled BOOLEAN,
    p_pf_emp_pct NUMERIC,
    p_pf_empr_pct NUMERIC,
    p_pf_ceiling NUMERIC,
    p_esi_enabled BOOLEAN,
    p_esi_emp_pct NUMERIC,
    p_esi_empr_pct NUMERIC,
    p_esi_ceiling NUMERIC,
    p_pt_enabled BOOLEAN,
    p_pt_monthly NUMERIC,
    p_tds_auto BOOLEAN,
    p_lwf_enabled BOOLEAN,
    p_lwf_amt NUMERIC,
    p_actor_name TEXT DEFAULT 'HR Head'
)
RETURNS public.statutory_configs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record public.statutory_configs;
BEGIN
    INSERT INTO public.statutory_configs (
        organization_id,
        pf_enabled,
        pf_employee_percent,
        pf_employer_percent,
        pf_wage_ceiling,
        esi_enabled,
        esi_employee_percent,
        esi_employer_percent,
        esi_wage_ceiling,
        pt_enabled,
        pt_monthly_slab,
        tds_auto_deduct,
        lwf_enabled,
        lwf_amount,
        updated_by,
        updated_at
    )
    VALUES (
        p_organization_id,
        p_pf_enabled,
        p_pf_emp_pct,
        p_pf_empr_pct,
        p_pf_ceiling,
        p_esi_enabled,
        p_esi_emp_pct,
        p_esi_empr_pct,
        p_esi_ceiling,
        p_pt_enabled,
        p_pt_monthly,
        p_tds_auto,
        p_lwf_enabled,
        p_lwf_amt,
        p_actor_name,
        NOW()
    )
    ON CONFLICT (organization_id)
    DO UPDATE SET
        pf_enabled = EXCLUDED.pf_enabled,
        pf_employee_percent = EXCLUDED.pf_employee_percent,
        pf_employer_percent = EXCLUDED.pf_employer_percent,
        pf_wage_ceiling = EXCLUDED.pf_wage_ceiling,
        esi_enabled = EXCLUDED.esi_enabled,
        esi_employee_percent = EXCLUDED.esi_employee_percent,
        esi_employer_percent = EXCLUDED.esi_employer_percent,
        esi_wage_ceiling = EXCLUDED.esi_wage_ceiling,
        pt_enabled = EXCLUDED.pt_enabled,
        pt_monthly_slab = EXCLUDED.pt_monthly_slab,
        tds_auto_deduct = EXCLUDED.tds_auto_deduct,
        lwf_enabled = EXCLUDED.lwf_enabled,
        lwf_amount = EXCLUDED.lwf_amount,
        version = public.statutory_configs.version + 1,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    RETURNING * INTO v_record;

    -- Trigger Financial Audit Event
    INSERT INTO public.audit_logs (
        organization_id,
        entity_type,
        entity_id,
        action,
        actor_name,
        actor_role,
        details,
        created_at
    )
    VALUES (
        p_organization_id,
        'STATUTORY_CONFIG',
        v_record.id::TEXT,
        'UPDATE_STATUTORY_RULES',
        p_actor_name,
        'HR Head',
        jsonb_build_object(
            'pf_employee_percent', p_pf_emp_pct,
            'pf_wage_ceiling', p_pf_ceiling,
            'esi_employee_percent', p_esi_emp_pct,
            'esi_wage_ceiling', p_esi_ceiling,
            'pt_monthly_slab', p_pt_monthly,
            'version', v_record.version
        ),
        NOW()
    );

    RETURN v_record;
END;
$$;

-- 4. Initial Seed for Primary Org
INSERT INTO public.statutory_configs (
    organization_id,
    pf_enabled,
    pf_employee_percent,
    pf_employer_percent,
    pf_wage_ceiling,
    esi_enabled,
    esi_employee_percent,
    esi_employer_percent,
    esi_wage_ceiling,
    pt_enabled,
    pt_monthly_slab,
    tds_auto_deduct,
    lwf_enabled,
    lwf_amount
)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    true,
    12.00,
    12.00,
    15000.00,
    true,
    0.75,
    3.25,
    21000.00,
    true,
    208.00,
    true,
    true,
    10.00
)
ON CONFLICT (organization_id) DO NOTHING;
