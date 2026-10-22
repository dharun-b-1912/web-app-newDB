const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function run() {
  // Test if work_email can be null
  const testId = '00000000-0000-0000-0000-000000000099';
  const { data, error } = await sb.from('employees').insert({
    id: testId,
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    department_id: '70d63528-7aa9-4630-adcc-b7a6194250cd',
    designation_id: 'fd2762cd-b1bb-402e-a7ee-81a80aa0eab7',
    employee_code: 'TEST-NO-EMAIL-99',
    first_name: 'Test',
    last_name: 'NoEmail',
    work_email: null,
    phone: '9876543210',
    employment_type: 'FULL_TIME',
    employment_status: 'ACTIVE',
    gender: 'MALE',
    doj: '2026-01-01',
  }).select();

  console.log('Insert with null email result:', { data, error });
  if (data && data.length > 0) {
    await sb.from('employees').delete().eq('id', testId);
    console.log('Cleaned up test record');
  }
}
run();
