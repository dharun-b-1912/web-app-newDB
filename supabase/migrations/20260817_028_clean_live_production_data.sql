-- ============================================================
-- WorkforceOS Enterprise HRMS — Production Live Data Migration
-- Migration: 20260817_028_clean_live_production_data.sql
-- Purges all legacy mock/demo data (@acme.com / org-acme-01)
-- and populates clean, authoritative live production data
-- for Joy Corporate Solutions Pvt Ltd (org-joy-01, comp-joy-01).
-- ============================================================

-- 0. ENSURE OPTIONAL WORKFORCE COLUMNS EXIST SAFELY ON EMPLOYEES
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_source TEXT DEFAULT 'DIRECT';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS vendor_id TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS vendor_employee_code TEXT;

-- 1. CLEAN UP ALL LEGACY MOCK / DUMMY DATA
DELETE FROM employee_onboardings WHERE organization_id IN ('org-acme-01', 'org-01') OR employee_id IN (SELECT id FROM employees WHERE work_email LIKE '%acme.com%');
DELETE FROM employees WHERE work_email LIKE '%acme.com%' OR organization_id IN ('org-acme-01', 'org-01') OR company_id IN ('comp-01', 'comp-02');
DELETE FROM app_users WHERE email LIKE '%acme.com%' OR organization_id IN ('org-acme-01', 'org-01');
DELETE FROM departments WHERE company_id IN ('comp-01', 'comp-02') OR id LIKE '%acme%';
DELETE FROM designations WHERE company_id IN ('comp-01', 'comp-02') OR id LIKE '%acme%';
DELETE FROM branches WHERE company_id IN ('comp-01', 'comp-02') OR id LIKE '%acme%';
DELETE FROM companies WHERE organization_id IN ('org-acme-01', 'org-01') OR id IN ('comp-01', 'comp-02');
DELETE FROM organizations WHERE id IN ('org-acme-01', 'org-01');

-- 2. LIVE PRODUCTION ORGANIZATION
INSERT INTO organizations (
  id, name, industry, default_currency, timezone, status, plan, owner_name, owner_email, created_at, updated_at
) VALUES (
  'org-joy-01',
  'Joy Corporate Solutions',
  'Software & Enterprise Technology Services',
  'INR',
  'Asia/Kolkata',
  'Active',
  'Enterprise',
  'Dharun Joy',
  'admin@joycorporate.com',
  '2024-01-01T00:00:00Z',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  owner_name = EXCLUDED.owner_name,
  owner_email = EXCLUDED.owner_email,
  updated_at = NOW();

-- 3. LIVE PRODUCTION LEGAL ENTITIES (COMPANIES)
INSERT INTO companies (
  id, organization_id, legal_name, trade_name, statutory_registration_no, tax_id, country, city, created_at
) VALUES (
  'comp-joy-01',
  'org-joy-01',
  'Joy Corporate Solutions Pvt Ltd',
  'JoyHRMS India',
  'CIN-U72200TZ2020PTC034120',
  'PAN-AAACJ9988F',
  'India',
  'Coimbatore',
  '2024-01-15T00:00:00Z'
), (
  'comp-joy-02',
  'org-joy-01',
  'Joy Global Technologies Inc',
  'Joy Tech International',
  'DE-FEIN-987654321',
  'EIN-987654321',
  'United States',
  'San Francisco',
  '2024-06-01T00:00:00Z'
) ON CONFLICT (id) DO UPDATE SET
  legal_name = EXCLUDED.legal_name,
  trade_name = EXCLUDED.trade_name,
  statutory_registration_no = EXCLUDED.statutory_registration_no,
  tax_id = EXCLUDED.tax_id;

-- 4. LIVE PRODUCTION BRANCHES
INSERT INTO branches (
  id, company_id, name, code, city, state, timezone, created_at
) VALUES 
  ('br-cbe-01', 'comp-joy-01', 'Coimbatore HQ Campus', 'HQ-CBE', 'Coimbatore', 'Tamil Nadu', 'Asia/Kolkata', '2024-01-01T00:00:00Z'),
  ('br-chn-02', 'comp-joy-01', 'Chennai Tech Park', 'TP-CHN', 'Chennai', 'Tamil Nadu', 'Asia/Kolkata', '2024-03-01T00:00:00Z'),
  ('br-blr-03', 'comp-joy-01', 'Bengaluru Innovation Center', 'IN-BLR', 'Bengaluru', 'Karnataka', 'Asia/Kolkata', '2024-05-01T00:00:00Z'),
  ('br-rem-04', 'comp-joy-01', 'Remote Distributed Hub', 'REM-IN', 'Remote', 'Distributed', 'Asia/Kolkata', '2024-06-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  state = EXCLUDED.state;

-- 5. LIVE PRODUCTION DEPARTMENTS
INSERT INTO departments (
  id, company_id, name, code, employee_count
) VALUES
  ('dept-exec', 'comp-joy-01', 'Executive Management', 'EXEC', 1),
  ('dept-eng', 'comp-joy-01', 'Engineering & DevOps', 'ENG', 4),
  ('dept-hr', 'comp-joy-01', 'People & HR', 'HR', 1),
  ('dept-admin', 'comp-joy-01', 'Administration & Facilities', 'ADMIN', 1),
  ('dept-cs', 'comp-joy-01', 'Customer Support', 'CS', 1),
  ('dept-fin', 'comp-joy-01', 'Finance & Legal', 'FIN', 0),
  ('dept-sales', 'comp-joy-01', 'Sales & Marketing', 'SALES', 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code;

-- 6. LIVE PRODUCTION DESIGNATIONS
INSERT INTO designations (
  id, company_id, title, code, grade
) VALUES
  ('desig-vp-ops', 'comp-joy-01', 'Managing Director & VP Operations', 'MD-VP', 'L10'),
  ('desig-hr-head', 'comp-joy-01', 'Head of Human Resources', 'HRH', 'L8'),
  ('desig-eng-mgr', 'comp-joy-01', 'Engineering Manager', 'EMGR', 'L7'),
  ('desig-lead-eng', 'comp-joy-01', 'Senior Lead Engineer', 'TLE', 'L6'),
  ('desig-sr-eng', 'comp-joy-01', 'Senior Software Engineer', 'SSE', 'L5'),
  ('desig-fac-exec', 'comp-joy-01', 'Facilities & Operations Specialist', 'FOS', 'L3'),
  ('desig-tech-sup', 'comp-joy-01', 'Technical Support Specialist', 'TSS', 'L3')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  grade = EXCLUDED.grade;

-- 7. LIVE PRODUCTION USERS & AUTH ROLES
INSERT INTO app_users (
  id, organization_id, email, name, status, roles, created_at
) VALUES
  ('user-super-01', 'org-joy-01', 'superadmin@workforceos.com', 'Super Admin (Root)', 'Active', '[{"id":"role-001","name":"Super Admin"}]', '2024-01-01T00:00:00Z'),
  ('user-admin-01', 'org-joy-01', 'admin@joycorporate.com', 'Dharun Joy', 'Active', '[{"id":"role-002","name":"Company Admin"}]', '2024-01-01T00:00:00Z'),
  ('user-hr-01', 'org-joy-01', 'haripriya@joycorporate.com', 'Hari priya', 'Active', '[{"id":"role-003","name":"HR Head"}]', '2024-01-01T00:00:00Z'),
  ('user-mgr-01', 'org-joy-01', 'karthik.n@joycorporate.com', 'Karthik N.', 'Active', '[{"id":"role-004","name":"Team Lead"}]', '2024-01-01T00:00:00Z'),
  ('user-tl-01', 'org-joy-01', 'deepa.s@joycorporate.com', 'Deepa S.', 'Active', '[{"id":"role-004","name":"Team Lead"}]', '2024-01-01T00:00:00Z'),
  ('user-emp-01', 'org-joy-01', 'priya.sharma@joycorporate.com', 'Priya Sharma', 'Active', '[{"id":"role-005","name":"Employee"}]', '2024-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  roles = EXCLUDED.roles;

-- 8. LIVE PRODUCTION WORKFORCE EMPLOYEES
INSERT INTO employees (
  id, organization_id, company_id, branch_id, department_id, designation_id,
  employee_code, first_name, last_name, display_name, work_email,
  company_name, branch_name, department_name, designation_title,
  status, employment_type, employment_source, profile, employment, created_at, updated_at
) VALUES
  (
    'emp-admin-001', 'org-joy-01', 'comp-joy-01', 'br-cbe-01', 'dept-exec', 'desig-vp-ops',
    'WF-1000', 'Dharun', 'Joy', 'Dharun Joy', 'admin@joycorporate.com',
    'Joy Corporate Solutions Pvt Ltd', 'Coimbatore HQ Campus', 'Executive Management', 'Managing Director & VP Operations',
    'Active', 'Full Time', 'DIRECT',
    '{"gender":"Male","phone":"+91 98400 99000","nationality":"Indian"}',
    '{"doj":"2024-01-01","employment_type":"Full Time","confirmation_status":"Confirmed","work_location":"Coimbatore HQ"}',
    '2024-01-01T00:00:00Z', NOW()
  ),
  (
    'emp-hr-001', 'org-joy-01', 'comp-joy-01', 'br-cbe-01', 'dept-hr', 'desig-hr-head',
    'WF-1001', 'Hari', 'Priya', 'Hari Priya', 'haripriya@joycorporate.com',
    'Joy Corporate Solutions Pvt Ltd', 'Coimbatore HQ Campus', 'People & HR', 'Head of Human Resources',
    'Active', 'Full Time', 'DIRECT',
    '{"gender":"Female","phone":"+91 98401 22334","nationality":"Indian"}',
    '{"doj":"2025-01-15","employment_type":"Full Time","reporting_manager_name":"Dharun Joy","confirmation_status":"Confirmed","work_location":"Coimbatore HQ"}',
    '2025-01-15T00:00:00Z', NOW()
  ),
  (
    'emp-mgr-001', 'org-joy-01', 'comp-joy-01', 'br-cbe-01', 'dept-eng', 'desig-eng-mgr',
    'WF-1002', 'Karthik', 'Natarajan', 'Karthik N.', 'karthik.n@joycorporate.com',
    'Joy Corporate Solutions Pvt Ltd', 'Coimbatore HQ Campus', 'Engineering & DevOps', 'Engineering Manager',
    'Active', 'Full Time', 'DIRECT',
    '{"gender":"Male","phone":"+91 98402 33445","nationality":"Indian"}',
    '{"doj":"2025-02-01","employment_type":"Full Time","reporting_manager_name":"Dharun Joy","confirmation_status":"Confirmed","work_location":"Coimbatore HQ"}',
    '2025-02-01T00:00:00Z', NOW()
  ),
  (
    'emp-tl-001', 'org-joy-01', 'comp-joy-01', 'br-cbe-01', 'dept-eng', 'desig-lead-eng',
    'WF-1003', 'Deepa', 'Subramanian', 'Deepa S.', 'deepa.s@joycorporate.com',
    'Joy Corporate Solutions Pvt Ltd', 'Coimbatore HQ Campus', 'Engineering & DevOps', 'Senior Lead Engineer',
    'Active', 'Full Time', 'DIRECT',
    '{"gender":"Female","phone":"+91 98403 44556","nationality":"Indian"}',
    '{"doj":"2025-03-01","employment_type":"Full Time","reporting_manager_name":"Karthik N.","confirmation_status":"Confirmed","work_location":"Coimbatore HQ"}',
    '2025-03-01T00:00:00Z', NOW()
  ),
  (
    'emp-001', 'org-joy-01', 'comp-joy-01', 'br-cbe-01', 'dept-eng', 'desig-sr-eng',
    'WF-1004', 'Priya', 'Sharma', 'Priya Sharma', 'priya.sharma@joycorporate.com',
    'Joy Corporate Solutions Pvt Ltd', 'Coimbatore HQ Campus', 'Engineering & DevOps', 'Senior Software Engineer',
    'Active', 'Full Time', 'DIRECT',
    '{"gender":"Female","phone":"+91 98404 55667","nationality":"Indian"}',
    '{"doj":"2025-04-15","employment_type":"Full Time","reporting_manager_name":"Deepa S.","confirmation_status":"Confirmed","work_location":"Coimbatore HQ"}',
    '2025-04-15T00:00:00Z', NOW()
  ),
  (
    'emp-vnd-001', 'org-joy-01', 'comp-joy-01', 'br-cbe-01', 'dept-admin', 'desig-fac-exec',
    'WF-1005', 'Senthil', 'Nathan', 'Senthil Nathan', 'senthil.n@joycorporate.com',
    'Joy Corporate Solutions Pvt Ltd', 'Coimbatore HQ Campus', 'Administration & Facilities', 'Facilities & Operations Specialist',
    'Active', 'Contract', 'VENDOR',
    '{"gender":"Male","phone":"+91 98405 66778","nationality":"Indian"}',
    '{"doj":"2025-05-01","employment_type":"Contract","vendor_name":"ABC Workforce Solutions Pvt Ltd","reporting_manager_name":"Hari Priya","confirmation_status":"Confirmed","work_location":"Coimbatore HQ"}',
    '2025-05-01T00:00:00Z', NOW()
  ),
  (
    'emp-vnd-002', 'org-joy-01', 'comp-joy-01', 'br-cbe-01', 'dept-cs', 'desig-tech-sup',
    'WF-1006', 'Meera', 'Krishnan', 'Meera Krishnan', 'meera.k@joycorporate.com',
    'Joy Corporate Solutions Pvt Ltd', 'Coimbatore HQ Campus', 'Customer Support', 'Technical Support Specialist',
    'Active', 'Contract', 'VENDOR',
    '{"gender":"Female","phone":"+91 98406 77889","nationality":"Indian"}',
    '{"doj":"2025-06-01","employment_type":"Contract","vendor_name":"ABC Workforce Solutions Pvt Ltd","reporting_manager_name":"Hari Priya","confirmation_status":"Confirmed","work_location":"Coimbatore HQ"}',
    '2025-06-01T00:00:00Z', NOW()
  ),
  (
    'emp-1040', 'org-joy-01', 'comp-joy-01', 'br-cbe-01', 'dept-eng', 'desig-sr-eng',
    'EMP-1040', 'Priya', 'Sundaram', 'Priya Sundaram', 'priya.sundaram@joycorporate.com',
    'Joy Corporate Solutions Pvt Ltd', 'Coimbatore HQ Campus', 'Engineering & DevOps', 'Senior Staff Frontend Architect',
    'Onboarding', 'Full Time', 'DIRECT',
    '{"gender":"Female","phone":"+91 98405 88990","nationality":"Indian","blood_group":"O+"}',
    '{"doj":"2026-08-20","employment_type":"Full Time","reporting_manager_name":"Karthik Natarajan","team_lead_name":"Deepa Subramanian","confirmation_status":"Pending","probation_period_months":3,"work_location":"Coimbatore HQ"}',
    '2026-08-15T09:00:00Z', NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  display_name = EXCLUDED.display_name,
  work_email = EXCLUDED.work_email,
  department_name = EXCLUDED.department_name,
  designation_title = EXCLUDED.designation_title,
  status = EXCLUDED.status,
  employment_source = EXCLUDED.employment_source,
  profile = EXCLUDED.profile,
  employment = EXCLUDED.employment,
  updated_at = NOW();

-- 9. LIVE ONBOARDING FOR TEST EMPLOYEE EMP-1040
INSERT INTO employee_onboardings (
  id, organization_id, legal_entity_id, employee_id,
  employment_source, status, joining_date, expected_completion_date, created_at, updated_at
) VALUES (
  'onb-1040',
  'org-joy-01',
  'comp-joy-01',
  'emp-1040',
  'DIRECT',
  'HR_VERIFICATION',
  '2026-08-20',
  '2026-08-27',
  '2026-08-15T09:00:00Z',
  NOW()
) ON CONFLICT (employee_id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();
