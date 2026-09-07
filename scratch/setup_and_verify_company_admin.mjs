// scratch/setup_and_verify_company_admin.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL, ANON_KEY);

async function run() {
  console.log('--- SIGN IN AS PLATFORM ADMIN ---');
  const { data: superAuth, error: superErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });
  if (superErr) {
    console.error('Superadmin login failed:', superErr);
    return;
  }
  console.log('Superadmin logged in. UID:', superAuth.user.id);

  // Check roles
  const { data: roles } = await supabase.from('roles').select('*').eq('code', 'COMPANY_ADMIN');
  console.log('Roles matching COMPANY_ADMIN:', roles);

  const orgId = '0944f742-f0e1-4084-8848-894ab0b57da7';
  const roleId = roles?.[0]?.id;

  // Let's create or sign up the Company Admin user for JOY CORPORATE SOLUTIONS PVT LTD
  const companyAdminEmail = 'companyadmin@joycorporatesolutions.com';
  const companyAdminPass = 'CompanyAdmin@123';

  console.log(`\n--- REGISTER / SIGN IN COMPANY ADMIN: ${companyAdminEmail} ---`);
  let companyAdminUid = null;
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: companyAdminEmail,
    password: companyAdminPass,
    options: {
      data: {
        full_name: 'Company Admin JCS',
        organization_id: orgId,
        role: 'COMPANY_ADMIN',
      },
    },
  });

  if (signUpErr) {
    console.log('Sign up notice (may already exist):', signUpErr.message);
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: companyAdminEmail,
      password: companyAdminPass,
    });
    if (signInErr) {
      console.error('Sign in error:', signInErr);
    } else {
      companyAdminUid = signInData.user.id;
      console.log('Signed in Company Admin. UID:', companyAdminUid);
    }
  } else if (signUpData?.user) {
    companyAdminUid = signUpData.user.id;
    console.log('Registered Company Admin. UID:', companyAdminUid);
  }

  if (companyAdminUid) {
    // 1. Ensure user_profile exists
    let { data: prof } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', companyAdminUid)
      .maybeSingle();

    if (!prof) {
      const { data: newProf, error: newProfErr } = await supabase
        .from('user_profiles')
        .insert([{
          auth_user_id: companyAdminUid,
          organization_id: orgId,
          email: companyAdminEmail,
          full_name: 'Company Admin JCS',
          status: 'ACTIVE',
        }])
        .select()
        .single();
      prof = newProf;
      console.log('Inserted profile:', prof, newProfErr ? `Error: ${newProfErr.message}` : '');
    } else {
      console.log('Found existing profile:', prof);
    }

    // 2. Ensure user_roles exists
    if (prof?.id && roleId) {
      let { data: existingUr } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_profile_id', prof.id)
        .eq('role_id', roleId)
        .maybeSingle();

      if (!existingUr) {
        const { data: ur, error: urErr } = await supabase
          .from('user_roles')
          .insert([{
            organization_id: orgId,
            user_profile_id: prof.id,
            role_id: roleId,
          }])
          .select();
        console.log('User role mapped:', ur, urErr ? `Error: ${urErr.message}` : '');
      } else {
        console.log('Existing user role mapping found:', existingUr);
      }
    }
  }

  // Also create a real Employee account to test Employee login & transitions
  const employeeEmail = 'employee@joycorporatesolutions.com';
  const employeePass = 'Employee@123';

  console.log(`\n--- REGISTER / SIGN IN EMPLOYEE: ${employeeEmail} ---`);
  let empUid = null;
  const { data: empSignUp, error: empSignUpErr } = await supabase.auth.signUp({
    email: employeeEmail,
    password: employeePass,
    options: {
      data: {
        full_name: 'Employee JCS',
        organization_id: orgId,
        role: 'EMPLOYEE',
      },
    },
  });

  if (empSignUpErr) {
    console.log('Employee sign up notice:', empSignUpErr.message);
    const { data: empSignIn } = await supabase.auth.signInWithPassword({
      email: employeeEmail,
      password: employeePass,
    });
    if (empSignIn?.user) empUid = empSignIn.user.id;
  } else if (empSignUp?.user) {
    empUid = empSignUp.user.id;
  }

  // Find or create EMPLOYEE role if needed
  let empRoleId = null;
  const { data: empRoles } = await supabase.from('roles').select('*').eq('code', 'EMPLOYEE');
  if (empRoles && empRoles.length > 0) {
    empRoleId = empRoles[0].id;
  } else {
    const { data: newRole } = await supabase.from('roles').insert([{
      organization_id: orgId,
      name: 'Employee',
      code: 'EMPLOYEE',
      description: 'Standard employee access',
    }]).select().single();
    if (newRole) empRoleId = newRole.id;
  }

  if (empUid) {
    let { data: empProf } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', empUid)
      .maybeSingle();

    if (!empProf) {
      const { data: newEmpProf } = await supabase
        .from('user_profiles')
        .insert([{
          auth_user_id: empUid,
          organization_id: orgId,
          email: employeeEmail,
          full_name: 'Employee JCS',
          status: 'ACTIVE',
        }])
        .select()
        .single();
      empProf = newEmpProf;
    }

    if (empProf?.id && empRoleId) {
      let { data: existingEmpUr } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_profile_id', empProf.id)
        .eq('role_id', empRoleId)
        .maybeSingle();

      if (!existingEmpUr) {
        await supabase.from('user_roles').insert([{
          organization_id: orgId,
          user_profile_id: empProf.id,
          role_id: empRoleId,
        }]);
      }
    }
  }

  console.log('\n--- VERIFICATION OF LIVE DB STATE ---');
  const { data: allProfiles } = await supabase.from('user_profiles').select('*, user_roles(*, roles(*))');
  console.log('All Profiles with Roles:', JSON.stringify(allProfiles, null, 2));
}

run().catch(console.error);
