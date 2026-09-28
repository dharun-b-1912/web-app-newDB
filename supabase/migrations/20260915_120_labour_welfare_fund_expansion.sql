-- supabase/migrations/20260915_120_labour_welfare_fund_expansion.sql
-- ============================================================================
-- Joy PeopleHR — Labour Welfare Fund (LWF) & Tamil Nadu Act 1972 Schema Expansion
-- Multi-Tenant Safe • Backward Compatible • State Presets & Annual Frequencies
-- ============================================================================

DO $$
BEGIN
  -- Create or alter payroll_statutory_configs if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_statutory_configs') THEN
    ALTER TABLE public.payroll_statutory_configs
      ADD COLUMN IF NOT EXISTS lwf_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS lwf_amount NUMERIC(10, 2) DEFAULT 20.00,
      ADD COLUMN IF NOT EXISTS lwf_employee_amount NUMERIC(10, 2) DEFAULT 20.00,
      ADD COLUMN IF NOT EXISTS lwf_employer_amount NUMERIC(10, 2) DEFAULT 40.00,
      ADD COLUMN IF NOT EXISTS lwf_frequency TEXT DEFAULT 'YEARLY',
      ADD COLUMN IF NOT EXISTS lwf_deduction_months INTEGER[] DEFAULT ARRAY[12],
      ADD COLUMN IF NOT EXISTS lwf_state_preset TEXT DEFAULT 'TAMIL_NADU',
      ADD COLUMN IF NOT EXISTS lwf_state_jurisdiction TEXT DEFAULT 'Tamil Nadu',
      ADD COLUMN IF NOT EXISTS lwf_min_establishment_headcount INTEGER DEFAULT 5,
      ADD COLUMN IF NOT EXISTS lwf_min_service_days INTEGER DEFAULT 30,
      ADD COLUMN IF NOT EXISTS lwf_exclude_managerial BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS lwf_managerial_wage_ceiling NUMERIC(12, 2) DEFAULT 15000.00;
  END IF;
END $$;
