import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSignUp() {
  const email = `onboarding.test.${Date.now()}@joypeoplehr.com`;
  const password = `JoyEnterprise#2026!Pass`;

  console.log('Testing signUp with email:', email);
  const res = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Test Onboarding Admin',
      },
    },
  });

  console.log('signUp response user:', res.data.user?.id, 'confirmed:', res.data.user?.confirmed_at, 'identities:', res.data.user?.identities?.length);
  console.log('signUp response session:', res.data.session ? 'SESSION PRESENT' : 'NO SESSION');
  console.log('signUp error:', res.error);
}

testSignUp();
