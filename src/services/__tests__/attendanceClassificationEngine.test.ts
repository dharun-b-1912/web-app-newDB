// src/services/__tests__/attendanceClassificationEngine.test.ts
// ============================================================================
// Joy PeopleHR — Real Attendance Classification & Multi-Shift Engine Test Suite
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  attendanceClassificationEngine,
  ClassifiedPunchEvent,
  EffectiveShiftConfig,
} from '../attendance/attendanceClassificationEngine';

describe('AttendanceClassificationEngine — Real Biometric Event & Shift Evaluation Suite', () => {
  const generalShift: EffectiveShiftConfig = {
    shift_id: 'shift-gen-09',
    shift_code: 'GEN-09',
    shift_name: 'General Day Shift (09:00 - 18:00)',
    start_time: '09:00',
    end_time: '18:00',
    late_grace_minutes: 10,
    early_window_minutes: 60,
    early_checkout_grace_minutes: 10,
    minimum_punch_gap_minutes: 5,
    min_work_duration_minutes: 15,
    ot_grace_minutes: 30,
    ot_threshold_minutes: 30,
    cross_midnight: false,
    scheduled_work_minutes: 480,
    unpaid_break_minutes: 45,
  };

  const officeShift: EffectiveShiftConfig = {
    shift_id: 'shift-off-08',
    shift_code: 'OFF-08',
    shift_name: 'Office Shift (08:00 - 17:30)',
    start_time: '08:00',
    end_time: '17:30',
    late_grace_minutes: 10,
    early_window_minutes: 60,
    early_checkout_grace_minutes: 10,
    minimum_punch_gap_minutes: 5,
    min_work_duration_minutes: 15,
    ot_grace_minutes: 30,
    ot_threshold_minutes: 30,
    cross_midnight: false,
    scheduled_work_minutes: 510,
    unpaid_break_minutes: 60,
  };

  const nightShift: EffectiveShiftConfig = {
    shift_id: 'shift-ngt-22',
    shift_code: 'NGT-22',
    shift_name: 'Night Shift (22:00 - 06:00)',
    start_time: '22:00',
    end_time: '06:00',
    late_grace_minutes: 15,
    early_window_minutes: 60,
    early_checkout_grace_minutes: 10,
    minimum_punch_gap_minutes: 5,
    min_work_duration_minutes: 15,
    ot_grace_minutes: 30,
    ot_threshold_minutes: 30,
    cross_midnight: true,
    scheduled_work_minutes: 480,
    unpaid_break_minutes: 45,
  };

  it('Gate 1: First biometric punch becomes CHECK-IN, never CHECK-OUT, with source BIOMETRIC and status WORKING', () => {
    const rawEvents: ClassifiedPunchEvent[] = [
      {
        id: 'evt-001',
        organization_id: 'org-main',
        employee_id: 'emp-danya-154',
        employee_name: 'Danya R',
        employee_code: 'JCS-154',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM — Main Entrance',
        device_user_id: '154',
        event_timestamp: '2026-09-11T08:54:21+05:30',
        event_time_str: '08:54:21 AM',
        source: 'BIOMETRIC',
        verification_method: 'FINGERPRINT',
        classification: 'CHECK_IN',
        classification_reason: 'Raw hardware punch',
        is_duplicate: false,
        created_at: '2026-09-11T08:54:21+05:30',
      },
    ];

    const result = attendanceClassificationEngine.classifyPunches(
      'emp-danya-154',
      '2026-09-11',
      rawEvents,
      generalShift
    );

    expect(result.first_in).toBeDefined();
    expect(result.first_in?.classification).toBe('CHECK_IN');
    expect(result.first_in?.source).toBe('BIOMETRIC');
    expect(result.first_in?.verification_method).toBe('FINGERPRINT');
    expect(result.last_out).toBeNull(); // No false checkout
    expect(result.status).toBe('WORKING');
    expect(result.is_in_progress).toBe(true);
    expect(result.late_minutes).toBe(0);
    expect(result.primary_source).toBe('BIOMETRIC');
  });

  it('Gate 2: Late check-in beyond grace period is accurately detected without changing classification', () => {
    const rawEvents: ClassifiedPunchEvent[] = [
      {
        id: 'evt-002',
        organization_id: 'org-main',
        employee_id: 'emp-danya-154',
        employee_name: 'Danya R',
        employee_code: 'JCS-154',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '154',
        event_timestamp: '2026-09-11T09:25:00+05:30', // 25 mins after 9:00 AM (grace 10m)
        event_time_str: '09:25:00 AM',
        source: 'BIOMETRIC',
        verification_method: 'FINGERPRINT',
        classification: 'CHECK_IN',
        classification_reason: 'Raw hardware punch',
        is_duplicate: false,
        created_at: '2026-09-11T09:25:00+05:30',
      },
    ];

    const result = attendanceClassificationEngine.classifyPunches(
      'emp-danya-154',
      '2026-09-11',
      rawEvents,
      generalShift
    );

    expect(result.first_in?.classification).toBe('CHECK_IN');
    expect(result.late_minutes).toBe(25);
    expect(result.display_status).toContain('Late');
  });

  it('Gate 3: Two valid punches produce CHECK-IN and CHECK-OUT with net hours and OT calculation', () => {
    const rawEvents: ClassifiedPunchEvent[] = [
      {
        id: 'evt-in',
        organization_id: 'org-main',
        employee_id: 'emp-dharun-017',
        employee_name: 'Dharun B',
        employee_code: 'JCS-017',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '017',
        event_timestamp: '2026-09-11T08:56:00+05:30',
        event_time_str: '08:56:00 AM',
        source: 'BIOMETRIC',
        verification_method: 'FACE',
        classification: 'CHECK_IN',
        classification_reason: 'Morning check-in',
        is_duplicate: false,
        created_at: '2026-09-11T08:56:00+05:30',
      },
      {
        id: 'evt-out',
        organization_id: 'org-main',
        employee_id: 'emp-dharun-017',
        employee_name: 'Dharun B',
        employee_code: 'JCS-017',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '017',
        event_timestamp: '2026-09-11T18:42:00+05:30', // 42 mins after 18:00
        event_time_str: '06:42:00 PM',
        source: 'BIOMETRIC',
        verification_method: 'FACE',
        classification: 'CHECK_OUT',
        classification_reason: 'Evening exit',
        is_duplicate: false,
        created_at: '2026-09-11T18:42:00+05:30',
      },
    ];

    const result = attendanceClassificationEngine.classifyPunches(
      'emp-dharun-017',
      '2026-09-11',
      rawEvents,
      generalShift
    );

    expect(result.first_in?.classification).toBe('CHECK_IN');
    expect(result.last_out?.classification).toBe('CHECK_OUT');
    expect(result.status).toBe('COMPLETED');
    expect(result.is_in_progress).toBe(false);
    expect(result.gross_worked_minutes).toBe(586); // 9h 46m
    expect(result.ot_minutes).toBe(42); // 42 mins OT
  });

  it('Gate 4: Multi-punch mode accurately tracks break intervals and subtracts them from net working hours', () => {
    const rawEvents: ClassifiedPunchEvent[] = [
      {
        id: 'evt-1',
        organization_id: 'org-main',
        employee_id: 'emp-danya-154',
        employee_name: 'Danya R',
        employee_code: 'JCS-154',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '154',
        event_timestamp: '2026-09-11T08:54:00+05:30',
        event_time_str: '08:54:00 AM',
        source: 'BIOMETRIC',
        verification_method: 'FINGERPRINT',
        classification: 'CHECK_IN',
        classification_reason: 'Morning check-in',
        is_duplicate: false,
        created_at: '2026-09-11T08:54:00+05:30',
      },
      {
        id: 'evt-2',
        organization_id: 'org-main',
        employee_id: 'emp-danya-154',
        employee_name: 'Danya R',
        employee_code: 'JCS-154',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '154',
        event_timestamp: '2026-09-11T12:30:00+05:30',
        event_time_str: '12:30:00 PM',
        source: 'BIOMETRIC',
        verification_method: 'FINGERPRINT',
        classification: 'BREAK_OUT',
        classification_reason: 'Lunch break exit',
        is_duplicate: false,
        created_at: '2026-09-11T12:30:00+05:30',
      },
      {
        id: 'evt-3',
        organization_id: 'org-main',
        employee_id: 'emp-danya-154',
        employee_name: 'Danya R',
        employee_code: 'JCS-154',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '154',
        event_timestamp: '2026-09-11T13:15:00+05:30', // 45m break
        event_time_str: '01:15:00 PM',
        source: 'BIOMETRIC',
        verification_method: 'FINGERPRINT',
        classification: 'BREAK_IN',
        classification_reason: 'Lunch return',
        is_duplicate: false,
        created_at: '2026-09-11T13:15:00+05:30',
      },
      {
        id: 'evt-4',
        organization_id: 'org-main',
        employee_id: 'emp-danya-154',
        employee_name: 'Danya R',
        employee_code: 'JCS-154',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '154',
        event_timestamp: '2026-09-11T18:42:00+05:30',
        event_time_str: '06:42:00 PM',
        source: 'BIOMETRIC',
        verification_method: 'FINGERPRINT',
        classification: 'CHECK_OUT',
        classification_reason: 'Final exit',
        is_duplicate: false,
        created_at: '2026-09-11T18:42:00+05:30',
      },
    ];

    const result = attendanceClassificationEngine.classifyPunches(
      'emp-danya-154',
      '2026-09-11',
      rawEvents,
      generalShift
    );

    expect(result.valid_punches.length).toBe(4);
    expect(result.valid_punches[0].classification).toBe('CHECK_IN');
    expect(result.valid_punches[1].classification).toBe('BREAK_OUT');
    expect(result.valid_punches[2].classification).toBe('BREAK_IN');
    expect(result.valid_punches[3].classification).toBe('CHECK_OUT');
    expect(result.break_minutes).toBe(45); // 12:30 -> 13:15
    // Morning: 8:54 to 12:30 = 216m, Afternoon: 13:15 to 18:42 = 327m -> Total worked = 543m (9h 03m)
    expect(result.net_worked_minutes).toBe(543);
  });

  it('Gate 5: Rapid double-punch is classified as DUPLICATE and excluded from intervals without deleting from ledger', () => {
    const rawEvents: ClassifiedPunchEvent[] = [
      {
        id: 'evt-1',
        organization_id: 'org-main',
        employee_id: 'emp-danya-154',
        employee_name: 'Danya R',
        employee_code: 'JCS-154',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '154',
        event_timestamp: '2026-09-11T08:54:00+05:30',
        event_time_str: '08:54:00 AM',
        source: 'BIOMETRIC',
        verification_method: 'FINGERPRINT',
        classification: 'CHECK_IN',
        classification_reason: 'First tap',
        is_duplicate: false,
        created_at: '2026-09-11T08:54:00+05:30',
      },
      {
        id: 'evt-2-dupe',
        organization_id: 'org-main',
        employee_id: 'emp-danya-154',
        employee_name: 'Danya R',
        employee_code: 'JCS-154',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '154',
        event_timestamp: '2026-09-11T08:54:20+05:30', // 20s later
        event_time_str: '08:54:20 AM',
        source: 'BIOMETRIC',
        verification_method: 'FINGERPRINT',
        classification: 'CHECK_IN',
        classification_reason: 'Second rapid tap',
        is_duplicate: false,
        created_at: '2026-09-11T08:54:20+05:30',
      },
    ];

    const result = attendanceClassificationEngine.classifyPunches(
      'emp-danya-154',
      '2026-09-11',
      rawEvents,
      generalShift
    );

    expect(result.all_punches.length).toBe(2);
    expect(result.all_punches[1].classification).toBe('DUPLICATE');
    expect(result.all_punches[1].is_duplicate).toBe(true);
    expect(result.valid_punches.length).toBe(1);
    expect(result.status).toBe('WORKING');
  });

  it('Gate 6: Office shift (08:00 - 17:30) correctly calculates on-time and exit intervals', () => {
    const rawEvents: ClassifiedPunchEvent[] = [
      {
        id: 'evt-off-in',
        organization_id: 'org-main',
        employee_id: 'emp-office-001',
        employee_name: 'Office Staff',
        employee_code: 'JCS-OFF-01',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '201',
        event_timestamp: '2026-09-11T08:05:00+05:30',
        event_time_str: '08:05:00 AM',
        source: 'BIOMETRIC',
        verification_method: 'FACE',
        classification: 'CHECK_IN',
        classification_reason: 'Morning check-in',
        is_duplicate: false,
        created_at: '2026-09-11T08:05:00+05:30',
      },
      {
        id: 'evt-off-out',
        organization_id: 'org-main',
        employee_id: 'emp-office-001',
        employee_name: 'Office Staff',
        employee_code: 'JCS-OFF-01',
        device_id: 'dev-aiface-01',
        device_name: 'eSSL AI-FACE MAGNUM',
        device_user_id: '201',
        event_timestamp: '2026-09-11T17:35:00+05:30',
        event_time_str: '05:35:00 PM',
        source: 'BIOMETRIC',
        verification_method: 'FACE',
        classification: 'CHECK_OUT',
        classification_reason: 'Office exit',
        is_duplicate: false,
        created_at: '2026-09-11T17:35:00+05:30',
      },
    ];

    const result = attendanceClassificationEngine.classifyPunches(
      'emp-office-001',
      '2026-09-11',
      rawEvents,
      officeShift
    );

    expect(result.late_minutes).toBe(0); // 08:05 is within 10m grace for 08:00 start
    expect(result.first_in?.classification).toBe('CHECK_IN');
    expect(result.last_out?.classification).toBe('CHECK_OUT');
    expect(result.status).toBe('COMPLETED');
  });
});
