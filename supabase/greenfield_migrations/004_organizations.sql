-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 004
-- Target Project: ysiajemrqakfngasehhi
-- Description: Organization and Corporate Structural Hierarchy
-- ============================================================================

-- 1. Canonical Organization (Root Tenant)
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

-- 2. SaaS Subscriptions
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

-- 3. Background Jobs Queue
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

-- 4. Companies (Legal Entities)
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

-- 5. Branches
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

-- 6. Work Locations & Geofences
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

-- 7. Departments
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    parent_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(32) NOT NULL,
    head_employee_id UUID, -- Foreign key linked post employee creation
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_departments_org_code UNIQUE (organization_id, company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments(organization_id);

-- 8. Designations
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
