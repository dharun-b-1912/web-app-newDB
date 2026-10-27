-- Migration: 20261026_165_super_admin_platform_staff_and_sessions_sync.sql
-- Description: Authoritative Supabase Synchronization for Platform Super Admin Workspace:
--              1. Canonical platform_staff, platform_profiles, platform_sessions tables
--              2. platform_users compatibility view/table
--              3. Security-hardened RLS policies for Platform Staff & Session control
--              4. Root Super Admin provisioning without client-side mock data

-- ============================================================================
-- 1. Ensure platform_profiles Table Exists
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    display_name TEXT NOT NULL,
    job_title TEXT DEFAULT 'Platform Administrator',
    department TEXT DEFAULT 'Executive & Infrastructure',
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    timezone TEXT DEFAULT 'Asia/Kolkata (IST)',
    locale TEXT DEFAULT 'en-US',
    is_primary_email_verified BOOLEAN DEFAULT true,
    last_profile_update_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_profiles_email ON public.platform_profiles(email);
CREATE INDEX IF NOT EXISTS idx_platform_profiles_auth_id ON public.platform_profiles(auth_user_id);

-- ============================================================================
-- 2. Ensure platform_staff Table Exists with All Fields
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.platform_profiles(id) ON DELETE SET NULL,
    auth_user_id UUID,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Invited', 'Invitation Pending', 'Disabled', 'Deactivated')),
    department TEXT DEFAULT 'Platform Operations',
    job_title TEXT DEFAULT 'Platform Administrator',
    staff_code TEXT,
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    mfa_enforced BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add any missing columns idempotently
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_staff' AND column_name = 'department') THEN
        ALTER TABLE public.platform_staff ADD COLUMN department TEXT DEFAULT 'Platform Operations';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_staff' AND column_name = 'job_title') THEN
        ALTER TABLE public.platform_staff ADD COLUMN job_title TEXT DEFAULT 'Platform Administrator';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_staff' AND column_name = 'staff_code') THEN
        ALTER TABLE public.platform_staff ADD COLUMN staff_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_staff' AND column_name = 'phone') THEN
        ALTER TABLE public.platform_staff ADD COLUMN phone TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_staff' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.platform_staff ADD COLUMN avatar_url TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_staff' AND column_name = 'auth_user_id') THEN
        ALTER TABLE public.platform_staff ADD COLUMN auth_user_id UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_platform_staff_email ON public.platform_staff(email);
CREATE INDEX IF NOT EXISTS idx_platform_staff_role ON public.platform_staff(role);
CREATE INDEX IF NOT EXISTS idx_platform_staff_status ON public.platform_staff(status);

-- ============================================================================
-- 3. Ensure platform_users Compatibility Table / View Exists
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure auth_user_id is nullable for pre-activation platform users
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'platform_users' 
          AND column_name = 'auth_user_id' 
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.platform_users ALTER COLUMN auth_user_id DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'platform_profiles' 
          AND column_name = 'auth_user_id' 
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.platform_profiles ALTER COLUMN auth_user_id DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'platform_staff' 
          AND column_name = 'auth_user_id' 
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.platform_staff ALTER COLUMN auth_user_id DROP NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_platform_users_email ON public.platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_role ON public.platform_users(role);

-- ============================================================================
-- 4. Ensure platform_sessions Table Exists
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_session_id TEXT,
    user_id UUID,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_avatar TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'global',
    tenant_name TEXT NOT NULL DEFAULT 'Global Platform',
    role_id TEXT NOT NULL DEFAULT 'super_admin',
    role_name TEXT NOT NULL DEFAULT 'Super Admin',
    session_status TEXT NOT NULL DEFAULT 'Active' CHECK (session_status IN ('Active', 'Idle', 'Expired', 'Revoked', 'Terminated', 'Unknown')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    revocation_reason TEXT,
    ip_masked TEXT DEFAULT '127.0.0.1',
    country TEXT DEFAULT 'India',
    region TEXT DEFAULT 'Tamil Nadu',
    city TEXT DEFAULT 'Coimbatore',
    device_id TEXT NOT NULL DEFAULT 'dev-default',
    device_name TEXT DEFAULT 'Desktop Workstation',
    device_type TEXT DEFAULT 'Desktop' CHECK (device_type IN ('Desktop', 'Mobile', 'Tablet')),
    os_name TEXT DEFAULT 'Windows',
    browser_name TEXT DEFAULT 'Chrome',
    auth_method TEXT NOT NULL DEFAULT 'MFA',
    mfa_verified BOOLEAN DEFAULT true,
    is_privileged BOOLEAN DEFAULT true,
    risk_level TEXT NOT NULL DEFAULT 'Low' CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical', 'Unknown')),
    risk_score INTEGER NOT NULL DEFAULT 0,
    first_seen_device BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_sessions_status ON public.platform_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_user_email ON public.platform_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_last_activity ON public.platform_sessions(last_activity_at DESC);

-- ============================================================================
-- 5. Row Level Security Policies (RLS)
-- ============================================================================
ALTER TABLE public.platform_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sessions ENABLE ROW LEVEL SECURITY;

-- 5.1 platform_profiles
DROP POLICY IF EXISTS "platform_profiles_auth_read" ON public.platform_profiles;
CREATE POLICY "platform_profiles_auth_read" ON public.platform_profiles
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "platform_profiles_auth_manage" ON public.platform_profiles;
CREATE POLICY "platform_profiles_auth_manage" ON public.platform_profiles
    FOR ALL TO authenticated
    USING (
        auth.uid() = auth_user_id
        OR public.is_platform_admin()
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        auth.uid() = auth_user_id
        OR public.is_platform_admin()
        OR auth.role() = 'service_role'
    );

-- 5.2 platform_staff
DROP POLICY IF EXISTS "platform_staff_auth_read" ON public.platform_staff;
CREATE POLICY "platform_staff_auth_read" ON public.platform_staff
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "platform_staff_auth_manage" ON public.platform_staff;
CREATE POLICY "platform_staff_auth_manage" ON public.platform_staff
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        public.is_platform_admin()
        OR auth.role() = 'service_role'
    );

-- 5.3 platform_users
DROP POLICY IF EXISTS "platform_users_auth_read" ON public.platform_users;
CREATE POLICY "platform_users_auth_read" ON public.platform_users
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "platform_users_auth_manage" ON public.platform_users;
CREATE POLICY "platform_users_auth_manage" ON public.platform_users
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        public.is_platform_admin()
        OR auth.role() = 'service_role'
    );

-- 5.4 platform_sessions
DROP POLICY IF EXISTS "platform_sessions_auth_read" ON public.platform_sessions;
CREATE POLICY "platform_sessions_auth_read" ON public.platform_sessions
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "platform_sessions_auth_manage" ON public.platform_sessions;
CREATE POLICY "platform_sessions_auth_manage" ON public.platform_sessions
    FOR ALL TO authenticated
    USING (
        user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR public.is_platform_admin()
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR public.is_platform_admin()
        OR auth.role() = 'service_role'
    );

-- ============================================================================
-- 6. Provision Root Super Admin Record in Database if Empty
-- ============================================================================
DO $$
DECLARE
    v_admin_email TEXT := 'superadmin@joypeoplehr.com';
    v_profile_id UUID;
    v_auth_user_id UUID;
BEGIN
    -- Check if auth user exists in auth.users
    SELECT id INTO v_auth_user_id FROM auth.users WHERE email = v_admin_email LIMIT 1;
    
    -- If no auth.users record yet, check if there is an existing auth_user_id in platform tables or generate a valid UUID
    IF v_auth_user_id IS NULL THEN
        SELECT auth_user_id INTO v_auth_user_id FROM public.platform_users WHERE auth_user_id IS NOT NULL LIMIT 1;
        IF v_auth_user_id IS NULL THEN
            v_auth_user_id := gen_random_uuid();
        END IF;
    END IF;

    -- Check if super admin profile exists
    SELECT id INTO v_profile_id FROM public.platform_profiles WHERE email = v_admin_email LIMIT 1;
    
    IF v_profile_id IS NULL THEN
        INSERT INTO public.platform_profiles (
            auth_user_id, email, first_name, last_name, display_name, job_title, department, timezone, locale
        ) VALUES (
            v_auth_user_id, v_admin_email, 'System', 'SuperAdmin', 'Platform Super Admin',
            'Chief Platform Architect & Super Admin', 'Platform Core & Infrastructure',
            'Asia/Kolkata (IST)', 'en-US'
        )
        RETURNING id INTO v_profile_id;
    END IF;

    -- Ensure platform_staff entry exists
    IF NOT EXISTS (SELECT 1 FROM public.platform_staff WHERE email = v_admin_email) THEN
        INSERT INTO public.platform_staff (
            user_id, auth_user_id, email, name, role, status, department, job_title, staff_code, mfa_enforced, mfa_enabled
        ) VALUES (
            v_profile_id, v_auth_user_id, v_admin_email, 'Platform Super Admin', 'SUPER_ADMIN', 'Active',
            'Platform Operations', 'Chief Platform Architect & Super Admin', 'STF-ROOT01', true, true
        );
    END IF;

    -- Ensure platform_users entry exists with non-null auth_user_id
    IF NOT EXISTS (SELECT 1 FROM public.platform_users WHERE email = v_admin_email) THEN
        INSERT INTO public.platform_users (
            auth_user_id, email, full_name, role, is_active
        ) VALUES (
            v_auth_user_id, v_admin_email, 'Platform Super Admin', 'SUPER_ADMIN', true
        );
    END IF;
END $$;
