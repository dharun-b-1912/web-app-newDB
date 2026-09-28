-- supabase/migrations/20260915_115_enterprise_vendor_ecosystem.sql
-- ============================================================================
-- Joy PeopleHR — Complete Two-Sided Vendor Management & Collaboration Ecosystem
-- Establishes:
-- 1. vendors: Independent External Vendor Companies
-- 2. vendor_relationships: Multi-tenant Company <-> Vendor Binding Pivot
-- 3. vendor_users: Vendor Portal Accounts (mapped to auth.users)
-- 4. vendor_workers: Contractor / External Workforce
-- 5. vendor_documents & vendor_document_versions: Versioned Compliance Vault
-- 6. vendor_contracts: SLAs, commercial terms, validity
-- 7. vendor_requests & vendor_request_comments: Two-Way Ticketing System
-- 8. vendor_conversations & vendor_messages: Scoped Enterprise Chat
-- 9. vendor_tasks: Operations & Work Orders
-- 10. vendor_audit_logs: Immutable Audit Trail
-- ============================================================================

-- 1. Vendors (External Business Entity)
CREATE TABLE IF NOT EXISTS public.vendors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code         TEXT UNIQUE,
  legal_name          TEXT NOT NULL,
  display_name        TEXT,
  vendor_type         TEXT DEFAULT 'Company',
  category            TEXT DEFAULT 'General',
  pan_number          TEXT,
  gst_number          TEXT,
  registration_number TEXT,
  email               TEXT,
  phone               TEXT,
  website             TEXT,
  address_json        JSONB DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'OFFBOARDED')),
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Augment existing table if columns don't exist yet
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS vendor_type TEXT DEFAULT 'Company';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS address_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_vendors_code ON public.vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_legal_name ON public.vendors(legal_name);

-- 2. Vendor Relationships (The Multi-Tenant Core Pivot)
CREATE TABLE IF NOT EXISTS public.vendor_relationships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  relationship_code   TEXT,
  category            TEXT DEFAULT 'General',
  service_type        TEXT,
  onboarding_status   TEXT NOT NULL DEFAULT 'INVITED' CHECK (
    onboarding_status IN (
      'DRAFT', 'INVITED', 'ONBOARDING', 'SUBMITTED', 'UNDER_REVIEW', 
      'DOCUMENTS_REQUIRED', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 
      'SUSPENDED', 'EXPIRED', 'OFFBOARDED', 'REJECTED', 'CANCELLED'
    )
  ),
  compliance_status   TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    compliance_status IN ('COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'EXPIRING_SOON', 'EXPIRED', 'PENDING', 'UNDER_REVIEW')
  ),
  contract_status     TEXT DEFAULT 'NONE',
  assigned_manager_id UUID, -- References user_profiles(id)
  internal_notes      TEXT, -- STRICTLY COMPANY-ONLY, never leaked to vendor
  sites_json          JSONB DEFAULT '[]'::jsonb,
  services_json       JSONB DEFAULT '[]'::jsonb,
  valid_from          DATE,
  valid_to            DATE,
  status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'OFFBOARDED')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_org_vendor_relationship UNIQUE (organization_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_vrel_org ON public.vendor_relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_vrel_vendor ON public.vendor_relationships(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vrel_onboarding ON public.vendor_relationships(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_vrel_compliance ON public.vendor_relationships(compliance_status);

-- 3. Vendor Users (Portal Accounts)
CREATE TABLE IF NOT EXISTS public.vendor_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  auth_user_id    UUID UNIQUE, -- References auth.users(id)
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'VENDOR_ADMIN' CHECK (
    role IN ('VENDOR_ADMIN', 'VENDOR_HR', 'VENDOR_FINANCE', 'VENDOR_SUPERVISOR', 'VENDOR_WORKER')
  ),
  status          TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'DEACTIVATED')),
  phone           TEXT,
  avatar_url      TEXT,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_vendor_user_email UNIQUE (vendor_id, email)
);

CREATE INDEX IF NOT EXISTS idx_vendor_users_vendor ON public.vendor_users(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_users_auth ON public.vendor_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_users_email ON public.vendor_users(email);

-- 4. Vendor Workers (External Contractor Workforce)
CREATE TABLE IF NOT EXISTS public.vendor_workers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  organization_id     UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  worker_code         TEXT,
  first_name          TEXT,
  last_name           TEXT,
  full_name           TEXT,
  email               TEXT,
  phone               TEXT,
  designation         TEXT,
  department          TEXT,
  skill_level         TEXT DEFAULT 'Unskilled',
  work_location       TEXT,
  supervisor_id       UUID,
  emergency_contact   TEXT,
  compliance_status   TEXT DEFAULT 'PENDING' CHECK (compliance_status IN ('COMPLIANT', 'PENDING', 'EXPIRED', 'NON_COMPLIANT')),
  status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'PENDING_DOCS', 'PENDING_VERIFICATION', 'SUSPENDED', 'INACTIVE', 'OFFBOARDED')
  ),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'Unskilled';
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS work_location TEXT;
ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_vendor_workers_vendor ON public.vendor_workers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_workers_org ON public.vendor_workers(organization_id);

-- 5. Vendor Documents & Versioning
CREATE TABLE IF NOT EXISTS public.vendor_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  relationship_id     UUID REFERENCES public.vendor_relationships(id) ON DELETE CASCADE,
  document_type       TEXT NOT NULL,
  document_number     TEXT,
  issue_date          DATE,
  expiry_date         DATE,
  file_path           TEXT NOT NULL,
  file_name           TEXT NOT NULL,
  mime_type           TEXT,
  file_size           BIGINT,
  version             INT NOT NULL DEFAULT 1,
  is_current          BOOLEAN NOT NULL DEFAULT TRUE,
  verification_status TEXT NOT NULL DEFAULT 'UNDER_REVIEW' CHECK (
    verification_status IN ('NOT_REQUIRED', 'REQUIRED', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED')
  ),
  rejection_reason    TEXT,
  verified_by         UUID,
  verified_at         TIMESTAMPTZ,
  uploaded_by         UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vdocs_vendor ON public.vendor_documents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vdocs_rel ON public.vendor_documents(relationship_id);
CREATE INDEX IF NOT EXISTS idx_vdocs_type ON public.vendor_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_vdocs_status ON public.vendor_documents(verification_status);

-- 6. Vendor Contracts
CREATE TABLE IF NOT EXISTS public.vendor_contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id     UUID NOT NULL REFERENCES public.vendor_relationships(id) ON DELETE CASCADE,
  contract_number     TEXT NOT NULL,
  contract_type       TEXT DEFAULT 'Master Service Agreement',
  title               TEXT NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  renewal_date        DATE,
  value               NUMERIC(14, 2),
  currency            TEXT DEFAULT 'INR',
  payment_terms       TEXT DEFAULT 'Net 30',
  sla_details         TEXT,
  scope_of_work       TEXT,
  file_path           TEXT,
  status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'TERMINATED', 'RENEWED')
  ),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vcontracts_rel ON public.vendor_contracts(relationship_id);
CREATE INDEX IF NOT EXISTS idx_vcontracts_status ON public.vendor_contracts(status);

-- 7. Vendor Requests (Two-Way Ticketing)
CREATE TABLE IF NOT EXISTS public.vendor_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id     UUID NOT NULL REFERENCES public.vendor_relationships(id) ON DELETE CASCADE,
  request_number      TEXT UNIQUE,
  created_by_user_id  UUID NOT NULL,
  created_by_type     TEXT NOT NULL CHECK (created_by_type IN ('COMPANY', 'VENDOR')),
  assigned_to_user_id UUID,
  category            TEXT NOT NULL DEFAULT 'General',
  priority            TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  subject             TEXT NOT NULL,
  description         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'OPEN' CHECK (
    status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_FOR_VENDOR', 'WAITING_FOR_COMPANY', 'RESOLVED', 'CLOSED', 'CANCELLED')
  ),
  due_date            DATE,
  attachments_json    JSONB DEFAULT '[]'::jsonb,
  resolved_at         TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vrequests_rel ON public.vendor_requests(relationship_id);
CREATE INDEX IF NOT EXISTS idx_vrequests_status ON public.vendor_requests(status);

CREATE TABLE IF NOT EXISTS public.vendor_request_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.vendor_requests(id) ON DELETE CASCADE,
  author_user_id  UUID NOT NULL,
  author_type     TEXT NOT NULL CHECK (author_type IN ('COMPANY', 'VENDOR')),
  author_name     TEXT,
  comment_body    TEXT NOT NULL,
  attachments_json JSONB DEFAULT '[]'::jsonb,
  is_internal     BOOLEAN NOT NULL DEFAULT FALSE, -- Internal notes hidden from vendor
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vrcomments_req ON public.vendor_request_comments(request_id);

-- 8. Vendor Conversations & Messages (Relationship-Scoped Chat)
CREATE TABLE IF NOT EXISTS public.vendor_conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id     UUID NOT NULL REFERENCES public.vendor_relationships(id) ON DELETE CASCADE,
  title               TEXT NOT NULL DEFAULT 'General Discussion',
  topic               TEXT DEFAULT 'General',
  last_message_at     TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vconv_rel ON public.vendor_conversations(relationship_id);
CREATE INDEX IF NOT EXISTS idx_vconv_last_msg ON public.vendor_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.vendor_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES public.vendor_conversations(id) ON DELETE CASCADE,
  sender_user_id      UUID NOT NULL,
  sender_type         TEXT NOT NULL CHECK (sender_type IN ('COMPANY', 'VENDOR')),
  sender_name         TEXT NOT NULL,
  body                TEXT NOT NULL,
  message_type        TEXT NOT NULL DEFAULT 'TEXT' CHECK (
    message_type IN ('TEXT', 'FILE', 'SYSTEM', 'REQUEST_REFERENCE', 'DOCUMENT_REFERENCE')
  ),
  attachments_json    JSONB DEFAULT '[]'::jsonb,
  read_by_json        JSONB DEFAULT '[]'::jsonb, -- Array of user IDs who have read
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  edited_at           TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vmsg_conv ON public.vendor_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_vmsg_created ON public.vendor_messages(created_at ASC);

-- 9. Vendor Tasks & Work Orders
CREATE TABLE IF NOT EXISTS public.vendor_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id     UUID NOT NULL REFERENCES public.vendor_relationships(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  priority            TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status              TEXT NOT NULL DEFAULT 'TODO' CHECK (
    status IN ('TODO', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'VERIFIED', 'CANCELLED')
  ),
  assigned_worker_id  UUID REFERENCES public.vendor_workers(id) ON DELETE SET NULL,
  due_date            DATE,
  verified_by         UUID,
  verified_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vtasks_rel ON public.vendor_tasks(relationship_id);
CREATE INDEX IF NOT EXISTS idx_vtasks_status ON public.vendor_tasks(status);

-- 10. Vendor Audit Logs (Immutable History)
CREATE TABLE IF NOT EXISTS public.vendor_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID,
  vendor_id       UUID,
  organization_id UUID,
  actor_user_id   UUID,
  actor_name      TEXT,
  actor_type      TEXT NOT NULL CHECK (actor_type IN ('COMPANY', 'VENDOR', 'SYSTEM')),
  action          TEXT NOT NULL,
  old_values      JSONB DEFAULT '{}'::jsonb,
  new_values      JSONB DEFAULT '{}'::jsonb,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaudit_rel ON public.vendor_audit_logs(relationship_id);
CREATE INDEX IF NOT EXISTS idx_vaudit_vendor ON public.vendor_audit_logs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vaudit_created ON public.vendor_audit_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Vendors RLS:
-- Company users can view vendors linked via relationships to their organization
DROP POLICY IF EXISTS "Company users can view associated vendors" ON public.vendors;
CREATE POLICY "Company users can view associated vendors"
ON public.vendors FOR SELECT TO authenticated
USING (
  id IN (
    SELECT vr.vendor_id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
  )
  OR id IN (
    SELECT vu.vendor_id FROM public.vendor_users vu
    WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
  )
);

-- 2. Vendor Relationships RLS:
DROP POLICY IF EXISTS "Users can view authorized vendor relationships" ON public.vendor_relationships;
CREATE POLICY "Users can view authorized vendor relationships"
ON public.vendor_relationships FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'Active'
  )
  OR vendor_id IN (
    SELECT vu.vendor_id FROM public.vendor_users vu
    WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
  )
);

-- 3. Vendor Documents RLS:
DROP POLICY IF EXISTS "Authorized users can view vendor documents" ON public.vendor_documents;
CREATE POLICY "Authorized users can view vendor documents"
ON public.vendor_documents FOR SELECT TO authenticated
USING (
  vendor_id IN (
    SELECT vu.vendor_id FROM public.vendor_users vu
    WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
  )
  OR relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
  )
);

-- 4. Vendor Conversations & Messages RLS:
DROP POLICY IF EXISTS "Participants can view vendor conversations" ON public.vendor_conversations;
CREATE POLICY "Participants can view vendor conversations"
ON public.vendor_conversations FOR SELECT TO authenticated
USING (
  relationship_id IN (
    SELECT vr.id FROM public.vendor_relationships vr
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
    OR vr.vendor_id IN (
      SELECT vu.vendor_id FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
    )
  )
);

DROP POLICY IF EXISTS "Participants can view vendor messages" ON public.vendor_messages;
CREATE POLICY "Participants can view vendor messages"
ON public.vendor_messages FOR SELECT TO authenticated
USING (
  conversation_id IN (
    SELECT vc.id FROM public.vendor_conversations vc
    JOIN public.vendor_relationships vr ON vc.relationship_id = vr.id
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
    OR vr.vendor_id IN (
      SELECT vu.vendor_id FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
    )
  )
);

DROP POLICY IF EXISTS "Participants can send vendor messages" ON public.vendor_messages;
CREATE POLICY "Participants can send vendor messages"
ON public.vendor_messages FOR INSERT TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT vc.id FROM public.vendor_conversations vc
    JOIN public.vendor_relationships vr ON vc.relationship_id = vr.id
    WHERE vr.organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'Active'
    )
    OR vr.vendor_id IN (
      SELECT vu.vendor_id FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status = 'ACTIVE'
    )
  )
);
