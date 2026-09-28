-- supabase/migrations/20260923_139_vendor_portal_user_provisioning.sql
-- ============================================================================
-- Joy PeopleHR — Vendor Portal Login & Two-Way HR Communication Provisioning
-- Targeted Email: testvendor@gmail.com
-- Targeted UUID: 240a7f7d-ec41-4251-b78f-3e781264dd92
-- ============================================================================

BEGIN;

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure core tables exist & safely add missing columns BEFORE PL/pgSQL execution
CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.vendors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code TEXT,
  legal_name  TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS trade_name TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS msme_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS primary_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS compliance_contact JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.vendor_relationships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  vendor_id       UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendor_relationships ADD COLUMN IF NOT EXISTS relationship_code TEXT;
ALTER TABLE public.vendor_relationships ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.vendor_relationships ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'MANPOWER_SUPPLY';
ALTER TABLE public.vendor_relationships ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'INVITED';
ALTER TABLE public.vendor_relationships ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.vendor_relationships ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'NONE';
ALTER TABLE public.vendor_relationships ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE public.vendor_relationships ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.vendor_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendor_users ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.vendor_users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.vendor_users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.vendor_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'VENDOR_ADMIN';
ALTER TABLE public.vendor_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.vendor_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.vendor_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID,
  organization_id UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS relationship_id UUID;
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS request_number TEXT;
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'COMPANY';
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS created_by_type TEXT DEFAULT 'COMPANY';
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'GENERAL';
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM';
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'OPEN';

-- Safely drop NOT NULL constraints on vendor_requests columns if they exist
DO $$ 
BEGIN 
  ALTER TABLE public.vendor_requests ALTER COLUMN relationship_id DROP NOT NULL;
  ALTER TABLE public.vendor_requests ALTER COLUMN created_by DROP NOT NULL;
  ALTER TABLE public.vendor_requests ALTER COLUMN created_by_user_id DROP NOT NULL;
  ALTER TABLE public.vendor_requests ALTER COLUMN created_by_type DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.vendor_request_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendor_request_comments ADD COLUMN IF NOT EXISTS request_id UUID;
ALTER TABLE public.vendor_request_comments ADD COLUMN IF NOT EXISTS author_user_id UUID;
ALTER TABLE public.vendor_request_comments ADD COLUMN IF NOT EXISTS author_type TEXT DEFAULT 'COMPANY';
ALTER TABLE public.vendor_request_comments ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE public.vendor_request_comments ADD COLUMN IF NOT EXISTS comment_body TEXT;
ALTER TABLE public.vendor_request_comments ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'COMPANY';
ALTER TABLE public.vendor_request_comments ADD COLUMN IF NOT EXISTS created_by_type TEXT DEFAULT 'COMPANY';
ALTER TABLE public.vendor_request_comments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.vendor_request_comments ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

DO $$ 
BEGIN 
  ALTER TABLE public.vendor_request_comments ALTER COLUMN author_user_id DROP NOT NULL;
  ALTER TABLE public.vendor_request_comments ALTER COLUMN author_type DROP NOT NULL;
  ALTER TABLE public.vendor_request_comments ALTER COLUMN created_by DROP NOT NULL;
  ALTER TABLE public.vendor_request_comments ALTER COLUMN created_by_user_id DROP NOT NULL;
  ALTER TABLE public.vendor_request_comments ALTER COLUMN created_by_type DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Execute Provisioning Block
DO $$
DECLARE
  v_org_id UUID;
  v_vendor_id UUID := '240a7f7d-ec41-4251-b78f-3e781264dd92'::uuid;
  v_auth_user_id UUID := '240a7f7d-ec41-4251-b78f-3e781264dd92'::uuid;
  v_vendor_email TEXT := 'testvendor@gmail.com';
  v_rel_id UUID;
  v_req_id UUID;
BEGIN
  -- Get or Create Organization
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  IF v_org_id IS NULL THEN
    v_org_id := '00000000-0000-0000-0000-000000000001'::uuid;
    INSERT INTO public.organizations (id, name, legal_name, domain, status, created_at, updated_at)
    VALUES (
      v_org_id,
      'Joy Corporate Solutions',
      'Joy Corporate Solutions Pvt Ltd',
      'joypeoplehr.com',
      'ACTIVE',
      NOW(),
      NOW()
    );
  ELSE
    UPDATE public.organizations
    SET name = COALESCE(name, 'Joy Corporate Solutions'),
        status = 'ACTIVE',
        updated_at = NOW()
    WHERE id = v_org_id;
  END IF;

  -- 3a. Upsert Vendor Entity in `vendors`
  IF EXISTS (SELECT 1 FROM public.vendors WHERE id = v_vendor_id OR email = v_vendor_email OR vendor_code = 'VND-TEST-001') THEN
    UPDATE public.vendors
    SET organization_id = COALESCE(public.vendors.organization_id, v_org_id),
        legal_name = 'Test Manpower Solutions Pvt Ltd',
        display_name = 'Test Vendor',
        email = v_vendor_email,
        contact_email = v_vendor_email,
        contact_person = 'Test Vendor Admin',
        contact_phone = '+91-9876543210',
        status = 'ACTIVE',
        updated_at = NOW()
    WHERE id = v_vendor_id OR email = v_vendor_email OR vendor_code = 'VND-TEST-001';
  ELSE
    INSERT INTO public.vendors (
      id,
      organization_id,
      vendor_code,
      legal_name,
      display_name,
      trade_name,
      vendor_type,
      category,
      pan_number,
      gst_number,
      email,
      contact_email,
      contact_person,
      contact_phone,
      phone,
      primary_contact,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_vendor_id,
      v_org_id,
      'VND-TEST-001',
      'Test Manpower Solutions Pvt Ltd',
      'Test Vendor',
      'Test Vendor Enterprises',
      'MANPOWER_PROVIDER',
      'General',
      'ABCDE1234F',
      '27ABCDE1234F1Z5',
      v_vendor_email,
      v_vendor_email,
      'Test Vendor Admin',
      '+91-9876543210',
      '+91-9876543210',
      jsonb_build_object('name', 'Test Vendor Admin', 'email', v_vendor_email, 'phone', '+91-9876543210'),
      'ACTIVE',
      NOW(),
      NOW()
    );
  END IF;

  -- 3b. Upsert Vendor <-> Company Relationship & Retrieve v_rel_id
  SELECT id INTO v_rel_id FROM public.vendor_relationships WHERE organization_id = v_org_id AND vendor_id = v_vendor_id LIMIT 1;
  IF v_rel_id IS NOT NULL THEN
    UPDATE public.vendor_relationships
    SET onboarding_status = 'APPROVED',
        compliance_status = 'COMPLIANT',
        status = 'ACTIVE',
        updated_at = NOW()
    WHERE id = v_rel_id;
  ELSE
    v_rel_id := gen_random_uuid();
    INSERT INTO public.vendor_relationships (
      id,
      organization_id,
      vendor_id,
      relationship_code,
      category,
      service_type,
      onboarding_status,
      compliance_status,
      contract_status,
      status,
      valid_from,
      created_at,
      updated_at
    )
    VALUES (
      v_rel_id,
      v_org_id,
      v_vendor_id,
      'VREL-TEST-001',
      'General',
      'MANPOWER_SUPPLY',
      'APPROVED',
      'COMPLIANT',
      'ACTIVE',
      'ACTIVE',
      CURRENT_DATE,
      NOW(),
      NOW()
    );
  END IF;

  -- 3c. Upsert Vendor Portal Account in `vendor_users`
  IF EXISTS (SELECT 1 FROM public.vendor_users WHERE (vendor_id = v_vendor_id AND email = v_vendor_email) OR auth_user_id = v_auth_user_id) THEN
    UPDATE public.vendor_users
    SET organization_id = v_org_id,
        auth_user_id = v_auth_user_id,
        role = 'VENDOR_ADMIN',
        status = 'ACTIVE',
        updated_at = NOW()
    WHERE (vendor_id = v_vendor_id AND email = v_vendor_email) OR auth_user_id = v_auth_user_id;
  ELSE
    INSERT INTO public.vendor_users (
      vendor_id,
      organization_id,
      auth_user_id,
      email,
      full_name,
      role,
      status,
      phone,
      created_at,
      updated_at
    )
    VALUES (
      v_vendor_id,
      v_org_id,
      v_auth_user_id,
      v_vendor_email,
      'Test Vendor Admin',
      'VENDOR_ADMIN',
      'ACTIVE',
      '+91-9876543210',
      NOW(),
      NOW()
    );
  END IF;

  -- 3d. Upsert User Profile in `user_profiles` for Role Resolution
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE email = v_vendor_email OR auth_user_id = v_auth_user_id) THEN
    UPDATE public.user_profiles
    SET auth_user_id = v_auth_user_id,
        organization_id = v_org_id,
        vendor_id = v_vendor_id,
        role = 'Vendor Admin',
        status = 'ACTIVE',
        updated_at = NOW()
    WHERE email = v_vendor_email OR auth_user_id = v_auth_user_id;
  ELSE
    INSERT INTO public.user_profiles (
      id,
      auth_user_id,
      organization_id,
      vendor_id,
      email,
      full_name,
      phone,
      role,
      status,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_auth_user_id,
      v_org_id,
      v_vendor_id,
      v_vendor_email,
      'Test Vendor Admin',
      '+91-9876543210',
      'Vendor Admin',
      'ACTIVE',
      NOW(),
      NOW()
    );
  END IF;

  -- 3e. Upsert Auth Account in Supabase `auth.users`
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth_user_id OR LOWER(email) = LOWER(v_vendor_email)) THEN
      UPDATE auth.users
      SET email = v_vendor_email,
          encrypted_password = crypt('Vendor@123456', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
          raw_user_meta_data = jsonb_build_object('full_name', 'Test Vendor Admin', 'role', 'Vendor Admin', 'vendor_id', v_vendor_id),
          updated_at = NOW()
      WHERE id = v_auth_user_id OR LOWER(email) = LOWER(v_vendor_email);
    ELSE
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at
      )
      VALUES (
        v_auth_user_id,
        '00000000-0000-0000-0000-000000000000'::uuid,
        v_vendor_email,
        crypt('Vendor@123456', gen_salt('bf')),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', 'Test Vendor Admin', 'role', 'Vendor Admin', 'vendor_id', v_vendor_id),
        'authenticated',
        'authenticated',
        NOW(),
        NOW()
      );
    END IF;

    -- Ensure Auth Identity
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
      IF EXISTS (SELECT 1 FROM auth.identities WHERE id = v_auth_user_id OR user_id = v_auth_user_id) THEN
        UPDATE auth.identities
        SET identity_data = jsonb_build_object('sub', v_auth_user_id::text, 'email', v_vendor_email),
            updated_at = NOW()
        WHERE id = v_auth_user_id OR user_id = v_auth_user_id;
      ELSE
        INSERT INTO auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        )
        VALUES (
          v_auth_user_id,
          v_auth_user_id,
          jsonb_build_object('sub', v_auth_user_id::text, 'email', v_vendor_email),
          'email',
          NOW(),
          NOW(),
          NOW()
        );
      END IF;
    END IF;
  END IF;

  -- 3f. Provision Two-Way HR Request Ticket & Initial Comments
  SELECT id INTO v_req_id FROM public.vendor_requests WHERE vendor_id = v_vendor_id LIMIT 1;
  IF v_req_id IS NULL THEN
    v_req_id := gen_random_uuid();
    INSERT INTO public.vendor_requests (
      id,
      vendor_id,
      organization_id,
      relationship_id,
      request_number,
      sender_type,
      created_by_type,
      created_by,
      created_by_user_id,
      category,
      priority,
      subject,
      description,
      status,
      due_date,
      created_at,
      updated_at
    )
    VALUES (
      v_req_id,
      v_vendor_id,
      v_org_id,
      v_rel_id,
      'REQ-VND-001',
      'COMPANY',
      'COMPANY',
      v_auth_user_id,
      v_auth_user_id,
      'COMPLIANCE',
      'HIGH',
      'Monthly Statutory Compliance & Manpower Attendance Desk',
      'Dear Vendor, Please review and upload your monthly ESI/PF challan documents and verify worker attendance logs for the current payroll cycle.',
      'OPEN',
      CURRENT_DATE + INTERVAL '7 days',
      NOW(),
      NOW()
    );

    -- Company HR Comment
    INSERT INTO public.vendor_request_comments (
      request_id,
      author_user_id,
      author_type,
      author_name,
      comment_body,
      sender_type,
      created_by_type,
      created_by,
      created_by_user_id,
      created_at
    )
    VALUES (
      v_req_id,
      v_auth_user_id,
      'COMPANY',
      'Joy Corporate Solutions HR',
      'Welcome to Joy PeopleHR Vendor Collaboration Hub! Please respond to this request once your ESI/PF return receipts are attached.',
      'COMPANY',
      'COMPANY',
      v_auth_user_id,
      v_auth_user_id,
      NOW()
    );

    -- Vendor Response Comment
    INSERT INTO public.vendor_request_comments (
      request_id,
      author_user_id,
      author_type,
      author_name,
      comment_body,
      sender_type,
      created_by_type,
      created_by,
      created_by_user_id,
      created_at
    )
    VALUES (
      v_req_id,
      v_auth_user_id,
      'VENDOR',
      'Test Vendor Admin',
      'Acknowledged. We are reviewing the attendance roster and will submit the compliance challans within 2 business days.',
      'VENDOR',
      'VENDOR',
      v_auth_user_id,
      v_auth_user_id,
      NOW() + INTERVAL '5 minutes'
    );
  END IF;

END $$;

-- 4. Configure Row Level Security (RLS) Policies
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_request_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users access vendors" ON public.vendors;
CREATE POLICY "Allow authenticated users access vendors" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon users select vendors" ON public.vendors;
CREATE POLICY "Allow anon users select vendors" ON public.vendors FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated users access vendor_users" ON public.vendor_users;
CREATE POLICY "Allow authenticated users access vendor_users" ON public.vendor_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon users select vendor_users" ON public.vendor_users;
CREATE POLICY "Allow anon users select vendor_users" ON public.vendor_users FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated users access vendor_requests" ON public.vendor_requests;
CREATE POLICY "Allow authenticated users access vendor_requests" ON public.vendor_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users access vendor_request_comments" ON public.vendor_request_comments;
CREATE POLICY "Allow authenticated users access vendor_request_comments" ON public.vendor_request_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
