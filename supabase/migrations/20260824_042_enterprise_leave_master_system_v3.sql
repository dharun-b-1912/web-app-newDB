-- ============================================================
-- JCS WorkforceOS Enterprise HRMS — Leave Management Suite v3.0
-- Migration: 20260824_042_enterprise_leave_master_system_v3.sql
-- ============================================================

-- 1. LEAVE TYPES TABLE (9-Tab Enterprise Configuration)
CREATE TABLE IF NOT EXISTS public.leave_types (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-default',
  company_id TEXT NOT NULL DEFAULT 'comp-01',
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(30) NOT NULL DEFAULT 'Paid' CHECK (category IN ('Paid', 'Unpaid', 'Statutory', 'Compensatory', 'Special')),
  is_paid BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  gender_applicability VARCHAR(20) NOT NULL DEFAULT 'All' CHECK (gender_applicability IN ('All', 'Male', 'Female', 'Other')),
  employment_types JSONB NOT NULL DEFAULT '["Full Time", "Confirmed", "Probation"]'::jsonb,
  min_service_days INTEGER NOT NULL DEFAULT 0,
  max_days_per_request NUMERIC(5,1) NOT NULL DEFAULT 14.0,
  min_days_per_request NUMERIC(5,1) NOT NULL DEFAULT 0.5,
  allow_half_day BOOLEAN NOT NULL DEFAULT true,
  allow_hourly BOOLEAN NOT NULL DEFAULT false,
  allow_negative_balance BOOLEAN NOT NULL DEFAULT false,
  max_negative_balance NUMERIC(5,1) DEFAULT 0.0,
  allow_carry_forward BOOLEAN NOT NULL DEFAULT false,
  max_carry_forward_days NUMERIC(5,1) DEFAULT 0.0,
  carry_forward_expiry_months INTEGER DEFAULT 0,
  allow_encashment BOOLEAN NOT NULL DEFAULT false,
  max_encashment_days_per_year NUMERIC(5,1) DEFAULT 0.0,
  min_balance_for_encashment NUMERIC(5,1) DEFAULT 0.0,
  encashment_calculation_basis VARCHAR(30) DEFAULT 'BasicSalary',
  attachment_required BOOLEAN NOT NULL DEFAULT false,
  attachment_mandatory_days_threshold NUMERIC(5,1) DEFAULT 2.0,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  approval_levels INTEGER NOT NULL DEFAULT 1,
  allow_backdated BOOLEAN NOT NULL DEFAULT true,
  max_backdated_days INTEGER NOT NULL DEFAULT 2,
  allow_future BOOLEAN NOT NULL DEFAULT true,
  max_future_days INTEGER NOT NULL DEFAULT 90,
  allow_cancellation BOOLEAN NOT NULL DEFAULT true,
  allow_modification BOOLEAN NOT NULL DEFAULT true,
  converts_to_lop_if_exhausted BOOLEAN NOT NULL DEFAULT true,
  applicable_locations JSONB NOT NULL DEFAULT '["All"]'::jsonb,
  applicable_departments JSONB NOT NULL DEFAULT '["All"]'::jsonb,
  applicable_employee_groups JSONB NOT NULL DEFAULT '["All"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. LEAVE POLICIES TABLE (Multi-Tenant Precedence Engine)
CREATE TABLE IF NOT EXISTS public.leave_policies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-default',
  company_id TEXT NOT NULL DEFAULT 'comp-01',
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  applicable_groups JSONB NOT NULL DEFAULT '["All"]'::jsonb,
  employment_types JSONB NOT NULL DEFAULT '["Full Time"]'::jsonb,
  departments JSONB NOT NULL DEFAULT '["All"]'::jsonb,
  locations JSONB NOT NULL DEFAULT '["All"]'::jsonb,
  grades JSONB NOT NULL DEFAULT '["All"]'::jsonb,
  designations JSONB NOT NULL DEFAULT '["All"]'::jsonb,
  effective_from DATE NOT NULL,
  effective_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Draft', 'Archived')),
  priority INTEGER NOT NULL DEFAULT 1,
  precedence_rule VARCHAR(50) NOT NULL DEFAULT 'HighPriorityWins',
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. HOLIDAY CALENDARS & HOLIDAYS
CREATE TABLE IF NOT EXISTS public.holiday_calendars (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-default',
  company_id TEXT NOT NULL DEFAULT 'comp-01',
  name VARCHAR(150) NOT NULL,
  location_ids JSONB NOT NULL DEFAULT '["All"]'::jsonb,
  year INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  weekly_offs JSONB NOT NULL DEFAULT '["Saturday", "Sunday"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.holidays (
  id TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL REFERENCES public.holiday_calendars(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'Public',
  is_optional BOOLEAN NOT NULL DEFAULT false,
  description TEXT
);

-- 4. LEAVE ENTITLEMENTS (Closing Formula Balances)
CREATE TABLE IF NOT EXISTS public.leave_entitlements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-default',
  company_id TEXT NOT NULL DEFAULT 'comp-01',
  employee_id TEXT NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  leave_type_id TEXT NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  leave_type_name VARCHAR(100) NOT NULL,
  policy_id TEXT,
  policy_name VARCHAR(150),
  period VARCHAR(20) NOT NULL,
  opening_balance NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  granted NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  accrued NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  carried_forward NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  adjustments NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  used NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  pending NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  encashed NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  expired NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  closing_balance NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  available_balance NUMERIC(6,2) NOT NULL DEFAULT 0.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_entitlement_record UNIQUE (employee_id, leave_type_id, period)
);

-- 5. LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-default',
  company_id TEXT NOT NULL DEFAULT 'comp-01',
  request_code VARCHAR(30) NOT NULL UNIQUE,
  employee_id TEXT NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  leave_type_id TEXT NOT NULL REFERENCES public.leave_types(id),
  leave_type_name VARCHAR(100) NOT NULL,
  leave_type_code VARCHAR(20) NOT NULL,
  leave_category VARCHAR(30) NOT NULL DEFAULT 'Paid',
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  total_calendar_days NUMERIC(5,1) NOT NULL DEFAULT 1.0,
  working_days NUMERIC(5,1) NOT NULL DEFAULT 1.0,
  holiday_days NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  weekly_off_days NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  leave_days_deducted NUMERIC(5,1) NOT NULL DEFAULT 1.0,
  is_half_day BOOLEAN NOT NULL DEFAULT false,
  half_day_session VARCHAR(20),
  is_hourly BOOLEAN NOT NULL DEFAULT false,
  hourly_duration_minutes INTEGER DEFAULT 0,
  reason TEXT NOT NULL,
  comments TEXT,
  attachment_url TEXT,
  contact_number VARCHAR(30),
  alternate_contact VARCHAR(30),
  manager_id TEXT NOT NULL,
  manager_name VARCHAR(150) NOT NULL,
  current_approver_name VARCHAR(150),
  status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Draft', 'Submitted', 'Pending', 'Approved', 'Rejected', 'Cancelled', 'Revoked', 'Escalated')),
  rejection_reason TEXT,
  cancellation_reason TEXT,
  is_lop BOOLEAN NOT NULL DEFAULT false,
  daily_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. IMMUTABLE LEAVE LEDGER TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.leave_ledger_transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-default',
  company_id TEXT NOT NULL DEFAULT 'comp-01',
  employee_id TEXT NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  leave_type_id TEXT NOT NULL,
  leave_type_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('Opening', 'Accrual', 'Grant', 'Consumption', 'Adjustment', 'Encashment', 'Lapse', 'Reversal', 'CarryForward')),
  amount NUMERIC(6,2) NOT NULL,
  balance_after NUMERIC(6,2) NOT NULL,
  reference_id TEXT,
  actor_id TEXT NOT NULL,
  actor_name VARCHAR(150) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. COMPENSATORY OFF GRANTS
CREATE TABLE IF NOT EXISTS public.comp_off_grants (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-default',
  company_id TEXT NOT NULL DEFAULT 'comp-01',
  employee_id TEXT NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  earned_date DATE NOT NULL,
  worked_date DATE,
  source VARCHAR(50) DEFAULT 'WeekendWork',
  hours_worked NUMERIC(4,1) DEFAULT 8.0,
  comp_off_days_earned NUMERIC(4,1) NOT NULL DEFAULT 1.0,
  credit_days NUMERIC(4,1) NOT NULL DEFAULT 1.0,
  expiry_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PendingApproval' CHECK (status IN ('PendingApproval', 'Available', 'Used', 'Expired', 'Approved', 'Pending')),
  approved_by_name VARCHAR(150),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. LEAVE ENCASHMENTS
CREATE TABLE IF NOT EXISTS public.leave_encashments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-default',
  company_id TEXT NOT NULL DEFAULT 'comp-01',
  request_code VARCHAR(30) NOT NULL UNIQUE,
  employee_id TEXT NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  department_name VARCHAR(100),
  leave_type_id TEXT NOT NULL,
  leave_type_name VARCHAR(100) NOT NULL,
  available_balance NUMERIC(6,2) NOT NULL,
  requested_days NUMERIC(5,1) NOT NULL,
  days_to_encash NUMERIC(5,1) NOT NULL,
  eligible_days NUMERIC(5,1) NOT NULL DEFAULT 10.0,
  calculation_basis VARCHAR(30) NOT NULL DEFAULT 'BasicSalary',
  estimated_amount NUMERIC(10,2) NOT NULL,
  payroll_period VARCHAR(30) NOT NULL,
  payroll_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  status VARCHAR(30) NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Approved', 'Rejected', 'ProcessedInPayroll', 'Pending')),
  approved_by_name VARCHAR(150),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- 9. LEAVE ADJUSTMENTS
CREATE TABLE IF NOT EXISTS public.leave_adjustments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-default',
  company_id TEXT NOT NULL DEFAULT 'comp-01',
  employee_id TEXT NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  leave_type_id TEXT NOT NULL,
  leave_type_name VARCHAR(100) NOT NULL,
  adjustment_type VARCHAR(30) NOT NULL CHECK (adjustment_type IN ('Add', 'Deduct', 'Transfer', 'Correction', 'CarryForwardGrant', 'Grant', 'Deduction')),
  amount NUMERIC(6,2) NOT NULL,
  reason TEXT NOT NULL,
  reference_no VARCHAR(50),
  effective_date DATE NOT NULL,
  created_by_name VARCHAR(150),
  actor_name VARCHAR(150),
  supporting_doc_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'Approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. LEAVE EXCEPTIONS
CREATE TABLE IF NOT EXISTS public.leave_exceptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-default',
  company_id TEXT NOT NULL DEFAULT 'comp-01',
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (severity IN ('High', 'Medium', 'Low')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  employee_id TEXT,
  employee_name VARCHAR(150) NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  rule_violated TEXT,
  current_state TEXT,
  recommended_action TEXT,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
  resolved_by VARCHAR(150),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- 11. ACCRUAL RUN LOGS
CREATE TABLE IF NOT EXISTS public.accrual_execution_logs (
  id TEXT PRIMARY KEY,
  period VARCHAR(20) NOT NULL,
  run_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employees_processed INTEGER NOT NULL DEFAULT 0,
  total_leave_days_credited NUMERIC(8,2) NOT NULL DEFAULT 0.0,
  status VARCHAR(30) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Failed', 'Partial', 'Reversed', 'Success')),
  reversed_at TIMESTAMPTZ,
  reversed_by VARCHAR(150)
);

-- 12. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.leave_audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT NOT NULL,
  actor_name VARCHAR(150) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45)
);

-- INDEXES FOR ENTERPRISE QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_leave_req_emp_dept ON public.leave_requests(employee_id, department_name, status);
CREATE INDEX IF NOT EXISTS idx_leave_req_date_span ON public.leave_requests(from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_leave_ledger_emp_type ON public.leave_ledger_transactions(employee_id, leave_type_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_ent_emp_type_period ON public.leave_entitlements(employee_id, leave_type_id, period);
CREATE INDEX IF NOT EXISTS idx_compoff_emp_status ON public.comp_off_grants(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_encash_emp_status ON public.leave_encashments(employee_id, status);
