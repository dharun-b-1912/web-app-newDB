import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function testRealTables() {
  const tables = [
    'attendance_daily',
    'leave_entitlements',
    'leave_requests',
    'holiday_calendars',
    'shifts',
    'payslips'
  ];

  for (const t of tables) {
    const { data, error } = await sb.from(t).select('*').limit(2);
    if (error) {
      console.log(`[${t}] Error:`, error.message);
    } else {
      console.log(`[${t}] Count:`, data.length, 'Sample:', data[0] ? Object.keys(data[0]) : 'empty');
    }
  }
}

testRealTables();
