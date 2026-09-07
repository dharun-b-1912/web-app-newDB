// scratch/test_complete_role_resolution.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function simulateRoleResolution(authUserId, emailLower, userMeta = {}) {
  console.log(`\n======================================================`);
  console.log(`Resolving for: ${emailLower} (UID: ${authUserId})`);
  console.log(`======================================================`);

  let isPlatformAdmin = false;
  let organizationId = null;
  let employeeId = null;
  let fullName = userMeta.full_name || emailLower.split('@')[0] || 'User';
  let phone = userMeta.phone || null;
  let avatarUrl = userMeta.avatar_url || null;
  let rolesList = [];

  // 1. Check Platform Admin
  if (emailLower === 'superadmin@joypeoplehr.com') {
    isPlatformAdmin = true;
    return {
      primaryRole: 'Super Admin',
      destinationRoute: 'platform-dashboard',
      isPlatformAdmin: true,
      organizationId: 'platform-root',
    };
  }

  // 2. Query user_profiles in Supabase
  let profileRow = null;
  if (authUserId) {
    const { data: profById } = await supabase
      .from('user_profiles')
      .select(`
        id,
        auth_user_id,
        organization_id,
        employee_id,
        email,
        full_name,
        phone,
        avatar_url,
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
      .maybeSingle();

    if (profById) {
      profileRow = profById;
    }
  }

  if (!profileRow && emailLower) {
    const { data: profByEmail } = await supabase
      .from('user_profiles')
      .select(`
        id,
        auth_user_id,
        organization_id,
        employee_id,
        email,
        full_name,
        phone,
        avatar_url,
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
      .eq('email', emailLower)
      .maybeSingle();

    if (profByEmail) {
      profileRow = profByEmail;
      if (authUserId && profByEmail.auth_user_id !== authUserId) {
        await supabase
          .from('user_profiles')
          .update({ auth_user_id: authUserId, status: 'ACTIVE' })
          .eq('id', profByEmail.id);
      }
    }
  }

  // 3. If no profile exists, check if user is admin of any organization or self-heal
  if (!profileRow) {
    console.log('No user_profile found. Checking organizations for self-healing link...');
    const { data: orgs } = await supabase.from('organizations').select('*');
    const targetOrg = (orgs && orgs.length > 0) ? orgs[0] : null;

    if (targetOrg) {
      console.log(`Self-healing profile for org: ${targetOrg.legal_name} (${targetOrg.id})`);
      organizationId = targetOrg.id;

      // Find or create COMPANY_ADMIN role
      let roleRow = null;
      const { data: existingRoles } = await supabase
        .from('roles')
        .select('*')
        .eq('organization_id', targetOrg.id)
        .eq('code', 'COMPANY_ADMIN')
        .maybeSingle();

      if (existingRoles) {
        roleRow = existingRoles;
      } else {
        const { data: createdRole } = await supabase
          .from('roles')
          .insert([{
            organization_id: targetOrg.id,
            name: 'Company Administrator',
            code: 'COMPANY_ADMIN',
            description: 'Full administrative access to company & organization resources',
          }])
          .select()
          .single();
        roleRow = createdRole;
      }

      // If user has a valid Auth UID in auth.users, create user_profiles and user_roles
      if (authUserId) {
        try {
          const { data: newProf, error: pErr } = await supabase
            .from('user_profiles')
            .insert([{
              auth_user_id: authUserId,
              organization_id: targetOrg.id,
              email: emailLower,
              full_name: fullName,
              status: 'ACTIVE',
            }])
            .select()
            .single();

          if (!pErr && newProf) {
            profileRow = newProf;
            if (roleRow) {
              await supabase.from('user_roles').insert([{
                organization_id: targetOrg.id,
                user_profile_id: newProf.id,
                role_id: roleRow.id,
              }]);
            }
          }
        } catch (e) {
          console.warn('Profile self-heal insert notice:', e.message);
        }
      }

      // Default role to Company Admin for company creator
      rolesList.push({
        id: roleRow?.id || 'role-company-admin',
        name: 'Company Admin',
        organization_id: targetOrg.id,
        description: 'Company Admin Role',
      });
    }
  } else {
    organizationId = profileRow.organization_id;
    employeeId = profileRow.employee_id;
    if (profileRow.full_name) fullName = profileRow.full_name;
    if (profileRow.phone) phone = profileRow.phone;
    if (profileRow.avatar_url) avatarUrl = profileRow.avatar_url;

    const rawUserRoles = profileRow.user_roles || [];
    for (const ur of rawUserRoles) {
      const r = ur.roles;
      if (r) {
        rolesList.push({
          id: r.id,
          name: r.name || r.code,
          code: r.code,
          organization_id: organizationId,
        });
      }
    }
  }

  // 4. Role Evaluation
  const normalizedCodes = rolesList.map((r) => String(r.code || r.name || '').trim().toUpperCase());
  let primaryRole = 'Employee';

  if (
    normalizedCodes.some((c) =>
      ['COMPANY_ADMIN', 'COMPANY ADMIN', 'ORGANIZATION_ADMIN', 'ORGANIZATION ADMIN', 'OWNER'].includes(c)
    ) ||
    userMeta.role === 'COMPANY_ADMIN' ||
    userMeta.role === 'Company Admin'
  ) {
    primaryRole = 'Company Admin';
  } else if (
    normalizedCodes.some((c) => ['HR_HEAD', 'HR HEAD'].includes(c)) ||
    userMeta.role === 'HR_HEAD'
  ) {
    primaryRole = 'HR Head';
  } else if (
    normalizedCodes.some((c) => ['HR_ADMIN', 'HR ADMIN', 'PAYROLL_ADMIN'].includes(c)) ||
    userMeta.role === 'HR_ADMIN'
  ) {
    primaryRole = 'HR Admin';
  } else if (
    normalizedCodes.some((c) => ['MANAGER'].includes(c)) ||
    userMeta.role === 'MANAGER'
  ) {
    primaryRole = 'Manager';
  } else if (
    normalizedCodes.some((c) => ['TEAM_LEAD', 'LEAD'].includes(c)) ||
    userMeta.role === 'TEAM_LEAD'
  ) {
    primaryRole = 'Team Lead';
  } else if (
    normalizedCodes.some((c) => ['EMPLOYEE'].includes(c)) ||
    userMeta.role === 'EMPLOYEE'
  ) {
    primaryRole = 'Employee';
  } else if (organizationId && !normalizedCodes.includes('EMPLOYEE')) {
    // If user belongs to organization and is not an employee, resolve as Company Admin
    primaryRole = 'Company Admin';
  }

  // 5. Compute Destination Route
  let destinationRoute = 'ess-dashboard';
  if (primaryRole === 'Super Admin') destinationRoute = 'platform-dashboard';
  else if (primaryRole === 'Company Admin') destinationRoute = 'executive-overview';
  else if (primaryRole === 'HR Head' || primaryRole === 'HR Admin') destinationRoute = 'dashboard';
  else if (primaryRole === 'Manager') destinationRoute = 'dashboard';
  else if (primaryRole === 'Team Lead') destinationRoute = 'tl-dashboard';
  else destinationRoute = 'ess-dashboard';

  return {
    primaryRole,
    destinationRoute,
    isPlatformAdmin: false,
    organizationId,
    fullName,
    rolesList,
  };
}

async function runTests() {
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  // Test 1: Ramesh Raja (rameshrajajcs@gmail.com)
  const res1 = await simulateRoleResolution('e1e15896-498e-47f0-943b-1a7f0af2ef3c', 'rameshrajajcs@gmail.com');
  console.log('Test 1 Result (rameshrajajcs@gmail.com):', res1);

  // Test 2: Existing Company Admin (companyadmin@joycorporatesolutions.com)
  const res2 = await simulateRoleResolution('d7f81a41-81d7-4cbf-b672-76fab5e6180f', 'companyadmin@joycorporatesolutions.com');
  console.log('Test 2 Result (companyadmin@joycorporatesolutions.com):', res2);

  // Test 3: Platform Super Admin (superadmin@joypeoplehr.com)
  const res3 = await simulateRoleResolution('99722e27-88be-4b14-9575-8b21cc9e3f06', 'superadmin@joypeoplehr.com');
  console.log('Test 3 Result (superadmin@joypeoplehr.com):', res3);
}

runTests().catch(console.error);
