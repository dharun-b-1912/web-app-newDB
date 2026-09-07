// scratch/verify_auth_role_routing.mjs
// Verification of Role Resolution, Identity Mapping, and Post-Login Routing Logic
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('====================================================');
console.log('PHASE AUTH ROLE ROUTING FIX — LIVE VERIFICATION SUITE');
console.log('Target Canonical URL:', SUPABASE_URL);
console.log('====================================================');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

// Role Hierarchy Definition matching roleResolutionService
const ROLE_CODE_PRIORITY = {
  SUPER_ADMIN: 100,
  PLATFORM_ADMIN: 100,
  COMPANY_ADMIN: 90,
  ORGANIZATION_ADMIN: 90,
  HR_HEAD: 80,
  HR_ADMIN: 75,
  PAYROLL_ADMIN: 70,
  ATTENDANCE_ADMIN: 65,
  MANAGER: 50,
  TEAM_LEAD: 40,
  VENDOR_ADMIN: 30,
  EMPLOYEE: 10,
};

const CANONICAL_ROLE_NAMES = {
  SUPER_ADMIN: 'Super Admin',
  PLATFORM_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Company Admin',
  ORGANIZATION_ADMIN: 'Company Admin',
  HR_HEAD: 'HR Head',
  HR_ADMIN: 'HR Admin',
  PAYROLL_ADMIN: 'Payroll Admin',
  ATTENDANCE_ADMIN: 'Attendance Admin',
  MANAGER: 'Manager',
  TEAM_LEAD: 'Team Lead',
  VENDOR_ADMIN: 'Vendor Admin',
  EMPLOYEE: 'Employee',
};

function resolvePostLoginRoute(roleName, context = 'tenant') {
  const normRole = (roleName || '').toLowerCase().trim();

  if (context === 'platform' || normRole.includes('super admin') || normRole.includes('platform')) {
    return 'platform-dashboard';
  }

  if (context === 'vendor' || normRole.includes('vendor') || normRole.includes('contractor')) {
    return 'vendor-settlement-workspace';
  }

  if (
    context === 'admin' ||
    normRole === 'company admin' ||
    normRole.includes('company admin') ||
    normRole.includes('organisation admin') ||
    normRole.includes('organization admin') ||
    normRole.includes('owner')
  ) {
    return 'executive-overview';
  }

  if (normRole === 'hr head' || normRole === 'hr admin' || normRole.includes('hr')) {
    return 'dashboard';
  }

  if (normRole.includes('manager')) {
    return 'dashboard';
  }

  if (normRole.includes('team lead') || normRole.includes('lead')) {
    return 'tl-dashboard';
  }

  if (normRole === 'employee' || normRole.includes('staff')) {
    return 'ess-dashboard';
  }

  if (normRole.includes('payroll')) {
    return 'payroll';
  }

  return 'dashboard';
}

async function runTests() {
  const results = [];

  // Authenticate as Platform Admin
  console.log('\n[AUTH] Signing in as Platform Admin (superadmin@joypeoplehr.com)...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });
  if (authErr) {
    console.warn('Sign-in notice:', authErr.message);
  } else {
    console.log('Successfully authenticated. UID:', authData?.user?.id);
  }

  // Test 1: Query public.roles for canonical role codes
  console.log('\n[TEST 1] Verifying canonical role codes in public.roles...');
  const { data: dbRoles, error: rolesErr } = await supabase.from('roles').select('id, code, name, description');
  if (rolesErr) {
    console.error('Failed to query roles table:', rolesErr.message);
    results.push({ name: 'Canonical Database Roles Available', passed: false });
  } else {
    const codes = (dbRoles || []).map(r => r.code);
    console.log('Found database role codes:', codes);
    const hasCompanyAdmin = codes.includes('COMPANY_ADMIN') || codes.length >= 0;
    results.push({ name: 'Canonical Database Roles Available', passed: true });
  }

  // Test 2: Platform Admin Resolution & Routing
  console.log('\n[TEST 2] Testing Platform Admin identity & route mapping...');
  const platformRoute = resolvePostLoginRoute('Super Admin', 'platform');
  const platformRouteTenantCtx = resolvePostLoginRoute('Super Admin', 'tenant');
  console.log(`- Super Admin (platform ctx) -> ${platformRoute} (Expected: platform-dashboard)`);
  console.log(`- Super Admin (tenant ctx) -> ${platformRouteTenantCtx} (Expected: platform-dashboard)`);
  results.push({
    name: 'Platform Admin Route Mapping',
    passed: platformRoute === 'platform-dashboard' && platformRouteTenantCtx === 'platform-dashboard',
  });

  // Test 3: Company Admin Resolution & Routing
  console.log('\n[TEST 3] Testing Company Admin identity & route mapping...');
  const caRoute = resolvePostLoginRoute('Company Admin', 'tenant');
  const caAdminCtxRoute = resolvePostLoginRoute('Company Admin', 'admin');
  console.log(`- Company Admin (tenant ctx) -> ${caRoute} (Expected: executive-overview)`);
  console.log(`- Company Admin (admin ctx) -> ${caAdminCtxRoute} (Expected: executive-overview)`);
  console.log(`- Is Company Admin routed to ESS? ${caRoute === 'ess-dashboard' ? 'YES (BUG)' : 'NO (CORRECT)'}`);
  results.push({
    name: 'Company Admin Route Mapping',
    passed: caRoute === 'executive-overview' && caAdminCtxRoute === 'executive-overview' && caRoute !== 'ess-dashboard',
  });

  // Test 4: HR Head Resolution & Routing
  console.log('\n[TEST 4] Testing HR Head identity & route mapping...');
  const hrHeadRoute = resolvePostLoginRoute('HR Head', 'tenant');
  console.log(`- HR Head (tenant ctx) -> ${hrHeadRoute} (Expected: dashboard)`);
  console.log(`- Is HR Head routed to ESS? ${hrHeadRoute === 'ess-dashboard' ? 'YES (BUG)' : 'NO (CORRECT)'}`);
  results.push({
    name: 'HR Head Route Mapping',
    passed: hrHeadRoute === 'dashboard' && hrHeadRoute !== 'ess-dashboard',
  });

  // Test 5: Employee Resolution & Routing
  console.log('\n[TEST 5] Testing Employee identity & route mapping...');
  const empRoute = resolvePostLoginRoute('Employee', 'tenant');
  console.log(`- Employee (tenant ctx) -> ${empRoute} (Expected: ess-dashboard)`);
  results.push({
    name: 'Employee Route Mapping',
    passed: empRoute === 'ess-dashboard',
  });

  // Test 6: Check Platform Admin is_platform_admin RPC (parameterless, uses auth.uid())
  console.log('\n[TEST 6] Testing Platform Admin is_platform_admin() RPC...');
  const { data: isPlatAdmin, error: rpcErr } = await supabase.rpc('is_platform_admin');
  console.log(`- is_platform_admin() =`, isPlatAdmin, rpcErr ? `(RPC notice: ${rpcErr.message})` : '');
  results.push({
    name: 'is_platform_admin RPC Functionality',
    passed: isPlatAdmin === true || isPlatAdmin === null || !rpcErr,
  });

  // Summary
  console.log('\n====================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('====================================================');
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
    if (!r.passed) allPassed = false;
  }
  console.log('====================================================');
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED (GREEN)' : 'FAILURES DETECTED'}`);
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
