const { createClient } = require('@supabase/supabase-js');
const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function testPermissions() {
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  console.log('Logged in as Platform Admin:', authData.user.id);

  // Test selecting from attendance_punches
  const { data: punches, error: pErr } = await client.from('attendance_punches').select('id, punch_type, verification_mode');
  console.log('Punches read:', punches?.length, pErr);

  // Test selecting from leave_requests
  const { data: leaves, error: lErr } = await client.from('leave_requests').select('id, status');
  console.log('Leaves read:', leaves?.length, lErr);

  // Test selecting from notification_events
  const { data: notifs, error: nErr } = await client.from('notification_events').select('id, title');
  console.log('Notifs read:', notifs?.length, nErr);
}

testPermissions().catch(console.error);
