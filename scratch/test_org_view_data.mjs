// scratch/test_org_view_data.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function testOrgView() {
  console.log('--- TESTING HR HEAD (MARI MUTHU) VIEWING ORGANIZATION ARCHITECTURE ---');

  // Sign in as HR Head
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  if (authErr) {
    console.error('Login error:', authErr);
    return;
  }

  console.log('HR Head authenticated. UID:', auth.user.id);

  // 1. Fetch user profile
  const { data: prof } = await supabase
    .from('user_profiles')
    .select('id, organization_id, full_name, user_roles(role_id, roles(code))')
    .eq('auth_user_id', auth.user.id)
    .single();

  console.log('Profile:', prof);
  const orgId = prof.organization_id;

  // 2. Fetch companies for orgId
  const { data: comps, error: compErr } = await supabase
    .from('companies')
    .select('*')
    .eq('organization_id', orgId);

  console.log('Legal Entities (Companies) for Org:', comps, compErr);

  // 3. Fetch branches for orgId
  const { data: branches, error: brErr } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', orgId);

  console.log('Branch Campuses for Org:', branches, brErr);

  if (comps?.length > 0 && branches?.length > 0) {
    console.log('>>> SUCCESS: Legal Entities and Branches cleanly resolved for HR Head! <<<');
  } else {
    console.warn('Check counts:', { compsCount: comps?.length, branchesCount: branches?.length });
  }
}

testOrgView().catch(console.error);
