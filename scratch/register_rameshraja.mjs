// scratch/register_rameshraja.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL, ANON_KEY);

async function registerRameshRaja() {
  const email = 'rameshrajajcs@gmail.com';
  const password = 'RameshAdmin@123';

  console.log('Attempting sign in first with password...');
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInErr && signInData.user) {
    console.log('Successfully signed in as Ramesh Raja! Auth UID:', signInData.user.id);
    return signInData.user.id;
  }

  console.log('Sign in failed:', signInErr?.message);
  console.log('Attempting signUp with password...');

  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Ramesh Raja',
        role: 'COMPANY_ADMIN',
        organization_id: '0944f742-f0e1-4084-8848-894ab0b57da7',
      },
    },
  });

  console.log('Sign up result:', {
    user: signUpData?.user?.id,
    identities: signUpData?.user?.identities,
    confirmedAt: signUpData?.user?.email_confirmed_at,
    error: signUpErr?.message,
  });

  return signUpData?.user?.id;
}

registerRameshRaja().catch(console.error);
