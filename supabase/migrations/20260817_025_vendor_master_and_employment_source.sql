-- ============================================================
-- WorkForceOS Migration 025: Vendor Master & Employment Sourcing
-- ============================================================

-- 1. Vendors / Manpower Providers Table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  vendor_code VARCHAR(50) NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  vendor_type VARCHAR(50) NOT NULL DEFAULT 'MANPOWER_PROVIDER' 
    CHECK (vendor_type IN ('MANPOWER_PROVIDER', 'RECRUITMENT_AGENCY', 'CONTRACTOR', 'SERVICE_PROVIDER', 'OTHER')),
  registration_number VARCHAR(100),
  tax_id VARCHAR(100),
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  country VARCHAR(100) DEFAULT 'India',
  state VARCHAR(100),
  city VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Under Review', 'Suspended', 'Terminated')),
  bank_name VARCHAR(255),
  account_name VARCHAR(255),
  account_number_masked VARCHAR(50),
  ifsc_code VARCHAR(50),
  swift_code VARCHAR(50),
  payment_terms VARCHAR(100) DEFAULT 'Net 30',
  currency VARCHAR(10) DEFAULT 'INR',
  payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
  contract_start DATE,
  contract_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for vendor code per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_org_code ON vendors(organization_id, vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_org_status ON vendors(organization_id, status);

-- 2. Vendor Documents Table
CREATE TABLE IF NOT EXISTS vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  expiry_date DATE,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED'
    CHECK (verification_status IN ('UPLOADED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_docs_vendor ON vendor_documents(vendor_id);

-- 3. Vendor Payments & Transactions Table
CREATE TABLE IF NOT EXISTS vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100),
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PROCESSED'
    CHECK (payment_status IN ('PENDING', 'PROCESSED', 'RETURNED', 'FAILED')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_reason TEXT,
  returned_date DATE,
  bank_reference VARCHAR(100),
  resolution_status VARCHAR(50) DEFAULT 'NONE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON vendor_payments(vendor_id);

-- 4. Alter employees table to add employment sourcing & vendor relationship
ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS employment_source VARCHAR(50) DEFAULT 'DIRECT'
    CHECK (employment_source IN ('DIRECT', 'VENDOR', 'MANPOWER_PROVIDER', 'CONTRACT', 'TEMPORARY', 'INTERN', 'CONSULTANT')),
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_employee_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vendor_contract_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vendor_start_date DATE,
  ADD COLUMN IF NOT EXISTS vendor_end_date DATE;

CREATE INDEX IF NOT EXISTS idx_employees_source ON employees(employment_source);
CREATE INDEX IF NOT EXISTS idx_employees_vendor ON employees(vendor_id);

-- 5. Seed Authoritative Initial Vendors
INSERT INTO vendors (
  id, organization_id, vendor_code, legal_name, trade_name, vendor_type,
  registration_number, tax_id, contact_person, email, phone,
  country, state, city, status, bank_name, account_name, account_number_masked,
  ifsc_code, payment_terms, contract_start, contract_end
) VALUES 
(
  'e2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'VND-001',
  'ABC Workforce Solutions Pvt Ltd',
  'ABC Workforce',
  'MANPOWER_PROVIDER',
  'U74999TN2020PTC134567',
  '33AABCW1234F1Z5',
  'Ramesh Chandran',
  'contracts@abcworkforce.in',
  '+91 98400 11223',
  'India', 'Tamil Nadu', 'Chennai',
  'Active',
  'ICICI Bank Ltd',
  'ABC Workforce Solutions Pvt Ltd',
  '•••• •••• 8821',
  'ICIC0001234',
  'Net 30',
  '2025-01-01',
  '2026-12-31'
),
(
  'e2000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'VND-002',
  'Apex Technical Staffing India LLP',
  'Apex Staffing',
  'RECRUITMENT_AGENCY',
  'AAB-1234',
  '33AAPEX5678G1Z9',
  'Swaminathan V',
  'accounts@apexstaffing.com',
  '+91 98840 55667',
  'India', 'Tamil Nadu', 'Coimbatore',
  'Active',
  'HDFC Bank Ltd',
  'Apex Technical Staffing India LLP',
  '•••• •••• 4410',
  'HDFC0000456',
  'Net 15',
  '2025-06-01',
  '2027-05-31'
)
ON CONFLICT (organization_id, vendor_code) DO UPDATE SET
  legal_name = EXCLUDED.legal_name,
  status = EXCLUDED.status;

-- 6. Seed Sample Vendor Documents
INSERT INTO vendor_documents (
  id, vendor_id, document_type, document_name, storage_path, expiry_date, verification_status, uploaded_by
) VALUES 
(
  'd3000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  'Master Service Agreement (MSA)',
  'ABC_Workforce_MSA_2025_2026.pdf',
  'vendors/vnd-001/contracts/msa_2025.pdf',
  '2026-12-31',
  'VERIFIED',
  'Hari Priya (HR Head)'
),
(
  'd3000000-0000-0000-0000-000000000002',
  'e2000000-0000-0000-0000-000000000001',
  'Labor License (Form V)',
  'ABC_TN_Labor_License_2026.pdf',
  'vendors/vnd-001/compliance/labor_license.pdf',
  '2027-03-31',
  'VERIFIED',
  'Hari Priya (HR Head)'
),
(
  'd3000000-0000-0000-0000-000000000003',
  'e2000000-0000-0000-0000-000000000001',
  'Statutory ESI & PF Registration',
  'ABC_PF_ESI_Compliance_Cert.pdf',
  'vendors/vnd-001/compliance/pf_esi.pdf',
  '2026-12-31',
  'VERIFIED',
  'Hari Priya (HR Head)'
)
ON CONFLICT (id) DO NOTHING;
