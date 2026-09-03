-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 024
-- Target Project: ysiajemrqakfngasehhi
-- Description: Universal Row Level Security (RLS) Enforcement
-- ============================================================================

-- Enable RLS across all tables
DO $$
DECLARE
    tbl text;
    all_tables text[] := ARRAY[
        'platform_users', 'platform_plans', 'saas_subscriptions', 'background_jobs',
        'organizations', 'companies', 'branches', 'work_locations', 'departments', 'designations',
        'user_profiles', 'roles', 'permissions', 'role_permissions', 'user_roles',
        'employees', 'employee_profiles', 'employee_addresses', 'employee_bank_details', 'employee_statutory_details',
        'employee_onboarding', 'employee_lifecycle_events', 'employee_separations',
        'biometric_devices', 'attendance_punches', 'attendance_daily', 'attendance_regularizations',
        'shifts', 'employee_shift_assignments',
        'leave_types', 'leave_balances', 'leave_requests', 'leave_ledger_entries', 'holidays',
        'approval_workflows', 'approval_instances', 'approval_actions',
        'salary_components', 'salary_structures', 'salary_structure_components', 'employee_salary_assignments', 'payroll_runs', 'payroll_line_items', 'payslips',
        'vendors', 'vendor_workers', 'vendor_invoices',
        'performance_cycles', 'performance_goals', 'performance_reviews',
        'lms_courses', 'lms_enrollments',
        'document_types', 'employee_documents',
        'employee_requests', 'posh_and_grievance_cases',
        'assets', 'asset_assignments',
        'job_openings', 'job_applicants',
        'notification_events', 'webhook_endpoints', 'webhook_deliveries',
        'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY all_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        END IF;
    END LOOP;
END $$;

-- 1. Reference Table: Permissions (Readable by all authenticated users)
DROP POLICY IF EXISTS "permissions_select_auth" ON public.permissions;
CREATE POLICY "permissions_select_auth" ON public.permissions FOR SELECT TO authenticated USING (true);

-- 2. Platform Tables
DROP POLICY IF EXISTS "platform_users_policy" ON public.platform_users;
CREATE POLICY "platform_users_policy" ON public.platform_users FOR ALL TO authenticated USING (public.is_platform_admin());

DROP POLICY IF EXISTS "platform_plans_select" ON public.platform_plans;
CREATE POLICY "platform_plans_select" ON public.platform_plans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "platform_plans_admin" ON public.platform_plans;
CREATE POLICY "platform_plans_admin" ON public.platform_plans FOR ALL TO authenticated USING (public.is_platform_admin());

-- 3. Dynamic Multi-Tenant RLS Policy Generation for all organization-owned tables
DO $$
DECLARE
    t text;
    org_tables text[] := ARRAY[
        'saas_subscriptions', 'background_jobs',
        'organizations', 'companies', 'branches', 'work_locations', 'departments', 'designations',
        'user_profiles', 'roles', 'role_permissions', 'user_roles',
        'employees', 'employee_profiles', 'employee_addresses', 'employee_bank_details', 'employee_statutory_details',
        'employee_onboarding', 'employee_lifecycle_events', 'employee_separations',
        'biometric_devices', 'attendance_punches', 'attendance_daily', 'attendance_regularizations',
        'shifts', 'employee_shift_assignments',
        'leave_types', 'leave_balances', 'leave_requests', 'leave_ledger_entries', 'holidays',
        'approval_workflows', 'approval_instances', 'approval_actions',
        'salary_components', 'salary_structures', 'salary_structure_components', 'employee_salary_assignments', 'payroll_runs', 'payroll_line_items', 'payslips',
        'vendors', 'vendor_workers', 'vendor_invoices',
        'performance_cycles', 'performance_goals', 'performance_reviews',
        'lms_courses', 'lms_enrollments',
        'document_types', 'employee_documents',
        'employee_requests', 'posh_and_grievance_cases',
        'assets', 'asset_assignments',
        'job_openings', 'job_applicants',
        'notification_events', 'webhook_endpoints', 'webhook_deliveries',
        'audit_logs'
    ];
BEGIN
    FOREACH t IN ARRAY org_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            -- Drop existing policy if any
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_tenant_isolation', t);
            
            -- Organizations table check is on id; others on organization_id
            IF t = 'organizations' THEN
                EXECUTE format('
                    CREATE POLICY %I ON public.%I FOR ALL TO authenticated 
                    USING (id = (SELECT public.get_active_user_org_id()) OR (SELECT public.is_platform_admin()))
                    WITH CHECK (id = (SELECT public.get_active_user_org_id()) OR (SELECT public.is_platform_admin()));',
                    t || '_tenant_isolation', t
                );
            ELSE
                EXECUTE format('
                    CREATE POLICY %I ON public.%I FOR ALL TO authenticated 
                    USING (organization_id = (SELECT public.get_active_user_org_id()) OR (SELECT public.is_platform_admin()))
                    WITH CHECK (organization_id = (SELECT public.get_active_user_org_id()) OR (SELECT public.is_platform_admin()));',
                    t || '_tenant_isolation', t
                );
            END IF;
        END IF;
    END LOOP;
END $$;
