const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDb() {
  const { data: emps, error } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, department_id, employment_status, phone, work_email')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');

  console.log(`Total Electra EV employees in DB: ${emps.length}`);
  const statusCounts = {};
  emps.forEach(e => {
    statusCounts[e.employment_status] = (statusCounts[e.employment_status] || 0) + 1;
  });
  console.log('Status breakdown:', statusCounts);

  // Check how many have EEV vs TEMP vs others
  const eevs = emps.filter(e => (e.employee_code || '').startsWith('EEV'));
  const temps = emps.filter(e => (e.employee_code || '').startsWith('TEMP') || /^\d+$/.test(e.employee_code || ''));
  const others = emps.filter(e => !(e.employee_code || '').startsWith('EEV') && !(e.employee_code || '').startsWith('TEMP') && !/^\d+$/.test(e.employee_code || ''));

  console.log(`EEV codes: ${eevs.length}`);
  console.log(`TEMP / numeric codes: ${temps.length}`);
  console.log(`Other codes: ${others.length}`);
  others.forEach(o => console.log('Other:', o.employee_code, o.first_name, o.employment_status));
}

checkDb();

