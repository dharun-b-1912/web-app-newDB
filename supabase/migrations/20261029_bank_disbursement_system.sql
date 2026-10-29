-- ============================================================================
-- Joy PeopleHR: Bank Disbursement & Payout Governance System
-- Authoritative Multi-Tenant Tables, Maker-Checker Controls & Audit Trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bank_disbursement_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    payroll_run_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    pay_period TEXT NOT NULL,
    template_id TEXT DEFAULT 'tmpl-hdfc-enet',
    template_name TEXT DEFAULT 'HDFC Bank (HDFC Corporate CMS / Enet)',
    payment_mode TEXT DEFAULT 'NEFT',
    bank_account_source TEXT,
    source_bank_name TEXT DEFAULT 'HDFC Bank Ltd',
    source_account_number TEXT,
    source_ifsc TEXT DEFAULT 'HDFC0000123',
    source_branch TEXT DEFAULT 'Anna Salai Corporate Branch, Chennai',
    total_transactions INTEGER DEFAULT 0,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'INR',
    intra_bank_count INTEGER DEFAULT 0,
    intra_bank_amount NUMERIC(15, 2) DEFAULT 0.00,
    inter_bank_count INTEGER DEFAULT 0,
    inter_bank_amount NUMERIC(15, 2) DEFAULT 0.00,
    destination_bank_breakdown JSONB DEFAULT '[]'::jsonb,
    validation_checks JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Draft',
    generated_by TEXT,
    maker_name TEXT,
    maker_signed_at TIMESTAMPTZ DEFAULT now(),
    maker_notes TEXT,
    checker_name TEXT,
    checker_approved_at TIMESTAMPTZ,
    checker_notes TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ,
    bank_reference_id TEXT,
    bank_utr_master TEXT,
    confirmation_channel TEXT,
    confirmed_by_name TEXT,
    confirmation_notes TEXT,
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    successful_amount NUMERIC(15, 2) DEFAULT 0.00,
    failed_amount NUMERIC(15, 2) DEFAULT 0.00,
    reconciled_at TIMESTAMPTZ,
    reconciled_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_disbursement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.bank_disbursement_batches(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    employee_code TEXT,
    employee_name TEXT NOT NULL,
    department TEXT,
    designation TEXT,
    bank_name TEXT,
    account_number_raw TEXT,
    account_number_masked TEXT,
    ifsc_code TEXT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency TEXT DEFAULT 'INR',
    payment_method TEXT DEFAULT 'NEFT',
    source_bank_name TEXT,
    source_account_masked TEXT,
    transfer_type TEXT DEFAULT 'Inter-Bank (NEFT)',
    validation_status TEXT DEFAULT 'Passed',
    validation_error TEXT,
    bank_status TEXT DEFAULT 'Pending',
    bank_reference_number TEXT,
    bank_error_code TEXT,
    bank_error_message TEXT,
    settled_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_disb_batches_org ON public.bank_disbursement_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_disb_batches_status ON public.bank_disbursement_batches(status);
CREATE INDEX IF NOT EXISTS idx_disb_batches_pay_period ON public.bank_disbursement_batches(pay_period);
CREATE INDEX IF NOT EXISTS idx_disb_items_batch ON public.bank_disbursement_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_disb_items_org ON public.bank_disbursement_items(organization_id);

-- Enable Row Level Security
ALTER TABLE public.bank_disbursement_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_disbursement_items ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated and service roles
CREATE POLICY "Allow authenticated read bank_disbursement_batches"
    ON public.bank_disbursement_batches FOR SELECT
    TO authenticated, anon, service_role
    USING (true);

CREATE POLICY "Allow authenticated insert bank_disbursement_batches"
    ON public.bank_disbursement_batches FOR INSERT
    TO authenticated, anon, service_role
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update bank_disbursement_batches"
    ON public.bank_disbursement_batches FOR UPDATE
    TO authenticated, anon, service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete bank_disbursement_batches"
    ON public.bank_disbursement_batches FOR DELETE
    TO authenticated, anon, service_role
    USING (true);

CREATE POLICY "Allow authenticated read bank_disbursement_items"
    ON public.bank_disbursement_items FOR SELECT
    TO authenticated, anon, service_role
    USING (true);

CREATE POLICY "Allow authenticated insert bank_disbursement_items"
    ON public.bank_disbursement_items FOR INSERT
    TO authenticated, anon, service_role
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update bank_disbursement_items"
    ON public.bank_disbursement_items FOR UPDATE
    TO authenticated, anon, service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete bank_disbursement_items"
    ON public.bank_disbursement_items FOR DELETE
    TO authenticated, anon, service_role
    USING (true);
