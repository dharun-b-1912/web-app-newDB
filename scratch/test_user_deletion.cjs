const { createClient } = require('@supabase/supabase-js');
const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function testAuthAdmin() {
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  console.log('Logged in as:', authData.user.email);

  // Check if RPC functions exist for deleting user or executing admin actions
  const { data: funcs, error: fErr } = await client.rpc('get_active_user_org_id');
  console.log('get_active_user_org_id result:', funcs, fErr);

  const { data: isPlat, error: pErr } = await client.rpc('is_platform_admin');
  console.log('is_platform_admin result:', isPlat, pErr);
}

testAuthAdmin().catch(console.error);
