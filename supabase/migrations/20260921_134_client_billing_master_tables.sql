-- ============================================================================
-- supabase/migrations/20260921_134_client_billing_master_tables.sql
-- Fixes: Creates client billing & invoicing database tables to replace localStorage
-- Tables:
--   1. client_masters
--   2. client_contracts
--   3. client_billing_runs
--   4. client_billing_rules
-- ============================================================================

-- 1. Client Masters Table
CREATE TABLE IF NOT EXISTS public.client_masters (
  id                    TEXT PRIMARY KEY DEFAULT ('cli-' || gen_random_uuid()::text),
  organization_id       TEXT NOT NULL,
  client_code           TEXT NOT NULL,
  legal_name            TEXT NOT NULL,
  display_name          TEXT NOT NULL,
  gstin                 TEXT,
  pan                   TEXT,
  registered_address    TEXT,
  billing_address       TEXT,
  city                  TEXT,
  state                 TEXT,
  state_code            TEXT DEFAULT '33',
  pincode               TEXT,
  contact_person        TEXT,
  contact_designation   TEXT,
  email                 TEXT,
  phone                 TEXT,
  payment_terms         TEXT DEFAULT '30 Days Net',
  credit_period_days    INTEGER DEFAULT 30,
  currency              TEXT DEFAULT 'INR',
  status                TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PROSPECT')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_masters_org ON public.client_masters(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_masters_status ON public.client_masters(status);

-- 2. Client Contracts Table
CREATE TABLE IF NOT EXISTS public.client_contracts (
  id                                TEXT PRIMARY KEY DEFAULT ('cnt-' || gen_random_uuid()::text),
  client_id                         TEXT NOT NULL REFERENCES public.client_masters(id) ON DELETE CASCADE,
  organization_id                   TEXT NOT NULL,
  contract_code                     TEXT NOT NULL,
  title                             TEXT NOT NULL,
  service_type                      TEXT NOT NULL DEFAULT 'MANPOWER_SUPPLY',
  rate_card_type                    TEXT DEFAULT 'PER_HEAD_PER_MONTH',
  sac_code                          TEXT DEFAULT '998519',
  billing_frequency                 TEXT DEFAULT 'MONTHLY',
  billing_period_start_day          INTEGER DEFAULT 1,
  billing_period_end_day            INTEGER DEFAULT 31,
  start_date                        DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date                          DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  renewal_date                      DATE,
  service_charge_percentage         NUMERIC(5, 2) DEFAULT 8.50,
  salary_divisor_type               TEXT DEFAULT 'FIXED_26',
  standard_working_hours_per_day    INTEGER DEFAULT 8,
  ot_multiplier                     NUMERIC(4, 2) DEFAULT 2.00,
  is_pf_billable                    BOOLEAN DEFAULT TRUE,
  is_esi_billable                   BOOLEAN DEFAULT TRUE,
  is_canteen_deducted_from_billing  BOOLEAN DEFAULT FALSE,
  transport_rate_per_employee       NUMERIC(10, 2) DEFAULT 0.00,
  canteen_rate_per_employee         NUMERIC(10, 2) DEFAULT 0.00,
  payment_terms                     TEXT DEFAULT '30 Days Net',
  credit_period_days                INTEGER DEFAULT 30,
  currency                          TEXT DEFAULT 'INR',
  status                            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWAL_PENDING')),
  notes                             TEXT,
  created_at                        TIMESTAMPTZ DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_contracts_client ON public.client_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_org ON public.client_contracts(organization_id);

-- 3. Client Billing Runs Table
CREATE TABLE IF NOT EXISTS public.client_billing_runs (
  id                    TEXT PRIMARY KEY DEFAULT ('run-' || gen_random_uuid()::text),
  client_id             TEXT NOT NULL REFERENCES public.client_masters(id) ON DELETE CASCADE,
  contract_id           TEXT NOT NULL REFERENCES public.client_contracts(id) ON DELETE CASCADE,
  organization_id       TEXT NOT NULL,
  period_name           TEXT NOT NULL,
  period_month          TEXT NOT NULL,
  period_year           INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  status                TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'CALCULATED', 'AUDIT_REVIEW', 'FINANCE_REVIEW', 'APPROVED', 'INVOICE_GENERATED', 'SENT', 'PAID', 'CLOSED', 'VOIDED')
  ),
  summary_metrics       JSONB DEFAULT '{}'::jsonb,
  invoice_number        TEXT,
  invoice_date          DATE,
  invoice_amount        NUMERIC(14, 2) DEFAULT 0.00,
  paid_amount           NUMERIC(14, 2) DEFAULT 0.00,
  audit_status          TEXT DEFAULT 'PASSED',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_billing_runs_client ON public.client_billing_runs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_billing_runs_contract ON public.client_billing_runs(contract_id);
CREATE INDEX IF NOT EXISTS idx_client_billing_runs_org ON public.client_billing_runs(organization_id);

-- 4. Client Billing Rules Table
CREATE TABLE IF NOT EXISTS public.client_billing_rules (
  id                    TEXT PRIMARY KEY DEFAULT ('cbr-' || gen_random_uuid()::text),
  client_id             TEXT NOT NULL REFERENCES public.client_masters(id) ON DELETE CASCADE,
  contract_id           TEXT REFERENCES public.client_contracts(id) ON DELETE CASCADE,
  organization_id       TEXT NOT NULL,
  rule_name             TEXT NOT NULL,
  category              TEXT NOT NULL DEFAULT 'SERVICE_CHARGE',
  calculation_method    TEXT NOT NULL DEFAULT 'PERCENTAGE_OF_BILLABLE_WAGES',
  value                 NUMERIC(12, 4) NOT NULL DEFAULT 8.5000,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Enable Row Level Security & Add Policies
-- ============================================================================
ALTER TABLE public.client_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_billing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_billing_rules ENABLE ROW LEVEL SECURITY;

-- Helper policies for public.client_masters
DROP POLICY IF EXISTS "client_masters_select" ON public.client_masters;
CREATE POLICY "client_masters_select" ON public.client_masters FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    organization_id::text IN (
      SELECT up.organization_id::text FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR organization_id::text IN (SELECT id::text FROM public.organizations)
  )
);

DROP POLICY IF EXISTS "client_masters_insert" ON public.client_masters;
CREATE POLICY "client_masters_insert" ON public.client_masters FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "client_masters_update" ON public.client_masters;
CREATE POLICY "client_masters_update" ON public.client_masters FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "client_masters_delete" ON public.client_masters;
CREATE POLICY "client_masters_delete" ON public.client_masters FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

-- Policies for public.client_contracts
DROP POLICY IF EXISTS "client_contracts_select" ON public.client_contracts;
CREATE POLICY "client_contracts_select" ON public.client_contracts FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    organization_id::text IN (
      SELECT up.organization_id::text FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR organization_id::text IN (SELECT id::text FROM public.organizations)
  )
);

DROP POLICY IF EXISTS "client_contracts_insert" ON public.client_contracts;
CREATE POLICY "client_contracts_insert" ON public.client_contracts FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "client_contracts_update" ON public.client_contracts;
CREATE POLICY "client_contracts_update" ON public.client_contracts FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "client_contracts_delete" ON public.client_contracts;
CREATE POLICY "client_contracts_delete" ON public.client_contracts FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

-- Policies for public.client_billing_runs
DROP POLICY IF EXISTS "client_billing_runs_select" ON public.client_billing_runs;
CREATE POLICY "client_billing_runs_select" ON public.client_billing_runs FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    organization_id::text IN (
      SELECT up.organization_id::text FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR organization_id::text IN (SELECT id::text FROM public.organizations)
  )
);

DROP POLICY IF EXISTS "client_billing_runs_insert" ON public.client_billing_runs;
CREATE POLICY "client_billing_runs_insert" ON public.client_billing_runs FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "client_billing_runs_update" ON public.client_billing_runs;
CREATE POLICY "client_billing_runs_update" ON public.client_billing_runs FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "client_billing_runs_delete" ON public.client_billing_runs;
CREATE POLICY "client_billing_runs_delete" ON public.client_billing_runs FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

-- Policies for public.client_billing_rules
DROP POLICY IF EXISTS "client_billing_rules_all" ON public.client_billing_rules;
CREATE POLICY "client_billing_rules_all" ON public.client_billing_rules FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- Seed Initial Real Database Records (replaces localStorage hardcoded lists)
-- ============================================================================
DO $$
DECLARE
  v_org_id TEXT;
  v_client_id_1 TEXT := 'cli-electrodrive-01';
  v_client_id_2 TEXT := 'cli-bull-02';
  v_contract_id_1 TEXT := 'cnt-electrodrive-ev-01';
  v_contract_id_2 TEXT := 'cnt-bull-machines-02';
BEGIN
  SELECT id::text INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  IF v_org_id IS NULL THEN
    v_org_id := '0c621892-e938-4707-9957-13534ea32c19';
  END IF;

  -- 1. Electrodrive Powertrain
  INSERT INTO public.client_masters (
    id, organization_id, client_code, legal_name, display_name,
    gstin, pan, registered_address, billing_address, city, state, state_code,
    pincode, contact_person, contact_designation, email, phone,
    payment_terms, credit_period_days, currency, status, notes
  ) VALUES (
    v_client_id_1, v_org_id, 'EDP-001', 'Electrodrive Powertrain Solutions Pvt Ltd', 'Electrodrive Powertrain',
    '33AAACE1234F1Z5', 'AAACE1234F', 'Survey No. 104/2, Auto Nagar, Chettipalayam Road',
    'Survey No. 104/2, Auto Nagar, Chettipalayam Road', 'Coimbatore', 'Tamil Nadu', '33',
    '641201', 'Mr. K. Narayanan', 'Head of Supply Chain & Commercials', 'k.narayanan@electrodrive.in', '+91 94433 11220',
    '30 Days Net', 30, 'INR', 'ACTIVE', 'Primary EV Powertrain assembly manpower supply partner.'
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Bull Machines
  INSERT INTO public.client_masters (
    id, organization_id, client_code, legal_name, display_name,
    gstin, pan, registered_address, billing_address, city, state, state_code,
    pincode, contact_person, contact_designation, email, phone,
    payment_terms, credit_period_days, currency, status, notes
  ) VALUES (
    v_client_id_2, v_org_id, 'BULL-002', 'Bull Machines Private Limited (Plant 1 & 2)', 'Bull Machines Heavy Engineering',
    '33AABCB5566G1Z1', 'AABCB5566G', 'Trichy Road, Kangeyampalayam, Sulur',
    'Plant 1 & 2 Fabrication Division, Sulur', 'Coimbatore', 'Tamil Nadu', '33',
    '641401', 'Mr. R. Sundaram', 'General Manager - HR & Administration', 'sundaram.r@bullmachines.com', '+91 98422 77889',
    '45 Days Net', 45, 'INR', 'ACTIVE', 'Heavy fabrication, welding, and assembly contract labour.'
  ) ON CONFLICT (id) DO NOTHING;

  -- Contracts
  INSERT INTO public.client_contracts (
    id, client_id, organization_id, contract_code, title,
    service_type, rate_card_type, start_date, end_date,
    service_charge_percentage, salary_divisor_type, payment_terms, credit_period_days, currency, status, notes
  ) VALUES (
    v_contract_id_1, v_client_id_1, v_org_id, 'CTR-EDP-2026-01',
    'Electrodrive EV Assembly Manpower Supply Agreement (JCS/EDP/CONT-2026/01)',
    'MANPOWER_SUPPLY', 'PER_HEAD_PER_MONTH', '2026-01-01', '2026-12-31',
    8.50, 'FIXED_26', '30 Days Net', 30, 'INR', 'ACTIVE', 'Assembly line skilled technicians and assembly workers'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.client_contracts (
    id, client_id, organization_id, contract_code, title,
    service_type, rate_card_type, start_date, end_date,
    service_charge_percentage, salary_divisor_type, payment_terms, credit_period_days, currency, status, notes
  ) VALUES (
    v_contract_id_2, v_client_id_2, v_org_id, 'CTR-BULL-2026-02',
    'Bull Machines Heavy Fabrication Manpower Agreement (JCS/BULL/CONT-2026/02)',
    'CONTRACT_LABOUR', 'PER_HEAD_PER_MONTH', '2026-02-01', '2027-01-31',
    8.00, 'FIXED_26', '45 Days Net', 45, 'INR', 'ACTIVE', 'Heavy welding and fabrication operators'
  ) ON CONFLICT (id) DO NOTHING;

  -- Initial Billing Run in PostgreSQL
  INSERT INTO public.client_billing_runs (
    id, client_id, contract_id, organization_id, period_name, period_month, period_year,
    status, summary_metrics, invoice_number, invoice_date, invoice_amount, paid_amount
  ) VALUES (
    'run-edp-2026-08', v_client_id_1, v_contract_id_1, v_org_id,
    'August 2026', 'August 2026', 2026,
    'CALCULATED',
    jsonb_build_object(
      'totalEmployees', 1,
      'totalPaidDays', 30,
      'grossBillableWages', 24554,
      'employerContributions', 1685,
      'serviceCharge', 2032,
      'transportRecovery', 375,
      'canteenRecovery', -3650,
      'taxableValue', 27976,
      'gstAmount', 5036,
      'grandTotal', 33012
    ),
    'INV-2026-08-001', '2026-08-31', 33012.00, 0.00
  ) ON CONFLICT (id) DO NOTHING;

  -- Initial Billing Rules
  INSERT INTO public.client_billing_rules (
    id, client_id, contract_id, organization_id, rule_name,
    category, calculation_method, value, is_active
  ) VALUES (
    'cbr-edp-service-charge', v_client_id_1, v_contract_id_1, v_org_id,
    'Contract Management & Service Charge (8.5%)', 'SERVICE_CHARGE',
    'PERCENTAGE_OF_BILLABLE_WAGES', 8.5000, TRUE
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.client_billing_rules (
    id, client_id, contract_id, organization_id, rule_name,
    category, calculation_method, value, is_active
  ) VALUES (
    'cbr-edp-transport-subsidy', v_client_id_1, v_contract_id_1, v_org_id,
    'Dedicated Staff Transport Facility', 'TRANSPORT',
    'PER_EMPLOYEE', 375.0000, TRUE
  ) ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Migration 134 complete: client billing tables created and seeded successfully.';
END $$;

-- Reload Supabase PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
