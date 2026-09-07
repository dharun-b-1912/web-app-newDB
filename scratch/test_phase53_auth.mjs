import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuth() {
  console.log('Testing authentication with controlled test user: phase52.live.admin.1788443292492@joypeoplehr.com ...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'phase52.live.admin.1788443292492@joypeoplehr.com',
    password: 'JoySecPass#1788443292492!Enterprise',
  });

  if (error) {
    console.log('Login Result:', {
      error: error.message,
      status: error.status,
      code: error.code,
    });
  } else {
    console.log('Login SUCCESS! User ID:', data.user?.id, 'Session active:', !!data.session);
  }
}

testAuth();
