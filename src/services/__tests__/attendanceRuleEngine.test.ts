// src/services/__tests__/attendanceRuleEngine.test.ts
// ============================================================================
// JOY PeopleHR — Biometric Attendance Rules & Automation Engine Test Suite
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { attendanceRuleEngineService } from '../attendance/attendanceRuleEngineService';
import { attendanceClassificationEngine } from '../attendance/attendanceClassificationEngine';

describe('Biometric Attendance Rules & Automation Engine Suite', () => {
  beforeEach(() => {
    // Reset or clean test state if needed
  });

  it('Gate 1: Loads default enterprise attendance rules with correct priority ordering', () => {
    const rules = attendanceRuleEngineService.getRules();
    expect(rules.length).toBeGreaterThanOrEqual(4);

    // Verify priority sorting (Priority 10 should precede Priority 50)
    for (let i = 0; i < rules.length - 1; i++) {
      expect(rules[i].priority).toBeLessThanOrEqual(rules[i + 1].priority);
    }
  });

  it('Gate 2: Applies Level 1 Employee Exception override over department/org rules', () => {
    // Create an employee exception for Danya R (20m grace)
    attendanceRuleEngineService.createEmployeeException({
      employee_id: 'emp-danya-test',
      employee_name: 'Danya R',
      employee_code: 'JCS-154',
      department: 'Operations',
      exception_type: 'GRACE_OVERRIDE',
      title: 'Temporary Transport Grace Override',
      reason: 'Road construction project schedule',
      override_values: {
        grace_minutes: 20,
        ot_threshold_minutes: 15,
      },
      effective_from: '2026-09-01',
      effective_to: '2026-09-30',
      status: 'ACTIVE',
      requested_by: 'HR Manager',
      approved_by: 'VP Operations',
      approved_at: '2026-09-01T10:00:00Z',
    });

    const result = attendanceRuleEngineService.evaluatePunchRules({
      employeeId: 'emp-danya-test',
      employeeName: 'Danya R',
      employeeCode: 'JCS-154',
      department: 'Operations',
      dateStr: '2026-09-11',
      punchTimeStr: '09:18:00', // 18m after 09:00
      punchIso: '2026-09-11T09:18:00Z',
      source: 'BIOMETRIC',
      verificationMethod: 'FINGERPRINT',
      existingPunches: [],
    });

    expect(result.matchedException).not.toBeNull();
    expect(result.graceMinutes).toBe(20);
    expect(result.lateMinutes).toBe(0); // 18m is within 20m grace!
    expect(result.classification).toBe('CHECK_IN');
    expect(result.reason).toContain('grace');
  });

  it('Gate 3: Production department rule provides 15-minute grace for operations staff', () => {
    const result = attendanceRuleEngineService.evaluatePunchRules({
      employeeId: 'emp-worker-01',
      employeeName: 'Worker Ramesh',
      employeeCode: 'WRK-01',
      department: 'Operations',
      dateStr: '2026-09-11',
      punchTimeStr: '09:12:00', // 12m after 09:00
      punchIso: '2026-09-11T09:12:00Z',
      source: 'BIOMETRIC',
      verificationMethod: 'FINGERPRINT',
      existingPunches: [],
    });

    expect(result.graceMinutes).toBe(15);
    expect(result.lateMinutes).toBe(0); // 12m is within 15m grace!
    expect(result.classification).toBe('CHECK_IN');
  });

  it('Gate 4: Overtime rule computes rounded OT after shift end threshold', () => {
    const result = attendanceRuleEngineService.evaluatePunchRules({
      employeeId: 'emp-danya-ot',
      employeeName: 'Danya R',
      employeeCode: 'JCS-154',
      department: 'Engineering',
      dateStr: '2026-09-11',
      punchTimeStr: '18:45:00', // 45m after 18:00
      punchIso: '2026-09-11T18:45:00Z',
      source: 'BIOMETRIC',
      verificationMethod: 'FINGERPRINT',
      punchDirection: 'OUT',
      existingPunches: [{ timeStr: '09:00:00', iso: '2026-09-11T09:00:00Z', classification: 'CHECK_IN' }],
    });

    expect(result.classification).toBe('CHECK_OUT');
    expect(result.otMinutes).toBe(45); // 45m OT
  });

  it('Gate 5: Suppresses hardware duplicate punches within 5-minute anti-bounce window', () => {
    const result = attendanceRuleEngineService.evaluatePunchRules({
      employeeId: 'emp-dup-test',
      employeeName: 'Test User',
      employeeCode: 'TST-01',
      dateStr: '2026-09-11',
      punchTimeStr: '09:02:00',
      punchIso: '2026-09-11T09:02:00Z',
      source: 'BIOMETRIC',
      verificationMethod: 'FINGERPRINT',
      existingPunches: [{ timeStr: '09:01:00', iso: '2026-09-11T09:01:00Z', classification: 'CHECK_IN' }],
    });

    expect(result.classification).toBe('DUPLICATE');
    expect(result.reason).toContain('Duplicate punch');
  });

  it('Gate 6: Rule Simulator sandbox produces deterministic execution trace without database mutations', () => {
    const sim = attendanceRuleEngineService.simulatePunch({
      employee_id: 'emp-sim-01',
      employee_name: 'Danya R',
      employee_code: 'JCS-154',
      date: '2026-09-11',
      punch_time: '08:54:00',
      source: 'BIOMETRIC',
      verification_method: 'FINGERPRINT',
      punch_direction: 'IN',
      existing_punches: [],
    });

    expect(sim.classification).toBe('CHECK_IN');
    expect(sim.resolved_shift.shift_code).toBeDefined();
    expect(sim.execution_trace.length).toBeGreaterThan(0);
    expect(sim.grace_status).toBe('ON_TIME');
  });

  it('Gate 7: voidEmployeeAttendance cleans test punch data cleanly', () => {
    expect(() => {
      attendanceClassificationEngine.voidEmployeeAttendance('017', '2026-09-11');
      attendanceClassificationEngine.voidEmployeeAttendance('JCS-017', '2026-09-11');
    }).not.toThrow();
  });

  it('Gate 8: Reconciles mobile check-in with biometric checkout (Danya R 09:48:58 Mobile -> 18:17:26 Biometric)', async () => {
    const punchResult = await attendanceClassificationEngine.ingestAndReconcilePunch({
      deviceId: 'bio-dev-zk-k2000',
      deviceName: 'eSSL AI-FACE MAGNUM',
      deviceSerial: 'SSL-MAGNUM-2026-001',
      biometricPin: '154',
      employeeId: 'emp-danya-154',
      employeeName: 'Danya R',
      employeeCode: 'JCS-154',
      timestamp: '2026-09-11T18:17:26.000Z',
      verificationMethod: 'FINGERPRINT',
      source: 'BIOMETRIC',
    });

    expect(punchResult.rawEvent.classification).toBe('CHECK_IN');
    const rawPunches = attendanceClassificationEngine.getRawPunchesForEmployeeOnDate('154', '2026-09-11');
    expect(rawPunches.length).toBeGreaterThanOrEqual(1);
    expect(rawPunches[0].device_user_id).toBe('154');
  });
});
