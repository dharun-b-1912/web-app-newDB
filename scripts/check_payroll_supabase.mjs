import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('--- Fetching all organizations ---');
  const { data: orgs } = await admin.from('organizations').select('id, name');
  console.log('Organizations:', orgs);

  console.log('\n--- Fetching all companies ---');
  const { data: comps } = await admin.from('companies').select('id, name, organization_id');
  console.log('Companies:', comps);

  console.log('\n--- Fetching all employees from Supabase ---');
  const { data: emps, error: empErr } = await admin.from('employees').select('*');
  if (empErr) {
    console.error('empErr:', empErr);
  } else {
    console.log(`Total employees in DB: ${emps?.length}`);
    if (emps && emps.length > 0) {
      console.log('Columns:', Object.keys(emps[0]));
      emps.forEach((e, i) => {
        console.log(`${i+1}. [${e.employee_code || e.id}] ${e.first_name} ${e.last_name || ''} | org: ${e.organization_id} | comp: ${e.company_id}`);
      });
    }
  }

  console.log('\n--- Checking payroll runs in DB ---');
  const { data: runs } = await admin.from('payroll_runs').select('*');
  console.log('Payroll runs in DB:', runs?.length, runs);

  console.log('\n--- Checking employee_salary_assignments in DB ---');
  const { data: salAssigns } = await admin.from('employee_salary_assignments').select('*');
  console.log('employee_salary_assignments in DB:', salAssigns?.length);
  if (salAssigns?.length) {
    console.log('Sample assignment:', salAssigns[0]);
  }

  console.log('\n--- Checking salary_structures in DB ---');
  const { data: structs } = await admin.from('salary_structures').select('*');
  console.log('salary_structures in DB:', structs?.length);
  if (structs?.length) {
    console.log('Structures:', structs.map(s => ({ id: s.id, name: s.name, org: s.organization_id })));
  }
}

run();
