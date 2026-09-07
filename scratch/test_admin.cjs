const { createClient } = require('@supabase/supabase-js');
const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function testAdmin() {
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  if (error) {
    console.error('Superadmin Login Failed:', error);
    return;
  }
  console.log('Superadmin Login Success!');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);

  // Check user profile
  const { data: prof, error: profErr } = await client.from('user_profiles').select('*').eq('auth_user_id', data.user.id);
  console.log('User Profile:', prof, profErr);

  // Check roles
  const { data: roles, error: roleErr } = await client.from('user_roles').select('*, roles(*)');
  console.log('User Roles:', roles, roleErr);

  // Check organizations
  const { data: orgs, error: orgErr } = await client.from('organizations').select('id, name, status');
  console.log('Organizations:', orgs, orgErr);
}
testAdmin();
