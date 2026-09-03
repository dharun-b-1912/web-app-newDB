-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 026
-- Target Project: ysiajemrqakfngasehhi
-- Description: System Seed Data & Global Permission Catalog
-- ============================================================================

-- 1. SaaS Default Plans
INSERT INTO public.platform_plans (code, name, description, billing_interval, base_price, price_per_employee, max_employees, feature_flags)
VALUES 
    ('STARTER', 'Starter Tier', 'Essential HRMS for growing teams up to 50 employees', 'MONTHLY', 1999.00, 49.00, 50, '{"attendance": true, "leave": true, "payroll": false}'::jsonb),
    ('GROWTH', 'Growth Tier', 'Complete HRMS with Statutory Payroll for teams up to 250 employees', 'MONTHLY', 4999.00, 39.00, 250, '{"attendance": true, "leave": true, "payroll": true, "lms": true}'::jsonb),
    ('ENTERPRISE', 'Enterprise Suite', 'Full-spectrum HRMS + Biometrics + Manpower OS + Performance for unlimited workforce', 'MONTHLY', 9999.00, 29.00, 10000, '{"attendance": true, "leave": true, "payroll": true, "lms": true, "biometrics": true, "manpower": true, "performance": true, "webhooks": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 2. Global System Permissions
INSERT INTO public.permissions (module, action, code, description)
VALUES 
    -- Workforce
    ('workforce', 'view', 'workforce.view', 'View employees directory'),
    ('workforce', 'create', 'workforce.create', 'Create new employee profile'),
    ('workforce', 'edit', 'workforce.edit', 'Modify employee profile'),
    ('workforce', 'delete', 'workforce.delete', 'Archive or delete employee'),
    -- Attendance
    ('attendance', 'view', 'attendance.view', 'View attendance ledger and daily punches'),
    ('attendance', 'regularize', 'attendance.regularize', 'Apply for attendance regularization'),
    ('attendance', 'approve', 'attendance.approve', 'Approve employee attendance regularization'),
    -- Leave
    ('leave', 'view', 'leave.view', 'View leave balances and team calendar'),
    ('leave', 'apply', 'leave.apply', 'Submit leave request'),
    ('leave', 'approve', 'leave.approve', 'Approve or reject leave requests'),
    -- Payroll
    ('payroll', 'view', 'payroll.view', 'View monthly payroll and compensation summaries'),
    ('payroll', 'process', 'payroll.process', 'Execute monthly payroll batch runs'),
    ('payroll', 'disburse', 'payroll.disburse', 'Approve and release payroll disbursement'),
    -- Vendor
    ('vendor', 'view', 'vendor.view', 'View contractor manpower and invoices'),
    ('vendor', 'manage', 'vendor.manage', 'Approve vendor manpower deployments and service bills'),
    -- Admin
    ('admin', 'configure', 'admin.configure', 'Configure organization structure and RBAC permissions')
ON CONFLICT (code) DO NOTHING;
