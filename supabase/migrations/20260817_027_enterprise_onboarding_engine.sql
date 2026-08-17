-- ============================================================================
-- Migration 027: WorkForceOS Enterprise Onboarding Engine 2.0
-- Compatible with PostgreSQL TEXT Primary & Foreign Keys
-- ============================================================================

-- 1. Employee Onboardings Table
CREATE TABLE IF NOT EXISTS employee_onboardings (
  id TEXT PRIMARY KEY DEFAULT ('onb-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_entity_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  vendor_id TEXT REFERENCES vendors(id) ON DELETE SET NULL,
  employment_source TEXT NOT NULL DEFAULT 'DIRECT'
    CHECK (employment_source IN ('DIRECT', 'VENDOR')),
  status TEXT NOT NULL DEFAULT 'INITIATED'
    CHECK (status IN (
      'DRAFT',
      'INITIATED',
      'DOCUMENT_COLLECTION',
      'HR_VERIFICATION',
      'MANAGER_REVIEW',
      'IT_SETUP',
      'POLICY_ACKNOWLEDGEMENT',
      'PAYROLL_SETUP',
      'FINAL_REVIEW',
      'READY_TO_ACTIVATE',
      'COMPLETED',
      'CANCELLED',
      'ON_HOLD'
    )),
  joining_date DATE NOT NULL,
  expected_completion_date DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_employee_onboarding UNIQUE (employee_id)
);

CREATE INDEX IF NOT EXISTS idx_onboardings_org ON employee_onboardings(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboardings_emp ON employee_onboardings(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboardings_status ON employee_onboardings(status);
CREATE INDEX IF NOT EXISTS idx_onboardings_joining ON employee_onboardings(joining_date);

-- 2. Onboarding Tasks Table
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id TEXT PRIMARY KEY DEFAULT ('otask-' || gen_random_uuid()::text),
  onboarding_id TEXT NOT NULL REFERENCES employee_onboardings(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_user_id TEXT,
  assigned_to_role TEXT NOT NULL
    CHECK (assigned_to_role IN (
      'HR',
      'HR_HEAD',
      'MANAGER',
      'TEAM_LEAD',
      'IT',
      'FINANCE',
      'PAYROLL',
      'EMPLOYEE',
      'COMPANY_ADMIN'
    )),
  status TEXT NOT NULL DEFAULT 'NOT_STARTED'
    CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'SKIPPED', 'CANCELLED')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  dependency_task_id TEXT REFERENCES onboarding_tasks(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_onb ON onboarding_tasks(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_status ON onboarding_tasks(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_role ON onboarding_tasks(assigned_to_role);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_due ON onboarding_tasks(due_date);

-- 3. Onboarding Policy Acknowledgements Table
CREATE TABLE IF NOT EXISTS onboarding_policy_acknowledgements (
  id TEXT PRIMARY KEY DEFAULT ('onb-pol-' || gen_random_uuid()::text),
  onboarding_id TEXT NOT NULL REFERENCES employee_onboardings(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  policy_id TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  policy_version TEXT DEFAULT '1.0',
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_onb_pol_ack_emp ON onboarding_policy_acknowledgements(employee_id);

-- 4. Onboarding Overrides Table (HR Head requirement bypass with mandatory audit)
CREATE TABLE IF NOT EXISTS onboarding_overrides (
  id TEXT PRIMARY KEY DEFAULT ('onb-ovr-' || gen_random_uuid()::text),
  onboarding_id TEXT NOT NULL REFERENCES employee_onboardings(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES onboarding_tasks(id) ON DELETE SET NULL,
  approved_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onb_overrides_onb ON onboarding_overrides(onboarding_id);

-- 5. Onboarding Audit Logs Table
CREATE TABLE IF NOT EXISTS onboarding_audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('onb-aud-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  onboarding_id TEXT NOT NULL REFERENCES employee_onboardings(id) ON DELETE CASCADE,
  actor_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onb_audit_onb ON onboarding_audit_logs(onboarding_id);

-- ============================================================================
-- SQL Aggregation Views (Backend aggregation layer)
-- ============================================================================

-- View 1: Overall Onboarding Summary
CREATE OR REPLACE VIEW v_onboarding_summary AS
SELECT
  o.id AS onboarding_id,
  o.organization_id,
  o.legal_entity_id,
  o.employee_id,
  e.first_name || ' ' || e.last_name AS employee_name,
  e.employee_code,
  e.work_email,
  e.department_id,
  COALESCE(e.department_name, d.name) AS department_name,
  e.designation_id,
  COALESCE(e.designation_title, desig.title) AS designation_title,
  e.employment->>'reporting_manager_id' AS manager_id,
  COALESCE(e.employment->>'reporting_manager_name', 'Dharun Joy') AS manager_name,
  o.employment_source,
  o.vendor_id,
  v.legal_name AS vendor_name,
  o.status AS onboarding_status,
  o.joining_date,
  o.expected_completion_date,
  o.started_at,
  o.completed_at,
  COUNT(t.id) AS total_tasks_count,
  COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') AS completed_tasks_count,
  COUNT(t.id) FILTER (WHERE t.status = 'BLOCKED') AS blocked_tasks_count,
  COUNT(t.id) FILTER (WHERE t.status NOT IN ('COMPLETED', 'SKIPPED', 'CANCELLED') AND t.due_date < CURRENT_DATE) AS overdue_tasks_count
FROM employee_onboardings o
JOIN employees e ON o.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN designations desig ON e.designation_id = desig.id
LEFT JOIN vendors v ON o.vendor_id = v.id
LEFT JOIN onboarding_tasks t ON o.id = t.onboarding_id
GROUP BY o.id, o.organization_id, o.legal_entity_id, o.employee_id, e.first_name, e.last_name,
         e.employee_code, e.work_email, e.department_id, e.department_name, d.name,
         e.designation_id, e.designation_title, desig.title,
         e.employment, o.employment_source, o.vendor_id, v.legal_name,
         o.status, o.joining_date, o.expected_completion_date, o.started_at, o.completed_at;

-- View 2: Overdue Tasks Summary
CREATE OR REPLACE VIEW v_onboarding_overdue AS
SELECT
  t.id AS task_id,
  t.onboarding_id,
  o.employee_id,
  e.first_name || ' ' || e.last_name AS employee_name,
  t.title AS task_title,
  t.assigned_to_role,
  t.priority,
  t.due_date,
  CURRENT_DATE - t.due_date AS days_overdue
FROM onboarding_tasks t
JOIN employee_onboardings o ON t.onboarding_id = o.id
JOIN employees e ON o.employee_id = e.id
WHERE t.status NOT IN ('COMPLETED', 'SKIPPED', 'CANCELLED')
  AND t.due_date < CURRENT_DATE;
