-- ============================================================================
-- Migration: 20260817_021_platform_auth_and_staff_roles.sql
-- Description: Server-authoritative Platform Staff IAM, Root Super Admin 
--              (THIRUMALAI R K), Role synchronization triggers, and RLS policies.
-- ============================================================================

-- 1. Ensure platform_profiles schema exists and has all columns
CREATE TABLE IF NOT EXISTS platform_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    display_name TEXT NOT NULL,
    job_title TEXT DEFAULT 'Chief Platform Architect & Super Admin',
    department TEXT DEFAULT 'Platform Core & Infrastructure',
    phone TEXT DEFAULT '+91 9384125278',
    avatar_url TEXT DEFAULT '',
    timezone TEXT DEFAULT 'Asia/Kolkata (IST, UTC+05:30)',
    locale TEXT DEFAULT 'en-US',
    is_primary_email_verified BOOLEAN DEFAULT true,
    last_profile_update_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure platform_roles table exists
CREATE TABLE IF NOT EXISTS platform_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT true,
    hierarchy_level INTEGER DEFAULT 3,
    risk_level TEXT DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure platform_staff table exists
CREATE TABLE IF NOT EXISTS platform_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES platform_profiles(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    name TEXT NOT NULL,
    staff_code TEXT UNIQUE,
    job_title TEXT DEFAULT 'Platform Administrator',
    department TEXT DEFAULT 'Platform Operations',
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'ASSISTANT_ADMIN',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Invitation Pending', 'Suspended', 'Disabled', 'Locked')),
    mfa_enforced BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    is_root_superadmin BOOLEAN DEFAULT false,
    account_start_date TIMESTAMPTZ DEFAULT NOW(),
    account_expiry_date TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Seed Platform System Roles
INSERT INTO platform_roles (role_key, display_name, description, is_system_role, hierarchy_level, risk_level)
VALUES
    ('SUPER_ADMIN', 'Super Admin', 'Unrestricted platform root access across all tenants, billing, infrastructure, and settings.', true, 4, 'CRITICAL'),
    ('ASSISTANT_ADMIN', 'Assistant Admin', 'Delegated operations, tenant health monitoring, customer workspace support, and triage.', true, 3, 'MEDIUM'),
    ('BILLING_ADMIN', 'Billing Admin', 'Commercial invoicing, GST calculations, settlements, credit notes, and financial audits.', true, 2, 'HIGH'),
    ('SECURITY_ADMIN', 'Security Officer', 'Security posture, active session revocation, MFA governance, and forensic audit logs.', true, 3, 'HIGH')
ON CONFLICT (role_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    risk_level = EXCLUDED.risk_level,
    updated_at = NOW();

-- 5. Seed / Upsert Root Super Admin (THIRUMALAI R K)
INSERT INTO platform_profiles (
    email,
    first_name,
    last_name,
    display_name,
    job_title,
    department,
    phone,
    timezone,
    is_primary_email_verified
) VALUES (
    'superadmin@workforceos.com',
    'THIRUMALAI',
    'R K',
    'THIRUMALAI R K',
    'Chief Platform Architect & Super Admin',
    'Platform Core & Infrastructure',
    '+91 9384125278',
    'Asia/Kolkata (IST, UTC+05:30)',
    true
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    display_name = EXCLUDED.display_name,
    job_title = EXCLUDED.job_title,
    department = EXCLUDED.department,
    phone = EXCLUDED.phone,
    timezone = EXCLUDED.timezone,
    updated_at = NOW();

-- 6. Upsert Platform Staff Record for THIRUMALAI R K
INSERT INTO platform_staff (
    email,
    first_name,
    last_name,
    name,
    staff_code,
    job_title,
    department,
    phone,
    role,
    status,
    mfa_enforced,
    mfa_enabled,
    is_root_superadmin
) VALUES (
    'superadmin@workforceos.com',
    'THIRUMALAI',
    'R K',
    'THIRUMALAI R K',
    'STF-0001',
    'Chief Platform Architect & Super Admin',
    'Platform Core & Infrastructure',
    '+91 9384125278',
    'SUPER_ADMIN',
    'Active',
    true,
    true,
    true
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    name = EXCLUDED.name,
    job_title = EXCLUDED.job_title,
    department = EXCLUDED.department,
    phone = EXCLUDED.phone,
    role = 'SUPER_ADMIN',
    status = 'Active',
    is_root_superadmin = true,
    updated_at = NOW();

-- 7. Upsert Assistant Admin, Billing Admin, and Security Officer
INSERT INTO platform_staff (
    email, first_name, last_name, name, staff_code, job_title, department, phone, role, status, mfa_enforced
) VALUES 
    ('assistant.admin@workforceos.com', 'Karthik', 'Natarajan', 'Karthik Natarajan', 'STF-0002', 'Assistant Operations Lead', 'Platform Operations', '+91 98765 00002', 'ASSISTANT_ADMIN', 'Active', true),
    ('finance@workforceos.com', 'Pooja', 'Agarwal', 'Pooja Agarwal', 'STF-0003', 'FinOps & Billing Lead', 'Finance & Commercials', '+91 98765 00003', 'BILLING_ADMIN', 'Active', true),
    ('security@workforceos.com', 'Vikram', 'Sethi', 'Vikram Sethi', 'STF-0004', 'Security & Compliance Officer', 'InfoSec & Audit', '+91 98765 00004', 'SECURITY_ADMIN', 'Active', true)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    job_title = EXCLUDED.job_title,
    role = EXCLUDED.role,
    status = 'Active',
    updated_at = NOW();

-- 8. Enable RLS and idempotent policies
ALTER TABLE platform_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow platform read access on profiles" ON platform_profiles;
CREATE POLICY "Allow platform read access on profiles" ON platform_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow platform write access on profiles" ON platform_profiles;
CREATE POLICY "Allow platform write access on profiles" ON platform_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow platform read access on staff" ON platform_staff;
CREATE POLICY "Allow platform read access on staff" ON platform_staff FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow platform write access on staff" ON platform_staff;
CREATE POLICY "Allow platform write access on staff" ON platform_staff FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow platform read access on roles" ON platform_roles;
CREATE POLICY "Allow platform read access on roles" ON platform_roles FOR SELECT USING (true);

-- 9. Create Indexes
CREATE INDEX IF NOT EXISTS idx_platform_profiles_email_lcase ON platform_profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_platform_staff_email_lcase ON platform_staff(lower(email));
CREATE INDEX IF NOT EXISTS idx_platform_staff_role ON platform_staff(role);
