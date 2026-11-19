// src/services/attendance/attendanceAnomalyIntelligenceEngine.ts
// ============================================================================
// Joy PeopleHR — Attendance Anomaly & Workforce Punctuality Intelligence Engine
// Automatically detects > 2 Consecutive Leave/Absence days and Habitual Late Patterns
// ============================================================================

import { DailyAttendanceRow } from './attendanceCalculationService';

export interface AbsenceStreakAnomaly {
  id: string;
  type: 'CONSECUTIVE_LEAVE_OR_ABSENCE';
  consecutiveDays: number;
  startDate: string;
  endDate: string;
  severity: 'WARNING' | 'CRITICAL';
  statusSummary: string; // e.g. "3 consecutive days Absent / LOP"
  recommendedAction: string;
}

export interface FrequentLateAnomaly {
  id: string;
  type: 'FREQUENT_LATE_CHECKIN';
  lateCount: number;
  totalLateMinutes: number;
  consecutiveLateDays: number;
  severity: 'WARNING' | 'CRITICAL';
  affectedDates: string[];
  recommendedAction: string;
}

export interface AttendanceAnomalyReport {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  totalAnomalies: number;
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hasHighRiskAbsenteeism: boolean;
  hasHabitualLatePattern: boolean;
  absenceStreaks: AbsenceStreakAnomaly[];
  extendedAbsenceStreaks: AbsenceStreakAnomaly[];
  frequentLate: FrequentLateAnomaly | null;
  summarySentence: string;
}

export class AttendanceAnomalyIntelligenceEngine {
  /**
   * Scans a period's daily attendance records and extracts actionable anomaly intelligence.
   * 1. Detects persons on leave / absent for MORE THAN 2 CONSECUTIVE DAYS (> 2 days streak).
   * 2. Detects habitual late arrival / check-in patterns.
   */
  public static evaluateAnomalies(
    dailyRows: DailyAttendanceRow[],
    employee: any
  ): AttendanceAnomalyReport {
    const empId = employee?.id || 'emp-unknown';
    const empCode = employee?.employee_code || '';
    const empName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.display_name || 'Employee';
    const dept = employee?.department_name || employee?.department || 'Operations';

    const absenceStreaks: AbsenceStreakAnomaly[] = [];
    let currentStreakDays = 0;
    let streakStartDate = '';
    let streakEndDate = '';
    const streakStatuses: string[] = [];

    // Late arrival tracker
    const lateDates: string[] = [];
    let totalLateMinutes = 0;
    let maxConsecutiveLate = 0;
    let currentConsecutiveLate = 0;

    for (let i = 0; i < dailyRows.length; i++) {
      const row = dailyRows[i];

      // Exclude future scheduled days from absence evaluation
      if (row.status === 'Scheduled') continue;

      // ─── 1. CONSECUTIVE LEAVE / ABSENCE SCANNER (> 2 DAYS) ───────────────
      const isAbsentOrLeave =
        row.status === 'Absent' ||
        row.status === 'Paid Leave' ||
        row.status === 'Unpaid Leave';

      if (isAbsentOrLeave) {
        if (currentStreakDays === 0) {
          streakStartDate = row.dateStr;
        }
        streakEndDate = row.dateStr;
        currentStreakDays++;
        streakStatuses.push(row.status);
      } else if (!row.isWeeklyOff && row.status !== 'Holiday') {
        // Working day broke the streak
        if (currentStreakDays > 2) {
          absenceStreaks.push({
            id: `streak-${streakStartDate}-${streakEndDate}`,
            type: 'CONSECUTIVE_LEAVE_OR_ABSENCE',
            consecutiveDays: currentStreakDays,
            startDate: streakStartDate,
            endDate: streakEndDate,
            severity: currentStreakDays >= 5 ? 'CRITICAL' : 'WARNING',
            statusSummary: `${currentStreakDays} consecutive days on ${Array.from(new Set(streakStatuses)).join(' / ')}`,
            recommendedAction:
              currentStreakDays >= 5
                ? 'Issue Immediate Formal Show-Cause Notice & HR Disciplinary Review'
                : 'Request Medical Certificate / Supervisory Absence Regularization',
          });
        }
        currentStreakDays = 0;
        streakStatuses.length = 0;
      }
      // Note: Weekly offs & holidays within a streak do not break continuous absence tracking

      // ─── 2. LATE ARRIVAL TRACKER ─────────────────────────────────────────
      if (row.lateMinutes > 0 || row.status === 'Late') {
        lateDates.push(row.dateStr);
        totalLateMinutes += row.lateMinutes;
        currentConsecutiveLate++;
        if (currentConsecutiveLate > maxConsecutiveLate) {
          maxConsecutiveLate = currentConsecutiveLate;
        }
      } else if (row.status === 'Present') {
        currentConsecutiveLate = 0;
      }
    }

    // Capture trailing streak if active through period end
    if (currentStreakDays > 2) {
      absenceStreaks.push({
        id: `streak-${streakStartDate}-${streakEndDate}`,
        type: 'CONSECUTIVE_LEAVE_OR_ABSENCE',
        consecutiveDays: currentStreakDays,
        startDate: streakStartDate,
        endDate: streakEndDate,
        severity: currentStreakDays >= 5 ? 'CRITICAL' : 'WARNING',
        statusSummary: `${currentStreakDays} consecutive days on ${Array.from(new Set(streakStatuses)).join(' / ')} (Active at period end)`,
        recommendedAction:
          currentStreakDays >= 5
            ? 'Issue Immediate Formal Show-Cause Notice & HR Disciplinary Review'
            : 'Request Medical Certificate / Supervisory Absence Regularization',
      });
    }

    // Evaluate Frequent Late Pattern (>= 3 late arrivals or >= 2 consecutive days late)
    let frequentLate: FrequentLateAnomaly | null = null;
    if (lateDates.length >= 3 || maxConsecutiveLate >= 2) {
      frequentLate = {
        id: `late-${empId}-${lateDates.length}`,
        type: 'FREQUENT_LATE_CHECKIN',
        lateCount: lateDates.length,
        totalLateMinutes,
        consecutiveLateDays: maxConsecutiveLate,
        severity: lateDates.length >= 5 || maxConsecutiveLate >= 3 ? 'CRITICAL' : 'WARNING',
        affectedDates: lateDates,
        recommendedAction:
          lateDates.length >= 5
            ? 'Mandatory Supervisor Counseling & Permission Quota Exhaustion Audit'
            : 'Review Shift Fitment & Re-enforce 5-Minute Grace Policy',
      };
    }

    const totalAnomalies = absenceStreaks.length + (frequentLate ? 1 : 0);
    const hasHighRiskAbsenteeism = absenceStreaks.some((s) => s.severity === 'CRITICAL');
    const hasHabitualLatePattern = !!frequentLate;
    const overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = hasHighRiskAbsenteeism
      ? 'CRITICAL'
      : absenceStreaks.length > 0
      ? 'HIGH'
      : frequentLate
      ? 'MEDIUM'
      : 'LOW';

    let summarySentence = 'Punctuality and attendance patterns conform to organizational standard.';
    if (absenceStreaks.length > 0 && frequentLate) {
      summarySentence = `Detected ${absenceStreaks.length} extended absence streak(s) (>2 days) and habitual late check-in pattern (${frequentLate.lateCount} events, ${frequentLate.totalLateMinutes}m total).`;
    } else if (absenceStreaks.length > 0) {
      summarySentence = `Detected ${absenceStreaks.length} extended absence streak(s) exceeding 2 consecutive days (${absenceStreaks[0].consecutiveDays} days from ${absenceStreaks[0].startDate}).`;
    } else if (frequentLate) {
      summarySentence = `Identified frequent late check-in pattern: ${frequentLate.lateCount} late arrivals totaling ${frequentLate.totalLateMinutes} minutes.`;
    }

    return {
      employeeId: empId,
      employeeCode: empCode,
      employeeName: empName,
      department: dept,
      totalAnomalies,
      overallRiskLevel,
      hasHighRiskAbsenteeism,
      hasHabitualLatePattern,
      absenceStreaks,
      extendedAbsenceStreaks: absenceStreaks,
      frequentLate,
      summarySentence,
    };
  }

  /**
   * Scans an entire organization's workforce and generates a comprehensive Absenteeism & Punctuality Risk Register.
   */
  public static evaluateOrganizationAnomalies(
    allEmployeeRows: Array<{ employee: any; dailyRows: DailyAttendanceRow[] }>
  ): AttendanceAnomalyReport[] {
    const reports: AttendanceAnomalyReport[] = [];
    for (const item of allEmployeeRows) {
      const rep = this.evaluateAnomalies(item.dailyRows, item.employee);
      if (rep.totalAnomalies > 0) {
        reports.push(rep);
      }
    }
    // Sort critical risks first
    return reports.sort((a, b) => {
      if (a.hasHighRiskAbsenteeism && !b.hasHighRiskAbsenteeism) return -1;
      if (!a.hasHighRiskAbsenteeism && b.hasHighRiskAbsenteeism) return 1;
      return b.totalAnomalies - a.totalAnomalies;
    });
  }
}
