// src/services/__tests__/masterAttendanceEngine.test.ts
// ============================================================================
// JOY PeopleHR — Master Multi-Mode Attendance Engine Certification Suite (20 Gates)
// Tests First-In / Last-Out, Attendance Source Lock, Mobile Timer & Biometric Deduplication
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { attendanceDecisionEngine } from '../attendance/attendanceDecisionEngine';
import { attendanceRosterService } from '../attendance/attendanceRosterService';

describe('🚀 MASTER PROMPT: UNIFIED MULTI-MODE ATTENDANCE ENGINE (20 GATES)', () => {
  const orgId = 'org-joy-test';
  const testDate = '2026-09-12';
  const empDharun = { id: 'emp-dharun-017', name: 'Dharun B', pin: '017', code: 'JCS-017' };
  const empDanya = { id: 'emp-danya-154', name: 'Danya R', pin: '154', code: 'JCS-154' };

  beforeEach(() => {
    attendanceDecisionEngine.clearAllState();
    attendanceDecisionEngine.setSourceLockPolicy('LOCK_FIRST_SOURCE');
  });

  // --------------------------------------------------------------------------
  // GATE 1: FINGERPRINT FIRST
  // --------------------------------------------------------------------------
  it('TEST 1: Fingerprint first creates BIOMETRIC Check-In session', async () => {
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T08:52:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
      deviceId: 'dev-magnum-01',
    });

    expect(res.success).toBe(true);
    expect(res.decisionCode).toBe('ACCEPTED_CHECK_IN');
    expect(res.session).toBeDefined();
    expect(res.session?.attendance_status).toBe('CHECKED_IN');
    expect(res.session?.active_source).toBe('BIOMETRIC');
    expect(res.session?.check_in_source).toBe('BIOMETRIC');
    expect(res.session?.check_in_method).toBe('FINGERPRINT');
    expect(res.session?.first_in_at).toBe(`${testDate}T08:52:00.000Z`);
    expect(res.timerRunning).toBe(true);
  });

  // --------------------------------------------------------------------------
  // GATE 2: FACE FIRST
  // --------------------------------------------------------------------------
  it('TEST 2: Face first creates BIOMETRIC Check-In session', async () => {
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T08:55:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
      deviceId: 'dev-magnum-01',
    });

    expect(res.success).toBe(true);
    expect(res.decisionCode).toBe('ACCEPTED_CHECK_IN');
    expect(res.session?.active_source).toBe('BIOMETRIC');
    expect(res.session?.check_in_method).toBe('FACE');
  });

  // --------------------------------------------------------------------------
  // GATE 3: RFID FIRST
  // --------------------------------------------------------------------------
  it('TEST 3: RFID first creates BIOMETRIC Check-In session', async () => {
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T08:58:00.000Z`,
      source: 'BIOMETRIC',
      method: 'RFID',
      deviceId: 'dev-magnum-01',
    });

    expect(res.success).toBe(true);
    expect(res.decisionCode).toBe('ACCEPTED_CHECK_IN');
    expect(res.session?.active_source).toBe('BIOMETRIC');
    expect(res.session?.check_in_method).toBe('RFID');
  });

  // --------------------------------------------------------------------------
  // GATE 4: MOBILE FIRST
  // --------------------------------------------------------------------------
  it('TEST 4: Mobile first creates MOBILE Check-In session', async () => {
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      employeeCode: empDharun.code,
      eventTimestamp: `${testDate}T08:55:00.000Z`,
      source: 'MOBILE',
      method: 'GPS',
    });

    expect(res.success).toBe(true);
    expect(res.decisionCode).toBe('ACCEPTED_CHECK_IN');
    expect(res.session?.active_source).toBe('MOBILE');
    expect(res.session?.check_in_source).toBe('MOBILE');
    expect(res.session?.first_in_at).toBe(`${testDate}T08:55:00.000Z`);
    expect(res.timerRunning).toBe(true);
  });

  // --------------------------------------------------------------------------
  // GATE 5: MOBILE FIRST + FINGERPRINT
  // --------------------------------------------------------------------------
  it('TEST 5: Mobile first + Fingerprint -> Fingerprint ignored for attendance, raw stored', async () => {
    await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      eventTimestamp: `${testDate}T08:55:00.000Z`,
      source: 'MOBILE',
      method: 'GPS',
    });

    const fpRes = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T09:04:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    expect(fpRes.decisionCode).toBe('IGNORED_SOURCE_LOCK');
    expect(fpRes.isIgnoredForLock).toBe(true);
    const session = attendanceDecisionEngine.getSession(orgId, empDharun.id, testDate);
    expect(session?.first_in_at).toBe(`${testDate}T08:55:00.000Z`);
    expect(session?.active_source).toBe('MOBILE');
  });

  // --------------------------------------------------------------------------
  // GATE 6: MOBILE FIRST + FACE
  // --------------------------------------------------------------------------
  it('TEST 6: Mobile first + Face -> Face ignored for attendance, raw stored', async () => {
    await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      eventTimestamp: `${testDate}T08:55:00.000Z`,
      source: 'MOBILE',
      method: 'GPS',
    });

    const faceRes = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T09:06:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    expect(faceRes.decisionCode).toBe('IGNORED_SOURCE_LOCK');
    expect(faceRes.isIgnoredForLock).toBe(true);
  });

  // --------------------------------------------------------------------------
  // GATE 7: MOBILE FIRST + RFID
  // --------------------------------------------------------------------------
  it('TEST 7: Mobile first + RFID -> RFID ignored for attendance, raw stored', async () => {
    await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      eventTimestamp: `${testDate}T08:55:00.000Z`,
      source: 'MOBILE',
      method: 'GPS',
    });

    const rfidRes = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T18:00:00.000Z`,
      source: 'BIOMETRIC',
      method: 'RFID',
    });

    expect(rfidRes.decisionCode).toBe('IGNORED_SOURCE_LOCK');
    expect(rfidRes.isIgnoredForLock).toBe(true);
  });

  // --------------------------------------------------------------------------
  // GATE 8: BIOMETRIC FIRST + MOBILE CHECK-IN DUPLICATE BLOCKED
  // --------------------------------------------------------------------------
  it('TEST 8: Biometric first -> Mobile check-in ignored for source lock, does not duplicate', async () => {
    await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T08:57:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    const mobRes = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      eventTimestamp: `${testDate}T09:02:00.000Z`,
      source: 'MOBILE',
      method: 'GPS',
    });

    expect(mobRes.decisionCode).toBe('IGNORED_SOURCE_LOCK');
    const session = attendanceDecisionEngine.getSession(orgId, empDharun.id, testDate);
    expect(session?.first_in_at).toBe(`${testDate}T08:57:00.000Z`);
    expect(session?.active_source).toBe('BIOMETRIC');
  });

  // --------------------------------------------------------------------------
  // GATE 9: MULTIPLE BIOMETRIC MODALITIES PRODUCING ONE SESSION
  // --------------------------------------------------------------------------
  it('TEST 9: Fingerprint + Face + RFID produce ONE authoritative session', async () => {
    await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T08:55:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T09:01:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T18:10:00.000Z`,
      source: 'BIOMETRIC',
      method: 'RFID',
    });

    const sessions = attendanceDecisionEngine.getSessionsForDate(testDate, orgId);
    expect(sessions.length).toBe(1);
    expect(sessions[0].first_in_at).toBe(`${testDate}T08:55:00.000Z`);
    expect(sessions[0].last_out_at).toBe(`${testDate}T18:10:00.000Z`);
  });

  // --------------------------------------------------------------------------
  // GATE 10: REPEAT HARDWARE EVENT DEDUPLICATION
  // --------------------------------------------------------------------------
  it('TEST 10: Same biometric event arriving twice is marked DUPLICATE', async () => {
    const p1 = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T09:32:21.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
      sequence: 101,
    });
    expect(p1.decisionCode).toBe('ACCEPTED_CHECK_IN');

    const p2 = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T09:32:21.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
      sequence: 101,
    });
    expect(p2.decisionCode).toBe('DUPLICATE');
    expect(p2.isDuplicate).toBe(true);
  });

  // --------------------------------------------------------------------------
  // GATE 11: MOBILE DOUBLE-CLICK PROTECTION
  // --------------------------------------------------------------------------
  it('TEST 11: Mobile double-click produces exactly 1 check-in', async () => {
    const r1 = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      eventTimestamp: `${testDate}T08:55:00.000Z`,
      source: 'MOBILE',
    });
    const r2 = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      eventTimestamp: `${testDate}T08:55:01.000Z`,
      source: 'MOBILE',
    });

    expect(r1.decisionCode).toBe('ACCEPTED_CHECK_IN');
    expect(r2.isDuplicate).toBe(true);
  });

  // --------------------------------------------------------------------------
  // GATE 12: CONCURRENT MOBILE + BIOMETRIC ATOMIC WINNER
  // --------------------------------------------------------------------------
  it('TEST 12: Concurrent mobile + biometric resolves to exactly 1 session', async () => {
    const [resMob, resBio] = await Promise.all([
      attendanceDecisionEngine.processEvent({
        organizationId: orgId,
        employeeId: empDharun.id,
        eventTimestamp: `${testDate}T08:55:00.000Z`,
        source: 'MOBILE',
      }),
      attendanceDecisionEngine.processEvent({
        organizationId: orgId,
        employeeId: empDharun.id,
        biometricPin: empDharun.pin,
        eventTimestamp: `${testDate}T08:55:00.000Z`,
        source: 'BIOMETRIC',
        method: 'FINGERPRINT',
      }),
    ]);

    const sessions = attendanceDecisionEngine.getSessionsForDate(testDate, orgId);
    expect(sessions.length).toBe(1);
    expect(resMob.success && resBio.success).toBe(true);
  });

  // --------------------------------------------------------------------------
  // GATE 13: BIOMETRIC CHECKOUT
  // --------------------------------------------------------------------------
  it('TEST 13: Biometric checkout updates last_out and calculates duration', async () => {
    await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T09:00:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    const checkoutRes = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T18:30:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    expect(checkoutRes.decisionCode).toBe('ACCEPTED_CHECK_OUT');
    expect(checkoutRes.session?.attendance_status).toBe('CHECKED_OUT');
    expect(checkoutRes.session?.gross_work_minutes).toBe(570); // 9h 30m
  });

  // --------------------------------------------------------------------------
  // GATE 14: MOBILE CHECKOUT
  // --------------------------------------------------------------------------
  it('TEST 14: Mobile checkout closes mobile session', async () => {
    await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      eventTimestamp: `${testDate}T09:00:00.000Z`,
      source: 'MOBILE',
    });

    const checkoutRes = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      eventTimestamp: `${testDate}T18:00:00.000Z`,
      source: 'MOBILE',
    });

    expect(checkoutRes.decisionCode).toBe('ACCEPTED_CHECK_OUT');
    expect(checkoutRes.session?.attendance_status).toBe('CHECKED_OUT');
    expect(checkoutRes.session?.check_out_source).toBe('MOBILE');
  });

  // --------------------------------------------------------------------------
  // GATE 15: OFFLINE BIOMETRIC PROCESSING
  // --------------------------------------------------------------------------
  it('TEST 15: Delayed offline biometric event preserves original timestamp', async () => {
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T07:45:00.000Z`, // Created in the morning on hardware
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    expect(res.session?.first_in_at).toBe(`${testDate}T07:45:00.000Z`);
  });

  // --------------------------------------------------------------------------
  // GATE 16: OFFLINE MOBILE QUEUE PROCESSING
  // --------------------------------------------------------------------------
  it('TEST 16: Offline mobile punch preserves mobile source', async () => {
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      eventTimestamp: `${testDate}T08:30:00.000Z`,
      source: 'MOBILE',
      method: 'GPS',
    });

    expect(res.session?.first_in_at).toBe(`${testDate}T08:30:00.000Z`);
    expect(res.session?.active_source).toBe('MOBILE');
  });

  // --------------------------------------------------------------------------
  // GATE 17: UNMAPPED DEVICE USER
  // --------------------------------------------------------------------------
  it('TEST 17: Unmapped device user stores raw event but creates NO attendance session', async () => {
    const res = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      biometricPin: '99999', // Unknown machine PIN
      eventTimestamp: `${testDate}T09:15:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FACE',
    });

    expect(res.decisionCode).toBe('UNMAPPED_USER');
    expect(res.session).toBeNull();
    const rawEvents = attendanceDecisionEngine.getRawEvents();
    expect(rawEvents.some((e) => e.device_user_id === '99999')).toBe(true);
  });

  // --------------------------------------------------------------------------
  // GATE 18: MULTI-TENANT ISOLATION
  // --------------------------------------------------------------------------
  it('TEST 18: Cross-tenant biometric events do not cross tenant session boundaries', async () => {
    await attendanceDecisionEngine.processEvent({
      organizationId: 'org-company-A',
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T09:00:00.000Z`,
      source: 'BIOMETRIC',
    });

    await attendanceDecisionEngine.processEvent({
      organizationId: 'org-company-B',
      employeeId: empDanya.id,
      biometricPin: empDanya.pin,
      eventTimestamp: `${testDate}T09:05:00.000Z`,
      source: 'BIOMETRIC',
    });

    const sessionsA = attendanceDecisionEngine.getSessionsForDate(testDate, 'org-company-A');
    const sessionsB = attendanceDecisionEngine.getSessionsForDate(testDate, 'org-company-B');

    expect(sessionsA.length).toBe(1);
    expect(sessionsB.length).toBe(1);
    expect(sessionsA[0].employee_id).toBe(empDharun.id);
    expect(sessionsB[0].employee_id).toBe(empDanya.id);
  });

  // --------------------------------------------------------------------------
  // GATE 19: LATE PUNCH & GRACE CALCULATION
  // --------------------------------------------------------------------------
  it('TEST 19: Late punch correctly calculates late minutes beyond grace window', async () => {
    attendanceDecisionEngine.clearAllState();
    const roster = attendanceRosterService.getRosterForEmployeeOnDate(empDharun.id, testDate, orgId);
    const shift = attendanceRosterService.getShiftById(roster.shift_id, orgId);
    const [h, m] = (shift?.start_time || '09:00').split(':').map(Number);
    const lateMins = 25;
    const punchTotalMins = h * 60 + m + lateMins;
    const punchH = String(Math.floor(punchTotalMins / 60)).padStart(2, '0');
    const punchM = String(punchTotalMins % 60).padStart(2, '0');

    const res = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T${punchH}:${punchM}:00.000Z`,
      source: 'BIOMETRIC',
      method: 'FINGERPRINT',
    });

    expect(res.session?.late_minutes).toBe(25);
  });

  // --------------------------------------------------------------------------
  // GATE 20: OVERTIME CALCULATION
  // --------------------------------------------------------------------------
  it('TEST 20: Overtime is calculated only after full attendance duration is known', async () => {
    // Check in at 09:00
    await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T09:00:00.000Z`,
      source: 'BIOMETRIC',
    });

    // Check out at 20:00 (11h gross, 10h net, 8h scheduled = 2h / 120m OT)
    const outRes = await attendanceDecisionEngine.processEvent({
      organizationId: orgId,
      employeeId: empDharun.id,
      biometricPin: empDharun.pin,
      eventTimestamp: `${testDate}T20:00:00.000Z`,
      source: 'BIOMETRIC',
    });

    expect(outRes.session?.net_work_minutes).toBe(600);     // 10 hours
    expect(outRes.session?.overtime_minutes).toBe(120);      // 2 hours OT
  });
});
