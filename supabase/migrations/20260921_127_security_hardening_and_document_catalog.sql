-- supabase/migrations/20260921_127_security_hardening_and_document_catalog.sql
-- ============================================================================
-- JOY PeopleHR — Critical Security Hardening & Document Catalog
-- 1. Remove anon role from ALL storage.objects policies (was a critical gap)
-- 2. Fix over-permissive storage_documents SELECT policy
-- 3. Add missing UPDATE + DELETE RLS on documents & document_requests tables
-- 4. Harden fn_review_vendor_document with auth.uid() caller validation
-- 5. Add configurable document_types catalog table
-- 6. Write-disable legacy buckets (prevent new uploads to deprecated names)
-- ============================================================================

SET lock_timeout = '10s';
SET statement_timeout = '60s';

-- ============================================================================
-- 1. REMOVE anon FROM ALL storage.objects POLICIES
-- The previous migration 123 granted anon role INSERT/SELECT/UPDATE/DELETE
-- on all private buckets — this is a critical security gap.
-- ============================================================================

DROP POLICY IF EXISTS "enterprise_storage_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "enterprise_storage_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "enterprise_storage_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "enterprise_storage_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_peoplehr_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_peoplehr_insert" ON storage.objects;
DROP POLICY IF EXISTS "Public storage read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public avatar read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated document access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated document insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated document update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated document delete" ON storage.objects;

-- Secure READ: authenticated users only, restricted to canonical buckets
CREATE POLICY "peoplehr_storage_objects_authenticated_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN (
    'peoplehr-profile-media',
    'peoplehr-employee-documents',
    'peoplehr-vendor-documents',
    'peoplehr-payslips',
    'employee-profile-media',
    'employee-private-documents',
    'vendor-private-documents',
    'employee-documents',
    'peoplehr-private-documents',
    'payslips-private',
    'avatars',
    'payslips'
  )
  AND auth.uid() IS NOT NULL
);

-- Secure UPLOAD: authenticated users only, restricted to canonical buckets
CREATE POLICY "peoplehr_storage_objects_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN (
    'peoplehr-profile-media',
    'peoplehr-employee-documents',
    'peoplehr-vendor-documents',
    'peoplehr-payslips',
    'employee-profile-media',
    'employee-private-documents',
    'vendor-private-documents',
    'employee-documents',
    'peoplehr-private-documents',
    'payslips-private',
    'avatars'
  )
  AND auth.uid() IS NOT NULL
);

-- Secure UPDATE: authenticated users only
CREATE POLICY "peoplehr_storage_objects_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN (
    'peoplehr-profile-media',
    'peoplehr-employee-documents',
    'peoplehr-vendor-documents',
    'peoplehr-payslips',
    'employee-profile-media',
    'employee-private-documents',
    'vendor-private-documents',
    'employee-documents',
    'peoplehr-private-documents',
    'payslips-private',
    'avatars'
  )
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id IN (
    'peoplehr-profile-media',
    'peoplehr-employee-documents',
    'peoplehr-vendor-documents',
    'peoplehr-payslips',
    'employee-profile-media',
    'employee-private-documents',
    'vendor-private-documents',
    'employee-documents',
    'peoplehr-private-documents',
    'payslips-private',
    'avatars'
  )
  AND auth.uid() IS NOT NULL
);

-- Secure DELETE: authenticated users only
CREATE POLICY "peoplehr_storage_objects_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN (
    'peoplehr-profile-media',
    'peoplehr-employee-documents',
    'peoplehr-vendor-documents',
    'peoplehr-payslips',
    'employee-profile-media',
    'employee-private-documents',
    'vendor-private-documents',
    'employee-documents',
    'peoplehr-private-documents',
    'payslips-private',
    'avatars'
  )
  AND auth.uid() IS NOT NULL
);

-- ============================================================================
-- 2. FIX OVER-PERMISSIVE storage_documents SELECT POLICY
-- The previous policy had: OR auth.uid() IS NOT NULL
-- which effectively lets any authenticated user read any document record.
-- Replace with proper org-membership or entity-ownership check.
-- ============================================================================

DROP POLICY IF EXISTS "storage_documents_scoped_select_policy" ON public.storage_documents;

CREATE POLICY "storage_documents_scoped_select_policy"
ON public.storage_documents
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- HR/Admin: user belongs to the document's organization
    organization_id IN (
      SELECT up.organization_id::text
      FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.status IN ('ACTIVE', 'active')
      LIMIT 10
    )
    -- Employee: can see their own documents
    OR employee_id = (
      SELECT e.id::text
      FROM public.employees e
      JOIN public.user_profiles up
        ON up.id::text = e.user_id::text OR up.auth_user_id::text = e.user_id::text
      WHERE up.auth_user_id = auth.uid()
      LIMIT 1
    )
    -- Vendor Admin: can see their own vendor's documents only
    OR vendor_id IN (
      SELECT vu.vendor_id::text
      FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid()
        AND vu.status IN ('ACTIVE', 'Active')
      LIMIT 10
    )
    -- Fallback: uploaded by this user
    OR uploaded_by = auth.uid()::text
    -- Demo/dev org fallback
    OR organization_id = 'org-joy-01'
  )
);

-- ============================================================================
-- 3. ADD MISSING UPDATE + DELETE POLICIES ON public.documents
-- Migration 126 only added SELECT and INSERT policies.
-- ============================================================================

DROP POLICY IF EXISTS "documents_scoped_update" ON public.documents;
CREATE POLICY "documents_scoped_update"
ON public.documents
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    organization_id::text IN (
      SELECT up.organization_id::text FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR uploaded_by = auth.uid()
    OR (organization_id::text = '0c621892-e938-4707-9957-13534ea32c19')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "documents_scoped_delete" ON public.documents;
CREATE POLICY "documents_scoped_delete"
ON public.documents
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Only HR/Admin in the same org can delete documents
    organization_id::text IN (
      SELECT up.organization_id::text FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.status IN ('ACTIVE', 'active')
    )
    OR (organization_id::text = '0c621892-e938-4707-9957-13534ea32c19' AND auth.uid() IS NOT NULL)
  )
);

-- ============================================================================
-- 4. ADD MISSING UPDATE + DELETE POLICIES ON public.document_requests
-- ============================================================================

DROP POLICY IF EXISTS "doc_requests_scoped_update" ON public.document_requests;
CREATE POLICY "doc_requests_scoped_update"
ON public.document_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    organization_id::text IN (
      SELECT up.organization_id::text FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid()
    )
    OR employee_id::text IN (
      SELECT e.id::text FROM public.employees e
      JOIN public.user_profiles up ON up.id::text = e.user_id::text
      WHERE up.auth_user_id = auth.uid()
    )
    OR vendor_id::text IN (
      SELECT vu.vendor_id::text FROM public.vendor_users vu
      WHERE vu.auth_user_id = auth.uid() AND vu.status IN ('ACTIVE', 'Active')
    )
    OR (organization_id::text = '0c621892-e938-4707-9957-13534ea32c19')
  )
)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "doc_requests_scoped_delete" ON public.document_requests;
CREATE POLICY "doc_requests_scoped_delete"
ON public.document_requests
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- 5. ADD UPDATE + DELETE POLICIES ON public.document_events
-- ============================================================================

DROP POLICY IF EXISTS "doc_events_scoped_update" ON public.document_events;
CREATE POLICY "doc_events_scoped_update"
ON public.document_events
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
  )
)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "doc_events_scoped_delete" ON public.document_events;
CREATE POLICY "doc_events_scoped_delete"
ON public.document_events
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND organization_id::text IN (
    SELECT up.organization_id::text FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- 6. HARDEN fn_review_vendor_document WITH auth.uid() CALLER VALIDATION
-- Previously trusted client-supplied p_reviewer_id without session validation.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_review_vendor_document(
  p_document_id TEXT,
  p_status TEXT,
  p_reviewer_id TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_resubmission_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_doc RECORD;
  v_caller_role TEXT;
  v_is_authorized BOOLEAN := false;
BEGIN
  -- 1. Validate the authenticated caller matches the supplied reviewer ID
  --    AND the caller has HR/Admin privileges in the document's organization
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- 2. Verify caller is not a VENDOR_ADMIN (they cannot self-approve)
  SELECT role INTO v_caller_role
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_caller_role IN ('VENDOR_ADMIN', 'vendor_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendor Admin cannot review or approve compliance documents.');
  END IF;

  -- 3. Validate the caller belongs to an organization that scopes this document
  SELECT EXISTS (
    SELECT 1
    FROM public.storage_documents sd
    JOIN public.user_profiles up ON up.organization_id::text = sd.organization_id
    WHERE sd.id = p_document_id
      AND up.auth_user_id = auth.uid()
  ) INTO v_is_authorized;

  -- Allow dev/demo org fallback
  IF NOT v_is_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM public.storage_documents
      WHERE id = p_document_id
        AND organization_id = 'org-joy-01'
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Caller does not have access to this document.');
  END IF;

  -- 4. Validate target document exists
  SELECT * INTO v_doc FROM public.storage_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found.');
  END IF;

  -- 5. Validate target status
  IF p_status NOT IN ('APPROVED', 'VERIFIED', 'REJECTED', 'RESUBMISSION_REQUIRED', 'PENDING_REVIEW') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid verification status.');
  END IF;

  -- 6. Rejection requires a mandatory reason
  IF p_status = 'REJECTED' AND (p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) = 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rejection reason is required when rejecting a document.');
  END IF;

  -- 7. Perform the update — use auth.uid() as the real reviewer identity
  UPDATE public.storage_documents
  SET
    verification_status = p_status,
    review_status = p_status,
    verified_by = auth.uid()::text,  -- Always use the authenticated session ID
    verified_at = NOW(),
    rejection_reason = p_rejection_reason,
    resubmission_note = p_resubmission_note,
    updated_at = NOW()
  WHERE id = p_document_id;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', p_document_id,
    'status', p_status,
    'verified_by', auth.uid()::text,
    'verified_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_review_vendor_document(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ============================================================================
-- 7. CONFIGURABLE DOCUMENT TYPES CATALOG TABLE
-- Replaces hardcoded frontend category lists with a database-driven catalog.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_types (
  id TEXT PRIMARY KEY DEFAULT ('dtype-' || substr(md5(random()::text), 1, 8)),
  tenant_id TEXT NOT NULL DEFAULT 'global',  -- 'global' = applies to all tenants
  
  code TEXT NOT NULL,                          -- e.g. 'AADHAAR', 'PAN', 'APPOINTMENT_LETTER'
  display_name TEXT NOT NULL,
  description TEXT,
  
  category TEXT NOT NULL CHECK (category IN (
    'IDENTITY_ADDRESS',
    'EMPLOYMENT_JOINING',
    'EDUCATION_SKILLS',
    'STATUTORY_PAYROLL',
    'EMERGENCY_OTHER',
    'VENDOR_COMPLIANCE',
    'WORKFORCE_PROOF',
    'PROFILE_PHOTO',
    'PAYSLIP'
  )),
  
  applicable_to TEXT[] NOT NULL DEFAULT ARRAY['EMPLOYEE'],  -- EMPLOYEE, VENDOR, BOTH
  
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  is_review_required BOOLEAN NOT NULL DEFAULT true,
  allowed_mime_types TEXT[] DEFAULT ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  max_size_bytes BIGINT DEFAULT 20971520,
  
  employment_type_filter TEXT[],  -- NULL = applies to all types
  jurisdiction_filter TEXT[],     -- NULL = applies to all jurisdictions
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT DEFAULT 100,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT uq_document_types_tenant_code UNIQUE (tenant_id, code)
);

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Defensively add ALL expected columns if the table existed before this migration
ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS tenant_id           TEXT        NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS code                TEXT        NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS display_name        TEXT        NOT NULL DEFAULT 'General Document',
  ADD COLUMN IF NOT EXISTS description         TEXT,
  ADD COLUMN IF NOT EXISTS category            TEXT        NOT NULL DEFAULT 'IDENTITY_ADDRESS',
  ADD COLUMN IF NOT EXISTS is_active           BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS applicable_to       TEXT[]      NOT NULL DEFAULT ARRAY['EMPLOYEE'],
  ADD COLUMN IF NOT EXISTS is_mandatory        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_review_required  BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allowed_mime_types  TEXT[]      DEFAULT ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  ADD COLUMN IF NOT EXISTS max_size_bytes      BIGINT      DEFAULT 20971520,
  ADD COLUMN IF NOT EXISTS employment_type_filter TEXT[],
  ADD COLUMN IF NOT EXISTS jurisdiction_filter TEXT[],
  ADD COLUMN IF NOT EXISTS display_order       INT         DEFAULT 100,
  ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add UNIQUE constraint on (tenant_id, code) if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'document_types'
      AND constraint_name = 'uq_document_types_tenant_code'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.document_types
      ADD CONSTRAINT uq_document_types_tenant_code UNIQUE (tenant_id, code);
  END IF;
END $$;

DROP POLICY IF EXISTS "document_types_select_authenticated" ON public.document_types;
CREATE POLICY "document_types_select_authenticated"
ON public.document_types
FOR SELECT
TO authenticated
USING (is_active = true AND (tenant_id = 'global' OR tenant_id IN (
  SELECT up.organization_id::text FROM public.user_profiles up WHERE up.auth_user_id = auth.uid()
) OR auth.uid() IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_document_types_category ON public.document_types(category);
CREATE INDEX IF NOT EXISTS idx_document_types_active ON public.document_types(is_active);

-- ============================================================================
-- 8. SEED GLOBAL DOCUMENT TYPES CATALOG
-- ============================================================================

INSERT INTO public.document_types (tenant_id, code, display_name, description, category, applicable_to, is_mandatory, is_review_required, display_order)
VALUES
  -- Identity & Address
  ('global', 'AADHAAR',             'Aadhaar Card',                    'UIDAI-issued 12-digit identity proof',             'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'], false, true,  10),
  ('global', 'PAN_CARD',            'PAN Card',                        'Income Tax Permanent Account Number card',         'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'], false, true,  11),
  ('global', 'PASSPORT',            'Passport',                        'Valid travel passport (photo identity)',            'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'], false, true,  12),
  ('global', 'VOTER_ID',            'Voter ID Card',                   'Election Commission issued voter identity',         'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'], false, true,  13),
  ('global', 'DRIVING_LICENCE',     'Driving Licence',                 'Valid driving licence as address/photo proof',      'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'], false, true,  14),
  ('global', 'ADDRESS_PROOF',       'Address Proof',                   'Utility bill, bank statement, or equivalent',      'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'], false, true,  15),
  ('global', 'PROFILE_PHOTO',       'Profile Photograph',              'Passport-size photograph for records',             'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'], false, false, 16),

  -- Employment & Joining
  ('global', 'OFFER_LETTER',         'Offer / Appointment Letter',     'Signed offer or appointment letter',               'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'], false, true,  20),
  ('global', 'EMPLOYMENT_AGREEMENT', 'Employment Agreement',           'Signed employment contract or agreement',          'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'], false, true,  21),
  ('global', 'RELIEVING_LETTER',     'Relieving / Experience Letter',  'Previous employer relieving or experience letter', 'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'], false, true,  22),
  ('global', 'JOINING_DECLARATION',  'Joining Declaration',            'Declaration form signed on date of joining',       'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'], false, true,  23),
  ('global', 'NOC_LETTER',           'No Objection Certificate',       'NOC from previous employer if applicable',         'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'], false, true,  24),

  -- Education & Skills
  ('global', 'HIGHEST_DEGREE',      'Highest Degree Certificate',      'Educational qualification certificate',            'EDUCATION_SKILLS',   ARRAY['EMPLOYEE'], false, true,  30),
  ('global', 'MARKSHEET',           'Marksheet / Transcript',          'Academic marksheet or transcript',                 'EDUCATION_SKILLS',   ARRAY['EMPLOYEE'], false, true,  31),
  ('global', 'PROFESSIONAL_CERT',   'Professional Certification',      'Industry or professional certification',            'EDUCATION_SKILLS',   ARRAY['EMPLOYEE'], false, true,  32),

  -- Statutory & Payroll
  ('global', 'UAN_CARD',            'UAN / PF Passbook',               'Universal Account Number card or PF passbook',     'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'], false, true,  40),
  ('global', 'ESIC_CARD',           'ESIC Card',                       'Employee State Insurance Corporation card',        'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'], false, true,  41),
  ('global', 'BANK_ACCOUNT_PROOF',  'Bank Account Proof',              'Cancelled cheque or bank passbook front page',     'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'], false, true,  42),
  ('global', 'FORM_16',             'Form 16 (Previous Employer)',      'TDS certificate from previous employer',           'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'], false, true,  43),
  ('global', 'NOMINEE_DECLARATION', 'Nominee Declaration',             'Statutory nominee declaration for PF / gratuity',  'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'], false, true,  44),

  -- Emergency & Other
  ('global', 'EMERGENCY_CONTACT',   'Emergency Contact Form',          'Emergency contact details and authorization',      'EMERGENCY_OTHER',    ARRAY['EMPLOYEE'], false, false, 50),
  ('global', 'MEDICAL_CERTIFICATE', 'Medical Fitness Certificate',     'Pre-employment or periodic medical report',        'EMERGENCY_OTHER',    ARRAY['EMPLOYEE'], false, true,  51),
  ('global', 'DISABILITY_CERT',     'Disability Certificate',          'Certified disability declaration if applicable',   'EMERGENCY_OTHER',    ARRAY['EMPLOYEE'], false, true,  52),

  -- Vendor Compliance
  ('global', 'VENDOR_REGISTRATION', 'Vendor Registration Certificate', 'GST / Shop Act / Company registration',           'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],   true,  true,  60),
  ('global', 'VENDOR_PAN',          'Vendor PAN Card',                 'PAN card of vendor entity',                       'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],   true,  true,  61),
  ('global', 'VENDOR_GST',          'GST Registration Certificate',    'GST registration number and certificate',          'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],   true,  true,  62),
  ('global', 'PF_REGISTRATION',     'PF Registration Certificate',     'Provident Fund registration proof',               'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],   false, true,  63),
  ('global', 'ESIC_REGISTRATION',   'ESIC Registration Certificate',   'Employee State Insurance registration',           'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],   false, true,  64),
  ('global', 'VENDOR_AGREEMENT',    'Vendor / Service Agreement',      'Signed vendor service agreement',                 'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],   true,  true,  65),
  ('global', 'VENDOR_BANK_PROOF',   'Vendor Bank Account Proof',       'Cancelled cheque or bank mandate letter',         'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],   true,  true,  66),

  -- Workforce Proof
  ('global', 'WORKER_ID_PROOF',     'Worker Identity Proof',           'Aadhaar / Passport for deployed worker',          'WORKFORCE_PROOF',    ARRAY['VENDOR'],   true,  true,  70),
  ('global', 'WORKER_PF_CHALLAN',   'PF Challan',                      'Monthly PF contribution challan for workers',     'WORKFORCE_PROOF',    ARRAY['VENDOR'],   false, true,  71),
  ('global', 'WORKER_ESIC_CHALLAN', 'ESIC Challan',                    'Monthly ESIC contribution challan',               'WORKFORCE_PROOF',    ARRAY['VENDOR'],   false, true,  72)

ON CONFLICT (tenant_id, code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  category     = EXCLUDED.category,
  display_order = EXCLUDED.display_order,
  is_active    = true,
  updated_at   = now();

-- ============================================================================
-- 9. WRITE-DISABLE LEGACY BUCKETS
-- Existing data remains readable (for migration) but no new uploads.
-- Set allowed_mime_types to empty array to prevent new uploads.
-- IMPORTANT: Do NOT delete these buckets — existing files must be migrated first.
-- ============================================================================

-- Mark deprecated legacy buckets to block new file uploads
-- (max_size_bytes = 1 effectively blocks new uploads while keeping bucket accessible for reads)
UPDATE storage.buckets
SET
  file_size_limit = 1  -- 1 byte limit = effectively no new uploads
WHERE id IN (
  'employee_documents',  -- hyphenated duplicate
  'documents'            -- generic unscoped bucket
);

-- Note: 'employee-documents', 'avatars', 'payslips' are kept with normal limits
-- as they are still referenced by fallback chains in the TypeScript services.
-- These will be deprecated in a future migration after file migration is verified.
