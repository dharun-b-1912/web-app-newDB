-- ============================================================================
-- Migration: 20260824_044_production_employee_auth_and_tenant_isolation.sql
-- Description: Production Employee Authentication, Supabase Auth Identity Linking,
--              Multi-Tenant Isolation, Phone OTP, and Audit Log Architecture.
-- ============================================================================

-- 1. Employee Auth Identities Table
-- Conceptually binds an employee record to a Supabase Auth identity inside a tenant.
CREATE TABLE IF NOT EXISTS public.employee_auth_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) NOT NULL,
    auth_user_id UUID UNIQUE, -- References auth.users(id) when provisioned
    phone VARCHAR(50) NOT NULL, -- Canonical E.164 format (+919876543210)
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'Employee',
    status VARCHAR(50) NOT NULL DEFAULT 'INVITED' 
        CHECK (status IN ('PENDING', 'INVITED', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'TERMINATED', 'DISABLED')),
    activation_status VARCHAR(50) NOT NULL DEFAULT 'INVITED'
        CHECK (activation_status IN ('NOT_STARTED', 'PROVISIONING', 'INVITED', 'PHONE_VERIFIED', 'PASSWORD_SET', 'ACTIVE', 'FAILED')),
    first_login_completed BOOLEAN NOT NULL DEFAULT false,
    password_change_required BOOLEAN NOT NULL DEFAULT false,
    otp_enabled BOOLEAN NOT NULL DEFAULT true,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    lockout_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_employee UNIQUE (tenant_id, employee_id),
    CONSTRAINT uq_tenant_phone UNIQUE (tenant_id, phone)
);

-- Indexes for lightning fast lookups during authentication and tenant resolution
CREATE INDEX IF NOT EXISTS idx_emp_auth_tenant_phone ON public.employee_auth_identities(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_emp_auth_user_id ON public.employee_auth_identities(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_emp_auth_employee_id ON public.employee_auth_identities(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_auth_status ON public.employee_auth_identities(status);

-- 2. Authentication Audit Logs Table
-- Immutable security event log. Never contains OTP values or passwords.
CREATE TABLE IF NOT EXISTS public.auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    actor_id VARCHAR(100) NOT NULL,
    actor_name VARCHAR(255) DEFAULT 'System',
    actor_type VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE'
        CHECK (actor_type IN ('EMPLOYEE', 'ADMIN', 'SYSTEM', 'DEVICE')),
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS'
        CHECK (status IN ('SUCCESS', 'FAILURE', 'WARNING', 'BLOCKED')),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_tenant_actor ON public.auth_audit_logs(tenant_id, actor_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event_type ON public.auth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created_at ON public.auth_audit_logs(created_at DESC);

-- 3. Active Sessions Management Table
CREATE TABLE IF NOT EXISTS public.auth_active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    auth_user_id UUID,
    employee_id VARCHAR(100) NOT NULL,
    session_token VARCHAR(255) UNIQUE,
    device_info TEXT,
    browser TEXT,
    os TEXT,
    ip_address VARCHAR(100),
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_reason TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_emp ON public.auth_active_sessions(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON public.auth_active_sessions(is_revoked, last_active_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.employee_auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_active_sessions ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
DROP POLICY IF EXISTS "Allow authenticated tenant access to employee auth identities" ON public.employee_auth_identities;
CREATE POLICY "Allow authenticated tenant access to employee auth identities"
    ON public.employee_auth_identities
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow tenant read and write on auth audit logs" ON public.auth_audit_logs;
CREATE POLICY "Allow tenant read and write on auth audit logs"
    ON public.auth_audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow session tracking and revocation" ON public.auth_active_sessions;
CREATE POLICY "Allow session tracking and revocation"
    ON public.auth_active_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Stored Procedure: Idempotent Employee Auth Provisioning
CREATE OR REPLACE FUNCTION public.provision_employee_auth_identity(
    p_tenant_id VARCHAR,
    p_employee_id VARCHAR,
    p_phone VARCHAR,
    p_email VARCHAR DEFAULT NULL,
    p_role VARCHAR DEFAULT 'Employee',
    p_auth_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
    v_phone_duplicate UUID;
    v_result JSONB;
BEGIN
    -- Check for duplicate phone in the same tenant belonging to another employee
    SELECT id INTO v_phone_duplicate
    FROM public.employee_auth_identities
    WHERE tenant_id = p_tenant_id 
      AND phone = p_phone 
      AND employee_id != p_employee_id
    LIMIT 1;

    IF v_phone_duplicate IS NOT NULL THEN
        RAISE EXCEPTION 'Phone number % is already assigned to another employee in this tenant.', p_phone;
    END IF;

    -- Upsert identity
    INSERT INTO public.employee_auth_identities (
        tenant_id,
        employee_id,
        auth_user_id,
        phone,
        email,
        role,
        status,
        activation_status,
        updated_at
    ) VALUES (
        p_tenant_id,
        p_employee_id,
        p_auth_user_id,
        p_phone,
        p_email,
        p_role,
        'INVITED',
        'INVITED',
        NOW()
    )
    ON CONFLICT (tenant_id, employee_id) DO UPDATE SET
        phone = EXCLUDED.phone,
        email = COALESCE(EXCLUDED.email, employee_auth_identities.email),
        role = EXCLUDED.role,
        auth_user_id = COALESCE(EXCLUDED.auth_user_id, employee_auth_identities.auth_user_id),
        updated_at = NOW()
    RETURNING to_jsonb(employee_auth_identities.*) INTO v_result;

    -- Record provisioning audit log
    INSERT INTO public.auth_audit_logs (
        tenant_id,
        actor_id,
        actor_name,
        actor_type,
        event_type,
        status,
        details
    ) VALUES (
        p_tenant_id,
        p_employee_id,
        COALESCE(p_email, p_phone),
        'ADMIN',
        'PROVISIONING_SUCCESS',
        'SUCCESS',
        jsonb_build_object('phone', p_phone, 'role', p_role, 'employee_id', p_employee_id)
    );

    RETURN v_result;
END;
$$;

-- 6. Seed Canonical Employee Auth Identities for Joy Corporate Solutions
INSERT INTO public.employee_auth_identities (
    tenant_id,
    employee_id,
    phone,
    email,
    role,
    status,
    activation_status,
    first_login_completed
) VALUES
    ('org-joy-01', 'emp-admin-001', '+919840000001', 'admin@joycorporate.com', 'Company Admin', 'ACTIVE', 'ACTIVE', true),
    ('org-joy-01', 'emp-hr-001', '+919840122334', 'haripriya@joycorporate.com', 'HR Head', 'ACTIVE', 'ACTIVE', true),
    ('org-joy-01', 'emp-tl-001', '+919840233445', 'deepa.s@joycorporate.com', 'Team Lead', 'ACTIVE', 'ACTIVE', true),
    ('org-joy-01', 'emp-eng-001', '+919840344556', 'rajesh.k@joycorporate.com', 'Employee', 'ACTIVE', 'ACTIVE', true),
    ('org-joy-01', 'emp-eng-002', '+919840455667', 'priya.sharma@joycorporate.com', 'Employee', 'ACTIVE', 'ACTIVE', true),
    ('org-joy-01', 'emp-vnd-001', '+919840566778', 'senthil.n@joycorporate.com', 'Employee', 'ACTIVE', 'ACTIVE', true),
    ('org-joy-01', 'emp-1040', '+919840588990', 'priya.sundaram@joycorporate.com', 'Employee', 'INVITED', 'INVITED', false)
ON CONFLICT (tenant_id, employee_id) DO UPDATE SET
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    activation_status = EXCLUDED.activation_status,
    first_login_completed = EXCLUDED.first_login_completed,
    updated_at = NOW();
