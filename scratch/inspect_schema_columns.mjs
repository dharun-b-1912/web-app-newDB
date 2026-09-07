// scratch/inspect_schema_columns.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function inspect() {
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const { data: orgs } = await supabase.from('organizations').select('*').limit(1);
  console.log('organizations columns:', Object.keys(orgs?.[0] || {}));

  const { data: comp } = await supabase.from('companies').select('*').limit(1);
  console.log('companies columns:', Object.keys(comp?.[0] || {}));

  const { data: prof } = await supabase.from('user_profiles').select('*').limit(1);
  console.log('user_profiles columns:', Object.keys(prof?.[0] || {}));

  const { data: ur } = await supabase.from('user_roles').select('*').limit(1);
  console.log('user_roles columns:', Object.keys(ur?.[0] || {}));

  const { data: r } = await supabase.from('roles').select('*').limit(1);
  console.log('roles columns:', Object.keys(r?.[0] || {}));
}

inspect().catch(console.error);
