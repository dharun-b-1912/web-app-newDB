-- ==============================================================================
-- WorkforceOS Enterprise HRMS - Universal Type-Safe Database & Auth Purge
-- Purpose: Complete removal of 'org-joy-01', mock seeds, and demo auth accounts.
-- Uses column-existence checks and ::text casting so UUID / VARCHAR columns never error.
-- ==============================================================================

BEGIN;

-- Helper function to safely clean tables dynamically inspecting columns & casting to text
CREATE OR REPLACE FUNCTION pg_temp.safe_clean_table(p_table TEXT) RETURNS VOID AS $$
DECLARE
    has_org BOOLEAN;
    has_tenant BOOLEAN;
    has_comp BOOLEAN;
    has_email BOOLEAN;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = p_table) THEN
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'organization_id') INTO has_org;
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'tenant_id') INTO has_tenant;
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'company_id') INTO has_comp;
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'email') INTO has_email;

        IF has_org AND has_tenant AND has_email THEN
            EXECUTE format('DELETE FROM public.%I WHERE organization_id::text = ''org-joy-01'' OR tenant_id::text = ''org-joy-01'' OR LOWER(email::text) LIKE ''%%joy%%'' OR LOWER(email::text) LIKE ''%%dharun%%''', p_table);
        ELSIF has_org AND has_tenant THEN
            EXECUTE format('DELETE FROM public.%I WHERE organization_id::text = ''org-joy-01'' OR tenant_id::text = ''org-joy-01''', p_table);
        ELSIF has_org AND has_email THEN
            EXECUTE format('DELETE FROM public.%I WHERE organization_id::text = ''org-joy-01'' OR LOWER(email::text) LIKE ''%%joy%%'' OR LOWER(email::text) LIKE ''%%dharun%%''', p_table);
        ELSIF has_org THEN
            EXECUTE format('DELETE FROM public.%I WHERE organization_id::text = ''org-joy-01''', p_table);
        ELSIF has_tenant THEN
            EXECUTE format('DELETE FROM public.%I WHERE tenant_id::text = ''org-joy-01''', p_table);
        ELSIF has_comp THEN
            EXECUTE format('DELETE FROM public.%I WHERE company_id::text = ''comp-joy-01''', p_table);
        ELSIF has_email THEN
            EXECUTE format('DELETE FROM public.%I WHERE LOWER(email::text) LIKE ''%%joy%%'' OR LOWER(email::text) LIKE ''%%dharun%%'' OR LOWER(email::text) = ''superadmin@workforceos.com''', p_table);
        ELSE
            EXECUTE format('DELETE FROM public.%I', p_table);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    target_auth_ids UUID[];
BEGIN
    -- 1. Gather all auth user IDs linked to joy accounts
    SELECT ARRAY_AGG(id) INTO target_auth_ids
    FROM auth.users
    WHERE LOWER(email) LIKE '%joycorporate.com'
       OR LOWER(email) LIKE '%joyglobalcorp.com'
       OR LOWER(email) LIKE '%joy%'
       OR LOWER(email) LIKE '%dharun%'
       OR LOWER(email) = 'superadmin@workforceos.com'
       OR (raw_user_meta_data->>'organization_id' = 'org-joy-01')
       OR (raw_app_meta_data->>'organization_id' = 'org-joy-01');

    -- 2. Unlink foreign keys safely
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'user_id') THEN
        EXECUTE 'UPDATE public.employees SET user_id = NULL';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_pairing_tokens' AND column_name = 'generated_by') THEN
        EXECUTE 'UPDATE public.biometric_pairing_tokens SET generated_by = NULL';
    END IF;

    -- 3. Dynamic Clean on all public tables in proper dependency order
    
    -- Transactional & Activity tables
    PERFORM pg_temp.safe_clean_table('attendance_deviations');
    PERFORM pg_temp.safe_clean_table('attendance_regularization_requests');
    PERFORM pg_temp.safe_clean_table('attendance_regularization_policies');
    PERFORM pg_temp.safe_clean_table('attendance_exceptions');
    PERFORM pg_temp.safe_clean_table('attendance_records');
    PERFORM pg_temp.safe_clean_table('attendance');
    
    PERFORM pg_temp.safe_clean_table('payroll_snapshot_line_items');
    PERFORM pg_temp.safe_clean_table('payroll_snapshots');
    PERFORM pg_temp.safe_clean_table('payroll_audit_logs');
    PERFORM pg_temp.safe_clean_table('employee_salary_assignments');
    
    PERFORM pg_temp.safe_clean_table('helpdesk_messages');
    PERFORM pg_temp.safe_clean_table('helpdesk_tickets');
    PERFORM pg_temp.safe_clean_table('service_request_events');
    PERFORM pg_temp.safe_clean_table('service_requests');
    PERFORM pg_temp.safe_clean_table('service_definitions');
    PERFORM pg_temp.safe_clean_table('communication_recipients');
    PERFORM pg_temp.safe_clean_table('communications');
    PERFORM pg_temp.safe_clean_table('employee_grievances');
    PERFORM pg_temp.safe_clean_table('expense_claims');
    PERFORM pg_temp.safe_clean_table('digital_letters');
    PERFORM pg_temp.safe_clean_table('company_announcements');
    PERFORM pg_temp.safe_clean_table('shift_rosters');
    
    -- Vendor Management
    PERFORM pg_temp.safe_clean_table('vendor_audit_logs');
    PERFORM pg_temp.safe_clean_table('vendor_statutory_challans');
    PERFORM pg_temp.safe_clean_table('vendor_payments');
    PERFORM pg_temp.safe_clean_table('vendor_invoices');
    PERFORM pg_temp.safe_clean_table('vendor_purchase_orders');
    PERFORM pg_temp.safe_clean_table('vendor_attendance_records');
    PERFORM pg_temp.safe_clean_table('vendor_employee_assignments');
    PERFORM pg_temp.safe_clean_table('vendor_employees');
    PERFORM pg_temp.safe_clean_table('vendor_documents');
    PERFORM pg_temp.safe_clean_table('vendor_contracts');
    PERFORM pg_temp.safe_clean_table('vendors');
    
    -- Employee Profiles & Core
    PERFORM pg_temp.safe_clean_table('employee_documents');
    PERFORM pg_temp.safe_clean_table('employee_bank_accounts');
    PERFORM pg_temp.safe_clean_table('employee_statutory_details');
    PERFORM pg_temp.safe_clean_table('employee_work_locations');
    PERFORM pg_temp.safe_clean_table('team_members');
    PERFORM pg_temp.safe_clean_table('teams');
    PERFORM pg_temp.safe_clean_table('employee_auth_accounts');
    PERFORM pg_temp.safe_clean_table('employee_auth_identities');
    PERFORM pg_temp.safe_clean_table('employees');
    
    -- App & Platform Users
    PERFORM pg_temp.safe_clean_table('app_users');
    PERFORM pg_temp.safe_clean_table('platform_staff');
    PERFORM pg_temp.safe_clean_table('platform_users');
    PERFORM pg_temp.safe_clean_table('users');
    
    -- Approvals & Activities
    PERFORM pg_temp.safe_clean_table('approvals');
    PERFORM pg_temp.safe_clean_table('activities');
    PERFORM pg_temp.safe_clean_table('activity_logs');
    
    -- Organization Structure
    PERFORM pg_temp.safe_clean_table('designations');
    PERFORM pg_temp.safe_clean_table('departments');
    PERFORM pg_temp.safe_clean_table('locations');
    PERFORM pg_temp.safe_clean_table('work_locations');
    PERFORM pg_temp.safe_clean_table('branches');
    PERFORM pg_temp.safe_clean_table('companies');
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        EXECUTE 'DELETE FROM public.organizations WHERE id::text = ''org-joy-01'' OR slug::text LIKE ''%joy%'' OR name::text LIKE ''%Joy Corporate%''';
    END IF;

    -- 4. Delete Supabase Auth internal tables
    IF target_auth_ids IS NOT NULL AND ARRAY_LENGTH(target_auth_ids, 1) > 0 THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'mfa_amr_claims') THEN
            DELETE FROM auth.mfa_amr_claims WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = ANY(target_auth_ids));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'mfa_factors') THEN
            DELETE FROM auth.mfa_factors WHERE user_id = ANY(target_auth_ids);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'refresh_tokens') THEN
            DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = ANY(target_auth_ids));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'sessions') THEN
            DELETE FROM auth.sessions WHERE user_id = ANY(target_auth_ids);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
            DELETE FROM auth.identities WHERE user_id = ANY(target_auth_ids);
        END IF;

        DELETE FROM auth.users WHERE id = ANY(target_auth_ids);
    END IF;

    -- Clean any remaining auth users containing joy/dharun
    DELETE FROM auth.users 
    WHERE LOWER(email) LIKE '%joycorporate.com' 
       OR LOWER(email) LIKE '%joyglobalcorp.com' 
       OR LOWER(email) LIKE '%joy%' 
       OR LOWER(email) LIKE '%dharun%';

    RAISE NOTICE 'Universal type-safe purge completed successfully.';
END $$;

COMMIT;

-- Final Verification Result
SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE LOWER(email) LIKE '%joy%' OR LOWER(email) LIKE '%dharun%') AS remaining_joy_auth_users,
    (SELECT COUNT(*) FROM public.employees WHERE organization_id::text = 'org-joy-01') AS remaining_joy_employees,
    (SELECT COUNT(*) FROM public.organizations WHERE id::text = 'org-joy-01') AS remaining_joy_organizations;
