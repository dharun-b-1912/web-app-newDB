import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

const ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';
const COMP_ID = '2030277f-a6a1-427f-beaf-4fc677a3bae2';
const BRANCH_ID = 'fc1782e6-fb46-47e8-a428-9da95e5a4f6f';

async function seedMasterData() {
  console.log('Seeding Master Data into Supabase...');

  // 1. Company
  const { data: compData, error: compErr } = await supabase.from('companies').upsert({
    id: COMP_ID,
    organization_id: ORG_ID,
    legal_name: 'Joy Corporate Solutions Pvt Ltd',
    trade_name: 'Joy Corporate Solutions',
    company_code: 'JCS-01',
    cin_number: 'U72900TZ2024PTC012345',
    pan_number: 'AAACJ1234F',
    registered_address: 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    postal_code: '641004',
    country: 'India',
    is_headquarters: true,
    is_active: true,
  }, { onConflict: 'id' }).select();
  console.log('Company:', compData, compErr);

  // 2. Branch
  const { data: brData, error: brErr } = await supabase.from('branches').upsert({
    id: BRANCH_ID,
    organization_id: ORG_ID,
    company_id: COMP_ID,
    name: 'Coimbatore Campus (HQ)',
    branch_code: 'CBE-HQ',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    country: 'India',
    timezone: 'Asia/Kolkata',
    is_active: true,
  }, { onConflict: 'id' }).select();
  console.log('Branch:', brData, brErr);

  // 3. Departments
  const { data: deptData, error: deptErr } = await supabase.from('departments').upsert([
    {
      id: '0cdef8b4-014c-4487-895c-cf264824a0da',
      organization_id: ORG_ID,
      company_id: COMP_ID,
      name: 'Engineering & Development',
      code: 'ENG',
      is_active: true,
    },
    {
      id: '70d63528-7aa9-4630-adcc-b7a6194250cd',
      organization_id: ORG_ID,
      company_id: COMP_ID,
      name: 'Human Resources',
      code: 'HR',
      is_active: true,
    }
  ], { onConflict: 'id' }).select();
  console.log('Departments:', deptData, deptErr);

  // 4. Designations
  const { data: desigData, error: desigErr } = await supabase.from('designations').upsert([
    {
      id: 'fd2762cd-b1bb-402e-a7ee-81a80aa0eab7',
      organization_id: ORG_ID,
      company_id: COMP_ID,
      title: 'Senior Software Engineer',
      code: 'SSE',
      grade: 'L4 - Senior',
      is_active: true,
    },
    {
      id: '0dfa6748-c76b-4867-a9f4-59eaf6804a44',
      organization_id: ORG_ID,
      company_id: COMP_ID,
      title: 'HR Operations Specialist',
      code: 'HROS',
      grade: 'L3 - Mid Level',
      is_active: true,
    }
  ], { onConflict: 'id' }).select();
  console.log('Designations:', desigData, desigErr);

  // 5. Work Locations
  const { data: locData, error: locErr } = await supabase.from('work_locations').upsert({
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    organization_id: ORG_ID,
    branch_id: BRANCH_ID,
    name: 'Joy HQ - Coimbatore',
    address_line1: 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004',
    latitude: 11.0168,
    longitude: 76.9558,
    geofence_radius_meters: 200,
    is_geofencing_enabled: true,
    is_active: true,
  }, { onConflict: 'id' }).select();
  console.log('Work Location:', locData, locErr);
}

seedMasterData();
