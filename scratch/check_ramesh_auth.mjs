// scratch/check_ramesh_auth.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function checkAuth() {
  const email = 'rameshrajajcs@gmail.com';
  console.log('Checking auth for:', email);

  // Try signing in with dummy password to see the error message (e.g., "Invalid login credentials" vs "User not found")
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: 'dummy-check-pass-12345',
  });

  console.log('Sign in result:', { data, error: error?.message, errorCode: error?.code });
}

checkAuth().catch(console.error);
