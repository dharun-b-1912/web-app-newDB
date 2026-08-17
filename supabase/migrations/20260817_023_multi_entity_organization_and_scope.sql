-- ============================================================
-- WorkforceOS Enterprise HRMS — Multi-Entity Organization & Scope
-- Migration: 20260817_023_multi_entity_organization_and_scope.sql
-- ============================================================

-- 1. Ensure organizations table and columns exist
CREATE TABLE IF NOT EXISTS organizations (
  id               TEXT PRIMARY KEY DEFAULT ('org-' || gen_random_uuid()::text),
  name             TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add any columns if organizations table already existed
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'INR';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Starter';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mrr NUMERIC(12,2) DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS health TEXT DEFAULT 'Healthy';

-- Add unique constraint on slug if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_slug_key'
  ) THEN 
    ALTER TABLE organizations ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
  END IF; 
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Companies / Legal Entities
CREATE TABLE IF NOT EXISTS companies (
  id                        TEXT PRIMARY KEY DEFAULT ('comp-' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_name                TEXT NOT NULL,
  trade_name                TEXT,
  statutory_registration_no TEXT,
  tax_id                    TEXT,
  country                   TEXT DEFAULT 'India',
  city                      TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add legal entity columns if companies table already existed
ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 3. Organization Memberships (User <-> Customer Organization)
CREATE TABLE IF NOT EXISTS organization_memberships (
  id              TEXT PRIMARY KEY DEFAULT ('mem-' || gen_random_uuid()::text),
  user_id         TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id         TEXT NOT NULL,
  status          TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Invited', 'Revoked')),
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_org_membership'
  ) THEN 
    ALTER TABLE organization_memberships ADD CONSTRAINT uq_user_org_membership UNIQUE (user_id, organization_id);
  END IF; 
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Membership Legal Entity Scope (Multi-Entity Authorization)
CREATE TABLE IF NOT EXISTS membership_legal_entities (
  id              TEXT PRIMARY KEY DEFAULT ('mle-' || gen_random_uuid()::text),
  membership_id   TEXT NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
  legal_entity_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_membership_legal_entity'
  ) THEN 
    ALTER TABLE membership_legal_entities ADD CONSTRAINT uq_membership_legal_entity UNIQUE (membership_id, legal_entity_id);
  END IF; 
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Context Switch & Authorization Audit Log
CREATE TABLE IF NOT EXISTS audit_context_logs (
  id              TEXT PRIMARY KEY DEFAULT ('ctx-log-' || gen_random_uuid()::text),
  actor_id        TEXT NOT NULL,
  actor_name      TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  legal_entity_id TEXT,
  action          TEXT NOT NULL,
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  details         TEXT,
  before_state    JSONB,
  after_state     JSONB
);

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_companies_org ON companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON organization_memberships(role_id);
CREATE INDEX IF NOT EXISTS idx_mle_membership ON membership_legal_entities(membership_id);
CREATE INDEX IF NOT EXISTS idx_mle_legal_entity ON membership_legal_entities(legal_entity_id);
CREATE INDEX IF NOT EXISTS idx_employees_org_comp ON employees(organization_id, company_id);
CREATE INDEX IF NOT EXISTS idx_audit_ctx_org ON audit_context_logs(organization_id);

-- 7. Seed Authoritative Customer Organizations & Legal Entities
INSERT INTO organizations (id, name, slug, status, plan, default_currency, timezone)
VALUES 
  ('org-joy-01', 'Joy Corporate Solutions', 'joy-corporate-solutions', 'Active', 'Enterprise', 'INR', 'Asia/Kolkata')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status;

INSERT INTO companies (id, organization_id, legal_name, trade_name, statutory_registration_no, tax_id, country, city, currency, timezone, status)
VALUES 
  ('cmp-joy-01', 'org-joy-01', 'Joy Corporate Solutions Pvt Ltd', 'Joy Corporate India', 'U72200TZ2020PTC034567', '33AABCJ1234F1Z5', 'India', 'Coimbatore', 'INR', 'Asia/Kolkata', 'Active'),
  ('cmp-joy-02', 'org-joy-01', 'Joy Global Technologies Inc', 'Joy Global USA', 'EIN-84-9876543', 'US-TAX-98765', 'United States', 'New York', 'USD', 'America/New_York', 'Active')
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  legal_name = EXCLUDED.legal_name,
  country = EXCLUDED.country,
  currency = EXCLUDED.currency,
  status = EXCLUDED.status;
