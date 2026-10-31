import { describe, it, expect } from 'vitest';
import {
  processAttendanceStatus,
  timeStringToMinutes,
  DEFAULT_ATTENDANCE_POLICY,
} from '../../lib/attendance/attendanceEngine';
import { computeEmployeeOvertime } from '../attendance/attendanceReportExportService';

describe('Production-Grade Cross-Midnight & Night Shift Attendance Engine', () => {
  it('Test A: Normal overnight shift check-in to checkout (19:30 -> 07:30)', () => {
    const result = processAttendanceStatus(
      1170, // 19:30 check-in
      450,  // 07:30 check-out
      1170, // expected in: 19:30
      450,  // expected out: 07:30
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-10-29'
    );
    expect(result.grossMinutes).toBe(720);
    expect(result.netMinutes).toBe(720);
    expect(result.lateMinutes).toBe(0);
    expect(result.earlyMinutes).toBe(0);
    expect(result.overtimeMinutes).toBe(0);
    expect(result.status).toBe('Present');
  });

  it('Test B: Midnight transition (shift evaluated at 00:00 midnight while in progress)', () => {
    const result = processAttendanceStatus(
      1170, // 19:30 check-in
      null, // in progress
      1170, // expected in: 19:30
      450,  // expected out: 07:30
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-10-29'
    );
    expect(result.status).not.toBe('Absent');
  });

  it('Test C: Early-morning checkout at 06:00 AM (Early checkout on overnight shift)', () => {
    const result = processAttendanceStatus(
      1170, // 19:30 check-in
      360,  // 06:00 AM check-out
      1170, // expected in: 19:30
      450,  // expected out: 07:30 (with 15m grace => 07:15 / 435)
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-10-29'
    );
    expect(result.grossMinutes).toBe(630);
    expect(result.earlyMinutes).toBe(75);
    expect(result.status).toBe('Present');
  });

  it('Test D: Missing checkout past scheduled shift end (Ranjith P Scenario)', () => {
    const result = processAttendanceStatus(
      1182, // 19:42 check-in
      null, // Missing checkout
      1170, // expected in: 19:30
      450,  // expected out: 07:30
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-10-29'
    );
    expect(result.status).toBe('Missing Punch');
    expect(result.grossMinutes).toBeLessThanOrEqual(720);
  });

  it('Test J: Overtime calculation against 12h shift scheduled duration', () => {
    const result = processAttendanceStatus(
      1170, // 19:30 check-in
      540,  // 09:00 checkout (+90m after 07:30)
      1170, // expected in: 19:30
      450,  // expected out: 07:30
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-10-29'
    );
    expect(result.grossMinutes).toBe(810);
    expect(result.overtimeMinutes).toBe(90);
  });

  it('Standard 9h Day Shift OT elimination (Gopika D scenario)', () => {
    const otResult = computeEmployeeOvertime(
      {
        first_check_in: '2026-10-30T09:00:00+05:30',
        last_check_out: '2026-10-30T18:11:00+05:30',
        net_working_minutes: 551,
      },
      {
        shift_code: 'GEN-09',
        start_time: '09:00',
        end_time: '18:00',
        scheduled_duration_minutes: 540,
        cross_midnight: false,
      }
    );
    expect(otResult.hasOvertime).toBe(false);
    expect(otResult.overtimeMinutes).toBe(0);
  });

  it('NS-01 Night Shift Overtime verification', () => {
    const otScheduled = computeEmployeeOvertime(
      {
        first_check_in: '2026-10-29T19:30:00+05:30',
        last_check_out: '2026-10-30T07:30:00+05:30',
        net_working_minutes: 720,
      },
      {
        shift_code: 'NS-01',
        start_time: '19:30',
        end_time: '07:30',
        scheduled_duration_minutes: 720,
        cross_midnight: true,
      }
    );
    expect(otScheduled.hasOvertime).toBe(false);

    const otExtra = computeEmployeeOvertime(
      {
        first_check_in: '2026-10-29T19:30:00+05:30',
        last_check_out: '2026-10-30T08:30:00+05:30',
        net_working_minutes: 780,
      },
      {
        shift_code: 'NS-01',
        start_time: '19:30',
        end_time: '07:30',
        scheduled_duration_minutes: 720,
        cross_midnight: true,
      }
    );
    expect(otExtra.hasOvertime).toBe(true);
    expect(otExtra.overtimeMinutes).toBe(60);
  });
});
