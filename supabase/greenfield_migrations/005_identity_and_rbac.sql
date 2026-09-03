-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 005
-- Target Project: ysiajemrqakfngasehhi
-- Description: Identity and Access Management (User Profiles & RBAC)
-- ============================================================================

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID, -- Foreign key linked post employee table creation
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    avatar_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'LOCKED', 'DEACTIVATED')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_profiles_auth_org UNIQUE (auth_user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON public.user_profiles(organization_id);

-- 2. Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    hierarchy_level INTEGER NOT NULL DEFAULT 5,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_roles_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_roles_org ON public.roles(organization_id);

-- 3. System Permissions Catalog
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);

-- 4. Role Permissions Mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    scope_level VARCHAR(32) NOT NULL DEFAULT 'COMPANY' CHECK (scope_level IN ('COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM', 'SELF')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_perm UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_perm_org ON public.role_permissions(organization_id);

-- 5. User Roles Mapping
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_roles UNIQUE (user_profile_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_org ON public.user_roles(organization_id);
