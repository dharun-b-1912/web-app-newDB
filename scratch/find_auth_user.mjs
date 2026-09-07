// scratch/find_auth_user.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function findAuthUser() {
  console.log('--- FINDING AUTH USER FOR rameshrajajcs@gmail.com ---');
  
  // Try sign up to see if user already exists
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: 'rameshrajajcs@gmail.com',
    password: 'TemporaryPassword@2026',
    options: {
      data: {
        full_name: 'Ramesh Raja',
        role: 'COMPANY_ADMIN',
      },
    },
  });

  console.log('Sign up result:', {
    user: signUpData?.user?.id,
    identities: signUpData?.user?.identities,
    error: signUpError?.message,
  });

  if (signUpData?.user?.id) {
    console.log('User UID in auth.users:', signUpData.user.id);
  }
}

findAuthUser().catch(console.error);
