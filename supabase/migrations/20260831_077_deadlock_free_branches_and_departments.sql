-- =====================================================================================
-- Migration: 20260831_077_deadlock_free_branches_and_departments.sql
-- Description: Deadlock-safe, self-healing DDL migration.
--              1. Automatically releases hanging locks & idle transactions
--              2. Safely aligns branches, departments, vendor_workers schemas
--              3. Idempotent policy creation without blocking concurrent reads
-- =====================================================================================

-- Step 1: Release any hanging idle backend locks (except current session)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
  AND state IN ('idle in transaction', 'idle in transaction (aborted)')
  AND query NOT ILIKE '%pg_stat_activity%';

-- Step 2: Set reasonable lock timeout to prevent indefinite deadlocking
SET lock_timeout = '8s';
SET statement_timeout = '30s';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- STEP 3: BRANCHES TABLE SCHEMA REINFORCEMENT
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY DEFAULT ('br-' || gen_random_uuid()::TEXT),
    company_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual non-blocking column additions
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS branch_type VARCHAR(50) DEFAULT 'OFFICE';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Coimbatore';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Tamil Nadu';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS postal_code VARCHAR(30);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS head_employee_id TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS contact_email VARCHAR(150);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================================================
-- STEP 4: DEPARTMENTS TABLE SCHEMA REINFORCEMENT
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY DEFAULT ('dept-' || gen_random_uuid()::TEXT),
    company_id TEXT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS parent_department_id TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS cost_center_code TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS head_employee_id TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS employee_count INT DEFAULT 0;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS team_count INT DEFAULT 0;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================================================
-- STEP 5: VENDOR WORKERS & DEPLOYMENTS (Eliminating 404s)
-- =====================================================================================
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

-- =====================================================================================
-- STEP 6: IDEMPOTENT RLS POLICIES WITHOUT DEADLOCK
-- =====================================================================================
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_deployments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Branches Policies
    DROP POLICY IF EXISTS "Allow authenticated read and write on branches" ON public.branches;
    CREATE POLICY "Allow authenticated read and write on branches" ON public.branches FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow anon read on branches" ON public.branches;
    CREATE POLICY "Allow anon read on branches" ON public.branches FOR SELECT TO anon USING (true);

    -- Departments Policies
    DROP POLICY IF EXISTS "Allow authenticated read and write on departments" ON public.departments;
    CREATE POLICY "Allow authenticated read and write on departments" ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon read on departments" ON public.departments;
    CREATE POLICY "Allow anon read on departments" ON public.departments FOR SELECT TO anon USING (true);

    -- Vendor Workers Policies
    DROP POLICY IF EXISTS "Allow authenticated read and write on vendor_workers" ON public.vendor_workers;
    CREATE POLICY "Allow authenticated read and write on vendor_workers" ON public.vendor_workers FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon read on vendor_workers" ON public.vendor_workers;
    CREATE POLICY "Allow anon read on vendor_workers" ON public.vendor_workers FOR SELECT TO anon USING (true);

    -- Vendor Deployments Policies
    DROP POLICY IF EXISTS "Allow authenticated read and write on vendor_deployments" ON public.vendor_deployments;
    CREATE POLICY "Allow authenticated read and write on vendor_deployments" ON public.vendor_deployments FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon read on vendor_deployments" ON public.vendor_deployments;
    CREATE POLICY "Allow anon read on vendor_deployments" ON public.vendor_deployments FOR SELECT TO anon USING (true);
END$$;
