-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 006
-- Target Project: ysiajemrqakfngasehhi
-- Description: Core Workforce and Normalized Employee Model
-- ============================================================================

-- 1. Employees Master
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    designation_id UUID NOT NULL REFERENCES public.designations(id) ON DELETE RESTRICT,
    reporting_manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    work_email VARCHAR(255) NOT NULL,
    personal_email VARCHAR(255),
    phone VARCHAR(30),
    gender VARCHAR(20) CHECK (gender IN ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY')),
    dob DATE,
    doj DATE NOT NULL,
    confirmation_date DATE,
    employment_type public.employment_type_enum NOT NULL DEFAULT 'FULL_TIME',
    employment_status public.employment_status_enum NOT NULL DEFAULT 'ACTIVE',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_employees_org_code UNIQUE (organization_id, employee_code),
    CONSTRAINT uq_employees_org_work_email UNIQUE (organization_id, work_email)
);

CREATE INDEX IF NOT EXISTS idx_employees_org_status ON public.employees(organization_id, employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON public.employees(reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_comp ON public.employees(company_id);

-- Link head of department and user profile employee_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        ALTER TABLE public.departments 
        DROP CONSTRAINT IF EXISTS fk_departments_head_employee,
        ADD CONSTRAINT fk_departments_head_employee FOREIGN KEY (head_employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        ALTER TABLE public.user_profiles 
        DROP CONSTRAINT IF EXISTS fk_user_profiles_employee,
        ADD CONSTRAINT fk_user_profiles_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Extended Employee Profiles
CREATE TABLE IF NOT EXISTS public.employee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
    marital_status VARCHAR(20),
    blood_group VARCHAR(10),
    nationality VARCHAR(50) DEFAULT 'Indian',
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(30),
    emergency_contact_relationship VARCHAR(50),
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_profiles_emp ON public.employee_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_profiles_org ON public.employee_profiles(organization_id);

-- 3. Employee Addresses
CREATE TABLE IF NOT EXISTS public.employee_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('PRESENT', 'PERMANENT')),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'India',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_emp_addr_type UNIQUE (employee_id, address_type)
);

CREATE INDEX IF NOT EXISTS idx_emp_addr_org ON public.employee_addresses(organization_id);

-- 4. Employee Bank Details
CREATE TABLE IF NOT EXISTS public.employee_bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
    account_holder_name VARCHAR(150) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    branch_name VARCHAR(100),
    account_type VARCHAR(20) NOT NULL DEFAULT 'SAVINGS' CHECK (account_type IN ('SAVINGS', 'CURRENT', 'SALARY')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_bank_org ON public.employee_bank_details(organization_id);

-- 5. Employee Statutory Details
CREATE TABLE IF NOT EXISTS public.employee_statutory_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
    pan_number VARCHAR(20),
    aadhaar_number VARCHAR(20),
    uan_number VARCHAR(30),
    pf_number VARCHAR(50),
    esi_number VARCHAR(50),
    is_pf_eligible BOOLEAN NOT NULL DEFAULT true,
    is_esi_eligible BOOLEAN NOT NULL DEFAULT true,
    is_pt_eligible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_statutory_org ON public.employee_statutory_details(organization_id);
