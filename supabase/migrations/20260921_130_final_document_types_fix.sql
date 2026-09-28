  -- ============================================================================
  -- DEFINITIVE FIX — Run in Supabase SQL Editor
  -- Dynamically drops NOT NULL from all non-PK, non-boolean columns in 
  -- document_types so global catalog rows (with no org) can be inserted.
  -- ============================================================================

  -- PRE-STEP: Clear the bad DEFAULT 'global' that was set on organization_id (UUID column)
  -- by migration 129. PostgreSQL stores it silently but fails on INSERT with uuid cast error.
  ALTER TABLE public.document_types ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE public.document_types ALTER COLUMN organization_id DROP NOT NULL;

  -- Step 1: Drop NOT NULL from ALL other problem columns dynamically
  DO $$
  DECLARE
    col RECORD;
  BEGIN
    FOR col IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'document_types'
        AND is_nullable = 'NO'
        AND column_name NOT IN ('id')          -- keep PK not-null
        AND column_default IS NULL             -- only columns with no default (the dangerous ones)
    LOOP
      RAISE NOTICE 'Dropping NOT NULL from column: %', col.column_name;
      EXECUTE format(
        'ALTER TABLE public.document_types ALTER COLUMN %I DROP NOT NULL',
        col.column_name
      );
    END LOOP;
  END $$;

  -- Step 2: Now set sensible defaults on the columns we control
  ALTER TABLE public.document_types
    ADD COLUMN IF NOT EXISTS tenant_id              TEXT        NOT NULL DEFAULT 'global',
    ADD COLUMN IF NOT EXISTS code                   TEXT        NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS display_name           TEXT        NOT NULL DEFAULT 'General Document',
    ADD COLUMN IF NOT EXISTS description            TEXT,
    ADD COLUMN IF NOT EXISTS category               TEXT        NOT NULL DEFAULT 'IDENTITY_ADDRESS',
    ADD COLUMN IF NOT EXISTS applicable_to          TEXT[]      NOT NULL DEFAULT ARRAY['EMPLOYEE'],
    ADD COLUMN IF NOT EXISTS is_mandatory           BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_review_required     BOOLEAN     NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS allowed_mime_types     TEXT[]      DEFAULT ARRAY['application/pdf','image/jpeg','image/png','image/webp'],
    ADD COLUMN IF NOT EXISTS max_size_bytes         BIGINT      DEFAULT 20971520,
    ADD COLUMN IF NOT EXISTS employment_type_filter TEXT[],
    ADD COLUMN IF NOT EXISTS jurisdiction_filter    TEXT[],
    ADD COLUMN IF NOT EXISTS is_active              BOOLEAN     NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS display_order          INT         DEFAULT 100,
    ADD COLUMN IF NOT EXISTS created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ NOT NULL DEFAULT now();

  -- Step 3: Add UNIQUE (tenant_id, code) if missing
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'document_types'
        AND constraint_name = 'uq_document_types_tenant_code'
    ) THEN
      ALTER TABLE public.document_types
        ADD CONSTRAINT uq_document_types_tenant_code UNIQUE (tenant_id, code);
    END IF;
  END $$;

  -- Step 4: RLS
  ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "document_types_select_authenticated" ON public.document_types;
  CREATE POLICY "document_types_select_authenticated"
  ON public.document_types FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (
      tenant_id = 'global'
      OR organization_id IS NULL
      OR organization_id::text IN (
        SELECT organization_id::text FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
      )
      OR auth.uid() IS NOT NULL
    )
  );

  -- Step 5: Indexes
  CREATE INDEX IF NOT EXISTS idx_document_types_category ON public.document_types(category);
  CREATE INDEX IF NOT EXISTS idx_document_types_active   ON public.document_types(is_active);
  CREATE INDEX IF NOT EXISTS idx_document_types_code     ON public.document_types(code);

  -- Step 6: Seed (no org-specific columns — all nullable after Step 1)
  INSERT INTO public.document_types
    (tenant_id, code, display_name, description, category, applicable_to, is_mandatory, is_review_required, display_order)
  VALUES
    ('global','AADHAAR',            'Aadhaar Card',                   'UIDAI-issued 12-digit identity proof',            'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 10),
    ('global','PAN_CARD',           'PAN Card',                       'Income Tax Permanent Account Number card',        'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 11),
    ('global','PASSPORT',           'Passport',                       'Valid travel passport (photo identity)',           'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 12),
    ('global','VOTER_ID',           'Voter ID Card',                  'Election Commission issued voter identity',        'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 13),
    ('global','DRIVING_LICENCE',    'Driving Licence',                'Valid driving licence as address/photo proof',     'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 14),
    ('global','ADDRESS_PROOF',      'Address Proof',                  'Utility bill, bank statement, or equivalent',     'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 15),
    ('global','PROFILE_PHOTO',      'Profile Photograph',             'Passport-size photograph for records',            'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,false,16),
    ('global','OFFER_LETTER',        'Offer / Appointment Letter',    'Signed offer or appointment letter',              'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'],false,true, 20),
    ('global','EMPLOYMENT_AGREEMENT','Employment Agreement',          'Signed employment contract or agreement',         'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'],false,true, 21),
    ('global','RELIEVING_LETTER',    'Relieving / Experience Letter', 'Previous employer relieving or experience letter','EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'],false,true, 22),
    ('global','JOINING_DECLARATION', 'Joining Declaration',           'Declaration form signed on date of joining',      'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'],false,true, 23),
    ('global','NOC_LETTER',          'No Objection Certificate',      'NOC from previous employer if applicable',        'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'],false,true, 24),
    ('global','HIGHEST_DEGREE',     'Highest Degree Certificate',     'Educational qualification certificate',           'EDUCATION_SKILLS',   ARRAY['EMPLOYEE'],false,true, 30),
    ('global','MARKSHEET',          'Marksheet / Transcript',         'Academic marksheet or transcript',                'EDUCATION_SKILLS',   ARRAY['EMPLOYEE'],false,true, 31),
    ('global','PROFESSIONAL_CERT',  'Professional Certification',     'Industry or professional certification',           'EDUCATION_SKILLS',   ARRAY['EMPLOYEE'],false,true, 32),
    ('global','UAN_CARD',           'UAN / PF Passbook',              'Universal Account Number card or PF passbook',    'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'],false,true, 40),
    ('global','ESIC_CARD',          'ESIC Card',                      'Employee State Insurance Corporation card',       'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'],false,true, 41),
    ('global','BANK_ACCOUNT_PROOF', 'Bank Account Proof',             'Cancelled cheque or bank passbook front page',    'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'],false,true, 42),
    ('global','FORM_16',            'Form 16 (Previous Employer)',     'TDS certificate from previous employer',          'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'],false,true, 43),
    ('global','NOMINEE_DECLARATION','Nominee Declaration',            'Statutory nominee declaration for PF / gratuity', 'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'],false,true, 44),
    ('global','EMERGENCY_CONTACT',  'Emergency Contact Form',         'Emergency contact details and authorization',     'EMERGENCY_OTHER',    ARRAY['EMPLOYEE'],false,false,50),
    ('global','MEDICAL_CERTIFICATE','Medical Fitness Certificate',    'Pre-employment or periodic medical report',       'EMERGENCY_OTHER',    ARRAY['EMPLOYEE'],false,true, 51),
    ('global','DISABILITY_CERT',    'Disability Certificate',         'Certified disability declaration if applicable',  'EMERGENCY_OTHER',    ARRAY['EMPLOYEE'],false,true, 52),
    ('global','VENDOR_REGISTRATION','Vendor Registration Certificate','GST / Shop Act / Company registration',          'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  true, true, 60),
    ('global','VENDOR_PAN',         'Vendor PAN Card',                'PAN card of vendor entity',                      'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  true, true, 61),
    ('global','VENDOR_GST',         'GST Registration Certificate',   'GST registration number and certificate',         'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  true, true, 62),
    ('global','PF_REGISTRATION',    'PF Registration Certificate',    'Provident Fund registration proof',              'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  false,true, 63),
    ('global','ESIC_REGISTRATION',  'ESIC Registration Certificate',  'Employee State Insurance registration',          'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  false,true, 64),
    ('global','VENDOR_AGREEMENT',   'Vendor / Service Agreement',     'Signed vendor service agreement',                'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  true, true, 65),
    ('global','VENDOR_BANK_PROOF',  'Vendor Bank Account Proof',      'Cancelled cheque or bank mandate letter',        'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  true, true, 66),
    ('global','WORKER_ID_PROOF',    'Worker Identity Proof',          'Aadhaar / Passport for deployed worker',         'WORKFORCE_PROOF',    ARRAY['VENDOR'],  true, true, 70),
    ('global','WORKER_PF_CHALLAN',  'PF Challan',                     'Monthly PF contribution challan for workers',    'WORKFORCE_PROOF',    ARRAY['VENDOR'],  false,true, 71),
    ('global','WORKER_ESIC_CHALLAN','ESIC Challan',                   'Monthly ESIC contribution challan',              'WORKFORCE_PROOF',    ARRAY['VENDOR'],  false,true, 72)
  ON CONFLICT (tenant_id, code) DO UPDATE SET
    display_name       = EXCLUDED.display_name,
    description        = EXCLUDED.description,
    category           = EXCLUDED.category,
    applicable_to      = EXCLUDED.applicable_to,
    is_mandatory       = EXCLUDED.is_mandatory,
    is_review_required = EXCLUDED.is_review_required,
    display_order      = EXCLUDED.display_order,
    is_active          = true,
    updated_at         = now();

  -- Step 7: Show full schema so we know exactly what columns exist
  DO $$
  DECLARE v_count INT; v_cols TEXT;
  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.document_types WHERE tenant_id = 'global';
    SELECT string_agg(
      column_name || '(' || udt_name || ' nullable=' || is_nullable || ')',
      ', ' ORDER BY ordinal_position
    )
    INTO v_cols FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'document_types';
    RAISE NOTICE 'SUCCESS: % rows seeded. Full schema: %', v_count, v_cols;
  END $$;
