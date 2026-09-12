import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseAnonKey = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testColumns() {
  console.log('Testing attendance_daily:');
  for (const col of ['date', 'attendance_date', 'employee_id', 'employee_code', 'first_check_in', 'last_check_out', 'total_work_minutes', 'net_working_minutes', 'status', 'location_name', 'check_in_location_name']) {
    const { error } = await supabase.from('attendance_daily').select(col).limit(1);
    if (!error) {
      console.log(`  ✓ attendance_daily.${col} EXISTS`);
    } else {
      console.log(`  ✗ attendance_daily.${col} DOES NOT EXIST: ${error.message}`);
    }
  }

  console.log('\nTesting attendance_punches:');
  for (const col of ['punch_time', 'timestamp', 'punch_type', 'type', 'event_type', 'employee_id', 'employee_code', 'latitude', 'longitude']) {
    const { error } = await supabase.from('attendance_punches').select(col).limit(1);
    if (!error) {
      console.log(`  ✓ attendance_punches.${col} EXISTS`);
    } else {
      console.log(`  ✗ attendance_punches.${col} DOES NOT EXIST: ${error.message}`);
    }
  }
}
testColumns().catch(console.error);
