import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  // Let's test inserting a mock row to see exact column errors or check definitions
  const tables = ['employees', 'employee_profiles', 'employee_bank_details', 'employee_statutory_details', 'employee_salary_assignments'];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).insert({ id: crypto.randomUUID() }).select();
    console.log(`[${t}] Insert error details:`, error?.message, error?.details, error?.hint);
  }
}

main();
