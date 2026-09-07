import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  // Let's inspect columns using rpc or inserting dummy/selecting
  // Or check employee_profiles
  const { data: emps, error: eErr } = await supabase.from('employees').select('*').limit(1);
  console.log('Employees row structure:', emps, eErr);

  const { data: shifts, error: sErr } = await supabase.from('employee_shift_assignments').select('*').limit(1);
  console.log('Employee shift assignments structure:', shifts, sErr);

  const { data: locs, error: lErr } = await supabase.from('work_locations').select('*').limit(1);
  console.log('Work locations structure:', locs, lErr);
}

main();
