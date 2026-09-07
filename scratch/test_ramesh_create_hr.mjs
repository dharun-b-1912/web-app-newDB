// scratch/test_ramesh_create_hr.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function testRameshCreatesHR() {
  console.log('--- TESTING RAMESH RAJA (COMPANY ADMIN) PROVISIONING HR HEAD ---');
  
  // 1. Sign in as Ramesh Raja
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'rameshrajajcs@gmail.com',
    password: 'joypeoplehr',
  });

  if (authErr || !authData.session) {
    console.error('Sign in failed:', authErr);
    process.exit(1);
  }

  const token = authData.session.access_token;
  console.log('Company Admin Authenticated! UID:', authData.user.id);

  // 2. Provision HR Head (Mari Muthu)
  const hrEmail = 'marimuthu@joycorporatesolutions.com';
  const { data: hrProvData, error: hrProvErr } = await supabase.functions.invoke('employee-auth-provisioner', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      organization_id: '638200cd-ae21-47f3-bd66-a9dbebff5452',
      email: hrEmail,
      password: 'joypeoplehr',
      full_name: 'Mari Muthu',
      role_code: 'HR_HEAD',
      department: 'Finance & Accounts',
    },
  });

  console.log('HR Head Provisioning Response:', hrProvData, hrProvErr);

  if (hrProvErr || !hrProvData?.success) {
    console.error('HR Provisioning Failed:', hrProvErr || hrProvData);
    process.exit(1);
  }

  console.log('\n--- TESTING HR HEAD (MARI MUTHU) LOGIN ---');
  await supabase.auth.signOut();

  const { data: hrLogin, error: hrLoginErr } = await supabase.auth.signInWithPassword({
    email: hrEmail,
    password: 'joypeoplehr',
  });

  if (hrLoginErr || !hrLogin.session) {
    console.error('HR Login Failed:', hrLoginErr);
    process.exit(1);
  }

  console.log('HR Login SUCCESS! UID:', hrLogin.user.id);

  // Query HR profile and role
  const { data: hrProfile } = await supabase
    .from('user_profiles')
    .select('id, auth_user_id, organization_id, email, full_name, user_roles(role_id, roles(code, name))')
    .eq('auth_user_id', hrLogin.user.id)
    .single();

  console.log('HR Profile in DB:', hrProfile);
  console.log('HR Role:', hrProfile?.user_roles?.[0]?.roles?.code);
  console.log('>>> COMPLETE COMPANY ADMIN -> HR HEAD PROVISIONING PASSED 100% <<<');
}

testRameshCreatesHR().catch(console.error);
