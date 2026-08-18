-- ============================================================================
-- Migration 030: WorkForceOS Enterprise Document & E-Signature Security Engine 2.0
-- Production-Grade Multi-Tenant Document Repository, Versioning, E-Sign & Audit
-- ============================================================================

-- 1. Document Categories Table
CREATE TABLE IF NOT EXISTS document_categories (
  id TEXT PRIMARY KEY DEFAULT ('doc-cat-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_cat_org ON document_categories(organization_id);

-- 2. Document Type Master Table
CREATE TABLE IF NOT EXISTS document_type_master (
  id TEXT PRIMARY KEY DEFAULT ('doc-type-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  category_id TEXT REFERENCES document_categories(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  allowed_subject_types TEXT[] NOT NULL DEFAULT ARRAY['employee'],
  allowed_file_types TEXT[] NOT NULL DEFAULT ARRAY['application/pdf', 'image/jpeg', 'image/png'],
  max_size_bytes BIGINT DEFAULT 10485760,
  requires_expiry BOOLEAN DEFAULT FALSE,
  requires_verification BOOLEAN DEFAULT TRUE,
  requires_signature BOOLEAN DEFAULT FALSE,
  default_classification TEXT NOT NULL DEFAULT 'restricted'
    CHECK (default_classification IN ('public_internal', 'internal', 'confidential', 'highly_confidential', 'restricted')),
  retention_period_years INT DEFAULT 7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE document_type_master ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE document_type_master ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_type_org ON document_type_master(organization_id);

-- 3. Document Folders Table
CREATE TABLE IF NOT EXISTS document_folders (
  id TEXT PRIMARY KEY DEFAULT ('doc-fld-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  parent_folder_id TEXT REFERENCES document_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE document_folders ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE document_folders ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_folders_org ON document_folders(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_folders_subject ON document_folders(subject_type, subject_id);

-- 4. Document Master Table
CREATE TABLE IF NOT EXISTS document_master (
  id TEXT PRIMARY KEY DEFAULT ('doc-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  legal_entity_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  document_type_code TEXT NOT NULL,
  folder_id TEXT REFERENCES document_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  document_number TEXT,
  subject_type TEXT NOT NULL,
  subject_id TEXT,
  subject_name TEXT,
  current_version_id TEXT,
  current_version_number INT DEFAULT 1,
  classification TEXT NOT NULL DEFAULT 'restricted'
    CHECK (classification IN ('public_internal', 'internal', 'confidential', 'highly_confidential', 'restricted')),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'rejected', 'expired')),
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  expiry_date DATE,
  reminder_days INT[] DEFAULT ARRAY[90, 60, 30, 7],
  is_encrypted BOOLEAN DEFAULT TRUE,
  is_template BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE document_master ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE document_master ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_master_org ON document_master(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_master_type ON document_master(document_type_code);
CREATE INDEX IF NOT EXISTS idx_doc_master_subject ON document_master(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_doc_master_verification ON document_master(verification_status);
CREATE INDEX IF NOT EXISTS idx_doc_master_expiry ON document_master(expiry_date);

-- 5. Document Versions Table
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY DEFAULT ('doc-ver-' || gen_random_uuid()::text),
  document_id TEXT NOT NULL REFERENCES document_master(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_name TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  encryption_algorithm TEXT DEFAULT 'AES-GCM-256',
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  version_notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON document_versions(document_id);

-- 6. Document Shares Table
CREATE TABLE IF NOT EXISTS document_shares (
  id TEXT PRIMARY KEY DEFAULT ('doc-shr-' || gen_random_uuid()::text),
  document_id TEXT NOT NULL REFERENCES document_master(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  share_type TEXT NOT NULL DEFAULT 'user'
    CHECK (share_type IN ('user', 'role', 'external_link')),
  grantee_id TEXT,
  grantee_email TEXT,
  permission TEXT NOT NULL DEFAULT 'view'
    CHECK (permission IN ('view', 'download', 'manage')),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  max_downloads INT,
  download_count INT DEFAULT 0,
  watermark_enabled BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_shares_doc ON document_shares(document_id);

-- 7. E-Signature Requests & Participants Tables
CREATE TABLE IF NOT EXISTS esign_requests (
  id TEXT PRIMARY KEY DEFAULT ('esg-req-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  document_id TEXT NOT NULL REFERENCES document_master(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'in_progress', 'completed', 'declined', 'expired', 'cancelled')),
  signing_order_type TEXT NOT NULL DEFAULT 'parallel'
    CHECK (signing_order_type IN ('parallel', 'sequential')),
  due_date TIMESTAMPTZ,
  certificate_path TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE esign_requests ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE esign_requests ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_esign_requests_org ON esign_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_esign_requests_doc ON esign_requests(document_id);

CREATE TABLE IF NOT EXISTS esign_participants (
  id TEXT PRIMARY KEY DEFAULT ('esg-part-' || gen_random_uuid()::text),
  request_id TEXT NOT NULL REFERENCES esign_requests(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL DEFAULT 'employee'
    CHECK (signer_type IN ('employee', 'candidate', 'vendor', 'authorized_signatory', 'witness')),
  signer_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  signing_order INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'viewed', 'signed', 'declined')),
  signature_type TEXT
    CHECK (signature_type IN ('draw', 'type', 'upload', 'aadhaar_esign', 'dsc_token', 'digital_cert')),
  signature_image_path TEXT,
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  declined_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_esign_parts_req ON esign_participants(request_id);

-- 8. Document Audit Logs Table
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('doc-aud-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  document_id TEXT REFERENCES document_master(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN (
      'created', 'viewed', 'downloaded', 'updated', 'verified', 'rejected',
      'shared', 'share_revoked', 'esign_requested', 'signed', 'signature_declined',
      'archived', 'deleted', 'exported'
    )),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE document_audit_logs ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE document_audit_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_doc_aud_org ON document_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_aud_doc ON document_audit_logs(document_id);

-- SQL Aggregation View
DROP VIEW IF EXISTS v_document_summary CASCADE;
CREATE OR REPLACE VIEW v_document_summary AS
SELECT
  d.id AS document_id,
  COALESCE(d.organization_id, d.tenant_id, 'org-joy-01') AS organization_id,
  d.title,
  d.document_type_code,
  d.classification,
  d.verification_status,
  d.subject_type,
  d.subject_name,
  d.expiry_date,
  d.created_at
FROM document_master d;
