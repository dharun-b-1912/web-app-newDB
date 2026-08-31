-- ============================================================================
-- Migration: 20260829_072_fix_structure_rls_and_provision_defaults.sql
-- Description: Fix RLS policies for companies, departments, designations, branches,
--              and provision default structure for organizations.
-- ============================================================================

-- 1. Ensure RLS policies on structural tables allow proper access
DO $$
BEGIN
    -- companies
    ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "companies_isolation" ON public.companies;
    DROP POLICY IF EXISTS "companies_all_access" ON public.companies;
    CREATE POLICY "companies_all_access" ON public.companies
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- departments
    ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "departments_isolation" ON public.departments;
    DROP POLICY IF EXISTS "departments_all_access" ON public.departments;
    CREATE POLICY "departments_all_access" ON public.departments
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- designations
    ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "designations_isolation" ON public.designations;
    DROP POLICY IF EXISTS "designations_all_access" ON public.designations;
    CREATE POLICY "designations_all_access" ON public.designations
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- branches
    ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "branches_isolation" ON public.branches;
    DROP POLICY IF EXISTS "branches_all_access" ON public.branches;
    CREATE POLICY "branches_all_access" ON public.branches
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- locations
    ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "locations_isolation" ON public.locations;
    DROP POLICY IF EXISTS "locations_all_access" ON public.locations;
    CREATE POLICY "locations_all_access" ON public.locations
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- app_users
    ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "users_isolation" ON public.app_users;
    DROP POLICY IF EXISTS "app_users_all_access" ON public.app_users;
    CREATE POLICY "app_users_all_access" ON public.app_users
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

    -- organizations
    ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "org_isolation" ON public.organizations;
    DROP POLICY IF EXISTS "organizations_all_access" ON public.organizations;
    CREATE POLICY "organizations_all_access" ON public.organizations
        FOR ALL TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);

EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Grant permissions to all roles
GRANT ALL ON public.companies TO anon, authenticated, service_role;
GRANT ALL ON public.departments TO anon, authenticated, service_role;
GRANT ALL ON public.designations TO anon, authenticated, service_role;
GRANT ALL ON public.branches TO anon, authenticated, service_role;
GRANT ALL ON public.locations TO anon, authenticated, service_role;
GRANT ALL ON public.app_users TO anon, authenticated, service_role;
GRANT ALL ON public.organizations TO anon, authenticated, service_role;

-- 3. Provision Default Structure for any organization without a company
DO $$
DECLARE
    r RECORD;
    v_comp_id TEXT;
    v_dept_id TEXT;
    v_desig_id TEXT;
    v_branch_id TEXT;
BEGIN
    FOR r IN SELECT id, legal_name, display_name, country, city FROM public.organizations LOOP
        v_comp_id := 'comp-' || REPLACE(r.id, 'org-', '');
        
        -- Insert Company if missing
        IF NOT EXISTS (SELECT 1 FROM public.companies WHERE organization_id = r.id) THEN
            INSERT INTO public.companies (
                id, organization_id, legal_name, trade_name, country, city, created_at
            ) VALUES (
                v_comp_id, r.id, COALESCE(r.legal_name, r.display_name, 'Joy Corporate Solutions Pvt Ltd'),
                COALESCE(r.display_name, 'Joy Corporate India'), COALESCE(r.country, 'India'),
                COALESCE(r.city, 'Coimbatore'), NOW()
            ) ON CONFLICT (id) DO NOTHING;
        ELSE
            SELECT id INTO v_comp_id FROM public.companies WHERE organization_id = r.id LIMIT 1;
        END IF;

        -- Insert Default Branch if missing
        v_branch_id := 'br-' || REPLACE(v_comp_id, 'comp-', '') || '-hq';
        IF NOT EXISTS (SELECT 1 FROM public.branches WHERE company_id = v_comp_id) THEN
            INSERT INTO public.branches (
                id, company_id, name, code, city, state, timezone, created_at
            ) VALUES (
                v_branch_id, v_comp_id, 'Coimbatore Headquarters', 'HQ', COALESCE(r.city, 'Coimbatore'), 'Tamil Nadu', 'Asia/Kolkata', NOW()
            ) ON CONFLICT (id) DO NOTHING;
        END IF;

        -- Insert Default Department if missing
        v_dept_id := 'dept-' || REPLACE(v_comp_id, 'comp-', '') || '-eng';
        IF NOT EXISTS (SELECT 1 FROM public.departments WHERE company_id = v_comp_id) THEN
            INSERT INTO public.departments (
                id, company_id, name, code, employee_count
            ) VALUES (
                v_dept_id, v_comp_id, 'Engineering & Technology', 'ENG', 0
            ) ON CONFLICT (id) DO NOTHING;
        END IF;

        -- Insert Default Designation if missing
        v_desig_id := 'desig-' || REPLACE(v_comp_id, 'comp-', '') || '-se';
        IF NOT EXISTS (SELECT 1 FROM public.designations WHERE company_id = v_comp_id) THEN
            INSERT INTO public.designations (
                id, company_id, title, code, grade
            ) VALUES (
                v_desig_id, v_comp_id, 'Software Engineer', 'SE', 'L2'
            ) ON CONFLICT (id) DO NOTHING;
        END IF;
    END LOOP;
END $$;
