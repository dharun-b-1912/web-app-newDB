import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
  'organizations',
  'companies',
  'user_profiles',
  'user_roles',
  'employees',
  'employee_profiles',
  'employee_onboarding',
  'employee_bank_details',
  'employee_statutory_details',
  'employee_addresses'
];

async function getCounts() {
  console.log('Reading database counts on canonical project:', SUPABASE_URL);
  for (const tbl of tables) {
    const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
    console.log(`- ${tbl}: ${count !== null ? count : 'Error: ' + error?.message}`);
  }
}

getCounts();
