// scratch/check_rameshraja_org.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function check() {
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log('--- ALL ORGANIZATIONS ---');
  console.log(orgs);

  const { data: companies } = await supabase.from('companies').select('*');
  console.log('--- ALL COMPANIES ---');
  console.log(companies);

  const { data: profiles } = await supabase.from('user_profiles').select('*');
  console.log('--- ALL USER PROFILES ---');
  console.log(profiles);
}

check().catch(console.error);
