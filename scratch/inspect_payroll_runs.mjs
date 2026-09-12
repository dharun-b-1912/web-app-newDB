import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj');

async function inspectPayrollRuns() {
  const { data, error } = await sb.from('payroll_runs').select('*').limit(0);
  console.log('payroll_runs query:', error ? error.message : 'OK');
}

inspectPayrollRuns();
