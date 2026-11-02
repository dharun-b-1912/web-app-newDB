import { supabase } from '../src/lib/supabase';

async function check() {
  const { data: daily } = await supabase
    .from('attendance_daily')
    .select('*')
    .eq('attendance_date', '2026-10-29');
  console.log('Daily 2026-10-29:', daily);

  const { data: punches } = await supabase
    .from('attendance_punches')
    .select('*')
    .eq('employee_id', '75674ef6-47c0-43f9-87e0-8e1dc6387a55');
  console.log('Punches:', punches);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
