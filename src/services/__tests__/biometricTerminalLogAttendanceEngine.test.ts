// src/services/__tests__/biometricTerminalLogAttendanceEngine.test.ts
// ============================================================================
// JOY PeopleHR — Biometric Terminal Log & Attendance Decision Engine Test Suite
// Full End-to-End Verification: Raw Event ≠ Check-In ≠ Check-Out
// Validates: Midday punches NEVER auto-convert to checkout
// ============================================================================

import { attendanceDecisionEngine } from '../attendance/attendanceDecisionEngine';
import { attendanceClassificationEngine } from '../attendance/attendanceClassificationEngine';
import { attendanceTimeService } from '../attendance/attendanceTimeService';

const ORG = 'org-joy-test-01';
const DATE = '2026-09-12';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log(' 🧪 Biometric Terminal Log & Attendance Decision Engine Tests');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // TEST 1: First Biometric Punch -> ACCEPTED_CHECK_IN
  await test('Test 1: Single biometric punch at 09:32:21 AM yields CHECK-IN (Session Working, Checkout NULL)', async () => {
    attendanceDecisionEngine.clearAllState();

    const res = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T04:02:21.000Z`, // 09:32:21 AM IST
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    assert(res.success === true, 'Processing must succeed');
    assert(res.decisionCode === 'ACCEPTED_CHECK_IN', `Expected ACCEPTED_CHECK_IN, got ${res.decisionCode}`);
    assert(res.session?.attendance_status === 'CHECKED_IN', 'Session status must be CHECKED_IN');
    assert(res.session?.last_out_at === null, 'last_out_at must be NULL for check-in');
    assert(res.session?.active_source === 'BIOMETRIC', 'Active source must be BIOMETRIC');
    assert(res.session?.check_in_method === 'FINGERPRINT', 'Verification method must be FINGERPRINT');
    assert(res.timerRunning === true, 'Live timer must be running');
  });

  // TEST 2: Midday Punch (12:37:29 PM) MUST NOT become CHECK-OUT
  await test('Test 2: Second punch at 12:37:29 PM MUST NOT become CHECK-OUT (Decision = ACCEPTED_IN_SESSION)', async () => {
    // Punch 2 during active workday
    const resMidday = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T07:07:29.000Z`, // 12:37:29 PM IST
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    assert(resMidday.success === true, 'Midday processing must succeed');
    assert(
      resMidday.decisionCode === 'ACCEPTED_IN_SESSION',
      `Expected ACCEPTED_IN_SESSION, got ${resMidday.decisionCode}. Midday punch must NEVER become CHECK-OUT!`
    );
    assert(
      resMidday.session?.attendance_status === 'CHECKED_IN',
      'Employee must remain CHECKED_IN / Working throughout midday'
    );
    assert(
      resMidday.session?.last_out_at === null,
      'last_out_at must remain NULL. Do NOT invent checkout!'
    );
    assert(resMidday.timerRunning === true, 'Working timer must continue running');
  });

  // TEST 3: Afternoon Punch (03:02:21 PM) MUST NOT become CHECK-OUT
  await test('Test 3: Third punch at 03:02:21 PM MUST NOT become CHECK-OUT (4h elapsed rule disabled)', async () => {
    const resAft = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T09:32:21.000Z`, // 03:02:21 PM IST
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    assert(resAft.success === true, 'Afternoon processing must succeed');
    assert(
      resAft.decisionCode === 'ACCEPTED_IN_SESSION',
      `Expected ACCEPTED_IN_SESSION, got ${resAft.decisionCode}. Midday/afternoon punch must NOT trigger checkout!`
    );
    assert(resAft.session?.attendance_status === 'CHECKED_IN', 'Status must remain CHECKED_IN');
    assert(resAft.session?.last_out_at === null, 'last_out_at must remain NULL');
  });

  // TEST 4: Legitimate Departure Punch (18:05:00 PM) -> ACCEPTED_CHECK_OUT
  await test('Test 4: Legitimate checkout at shift end (18:05:00 PM) yields ACCEPTED_CHECK_OUT', async () => {
    const resOut = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T12:35:00.000Z`, // 18:05:00 PM IST (Shift ends at 18:00)
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    assert(resOut.success === true, 'Checkout processing must succeed');
    assert(
      resOut.decisionCode === 'ACCEPTED_CHECK_OUT',
      `Expected ACCEPTED_CHECK_OUT at shift end, got ${resOut.decisionCode}`
    );
    assert(resOut.session?.attendance_status === 'CHECKED_OUT', 'Status must be CHECKED_OUT');
    assert(resOut.session?.last_out_at !== null, 'last_out_at must be populated');
    assert(resOut.session?.net_work_minutes! > 0, 'Net work minutes must be calculated');
    assert(resOut.timerRunning === false, 'Timer must stop upon checkout');
  });

  // TEST 5: Raw Event Ledger Integrity (4 raw events recorded, 1 session)
  await test('Test 5: Event ledger maintains exactly 4 raw events for Dharun B, single session', async () => {
    const rawEvents = attendanceDecisionEngine.getRawEvents().filter(e => e.employee_id === 'emp-dharun-017');
    assert(rawEvents.length === 4, `Expected 4 immutable raw events, found ${rawEvents.length}`);

    // Decisions must be: Check-In, In-Session, In-Session, Check-Out
    const decisions = rawEvents.map(e => e.decision_code);
    assert(decisions.includes('ACCEPTED_CHECK_IN'), 'Must have ACCEPTED_CHECK_IN');
    assert(decisions.includes('ACCEPTED_CHECK_OUT'), 'Must have ACCEPTED_CHECK_OUT');
    assert(decisions.filter(d => d === 'ACCEPTED_IN_SESSION').length === 2, 'Must have 2 in-session verifications');
  });

  // TEST 6: Source Lock & Modality Deduplication
  await test('Test 6: Mobile check-in locked session ignores conflicting biometric attempt', async () => {
    attendanceDecisionEngine.clearAllState();

    // Mobile check in first
    const mobRes = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-danya-154',
      eventTimestamp: `${DATE}T03:30:00.000Z`, // 09:00 AM IST
      source: 'MOBILE',
    });
    assert(mobRes.decisionCode === 'ACCEPTED_CHECK_IN', 'Mobile must check in');
    assert(mobRes.session?.active_source === 'MOBILE', 'Active source must be MOBILE');

    // Biometric punch arrives later
    const bioRes = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-danya-154',
      biometricPin: '154',
      eventTimestamp: `${DATE}T03:45:00.000Z`, // 09:15 AM IST
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    assert(
      bioRes.decisionCode === 'IGNORED_SOURCE_LOCK',
      `Expected IGNORED_SOURCE_LOCK, got ${bioRes.decisionCode}`
    );
    assert(bioRes.isIgnoredForLock === true, 'isIgnoredForLock must be true');
    assert(bioRes.session?.active_source === 'MOBILE', 'Session remains locked to MOBILE');
  });

  // TEST 7: Timestamp Conversion Consistency (Device Local + TZ = UTC = Business Local)
  await test('Test 7: Timestamp consistency: 09:32:21 Asia/Kolkata -> 04:02:21Z -> 09:32:21 AM', async () => {
    const rawLocal = '2026-09-12 09:32:21';
    const norm = attendanceTimeService.normalizeDeviceTimestamp(rawLocal, 'Asia/Kolkata');

    assert(norm.eventTimestampUtc === '2026-09-12T04:02:21.000Z', `UTC must be 04:02:21Z, got ${norm.eventTimestampUtc}`);
    const displayTime = attendanceTimeService.formatAttendanceTime(norm.eventTimestampUtc, 'Asia/Kolkata', true);
    assert(displayTime === '09:32:21 AM', `Display time must be 09:32:21 AM, got ${displayTime}`);
  });

  // TEST 8: AttendanceClassificationEngine Workday Model
  await test('Test 8: AttendanceClassificationEngine leaves midday punches in-session without inventing checkout', async () => {
    const workday = attendanceClassificationEngine.classifyAndCalculateWorkday(
      'emp-dharun-017',
      [
        {
          id: 'p1',
          device_user_id: '017',
          employee_name: 'Dharun B',
          employee_code: 'JCS-017',
          event_timestamp: '2026-09-12T04:02:21.000Z',
          event_time_str: '09:32:21 AM',
          source: 'BIOMETRIC',
          verification_method: 'FINGERPRINT',
        },
        {
          id: 'p2',
          device_user_id: '017',
          employee_name: 'Dharun B',
          employee_code: 'JCS-017',
          event_timestamp: '2026-09-12T07:07:29.000Z',
          event_time_str: '12:37:29 PM',
          source: 'BIOMETRIC',
          verification_method: 'FINGERPRINT',
        },
      ],
      DATE
    );

    assert(workday.first_in?.event_time_str === '09:32:21 AM', 'First check-in must be 09:32:21 AM');
    assert(workday.last_out === null, 'last_out must be NULL for midday punch! Do not invent checkout.');
    assert(workday.status === 'WORKING', 'Status must be WORKING');
    assert(workday.display_status.includes('Working'), `Display status must indicate working, got ${workday.display_status}`);
  });

  console.log(`\n================================================================`);
  console.log(` Results: ${passed} Passed | ${failed} Failed`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
