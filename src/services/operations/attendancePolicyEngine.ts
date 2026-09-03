// src/services/operations/attendancePolicyEngine.ts
// ============================================================================
// Joy PeopleHR — Engine 3: Attendance Intelligence, Grace & Long Absence Engine
// ============================================================================

import { supabase } from '../../lib/supabase';

export type AttendanceDayStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'LEAVE'
  | 'OD' // On Duty
  | 'COMP_OFF'
  | 'WEEKLY_OFF'
  | 'FESTIVAL_HOLIDAY'
  | 'HOLIDAY'
  | 'LOP'
  | 'HOLIDAY_WORKED';

export interface AttendanceCalculationPolicy {
  id?: string;
  organization_id: string;
  policy_name: string;
  shift_hours: number; // e.g. 9
  min_full_day_hours: number; // e.g. 8.5
  min_half_day_hours: number; // e.g. 4.0
  late_grace_minutes: number; // e.g. 15
  early_exit_grace_minutes: number; // e.g. 10
  monthly_late_grace_count: number; // e.g. 2 late occurrences allowed per month
  late_penalty_action: 'LOP_HALF_DAY' | 'LOP_FULL_DAY' | 'SHORT_HOURS' | 'NONE';
  long_absence_threshold_days: number; // default >2 days
  allow_shift_crossover: boolean;
  is_default: boolean;
}

export interface AttendanceEvaluationInput {
  scheduledStartTime: string; // e.g. "09:30"
  scheduledEndTime: string;   // e.g. "18:30"
  actualInTime?: string;      // e.g. "09:42"
  actualOutTime?: string;     // e.g. "18:35"
  monthLateCountAlready: number;
  policy: AttendanceCalculationPolicy;
  isHoliday?: boolean;
  isSunday?: boolean;
  isOnDuty?: boolean;
}

export interface AttendanceEvaluationOutput {
  status: AttendanceDayStatus;
  workedHours: number;
  payableHours: number;
  shortfallHours: number;
  isLate: boolean;
  lateMinutes: number;
  isEarlyExit: boolean;
  earlyExitMinutes: number;
  graceApplied: boolean;
  penaltyApplied: boolean;
  penaltyType?: string;
}

class AttendancePolicyEngine {
  /**
   * Evaluates punch records against dynamic organizational attendance policies
   */
  evaluateAttendance(input: AttendanceEvaluationInput): AttendanceEvaluationOutput {
    const { policy } = input;

    if (input.isOnDuty) {
      return {
        status: 'OD',
        workedHours: policy.shift_hours,
        payableHours: policy.shift_hours,
        shortfallHours: 0,
        isLate: false,
        lateMinutes: 0,
        isEarlyExit: false,
        earlyExitMinutes: 0,
        graceApplied: false,
        penaltyApplied: false,
      };
    }

    if (!input.actualInTime || !input.actualOutTime) {
      return {
        status: 'ABSENT',
        workedHours: 0,
        payableHours: 0,
        shortfallHours: policy.shift_hours,
        isLate: false,
        lateMinutes: 0,
        isEarlyExit: false,
        earlyExitMinutes: 0,
        graceApplied: false,
        penaltyApplied: false,
      };
    }

    // Parse minutes from time strings
    const parseMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const schedInMins = parseMins(input.scheduledStartTime);
    const schedOutMins = parseMins(input.scheduledEndTime);
    const actualInMins = parseMins(input.actualInTime);
    let actualOutMins = parseMins(input.actualOutTime);

    // Support shift crossover (e.g. night shift 22:00 to 06:00)
    if (policy.allow_shift_crossover && actualOutMins < actualInMins) {
      actualOutMins += 24 * 60;
    }

    const totalWorkedMins = Math.max(0, actualOutMins - actualInMins);
    const workedHours = Number((totalWorkedMins / 60).toFixed(2));

    // Calculate Late & Early Exit with Grace Minutes
    const lateMins = Math.max(0, actualInMins - schedInMins);
    const earlyExitMins = Math.max(0, schedOutMins - actualOutMins);

    const isLate = lateMins > 0;
    const isEarlyExit = earlyExitMins > 0;

    let graceApplied = false;
    let penaltyApplied = false;
    let penaltyType: string | undefined;

    // Check if within grace period
    if (isLate && lateMins <= policy.late_grace_minutes) {
      graceApplied = true;
    } else if (isLate && lateMins > policy.late_grace_minutes) {
      if (input.monthLateCountAlready >= policy.monthly_late_grace_count) {
        penaltyApplied = true;
        penaltyType = policy.late_penalty_action;
      }
    }

    // Determine Day Status
    let status: AttendanceDayStatus = 'PRESENT';
    let payableHours = workedHours;

    if (workedHours < policy.min_half_day_hours) {
      status = penaltyApplied && penaltyType === 'LOP_FULL_DAY' ? 'LOP' : 'ABSENT';
      payableHours = 0;
    } else if (workedHours < policy.min_full_day_hours) {
      status = 'HALF_DAY';
      payableHours = policy.shift_hours / 2;
    } else {
      if (penaltyApplied && penaltyType === 'LOP_HALF_DAY') {
        status = 'HALF_DAY';
        payableHours = policy.shift_hours / 2;
      } else {
        status = input.isHoliday || input.isSunday ? 'HOLIDAY_WORKED' : 'PRESENT';
        payableHours = policy.shift_hours;
      }
    }

    const shortfallHours = Math.max(0, Number((policy.shift_hours - payableHours).toFixed(2)));

    return {
      status,
      workedHours,
      payableHours,
      shortfallHours,
      isLate,
      lateMinutes: lateMins,
      isEarlyExit,
      earlyExitMinutes: earlyExitMins,
      graceApplied,
      penaltyApplied,
      penaltyType,
    };
  }

  /**
   * Scans for continuous long absences exceeding the threshold (e.g. >2 days)
   */
  async detectLongAbsences(orgId: string, thresholdDays: number = 2) {
    try {
      const { data: absences, error } = await supabase
        .from('attendance_long_absences')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'OPEN')
        .gte('consecutive_days', thresholdDays)
        .order('consecutive_days', { ascending: false });

      if (error) throw error;
      return absences || [];
    } catch (err) {
      console.error('[AttendancePolicyEngine] Long absence detection failed:', err);
      return [];
    }
  }

  /**
   * Records or increments long absence for an employee
   */
  async recordLongAbsence(params: {
    organizationId: string;
    employeeId: string;
    employeeName: string;
    departmentName?: string;
    branchName?: string;
    startDate: string;
    consecutiveDays: number;
    isApprovedLeave?: boolean;
  }) {
    const { data, error } = await supabase
      .from('attendance_long_absences')
      .upsert({
        organization_id: params.organizationId,
        employee_id: params.employeeId,
        employee_name: params.employeeName,
        department_name: params.departmentName,
        branch_name: params.branchName,
        absence_start_date: params.startDate,
        consecutive_days: params.consecutiveDays,
        is_approved_leave: params.isApprovedLeave || false,
        status: 'OPEN',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const attendancePolicyEngine = new AttendancePolicyEngine();
