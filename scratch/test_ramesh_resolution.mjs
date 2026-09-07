// scratch/test_ramesh_resolution.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function testRamesh() {
  console.log('--- TESTING RAMESH RAJA AUTH & ROLE RESOLUTION ---');
  
  const email = 'rameshrajajcs@gmail.com';
  const password = 'joypeoplehr';

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authErr || !authData.session) {
    console.error('Auth failed:', authErr);
    process.exit(1);
  }

  console.log('1. GoTrue Auth SUCCESS! UID:', authData.user.id);
  console.log('2. Access Token:', authData.session.access_token.slice(0, 30) + '...');

  // Query user_profiles and user_roles
  const { data: profile, error: profErr } = await supabase
    .from('user_profiles')
    .select(`
      id,
      auth_user_id,
      organization_id,
      email,
      full_name,
      status,
      user_roles (
        role_id,
        roles (
          id,
          name,
          code
        )
      )
    `)
    .eq('auth_user_id', authData.user.id)
    .single();

  console.log('3. User Profile in DB:', profile);
  console.log('4. Profile Query Error:', profErr);

  const roleCode = profile?.user_roles?.[0]?.roles?.code;
  console.log('5. Resolved Role Code:', roleCode);

  if (roleCode === 'COMPANY_ADMIN') {
    console.log('>>> VERIFICATION PASSED: Real Company Admin authenticated with joypeoplehr and linked to COMPANY_ADMIN! <<<');
  } else {
    console.error('>>> VERIFICATION FAILED: Unexpected role code <<<', roleCode);
    process.exit(1);
  }
}

testRamesh().catch(console.error);
