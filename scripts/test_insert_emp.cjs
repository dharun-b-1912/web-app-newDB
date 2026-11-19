const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testInsertOne() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const compId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';
  const branchId = 'f192e38e-6ee2-44c2-ad6a-d87cb85992cb';
  const deptId = '4960fafa-2f47-4893-98c7-5ae5077e797a'; // B-PACK
  const desigId = '6b39eecc-420d-4a59-83b7-18423f4bc2d4'; // PRODUCTION ASSOCIATE

  const payload = {
    organization_id: orgId,
    company_id: compId,
    branch_id: branchId,
    department_id: deptId,
    designation_id: desigId,
    employee_code: 'EEV8420',
    first_name: 'DHANUSH',
    last_name: '.',
    display_name: 'DHANUSH',
    work_email: 'dhanush6145@gmail.com',
    personal_email: 'dhanush6145@gmail.com',
    phone: '8144126145',
    gender: 'MALE',
    dob: '2004-08-26',
    doj: '2026-01-19',
    employment_type: 'CONTRACT',
    employment_status: 'ACTIVE',
  };

  const { data, error } = await supabase.from('employees').upsert(payload, { onConflict: 'organization_id,employee_code' }).select();
  if (error) {
    console.error('Error test insert:', error);
  } else {
    console.log('Success test insert:', data[0].id, data[0].employee_code);
  }
}

testInsertOne();

