require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testForeignKey() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const compId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';

  const { data, error } = await supabase.from('employees').insert({
    id: 'f0000000-0000-0000-0000-000000000001',
    organization_id: orgId,
    company_id: compId,
    department_id: 'd0000000-0000-0000-0000-000000000001', // does not exist in departments
    employee_code: 'TEST-FK-01',
    first_name: 'Test',
    last_name: '.',
    display_name: 'Test',
    work_email: 'test.fk@electraev.local',
    employment_type: 'CONTRACT',
    employment_status: 'ACTIVE'
  }).select();

  console.log('Insert with fake department_id:', data ? 'SUCCESS' : 'FAILED', error);
}

testForeignKey();

