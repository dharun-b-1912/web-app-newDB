import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectTable(table) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    console.log(`Table [${table}]: ERROR ${error.message} (code: ${error.code})`);
  } else if (data && data.length > 0) {
    console.log(`Table [${table}] sample keys:`, Object.keys(data[0]));
  } else {
    console.log(`Table [${table}]: 0 rows returned (table exists)`);
  }
}

async function main() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });
  if (authErr) {
    console.warn('Auth signIn notice:', authErr.message);
  } else {
    console.log('Authenticated as:', authData.user?.email);
  }

  const tables = [
    'leave_types',
    'leave_balances',
    'leave_requests',
    'leave_ledger_entries',
    'holidays',
    'attendance_daily',
    'payroll_runs',
    'domain_events',
  ];

  for (const t of tables) {
    await inspectTable(t);
  }
}

main();
