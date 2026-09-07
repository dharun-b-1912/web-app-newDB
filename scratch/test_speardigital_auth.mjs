// scratch/test_speardigital_auth.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL, ANON_KEY);

async function testAuth() {
  const email = 'info.speardigital@gmail.com';
  const testPassword = 'SpearAdmin@2026';

  console.log('Testing sign up for:', email);
  const { data: suData, error: suErr } = await supabase.auth.signUp({
    email,
    password: testPassword,
    options: {
      data: {
        role: 'COMPANY_ADMIN',
        full_name: 'Spear Digital Admin',
      },
    },
  });

  console.log('signUp output:', {
    user: suData?.user?.id,
    session: !!suData?.session,
    error: suErr?.message,
  });

  console.log('Testing sign in with that password...');
  const { data: siData, error: siErr } = await supabase.auth.signInWithPassword({
    email,
    password: testPassword,
  });

  console.log('signInWithPassword output:', {
    user: siData?.user?.id,
    session: !!siData?.session,
    error: siErr?.message,
  });
}

testAuth().catch(console.error);
