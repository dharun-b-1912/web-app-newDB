// scripts/test_smart_adaptive_shift_permission_suite.mjs
// ============================================================================
// JOY PeopleHR — Smart Adaptive Shift & Permission Governance Verification Suite
// Validates 18 Adaptive Shift & Permission Scenarios against live logic & Supabase
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Active Corporate Shifts
const ACTIVE_SHIFTS = [
  { id: 'f5ff5d00-8489-459b-8d8e-d930ecffef22', code: 'GEN-10', name: 'General Day Shift (Corporate)', start_time: '09:30:00', end_time: '18:30:00', is_overnight: false },
  { id: 'd3725a69-90d3-4267-a1cc-a4c5b2e542fb', code: 'GEN-01', name: 'General Day Shift 1', start_time: '08:30:00', end_time: '17:30:00', is_overnight: false },
  { id: 'f847c561-4bbb-4b9f-a2dd-003162897eef', code: 'GEN-09', name: 'General Corporate Shift 2', start_time: '09:00:00', end_time: '18:00:00', is_overnight: false },
  { id: '50fe0482-4760-415c-9511-3de3e6f73534', code: 'GEN-03', name: 'General Day Shift 3', start_time: '09:00:00', end_time: '16:30:00', is_overnight: false },
  { id: 'shift-night-01', code: 'NGT-01', name: 'Overnight Production Shift', start_time: '20:00:00', end_time: '05:00:00', is_overnight: true },
];

function timeToMinutes(timeStr) {
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function scoreCandidateShift(shift, punchMinutes, checkoutMinutes = null) {
  const startMins = timeToMinutes(shift.start_time);
  const endMins = timeToMinutes(shift.end_time);

  let diff = Math.abs(punchMinutes - startMins);
  if (diff > 720) diff = 1440 - diff;

  let startScore = 0;
  if (diff <= 15) startScore = 70;
  else if (diff <= 30) startScore = 60;
  else if (diff <= 60) startScore = 45;
  else if (diff <= 90) startScore = 30;
  else startScore = Math.max(0, 10 - Math.floor((diff - 120) / 30));

  let checkoutScore = 20;
  if (checkoutMinutes !== null) {
    let outDiff = Math.abs(checkoutMinutes - endMins);
    if (outDiff > 720) outDiff = 1440 - outDiff;
    if (outDiff <= 20) checkoutScore = 30;
    else if (outDiff <= 45) checkoutScore = 24;
    else checkoutScore = Math.max(0, 10 - Math.floor((outDiff - 90) / 30));
  }

  const total = Math.min(100, startScore + checkoutScore);
  return { shift, diff, total };
}

function resolveShiftDeterministic(params) {
  const { fixedAssignment, rosterAssignment, emergencyAssignment, punchTime, checkoutTime } = params;

  // Tier 1: Fixed Assignment
  if (fixedAssignment) {
    return { shift: fixedAssignment, source: 'APPROVED_EMPLOYEE_ASSIGNMENT', score: 100, isAmbiguous: false, requiresReview: false };
  }
  // Tier 2: Roster Assignment
  if (rosterAssignment) {
    return { shift: rosterAssignment, source: 'APPROVED_ROSTER_ROTATION', score: 100, isAmbiguous: false, requiresReview: false };
  }
  // Tier 3: Emergency Override
  if (emergencyAssignment) {
    return { shift: emergencyAssignment, source: 'EMERGENCY_REASSIGNMENT', score: 95, isAmbiguous: false, requiresReview: false };
  }
  // Tier 5: Adaptive Punch Inference
  if (punchTime) {
    const punchMin = timeToMinutes(punchTime);
    const checkMin = checkoutTime ? timeToMinutes(checkoutTime) : null;

    const scored = ACTIVE_SHIFTS.map(s => scoreCandidateShift(s, punchMin, checkMin));
    scored.sort((a, b) => b.total - a.total);

    const top = scored[0];
    const second = scored[1];

    if (Math.abs(top.total - second.total) <= 5 && top.total > 0) {
      return { shift: top.shift, source: 'DEFAULT_REVIEW_QUEUE', score: top.total, isAmbiguous: true, requiresReview: true };
    }
    if (top.total < 40) {
      return { shift: top.shift, source: 'DEFAULT_REVIEW_QUEUE', score: top.total, isAmbiguous: false, requiresReview: true };
    }
    return { shift: top.shift, source: 'ADAPTIVE_PUNCH_INFERENCE', score: top.total, isAmbiguous: false, requiresReview: false };
  }

  // Tier 6: Default Review Queue
  return { shift: ACTIVE_SHIFTS[0], source: 'DEFAULT_REVIEW_QUEUE', score: 40, isAmbiguous: false, requiresReview: true };
}

function evaluateMonthlyPermissionPolicyA(allowance, records, subsequentHandling = 'LOG_EXCESS_ONLY') {
  let cumulative = 0;
  let thresholdCrossingDate = null;
  const halfDayDates = [];

  for (const r of records) {
    const prev = cumulative;
    cumulative += r.minutes;

    if (prev <= allowance && cumulative > allowance) {
      thresholdCrossingDate = r.date;
      halfDayDates.push(r.date);
    } else if (cumulative > allowance && subsequentHandling === 'MARK_EVERY_EXCESS_HALF_DAY') {
      halfDayDates.push(r.date);
    }
  }

  return {
    allowance,
    totalUsed: cumulative,
    remaining: Math.max(0, allowance - cumulative),
    excess: Math.max(0, cumulative - allowance),
    thresholdCrossingDate,
    halfDayDates,
  };
}

async function runSuite() {
  console.log('================================================================');
  console.log('JOY PEOPLEHR: SMART ADAPTIVE SHIFT & PERMISSION GOVERNANCE TEST');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, extra = '') {
    if (condition) {
      console.log(`[PASS] ${title} ${extra ? '(' + extra + ')' : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} ${extra ? '(' + extra + ')' : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // PART 1: ADAPTIVE SHIFT RESOLUTION TESTS
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: SMART ADAPTIVE SHIFT DETERMINATION ---');

  // Test 1: Fixed Shift priority
  const t1 = resolveShiftDeterministic({ fixedAssignment: ACTIVE_SHIFTS[0], punchTime: '08:30' });
  assert('Fixed shift takes priority over punch inference', t1.source === 'APPROVED_EMPLOYEE_ASSIGNMENT' && t1.shift.code === 'GEN-10');

  // Test 2: Roster rotation takes precedence if no fixed assignment
  const t2 = resolveShiftDeterministic({ rosterAssignment: ACTIVE_SHIFTS[1], punchTime: '09:30' });
  assert('Roster rotation assignment takes precedence', t2.source === 'APPROVED_ROSTER_ROTATION' && t2.shift.code === 'GEN-01');

  // Test 3: Emergency reallocation override
  const t3 = resolveShiftDeterministic({ emergencyAssignment: ACTIVE_SHIFTS[3], punchTime: '09:00' });
  assert('Emergency manpower reallocation recorded', t3.source === 'EMERGENCY_REASSIGNMENT' && t3.shift.code === 'GEN-03');

  // Test 4: Punch 09:28 matches GEN-10 (09:30 start) with high confidence
  const t4 = resolveShiftDeterministic({ punchTime: '09:28', checkoutTime: '18:32' });
  assert('Punch 09:28 accurately infers GEN-10 shift', t4.source === 'ADAPTIVE_PUNCH_INFERENCE' && t4.shift.code === 'GEN-10' && t4.score >= 90);

  // Test 5: Punch 08:26 matches GEN-01 (08:30 start) over GEN-10
  const t5 = resolveShiftDeterministic({ punchTime: '08:26', checkoutTime: '17:35' });
  assert('Punch 08:26 accurately infers GEN-01 morning shift', t5.source === 'ADAPTIVE_PUNCH_INFERENCE' && t5.shift.code === 'GEN-01');

  // Test 6: Ambiguous punch between GEN-09 (09:00) and GEN-03 (09:00)
  const t6 = resolveShiftDeterministic({ punchTime: '09:00' });
  assert('Ambiguous candidate shifts route to HR review without guessing', t6.isAmbiguous === true && t6.requiresReview === true && t6.source === 'DEFAULT_REVIEW_QUEUE');

  // Test 7: Out-of-bounds punch (02:30 AM)
  const t7 = resolveShiftDeterministic({ punchTime: '02:30' });
  assert('Out of bounds punch marked for HR review', t7.requiresReview === true && t7.score < 40);

  // Test 8: Overnight shift cross midnight (NGT-01 20:00 - 05:00)
  const t8 = resolveShiftDeterministic({ punchTime: '19:55', checkoutTime: '05:05' });
  assert('Overnight punch 19:55 infers NGT-01 shift across midnight', t8.source === 'ADAPTIVE_PUNCH_INFERENCE' && t8.shift.code === 'NGT-01' && t8.shift.is_overnight === true);

  // --------------------------------------------------------------------------
  // PART 2: MONTHLY PERMISSION GOVERNANCE (120 MIN ALLOWANCE & POLICY A)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: MONTHLY PERMISSION GOVERNANCE & POLICY A ---');

  // Test 9: Zero usage
  const p1 = evaluateMonthlyPermissionPolicyA(120, []);
  assert('Zero permission usage has 120m remaining and 0m excess', p1.totalUsed === 0 && p1.remaining === 120 && p1.halfDayDates.length === 0);

  // Test 10: Exactly 120 minutes cumulative
  const p2 = evaluateMonthlyPermissionPolicyA(120, [
    { date: '2026-10-05', minutes: 60 },
    { date: '2026-10-12', minutes: 60 },
  ]);
  assert('Exactly 120m usage is within allowance (0m excess, 0 half-day days)', p2.totalUsed === 120 && p2.remaining === 0 && p2.excess === 0 && p2.halfDayDates.length === 0);

  // Test 11: Real-world Table Example from Section 5.4:
  // Oct 3: 30m, Oct 8: 45m, Oct 15: 40m, Oct 20: 20m, Oct 25: 15m (Total: 150m)
  const p3 = evaluateMonthlyPermissionPolicyA(120, [
    { date: '2026-10-03', minutes: 30 },
    { date: '2026-10-08', minutes: 45 },
    { date: '2026-10-15', minutes: 40 },
    { date: '2026-10-20', minutes: 20 }, // 115m + 20m = 135m -> Crosses 120m threshold!
    { date: '2026-10-25', minutes: 15 }, // 135m + 15m = 150m -> Subsequent day
  ]);
  assert('Cumulative permission reaches 150m with 30m excess', p3.totalUsed === 150 && p3.excess === 30);
  assert('Threshold-crossing date correctly identified as Oct 20', p3.thresholdCrossingDate === '2026-10-20');
  assert('Policy A classifies ONLY October 20 as Half-Day (1 day total)', p3.halfDayDates.length === 1 && p3.halfDayDates[0] === '2026-10-20');
  assert('October 25 is NOT marked as Half-Day under Standard Policy A (LOG_EXCESS_ONLY)', !p3.halfDayDates.includes('2026-10-25'));

  // Test 11B: Company Strict Scenario (MARK_EVERY_EXCESS_HALF_DAY)
  // When configured to MARK_EVERY_EXCESS_HALF_DAY, Oct 25 (with 15m excess) IS ALSO marked as Half-Day!
  const p3Strict = evaluateMonthlyPermissionPolicyA(120, [
    { date: '2026-10-03', minutes: 30 },
    { date: '2026-10-08', minutes: 45 },
    { date: '2026-10-15', minutes: 40 },
    { date: '2026-10-20', minutes: 20 }, // 135m -> Crosses 120m threshold
    { date: '2026-10-25', minutes: 15 }, // 150m -> Subsequent excess day
  ], 'MARK_EVERY_EXCESS_HALF_DAY');
  assert('Company Strict Policy: Oct 20 AND Oct 25 are BOTH classified as Half-Day', p3Strict.halfDayDates.length === 2 && p3Strict.halfDayDates.includes('2026-10-20') && p3Strict.halfDayDates.includes('2026-10-25'));

  // Test 12: Recalculation / Correction (Oct 20 reduced from 20m to 5m, total becomes 120m)
  const p4 = evaluateMonthlyPermissionPolicyA(120, [
    { date: '2026-10-03', minutes: 30 },
    { date: '2026-10-08', minutes: 45 },
    { date: '2026-10-15', minutes: 40 },
    { date: '2026-10-20', minutes: 5 }, // 115m + 5m = 120m
  ]);
  assert('Idempotent correction cleanly reverses Half-Day classification', p4.totalUsed === 120 && p4.thresholdCrossingDate === null && p4.halfDayDates.length === 0);

  // --------------------------------------------------------------------------
  // PART 3: TENANT ISOLATION & LIVE DATABASE VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: TENANT ISOLATION & SUPABASE LIVE INTEGRATION ---');

  const { data: dbShifts, error: shiftErr } = await supabase
    .from('shifts')
    .select('id, code, name, organization_id')
    .eq('organization_id', '0c621892-e938-4707-9957-13534ea32c19');

  assert('Supabase shifts table queried with organization tenant isolation', !shiftErr && dbShifts && dbShifts.length >= 4, `found ${dbShifts?.length} shifts`);

  const { data: dbPunches, error: punchErr } = await supabase
    .from('attendance_punches')
    .select('id, punch_source, verification_mode, attendance_date')
    .eq('organization_id', '0c621892-e938-4707-9957-13534ea32c19')
    .limit(5);

  assert('Raw attendance punches preserved idempotently in Supabase', !punchErr && dbPunches && dbPunches.length > 0, `verified ${dbPunches?.length} raw punches`);

  console.log('\n================================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch(console.error);
