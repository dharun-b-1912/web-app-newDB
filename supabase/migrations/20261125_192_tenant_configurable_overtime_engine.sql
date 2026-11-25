-- ============================================================================
-- Migration 192 (DRAFT): SaaS-Wide Tenant-Configurable Overtime Management Engine
-- NOTE: Draft migration — do NOT deploy to production without explicit authorization.
-- ============================================================================

-- 1. Organization-Level OT Master Settings
CREATE TABLE IF NOT EXISTS public.organization_ot_settings (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    ot_enabled BOOLEAN NOT NULL DEFAULT true,
    ot_mode VARCHAR(32) NOT NULL DEFAULT 'HR_VERIFIED'
        CHECK (ot_mode IN ('POLICY_BASED', 'HR_VERIFIED', 'TRACKING_ONLY', 'DISABLED')),
    approval_workflow VARCHAR(32) NOT NULL DEFAULT 'HR_ONLY'
        CHECK (approval_workflow IN ('HR_ONLY', 'MANAGER_THEN_HR', 'DEPT_HEAD_THEN_HR', 'SINGLE_APPROVER')),
    allow_self_approval BOOLEAN NOT NULL DEFAULT false,
    allow_employee_exceptions BOOLEAN NOT NULL DEFAULT false,
    payroll_integration_enabled BOOLEAN NOT NULL DEFAULT true,
    default_daily_threshold_minutes INT NOT NULL DEFAULT 480 CHECK (default_daily_threshold_minutes > 0),
    default_weekly_threshold_minutes INT NOT NULL DEFAULT 2400 CHECK (default_weekly_threshold_minutes > 0),
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Hierarchical, Effective-Dated, Versioned OT Policy Rules
CREATE TABLE IF NOT EXISTS public.ot_policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    policy_name VARCHAR(160) NOT NULL,
    policy_version INT NOT NULL DEFAULT 1,
    scope_level VARCHAR(32) NOT NULL DEFAULT 'ORG_DEFAULT'
        CHECK (scope_level IN ('ORG_DEFAULT', 'DEPARTMENT', 'EMPLOYEE_GROUP', 'SHIFT', 'EMPLOYEE_EXCEPTION')),
    scope_target_id VARCHAR(128),
    scope_target_name VARCHAR(160),
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,

    -- Thresholds & Limits
    daily_ot_threshold_minutes INT NOT NULL DEFAULT 480 CHECK (daily_ot_threshold_minutes > 0),
    weekly_ot_threshold_minutes INT NOT NULL DEFAULT 2400 CHECK (weekly_ot_threshold_minutes > 0),
    min_ot_threshold_minutes INT NOT NULL DEFAULT 30 CHECK (min_ot_threshold_minutes >= 0),
    max_ot_minutes_per_day INT NOT NULL DEFAULT 240 CHECK (max_ot_minutes_per_day >= 0),
    max_ot_minutes_per_week INT NOT NULL DEFAULT 960 CHECK (max_ot_minutes_per_week >= 0),
    monthly_statutory_ot_cap_hours NUMERIC(6, 2) NOT NULL DEFAULT 50.00,

    -- Break & Rounding Rules
    day_shift_break_minutes INT NOT NULL DEFAULT 0 CHECK (day_shift_break_minutes >= 0),
    night_shift_break_minutes INT NOT NULL DEFAULT 0 CHECK (night_shift_break_minutes >= 0),
    break_deduction_after_minutes INT NOT NULL DEFAULT 240 CHECK (break_deduction_after_minutes >= 0),
    rounding_rule VARCHAR(32) NOT NULL DEFAULT 'EXACT'
        CHECK (rounding_rule IN ('EXACT', 'NEAREST_15_MIN', 'NEAREST_30_MIN', 'ROUND_DOWN', 'ROUND_UP')),

    -- Pre/Post, Holiday & Weekly-Off Rules
    pre_shift_ot_enabled BOOLEAN NOT NULL DEFAULT false,
    post_shift_ot_enabled BOOLEAN NOT NULL DEFAULT true,
    holiday_ot_rule VARCHAR(32) NOT NULL DEFAULT 'OT_ONLY'
        CHECK (holiday_ot_rule IN ('OT_ONLY', 'COMP_OFF_ONLY', 'OT_AND_COMP_OFF', 'REGULAR_PAY')),
    weekly_off_ot_rule VARCHAR(32) NOT NULL DEFAULT 'OT_ONLY'
        CHECK (weekly_off_ot_rule IN ('OT_ONLY', 'COMP_OFF_ONLY', 'OT_AND_COMP_OFF', 'REGULAR_PAY')),
    regular_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.50,
    weekend_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 2.00,
    holiday_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 2.00,
    night_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.25,
    night_window_start VARCHAR(5) NOT NULL DEFAULT '22:00',
    night_window_end VARCHAR(5) NOT NULL DEFAULT '06:00',

    -- Eligibility Filters (JSONB arrays of IDs/names; empty = all)
    applicable_departments JSONB NOT NULL DEFAULT '[]'::jsonb,
    applicable_designations JSONB NOT NULL DEFAULT '[]'::jsonb,
    applicable_employee_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    applicable_shifts JSONB NOT NULL DEFAULT '[]'::jsonb,
    payroll_integration_enabled BOOLEAN NOT NULL DEFAULT true,

    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_ot_policy_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_ot_policy_rules_org_active
    ON public.ot_policy_rules(organization_id, is_active, scope_level);
CREATE INDEX IF NOT EXISTS idx_ot_policy_rules_effective
    ON public.ot_policy_rules(organization_id, effective_from, effective_to);

-- 3. Extend overtime_records for Multi-Mode, Evidence, Conflicts & Approval Audit
ALTER TABLE public.overtime_records
    ADD COLUMN IF NOT EXISTS ot_mode VARCHAR(32) DEFAULT 'POLICY_BASED',
    ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES public.ot_policy_rules(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS calculated_minutes INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS approved_minutes INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ot_status VARCHAR(40) NOT NULL DEFAULT 'PENDING_HR_REVIEW',
    ADD COLUMN IF NOT EXISTS calculation_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS conflict_policy_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS adjustment_reason TEXT,
    ADD COLUMN IF NOT EXISTS approval_history JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ot_rec_org_ot_status
    ON public.overtime_records(organization_id, ot_status, attendance_date);

-- 4. Enable Row Level Security (Strict Multi-Tenant Isolation)
ALTER TABLE public.organization_ot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_policy_rules ENABLE ROW LEVEL SECURITY;

-- organization_ot_settings policies
DROP POLICY IF EXISTS "org_ot_settings_select" ON public.organization_ot_settings;
CREATE POLICY "org_ot_settings_select" ON public.organization_ot_settings
FOR SELECT TO authenticated
USING (
    organization_id = (SELECT public.get_active_user_org_id())
    OR public.is_platform_admin()
);

DROP POLICY IF EXISTS "org_ot_settings_write" ON public.organization_ot_settings;
CREATE POLICY "org_ot_settings_write" ON public.organization_ot_settings
FOR ALL TO authenticated
USING (
    (organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id))
    OR public.is_platform_admin()
)
WITH CHECK (
    (organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id))
    OR public.is_platform_admin()
);

-- ot_policy_rules policies
DROP POLICY IF EXISTS "ot_policy_rules_select" ON public.ot_policy_rules;
CREATE POLICY "ot_policy_rules_select" ON public.ot_policy_rules
FOR SELECT TO authenticated
USING (
    organization_id = (SELECT public.get_active_user_org_id())
    OR public.is_platform_admin()
);

DROP POLICY IF EXISTS "ot_policy_rules_write" ON public.ot_policy_rules;
CREATE POLICY "ot_policy_rules_write" ON public.ot_policy_rules
FOR ALL TO authenticated
USING (
    organization_id = (SELECT public.get_active_user_org_id())
    AND public.is_org_admin(organization_id)
)
WITH CHECK (
    organization_id = (SELECT public.get_active_user_org_id())
    AND public.is_org_admin(organization_id)
);

-- Note: Platform Super Admin can inspect organization_ot_settings & ot_policy_rules status,
-- but employee-level overtime_records remain strictly scoped to the authenticated organization.

