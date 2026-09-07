import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log('Testing signIn with superadmin@joypeoplehr.com...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Joyson@5610',
  });
  if (error) {
    console.log('Superadmin error:', error);
  } else {
    console.log('Superadmin SUCCESS! User ID:', data.user?.id, 'Email:', data.user?.email);
  }
}

check();
