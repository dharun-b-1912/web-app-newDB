import { PayrollPeriod } from '../payroll/payrollPeriodService';
import { attendanceRosterService } from './attendanceRosterService';
import { AttendanceTimeService } from './attendanceTimeService';
import { timeStringToMinutes } from '../../lib/attendance/attendanceEngine';

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
  
  status: 'Present' | 'Late' | 'Absent' | 'Paid Leave' | 'Unpaid Leave' | 'Half Day' | 'Weekly Off' | 'Holiday' | 'WFH' | 'Scheduled' | 'Missing Punch' | 'Regularized' | 'Checked In' | 'Pre-Joining';
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
    isMissingPunch?: boolean;
    isRegularized?: boolean;
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
    
    const now = new Date();
    let currentMins = now.getHours() * 60 + now.getMinutes();
    let todayStr = '';
    try {
      todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
      const istTimeStr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
      const [h, m] = istTimeStr.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        currentMins = h * 60 + m;
      }
    } catch {
      todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

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
      const dayName = curDate.toLocaleDateString('en-US', { weekday: 'short' });
      
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;

      // Check if day is prior to employee's Date of Joining (Pre-Joining)
      const empDoj = employee?.doj || employee?.date_of_joining || employee?.employment?.doj || null;
      const isPreJoining = Boolean(empDoj && dateStr < empDoj);

      if (isPast || isToday) elapsedDays++;

      // Resolve Assigned Shift from Roster
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(employee?.id || '', dateStr);
      const shiftMaster = roster?.shift_id ? attendanceRosterService.getShiftById(roster.shift_id) : null;
      const shiftName = roster?.shift_name || shiftMaster?.shift_name || 'General Day Shift (Corporate)';
      const scheduledStart = shiftMaster?.start_time || '09:00';
      const scheduledEnd = shiftMaster?.end_time || '18:00';
      const scheduledTime = `${scheduledStart} – ${scheduledEnd}`;
      const shiftStartMins = timeStringToMinutes(scheduledStart) || 540;
      const shiftEndMins = timeStringToMinutes(scheduledEnd) || 1080;
      const shiftGrace = 15;
      const shiftEndBufferMins = shiftEndMins + shiftGrace;
      const isShiftEnded = isPast || (isToday && currentMins >= shiftEndBufferMins);

      // Check if employee has raw attendance record from ledger or biometric sync
      const rawRec = rawAttendanceList.find(
        (r) =>
          (r.date === dateStr || r.attendance_date === dateStr) &&
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
      let rawFirstIn: string | null = rawRec ? (rawRec.first_check_in || rawRec.first_in || null) : null;
      let rawLastOut: string | null = rawRec ? (rawRec.last_check_out || rawRec.last_out || null) : null;
      let workedMinutes = 0;
      let workedDurationStr = '–';
      let lateMinutes = 0;
      let earlyMinutes = 0;
      let otMinutes = otReq ? (otReq.approved_hours ? Math.round(otReq.approved_hours * 60) : 0) : 0;
      let source: DailyAttendanceRow['source'] = 'POLICY';

      // Check if there is an approved regularization for this employee on this date
      const regForDate = regularizations.find(
        (r) =>
          ((r.attendance_date && r.attendance_date === dateStr) || (r.date && r.date === dateStr)) &&
          (r.employee_id === employee?.id ||
            r.employee_code === employee?.employee_code ||
            (employee?.display_name && r.employee_name && r.employee_name.trim().toLowerCase() === employee.display_name.trim().toLowerCase()))
      );
      const isRegApproved = regForDate && (regForDate.status === 'Approved' || regForDate.status === 'APPROVED');
      if (isRegApproved && !rawLastOut) {
        rawLastOut = regForDate.requested_check_out || regForDate.requested_out_time || '18:00';
      }

      const hasRealPunch = Boolean(rawFirstIn || rawLastOut);

      // Real punches ALWAYS override weekly off (an employee who came in on weekend worked!)
      const isWeeklyOff = !hasRealPunch && (
        roster?.is_weekly_off !== undefined
          ? roster.is_weekly_off
          : (rawRec?.status === 'Weekly Off' || rawRec?.status === 'WEEKLY_OFF') || isSunday || (isSaturday && (rawRec?.status === 'Weekly Off' || !roster))
      );

      if (isPreJoining) {
        // Pre-Joining days prior to DOJ are non-punitive and not scheduled working days
        status = 'Pre-Joining';
        statusBadgeVariant = 'default';
        workedDurationStr = '–';
        source = 'POLICY';
      } else if (isWeeklyOff) {
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

        firstIn = rawFirstIn ? AttendanceTimeService.formatAttendanceTime(rawFirstIn, 'Asia/Kolkata', false) : null;
        lastOut = rawLastOut ? AttendanceTimeService.formatAttendanceTime(rawLastOut, 'Asia/Kolkata', false) : null;
        workedMinutes = rawRec?.net_working_minutes || rawRec?.gross_working_minutes || 0;
        lateMinutes = rawRec?.late_entry_minutes ?? rawRec?.late_minutes ?? 0;
        earlyMinutes = rawRec?.early_exit_minutes ?? rawRec?.early_checkout_minutes ?? 0;
        otMinutes = rawRec?.overtime_minutes || otMinutes;
        source = (rawRec?.source as any) || (firstIn ? 'MOBILE_GPS' : 'POLICY');

        if (isRegApproved) {
          status = 'Regularized';
          statusBadgeVariant = 'info';
          workedMinutes = workedMinutes > 0 ? workedMinutes : 480; // 8 standard hours
          workedDurationStr = '8h 0m (Reg)';
        } else if (rawRec?.status === 'Paid Leave' || rawRec?.status === 'Leave' || rawRec?.status === 'On Leave' || rawRec?.status === 'ON_LEAVE') {
          status = 'Paid Leave';
          statusBadgeVariant = 'info';
          workedDurationStr = 'On Leave';
        } else if (rawRec?.status === 'Unpaid Leave') {
          status = 'Unpaid Leave';
          statusBadgeVariant = 'error';
          workedDurationStr = 'Unpaid Leave';
        } else if (rawRec?.status === 'WFH') {
          status = 'WFH';
          statusBadgeVariant = 'info';
          workedMinutes = 480;
          workedDurationStr = '8h 0m (WFH)';
        } else if (firstIn && !lastOut) {
          // PUNCHED IN BUT NO CHECK-OUT
          if (isToday && !isShiftEnded) {
            // Active shift in progress
            status = 'Checked In';
            statusBadgeVariant = 'info';
            const inM = (rawFirstIn ? timeStringToMinutes(rawFirstIn) : null) || shiftStartMins;
            const liveElapsed = Math.max(0, currentMins - inM);
            workedMinutes = liveElapsed;
            const hrs = Math.floor(liveElapsed / 60);
            const mins = liveElapsed % 60;
            workedDurationStr = `${hrs}h ${mins}m (In Progress)`;
          } else {
            // Past day or today after shift end: Missing Punch
            status = 'Missing Punch';
            statusBadgeVariant = 'warning';
            workedMinutes = 0;
            workedDurationStr = 'Missing Punch';
            missingPunchCount++;
          }
        } else if (firstIn && lastOut) {
          // COMPLETED SHIFT: BOTH PUNCHES LOGGED
          let effectiveWorked = workedMinutes;
          if (effectiveWorked === 0 && rawFirstIn && rawLastOut) {
            const inM = timeStringToMinutes(rawFirstIn);
            const outM = timeStringToMinutes(rawLastOut);
            if (inM !== null && outM !== null) {
              effectiveWorked = outM >= inM ? (outM - inM) : (1440 - inM + outM);
            }
          }
          workedMinutes = effectiveWorked;

          if (effectiveWorked < 120) {
            // Less than 2 hours: Does not qualify for Half Day -> Marked Absent
            status = 'Absent';
            statusBadgeVariant = 'error';
          } else if (effectiveWorked < 240 || rawRec?.status === 'Half Day') {
            // Between 2h and 4h (or flagged Half Day): Half Day
            status = 'Half Day';
            statusBadgeVariant = 'warning';
          } else if (rawRec?.status === 'Late' || lateMinutes > 0) {
            status = 'Late';
            statusBadgeVariant = 'warning';
          } else {
            status = 'Present';
            statusBadgeVariant = 'success';
          }
        } else if (rawRec?.status === 'Half Day') {
          status = 'Half Day';
          statusBadgeVariant = 'warning';
        } else if (isShiftEnded) {
          // Completely not checked in and shift has ended (past day or today after shift end)
          status = 'Absent';
          statusBadgeVariant = 'error';
          workedMinutes = 0;
          workedDurationStr = '–';
        } else {
          // Today before shift end, or future days: Scheduled / Not Checked In
          status = 'Scheduled';
          statusBadgeVariant = 'default';
          workedMinutes = 0;
          workedDurationStr = '–';
        }
      }

      // Format Worked Duration if not already explicitly set
      if (workedMinutes > 0 && workedDurationStr === '–') {
        const hrs = Math.floor(workedMinutes / 60);
        const mins = workedMinutes % 60;
        workedDurationStr = `${hrs}h ${mins}m`;
      }

      // Accumulate Metrics for Past/Today Days
      if ((isPast || isToday) && !isWeeklyOff) {
        if (status === 'Present') {
          presentDays += 1;
        } else if (status === 'Regularized') {
          presentDays += 1; // Approved regularization makes day fully payable
        } else if (status === 'Checked In') {
          presentDays += 1; // Today in-progress
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
        } else if (status === 'Missing Punch') {
          // MISSING CHECK-OUT WITHOUT REGULARIZATION IS NOT PAYABLE (COUNTS AS UNPAID LOP)
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

      const isLop = (status === 'Absent' || status === 'Unpaid Leave' || status === 'Missing Punch') && !isPreJoining;
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
          rawFirstIn: rawFirstIn || undefined,
          rawLastOut: rawLastOut || undefined,
          isLate: lateMinutes > 0,
          isEarly: earlyMinutes > 0,
          isOvertime: otMinutes > 0,
          isLop,
          lopDays: lopDaysVal,
          calculationVersion: period.policy_version || 'v3.2',
          isMissingPunch: status === 'Missing Punch',
          isRegularized: status === 'Regularized',
        },
      });
    }

    const lopDays = absentDays + unpaidLeaveDays + halfDays * 0.5;
    const empDoj = employee?.doj || employee?.date_of_joining || employee?.employment?.doj || null;
    let activeCalendarDays = numDays;
    if (empDoj && empDoj > period.start_date) {
      const dojTime = new Date(empDoj).getTime();
      const endTime = new Date(period.end_date).getTime();
      activeCalendarDays = Math.max(0, Math.round((endTime - dojTime) / (1000 * 60 * 60 * 24)) + 1);
    }
    const payableDays = Math.max(0, Math.min(numDays, activeCalendarDays) - lopDays);

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
