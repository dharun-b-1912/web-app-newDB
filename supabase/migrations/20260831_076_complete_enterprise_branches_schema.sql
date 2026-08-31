-- =====================================================================================
-- Migration: 20260831_076_complete_enterprise_branches_schema.sql
-- Description: Ensures complete schema alignment for branches and locations table,
--              preventing 400 Bad Request errors on branch creation/updation.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure branches table has all enterprise columns
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY DEFAULT ('br-' || gen_random_uuid()::TEXT),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    branch_type VARCHAR(50) DEFAULT 'OFFICE',
    country VARCHAR(100) DEFAULT 'India',
    city VARCHAR(100),
    state VARCHAR(100),
    address TEXT,
    postal_code VARCHAR(30),
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    status VARCHAR(50) DEFAULT 'Active',
    head_employee_id TEXT,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add any missing columns to existing branches table
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS branch_type VARCHAR(50) DEFAULT 'OFFICE';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS postal_code VARCHAR(30);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS head_employee_id TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS contact_email VARCHAR(150);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_branches_company ON public.branches(company_id);
CREATE INDEX IF NOT EXISTS idx_branches_code ON public.branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_status ON public.branches(status);

-- 3. Row-Level Security
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read and write on branches"
    ON public.branches FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read on branches"
    ON public.branches FOR SELECT TO anon USING (true);
