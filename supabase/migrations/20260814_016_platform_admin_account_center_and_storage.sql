-- ============================================================================
-- Migration: 20260814_016_platform_admin_account_center_and_storage.sql
-- Description: Dedicated Platform Admin Account Center, Supabase Storage
--              bucket for high-res avatar assets, IAM RBAC tables, and profile records.
-- ============================================================================

-- 1. Create Supabase Storage Bucket for Platform Avatars (if not exists)
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'platform-avatars',
        'platform-avatars',
        true,
        5242880, -- 5MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    )
    ON CONFLICT (id) DO UPDATE SET
        public = true,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Storage Bucket Policies for platform-avatars
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Access for Platform Avatars" ON storage.objects;
    CREATE POLICY "Public Read Access for Platform Avatars"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'platform-avatars');

    DROP POLICY IF EXISTS "Authenticated Users Upload Platform Avatars" ON storage.objects;
    CREATE POLICY "Authenticated Users Upload Platform Avatars"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'platform-avatars');

    DROP POLICY IF EXISTS "Authenticated Users Update Platform Avatars" ON storage.objects;
    CREATE POLICY "Authenticated Users Update Platform Avatars"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'platform-avatars');

    DROP POLICY IF EXISTS "Authenticated Users Delete Platform Avatars" ON storage.objects;
    CREATE POLICY "Authenticated Users Delete Platform Avatars"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'platform-avatars');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Ensure platform_profiles table exists and has unique email constraint
CREATE TABLE IF NOT EXISTS platform_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID,
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

-- Ensure unique index on platform_profiles(email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_profiles_email_unique ON platform_profiles(email);

-- 4. Ensure platform_staff exists and has unique index on email
CREATE TABLE IF NOT EXISTS platform_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    status TEXT NOT NULL DEFAULT 'Active',
    mfa_enforced BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_staff_email_unique ON platform_staff(email);

-- 5. Create Platform IAM Tables
CREATE TABLE IF NOT EXISTS platform_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT true,
    hierarchy_level INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_roles_key_unique ON platform_roles(role_key);

CREATE TABLE IF NOT EXISTS platform_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key TEXT NOT NULL,
    module_name TEXT NOT NULL,
    scope TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_permissions_key_unique ON platform_permissions(permission_key);

CREATE TABLE IF NOT EXISTS platform_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES platform_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES platform_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_role_perm_unique ON platform_role_permissions(role_id, permission_id);

CREATE TABLE IF NOT EXISTS platform_staff_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES platform_staff(id) ON DELETE CASCADE,
    role_id UUID REFERENCES platform_roles(id) ON DELETE CASCADE,
    assigned_by UUID,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_staff_roles_unique ON platform_staff_roles(staff_id, role_id);

-- 6. Seed Super Admin Roles
INSERT INTO platform_roles (role_key, display_name, description, hierarchy_level)
VALUES 
    ('SUPER_ADMIN', 'Platform Super Admin', 'Full unrestricted root authority across all platform subsystems', 5),
    ('PLATFORM_ADMIN', 'Platform Administrator', 'Operations, support, and tenant lifecycle administration', 4),
    ('SECURITY_ADMIN', 'Security & Compliance Officer', 'MFA governance, session revocation, and forensic audit logging', 3),
    ('BILLING_ADMIN', 'Billing & Revenue Manager', 'SaaS subscriptions, invoices, payment gateways, and tiers', 3)
ON CONFLICT (role_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- 7. Insert Default Super Admin Profile
INSERT INTO platform_profiles (
    email, first_name, last_name, display_name, job_title, department, phone, timezone, locale, is_primary_email_verified
) VALUES (
    'superadmin@workforceos.com',
    'Arun',
    'Kumar',
    'Arun Kumar',
    'Chief Platform Architect & Super Admin',
    'Executive & Infrastructure',
    '+91 98765 43210',
    'Asia/Kolkata (IST)',
    'en-US',
    true
)
ON CONFLICT (email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    job_title = EXCLUDED.job_title,
    department = EXCLUDED.department,
    phone = EXCLUDED.phone;

-- 8. Insert Default Staff Record
INSERT INTO platform_staff (
    email, name, role, status, mfa_enforced, mfa_enabled, last_login_at
) VALUES (
    'superadmin@workforceos.com',
    'Arun Kumar',
    'SUPER_ADMIN',
    'Active',
    true,
    true,
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    mfa_enforced = EXCLUDED.mfa_enforced;

-- 9. Enable Row Level Security (RLS)
ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_staff_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on platform_roles" ON platform_roles;
CREATE POLICY "Allow public read on platform_roles" ON platform_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on platform_permissions" ON platform_permissions;
CREATE POLICY "Allow public read on platform_permissions" ON platform_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on platform_role_permissions" ON platform_role_permissions;
CREATE POLICY "Allow public read on platform_role_permissions" ON platform_role_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on platform_staff_roles" ON platform_staff_roles;
CREATE POLICY "Allow public read on platform_staff_roles" ON platform_staff_roles FOR SELECT USING (true);
