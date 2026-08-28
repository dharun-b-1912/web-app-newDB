import { PayrollPeriod } from '../payroll/payrollPeriodService';
import { attendanceRosterService } from './attendanceRosterService';

export interface DailyAttendanceRow {
  id: string;
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  dayName: string;
  isWeeklyOff: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  
  shiftName: string;
  scheduledTime: string; // e.g. "08:30 – 17:30"
  scheduledStart: string;
  scheduledEnd: string;
  
  firstIn: string | null;
  lastOut: string | null;
  workedDurationStr: string; // e.g. "8h 19m"
  workedMinutes: number;
  
  status: 'Present' | 'Late' | 'Absent' | 'Paid Leave' | 'Unpaid Leave' | 'Half Day' | 'Weekly Off' | 'Holiday' | 'WFH' | 'Scheduled' | 'Missing Punch';
  statusBadgeVariant: 'success' | 'warning' | 'error' | 'info' | 'default';
  
  lateMinutes: number;
  earlyMinutes: number;
  overtimeMinutes: number;
  overtimeStr?: string;
  
  source: 'BIOMETRIC' | 'MOBILE' | 'WEB' | 'POLICY' | 'MANUAL' | 'REGULARIZATION' | 'MOBILE_GPS';
  
  // Auditable Calculation Trace
  calculationTrace: {
    shiftCode: string;
    gracePeriodMinutes: number;
    unpaidBreakMinutes: number;
    halfDayThresholdMinutes: number;
    fullDayThresholdMinutes: number;
    rawFirstIn?: string;
    rawLastOut?: string;
    isLate: boolean;
    isEarly: boolean;
    isOvertime: boolean;
    isLop: boolean;
    lopDays: number;
    calculationVersion: string;
  };
}

export interface PeriodAttendanceMetrics {
  totalCalendarDays: number;
  scheduledWorkingDays: number;
  weeklyOffDays: number;
  holidayDays: number;
  
  elapsedDays: number;
  elapsedWorkingDays: number;
  remainingWorkingDays: number;
  
  presentDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  halfDays: number;
  wfhDays: number;
  
  lateEventsCount: number;
  totalLateMinutes: number;
  earlyEventsCount: number;
  totalEarlyMinutes: number;
  missingPunchCount: number;
  
  totalScheduledMinutes: number;
  totalWorkedMinutes: number;
  totalOvertimeMinutes: number;
  approvedOvertimeMinutes: number;
  
  lopDays: number;
  payableDays: number;
}

export interface CalculatedPeriodAttendanceResult {
  dailyRows: DailyAttendanceRow[];
  metrics: PeriodAttendanceMetrics;
}

class AttendanceCalculationService {
  /**
   * Calculate complete date-by-date attendance ledger and period summary
   * Strictly uses REAL database punches and policy evaluations — zero fabricated seed/past entries.
   */
  calculatePeriodAttendance(
    employee: any,
    period: PayrollPeriod,
    rawAttendanceList: any[] = [],
    regularizations: any[] = [],
    overtimeRequests: any[] = []
  ): CalculatedPeriodAttendanceResult {
    const dailyRows: DailyAttendanceRow[] = [];
    
    // Parse Period Start & End Dates
    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);
    const numDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let totalWeeklyOffs = 0;
    let scheduledWorkingDays = 0;
    let elapsedDays = 0;
    let elapsedWorkingDays = 0;
    let remainingWorkingDays = 0;

    let presentDays = 0;
    let absentDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let halfDays = 0;
    let wfhDays = 0;
    let missingPunchCount = 0;

    let lateEventsCount = 0;
    let totalLateMinutes = 0;
    let earlyEventsCount = 0;
    let totalEarlyMinutes = 0;

    let totalScheduledMinutes = 0;
    let totalWorkedMinutes = 0;
    let totalOvertimeMinutes = 0;
    let approvedOvertimeMinutes = 0;

    // Iterate through every single calendar day in the period
    for (let i = 0; i < numDays; i++) {
      const curDate = new Date(startDate);
      curDate.setDate(startDate.getDate() + i);
      
      const year = curDate.getFullYear();
      const month = String(curDate.getMonth() + 1).padStart(2, '0');
      const day = String(curDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayNum = curDate.getDate();
      const dayOfWeek = curDate.getDay();
      
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;
      const isWeeklyOff = isSunday || isSaturday;
      const dayName = curDate.toLocaleDateString('en-US', { weekday: 'short' });
      
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;

      if (isPast || isToday) elapsedDays++;

      // Resolve Assigned Shift from Roster
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(employee?.id || '', dateStr);
      const shiftMaster = roster?.shift_id ? attendanceRosterService.getShiftById(roster.shift_id) : null;
      const shiftName = roster?.shift_name || shiftMaster?.shift_name || 'General Day Shift (Corporate)';
      const scheduledStart = shiftMaster?.start_time || '09:00';
      const scheduledEnd = shiftMaster?.end_time || '18:00';
      const scheduledTime = `${scheduledStart} – ${scheduledEnd}`;

      // Check if employee has raw attendance record from ledger or biometric sync
      const rawRec = rawAttendanceList.find(
        (r) =>
          r.date === dateStr &&
          (r.employee_id === employee?.id ||
            r.employee_code === employee?.employee_code ||
            r.employee_id === employee?.employee_code ||
            (employee?.display_name && r.employee_name && r.employee_name.trim().toLowerCase() === employee.display_name.trim().toLowerCase()))
      );

      // Check for approved overtime requests
      const otReq = overtimeRequests.find(
        (ot) =>
          (ot.date === dateStr || ot.attendance_date === dateStr) &&
          (ot.employee_id === employee?.id || ot.employee_code === employee?.employee_code) &&
          (ot.status === 'Approved' || ot.status === 'APPROVED')
      );

      // Evaluate Daily State
      let status: DailyAttendanceRow['status'] = 'Scheduled';
      let statusBadgeVariant: DailyAttendanceRow['statusBadgeVariant'] = 'default';
      let firstIn: string | null = null;
      let lastOut: string | null = null;
      let workedMinutes = 0;
      let workedDurationStr = '–';
      let lateMinutes = 0;
      let earlyMinutes = 0;
      let otMinutes = otReq ? (otReq.approved_hours ? Math.round(otReq.approved_hours * 60) : 0) : 0;
      let source: DailyAttendanceRow['source'] = 'POLICY';

      if (isWeeklyOff) {
        totalWeeklyOffs++;
        status = 'Weekly Off';
        statusBadgeVariant = 'default';
        workedDurationStr = 'Weekly Off';
        source = 'POLICY';
      } else {
        scheduledWorkingDays++;
        if (isPast || isToday) {
          elapsedWorkingDays++;
          totalScheduledMinutes += 480; // 8 net working hours
        } else {
          remainingWorkingDays++;
        }

        const hasRealPunch = rawRec && (rawRec.first_check_in || rawRec.first_in || rawRec.last_check_out || rawRec.last_out);
        const hasLeaveOrStatus = rawRec && (rawRec.status === 'Paid Leave' || rawRec.status === 'On Leave' || rawRec.status === 'Leave' || rawRec.status === 'Absent' || rawRec.status === 'WFH');

        if (rawRec && (hasRealPunch || hasLeaveOrStatus)) {
          firstIn = rawRec.first_check_in || rawRec.first_in || null;
          lastOut = rawRec.last_check_out || rawRec.last_out || null;
          workedMinutes = rawRec.net_working_minutes || rawRec.gross_working_minutes || 0;
          lateMinutes = rawRec.late_minutes || 0;
          earlyMinutes = rawRec.early_checkout_minutes || 0;
          otMinutes = rawRec.overtime_minutes || otMinutes;
          source = (rawRec.source as any) || (firstIn ? 'MOBILE_GPS' : 'POLICY');

          if (rawRec.status === 'Late' || lateMinutes > 0) {
            status = 'Late';
            statusBadgeVariant = 'warning';
          } else if (rawRec.status === 'Half Day') {
            status = 'Half Day';
            statusBadgeVariant = 'warning';
          } else if (rawRec.status === 'Paid Leave' || rawRec.status === 'Leave' || rawRec.status === 'On Leave') {
            status = 'Paid Leave';
            statusBadgeVariant = 'info';
          } else if (rawRec.status === 'Unpaid Leave') {
            status = 'Unpaid Leave';
            statusBadgeVariant = 'error';
          } else if (rawRec.status === 'Absent') {
            status = 'Absent';
            statusBadgeVariant = 'error';
          } else if (rawRec.status === 'WFH') {
            status = 'WFH';
            statusBadgeVariant = 'info';
          } else if (firstIn) {
            status = 'Present';
            statusBadgeVariant = 'success';
          } else {
            status = 'Absent';
            statusBadgeVariant = 'error';
          }
        } else if (isPast) {
          // Pure database-backed state: unpunched past working day = Absent LOP
          firstIn = null;
          lastOut = null;
          workedMinutes = 0;
          workedDurationStr = '–';
          source = 'POLICY';
          status = 'Absent';
          statusBadgeVariant = 'error';
        } else if (isToday) {
          // Today without a punch yet = Scheduled
          firstIn = null;
          lastOut = null;
          workedMinutes = 0;
          workedDurationStr = '–';
          source = 'POLICY';
          status = 'Scheduled';
          statusBadgeVariant = 'default';
        } else {
          // Future scheduled day
          firstIn = null;
          lastOut = null;
          workedMinutes = 0;
          workedDurationStr = '–';
          source = 'POLICY';
          status = 'Scheduled';
          statusBadgeVariant = 'default';
        }
      }

      // Format Worked Duration
      if (workedMinutes > 0) {
        const hrs = Math.floor(workedMinutes / 60);
        const mins = workedMinutes % 60;
        workedDurationStr = `${hrs}h ${mins}m`;
      }

      // Accumulate Metrics for Past/Today Days
      if ((isPast || isToday) && !isWeeklyOff) {
        if (status === 'Present') {
          presentDays += 1;
        } else if (status === 'Late') {
          presentDays += 1;
          lateEventsCount += 1;
          totalLateMinutes += lateMinutes;
        } else if (status === 'Half Day') {
          halfDays += 1;
          presentDays += 0.5;
        } else if (status === 'Paid Leave') {
          paidLeaveDays += 1;
        } else if (status === 'Unpaid Leave') {
          unpaidLeaveDays += 1;
        } else if (status === 'Absent') {
          absentDays += 1;
        } else if (status === 'WFH') {
          wfhDays += 1;
          presentDays += 1;
        }

        if (earlyMinutes > 0) {
          earlyEventsCount += 1;
          totalEarlyMinutes += earlyMinutes;
        }

        totalWorkedMinutes += workedMinutes;
        totalOvertimeMinutes += otMinutes;
        approvedOvertimeMinutes += otMinutes;
      }

      const isLop = status === 'Absent' || status === 'Unpaid Leave';
      const lopDaysVal = isLop ? 1 : status === 'Half Day' ? 0.5 : 0;

      dailyRows.push({
        id: `att-${dateStr}-${employee?.id || 'emp'}`,
        dateStr,
        dayNum,
        dayName,
        isWeeklyOff,
        isToday,
        isPast,
        isFuture,
        shiftName,
        scheduledTime,
        scheduledStart,
        scheduledEnd,
        firstIn,
        lastOut,
        workedDurationStr,
        workedMinutes,
        status,
        statusBadgeVariant,
        lateMinutes,
        earlyMinutes,
        overtimeMinutes: otMinutes,
        overtimeStr: otMinutes > 0 ? `+${Math.floor(otMinutes / 60)}h ${otMinutes % 60}m` : undefined,
        source,
        calculationTrace: {
          shiftCode: roster?.shift_code || 'GEN-09',
          gracePeriodMinutes: 15,
          unpaidBreakMinutes: 45,
          halfDayThresholdMinutes: 240,
          fullDayThresholdMinutes: 480,
          rawFirstIn: firstIn || undefined,
          rawLastOut: lastOut || undefined,
          isLate: lateMinutes > 0,
          isEarly: earlyMinutes > 0,
          isOvertime: otMinutes > 0,
          isLop,
          lopDays: lopDaysVal,
          calculationVersion: period.policy_version || 'v3.2',
        },
      });
    }

    const lopDays = absentDays + unpaidLeaveDays + halfDays * 0.5;
    const payableDays = Math.max(0, numDays - lopDays);

    const metrics: PeriodAttendanceMetrics = {
      totalCalendarDays: numDays,
      scheduledWorkingDays,
      weeklyOffDays: totalWeeklyOffs,
      holidayDays: 0,
      elapsedDays,
      elapsedWorkingDays,
      remainingWorkingDays,
      presentDays,
      absentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      halfDays,
      wfhDays,
      missingPunchCount,
      lateEventsCount,
      totalLateMinutes,
      earlyEventsCount,
      totalEarlyMinutes,
      totalScheduledMinutes,
      totalWorkedMinutes,
      totalOvertimeMinutes,
      approvedOvertimeMinutes,
      lopDays,
      payableDays,
    };

    return { dailyRows, metrics };
  }
}

export const attendanceCalculationService = new AttendanceCalculationService();
