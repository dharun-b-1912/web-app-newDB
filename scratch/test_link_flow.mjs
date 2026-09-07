// scratch/test_link_flow.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function testLinkFlow() {
  console.log('--- TESTING COMPANY ADMIN PROVISIONING & RESOLUTION FLOW ---');

  // Sign in as Platform Admin
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const orgId = '0944f742-f0e1-4084-8848-894ab0b57da7';
  const roleId = '1951d219-b46c-4ff6-9692-16a8b1623d12';
  const email = 'rameshrajajcs@gmail.com';
  const fullName = 'Ramesh Raja';

  // 1. Check if profile exists for email
  const { data: existingProf } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  let profileId = existingProf?.id;

  if (!profileId) {
    const tempAuthId = crypto.randomUUID();
    console.log('Inserting user_profiles for', email, 'with temp auth_user_id:', tempAuthId);
    const { data: newProf, error: insErr } = await supabase
      .from('user_profiles')
      .insert([{
        organization_id: orgId,
        auth_user_id: tempAuthId,
        email: email,
        full_name: fullName,
        status: 'ACTIVE',
      }])
      .select()
      .single();

    if (insErr) {
      console.error('Insert profile error:', insErr);
      return;
    }
    profileId = newProf.id;
    console.log('Successfully created profile:', newProf);
  } else {
    console.log('Profile already exists:', existingProf);
  }

  // 2. Link to user_roles
  const { data: existingUR } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_profile_id', profileId)
    .eq('role_id', roleId)
    .maybeSingle();

  if (!existingUR) {
    console.log('Linking user_roles to COMPANY_ADMIN...');
    const { data: newUR, error: urErr } = await supabase
      .from('user_roles')
      .insert([{
        organization_id: orgId,
        user_profile_id: profileId,
        role_id: roleId,
      }])
      .select()
      .single();

    if (urErr) {
      console.error('Insert user_role error:', urErr);
      return;
    }
    console.log('Successfully linked user_roles:', newUR);
  } else {
    console.log('user_role already linked:', existingUR);
  }

  // 3. Verify query with user_roles and roles join
  const { data: verifyProf, error: vErr } = await supabase
    .from('user_profiles')
    .select(`
      id,
      auth_user_id,
      organization_id,
      email,
      full_name,
      status,
      user_roles (
        id,
        role_id,
        roles (
          id,
          code,
          name,
          description,
          hierarchy_level,
          is_system_role
        )
      )
    `)
    .eq('email', email)
    .single();

  console.log('\n--- VERIFIED PROFILE RESOLUTION IN SUPABASE ---');
  console.log(JSON.stringify(verifyProf, null, 2));
}

testLinkFlow().catch(console.error);
