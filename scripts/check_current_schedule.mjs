import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const sb = createClient(url, key);

async function run() {
  const { data: schedules, error } = await sb.from('attendance_report_schedules').select('*');
  const { count: empCount } = await sb.from('employees').select('*', { count: 'exact', head: true });
  const { count: shiftCount } = await sb.from('shifts').select('*', { count: 'exact', head: true });
  const { count: punchCount } = await sb.from('attendance_punches').select('*', { count: 'exact', head: true });
  console.log('Error:', error);
  console.log('Database Status:');
  console.log('- Employees in DB:', empCount);
  console.log('- Shifts in DB:', shiftCount);
  console.log('- Total Attendance Punches in DB:', punchCount);
  console.log('- Report Schedules in DB:', schedules?.length || 0);
}

run();
