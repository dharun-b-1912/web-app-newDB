-- ============================================================================
-- JOY PeopleHR — COMPLETE GREENFIELD CANONICAL DATABASE SCRIPT
-- Target Project: ysiajemrqakfngasehhi
-- Total Canonical Tables: 65 Tables across 18 Functional Domains
-- Description: Consolidated, zero-dependency, single-transaction deployment script.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- SECTION 2: ENUMS & DOMAIN TYPES
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_status_enum') THEN
        CREATE TYPE public.org_status_enum AS ENUM ('ACTIVE', 'ONBOARDING', 'SUSPENDED', 'INACTIVE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status_enum') THEN
        CREATE TYPE public.employment_status_enum AS ENUM ('ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'SUSPENDED', 'TERMINATED', 'RESIGNED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type_enum') THEN
        CREATE TYPE public.employment_type_enum AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
        CREATE TYPE public.attendance_status_enum AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'WEEKLY_OFF', 'HOLIDAY', 'MISSED_PUNCH');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status_enum') THEN
        CREATE TYPE public.leave_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_status_enum') THEN
        CREATE TYPE public.payroll_status_enum AS ENUM ('DRAFT', 'CALCULATED', 'VERIFIED', 'APPROVED', 'DISBURSED', 'LOCKED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
        CREATE TYPE public.subscription_status_enum AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: PLATFORM CONTROL PLANE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN' CHECK (role IN ('SUPER_ADMIN', 'BILLING_ADMIN', 'SUPPORT_LEAD', 'SECURITY_OFFICER')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_users_auth ON public.platform_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON public.platform_users(email);

CREATE TABLE IF NOT EXISTS public.platform_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (billing_interval IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
    base_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    price_per_employee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    max_employees INTEGER NOT NULL DEFAULT 100,
    feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_plans_code ON public.platform_plans(code);

-- ============================================================================
-- SECTION 4: ORGANIZATIONS & CORPORATE HIERARCHY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    organization_code VARCHAR(32) NOT NULL UNIQUE,
    industry VARCHAR(100),
    country VARCHAR(10) NOT NULL DEFAULT 'IN',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    logo_url TEXT,
    website_url TEXT,
    status public.org_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orgs_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_orgs_code ON public.organizations(organization_code);

CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.platform_plans(id),
    status public.subscription_status_enum NOT NULL DEFAULT 'TRIAL',
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    max_employees_allowed INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_subs_org ON public.saas_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_saas_subs_status ON public.saas_subscriptions(status);

CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bg_jobs_status_sched ON public.background_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_org ON public.background_jobs(organization_id);

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    legal_name VARCHAR(200) NOT NULL,
    trade_name VARCHAR(150),
    company_code VARCHAR(32) NOT NULL,
    cin_number VARCHAR(50),
    pan_number VARCHAR(20),
    gstin VARCHAR(30),
    registered_address TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(10) NOT NULL DEFAULT 'IN',
    is_headquarters BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_companies_org_code UNIQUE (organization_id, company_code)
);

CREATE INDEX IF NOT EXISTS idx_companies_org ON public.companies(organization_id);

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    branch_code VARCHAR(32) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(10) NOT NULL DEFAULT 'IN',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_branches_org_code UNIQUE (organization_id, branch_code)
);

CREATE INDEX IF NOT EXISTS idx_branches_org_comp ON public.branches(organization_id, company_id);

CREATE TABLE IF NOT EXISTS public.work_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    address_line1 TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    geofence_radius_meters INTEGER NOT NULL DEFAULT 100,
    is_geofencing_enabled BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_loc_org ON public.work_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_loc_branch ON public.work_locations(branch_id);

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    parent_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(32) NOT NULL,
    head_employee_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_departments_org_code UNIQUE (organization_id, company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments(organization_id);

CREATE TABLE IF NOT EXISTS public.designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    code VARCHAR(32) NOT NULL,
    grade VARCHAR(32),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_designations_org_code UNIQUE (organization_id, company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_designations_org ON public.designations(organization_id);

-- ============================================================================
-- SECTION 5: IAM, USERS & ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID,
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

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);

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

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_roles UNIQUE (user_profile_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_org ON public.user_roles(organization_id);

-- ============================================================================
-- SECTION 6: WORKFORCE & EMPLOYEES CORE
-- ============================================================================
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
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS fk_departments_head_employee, ADD CONSTRAINT fk_departments_head_employee FOREIGN KEY (head_employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS fk_user_profiles_employee, ADD CONSTRAINT fk_user_profiles_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;

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

-- ============================================================================
-- SECTION 7: LIFECYCLE, SHIFTS, ATTENDANCE & LEAVE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employee_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
    stage VARCHAR(32) NOT NULL DEFAULT 'PRE_JOINING' CHECK (stage IN ('PRE_JOINING', 'DOCUMENT_SUBMISSION', 'HR_VERIFICATION', 'COMPLETED')),
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    target_completion_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_onboarding_org ON public.employee_onboarding(organization_id);

CREATE TABLE IF NOT EXISTS public.employee_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('JOINING', 'PROBATION_CONFIRMATION', 'PROMOTION', 'TRANSFER', 'SALARY_REVISION', 'RESIGNATION', 'TERMINATION')),
    effective_date DATE NOT NULL,
    previous_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    remarks TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_events_emp_date ON public.employee_lifecycle_events(employee_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_emp_events_org ON public.employee_lifecycle_events(organization_id);

CREATE TABLE IF NOT EXISTS public.employee_separations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    resignation_date DATE NOT NULL,
    requested_last_working_day DATE NOT NULL,
    approved_last_working_day DATE,
    reason_category VARCHAR(100) NOT NULL,
    reason_notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXIT_CLEARANCE_IN_PROGRESS', 'SETTLED')),
    exit_interview_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_separations_org ON public.employee_separations(organization_id, status);

CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(32) NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    grace_entry_minutes INTEGER NOT NULL DEFAULT 15,
    grace_exit_minutes INTEGER NOT NULL DEFAULT 15,
    min_half_day_hours NUMERIC(4, 2) NOT NULL DEFAULT 4.00,
    min_full_day_hours NUMERIC(4, 2) NOT NULL DEFAULT 8.00,
    is_overnight BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_shifts_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shifts_org ON public.shifts(organization_id);

CREATE TABLE IF NOT EXISTS public.employee_shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    valid_from DATE NOT NULL,
    valid_to DATE,
    weekly_offs INTEGER[] NOT NULL DEFAULT '{0, 6}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_shifts_emp_valid ON public.employee_shift_assignments(employee_id, valid_from);
CREATE INDEX IF NOT EXISTS idx_emp_shifts_org ON public.employee_shift_assignments(organization_id);

CREATE TABLE IF NOT EXISTS public.biometric_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    port INTEGER NOT NULL DEFAULT 4370,
    protocol VARCHAR(20) NOT NULL DEFAULT 'TCP' CHECK (protocol IN ('TCP', 'UDP', 'HTTP', 'CLOUD')),
    direction VARCHAR(20) NOT NULL DEFAULT 'BOTH' CHECK (direction IN ('IN', 'OUT', 'BOTH')),
    last_heartbeat_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bio_devices_org_serial UNIQUE (organization_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_bio_devices_org ON public.biometric_devices(organization_id);

CREATE TABLE IF NOT EXISTS public.attendance_punches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.biometric_devices(id) ON DELETE SET NULL,
    punch_time TIMESTAMPTZ NOT NULL,
    punch_type VARCHAR(20) NOT NULL DEFAULT 'CHECK_IN' CHECK (punch_type IN ('CHECK_IN', 'CHECK_OUT', 'AUTO')),
    verification_mode VARCHAR(32) NOT NULL DEFAULT 'BIOMETRIC' CHECK (verification_mode IN ('BIOMETRIC', 'FACE', 'GPS', 'CARD', 'MANUAL')),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    is_processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_punches_org_time ON public.attendance_punches(organization_id, punch_time);
CREATE INDEX IF NOT EXISTS idx_punches_emp_time ON public.attendance_punches(employee_id, punch_time);

CREATE TABLE IF NOT EXISTS public.attendance_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    first_check_in TIMESTAMPTZ,
    last_check_out TIMESTAMPTZ,
    total_work_minutes INTEGER NOT NULL DEFAULT 0,
    break_minutes INTEGER NOT NULL DEFAULT 0,
    overtime_minutes INTEGER NOT NULL DEFAULT 0,
    late_entry_minutes INTEGER NOT NULL DEFAULT 0,
    early_exit_minutes INTEGER NOT NULL DEFAULT 0,
    status public.attendance_status_enum NOT NULL DEFAULT 'PRESENT',
    payable_status NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (payable_status IN (1.00, 0.50, 0.00)),
    is_regularized BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attendance_emp_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_org_date ON public.attendance_daily(organization_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance_daily(employee_id, attendance_date);

CREATE TABLE IF NOT EXISTS public.attendance_regularizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    requested_check_in TIMESTAMPTZ,
    requested_check_out TIMESTAMPTZ,
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regularizations_emp ON public.attendance_regularizations(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_regularizations_org_status ON public.attendance_regularizations(organization_id, status);

CREATE TABLE IF NOT EXISTS public.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(32) NOT NULL,
    annual_quota NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    accrual_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (accrual_frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'NONE')),
    is_carry_forward_allowed BOOLEAN NOT NULL DEFAULT true,
    max_carry_forward_days NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    is_encashable BOOLEAN NOT NULL DEFAULT false,
    is_paid BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_leave_types_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_leave_types_org ON public.leave_types(organization_id);

CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
    calendar_year INTEGER NOT NULL,
    opening_balance NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    accrued NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    consumed NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    closing_balance NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_leave_bal_emp_year UNIQUE (employee_id, leave_type_id, calendar_year)
);

CREATE INDEX IF NOT EXISTS idx_leave_bal_org ON public.leave_balances(organization_id);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4, 2) NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT false,
    reason TEXT NOT NULL,
    status public.leave_status_enum NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_req_emp ON public.leave_requests(employee_id, start_date);
CREATE INDEX IF NOT EXISTS idx_leave_req_org_status ON public.leave_requests(organization_id, status);

CREATE TABLE IF NOT EXISTS public.leave_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
    leave_request_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL,
    entry_type VARCHAR(32) NOT NULL CHECK (entry_type IN ('ACCRUAL', 'CONSUMPTION', 'ADJUSTMENT', 'CARRY_FORWARD', 'ENCASHMENT', 'LAPSE')),
    units NUMERIC(5, 2) NOT NULL,
    running_balance_after NUMERIC(6, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_ledger_emp ON public.leave_ledger_entries(employee_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_leave_ledger_org ON public.leave_ledger_entries(organization_id);

CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    holiday_date DATE NOT NULL,
    is_restricted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holidays_org_date ON public.holidays(organization_id, holiday_date);

-- ============================================================================
-- SECTION 8: APPROVALS & PAYROLL
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_appr_wf_org_module UNIQUE (organization_id, module)
);

CREATE INDEX IF NOT EXISTS idx_appr_wf_org ON public.approval_workflows(organization_id);

CREATE TABLE IF NOT EXISTS public.approval_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id UUID NOT NULL,
    requester_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    current_step_order INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appr_inst_target ON public.approval_instances(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_appr_inst_org ON public.approval_instances(organization_id);

CREATE TABLE IF NOT EXISTS public.approval_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    approval_instance_id UUID NOT NULL REFERENCES public.approval_instances(id) ON DELETE CASCADE,
    actor_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    action VARCHAR(32) NOT NULL CHECK (action IN ('APPROVE', 'REJECT', 'DELEGATE', 'REQUEST_INFO')),
    comments TEXT,
    action_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appr_actions_inst ON public.approval_actions(approval_instance_id);
CREATE INDEX IF NOT EXISTS idx_appr_actions_org ON public.approval_actions(organization_id);

CREATE TABLE IF NOT EXISTS public.salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('EARNING', 'DEDUCTION', 'REIMBURSEMENT', 'STATUTORY_EMPLOYER')),
    calculation_type VARCHAR(20) NOT NULL DEFAULT 'FLAT' CHECK (calculation_type IN ('FLAT', 'PERCENTAGE', 'FORMULA')),
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    is_statutory BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_salary_comp_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_salary_comp_org ON public.salary_components(organization_id);

CREATE TABLE IF NOT EXISTS public.salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_salary_struc_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_salary_struc_org ON public.salary_structures(organization_id);

CREATE TABLE IF NOT EXISTS public.salary_structure_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE CASCADE,
    salary_component_id UUID NOT NULL REFERENCES public.salary_components(id) ON DELETE CASCADE,
    value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    formula_expression TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT uq_struc_comp UNIQUE (salary_structure_id, salary_component_id)
);

CREATE INDEX IF NOT EXISTS idx_struc_comp_org ON public.salary_structure_components(organization_id);

CREATE TABLE IF NOT EXISTS public.employee_salary_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id),
    annual_ctc NUMERIC(15, 2) NOT NULL,
    monthly_gross NUMERIC(15, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_salary_assign ON public.employee_salary_assignments(employee_id, effective_from);
CREATE INDEX IF NOT EXISTS idx_emp_salary_org ON public.employee_salary_assignments(organization_id);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    total_employees INTEGER NOT NULL DEFAULT 0,
    total_gross_pay NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_net_pay NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status public.payroll_status_enum NOT NULL DEFAULT 'DRAFT',
    processed_by UUID REFERENCES public.user_profiles(id),
    approved_by UUID REFERENCES public.user_profiles(id),
    disbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payroll_runs_comp_period UNIQUE (company_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON public.payroll_runs(organization_id);

CREATE TABLE IF NOT EXISTS public.payroll_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    total_working_days NUMERIC(4, 2) NOT NULL,
    payable_days NUMERIC(4, 2) NOT NULL,
    lop_days NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    gross_earnings NUMERIC(15, 2) NOT NULL,
    total_deductions NUMERIC(15, 2) NOT NULL,
    net_pay NUMERIC(15, 2) NOT NULL,
    earnings_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    deductions_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    statutory_employer_contributions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payroll_line_emp UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_line_emp ON public.payroll_line_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_line_org ON public.payroll_line_items(organization_id);

CREATE TABLE IF NOT EXISTS public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    payroll_line_item_id UUID NOT NULL UNIQUE REFERENCES public.payroll_line_items(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    payslip_number VARCHAR(50) NOT NULL UNIQUE,
    storage_path TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payslips_emp ON public.payslips(employee_id, is_published);
CREATE INDEX IF NOT EXISTS idx_payslips_org ON public.payslips(organization_id);

-- ============================================================================
-- SECTION 9: VENDORS, PERFORMANCE, LMS, DOCUMENTS, REQUESTS, ASSETS, RECRUITMENT, AUDIT & MESH
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    legal_name VARCHAR(200) NOT NULL,
    vendor_code VARCHAR(50) NOT NULL,
    pan_number VARCHAR(20),
    gstin VARCHAR(30),
    labour_license_number VARCHAR(50),
    contact_person VARCHAR(150),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(30),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'TERMINATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_vendors_org_code UNIQUE (organization_id, vendor_code)
);

CREATE INDEX IF NOT EXISTS idx_vendors_org ON public.vendors(organization_id);

CREATE TABLE IF NOT EXISTS public.vendor_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    worker_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    aadhaar_number VARCHAR(20),
    deployed_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    deployed_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    daily_wage_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_vendor_workers_code UNIQUE (vendor_id, worker_code)
);

CREATE INDEX IF NOT EXISTS idx_vendor_workers_org ON public.vendor_workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_workers_vendor ON public.vendor_workers(vendor_id);

CREATE TABLE IF NOT EXISTS public.vendor_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    total_workers INTEGER NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_AUDIT', 'APPROVED', 'PAID', 'REJECTED')),
    document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_vendor_inv_org_num UNIQUE (organization_id, vendor_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_vendor_inv_org ON public.vendor_invoices(organization_id);

CREATE TABLE IF NOT EXISTS public.performance_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'IN_REVIEW', 'COMPLETED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_cycles_org ON public.performance_cycles(organization_id);

CREATE TABLE IF NOT EXISTS public.performance_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    metric_type VARCHAR(32) NOT NULL DEFAULT 'PERCENTAGE' CHECK (metric_type IN ('PERCENTAGE', 'NUMERIC', 'MILESTONE', 'CURRENCY')),
    target_value NUMERIC(15, 2) NOT NULL DEFAULT 100.00,
    current_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    weightage INTEGER NOT NULL DEFAULT 20,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_goals_emp ON public.performance_goals(employee_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_perf_goals_org ON public.performance_goals(organization_id);

CREATE TABLE IF NOT EXISTS public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    reviewer_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    self_rating NUMERIC(3, 2),
    manager_rating NUMERIC(3, 2),
    final_normalized_score NUMERIC(3, 2),
    talent_matrix_box VARCHAR(50),
    feedback_summary TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'FINALIZED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_perf_review_cycle_emp UNIQUE (cycle_id, employee_id, reviewer_employee_id)
);

CREATE INDEX IF NOT EXISTS idx_perf_reviews_org ON public.performance_reviews(organization_id);

CREATE TABLE IF NOT EXISTS public.lms_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT false,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_lms_courses_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_lms_courses_org ON public.lms_courses(organization_id);

CREATE TABLE IF NOT EXISTS public.lms_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    score NUMERIC(5, 2),
    status VARCHAR(32) NOT NULL DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    certificate_url TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_lms_enroll UNIQUE (course_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_enroll_emp ON public.lms_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_lms_enroll_org ON public.lms_enrollments(organization_id);

CREATE TABLE IF NOT EXISTS public.document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_mandatory_for_onboarding BOOLEAN NOT NULL DEFAULT true,
    requires_verification BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_doc_types_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_doc_types_org ON public.document_types(organization_id);

CREATE TABLE IF NOT EXISTS public.employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES public.document_types(id),
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_docs_emp ON public.employee_documents(employee_id, document_type_id);
CREATE INDEX IF NOT EXISTS idx_emp_docs_org ON public.employee_documents(organization_id);

CREATE TABLE IF NOT EXISTS public.employee_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_requests_org_status ON public.employee_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_emp_requests_emp ON public.employee_requests(employee_id);

CREATE TABLE IF NOT EXISTS public.posh_and_grievance_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    case_number VARCHAR(50) NOT NULL UNIQUE,
    complainant_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    respondent_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    incident_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'UNDER_INVESTIGATION',
    presiding_officer_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    findings_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posh_org ON public.posh_and_grievance_cases(organization_id);

CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    asset_code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('HARDWARE', 'SOFTWARE_LICENSE', 'FURNITURE', 'VEHICLE', 'KEY_CARD')),
    serial_number VARCHAR(100),
    purchase_date DATE,
    purchase_cost NUMERIC(15, 2),
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_assets_org_code UNIQUE (organization_id, asset_code)
);

CREATE INDEX IF NOT EXISTS idx_assets_org ON public.assets(organization_id);

CREATE TABLE IF NOT EXISTS public.asset_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    returned_date DATE,
    condition_on_assignment TEXT,
    condition_on_return TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_assign_emp ON public.asset_assignments(employee_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assign_org ON public.asset_assignments(organization_id);

CREATE TABLE IF NOT EXISTS public.job_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    requisition_code VARCHAR(50) NOT NULL,
    vacancies_count INTEGER NOT NULL DEFAULT 1,
    experience_years_required NUMERIC(3, 1),
    job_description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_job_openings_org_code UNIQUE (organization_id, requisition_code)
);

CREATE INDEX IF NOT EXISTS idx_job_openings_org ON public.job_openings(organization_id);

CREATE TABLE IF NOT EXISTS public.job_applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    job_opening_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
    candidate_name VARCHAR(150) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    candidate_phone VARCHAR(30),
    resume_url TEXT,
    stage VARCHAR(32) NOT NULL DEFAULT 'APPLIED' CHECK (stage IN ('APPLIED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'OFFER_EXTENDED', 'HIRED', 'REJECTED')),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applicants_job_stage ON public.job_applicants(job_opening_id, stage);
CREATE INDEX IF NOT EXISTS idx_applicants_org ON public.job_applicants(organization_id);

CREATE TABLE IF NOT EXISTS public.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP' CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_sent BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifs_user_unread ON public.notification_events(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifs_org_sent ON public.notification_events(organization_id, is_sent);

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    secret_key VARCHAR(255) NOT NULL,
    subscribed_events TEXT[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON public.webhook_endpoints(organization_id);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    webhook_endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status_code INTEGER,
    response_body TEXT,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliv_endpoint ON public.webhook_deliveries(webhook_endpoint_id, delivered_at);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_created ON public.audit_logs(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);

-- ============================================================================
-- SECTION 10: FUNCTIONS, TRIGGERS & RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_org_id', true), '')::UUID,
    (NULLIF(auth.jwt() ->> 'organization_id', ''))::UUID,
    (SELECT organization_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_active_user_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'is_platform_admin')::BOOLEAN,
    EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND is_active = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger across all target mutable tables
DO $$
DECLARE
    t text;
    mutable_tables text[] := ARRAY[
        'platform_users', 'platform_plans', 'saas_subscriptions',
        'organizations', 'companies', 'branches', 'work_locations', 'departments', 'designations',
        'user_profiles', 'roles',
        'employees', 'employee_profiles', 'employee_addresses', 'employee_bank_details', 'employee_statutory_details',
        'employee_onboarding', 'employee_separations',
        'biometric_devices', 'attendance_daily', 'attendance_regularizations',
        'shifts',
        'leave_types', 'leave_balances', 'leave_requests',
        'approval_workflows', 'approval_instances',
        'salary_components', 'salary_structures', 'employee_salary_assignments', 'payroll_runs',
        'vendors', 'vendor_workers', 'vendor_invoices',
        'performance_goals', 'performance_reviews',
        'employee_documents',
        'employee_requests', 'posh_and_grievance_cases',
        'assets',
        'job_applicants'
    ];
BEGIN
    FOREACH t IN ARRAY mutable_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;', t);
            EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();', t);
        END IF;
    END LOOP;
END $$;

-- Enable RLS across all tables
DO $$
DECLARE
    tbl text;
    all_tables text[] := ARRAY[
        'platform_users', 'platform_plans', 'saas_subscriptions', 'background_jobs',
        'organizations', 'companies', 'branches', 'work_locations', 'departments', 'designations',
        'user_profiles', 'roles', 'permissions', 'role_permissions', 'user_roles',
        'employees', 'employee_profiles', 'employee_addresses', 'employee_bank_details', 'employee_statutory_details',
        'employee_onboarding', 'employee_lifecycle_events', 'employee_separations',
        'biometric_devices', 'attendance_punches', 'attendance_daily', 'attendance_regularizations',
        'shifts', 'employee_shift_assignments',
        'leave_types', 'leave_balances', 'leave_requests', 'leave_ledger_entries', 'holidays',
        'approval_workflows', 'approval_instances', 'approval_actions',
        'salary_components', 'salary_structures', 'salary_structure_components', 'employee_salary_assignments', 'payroll_runs', 'payroll_line_items', 'payslips',
        'vendors', 'vendor_workers', 'vendor_invoices',
        'performance_cycles', 'performance_goals', 'performance_reviews',
        'lms_courses', 'lms_enrollments',
        'document_types', 'employee_documents',
        'employee_requests', 'posh_and_grievance_cases',
        'assets', 'asset_assignments',
        'job_openings', 'job_applicants',
        'notification_events', 'webhook_endpoints', 'webhook_deliveries',
        'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY all_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        END IF;
    END LOOP;
END $$;

DROP POLICY IF EXISTS "permissions_select_auth" ON public.permissions;
CREATE POLICY "permissions_select_auth" ON public.permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "platform_users_policy" ON public.platform_users;
CREATE POLICY "platform_users_policy" ON public.platform_users FOR ALL TO authenticated USING (public.is_platform_admin());

DROP POLICY IF EXISTS "platform_plans_select" ON public.platform_plans;
CREATE POLICY "platform_plans_select" ON public.platform_plans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "platform_plans_admin" ON public.platform_plans;
CREATE POLICY "platform_plans_admin" ON public.platform_plans FOR ALL TO authenticated USING (public.is_platform_admin());

DO $$
DECLARE
    t text;
    org_tables text[] := ARRAY[
        'saas_subscriptions', 'background_jobs',
        'organizations', 'companies', 'branches', 'work_locations', 'departments', 'designations',
        'user_profiles', 'roles', 'role_permissions', 'user_roles',
        'employees', 'employee_profiles', 'employee_addresses', 'employee_bank_details', 'employee_statutory_details',
        'employee_onboarding', 'employee_lifecycle_events', 'employee_separations',
        'biometric_devices', 'attendance_punches', 'attendance_daily', 'attendance_regularizations',
        'shifts', 'employee_shift_assignments',
        'leave_types', 'leave_balances', 'leave_requests', 'leave_ledger_entries', 'holidays',
        'approval_workflows', 'approval_instances', 'approval_actions',
        'salary_components', 'salary_structures', 'salary_structure_components', 'employee_salary_assignments', 'payroll_runs', 'payroll_line_items', 'payslips',
        'vendors', 'vendor_workers', 'vendor_invoices',
        'performance_cycles', 'performance_goals', 'performance_reviews',
        'lms_courses', 'lms_enrollments',
        'document_types', 'employee_documents',
        'employee_requests', 'posh_and_grievance_cases',
        'assets', 'asset_assignments',
        'job_openings', 'job_applicants',
        'notification_events', 'webhook_endpoints', 'webhook_deliveries',
        'audit_logs'
    ];
BEGIN
    FOREACH t IN ARRAY org_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_tenant_isolation', t);
            
            IF t = 'organizations' THEN
                EXECUTE format('
                    CREATE POLICY %I ON public.%I FOR ALL TO authenticated 
                    USING (id = (SELECT public.get_active_user_org_id()) OR (SELECT public.is_platform_admin()))
                    WITH CHECK (id = (SELECT public.get_active_user_org_id()) OR (SELECT public.is_platform_admin()));',
                    t || '_tenant_isolation', t
                );
            ELSE
                EXECUTE format('
                    CREATE POLICY %I ON public.%I FOR ALL TO authenticated 
                    USING (organization_id = (SELECT public.get_active_user_org_id()) OR (SELECT public.is_platform_admin()))
                    WITH CHECK (organization_id = (SELECT public.get_active_user_org_id()) OR (SELECT public.is_platform_admin()));',
                    t || '_tenant_isolation', t
                );
            END IF;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 11: STORAGE BUCKETS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
    ('documents', 'documents', false, false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('payslips', 'payslips', false, false, 10485760, ARRAY['application/pdf']),
    ('avatars', 'avatars', true, true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- SECTION 12: SEED REFERENCE DATA
-- ============================================================================
INSERT INTO public.platform_plans (code, name, description, billing_interval, base_price, price_per_employee, max_employees, feature_flags)
VALUES 
    ('STARTER', 'Starter Tier', 'Essential HRMS for growing teams up to 50 employees', 'MONTHLY', 1999.00, 49.00, 50, '{"attendance": true, "leave": true, "payroll": false}'::jsonb),
    ('GROWTH', 'Growth Tier', 'Complete HRMS with Statutory Payroll for teams up to 250 employees', 'MONTHLY', 4999.00, 39.00, 250, '{"attendance": true, "leave": true, "payroll": true, "lms": true}'::jsonb),
    ('ENTERPRISE', 'Enterprise Suite', 'Full-spectrum HRMS + Biometrics + Manpower OS + Performance for unlimited workforce', 'MONTHLY', 9999.00, 29.00, 10000, '{"attendance": true, "leave": true, "payroll": true, "lms": true, "biometrics": true, "manpower": true, "performance": true, "webhooks": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.permissions (module, action, code, description)
VALUES 
    ('workforce', 'view', 'workforce.view', 'View employees directory'),
    ('workforce', 'create', 'workforce.create', 'Create new employee profile'),
    ('workforce', 'edit', 'workforce.edit', 'Modify employee profile'),
    ('workforce', 'delete', 'workforce.delete', 'Archive or delete employee'),
    ('attendance', 'view', 'attendance.view', 'View attendance ledger and daily punches'),
    ('attendance', 'regularize', 'attendance.regularize', 'Apply for attendance regularization'),
    ('attendance', 'approve', 'attendance.approve', 'Approve employee attendance regularization'),
    ('leave', 'view', 'leave.view', 'View leave balances and team calendar'),
    ('leave', 'apply', 'leave.apply', 'Submit leave request'),
    ('leave', 'approve', 'leave.approve', 'Approve or reject leave requests'),
    ('payroll', 'view', 'payroll.view', 'View monthly payroll and compensation summaries'),
    ('payroll', 'process', 'payroll.process', 'Execute monthly payroll batch runs'),
    ('payroll', 'disburse', 'payroll.disburse', 'Approve and release payroll disbursement'),
    ('vendor', 'view', 'vendor.view', 'View contractor manpower and invoices'),
    ('vendor', 'manage', 'vendor.manage', 'Approve vendor manpower deployments and service bills'),
    ('admin', 'configure', 'admin.configure', 'Configure organization structure and RBAC permissions')
ON CONFLICT (code) DO NOTHING;

COMMIT;
