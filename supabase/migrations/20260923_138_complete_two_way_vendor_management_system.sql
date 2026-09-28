-- supabase/migrations/20260923_138_complete_two_way_vendor_management_system.sql
-- ============================================================================
-- Joy PeopleHR — Complete Two-Way Vendor Management & Collaboration Ecosystem
-- Migration: 20260923_138_complete_two_way_vendor_management_system.sql
-- Description: Idempotent migration creating core tables and safely adding
--              missing columns (employee_id, bank_details, approval_status, etc.)
-- ============================================================================

-- 1. Vendors Master Table
CREATE TABLE IF NOT EXISTS public.vendors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code         TEXT UNIQUE NOT NULL,
  legal_name          TEXT NOT NULL,
  display_name        TEXT,
  trade_name          TEXT,
  vendor_type         TEXT DEFAULT 'MANPOWER_PROVIDER',
  category            TEXT DEFAULT 'General',
  pan_number          TEXT,
  gst_number          TEXT,
  msme_number         TEXT,
  registration_number TEXT,
  email               TEXT,
  phone               TEXT,
  website             TEXT,
  address_json        JSONB DEFAULT '{}'::jsonb,
  bank_details        JSONB DEFAULT '{}'::jsonb,
  primary_contact     JSONB DEFAULT '{}'::jsonb,
  compliance_contact  JSONB DEFAULT '{}'::jsonb,
  max_capacity        INT DEFAULT 100,
  status              TEXT NOT NULL DEFAULT 'DRAFT',
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Column Augmentation for vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS trade_name TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS msme_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS primary_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS compliance_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS max_capacity INT DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_vendors_vcode ON public.vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);

-- 2. Vendor Relationships Table
CREATE TABLE IF NOT EXISTS public.vendor_relationships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  relationship_code   TEXT,
  category            TEXT DEFAULT 'General',
  service_type        TEXT DEFAULT 'MANPOWER_SUPPLY',
  onboarding_status   TEXT NOT NULL DEFAULT 'INVITED',
  compliance_status   TEXT NOT NULL DEFAULT 'PENDING',
  contract_status     TEXT DEFAULT 'NONE',
  assigned_manager_id UUID,
  internal_notes      TEXT,
  sites_json          JSONB DEFAULT '[]'::jsonb,
  valid_from          DATE,
  valid_to            DATE,
  status              TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vrel_org_id ON public.vendor_relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_vrel_vendor_id ON public.vendor_relationships(vendor_id);

-- 3. Vendor Workers (Shared Workforce Identity)
CREATE TABLE IF NOT EXISTS public.vendor_workers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  organization_id     UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  employee_id         UUID REFERENCES public.employees(id) ON DELETE SET NULL, -- Linked master employee
  worker_code         TEXT,
  first_name          TEXT,
  last_name           TEXT,
  full_name           TEXT,
  email               TEXT,
  phone               TEXT,
  designation         TEXT,
  department          TEXT,
  skill_level         TEXT DEFAULT 'Skilled',
  work_location       TEXT,
  site_id             TEXT,
  contract_reference  TEXT,
  joining_date        DATE DEFAULT CURRENT_DATE,
  exit_date           DATE,
  daily_wage_rate     NUMERIC(10, 2) DEFAULT 0.00,
  monthly_base_salary NUMERIC(12, 2) DEFAULT 0.00,
  overtime_eligible   BOOLEAN DEFAULT TRUE,
  compliance_status   TEXT DEFAULT 'PENDING',
  status              TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Column Augmentation for vendor_workers (Fixes ERROR 42703 column "employee_id" does not exist)
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS worker_code TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'Skilled';
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS work_location TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS contract_reference TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS exit_date DATE;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS daily_wage_rate NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS monthly_base_salary NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS overtime_eligible BOOLEAN DEFAULT TRUE;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_vworkers_v_id ON public.vendor_workers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vworkers_emp_id ON public.vendor_workers(employee_id);

-- 4. Vendor Attendance Records & Ingestion Batches
CREATE TABLE IF NOT EXISTS public.vendor_attendance_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  batch_number        TEXT NOT NULL UNIQUE,
  period_month        TEXT NOT NULL,
  source              TEXT NOT NULL DEFAULT 'FILE_UPLOAD',
  total_records       INT DEFAULT 0,
  valid_records       INT DEFAULT 0,
  error_records       INT DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'UPLOADED',
  uploaded_by         UUID,
  uploaded_at         TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by         UUID,
  reviewed_at         TIMESTAMPTZ,
  notes               TEXT
);

CREATE TABLE IF NOT EXISTS public.vendor_attendance_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            UUID REFERENCES public.vendor_attendance_batches(id) ON DELETE CASCADE,
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  worker_id           UUID NOT NULL REFERENCES public.vendor_workers(id) ON DELETE CASCADE,
  employee_id         UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  attendance_date     DATE NOT NULL,
  check_in            TIMESTAMPTZ,
  check_out           TIMESTAMPTZ,
  source              TEXT NOT NULL DEFAULT 'FILE_UPLOAD',
  shift_name          TEXT DEFAULT 'General Shift',
  total_hours         NUMERIC(5, 2) DEFAULT 0.00,
  overtime_hours      NUMERIC(5, 2) DEFAULT 0.00,
  status              TEXT NOT NULL DEFAULT 'PRESENT',
  is_week_off         BOOLEAN DEFAULT FALSE,
  is_holiday          BOOLEAN DEFAULT FALSE,
  has_anomaly         BOOLEAN DEFAULT FALSE,
  anomaly_description TEXT,
  is_locked           BOOLEAN DEFAULT FALSE,
  approval_status     TEXT DEFAULT 'PENDING',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Column Augmentation for vendor_attendance_records
ALTER TABLE public.vendor_attendance_records ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_attendance_records ADD COLUMN IF NOT EXISTS has_anomaly BOOLEAN DEFAULT FALSE;
ALTER TABLE public.vendor_attendance_records ADD COLUMN IF NOT EXISTS anomaly_description TEXT;
ALTER TABLE public.vendor_attendance_records ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.vendor_attendance_records ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_vatt_v_id ON public.vendor_attendance_records(vendor_id);

-- 5. Vendor Payroll Rules & Inputs
CREATE TABLE IF NOT EXISTS public.vendor_payroll_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  organization_id     UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_name           TEXT NOT NULL,
  rule_code           TEXT NOT NULL,
  rule_type           TEXT NOT NULL,
  formula_expression  TEXT NOT NULL,
  effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to        DATE,
  version             INT DEFAULT 1,
  is_active           BOOLEAN DEFAULT TRUE,
  rounding_mode       TEXT DEFAULT 'NEAREST',
  min_threshold       NUMERIC(10, 2),
  max_threshold       NUMERIC(10, 2),
  description         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendor_payroll_inputs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  worker_id           UUID NOT NULL REFERENCES public.vendor_workers(id) ON DELETE CASCADE,
  period_month        TEXT NOT NULL,
  base_wages          NUMERIC(12, 2) DEFAULT 0.00,
  overtime_pay        NUMERIC(12, 2) DEFAULT 0.00,
  night_allowance     NUMERIC(12, 2) DEFAULT 0.00,
  attendance_bonus    NUMERIC(12, 2) DEFAULT 0.00,
  other_allowances    NUMERIC(12, 2) DEFAULT 0.00,
  canteen_deduction   NUMERIC(12, 2) DEFAULT 0.00,
  transport_deduction NUMERIC(12, 2) DEFAULT 0.00,
  room_rent_deduction NUMERIC(12, 2) DEFAULT 0.00,
  medical_deduction   NUMERIC(12, 2) DEFAULT 0.00,
  other_deductions    NUMERIC(12, 2) DEFAULT 0.00,
  total_gross         NUMERIC(12, 2) DEFAULT 0.00,
  total_deductions    NUMERIC(12, 2) DEFAULT 0.00,
  net_payable         NUMERIC(12, 2) DEFAULT 0.00,
  status              TEXT NOT NULL DEFAULT 'SUBMITTED',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Vendor Documents & Compliance Vault
CREATE TABLE IF NOT EXISTS public.vendor_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  relationship_id     UUID REFERENCES public.vendor_relationships(id) ON DELETE CASCADE,
  document_category   TEXT DEFAULT 'CONTRACT',
  document_type       TEXT NOT NULL,
  document_number     TEXT,
  period_month        TEXT,
  file_name           TEXT NOT NULL,
  file_path           TEXT NOT NULL,
  file_size           BIGINT,
  mime_type           TEXT,
  issue_date          DATE,
  expiry_date         DATE,
  version             INT DEFAULT 1,
  verification_status TEXT NOT NULL DEFAULT 'UNDER_REVIEW',
  rejection_reason    TEXT,
  verified_by         UUID,
  verified_at         TIMESTAMPTZ,
  uploaded_by         UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Column Augmentation for vendor_documents
ALTER TABLE public.vendor_documents ADD COLUMN IF NOT EXISTS document_category TEXT DEFAULT 'CONTRACT';
ALTER TABLE public.vendor_documents ADD COLUMN IF NOT EXISTS period_month TEXT;
ALTER TABLE public.vendor_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 7. Vendor Invoices & 3-Way Line Match
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  relationship_id     UUID REFERENCES public.vendor_relationships(id) ON DELETE CASCADE,
  invoice_number      TEXT NOT NULL,
  billing_period      TEXT NOT NULL,
  contract_reference  TEXT,
  invoice_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE,
  subtotal_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  tax_amount          NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_amount        NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  currency            TEXT DEFAULT 'INR',
  approval_status     TEXT NOT NULL DEFAULT 'SUBMITTED',
  payment_status      TEXT NOT NULL DEFAULT 'UNPAID',
  payment_reference   TEXT,
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Column Augmentation for vendor_invoices
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'SUBMITTED';
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID';
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS public.vendor_invoice_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID NOT NULL REFERENCES public.vendor_invoices(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  workforce_count     INT DEFAULT 1,
  rate_per_unit       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  service_charge_pct  NUMERIC(5, 2) DEFAULT 0.00,
  tax_rate_pct        NUMERIC(5, 2) DEFAULT 18.00,
  line_total          NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Vendor Worker Asset Allocations
CREATE TABLE IF NOT EXISTS public.vendor_asset_allocations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  worker_id           UUID NOT NULL REFERENCES public.vendor_workers(id) ON DELETE CASCADE,
  asset_name          TEXT NOT NULL,
  asset_category      TEXT NOT NULL DEFAULT 'UNIFORM_SAFETY',
  serial_number       TEXT,
  issued_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  return_date         DATE,
  status              TEXT NOT NULL DEFAULT 'ISSUED',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Vendor Communication & Requests (Two-Way Tickets)
CREATE TABLE IF NOT EXISTS public.vendor_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_number      TEXT NOT NULL UNIQUE,
  sender_type         TEXT NOT NULL DEFAULT 'COMPANY',
  created_by          UUID,
  category            TEXT NOT NULL DEFAULT 'GENERAL',
  priority            TEXT NOT NULL DEFAULT 'MEDIUM',
  subject             TEXT NOT NULL,
  description         TEXT NOT NULL,
  due_date            DATE,
  status              TEXT NOT NULL DEFAULT 'OPEN',
  attachments_json    JSONB DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Column Augmentation for vendor_requests
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'COMPANY';

CREATE TABLE IF NOT EXISTS public.vendor_request_comments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID NOT NULL REFERENCES public.vendor_requests(id) ON DELETE CASCADE,
  sender_type         TEXT NOT NULL DEFAULT 'COMPANY',
  author_name         TEXT NOT NULL,
  comment_body        TEXT NOT NULL,
  attachments_json    JSONB DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Vendor Immutable Audit Trail
CREATE TABLE IF NOT EXISTS public.vendor_audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  organization_id     UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_name          TEXT NOT NULL,
  actor_type          TEXT NOT NULL DEFAULT 'SYSTEM',
  action              TEXT NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           TEXT,
  details             JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ENABLE RLS & DEFINE ACCESSIBILITY
-- ============================================================================

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_attendance_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payroll_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payroll_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_asset_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive authenticated RLS for multi-tenant backend access
DROP POLICY IF EXISTS "Authenticated users access vendors" ON public.vendors;
CREATE POLICY "Authenticated users access vendors" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_relationships" ON public.vendor_relationships;
CREATE POLICY "Authenticated users access vendor_relationships" ON public.vendor_relationships FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_workers" ON public.vendor_workers;
CREATE POLICY "Authenticated users access vendor_workers" ON public.vendor_workers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_attendance_batches" ON public.vendor_attendance_batches;
CREATE POLICY "Authenticated users access vendor_attendance_batches" ON public.vendor_attendance_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_attendance_records" ON public.vendor_attendance_records;
CREATE POLICY "Authenticated users access vendor_attendance_records" ON public.vendor_attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_payroll_rules" ON public.vendor_payroll_rules;
CREATE POLICY "Authenticated users access vendor_payroll_rules" ON public.vendor_payroll_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_payroll_inputs" ON public.vendor_payroll_inputs;
CREATE POLICY "Authenticated users access vendor_payroll_inputs" ON public.vendor_payroll_inputs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_documents" ON public.vendor_documents;
CREATE POLICY "Authenticated users access vendor_documents" ON public.vendor_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_invoices" ON public.vendor_invoices;
CREATE POLICY "Authenticated users access vendor_invoices" ON public.vendor_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_invoice_items" ON public.vendor_invoice_items;
CREATE POLICY "Authenticated users access vendor_invoice_items" ON public.vendor_invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_asset_allocations" ON public.vendor_asset_allocations;
CREATE POLICY "Authenticated users access vendor_asset_allocations" ON public.vendor_asset_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_requests" ON public.vendor_requests;
CREATE POLICY "Authenticated users access vendor_requests" ON public.vendor_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_request_comments" ON public.vendor_request_comments;
CREATE POLICY "Authenticated users access vendor_request_comments" ON public.vendor_request_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access vendor_audit_logs" ON public.vendor_audit_logs;
CREATE POLICY "Authenticated users access vendor_audit_logs" ON public.vendor_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
