-- ============================================================
-- WorkforceOS Enterprise HRMS — Demo Seed Data
-- Migration: 20260814_003_seed_data.sql
-- Run AFTER: 001 and 002
-- ⚠️ This is DEMO data only — for development/staging only.
--    Do NOT run in production.
-- ============================================================
-- This mirrors src/services/mockData.ts exactly so both
-- developers see the same data when testing.
-- ============================================================

-- Organization (Acme Global)
INSERT INTO organizations
  (id, name, industry, default_currency, timezone, status, plan, owner_name, owner_email)
VALUES
  ('org-acme-01', 'Acme Global Enterprise', 'Software & Technology Services',
   'INR', 'Asia/Kolkata', 'Active', 'Enterprise', 'Dharun Joy', 'admin@acme.com')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- COMPANIES
-- ============================================================
INSERT INTO companies
  (id, organization_id, legal_name, trade_name, statutory_registration_no, tax_id, country, city)
VALUES
  ('comp-01', 'org-acme-01', 'Acme Technologies Pvt Ltd', 'AcmeTech India',
   'CIN-U72200TZ2020PTC034120', 'PAN-AAACA1234F', 'India', 'Coimbatore'),
  ('comp-02', 'org-acme-01', 'Acme Innovations Inc', 'Acme US',
   'DE-FEIN-987654321', 'EIN-987654321', 'United States', 'San Jose')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BRANCHES
-- ============================================================
INSERT INTO branches
  (id, company_id, name, code, city, state, timezone)
VALUES
  ('br-cbe', 'comp-01', 'Coimbatore Main Campus', 'BR-CBE', 'Coimbatore', 'Tamil Nadu',  'Asia/Kolkata'),
  ('br-blr', 'comp-01', 'Bengaluru Tech Hub',     'BR-BLR', 'Bengaluru',  'Karnataka',   'Asia/Kolkata'),
  ('br-che', 'comp-01', 'Chennai Office',          'BR-CHE', 'Chennai',    'Tamil Nadu',  'Asia/Kolkata'),
  ('br-hyd', 'comp-01', 'Hyderabad Centre',        'BR-HYD', 'Hyderabad',  'Telangana',   'Asia/Kolkata'),
  ('br-sjc', 'comp-02', 'San Jose HQ',             'BR-SJC', 'San Jose',   'California',  'America/Los_Angeles')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEPARTMENTS
-- ============================================================
INSERT INTO departments
  (id, company_id, name, code, employee_count)
VALUES
  ('dept-eng',   'comp-01', 'Engineering',           'ENG',   152),
  ('dept-hr',    'comp-01', 'Human Resources',       'HR',     24),
  ('dept-fin',   'comp-01', 'Finance & Accounts',    'FIN',    18),
  ('dept-sales', 'comp-01', 'Sales & Business Dev',  'SALES',  67),
  ('dept-mkt',   'comp-01', 'Marketing',             'MKT',    22),
  ('dept-ops',   'comp-01', 'Operations',            'OPS',    31),
  ('dept-cs',    'comp-01', 'Customer Success',      'CS',     28),
  ('dept-it',    'comp-01', 'IT Infrastructure',     'IT',     14),
  ('dept-legal', 'comp-01', 'Legal & Compliance',    'LEGAL',   6),
  ('dept-admin', 'comp-01', 'Administration',        'ADMIN',  10)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DESIGNATIONS
-- ============================================================
INSERT INTO designations
  (id, company_id, title, code, grade)
VALUES
  ('desig-cto',      'comp-01', 'Chief Technology Officer', 'CTO',    'L10'),
  ('desig-vp-eng',   'comp-01', 'VP Engineering',           'VP-ENG', 'L9'),
  ('desig-dir-hr',   'comp-01', 'Director HR',              'DIR-HR', 'L8'),
  ('desig-mgr',      'comp-01', 'Engineering Manager',      'EMGR',   'L7'),
  ('desig-staffeng', 'comp-01', 'Staff Engineer',           'SE',     'L6'),
  ('desig-tl',       'comp-01', 'Technical Lead',           'TL',     'L6'),
  ('desig-hr-mgr',   'comp-01', 'HR Manager',               'HR-MGR', 'L6'),
  ('desig-sde2',     'comp-01', 'Senior Software Engineer', 'SDE2',   'L5'),
  ('desig-sde1',     'comp-01', 'Software Engineer',        'SDE1',   'L4'),
  ('desig-qa',       'comp-01', 'QA Engineer',              'QA',     'L4'),
  ('desig-intern',   'comp-01', 'Engineering Intern',       'INTN',   'L1')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROLES (System Roles)
-- ============================================================
INSERT INTO roles
  (id, organization_id, name, description, is_system)
VALUES
  ('role-super',  'org-acme-01', 'Super Admin',   'Platform-level SaaS administrator',   TRUE),
  ('role-cadmin', 'org-acme-01', 'Company Admin', 'Company-level full administrator',     TRUE),
  ('role-hr',     'org-acme-01', 'HR Head',       'Full HR module access',                TRUE),
  ('role-mgr',    'org-acme-01', 'Manager',       'Department/team manager',              TRUE),
  ('role-tl',     'org-acme-01', 'Team Lead',     'Team lead / technical supervisor',     TRUE),
  ('role-emp',    'org-acme-01', 'Employee',      'Employee self-service portal access',  TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- APP USERS (Demo accounts — match mockData.ts)
-- ============================================================
-- Note: auth_user_id will be set when the user logs in via
-- Supabase Auth for the first time. Left NULL here.
INSERT INTO app_users
  (id, organization_id, email, name, status, roles)
VALUES
  ('user-superadmin', 'org-acme-01', 'superadmin@workforceos.com', 'WorkForce Super Admin',
   'Active', '[{"id":"role-super","name":"Super Admin"}]'),
  ('user-cadmin',     'org-acme-01', 'admin@acme.com',             'Dharun Joy',
   'Active', '[{"id":"role-cadmin","name":"Company Admin"}]'),
  ('user-hr',         'org-acme-01', 'hr@acme.com',                'Priya Sharma',
   'Active', '[{"id":"role-hr","name":"HR Head"}]'),
  ('user-mgr',        'org-acme-01', 'manager@acme.com',           'Rajesh Kumar',
   'Active', '[{"id":"role-mgr","name":"Manager"}]'),
  ('user-tl',         'org-acme-01', 'tl@acme.com',                'Karthik Suresh',
   'Active', '[{"id":"role-tl","name":"Team Lead"}]'),
  ('user-emp',        'org-acme-01', 'employee@acme.com',          'Ananya Patel',
   'Active', '[{"id":"role-emp","name":"Employee"}]')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SAMPLE EMPLOYEES (5 demo employees)
-- ============================================================
INSERT INTO employees
  (id, organization_id, company_id, branch_id, department_id, designation_id,
   employee_code, first_name, last_name, work_email, status, employment_type,
   company_name, branch_name, department_name, designation_title,
   profile, employment)
VALUES
  ('emp-001', 'org-acme-01', 'comp-01', 'br-cbe', 'dept-eng', 'desig-mgr',
   'EMP-1001', 'Rajesh', 'Kumar', 'rajesh.kumar@acme.com',
   'Active', 'Full Time',
   'Acme Technologies Pvt Ltd', 'Coimbatore Main Campus', 'Engineering', 'Engineering Manager',
   '{"phone":"9876543210","gender":"Male"}', '{"doj":"2023-04-01","ctc":1800000}'),

  ('emp-002', 'org-acme-01', 'comp-01', 'br-cbe', 'dept-eng', 'desig-tl',
   'EMP-1002', 'Karthik', 'Suresh', 'karthik.suresh@acme.com',
   'Active', 'Full Time',
   'Acme Technologies Pvt Ltd', 'Coimbatore Main Campus', 'Engineering', 'Technical Lead',
   '{"phone":"9876543211","gender":"Male"}', '{"doj":"2023-06-15","ctc":1400000}'),

  ('emp-003', 'org-acme-01', 'comp-01', 'br-blr', 'dept-hr', 'desig-hr-mgr',
   'EMP-1003', 'Priya', 'Sharma', 'priya.sharma@acme.com',
   'Active', 'Full Time',
   'Acme Technologies Pvt Ltd', 'Bengaluru Tech Hub', 'Human Resources', 'HR Manager',
   '{"phone":"9876543212","gender":"Female"}', '{"doj":"2022-11-01","ctc":1200000}'),

  ('emp-004', 'org-acme-01', 'comp-01', 'br-cbe', 'dept-eng', 'desig-sde2',
   'EMP-1004', 'Ananya', 'Patel', 'ananya.patel@acme.com',
   'Active', 'Full Time',
   'Acme Technologies Pvt Ltd', 'Coimbatore Main Campus', 'Engineering', 'Senior Software Engineer',
   '{"phone":"9876543213","gender":"Female"}', '{"doj":"2024-01-10","ctc":900000}'),

  ('emp-005', 'org-acme-01', 'comp-01', 'br-blr', 'dept-sales', 'desig-sde1',
   'EMP-1005', 'Mohammed', 'Ali', 'mohammed.ali@acme.com',
   'On Leave', 'Full Time',
   'Acme Technologies Pvt Ltd', 'Bengaluru Tech Hub', 'Sales & Business Dev', 'Software Engineer',
   '{"phone":"9876543214","gender":"Male"}', '{"doj":"2024-03-20","ctc":700000}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SAMPLE APPROVALS
-- ============================================================
INSERT INTO approval_items
  (id, organization_id, type, title, requested_by_id, requested_by_name,
   department, details, amount_or_duration, status)
VALUES
  ('appr-001', 'org-acme-01', 'Leave', 'Annual Leave Request',
   'emp-004', 'Ananya Patel', 'Engineering',
   'Annual leave — family vacation', '5 Days', 'Pending'),
  ('appr-002', 'org-acme-01', 'Expense', 'Business Travel Expense Reimbursement',
   'emp-002', 'Karthik Suresh', 'Engineering',
   'Client visit to Chennai — hotel + flight', '₹18,450', 'Pending'),
  ('appr-003', 'org-acme-01', 'Attendance', 'Attendance Regularization',
   'emp-005', 'Mohammed Ali', 'Sales & Business Dev',
   'Missed punch on August 8, 2026 — was on client site', '1 Day', 'Pending')
ON CONFLICT (id) DO NOTHING;
