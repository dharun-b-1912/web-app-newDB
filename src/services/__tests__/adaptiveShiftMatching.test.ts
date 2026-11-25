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

  it('correctly matches SHIFT-1 for late morning arrivals (06:35 AM, 07:01 AM, 07:15 AM) and never maps to GEN-01', () => {
    // Ajaivikram (06:35:29 AM) -> SHIFT-1, 35m late
    const resAjaivikram = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-25T06:35:29+05:30',
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(resAjaivikram.shiftCode).toBe('SHIFT-1');

    // Sakthivel (07:01:29 AM) -> SHIFT-1, ~1h late
    const resSakthivel = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-25T07:01:29+05:30',
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(resSakthivel.shiftCode).toBe('SHIFT-1');

    // Sujimitha (07:15:33 AM) -> SHIFT-1, ~1h 15m late
    const resSujimitha = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-25T07:15:33+05:30',
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(resSujimitha.shiftCode).toBe('SHIFT-1');
  });

  it('correctly matches GEN-01 for General Shift arrival (07:45 AM - 08:45 AM)', () => {
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-24T08:30:10+05:30',
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(res.shiftCode).toBe('GEN-01');
    expect(res.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it('correctly matches SHIFT-2 for mid-morning early arrival (09:47 AM, ~4.5h before Shift 2 start)', () => {
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-24T09:47:18+05:30',
      mode: 'ADAPTIVE_SHIFT',
    });
    expect(res.shiftCode).toBe('SHIFT-2');
  });

  it('correctly matches GEN-01 for General Shift arrival (08:48 AM)', () => {
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '2026-11-24T08:48:00+05:30',
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
