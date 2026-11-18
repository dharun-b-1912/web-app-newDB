const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: emps, error: empErr } = await supabase.from('employees').select('*').limit(2);
  console.log('Sample employee keys:', emps?.[0] ? Object.keys(emps[0]) : null, empErr);

  const { data: bav, error: bavErr } = await supabase.from('employees').select('*').ilike('first_name', '%bavithra%');
  console.log('\nBavithra by first_name:', bav, bavErr);

  const { data: bavCode, error: bavCodeErr } = await supabase.from('employees').select('*').ilike('employee_code', '%6115%');
  console.log('\nBavithra by code 6115:', bavCode, bavCodeErr);

  const { data: electraEmps, error: elErr } = await supabase.from('employees').select('id, employee_code, first_name, last_name, work_email, organization_id').eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');
  console.log('\nElectra EV employees by org_id:', electraEmps, elErr);
}

inspect();
