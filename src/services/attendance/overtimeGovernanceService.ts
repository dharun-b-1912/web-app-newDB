// src/services/attendance/overtimeGovernanceService.ts
// ============================================================================
// JOY PeopleHR — Overtime Governance & 4-Month Period Allocation Engine
// 60-Hour Annual Allocation | 20 Hours per 4-Month Period (Jan-Apr, May-Aug, Sep-Dec)
// Configurable Thresholds: Normal (<75%), Approaching (75-89%), High (90-100%), Exceeded (>100%)
// Traceable Audit Invariant: Allocation is a governance rule; never silently caps recorded hours
// ============================================================================

export type FourMonthPeriodIndex = 1 | 2 | 3;

export interface FourMonthPeriodRange {
  periodIndex: FourMonthPeriodIndex;
  periodName: string;
  year: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  monthsIncluded: string[];
  allocationHours: number; // 20.00
}

export type OvertimeWarningStatus =
  | 'NORMAL'         // < 75%
  | 'APPROACHING'    // >= 75% and < 90%
  | 'HIGH_PRIORITY'  // >= 90% and <= 100%
  | 'EXCEEDED';      // > 100%

export interface OvertimeThresholdConfig {
  approachingPct: number;    // default 75
  highPriorityPct: number;   // default 90
  exceededPct: number;       // default 100
  periodAllocationHours: number; // default 20
  annualAllocationHours: number; // default 60
}

export const DEFAULT_OVERTIME_THRESHOLDS: OvertimeThresholdConfig = {
  approachingPct: 75.0,
  highPriorityPct: 90.0,
  exceededPct: 100.0,
  periodAllocationHours: 20.0,
  annualAllocationHours: 60.0,
};

export interface EmployeeOvertimeGovernanceRecord {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  shift: string;
  reportingManager?: string;
  
  // Current Month Metrics
  currentMonthRecordedOtHours: number;
  currentMonthApprovedOtHours: number;
  currentMonthPendingOtHours: number;
  currentMonthOtDaysCount: number;
  
  // Current 4-Month Period Metrics
  currentPeriod: FourMonthPeriodRange;
  currentPeriodRecordedOtHours: number;
  currentPeriodApprovedOtHours: number;
  currentPeriodPendingOtHours: number;
  currentPeriodAllocationHours: number; // 20 hours
  remainingAllocationHours: number;     // max(0, 20 - approved)
  excessAllocationHours: number;        // max(0, approved - 20)
  utilizationPercentage: number;        // (approved / 20) * 100
  periodOtDaysCount: number;
  warningStatus: OvertimeWarningStatus;
  
  // Historical Period Summaries
  period1ApprovedHours: number; // Jan - Apr
  period2ApprovedHours: number; // May - Aug
  period3ApprovedHours: number; // Sep - Dec
  annualCumulativeApprovedHours: number; // P1 + P2 + P3
  annualAllocationHours: number; // 60 hours
  annualRemainingHours: number;
  annualUtilizationPercentage: number;
  
  hasPendingApprovals: boolean;
  requiresHrReview: boolean;
  lastUpdated: string;
}

export interface DepartmentOvertimeRollup {
  department: string;
  totalEmployees: number;
  employeesWithOt: number;
  totalRecordedOtHours: number;
  totalApprovedOtHours: number;
  totalPendingOtHours: number;
  periodAllocationTotalHours: number;
  remainingAllocationTotalHours: number;
  averageOtPerEligibleEmployee: number;
  employeesApproachingThreshold: number; // >= 75%
  employeesHighPriority: number;        // >= 90%
  employeesExceededThreshold: number;    // > 100%
  pendingApprovalsCount: number;
}

export interface ShiftOvertimeRollup {
  shiftName: string;
  totalEmployees: number;
  employeesWithOt: number;
  totalRecordedOtHours: number;
  totalApprovedOtHours: number;
  periodAllocationTotalHours: number;
  remainingAllocationTotalHours: number;
  averageOtPerEmployee: number;
  employeesApproachingThreshold: number;
  employeesExceededThreshold: number;
}

export interface OvertimeGovernanceSummary {
  reportingYear: number;
  currentPeriod: FourMonthPeriodRange;
  targetDate: string;
  thresholdConfig: OvertimeThresholdConfig;
  
  totalWorkforce: number;
  employeesWithOtInPeriod: number;
  totalPeriodRecordedHours: number;
  totalPeriodApprovedHours: number;
  totalPeriodPendingHours: number;
  totalPeriodRemainingHours: number;
  totalPeriodExcessHours: number;
  overallPeriodUtilizationPct: number;
  
  employeesNormalCount: number;
  employeesApproachingCount: number;
  employeesHighPriorityCount: number;
  employeesExceededCount: number;
  
  departmentRollups: DepartmentOvertimeRollup[];
  shiftRollups: ShiftOvertimeRollup[];
  employeeRecords: EmployeeOvertimeGovernanceRecord[];
  exceptionsRequiringAction: EmployeeOvertimeGovernanceRecord[];
}

export class OvertimeGovernanceService {
  /**
   * Resolves the fixed 4-month calendar period for any given date.
   * Period 1: Jan 1 - Apr 30
   * Period 2: May 1 - Aug 31
   * Period 3: Sep 1 - Dec 31
   */
  public static getFourMonthPeriod(dateStrOrDate: string | Date): FourMonthPeriodRange {
    const d = typeof dateStrOrDate === 'string' ? new Date(dateStrOrDate) : dateStrOrDate;
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12

    let periodIndex: FourMonthPeriodIndex = 1;
    let periodName = 'Period 1 (Jan - Apr)';
    let startDate = `${year}-01-01`;
    let endDate = `${year}-04-30`;
    let monthsIncluded = ['January', 'February', 'March', 'April'];

    if (month >= 5 && month <= 8) {
      periodIndex = 2;
      periodName = 'Period 2 (May - Aug)';
      startDate = `${year}-05-01`;
      endDate = `${year}-08-31`;
      monthsIncluded = ['May', 'June', 'July', 'August'];
    } else if (month >= 9 && month <= 12) {
      periodIndex = 3;
      periodName = 'Period 3 (Sep - Dec)';
      startDate = `${year}-09-01`;
      endDate = `${year}-12-31`;
      monthsIncluded = ['September', 'October', 'November', 'December'];
    }

    return {
      periodIndex,
      periodName,
      year,
      startDate,
      endDate,
      monthsIncluded,
      allocationHours: DEFAULT_OVERTIME_THRESHOLDS.periodAllocationHours,
    };
  }

  /**
   * Returns all three fixed 4-month period ranges for a given year.
   */
  public static getYearPeriods(year: number): FourMonthPeriodRange[] {
    return [
      {
        periodIndex: 1,
        periodName: 'Period 1 (Jan - Apr)',
        year,
        startDate: `${year}-01-01`,
        endDate: `${year}-04-30`,
        monthsIncluded: ['January', 'February', 'March', 'April'],
        allocationHours: DEFAULT_OVERTIME_THRESHOLDS.periodAllocationHours,
      },
      {
        periodIndex: 2,
        periodName: 'Period 2 (May - Aug)',
        year,
        startDate: `${year}-05-01`,
        endDate: `${year}-08-31`,
        monthsIncluded: ['May', 'June', 'July', 'August'],
        allocationHours: DEFAULT_OVERTIME_THRESHOLDS.periodAllocationHours,
      },
      {
        periodIndex: 3,
        periodName: 'Period 3 (Sep - Dec)',
        year,
        startDate: `${year}-09-01`,
        endDate: `${year}-12-31`,
        monthsIncluded: ['September', 'October', 'November', 'December'],
        allocationHours: DEFAULT_OVERTIME_THRESHOLDS.periodAllocationHours,
      },
    ];
  }

  /**
   * Determines the threshold status from utilization percentage.
   */
  public static evaluateWarningStatus(
    utilizationPct: number,
    config: OvertimeThresholdConfig = DEFAULT_OVERTIME_THRESHOLDS
  ): OvertimeWarningStatus {
    if (utilizationPct > config.exceededPct) {
      return 'EXCEEDED';
    }
    if (utilizationPct >= config.highPriorityPct) {
      return 'HIGH_PRIORITY';
    }
    if (utilizationPct >= config.approachingPct) {
      return 'APPROACHING';
    }
    return 'NORMAL';
  }

  /**
   * Calculates individual employee overtime governance record.
   */
  public static computeEmployeeRecord(params: {
    employee: {
      id: string;
      code: string;
      name: string;
      department: string;
      designation: string;
      shift: string;
      reportingManager?: string;
    };
    targetDate: string;
    // Overtime events/requests
    monthRecordedOtHours: number;
    monthApprovedOtHours: number;
    monthPendingOtHours: number;
    monthOtDays: number;
    
    periodRecordedOtHours: number;
    periodApprovedOtHours: number;
    periodPendingOtHours: number;
    periodOtDays: number;
    
    // Previous periods in the same year
    p1ApprovedHours?: number;
    p2ApprovedHours?: number;
    p3ApprovedHours?: number;
    
    config?: Partial<OvertimeThresholdConfig>;
  }): EmployeeOvertimeGovernanceRecord {
    const config: OvertimeThresholdConfig = {
      ...DEFAULT_OVERTIME_THRESHOLDS,
      ...params.config,
    };

    const currentPeriod = this.getFourMonthPeriod(params.targetDate);
    const periodAllocation = config.periodAllocationHours; // 20 hours
    const approvedOt = Number(params.periodApprovedOtHours.toFixed(2));
    const recordedOt = Number(params.periodRecordedOtHours.toFixed(2));
    const pendingOt = Number(params.periodPendingOtHours.toFixed(2));

    const remaining = Number(Math.max(0, periodAllocation - approvedOt).toFixed(2));
    const excess = Number(Math.max(0, approvedOt - periodAllocation).toFixed(2));
    const utilizationPct = periodAllocation > 0 ? Number(((approvedOt / periodAllocation) * 100).toFixed(1)) : 0;
    const warningStatus = this.evaluateWarningStatus(utilizationPct, config);

    // Compute P1, P2, P3 based on current period index
    let p1 = params.p1ApprovedHours ?? 0;
    let p2 = params.p2ApprovedHours ?? 0;
    let p3 = params.p3ApprovedHours ?? 0;

    if (currentPeriod.periodIndex === 1) {
      p1 = approvedOt;
    } else if (currentPeriod.periodIndex === 2) {
      p2 = approvedOt;
    } else if (currentPeriod.periodIndex === 3) {
      p3 = approvedOt;
    }

    const annualCumulative = Number((p1 + p2 + p3).toFixed(2));
    const annualRemaining = Number(Math.max(0, config.annualAllocationHours - annualCumulative).toFixed(2));
    const annualUtilization = config.annualAllocationHours > 0
      ? Number(((annualCumulative / config.annualAllocationHours) * 100).toFixed(1))
      : 0;

    const hasPendingApprovals = pendingOt > 0 || params.monthPendingOtHours > 0;
    const requiresHrReview = warningStatus === 'HIGH_PRIORITY' || warningStatus === 'EXCEEDED' || hasPendingApprovals;

    return {
      employeeId: params.employee.id,
      employeeCode: params.employee.code,
      employeeName: params.employee.name,
      department: params.employee.department,
      designation: params.employee.designation,
      shift: params.employee.shift,
      reportingManager: params.employee.reportingManager,

      currentMonthRecordedOtHours: Number(params.monthRecordedOtHours.toFixed(2)),
      currentMonthApprovedOtHours: Number(params.monthApprovedOtHours.toFixed(2)),
      currentMonthPendingOtHours: Number(params.monthPendingOtHours.toFixed(2)),
      currentMonthOtDaysCount: params.monthOtDays,

      currentPeriod,
      currentPeriodRecordedOtHours: recordedOt,
      currentPeriodApprovedOtHours: approvedOt,
      currentPeriodPendingOtHours: pendingOt,
      currentPeriodAllocationHours: periodAllocation,
      remainingAllocationHours: remaining,
      excessAllocationHours: excess,
      utilizationPercentage: utilizationPct,
      periodOtDaysCount: params.periodOtDays,
      warningStatus,

      period1ApprovedHours: Number(p1.toFixed(2)),
      period2ApprovedHours: Number(p2.toFixed(2)),
      period3ApprovedHours: Number(p3.toFixed(2)),
      annualCumulativeApprovedHours: annualCumulative,
      annualAllocationHours: config.annualAllocationHours,
      annualRemainingHours: annualRemaining,
      annualUtilizationPercentage: annualUtilization,

      hasPendingApprovals,
      requiresHrReview,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Aggregates employee records into department-level and shift-level rollups,
   * producing an authoritative Overtime Governance Summary.
   */
  public static buildGovernanceSummary(
    employeeRecords: EmployeeOvertimeGovernanceRecord[],
    targetDate: string,
    config: OvertimeThresholdConfig = DEFAULT_OVERTIME_THRESHOLDS
  ): OvertimeGovernanceSummary {
    const currentPeriod = this.getFourMonthPeriod(targetDate);
    const reportingYear = currentPeriod.year;

    let totalPeriodRecorded = 0;
    let totalPeriodApproved = 0;
    let totalPeriodPending = 0;
    let totalPeriodRemaining = 0;
    let totalPeriodExcess = 0;

    let normalCount = 0;
    let approachingCount = 0;
    let highPriorityCount = 0;
    let exceededCount = 0;

    const deptMap = new Map<string, EmployeeOvertimeGovernanceRecord[]>();
    const shiftMap = new Map<string, EmployeeOvertimeGovernanceRecord[]>();
    const exceptions: EmployeeOvertimeGovernanceRecord[] = [];

    for (const rec of employeeRecords) {
      totalPeriodRecorded += rec.currentPeriodRecordedOtHours;
      totalPeriodApproved += rec.currentPeriodApprovedOtHours;
      totalPeriodPending += rec.currentPeriodPendingOtHours;
      totalPeriodRemaining += rec.remainingAllocationHours;
      totalPeriodExcess += rec.excessAllocationHours;

      switch (rec.warningStatus) {
        case 'NORMAL':
          normalCount++;
          break;
        case 'APPROACHING':
          approachingCount++;
          break;
        case 'HIGH_PRIORITY':
          highPriorityCount++;
          break;
        case 'EXCEEDED':
          exceededCount++;
          break;
      }

      if (rec.requiresHrReview) {
        exceptions.push(rec);
      }

      // Group by department
      const d = rec.department || 'General';
      if (!deptMap.has(d)) deptMap.set(d, []);
      deptMap.get(d)!.push(rec);

      // Group by shift
      const s = rec.shift || 'General Shift';
      if (!shiftMap.has(s)) shiftMap.set(s, []);
      shiftMap.get(s)!.push(rec);
    }

    // Build Department Rollups
    const departmentRollups: DepartmentOvertimeRollup[] = Array.from(deptMap.entries()).map(([dept, recs]) => {
      const totalEmp = recs.length;
      const withOt = recs.filter((r) => r.currentPeriodApprovedOtHours > 0 || r.currentPeriodRecordedOtHours > 0);
      const recHours = recs.reduce((sum, r) => sum + r.currentPeriodRecordedOtHours, 0);
      const appHours = recs.reduce((sum, r) => sum + r.currentPeriodApprovedOtHours, 0);
      const pendHours = recs.reduce((sum, r) => sum + r.currentPeriodPendingOtHours, 0);
      const remHours = recs.reduce((sum, r) => sum + r.remainingAllocationHours, 0);
      const avg = withOt.length > 0 ? Number((appHours / withOt.length).toFixed(2)) : 0;

      return {
        department: dept,
        totalEmployees: totalEmp,
        employeesWithOt: withOt.length,
        totalRecordedOtHours: Number(recHours.toFixed(2)),
        totalApprovedOtHours: Number(appHours.toFixed(2)),
        totalPendingOtHours: Number(pendHours.toFixed(2)),
        periodAllocationTotalHours: totalEmp * config.periodAllocationHours,
        remainingAllocationTotalHours: Number(remHours.toFixed(2)),
        averageOtPerEligibleEmployee: avg,
        employeesApproachingThreshold: recs.filter((r) => r.warningStatus === 'APPROACHING').length,
        employeesHighPriority: recs.filter((r) => r.warningStatus === 'HIGH_PRIORITY').length,
        employeesExceededThreshold: recs.filter((r) => r.warningStatus === 'EXCEEDED').length,
        pendingApprovalsCount: recs.filter((r) => r.hasPendingApprovals).length,
      };
    });

    // Build Shift Rollups
    const shiftRollups: ShiftOvertimeRollup[] = Array.from(shiftMap.entries()).map(([shift, recs]) => {
      const totalEmp = recs.length;
      const withOt = recs.filter((r) => r.currentPeriodApprovedOtHours > 0 || r.currentPeriodRecordedOtHours > 0);
      const recHours = recs.reduce((sum, r) => sum + r.currentPeriodRecordedOtHours, 0);
      const appHours = recs.reduce((sum, r) => sum + r.currentPeriodApprovedOtHours, 0);
      const remHours = recs.reduce((sum, r) => sum + r.remainingAllocationHours, 0);
      const avg = withOt.length > 0 ? Number((appHours / withOt.length).toFixed(2)) : 0;

      return {
        shiftName: shift,
        totalEmployees: totalEmp,
        employeesWithOt: withOt.length,
        totalRecordedOtHours: Number(recHours.toFixed(2)),
        totalApprovedOtHours: Number(appHours.toFixed(2)),
        periodAllocationTotalHours: totalEmp * config.periodAllocationHours,
        remainingAllocationTotalHours: Number(remHours.toFixed(2)),
        averageOtPerEmployee: avg,
        employeesApproachingThreshold: recs.filter((r) => r.warningStatus === 'APPROACHING').length,
        employeesExceededThreshold: recs.filter((r) => r.warningStatus === 'EXCEEDED').length,
      };
    });

    const totalPeriodCapacity = employeeRecords.length * config.periodAllocationHours;
    const overallUtilization = totalPeriodCapacity > 0
      ? Number(((totalPeriodApproved / totalPeriodCapacity) * 100).toFixed(1))
      : 0;

    return {
      reportingYear,
      currentPeriod,
      targetDate,
      thresholdConfig: config,

      totalWorkforce: employeeRecords.length,
      employeesWithOtInPeriod: employeeRecords.filter((r) => r.currentPeriodApprovedOtHours > 0 || r.currentPeriodRecordedOtHours > 0).length,
      totalPeriodRecordedHours: Number(totalPeriodRecorded.toFixed(2)),
      totalPeriodApprovedHours: Number(totalPeriodApproved.toFixed(2)),
      totalPeriodPendingHours: Number(totalPeriodPending.toFixed(2)),
      totalPeriodRemainingHours: Number(totalPeriodRemaining.toFixed(2)),
      totalPeriodExcessHours: Number(totalPeriodExcess.toFixed(2)),
      overallPeriodUtilizationPct: overallUtilization,

      employeesNormalCount: normalCount,
      employeesApproachingCount: approachingCount,
      employeesHighPriorityCount: highPriorityCount,
      employeesExceededCount: exceededCount,

      departmentRollups,
      shiftRollups,
      employeeRecords,
      exceptionsRequiringAction: exceptions,
    };
  }
}

export const overtimeGovernanceService = new OvertimeGovernanceService();
