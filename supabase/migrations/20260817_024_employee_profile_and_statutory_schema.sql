-- ============================================================
-- WorkforceOS Enterprise HRMS — Employee Profile & Statutory Schema
-- Migration: 20260817_024_employee_profile_and_statutory_schema.sql
-- ============================================================

-- 1. Employee Statutory Details (UAN, PF, ESI, PAN, Tax Regime)
CREATE TABLE IF NOT EXISTS employee_statutory_details (
  id              TEXT PRIMARY KEY DEFAULT ('stat-' || gen_random_uuid()::text),
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  pan_number      TEXT,
  uan_number      TEXT,
  pf_number       TEXT,
  pf_status       TEXT DEFAULT 'Active' CHECK (pf_status IN ('Active', 'Not Applicable', 'Exempted', 'Pending')),
  pf_joining_date DATE,
  esi_number      TEXT,
  esi_status      TEXT DEFAULT 'Active' CHECK (esi_status IN ('Active', 'Not Applicable', 'Exempted', 'Pending')),
  tax_regime      TEXT DEFAULT 'New' CHECK (tax_regime IN ('Old', 'New')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_emp_statutory UNIQUE (employee_id)
);

-- 2. Employee Bank Accounts
CREATE TABLE IF NOT EXISTS employee_bank_accounts (
  id                  TEXT PRIMARY KEY DEFAULT ('bank-' || gen_random_uuid()::text),
  employee_id         TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  bank_name           TEXT NOT NULL,
  account_number      TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  ifsc_code           TEXT NOT NULL,
  branch_name         TEXT,
  payment_method      TEXT DEFAULT 'Bank Transfer' CHECK (payment_method IN ('Bank Transfer', 'Cheque', 'Direct Deposit')),
  is_primary          BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Employee Family & Nominees
CREATE TABLE IF NOT EXISTS employee_family_nominees (
  id              TEXT PRIMARY KEY DEFAULT ('nom-' || gen_random_uuid()::text),
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  scheme_type     TEXT NOT NULL CHECK (scheme_type IN ('PF Nominee', 'ESI Nominee', 'Gratuity Nominee', 'Insurance Nominee', 'General Nominee')),
  name            TEXT NOT NULL,
  relationship    TEXT NOT NULL,
  date_of_birth   DATE,
  phone           TEXT,
  email           TEXT,
  share_percent   NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  address         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Employee Emergency Contacts
CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
  id              TEXT PRIMARY KEY DEFAULT ('emg-' || gen_random_uuid()::text),
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  relationship    TEXT NOT NULL,
  primary_phone   TEXT NOT NULL,
  alternate_phone TEXT,
  email           TEXT,
  address         TEXT,
  is_primary      BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Employee Documents Repository
CREATE TABLE IF NOT EXISTS employee_documents (
  id                  TEXT PRIMARY KEY DEFAULT ('doc-' || gen_random_uuid()::text),
  employee_id         TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_category   TEXT NOT NULL CHECK (document_category IN ('Identity', 'Tax', 'Bank', 'Employment', 'Education', 'Certificates', 'Other')),
  document_type       TEXT NOT NULL,
  file_name           TEXT NOT NULL,
  file_url            TEXT NOT NULL,
  file_size_bytes     INT DEFAULT 0,
  verification_status TEXT DEFAULT 'Verified' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
  uploaded_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Profile Change Request Mechanism (Separation of Duties)
CREATE TABLE IF NOT EXISTS employee_profile_change_requests (
  id              TEXT PRIMARY KEY DEFAULT ('pcr-' || gen_random_uuid()::text),
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  field_category  TEXT NOT NULL,
  field_name      TEXT NOT NULL,
  old_value       TEXT,
  new_value       TEXT NOT NULL,
  reason          TEXT,
  status          TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by     TEXT,
  reviewed_at     TIMESTAMPTZ,
  comments        TEXT
);

-- 7. App User Active Sessions
CREATE TABLE IF NOT EXISTS app_user_sessions (
  id              TEXT PRIMARY KEY DEFAULT ('sess-' || gen_random_uuid()::text),
  user_id         TEXT NOT NULL,
  device_name     TEXT NOT NULL,
  browser_name    TEXT NOT NULL,
  ip_address      TEXT,
  location_name   TEXT,
  is_current      BOOLEAN DEFAULT FALSE,
  last_active     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_emp_stat_emp ON employee_statutory_details(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_bank_emp ON employee_bank_accounts(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_nom_emp ON employee_family_nominees(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_emg_emp ON employee_emergency_contacts(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_doc_emp ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_pcr_emp ON employee_profile_change_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_sess_user ON app_user_sessions(user_id);

-- 9. Ensure Department and Designation exist for HR Head
INSERT INTO departments (id, company_id, name, code)
VALUES ('dept-hr-01', 'cmp-joy-01', 'People & HR', 'HR-DEPT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO designations (id, company_id, title, code)
VALUES ('desig-hr-01', 'cmp-joy-01', 'HR Head', 'HR-HEAD')
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Canonical Employee Profile for HR Head (Hari Priya) matching employees table JSONB structure
INSERT INTO employees (
  id, organization_id, company_id, department_id, designation_id,
  employee_code, first_name, last_name, display_name, work_email,
  department_name, designation_title, status, employment_type,
  profile, employment
) VALUES (
  'emp-hr-001', 'org-joy-01', 'cmp-joy-01', 'dept-hr-01', 'desig-hr-01',
  'WF-1001', 'Hari', 'Priya', 'Hari Priya', 'haripriya@joycorporate.com',
  'People & HR', 'HR Head', 'Active', 'Full Time',
  '{"preferred_name": "Hari Priya", "phone": "+91 98401 23456", "personal_email": "haripriya.personal@gmail.com", "gender": "Female", "marital_status": "Married", "blood_group": "O+", "nationality": "Indian"}'::jsonb,
  '{"doj": "2024-01-01", "employment_type": "Full Time", "work_location": "Coimbatore HQ, Joy Tech Park", "reporting_manager_name": "Dharun Joy (Company Admin)"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  display_name = EXCLUDED.display_name,
  work_email = EXCLUDED.work_email,
  department_name = EXCLUDED.department_name,
  designation_title = EXCLUDED.designation_title,
  profile = EXCLUDED.profile,
  employment = EXCLUDED.employment,
  status = EXCLUDED.status;

-- 11. Seed Statutory Details for Hari Priya
INSERT INTO employee_statutory_details (
  id, employee_id, pan_number, uan_number, pf_number, pf_status, pf_joining_date, esi_number, esi_status, tax_regime
) VALUES (
  'stat-hr-001', 'emp-hr-001', 'ABCDE1234F', '101234567890', 'TN/CBE/1234567/001', 'Active', '2024-01-01', '33123456780010001', 'Not Applicable', 'New'
) ON CONFLICT (employee_id) DO UPDATE SET
  pan_number = EXCLUDED.pan_number,
  uan_number = EXCLUDED.uan_number,
  tax_regime = EXCLUDED.tax_regime;

-- 12. Seed Bank Account for Hari Priya
INSERT INTO employee_bank_accounts (
  id, employee_id, bank_name, account_number, account_holder_name, ifsc_code, branch_name, payment_method, is_primary
) VALUES (
  'bank-hr-001', 'emp-hr-001', 'HDFC Bank', '50100456789123', 'Hari Priya', 'HDFC0001234', 'Avinashi Road, Coimbatore', 'Bank Transfer', TRUE
) ON CONFLICT (id) DO NOTHING;

-- 13. Seed Emergency Contact for Hari Priya
INSERT INTO employee_emergency_contacts (
  id, employee_id, name, relationship, primary_phone, alternate_phone, email, address, is_primary
) VALUES (
  'emg-hr-001', 'emp-hr-001', 'Karthik Natarajan', 'Spouse', '+91 98409 87654', '+91 98401 11223', 'karthik.n@gmail.com', '12, Joy Garden, Avinashi Road, Coimbatore 641014', TRUE
) ON CONFLICT (id) DO NOTHING;

-- 14. Seed Nominee for Hari Priya
INSERT INTO employee_family_nominees (
  id, employee_id, scheme_type, name, relationship, date_of_birth, phone, share_percent, address
) VALUES (
  'nom-hr-001', 'emp-hr-001', 'PF Nominee', 'Karthik Natarajan', 'Spouse', '1992-05-14', '+91 98409 87654', 100.00, '12, Joy Garden, Avinashi Road, Coimbatore 641014'
) ON CONFLICT (id) DO NOTHING;
