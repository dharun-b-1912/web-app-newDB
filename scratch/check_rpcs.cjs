const { createClient } = require('@supabase/supabase-js');
const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function listRPCs() {
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  console.log('Logged in as Platform Admin:', authData.user.id);

  // Check known RPCs or probe common ones
  const rpcs = [
    'is_platform_admin',
    'is_org_admin',
    'get_active_user_org_id',
    'fn_delete_user',
    'delete_user',
    'admin_delete_user'
  ];
  for (const r of rpcs) {
    const { data, error } = await client.rpc(r);
    console.log(`RPC [${r}]:`, data, error?.message);
  }
}

listRPCs().catch(console.error);
