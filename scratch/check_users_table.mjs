// scratch/check_users_table.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function checkUsers() {
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const { data: publicUsers, error: pErr } = await supabase.from('users').select('*');
  console.log('public.users table:', { publicUsers, error: pErr?.message });

  // Check user_profiles of companyadmin@joycorporatesolutions.com
  const { data: compAdminProf } = await supabase.from('user_profiles').select('*');
  console.log('existing user_profiles:', compAdminProf);
}

checkUsers().catch(console.error);
