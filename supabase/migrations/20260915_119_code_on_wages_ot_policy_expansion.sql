-- supabase/migrations/20260915_119_code_on_wages_ot_policy_expansion.sql
-- ============================================================================
-- JOY PeopleHR — Migration 119
-- Code on Wages (2019) & Statutory Overtime Policy Expansion Schema
-- Idempotent • Multi-Tenant Isolated • Backward Compatible with Default Fallbacks
-- ============================================================================

-- 1. Add statutory standard preset column
ALTER TABLE public.payroll_ot_policies
    ADD COLUMN IF NOT EXISTS statutory_standard_preset VARCHAR(64) NOT NULL DEFAULT 'FACTORIES_ACT_1948';

-- 2. Add Code on Wages 50% basic wage rule enforcement flag
ALTER TABLE public.payroll_ot_policies
    ADD COLUMN IF NOT EXISTS enforce_50_percent_wage_rule BOOLEAN NOT NULL DEFAULT false;

-- 3. Add statutory quarterly OT limit column (e.g. 115 hrs Factories Act / Code on Wages)
ALTER TABLE public.payroll_ot_policies
    ADD COLUMN IF NOT EXISTS statutory_quarterly_ot_limit NUMERIC(6, 2) NOT NULL DEFAULT 115.00;

-- 4. Add statutory spreadover hours limit column (e.g. 10.5 hrs Factories Act, 12.0 hrs Code on Wages)
ALTER TABLE public.payroll_ot_policies
    ADD COLUMN IF NOT EXISTS statutory_spreadover_hours_limit NUMERIC(4, 2) NOT NULL DEFAULT 10.50;

-- 5. Add statutory max daily OT hours limit column
ALTER TABLE public.payroll_ot_policies
    ADD COLUMN IF NOT EXISTS statutory_max_daily_ot_hours NUMERIC(4, 2) NOT NULL DEFAULT 4.00;

-- 6. Add index for statutory standard lookup
CREATE INDEX IF NOT EXISTS idx_ot_policies_statutory ON public.payroll_ot_policies(statutory_standard_preset, status);

-- 7. Add comments documenting compliance references
COMMENT ON COLUMN public.payroll_ot_policies.statutory_standard_preset IS 'Statutory standard framework: FACTORIES_ACT_1948 or CODE_ON_WAGES_2019';
COMMENT ON COLUMN public.payroll_ot_policies.enforce_50_percent_wage_rule IS 'Code on Wages 2019 Section 2(y) rule: Basic + DA >= 50% of CTC, excess treated as deemed wages';
COMMENT ON COLUMN public.payroll_ot_policies.statutory_quarterly_ot_limit IS 'Statutory quarterly overtime cap in hours (standard 115 hrs)';
COMMENT ON COLUMN public.payroll_ot_policies.statutory_spreadover_hours_limit IS 'Statutory maximum spreadover shift hours in a day (10.5h or 12.0h)';
