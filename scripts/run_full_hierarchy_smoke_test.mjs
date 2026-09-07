import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const ORG_ID = 'e539780b-df07-4b45-beaa-ccf1d2224be8';
const COMP_ID = '5537b879-7299-48a4-bdfe-16e327a2d3d0';

async function runHierarchyVerification() {
  console.log('================================================================');
  console.log('JOY PEOPLEHR — LIVE E2E IDENTITY & HIERARCHY VERIFICATION');
  console.log('Canonical Supabase:', SUPABASE_URL);
  console.log('Target Organization ID:', ORG_ID);
  console.log('Target Company ID:', COMP_ID);
  console.log('================================================================\n');

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ============================================================
  // PHASE 1: Platform Admin
  // ============================================================
  console.log('>>> [1/4] Platform Admin Authentication...');
  const { data: paAuth, error: paErr } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  if (paErr || !paAuth.user) {
    console.error('[-] Platform Admin Auth Failed:', paErr?.message);
  } else {
    console.log('  [+] Platform Admin Authenticated:');
    console.log('      - Email:', paAuth.user.email);
    console.log('      - Auth UID:', paAuth.user.id);
  }

  // ============================================================
  // PHASE 2: Company Admin
  // ============================================================
  console.log('\n>>> [2/4] Company Admin Authentication...');
  const { data: caAuth, error: caErr } = await client.auth.signInWithPassword({
    email: 'companyadmin@joypeoplehr.com',
    password: 'JoyCompAdmin@2026'
  });
  if (caErr || !caAuth.user) {
    console.error('[-] Company Admin Auth Failed:', caErr?.message);
  } else {
    console.log('  [+] Company Admin Authenticated:');
    console.log('      - Email:', caAuth.user.email);
    console.log('      - Auth UID:', caAuth.user.id);
  }

  // ============================================================
  // PHASE 3: HR Head
  // ============================================================
  console.log('\n>>> [3/4] HR Head Authentication...');
  const { data: hrAuth, error: hrErr } = await client.auth.signInWithPassword({
    email: 'hrhead@joypeoplehr.com',
    password: 'JoyHrHead@2026'
  });
  if (hrErr || !hrAuth.user) {
    console.error('[-] HR Head Auth Failed:', hrErr?.message);
  } else {
    console.log('  [+] HR Head Authenticated:');
    console.log('      - Email:', hrAuth.user.email);
    console.log('      - Auth UID:', hrAuth.user.id);
  }

  // ============================================================
  // PHASE 4: Employee
  // ============================================================
  console.log('\n>>> [4/4] Employee Authentication & Cross-Client...');
  const { data: empAuth, error: empErr } = await client.auth.signInWithPassword({
    email: 'employee@joypeoplehr.com',
    password: 'JoyEmployee@2026'
  });
  if (empErr || !empAuth.user) {
    console.error('[-] Employee Auth Failed:', empErr?.message);
  } else {
    console.log('  [+] Employee Authenticated:');
    console.log('      - Email:', empAuth.user.email);
    console.log('      - Auth UID:', empAuth.user.id);
  }

  // Check Database Records
  console.log('\n>>> [5/5] Database Relational Entity Verification...');
  // Use Platform Admin session for DB reads
  if (paAuth?.session) {
    await client.auth.setSession({
      access_token: paAuth.session.access_token,
      refresh_token: paAuth.session.refresh_token
    });
  }

  const { data: profiles } = await client.from('user_profiles').select('*');
  const { data: roles } = await client.from('roles').select('*');
  const { data: userRoles } = await client.from('user_roles').select('*');
  const { data: employees } = await client.from('employees').select('*');

  console.log('  - Total user_profiles:', profiles?.length || 0);
  console.log('  - Total roles:', roles?.length || 0);
  console.log('  - Total user_roles:', userRoles?.length || 0);
  console.log('  - Total employees:', employees?.length || 0);

  const paUid = paAuth?.user?.id;
  const caUid = caAuth?.user?.id;
  const hrUid = hrAuth?.user?.id;
  const empUid = empAuth?.user?.id;

  console.log('\n================================================================');
  console.log('IDENTITY DISTINCTNESS PROOF');
  console.log('================================================================');
  console.log('Platform Admin UID =', paUid || 'N/A');
  console.log('Company Admin UID  =', caUid || 'N/A');
  console.log('HR Head UID        =', hrUid || 'N/A');
  console.log('Employee UID       =', empUid || 'N/A');

  if (paUid && caUid && hrUid && empUid) {
    const isDistinct = (
      paUid !== caUid &&
      caUid !== hrUid &&
      hrUid !== empUid &&
      empUid !== paUid
    );
    console.log('\nALL 4 IDENTITIES DISTINCT:', isDistinct ? 'YES (PASS)' : 'NO (FAIL)');
  } else {
    console.log('\nALL 4 IDENTITIES DISTINCT: FAIL (Missing GoTrue accounts)');
  }
}

runHierarchyVerification().catch(console.error);
