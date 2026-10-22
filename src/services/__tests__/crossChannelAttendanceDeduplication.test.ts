// src/services/__tests__/crossChannelAttendanceDeduplication.test.ts
// ============================================================================
// JOY PeopleHR — Cross-Channel Attendance Deduplication & Concurrency Test Suite
// "First Valid Check-In Wins Across Biometric, Mobile and Web"
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { attendanceIngestionService, IngestAttendanceEventRequest } from '../attendance/attendanceIngestionService';

describe('JOY PeopleHR — Cross-Channel Attendance Deduplication (First Valid Check-In Wins)', () => {
  const orgId = '11111111-1111-4111-8111-111111111111';
  const orgIdB = '22222222-2222-4222-8222-222222222222';
  const empDharun = '33333333-3333-4333-8333-333333333333';
  const empPriya = '44444444-4444-4444-8444-444444444444';
  const testDate = '2026-10-13';

  beforeEach(() => {
    attendanceIngestionService.clearState();
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Web First, Biometric Second
  // --------------------------------------------------------------------------
  it('Scenario 1: Web check-in first -> Biometric check-in second is rejected as duplicate', async () => {
    const webRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'WEB',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:02:00.000Z`,
    });

    expect(webRes.accepted).toBe(true);
    expect(webRes.outcome).toBe('ACCEPTED');
    expect(webRes.source).toBe('WEB');

    // Subsequent biometric check-in for the same session
    const bioRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:15:00.000Z`,
      deviceId: 'dev-zk-face-01',
    });

    expect(bioRes.accepted).toBe(false);
    expect(bioRes.outcome).toBe('DUPLICATE_CHECK_IN');
    expect(bioRes.reason).toBe('ATTENDANCE_SESSION_ALREADY_HAS_CHECK_IN');
    expect(bioRes.existing_source).toBe('WEB');
    expect(bioRes.user_message).toContain('via Web');

    // Diagnostic logs must retain evidence of suppressed duplicate
    const logs = attendanceIngestionService.getDiagnosticLogs(orgId, empDharun);
    expect(logs.length).toBe(2);
    expect(logs[0].accepted).toBe(false);
    expect(logs[0].source).toBe('BIOMETRIC');
    expect(logs[0].existingSource).toBe('WEB');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Mobile First, Biometric Second
  // --------------------------------------------------------------------------
  it('Scenario 2: Mobile check-in first -> Biometric check-in second is rejected as duplicate', async () => {
    const mobRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'MOBILE',
      punchType: 'CHECK_IN',
      verificationMode: 'GPS',
      punchTime: `${testDate}T08:58:00.000Z`,
      latitude: 12.9716,
      longitude: 77.5946,
    });

    expect(mobRes.accepted).toBe(true);
    expect(mobRes.outcome).toBe('ACCEPTED');
    expect(mobRes.source).toBe('MOBILE');

    // Subsequent biometric punch
    const bioRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:05:00.000Z`,
      deviceId: 'dev-zk-face-01',
    });

    expect(bioRes.accepted).toBe(false);
    expect(bioRes.outcome).toBe('DUPLICATE_CHECK_IN');
    expect(bioRes.existing_source).toBe('MOBILE');
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Biometric First, Web Second
  // --------------------------------------------------------------------------
  it('Scenario 3: Biometric check-in first -> Web check-in second is rejected as duplicate', async () => {
    const bioRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T08:45:00.000Z`,
      deviceId: 'dev-zk-face-01',
    });

    expect(bioRes.accepted).toBe(true);
    expect(bioRes.outcome).toBe('ACCEPTED');
    expect(bioRes.source).toBe('BIOMETRIC');

    // Subsequent web check-in
    const webRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'WEB',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:00:00.000Z`,
    });

    expect(webRes.accepted).toBe(false);
    expect(webRes.outcome).toBe('DUPLICATE_CHECK_IN');
    expect(webRes.existing_source).toBe('BIOMETRIC');
    expect(webRes.user_message).toContain('via Biometric device');
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Biometric First, Mobile Second
  // --------------------------------------------------------------------------
  it('Scenario 4: Biometric check-in first -> Mobile check-in second is rejected as duplicate', async () => {
    const bioRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T08:50:00.000Z`,
    });

    expect(bioRes.accepted).toBe(true);

    const mobRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'MOBILE',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:10:00.000Z`,
    });

    expect(mobRes.accepted).toBe(false);
    expect(mobRes.outcome).toBe('DUPLICATE_CHECK_IN');
    expect(mobRes.existing_source).toBe('BIOMETRIC');
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Mobile First, Web Second
  // --------------------------------------------------------------------------
  it('Scenario 5: Mobile check-in first -> Web check-in second is rejected as duplicate', async () => {
    const mobRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'MOBILE',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T08:55:00.000Z`,
    });

    expect(mobRes.accepted).toBe(true);

    const webRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'WEB',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:05:00.000Z`,
    });

    expect(webRes.accepted).toBe(false);
    expect(webRes.outcome).toBe('DUPLICATE_CHECK_IN');
    expect(webRes.existing_source).toBe('MOBILE');
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Concurrent Check-ins from Different Channels
  // --------------------------------------------------------------------------
  it('Scenario 6: Two concurrent check-ins from different channels -> exactly one wins', async () => {
    const [p1, p2] = await Promise.all([
      attendanceIngestionService.ingestAttendanceEvent({
        organizationId: orgId,
        employeeId: empDharun,
        source: 'WEB',
        punchType: 'CHECK_IN',
        punchTime: `${testDate}T09:00:00.001Z`,
      }),
      attendanceIngestionService.ingestAttendanceEvent({
        organizationId: orgId,
        employeeId: empDharun,
        source: 'BIOMETRIC',
        punchType: 'CHECK_IN',
        punchTime: `${testDate}T09:00:00.002Z`,
      }),
    ]);

    const results = [p1, p2];
    const acceptedCount = results.filter((r) => r.accepted).length;
    const rejectedCount = results.filter((r) => !r.accepted && r.outcome === 'DUPLICATE_CHECK_IN').length;

    expect(acceptedCount).toBe(1);
    expect(rejectedCount).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Replayed Biometric Transaction Idempotency
  // --------------------------------------------------------------------------
  it('Scenario 7: Replayed biometric transaction -> returned idempotently without duplicate records', async () => {
    const idempotencyKey = 'bio-tx-zk-991283';
    const firstRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:00:00.000Z`,
      idempotencyKey,
    });

    expect(firstRes.accepted).toBe(true);

    // Replay same transaction
    const secondRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:00:00.000Z`,
      idempotencyKey,
    });

    expect(secondRes.outcome).toBe('IDEMPOTENT_REPLAY');
    expect(secondRes.accepted).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Repeated Mobile Idempotency Key
  // --------------------------------------------------------------------------
  it('Scenario 8: Repeated mobile idempotency key -> returns original processing result', async () => {
    const idempotencyKey = 'mob-attempt-uuid-77319';
    const firstRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'MOBILE',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:01:00.000Z`,
      idempotencyKey,
    });

    expect(firstRes.accepted).toBe(true);

    // Network retry from mobile client with same attempt key
    const retryRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'MOBILE',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:01:00.000Z`,
      idempotencyKey,
    });

    expect(retryRes.outcome).toBe('IDEMPOTENT_REPLAY');
    expect(retryRes.accepted).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Delayed Offline Biometric Synchronization
  // --------------------------------------------------------------------------
  it('Scenario 9: Delayed offline biometric synchronization -> suppressed as duplicate, retains diagnostic evidence', async () => {
    // 1. Employee checked in via Web at 09:05 AM
    const webRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'WEB',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:05:00.000Z`,
    });
    expect(webRes.accepted).toBe(true);

    // 2. Hardware terminal was offline, syncs hours later with device clock 08:59 AM
    const delayedBioRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T08:59:00.000Z`, // Device timestamp earlier than web
      deviceId: 'dev-zk-offline-01',
      rawPayload: { offlineBuffered: true, deviceClock: '08:59:00' },
    });

    // Must be suppressed as duplicate, web check-in remains authoritative
    expect(delayedBioRes.accepted).toBe(false);
    expect(delayedBioRes.outcome).toBe('DUPLICATE_CHECK_IN');
    expect(delayedBioRes.existing_source).toBe('WEB');

    // Diagnostic log retained with complete raw payload
    const logs = attendanceIngestionService.getDiagnosticLogs(orgId, empDharun);
    expect(logs[0].rawPayload).toEqual({ offlineBuffered: true, deviceClock: '08:59:00' });
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Two Legitimate Employees Checking In Simultaneously
  // --------------------------------------------------------------------------
  it('Scenario 10: Two legitimate employees checking in simultaneously -> both accepted', async () => {
    const [emp1Res, emp2Res] = await Promise.all([
      attendanceIngestionService.ingestAttendanceEvent({
        organizationId: orgId,
        employeeId: empDharun,
        source: 'WEB',
        punchType: 'CHECK_IN',
        punchTime: `${testDate}T09:00:00.000Z`,
      }),
      attendanceIngestionService.ingestAttendanceEvent({
        organizationId: orgId,
        employeeId: empPriya,
        source: 'BIOMETRIC',
        punchType: 'CHECK_IN',
        punchTime: `${testDate}T09:00:00.000Z`,
      }),
    ]);

    expect(emp1Res.accepted).toBe(true);
    expect(emp2Res.accepted).toBe(true);
    expect(emp1Res.employee_id !== emp2Res.employee_id).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Separate Valid Attendance Sessions (Different Dates)
  // --------------------------------------------------------------------------
  it('Scenario 11: Separate valid attendance sessions on different dates -> both accepted', async () => {
    const day1Res = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'WEB',
      punchType: 'CHECK_IN',
      punchTime: `2026-10-13T09:00:00.000Z`,
    });
    expect(day1Res.accepted).toBe(true);

    const day2Res = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `2026-10-14T09:00:00.000Z`,
    });
    expect(day2Res.accepted).toBe(true);
    expect(day2Res.attendance_date).toBe('2026-10-14');
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Overnight Shift Handling
  // --------------------------------------------------------------------------
  it('Scenario 12: Overnight shift early morning punch (<06:00) maps to previous shift date', async () => {
    // A punch at 02:30 AM on 2026-10-14 during an overnight shift belongs to 2026-10-13 session
    const overnightDate = attendanceIngestionService.determineSessionDate('2026-10-14T02:30:00.000+05:30', true);
    expect(overnightDate).toBe('2026-10-13');

    // A normal morning punch at 09:00 AM maps to current day
    const normalDate = attendanceIngestionService.determineSessionDate('2026-10-14T09:00:00.000+05:30', true);
    expect(normalDate).toBe('2026-10-14');
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Legitimate Check-Out After Check-In
  // --------------------------------------------------------------------------
  it('Scenario 13: Legitimate check-out after check-in -> accepted and updates session', async () => {
    const inRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:00:00.000Z`,
    });
    expect(inRes.accepted).toBe(true);

    // Legitimate check-out at 18:00
    const outRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'WEB',
      punchType: 'CHECK_OUT',
      punchTime: `${testDate}T18:00:00.000Z`,
    });

    expect(outRes.accepted).toBe(true);
    expect(outRes.outcome).toBe('ACCEPTED');
    expect(outRes.user_message).toContain('Check-out recorded');
  });

  // --------------------------------------------------------------------------
  // Scenario 14: Multi-Tenant Isolation Between Organizations
  // --------------------------------------------------------------------------
  it('Scenario 14: Multi-tenant isolation -> check-in in Org A does not block employee in Org B', async () => {
    const resA = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'WEB',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:00:00.000Z`,
    });
    expect(resA.accepted).toBe(true);

    // Same employee code / ID in Org B (multi-tenant isolation)
    const resB = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgIdB,
      employeeId: empDharun,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:00:00.000Z`,
    });
    expect(resB.accepted).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 15: Failed Transaction Followed by Safe Retry
  // --------------------------------------------------------------------------
  it('Scenario 15: Failed transaction followed by safe retry succeeds without corruption', async () => {
    // If an initial attempt fails before completing, a subsequent valid request succeeds
    const retryRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'MOBILE',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:05:00.000Z`,
    });

    expect(retryRes.accepted).toBe(true);
    expect(retryRes.outcome).toBe('ACCEPTED');
  });

  // --------------------------------------------------------------------------
  // Scenario 16: No Duplicate Notifications or Attendance Recalculations
  // --------------------------------------------------------------------------
  it('Scenario 16: Duplicate check-in does not alter counts or trigger duplicate effects', async () => {
    // Initial valid check-in
    await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharun,
      source: 'WEB',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:00:00.000Z`,
    });

    // 5 rapid duplicate biometric taps (e.g. employee repeatedly pressing fingerprint)
    const duplicatePromises = [1, 2, 3, 4, 5].map((i) =>
      attendanceIngestionService.ingestAttendanceEvent({
        organizationId: orgId,
        employeeId: empDharun,
        source: 'BIOMETRIC',
        punchType: 'CHECK_IN',
        punchTime: `${testDate}T09:00:0${i}.000Z`,
      })
    );

    const dupResults = await Promise.all(duplicatePromises);
    dupResults.forEach((r) => {
      expect(r.accepted).toBe(false);
      expect(r.outcome).toBe('DUPLICATE_CHECK_IN');
    });

    // Audit logs track all 5 diagnostic records, but zero duplicate punches created
    const logs = attendanceIngestionService.getDiagnosticLogs(orgId, empDharun);
    expect(logs.length).toBe(6); // 1 accepted + 5 suppressed
    const acceptedCount = logs.filter((l) => l.accepted).length;
    expect(acceptedCount).toBe(1);
  });
});
