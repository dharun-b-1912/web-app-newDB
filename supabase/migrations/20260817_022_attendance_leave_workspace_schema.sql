-- ============================================================
-- WorkforceOS Enterprise HRMS — Attendance, Leave & Workspace Schema
-- Migration: 20260817_022_attendance_leave_workspace_schema.sql
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ATTENDANCE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance_daily (
  id                      TEXT PRIMARY KEY DEFAULT ('att-' || gen_random_uuid()::text),
  organization_id         TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id              TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id             TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_code           TEXT,
  employee_name           TEXT NOT NULL,
  department              TEXT,
  designation             TEXT,
  date                    DATE NOT NULL,
  shift_id                TEXT DEFAULT 'shift-gen',
  shift_name              TEXT DEFAULT 'General Shift (09:30 - 18:30)',
  expected_check_in       TEXT DEFAULT '09:30 AM',
  expected_check_out      TEXT DEFAULT '06:30 PM',
  status                  TEXT DEFAULT 'Present'
    CHECK (status IN ('Present','Late','Half Day','Absent','On Leave','Holiday','Weekly Off','WFH','Field Duty','Checked Out','Missing Punch')),
  first_check_in          TEXT,
  last_check_out           TEXT,
  gross_working_minutes   INT DEFAULT 0,
  total_break_minutes     INT DEFAULT 0,
  net_working_minutes     INT DEFAULT 0,
  late_minutes            INT DEFAULT 0,
  early_checkout_minutes  INT DEFAULT 0,
  overtime_minutes        INT DEFAULT 0,
  source                  TEXT DEFAULT 'WEB'
    CHECK (source IN ('WEB','MOBILE','BIOMETRIC','GPS','QR','MANUAL')),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_attendance_emp_date UNIQUE (employee_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_events (
  id              TEXT PRIMARY KEY DEFAULT ('attevt-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type            TEXT NOT NULL CHECK (type IN ('CHECK_IN','CHECK_OUT','BREAK_START','BREAK_END')),
  source          TEXT DEFAULT 'WEB',
  latitude        NUMERIC(10,6),
  longitude       NUMERIC(10,6),
  device_id       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. LEAVE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_types (
  id                          TEXT PRIMARY KEY DEFAULT ('lt-' || gen_random_uuid()::text),
  organization_id             TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code                        TEXT NOT NULL,
  name                        TEXT NOT NULL,
  description                 TEXT,
  category                    TEXT DEFAULT 'Paid' CHECK (category IN ('Paid','Unpaid','Statutory','Compensatory','OptionalHoliday','Custom')),
  is_paid                     BOOLEAN DEFAULT TRUE,
  is_active                   BOOLEAN DEFAULT TRUE,
  gender_applicability        TEXT DEFAULT 'All',
  max_days_per_request        INT DEFAULT 14,
  min_days_per_request        NUMERIC(3,1) DEFAULT 0.5,
  allow_half_day              BOOLEAN DEFAULT TRUE,
  allow_carry_forward         BOOLEAN DEFAULT FALSE,
  allow_encashment            BOOLEAN DEFAULT FALSE,
  converts_to_lop_if_exhausted BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_entitlements (
  id                TEXT PRIMARY KEY DEFAULT ('ent-' || gen_random_uuid()::text),
  organization_id   TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name     TEXT NOT NULL,
  department_name   TEXT,
  leave_type_id     TEXT NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  leave_type_name   TEXT NOT NULL,
  period            TEXT DEFAULT '2026',
  opening_balance   NUMERIC(5,2) DEFAULT 0,
  granted           NUMERIC(5,2) DEFAULT 12,
  accrued           NUMERIC(5,2) DEFAULT 12,
  used              NUMERIC(5,2) DEFAULT 0,
  pending           NUMERIC(5,2) DEFAULT 0,
  available_balance NUMERIC(5,2) DEFAULT 12,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_entitlement_emp_type_period UNIQUE (employee_id, leave_type_id, period)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id                    TEXT PRIMARY KEY DEFAULT ('lr-' || gen_random_uuid()::text),
  organization_id       TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id            TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id           TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  request_code          TEXT NOT NULL,
  employee_name         TEXT NOT NULL,
  department_name       TEXT,
  leave_type_id         TEXT NOT NULL,
  leave_type_name       TEXT NOT NULL,
  leave_type_code       TEXT DEFAULT 'CL',
  from_date             DATE NOT NULL,
  to_date               DATE NOT NULL,
  total_calendar_days   INT DEFAULT 1,
  working_days          INT DEFAULT 1,
  leave_days_deducted   NUMERIC(4,1) DEFAULT 1.0,
  reason                TEXT NOT NULL,
  manager_id            TEXT,
  manager_name          TEXT,
  status                TEXT DEFAULT 'Pending'
    CHECK (status IN ('Pending','Approved','Rejected','Cancelled','Withdrawn')),
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),
  approved_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. HOLIDAY CALENDAR TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS holiday_calendars (
  id              TEXT PRIMARY KEY DEFAULT ('holcal-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  year            INT NOT NULL DEFAULT 2026,
  holidays        JSONB DEFAULT '[]'::jsonb, -- [{date, name, type, is_optional}]
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. EMPLOYEE SELF SERVICE REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_requests (
  id                    TEXT PRIMARY KEY DEFAULT ('req-' || gen_random_uuid()::text),
  organization_id       TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id           TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name         TEXT NOT NULL,
  request_type          TEXT NOT NULL CHECK (request_type IN ('regularization','certificate','profile_correction','hr_query')),
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  status                TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','In Progress','Completed')),
  assigned_to_name      TEXT,
  resolution_notes      TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_att_daily_emp_date    ON attendance_daily(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_att_daily_org_date    ON attendance_daily(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_att_daily_status      ON attendance_daily(status);
CREATE INDEX IF NOT EXISTS idx_leave_req_emp_status  ON leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_req_dates       ON leave_requests(from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_leave_ent_emp         ON leave_entitlements(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_req_emp           ON employee_requests(employee_id);
