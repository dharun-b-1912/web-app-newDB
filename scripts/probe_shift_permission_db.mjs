import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const candidateTables = [
  'shifts',
  'shift_master',
  'shift_rosters',
  'shift_assignments',
  'shift_rotations',
  'attendance_shifts',
  'attendance_policies',
  'attendance_rules',
  'permissions',
  'employee_permissions',
  'permission_requests',
  'attendance_permissions',
  'attendance_daily',
  'attendance_records',
  'attendance_punches',
  'biometric_punches',
  'attendance_regularization',
  'attendance_exceptions',
  'organizations',
  'employees',
  'departments'
];

async function probe() {
  console.log('=== PROBING ATTENDANCE, SHIFT & PERMISSION TABLES IN SUPABASE ===');
  for (const t of candidateTables) {
    const { count, data, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`[ABSENT / ERR] ${t}: ${error.code} - ${error.message}`);
    } else {
      console.log(`[EXISTS] ${t}: count = ${count}`);
    }
  }

  console.log('\n--- Inspecting shifts rows if exists ---');
  const { data: shifts } = await supabase.from('shifts').select('*').limit(5);
  if (shifts) {
    console.log('Shifts:', JSON.stringify(shifts, null, 2));
  }

  console.log('\n--- Inspecting attendance_daily sample ---');
  const { data: att } = await supabase.from('attendance_daily').select('*').limit(2);
  if (att) {
    console.log('attendance_daily sample cols:', Object.keys(att[0] || {}));
  }

  console.log('\n--- Inspecting shift_rosters sample ---');
  const { data: rosters } = await supabase.from('shift_rosters').select('*').limit(2);
  if (rosters && rosters.length > 0) {
    console.log('shift_rosters sample cols:', Object.keys(rosters[0] || {}));
  }
}

probe().catch(console.error);
