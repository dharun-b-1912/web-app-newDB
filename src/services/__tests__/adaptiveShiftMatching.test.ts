import { describe, it, expect } from 'vitest';
import { smartShiftResolutionService, ELECTRA_EV_SHIFTS } from '../attendance/smartShiftResolutionService';

describe('Electra EV Smart Adaptive Shift Resolution', () => {
  it('correctly matches SHIFT-1 for morning arrival (04:30 AM - 06:15 AM)', () => {
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-24T05:55:00+05:30',
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(res.shiftCode).toBe('SHIFT-1');
    expect(res.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it('correctly matches GEN-01 for General Shift arrival (07:15 AM - 08:45 AM)', () => {
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-24T08:30:10+05:30',
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(res.shiftCode).toBe('GEN-01');
    expect(res.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it('correctly matches GEN-01 for mid-morning late arrival (09:47 AM)', () => {
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-24T09:47:18+05:30',
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(res.shiftCode).toBe('GEN-01');
  });

  it('correctly matches SHIFT-2 for afternoon arrival (12:30 PM - 02:45 PM)', () => {
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-24T14:29:24+05:30',
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(res.shiftCode).toBe('SHIFT-2');
    expect(res.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it('correctly matches SHIFT-3 for night arrival (09:30 PM - 11:15 PM)', () => {
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-24T22:55:00+05:30',
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(res.shiftCode).toBe('SHIFT-3');
    expect(res.confidenceScore).toBeGreaterThanOrEqual(80);
  });
});
