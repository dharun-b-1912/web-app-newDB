-- ============================================================================
-- Migration 034: WorkForceOS Offer Management 2.0 & AI Offer Letter Generator
-- Normalized Schema for Structured Compensation, Document Templates,
-- Multi-Tier Approvals, Version History, E-Signature, and Audit Trails
-- ============================================================================

-- 1. Offer Templates Table
CREATE TABLE IF NOT EXISTS offer_templates (
  id TEXT PRIMARY KEY DEFAULT ('tmpl-' || gen_random_uuid()::TEXT),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Standard Tech Offer',
  description TEXT,
  header_html TEXT,
  body_template TEXT NOT NULL,
  footer_html TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_templates_org ON offer_templates(organization_id);

-- 2. Offer Compensation Components Table
CREATE TABLE IF NOT EXISTS offer_compensation_components (
  id TEXT PRIMARY KEY DEFAULT ('comp-' || gen_random_uuid()::TEXT),
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL CHECK (component_type IN ('Basic', 'HRA', 'Special Allowance', 'Employer PF', 'Performance Variable', 'Joining Bonus', 'Gratuity', 'Medical Allowance', 'Other')),
  amount_monthly NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_annual NUMERIC(14,2) NOT NULL DEFAULT 0,
  taxable BOOLEAN DEFAULT TRUE,
  included_in_ctc BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_comp_offer ON offer_compensation_components(offer_id);

-- 3. Offer Benefits Table
CREATE TABLE IF NOT EXISTS offer_benefits (
  id TEXT PRIMARY KEY DEFAULT ('ben-' || gen_random_uuid()::TEXT),
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  benefit_title TEXT NOT NULL,
  benefit_description TEXT,
  coverage_amount NUMERIC(14,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_benefits_offer ON offer_benefits(offer_id);

-- 4. Offer Multi-Tier Approvals Table
CREATE TABLE IF NOT EXISTS offer_approvals (
  id TEXT PRIMARY KEY DEFAULT ('ofr-appr-' || gen_random_uuid()::TEXT),
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  approver_role TEXT NOT NULL CHECK (approver_role IN ('HR Head', 'Finance Controller', 'Executive Leadership', 'Hiring Manager')),
  approver_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  approver_name TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Skipped')),
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_approvals_offer ON offer_approvals(offer_id);

-- 5. Offer Document Versions Table
CREATE TABLE IF NOT EXISTS offer_versions (
  id TEXT PRIMARY KEY DEFAULT ('ver-' || gen_random_uuid()::TEXT),
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  document_title TEXT NOT NULL,
  rendered_html TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_tone TEXT,
  changes_summary TEXT,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_versions_offer ON offer_versions(offer_id);

-- 6. Offer Audit & Activity Logs Table
CREATE TABLE IF NOT EXISTS offer_audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('ofr-audit-' || gen_random_uuid()::TEXT),
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_audit_offer ON offer_audit_logs(offer_id);
