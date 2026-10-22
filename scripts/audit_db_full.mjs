import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runAudit() {
  const { data: emps } = await admin.from('employees').select('id, employee_code, first_name, last_name, work_email, user_id, organization_id, reporting_manager_id');
  console.log(`Total employees: ${emps.length}`);

  const { data: punches } = await admin.from('attendance_punches').select('*').limit(10);
  console.log(`attendance_punches count: ${punches.length}`);
  if (punches.length > 0) console.log(punches);

  const { data: daily } = await admin.from('attendance_daily').select('*').limit(10);
  console.log(`attendance_daily count: ${daily.length}`);
  if (daily.length > 0) console.log(daily);

  const { data: bank } = await admin.from('employee_bank_details').select('*');
  console.log(`employee_bank_details count: ${bank.length}`);
  if (bank.length > 0) console.log(bank);

  const { data: stat } = await admin.from('employee_statutory_details').select('*');
  console.log(`employee_statutory_details count: ${stat.length}`);
  if (stat.length > 0) console.log(stat);

  const { data: emergency } = await admin.from('employee_emergency_contacts').select('*');
  console.log(`employee_emergency_contacts count: ${emergency.length}`);
  if (emergency.length > 0) console.log(emergency);

  const { data: shifts } = await admin.from('shifts').select('*');
  console.log('Shifts:', shifts);

  const { data: shiftAssignments } = await admin.from('employee_shift_assignments').select('*');
  console.log('Shift assignments count:', shiftAssignments.length, shiftAssignments);

  // Check user_profiles for all employees
  const { data: userProfiles } = await admin.from('user_profiles').select('id, auth_user_id, email, full_name, employee_id, role');
  console.log('User profiles with employee_id:');
  userProfiles.filter(u => u.employee_id).forEach(u => console.log(`  ${u.email} -> emp_id=${u.employee_id}`));
}

runAudit();
