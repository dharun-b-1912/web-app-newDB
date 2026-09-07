-- Seed canonical master data for Joy Corporate Solutions (0c621892-e938-4707-9957-13534ea32c19)
BEGIN;

-- 1. Company
INSERT INTO public.companies (
  id,
  organization_id,
  legal_name,
  trade_name,
  company_code,
  city,
  state,
  postal_code,
  country,
  is_headquarters,
  is_active
) VALUES (
  '2030277f-a6a1-427f-beaf-4fc677a3bae2',
  '0c621892-e938-4707-9957-13534ea32c19',
  'JOY CORPORATE SOLUTIONS PRIVATE LIMITED',
  'Joy Corporate Solutions',
  'CMP-001',
  'Coimbatore',
  'Tamil Nadu',
  '641014',
  'India',
  true,
  true
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 2. Branch
INSERT INTO public.branches (
  id,
  organization_id,
  company_id,
  name,
  branch_code,
  city,
  state,
  country,
  timezone,
  is_active
) VALUES (
  'fc1782e6-fb46-47e8-a428-9da95e5a4f6f',
  '0c621892-e938-4707-9957-13534ea32c19',
  '2030277f-a6a1-427f-beaf-4fc677a3bae2',
  'Coimbatore Headquarters',
  'BR-HQ-01',
  'Coimbatore',
  'Tamil Nadu',
  'India',
  'Asia/Kolkata',
  true
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 3. Department
INSERT INTO public.departments (
  id,
  organization_id,
  company_id,
  name,
  code,
  is_active
) VALUES (
  'd0000000-0000-4000-8000-000000000001',
  '0c621892-e938-4707-9957-13534ea32c19',
  '2030277f-a6a1-427f-beaf-4fc677a3bae2',
  'Engineering & Technology',
  'ENG-01',
  true
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 4. Designation
INSERT INTO public.designations (
  id,
  organization_id,
  company_id,
  title,
  code,
  is_active
) VALUES (
  'd1000000-0000-4000-8000-000000000001',
  '0c621892-e938-4707-9957-13534ea32c19',
  '2030277f-a6a1-427f-beaf-4fc677a3bae2',
  'Senior Software Engineer',
  'DES-01',
  true
) ON CONFLICT (id) DO UPDATE SET is_active = true;

COMMIT;
