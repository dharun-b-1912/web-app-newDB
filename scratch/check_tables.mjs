import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj');

async function check() {
  const r1 = await sb.from('employee_separations').select('*').limit(1);
  console.log('employee_separations:', r1.error ? r1.error.message : 'EXISTS (count: ' + r1.data.length + ')');

  const r2 = await sb.from('fnf_settlements').select('*').limit(1);
  console.log('fnf_settlements:', r2.error ? r2.error.message : 'EXISTS (count: ' + r2.data.length + ')');

  const r3 = await sb.from('separation_clearances').select('*').limit(1);
  console.log('separation_clearances:', r3.error ? r3.error.message : 'EXISTS (count: ' + r3.data.length + ')');
}

check();
