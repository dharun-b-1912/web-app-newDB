-- ============================================================================
-- Migration: 20261111_174_garment_workforce_module_master.sql
-- Module: JOY PeopleHR — Garment & Clothing Workforce Management SaaS Add-on
-- Architecture: Multi-Tenant Additive Schema preserving Core HRMS Tables
-- Security: Tenant & Role-Scoped RLS using SECURITY DEFINER helpers
-- ============================================================================

-- 0. SAFE HELPER FUNCTION: Updated-at trigger
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Helper: Is active user a Floor Supervisor / TL / Line Manager for an org?
CREATE OR REPLACE FUNCTION public.is_garment_supervisor(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    LEFT JOIN public.roles r ON r.id = om.role_id
    WHERE om.user_id = auth.uid()
      AND om.organization_id = p_org_id
      AND om.status = 'ACTIVE'
      AND upper(COALESCE(om.role_code, r.code, r.name, '')) IN (
        'SUPER_ADMIN', 'ORG_ADMIN', 'ORGANIZATION ADMIN', 'COMPANY_ADMIN', 'COMPANY ADMIN',
        'HR_HEAD', 'HR HEAD', 'HR_ADMIN', 'HR ADMIN', 'PAYROLL_ADMIN', 'PAYROLL ADMIN',
        'MANAGER', 'TEAM_LEAD', 'TEAM LEAD', 'TL', 'SUPERVISOR', 'QC_INSPECTOR', 'FLOOR_SUPERVISOR'
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
      AND up.organization_id = p_org_id
      AND upper(COALESCE(up.role, '')) IN (
        'SUPER ADMIN', 'ORGANIZATION ADMIN', 'COMPANY ADMIN', 'HR HEAD', 'HR ADMIN',
        'PAYROLL ADMIN', 'MANAGER', 'TEAM LEAD', 'SUPERVISOR', 'QC INSPECTOR'
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_garment_supervisor(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_garment_supervisor(UUID) TO authenticated, service_role;

-- ============================================================================
-- 1. SAAS ADD-ON ENTITLEMENTS TABLE (Tenant Feature Gating)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organization_addon_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  addon_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  plan_tier TEXT DEFAULT 'BUSINESS',
  max_units INTEGER DEFAULT NULL,
  max_workers INTEGER DEFAULT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled_at TIMESTAMPTZ DEFAULT NULL,
  disabled_at TIMESTAMPTZ DEFAULT NULL,
  updated_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_addon_key UNIQUE (organization_id, addon_key)
);

CREATE INDEX IF NOT EXISTS idx_org_addon_entitlements_org ON public.organization_addon_entitlements(organization_id, addon_key);

-- ============================================================================
-- 2. GARMENT ORGANIZATION SETTINGS (ZERO HARDCODED POLICIES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.garment_org_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  piece_rate_calculation_mode TEXT NOT NULL DEFAULT 'CONFIGURABLE_PER_ORDER'
    CHECK (piece_rate_calculation_mode IN ('INDIVIDUAL_OPERATION', 'SHARED_LINE_OUTPUT', 'CONFIGURABLE_PER_ORDER')),
  default_shared_split_method TEXT NOT NULL DEFAULT 'EQUAL'
    CHECK (default_shared_split_method IN ('EQUAL', 'BY_HOURS', 'BY_SKILL_WEIGHT')),
  default_rework_payment_rule TEXT NOT NULL DEFAULT 'ACCEPTED_ONLY'
    CHECK (default_rework_payment_rule IN ('ACCEPTED_ONLY', 'ACCEPTED_PLUS_REWORK_ACCEPTED', 'PROPORTIONAL_REWORK')),
  rework_rate_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  rejected_payment_rule TEXT NOT NULL DEFAULT 'NEVER_PAY'
    CHECK (rejected_payment_rule IN ('NEVER_PAY', 'PARTIAL_OVERRIDE')),
  rejected_rate_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  require_qc_before_piece_pay BOOLEAN NOT NULL DEFAULT true,
  supervisor_can_override_rate BOOLEAN NOT NULL DEFAULT false,
  allow_backdated_entry_days INTEGER NOT NULL DEFAULT 2,
  overtime_multiplier_daily NUMERIC(5,2) NOT NULL DEFAULT 1.50,
  overtime_multiplier_hourly NUMERIC(5,2) NOT NULL DEFAULT 1.50,
  overtime_applies_to_piece_rate BOOLEAN NOT NULL DEFAULT true,
  standard_hours_per_day NUMERIC(5,2) NOT NULL DEFAULT 8.00,
  max_deduction_pct_of_gross NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  enforce_minimum_wage_check BOOLEAN NOT NULL DEFAULT true,
  statutory_minimum_daily_wage NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. FACTORY / UNIT / FLOOR / LINE HIERARCHY & TEAMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.garment_production_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id UUID DEFAULT NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  branch_id UUID DEFAULT NULL REFERENCES public.branches(id) ON DELETE SET NULL,
  work_location_id UUID DEFAULT NULL REFERENCES public.work_locations(id) ON DELETE SET NULL,
  parent_unit_id UUID DEFAULT NULL REFERENCES public.garment_production_units(id) ON DELETE SET NULL,
  unit_code TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'LINE' CHECK (unit_type IN ('FACTORY', 'FLOOR', 'LINE', 'SECTION')),
  line_stage TEXT NOT NULL DEFAULT 'STITCHING'
    CHECK (line_stage IN ('CUTTING', 'STITCHING', 'FINISHING', 'CHECKING', 'PACKING', 'GENERAL')),
  supervisor_employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  tl_employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  qc_inspector_employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  piece_rate_mode_override TEXT DEFAULT NULL
    CHECK (piece_rate_mode_override IS NULL OR piece_rate_mode_override IN ('INDIVIDUAL_OPERATION', 'SHARED_LINE_OUTPUT')),
  shared_split_method_override TEXT DEFAULT NULL
    CHECK (shared_split_method_override IS NULL OR shared_split_method_override IN ('EQUAL', 'BY_HOURS', 'BY_SKILL_WEIGHT')),
  daily_target_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_unit_code UNIQUE (organization_id, unit_code)
);

CREATE INDEX IF NOT EXISTS idx_garment_units_org ON public.garment_production_units(organization_id, is_active);

CREATE TABLE IF NOT EXISTS public.garment_production_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  production_unit_id UUID NOT NULL REFERENCES public.garment_production_units(id) ON DELETE CASCADE,
  shift_id UUID DEFAULT NULL REFERENCES public.shifts(id) ON DELETE SET NULL,
  team_code TEXT NOT NULL,
  team_name TEXT NOT NULL,
  tl_employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  supervisor_employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_team_code UNIQUE (organization_id, team_code)
);

CREATE INDEX IF NOT EXISTS idx_garment_teams_unit ON public.garment_production_teams(organization_id, production_unit_id);

-- ============================================================================
-- 4. WORKER PROFILES & EFFECTIVE-DATED WAGE ASSIGNMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.garment_worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  contractor_vendor_id UUID DEFAULT NULL REFERENCES public.vendors(id) ON DELETE SET NULL,
  worker_category TEXT NOT NULL DEFAULT 'PERMANENT'
    CHECK (worker_category IN ('PERMANENT', 'TEMPORARY', 'CONTRACT', 'MIGRANT', 'PIECE_RATE')),
  skill_grade TEXT NOT NULL DEFAULT 'GRADE_B'
    CHECK (skill_grade IN ('HELPER', 'GRADE_C', 'GRADE_B', 'GRADE_A', 'MASTER_TAILOR')),
  skill_weightage NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  primary_unit_id UUID DEFAULT NULL REFERENCES public.garment_production_units(id) ON DELETE SET NULL,
  primary_team_id UUID DEFAULT NULL REFERENCES public.garment_production_teams(id) ON DELETE SET NULL,
  default_wage_method TEXT NOT NULL DEFAULT 'DAILY'
    CHECK (default_wage_method IN ('DAILY', 'HOURLY', 'PIECE_RATE', 'HYBRID')),
  default_payment_frequency TEXT NOT NULL DEFAULT 'WEEKLY'
    CHECK (default_payment_frequency IN ('DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM')),
  settlement_day_of_week INTEGER NOT NULL DEFAULT 6 CHECK (settlement_day_of_week BETWEEN 0 AND 6),
  attendance_mode TEXT NOT NULL DEFAULT 'BOTH'
    CHECK (attendance_mode IN ('STANDARD_BIOMETRIC_GPS', 'SUPERVISOR_FLOOR', 'BOTH')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_worker_emp UNIQUE (organization_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_garment_workers_unit ON public.garment_worker_profiles(organization_id, primary_unit_id, primary_team_id);

CREATE TABLE IF NOT EXISTS public.garment_wage_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  wage_method TEXT NOT NULL CHECK (wage_method IN ('DAILY', 'HOURLY', 'PIECE_RATE', 'HYBRID')),
  payment_frequency TEXT NOT NULL DEFAULT 'WEEKLY'
    CHECK (payment_frequency IN ('DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM')),
  daily_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  hybrid_base_daily_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  hybrid_base_hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  default_piece_rate NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  overtime_hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  minimum_daily_guarantee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  incentive_eligible BOOLEAN NOT NULL DEFAULT true,
  custom_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_garment_wage_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_garment_wage_lookup ON public.garment_wage_assignments(organization_id, employee_id, is_active, effective_from DESC);

-- ============================================================================
-- 5. STYLES, OPERATIONS, PRODUCTION ORDERS & RATE MATRIX
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.garment_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  style_code TEXT NOT NULL,
  style_name TEXT NOT NULL,
  garment_category TEXT NOT NULL DEFAULT 'SHIRT',
  buyer_name TEXT,
  season TEXT,
  standard_sam_minutes NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  target_efficiency_pct NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_style_code UNIQUE (organization_id, style_code)
);

CREATE TABLE IF NOT EXISTS public.garment_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  operation_code TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  department_stage TEXT NOT NULL DEFAULT 'STITCHING'
    CHECK (department_stage IN ('CUTTING', 'STITCHING', 'COLLAR_ATTACH', 'SLEEVE_ATTACH', 'BUTTON_FIXING', 'IRONING', 'CHECKING', 'PACKING', 'CUSTOM')),
  sequence_order INTEGER NOT NULL DEFAULT 1,
  unit_of_measure TEXT NOT NULL DEFAULT 'PIECE',
  default_smv NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_op_code UNIQUE (organization_id, operation_code)
);

CREATE TABLE IF NOT EXISTS public.garment_production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  buyer_name TEXT,
  style_id UUID NOT NULL REFERENCES public.garment_styles(id) ON DELETE RESTRICT,
  production_unit_id UUID DEFAULT NULL REFERENCES public.garment_production_units(id) ON DELETE SET NULL,
  target_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  completed_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  rejected_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE DEFAULT NULL,
  piece_rate_mode_override TEXT DEFAULT NULL
    CHECK (piece_rate_mode_override IS NULL OR piece_rate_mode_override IN ('INDIVIDUAL_OPERATION', 'SHARED_LINE_OUTPUT')),
  shared_split_method_override TEXT DEFAULT NULL
    CHECK (shared_split_method_override IS NULL OR shared_split_method_override IN ('EQUAL', 'BY_HOURS', 'BY_SKILL_WEIGHT')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_order_no UNIQUE (organization_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.garment_piece_rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_location_id UUID DEFAULT NULL REFERENCES public.work_locations(id) ON DELETE SET NULL,
  production_unit_id UUID DEFAULT NULL REFERENCES public.garment_production_units(id) ON DELETE SET NULL,
  order_id UUID DEFAULT NULL REFERENCES public.garment_production_orders(id) ON DELETE CASCADE,
  style_id UUID DEFAULT NULL REFERENCES public.garment_styles(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES public.garment_operations(id) ON DELETE CASCADE,
  skill_grade TEXT DEFAULT NULL
    CHECK (skill_grade IS NULL OR skill_grade IN ('HELPER', 'GRADE_C', 'GRADE_B', 'GRADE_A', 'MASTER_TAILOR')),
  rate_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  rework_rate_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  rejected_rate_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  overtime_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_piece_rate_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_garment_rate_cards_lookup
  ON public.garment_piece_rate_cards(organization_id, operation_id, is_active, effective_from DESC);

-- ============================================================================
-- 6. FLOOR ATTENDANCE, PRODUCTION & QC LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.garment_floor_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  shift_id UUID DEFAULT NULL REFERENCES public.shifts(id) ON DELETE SET NULL,
  production_unit_id UUID DEFAULT NULL REFERENCES public.garment_production_units(id) ON DELETE SET NULL,
  team_id UUID DEFAULT NULL REFERENCES public.garment_production_teams(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  supervisor_employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PRESENT'
    CHECK (status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'WEEK_OFF', 'HOLIDAY')),
  payable_day_factor NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  worked_hours NUMERIC(6,2) NOT NULL DEFAULT 8.00,
  overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  late_minutes INTEGER NOT NULL DEFAULT 0,
  early_exit_minutes INTEGER NOT NULL DEFAULT 0,
  check_in_at TIMESTAMPTZ DEFAULT NULL,
  check_out_at TIMESTAMPTZ DEFAULT NULL,
  source TEXT NOT NULL DEFAULT 'SUPERVISOR_MOBILE'
    CHECK (source IN ('SUPERVISOR_MOBILE', 'BIOMETRIC_SYNC', 'GPS_MOBILE', 'HR_WEB')),
  sync_to_core_attendance BOOLEAN NOT NULL DEFAULT true,
  approval_status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (approval_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED', 'CORRECTION_REQUESTED')),
  client_idempotency_key TEXT DEFAULT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_floor_att_emp_day UNIQUE (organization_id, employee_id, work_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_garment_floor_att_idem
  ON public.garment_floor_attendance(organization_id, client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_garment_floor_att_unit_date
  ON public.garment_floor_attendance(organization_id, work_date DESC, production_unit_id);

CREATE TABLE IF NOT EXISTS public.garment_production_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  shift_id UUID DEFAULT NULL REFERENCES public.shifts(id) ON DELETE SET NULL,
  production_unit_id UUID DEFAULT NULL REFERENCES public.garment_production_units(id) ON DELETE SET NULL,
  team_id UUID DEFAULT NULL REFERENCES public.garment_production_teams(id) ON DELETE SET NULL,
  order_id UUID DEFAULT NULL REFERENCES public.garment_production_orders(id) ON DELETE SET NULL,
  style_id UUID DEFAULT NULL REFERENCES public.garment_styles(id) ON DELETE SET NULL,
  operation_id UUID NOT NULL REFERENCES public.garment_operations(id) ON DELETE RESTRICT,
  allocation_mode TEXT NOT NULL DEFAULT 'INDIVIDUAL'
    CHECK (allocation_mode IN ('INDIVIDUAL', 'SHARED_LINE')),
  shared_split_method TEXT DEFAULT NULL
    CHECK (shared_split_method IS NULL OR shared_split_method IN ('EQUAL', 'BY_HOURS', 'BY_SKILL_WEIGHT')),
  employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  supervisor_employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  qc_inspector_employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  produced_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  accepted_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  rejected_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  rework_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  rework_accepted_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_qc_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  rejection_reason_code TEXT DEFAULT NULL,
  rejection_reason_notes TEXT DEFAULT NULL,
  applied_rate_card_id UUID DEFAULT NULL REFERENCES public.garment_piece_rate_cards(id) ON DELETE SET NULL,
  applied_unit_rate NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  applied_rework_rate NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  payable_units NUMERIC(12,2) NOT NULL DEFAULT 0,
  computed_piece_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  qc_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (qc_status IN ('PENDING', 'QC_VERIFIED', 'REJECTED_ENTRY')),
  approval_status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (approval_status IN ('DRAFT', 'SUBMITTED', 'SUPERVISOR_APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED', 'LOCKED', 'CORRECTION_REQUESTED')),
  client_idempotency_key TEXT DEFAULT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID DEFAULT NULL,
  approved_at TIMESTAMPTZ DEFAULT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_garment_prod_quantities CHECK (
    produced_qty >= 0 AND accepted_qty >= 0 AND rejected_qty >= 0 AND rework_qty >= 0
    AND rework_accepted_qty >= 0 AND rework_accepted_qty <= rework_qty
    AND (accepted_qty + rejected_qty + rework_qty) <= produced_qty
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_garment_prod_entry_idem
  ON public.garment_production_entries(organization_id, client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_garment_prod_entries_date
  ON public.garment_production_entries(organization_id, work_date DESC, production_unit_id, approval_status);

CREATE TABLE IF NOT EXISTS public.garment_production_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  production_entry_id UUID NOT NULL REFERENCES public.garment_production_entries(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  order_id UUID DEFAULT NULL REFERENCES public.garment_production_orders(id) ON DELETE SET NULL,
  style_id UUID DEFAULT NULL REFERENCES public.garment_styles(id) ON DELETE SET NULL,
  operation_id UUID NOT NULL REFERENCES public.garment_operations(id) ON DELETE RESTRICT,
  share_ratio NUMERIC(10,6) NOT NULL DEFAULT 1.000000,
  allocated_produced_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  allocated_accepted_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  allocated_rejected_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  allocated_rework_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  allocated_rework_accepted_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  payable_units NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_rate NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  earned_piece_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  incentive_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  payroll_cycle_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_alloc_entry_emp UNIQUE (production_entry_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_garment_alloc_emp_date
  ON public.garment_production_allocations(organization_id, employee_id, work_date DESC);

-- ============================================================================
-- 7. INCENTIVES & ADVANCES LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.garment_incentive_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('TARGET_ACHIEVEMENT', 'QUALITY_ZERO_DEFECT', 'ATTENDANCE_REGULARITY', 'LINE_EFFICIENCY', 'CUSTOM')),
  production_unit_id UUID DEFAULT NULL REFERENCES public.garment_production_units(id) ON DELETE SET NULL,
  worker_category TEXT DEFAULT NULL,
  threshold_value NUMERIC(12,2) NOT NULL DEFAULT 100.00,
  reward_type TEXT NOT NULL DEFAULT 'FIXED_AMOUNT' CHECK (reward_type IN ('FIXED_AMOUNT', 'PER_PIECE_BONUS', 'PERCENT_OF_EARNINGS')),
  reward_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  period_type TEXT NOT NULL DEFAULT 'DAILY' CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_incentive_code UNIQUE (organization_id, rule_code)
);

CREATE TABLE IF NOT EXISTS public.garment_incentive_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  award_date DATE NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  production_unit_id UUID DEFAULT NULL REFERENCES public.garment_production_units(id) ON DELETE SET NULL,
  incentive_rule_id UUID DEFAULT NULL REFERENCES public.garment_incentive_rules(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'REJECTED')),
  payroll_cycle_id UUID DEFAULT NULL,
  notes TEXT,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.garment_advances_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'ADVANCE_GIVEN', 'ADVANCE_RECOVERY', 'LOAN_DISBURSED', 'LOAN_RECOVERY',
    'CANTEEN', 'HOSTEL', 'DAMAGE_RECOVERY', 'OTHER_DEDUCTION', 'OTHER_EARNING'
  )),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  recovered_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  balance_remaining NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  reference_code TEXT,
  reason TEXT,
  core_advance_id UUID DEFAULT NULL REFERENCES public.salary_advance_requests(id) ON DELETE SET NULL,
  core_loan_id UUID DEFAULT NULL REFERENCES public.employee_loans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'SETTLED', 'CANCELLED')),
  payroll_cycle_id UUID DEFAULT NULL,
  approved_by UUID DEFAULT NULL,
  approved_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_garment_advances_emp
  ON public.garment_advances_ledger(organization_id, employee_id, status, entry_date DESC);

-- ============================================================================
-- 8. MULTI-CYCLE PAYROLL ENGINE, APPROVALS & PAYSLIP SNAPSHOTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.garment_payroll_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cycle_code TEXT NOT NULL,
  cycle_name TEXT NOT NULL,
  payment_frequency TEXT NOT NULL DEFAULT 'WEEKLY'
    CHECK (payment_frequency IN ('DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  production_unit_id UUID DEFAULT NULL REFERENCES public.garment_production_units(id) ON DELETE SET NULL,
  wage_method_filter TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'CALCULATED', 'SUPERVISOR_APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED', 'AUTHORIZED', 'PAID', 'LOCKED', 'REOPENED')),
  total_workers INTEGER NOT NULL DEFAULT 0,
  total_gross NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_net_pay NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  calculation_hash TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NULL,
  approved_chain_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  locked_at TIMESTAMPTZ DEFAULT NULL,
  locked_by UUID DEFAULT NULL,
  reopen_reason TEXT,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_cycle_code UNIQUE (organization_id, cycle_code),
  CONSTRAINT chk_garment_cycle_dates CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.garment_payroll_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_cycle_id UUID NOT NULL REFERENCES public.garment_payroll_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  worker_category TEXT NOT NULL DEFAULT 'PERMANENT',
  wage_method_snapshot TEXT NOT NULL,
  payable_days NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  worked_hours NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  overtime_hours NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  produced_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  accepted_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  rejected_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  rework_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  rework_accepted_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  daily_wage_earnings NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  hourly_wage_earnings NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  piece_rate_earnings NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  overtime_earnings NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  incentive_earnings NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  other_earnings NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  minimum_wage_topup NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  gross_earnings NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  advance_recovery NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  loan_deduction NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  statutory_pf NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  statutory_esi NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  statutory_pt NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  canteen_deduction NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  other_deductions NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  net_payable NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  calculation_trace_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  worker_payslip_published BOOLEAN NOT NULL DEFAULT false,
  payslip_published_at TIMESTAMPTZ DEFAULT NULL,
  disbursement_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (disbursement_status IN ('PENDING', 'QUEUED', 'PAID', 'ON_HOLD')),
  paid_at TIMESTAMPTZ DEFAULT NULL,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_garment_payroll_line_emp UNIQUE (payroll_cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_garment_payroll_lines_emp
  ON public.garment_payroll_lines(organization_id, employee_id, created_at DESC);

-- ============================================================================
-- 9. CORRECTION REQUESTS, DISPUTES & AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.garment_correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('ATTENDANCE_CORRECTION', 'PRODUCTION_CORRECTION', 'WORKER_DISPUTE')),
  target_table TEXT NOT NULL,
  target_record_id UUID NOT NULL,
  work_date DATE DEFAULT NULL,
  employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requested_by_employee_id UUID DEFAULT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  requested_changes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by UUID DEFAULT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.garment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID DEFAULT NULL,
  action TEXT NOT NULL,
  actor_user_id UUID DEFAULT NULL,
  actor_employee_id UUID DEFAULT NULL,
  actor_role TEXT,
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_garment_audit_org_time
  ON public.garment_audit_logs(organization_id, created_at DESC);

-- ============================================================================
-- 10. UPDATED_AT TRIGGERS
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'organization_addon_entitlements',
    'garment_org_settings',
    'garment_production_units',
    'garment_production_teams',
    'garment_worker_profiles',
    'garment_wage_assignments',
    'garment_styles',
    'garment_operations',
    'garment_production_orders',
    'garment_piece_rate_cards',
    'garment_floor_attendance',
    'garment_production_entries',
    'garment_production_allocations',
    'garment_incentive_rules',
    'garment_incentive_awards',
    'garment_advances_ledger',
    'garment_payroll_cycles',
    'garment_payroll_lines',
    'garment_correction_requests'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================================
-- 11. ROW-LEVEL SECURITY (STRICT TENANT & ROLE ISOLATION)
-- ============================================================================
ALTER TABLE public.organization_addon_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_production_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_production_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_wage_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_piece_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_floor_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_production_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_production_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_incentive_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_incentive_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_advances_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_payroll_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Addon entitlements: Authenticated org users can read their own org's entitlements; Admins/Platform manage
DROP POLICY IF EXISTS "addon_entitlements_select" ON public.organization_addon_entitlements;
CREATE POLICY "addon_entitlements_select" ON public.organization_addon_entitlements
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

DROP POLICY IF EXISTS "addon_entitlements_write" ON public.organization_addon_entitlements;
CREATE POLICY "addon_entitlements_write" ON public.organization_addon_entitlements
FOR ALL TO authenticated
USING (
  (organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text))
  OR public.is_platform_admin()
)
WITH CHECK (
  (organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text))
  OR public.is_platform_admin()
);

-- Master Catalog & Settings Tables (Select: all org members; Write: Org/HR/Payroll Admins)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'garment_org_settings',
    'garment_production_units',
    'garment_production_teams',
    'garment_styles',
    'garment_operations',
    'garment_production_orders',
    'garment_piece_rate_cards',
    'garment_incentive_rules',
    'garment_payroll_cycles'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%I_select" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I_select" ON public.%I FOR SELECT TO authenticated USING (organization_id = (SELECT public.get_active_user_org_id()) OR public.is_platform_admin());', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_write" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I_write" ON public.%I FOR ALL TO authenticated USING ((organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text)) OR public.is_platform_admin()) WITH CHECK ((organization_id = (SELECT public.get_active_user_org_id()) AND public.is_org_admin(organization_id::text)) OR public.is_platform_admin());', tbl, tbl);
  END LOOP;
END $$;

-- Worker-Scoped Read Tables (Select: Own employee record OR Supervisor/Admin; Write: Org Admin or Supervisor where operational)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'garment_worker_profiles',
    'garment_wage_assignments',
    'garment_production_allocations',
    'garment_incentive_awards',
    'garment_advances_ledger',
    'garment_payroll_lines'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%I_select" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I_select" ON public.%I FOR SELECT TO authenticated USING (public.is_platform_admin() OR (organization_id = (SELECT public.get_active_user_org_id()) AND (employee_id = (SELECT public.get_active_user_employee_id()) OR public.is_garment_supervisor(organization_id) OR public.is_org_admin(organization_id::text))));', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_write" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I_write" ON public.%I FOR ALL TO authenticated USING ((organization_id = (SELECT public.get_active_user_org_id()) AND (public.is_org_admin(organization_id::text) OR public.is_garment_supervisor(organization_id))) OR public.is_platform_admin()) WITH CHECK ((organization_id = (SELECT public.get_active_user_org_id()) AND (public.is_org_admin(organization_id::text) OR public.is_garment_supervisor(organization_id))) OR public.is_platform_admin());', tbl, tbl);
  END LOOP;
END $$;

-- Floor Attendance & Production Entries (Read: Own or Supervisor/Admin; Write: Supervisor/Admin for org)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'garment_floor_attendance',
    'garment_production_entries'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%I_select" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I_select" ON public.%I FOR SELECT TO authenticated USING (public.is_platform_admin() OR (organization_id = (SELECT public.get_active_user_org_id()) AND (employee_id = (SELECT public.get_active_user_employee_id()) OR public.is_garment_supervisor(organization_id) OR public.is_org_admin(organization_id::text))));', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_write" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%I_write" ON public.%I FOR ALL TO authenticated USING ((organization_id = (SELECT public.get_active_user_org_id()) AND (public.is_garment_supervisor(organization_id) OR public.is_org_admin(organization_id::text))) OR public.is_platform_admin()) WITH CHECK ((organization_id = (SELECT public.get_active_user_org_id()) AND (public.is_garment_supervisor(organization_id) OR public.is_org_admin(organization_id::text))) OR public.is_platform_admin());', tbl, tbl);
  END LOOP;
END $$;

-- Correction Requests & Disputes: Workers can insert & view their own disputes; Supervisors/Admins can view & review org requests
DROP POLICY IF EXISTS "garment_correction_requests_select" ON public.garment_correction_requests;
CREATE POLICY "garment_correction_requests_select" ON public.garment_correction_requests
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.get_active_user_employee_id())
      OR requested_by_employee_id = (SELECT public.get_active_user_employee_id())
      OR public.is_garment_supervisor(organization_id)
      OR public.is_org_admin(organization_id::text)
    )
  )
);

DROP POLICY IF EXISTS "garment_correction_requests_insert" ON public.garment_correction_requests;
CREATE POLICY "garment_correction_requests_insert" ON public.garment_correction_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
      employee_id = (SELECT public.get_active_user_employee_id())
      OR requested_by_employee_id = (SELECT public.get_active_user_employee_id())
      OR public.is_garment_supervisor(organization_id)
      OR public.is_org_admin(organization_id::text)
    )
  )
);

DROP POLICY IF EXISTS "garment_correction_requests_update" ON public.garment_correction_requests;
CREATE POLICY "garment_correction_requests_update" ON public.garment_correction_requests
FOR UPDATE TO authenticated
USING (
  (organization_id = (SELECT public.get_active_user_org_id()) AND (public.is_garment_supervisor(organization_id) OR public.is_org_admin(organization_id::text)))
  OR public.is_platform_admin()
)
WITH CHECK (
  (organization_id = (SELECT public.get_active_user_org_id()) AND (public.is_garment_supervisor(organization_id) OR public.is_org_admin(organization_id::text)))
  OR public.is_platform_admin()
);

-- Audit Logs: Read by Admins/Supervisors, Insert by authenticated org members (no delete/update)
DROP POLICY IF EXISTS "garment_audit_logs_select" ON public.garment_audit_logs;
CREATE POLICY "garment_audit_logs_select" ON public.garment_audit_logs
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR (organization_id = (SELECT public.get_active_user_org_id()) AND (public.is_org_admin(organization_id::text) OR public.is_garment_supervisor(organization_id)))
);

DROP POLICY IF EXISTS "garment_audit_logs_insert" ON public.garment_audit_logs;
CREATE POLICY "garment_audit_logs_insert" ON public.garment_audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT public.get_active_user_org_id())
  OR public.is_platform_admin()
);

-- ============================================================================
-- 12. IDEMPOTENT OFFLINE MOBILE BATCH SYNC RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_submit_garment_floor_batch(
  p_organization_id UUID,
  p_attendance_items JSONB DEFAULT '[]'::jsonb,
  p_production_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_active_org UUID;
  v_item JSONB;
  v_att_count INTEGER := 0;
  v_prod_count INTEGER := 0;
  v_emp_id UUID;
BEGIN
  v_active_org := public.get_active_user_org_id();
  IF NOT (public.is_platform_admin() OR (v_active_org = p_organization_id AND (public.is_garment_supervisor(p_organization_id) OR public.is_org_admin(p_organization_id::text)))) THEN
    RAISE EXCEPTION 'Unauthorized to submit garment floor batch for organization %', p_organization_id;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_attendance_items, '[]'::jsonb))
  LOOP
    v_emp_id := (v_item->>'employee_id')::uuid;
    INSERT INTO public.garment_floor_attendance (
      organization_id, work_date, shift_id, production_unit_id, team_id,
      employee_id, supervisor_employee_id, status, payable_day_factor,
      worked_hours, overtime_hours, source, approval_status, client_idempotency_key, remarks
    ) VALUES (
      p_organization_id,
      (v_item->>'work_date')::date,
      NULLIF(v_item->>'shift_id', '')::uuid,
      NULLIF(v_item->>'production_unit_id', '')::uuid,
      NULLIF(v_item->>'team_id', '')::uuid,
      v_emp_id,
      NULLIF(v_item->>'supervisor_employee_id', '')::uuid,
      COALESCE(v_item->>'status', 'PRESENT'),
      COALESCE((v_item->>'payable_day_factor')::numeric, 1.00),
      COALESCE((v_item->>'worked_hours')::numeric, 8.00),
      COALESCE((v_item->>'overtime_hours')::numeric, 0.00),
      COALESCE(v_item->>'source', 'SUPERVISOR_MOBILE'),
      COALESCE(v_item->>'approval_status', 'SUBMITTED'),
      NULLIF(v_item->>'client_idempotency_key', ''),
      v_item->>'remarks'
    )
    ON CONFLICT (organization_id, employee_id, work_date) DO UPDATE SET
      status = EXCLUDED.status,
      payable_day_factor = EXCLUDED.payable_day_factor,
      worked_hours = EXCLUDED.worked_hours,
      overtime_hours = EXCLUDED.overtime_hours,
      shift_id = COALESCE(EXCLUDED.shift_id, public.garment_floor_attendance.shift_id),
      production_unit_id = COALESCE(EXCLUDED.production_unit_id, public.garment_floor_attendance.production_unit_id),
      team_id = COALESCE(EXCLUDED.team_id, public.garment_floor_attendance.team_id),
      remarks = COALESCE(EXCLUDED.remarks, public.garment_floor_attendance.remarks),
      approval_status = CASE WHEN public.garment_floor_attendance.approval_status = 'LOCKED' THEN 'LOCKED' ELSE EXCLUDED.approval_status END;

    v_att_count := v_att_count + 1;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_production_items, '[]'::jsonb))
  LOOP
    INSERT INTO public.garment_production_entries (
      organization_id, work_date, shift_id, production_unit_id, team_id,
      order_id, style_id, operation_id, allocation_mode, shared_split_method,
      employee_id, supervisor_employee_id, produced_qty, accepted_qty, rejected_qty,
      rework_qty, rework_accepted_qty, rejection_reason_code, rejection_reason_notes,
      applied_unit_rate, payable_units, computed_piece_amount, qc_status, approval_status,
      client_idempotency_key, notes
    ) VALUES (
      p_organization_id,
      (v_item->>'work_date')::date,
      NULLIF(v_item->>'shift_id', '')::uuid,
      NULLIF(v_item->>'production_unit_id', '')::uuid,
      NULLIF(v_item->>'team_id', '')::uuid,
      NULLIF(v_item->>'order_id', '')::uuid,
      NULLIF(v_item->>'style_id', '')::uuid,
      (v_item->>'operation_id')::uuid,
      COALESCE(v_item->>'allocation_mode', 'INDIVIDUAL'),
      NULLIF(v_item->>'shared_split_method', ''),
      NULLIF(v_item->>'employee_id', '')::uuid,
      NULLIF(v_item->>'supervisor_employee_id', '')::uuid,
      COALESCE((v_item->>'produced_qty')::numeric, 0),
      COALESCE((v_item->>'accepted_qty')::numeric, 0),
      COALESCE((v_item->>'rejected_qty')::numeric, 0),
      COALESCE((v_item->>'rework_qty')::numeric, 0),
      COALESCE((v_item->>'rework_accepted_qty')::numeric, 0),
      NULLIF(v_item->>'rejection_reason_code', ''),
      v_item->>'rejection_reason_notes',
      COALESCE((v_item->>'applied_unit_rate')::numeric, 0),
      COALESCE((v_item->>'payable_units')::numeric, COALESCE((v_item->>'accepted_qty')::numeric, 0)),
      COALESCE((v_item->>'computed_piece_amount')::numeric, 0),
      COALESCE(v_item->>'qc_status', 'PENDING'),
      COALESCE(v_item->>'approval_status', 'SUBMITTED'),
      NULLIF(v_item->>'client_idempotency_key', ''),
      v_item->>'notes'
    )
    ON CONFLICT DO NOTHING;

    v_prod_count := v_prod_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'attendance_synced', v_att_count,
    'production_synced', v_prod_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_submit_garment_floor_batch(UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_submit_garment_floor_batch(UUID, JSONB, JSONB) TO authenticated, service_role;

-- ============================================================================
-- 13. INITIALIZE DEFAULT GARMENT SAAS ADD-ON ENTITLEMENT FOR PRIMARY TENANT
-- ============================================================================
INSERT INTO public.organization_addon_entitlements (
  organization_id, addon_key, is_enabled, plan_tier, config_json, enabled_at
)
SELECT
  id,
  'garment_workforce',
  true,
  COALESCE(UPPER(plan), 'BUSINESS'),
  jsonb_build_object(
    'piece_rate_calculation_mode', 'CONFIGURABLE_PER_ORDER',
    'default_rework_payment_rule', 'ACCEPTED_ONLY'
  ),
  now()
FROM public.organizations
WHERE id = '0c621892-e938-4707-9957-13534ea32c19'
ON CONFLICT (organization_id, addon_key) DO NOTHING;

INSERT INTO public.garment_org_settings (organization_id)
SELECT id FROM public.organizations WHERE id = '0c621892-e938-4707-9957-13534ea32c19'
ON CONFLICT (organization_id) DO NOTHING;

