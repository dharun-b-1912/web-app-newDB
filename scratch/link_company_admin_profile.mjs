// scratch/link_company_admin_profile.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function link() {
  const { data: superAuth, error: superErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });
  console.log('Superadmin signin:', superErr ? superErr.message : `UID: ${superAuth.user.id}`);

  const orgId = '0944f742-f0e1-4084-8848-894ab0b57da7';
  const roleId = '1951d219-b46c-4ff6-9692-16a8b1623d12'; // COMPANY_ADMIN
  const companyAdminUid = 'd7f81a41-81d7-4cbf-b672-76fab5e6180f';
  const companyAdminEmail = 'companyadmin@joycorporatesolutions.com';

  // 1. Insert user_profile
  const { data: prof, error: profErr } = await supabase
    .from('user_profiles')
    .insert([{
      auth_user_id: companyAdminUid,
      organization_id: orgId,
      email: companyAdminEmail,
      full_name: 'Company Administrator JCS',
      status: 'ACTIVE',
    }])
    .select()
    .single();

  console.log('Profile Insert:', prof, profErr ? profErr.message : '');

  // 2. Insert user_roles
  if (prof?.id) {
    const { data: ur, error: urErr } = await supabase
      .from('user_roles')
      .insert([{
        organization_id: orgId,
        user_profile_id: prof.id,
        role_id: roleId,
      }])
      .select();
    console.log('User Roles Insert:', ur, urErr ? urErr.message : '');
  }

  // 3. Verify
  const { data: finalProfiles } = await supabase
    .from('user_profiles')
    .select('*, user_roles(*, roles(*))');
  console.log('\n--- FINAL PROFILES WITH ROLES ---');
  console.log(JSON.stringify(finalProfiles, null, 2));
}

link().catch(console.error);
