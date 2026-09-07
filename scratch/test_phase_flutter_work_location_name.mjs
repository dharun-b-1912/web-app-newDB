// scratch/test_phase_flutter_work_location_name.mjs
// ============================================================================
// JOY PeopleHR — Flutter HR-Configured Work Location Name Display Test Suite
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const env = dotenv.parse(fs.readFileSync('.env.local'));
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const ORG_ID = '0c621892-e938-4707-9957-13534ea32c19'; // Joy Corporate Solutions
const HR_EMAIL = 'marimuthu@joycorporatesolutions.com';
const HR_PASS = 'joypeoplehr';

// Canonical Work Locations
const LOC_CARENOW = {
  id: '6b35b4a6-016c-4a8f-a919-083636760737',
  name: 'CareNow Medical Pvt Ltd',
  lat: 11.0490848,
  lon: 77.1042772,
  radius: 200,
};

const LOC_HQ = {
  id: '95e14b62-b4b8-459e-a314-1ff5b26efa0c',
  name: 'Joy Corporate Solutions Private Limited (HQ)',
  lat: 11.0844364,
  lon: 77.1262627,
  radius: 150,
};

const LOC_OUTSIDE = {
  lat: 14.0000000,
  lon: 79.0000000,
};

let passed = 0;
let failed = 0;

function assert(condition, message, extra = '') {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${message}`);
  } else {
    failed++;
    console.log(`  \x1b[31m[FAIL]\x1b[0m ${message} ${extra ? '-> ' + JSON.stringify(extra) : ''}`);
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('JOY PeopleHR — FLUTTER WORK LOCATION NAME VERIFICATION');
  console.log('============================================================\n');

  // 1. HR Sign In
  console.log('--- Step 1: HR Head Authentication ---');
  const hrAuth = await createClient(SUPABASE_URL, ANON_KEY).auth.signInWithPassword({
    email: HR_EMAIL,
    password: HR_PASS,
  });
  assert(!hrAuth.error && hrAuth.data.session, 'HR Head signed in successfully', hrAuth.error);
  const hrToken = hrAuth.data.session.access_token;
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${hrToken}` } },
  });

  // 2. Create Test Employee A & B
  const ts = Date.now();
  const testEmailA = `flutter.loc.a.${ts}@joycorporatesolutions.com`;
  const empUuidA = `a0000000-0000-4000-8000-${ts.toString(16).padStart(12, '0').slice(-12)}`;

  console.log(`\nCreating Test Employee A (${empUuidA}): ${testEmailA}...`);
  const { data: empRowA, error: insEmpErrA } = await hrClient
    .from('employees')
    .insert({
      id: empUuidA,
      organization_id: ORG_ID,
      company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
      branch_id: 'fc1782e6-fb46-47e8-a428-9da95e5a4f6f',
      department_id: 'd0000000-0000-4000-8000-000000000001',
      designation_id: 'd1000000-0000-4000-8000-000000000001',
      employee_code: `FLOC-${ts.toString().slice(-4)}A`,
      first_name: 'FlutterLoc',
      last_name: 'TesterA',
      display_name: 'FlutterLoc TesterA',
      work_email: testEmailA,
      employment_type: 'FULL_TIME',
      employment_status: 'ACTIVE',
      doj: '2026-09-01',
    })
    .select()
    .single();

  assert(!insEmpErrA && empRowA, 'Created test employee A in public.employees', insEmpErrA);

  const provResA = await fetch(`${SUPABASE_URL}/functions/v1/employee-auth-provisioner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hrToken}`,
    },
    body: JSON.stringify({
      organization_id: ORG_ID,
      email: testEmailA,
      password: 'joypeoplehr',
      full_name: 'FlutterLoc TesterA',
      role_code: 'EMPLOYEE',
      employee_id: empUuidA,
    }),
  });
  const provDataA = await provResA.json();
  assert(provDataA.success && provDataA.auth_user_id, 'Test Employee A auth provisioned successfully', provDataA);

  // 3. Assign CareNow to Employee A
  console.log('\n--- Step 2: Assign Work Location (CareNow) to Employee A ---');
  const { error: assignErrA } = await hrClient.from('employee_work_location_assignments').insert([
    {
      organization_id: ORG_ID,
      employee_id: empRowA.id,
      work_location_id: LOC_CARENOW.id,
      is_primary: true,
      attendance_allowed: true,
    },
  ]);
  assert(!assignErrA, 'Assigned CareNow Medical Pvt Ltd to Employee A', assignErrA);

  // 4. Employee A signs in (Flutter Flow)
  console.log('\n--- Step 3: Employee A Sign In (Flutter Client) ---');
  const empAuthA = await createClient(SUPABASE_URL, ANON_KEY).auth.signInWithPassword({
    email: testEmailA,
    password: 'joypeoplehr',
  });
  assert(!empAuthA.error && empAuthA.data.session, 'Employee A signed in successfully');
  const empAClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${empAuthA.data.session.access_token}` } },
  });

  // 5. Query fn_get_my_assigned_work_locations() as Employee A
  console.log('\n--- Step 4: Fetch Assigned Work Locations (Authoritative RPC) ---');
  const { data: locsA, error: locsErrA } = await empAClient.rpc('fn_get_my_assigned_work_locations');
  assert(!locsErrA && locsA?.length === 1, 'RPC fn_get_my_assigned_work_locations returned exactly 1 location', locsErrA || locsA);
  assert(locsA[0].name === LOC_CARENOW.name, `Location name matches exactly: "${locsA[0].name}" (NOT "Assigned Work Location")`);
  assert(Number(locsA[0].latitude) === LOC_CARENOW.lat, `Latitude matches: ${locsA[0].latitude}`);
  assert(Number(locsA[0].longitude) === LOC_CARENOW.lon, `Longitude matches: ${locsA[0].longitude}`);
  assert(Number(locsA[0].geofence_radius_meters) === LOC_CARENOW.radius, `Radius matches: ${locsA[0].geofence_radius_meters}`);

  // 6. Test Real-time / Refresh: HR updates location name, Flutter re-reads
  console.log('\n--- Step 5: Real-time Location Rename & Refresh ---');
  const RENAMED_TITLE = 'CareNow Medical Centre - Main Plant';
  const { error: renameErr } = await hrClient
    .from('work_locations')
    .update({ name: RENAMED_TITLE })
    .eq('id', LOC_CARENOW.id);
  assert(!renameErr, `HR updated location name in DB to "${RENAMED_TITLE}"`, renameErr);

  const { data: locsRenamed } = await empAClient.rpc('fn_get_my_assigned_work_locations');
  assert(
    locsRenamed && locsRenamed[0].name === RENAMED_TITLE,
    `Flutter client immediately retrieved updated name: "${locsRenamed?.[0]?.name}"`
  );

  // Restore original name
  await hrClient.from('work_locations').update({ name: LOC_CARENOW.name }).eq('id', LOC_CARENOW.id);

  // 7. Multi-Location Assignment (CareNow + HQ)
  console.log('\n--- Step 6: Multi-Location Assignment (CareNow + HQ) ---');
  const { error: assignHqErr } = await hrClient.from('employee_work_location_assignments').insert([
    {
      organization_id: ORG_ID,
      employee_id: empRowA.id,
      work_location_id: LOC_HQ.id,
      is_primary: false,
      attendance_allowed: true,
    },
  ]);
  assert(!assignHqErr, 'Assigned secondary location (HQ) to Employee A', assignHqErr);

  const { data: multiLocsA } = await empAClient.rpc('fn_get_my_assigned_work_locations');
  assert(multiLocsA?.length === 2, 'Employee A now has exactly 2 assigned locations');
  const locNames = multiLocsA?.map((l) => l.name);
  assert(
    locNames?.includes(LOC_CARENOW.name) && locNames?.includes(LOC_HQ.name),
    `Assigned location names returned: ${JSON.stringify(locNames)}`
  );

  // 8. Authoritative Check-In inside Location 1 (CareNow)
  console.log('\n--- Step 7: Check-In inside Location 1 (CareNow) ---');
  const { data: checkInData, error: checkInErr } = await empAClient.rpc('fn_record_attendance_punch', {
    p_latitude: LOC_CARENOW.lat,
    p_longitude: LOC_CARENOW.lon,
    p_accuracy: 10.0,
    p_punch_type: 'IN',
  });
  assert(!checkInErr && checkInData?.success, 'Check-in inside CareNow succeeded', checkInErr || checkInData);
  assert(checkInData?.location_name === LOC_CARENOW.name, `Punch record explicitly captures location name: "${checkInData?.location_name}"`);

  // Verify in attendance_daily
  const { data: dailyRow } = await empAClient.from('attendance_daily').select('*').eq('employee_id', empRowA.id).single();
  assert(
    dailyRow?.check_in_location_name === LOC_CARENOW.name,
    `attendance_daily stores exact check_in_location_name: "${dailyRow?.check_in_location_name}"`
  );

  // 9. Clean up test records
  console.log('\n--- Step 8: Test Cleanup ---');
  await hrClient.from('employee_work_location_assignments').delete().eq('employee_id', empRowA.id);
  await hrClient.from('attendance_punches').delete().eq('employee_id', empRowA.id);
  await hrClient.from('attendance_daily').delete().eq('employee_id', empRowA.id);
  await hrClient.from('user_roles').delete().eq('user_profile_id', provDataA.user_profile_id);
  await hrClient.from('user_profiles').delete().eq('auth_user_id', provDataA.auth_user_id);
  await hrClient.from('employees').delete().eq('id', empRowA.id);

  console.log('\n============================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
