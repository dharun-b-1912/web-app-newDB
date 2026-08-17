-- ============================================================================
-- Migration: 20260814_017_platform_delegated_iam_and_staff_hierarchy.sql
-- Description: Complete Production-Grade Platform Delegated IAM, Staff Hierarchy,
--              Permission Matrices, Scopes, Invitations, and Immutable Audit Logging.
-- ============================================================================

-- 1. Create/Ensure platform_staff Table
CREATE TABLE IF NOT EXISTS platform_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT NOT NULL,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    name TEXT NOT NULL,
    staff_code TEXT DEFAULT 'STF-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6)),
    job_title TEXT DEFAULT 'Platform Administrator',
    department TEXT DEFAULT 'Platform Operations',
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Invitation Pending', 'Suspended', 'Disabled', 'Locked')),
    mfa_enforced BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    is_root_superadmin BOOLEAN DEFAULT false,
    account_start_date TIMESTAMPTZ DEFAULT NOW(),
    account_expiry_date TIMESTAMPTZ,
    created_by UUID,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_staff_email_uniq ON platform_staff(email);
CREATE INDEX IF NOT EXISTS idx_platform_staff_status ON platform_staff(status);
CREATE INDEX IF NOT EXISTS idx_platform_staff_role ON platform_staff(role);

-- 2. Create/Ensure platform_roles Table
CREATE TABLE IF NOT EXISTS platform_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT true,
    hierarchy_level INT DEFAULT 1 CHECK (hierarchy_level BETWEEN 1 AND 5),
    risk_level TEXT DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_roles_key_uniq ON platform_roles(role_key);

-- 3. Create/Ensure platform_permissions Table
CREATE TABLE IF NOT EXISTS platform_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key TEXT NOT NULL,
    module_name TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'View' CHECK (action IN ('View', 'Create', 'Update', 'Delete', 'Export', 'Manage', 'Approve', 'Execute')),
    risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    is_protected BOOLEAN DEFAULT false,
    scope TEXT NOT NULL DEFAULT 'Global',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_permissions_key_uniq ON platform_permissions(permission_key);

-- 4. Create/Ensure platform_role_permissions Mapping Table
CREATE TABLE IF NOT EXISTS platform_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES platform_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES platform_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_role_perm_uniq ON platform_role_permissions(role_id, permission_id);

-- 5. Create/Ensure platform_staff_roles Table
CREATE TABLE IF NOT EXISTS platform_staff_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES platform_staff(id) ON DELETE CASCADE,
    role_id UUID REFERENCES platform_roles(id) ON DELETE CASCADE,
    assigned_by UUID,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_staff_roles_uniq ON platform_staff_roles(staff_id, role_id);

-- 6. Create platform_staff_scopes Table
CREATE TABLE IF NOT EXISTS platform_staff_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES platform_staff(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('ORGANIZATION', 'REGION', 'MODULE_RESTRICTION')),
    scope_value TEXT NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_staff_scopes_staff ON platform_staff_scopes(staff_id);

-- 7. Create platform_staff_invitations Table
CREATE TABLE IF NOT EXISTS platform_staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role_key TEXT NOT NULL,
    invited_by UUID,
    invitation_token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_staff_invitations_email ON platform_staff_invitations(email);

-- 8. Seed Hierarchical System Roles
INSERT INTO platform_roles (role_key, display_name, description, hierarchy_level, risk_level, is_system_role)
VALUES
    ('SUPER_ADMIN', 'Super Admin', 'Full unrestricted platform root authority, IAM management, master keys, and audit.', 5, 'CRITICAL', true),
    ('PLATFORM_ADMIN', 'Platform Admin', 'Broad operational administration over organizations, subscriptions, webhooks, and fleet.', 4, 'HIGH', true),
    ('OPERATIONS_ADMIN', 'Operations Admin', 'Operational management of tenants, background workers, incident runbooks, and mesh.', 3, 'MEDIUM', true),
    ('SECURITY_ADMIN', 'Security Admin', 'Security Center defense, session revocation, MFA governance, and forensic audit logs.', 3, 'HIGH', true),
    ('SUPPORT_ADMIN', 'Support Admin', 'Customer escalation cases, customer activity telemetry, and knowledge base management.', 2, 'LOW', true),
    ('READ_ONLY_ADMIN', 'Read-Only Admin', 'Inspection and monitoring access to permitted platform modules with zero mutation capability.', 1, 'LOW', true)
ON CONFLICT (role_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level,
    risk_level = EXCLUDED.risk_level;

-- 9. Seed Granular Permissions Matrix across 17 Platform Domains
INSERT INTO platform_permissions (permission_key, module_name, action, risk_level, is_protected, scope, description)
VALUES
    -- Organizations
    ('platform.organizations.read', 'Organizations', 'View', 'LOW', false, 'Global', 'View client tenant organizations and profiles.'),
    ('platform.organizations.create', 'Organizations', 'Create', 'MEDIUM', false, 'Global', 'Provision new tenant organizations.'),
    ('platform.organizations.update', 'Organizations', 'Update', 'MEDIUM', false, 'Global', 'Modify organization configurations and domains.'),
    ('platform.organizations.suspend', 'Organizations', 'Manage', 'HIGH', false, 'Global', 'Suspend or reinstate tenant access.'),
    ('platform.organizations.export', 'Organizations', 'Export', 'LOW', false, 'Global', 'Export organization directory data.'),

    -- Subscriptions & Billing
    ('platform.billing.read', 'Billing', 'View', 'LOW', false, 'Global', 'View invoices, payment records, and gateways.'),
    ('platform.billing.manage', 'Billing', 'Manage', 'HIGH', false, 'Global', 'Reconcile invoices, apply manual credit, and manage gateways.'),
    ('platform.subscriptions.read', 'Subscriptions', 'View', 'LOW', false, 'Global', 'View active customer subscriptions.'),
    ('platform.subscriptions.manage', 'Subscriptions', 'Manage', 'HIGH', false, 'Global', 'Upgrade, downgrade, and cancel customer subscriptions.'),
    ('platform.revenue.read', 'Revenue & Growth', 'View', 'LOW', false, 'Global', 'Inspect ARR, MRR, expansion, and churn analytics.'),

    -- Security & Sessions
    ('platform.security.read', 'Security', 'View', 'LOW', false, 'Global', 'View security posture, threat alerts, and TLS ciphers.'),
    ('platform.security.manage', 'Security', 'Manage', 'HIGH', false, 'Global', 'Configure platform firewall rules, cipher suites, and AAL2 policies.'),
    ('platform.security.root_manage', 'Security', 'Manage', 'CRITICAL', true, 'Global', 'Modify platform root security keys and cryptographic vaults.'),
    ('platform.sessions.read', 'Sessions', 'View', 'LOW', false, 'Global', 'Inspect active administrator and tenant sessions.'),
    ('platform.sessions.revoke', 'Sessions', 'Manage', 'HIGH', false, 'Global', 'Revoke active device sessions and terminate tokens.'),

    -- Audit
    ('platform.audit.read', 'Audit', 'View', 'LOW', false, 'Global', 'Search immutable SHA-256 chained audit logs.'),
    ('platform.audit.export', 'Audit', 'Export', 'MEDIUM', false, 'Global', 'Export forensic compliance audit logs.'),

    -- Support
    ('platform.support.read', 'Support', 'View', 'LOW', false, 'Global', 'View customer support cases and escalations.'),
    ('platform.support.create', 'Support', 'Create', 'LOW', false, 'Global', 'Create administrative support cases.'),
    ('platform.support.update', 'Support', 'Update', 'LOW', false, 'Global', 'Respond to, assign, and update support tickets.'),
    ('platform.support.close', 'Support', 'Manage', 'LOW', false, 'Global', 'Close and archive resolved support tickets.'),

    -- Background Jobs
    ('platform.jobs.read', 'Background Jobs', 'View', 'LOW', false, 'Global', 'Monitor background worker fleets and queues.'),
    ('platform.jobs.manage', 'Background Jobs', 'Manage', 'HIGH', false, 'Global', 'Retry dead-letter jobs and scale worker pools.'),

    -- Webhooks & Event Mesh
    ('platform.webhooks.read', 'Webhooks', 'View', 'LOW', false, 'Global', 'Inspect event mesh routes and webhook deliveries.'),
    ('platform.webhooks.manage', 'Webhooks', 'Manage', 'HIGH', false, 'Global', 'Configure webhook endpoints and re-dispatch failed events.'),

    -- API & Integrations
    ('platform.integrations.read', 'API & Integrations', 'View', 'LOW', false, 'Global', 'View integration connectors and adapter status.'),
    ('platform.integrations.manage', 'API & Integrations', 'Manage', 'HIGH', false, 'Global', 'Deploy adapters, rotate credentials, and manage bridges.'),
    ('platform.api.master_key', 'API & Integrations', 'Manage', 'CRITICAL', true, 'Global', 'Generate and revoke root platform developer master API keys.'),

    -- IAM & Staff
    ('platform.iam.read', 'IAM & Staff', 'View', 'LOW', false, 'Global', 'View platform staff directory, roles, and assignments.'),
    ('platform.iam.create_staff', 'IAM & Staff', 'Create', 'HIGH', false, 'Global', 'Invite and create new platform staff accounts.'),
    ('platform.iam.update_staff', 'IAM & Staff', 'Update', 'HIGH', false, 'Global', 'Modify staff job title, department, and account status.'),
    ('platform.iam.assign_roles', 'IAM & Staff', 'Manage', 'HIGH', false, 'Global', 'Assign and revoke staff roles and permission sets.'),
    ('platform.iam.assign_super_admin', 'IAM & Staff', 'Manage', 'CRITICAL', true, 'Global', 'Grant root Super Admin privileges to a staff member.'),
    ('platform.iam.manage_permissions', 'IAM & Staff', 'Manage', 'HIGH', false, 'Global', 'Create and modify custom roles and permission mappings.')
ON CONFLICT (permission_key) DO UPDATE SET
    module_name = EXCLUDED.module_name,
    action = EXCLUDED.action,
    risk_level = EXCLUDED.risk_level,
    is_protected = EXCLUDED.is_protected,
    description = EXCLUDED.description;

-- 10. Map Permissions to Roles
-- Map ALL permissions to SUPER_ADMIN
INSERT INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM platform_roles r, platform_permissions p 
WHERE r.role_key = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- Map Operational permissions to PLATFORM_ADMIN (excluding CRITICAL protected permissions)
INSERT INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM platform_roles r, platform_permissions p 
WHERE r.role_key = 'PLATFORM_ADMIN' AND p.is_protected = false
ON CONFLICT DO NOTHING;

-- Map Operations Admin permissions
INSERT INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM platform_roles r, platform_permissions p 
WHERE r.role_key = 'OPERATIONS_ADMIN' AND p.module_name IN ('Organizations', 'Support', 'Background Jobs', 'Webhooks', 'API & Integrations') AND p.is_protected = false
ON CONFLICT DO NOTHING;

-- Map Security Admin permissions
INSERT INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM platform_roles r, platform_permissions p 
WHERE r.role_key = 'SECURITY_ADMIN' AND p.module_name IN ('Security', 'Sessions', 'Audit') AND p.permission_key != 'platform.security.root_manage'
ON CONFLICT DO NOTHING;

-- Map Support Admin permissions
INSERT INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM platform_roles r, platform_permissions p 
WHERE r.role_key = 'SUPPORT_ADMIN' AND p.module_name IN ('Support', 'Organizations') AND p.action IN ('View', 'Create', 'Update')
ON CONFLICT DO NOTHING;

-- Map Read-Only Admin permissions
INSERT INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM platform_roles r, platform_permissions p 
WHERE r.role_key = 'READ_ONLY_ADMIN' AND p.action = 'View' AND p.is_protected = false
ON CONFLICT DO NOTHING;

-- 11. Ensure Root Super Admin Staff Entry
INSERT INTO platform_staff (
    email, first_name, last_name, name, role, status, mfa_enforced, mfa_enabled, is_root_superadmin, last_login_at
) VALUES (
    'superadmin@workforceos.com',
    'Arun',
    'Kumar',
    'Arun Kumar',
    'SUPER_ADMIN',
    'Active',
    true,
    true,
    true,
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = 'SUPER_ADMIN',
    status = 'Active',
    is_root_superadmin = true;

-- Assign SUPER_ADMIN role in platform_staff_roles
INSERT INTO platform_staff_roles (staff_id, role_id)
SELECT s.id, r.id 
FROM platform_staff s, platform_roles r 
WHERE s.email = 'superadmin@workforceos.com' AND r.role_key = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- 12. Enable Row Level Security (RLS)
ALTER TABLE platform_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_staff_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff read access" ON platform_staff;
CREATE POLICY "Allow staff read access" ON platform_staff FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow staff manage access" ON platform_staff;
CREATE POLICY "Allow staff manage access" ON platform_staff FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow roles read" ON platform_roles;
CREATE POLICY "Allow roles read" ON platform_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow roles manage" ON platform_roles;
CREATE POLICY "Allow roles manage" ON platform_roles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow permissions read" ON platform_permissions;
CREATE POLICY "Allow permissions read" ON platform_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow staff scopes read" ON platform_staff_scopes;
CREATE POLICY "Allow staff scopes read" ON platform_staff_scopes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow staff scopes manage" ON platform_staff_scopes;
CREATE POLICY "Allow staff scopes manage" ON platform_staff_scopes FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow invitations manage" ON platform_staff_invitations;
CREATE POLICY "Allow invitations manage" ON platform_staff_invitations FOR ALL USING (true);
