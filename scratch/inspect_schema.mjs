import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectSchema() {
  console.log('=== INSPECTING LIVE SUPABASE TABLES ===');

  const tables = [
    'attendance_regularizations',
    'attendance_daily',
    'employee_documents',
    'document_types',
    'work_locations',
    'notification_events',
    'leave_requests',
    'expense_claims',
    'employees',
  ];

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.log(`Table [${t}]: Error ->`, error.message);
      } else {
        const cols = data && data[0] ? Object.keys(data[0]) : '(Table empty or 0 rows returned)';
        console.log(`Table [${t}]: Columns ->`, cols);
      }
    } catch (e) {
      console.log(`Table [${t}]: Exception ->`, e);
    }
  }
}

inspectSchema();
