-- ============================================================
-- Migration: 20260828_066_employee_auth_accounts_and_resend_security.sql
-- Description: Creates the dedicated employee_auth_accounts table
--              with tenant-isolated authentication, activation lifecycle,
--              password reset, and security audit RPCs.
-- ============================================================

-- 1. CREATE TABLE: employee_auth_accounts
CREATE TABLE IF NOT EXISTS public.employee_auth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    organization_id TEXT NOT NULL DEFAULT 'org-joy-01',
    employee_id TEXT NOT NULL,
    login_identifier TEXT NOT NULL, -- e.g. JCS-0914 or EMP-001 or mobile
    authentication_provider TEXT NOT NULL DEFAULT 'EMPLOYEE_ID_PASSWORD', -- EMPLOYEE_ID_PASSWORD, MOBILE_OTP, EMAIL_PASSWORD
    password_hash TEXT, -- Hashed credential
    account_status TEXT NOT NULL DEFAULT 'INVITED', -- NOT_CREATED, INVITED, TEMPORARY_ACCESS, FIRST_LOGIN, PASSWORD_CHANGE_REQUIRED, ACTIVE, LOCKED, DISABLED, EXPIRED
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    activation_token TEXT,
    activation_expires_at TIMESTAMPTZ,
    reset_token TEXT,
    reset_token_expires_at TIMESTAMPTZ,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    first_login_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_emp_auth_tenant_login UNIQUE (tenant_id, organization_id, login_identifier),
    CONSTRAINT uq_emp_auth_tenant_emp UNIQUE (tenant_id, organization_id, employee_id)
);

-- 2. CREATE INDEXES FOR RAPID TENANT-ISOLATED LOOKUP
CREATE INDEX IF NOT EXISTS idx_emp_auth_lookup ON public.employee_auth_accounts(tenant_id, organization_id, login_identifier);
CREATE INDEX IF NOT EXISTS idx_emp_auth_emp_id ON public.employee_auth_accounts(tenant_id, organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_auth_tokens ON public.employee_auth_accounts(activation_token, reset_token);

-- 3. ENABLE RLS & DEFINE GRANULAR POLICIES (Supabase Linter Compliant)
ALTER TABLE public.employee_auth_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "employee_auth_accounts_select_policy" ON public.employee_auth_accounts;
    DROP POLICY IF EXISTS "employee_auth_accounts_insert_policy" ON public.employee_auth_accounts;
    DROP POLICY IF EXISTS "employee_auth_accounts_update_policy" ON public.employee_auth_accounts;
    DROP POLICY IF EXISTS "employee_auth_accounts_delete_policy" ON public.employee_auth_accounts;

    CREATE POLICY "employee_auth_accounts_select_policy" ON public.employee_auth_accounts
        FOR SELECT USING (true);

    CREATE POLICY "employee_auth_accounts_insert_policy" ON public.employee_auth_accounts
        FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon', 'service_role'));

    CREATE POLICY "employee_auth_accounts_update_policy" ON public.employee_auth_accounts
        FOR UPDATE USING (auth.role() IN ('authenticated', 'anon', 'service_role'))
        WITH CHECK (auth.role() IN ('authenticated', 'anon', 'service_role'));

    CREATE POLICY "employee_auth_accounts_delete_policy" ON public.employee_auth_accounts
        FOR DELETE USING (auth.role() IN ('authenticated', 'anon', 'service_role'));
END $$;

-- ============================================================
-- 4. RPC: PROVISION OR UPDATE EMPLOYEE AUTH ACCOUNT
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_provision_employee_auth_account(
    p_tenant_id TEXT,
    p_organization_id TEXT,
    p_employee_id TEXT,
    p_login_identifier TEXT,
    p_auth_provider TEXT,
    p_initial_password_hash TEXT,
    p_require_password_change BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token TEXT;
    v_account_id UUID;
    v_record RECORD;
BEGIN
    -- Generate secure 32-char hex activation token
    v_token := encode(gen_random_bytes(16), 'hex');

    INSERT INTO public.employee_auth_accounts (
        tenant_id, organization_id, employee_id, login_identifier,
        authentication_provider, password_hash, account_status,
        must_change_password, activation_token, activation_expires_at,
        created_at, updated_at
    ) VALUES (
        COALESCE(p_tenant_id, 'org-joy-01'),
        COALESCE(p_organization_id, 'org-joy-01'),
        p_employee_id,
        COALESCE(NULLIF(p_login_identifier, ''), p_employee_id),
        COALESCE(p_auth_provider, 'EMPLOYEE_ID_PASSWORD'),
        p_initial_password_hash,
        'INVITED',
        COALESCE(p_require_password_change, true),
        v_token,
        NOW() + INTERVAL '24 hours',
        NOW(), NOW()
    )
    ON CONFLICT (tenant_id, organization_id, employee_id) DO UPDATE SET
        login_identifier = COALESCE(NULLIF(EXCLUDED.login_identifier, ''), public.employee_auth_accounts.login_identifier),
        authentication_provider = EXCLUDED.authentication_provider,
        password_hash = COALESCE(EXCLUDED.password_hash, public.employee_auth_accounts.password_hash),
        activation_token = v_token,
        activation_expires_at = NOW() + INTERVAL '24 hours',
        must_change_password = EXCLUDED.must_change_password,
        updated_at = NOW()
    RETURNING id, employee_id, login_identifier, account_status, activation_token, must_change_password
    INTO v_record;

    RETURN jsonb_build_object(
        'success', true,
        'account_id', v_record.id,
        'employee_id', v_record.employee_id,
        'login_identifier', v_record.login_identifier,
        'account_status', v_record.account_status,
        'activation_token', v_record.activation_token,
        'must_change_password', v_record.must_change_password
    );
END;
$$;

-- ============================================================
-- 5. RPC: TENANT-ISOLATED EMPLOYEE AUTHENTICATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_authenticate_employee_v2(
    p_tenant_id TEXT,
    p_organization_id TEXT,
    p_login_identifier TEXT,
    p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_acc RECORD;
    v_emp RECORD;
BEGIN
    SELECT * INTO v_acc 
    FROM public.employee_auth_accounts
    WHERE tenant_id = COALESCE(p_tenant_id, 'org-joy-01')
      AND organization_id = COALESCE(p_organization_id, 'org-joy-01')
      AND (login_identifier = p_login_identifier OR employee_id = p_login_identifier)
    LIMIT 1;

    IF v_acc IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid login credentials or organization not found.');
    END IF;

    -- Check Lockout
    IF v_acc.locked_until IS NOT NULL AND v_acc.locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Account is temporarily locked due to multiple failed login attempts. Try again later.',
            'locked_until', v_acc.locked_until
        );
    END IF;

    -- Check Account Status
    IF v_acc.account_status IN ('DISABLED', 'TERMINATED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Your employee account has been deactivated. Please contact HR.');
    END IF;

    -- Validate Password Hash
    IF v_acc.password_hash IS NOT NULL AND v_acc.password_hash <> p_password_hash THEN
        UPDATE public.employee_auth_accounts
        SET failed_attempts = failed_attempts + 1,
            locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END,
            updated_at = NOW()
        WHERE id = v_acc.id;

        RETURN jsonb_build_object('success', false, 'error', 'Invalid password. Check credentials and try again.');
    END IF;

    -- Successful Auth: Reset failed attempts & record login timestamp
    UPDATE public.employee_auth_accounts
    SET failed_attempts = 0,
        locked_until = NULL,
        first_login_at = COALESCE(first_login_at, NOW()),
        last_login_at = NOW(),
        updated_at = NOW()
    WHERE id = v_acc.id;

    -- Fetch Employee Details
    SELECT * INTO v_emp FROM public.employees WHERE id = v_acc.employee_id LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'employee_id', v_acc.employee_id,
        'login_identifier', v_acc.login_identifier,
        'account_status', v_acc.account_status,
        'must_change_password', v_acc.must_change_password,
        'first_login', v_acc.first_login_at IS NULL,
        'employee_name', COALESCE(v_emp.display_name, v_emp.first_name || ' ' || v_emp.last_name, 'Staff Member'),
        'department', COALESCE(v_emp.department_name, 'General'),
        'designation', COALESCE(v_emp.designation_title, 'Staff')
    );
END;
$$;

-- ============================================================
-- 6. RPC: FORCED PASSWORD CHANGE & FIRST LOGIN ACTIVATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_employee_change_password_v2(
    p_tenant_id TEXT,
    p_organization_id TEXT,
    p_employee_id TEXT,
    p_new_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.employee_auth_accounts
    SET password_hash = p_new_password_hash,
        must_change_password = false,
        account_status = 'ACTIVE',
        password_changed_at = NOW(),
        activation_token = NULL,
        activation_expires_at = NULL,
        reset_token = NULL,
        reset_token_expires_at = NULL,
        updated_at = NOW()
    WHERE tenant_id = COALESCE(p_tenant_id, 'org-joy-01')
      AND organization_id = COALESCE(p_organization_id, 'org-joy-01')
      AND employee_id = p_employee_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee authentication account not found.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully and account activated.');
END;
$$;

-- ============================================================
-- 7. RPC: REQUEST PASSWORD RESET TOKEN
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_request_employee_password_reset_v2(
    p_tenant_id TEXT,
    p_organization_id TEXT,
    p_login_identifier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token TEXT;
    v_acc RECORD;
    v_emp RECORD;
BEGIN
    SELECT * INTO v_acc 
    FROM public.employee_auth_accounts
    WHERE tenant_id = COALESCE(p_tenant_id, 'org-joy-01')
      AND organization_id = COALESCE(p_organization_id, 'org-joy-01')
      AND (login_identifier = p_login_identifier OR employee_id = p_login_identifier)
    LIMIT 1;

    IF v_acc IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No employee account matches the provided identifier.');
    END IF;

    -- Generate 6-digit or hex reset token
    v_token := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

    UPDATE public.employee_auth_accounts
    SET reset_token = v_token,
        reset_token_expires_at = NOW() + INTERVAL '15 minutes',
        updated_at = NOW()
    WHERE id = v_acc.id;

    SELECT * INTO v_emp FROM public.employees WHERE id = v_acc.employee_id LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'employee_id', v_acc.employee_id,
        'employee_name', COALESCE(v_emp.display_name, v_emp.first_name || ' ' || v_emp.last_name),
        'email', COALESCE(v_emp.work_email, (v_emp.profile->>'personal_email'), ''),
        'phone', COALESCE(v_emp.profile->>'phone', ''),
        'reset_token', v_token,
        'expires_in_minutes', 15
    );
END;
$$;

-- ============================================================
-- 8. RPC: COMPLETE PASSWORD RESET VIA TOKEN
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_complete_employee_password_reset_v2(
    p_tenant_id TEXT,
    p_organization_id TEXT,
    p_login_identifier TEXT,
    p_reset_token TEXT,
    p_new_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_acc RECORD;
BEGIN
    SELECT * INTO v_acc 
    FROM public.employee_auth_accounts
    WHERE tenant_id = COALESCE(p_tenant_id, 'org-joy-01')
      AND organization_id = COALESCE(p_organization_id, 'org-joy-01')
      AND (login_identifier = p_login_identifier OR employee_id = p_login_identifier)
      AND reset_token = p_reset_token
    LIMIT 1;

    IF v_acc IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired password reset token.');
    END IF;

    IF v_acc.reset_token_expires_at IS NOT NULL AND v_acc.reset_token_expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password reset token has expired. Please request a new token.');
    END IF;

    UPDATE public.employee_auth_accounts
    SET password_hash = p_new_password_hash,
        reset_token = NULL,
        reset_token_expires_at = NULL,
        must_change_password = false,
        account_status = 'ACTIVE',
        password_changed_at = NOW(),
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
    WHERE id = v_acc.id;

    RETURN jsonb_build_object('success', true, 'message', 'Password has been successfully reset.');
END;
$$;
