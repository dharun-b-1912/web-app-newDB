const { createClient } = require('@supabase/supabase-js');
const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function checkOrgDependency() {
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  console.log('Logged in as Platform Admin:', authData.user.id);

  // Check user_profiles record
  const { data: prof } = await client.from('user_profiles').select('*').eq('auth_user_id', authData.user.id);
  console.log('user_profiles row:', prof);

  // Check user_roles record
  const { data: uroles } = await client.from('user_roles').select('*, roles(*)').eq('user_profile_id', prof[0].id);
  console.log('user_roles rows for Platform Admin:', uroles);

  // Check roles table
  const { data: allRoles } = await client.from('roles').select('*');
  console.log('All roles in DB:', allRoles);

  // Check organizations table
  const { data: orgs } = await client.from('organizations').select('*');
  console.log('All organizations in DB:', orgs);
}

checkOrgDependency().catch(console.error);
