-- ============================================================================
-- Migration 029: WorkForceOS Enterprise Offboarding & Separation Engine
-- Production Grade Separation, Clearance, Exit Interview, and F&F Readiness
-- ============================================================================

-- 1. Employee Separations Table
CREATE TABLE IF NOT EXISTS employee_separations (
  id TEXT PRIMARY KEY DEFAULT ('sep-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_entity_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  vendor_id TEXT REFERENCES vendors(id) ON DELETE SET NULL,
  employment_source TEXT NOT NULL DEFAULT 'DIRECT'
    CHECK (employment_source IN ('DIRECT', 'VENDOR')),
  separation_type TEXT NOT NULL
    CHECK (separation_type IN (
      'RESIGNATION',
      'TERMINATION',
      'LAYOFF',
      'CONTRACT_END',
      'RETIREMENT',
      'ABSCONDING',
      'DEATH',
      'TRANSFER_OUT',
      'OTHER'
    )),
  reason_code TEXT NOT NULL
    CHECK (reason_code IN (
      'CAREER_GROWTH',
      'COMPENSATION',
      'MANAGEMENT',
      'WORK_CULTURE',
      'RELOCATION',
      'HIGHER_EDUCATION',
      'PERSONAL',
      'HEALTH',
      'RETIREMENT',
      'CONTRACT_END',
      'PERFORMANCE',
      'MISCONDUCT',
      'BUSINESS_RESTRUCTURING',
      'OTHER'
    )),
  reason_text TEXT,
  resignation_date DATE NOT NULL,
  proposed_last_working_date DATE,
  notice_period_days INT NOT NULL DEFAULT 30,
  notice_start_date DATE NOT NULL,
  expected_last_working_date DATE NOT NULL,
  approved_last_working_date DATE,
  actual_last_working_date DATE,
  status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN (
      'DRAFT',
      'SUBMITTED',
      'HR_REVIEW',
      'MANAGER_REVIEW',
      'NOTICE_PERIOD',
      'CLEARANCE',
      'FNF_PROCESSING',
      'FINAL_REVIEW',
      'READY_TO_EXIT',
      'COMPLETED',
      'CANCELLED',
      'REJECTED',
      'ON_HOLD'
    )),
  initiated_by TEXT NOT NULL,
  initiated_role TEXT NOT NULL DEFAULT 'EMPLOYEE',
  approved_by TEXT,
  comments TEXT,
  supporting_document_url TEXT,
  retention_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE'
    CHECK (retention_status IN (
      'NOT_APPLICABLE',
      'PENDING',
      'DISCUSSION_ONGOING',
      'RETAINED',
      'CONTINUE_EXIT'
    )),
  retention_notes TEXT,
  rehire_eligibility TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (rehire_eligibility IN (
      'ELIGIBLE',
      'NOT_ELIGIBLE',
      'REVIEW_REQUIRED',
      'UNKNOWN'
    )),
  rehire_ineligible_reason TEXT,
  is_early_release BOOLEAN NOT NULL DEFAULT FALSE,
  notice_waiver_days INT NOT NULL DEFAULT 0,
  notice_buyout_days INT NOT NULL DEFAULT 0,
  override_reason TEXT,
  override_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_separations_org ON employee_separations(organization_id);
CREATE INDEX IF NOT EXISTS idx_separations_emp ON employee_separations(employee_id);
CREATE INDEX IF NOT EXISTS idx_separations_status ON employee_separations(status);
CREATE INDEX IF NOT EXISTS idx_separations_type ON employee_separations(separation_type);
CREATE INDEX IF NOT EXISTS idx_separations_lwd ON employee_separations(expected_last_working_date);

-- 2. Separation Tasks (Knowledge Transfer & Project Transitions)
CREATE TABLE IF NOT EXISTS separation_tasks (
  id TEXT PRIMARY KEY DEFAULT ('stask-' || gen_random_uuid()::text),
  separation_id TEXT NOT NULL REFERENCES employee_separations(id) ON DELETE CASCADE,
  task_category TEXT NOT NULL DEFAULT 'KNOWLEDGE_TRANSFER'
    CHECK (task_category IN (
      'KNOWLEDGE_TRANSFER',
      'DOCUMENT_HANDOVER',
      'PROJECT_HANDOVER',
      'CLIENT_HANDOVER',
      'RESPONSIBILITIES',
      'OTHER'
    )),
  title TEXT NOT NULL,
  description TEXT,
  handover_owner_id TEXT,
  handover_owner_name TEXT,
  recipient_id TEXT,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'WAIVED')),
  due_date DATE,
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sep_tasks_sep ON separation_tasks(separation_id);
CREATE INDEX IF NOT EXISTS idx_sep_tasks_status ON separation_tasks(status);

-- 3. Separation Clearances Table (Department Clearance Matrix)
CREATE TABLE IF NOT EXISTS separation_clearances (
  id TEXT PRIMARY KEY DEFAULT ('sclear-' || gen_random_uuid()::text),
  separation_id TEXT NOT NULL REFERENCES employee_separations(id) ON DELETE CASCADE,
  department TEXT NOT NULL
    CHECK (department IN (
      'MANAGER',
      'TEAM_LEAD',
      'IT',
      'ASSET',
      'FINANCE',
      'PAYROLL',
      'HR',
      'ADMIN',
      'LEGAL'
    )),
  clearance_item TEXT NOT NULL,
  assigned_to TEXT,
  assigned_role TEXT NOT NULL DEFAULT 'HR',
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'CLEARED', 'REJECTED', 'WAIVED')),
  due_date DATE,
  comments TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sep_clear_sep ON separation_clearances(separation_id);
CREATE INDEX IF NOT EXISTS idx_sep_clear_dept ON separation_clearances(department);
CREATE INDEX IF NOT EXISTS idx_sep_clear_status ON separation_clearances(status);

-- 4. Separation Asset Recoveries Table
CREATE TABLE IF NOT EXISTS separation_asset_recoveries (
  id TEXT PRIMARY KEY DEFAULT ('sasset-' || gen_random_uuid()::text),
  separation_id TEXT NOT NULL REFERENCES employee_separations(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  serial_number TEXT,
  category TEXT,
  assigned_date DATE,
  asset_value NUMERIC(12,2) DEFAULT 0,
  condition TEXT DEFAULT 'GOOD'
    CHECK (condition IN ('EXCELLENT', 'GOOD', 'DAMAGED', 'NEEDS_REPAIR')),
  recovery_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (recovery_status IN ('PENDING', 'RETURN_SCHEDULED', 'RETURNED', 'DAMAGED', 'MISSING', 'WAIVED')),
  returned_date DATE,
  received_by TEXT,
  damage_assessment TEXT,
  financial_recovery_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sep_asset_sep ON separation_asset_recoveries(separation_id);
CREATE INDEX IF NOT EXISTS idx_sep_asset_status ON separation_asset_recoveries(recovery_status);

-- 5. Exit Interviews Table
CREATE TABLE IF NOT EXISTS exit_interviews (
  id TEXT PRIMARY KEY DEFAULT ('exit-int-' || gen_random_uuid()::text),
  separation_id TEXT NOT NULL REFERENCES employee_separations(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  interview_date DATE DEFAULT CURRENT_DATE,
  conducted_by TEXT,
  primary_reason TEXT NOT NULL,
  secondary_reason TEXT,
  general_feedback TEXT,
  manager_feedback TEXT,
  culture_feedback TEXT,
  compensation_feedback TEXT,
  recommendation TEXT,
  rehire_eligible TEXT NOT NULL DEFAULT 'ELIGIBLE'
    CHECK (rehire_eligible IN ('ELIGIBLE', 'NOT_ELIGIBLE', 'REVIEW_REQUIRED', 'UNKNOWN')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_sep_exit_interview UNIQUE (separation_id)
);

CREATE INDEX IF NOT EXISTS idx_exit_int_sep ON exit_interviews(separation_id);
CREATE INDEX IF NOT EXISTS idx_exit_int_emp ON exit_interviews(employee_id);

-- 6. Separation F&F Readiness Table
CREATE TABLE IF NOT EXISTS separation_fnf_readiness (
  id TEXT PRIMARY KEY DEFAULT ('fnf-rdy-' || gen_random_uuid()::text),
  separation_id TEXT NOT NULL REFERENCES employee_separations(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'INPUTS_PENDING'
    CHECK (status IN (
      'NOT_STARTED',
      'INPUTS_PENDING',
      'READY_FOR_PAYROLL',
      'CALCULATION_IN_PROGRESS',
      'APPROVAL_PENDING',
      'APPROVED',
      'SETTLED'
    )),
  worked_days NUMERIC(5,1) DEFAULT 0,
  lop_days NUMERIC(5,1) DEFAULT 0,
  leave_encashment_days NUMERIC(5,1) DEFAULT 0,
  notice_buyout_days NUMERIC(5,1) DEFAULT 0,
  notice_waiver_days NUMERIC(5,1) DEFAULT 0,
  asset_recovery_deduction NUMERIC(12,2) DEFAULT 0,
  outstanding_advances NUMERIC(12,2) DEFAULT 0,
  expense_claims_payable NUMERIC(12,2) DEFAULT 0,
  pending_salary_payable NUMERIC(12,2) DEFAULT 0,
  gratuity_eligible BOOLEAN DEFAULT FALSE,
  gratuity_amount NUMERIC(12,2) DEFAULT 0,
  net_payable_estimated NUMERIC(12,2) DEFAULT 0,
  payroll_settlement_reference TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_sep_fnf_readiness UNIQUE (separation_id)
);

CREATE INDEX IF NOT EXISTS idx_sep_fnf_sep ON separation_fnf_readiness(separation_id);
CREATE INDEX IF NOT EXISTS idx_sep_fnf_status ON separation_fnf_readiness(status);

-- 7. Separation Audit Logs Table
CREATE TABLE IF NOT EXISTS separation_audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('sep-aud-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  separation_id TEXT NOT NULL REFERENCES employee_separations(id) ON DELETE CASCADE,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  actor_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sep_aud_sep ON separation_audit_logs(separation_id);
CREATE INDEX IF NOT EXISTS idx_sep_aud_org ON separation_audit_logs(organization_id);

-- ============================================================================
-- SQL Aggregation Views
-- ============================================================================

-- View 1: Comprehensive Separation Summary View
CREATE OR REPLACE VIEW v_separation_summary AS
SELECT
  s.id AS separation_id,
  s.organization_id,
  s.legal_entity_id,
  s.employee_id,
  e.first_name || ' ' || e.last_name AS employee_name,
  e.employee_code,
  e.work_email,
  e.department_id,
  COALESCE(e.department_name, d.name) AS department_name,
  e.designation_id,
  COALESCE(e.designation_title, desig.title) AS designation_title,
  e.employment->>'reporting_manager_id' AS manager_id,
  COALESCE(e.employment->>'reporting_manager_name', 'Dharun Joy') AS manager_name,
  s.employment_source,
  s.vendor_id,
  v.legal_name AS vendor_name,
  s.separation_type,
  s.reason_code,
  s.reason_text,
  s.resignation_date,
  s.notice_period_days,
  s.notice_start_date,
  s.expected_last_working_date,
  s.approved_last_working_date,
  s.actual_last_working_date,
  s.status AS separation_status,
  s.retention_status,
  s.rehire_eligibility,
  s.initiated_by,
  s.initiated_role,
  s.approved_by,
  s.created_at,
  s.updated_at,
  s.completed_at,
  COUNT(c.id) AS total_clearances_count,
  COUNT(c.id) FILTER (WHERE c.status = 'CLEARED') AS cleared_clearances_count,
  COUNT(c.id) FILTER (WHERE c.status = 'PENDING') AS pending_clearances_count,
  COUNT(c.id) FILTER (WHERE c.status = 'REJECTED') AS rejected_clearances_count,
  COUNT(c.id) FILTER (WHERE c.status IN ('PENDING', 'IN_PROGRESS') AND c.due_date < CURRENT_DATE) AS overdue_clearances_count,
  COUNT(t.id) AS total_tasks_count,
  COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') AS completed_tasks_count,
  COUNT(a.id) AS total_assets_count,
  COUNT(a.id) FILTER (WHERE a.recovery_status = 'RETURNED') AS returned_assets_count,
  COUNT(a.id) FILTER (WHERE a.recovery_status IN ('DAMAGED', 'MISSING')) AS issue_assets_count,
  fnf.status AS fnf_status
FROM employee_separations s
JOIN employees e ON s.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN designations desig ON e.designation_id = desig.id
LEFT JOIN vendors v ON s.vendor_id = v.id
LEFT JOIN separation_clearances c ON s.id = c.separation_id
LEFT JOIN separation_tasks t ON s.id = t.separation_id
LEFT JOIN separation_asset_recoveries a ON s.id = a.separation_id
LEFT JOIN separation_fnf_readiness fnf ON s.id = fnf.separation_id
GROUP BY s.id, s.organization_id, s.legal_entity_id, s.employee_id, e.first_name, e.last_name,
         e.employee_code, e.work_email, e.department_id, e.department_name, d.name,
         e.designation_id, e.designation_title, desig.title,
         e.employment, s.employment_source, s.vendor_id, v.legal_name,
         s.separation_type, s.reason_code, s.reason_text, s.resignation_date,
         s.notice_period_days, s.notice_start_date, s.expected_last_working_date,
         s.approved_last_working_date, s.actual_last_working_date, s.status,
         s.retention_status, s.rehire_eligibility, s.initiated_by, s.initiated_role,
         s.approved_by, s.created_at, s.updated_at, s.completed_at, fnf.status;

-- View 2: Clearance Summary View
CREATE OR REPLACE VIEW v_clearance_summary AS
SELECT
  c.id AS clearance_id,
  c.separation_id,
  s.employee_id,
  e.first_name || ' ' || e.last_name AS employee_name,
  e.employee_code,
  c.department,
  c.clearance_item,
  c.assigned_to,
  c.assigned_role,
  c.status AS clearance_status,
  c.due_date,
  CASE WHEN c.status IN ('PENDING', 'IN_PROGRESS') AND c.due_date < CURRENT_DATE THEN TRUE ELSE FALSE END AS is_overdue,
  c.comments,
  c.completed_at,
  c.completed_by
FROM separation_clearances c
JOIN employee_separations s ON c.separation_id = s.id
JOIN employees e ON s.employee_id = e.id;

-- View 3: Notice Period Summary View
CREATE OR REPLACE VIEW v_notice_period_summary AS
SELECT
  s.id AS separation_id,
  s.employee_id,
  e.first_name || ' ' || e.last_name AS employee_name,
  e.employee_code,
  s.notice_period_days,
  s.notice_start_date,
  COALESCE(s.approved_last_working_date, s.expected_last_working_date) AS effective_lwd,
  GREATEST(0, (COALESCE(s.approved_last_working_date, s.expected_last_working_date) - CURRENT_DATE)) AS days_remaining,
  s.is_early_release,
  s.notice_waiver_days,
  s.notice_buyout_days,
  s.status AS separation_status
FROM employee_separations s
JOIN employees e ON s.employee_id = e.id
WHERE s.status NOT IN ('COMPLETED', 'CANCELLED', 'REJECTED');
