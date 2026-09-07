import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const ORG_1_ID = '860f2a6a-23ea-48cf-bf33-666115e32c2b'; // Joy Technologies Live Org
const COMP_1_ID = '77e102b1-8699-4db1-abdd-48ab08b2bf2d'; // Joy Technologies India Pvt Ltd

const ORG_2_ID = 'e539780b-df07-4b45-beaa-ccf1d2224be8'; // Live Provision Test Org
const COMP_2_ID = '5537b879-7299-48a4-bdfe-16e327a2d3d0'; // Live Provision Test Company

const ACCOUNTS = {
  platformAdmin: {
    name: 'Platform Admin',
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
    authUid: '99722e27-88be-4b14-9575-8b21cc9e3f06'
  },
  companyAdmin: {
    name: 'Company Admin',
    email: 'e2e.companyadmin.1788509617070@joypeoplehr.com',
    password: 'JoyCompAdmin@2026',
    authUid: '9341f9fb-f7f8-4d29-b00b-da839bb8204b',
    orgId: ORG_2_ID,
    compId: COMP_2_ID
  },
  hrHead: {
    name: 'HR Head',
    email: 'e2e.hrhead.1788509683332@joypeoplehr.com',
    password: 'JoyHrHead@2026',
    authUid: '9f439708-1262-4e3b-8962-21e9f68e1734',
    orgId: ORG_2_ID,
    compId: COMP_2_ID
  },
  employee: {
    name: 'Employee',
    email: 'e2e.employee.1788509696336@joypeoplehr.com',
    password: 'JoyEmployee@2026',
    authUid: '4b49a236-391b-44c3-93f6-87e6d4100097',
    profileId: '82bfde5a-369b-4bdf-9afd-7fec6c103e65',
    empId: '7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5',
    orgId: ORG_2_ID,
    compId: COMP_2_ID
  }
};

async function getAuthenticatedClient(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Failed to sign in as ${email}: ${error?.message}`);
  }
  return { client, session: data.session, user: data.user };
}

async function runPhaseEAuthorizationTests() {
  console.log('================================================================');
  console.log('JOY PEOPLEHR — PHASE E ROLE AUTHORIZATION & RLS ISOLATION SUITE');
  console.log('Canonical Supabase:', SUPABASE_URL);
  console.log('================================================================\n');

  const report = {
    identityMatrix: [],
    platformAdmin: {},
    companyAdmin: {},
    hrHead: {},
    employee: {},
    crossOrg: {},
    crossEmp: {},
    anomaly: {}
  };

  // ============================================================
  // TEST 1: Identity & Role Resolution Matrix
  // ============================================================
  console.log('>>> [1/7] Identity & Role Resolution Matrix...');
  for (const [key, acc] of Object.entries(ACCOUNTS)) {
    const { client, user } = await getAuthenticatedClient(acc.email, acc.password);
    
    // Resolve profile
    const { data: profile } = await client
      .from('user_profiles')
      .select('id, auth_user_id, organization_id, employee_id, full_name, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    // Resolve user_roles
    let roleCode = 'NONE';
    let roleId = 'NONE';
    if (profile) {
      const { data: userRole } = await client
        .from('user_roles')
        .select('role_id, roles(id, code, name)')
        .eq('user_profile_id', profile.id)
        .maybeSingle();
      if (userRole) {
        roleId = userRole.role_id;
        roleCode = userRole.roles?.code || userRole.roles?.name || 'UNKNOWN';
      }
    }

    const row = {
      tier: acc.name,
      authUid: user.id,
      profileId: profile?.id || 'NULL',
      roleId,
      roleCode,
      orgId: profile?.organization_id || 'NULL',
      empId: profile?.employee_id || 'NULL'
    };
    report.identityMatrix.push(row);
    console.log(`  - [${acc.name}] Auth UID: ${row.authUid} | Profile ID: ${row.profileId} | Role: ${row.roleCode} | Org: ${row.orgId} | Emp: ${row.empId}`);
  }

  // ============================================================
  // TEST 2: Platform Admin Authorization
  // ============================================================
  console.log('\n>>> [2/7] Platform Admin Authorization Checks...');
  const pa = await getAuthenticatedClient(ACCOUNTS.platformAdmin.email, ACCOUNTS.platformAdmin.password);
  
  // Can read all organizations
  const { data: paOrgs, error: paOrgsErr } = await pa.client.from('organizations').select('id, legal_name');
  const paCanReadMultipleOrgs = Boolean(paOrgs && paOrgs.length >= 2);
  console.log(`  - Platform Admin can read multiple orgs: ${paCanReadMultipleOrgs} (Found: ${paOrgs?.length || 0})`);

  // Can read all companies
  const { data: paComps, error: paCompsErr } = await pa.client.from('companies').select('id, legal_name, organization_id');
  const paCanReadMultipleComps = Boolean(paComps && paComps.length >= 2);
  console.log(`  - Platform Admin can read multiple companies: ${paCanReadMultipleComps} (Found: ${paComps?.length || 0})`);

  report.platformAdmin = {
    canReadMultipleOrgs: paCanReadMultipleOrgs,
    orgCount: paOrgs?.length || 0,
    canReadMultipleComps: paCanReadMultipleComps,
    compCount: paComps?.length || 0
  };

  // ============================================================
  // TEST 3: Company Admin Authorization & Negative Tests
  // ============================================================
  console.log('\n>>> [3/7] Company Admin Authorization & Isolation Checks...');
  const ca = await getAuthenticatedClient(ACCOUNTS.companyAdmin.email, ACCOUNTS.companyAdmin.password);

  // Can read own organization & company
  const { data: caOwnOrg } = await ca.client.from('organizations').select('id, legal_name').eq('id', ORG_2_ID);
  const { data: caOwnComp } = await ca.client.from('companies').select('id, legal_name').eq('id', COMP_2_ID);
  console.log(`  - CA read own Org: ${caOwnOrg?.length > 0} | Own Company: ${caOwnComp?.length > 0}`);

  // Negative: CA read other organization (ORG_1)
  const { data: caOtherOrg, error: caOtherOrgErr } = await ca.client.from('organizations').select('id, legal_name').eq('id', ORG_1_ID);
  const caOtherOrgBlocked = (!caOtherOrg || caOtherOrg.length === 0);
  console.log(`  - [NEGATIVE] CA read other Org (ORG_1) blocked: ${caOtherOrgBlocked}`);

  // Negative: CA read other company (COMP_1)
  const { data: caOtherComp, error: caOtherCompErr } = await ca.client.from('companies').select('id, legal_name').eq('id', COMP_1_ID);
  const caOtherCompBlocked = (!caOtherComp || caOtherComp.length === 0);
  console.log(`  - [NEGATIVE] CA read other Company (COMP_1) blocked: ${caOtherCompBlocked}`);

  // Negative: CA modify platform_users
  const { data: caModPlat, error: caModPlatErr } = await ca.client
    .from('platform_users')
    .insert({ email: 'fake.platform.user@joy.com', role: 'SUPER_ADMIN' });
  const caModPlatBlocked = Boolean(caModPlatErr);
  console.log(`  - [NEGATIVE] CA modify platform_users blocked: ${caModPlatBlocked} (${caModPlatErr?.message || 'BLOCKED'})`);

  report.companyAdmin = {
    canAccessOwnOrg: Boolean(caOwnOrg?.length),
    canAccessOwnComp: Boolean(caOwnComp?.length),
    otherOrgBlocked: caOtherOrgBlocked,
    otherCompBlocked: caOtherCompBlocked,
    platformModBlocked: caModPlatBlocked
  };

  // ============================================================
  // TEST 4: HR Head Authorization & Negative Tests
  // ============================================================
  console.log('\n>>> [4/7] HR Head Authorization & Isolation Checks...');
  const hr = await getAuthenticatedClient(ACCOUNTS.hrHead.email, ACCOUNTS.hrHead.password);

  // Can read own company employees
  const { data: hrEmps } = await hr.client.from('employees').select('id, employee_code, first_name').eq('organization_id', ORG_2_ID);
  console.log(`  - HR Head read employees in Org 2: ${hrEmps?.length > 0} (Found: ${hrEmps?.length || 0})`);

  // Negative: HR Head read other organization (ORG_1)
  const { data: hrOtherOrg } = await hr.client.from('organizations').select('id').eq('id', ORG_1_ID);
  const hrOtherOrgBlocked = (!hrOtherOrg || hrOtherOrg.length === 0);
  console.log(`  - [NEGATIVE] HR Head read other Org blocked: ${hrOtherOrgBlocked}`);

  // Negative: HR Head modify organizations
  const { data: hrModOrg, error: hrModOrgErr } = await hr.client
    .from('organizations')
    .update({ legal_name: 'Hacked Org' })
    .eq('id', ORG_2_ID);
  const hrModOrgBlocked = Boolean(hrModOrgErr || (hrModOrg && hrModOrg.length === 0));
  console.log(`  - [NEGATIVE] HR Head modify organizations blocked: ${hrModOrgBlocked}`);

  report.hrHead = {
    canReadEmps: Boolean(hrEmps?.length),
    otherOrgBlocked: hrOtherOrgBlocked,
    orgModBlocked: hrModOrgBlocked
  };

  // ============================================================
  // TEST 5: Employee Authorization & Negative Tests
  // ============================================================
  console.log('\n>>> [5/7] Employee Self-Service & Isolation Checks...');
  const emp = await getAuthenticatedClient(ACCOUNTS.employee.email, ACCOUNTS.employee.password);

  // Read own profile
  const { data: empOwnProfile } = await emp.client.from('user_profiles').select('*').eq('id', ACCOUNTS.employee.profileId).single();
  console.log(`  - Employee read own profile: ${Boolean(empOwnProfile)}`);

  // Read own employee record
  const { data: empOwnRec } = await emp.client.from('employees').select('*').eq('id', ACCOUNTS.employee.empId).single();
  console.log(`  - Employee read own employee record: ${Boolean(empOwnRec)}`);

  // Negative: Employee modify organizations table
  const { error: empModOrgErr } = await emp.client.from('organizations').update({ legal_name: 'Hacked By Employee' }).eq('id', ORG_2_ID);
  console.log(`  - [NEGATIVE] Employee modify organizations blocked: ${Boolean(empModOrgErr)}`);

  // Negative: Employee modify roles table
  const { error: empModRoleErr } = await emp.client.from('roles').insert({ name: 'Hacked Role', organization_id: ORG_2_ID });
  console.log(`  - [NEGATIVE] Employee create role blocked: ${Boolean(empModRoleErr)}`);

  // Negative: Employee read other org
  const { data: empOtherOrg } = await emp.client.from('organizations').select('id').eq('id', ORG_1_ID);
  const empOtherOrgBlocked = (!empOtherOrg || empOtherOrg.length === 0);
  console.log(`  - [NEGATIVE] Employee read other Org blocked: ${empOtherOrgBlocked}`);

  report.employee = {
    canReadOwnProfile: Boolean(empOwnProfile),
    canReadOwnRec: Boolean(empOwnRec),
    orgModBlocked: Boolean(empModOrgErr),
    roleModBlocked: Boolean(empModRoleErr),
    otherOrgBlocked: empOtherOrgBlocked
  };

  // ============================================================
  // TEST 6: Cross-Organization & Cross-Employee Audit
  // ============================================================
  console.log('\n>>> [6/7] Cross-Organization & Cross-Employee Audit...');
  
  // Cross Org Audit
  const crossOrgExecutable = (paOrgs && paOrgs.length >= 2);
  console.log(`  - Cross-Organization Test Executable: ${crossOrgExecutable} (Organizations in DB = ${paOrgs?.length})`);
  console.log(`  - Company Admin Cross-Org Isolation: ${caOtherOrgBlocked ? 'PASS (DENIED)' : 'FAIL'}`);
  console.log(`  - HR Head Cross-Org Isolation: ${hrOtherOrgBlocked ? 'PASS (DENIED)' : 'FAIL'}`);
  console.log(`  - Employee Cross-Org Isolation: ${empOtherOrgBlocked ? 'PASS (DENIED)' : 'FAIL'}`);

  // Cross Employee Audit
  const { data: allEmps } = await pa.client.from('employees').select('id');
  const totalEmployees = allEmps?.length || 0;
  const crossEmpExecutable = totalEmployees >= 2;
  console.log(`  - Cross-Employee Test Executable: ${crossEmpExecutable}`);
  console.log(`  - Reason: Total employee records in database = ${totalEmployees}`);
  if (!crossEmpExecutable) {
    console.log('  - [REPORT] CROSS-EMPLOYEE NEGATIVE TEST = NOT EXECUTABLE (ONLY ONE EMPLOYEE EXISTS)');
  }

  report.crossOrg = {
    executable: crossOrgExecutable,
    status: (caOtherOrgBlocked && hrOtherOrgBlocked && empOtherOrgBlocked) ? 'PASS' : 'FAIL'
  };
  report.crossEmp = {
    executable: crossEmpExecutable,
    reason: 'ONLY ONE EMPLOYEE EXISTS IN CANONICAL DATABASE'
  };

  // ============================================================
  // TEST 7: Platform Admin Role Anomaly Investigation
  // ============================================================
  console.log('\n>>> [7/7] Platform Admin Role Mapping Forensic Investigation...');
  const paProfile = report.identityMatrix.find(r => r.tier === 'Platform Admin');
  console.log(`  - Platform Admin user_profile_id: ${paProfile.profileId}`);
  console.log(`  - Platform Admin user_roles role_id: ${paProfile.roleId}`);
  console.log(`  - Platform Admin assigned role_code: ${paProfile.roleCode}`);
  
  console.log(`\n================================================================`);
  console.log('PHASE E SUITE RUN COMPLETED');
  console.log('================================================================\n');
}

runPhaseEAuthorizationTests().catch(console.error);
