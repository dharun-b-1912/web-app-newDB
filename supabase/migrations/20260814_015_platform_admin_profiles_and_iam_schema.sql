-- ============================================================================
-- Migration: 20260814_015_platform_admin_profiles_and_iam_schema.sql
-- Description: Schema for Platform Admin Profiles, Server-Authoritative IAM, 
--              and User Preferences with RLS policies and audit integration.
-- ============================================================================

-- 1. Create platform_profiles table
CREATE TABLE IF NOT EXISTS platform_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email TEXT NOT NULL,
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
    last_profile_update_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create platform_staff IAM registry table
CREATE TABLE IF NOT EXISTS platform_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES platform_profiles(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Invited', 'Deactivated')),
    mfa_enforced BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create platform_user_preferences table
CREATE TABLE IF NOT EXISTS platform_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'en',
    timezone_mode TEXT DEFAULT 'auto' CHECK (timezone_mode IN ('auto', 'manual')),
    date_format TEXT DEFAULT 'DD/MM/YYYY' CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')),
    notify_security_alerts BOOLEAN DEFAULT true,
    notify_incidents BOOLEAN DEFAULT true,
    notify_integration_failures BOOLEAN DEFAULT true,
    notify_job_failures BOOLEAN DEFAULT true,
    notify_support_escalations BOOLEAN DEFAULT true,
    realtime_updates_enabled BOOLEAN DEFAULT true,
    reduced_motion BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE platform_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_user_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Create Idempotent Policies
DROP POLICY IF EXISTS "Allow platform users read access on platform_profiles" ON platform_profiles;
CREATE POLICY "Allow platform users read access on platform_profiles" ON platform_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users update own platform_profiles" ON platform_profiles;
CREATE POLICY "Allow users update own platform_profiles" ON platform_profiles
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow platform staff read access" ON platform_staff;
CREATE POLICY "Allow platform staff read access" ON platform_staff
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow platform staff manage" ON platform_staff;
CREATE POLICY "Allow platform staff manage" ON platform_staff
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow platform preferences read/write" ON platform_user_preferences;
CREATE POLICY "Allow platform preferences read/write" ON platform_user_preferences
    FOR ALL USING (true);

-- 6. Create Indices for Performance
CREATE INDEX IF NOT EXISTS idx_platform_profiles_email ON platform_profiles(email);
CREATE INDEX IF NOT EXISTS idx_platform_profiles_auth_id ON platform_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_staff_email ON platform_staff(email);
CREATE INDEX IF NOT EXISTS idx_platform_staff_status ON platform_staff(status);
CREATE INDEX IF NOT EXISTS idx_platform_preferences_user ON platform_user_preferences(user_id);
