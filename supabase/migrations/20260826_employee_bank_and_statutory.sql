-- ====================================================================
-- WorkforceOS Enterprise HRMS: Employee Bank & Statutory Schema
-- ====================================================================

-- 1. Employee Bank Accounts Table
CREATE TABLE IF NOT EXISTS public.employee_bank_accounts (
    id TEXT PRIMARY KEY DEFAULT ('bank-' || gen_random_uuid()::text),
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL DEFAULT 'HDFC Bank',
    account_number TEXT NOT NULL DEFAULT '',
    ifsc_code TEXT NOT NULL DEFAULT 'HDFC0001234',
    account_type TEXT NOT NULL DEFAULT 'SALARY',
    account_holder_name TEXT NOT NULL DEFAULT '',
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Employee Statutory Details Table
CREATE TABLE IF NOT EXISTS public.employee_statutory_details (
    id TEXT PRIMARY KEY DEFAULT ('stat-' || gen_random_uuid()::text),
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    pan_number TEXT DEFAULT '',
    uan_number TEXT DEFAULT '',
    pf_number TEXT DEFAULT '',
    esi_number TEXT DEFAULT '',
    tax_regime TEXT DEFAULT 'NEW',
    pf_applicable BOOLEAN DEFAULT true,
    esi_applicable BOOLEAN DEFAULT false,
    pt_applicable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.employee_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_statutory_details ENABLE ROW LEVEL SECURITY;

-- 4. Open Full Access Policies for Verified Operations
DROP POLICY IF EXISTS "Allow full access on employee_bank_accounts" ON public.employee_bank_accounts;
CREATE POLICY "Allow full access on employee_bank_accounts" ON public.employee_bank_accounts
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on employee_statutory_details" ON public.employee_statutory_details;
CREATE POLICY "Allow full access on employee_statutory_details" ON public.employee_statutory_details
    FOR ALL USING (true) WITH CHECK (true);
