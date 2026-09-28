import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function inspectTables() {
  const tables = [
    'attendance_records',
    'shifts',
    'work_schedules',
    'employee_schedules',
    'payslips',
    'employee_leave_balances',
    'employee_leave_requests',
    'announcements'
  ];

  for (const t of tables) {
    const { data, error } = await sb.from(t).select('*').limit(2);
    if (error) {
      console.log(`[${t}] Error:`, error.message);
    } else {
      console.log(`[${t}] Count sample:`, data?.length, 'Sample cols:', data?.[0] ? Object.keys(data[0]) : 'empty table');
    }
  }
}

inspectTables();
