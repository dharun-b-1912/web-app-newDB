import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function check() {
  const { data: orgs } = await sb.from('organizations').select('*');
  console.log('Organizations:', orgs);

  // Check if there are tables like master_designations, org_departments etc.
  const { data: e } = await sb.from('employees').select('*, departments(*), designations(*)').eq('employee_code', 'WF-1001');
  console.log('Employee with joins:', JSON.stringify(e, null, 2));
}

check();
