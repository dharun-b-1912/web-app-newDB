// scratch/investigate_rameshraja.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function investigate() {
  console.log('--- INVESTIGATING rameshrajajcs@gmail.com ---');
  
  // Sign in as Platform Admin first to have RLS read permissions
  const { data: superAuth, error: superErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });
  console.log('Superadmin sign-in:', superErr ? superErr.message : `UID: ${superAuth.user.id}`);

  // 1. Search organizations
  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('*');
  console.log('\n--- ORGANIZATIONS in DB ---', orgErr ? orgErr.message : '');
  console.log(orgs);

  // 2. Search companies
  const { data: companies, error: compErr } = await supabase.from('companies').select('*');
  console.log('\n--- COMPANIES in DB ---', compErr ? compErr.message : '');
  console.log(companies);

  // 3. Search user_profiles for rameshrajajcs@gmail.com
  const { data: profiles, error: profErr } = await supabase.from('user_profiles').select('*');
  console.log('\n--- ALL USER PROFILES ---', profErr ? profErr.message : '');
  console.log(profiles);

  // 4. Search user_roles
  const { data: userRoles, error: urErr } = await supabase.from('user_roles').select('*, roles(*)');
  console.log('\n--- ALL USER ROLES ---', urErr ? urErr.message : '');
  console.log(JSON.stringify(userRoles, null, 2));

  // 5. Search roles
  const { data: roles, error: rolesErr } = await supabase.from('roles').select('*');
  console.log('\n--- ALL ROLES ---', rolesErr ? rolesErr.message : '');
  console.log(roles);
}

investigate().catch(console.error);
