const { createClient } = require('@supabase/supabase-js');
const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function testDelete() {
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  console.log('Logged in as Platform Admin:', authData.user.id);

  // Test selecting and checking if delete policy allows deletion
  // Let's check policies on employee_documents, attendance_punches, leave_requests, etc.
  const { data: punches } = await client.from('attendance_punches').select('id').limit(1);
  if (punches && punches.length > 0) {
    const punchId = punches[0].id;
    console.log('Testing delete on punch:', punchId);
    const { error: delErr } = await client.from('attendance_punches').delete().eq('id', punchId);
    console.log('Delete result:', delErr);
  }
}

testDelete().catch(console.error);
