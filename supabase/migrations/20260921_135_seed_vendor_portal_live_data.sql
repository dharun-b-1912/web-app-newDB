-- ============================================================================
-- supabase/migrations/20260921_135_seed_vendor_portal_live_data.sql
-- Seeds real database records for Vendor & Manpower Portal
-- Fully dynamic and resilient: inspects actual schema at runtime and populates
-- all existing columns (including contact_email, primary_contact_email, pan_number, etc.)
-- ============================================================================

DO $$
DECLARE
  v_org_id        TEXT;
  v_org_id_uuid   UUID;
  v_vendor_id     TEXT;
  v_contract_id   UUID  := 'b0000001-0000-0000-0000-000000000001';
  v_vendor_code   TEXT  := 'VEN-000001';

  v_cols          TEXT  := '';
  v_vals          TEXT  := '';
  v_org_col_type  TEXT;
  v_vendor_type_def TEXT;
  v_sql           TEXT;
BEGIN
  -- ── 1. Resolve Organisation ──────────────────────────────────────────────────
  SELECT id::text INTO v_org_id
  FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  IF v_org_id IS NULL THEN
    v_org_id := '0c621892-e938-4707-9957-13534ea32c19';
  END IF;
  v_org_id_uuid := v_org_id::uuid;

  -- ── 2. Check if Vendor already exists ───────────────────────────────────────
  IF EXISTS (SELECT 1 FROM public.vendors WHERE vendor_code = v_vendor_code) THEN
    RAISE NOTICE 'Vendor % already exists — skipping vendor insert.', v_vendor_code;
    SELECT id::text INTO v_vendor_id FROM public.vendors WHERE vendor_code = v_vendor_code LIMIT 1;
  ELSE
    -- ── 3. Build Dynamic INSERT for public.vendors based on live columns ───────
    
    -- organization_id (detect if uuid or text)
    SELECT data_type INTO v_org_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'organization_id';

    IF v_org_col_type IS NOT NULL THEN
      v_cols := v_cols || 'organization_id, ';
      IF v_org_col_type = 'uuid' THEN
        v_vals := v_vals || quote_literal(v_org_id) || '::uuid, ';
      ELSE
        v_vals := v_vals || quote_literal(v_org_id) || ', ';
      END IF;
    END IF;

    -- vendor_code
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='vendor_code') THEN
      v_cols := v_cols || 'vendor_code, ';
      v_vals := v_vals || quote_literal(v_vendor_code) || ', ';
    END IF;

    -- legal_name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='legal_name') THEN
      v_cols := v_cols || 'legal_name, ';
      v_vals := v_vals || quote_literal('ABC Workforce & Security Services Pvt Ltd') || ', ';
    END IF;

    -- trade_name / display_name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='trade_name') THEN
      v_cols := v_cols || 'trade_name, ';
      v_vals := v_vals || quote_literal('ABC Security Solutions') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='display_name') THEN
      v_cols := v_cols || 'display_name, ';
      v_vals := v_vals || quote_literal('ABC Security Solutions') || ', ';
    END IF;

    -- vendor_type (check default or enum)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='vendor_type') THEN
      v_cols := v_cols || 'vendor_type, ';
      v_vals := v_vals || quote_literal('MANPOWER_PROVIDER') || ', ';
    END IF;

    -- status
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='status') THEN
      v_cols := v_cols || 'status, ';
      v_vals := v_vals || quote_literal('ACTIVE') || ', ';
    END IF;

    -- pan / pan_number / tax_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='pan') THEN
      v_cols := v_cols || 'pan, ';
      v_vals := v_vals || quote_literal('AABCA1234F') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='pan_number') THEN
      v_cols := v_cols || 'pan_number, ';
      v_vals := v_vals || quote_literal('AABCA1234F') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='tax_id') THEN
      v_cols := v_cols || 'tax_id, ';
      v_vals := v_vals || quote_literal('AABCA1234F') || ', ';
    END IF;

    -- gstin / gst_number
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='gstin') THEN
      v_cols := v_cols || 'gstin, ';
      v_vals := v_vals || quote_literal('33AABCA1234F1Z1') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='gst_number') THEN
      v_cols := v_cols || 'gst_number, ';
      v_vals := v_vals || quote_literal('33AABCA1234F1Z1') || ', ';
    END IF;

    -- Contact Person / Name fields
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='contact_person') THEN
      v_cols := v_cols || 'contact_person, ';
      v_vals := v_vals || quote_literal('Ramesh Kumar') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='contact_name') THEN
      v_cols := v_cols || 'contact_name, ';
      v_vals := v_vals || quote_literal('Ramesh Kumar') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='primary_contact_name') THEN
      v_cols := v_cols || 'primary_contact_name, ';
      v_vals := v_vals || quote_literal('Ramesh Kumar') || ', ';
    END IF;

    -- Contact Email fields (all variations)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='contact_email') THEN
      v_cols := v_cols || 'contact_email, ';
      v_vals := v_vals || quote_literal('ramesh.k@abcsecurity.in') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='primary_contact_email') THEN
      v_cols := v_cols || 'primary_contact_email, ';
      v_vals := v_vals || quote_literal('ramesh.k@abcsecurity.in') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='email') THEN
      v_cols := v_cols || 'email, ';
      v_vals := v_vals || quote_literal('ramesh.k@abcsecurity.in') || ', ';
    END IF;

    -- Contact Phone fields (all variations)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='contact_phone') THEN
      v_cols := v_cols || 'contact_phone, ';
      v_vals := v_vals || quote_literal('+91 98401 23456') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='primary_contact_phone') THEN
      v_cols := v_cols || 'primary_contact_phone, ';
      v_vals := v_vals || quote_literal('+91 98401 23456') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='phone') THEN
      v_cols := v_cols || 'phone, ';
      v_vals := v_vals || quote_literal('+91 98401 23456') || ', ';
    END IF;

    -- Address fields
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='address') THEN
      v_cols := v_cols || 'address, ';
      v_vals := v_vals || quote_literal('Guindy Industrial Estate, Chennai, Tamil Nadu 600032') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='address_line1') THEN
      v_cols := v_cols || 'address_line1, ';
      v_vals := v_vals || quote_literal('Guindy Industrial Estate') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='city') THEN
      v_cols := v_cols || 'city, ';
      v_vals := v_vals || quote_literal('Chennai') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='state') THEN
      v_cols := v_cols || 'state, ';
      v_vals := v_vals || quote_literal('Tamil Nadu') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='postal_code') THEN
      v_cols := v_cols || 'postal_code, ';
      v_vals := v_vals || quote_literal('600032') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='country') THEN
      v_cols := v_cols || 'country, ';
      v_vals := v_vals || quote_literal('India') || ', ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='address_json') THEN
      v_cols := v_cols || 'address_json, ';
      v_vals := v_vals || quote_literal('{"line1":"Guindy Industrial Estate","city":"Chennai","state":"Tamil Nadu","postal_code":"600032"}') || '::jsonb, ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' AND column_name='metadata') THEN
      v_cols := v_cols || 'metadata, ';
      v_vals := v_vals || quote_literal('{}') || '::jsonb, ';
    END IF;

    -- Trim trailing comma and whitespace
    v_cols := rtrim(v_cols, ', ');
    v_vals := rtrim(v_vals, ', ');

    v_sql := 'INSERT INTO public.vendors (' || v_cols || ') VALUES (' || v_vals || ')';
    RAISE NOTICE 'Executing vendor insert SQL: %', v_sql;
    EXECUTE v_sql;

    -- Capture generated vendor ID
    SELECT id::text INTO v_vendor_id
    FROM public.vendors WHERE vendor_code = v_vendor_code LIMIT 1;

    RAISE NOTICE 'Vendor inserted: id=%, code=%', v_vendor_id, v_vendor_code;
  END IF;

  -- Abort dependents if vendor wasn't resolved
  IF v_vendor_id IS NULL THEN
    RAISE WARNING 'Could not resolve vendor id — aborting dependent inserts.';
    RETURN;
  END IF;

  -- ── 4. vendor_company_profiles ─────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='vendor_company_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM public.vendor_company_profiles
                   WHERE vendor_code = v_vendor_code) THEN
      INSERT INTO public.vendor_company_profiles (
        id, organization_id, vendor_code, legal_name, trade_name,
        pan, gstin, msme_number, incorporation_number, company_type,
        esi_registration_number, pf_registration_number,
        bank_account_number, bank_name, bank_ifsc, bank_branch,
        bank_is_verified, bank_verified_at,
        authorized_contact, compliance_contact, status
      ) VALUES (
        v_vendor_id::uuid, v_org_id::text, v_vendor_code,
        'ABC Workforce & Security Services Pvt Ltd', 'ABC Security Solutions',
        'AABCA1234F', '33AABCA1234F1Z1', 'UDYAM-TN-02-0019284',
        'U74999TN2018PTC120481', 'PRIVATE_LIMITED',
        '51000123450001001', 'TN/MAS/0098765/000',
        '50200049281948', 'HDFC Bank Ltd', 'HDFC0001234',
        'Guindy Industrial Estate, Chennai', TRUE, NOW(),
        '{"fullName":"Ramesh Kumar","email":"ramesh.k@abcsecurity.in","phone":"+91 98401 23456","designation":"Managing Director"}'::jsonb,
        '{"fullName":"Priya Sundaram","email":"priya.compliance@abcsecurity.in","phone":"+91 98401 23457"}'::jsonb,
        'ACTIVE'
      );
    END IF;
  END IF;

  -- ── 5. vendor_relationships (v2 multi-tenant link) ─────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='vendor_relationships') THEN
    INSERT INTO public.vendor_relationships (
      organization_id, vendor_id, relationship_code,
      category, service_type, onboarding_status, compliance_status, status
    ) VALUES (
      v_org_id_uuid, v_vendor_id::uuid, 'REL-' || v_vendor_code,
      'Manpower', 'MANPOWER_SUPPLY', 'ACTIVE', 'COMPLIANT', 'ACTIVE'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- ── 6. vendor_site_contracts ───────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='vendor_site_contracts') THEN
    IF NOT EXISTS (SELECT 1 FROM public.vendor_site_contracts WHERE id = v_contract_id) THEN
      INSERT INTO public.vendor_site_contracts (
        id, vendor_id, organization_id, company_id, company_name, site_name,
        contract_code, sow_number, master_po_number, clra_form_v_number,
        max_workforce_capacity, active_workforce_count, service_charge_percentage,
        contract_start_date, contract_end_date, status
      ) VALUES (
        v_contract_id, v_vendor_code, v_org_id::text,
        'comp-joy-che', 'Joy Hospitality Chennai Pvt Ltd',
        'Chennai Central Operations Hub', 'CON-JOY-CHE-2026-01',
        'SOW-SEC-0921', 'PO-2026-8841', 'FORM-V-CHE-0941',
        50, 5, 8.50, '2026-04-01', '2027-03-31', 'ACTIVE'
      );
    END IF;
  END IF;

  -- ── 7. vendor_workers ──────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='vendor_workers') THEN
    -- Ensure all worker columns exist safely
    ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS designation TEXT;
    ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS department TEXT;
    ALTER TABLE public.vendor_workers ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'Unskilled';

    INSERT INTO public.vendor_workers (
      id, vendor_id, organization_id, worker_code,
      first_name, last_name, full_name,
      designation, department, skill_level, status
    ) VALUES
      ('a0000001-0000-0000-0000-000000000001'::uuid, v_vendor_id::uuid, v_org_id_uuid, 'VEN01-EMP01', 'Murugan',   'P',     'Murugan P',   'Security Guard',      'Operations', 'Skilled',        'ACTIVE'),
      ('a0000002-0000-0000-0000-000000000002'::uuid, v_vendor_id::uuid, v_org_id_uuid, 'VEN01-EMP02', 'Anand',     'Kumar', 'Anand Kumar', 'Security Guard',      'Operations', 'Skilled',        'ACTIVE'),
      ('a0000003-0000-0000-0000-000000000003'::uuid, v_vendor_id::uuid, v_org_id_uuid, 'VEN01-EMP03', 'Sangeetha', 'M',     'Sangeetha M', 'Housekeeping Lead',   'Operations', 'Semi-Skilled',   'ACTIVE'),
      ('a0000004-0000-0000-0000-000000000004'::uuid, v_vendor_id::uuid, v_org_id_uuid, 'VEN01-EMP04', 'Vignesh',   'K',     'Vignesh K',   'Facility Assistant',  'Operations', 'Unskilled',      'ACTIVE'),
      ('a0000005-0000-0000-0000-000000000005'::uuid, v_vendor_id::uuid, v_org_id_uuid, 'VEN01-EMP05', 'Selvam',    'R',     'Selvam R',    'Security Supervisor', 'Operations', 'Highly Skilled', 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- ── 8. vendor_daily_ot_records ─────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='vendor_daily_ot_records') THEN
    INSERT INTO public.vendor_daily_ot_records (
      organization_id, vendor_id, client_site_contract_id,
      employee_id, employee_code, employee_name, date,
      shift_hours, actual_worked_hours, potential_ot_hours, approved_ot_hours,
      ot_hourly_rate, ot_payable_amount, approval_status
    ) VALUES (
      v_org_id::text, v_vendor_code, v_contract_id::text,
      'a0000001-0000-0000-0000-000000000001', 'VEN01-EMP01', 'Murugan P',
      CURRENT_DATE - 1, 8.00, 11.00, 3.00, 3.00, 120.00, 360.00, 'PENDING'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- ── 9. vendor_attendance_miss_exceptions ───────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='vendor_attendance_miss_exceptions') THEN
    INSERT INTO public.vendor_attendance_miss_exceptions (
      organization_id, vendor_id, client_site_contract_id, site_name,
      manager_id, manager_name, employee_id, employee_code, employee_name,
      date, exception_type, standard_hours, actual_hours, status
    ) VALUES (
      v_org_id::text, v_vendor_code, v_contract_id::text,
      'Chennai Central Operations Hub',
      'MGR-001', 'Karthik Raja',
      'a0000002-0000-0000-0000-000000000002', 'VEN01-EMP02', 'Anand Kumar',
      CURRENT_DATE - 1, 'MISSING_PUNCH_OUT', 8.00, 4.50, 'OPEN'
    ) ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Migration 135 complete ✓ vendor_id=%', v_vendor_id;
END $$;
