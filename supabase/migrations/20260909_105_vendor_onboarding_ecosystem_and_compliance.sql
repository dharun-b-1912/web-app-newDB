-- supabase/migrations/20260909_105_vendor_onboarding_ecosystem_and_compliance.sql
-- ============================================================================
-- JOY PEOPLEHR — VENDOR ONBOARDING ECOSYSTEM & COMPLIANCE ARCHITECTURE
-- Lifecycle State Machine, Invitations, Configurable Compliance & Multi-Tenant RLS
-- ============================================================================

-- 1. EXTEND VENDORS MASTER WITH CONSTITUTION & COMPLIANCE APPLICABILITY FIELDS
ALTER TABLE public.vendors
    ADD COLUMN IF NOT EXISTS constitution_type VARCHAR(50) DEFAULT 'PRIVATE_LIMITED',
    ADD COLUMN IF NOT EXISTS is_gst_applicable BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS gst_exemption_reason TEXT,
    ADD COLUMN IF NOT EXISTS msme_registered VARCHAR(20) DEFAULT 'NOT_APPLICABLE',
    ADD COLUMN IF NOT EXISTS udyam_registration_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS correction_reason TEXT,
    ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS compliance_completed BOOLEAN DEFAULT FALSE;

-- Ensure constraint for constitution_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_vendors_constitution_type'
    ) THEN
        ALTER TABLE public.vendors
            ADD CONSTRAINT chk_vendors_constitution_type
            CHECK (constitution_type IN ('PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'LLP', 'PARTNERSHIP', 'PROPRIETORSHIP', 'OTHER'));
    END IF;
END$$;

-- 2. VENDOR INVITATIONS TABLE (Company Admin -> Vendor Account Gateway)
CREATE TABLE IF NOT EXISTS public.vendor_invitations (
    id TEXT PRIMARY KEY DEFAULT ('vinv_' || substr(md5(random()::text), 1, 12)),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL,
    company_id TEXT,
    target_email VARCHAR(255) NOT NULL,
    target_phone VARCHAR(50),
    target_name VARCHAR(255) NOT NULL,
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vinv_token ON public.vendor_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_vinv_vendor_status ON public.vendor_invitations(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vinv_org_company ON public.vendor_invitations(organization_id, company_id);

-- 3. AUTO-UPDATING TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_vendor_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_vinv_modtime ON public.vendor_invitations;
CREATE TRIGGER trg_update_vinv_modtime
BEFORE UPDATE ON public.vendor_invitations
FOR EACH ROW EXECUTE FUNCTION update_vendor_timestamp();

-- 4. ROW-LEVEL SECURITY (RLS) POLICIES FOR INVITATIONS & HARDENED VENDOR ACCESS
ALTER TABLE public.vendor_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vinv_tenant_select ON public.vendor_invitations;
DROP POLICY IF EXISTS vinv_tenant_insert ON public.vendor_invitations;
DROP POLICY IF EXISTS vinv_tenant_update ON public.vendor_invitations;

CREATE POLICY vinv_tenant_select ON public.vendor_invitations
    FOR SELECT TO authenticated
    USING (
        organization_id = (auth.jwt() ->> 'organization_id')::TEXT
        OR target_email = (auth.jwt() ->> 'email')::TEXT
    );

CREATE POLICY vinv_tenant_insert ON public.vendor_invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (auth.jwt() ->> 'organization_id')::TEXT
    );

CREATE POLICY vinv_tenant_update ON public.vendor_invitations
    FOR UPDATE TO authenticated
    USING (
        organization_id = (auth.jwt() ->> 'organization_id')::TEXT
        OR target_email = (auth.jwt() ->> 'email')::TEXT
    )
    WITH CHECK (
        organization_id = (auth.jwt() ->> 'organization_id')::TEXT
        OR target_email = (auth.jwt() ->> 'email')::TEXT
    );

-- 5. HARDEN VENDOR ISOLATION POLICIES (Vendor A cannot query Vendor B records)
DROP POLICY IF EXISTS "Vendor admin isolated view" ON public.vendors;
CREATE POLICY "Vendor admin isolated view" ON public.vendors
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() ->> 'vendor_id') IS NULL
        OR id::TEXT = (auth.jwt() ->> 'vendor_id')::TEXT
    );

DO $$
BEGIN
    IF to_regclass('public.vendor_employees') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Vendor admin isolated workforce view" ON public.vendor_employees;
        EXECUTE 'CREATE POLICY "Vendor admin isolated workforce view" ON public.vendor_employees
            FOR SELECT TO authenticated
            USING (
                (auth.jwt() ->> ''vendor_id'') IS NULL
                OR vendor_id::TEXT = (auth.jwt() ->> ''vendor_id'')::TEXT
            )';
    END IF;

    IF to_regclass('public.vendor_workers') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Vendor admin isolated workers view" ON public.vendor_workers;
        EXECUTE 'CREATE POLICY "Vendor admin isolated workers view" ON public.vendor_workers
            FOR SELECT TO authenticated
            USING (
                (auth.jwt() ->> ''vendor_id'') IS NULL
                OR vendor_id::TEXT = (auth.jwt() ->> ''vendor_id'')::TEXT
            )';
    END IF;

    IF to_regclass('public.vendor_invoices') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Vendor admin isolated invoice view" ON public.vendor_invoices;
        EXECUTE 'CREATE POLICY "Vendor admin isolated invoice view" ON public.vendor_invoices
            FOR SELECT TO authenticated
            USING (
                (auth.jwt() ->> ''vendor_id'') IS NULL
                OR vendor_id::TEXT = (auth.jwt() ->> ''vendor_id'')::TEXT
            )';
    END IF;
END$$;

GRANT ALL ON public.vendor_invitations TO authenticated, service_role;
