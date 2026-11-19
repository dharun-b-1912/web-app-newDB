require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkForeignKeys() {
  // Let's test inserting a test employee with a generated dept_id and desig_id
  const testOrgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const testPayload = {
    employee_code: 'TEST-TEMP-999',
    organization_id: testOrgId,
    first_name: 'Test',
    last_name: 'Worker',
    work_email: 'test.temp.999@electraev.local',
    phone: '9999999999',
    gender: 'Male',
    department_id: 'dept-assembly',
    designation_id: 'desig-trainee',
    employment_source: 'VENDOR',
    status: 'Active'
  };

  console.log('Testing insert into employees table...');
  const { data, error } = await supabase.from('employees').insert(testPayload).select();
  console.log('Insert result:', data, 'Error:', error);

  if (data && data.length > 0) {
    console.log('Deleting test row...');
    await supabase.from('employees').delete().eq('id', data[0].id);
    console.log('Cleaned up test row.');
  }
}

checkForeignKeys();

