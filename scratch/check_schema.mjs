import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('--- Checking organizations ---');
  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('id, name, slug');
  console.log('Orgs:', orgs, orgErr);

  console.log('--- Checking branches ---');
  const { data: branches, error: brErr } = await supabase.from('branches').select('id, organization_id, company_id, name, branch_code');
  console.log('Branches:', branches, brErr);

  console.log('--- Checking work_locations ---');
  const { data: locs, error: locErr } = await supabase.from('work_locations').select('*');
  console.log('Work Locations:', locs, locErr);

  console.log('--- Checking employee_work_location_assignments ---');
  const { data: asgns, error: asgErr } = await supabase.from('employee_work_location_assignments').select('*');
  console.log('Assignments:', asgns, asgErr);

  console.log('--- Checking employee_shift_assignments ---');
  const { data: shiftAsgns, error: sErr } = await supabase.from('employee_shift_assignments').select('*').limit(5);
  console.log('Shift Assignments:', shiftAsgns, sErr);

  console.log('--- Checking employees ---');
  const { data: emps, error: empErr } = await supabase.from('employees').select('id, employee_code, first_name, last_name, branch_name, location_name, organization_id, company_id').limit(5);
  console.log('Employees:', emps, empErr);
}

main();
