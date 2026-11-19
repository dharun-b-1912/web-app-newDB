import { PeriodAttendanceMetrics } from './attendanceCalculationService';

export interface AttendanceBonusPolicy {
  id: string;
  organization_id?: string;
  policy_name: string;
  policy_code: string;
  description: string;
  min_attendance_pct: number;
  min_present_days: number;
  max_late_occurrences: number;
  max_late_minutes: number;
  max_early_departures: number;
  max_unapproved_absence: number;
  require_break_compliance: boolean;
  bonus_amount: number;
  is_active: boolean;
  effective_from: string;
  effective_to?: string | null;
}

export interface AttendanceBonusEvaluationResult {
  policyId: string;
  policyName: string;
  policyCode: string;
  isEligible: boolean;
  bonusAmount: number;
  status: 'ELIGIBLE' | 'DISQUALIFIED' | 'APPROVED' | 'REJECTED';
  approvedAmount?: number;
  approvedBy?: string;
  approvedAt?: string;
  metricsSummary: {
    attendancePct: number;
    presentDays: number;
    scheduledDays: number;
    lateCount: number;
    lateMinutes: number;
    earlyCount: number;
    absenceCount: number;
    breakCompliance: boolean;
  };
  disqualificationReasons: string[];
}

const DEFAULT_POLICIES: AttendanceBonusPolicy[] = [
  {
    id: 'pol-gold-01',
    policy_name: 'Perfect Attendance Gold Incentive',
    policy_code: 'GOLD_PERFECT',
    description: '100% working presence with zero late arrivals, zero early departures, and zero unapproved absences.',
    min_attendance_pct: 100,
    min_present_days: 20,
    max_late_occurrences: 0,
    max_late_minutes: 0,
    max_early_departures: 0,
    max_unapproved_absence: 0,
    require_break_compliance: true,
    bonus_amount: 3000,
    is_active: true,
    effective_from: '2026-01-01',
  },
  {
    id: 'pol-silver-02',
    policy_name: 'Exemplary Attendance Standard Incentive',
    policy_code: 'SILVER_STANDARD',
    description: 'Standard plant & corporate attendance incentive for >= 95% working presence and high punctuality.',
    min_attendance_pct: 95,
    min_present_days: 18,
    max_late_occurrences: 2,
    max_late_minutes: 30,
    max_early_departures: 1,
    max_unapproved_absence: 0,
    require_break_compliance: true,
    bonus_amount: 2000,
    is_active: true,
    effective_from: '2026-01-01',
  },
  {
    id: 'pol-bronze-03',
    policy_name: 'Workforce Punctuality & Attendance Allowance',
    policy_code: 'BRONZE_PUNCTUALITY',
    description: 'Operational shift workforce allowance for >= 90% attendance and minimal shift deviations.',
    min_attendance_pct: 90,
    min_present_days: 16,
    max_late_occurrences: 3,
    max_late_minutes: 45,
    max_early_departures: 2,
    max_unapproved_absence: 1,
    require_break_compliance: false,
    bonus_amount: 1000,
    is_active: true,
    effective_from: '2026-01-01',
  },
];

class AttendanceBonusService {
  private _storageKey = 'joy_attendance_bonus_policies';
  private _decisionKey = 'joy_attendance_bonus_decisions';

  getPolicies(organizationId?: string): AttendanceBonusPolicy[] {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(this._storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {}
    return DEFAULT_POLICIES;
  }

  savePolicy(policy: AttendanceBonusPolicy): void {
    const list = this.getPolicies();
    const idx = list.findIndex((p) => p.id === policy.id);
    if (idx >= 0) {
      list[idx] = policy;
    } else {
      list.push(policy);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(this._storageKey, JSON.stringify(list));
    }
  }

  /**
   * Deterministically evaluates employee attendance metrics against a configured bonus policy.
   */
  evaluateEmployeeBonus(
    metrics: PeriodAttendanceMetrics,
    employee: any,
    selectedPolicyId?: string,
    periodId?: string
  ): AttendanceBonusEvaluationResult {
    const policies = this.getPolicies(employee?.organization_id);
    const policy = policies.find((p) => p.id === selectedPolicyId) || policies[1] || policies[0];

    const scheduled = metrics.scheduledWorkingDays > 0 ? metrics.scheduledWorkingDays : (metrics.totalCalendarDays - metrics.weeklyOffDays - metrics.holidayDays);
    const present = metrics.presentDays + (metrics.halfDays * 0.5) + metrics.paidLeaveDays;
    const attendancePct = scheduled > 0 ? Math.round((present / scheduled) * 100) : 100;
    const disqualificationReasons: string[] = [];

    // Rule 1: Attendance Percentage
    if (attendancePct < policy.min_attendance_pct) {
      disqualificationReasons.push(
        `Attendance ${attendancePct}% is below required ${policy.min_attendance_pct}% threshold`
      );
    }

    // Rule 2: Minimum Present Days
    if (metrics.presentDays < policy.min_present_days) {
      disqualificationReasons.push(
        `Present days (${metrics.presentDays}d) below minimum required (${policy.min_present_days}d)`
      );
    }

    // Rule 3: Late Occurrences
    if (metrics.lateEventsCount > policy.max_late_occurrences) {
      disqualificationReasons.push(
        `Late arrivals (${metrics.lateEventsCount}) exceeded policy limit of ${policy.max_late_occurrences}`
      );
    }

    // Rule 4: Total Late Minutes
    if (metrics.totalLateMinutes > policy.max_late_minutes) {
      disqualificationReasons.push(
        `Total late time (${metrics.totalLateMinutes}m) exceeded policy cap of ${policy.max_late_minutes}m`
      );
    }

    // Rule 5: Early Departures
    if (metrics.earlyEventsCount > policy.max_early_departures) {
      disqualificationReasons.push(
        `Early departures (${metrics.earlyEventsCount}) exceeded allowance of ${policy.max_early_departures}`
      );
    }

    // Rule 6: Unapproved Absences (LOP)
    if (metrics.lopDays > policy.max_unapproved_absence) {
      disqualificationReasons.push(
        `Unapproved absence / LOP (${metrics.lopDays}d) exceeded zero-tolerance policy limit`
      );
    }

    // Rule 7: Break Compliance
    const breakCompliance = metrics.permissionExcessMinutes === 0;
    if (policy.require_break_compliance && !breakCompliance) {
      disqualificationReasons.push(
        `Excess break or permission duration (${metrics.permissionExcessMinutes}m) flagged`
      );
    }

    const isEligible = disqualificationReasons.length === 0;

    // Check saved approval decision
    let status: 'ELIGIBLE' | 'DISQUALIFIED' | 'APPROVED' | 'REJECTED' = isEligible ? 'ELIGIBLE' : 'DISQUALIFIED';
    let approvedAmount = isEligible ? policy.bonus_amount : 0;
    let approvedBy = undefined;
    let approvedAt = undefined;

    const empId = employee?.id || employee?.employee_code || '';
    if (empId && periodId && typeof window !== 'undefined') {
      try {
        const rawDecisions = localStorage.getItem(`${this._decisionKey}_${periodId}`);
        if (rawDecisions) {
          const map = JSON.parse(rawDecisions);
          if (map[empId]) {
            status = map[empId].status;
            approvedAmount = map[empId].approvedAmount ?? approvedAmount;
            approvedBy = map[empId].approvedBy;
            approvedAt = map[empId].approvedAt;
          }
        }
      } catch {}
    }

    return {
      policyId: policy.id,
      policyName: policy.policy_name,
      policyCode: policy.policy_code,
      isEligible,
      bonusAmount: isEligible ? policy.bonus_amount : 0,
      status,
      approvedAmount,
      approvedBy,
      approvedAt,
      metricsSummary: {
        attendancePct,
        presentDays: metrics.presentDays,
        scheduledDays: scheduled,
        lateCount: metrics.lateEventsCount,
        lateMinutes: metrics.totalLateMinutes,
        earlyCount: metrics.earlyEventsCount,
        absenceCount: metrics.lopDays,
        breakCompliance,
      },
      disqualificationReasons,
    };
  }

  setBonusDecision(
    employeeId: string,
    periodId: string,
    decision: 'APPROVED' | 'REJECTED',
    approvedAmount: number,
    approvedBy: string = 'HR Operations'
  ): void {
    if (!employeeId || !periodId || typeof window !== 'undefined') {
      try {
        const key = `${this._decisionKey}_${periodId}`;
        const raw = localStorage.getItem(key);
        const map = raw ? JSON.parse(raw) : {};
        map[employeeId] = {
          status: decision,
          approvedAmount: decision === 'APPROVED' ? approvedAmount : 0,
          approvedBy,
          approvedAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(map));
      } catch {}
    }
  }
}

export const attendanceBonusService = new AttendanceBonusService();

