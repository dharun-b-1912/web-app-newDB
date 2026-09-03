-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 023
-- Target Project: ysiajemrqakfngasehhi
-- Description: Automated Timestamp & Audit Triggers
-- ============================================================================

-- Generic trigger function to maintain updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger across all target mutable tables
DO $$
DECLARE
    t text;
    mutable_tables text[] := ARRAY[
        'platform_users', 'platform_plans', 'saas_subscriptions',
        'organizations', 'companies', 'branches', 'work_locations', 'departments', 'designations',
        'user_profiles', 'roles',
        'employees', 'employee_profiles', 'employee_addresses', 'employee_bank_details', 'employee_statutory_details',
        'employee_onboarding', 'employee_separations',
        'biometric_devices', 'attendance_daily', 'attendance_regularizations',
        'shifts',
        'leave_types', 'leave_balances', 'leave_requests',
        'approval_workflows', 'approval_instances',
        'salary_components', 'salary_structures', 'employee_salary_assignments', 'payroll_runs',
        'vendors', 'vendor_workers', 'vendor_invoices',
        'performance_goals', 'performance_reviews',
        'employee_documents',
        'employee_requests', 'posh_and_grievance_cases',
        'assets',
        'job_applicants'
    ];
BEGIN
    FOREACH t IN ARRAY mutable_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;', t);
            EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();', t);
        END IF;
    END LOOP;
END $$;
