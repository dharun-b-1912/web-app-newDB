const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function inspectElectraEmployees() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const { data: emps, error } = await sb.from('employees')
    .select('id, employee_code, first_name, last_name, display_name, department_id, designation_id, employment_status')
    .eq('organization_id', orgId);

  console.log(`Electra EV Employees: count = ${emps?.length}`, { error });
  if (emps && emps.length > 0) {
    const active = emps.filter(e => e.employment_status === 'ACTIVE');
    console.log(`Active count: ${active.length}`);
    console.log('Sample 10 employees:');
    console.table(emps.slice(0, 10).map(e => ({
      id: e.id,
      code: e.employee_code,
      name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
      status: e.employment_status
    })));
  }
}

inspectElectraEmployees();
