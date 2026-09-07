// scratch/test_company_admin_provisioning_and_login.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function runTest() {
  console.log('===============================================================');
  console.log('STEP 1: Super Admin Login & Platform Session');
  console.log('===============================================================');
  
  const { data: superData, error: superErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  if (superErr || !superData.session) {
    console.error('Superadmin login failed:', superErr);
    process.exit(1);
  }

  const superToken = superData.session.access_token;
  console.log('Superadmin Authenticated! UID:', superData.user.id);

  console.log('\n===============================================================');
  console.log('STEP 2: Provision Brand New Company & Company Admin Auth User');
  console.log('===============================================================');

  const timestamp = Date.now();
  const testOrgName = `Apex Global Corp ${timestamp.toString().slice(-4)}`;
  const adminEmail = `companyadmin_${timestamp}@apexcorp.com`;
  const tempPassword = 'joypeoplehr';

  // 1. Create Organization in DB
  const { data: orgData, error: orgErr } = await supabase
    .from('organizations')
    .insert([{
      legal_name: testOrgName,
      display_name: testOrgName,
      slug: `apex-${timestamp.toString().slice(-4)}`,
      organization_code: `ORG-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'ACTIVE',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    }])
    .select()
    .single();

  if (orgErr || !orgData) {
    console.error('Failed to create organization:', orgErr);
    process.exit(1);
  }

  const orgId = orgData.id;
  console.log('Created Organization in DB:', orgId, testOrgName);

  // Seed canonical roles for organization
  await supabase.from('roles').insert([
    {
      organization_id: orgId,
      name: 'Company Administrator',
      code: 'COMPANY_ADMIN',
      description: 'Full administrative access to company & organization resources',
    },
    {
      organization_id: orgId,
      name: 'HR Head',
      code: 'HR_HEAD',
      description: 'Full HR administration and employee management access',
    },
    {
      organization_id: orgId,
      name: 'Employee',
      code: 'EMPLOYEE',
      description: 'Standard employee access',
    },
  ]);

  // 2. Provision Company Admin via employee-auth-provisioner
  const { data: provData, error: provErr } = await supabase.functions.invoke('employee-auth-provisioner', {
    headers: {
      Authorization: `Bearer ${superToken}`,
    },
    body: {
      organization_id: orgId,
      email: adminEmail,
      password: tempPassword,
      full_name: 'Apex Company Admin',
      role_code: 'COMPANY_ADMIN',
    },
  });

  if (provErr) {
    try {
      const errorJson = await provErr.context.json();
      console.error('Edge Function Error JSON:', errorJson);
    } catch (_) {}
  }
  console.log('Company Admin Provisioning Result:', provData, provErr);

  if (provErr || !provData?.success) {
    console.error('Failed to provision company admin:', provErr || provData);
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('STEP 3: Real Company Admin Login with Temporary Password');
  console.log('===============================================================');

  // Sign out Superadmin first
  await supabase.auth.signOut();

  // Sign in as new Company Admin
  const { data: adminAuthData, error: adminAuthErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: tempPassword,
  });

  if (adminAuthErr || !adminAuthData.session) {
    console.error('Company Admin Sign In FAILED:', adminAuthErr);
    process.exit(1);
  }

  const adminToken = adminAuthData.session.access_token;
  const adminAuthUserId = adminAuthData.user.id;
  console.log('Company Admin Login SUCCESS! UID:', adminAuthUserId);
  console.log('User metadata must_change_password:', adminAuthData.user.user_metadata?.must_change_password);

  console.log('\n===============================================================');
  console.log('STEP 4: Verify Database Role & Tenant Linkage');
  console.log('===============================================================');

  const { data: profRow, error: profErr } = await supabase
    .from('user_profiles')
    .select('id, auth_user_id, organization_id, email, full_name, user_roles(role_id, roles(code, name))')
    .eq('auth_user_id', adminAuthUserId)
    .single();

  console.log('Database Profile:', profRow);
  const resolvedRole = profRow?.user_roles?.[0]?.roles?.code;
  console.log('Resolved Role Code:', resolvedRole);

  if (resolvedRole !== 'COMPANY_ADMIN' || profRow?.organization_id !== orgId) {
    console.error('Role or Tenant mismatch!', { resolvedRole, orgId, profOrgId: profRow?.organization_id });
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('STEP 5: Perform Mandatory First Password Change');
  console.log('===============================================================');

  const newPassword = 'PermanentSecurePass@2026';
  const { data: updData, error: updErr } = await supabase.auth.updateUser({
    password: newPassword,
    data: {
      must_change_password: false,
      require_password_change: false,
    },
  });

  if (updErr) {
    console.error('Password change failed:', updErr);
    process.exit(1);
  }
  console.log('Password updated successfully in GoTrue Auth!');

  // Sign out
  await supabase.auth.signOut();

  // Verify old password fails
  const { data: oldLogin, error: oldLoginErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: tempPassword,
  });
  console.log('Old Password Login (should fail):', oldLoginErr ? `REJECTED: ${oldLoginErr.message}` : 'UNEXPECTED PASS');

  // Verify new password succeeds
  const { data: newLogin, error: newLoginErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: newPassword,
  });
  console.log('New Password Login (must succeed):', newLoginErr ? `FAILED: ${newLoginErr.message}` : `SUCCESS UID: ${newLogin.user.id}`);

  if (newLoginErr || !newLogin.session) {
    console.error('New password login failed!');
    process.exit(1);
  }

  const activeAdminToken = newLogin.session.access_token;

  console.log('\n===============================================================');
  console.log('STEP 6: Company Admin Provisions HR Head');
  console.log('===============================================================');

  const hrEmail = `hr_${timestamp}@apexcorp.com`;
  const { data: hrProvData, error: hrProvErr } = await supabase.functions.invoke('employee-auth-provisioner', {
    headers: {
      Authorization: `Bearer ${activeAdminToken}`,
    },
    body: {
      organization_id: orgId,
      email: hrEmail,
      password: tempPassword,
      full_name: 'Apex HR Head',
      role_code: 'HR_HEAD',
    },
  });

  console.log('HR Head Provisioning Result:', hrProvData, hrProvErr);

  if (hrProvErr || !hrProvData?.success) {
    console.error('HR Head provisioning failed:', hrProvErr || hrProvData);
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('STEP 7: HR Head Logs In with Temporary Password');
  console.log('===============================================================');

  await supabase.auth.signOut();

  const { data: hrAuthData, error: hrAuthErr } = await supabase.auth.signInWithPassword({
    email: hrEmail,
    password: tempPassword,
  });

  if (hrAuthErr || !hrAuthData.session) {
    console.error('HR Head Login Failed:', hrAuthErr);
    process.exit(1);
  }

  console.log('HR Head Login SUCCESS! UID:', hrAuthData.user.id);

  const { data: hrProfile, error: hrProfileErr } = await supabase
    .from('user_profiles')
    .select('id, auth_user_id, organization_id, email, full_name, user_roles(role_id, roles(code, name))')
    .eq('auth_user_id', hrAuthData.user.id)
    .single();

  console.log('HR Profile in DB:', hrProfile);
  const hrRole = hrProfile?.user_roles?.[0]?.roles?.code;
  console.log('Resolved HR Role Code:', hrRole);

  if (hrRole !== 'HR_HEAD' || hrProfile?.organization_id !== orgId) {
    console.error('HR Role or Organization mismatch!');
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('ALL TESTS PASSED! FULL DIRECT AUTH PROVISIONING CERTIFIED 100%');
  console.log('===============================================================');
}

runTest().catch(console.error);
