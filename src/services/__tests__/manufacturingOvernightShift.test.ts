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
    expect(calc.earlyMinutes).toBe(0); // MUST NEVER be 1158m!
    // Scheduled duration: 14:30 to 23:00 = 510 minutes (8.5 hrs)
    // Overtime: 809 - 510 = 299 mins (4h 59m net OT)
    expect(calc.overtimeMinutes).toBe(299);
    expect(calc.status).toBe('Present');
  });

  it('5. Shift 2 workers clocking out at 01:03 AM (Marimuthu, Sridharan, Hari) have 0 early departure minutes', () => {
    // In at 14:29 (02:29 PM), Out at 01:03 AM (next day)
    const inMins = 14 * 60 + 29; // 869
    const outMins = 1 * 60 + 3;  // 63 (next day)
    const expIn = 14 * 60 + 30; // 870
    const expOut = 23 * 60;     // 1380

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

    // Gross minutes: from 14:29 to 01:03 = (1440 - 869) + 63 = 634 minutes (10h 34m)
    expect(calc.grossMinutes).toBe(634);
    expect(calc.earlyMinutes).toBe(0); // MUST NEVER be 1302m!
    expect(calc.overtimeMinutes).toBe(124); // 634 - 510 = 124 mins (2h 04m OT)
    expect(calc.status).toBe('Present');
  });

  it('6. Shift 3 night workers clocking out at 06:05 AM (Anup, Mannu, Ras, Bibakanand) calculate full night shift', () => {
    // In at 17:59 (05:59 PM), Out at 06:05 AM (next day)
    // Scheduled Shift 3: 23:00 to 06:00
    const inMins = 17 * 60 + 59; // 1079
    const outMins = 6 * 60 + 5;  // 365 (next day)
    const expIn = 23 * 60;       // 1380
    const expOut = 6 * 60;       // 360

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

    // Gross minutes: (1440 - 1079) + 365 = 726 minutes (12h 06m)
    expect(calc.grossMinutes).toBe(726);
    expect(calc.earlyMinutes).toBe(0);
    // Scheduled Shift 3: 7 hours (420 mins)
    // Overtime: 726 - 420 = 306 mins (5h 06m OT)
    expect(calc.overtimeMinutes).toBe(306);
    expect(calc.status).toBe('Present');
  });
});

