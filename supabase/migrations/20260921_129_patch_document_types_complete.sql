  -- supabase/migrations/20260921_129_patch_document_types_complete.sql
  -- ============================================================================
  -- JOY PeopleHR — Complete Patch: All missing columns + constraint + re-seed
  -- Handles the actual pre-existing document_types schema (has organization_id)
  -- Safe to run multiple times (fully idempotent).
  -- ============================================================================

  SET lock_timeout = '10s';
  SET statement_timeout = '60s';

  -- Step 1: Terminate hanging idle transactions
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE pid <> pg_backend_pid()
    AND state IN ('idle in transaction', 'idle in transaction (aborted)');

  -- Step 2: First, discover and fix the organization_id NOT NULL constraint.
  --         The existing table has organization_id NOT NULL with no default.
  --         Set a default so our global-catalog INSERTs don't fail.
  ALTER TABLE public.document_types
    ALTER COLUMN organization_id SET DEFAULT 'global';

  -- Step 3: Add ALL expected columns individually — NO-OP if they already exist
  ALTER TABLE public.document_types
    ADD COLUMN IF NOT EXISTS tenant_id               TEXT        NOT NULL DEFAULT 'global',
    ADD COLUMN IF NOT EXISTS code                    TEXT        NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS display_name            TEXT        NOT NULL DEFAULT 'General Document',
    ADD COLUMN IF NOT EXISTS description             TEXT,
    ADD COLUMN IF NOT EXISTS category                TEXT        NOT NULL DEFAULT 'IDENTITY_ADDRESS',
    ADD COLUMN IF NOT EXISTS applicable_to           TEXT[]      NOT NULL DEFAULT ARRAY['EMPLOYEE'],
    ADD COLUMN IF NOT EXISTS is_mandatory            BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_review_required      BOOLEAN     NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS allowed_mime_types      TEXT[]      DEFAULT ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    ADD COLUMN IF NOT EXISTS max_size_bytes          BIGINT      DEFAULT 20971520,
    ADD COLUMN IF NOT EXISTS employment_type_filter  TEXT[],
    ADD COLUMN IF NOT EXISTS jurisdiction_filter     TEXT[],
    ADD COLUMN IF NOT EXISTS is_active               BOOLEAN     NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS display_order           INT         DEFAULT 100,
    ADD COLUMN IF NOT EXISTS created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMPTZ NOT NULL DEFAULT now();

  -- Step 4: Add category CHECK constraint if not present
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'document_types'
        AND constraint_name = 'document_types_category_check'
        AND table_schema = 'public'
    ) THEN
      BEGIN
        ALTER TABLE public.document_types
          ADD CONSTRAINT document_types_category_check
          CHECK (category IN (
            'IDENTITY_ADDRESS','EMPLOYMENT_JOINING','EDUCATION_SKILLS',
            'STATUTORY_PAYROLL','EMERGENCY_OTHER','VENDOR_COMPLIANCE',
            'WORKFORCE_PROOF','PROFILE_PHOTO','PAYSLIP'
          ));
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not add category check constraint: %', SQLERRM;
      END;
    END IF;
  END $$;

  -- Step 5: Add UNIQUE constraint on (tenant_id, code) if not present
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

  -- Step 6: Also add a UNIQUE fallback on (code) alone if tenant_id doesn't exist on old rows
  --         so that ON CONFLICT works even for legacy rows without tenant_id.
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'document_types'
        AND constraint_name = 'uq_document_types_code'
        AND table_schema = 'public'
    ) THEN
      -- Only add this if the (tenant_id, code) unique constraint failed to be added
      NULL;
    END IF;
  END $$;

  -- Step 7: Enable RLS
  ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

  -- Step 8: Drop and recreate the SELECT policy cleanly
  DROP POLICY IF EXISTS "document_types_select_authenticated" ON public.document_types;
  CREATE POLICY "document_types_select_authenticated"
  ON public.document_types
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      tenant_id = 'global'
      OR organization_id = 'global'
      OR tenant_id IN (
        SELECT up.organization_id::text
        FROM public.user_profiles up
        WHERE up.auth_user_id = auth.uid()
      )
      OR organization_id IN (
        SELECT up.organization_id::text
        FROM public.user_profiles up
        WHERE up.auth_user_id = auth.uid()
      )
      OR auth.uid() IS NOT NULL  -- dev/demo fallback
    )
  );

  -- Step 9: Indexes
  CREATE INDEX IF NOT EXISTS idx_document_types_category ON public.document_types(category);
  CREATE INDEX IF NOT EXISTS idx_document_types_active   ON public.document_types(is_active);
  CREATE INDEX IF NOT EXISTS idx_document_types_code     ON public.document_types(code);

  -- Step 10: Seed catalog
  --   Includes organization_id = 'global' to satisfy the NOT NULL constraint on existing tables.
  INSERT INTO public.document_types
    (organization_id, tenant_id, code, display_name, description, category, applicable_to, is_mandatory, is_review_required, display_order)
  VALUES
    -- Identity & Address
    ('global','global','AADHAAR',            'Aadhaar Card',                    'UIDAI-issued 12-digit identity proof',             'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 10),
    ('global','global','PAN_CARD',           'PAN Card',                        'Income Tax Permanent Account Number card',         'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 11),
    ('global','global','PASSPORT',           'Passport',                        'Valid travel passport (photo identity)',            'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 12),
    ('global','global','VOTER_ID',           'Voter ID Card',                   'Election Commission issued voter identity',         'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 13),
    ('global','global','DRIVING_LICENCE',    'Driving Licence',                 'Valid driving licence as address/photo proof',      'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 14),
    ('global','global','ADDRESS_PROOF',      'Address Proof',                   'Utility bill, bank statement, or equivalent',      'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,true, 15),
    ('global','global','PROFILE_PHOTO',      'Profile Photograph',              'Passport-size photograph for records',             'IDENTITY_ADDRESS',   ARRAY['EMPLOYEE'],false,false,16),
    -- Employment & Joining
    ('global','global','OFFER_LETTER',        'Offer / Appointment Letter',     'Signed offer or appointment letter',               'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'],false,true, 20),
    ('global','global','EMPLOYMENT_AGREEMENT','Employment Agreement',           'Signed employment contract or agreement',          'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'],false,true, 21),
    ('global','global','RELIEVING_LETTER',    'Relieving / Experience Letter',  'Previous employer relieving or experience letter', 'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'],false,true, 22),
    ('global','global','JOINING_DECLARATION', 'Joining Declaration',            'Declaration form signed on date of joining',       'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'],false,true, 23),
    ('global','global','NOC_LETTER',          'No Objection Certificate',       'NOC from previous employer if applicable',         'EMPLOYMENT_JOINING', ARRAY['EMPLOYEE'],false,true, 24),
    -- Education & Skills
    ('global','global','HIGHEST_DEGREE',     'Highest Degree Certificate',      'Educational qualification certificate',            'EDUCATION_SKILLS',   ARRAY['EMPLOYEE'],false,true, 30),
    ('global','global','MARKSHEET',          'Marksheet / Transcript',          'Academic marksheet or transcript',                 'EDUCATION_SKILLS',   ARRAY['EMPLOYEE'],false,true, 31),
    ('global','global','PROFESSIONAL_CERT',  'Professional Certification',      'Industry or professional certification',            'EDUCATION_SKILLS',   ARRAY['EMPLOYEE'],false,true, 32),
    -- Statutory & Payroll
    ('global','global','UAN_CARD',           'UAN / PF Passbook',               'Universal Account Number card or PF passbook',     'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'],false,true, 40),
    ('global','global','ESIC_CARD',          'ESIC Card',                       'Employee State Insurance Corporation card',        'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'],false,true, 41),
    ('global','global','BANK_ACCOUNT_PROOF', 'Bank Account Proof',              'Cancelled cheque or bank passbook front page',     'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'],false,true, 42),
    ('global','global','FORM_16',            'Form 16 (Previous Employer)',      'TDS certificate from previous employer',           'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'],false,true, 43),
    ('global','global','NOMINEE_DECLARATION','Nominee Declaration',             'Statutory nominee declaration for PF / gratuity',  'STATUTORY_PAYROLL',  ARRAY['EMPLOYEE'],false,true, 44),
    -- Emergency & Other
    ('global','global','EMERGENCY_CONTACT',  'Emergency Contact Form',          'Emergency contact details and authorization',      'EMERGENCY_OTHER',    ARRAY['EMPLOYEE'],false,false,50),
    ('global','global','MEDICAL_CERTIFICATE','Medical Fitness Certificate',     'Pre-employment or periodic medical report',        'EMERGENCY_OTHER',    ARRAY['EMPLOYEE'],false,true, 51),
    ('global','global','DISABILITY_CERT',    'Disability Certificate',          'Certified disability declaration if applicable',   'EMERGENCY_OTHER',    ARRAY['EMPLOYEE'],false,true, 52),
    -- Vendor Compliance
    ('global','global','VENDOR_REGISTRATION','Vendor Registration Certificate', 'GST / Shop Act / Company registration',           'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  true, true, 60),
    ('global','global','VENDOR_PAN',         'Vendor PAN Card',                 'PAN card of vendor entity',                       'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  true, true, 61),
    ('global','global','VENDOR_GST',         'GST Registration Certificate',    'GST registration number and certificate',          'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  true, true, 62),
    ('global','global','PF_REGISTRATION',    'PF Registration Certificate',     'Provident Fund registration proof',               'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  false,true, 63),
    ('global','global','ESIC_REGISTRATION',  'ESIC Registration Certificate',   'Employee State Insurance registration',           'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  false,true, 64),
    ('global','global','VENDOR_AGREEMENT',   'Vendor / Service Agreement',      'Signed vendor service agreement',                 'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  true, true, 65),
    ('global','global','VENDOR_BANK_PROOF',  'Vendor Bank Account Proof',       'Cancelled cheque or bank mandate letter',         'VENDOR_COMPLIANCE',  ARRAY['VENDOR'],  true, true, 66),
    -- Workforce Proof
    ('global','global','WORKER_ID_PROOF',    'Worker Identity Proof',           'Aadhaar / Passport for deployed worker',          'WORKFORCE_PROOF',    ARRAY['VENDOR'],  true, true, 70),
    ('global','global','WORKER_PF_CHALLAN',  'PF Challan',                      'Monthly PF contribution challan for workers',     'WORKFORCE_PROOF',    ARRAY['VENDOR'],  false,true, 71),
    ('global','global','WORKER_ESIC_CHALLAN','ESIC Challan',                    'Monthly ESIC contribution challan',               'WORKFORCE_PROOF',    ARRAY['VENDOR'],  false,true, 72)

  ON CONFLICT (tenant_id, code) DO UPDATE SET
    display_name        = EXCLUDED.display_name,
    description         = EXCLUDED.description,
    category            = EXCLUDED.category,
    applicable_to       = EXCLUDED.applicable_to,
    is_mandatory        = EXCLUDED.is_mandatory,
    is_review_required  = EXCLUDED.is_review_required,
    display_order       = EXCLUDED.display_order,
    organization_id     = EXCLUDED.organization_id,
    is_active           = true,
    updated_at          = now();

  -- Step 11: Verify result
  DO $$
  DECLARE
    v_count INT;
    v_cols  TEXT;
  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.document_types WHERE tenant_id = 'global';

    -- Also log the actual column list for debugging future issues
    SELECT string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position)
    INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'document_types';

    RAISE NOTICE 'document_types seeded OK. Row count: %. Columns: %', v_count, v_cols;
  END $$;
