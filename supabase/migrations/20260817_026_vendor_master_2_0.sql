-- ============================================================================
-- Migration 026: WorkForceOS Vendor / Manpower Provider Master 2.0
-- Compatible with PostgreSQL TEXT Primary & Foreign Keys
-- ============================================================================

-- 1. Vendors Master Table
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY DEFAULT ('ven-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_entity_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  vendor_code TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  vendor_type TEXT NOT NULL DEFAULT 'MANPOWER_PROVIDER'
    CHECK (vendor_type IN (
      'MANPOWER_PROVIDER',
      'RECRUITMENT_AGENCY',
      'CONTRACTOR',
      'IT_SERVICE_PROVIDER',
      'FACILITY_SERVICE_PROVIDER',
      'CONSULTING',
      'OTHER'
    )),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT',
      'PENDING_VERIFICATION',
      'ACTIVE',
      'SUSPENDED',
      'EXPIRED',
      'TERMINATED',
      'INACTIVE'
    )),
  registration_number TEXT,
  tax_id TEXT,
  pan TEXT,
  gstin TEXT,
  logo_url TEXT,
  primary_contact_name TEXT NOT NULL,
  primary_contact_designation TEXT,
  primary_contact_email TEXT NOT NULL,
  primary_contact_phone TEXT NOT NULL,
  alternate_phone TEXT,
  website TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'India',
  manpower_license_no TEXT,
  manpower_license_expiry DATE,
  max_workforce_capacity INTEGER DEFAULT 100,
  authorized_workforce_categories TEXT[] DEFAULT ARRAY['Contract Labour', 'Facility Staff', 'Technical Support'],
  contract_start_date DATE,
  contract_end_date DATE,
  payment_terms TEXT DEFAULT 'Net 30',
  currency TEXT DEFAULT 'INR',
  payment_method TEXT DEFAULT 'Bank Transfer',
  bank_name TEXT,
  account_name TEXT,
  account_number_masked TEXT,
  account_number_encrypted TEXT,
  ifsc_code TEXT,
  swift_code TEXT,
  bank_branch TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_vendor_code_per_org UNIQUE (organization_id, vendor_code)
);

CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(vendor_type);

-- 2. Vendor Contracts Table
CREATE TABLE IF NOT EXISTS vendor_contracts (
  id TEXT PRIMARY KEY DEFAULT ('vcnt-' || gen_random_uuid()::text),
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  legal_entity_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL,
  contract_type TEXT DEFAULT 'Master Service Agreement (MSA)',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,
  notice_period_days INTEGER DEFAULT 30,
  payment_terms TEXT DEFAULT 'Net 30',
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'TERMINATED')),
  document_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_contract_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor ON vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status ON vendor_contracts(status);

-- 3. Vendor Compliance Documents Table
CREATE TABLE IF NOT EXISTS vendor_documents (
  id TEXT PRIMARY KEY DEFAULT ('vdoc-' || gen_random_uuid()::text),
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_reference TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  expiry_date DATE,
  verification_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (verification_status IN ('UPLOADED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_vendor_docs_vendor ON vendor_documents(vendor_id);

-- 4. Vendor Payments Ledger Table
CREATE TABLE IF NOT EXISTS vendor_payments (
  id TEXT PRIMARY KEY DEFAULT ('vpay-' || gen_random_uuid()::text),
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  legal_entity_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  invoice_reference TEXT NOT NULL,
  payment_reference TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'Bank Transfer',
  status TEXT NOT NULL DEFAULT 'PAID'
    CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'RETURNED', 'CANCELLED')),
  bank_reference TEXT,
  return_reason TEXT
    CHECK (return_reason IS NULL OR return_reason IN (
      'INVALID_ACCOUNT',
      'BANK_REJECTION',
      'ACCOUNT_CLOSED',
      'DUPLICATE_PAYMENT',
      'COMPLIANCE_HOLD',
      'OTHER'
    )),
  returned_date DATE,
  resolution_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON vendor_payments(status);

-- 5. Vendor Employee Assignments Table (Relationship between Vendor & Canonical Employee)
CREATE TABLE IF NOT EXISTS vendor_employee_assignments (
  id TEXT PRIMARY KEY DEFAULT ('vasgn-' || gen_random_uuid()::text),
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  legal_entity_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  deployment_role TEXT,
  contract_reference TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'COMPLETED', 'TERMINATED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_assignment_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_vendor_emp_assign_vendor ON vendor_employee_assignments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_emp_assign_emp ON vendor_employee_assignments(employee_id);

-- 6. Vendor Saved Views Table
CREATE TABLE IF NOT EXISTS vendor_saved_views (
  id TEXT PRIMARY KEY DEFAULT ('vview-' || gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Vendor Audit Logs Table
CREATE TABLE IF NOT EXISTS vendor_audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('vaudit-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  actor_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_audit_vendor ON vendor_audit_logs(vendor_id);
