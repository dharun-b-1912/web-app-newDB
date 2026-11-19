require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTypes() {
  const typesToTest = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY', 'CONSULTANT'];
  for (const t of typesToTest) {
    const { data, error } = await supabase.from('employees').insert({
      id: 'f0000000-0000-0000-0000-000000000001',
      organization_id: 'c5ab6b03-adde-47cc-a033-064f4c39b21e',
      company_id: 'c0bbfb28-1500-4ebb-aba8-453b3681f342',
      employee_code: 'TEST-VAL',
      first_name: 'Test',
      last_name: '.',
      display_name: 'Test',
      work_email: 'test@electraev.local',
      employment_type: t,
      employment_status: 'ACTIVE'
    }).select();

    console.log(`Testing type "${t}":`, data ? 'VALID' : error?.message);
    if (data) {
      await supabase.from('employees').delete().eq('id', 'f0000000-0000-0000-0000-000000000001');
    }
  }
}

testTypes();

