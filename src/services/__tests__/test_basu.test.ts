import { describe, it, expect } from 'vitest';
import { smartShiftResolutionService, ELECTRA_EV_SHIFTS } from '../attendance/smartShiftResolutionService';
import { computeEmployeeOvertime } from '../attendance/attendanceReportExportService';

describe('Basuded resolution and early OT test', () => {
  it('resolves 09:47 AM punch to SHIFT-2', () => {
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      firstPunchTime: '2026-11-24T04:17:18+00:00', // 09:47:18 IST
      activeShifts: ELECTRA_EV_SHIFTS,
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(res.shiftCode).toBe('SHIFT-2');
  });

  it('calculates pre-shift early check-in overtime while active in shift', () => {
    const shift = ELECTRA_EV_SHIFTS.find(s => s.code === 'SHIFT-2');
    const ot = computeEmployeeOvertime({
      first_check_in: '2026-11-24T04:17:18+00:00', // 09:47:18 IST
      last_check_out: null, // Still in shift
    }, shift, false);

    expect(ot.hasOvertime).toBe(true);
    expect(ot.overtimeMinutes).toBe(283); // 4 hours 43 minutes early
    expect(ot.formatted).toBe('4h 43m');
  });

  it('calculates full overtime when employee checks out on-time at shift end', () => {
    const shift = ELECTRA_EV_SHIFTS.find(s => s.code === 'SHIFT-2');
    const ot = computeEmployeeOvertime({
      first_check_in: '2026-11-24T04:17:18+00:00', // 09:47:18 IST
      last_check_out: '2026-11-24T17:30:00+00:00', // 23:00:00 IST (exact shift end)
      total_work_minutes: 793, // 13h 13m worked
    }, shift, false);

    expect(ot.hasOvertime).toBe(true);
    expect(ot.overtimeMinutes).toBe(283); // 793 - 510 = 283 mins (4h 43m OT)
    expect(ot.formatted).toBe('4h 43m');
  });
});
