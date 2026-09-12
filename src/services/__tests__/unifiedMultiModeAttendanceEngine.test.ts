// src/services/__tests__/unifiedMultiModeAttendanceEngine.test.ts
// ============================================================================
// JOY PeopleHR — Unified Multi-Mode Attendance Engine Master Test Suite
// Verifies All 20 Functional Gates + Section 100 Dharun B Final Acceptance Test
// ============================================================================

import { attendanceDecisionEngine } from '../attendance/attendanceDecisionEngine';
import { attendanceTimeService } from '../attendance/attendanceTimeService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

export async function runUnifiedMultiModeAttendanceSuite(): Promise<{ total: number; passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('  JOY PEOPLEHR — UNIFIED MULTI-MODE ATTENDANCE ENGINE (20 GATES + UAT)');
  console.log('  One Employee = One Daily Session • Source Lock • Concurrency Safe');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message);
      failed++;
    }
  }

  const ORG = 'org-joy-test';
  const DATE = '2026-09-12';

  // GATE 1: Fingerprint first -> BIOMETRIC CHECK-IN
  await test('Gate 1: Fingerprint first initializes authoritative BIOMETRIC check-in session', async () => {
    attendanceDecisionEngine.clearAllState();
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T08:52:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      biometricPin: '017',
      punchIntent: 'CHECK_IN',
    });

    assert(res.success === true, 'Result must be success');
    assert(res.decisionCode === 'ACCEPTED_CHECK_IN', `Expected ACCEPTED_CHECK_IN, got ${res.decisionCode}`);
    assert(res.session !== null, 'Session must be created');
    assert(res.session?.check_in_source === 'BIOMETRIC', 'check_in_source must be BIOMETRIC');
    assert(res.session?.check_in_method === 'FINGERPRINT', 'check_in_method must be FINGERPRINT');
    assert(res.session?.active_source === 'BIOMETRIC', 'active_source must be BIOMETRIC');
    assert(res.session?.attendance_status === 'CHECKED_IN', 'status must be CHECKED_IN');
    assert(res.timerRunning === true, 'Timer must be running');
  });

  // GATE 2: Face first -> BIOMETRIC CHECK-IN
  await test('Gate 2: Face recognition first initializes authoritative BIOMETRIC check-in session', async () => {
    attendanceDecisionEngine.clearAllState();
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-danya-154',
      eventTimestamp: `${DATE}T08:50:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
      biometricPin: '154',
      punchIntent: 'CHECK_IN',
    });

    assert(res.decisionCode === 'ACCEPTED_CHECK_IN', `Expected ACCEPTED_CHECK_IN, got ${res.decisionCode}`);
    assert(res.session?.check_in_method === 'FACE', 'check_in_method must be FACE');
    assert(res.session?.active_source === 'BIOMETRIC', 'active_source must be BIOMETRIC');
  });

  // GATE 3: RFID first -> BIOMETRIC CHECK-IN
  await test('Gate 3: RFID / Smart Card first initializes authoritative BIOMETRIC check-in session', async () => {
    attendanceDecisionEngine.clearAllState();
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-user-27',
      eventTimestamp: `${DATE}T08:45:00.000Z`,
      source: 'BIOMETRIC',
      method: 'RFID',
      biometricPin: '27',
      punchIntent: 'CHECK_IN',
    });

    assert(res.decisionCode === 'ACCEPTED_CHECK_IN', `Expected ACCEPTED_CHECK_IN, got ${res.decisionCode}`);
    assert(res.session?.check_in_method === 'RFID', 'check_in_method must be RFID');
    assert(res.session?.active_source === 'BIOMETRIC', 'active_source must be BIOMETRIC');
  });

  // GATE 4: Mobile first -> MOBILE CHECK-IN
  await test('Gate 4: Mobile GPS Check-In initializes authoritative MOBILE check-in session', async () => {
    attendanceDecisionEngine.clearAllState();
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T08:55:00.000Z`,
      source: 'MOBILE',
      method: 'GPS',
      punchIntent: 'CHECK_IN',
    });

    assert(res.decisionCode === 'ACCEPTED_CHECK_IN', `Expected ACCEPTED_CHECK_IN, got ${res.decisionCode}`);
    assert(res.session?.check_in_source === 'MOBILE', 'check_in_source must be MOBILE');
    assert(res.session?.active_source === 'MOBILE', 'active_source must be MOBILE');
    assert(res.session?.is_source_locked === true, 'Session must be source locked');
  });

  // GATE 5: Mobile first + Fingerprint -> Fingerprint Ignored for Attendance
  await test('Gate 5: Mobile first + Fingerprint -> Fingerprint stored in raw audit but ignored for attendance', async () => {
    // Session already created via Mobile at 08:55
    const resBio = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T09:03:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      biometricPin: '017',
    });

    assert(resBio.decisionCode === 'IGNORED_SOURCE_LOCK', `Expected IGNORED_SOURCE_LOCK, got ${resBio.decisionCode}`);
    assert(resBio.isIgnoredForLock === true, 'Must flag isIgnoredForLock as true');
    assert(resBio.session?.active_source === 'MOBILE', 'Session active_source must remain MOBILE');
    assert(resBio.session?.first_in_at?.includes('08:55'), 'first_in_at must NOT be overwritten by biometric punch');
    assert(resBio.session?.raw_events_count === 2, 'Raw events count must be 2');
    assert(resBio.session?.ignored_events_count === 1, 'Ignored count must be 1');
  });

  // GATE 6: Mobile first + Face -> Face Ignored for Attendance
  await test('Gate 6: Mobile first + Face -> Face punch ignored for attendance', async () => {
    const resFace = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T09:06:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
      biometricPin: '017',
    });

    assert(resFace.decisionCode === 'IGNORED_SOURCE_LOCK', 'Face punch must be IGNORED_SOURCE_LOCK');
    assert(resFace.session?.ignored_events_count === 2, 'Ignored count must be 2');
  });

  // GATE 7: Mobile first + RFID -> RFID Ignored for Attendance
  await test('Gate 7: Mobile first + RFID -> RFID card punch ignored for attendance', async () => {
    const resRfid = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T18:00:00.000Z`,
      source: 'BIOMETRIC',
      method: 'RFID',
      biometricPin: '017',
    });

    assert(resRfid.decisionCode === 'IGNORED_SOURCE_LOCK', 'RFID punch must be IGNORED_SOURCE_LOCK');
    assert(resRfid.session?.last_out_at === null, 'last_out_at must NOT be closed by ignored biometric punch');
  });

  // GATE 8: Biometric first + Mobile Check-In attempt -> Blocked / Already Checked In
  await test('Gate 8: Biometric first + Mobile Check-In attempt is rejected with ALREADY_CHECKED_IN', async () => {
    attendanceDecisionEngine.clearAllState();
    // 1. Biometric check-in at 08:52
    await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T08:52:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      biometricPin: '017',
    });

    // 2. Mobile attempts Check-In at 09:02
    const resMobile = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T09:02:00.000Z`,
      source: 'MOBILE',
      method: 'GPS',
      punchIntent: 'CHECK_IN',
    });

    assert(resMobile.decisionCode === 'IGNORED_ALREADY_CHECKED_IN', `Expected IGNORED_ALREADY_CHECKED_IN, got ${resMobile.decisionCode}`);
    assert(resMobile.session?.active_source === 'BIOMETRIC', 'Session must remain BIOMETRIC');
    assert(resMobile.session?.first_in_at?.includes('08:52'), 'first_in_at must be 08:52');
  });

  // GATE 9: Modality Deduplication (Fingerprint + Face + RFID -> Exactly One Session)
  await test('Gate 9: Modality Deduplication: Fingerprint + Face + RFID coalesce into exactly one session', async () => {
    attendanceDecisionEngine.clearAllState();
    // 08:55 Fingerprint (Check-in)
    await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T08:55:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      biometricPin: '017',
    });

    // 09:01 Face (Continuation / same session)
    const resFace = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T09:01:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
      biometricPin: '017',
    });

    // 09:03 RFID (Continuation / same session)
    const resRfid = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T09:03:00.000Z`,
      source: 'BIOMETRIC',
      method: 'RFID',
      biometricPin: '017',
    });

    const sessions = attendanceDecisionEngine.getSessionsForDate(DATE, ORG);
    assert(sessions.length === 1, `Expected exactly 1 session, found ${sessions.length}`);
    assert(sessions[0].attendance_status === 'CHECKED_IN', 'Status must remain CHECKED_IN, not prematurely checked out');
    assert(sessions[0].last_out_at === null, 'last_out_at must remain null during morning check-in window');
  });

  // GATE 10: Event Deduplication (Same biometric event twice -> 1 Processed, 1 DUPLICATE)
  await test('Gate 10: Event Deduplication: Identical physical punch payload flagged as DUPLICATE', async () => {
    const resDupe = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T09:03:00.000Z`,
      source: 'BIOMETRIC',
      method: 'RFID',
      biometricPin: '017',
      sequence: 0,
    });

    assert(resDupe.decisionCode === 'DUPLICATE', `Expected DUPLICATE, got ${resDupe.decisionCode}`);
    assert(resDupe.isDuplicate === true, 'isDuplicate must be true');
  });

  // GATE 11: Mobile Double-Tap Protection
  await test('Gate 11: Mobile Double-Click Protection: Rapid duplicate tap returns ALREADY_CHECKED_IN without duplicate records', async () => {
    attendanceDecisionEngine.clearAllState();
    await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-danya-154',
      eventTimestamp: `${DATE}T09:00:00.000Z`,
      source: 'MOBILE',
      punchIntent: 'CHECK_IN',
    });

    const resSecond = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-danya-154',
      eventTimestamp: `${DATE}T09:00:01.000Z`,
      source: 'MOBILE',
      punchIntent: 'CHECK_IN',
    });

    assert(resSecond.decisionCode === 'IGNORED_ALREADY_CHECKED_IN' || resSecond.decisionCode === 'DUPLICATE', 'Second tap must be ignored');
    const sessions = attendanceDecisionEngine.getSessionsForDate(DATE, ORG);
    assert(sessions.length === 1, 'Only 1 session must exist');
  });

  // GATE 12: Concurrent Mobile + Biometric Punch Race Condition
  await test('Gate 12: Concurrency: Simultaneous Mobile Check-in & Biometric punch resolves exactly 1 winner and 1 session', async () => {
    attendanceDecisionEngine.clearAllState();
    const p1 = attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T08:59:00.000Z`,
      source: 'MOBILE',
      punchIntent: 'CHECK_IN',
    });
    const p2 = attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T08:59:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      biometricPin: '017',
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    const sessions = attendanceDecisionEngine.getSessionsForDate(DATE, ORG);
    assert(sessions.length === 1, `Concurrent race must yield 1 session, found ${sessions.length}`);
    const codes = [r1.decisionCode, r2.decisionCode];
    assert(codes.includes('ACCEPTED_CHECK_IN'), 'At least one punch must be ACCEPTED_CHECK_IN');
  });

  // GATE 13: Biometric Check-Out Eligibility & Working Hours Calculation
  await test('Gate 13: Biometric Checkout: End-of-shift exit punch resolves authoritative CHECK-OUT', async () => {
    attendanceDecisionEngine.clearAllState();
    await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T08:59:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      biometricPin: '017',
      punchIntent: 'CHECK_IN',
    });

    const resOut = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T18:05:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      biometricPin: '017',
      punchIntent: 'CHECK_OUT',
    });

    assert(resOut.decisionCode === 'ACCEPTED_CHECK_OUT', `Expected ACCEPTED_CHECK_OUT, got ${resOut.decisionCode}`);
    assert(resOut.session?.attendance_status === 'CHECKED_OUT', 'Status must be CHECKED_OUT');
    assert(resOut.session?.last_out_at?.includes('18:05'), 'last_out_at must be 18:05');
    assert(resOut.session?.net_work_minutes! > 0, 'Net working minutes must be calculated');
    assert(resOut.timerRunning === false, 'Timer must stop on checkout');
  });

  // GATE 14: Mobile Check-Out Closes Session & Stops Timer
  await test('Gate 14: Mobile Check-Out closes session and transitions timer to stopped', async () => {
    attendanceDecisionEngine.clearAllState();
    await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-danya-154',
      eventTimestamp: `${DATE}T09:00:00.000Z`,
      source: 'MOBILE',
      punchIntent: 'CHECK_IN',
    });

    const resOut = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-danya-154',
      eventTimestamp: `${DATE}T17:30:00.000Z`,
      source: 'MOBILE',
      punchIntent: 'CHECK_OUT',
    });

    assert(resOut.decisionCode === 'ACCEPTED_CHECK_OUT', 'Expected ACCEPTED_CHECK_OUT');
    assert(resOut.session?.attendance_status === 'CHECKED_OUT', 'Status must be CHECKED_OUT');
    assert(resOut.timerRunning === false, 'Timer must be stopped');
  });

  // GATE 15: Delayed Offline Biometric Sync Preserves Original Event Time
  await test('Gate 15: Offline Biometric Sync: Hardware punch buffered 3 hours late preserves original event time', async () => {
    attendanceDecisionEngine.clearAllState();
    // Punch happened at 08:52:00, received at 11:52:00
    const resOffline = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T08:52:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      biometricPin: '017',
      rawPayload: { buffered: true, hardware_time: `${DATE} 08:52:00` },
    });

    assert(resOffline.session?.first_in_at === `${DATE}T08:52:00.000Z`, 'Event time must be 08:52, NOT reception time');
  });

  // GATE 16: Offline Mobile Queue Sync
  await test('Gate 16: Offline Mobile Queue: Queued mobile punch processes with original event timestamp', async () => {
    attendanceDecisionEngine.clearAllState();
    const resQueued = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-user-27',
      eventTimestamp: `${DATE}T08:45:00.000Z`,
      source: 'MOBILE',
      punchIntent: 'CHECK_IN',
      rawPayload: { offline_queued: true },
    });

    assert(resQueued.session?.first_in_at === `${DATE}T08:45:00.000Z`, 'Original offline timestamp must be preserved');
  });

  // GATE 17: Unmapped Device User
  await test('Gate 17: Unmapped Device User: Hardware User #999 recorded in audit without creating fake attendance', async () => {
    const resUnmapped = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      biometricPin: '999',
      eventTimestamp: `${DATE}T09:15:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    assert(resUnmapped.decisionCode === 'UNMAPPED_USER', `Expected UNMAPPED_USER, got ${resUnmapped.decisionCode}`);
    assert(resUnmapped.session === null, 'No attendance session must be created for unmapped user');
    assert(resUnmapped.event.decision_code === 'UNMAPPED_USER', 'Raw event must be preserved with UNMAPPED_USER');
  });

  // GATE 18: Multi-Tenant Boundary Isolation
  await test('Gate 18: Tenant Security: Cross-tenant device event rejected by tenant boundary protection', async () => {
    const resTenant = await attendanceDecisionEngine.processEvent({
      organizationId: 'org-attacker-99', // Mismatched organization
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T09:10:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    assert(resTenant.decisionCode === 'ERROR', `Expected ERROR, got ${resTenant.decisionCode}`);
    assert(resTenant.session === null, 'Cross-tenant event must not touch session');
  });

  // GATE 19: Grace Period & Late Minutes Calculation
  await test('Gate 19: Grace & Late: Punch at 09:25:00 on 09:00 shift with 15m grace accurately computes 25m late', async () => {
    attendanceDecisionEngine.clearAllState();
    // Shift is 09:00 - 18:00, Grace is 15 mins. Punch at 09:25 is 25 mins late.
    const resLate = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T09:25:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      biometricPin: '017',
    });

    assert(resLate.session?.late_minutes === 25, `Expected 25 late minutes, got ${resLate.session?.late_minutes}`);
  });

  // GATE 20: Overtime Calculation
  await test('Gate 20: OT Calculation: Check-in at 09:00 and departure at 19:30 on 18:00 shift accurately calculates 90 minutes OT', async () => {
    attendanceDecisionEngine.clearAllState();
    // Check-in on time at 09:00:00
    await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T09:00:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      biometricPin: '017',
      punchIntent: 'CHECK_IN',
    });

    // Checkout at 19:30:00 (10.5h gross, 9.5h net = 570m, scheduled 480m -> 90m OT)
    const resOT = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      eventTimestamp: `${DATE}T19:30:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
      biometricPin: '017',
      punchIntent: 'CHECK_OUT',
    });

    assert(resOT.session?.overtime_minutes === 90, `Expected 90 OT minutes, got ${resOT.session?.overtime_minutes}`);
    assert(resOT.decisionCode === 'ACCEPTED_CHECK_OUT', 'Expected ACCEPTED_CHECK_OUT');
  });

  // SECTION 100: FINAL COMPREHENSIVE DHARUN B ACCEPTANCE TEST (STEP-BY-STEP)
  await test('Gate 21 (Final Acceptance Step 1-7): Dharun B Biometric-First Flow (Fingerprint -> Face -> RFID -> Checkout -> Duplicate)', async () => {
    // STEP 1 & 2: Clean test data
    attendanceDecisionEngine.clearAllState();

    // STEP 3: Perform fingerprint at 08:52
    const step3 = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      employeeCode: 'JCS-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T08:52:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    assert(step3.decisionCode === 'ACCEPTED_CHECK_IN', 'Step 3: Must be ACCEPTED_CHECK_IN');
    assert(step3.session?.active_source === 'BIOMETRIC', 'Step 3: Source must be BIOMETRIC');
    assert(step3.session?.check_in_method === 'FINGERPRINT', 'Step 3: Method must be FINGERPRINT');
    assert(step3.session?.attendance_status === 'CHECKED_IN', 'Step 3: Status must be CHECKED_IN');
    assert(step3.timerRunning === true, 'Step 3: Mobile timer must be running');

    // STEP 4: Perform face punch at 09:05 (13m later, within shift work)
    const step4 = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      employeeCode: 'JCS-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T09:05:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    assert(step4.decisionCode === 'ACCEPTED_IN_SESSION', `Step 4: Must be ACCEPTED_IN_SESSION, got ${step4.decisionCode}`);
    assert(step4.session?.attendance_status === 'CHECKED_IN', 'Step 4: Session must remain CHECKED_IN');
    assert(step4.session?.first_in_at === `${DATE}T08:52:00.000Z`, 'Step 4: first_in_at must remain 08:52');

    // STEP 5: Perform RFID punch at 09:07
    const step5 = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      employeeCode: 'JCS-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T09:07:00.000Z`,
      source: 'BIOMETRIC',
      method: 'RFID',
    });

    assert(step5.session?.raw_events_count === 3, 'Step 5: Raw events count must be 3');
    const sessions = attendanceDecisionEngine.getSessionsForDate(DATE, ORG);
    assert(sessions.length === 1, 'Step 5: Exactly 1 session must exist for Dharun');

    // STEP 6: Perform final valid biometric punch at 18:10
    const step6 = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      employeeCode: 'JCS-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T18:10:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    assert(step6.decisionCode === 'ACCEPTED_CHECK_OUT', `Step 6: Expected ACCEPTED_CHECK_OUT, got ${step6.decisionCode}`);
    assert(step6.session?.attendance_status === 'CHECKED_OUT', 'Step 6: Status must be CHECKED_OUT');
    assert(step6.session?.last_out_at === `${DATE}T18:10:00.000Z`, 'Step 6: last_out_at must be 18:10');

    // STEP 7: Repeat same punch (Duplicate)
    const step7 = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      employeeCode: 'JCS-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T18:10:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    assert(step7.decisionCode === 'DUPLICATE', 'Step 7: Repeated punch must be DUPLICATE');
  });

  await test('Gate 22 (Final Acceptance Step 8-12): Dharun B Mobile-First Flow (Mobile In -> Fingerprint Ignored -> Face Ignored -> Mobile Out)', async () => {
    // STEP 8: Clean test data again
    attendanceDecisionEngine.clearAllState();

    // STEP 9: Mobile Check-In at 08:55
    const step9 = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      employeeCode: 'JCS-017',
      eventTimestamp: `${DATE}T08:55:00.000Z`,
      source: 'MOBILE',
      punchIntent: 'CHECK_IN',
    });

    assert(step9.decisionCode === 'ACCEPTED_CHECK_IN', 'Step 9: Mobile check-in accepted');
    assert(step9.session?.active_source === 'MOBILE', 'Step 9: Source locked to MOBILE');
    assert(step9.timerRunning === true, 'Step 9: Mobile timer started');

    // STEP 10: Fingerprint arrives at 09:04
    const step10 = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      employeeCode: 'JCS-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T09:04:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    assert(step10.decisionCode === 'IGNORED_SOURCE_LOCK', 'Step 10: Fingerprint must be IGNORED_SOURCE_LOCK');
    assert(step10.session?.first_in_at === `${DATE}T08:55:00.000Z`, 'Step 10: first_in_at remains 08:55 Mobile');
    assert(step10.timerRunning === true, 'Step 10: Mobile timer continues running');

    // STEP 11: Face arrives at 12:30
    const step11 = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      employeeCode: 'JCS-017',
      biometricPin: '017',
      eventTimestamp: `${DATE}T12:30:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    assert(step11.decisionCode === 'IGNORED_SOURCE_LOCK', 'Step 11: Face must be IGNORED_SOURCE_LOCK');
    assert(step11.session?.last_out_at === null, 'Step 11: Midday face punch must NOT trigger checkout');

    // STEP 12: Mobile Check-Out at 18:15
    const step12 = await attendanceDecisionEngine.processEvent({
      organizationId: ORG,
      employeeId: 'emp-dharun-017',
      employeeCode: 'JCS-017',
      eventTimestamp: `${DATE}T18:15:00.000Z`,
      source: 'MOBILE',
      punchIntent: 'CHECK_OUT',
    });

    assert(step12.decisionCode === 'ACCEPTED_CHECK_OUT', 'Step 12: Mobile checkout accepted');
    assert(step12.session?.attendance_status === 'CHECKED_OUT', 'Step 12: Session closed');
    assert(step12.session?.check_out_source === 'MOBILE', 'Step 12: check_out_source is MOBILE');
    assert(step12.timerRunning === false, 'Step 12: Timer stopped');

    // Final verification: exactly ONE session in database for Dharun
    const finalSessions = attendanceDecisionEngine.getSessionsForDate(DATE, ORG);
    assert(finalSessions.length === 1, `Expected exactly 1 session, found ${finalSessions.length}`);
    assert(finalSessions[0].raw_events_count === 4, 'Raw event count must be 4');
    assert(finalSessions[0].ignored_events_count === 2, 'Ignored count must be 2');
  });

  console.log('\n================================================================');
  console.log(`  RESULT: ${passed} Passed, ${failed} Failed (Total ${passed + failed} Gates)`);
  console.log('================================================================\n');

  return { total: passed + failed, passed, failed };
}
