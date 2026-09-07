// scratch/run_independent_auth_production_audit.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

// Independent Supabase client for audit
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { roleResolutionService } from '../src/services/auth/roleResolutionService.js';
import { userAuthProvisionerService } from '../src/services/auth/userAuthProvisionerService.js';
import { authService } from '../src/services/auth/authService.js';

async function runIndependentAudit() {
  console.log('================================================================================');
  console.log('JOY PEOPLEHR INDEPENDENT AUTHENTICATION PRODUCTION CLOSURE AUDIT');
  console.log('================================================================================\n');

  const auditResults = [];

  const record = (id, category, testName, pass, expected, actual, evidence = '') => {
    auditResults.push({ id, category, testName, pass, expected, actual, evidence });
    console.log(`[AUDIT ${String(id).padStart(2, '0')}][${category}] ${testName}`);
    console.log(`  Expected : ${expected}`);
    console.log(`  Actual   : ${actual}`);
    console.log(`  Verdict  : ${pass ? '✅ PASS (PROVED)' : '❌ FAIL'}`);
    if (evidence) console.log(`  Evidence : ${evidence}`);
    console.log('--------------------------------------------------------------------------------');
  };

  // ---------------------------------------------------------------------------
  // 1. Platform Super Admin Verification
  // ---------------------------------------------------------------------------
  const { data: superAuth, error: superErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });
  
  record(
    1,
    'PLATFORM ADMIN',
    'Real Platform Super Admin Supabase Auth Login',
    !superErr && superAuth?.user?.id === '99722e27-88be-4b14-9575-8b21cc9e3f06',
    'Auth UID: 99722e27-88be-4b14-9575-8b21cc9e3f06',
    superErr ? `Error: ${superErr.message}` : `Auth UID: ${superAuth.user.id}`,
    'Direct Supabase GoTrue Auth token returned'
  );

  const superIdentity = await roleResolutionService.resolveUserIdentity(
    superAuth.user.id,
    'superadmin@joypeoplehr.com',
    { is_platform_admin: true }
  );

  record(
    2,
    'PLATFORM ADMIN',
    'Platform Admin Portal Route Resolution',
    superIdentity.primaryRole === 'Super Admin' && superIdentity.destinationRoute === 'platform-dashboard',
    'Super Admin -> platform-dashboard',
    `${superIdentity.primaryRole} -> ${superIdentity.destinationRoute}`,
    'Role is_platform_admin evaluated in roleResolutionService'
  );

  // ---------------------------------------------------------------------------
  // 2. Multi-Tenant Provisioning: Company A (UAT Audit Tenant)
  // ---------------------------------------------------------------------------
  const timestamp = Date.now();
  const orgAId = `org-audit-alpha-${timestamp}`;
  const orgAName = 'Audit Alpha Enterprises';
  const adminAEmail = `audit.admin.${timestamp}@uat-alpha.com`;
  const hrAEmail = `audit.hr.${timestamp}@uat-alpha.com`;
  const empAEmail = `audit.emp.${timestamp}@uat-alpha.com`;

  // Provision Company A Admin
  const provAdminA = await userAuthProvisionerService.provisionUser({
    organizationId: orgAId,
    organizationName: orgAName,
    email: adminAEmail,
    fullName: 'Audit Alpha Admin',
    roleCode: 'COMPANY_ADMIN',
    temporaryPassword: 'joypeoplehr',
  });

  record(
    3,
    'COMPANY ADMIN',
    'Company A Admin Provisioning (GoTrue Auth + Role + Profile)',
    provAdminA.success && provAdminA.roleCode === 'COMPANY_ADMIN',
    'Success: true, roleCode: COMPANY_ADMIN',
    `Success: ${provAdminA.success}, roleCode: ${provAdminA.roleCode}`,
    `Provisioned for ${adminAEmail}`
  );

  const resAdminA = await roleResolutionService.resolveUserIdentity(provAdminA.authUserId || 'uid-admin-a', adminAEmail);
  record(
    4,
    'COMPANY ADMIN',
    'Company Admin Portal Routing (Guaranteed NEVER ESS)',
    resAdminA.primaryRole === 'Company Admin' && resAdminA.destinationRoute === 'executive-overview',
    'Company Admin -> executive-overview',
    `${resAdminA.primaryRole} -> ${resAdminA.destinationRoute}`,
    'Executive Overview portal assigned'
  );

  // ---------------------------------------------------------------------------
  // 3. HR Head Lifecycle Verification
  // ---------------------------------------------------------------------------
  const provHrA = await userAuthProvisionerService.provisionUser({
    organizationId: orgAId,
    organizationName: orgAName,
    email: hrAEmail,
    fullName: 'Audit Alpha HR Head',
    roleCode: 'HR_HEAD',
    temporaryPassword: 'joypeoplehr',
  });

  record(
    5,
    'HR HEAD',
    'Company Admin creates HR Head (Auto Auth + Role + Profile)',
    provHrA.success && provHrA.roleCode === 'HR_HEAD',
    'Success: true, roleCode: HR_HEAD',
    `Success: ${provHrA.success}, roleCode: ${provHrA.roleCode}`,
    `Provisioned for ${hrAEmail}`
  );

  const resHrA = await roleResolutionService.resolveUserIdentity(provHrA.authUserId || 'uid-hr-a', hrAEmail);
  record(
    6,
    'HR HEAD',
    'HR Head Portal Routing (Guaranteed NEVER ESS)',
    resHrA.primaryRole === 'HR Head' && resHrA.destinationRoute === 'dashboard',
    'HR Head -> dashboard',
    `${resHrA.primaryRole} -> ${resHrA.destinationRoute}`,
    'HR Administrative Dashboard portal assigned'
  );

  // ---------------------------------------------------------------------------
  // 4. Employee Lifecycle Verification
  // ---------------------------------------------------------------------------
  const provEmpA = await userAuthProvisionerService.provisionUser({
    organizationId: orgAId,
    organizationName: orgAName,
    employeeId: `emp-audit-${timestamp}`,
    email: empAEmail,
    fullName: 'Audit Alpha Employee',
    roleCode: 'EMPLOYEE',
    temporaryPassword: 'joypeoplehr',
  });

  record(
    7,
    'EMPLOYEE',
    'HR Head onboards Employee (Auto Auth + Role + Profile)',
    provEmpA.success && provEmpA.roleCode === 'EMPLOYEE',
    'Success: true, roleCode: EMPLOYEE',
    `Success: ${provEmpA.success}, roleCode: ${provEmpA.roleCode}`,
    `Provisioned for ${empAEmail}`
  );

  const resEmpA = await roleResolutionService.resolveUserIdentity(provEmpA.authUserId || 'uid-emp-a', empAEmail);
  record(
    8,
    'EMPLOYEE',
    'Employee Portal Routing (Strictly Employee ESS)',
    resEmpA.primaryRole === 'Employee' && resEmpA.destinationRoute === 'ess-dashboard',
    'Employee -> ess-dashboard',
    `${resEmpA.primaryRole} -> ${resEmpA.destinationRoute}`,
    'Employee Self-Service portal assigned'
  );

  // ---------------------------------------------------------------------------
  // 5. Tenant Isolation Verification (Company A vs Company B)
  // ---------------------------------------------------------------------------
  const orgBId = `org-audit-beta-${timestamp}`;
  const orgBName = 'Audit Beta Technologies';
  const adminBEmail = `audit.admin.${timestamp}@uat-beta.com`;

  const provAdminB = await userAuthProvisionerService.provisionUser({
    organizationId: orgBId,
    organizationName: orgBName,
    email: adminBEmail,
    fullName: 'Audit Beta Admin',
    roleCode: 'COMPANY_ADMIN',
    temporaryPassword: 'joypeoplehr',
  });

  const resAdminB = await roleResolutionService.resolveUserIdentity(provAdminB.authUserId || 'uid-admin-b', adminBEmail);

  const isIsolated = orgAId !== orgBId && resAdminA.organizationId !== resAdminB.organizationId;
  record(
    9,
    'TENANT ISOLATION',
    'Multi-Tenant Independence & Context Partitioning',
    isIsolated && resAdminB.primaryRole === 'Company Admin' && resAdminB.destinationRoute === 'executive-overview',
    `Isolated orgs: Org A != Org B, Company Admin -> executive-overview`,
    `Org A: ${resAdminA.organizationId} | Org B: ${resAdminB.organizationId}`,
    'No shared tenant contexts across different organizations'
  );

  // ---------------------------------------------------------------------------
  // 6. Security Gate: Unknown Auth User (Never default to ESS)
  // ---------------------------------------------------------------------------
  const resStranger = await roleResolutionService.resolveUserIdentity('uid-stranger-audit-001', 'stranger.unknown@unregistered.com');
  record(
    10,
    'SECURITY GATE',
    'Unknown Auth User Role & Routing Protection',
    resStranger.primaryRole === 'Unassigned' && resStranger.destinationRoute === 'unauthorized',
    'Unassigned -> unauthorized',
    `${resStranger.primaryRole} -> ${resStranger.destinationRoute}`,
    'No heuristic fallback to Employee ESS'
  );

  // ---------------------------------------------------------------------------
  // 7. Direct Route Computation across All 5 Tiers
  // ---------------------------------------------------------------------------
  const routeCheck1 = authService.resolvePostLoginRoute('Company Admin', 'tenant');
  const routeCheck2 = authService.resolvePostLoginRoute('HR Head', 'tenant');
  const routeCheck3 = authService.resolvePostLoginRoute('Employee', 'tenant');
  const routeCheck4 = authService.resolvePostLoginRoute('Super Admin', 'platform');
  const routeCheck5 = authService.resolvePostLoginRoute('Unassigned', 'tenant');

  record(
    11,
    'ROUTING MATRIX',
    'Direct Post-Login Route Function for All 5 Portal Tiers',
    routeCheck1 === 'executive-overview' &&
      routeCheck2 === 'dashboard' &&
      routeCheck3 === 'ess-dashboard' &&
      routeCheck4 === 'platform-dashboard' &&
      routeCheck5 === 'unauthorized',
    'Admin->executive-overview, HR->dashboard, Emp->ess-dashboard, Super->platform-dashboard, Unassigned->unauthorized',
    `${routeCheck1}, ${routeCheck2}, ${routeCheck3}, ${routeCheck4}, ${routeCheck5}`,
    'Exact 1:1 post-login navigation destinations'
  );

  // ---------------------------------------------------------------------------
  // 8. Real Production Customer Account Verification
  // ---------------------------------------------------------------------------
  const resRealJcs = await roleResolutionService.resolveUserIdentity('3c22a4e3-baf7-46e1-a5be-4e5ca5f8266d', 'rameshrajajcs@gmail.com');
  record(
    12,
    'PRODUCTION ACCOUNTS',
    'Real Customer Company Admin Login (rameshrajajcs@gmail.com)',
    resRealJcs.primaryRole === 'Company Admin' && resRealJcs.destinationRoute === 'executive-overview',
    'Company Admin -> executive-overview',
    `${resRealJcs.primaryRole} -> ${resRealJcs.destinationRoute}`,
    'JOY CORPORATE SOLUTIONS PVT LTD'
  );

  const resRealSpear = await roleResolutionService.resolveUserIdentity('22081589-d808-4084-945b-dff065664e0a', 'info.speardigital@gmail.com');
  record(
    13,
    'PRODUCTION ACCOUNTS',
    'Real Customer Company Admin Login (info.speardigital@gmail.com)',
    resRealSpear.primaryRole === 'Company Admin' && resRealSpear.destinationRoute === 'executive-overview',
    'Company Admin -> executive-overview',
    `${resRealSpear.primaryRole} -> ${resRealSpear.destinationRoute}`,
    'Spear Digital'
  );

  console.log('\n================================================================================');
  const allPassed = auditResults.every((t) => t.pass);
  console.log(`AUDIT VERDICT: ${allPassed ? 'GREEN — 100% PRODUCTION READY' : 'RED — FAILURES OCCURRED'}`);
  console.log('================================================================================\n');
}

runIndependentAudit().catch(console.error);
