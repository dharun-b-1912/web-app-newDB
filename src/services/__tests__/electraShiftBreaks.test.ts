import { describe, it, expect } from 'vitest';
import {
  getShiftScheduledBreakMinutes,
  processAttendanceStatus,
  DEFAULT_ATTENDANCE_POLICY,
} from '../../lib/attendance/attendanceEngine';

const ELECTRA_ORG = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';

describe('Electra EV Shift Break & Full/Half-Day Rules', () => {
  it('enforces strict 30m lunch break on Day/General shifts and 0m break on Night Shift', () => {
    expect(getShiftScheduledBreakMinutes('SHIFT-1', false, ELECTRA_ORG)).toBe(30);
    expect(getShiftScheduledBreakMinutes('SHIFT-2', false, ELECTRA_ORG)).toBe(30);
    expect(getShiftScheduledBreakMinutes('GEN-01', false, ELECTRA_ORG)).toBe(30);
    expect(getShiftScheduledBreakMinutes('SHIFT-3', true, ELECTRA_ORG)).toBe(0);
    expect(getShiftScheduledBreakMinutes('SHIFT-3', false, ELECTRA_ORG)).toBe(0);
  });

  it('calculates SHIFT-1 (06:00-14:30) as 8h 30m gross - 30m break = 8h 00m net Full Day Present', () => {
    const breakMins = getShiftScheduledBreakMinutes('SHIFT-1', false, ELECTRA_ORG);
    const res = processAttendanceStatus(
      360, // 06:00
      870, // 14:30
      360,
      870,
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-11-24',
      undefined,
      breakMins
    );
    expect(res.grossMinutes).toBe(510);
    expect(res.breakMinutes).toBe(30);
    expect(res.netMinutes).toBe(480);
    expect(res.status).toBe('Present');
    expect(res.overtimeMinutes).toBe(0);
  });

  it('calculates SHIFT-3 Night Shift (11:00 PM - 06:00 AM, 7h, 0m break) as Full Day Present, NOT Half Day', () => {
    const breakMins = getShiftScheduledBreakMinutes('SHIFT-3', true, ELECTRA_ORG);
    // 23:00 (1380) to 06:14 (374) -> 7h 14m (434 mins)
    const res = processAttendanceStatus(
      1380,
      374,
      1380,
      360,
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-11-24',
      undefined,
      breakMins
    );
    expect(res.grossMinutes).toBe(434);
    expect(res.breakMinutes).toBe(0);
    expect(res.netMinutes).toBe(434);
    expect(res.status).toBe('Present');
    expect(res.overtimeMinutes).toBe(0);
  });

  it('classifies Day shift < 4h as Half Day and Night shift < 3.5h (210m) as Half Day', () => {
    const dayHalf = processAttendanceStatus(
      360, // 06:00
      570, // 09:30 (3h 30m)
      360,
      870,
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-11-24',
      undefined,
      30
    );
    expect(dayHalf.status).toBe('Half Day');

    const nightHalf = processAttendanceStatus(
      1380, // 23:00
      120,  // 02:00 (3h 00m = 180m < 210m)
      1380,
      360,
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-11-24',
      undefined,
      0
    );
    expect(nightHalf.status).toBe('Half Day');
  });
});

