// scratch/test_speardigital_signin_flow.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function testSignInFlow() {
  console.log('--- TESTING SPEAR DIGITAL SIGN IN FLOW ---');

  const email = 'info.speardigital@gmail.com';
  const password = 'SpearAdmin@2026';

  // 1. Authenticate as superadmin to check database state
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const { data: orgs } = await supabase.from('organizations').select('*').eq('slug', 'spear-digital');
  console.log('Spear Digital Organization in DB:', orgs);

  const { data: comps } = await supabase.from('companies').select('*').eq('organization_id', orgs[0]?.id);
  console.log('Spear Digital Company in DB:', comps);

  const { data: roles } = await supabase.from('roles').select('*').eq('organization_id', orgs[0]?.id);
  console.log('Spear Digital Roles in DB:', roles);

  // 2. Test roleResolutionService simulation for Spear Digital Admin
  const authUserId = '6973e22b-a647-4ff4-969e-a0a18470f769';
  const { data: newProf, error: pErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  console.log('User profile for Spear Digital in DB:', newProf, pErr ? pErr.message : '');

  const companyAdminRole = roles.find(r => r.code === 'COMPANY_ADMIN');
  console.log('Company Admin Role ID:', companyAdminRole?.id);
}

testSignInFlow().catch(console.error);
