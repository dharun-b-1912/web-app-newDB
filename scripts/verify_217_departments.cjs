const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';

  const { data: emps, error } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, department_id, designation_id, employment_status, phone, work_email')
    .eq('organization_id', orgId);

  console.log(`Total employees in DB: ${emps.length}`);

  const { data: depts } = await supabase.from('departments').select('id, name').eq('organization_id', orgId);
  const deptNameMap = {};
  depts.forEach(d => { deptNameMap[d.id] = d.name; });

  const deptCounts = {};
  const noDept = [];
  emps.forEach(e => {
    const dName = deptNameMap[e.department_id] || 'NO_DEPARTMENT';
    deptCounts[dName] = (deptCounts[dName] || 0) + 1;
    if (!e.department_id) noDept.push(e);
  });

  console.log('\nDepartment Member Distribution in DB:');
  console.table(deptCounts);

  console.log(`\nEmployees with NO Department: ${noDept.length}`);

  // Check code breakdown
  let eev = 0, sub = 0, temp = 0;
  emps.forEach(e => {
    if (e.employee_code.startsWith('EEV')) eev++;
    else if (e.employee_code.startsWith('SUB')) sub++;
    else if (e.employee_code.startsWith('TEMP')) temp++;
  });
  console.log(`\nCode distribution: EEV=${eev}, SUB=${sub}, TEMP=${temp}, Total=${eev + sub + temp}`);

  // Check status
  const statuses = {};
  emps.forEach(e => { statuses[e.employment_status] = (statuses[e.employment_status] || 0) + 1; });
  console.log('Status distribution:', statuses);
}

verify();
