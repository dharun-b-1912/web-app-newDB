const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function testCompanyRemoval() {
  console.log('--- 1. DELETING TEST COMPANY ---');
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  
  // Login as Platform Admin
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  if (authErr) {
    console.error('Login error:', authErr);
    process.exit(1);
  }
  console.log('✅ Logged in as Platform Admin. UID:', authData.user.id);

  // Delete the test company
  const { error: delErr } = await client.from('companies').delete().eq('id', '5537b879-7299-48a4-bdfe-16e327a2d3d0');
  if (delErr) {
    console.error('❌ Failed to delete test company:', delErr);
    process.exit(1);
  }
  console.log('✅ Test company 5537b879-7299-48a4-bdfe-16e327a2d3d0 successfully deleted!');

  // Verify companies count is 0
  const { count: compCount } = await client.from('companies').select('*', { count: 'exact', head: true });
  console.log('✅ Final companies count:', compCount);

  // Verify Platform Admin authorization still works 100%
  const { data: isPlat } = await client.rpc('is_platform_admin');
  console.log('✅ is_platform_admin() result:', isPlat);

  const { data: activeOrg } = await client.rpc('get_active_user_org_id');
  console.log('✅ get_active_user_org_id() result:', activeOrg);

  const { data: orgs } = await client.from('organizations').select('*');
  console.log('✅ Platform Admin can read organizations:', orgs?.length, 'organizations');

  const { data: plans } = await client.from('platform_plans').select('*');
  console.log('✅ Platform Admin can read platform_plans:', plans?.length, 'plans');
}

testCompanyRemoval().catch(console.error);
