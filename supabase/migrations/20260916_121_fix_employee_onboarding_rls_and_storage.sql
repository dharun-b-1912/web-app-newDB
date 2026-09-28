-- ============================================================================
-- Migration 20260916_121_fix_employee_onboarding_rls_and_storage.sql
-- Joy PeopleHR: Production Employee Onboarding RLS Harmonization
-- Allows seamless CRUD on employee onboarding relational tables (employees,
-- profiles, addresses, bank, statutory, emergency contacts, documents) for
-- authenticated & anon clients.
-- ============================================================================

-- Ensure employee_emergency_contacts table exists
CREATE TABLE IF NOT EXISTS public.employee_emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    primary_phone VARCHAR(30) NOT NULL,
    alternate_phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emp_emg_emp ON public.employee_emergency_contacts(employee_id);

-- 1. EMPLOYEES TABLE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
        EXECUTE 'ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "employees_select_policy" ON public.employees';
        EXECUTE 'DROP POLICY IF EXISTS "employees_select" ON public.employees';
        EXECUTE 'DROP POLICY IF EXISTS "employees_insert_policy" ON public.employees';
        EXECUTE 'DROP POLICY IF EXISTS "employees_update_policy" ON public.employees';
        EXECUTE 'DROP POLICY IF EXISTS "employees_delete_policy" ON public.employees';
        EXECUTE 'DROP POLICY IF EXISTS "employees_all_access" ON public.employees';
        EXECUTE 'DROP POLICY IF EXISTS "employees_tenant_access" ON public.employees';
        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_employees" ON public.employees';
        EXECUTE 'DROP POLICY IF EXISTS "employees_write_policy" ON public.employees';

        EXECUTE 'CREATE POLICY "employees_select_policy" ON public.employees FOR SELECT TO authenticated, anon USING (true)';
        EXECUTE 'CREATE POLICY "employees_write_policy" ON public.employees FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- 2. EMPLOYEE PROFILES TABLE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_profiles') THEN
        EXECUTE 'ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "employee_profiles_select" ON public.employee_profiles';
        EXECUTE 'DROP POLICY IF EXISTS "employee_profiles_insert" ON public.employee_profiles';
        EXECUTE 'DROP POLICY IF EXISTS "employee_profiles_update" ON public.employee_profiles';
        EXECUTE 'DROP POLICY IF EXISTS "employee_profiles_delete" ON public.employee_profiles';
        EXECUTE 'DROP POLICY IF EXISTS "employee_profiles_all_policy" ON public.employee_profiles';

        EXECUTE 'CREATE POLICY "employee_profiles_all_policy" ON public.employee_profiles FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- 3. EMPLOYEE ADDRESSES TABLE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_addresses') THEN
        EXECUTE 'ALTER TABLE public.employee_addresses ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "employee_addresses_select" ON public.employee_addresses';
        EXECUTE 'DROP POLICY IF EXISTS "employee_addresses_insert" ON public.employee_addresses';
        EXECUTE 'DROP POLICY IF EXISTS "employee_addresses_update" ON public.employee_addresses';
        EXECUTE 'DROP POLICY IF EXISTS "employee_addresses_delete" ON public.employee_addresses';
        EXECUTE 'DROP POLICY IF EXISTS "employee_addresses_all_policy" ON public.employee_addresses';

        EXECUTE 'CREATE POLICY "employee_addresses_all_policy" ON public.employee_addresses FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- 4. EMPLOYEE BANK DETAILS TABLE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_bank_details') THEN
        EXECUTE 'ALTER TABLE public.employee_bank_details ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "employee_bank_details_select" ON public.employee_bank_details';
        EXECUTE 'DROP POLICY IF EXISTS "employee_bank_details_insert" ON public.employee_bank_details';
        EXECUTE 'DROP POLICY IF EXISTS "employee_bank_details_update" ON public.employee_bank_details';
        EXECUTE 'DROP POLICY IF EXISTS "employee_bank_details_delete" ON public.employee_bank_details';
        EXECUTE 'DROP POLICY IF EXISTS "employee_bank_details_tenant_isolation" ON public.employee_bank_details';
        EXECUTE 'DROP POLICY IF EXISTS "employee_bank_details_all_policy" ON public.employee_bank_details';

        EXECUTE 'CREATE POLICY "employee_bank_details_all_policy" ON public.employee_bank_details FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- 5. EMPLOYEE STATUTORY DETAILS TABLE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_statutory_details') THEN
        EXECUTE 'ALTER TABLE public.employee_statutory_details ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "employee_statutory_details_select" ON public.employee_statutory_details';
        EXECUTE 'DROP POLICY IF EXISTS "employee_statutory_details_insert" ON public.employee_statutory_details';
        EXECUTE 'DROP POLICY IF EXISTS "employee_statutory_details_update" ON public.employee_statutory_details';
        EXECUTE 'DROP POLICY IF EXISTS "employee_statutory_details_delete" ON public.employee_statutory_details';
        EXECUTE 'DROP POLICY IF EXISTS "employee_statutory_details_tenant_isolation" ON public.employee_statutory_details';
        EXECUTE 'DROP POLICY IF EXISTS "employee_statutory_details_all_policy" ON public.employee_statutory_details';

        EXECUTE 'CREATE POLICY "employee_statutory_details_all_policy" ON public.employee_statutory_details FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- 6. EMPLOYEE EMERGENCY CONTACTS TABLE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_emergency_contacts') THEN
        EXECUTE 'ALTER TABLE public.employee_emergency_contacts ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "employee_emergency_contacts_select" ON public.employee_emergency_contacts';
        EXECUTE 'DROP POLICY IF EXISTS "employee_emergency_contacts_insert" ON public.employee_emergency_contacts';
        EXECUTE 'DROP POLICY IF EXISTS "employee_emergency_contacts_update" ON public.employee_emergency_contacts';
        EXECUTE 'DROP POLICY IF EXISTS "employee_emergency_contacts_delete" ON public.employee_emergency_contacts';
        EXECUTE 'DROP POLICY IF EXISTS "employee_emergency_contacts_all_policy" ON public.employee_emergency_contacts';

        EXECUTE 'CREATE POLICY "employee_emergency_contacts_all_policy" ON public.employee_emergency_contacts FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- 7. EMPLOYEE DOCUMENTS TABLE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_documents') THEN
        EXECUTE 'ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "employee_documents_select" ON public.employee_documents';
        EXECUTE 'DROP POLICY IF EXISTS "employee_documents_insert" ON public.employee_documents';
        EXECUTE 'DROP POLICY IF EXISTS "employee_documents_update" ON public.employee_documents';
        EXECUTE 'DROP POLICY IF EXISTS "employee_documents_delete" ON public.employee_documents';
        EXECUTE 'DROP POLICY IF EXISTS "employee_documents_all_policy" ON public.employee_documents';

        EXECUTE 'CREATE POLICY "employee_documents_all_policy" ON public.employee_documents FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)';
    END IF;
END $$;
