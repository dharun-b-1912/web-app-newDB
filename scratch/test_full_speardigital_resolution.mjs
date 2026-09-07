// scratch/test_full_speardigital_resolution.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

// Mirror exact roleResolutionService implementation
async function resolveUserIdentity(authUserId, emailLower, userMeta = {}) {
  let isPlatformAdmin = false;
  let organizationId = null;
  let employeeId = null;
  let fullName = userMeta.full_name || emailLower.split('@')[0] || 'User';
  let rolesList = [];

  // Check Platform Admin
  if (emailLower === 'superadmin@joypeoplehr.com') {
    return {
      primaryRole: 'Super Admin',
      destinationRoute: 'platform-dashboard',
      isPlatformAdmin: true,
      organizationId: 'platform-root',
    };
  }

  // Find latest created organization
  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  const targetOrg = orgs && orgs.length > 0 ? orgs[0] : null;

  if (targetOrg) {
    organizationId = targetOrg.id;
    const { data: orgRoles } = await supabase
      .from('roles')
      .select('*')
      .eq('organization_id', targetOrg.id);

    const companyAdminRole = orgRoles?.find(r => r.code === 'COMPANY_ADMIN');
    if (companyAdminRole) {
      rolesList.push({
        id: companyAdminRole.id,
        name: companyAdminRole.name || 'Company Administrator',
        code: 'COMPANY_ADMIN',
        organization_id: targetOrg.id,
      });
    }
  }

  const primaryRole = 'Company Admin';
  const destinationRoute = 'executive-overview';

  return {
    primaryRole,
    destinationRoute,
    isPlatformAdmin: false,
    organizationId,
    fullName,
    rolesList,
  };
}

async function runTest() {
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const res = await resolveUserIdentity('6973e22b-a647-4ff4-969e-a0a18470f769', 'info.speardigital@gmail.com');
  console.log('Spear Digital Resolution Result:', res);
}

runTest().catch(console.error);
