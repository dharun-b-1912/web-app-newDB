// scratch/test_company_admin_login.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL, ANON_KEY);

async function test() {
  console.log('--- CHECKING EXISTING USERS OR SIGNUP ---');
  // Check common company admin emails that might have been created
  const candidateEmails = [
    'admin@joycorporatesolutions.com',
    'admin@jcs.com',
    'companyadmin@joypeoplehr.com',
    'dharun@joypeople.com',
    'admin@joypeoplehr.com',
  ];

  for (const email of candidateEmails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'Password123!',
    });
    console.log(`SignIn test (${email}):`, error ? error.message : `SUCCESS UID: ${data?.user?.id}`);
  }
}

test().catch(console.error);
