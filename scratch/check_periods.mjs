import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPeriods() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  const { data: periods, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .order('start_date', { ascending: false });

  console.log('Error:', error);
  console.log('Payroll periods in Supabase:', periods);
}

checkPeriods();
