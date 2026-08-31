-- =====================================================================================
-- Migration: 20260831_075_fix_departments_and_vendor_workers_schema.sql
-- Description: Fixes 400 Bad Request on departments insertion by adding missing columns,
--              and resolves 404 Not Found on vendor_workers and vendor_deployments tables.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure departments table has all expected columns
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY DEFAULT ('dept-' || gen_random_uuid()::TEXT),
    organization_id TEXT,
    company_id TEXT,
    branch_id TEXT,
    parent_department_id TEXT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    cost_center_code TEXT,
    head_employee_id TEXT,
    description TEXT,
    status TEXT DEFAULT 'Active',
    employee_count INT DEFAULT 0,
    team_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS parent_department_id TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS cost_center_code TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS head_employee_id TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS employee_count INT DEFAULT 0;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS team_count INT DEFAULT 0;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure vendor_workers table exists to prevent 404
CREATE TABLE IF NOT EXISTS public.vendor_workers (
    id TEXT PRIMARY KEY DEFAULT ('vwrk-' || gen_random_uuid()::TEXT),
    organization_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    worker_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(30),
    identity_proof_type VARCHAR(50) DEFAULT 'Aadhaar',
    identity_proof_number_masked VARCHAR(50) DEFAULT 'XXXX XXXX 1234',
    skill_category VARCHAR(100) DEFAULT 'Technical Support',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    uan VARCHAR(30),
    esic_number VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure vendor_deployments table exists to prevent 404
CREATE TABLE IF NOT EXISTS public.vendor_deployments (
    id TEXT PRIMARY KEY DEFAULT ('vdep-' || gen_random_uuid()::TEXT),
    organization_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    branch_id TEXT,
    department_id TEXT,
    team_id TEXT,
    site_location VARCHAR(255),
    role_title VARCHAR(150),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row-Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read and write on departments"
    ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_workers"
    ON public.vendor_workers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on vendor_deployments"
    ON public.vendor_deployments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read on departments"
    ON public.departments FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read on vendor_workers"
    ON public.vendor_workers FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read on vendor_deployments"
    ON public.vendor_deployments FOR SELECT TO anon USING (true);
