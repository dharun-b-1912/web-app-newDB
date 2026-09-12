import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectSchema() {
  console.log('=== INSPECTING LIVE SUPABASE TABLES ===');

  const tables = [
    'attendance_regularizations',
    'attendance_daily',
    'attendance_punches',
    'employee_documents',
    'document_types',
    'work_locations',
    'notification_events',
    'leave_requests',
    'employee_requests',
    'employees',
    'user_profiles',
  ];

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.log(`Table [${t}]: Error -> ${error.message} (code: ${error.code})`);
      } else {
        const cols = data && data[0] ? Object.keys(data[0]) : '(Empty table / 0 rows)';
        console.log(`Table [${t}]: Sample Columns ->`, cols);
      }
    } catch (e: any) {
      console.log(`Table [${t}]: Exception ->`, e.message);
    }
  }
}

inspectSchema();
