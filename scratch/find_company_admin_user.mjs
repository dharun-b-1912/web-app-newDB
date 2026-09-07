// scratch/find_company_admin_user.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL, ANON_KEY);

async function find() {
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const { data: invs, error: invErr } = await supabase.from('organization_invitations').select('*');
  console.log('--- INVITATIONS ---', invErr ? invErr.message : invs);

  const { data: emps, error: empsErr } = await supabase.from('employees').select('*');
  console.log('--- EMPLOYEES ---', empsErr ? empsErr.message : emps);
}

find().catch(console.error);
