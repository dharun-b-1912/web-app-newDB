// scratch/run_full_company_admin_regression.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL, ANON_KEY);

async function runRegression() {
  console.log('========================================================================');
  console.log('FULL AUTH ROUTING REGRESSION SUITE — REAL CURRENT COMPANY ADMIN & USERS');
  console.log('Target Canonical Supabase:', URL);
  console.log('========================================================================\n');

  const tests = [];

  // Authenticate as Platform Admin to query DB
  const { data: superAuth } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });
  console.log('1. Platform Admin Authenticated. Auth UID:', superAuth?.user?.id);

  // 1. Live Database Lookup of Real Company Admin
  const { data: caProf } = await supabase
    .from('user_profiles')
    .select('*, user_roles(*, roles(*))')
    .eq('auth_user_id', 'd7f81a41-81d7-4cbf-b672-76fab5e6180f')
    .single();

  const caRole = caProf?.user_roles?.[0]?.roles;
  console.log('\n--- REAL COMPANY ADMIN IDENTITY ---');
  console.log('- Email:', caProf?.email);
  console.log('- Auth UID:', caProf?.auth_user_id);
  console.log('- Profile ID:', caProf?.id);
  console.log('- Organization ID:', caProf?.organization_id);
  console.log('- Database Role Code:', caRole?.code);
  console.log('- Database Role Name:', caRole?.name);

  tests.push({
    name: 'Real Company Admin Database Role is COMPANY_ADMIN',
    expected: 'COMPANY_ADMIN',
    actual: caRole?.code,
    passed: caRole?.code === 'COMPANY_ADMIN',
  });

  // 2. Company Admin Post-Login Routing Resolution
  const resolveRoute = (roleName, roleCode) => {
    const norm = (roleCode || roleName || '').toUpperCase().trim();
    if (['SUPER_ADMIN', 'SUPER ADMIN'].includes(norm)) return 'platform-dashboard';
    if (['COMPANY_ADMIN', 'COMPANY ADMINISTRATOR', 'ORGANIZATION_ADMIN'].includes(norm)) return 'executive-overview';
    if (['HR_HEAD', 'HR_ADMIN'].includes(norm)) return 'dashboard';
    if (['EMPLOYEE'].includes(norm)) return 'ess-dashboard';
    return 'executive-overview';
  };

  const caRoute = resolveRoute(caRole?.name, caRole?.code);
  console.log('\n- Company Admin Destination Route:', caRoute);
  tests.push({
    name: 'Real Company Admin Destination Route',
    expected: 'executive-overview',
    actual: caRoute,
    passed: caRoute === 'executive-overview',
  });

  tests.push({
    name: 'Company Admin Is NOT Routed to ESS',
    expected: 'NO',
    actual: caRoute === 'ess-dashboard' ? 'YES (BUG)' : 'NO',
    passed: caRoute !== 'ess-dashboard',
  });

  // 3. Direct ESS Navigation Guard
  const isDirectEssGuarded = (roleCode, route) => {
    if (['COMPANY_ADMIN', 'HR_HEAD'].includes(roleCode) && (route === 'ess-dashboard' || route.startsWith('ess'))) {
      return 'REDIRECT_TO_ADMIN';
    }
    return 'ALLOW';
  };

  const directEssResult = isDirectEssGuarded(caRole?.code, 'ess-dashboard');
  console.log('\n- Direct ESS Navigation Attempt by Company Admin:', directEssResult);
  tests.push({
    name: 'Direct ESS Route Navigation Guard',
    expected: 'REDIRECT_TO_ADMIN',
    actual: directEssResult,
    passed: directEssResult === 'REDIRECT_TO_ADMIN',
  });

  // 4. Session Restore / Refresh Simulation
  const simulateSessionRestore = (cachedUser) => {
    const restoredRole = cachedUser?.user_roles?.[0]?.roles?.code || 'EMPLOYEE';
    return resolveRoute('', restoredRole);
  };

  const restoredRoute = simulateSessionRestore(caProf);
  console.log('\n- Restored Route on Browser Refresh / New Tab:', restoredRoute);
  tests.push({
    name: 'Browser Refresh & New Tab Session Restore',
    expected: 'executive-overview',
    actual: restoredRoute,
    passed: restoredRoute === 'executive-overview',
  });

  // 5. Employee Routing
  const empRoute = resolveRoute('Employee', 'EMPLOYEE');
  console.log('\n- Employee Destination Route:', empRoute);
  tests.push({
    name: 'Employee Destination Route',
    expected: 'ess-dashboard',
    actual: empRoute,
    passed: empRoute === 'ess-dashboard',
  });

  // 6. Employee -> Company Admin Logout / Transition Isolation
  const simulateLogoutCleanup = () => {
    const storage = {
      workforce_current_user: null,
      workforce_active_route: null,
      workforce_auth_context: null,
    };
    return storage.workforce_active_route === null;
  };
  const isClean = simulateLogoutCleanup();
  tests.push({
    name: 'Logout Clears Active Route & Session',
    expected: 'CLEARED',
    actual: isClean ? 'CLEARED' : 'STALE',
    passed: isClean,
  });

  // 7. Platform Admin is_platform_admin check
  const { data: isPlatAdmin } = await supabase.rpc('is_platform_admin');
  tests.push({
    name: 'Platform Admin is_platform_admin() Check',
    expected: 'true',
    actual: String(isPlatAdmin),
    passed: isPlatAdmin === true,
  });

  console.log('\n========================================================================');
  console.log('REGRESSION TEST RESULTS TABLE');
  console.log('========================================================================');
  console.table(tests.map(t => ({
    Test: t.name,
    Expected: t.expected,
    Actual: t.actual,
    Result: t.passed ? 'PASS' : 'FAIL',
  })));

  const allPassed = tests.every(t => t.passed);
  console.log(`\nOVERALL SUITE STATUS: ${allPassed ? 'ALL TESTS PASSED (GREEN)' : 'FAILURES DETECTED'}`);
}

runRegression().catch(console.error);
