// scratch/test_phase_attendance_geofence_privacy.mjs
// ============================================================================
// Comprehensive Certification Test Suite for Employee Privacy,
// Multi-Location GPS Geofence Attendance, and Overtime Invariant Control
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const env = dotenv.parse(fs.readFileSync('.env.local'));
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const supabaseAdminClient = createClient(SUPABASE_URL, ANON_KEY);

const ORG_ID = '0c621892-e938-4707-9957-13534ea32c19'; // Joy Corporate Solutions
const HR_EMAIL = 'marimuthu@joycorporatesolutions.com';
const HR_PASS = 'joypeoplehr';

// Work Locations
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

// Outside location (Chennai, >400km away)
const LOC_OUTSIDE = {
  lat: 13.0827,
  lon: 80.2707,
};

let passedTests = 0;
let failedTests = 0;

function assert(condition, message, extra = '') {
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.log(`  \x1b[31m[FAIL]\x1b[0m ${message} ${extra ? '-> ' + JSON.stringify(extra) : ''}`);
  }
}

async function runCertification() {
  console.log('\n============================================================');
  console.log('JOY PeopleHR — EMPLOYEE PRIVACY & GEOFENCE ATTENDANCE SUITE');
  console.log('============================================================\n');

  // 1. HR Sign In
  console.log('--- Phase 1: HR Head Authentication & Setup ---');
  const hrAuth = await supabaseAdminClient.auth.signInWithPassword({
    email: HR_EMAIL,
    password: HR_PASS,
  });

  assert(!hrAuth.error && hrAuth.data.session, 'HR Head sign in successful');
  const hrSession = hrAuth.data.session;
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${hrSession.access_token}` } },
  });

  // Provision disposable Test Employee A
  const empUuidA = 'a0000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0').slice(-12);
  const testEmailA = `employee.geotest.a.${Date.now()}@joycorporatesolutions.com`;
  console.log(`\nCreating Test Employee A (${empUuidA}): ${testEmailA}...`);

  // Insert employee row first
  const { error: insEmpErrA } = await hrClient.from('employees').insert({
    id: empUuidA,
    organization_id: ORG_ID,
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    department_id: 'd0000000-0000-4000-8000-000000000001',
    designation_id: 'd1000000-0000-4000-8000-000000000001',
    first_name: 'Test',
    last_name: 'Geofence A',
    display_name: 'Test Geofence A',
    work_email: testEmailA,
    employee_code: `EMP-GEO-A-${Date.now().toString().slice(-4)}`,
    employment_type: 'FULL_TIME',
    employment_status: 'ACTIVE',
    doj: '2026-09-01',
  });
  assert(!insEmpErrA, 'Created employee record A in public.employees');

  const provResA = await fetch(`${SUPABASE_URL}/functions/v1/employee-auth-provisioner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hrSession.access_token}`,
    },
    body: JSON.stringify({
      organization_id: ORG_ID,
      email: testEmailA,
      password: 'joypeoplehr',
      full_name: 'Test Geofence Employee A',
      role_code: 'EMPLOYEE',
      employee_id: empUuidA,
    }),
  });
  const provDataA = await provResA.json();
  assert(provDataA.success && provDataA.auth_user_id, 'Test Employee A auth provisioned successfully');

  // Provision disposable Test Employee B
  const empUuidB = 'b0000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0').slice(-12);
  const testEmailB = `employee.geotest.b.${Date.now()}@joycorporatesolutions.com`;
  console.log(`Creating Test Employee B (${empUuidB}): ${testEmailB}...`);

  const { error: insEmpErrB } = await hrClient.from('employees').insert({
    id: empUuidB,
    organization_id: ORG_ID,
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    department_id: 'd0000000-0000-4000-8000-000000000001',
    designation_id: 'd1000000-0000-4000-8000-000000000001',
    first_name: 'Test',
    last_name: 'Geofence B',
    display_name: 'Test Geofence B',
    work_email: testEmailB,
    employee_code: `EMP-GEO-B-${Date.now().toString().slice(-4)}`,
    employment_type: 'FULL_TIME',
    employment_status: 'ACTIVE',
    doj: '2026-09-01',
  });
  assert(!insEmpErrB, 'Created employee record B in public.employees');

  const provResB = await fetch(`${SUPABASE_URL}/functions/v1/employee-auth-provisioner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hrSession.access_token}`,
    },
    body: JSON.stringify({
      organization_id: ORG_ID,
      email: testEmailB,
      password: 'joypeoplehr',
      full_name: 'Test Geofence Employee B',
      role_code: 'EMPLOYEE',
      employee_id: empUuidB,
    }),
  });
  const provDataB = await provResB.json();
  assert(provDataB.success && provDataB.auth_user_id, 'Test Employee B auth provisioned successfully');

  const empRowA = { id: empUuidA };
  const empRowB = { id: empUuidB };

  // Assign multiple locations to Employee A: Both CareNow and HQ
  console.log('\n--- Phase 2: Multi-Location Assignment for Employee A ---');
  const { error: assignErrA1 } = await hrClient.from('employee_work_location_assignments').insert([
    {
      organization_id: ORG_ID,
      employee_id: empRowA.id,
      work_location_id: LOC_CARENOW.id,
      is_primary: true,
      attendance_allowed: true,
    },
    {
      organization_id: ORG_ID,
      employee_id: empRowA.id,
      work_location_id: LOC_HQ.id,
      is_primary: false,
      attendance_allowed: true,
    },
  ]);
  assert(!assignErrA1, 'Assigned multiple work locations (CareNow & HQ) to Employee A');

  // Assign ONLY HQ to Employee B
  const { error: assignErrB } = await hrClient.from('employee_work_location_assignments').insert([
    {
      organization_id: ORG_ID,
      employee_id: empRowB.id,
      work_location_id: LOC_HQ.id,
      is_primary: true,
      attendance_allowed: true,
    },
  ]);
  assert(!assignErrB, 'Assigned single work location (HQ only) to Employee B');

  // Employee A Sign In
  console.log('\n--- Phase 3: Employee A Sign In & Peer Privacy (RLS) ---');
  const empAuthA = await createClient(SUPABASE_URL, ANON_KEY).auth.signInWithPassword({
    email: testEmailA,
    password: 'joypeoplehr',
  });
  assert(!empAuthA.error && empAuthA.data.session, 'Employee A signed in successfully');
  const empAClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${empAuthA.data.session.access_token}` } },
  });

  // Test RLS: Employee A queries employees
  const { data: empListA } = await empAClient.from('employees').select('id, work_email, display_name');
  assert(
    empListA?.length === 1 && empListA[0].id === empRowA.id,
    'RLS Privacy: Employee A can see ONLY own employee record (0 peer records returned)'
  );

  // Test RLS: Employee A tries to query Employee B's assignments
  const { data: assignmentsA } = await empAClient.from('employee_work_location_assignments').select('*');
  const hasOnlyAAssignments = assignmentsA?.every((a) => a.employee_id === empRowA.id);
  assert(
    assignmentsA?.length === 2 && hasOnlyAAssignments,
    'RLS Privacy: Employee A sees ONLY their own assigned locations (CareNow and HQ)'
  );

  // Call fn_get_my_assigned_work_locations() as Employee A
  const { data: myAssignedLocsA } = await empAClient.rpc('fn_get_my_assigned_work_locations');
  assert(
    myAssignedLocsA?.length === 2,
    'RPC fn_get_my_assigned_work_locations returns exactly 2 assigned locations for Employee A'
  );

  // Test Check-In Outside All Assigned Locations
  console.log('\n--- Phase 4: Strict Geofence Enforcement (Outside Check-In Blocked) ---');
  const { data: checkInOutsideData, error: checkInOutsideErr } = await empAClient.rpc('fn_record_attendance_punch', {
    p_latitude: LOC_OUTSIDE.lat,
    p_longitude: LOC_OUTSIDE.lon,
    p_accuracy: 20.0,
    p_punch_type: 'IN',
  });

  assert(
    checkInOutsideErr !== null && checkInOutsideErr.message.includes('Check-in blocked: You are outside your assigned work locations'),
    `Check-in outside assigned locations is STRICTLY BLOCKED: "${checkInOutsideErr?.message}"`
  );

  // Verify no punch was created in attendance_punches
  const { data: punchesAfterFail } = await empAClient.from('attendance_punches').select('*');
  assert(punchesAfterFail?.length === 0, 'No invalid punch recorded in attendance_punches after blocked check-in');

  // Test Check-In Inside Assigned Location 1 (CareNow)
  console.log('\n--- Phase 5: Check-In Inside Assigned Location 1 (CareNow) ---');
  const { data: checkInData, error: checkInErr } = await empAClient.rpc('fn_record_attendance_punch', {
    p_latitude: LOC_CARENOW.lat,
    p_longitude: LOC_CARENOW.lon,
    p_accuracy: 10.0,
    p_punch_type: 'IN',
  });

  assert(!checkInErr && checkInData?.success === true, 'Check-in inside assigned Location 1 succeeded', checkInErr || checkInData);
  assert(checkInData?.location_authorized === true, 'Location authorization flagged TRUE', checkInData);
  assert(checkInData?.location_name === LOC_CARENOW.name, `Matched location name: ${checkInData?.location_name}`, checkInData);

  // Verify in attendance_punches and attendance_daily
  const { data: inPunches } = await empAClient.from('attendance_punches').select('*').eq('punch_type', 'IN');
  assert(inPunches?.length === 1 && inPunches[0].location_authorized === true, 'Authoritative IN punch persisted in DB');

  const { data: dailyRowA } = await empAClient.from('attendance_daily').select('*').eq('employee_id', empRowA.id).single();
  assert(dailyRowA?.status === 'PRESENT' && dailyRowA?.overtime_eligible === true, 'attendance_daily updated to PRESENT');

  // Test Duplicate Check-In Blocked
  console.log('\n--- Phase 6: Duplicate Check-In Protection ---');
  const { error: dupCheckInErr } = await empAClient.rpc('fn_record_attendance_punch', {
    p_latitude: LOC_CARENOW.lat,
    p_longitude: LOC_CARENOW.lon,
    p_accuracy: 10.0,
    p_punch_type: 'IN',
  });
  assert(dupCheckInErr !== null && dupCheckInErr.message.includes('already checked in'), 'Duplicate check-in blocked');

  // Test Check-Out Outside Assigned Location WITHOUT Reason
  console.log('\n--- Phase 7: Checkout Outside Assigned Location (Reason Requirement) ---');
  const { error: checkoutNoReasonErr } = await empAClient.rpc('fn_record_attendance_punch', {
    p_latitude: LOC_OUTSIDE.lat,
    p_longitude: LOC_OUTSIDE.lon,
    p_accuracy: 20.0,
    p_punch_type: 'OUT',
    p_reason: null,
  });
  assert(
    checkoutNoReasonErr !== null && checkoutNoReasonErr.message.includes('Check-out reason is required'),
    'Outside checkout without reason is BLOCKED'
  );

  // Test Check-Out Outside Assigned Location WITH Reason & Overtime Suppression
  console.log('\n--- Phase 8: Unauthorized Checkout With Reason & Overtime Suppression ---');
  const outsideReason = 'Client meeting at external healthcare center';
  const { data: checkOutData, error: checkOutErr } = await empAClient.rpc('fn_record_attendance_punch', {
    p_latitude: LOC_OUTSIDE.lat,
    p_longitude: LOC_OUTSIDE.lon,
    p_accuracy: 15.0,
    p_punch_type: 'OUT',
    p_reason: outsideReason,
  });

  assert(!checkOutErr && checkOutData?.success === true, 'Outside checkout with valid reason succeeded', checkOutErr || checkOutData);
  assert(checkOutData?.unauthorized_checkout === true, 'unauthorized_checkout marked TRUE', checkOutData);
  assert(checkOutData?.overtime_eligible === false, 'overtime_eligible marked FALSE', checkOutData);
  assert(checkOutData?.overtime_minutes === 0, 'overtime_minutes strictly set to 0', checkOutData);

  // Verify authoritative state in attendance_daily
  const { data: updatedDailyA } = await empAClient.from('attendance_daily').select('*').eq('employee_id', empRowA.id).single();
  assert(updatedDailyA?.unauthorized_checkout === true, 'attendance_daily.unauthorized_checkout = TRUE');
  assert(updatedDailyA?.overtime_eligible === false, 'attendance_daily.overtime_eligible = FALSE');
  assert(updatedDailyA?.overtime_minutes === 0, 'attendance_daily.overtime_minutes = 0');
  assert(updatedDailyA?.unauthorized_checkout_reason === outsideReason, 'attendance_daily stores exact reason');

  // Verify audit log entry
  const { data: auditLogs } = await hrClient
    .from('audit_logs')
    .select('*')
    .eq('action', 'ATTENDANCE_UNAUTHORIZED_CHECKOUT')
    .eq('entity_id', empRowA.id);

  assert(
    auditLogs && auditLogs.length > 0 && auditLogs[0].new_values?.reason === outsideReason,
    'public.audit_logs captures ATTENDANCE_UNAUTHORIZED_CHECKOUT with UUID entity_id and reason'
  );

  // Clean up disposable test users
  console.log('\n--- Phase 9: Cleaning Up Disposable Test Data ---');
  await hrClient.from('employee_work_location_assignments').delete().in('employee_id', [empRowA.id, empRowB.id]);
  await hrClient.from('attendance_punches').delete().in('employee_id', [empRowA.id, empRowB.id]);
  await hrClient.from('attendance_daily').delete().in('employee_id', [empRowA.id, empRowB.id]);
  await hrClient.from('audit_logs').delete().in('entity_id', [empRowA.id, empRowB.id]);
  await hrClient.from('user_roles').delete().in('user_profile_id', [provDataA.user_profile_id, provDataB.user_profile_id]);
  await hrClient.from('user_profiles').delete().in('auth_user_id', [provDataA.auth_user_id, provDataB.auth_user_id]);
  await hrClient.from('employees').delete().in('id', [empRowA.id, empRowB.id]);

  console.log('\n============================================================');
  console.log(`CERTIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runCertification().catch((e) => {
  console.error('Fatal test exception:', e);
  process.exit(1);
});
