import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('--- Signing in as HR Head ---');
  const { data: hrAuth, error: hrErr } = await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });
  if (hrErr) {
    console.error('HR Login Error:', hrErr);
    return;
  }
  console.log('HR Head UID:', hrAuth.user.id);

  // 1. Check user profile & organization
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, user_roles(*, roles(*))')
    .eq('auth_user_id', hrAuth.user.id)
    .single();
  console.log('HR Profile:', {
    id: profile?.id,
    email: profile?.email,
    organization_id: profile?.organization_id,
    company_id: profile?.company_id,
    roles: profile?.user_roles?.map((r) => r.roles?.code),
  });

  const orgId = profile.organization_id;

  // 2. Fetch branches for this organization
  const { data: branches, error: brErr } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', orgId);
  console.log('Branches in Org:', branches, brErr);

  // 3. Fetch work_locations for this organization
  const { data: locs, error: locErr } = await supabase
    .from('work_locations')
    .select('*')
    .eq('organization_id', orgId);
  console.log('Work Locations in Org:', locs, locErr);

  // 4. Fetch employees in this organization
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, organization_id, company_id')
    .eq('organization_id', orgId);
  console.log(`Found ${emps?.length || 0} employees:`, emps?.slice(0, 3), empErr);

  // 5. Test create disposable work location
  if (branches && branches.length > 0) {
    const branchId = branches[0].id;
    console.log(`Using branchId: ${branchId} (${branches[0].name})`);

    const testLocId = crypto.randomUUID();
    console.log('Creating test work location:', testLocId);
    const { data: insertData, error: insErr } = await supabase
      .from('work_locations')
      .insert({
        id: testLocId,
        organization_id: orgId,
        branch_id: branchId,
        name: 'Test Location Alpha',
        address_line1: '123 Test Boulevard, Tech City',
        latitude: 11.0168,
        longitude: 76.9558,
        geofence_radius_meters: 150,
        is_geofencing_enabled: true,
        is_active: true,
      })
      .select();
    console.log('Insert Result:', insertData, insErr);

    // 6. Test update disposable work location
    if (!insErr) {
      console.log('Updating test work location radius to 200m...');
      const { data: updateData, error: updErr } = await supabase
        .from('work_locations')
        .update({
          geofence_radius_meters: 200,
          name: 'Test Location Alpha (Updated)',
        })
        .eq('id', testLocId)
        .select();
      console.log('Update Result:', updateData, updErr);

      // 7. Test delete disposable work location
      console.log('Deleting test work location...');
      const { data: delData, error: delErr } = await supabase
        .from('work_locations')
        .delete()
        .eq('id', testLocId);
      console.log('Delete Result:', delData, delErr);
    }
  } else {
    console.log('No branches available for org to test FK insertion');
  }
}

main();
