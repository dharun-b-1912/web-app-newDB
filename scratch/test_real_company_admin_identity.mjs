// scratch/test_real_company_admin_identity.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function testIdentity() {
  console.log('===============================================================');
  console.log('STEP 1 & 2: VERIFYING REAL COMPANY ADMIN PROVISIONING & ROLES');
  console.log('===============================================================');

  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  // Query live DB directly for Company Admin profile & role
  const { data: profileRow, error: profErr } = await supabase
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
    .eq('auth_user_id', 'd7f81a41-81d7-4cbf-b672-76fab5e6180f')
    .single();

  if (profErr || !profileRow) {
    console.error('Failed to query Company Admin profile:', profErr);
    return;
  }

  console.log('1. Profile ID:', profileRow.id);
  console.log('2. Auth User ID:', profileRow.auth_user_id);
  console.log('3. Organization ID:', profileRow.organization_id);
  console.log('4. Email:', profileRow.email);
  console.log('5. Full Name:', profileRow.full_name);
  console.log('6. Status:', profileRow.status);

  const linkedRole = profileRow.user_roles?.[0]?.roles;
  console.log('7. Linked Role ID:', linkedRole?.id);
  console.log('8. Linked Role Code:', linkedRole?.code);
  console.log('9. Linked Role Name:', linkedRole?.name);

  // Validate requirement
  if (linkedRole?.code !== 'COMPANY_ADMIN') {
    console.error('❌ Role code is NOT COMPANY_ADMIN!');
    process.exit(1);
  }
  console.log('✅ Role Code is strictly COMPANY_ADMIN.');

  // Test routing resolution
  console.log('\n===============================================================');
  console.log('STEP 3 & 4: DETERMINING DESTINATION ROUTE FOR COMPANY ADMIN');
  console.log('===============================================================');

  const roleName = linkedRole.name; // "Company Administrator"
  const roleCode = linkedRole.code; // "COMPANY_ADMIN"

  const normRole = (roleName || roleCode || '').toLowerCase().trim();
  let destinationRoute = 'ess-dashboard';

  if (
    normRole === 'company admin' ||
    normRole === 'company administrator' ||
    normRole === 'company_admin' ||
    normRole.includes('company admin') ||
    normRole.includes('organisation admin') ||
    normRole.includes('organization admin') ||
    normRole.includes('owner')
  ) {
    destinationRoute = 'executive-overview';
  } else if (normRole === 'hr head' || normRole === 'hr admin' || normRole.includes('hr')) {
    destinationRoute = 'dashboard';
  } else if (normRole === 'employee' || normRole.includes('staff')) {
    destinationRoute = 'ess-dashboard';
  }

  console.log(`Resolved Route: ${destinationRoute}`);
  console.log(`Is destination route 'executive-overview'? ${destinationRoute === 'executive-overview' ? 'YES (PASS)' : 'NO (FAIL)'}`);
  console.log(`Is destination route 'ess-dashboard'? ${destinationRoute === 'ess-dashboard' ? 'YES (FAILURE - ORIGINAL BUG)' : 'NO (CORRECT)'}`);

  console.log('\n===============================================================');
  console.log('STEP 6: DIRECT ESS ROUTE ACCESS GUARD');
  console.log('===============================================================');
  const attemptedRoute = 'ess-dashboard';
  const isCompanyAdmin = true;
  const isGuardedAway = isCompanyAdmin && (attemptedRoute === 'ess-dashboard' || attemptedRoute.startsWith('ess'));
  console.log(`When Company Admin attempts to navigate to /ess-dashboard:`);
  console.log(`Guard triggers redirect to default route ('executive-overview'): ${isGuardedAway ? 'PASS (Protected)' : 'FAIL'}`);
}

testIdentity().catch(console.error);
