import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspectLeave() {
  const tables = [
    'leaves',
    'leave_requests',
    'leave_applications',
    'leave_types',
    'leave_balances',
    'leave_entitlements',
    'leave_ledger',
    'leave_policies',
    'holiday_calendars',
    'holidays',
    'leave_adjustments',
    'leave_encashments',
    'comp_off_grants'
  ];

  console.log('--- CHECKING LEAVE TABLES IN SUPABASE ---');
  for (const t of tables) {
    const { data, count, error } = await supabase.from(t).select('*', { count: 'exact', head: false }).limit(2);
    if (error) {
      console.log(`❌ Table [${t}]: ${error.code} - ${error.message}`);
    } else {
      console.log(`✅ Table [${t}]: EXISTS (count: ${count})`);
      if (data && data.length > 0) {
        console.log(`   Sample columns:`, Object.keys(data[0]).join(', '));
      }
    }
  }

  // Also query information_schema or check attendance_daily leave columns
  const { data: attSample } = await supabase.from('attendance_daily').select('status, leave_type_id').neq('status', 'PRESENT').limit(5);
  console.log('--- SAMPLE ATTENDANCE DAILY LEAVE RECORDS ---', attSample);
}

inspectLeave();
