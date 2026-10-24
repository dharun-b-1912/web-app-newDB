import { describe, it, expect } from 'vitest';
import {
  OvertimeGovernanceService,
  DEFAULT_OVERTIME_THRESHOLDS,
  type OvertimeThresholdConfig,
  type EmployeeOvertimeGovernanceRecord
} from '../overtimeGovernanceService';

describe('Overtime Governance Service - 60h Annual / 20h 4-Month Period', () => {
  describe('Resolution of Four-Month Fixed Calendar Periods', () => {
    it('should correctly identify Period 1 (Jan 1 - Apr 30)', () => {
      // Test Jan 1
      const p1Start = OvertimeGovernanceService.getFourMonthPeriod('2026-01-01');
      expect(p1Start.periodIndex).toBe(1);
      expect(p1Start.periodName).toBe('Period 1 (Jan - Apr)');
      expect(p1Start.startDate).toBe('2026-01-01');
      expect(p1Start.endDate).toBe('2026-04-30');
      expect(p1Start.allocationHours).toBe(20);

      // Test mid-period Mar 15
      const p1Mid = OvertimeGovernanceService.getFourMonthPeriod('2026-03-15');
      expect(p1Mid.periodIndex).toBe(1);
      expect(p1Mid.startDate).toBe('2026-01-01');
      expect(p1Mid.endDate).toBe('2026-04-30');

      // Test period end Apr 30
      const p1End = OvertimeGovernanceService.getFourMonthPeriod('2026-04-30');
      expect(p1End.periodIndex).toBe(1);
      expect(p1End.endDate).toBe('2026-04-30');
    });

    it('should correctly identify Period 2 (May 1 - Aug 31)', () => {
      // Test May 1
      const p2Start = OvertimeGovernanceService.getFourMonthPeriod('2026-05-01');
      expect(p2Start.periodIndex).toBe(2);
      expect(p2Start.periodName).toBe('Period 2 (May - Aug)');
      expect(p2Start.startDate).toBe('2026-05-01');
      expect(p2Start.endDate).toBe('2026-08-31');

      // Test Aug 31
      const p2End = OvertimeGovernanceService.getFourMonthPeriod('2026-08-31');
      expect(p2End.periodIndex).toBe(2);
      expect(p2End.endDate).toBe('2026-08-31');
    });

    it('should correctly identify Period 3 (Sep 1 - Dec 31)', () => {
      // Test Sep 1
      const p3Start = OvertimeGovernanceService.getFourMonthPeriod('2026-09-01');
      expect(p3Start.periodIndex).toBe(3);
      expect(p3Start.periodName).toBe('Period 3 (Sep - Dec)');
      expect(p3Start.startDate).toBe('2026-09-01');
      expect(p3Start.endDate).toBe('2026-12-31');

      // Test Dec 31
      const p3End = OvertimeGovernanceService.getFourMonthPeriod('2026-12-31');
      expect(p3End.periodIndex).toBe(3);
      expect(p3End.endDate).toBe('2026-12-31');
    });

    it('should confirm constant 3 periods x 20 hours = 60 hours per year', () => {
      expect(DEFAULT_OVERTIME_THRESHOLDS.periodAllocationHours).toBe(20);
      expect(DEFAULT_OVERTIME_THRESHOLDS.annualAllocationHours).toBe(60);
      expect(DEFAULT_OVERTIME_THRESHOLDS.periodAllocationHours * 3).toBe(DEFAULT_OVERTIME_THRESHOLDS.annualAllocationHours);
    });
  });

  describe('Employee Overtime Allocation & Utilization Calculations', () => {
    const baseEmployee = {
      id: 'EMP-001',
      code: 'EMP001',
      name: 'Aarav Kumar',
      department: 'Operations',
      designation: 'Technician',
      shift: 'Morning A (06:00-14:00)',
    };

    it('should calculate NORMAL status for 0 hours (< 75%)', () => {
      const record = OvertimeGovernanceService.computeEmployeeRecord({
        employee: baseEmployee,
        targetDate: '2026-04-15',
        monthRecordedOtHours: 0,
        monthApprovedOtHours: 0,
        monthPendingOtHours: 0,
        monthOtDays: 0,
        periodRecordedOtHours: 0,
        periodApprovedOtHours: 0,
        periodPendingOtHours: 0,
        periodOtDays: 0,
      });

      expect(record.utilizationPercentage).toBe(0);
      expect(record.remainingAllocationHours).toBe(20);
      expect(record.excessAllocationHours).toBe(0);
      expect(record.warningStatus).toBe('NORMAL');
    });

    it('should calculate NORMAL status for 10 hours (50% utilization)', () => {
      const record = OvertimeGovernanceService.computeEmployeeRecord({
        employee: baseEmployee,
        targetDate: '2026-04-15',
        monthRecordedOtHours: 5,
        monthApprovedOtHours: 5,
        monthPendingOtHours: 0,
        monthOtDays: 2,
        periodRecordedOtHours: 10,
        periodApprovedOtHours: 10,
        periodPendingOtHours: 0,
        periodOtDays: 4,
      });

      expect(record.utilizationPercentage).toBe(50);
      expect(record.remainingAllocationHours).toBe(10);
      expect(record.excessAllocationHours).toBe(0);
      expect(record.warningStatus).toBe('NORMAL');
    });

    it('should calculate APPROACHING status for 15 hours (75% utilization)', () => {
      const record = OvertimeGovernanceService.computeEmployeeRecord({
        employee: baseEmployee,
        targetDate: '2026-04-15',
        monthRecordedOtHours: 6,
        monthApprovedOtHours: 6,
        monthPendingOtHours: 0,
        monthOtDays: 3,
        periodRecordedOtHours: 15,
        periodApprovedOtHours: 15,
        periodPendingOtHours: 0,
        periodOtDays: 6,
      });

      expect(record.utilizationPercentage).toBe(75);
      expect(record.remainingAllocationHours).toBe(5);
      expect(record.excessAllocationHours).toBe(0);
      expect(record.warningStatus).toBe('APPROACHING');
    });

    it('should match Section 2.3 specification: 17.5 hours accumulated in Period 1', () => {
      // Spec: 17.5 hours / 20 hours = 87.5%, remaining 2.5 hours, status: Near threshold (APPROACHING)
      const record = OvertimeGovernanceService.computeEmployeeRecord({
        employee: baseEmployee,
        targetDate: '2026-04-15',
        monthRecordedOtHours: 7.5,
        monthApprovedOtHours: 7.5,
        monthPendingOtHours: 0,
        monthOtDays: 3,
        periodRecordedOtHours: 17.5,
        periodApprovedOtHours: 17.5,
        periodPendingOtHours: 0,
        periodOtDays: 7,
      });

      expect(record.utilizationPercentage).toBe(87.5);
      expect(record.remainingAllocationHours).toBe(2.5);
      expect(record.excessAllocationHours).toBe(0);
      expect(record.warningStatus).toBe('APPROACHING');
    });

    it('should calculate HIGH_PRIORITY status for exactly 20 hours (100% utilization)', () => {
      const record = OvertimeGovernanceService.computeEmployeeRecord({
        employee: baseEmployee,
        targetDate: '2026-04-15',
        monthRecordedOtHours: 8,
        monthApprovedOtHours: 8,
        monthPendingOtHours: 0,
        monthOtDays: 4,
        periodRecordedOtHours: 20,
        periodApprovedOtHours: 20,
        periodPendingOtHours: 0,
        periodOtDays: 8,
      });

      expect(record.utilizationPercentage).toBe(100);
      expect(record.remainingAllocationHours).toBe(0);
      expect(record.excessAllocationHours).toBe(0);
      expect(record.warningStatus).toBe('HIGH_PRIORITY');
    });

    it('should calculate EXCEEDED status for 21 hours (105% utilization) without silent capping', () => {
      // Spec Section 2.3: "If the employee accumulates 21 hours, the system should report that
      // the 20-hour allocation has been exceeded by 1 hour. Do not silently cap the actual overtime at 20 hours."
      const record = OvertimeGovernanceService.computeEmployeeRecord({
        employee: baseEmployee,
        targetDate: '2026-04-15',
        monthRecordedOtHours: 9,
        monthApprovedOtHours: 9,
        monthPendingOtHours: 0,
        monthOtDays: 4,
        periodRecordedOtHours: 21,
        periodApprovedOtHours: 21,
        periodPendingOtHours: 0,
        periodOtDays: 9,
      });

      expect(record.utilizationPercentage).toBe(105);
      expect(record.remainingAllocationHours).toBe(0);
      expect(record.excessAllocationHours).toBe(1);
      expect(record.warningStatus).toBe('EXCEEDED');
      // Preserves actual recorded and approved hours without capping
      expect(record.currentPeriodApprovedOtHours).toBe(21);
      expect(record.currentPeriodRecordedOtHours).toBe(21);
    });

    it('should respect custom configurable warning thresholds', () => {
      const customConfig: OvertimeThresholdConfig = {
        approachingPct: 70,
        highPriorityPct: 85,
        exceededPct: 100,
        periodAllocationHours: 20,
        annualAllocationHours: 60,
      };

      // 14 hours = 70% of 20h
      expect(OvertimeGovernanceService.evaluateWarningStatus(70, customConfig)).toBe('APPROACHING');
      // 87.5 hours = 87.5% -> HIGH_PRIORITY with customConfig (since highPriorityPct is 85)
      expect(OvertimeGovernanceService.evaluateWarningStatus(87.5, customConfig)).toBe('HIGH_PRIORITY');
    });
  });

  describe('Historical Period Preservation & Annual 60h Tracking', () => {
    it('should sum historical P1 + P2 + P3 for annual cumulative calculation', () => {
      const employee = {
        id: 'EMP-002',
        code: 'EMP002',
        name: 'Divya Sharma',
        department: 'Operations',
        designation: 'Supervisor',
        shift: 'General',
      };

      const record = OvertimeGovernanceService.computeEmployeeRecord({
        employee,
        targetDate: '2026-10-15', // In Period 3
        monthRecordedOtHours: 4,
        monthApprovedOtHours: 4,
        monthPendingOtHours: 0,
        monthOtDays: 2,
        periodRecordedOtHours: 14,
        periodApprovedOtHours: 14,
        periodPendingOtHours: 0,
        periodOtDays: 5,
        p1ApprovedHours: 18.5, // Jan - Apr
        p2ApprovedHours: 19.0, // May - Aug
      });

      expect(record.currentPeriod.periodIndex).toBe(3);
      expect(record.period1ApprovedHours).toBe(18.5);
      expect(record.period2ApprovedHours).toBe(19.0);
      expect(record.period3ApprovedHours).toBe(14.0);
      // Annual Cumulative = 18.5 + 19.0 + 14.0 = 51.5 hours out of 60 hours
      expect(record.annualCumulativeApprovedHours).toBe(51.5);
      expect(record.annualAllocationHours).toBe(60);
      expect(record.annualRemainingHours).toBe(8.5);
      expect(record.annualUtilizationPercentage).toBe(85.8);
    });
  });
});
