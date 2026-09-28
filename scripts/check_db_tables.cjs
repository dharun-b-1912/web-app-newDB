const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function checkTables() {
  const tables = ['organizations', 'user_profiles', 'employees', 'biometric_devices', 'attendance_punches', 'attendance_daily'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table "${t}": count = ${count}, error = ${error?.message || 'none'}`);
  }
}

checkTables();
