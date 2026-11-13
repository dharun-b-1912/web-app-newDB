import { describe, it, expect } from 'vitest';
import {
  computeWorkHoursWithBreaks,
  buildAttendanceTimelineIntervals,
  DEFAULT_BREAK_CATEGORIES,
  ScopedBreakPolicy,
} from '../workHoursCalculator';

const BASE_POLICY: ScopedBreakPolicy = {
  id: 'pol-1',
  organization_id: 'org-1',
  name: 'Standard Break Policy',
  version: 1,
  scope_type: 'ORGANIZATION',
  scope_id: null,
  effective_from: '2026-01-01',
  effective_to: null,
  is_active: true,
  auto_deduct_enabled: true,
  auto_deduct_after_minutes: 300,
  auto_deduct_minutes: 30,
  paid_break_allowance_minutes: 15,
  max_unpaid_break_minutes: 60,
  max_breaks_per_day: 4,
  core_hours_start: '10:00',
  core_hours_end: '16:00',
  breaks_prohibited_in_core_hours: false,
  mandatory_lunch_break: false,
  rounding_rule: 'NONE',
  categories: DEFAULT_BREAK_CATEGORIES,
};

describe('Break & Work Hours Calculation Engine', () => {
  it('1. Absent / 0h presence receives ZERO phantom paid break or auto-deduction', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 0,
      scheduledMinutes: 480,
      breaks: [],
      policy: BASE_POLICY,
    });
    expect(res.grossPresenceMinutes).toBe(0);
    expect(res.paidBreakMinutes).toBe(0);
    expect(res.unpaidBreakMinutes).toBe(0);
    expect(res.autoDeductedBreakMinutes).toBe(0);
    expect(res.netPayableMinutes).toBe(0);
  });

  it('2. Normal 9h shift with no breaks logged triggers 30m auto-deduction', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 540,
      checkInAt: '2026-11-12T09:00:00Z',
      checkOutAt: '2026-11-12T18:00:00Z',
      scheduledMinutes: 480,
      breaks: [],
      policy: BASE_POLICY,
    });
    expect(res.autoDeductedBreakMinutes).toBe(30);
    expect(res.netPayableMinutes).toBe(510);
  });

  it('3. Logged 45m unpaid Lunch break prevents duplicate auto-deduction', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 540,
      checkInAt: '2026-11-12T09:00:00Z',
      checkOutAt: '2026-11-12T18:00:00Z',
      scheduledMinutes: 480,
      breaks: [
        {
          id: 'b1',
          break_category: 'LUNCH',
          is_paid: false,
          started_at: '2026-11-12T13:00:00Z',
          ended_at: '2026-11-12T13:45:00Z',
          duration_minutes: 45,
          status: 'COMPLETED',
        },
      ],
      policy: BASE_POLICY,
    });
    expect(res.unpaidBreakMinutes).toBe(45);
    expect(res.autoDeductedBreakMinutes).toBe(0);
    expect(res.netPayableMinutes).toBe(495);
  });

  it('4. Short 15m unpaid break triggers only remaining 15m auto-deduction', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 540,
      scheduledMinutes: 480,
      breaks: [
        {
          id: 'b1',
          break_category: 'LUNCH',
          is_paid: false,
          started_at: '2026-11-12T13:00:00Z',
          ended_at: '2026-11-12T13:15:00Z',
          duration_minutes: 15,
          status: 'COMPLETED',
        },
      ],
      policy: BASE_POLICY,
    });
    expect(res.unpaidBreakMinutes).toBe(15);
    expect(res.autoDeductedBreakMinutes).toBe(15);
    expect(res.totalDeductedMinutes).toBe(30);
    expect(res.netPayableMinutes).toBe(510);
  });

  it('5. Paid 15m Tea break is fully credited toward payable work', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 540,
      scheduledMinutes: 480,
      breaks: [
        {
          id: 'b1',
          break_category: 'LUNCH',
          is_paid: false,
          started_at: '2026-11-12T13:00:00Z',
          ended_at: '2026-11-12T13:45:00Z',
          duration_minutes: 45,
          status: 'COMPLETED',
        },
        {
          id: 'b2',
          break_category: 'TEA',
          is_paid: true,
          started_at: '2026-11-12T16:00:00Z',
          ended_at: '2026-11-12T16:15:00Z',
          duration_minutes: 15,
          status: 'COMPLETED',
        },
      ],
      policy: BASE_POLICY,
    });
    expect(res.paidBreakMinutes).toBe(15);
    expect(res.excessPaidConvertedMinutes).toBe(0);
    expect(res.unpaidBreakMinutes).toBe(45);
    expect(res.netPayableMinutes).toBe(495);
  });

  it('6. Exceeded paid break (25m Tea vs 15m allowance) converts 10m to unpaid', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 540,
      scheduledMinutes: 480,
      breaks: [
        {
          id: 'b1',
          break_category: 'LUNCH',
          is_paid: false,
          started_at: '2026-11-12T13:00:00Z',
          ended_at: '2026-11-12T13:30:00Z',
          duration_minutes: 30,
          status: 'COMPLETED',
        },
        {
          id: 'b2',
          break_category: 'TEA',
          is_paid: true,
          started_at: '2026-11-12T16:00:00Z',
          ended_at: '2026-11-12T16:25:00Z',
          duration_minutes: 25,
          status: 'COMPLETED',
        },
      ],
      policy: BASE_POLICY,
    });
    expect(res.paidBreakMinutes).toBe(15);
    expect(res.excessPaidConvertedMinutes).toBe(10);
    expect(res.unpaidBreakMinutes).toBe(40);
    expect(res.netPayableMinutes).toBe(500);
  });

  it('7. Flags exceeded max unpaid break limit (>60m)', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 540,
      scheduledMinutes: 480,
      breaks: [
        {
          id: 'b1',
          break_category: 'LUNCH',
          is_paid: false,
          started_at: '2026-11-12T13:00:00Z',
          ended_at: '2026-11-12T14:20:00Z',
          duration_minutes: 80,
          status: 'COMPLETED',
        },
      ],
      policy: BASE_POLICY,
    });
    expect(res.hasExceededUnpaidLimit).toBe(true);
    expect(res.netPayableMinutes).toBe(460);
    expect(res.deficitMinutes).toBe(20);
  });

  it('8. Flags missing mandatory lunch break after check-out', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 540,
      checkInAt: '2026-11-12T09:00:00Z',
      checkOutAt: '2026-11-12T18:00:00Z',
      scheduledMinutes: 480,
      breaks: [],
      policy: { ...BASE_POLICY, mandatory_lunch_break: true },
    });
    expect(res.hasMissingLunchException).toBe(true);
  });

  it('9. Detects active ongoing break and calculates live elapsed duration', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 300,
      checkInAt: '2026-11-12T09:00:00Z',
      checkOutAt: null,
      scheduledMinutes: 480,
      breaks: [
        {
          id: 'b1',
          break_category: 'TEA',
          is_paid: true,
          started_at: '2026-11-12T13:50:00Z',
          ended_at: null,
          duration_minutes: null,
          status: 'ACTIVE',
        },
      ],
      policy: BASE_POLICY,
      referenceNowIso: '2026-11-12T14:00:00Z',
    });
    expect(res.hasActiveBreak).toBe(true);
    expect(res.paidBreakMinutes).toBe(10);
  });

  it('10. Overnight shift span & cross-midnight break computed accurately', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 0,
      checkInAt: '2026-11-12T22:00:00Z',
      checkOutAt: '2026-11-13T07:00:00Z',
      scheduledMinutes: 480,
      breaks: [
        {
          id: 'b1',
          break_category: 'LUNCH',
          is_paid: false,
          started_at: '2026-11-12T23:45:00Z',
          ended_at: '2026-11-13T00:30:00Z',
          duration_minutes: 45,
          status: 'COMPLETED',
        },
      ],
      policy: BASE_POLICY,
    });
    expect(res.grossPresenceMinutes).toBe(540);
    expect(res.unpaidBreakMinutes).toBe(45);
    expect(res.netPayableMinutes).toBe(495);
  });

  it('11. Cancelled breaks are excluded from deductions & allowances', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 240,
      scheduledMinutes: 480,
      breaks: [
        {
          id: 'b1',
          break_category: 'TEA',
          is_paid: true,
          started_at: '2026-11-12T11:00:00Z',
          ended_at: '2026-11-12T11:15:00Z',
          duration_minutes: 15,
          status: 'CANCELLED',
        },
      ],
      policy: BASE_POLICY,
    });
    expect(res.paidBreakMinutes).toBe(0);
    expect(res.netPayableMinutes).toBe(240);
  });

  it('12. Supports rounding rules (NEAREST_5) and approved OT integration', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 600,
      scheduledMinutes: 480,
      approvedOtMinutes: 90,
      breaks: [
        {
          id: 'b1',
          break_category: 'LUNCH',
          is_paid: false,
          started_at: '2026-11-12T13:00:00Z',
          ended_at: '2026-11-12T13:43:00Z',
          duration_minutes: 43,
          status: 'COMPLETED',
        },
      ],
      policy: { ...BASE_POLICY, rounding_rule: 'NEAREST_5' },
    });
    expect(res.unpaidBreakMinutes).toBe(45);
    expect(res.netPayableMinutes).toBe(555);
    expect(res.approvedOtMinutes).toBe(90);
    expect(res.steps.some((s) => s.includes('Approved Overtime: +90m'))).toBe(true);
  });

  it('13. buildAttendanceTimelineIntervals constructs chronological work, paid/unpaid break, and approved OT intervals', () => {
    const intervals = buildAttendanceTimelineIntervals({
      checkInAt: '2026-11-12T08:52:00Z',
      checkOutAt: '2026-11-12T20:00:00Z',
      approvedOtMinutes: 120,
      breaks: [
        {
          id: 'b-lunch',
          break_category: 'LUNCH',
          is_paid: false,
          started_at: '2026-11-12T13:00:00Z',
          ended_at: '2026-11-12T13:45:00Z',
          duration_minutes: 45,
          status: 'COMPLETED',
        },
        {
          id: 'b-tea',
          break_category: 'TEA',
          is_paid: true,
          started_at: '2026-11-12T16:15:00Z',
          ended_at: '2026-11-12T16:30:00Z',
          duration_minutes: 15,
          status: 'COMPLETED',
        },
      ],
    });

    expect(intervals.map((i) => i.type)).toEqual([
      'CHECK_IN',
      'WORK',
      'UNPAID_BREAK',
      'WORK',
      'PAID_BREAK',
      'WORK',
      'OVERTIME',
      'CHECK_OUT',
    ]);
    expect(intervals[1].duration_minutes).toBe(248); // 08:52 -> 13:00
    expect(intervals[2].duration_minutes).toBe(45);
    expect(intervals[3].duration_minutes).toBe(150); // 13:45 -> 16:15
    expect(intervals[4].duration_minutes).toBe(15);
    expect(intervals[5].duration_minutes).toBe(210); // 16:30 -> 20:00
    expect(intervals[6].duration_minutes).toBe(120); // approved OT
  });

  it('14. Ongoing checked-in session (no checkOutAt) reports zero deficit mid-shift', () => {
    const res = computeWorkHoursWithBreaks({
      grossPresenceMinutes: 350,
      checkInAt: '2026-11-12T09:00:00Z',
      checkOutAt: null,
      scheduledMinutes: 480,
      breaks: [],
      policy: BASE_POLICY,
    });
    expect(res.netPayableMinutes).toBe(320);
    expect(res.deficitMinutes).toBe(0);
  });
});

