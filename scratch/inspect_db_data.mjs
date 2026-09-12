import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseKey = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- 1. Employees in Supabase ---');
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, display_name, avatar_url, user_id')
    .limit(10);
  
  if (empErr) {
    console.error('empErr:', empErr);
  } else {
    console.log(`Found ${emps.length} employees:`, emps);
  }

  console.log('--- 2. Attendance Punches ---');
  const { data: punches, error: punchErr } = await supabase
    .from('attendance_punches')
    .select('*')
    .order('punch_time', { ascending: false })
    .limit(5);

  if (punchErr) {
    console.error('punchErr:', punchErr);
  } else {
    console.log(`Found ${punches.length} punches:`, punches);
  }

  console.log('--- 3. Attendance Daily ---');
  const { data: daily, error: dailyErr } = await supabase
    .from('attendance_daily')
    .select('*')
    .order('attendance_date', { ascending: false })
    .limit(5);

  if (dailyErr) {
    console.error('dailyErr:', dailyErr);
  } else {
    console.log(`Found ${daily.length} daily records:`, daily);
  }

  console.log('--- 4. Storage Bucket Test ---');
  // Try uploading a test file to employee-profile-pictures and employee-documents
  const testBytes = Buffer.from('test');
  const { data: up1, error: err1 } = await supabase.storage
    .from('employee-profile-pictures')
    .upload(`test_${Date.now()}.txt`, testBytes);
  console.log('employee-profile-pictures upload:', { data: up1, error: err1 });

  const { data: up2, error: err2 } = await supabase.storage
    .from('employee-documents')
    .upload(`test_${Date.now()}.txt`, testBytes);
  console.log('employee-documents upload:', { data: up2, error: err2 });
}

inspect();
