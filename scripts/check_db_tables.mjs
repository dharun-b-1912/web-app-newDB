import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
  const tables = [
    'shifts',
    'shift_rosters',
    'attendance_shifts',
    'attendance_roster_entries',
    'attendance_permissions',
    'attendance_permission_ledgers',
    'attendance_policies',
    'attendance_daily_ledger',
    'attendance_punches',
    'attendance_records',
    'attendance_exceptions',
    'attendance_regularization_requests'
  ];

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('id').limit(1);
      if (error) {
        console.log(`[TABLE] ${t}: ERROR - ${error.message} (code: ${error.code})`);
      } else {
        console.log(`[TABLE] ${t}: ACCESSIBLE (rows: ${data?.length})`);
      }
    } catch (e) {
      console.log(`[TABLE] ${t}: EXCEPTION - ${e.message}`);
    }
  }
}

check();
