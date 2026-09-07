// scratch/inspect_live_company_admin.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Connecting to Canonical Supabase:', URL);
const supabase = createClient(URL, SERVICE_KEY || ANON_KEY);

async function inspect() {
  // Sign in as Platform Admin first
  const { data: auth, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  if (loginErr) {
    console.error('Superadmin login failed:', loginErr);
    return;
  }

  console.log('Logged in as Platform Admin. Auth UID:', auth.user.id);

  // 1. User Profiles
  const { data: profiles, error: profErr } = await supabase.from('user_profiles').select('*');
  console.log('\n--- USER PROFILES ---', profErr ? `Error: ${profErr.message}` : `Count: ${profiles?.length}`);
  console.log(profiles);

  // 2. User Roles
  const { data: userRoles, error: urErr } = await supabase.from('user_roles').select('*, roles(*)');
  console.log('\n--- USER ROLES ---', urErr ? `Error: ${urErr.message}` : `Count: ${userRoles?.length}`);
  console.log(userRoles);

  // 3. Roles
  const { data: roles, error: rolesErr } = await supabase.from('roles').select('*');
  console.log('\n--- ROLES ---', rolesErr ? `Error: ${rolesErr.message}` : `Count: ${roles?.length}`);
  console.log(roles);

  // 4. Organizations
  const { data: orgs, error: orgsErr } = await supabase.from('organizations').select('*');
  console.log('\n--- ORGANIZATIONS ---', orgsErr ? `Error: ${orgsErr.message}` : `Count: ${orgs?.length}`);
  console.log(orgs);

  // 5. Companies
  const { data: companies, error: compErr } = await supabase.from('companies').select('*');
  console.log('\n--- COMPANIES ---', compErr ? `Error: ${compErr.message}` : `Count: ${companies?.length}`);
  console.log(companies);
}

inspect().catch(console.error);
