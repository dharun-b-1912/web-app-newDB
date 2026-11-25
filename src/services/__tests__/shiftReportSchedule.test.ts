import { describe, it, expect } from 'vitest';
import {
  computeOffsetTime24,
  getDefaultShiftRulesForOrg,
  shiftReportScheduleService,
} from '../attendance/shiftReportScheduleService';

describe('shiftReportScheduleService', () => {
  it('computes +30m shift dispatch times accurately across day and overnight shifts', () => {
    expect(computeOffsetTime24('06:00', 30)).toBe('06:30');
    expect(computeOffsetTime24('14:30', 30)).toBe('15:00');
    expect(computeOffsetTime24('23:00', 30)).toBe('23:30');
    expect(computeOffsetTime24('23:45', 30)).toBe('00:15');
  });

  it('builds default Electra EV shift rules with Check-In at +30m and Check-Out at +30m', () => {
    const rules = getDefaultShiftRulesForOrg('c5ab6b03-adde-47cc-a033-064f4c39b21e');
    expect(rules.length).toBeGreaterThanOrEqual(4);

    const shift1 = rules.find((r) => r.shiftCode === 'SHIFT-1');
    expect(shift1).toBeDefined();
    expect(shift1?.checkInDispatchTime).toBe('06:30');
    expect(shift1?.checkOutDispatchTime).toBe('15:00');

    const shift2 = rules.find((r) => r.shiftCode === 'SHIFT-2');
    expect(shift2?.checkInDispatchTime).toBe('15:00');
    expect(shift2?.checkOutDispatchTime).toBe('23:30');

    const shift3 = rules.find((r) => r.shiftCode === 'SHIFT-3');
    expect(shift3?.checkInDispatchTime).toBe('23:30');
    expect(shift3?.checkOutDispatchTime).toBe('06:30');
  });

  it('filters by shift and builds department-wise structured summary differentiating Check-In vs Check-Out', () => {
    const mockRows: any[] = [
      {
        emp: { id: '1', department_name: 'BESS' },
        shift: { shift_code: 'SHIFT-1', shift_name: 'Shift 1' },
        roster: { shift_code: 'SHIFT-1' },
        record: {
          first_check_in: '06:05:00',
          last_check_out: '14:40:00',
          status: 'Present',
          late_minutes: 0,
          early_checkout_minutes: 0,
          overtime_minutes: 10,
          net_working_minutes: 515,
        },
      },
      {
        emp: { id: '2', department_name: 'BESS' },
        shift: { shift_code: 'SHIFT-1', shift_name: 'Shift 1' },
        roster: { shift_code: 'SHIFT-1' },
        record: {
          first_check_in: '06:25:00',
          last_check_out: undefined,
          status: 'Late',
          late_minutes: 25,
          early_checkout_minutes: 0,
          overtime_minutes: 0,
          net_working_minutes: 0,
        },
      },
      {
        emp: { id: '3', department_name: 'B-PACK' },
        shift: { shift_code: 'SHIFT-2', shift_name: 'Shift 2' },
        roster: { shift_code: 'SHIFT-2' },
        record: {
          first_check_in: '14:28:00',
          last_check_out: '23:05:00',
          status: 'Present',
          late_minutes: 0,
          early_checkout_minutes: 0,
          overtime_minutes: 0,
          net_working_minutes: 517,
        },
      },
    ];

    const checkInSummary = shiftReportScheduleService.buildShiftDepartmentStructuredSummary(
      mockRows,
      'SHIFT-1',
      'CHECK_IN',
      'ALL'
    );
    expect(checkInSummary.totalEmployees).toBe(2);
    expect(checkInSummary.checkedInCount).toBe(2);
    expect(checkInSummary.onTimeCount).toBe(1);
    expect(checkInSummary.lateCount).toBe(1);
    expect(checkInSummary.departments).toHaveLength(1);
    expect(checkInSummary.departments[0].department).toBe('BESS');

    const checkOutSummary = shiftReportScheduleService.buildShiftDepartmentStructuredSummary(
      mockRows,
      'SHIFT-1',
      'CHECK_OUT',
      'ALL'
    );
    expect(checkOutSummary.checkedOutCount).toBe(1);
    expect(checkOutSummary.missingOutPunchCount).toBe(1);
    expect(checkOutSummary.overtimeCount).toBe(1);
  });
});

