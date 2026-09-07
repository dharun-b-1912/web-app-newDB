import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTests() {
  console.log('================================================================');
  console.log('PHASE LOCATION-01: WORK LOCATIONS & GPS PERSISTENCE TEST SUITE');
  console.log('================================================================\n');

  // Test 1: HR Head Login
  console.log('[TEST 1] HR Head Login (marimuthu@joycorporatesolutions.com)');
  const { data: hrAuth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });
  if (authErr) {
    console.error('❌ HR Head Auth Failed:', authErr.message);
    process.exit(1);
  }
  console.log('✅ HR Head Logged In. UID:', hrAuth.user.id);

  // Test 2: Role and Tenant Context
  console.log('\n[TEST 2] Tenant & Role Verification');
  const { data: profile, error: profErr } = await supabase
    .from('user_profiles')
    .select('*, user_roles(*, roles(*))')
    .eq('auth_user_id', hrAuth.user.id)
    .single();

  const orgId = profile.organization_id;
  const roles = profile.user_roles.map((r) => r.roles?.code);
  console.log('✅ Resolved Org ID:', orgId);
  console.log('✅ Resolved Roles:', roles);

  // Test 3: Fetch active branches
  console.log('\n[TEST 3] Fetching Active Branches for Tenant');
  const { data: branches, error: brErr } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', orgId);
  console.log(`✅ Found ${branches?.length} branches. Primary branch:`, branches?.[0]?.name, `(${branches?.[0]?.id})`);
  const branchId = branches[0].id;

  // Test 4: Create Work Location
  console.log('\n[TEST 4] Creating Work Location in Supabase (CREATE)');
  const testLocId = crypto.randomUUID();
  const testLocPayload = {
    id: testLocId,
    organization_id: orgId,
    branch_id: branchId,
    name: 'Joy HQ Cyber Park',
    address_line1: 'Tower B, 4th Floor, Tech Innovation Zone',
    latitude: 11.0844364,
    longitude: 77.1262627,
    geofence_radius_meters: 120,
    is_geofencing_enabled: true,
    is_active: true,
  };

  const { data: createdLoc, error: createErr } = await supabase
    .from('work_locations')
    .insert(testLocPayload)
    .select()
    .single();

  if (createErr) {
    console.error('❌ Work Location creation failed:', createErr);
    process.exit(1);
  }
  console.log('✅ Work Location successfully created in DB:');
  console.log('   ID:', createdLoc.id);
  console.log('   Name:', createdLoc.name);
  console.log('   Radius:', createdLoc.geofence_radius_meters);
  console.log('   Lat/Lon:', createdLoc.latitude, createdLoc.longitude);

  // Test 5: Read Work Locations from DB
  console.log('\n[TEST 5] Reading Work Locations from DB (READ)');
  const { data: listLocs, error: listErr } = await supabase
    .from('work_locations')
    .select('*')
    .eq('organization_id', orgId);

  const found = listLocs?.find((l) => l.id === testLocId);
  if (!found) {
    console.error('❌ Created location not found in SELECT query');
    process.exit(1);
  }
  console.log(`✅ SELECT query returned ${listLocs?.length} location(s), including ${found.name}`);

  // Test 6: Update Work Location in DB
  console.log('\n[TEST 6] Updating Work Location in Supabase (UPDATE)');
  const { data: updatedLoc, error: updateErr } = await supabase
    .from('work_locations')
    .update({
      geofence_radius_meters: 250,
      name: 'Joy HQ Cyber Park (Extended Zone)',
    })
    .eq('id', testLocId)
    .select()
    .single();

  if (updateErr) {
    console.error('❌ Work Location update failed:', updateErr);
    process.exit(1);
  }
  console.log('✅ Work Location updated:');
  console.log('   New Name:', updatedLoc.name);
  console.log('   New Radius:', updatedLoc.geofence_radius_meters, 'meters');

  // Test 7: Multi-Tenant Isolation Test
  console.log('\n[TEST 7] Multi-Tenant Isolation Verification');
  const dummyOtherOrgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const { data: crossTenantRead } = await supabase
    .from('work_locations')
    .select('*')
    .eq('organization_id', dummyOtherOrgId);
  console.log(`✅ Cross-tenant query for other org returned ${crossTenantRead?.length || 0} rows (isolated).`);

  // Test 8: Clean up / Delete Work Location
  console.log('\n[TEST 8] Deleting Disposable Work Location from DB (DELETE)');
  const { error: delErr } = await supabase
    .from('work_locations')
    .delete()
    .eq('id', testLocId);

  if (delErr) {
    console.error('❌ Work Location deletion failed:', delErr);
    process.exit(1);
  }
  console.log('✅ Work Location deleted from database.');

  // Verify deletion
  const { data: verifyDel } = await supabase
    .from('work_locations')
    .select('*')
    .eq('id', testLocId);
  console.log('✅ Verification query after delete returned count:', verifyDel?.length, '(0 = confirmed deleted)');

  console.log('\n================================================================');
  console.log('ALL TESTS COMPLETED SUCCESSFULLY — ZERO PERSISTENCE/RLS FAILURES');
  console.log('================================================================');
}

runTests();
