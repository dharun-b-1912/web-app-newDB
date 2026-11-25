import { describe, it, expect } from 'vitest';
import { processAttendanceStatus, DEFAULT_ATTENDANCE_POLICY, timeStringToMinutes } from '../../lib/attendance/attendanceEngine';

describe('HR Biometric Attendance - Punch Precedence Over Stale Leave', () => {
  it('1. Physical punches supersede stale or uncancelled leave in processAttendanceStatus', () => {
    // GOWSITH (TEMP-41) on Shift-3: 11:00 PM (23:00) to 06:00 AM (cross midnight)
    // Punches: In at 10:46:38 PM (22:46 = 1366 min), Out at 06:11:30 AM (06:11 = 371 min)
    const inMins = timeStringToMinutes('10:46:38 PM'); // 1366
    const outMins = timeStringToMinutes('06:11:30 AM'); // 371
    const expIn = 23 * 60; // 1380
    const expOut = 6 * 60; // 360

    // Even if isLeave is true (from legacy flag, draft leave, or stale cache):
    const calc = processAttendanceStatus(
      inMins,
      outMins,
      expIn,
      expOut,
      DEFAULT_ATTENDANCE_POLICY,
      true, // isLeave
      false, // isWfh
      false, // isHoliday
      '2026-11-24'
    );

    // Physical punches MUST NOT be zeroed out
    expect(calc.grossMinutes).toBe(445); // 7h 25m
    expect(calc.netMinutes).toBe(445);
    expect(calc.lateMinutes).toBe(0); // Arrived 14 min early
    expect(calc.earlyArrivalMinutes).toBe(14);
    expect(calc.status).toBe('Present');
    expect(calc.status).not.toBe('On Leave');
  });

  it('2. Leaves with zero punches correctly remain classified as On Leave with 0 minutes', () => {
    const calc = processAttendanceStatus(
      null,
      null,
      9 * 60,
      18 * 60,
      DEFAULT_ATTENDANCE_POLICY,
      true, // isLeave
      false,
      false,
      '2026-11-24'
    );

    expect(calc.status).toBe('On Leave');
    expect(calc.grossMinutes).toBe(0);
    expect(calc.netMinutes).toBe(0);
  });

  it('3. In-progress active shift check-in supersedes leave', () => {
    // Employee punched in at 09:15 AM for a 09:00 AM shift, shift is still ongoing today
    const inMins = 9 * 60 + 15;
    const expIn = 9 * 60;
    const expOut = 18 * 60;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const calc = processAttendanceStatus(
      inMins,
      null, // actively working
      expIn,
      expOut,
      DEFAULT_ATTENDANCE_POLICY,
      true, // isLeave passed
      false,
      false,
      todayStr,
      11 * 60 // current time 11:00 AM
    );

    expect(calc.grossMinutes).toBeGreaterThan(0);
    expect(calc.status).not.toBe('On Leave');
    expect(calc.status).toBe('Present');
  });
});
