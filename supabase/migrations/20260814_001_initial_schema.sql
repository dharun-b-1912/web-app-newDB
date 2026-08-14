-- ============================================================
-- WorkforceOS Enterprise HRMS — Initial Schema
-- Migration: 20260814_001_initial_schema.sql
-- How to run: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- Run ORDER: 001 first, then 002, then 003
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PLATFORM LAYER  (Super Admin / SaaS multi-tenant)
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id               TEXT PRIMARY KEY DEFAULT ('org-' || gen_random_uuid()::text),
  name             TEXT NOT NULL,
  industry         TEXT,
  default_currency TEXT DEFAULT 'INR',
  timezone         TEXT DEFAULT 'Asia/Kolkata',
  status           TEXT DEFAULT 'Active'
    CHECK (status IN ('Trial','Active','Grace Period','Payment Pending','Suspended','Locked','Archived','Cancelled')),
  plan             TEXT DEFAULT 'Starter'
    CHECK (plan IN ('Starter','Professional','Business','Enterprise')),
  owner_name       TEXT,
  owner_email      TEXT,
  mrr              NUMERIC(12,2) DEFAULT 0,
  gstin            TEXT,
  health           TEXT DEFAULT 'Healthy'
    CHECK (health IN ('Healthy','At Risk','Critical')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CORE HR — Company Structure
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id                        TEXT PRIMARY KEY DEFAULT ('comp-' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_name                TEXT NOT NULL,
  trade_name                TEXT,
  statutory_registration_no TEXT,
  tax_id                    TEXT,
  country                   TEXT DEFAULT 'India',
  city                      TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id           TEXT PRIMARY KEY DEFAULT ('br-' || gen_random_uuid()::text),
  company_id   TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL,
  city         TEXT,
  state        TEXT,
  timezone     TEXT DEFAULT 'Asia/Kolkata',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id        TEXT PRIMARY KEY DEFAULT ('loc-' || gen_random_uuid()::text),
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  building  TEXT,
  address   TEXT
);

CREATE TABLE IF NOT EXISTS departments (
  id                   TEXT PRIMARY KEY DEFAULT ('dept-' || gen_random_uuid()::text),
  company_id           TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_department_id TEXT REFERENCES departments(id),
  name                 TEXT NOT NULL,
  code                 TEXT NOT NULL,
  cost_center_code     TEXT,
  head_employee_id     TEXT,
  employee_count       INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS designations (
  id         TEXT PRIMARY KEY DEFAULT ('desig-' || gen_random_uuid()::text),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  code       TEXT NOT NULL,
  grade      TEXT
);

-- ============================================================
-- RBAC — Roles & Permissions
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id              TEXT PRIMARY KEY DEFAULT ('role-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  is_system       BOOLEAN DEFAULT FALSE,
  permissions     JSONB DEFAULT '[]'::jsonb,  -- [{permission_id, scope_level}]
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
  id              TEXT PRIMARY KEY DEFAULT ('user-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  employee_id     TEXT,
  status          TEXT DEFAULT 'Active'
    CHECK (status IN ('Active','Invited','Suspended')),
  roles           JSONB DEFAULT '[]'::jsonb,    -- [{id, name, ...}]
  auth_user_id    UUID UNIQUE,                  -- Links to Supabase Auth uid()
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEE MASTER  (central HR record)
-- ============================================================

CREATE TABLE IF NOT EXISTS employees (
  id                TEXT PRIMARY KEY DEFAULT ('emp-' || gen_random_uuid()::text),
  organization_id   TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id        TEXT NOT NULL REFERENCES companies(id),
  branch_id         TEXT REFERENCES branches(id),
  department_id     TEXT NOT NULL REFERENCES departments(id),
  designation_id    TEXT NOT NULL REFERENCES designations(id),
  user_id           TEXT REFERENCES app_users(id),

  -- Identity
  employee_code     TEXT NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  middle_name       TEXT,
  display_name      TEXT,
  work_email        TEXT NOT NULL,
  avatar_url        TEXT,

  -- Status
  status            TEXT DEFAULT 'Active'
    CHECK (status IN (
      'Draft','Invited','Onboarding','Active','Probation','Confirmed',
      'Notice Period','Suspended','Inactive','Terminated','Resigned',
      'Absconded','Retired','Exited','On Leave'
    )),
  employment_type   TEXT DEFAULT 'Full Time'
    CHECK (employment_type IN (
      'Full Time','Part Time','Contract','Temporary',
      'Intern','Apprentice','Consultant','Freelancer'
    )),

  -- JSON blobs — matches src/types/index.ts interfaces exactly
  profile           JSONB DEFAULT '{}'::jsonb,    -- EmployeeProfile
  employment        JSONB DEFAULT '{}'::jsonb,     -- EmploymentDetails

  -- Denormalized display fields (saves joins for list views)
  company_name      TEXT,
  branch_name       TEXT,
  department_name   TEXT,
  designation_title TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPROVALS & ACTIVITY  (shared across modules)
-- ============================================================

CREATE TABLE IF NOT EXISTS approval_items (
  id                  TEXT PRIMARY KEY DEFAULT ('appr-' || gen_random_uuid()::text),
  organization_id     TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type                TEXT NOT NULL
    CHECK (type IN ('Leave','Expense','Attendance','Salary Revision','Requisition')),
  title               TEXT NOT NULL,
  requested_by_id     TEXT NOT NULL,
  requested_by_name   TEXT NOT NULL,
  requested_by_avatar TEXT,
  department          TEXT,
  details             TEXT,
  amount_or_duration  TEXT,
  status              TEXT DEFAULT 'Pending'
    CHECK (status IN ('Pending','Approved','Rejected')),
  date_submitted      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id              TEXT PRIMARY KEY DEFAULT ('act-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_name      TEXT NOT NULL,
  actor_avatar    TEXT,
  action          TEXT NOT NULL,
  entity          TEXT NOT NULL,
  type            TEXT DEFAULT 'employee'
    CHECK (type IN ('employee','leave','payroll','compliance','org')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_employees_org_id      ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id  ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept_id     ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status      ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_work_email  ON employees(work_email);
CREATE INDEX IF NOT EXISTS idx_app_users_auth_uid    ON app_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email       ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_approvals_org_id      ON approval_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status      ON approval_items(status);
CREATE INDEX IF NOT EXISTS idx_activity_org_id       ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_org_id          ON roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_company   ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_designations_company  ON designations(company_id);
