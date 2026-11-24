import { describe, it, expect } from 'vitest';
import { smartShiftResolutionService, ELECTRA_EV_SHIFTS } from '../attendance/smartShiftResolutionService';
import { processAttendanceStatus, DEFAULT_ATTENDANCE_POLICY } from '../../lib/attendance/attendanceEngine';

describe('Manufacturing Cross-Midnight & Overnight Adaptive Shift Resolution', () => {
  it('1. Rejects 03:27 AM checkout punch from falsely matching Shift 1 (06:00 AM)', () => {
    // Santhosh Kumar punched out at 03:27:42 AM after working Shift 2 + OT
    const punchTime = '03:27:42 AM';
    const shift1 = ELECTRA_EV_SHIFTS.find(s => s.code === 'SHIFT-1')!;

    const result = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: punchTime,
      mode: 'ADAPTIVE_SHIFT',
    });

    // A punch at 03:27 AM must NOT match Shift 1 (06:00 AM)
    expect(result.shiftCode).not.toBe('SHIFT-1');
  });

  it('2. Retains assigned Shift 2 (14:30 - 23:00) when employee arrives early for pre-shift OT', () => {
    // Basuded arrived at 09:47:18 AM for assigned Shift 2
    const assignedShift2 = ELECTRA_EV_SHIFTS.find(s => s.code === 'SHIFT-2')!;
    const arrivalTime = '09:47:18 AM';

    const result = smartShiftResolutionService.resolveShiftDeterministic({
      assignedShift: assignedShift2,
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: arrivalTime,
      mode: 'HYBRID_MODE',
    });

    expect(result.shiftCode).toBe('SHIFT-2');
    expect(result.resolutionReason).toContain('pre-shift production overtime');
  });

  it('3. Calculates early arrival overtime accurately for pre-shift arrival', () => {
    // Arrival at 09:47 AM for a 14:30 PM shift
    const inMins = 9 * 60 + 47; // 587
    const expIn = 14 * 60 + 30; // 870
    const expOut = 23 * 60; // 1380

    const calc = processAttendanceStatus(
      inMins,
      null,
      expIn,
      expOut,
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-11-24'
    );

    expect(calc.earlyArrivalMinutes).toBe(283); // 4h 43m early
    expect(calc.overtimeMinutes).toBe(283); // credited early overtime
    expect(calc.lateMinutes).toBe(0);
    expect(calc.status).toBe('Present');
  });

  it('4. Calculates cross-midnight Shift 2 + OT accurately without break penalty distortion', () => {
    // Santhosh on 2026-11-23: in at 13:58 (01:58 PM), out at 03:27 AM next day
    const inMins = 13 * 60 + 58; // 838
    const outMins = 3 * 60 + 27; // 207 (cross midnight)
    const expIn = 14 * 60 + 30; // 870
    const expOut = 23 * 60; // 1380

    const calc = processAttendanceStatus(
      inMins,
      outMins,
      expIn,
      expOut,
      DEFAULT_ATTENDANCE_POLICY,
      false,
      false,
      false,
      '2026-11-23'
    );

    // Gross minutes: from 13:58 to 03:27 next day = (1440 - 838) + 207 = 809 minutes (13h 29m)
    expect(calc.grossMinutes).toBe(809);
    expect(calc.earlyArrivalMinutes).toBe(32); // 01:58 PM is 32m early for 14:30
    // Scheduled duration: 14:30 to 23:00 = 510 minutes (8.5 hrs)
    // Overtime: 809 - 510 = 299 mins (4h 59m net OT)
    expect(calc.overtimeMinutes).toBe(299);
    expect(calc.status).toBe('Present');
  });
});
