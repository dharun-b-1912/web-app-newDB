// scratch/setup_rameshraja_identity.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function setupRameshRaja() {
  console.log('--- SETTING UP rameshrajajcs@gmail.com IN LIVE SUPABASE ---');

  // Sign in as Platform Admin
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const authUserId = 'f2528221-137c-43a2-96d0-fb8606073e0a';
  const orgId = '0944f742-f0e1-4084-8848-894ab0b57da7';
  const roleId = '1951d219-b46c-4ff6-9692-16a8b1623d12';
  const email = 'rameshrajajcs@gmail.com';
  const fullName = 'Ramesh Raja';

  // 1. Check if user_profile exists
  const { data: existingProf } = await supabase
    .from('user_profiles')
    .select('*')
    .or(`auth_user_id.eq.${authUserId},email.eq.${email}`)
    .maybeSingle();

  let profileId = existingProf?.id;

  if (!profileId) {
    console.log('Inserting user_profiles for', email, 'with auth_user_id:', authUserId);
    const { data: newProf, error: insErr } = await supabase
      .from('user_profiles')
      .insert([{
        auth_user_id: authUserId,
        organization_id: orgId,
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
    console.log('Successfully created user_profile:', newProf);
  } else {
    console.log('Found user_profile:', existingProf);
    // Ensure auth_user_id and status are correct
    if (existingProf.auth_user_id !== authUserId || existingProf.status !== 'ACTIVE') {
      const { data: updatedProf, error: upErr } = await supabase
        .from('user_profiles')
        .update({
          auth_user_id: authUserId,
          status: 'ACTIVE',
          organization_id: orgId,
        })
        .eq('id', profileId)
        .select()
        .single();
      console.log('Updated profile:', updatedProf, upErr ? upErr.message : '');
    }
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
    console.log('User role already linked:', existingUR);
  }

  // 3. Verify complete identity resolution
  const { data: finalCheck, error: fcErr } = await supabase
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
    .eq('auth_user_id', authUserId)
    .single();

  console.log('\n--- FINAL VERIFIED RESOLUTION FOR rameshrajajcs@gmail.com ---');
  console.log(JSON.stringify(finalCheck, null, 2));
}

setupRameshRaja().catch(console.error);
