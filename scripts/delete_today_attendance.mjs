import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ1NjAwNywiZXhwIjoyMDg4MDMyMDA3fQ.fU9xM5T-5xJ-W_N47_o-E81a0-N7mE-l92_yR48mR4E';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanTodayAttendance() {
  const targetDate = '2026-08-28';
  console.log(`[CLEANUP] Starting cleanup of attendance records for date: ${targetDate}`);

  // 1. Delete from attendance_daily
  const { data: d1, error: e1 } = await supabase
    .from('attendance_daily')
    .delete()
    .eq('date', targetDate);
  console.log('1. attendance_daily deleted:', e1 ? e1.message : 'SUCCESS');

  // 2. Delete from attendance_punches
  const { data: d2, error: e2 } = await supabase
    .from('attendance_punches')
    .delete()
    .eq('punch_date', targetDate);
  console.log('2. attendance_punches deleted:', e2 ? e2.message : 'SUCCESS');

  // 3. Delete from attendance_events
  const { data: d3, error: e3 } = await supabase
    .from('attendance_events')
    .delete()
    .gte('timestamp', `${targetDate}T00:00:00Z`)
    .lte('timestamp', `${targetDate}T23:59:59Z`);
  console.log('3. attendance_events deleted:', e3 ? e3.message : 'SUCCESS');

  // 4. Delete from attendance_location_events
  const { data: d4, error: e4 } = await supabase
    .from('attendance_location_events')
    .delete()
    .gte('server_timestamp', `${targetDate}T00:00:00Z`)
    .lte('server_timestamp', `${targetDate}T23:59:59Z`);
  console.log('4. attendance_location_events deleted:', e4 ? e4.message : 'SUCCESS');

  // 5. Canonicalize Dharun B employee record organization_id to org-joy-01
  const { data: d5, error: e5 } = await supabase
    .from('employees')
    .update({
      organization_id: 'org-joy-01',
      company_id: 'comp-joy-01',
      company_name: 'Joy Corporate Solutions Private Limited (HQ)'
    })
    .or('id.eq.emp-admin-001,employee_code.eq.JCS-017');
  console.log('5. employees canonicalization (org-joy-01):', e5 ? e5.message : 'SUCCESS');

  console.log('[CLEANUP] Done! Today attendance reset successfully.');
}

cleanTodayAttendance();
