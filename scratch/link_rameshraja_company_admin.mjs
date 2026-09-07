// scratch/link_rameshraja_company_admin.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function linkRameshRaja() {
  console.log('--- LINKING rameshrajajcs@gmail.com AS COMPANY ADMIN ---');
  
  // Sign in as Platform Admin first
  const { data: superAuth, error: superErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });
  if (superErr) throw superErr;
  console.log('Superadmin logged in:', superAuth.user.id);

  const orgId = '0944f742-f0e1-4084-8848-894ab0b57da7';
  const roleId = '1951d219-b46c-4ff6-9692-16a8b1623d12'; // COMPANY_ADMIN
  const email = 'rameshrajajcs@gmail.com';

  // Check if profile exists
  const { data: existingProfile, error: profErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  let profileId = existingProfile?.id;
  if (!profileId) {
    console.log('Creating user_profiles record for', email);
    const { data: newProfile, error: insErr } = await supabase
      .from('user_profiles')
      .insert([{
        organization_id: orgId,
        email: email,
        full_name: 'Ramesh Raja',
        status: 'ACTIVE',
      }])
      .select()
      .single();

    if (insErr) {
      console.error('Insert profile error:', insErr);
      throw insErr;
    }
    profileId = newProfile.id;
    console.log('Created user_profile:', newProfile);
  } else {
    console.log('Found existing user_profile:', existingProfile);
  }

  // Link role
  const { data: existingUserRole } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_profile_id', profileId)
    .eq('role_id', roleId)
    .maybeSingle();

  if (!existingUserRole) {
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
      throw urErr;
    }
    console.log('Created user_role link:', newUR);
  } else {
    console.log('User role already linked:', existingUserRole);
  }

  console.log('\n--- VERIFICATION COMPLETE ---');
}

linkRameshRaja().catch(console.error);
