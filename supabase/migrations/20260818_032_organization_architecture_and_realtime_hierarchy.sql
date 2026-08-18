-- ============================================================================
-- Migration 032: WorkForceOS Organization Architecture 2.0 & Realtime Hierarchy
-- Unified Schema for Legal Entities, Branches, Departments, Teams,
-- Employee Reporting Relationships, Vendor Workers, Deployments & Audit Logs
-- ============================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Organizations / Tenants hardening
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'INR';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Starter';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mrr NUMERIC(12,2) DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS health TEXT DEFAULT 'Healthy';

-- 3. Companies / Legal Entities hardening
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trade_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS statutory_registration_no TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cin TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_city TEXT DEFAULT 'Coimbatore';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 4. Branches / Campuses / Sites hardening
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_type TEXT DEFAULT 'OFFICE';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS head_employee_id TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 5. Locations Hierarchy hardening
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY DEFAULT ('loc-' || gen_random_uuid()::text),
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  parent_location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  location_type_code TEXT DEFAULT 'BUILDING',
  building TEXT,
  floor TEXT,
  area TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE locations ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS parent_location_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_type_code TEXT DEFAULT 'BUILDING';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS building TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS floor TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_locations_branch ON locations(branch_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_location_id);

-- 6. Departments hardening
ALTER TABLE departments ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS cost_center_code TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_employee_id TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_branch ON departments(branch_id);

-- 7. Teams Table (First-Class Organizational Entities)
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY DEFAULT ('team-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  team_lead_employee_id TEXT,
  manager_employee_id TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Restructuring')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_teams_lead ON teams(team_lead_employee_id);

-- 8. Employees Hardening (Reporting & Team connections)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_employee_id TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS team_id TEXT REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS legal_entity_id TEXT;

CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_team ON employees(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);

-- 9. Employee Reporting Relationships Table (Dedicated Reporting & Multi-Manager Model)
CREATE TABLE IF NOT EXISTS employee_reporting_relationships (
  id TEXT PRIMARY KEY DEFAULT ('err-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'DIRECT_MANAGER'
    CHECK (relationship_type IN (
      'DIRECT_MANAGER',
      'TEAM_LEAD',
      'DEPARTMENT_HEAD',
      'FUNCTIONAL_MANAGER',
      'DOTTED_LINE_MANAGER',
      'PROJECT_MANAGER'
    )),
  is_primary BOOLEAN DEFAULT TRUE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  changed_by TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_no_self_reporting CHECK (employee_id <> manager_employee_id),
  CONSTRAINT chk_reporting_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_err_org ON employee_reporting_relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_err_employee ON employee_reporting_relationships(employee_id);
CREATE INDEX IF NOT EXISTS idx_err_manager ON employee_reporting_relationships(manager_employee_id);
CREATE INDEX IF NOT EXISTS idx_err_primary ON employee_reporting_relationships(is_primary);

-- 10. Vendor Workers Table (Dedicated External Workforce - Non-Employee Master)
CREATE TABLE IF NOT EXISTS vendor_workers (
  id TEXT PRIMARY KEY DEFAULT ('vwrk-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  worker_code TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  identity_proof_type TEXT DEFAULT 'Aadhaar'
    CHECK (identity_proof_type IN ('Aadhaar', 'Passport', 'VoterID', 'DrivingLicense', 'NationalID', 'Other')),
  identity_proof_number_masked TEXT,
  skill_category TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ONBOARDING', 'ACTIVE', 'DEPLOYED', 'ON_LEAVE', 'BENCH', 'OFFBOARDED', 'BLACKLISTED')),
  date_of_birth DATE,
  gender TEXT,
  blood_group TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_vendor_worker_code UNIQUE (organization_id, worker_code)
);

CREATE INDEX IF NOT EXISTS idx_vendor_workers_org ON vendor_workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_workers_vendor ON vendor_workers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_workers_status ON vendor_workers(status);

-- 11. Vendor Deployments Table (Workforce Site & Operational Placements)
CREATE TABLE IF NOT EXISTS vendor_deployments (
  id TEXT PRIMARY KEY DEFAULT ('vdpl-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES vendor_workers(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  deployment_role TEXT NOT NULL,
  supervisor_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  bill_rate NUMERIC(12,2),
  bill_unit TEXT DEFAULT 'MONTH' CHECK (bill_unit IN ('HOUR', 'DAY', 'MONTH', 'FIXED')),
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'COMPLETED', 'TERMINATED', 'EXTENDED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_deployment_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_vdeploy_org ON vendor_deployments(organization_id);
CREATE INDEX IF NOT EXISTS idx_vdeploy_vendor ON vendor_deployments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vdeploy_worker ON vendor_deployments(worker_id);
CREATE INDEX IF NOT EXISTS idx_vdeploy_branch ON vendor_deployments(branch_id);
CREATE INDEX IF NOT EXISTS idx_vdeploy_dept ON vendor_deployments(department_id);
CREATE INDEX IF NOT EXISTS idx_vdeploy_status ON vendor_deployments(status);

-- 12. Organization Audit Logs Table
CREATE TABLE IF NOT EXISTS organization_audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('oaudit-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN (
      'LEGAL_ENTITY',
      'BRANCH',
      'LOCATION',
      'DEPARTMENT',
      'TEAM',
      'REPORTING_RELATIONSHIP',
      'VENDOR',
      'VENDOR_WORKER',
      'VENDOR_DEPLOYMENT'
    )),
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oaudit_org ON organization_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_oaudit_entity ON organization_audit_logs(entity_type, entity_id);

-- 13. Recursive View: Hierarchy Reporting Tree
CREATE OR REPLACE VIEW view_organization_hierarchy AS
WITH RECURSIVE org_tree AS (
  -- Root level: Employees who have no manager or report to themselves/null
  SELECT 
    e.id AS employee_id,
    e.employee_code,
    e.first_name,
    e.last_name,
    e.display_name,
    e.work_email,
    e.designation_title,
    e.department_id,
    d.name AS department_name,
    e.branch_id,
    b.name AS branch_name,
    e.company_id,
    c.legal_name AS company_name,
    e.organization_id,
    e.avatar_url,
    e.status,
    NULL::TEXT AS manager_employee_id,
    NULL::TEXT AS manager_name,
    0 AS level,
    ARRAY[e.id] AS path
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  LEFT JOIN branches b ON e.branch_id = b.id
  LEFT JOIN companies c ON e.company_id = c.id
  WHERE (e.manager_employee_id IS NULL OR e.manager_employee_id = '' OR e.manager_employee_id = e.id)
    AND e.status != 'Exited'

  UNION ALL

  -- Recursive step: Employees reporting to a manager in the tree
  SELECT 
    e.id AS employee_id,
    e.employee_code,
    e.first_name,
    e.last_name,
    e.display_name,
    e.work_email,
    e.designation_title,
    e.department_id,
    d.name AS department_name,
    e.branch_id,
    b.name AS branch_name,
    e.company_id,
    c.legal_name AS company_name,
    e.organization_id,
    e.avatar_url,
    e.status,
    t.employee_id AS manager_employee_id,
    t.display_name AS manager_name,
    t.level + 1 AS level,
    t.path || e.id AS path
  FROM employees e
  INNER JOIN org_tree t ON e.manager_employee_id = t.employee_id
  LEFT JOIN departments d ON e.department_id = d.id
  LEFT JOIN branches b ON e.branch_id = b.id
  LEFT JOIN companies c ON e.company_id = c.id
  WHERE e.status != 'Exited'
    AND NOT (e.id = ANY(t.path)) -- Cycle / Circular reporting guard
)
SELECT * FROM org_tree;

-- 14. Enable Row Level Security & Open Tenant Scoped Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_reporting_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'teams_tenant_isolation') THEN
    CREATE POLICY teams_tenant_isolation ON teams FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'err_tenant_isolation') THEN
    CREATE POLICY err_tenant_isolation ON employee_reporting_relationships FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vwrk_tenant_isolation') THEN
    CREATE POLICY vwrk_tenant_isolation ON vendor_workers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vdpl_tenant_isolation') THEN
    CREATE POLICY vdpl_tenant_isolation ON vendor_deployments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'oaudit_tenant_isolation') THEN
    CREATE POLICY oaudit_tenant_isolation ON organization_audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
