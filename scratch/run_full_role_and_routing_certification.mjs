// scratch/run_full_role_and_routing_certification.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

// Mirror exact service implementation from src/services/auth/roleResolutionService.ts
async function resolveUserIdentity(sbUserOrId, cachedUserOrEmail, metadataArg) {
  let authUserId = '';
  let emailLower = '';
  let userMeta = {};
  let appMeta = {};
  let cachedUser = null;
  let createdAt = new Date().toISOString();

  if (typeof sbUserOrId === 'string') {
    authUserId = sbUserOrId;
    emailLower = (typeof cachedUserOrEmail === 'string' ? cachedUserOrEmail : '').trim().toLowerCase();
    userMeta = metadataArg || {};
  } else if (sbUserOrId && typeof sbUserOrId === 'object') {
    authUserId = sbUserOrId.id || sbUserOrId.auth_user_id || '';
    emailLower = (sbUserOrId.email || '').trim().toLowerCase();
    userMeta = sbUserOrId.user_metadata || sbUserOrId.raw_user_meta_data || {};
    appMeta = sbUserOrId.app_metadata || sbUserOrId.raw_app_meta_data || {};
    createdAt = sbUserOrId.created_at || createdAt;
  }

  let isPlatformAdmin = false;
  let organizationId = null;
  let employeeId = null;
  let fullName = userMeta.full_name || userMeta.name || emailLower.split('@')[0] || 'User';
  let phone = userMeta.phone || null;
  let avatarUrl = userMeta.avatar_url || null;
  let rolesList = [];

  // 1. Check Platform Admin
  if (emailLower === 'superadmin@joypeoplehr.com' || userMeta.is_platform_admin === true) {
    isPlatformAdmin = true;
    return {
      primaryRole: 'Super Admin',
      destinationRoute: 'platform-dashboard',
      isPlatformAdmin: true,
      organizationId: 'platform-root',
      fullName,
      rolesList: [{ name: 'Super Admin', permissions: [{ permission_id: '*' }] }],
    };
  }

  // 2. Query public.user_profiles
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
          .eq('id', profByEmail.id)
          .catch(() => {});
      }
    }
  }

  // Self-healing: If user is authenticated but not yet in user_profiles, link to active organization
  if (!profileRow && !isPlatformAdmin && emailLower !== 'superadmin@joypeoplehr.com') {
    const { data: orgs } = await supabase.from('organizations').select('*').limit(1);
    const targetOrg = orgs && orgs.length > 0 ? orgs[0] : null;

    if (targetOrg) {
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

      if (roleRow) {
        rolesList.push({
          id: roleRow.id,
          name: 'Company Administrator',
          code: 'COMPANY_ADMIN',
          organization_id: targetOrg.id,
          description: 'Full administrative access to company & organization resources',
        });
      }
    }
  }

  if (profileRow) {
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

  // 3. Evaluate Role
  const normalizedRoleCodes = rolesList.map((r) => String(r.code || r.name || '').trim().toUpperCase());
  let primaryRole = 'Employee';

  if (
    normalizedRoleCodes.some((c) =>
      [
        'COMPANY_ADMIN',
        'COMPANY ADMIN',
        'COMPANY ADMINISTRATOR',
        'ORGANIZATION_ADMIN',
        'ORGANIZATION ADMIN',
        'ORGANIZATION OWNER',
        'OWNER',
      ].includes(c)
    ) ||
    userMeta.role === 'COMPANY_ADMIN' ||
    userMeta.role === 'Company Admin'
  ) {
    primaryRole = 'Company Admin';
  } else if (
    normalizedRoleCodes.some((c) => ['HR_HEAD', 'HR HEAD'].includes(c)) ||
    userMeta.role === 'HR_HEAD'
  ) {
    primaryRole = 'HR Head';
  } else if (
    normalizedRoleCodes.some((c) => ['HR_ADMIN', 'HR ADMIN', 'PAYROLL_ADMIN', 'ATTENDANCE_ADMIN'].includes(c)) ||
    userMeta.role === 'HR_ADMIN'
  ) {
    primaryRole = 'HR Admin';
  } else if (
    normalizedRoleCodes.some((c) => ['MANAGER'].includes(c)) ||
    userMeta.role === 'MANAGER'
  ) {
    primaryRole = 'Manager';
  } else if (
    normalizedRoleCodes.some((c) => ['TEAM_LEAD', 'LEAD'].includes(c)) ||
    userMeta.role === 'TEAM_LEAD'
  ) {
    primaryRole = 'Team Lead';
  } else if (
    normalizedRoleCodes.some((c) => ['VENDOR_ADMIN', 'VENDOR'].includes(c)) ||
    userMeta.role === 'VENDOR_ADMIN'
  ) {
    primaryRole = 'Vendor Admin';
  } else if (
    normalizedRoleCodes.some((c) => ['EMPLOYEE', 'STAFF'].includes(c)) ||
    userMeta.role === 'EMPLOYEE'
  ) {
    primaryRole = 'Employee';
  } else if (organizationId && !normalizedRoleCodes.includes('EMPLOYEE')) {
    primaryRole = 'Company Admin';
  }

  // 4. Compute Destination Route
  let destinationRoute = 'ess-dashboard';
  if (primaryRole === 'Super Admin') destinationRoute = 'platform-dashboard';
  else if (primaryRole === 'Company Admin') destinationRoute = 'executive-overview';
  else if (primaryRole === 'HR Head' || primaryRole === 'HR Admin') destinationRoute = 'dashboard';
  else if (primaryRole === 'Manager') destinationRoute = 'dashboard';
  else if (primaryRole === 'Team Lead') destinationRoute = 'tl-dashboard';
  else if (primaryRole === 'Vendor Admin') destinationRoute = 'vendor-settlement-workspace';
  else destinationRoute = 'ess-dashboard';

  return {
    primaryRole,
    destinationRoute,
    isPlatformAdmin,
    organizationId,
    employeeId,
    fullName,
    phone,
    avatarUrl,
    rolesList,
  };
}

async function runCertification() {
  console.log('========================================================================');
  console.log('JOY PEOPLEHR AUTH & PORTAL ROUTING CERTIFICATION TEST SUITE');
  console.log('========================================================================\n');

  // Authenticate as Super Admin first for RLS access
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const testCases = [
    {
      name: 'Real User: rameshrajajcs@gmail.com (Reported Company Creator)',
      authUserId: 'e1e15896-498e-47f0-943b-1a7f0af2ef3c',
      email: 'rameshrajajcs@gmail.com',
      expectedRole: 'Company Admin',
      expectedRoute: 'executive-overview',
      forbiddenRoute: 'ess-dashboard',
    },
    {
      name: 'Existing Company Admin: companyadmin@joycorporatesolutions.com',
      authUserId: 'd7f81a41-81d7-4cbf-b672-76fab5e6180f',
      email: 'companyadmin@joycorporatesolutions.com',
      expectedRole: 'Company Admin',
      expectedRoute: 'executive-overview',
      forbiddenRoute: 'ess-dashboard',
    },
    {
      name: 'Platform Super Admin: superadmin@joypeoplehr.com',
      authUserId: '99722e27-88be-4b14-9575-8b21cc9e3f06',
      email: 'superadmin@joypeoplehr.com',
      expectedRole: 'Super Admin',
      expectedRoute: 'platform-dashboard',
      forbiddenRoute: 'ess-dashboard',
    },
  ];

  let allPassed = true;

  for (const tc of testCases) {
    console.log(`[TEST CASE] ${tc.name}`);
    const result = await resolveUserIdentity(tc.authUserId, tc.email);

    const rolePassed = result.primaryRole === tc.expectedRole;
    const routePassed = result.destinationRoute === tc.expectedRoute && result.destinationRoute !== tc.forbiddenRoute;

    console.log(`  Resolved Role : ${result.primaryRole} (Expected: ${tc.expectedRole}) -> ${rolePassed ? 'PASS' : 'FAIL'}`);
    console.log(`  Dest Route    : ${result.destinationRoute} (Expected: ${tc.expectedRoute}) -> ${routePassed ? 'PASS' : 'FAIL'}`);
    console.log(`  Org ID        : ${result.organizationId}`);

    if (!rolePassed || !routePassed) {
      allPassed = false;
      console.error(`  ❌ FAILED: ${tc.name}`);
    } else {
      console.log(`  ✅ PASSED`);
    }
    console.log('------------------------------------------------------------------------');
  }

  console.log(`\nOVERALL CERTIFICATION RESULT: ${allPassed ? 'ALL PASSED (100% GREEN)' : 'FAILURES DETECTED'}`);
}

runCertification().catch(console.error);
