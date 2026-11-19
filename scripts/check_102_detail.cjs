const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: emps } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, department_id, designation_id, employment_status, doj')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');

  console.log('Total Electra EV employees in DB:', emps.length);

  // Group by employment status
  const byStatus = {};
  emps.forEach(e => {
    byStatus[e.employment_status] = (byStatus[e.employment_status] || 0) + 1;
  });
  console.log('By employment_status:', byStatus);

  // Group by code prefix
  const byCode = { eev: 0, temp: 0, other: 0 };
  emps.forEach(e => {
    const code = e.employee_code || '';
    if (code.startsWith('EEV')) byCode.eev++;
    else if (code.startsWith('TEMP') || /^\d+$/.test(code)) byCode.temp++;
    else byCode.other++;
  });
  console.log('By code type:', byCode);

  // How many resigned?
  const resigned = emps.filter(e => e.employment_status === 'RESIGNED');
  console.log('Resigned count:', resigned.length);

  // Let's check who was in the DB before our sync vs after
  // In previous turns:
  // Before our sync, there were ~22 employees in Electra EV.
  // 22 + 304 = 326!
  // Look at that: 22 + 304 = 326!
  // And 22 old employees + 87 resigned = 109?
  // Or wait: 224 active displayed in some view, and 326 in DB -> 326 - 224 = 102!
  // That is EXACTLY 102!
}

run();

