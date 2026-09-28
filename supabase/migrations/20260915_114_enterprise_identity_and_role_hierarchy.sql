-- supabase/migrations/20260915_114_enterprise_identity_and_role_hierarchy.sql
-- ============================================================================
-- Joy PeopleHR — Enterprise Identity, Organization Onboarding & Role Hierarchy
-- Fully reconciled with existing Supabase schema (permissions.code, roles, etc.)
-- ============================================================================

-- 1. Ensure user_profiles table structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID UNIQUE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id     UUID,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  status          TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED', 'DEACTIVATED')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_uid ON public.user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON public.user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 2. Ensure organization_memberships table
CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id         UUID,
  role_code       TEXT NOT NULL DEFAULT 'EMPLOYEE',
  status          TEXT NOT NULL DEFAULT 'Invited' CHECK (status IN ('Active', 'Invited', 'Suspended', 'Revoked', 'Deactivated')),
  is_default      BOOLEAN DEFAULT TRUE,
  invited_at      TIMESTAMPTZ DEFAULT NOW(),
  activated_at    TIMESTAMPTZ,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON public.organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON public.organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_status ON public.organization_memberships(status);

-- 3. Align existing permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL,
  module      TEXT NOT NULL,
  action      TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS description TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);

-- Seed core enterprise permissions using code (with backwards-compatible key and name)
INSERT INTO public.permissions (code, key, name, module, action, description) VALUES
  ('organization.manage', 'organization.manage', 'Manage Organization', 'organization', 'manage', 'Full organization settings, branches, and entity configuration'),
  ('user.invite', 'user.invite', 'Invite Users', 'access', 'invite', 'Ability to invite organization users, HR staff, and managers'),
  ('user.suspend', 'user.suspend', 'Suspend Users', 'access', 'suspend', 'Ability to suspend or revoke user organization access'),
  ('employee.view', 'employee.view', 'View Employees', 'employee', 'view', 'View employee directory and profiles'),
  ('employee.create', 'employee.create', 'Create Employees', 'employee', 'create', 'Onboard new employee records into the HR database'),
  ('employee.edit', 'employee.edit', 'Edit Employees', 'employee', 'edit', 'Update employee job, statutory, and personal details'),
  ('employee.delete', 'employee.delete', 'Delete Employees', 'employee', 'delete', 'Offboard or archive employee records'),
  ('employee.invite', 'employee.invite', 'Manage Portal Access', 'employee', 'invite', 'Send, resend, or revoke employee portal invitations'),
  ('attendance.view', 'attendance.view', 'View Attendance', 'attendance', 'view', 'View organization attendance, logs, and biometrics'),
  ('attendance.manage', 'attendance.manage', 'Manage Attendance', 'attendance', 'manage', 'Regularize, edit rosters, and configure biometric devices'),
  ('leave.view', 'leave.view', 'View Leave', 'leave', 'view', 'View employee leave balances and history'),
  ('leave.manage', 'leave.manage', 'Manage Leave', 'leave', 'manage', 'Approve/reject leave requests and configure policies'),
  ('payroll.view', 'payroll.view', 'View Payroll', 'payroll', 'view', 'View payroll runs, salary slips, and statutory breakdowns'),
  ('payroll.manage', 'payroll.manage', 'Manage Payroll', 'payroll', 'manage', 'Execute payroll cycles, process salary updates, and manage tax'),
  ('vendor.view', 'vendor.view', 'View Vendors', 'vendor', 'view', 'View contractor vendors and workforce agreements'),
  ('vendor.create', 'vendor.create', 'Create Vendors', 'vendor', 'create', 'Onboard vendor organizations and agency contracts'),
  ('vendor.edit', 'vendor.edit', 'Edit Vendors', 'vendor', 'edit', 'Update vendor details and contractor assignments'),
  ('vendor.invite', 'vendor.invite', 'Invite Vendor Users', 'vendor', 'invite', 'Create and dispatch vendor portal invitations'),
  ('documents.view', 'documents.view', 'View Documents', 'documents', 'view', 'Access organization and employee documents'),
  ('documents.manage', 'documents.manage', 'Manage Documents', 'documents', 'manage', 'Upload, sign, and manage enterprise policy documents'),
  ('self.attendance', 'self.attendance', 'Self Attendance', 'ess', 'view', 'Clock in/out, view own punches, and submit regularization'),
  ('self.leave', 'self.leave', 'Self Leave', 'ess', 'view', 'Apply for leave and view own leave balances'),
  ('self.payslip', 'self.payslip', 'Self Payslip', 'ess', 'view', 'View and download personal salary slips'),
  ('vendor.portal', 'vendor.portal', 'Vendor Portal Access', 'vendor_portal', 'view', 'Access contractor workforce roster, compliance, and attendance')
ON CONFLICT (code) DO UPDATE SET 
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  name = EXCLUDED.name,
  key = EXCLUDED.key;

-- 4. Align existing roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_org_code ON public.roles(organization_id, code);

-- 5. Align existing role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_unique ON public.role_permissions(role_id, permission_id);

-- 6. Ensure organization_invitations table
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  role_code       TEXT NOT NULL,
  target_id       UUID,
  target_type     TEXT DEFAULT 'USER' CHECK (target_type IN ('USER', 'EMPLOYEE', 'VENDOR')),
  token           TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'EMAIL_SENT', 'EMAIL_DELIVERED', 'ACTIVATED', 'EXPIRED', 'REVOKED')),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  invited_by      UUID,
  activated_at    TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org_email ON public.organization_invitations(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.organization_invitations(status);

-- 7. Ensure audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id        UUID,
  actor_name      TEXT,
  actor_role      TEXT,
  action          TEXT NOT NULL,
  target_email    TEXT,
  target_user_id  UUID,
  role            TEXT,
  status          TEXT DEFAULT 'SUCCESS',
  ip_address      TEXT,
  user_agent      TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 8. Seed system roles procedure
CREATE OR REPLACE FUNCTION public.seed_organization_system_roles(target_org_id UUID)
RETURNS VOID AS $$
DECLARE
  v_admin_role_id UUID;
  v_hr_head_role_id UUID;
  v_finance_head_role_id UUID;
  v_hr_user_role_id UUID;
  v_employee_role_id UUID;
  v_vendor_admin_role_id UUID;
  v_vendor_user_role_id UUID;
BEGIN
  -- 1. ORGANIZATION_ADMIN
  INSERT INTO public.roles (organization_id, code, name, description, is_system)
  VALUES (target_org_id, 'ORGANIZATION_ADMIN', 'Organization Administrator', 'Full administrative authority over organization settings, privileged roles, and workflows', TRUE)
  ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_admin_role_id;

  -- 2. HR_HEAD
  INSERT INTO public.roles (organization_id, code, name, description, is_system)
  VALUES (target_org_id, 'HR_HEAD', 'Head of Human Resources', 'Full authority over employee directory, portal invitations, attendance, and leave', TRUE)
  ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_hr_head_role_id;

  -- 3. FINANCE_HEAD
  INSERT INTO public.roles (organization_id, code, name, description, is_system)
  VALUES (target_org_id, 'FINANCE_HEAD', 'Head of Finance & Payroll', 'Authority over payroll runs, statutory compliance, and salary records. Isolated from HR administration.', TRUE)
  ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_finance_head_role_id;

  -- 4. HR_USER
  INSERT INTO public.roles (organization_id, code, name, description, is_system)
  VALUES (target_org_id, 'HR_USER', 'HR Operations Specialist', 'Operational access to employee records, attendance monitoring, and leave management', TRUE)
  ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_hr_user_role_id;

  -- 5. EMPLOYEE
  INSERT INTO public.roles (organization_id, code, name, description, is_system)
  VALUES (target_org_id, 'EMPLOYEE', 'Employee (Self-Service)', 'Self-service ESS access to personal attendance, punches, leave requests, and payslips', TRUE)
  ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_employee_role_id;

  -- 6. VENDOR_ADMIN
  INSERT INTO public.roles (organization_id, code, name, description, is_system)
  VALUES (target_org_id, 'VENDOR_ADMIN', 'Vendor Administrator', 'Dedicated vendor portal access for contractor attendance, workforce, and invoices', TRUE)
  ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_vendor_admin_role_id;

  -- 7. VENDOR_USER
  INSERT INTO public.roles (organization_id, code, name, description, is_system)
  VALUES (target_org_id, 'VENDOR_USER', 'Vendor Workforce User', 'Read-only access to vendor contractor workforce and attendance records', TRUE)
  ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_vendor_user_role_id;

  -- Map standard permissions:
  -- ORGANIZATION_ADMIN: All permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, p.id FROM public.permissions p
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- HR_HEAD: All employee, attendance, leave, vendor, documents permissions, plus user.invite
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_hr_head_role_id, p.id FROM public.permissions p
  WHERE p.module IN ('employee', 'attendance', 'leave', 'vendor', 'documents')
     OR p.code IN ('user.invite', 'self.attendance', 'self.leave', 'self.payslip')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- FINANCE_HEAD: All payroll permissions, documents.view, self permissions (ISOLATED from employee.create/edit, attendance.manage, vendor.create)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_finance_head_role_id, p.id FROM public.permissions p
  WHERE p.module IN ('payroll')
     OR p.code IN ('documents.view', 'employee.view', 'self.attendance', 'self.leave', 'self.payslip')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- HR_USER: employee.view, employee.create, employee.edit, attendance.view, attendance.manage, leave.view, leave.manage, documents.view
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_hr_user_role_id, p.id FROM public.permissions p
  WHERE p.code IN ('employee.view', 'employee.create', 'employee.edit', 'attendance.view', 'attendance.manage', 'leave.view', 'leave.manage', 'documents.view', 'self.attendance', 'self.leave', 'self.payslip')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- EMPLOYEE: self.attendance, self.leave, self.payslip
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_employee_role_id, p.id FROM public.permissions p
  WHERE p.code IN ('self.attendance', 'self.leave', 'self.payslip')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- VENDOR_ADMIN: vendor.portal
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_vendor_admin_role_id, p.id FROM public.permissions p
  WHERE p.code = 'vendor.portal'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- VENDOR_USER: vendor.portal
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_vendor_user_role_id, p.id FROM public.permissions p
  WHERE p.code = 'vendor.portal'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Row-Level Security (RLS) Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active profiles in their own organization
DROP POLICY IF EXISTS "Users can view active profiles in same organization" ON public.user_profiles;
CREATE POLICY "Users can view active profiles in same organization"
ON public.user_profiles FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE (om.user_id = auth.uid() OR om.user_id = (SELECT up.id FROM public.user_profiles up WHERE up.auth_user_id = auth.uid()))
      AND om.status = 'Active'
  )
);

-- Organization Memberships: view own or if Org Admin / HR Head in same org
DROP POLICY IF EXISTS "Users can view memberships in same organization" ON public.organization_memberships;
CREATE POLICY "Users can view memberships in same organization"
ON public.organization_memberships FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR user_id = (SELECT up.id FROM public.user_profiles up WHERE up.auth_user_id = auth.uid())
  OR organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE (om.user_id = auth.uid() OR om.user_id = (SELECT up.id FROM public.user_profiles up WHERE up.auth_user_id = auth.uid()))
      AND om.status = 'Active'
      AND om.role_code IN ('ORGANIZATION_ADMIN', 'COMPANY_ADMIN', 'HR_HEAD')
  )
);

-- Permissions: All authenticated users can read permissions catalog
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.permissions;
CREATE POLICY "Authenticated users can read permissions"
ON public.permissions FOR SELECT TO authenticated
USING (true);

-- Roles: Users can read system roles and roles for their organization
DROP POLICY IF EXISTS "Users can read roles for their organization" ON public.roles;
CREATE POLICY "Users can read roles for their organization"
ON public.roles FOR SELECT TO authenticated
USING (
  organization_id IS NULL OR
  organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE (om.user_id = auth.uid() OR om.user_id = (SELECT up.id FROM public.user_profiles up WHERE up.auth_user_id = auth.uid()))
      AND om.status = 'Active'
  )
);

-- Invitations: Org Admins and HR Heads can view invitations
DROP POLICY IF EXISTS "Admins can view invitations in their organization" ON public.organization_invitations;
CREATE POLICY "Admins can view invitations in their organization"
ON public.organization_invitations FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE (om.user_id = auth.uid() OR om.user_id = (SELECT up.id FROM public.user_profiles up WHERE up.auth_user_id = auth.uid()))
      AND om.status = 'Active'
      AND om.role_code IN ('ORGANIZATION_ADMIN', 'COMPANY_ADMIN', 'HR_HEAD')
  )
);
