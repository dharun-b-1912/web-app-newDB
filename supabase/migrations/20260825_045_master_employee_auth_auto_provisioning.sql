-- ============================================================================
-- Migration: 20260825_045_master_employee_auth_auto_provisioning.sql
-- Description: Server-Side Atomic Employee Auth Provisioning, Auto-Verification,
--              Controlled Test Cleanup, and Identity Health Views.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 0. FIX CURRENT_ORG_ID FUNCTION & GRANT EXECUTE PERMISSIONS
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS TEXT 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM   public.app_users
  WHERE  auth_user_id = auth.uid()
  LIMIT  1;
$$;

GRANT EXECUTE ON FUNCTION public.current_org_id() TO anon, authenticated, service_role, public;

-- 1. CONSTRAINTS UNIFICATION (Leave, Punches, Grievances)
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_status_check 
  CHECK (status IN ('Pending','Approved','Rejected','Cancelled','Withdrawn','PENDING','APPROVED','REJECTED','CANCELLED','WITHDRAWN'));

ALTER TABLE public.attendance_events DROP CONSTRAINT IF EXISTS attendance_events_source_check;
ALTER TABLE public.attendance_events ADD CONSTRAINT attendance_events_source_check 
  CHECK (source IN ('WEB','MOBILE','MOBILE_GPS','BIOMETRIC','GPS','QR','MANUAL'));

ALTER TABLE public.employee_requests DROP CONSTRAINT IF EXISTS employee_requests_request_type_check;
ALTER TABLE public.employee_requests ADD CONSTRAINT employee_requests_request_type_check 
  CHECK (request_type IN ('regularization','certificate','profile_correction','hr_query','grievance','GRIEVANCE'));

ALTER TABLE public.employee_requests DROP CONSTRAINT IF EXISTS employee_requests_status_check;
ALTER TABLE public.employee_requests ADD CONSTRAINT employee_requests_status_check 
  CHECK (status IN ('Pending','Approved','Rejected','In Progress','Completed','SUBMITTED','UNDER_REVIEW','IN_PROGRESS','RESOLVED','CLOSED'));

-- 2. TOP-LEVEL COMPATIBILITY COLUMNS ON EMPLOYEES & APP_USERS (For Direct Flutter Selects)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Employee';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift_start_time TEXT DEFAULT '09:30 AM';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift_end_time TEXT DEFAULT '06:30 PM';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS machine_pin TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS joining_date DATE;

-- 3. SERVER-SIDE ATOMIC EMPLOYEE AUTH PROVISIONING FUNCTION
CREATE OR REPLACE FUNCTION public.fn_provision_employee_auth(
    p_tenant_id         VARCHAR,
    p_employee_id       VARCHAR,
    p_email             VARCHAR,
    p_phone             VARCHAR,
    p_first_name        VARCHAR,
    p_last_name         VARCHAR,
    p_role              VARCHAR DEFAULT 'Employee',
    p_verification_mode VARCHAR DEFAULT 'TEST_AUTO_VERIFY',
    p_initial_password  VARCHAR DEFAULT 'Joy@2026!'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auth_user_id UUID;
    v_clean_email  TEXT := LOWER(TRIM(p_email));
    v_clean_phone  TEXT := TRIM(p_phone);
    v_full_name    TEXT := TRIM(p_first_name || ' ' || p_last_name);
    v_confirmed_at TIMESTAMPTZ := CASE WHEN p_verification_mode = 'TEST_AUTO_VERIFY' THEN NOW() ELSE NULL END;
BEGIN
    -- Verify employee exists in public.employees
    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id) THEN
        RAISE EXCEPTION 'Employee master record % does not exist.', p_employee_id;
    END IF;

    -- 1. Check if user already exists in auth.users
    SELECT id INTO v_auth_user_id FROM auth.users WHERE LOWER(email) = v_clean_email LIMIT 1;

    -- If not exists, create user in auth.users
    IF v_auth_user_id IS NULL THEN
        v_auth_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            phone,
            phone_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role,
            created_at,
            updated_at
        ) VALUES (
            v_auth_user_id,
            '00000000-0000-0000-0000-000000000000',
            v_clean_email,
            crypt(p_initial_password, gen_salt('bf')),
            v_confirmed_at,
            v_clean_phone,
            v_confirmed_at,
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object(
                'first_name', p_first_name,
                'last_name', p_last_name,
                'display_name', v_full_name,
                'employee_id', p_employee_id,
                'tenant_id', p_tenant_id
            ),
            'authenticated',
            'authenticated',
            NOW(),
            NOW()
        );

        -- Also register identity in auth.identities
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_auth_user_id::text,
            v_auth_user_id,
            jsonb_build_object('sub', v_auth_user_id::text, 'email', v_clean_email),
            'email',
            NOW(),
            NOW(),
            NOW()
        );
    ELSE
        -- Update password and confirmation if already exists
        UPDATE auth.users
        SET encrypted_password = crypt(p_initial_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, v_confirmed_at),
            phone_confirmed_at = COALESCE(phone_confirmed_at, v_confirmed_at),
            raw_user_meta_data = raw_user_meta_data || jsonb_build_object('employee_id', p_employee_id),
            updated_at = NOW()
        WHERE id = v_auth_user_id;
    END IF;

    -- 2. Create or Update public.app_users mapping
    INSERT INTO public.app_users (
        id, organization_id, email, name, employee_id, status, auth_user_id, role, created_at
    ) VALUES (
        'user-' || gen_random_uuid()::text,
        p_tenant_id,
        v_clean_email,
        v_full_name,
        p_employee_id,
        'Active',
        v_auth_user_id,
        p_role,
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        employee_id  = EXCLUDED.employee_id,
        name         = EXCLUDED.name,
        role         = EXCLUDED.role,
        status       = 'Active';

    -- 3. Create or Update public.employee_auth_identities mapping
    INSERT INTO public.employee_auth_identities (
        tenant_id, employee_id, auth_user_id, email, phone, role, status, activation_status,
        first_login_completed, password_change_required, created_at, updated_at
    ) VALUES (
        p_tenant_id,
        p_employee_id,
        v_auth_user_id,
        v_clean_email,
        v_clean_phone,
        p_role,
        'ACTIVE',
        'ACTIVE',
        false,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (tenant_id, employee_id) DO UPDATE SET
        auth_user_id             = EXCLUDED.auth_user_id,
        email                    = EXCLUDED.email,
        phone                    = EXCLUDED.phone,
        role                     = EXCLUDED.role,
        status                   = 'ACTIVE',
        activation_status        = 'ACTIVE',
        password_change_required = true,
        updated_at               = NOW();

    -- 4. Update employee master user_id pointer
    UPDATE public.employees
    SET user_id = (SELECT id FROM public.app_users WHERE email = v_clean_email LIMIT 1)
    WHERE id = p_employee_id;

    -- 5. Write Immutable Security Audit Entry
    INSERT INTO public.auth_audit_logs (
        tenant_id, actor_id, actor_name, actor_type, event_type, status, details, created_at
    ) VALUES (
        p_tenant_id,
        p_employee_id,
        'System Provisioning',
        'SYSTEM',
        'AUTH_ACCOUNT_CREATED',
        'SUCCESS',
        jsonb_build_object(
            'auth_user_id', v_auth_user_id,
            'email', v_clean_email,
            'role', p_role,
            'mode', p_verification_mode
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'auth_user_id', v_auth_user_id,
        'employee_id', p_employee_id,
        'email', v_clean_email,
        'role', p_role,
        'status', 'ACTIVE',
        'portal_access', 'READY'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_provision_employee_auth(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon, authenticated, service_role, public;

-- 4. CONTROLLED TEST EMPLOYEE CLEANUP RPC
CREATE OR REPLACE FUNCTION public.fn_admin_cleanup_test_employee(p_employee_id VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auth_uid UUID;
    v_email    TEXT;
BEGIN
    SELECT auth_user_id, email INTO v_auth_uid, v_email 
    FROM public.app_users 
    WHERE employee_id = p_employee_id 
    LIMIT 1;

    -- Revoke active sessions
    DELETE FROM public.auth_active_sessions WHERE employee_id = p_employee_id;

    -- Remove identity mappings
    DELETE FROM public.employee_auth_identities WHERE employee_id = p_employee_id;
    DELETE FROM public.app_users WHERE employee_id = p_employee_id;

    -- Remove dependent records
    DELETE FROM public.attendance_events WHERE employee_id = p_employee_id;
    DELETE FROM public.attendance_daily WHERE employee_id = p_employee_id;
    DELETE FROM public.leave_requests WHERE employee_id = p_employee_id;
    DELETE FROM public.leave_entitlements WHERE employee_id = p_employee_id;
    DELETE FROM public.employee_statutory_details WHERE employee_id = p_employee_id;
    DELETE FROM public.employee_bank_accounts WHERE employee_id = p_employee_id;
    DELETE FROM public.employee_documents WHERE employee_id = p_employee_id;

    -- Remove employee master record
    DELETE FROM public.employees WHERE id = p_employee_id;

    -- Delete Auth user if found
    IF v_auth_uid IS NOT NULL THEN
        DELETE FROM auth.identities WHERE user_id = v_auth_uid;
        DELETE FROM auth.users WHERE id = v_auth_uid;
    END IF;

    RETURN jsonb_build_object('success', true, 'deleted_employee_id', p_employee_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_cleanup_test_employee(VARCHAR) TO anon, authenticated, service_role, public;

-- 5. RLS POLICIES FOR DETERMINISTIC SELF-IDENTITY RESOLUTION
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_users_self_and_org_read" ON public.app_users;
CREATE POLICY "app_users_self_and_org_read" ON public.app_users
    FOR SELECT USING (
        auth_user_id = auth.uid() 
        OR organization_id = current_org_id()
    );

ALTER TABLE public.employee_auth_identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_identities_self_read" ON public.employee_auth_identities;
CREATE POLICY "auth_identities_self_read" ON public.employee_auth_identities
    FOR SELECT USING (
        auth_user_id = auth.uid() 
        OR tenant_id = current_org_id()
    );

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_self_and_org_read" ON public.employees;
CREATE POLICY "employees_self_and_org_read" ON public.employees
    FOR SELECT USING (
        id IN (SELECT employee_id FROM public.app_users WHERE auth_user_id = auth.uid())
        OR id IN (SELECT employee_id FROM public.employee_auth_identities WHERE auth_user_id = auth.uid())
        OR organization_id = current_org_id()
    );

-- 6. AUTOMATIC PUNCH -> DAILY ATTENDANCE TRIGGER
CREATE OR REPLACE FUNCTION public.fn_sync_attendance_event_to_daily()
RETURNS TRIGGER AS $$
DECLARE
    v_date DATE := (NEW.timestamp AT TIME ZONE 'UTC')::DATE;
    v_time_str TEXT := TO_CHAR(NEW.timestamp AT TIME ZONE 'UTC', 'HH12:MI AM');
    v_emp RECORD;
BEGIN
    SELECT * INTO v_emp FROM public.employees WHERE id = NEW.employee_id;

    IF NEW.type = 'CHECK_IN' THEN
        INSERT INTO public.attendance_daily (
            organization_id, company_id, employee_id, employee_code, employee_name,
            department, designation, date, status, first_check_in, source, created_at, updated_at
        ) VALUES (
            NEW.organization_id, COALESCE(v_emp.company_id, 'comp-01'), NEW.employee_id,
            COALESCE(v_emp.employee_code, 'EMP'), COALESCE(v_emp.display_name, 'Employee'),
            COALESCE(v_emp.department_name, 'General'), COALESCE(v_emp.designation_title, 'Staff'),
            v_date, 'Present', v_time_str, NEW.source, NOW(), NOW()
        )
        ON CONFLICT (employee_id, date) DO UPDATE SET
            first_check_in = COALESCE(public.attendance_daily.first_check_in, EXCLUDED.first_check_in),
            status = 'Present',
            source = EXCLUDED.source,
            updated_at = NOW();

    ELSIF NEW.type = 'CHECK_OUT' THEN
        UPDATE public.attendance_daily
        SET last_check_out = v_time_str,
            status = 'Present',
            updated_at = NOW()
        WHERE employee_id = NEW.employee_id AND date = v_date;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_attendance_event ON public.attendance_events;
CREATE TRIGGER trg_sync_attendance_event
AFTER INSERT ON public.attendance_events
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_attendance_event_to_daily();

GRANT EXECUTE ON FUNCTION public.fn_sync_attendance_event_to_daily() TO anon, authenticated, service_role, public;
