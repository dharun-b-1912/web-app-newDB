import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const tables = ['organizations', 'companies', 'branches', 'departments', 'work_locations', 'employees', 'employee_profiles', 'employee_shift_assignments', 'attendance_punches', 'attendance_daily'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table [${t}] ERROR:`, error.message, error.code);
    } else {
      console.log(`Table [${t}] Sample Keys:`, data && data.length > 0 ? Object.keys(data[0]) : '(empty table or no rows returned)');
    }
  }
}

main();
