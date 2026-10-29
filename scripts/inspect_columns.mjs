import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspectColumns() {
  const tables = ['shifts', 'shift_rosters', 'attendance_punches', 'attendance_daily', 'employee_requests'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (!error && data && data.length > 0) {
      console.log(`\n=== COLUMNS FOR ${t} ===`);
      console.log(Object.keys(data[0]).join(', '));
      console.log('Sample row:', JSON.stringify(data[0], null, 2));
    } else {
      console.log(`\n=== NO ROWS OR ERROR IN ${t} ===`, error?.message);
    }
  }
}

inspectColumns();
