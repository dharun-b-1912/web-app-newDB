// scratch/investigate_speardigital.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function investigate() {
  console.log('--- INVESTIGATING info.speardigital@gmail.com ---');

  // Sign in as Platform Admin
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const email = 'info.speardigital@gmail.com';

  // 1. Check organizations
  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log('All Organizations:', orgs);

  // 2. Check companies
  const { data: comps } = await supabase.from('companies').select('*');
  console.log('All Companies:', comps);

  // 3. Check user_profiles
  const { data: profs } = await supabase.from('user_profiles').select('*, user_roles(*, roles(*))');
  console.log('All User Profiles:', JSON.stringify(profs, null, 2));

  // 4. Try checking if user exists in auth by attempting signUp
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password: 'TestPassword@2026',
    options: {
      data: {
        full_name: 'Spear Digital Admin',
      },
    },
  });

  console.log('Sign up check:', {
    user: signUpData?.user?.id,
    identities: signUpData?.user?.identities,
    error: signUpErr?.message,
  });
}

investigate().catch(console.error);
