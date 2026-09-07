// scratch/test_speardigital_login.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function testSpearDigitalLogin() {
  console.log('--- TESTING SPEAR DIGITAL LOGIN & PROVISIONING ---');

  // Sign in as Platform Admin first
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const spearOrgId = '80f6721c-63c0-40ec-852c-57ddae997eee';

  // 1. Ensure companies record exists for Spear Digital
  const { data: existingComp } = await supabase
    .from('companies')
    .select('*')
    .eq('organization_id', spearOrgId)
    .maybeSingle();

  if (!existingComp) {
    console.log('Creating canonical company for Spear Digital...');
    const { data: newComp, error: compErr } = await supabase
      .from('companies')
      .insert([{
        organization_id: spearOrgId,
        legal_name: 'Spear Digital',
        trade_name: 'Spear Digital',
        company_code: 'CMP-2916',
        country: 'India',
        city: 'Chennai',
        state: 'Tamil Nadu',
      }])
      .select()
      .single();
    console.log('Created company:', newComp, compErr ? compErr.message : '');
  } else {
    console.log('Company already exists:', existingComp);
  }

  // 2. Test roleResolutionService for info.speardigital@gmail.com
  const email = 'info.speardigital@gmail.com';
  const authUserId = '6973e22b-a647-4ff4-969e-a0a18470f769';

  // Check roles
  const { data: roles } = await supabase.from('roles').select('*').eq('organization_id', spearOrgId);
  console.log('Roles for Spear Digital in DB:', roles);
}

testSpearDigitalLogin().catch(console.error);
