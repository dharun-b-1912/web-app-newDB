-- ============================================================================
-- Joy PeopleHR: Realtime Role Management & Authoritative PostgreSQL RBAC
-- 1. Create public.hr_authorizations table for dynamic HR module authorization
-- 2. Enable Row-Level Security (RLS) and real-time replication
-- 3. Update Praveen B's authoritative DB role to COMPANY_ADMIN for operational monitoring
-- ============================================================================

-- Step 1: Create hr_authorizations table if not exists
CREATE TABLE IF NOT EXISTS public.hr_authorizations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    employee_name TEXT NOT NULL,
    employee_code TEXT NOT NULL,
    work_email TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Human Resources',
    designation TEXT NOT NULL DEFAULT 'HR Executive',
    preset_name TEXT NOT NULL DEFAULT 'CUSTOM',
    is_active BOOLEAN NOT NULL DEFAULT true,
    module_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    granted_by TEXT NOT NULL DEFAULT 'Administrator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_hr_authorizations_org_email UNIQUE (organization_id, work_email)
);

-- Index for speedy realtime queries
CREATE INDEX IF NOT EXISTS idx_hr_authorizations_org_email 
    ON public.hr_authorizations (organization_id, work_email);

CREATE INDEX IF NOT EXISTS idx_hr_authorizations_company 
    ON public.hr_authorizations (company_id);

-- Step 2: Enable RLS and Tenant Policies
ALTER TABLE public.hr_authorizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "hr_authorizations_tenant_select" ON public.hr_authorizations;
    DROP POLICY IF EXISTS "hr_authorizations_tenant_all" ON public.hr_authorizations;
    DROP POLICY IF EXISTS "hr_authorizations_service_role" ON public.hr_authorizations;
END $$;

CREATE POLICY "hr_authorizations_tenant_select" ON public.hr_authorizations
    FOR SELECT TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
        OR (SELECT is_platform_admin())
    );

CREATE POLICY "hr_authorizations_tenant_all" ON public.hr_authorizations
    FOR ALL TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
        OR (SELECT is_platform_admin())
    )
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
        OR (SELECT is_platform_admin())
    );

-- Step 3: Add to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'hr_authorizations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_authorizations;
    END IF;
END $$;

-- Step 4: Authoritative Real-time Promotion of Praveen B to COMPANY_ADMIN
-- User Profile: 31723ba8-91c2-405a-afc7-0a943a697128
-- Employee: 55f486f8-e3aa-4133-9e85-dfc519ed2825
-- Role COMPANY_ADMIN: fa9b29e3-aae7-4fc2-9222-e36439f38e53
UPDATE public.user_profiles
SET 
    employee_id = '55f486f8-e3aa-4133-9e85-dfc519ed2825',
    role = 'COMPANY_ADMIN',
    status = 'ACTIVE',
    updated_at = now()
WHERE id = '31723ba8-91c2-405a-afc7-0a943a697128';

-- Update user_roles to COMPANY_ADMIN
UPDATE public.user_roles
SET 
    role_id = 'fa9b29e3-aae7-4fc2-9222-e36439f38e53'
WHERE user_profile_id = '31723ba8-91c2-405a-afc7-0a943a697128';

-- Also ensure employee record has active employment status
UPDATE public.employees
SET 
    employment_status = 'ACTIVE'
WHERE id = '55f486f8-e3aa-4133-9e85-dfc519ed2825';

-- Update auth.users metadata
UPDATE auth.users
SET 
    raw_user_meta_data = raw_user_meta_data 
        || jsonb_build_object(
            'role', 'COMPANY_ADMIN',
            'employee_id', '55f486f8-e3aa-4133-9e85-dfc519ed2825',
            'organization_id', '0c621892-e938-4707-9957-13534ea32c19',
            'require_password_change', false,
            'must_change_password', false
        )
WHERE id = '14651af0-25db-4a32-b1cd-7c9c4f976365';
