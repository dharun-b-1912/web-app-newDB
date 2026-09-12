import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

const HR_EMAIL = 'marimuthu@joycorporatesolutions.com';
const HR_PASS = 'joypeoplehr';

async function run() {
  const hrAuth = await supabase.auth.signInWithPassword({
    email: HR_EMAIL,
    password: HR_PASS,
  });

  if (hrAuth.error) {
    console.error('HR sign in failed:', hrAuth.error);
    return;
  }

  const token = hrAuth.data.session.access_token;
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  console.log('HR logged in successfully!');

  // Check employees
  const { data: emps, error: empErr } = await authClient
    .from('employees')
    .select('id, employee_code, first_name, last_name, display_name, avatar_url')
    .limit(20);

  console.log(`Employees found (${emps?.length || 0}):`);
  if (emps) {
    emps.forEach(e => console.log(` - ${e.display_name} (${e.employee_code}) id=${e.id} avatar_url=${e.avatar_url}`));
  }

  // Check today's punches
  const today = '2026-09-10';
  const { data: punches, error: punchErr } = await authClient
    .from('attendance_punches')
    .select('id, employee_id, punch_time, punch_type, punch_source, verification_mode, device_id')
    .order('punch_time', { ascending: false })
    .limit(10);

  console.log(`Punches found (${punches?.length || 0}):`);
  if (punches) {
    punches.forEach(p => console.log(` - punch: emp=${p.employee_id} time=${p.punch_time} type=${p.punch_type} source=${p.punch_source} mode=${p.verification_mode} dev=${p.device_id}`));
  }

  // Check today's daily attendance
  const { data: daily, error: dailyErr } = await authClient
    .from('attendance_daily')
    .select('id, employee_id, attendance_date, first_check_in, last_check_out, status, check_in_location_name')
    .order('attendance_date', { ascending: false })
    .limit(10);

  console.log(`Daily records found (${daily?.length || 0}):`);
  if (daily) {
    daily.forEach(d => console.log(` - daily: emp=${d.employee_id} date=${d.attendance_date} in=${d.first_check_in} out=${d.last_check_out} loc=${d.check_in_location_name}`));
  }

  // Check storage buckets
  const { data: buckets, error: bucketErr } = await authClient.storage.listBuckets();
  console.log('Buckets:', buckets, 'error:', bucketErr);
}

run();
