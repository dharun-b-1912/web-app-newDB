-- ============================================================================
-- Migration 058: Dedicated Enterprise Multi-Tenant Departments & Teams System
-- Strict Tenant Isolation, Direct organization_id Mapping, RLS & Hierarchy
-- ============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Hardening and Multi-Tenant Isolation for DEPARTMENTS Table
CREATE TABLE IF NOT EXISTS departments (
  id                   TEXT PRIMARY KEY DEFAULT ('dept-' || gen_random_uuid()::text),
  organization_id      TEXT,
  company_id           TEXT,
  branch_id            TEXT,
  parent_department_id TEXT,
  name                 TEXT NOT NULL,
  code                 TEXT NOT NULL,
  cost_center_code     TEXT,
  head_employee_id     TEXT,
  description          TEXT,
  status               TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
  employee_count       INT DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on departments safely
ALTER TABLE departments ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_department_id TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS cost_center_code TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_employee_id TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS employee_count INT DEFAULT 0;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill organization_id from companies if missing (Explicit ::text casting to prevent 42883 type error)
UPDATE departments d
SET organization_id = c.organization_id::text
FROM companies c
WHERE d.company_id::text = c.id::text
  AND (d.organization_id IS NULL OR d.organization_id = '');

-- Fallback for root organization if unassigned
UPDATE departments
SET organization_id = 'org-joy-01'
WHERE organization_id IS NULL OR organization_id = '';

-- Indexes for performance & multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_branch ON departments(branch_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_head ON departments(head_employee_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(organization_id, status);

-- 3. Dedicated TEAMS Table (Multi-Tenant Squads & Functional Sub-units)
CREATE TABLE IF NOT EXISTS teams (
  id                     TEXT PRIMARY KEY DEFAULT ('team-' || gen_random_uuid()::text),
  organization_id        TEXT,
  company_id             TEXT,
  department_id          TEXT,
  branch_id              TEXT,
  name                   TEXT,
  code                   TEXT,
  description            TEXT,
  team_lead_employee_id  TEXT,
  manager_employee_id    TEXT,
  status                 TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Restructuring')),
  member_count           INT DEFAULT 0,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on teams safely
ALTER TABLE teams ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_lead_employee_id TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS manager_employee_id TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill organization_id and company_id on existing teams with explicit ::text casting
UPDATE teams t
SET organization_id = d.organization_id::text,
    company_id = COALESCE(t.company_id::text, d.company_id::text)
FROM departments d
WHERE t.department_id::text = d.id::text
  AND (t.organization_id IS NULL OR t.organization_id = '');

UPDATE teams
SET organization_id = 'org-joy-01'
WHERE organization_id IS NULL OR organization_id = '';

CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_dept ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_teams_comp ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_lead ON teams(team_lead_employee_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(organization_id, status);

-- 4. Dedicated TEAM MEMBERS Junction Table (Team Roster & Roles)
CREATE TABLE IF NOT EXISTS team_members (
  id               TEXT PRIMARY KEY DEFAULT ('tm-' || gen_random_uuid()::text),
  organization_id  TEXT,
  team_id          TEXT,
  employee_id      TEXT,
  role_in_team     TEXT DEFAULT 'MEMBER' CHECK (role_in_team IN ('LEAD', 'CO_LEAD', 'MEMBER', 'ADVISOR')),
  is_primary       BOOLEAN DEFAULT TRUE,
  joined_at        DATE DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS team_id TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS role_in_team TEXT DEFAULT 'MEMBER';
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT TRUE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS joined_at DATE DEFAULT CURRENT_DATE;

-- Backfill team_members organization_id from teams with explicit ::text casting
UPDATE team_members tm
SET organization_id = t.organization_id::text
FROM teams t
WHERE tm.team_id::text = t.id::text
  AND (tm.organization_id IS NULL OR tm.organization_id = '');

UPDATE team_members
SET organization_id = 'org-joy-01'
WHERE organization_id IS NULL OR organization_id = '';

CREATE INDEX IF NOT EXISTS idx_team_members_org ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_emp ON team_members(employee_id);

-- 5. Auto-Organization Resolution Trigger for Departments
CREATE OR REPLACE FUNCTION fn_auto_set_department_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL OR NEW.organization_id = '' THEN
    SELECT organization_id::text INTO NEW.organization_id
    FROM companies
    WHERE id::text = NEW.company_id::text;
  END IF;
  
  IF NEW.organization_id IS NULL OR NEW.organization_id = '' THEN
    NEW.organization_id := 'org-joy-01';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_set_department_org_id ON departments;
CREATE TRIGGER trg_auto_set_department_org_id
  BEFORE INSERT OR UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_set_department_org_id();

-- 6. Auto-Organization Resolution Trigger for Teams
CREATE OR REPLACE FUNCTION fn_auto_set_team_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL OR NEW.organization_id = '' THEN
    SELECT organization_id::text, company_id::text INTO NEW.organization_id, NEW.company_id
    FROM departments
    WHERE id::text = NEW.department_id::text;
  END IF;

  IF NEW.organization_id IS NULL OR NEW.organization_id = '' THEN
    NEW.organization_id := 'org-joy-01';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_set_team_org_id ON teams;
CREATE TRIGGER trg_auto_set_team_org_id
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_set_team_org_id();

-- 7. Multi-Tenant Row Level Security (RLS) Policies
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Helper function fallback for current_org_id if not present
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT organization_id::text FROM app_users WHERE auth_user_id = auth.uid() LIMIT 1),
    'org-joy-01'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Departments RLS
DROP POLICY IF EXISTS "departments_tenant_isolation" ON departments;
CREATE POLICY "departments_tenant_isolation" ON departments
  FOR ALL
  USING (
    organization_id::text = current_org_id()::text
    OR company_id::text IN (SELECT id::text FROM companies WHERE organization_id::text = current_org_id()::text)
  )
  WITH CHECK (
    organization_id::text = current_org_id()::text
  );

-- Teams RLS
DROP POLICY IF EXISTS "teams_tenant_isolation" ON teams;
CREATE POLICY "teams_tenant_isolation" ON teams
  FOR ALL
  USING (
    organization_id::text = current_org_id()::text
  )
  WITH CHECK (
    organization_id::text = current_org_id()::text
  );

-- Team Members RLS
DROP POLICY IF EXISTS "team_members_tenant_isolation" ON team_members;
CREATE POLICY "team_members_tenant_isolation" ON team_members
  FOR ALL
  USING (
    organization_id::text = current_org_id()::text
  )
  WITH CHECK (
    organization_id::text = current_org_id()::text
  );

-- 8. Seed / Map Default Tenant Departments & Teams for Root Organization
DO $$
DECLARE
  v_org_id TEXT := 'org-joy-01';
  v_comp_id TEXT;
BEGIN
  -- Ensure organization exists
  INSERT INTO organizations (id, name, slug, industry, status)
  VALUES (v_org_id, 'Joy Corporate Solutions Pvt Ltd', 'joy-corporate', 'Enterprise Cloud & HR Operations', 'Active')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    industry = EXCLUDED.industry;

  -- Resolve company id
  SELECT id::text INTO v_comp_id FROM companies WHERE organization_id::text = v_org_id LIMIT 1;

  IF v_comp_id IS NULL THEN
    BEGIN
      INSERT INTO companies (id, organization_id, name, legal_name, country, city, status)
      VALUES ('comp-joy-01', v_org_id, 'Joy Corporate Solutions Pvt Ltd', 'Joy Corporate Solutions Private Limited', 'India', 'Coimbatore', 'Active')
      RETURNING id::text INTO v_comp_id;
    EXCEPTION WHEN OTHERS THEN
      SELECT id::text INTO v_comp_id FROM companies LIMIT 1;
    END;
  END IF;

  IF v_comp_id IS NOT NULL THEN
    -- Seed default departments if none exist for this company
    IF NOT EXISTS (SELECT 1 FROM departments WHERE company_id::text = v_comp_id AND code = 'HR') THEN
      INSERT INTO departments (organization_id, company_id, name, code, status)
      VALUES (v_org_id, v_comp_id, 'Human Resources', 'HR', 'Active');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM departments WHERE company_id::text = v_comp_id AND code = 'ENG-MGMT') THEN
      INSERT INTO departments (organization_id, company_id, name, code, status)
      VALUES (v_org_id, v_comp_id, 'Engineering & Management', 'ENG-MGMT', 'Active');
    END IF;
  END IF;
END $$;

-- 9. Realtime Publication (idempotent with duplicate exception handling)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE departments;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE teams;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
