import { PayrollPeriod } from '../payroll/payrollPeriodService';
import { attendanceRosterService } from './attendanceRosterService';
import { AttendanceTimeService } from './attendanceTimeService';
import { timeStringToMinutes } from '../../lib/attendance/attendanceEngine';
import { smartShiftResolutionService, DEFAULT_SHIFTS } from './smartShiftResolutionService';
import { permissionGovernanceService } from './permissionGovernanceService';

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

  // Smart Adaptive Shift Resolution Metadata
  resolvedShift?: {
    shiftCode: string;
    shiftName: string;
    scheduledStart: string;
    scheduledEnd: string;
    source: string;
    confidenceScore: number;
    isAmbiguous: boolean;
    requiresReview: boolean;
  };

  // Monthly 2-Hour Permission Governance Metadata
  permissionMinutes?: number;
  monthlyPermissionCumulative?: number;
  isPermissionHalfDay?: boolean;
  permissionReason?: string;
  
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
    isPermissionHalfDay?: boolean;
    permissionMinutes?: number;
    monthlyPermissionCumulative?: number;
    shiftResolutionSource?: string;
    shiftConfidenceScore?: number;
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

  // Smart Shift & Permission Metrics
  totalPermissionMinutes: number;
  monthlyPermissionAllowance: number;
  permissionExcessMinutes: number;
  permissionHalfDaysCount: number;
  adaptiveShiftsResolvedCount: number;
  unresolvedShiftsCount: number;
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

    // Monthly Permission Governance Tracker (Dynamic Policy Engine)
    const permPolicy = permissionGovernanceService.loadPolicyConfig();
    const monthlyPermissionAllowance = permPolicy.monthlyAllowanceMinutes || 120;
    const includeLateArrivalsBeyondGrace = permPolicy.includeLateArrivalsBeyondGrace ?? true;
    const subsequentExcessHandling = permPolicy.subsequentExcessHandling || 'LOG_EXCESS_ONLY';
    let cumulativePermissionMinutes = 0;
    let thresholdCrossingDate: string | null = null;
    let permissionHalfDaysCount = 0;
    let adaptiveShiftsResolvedCount = 0;
    let unresolvedShiftsCount = 0;

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

      // Check if employee has raw attendance record from ledger or biometric sync
      const rawRec = rawAttendanceList.find(
        (r) =>
          (r.date === dateStr || r.attendance_date === dateStr) &&
          (r.employee_id === employee?.id ||
            r.employee_code === employee?.employee_code ||
            r.employee_id === employee?.employee_code ||
            (employee?.display_name && r.employee_name && r.employee_name.trim().toLowerCase() === employee.display_name.trim().toLowerCase()))
      );

      let rawFirstIn: string | null = rawRec ? (rawRec.first_check_in || rawRec.first_in || null) : null;
      let rawLastOut: string | null = rawRec ? (rawRec.last_check_out || rawRec.last_out || null) : null;

      // ======================================================================
      // SMART ADAPTIVE SHIFT RESOLUTION (6-Tier Hierarchy)
      // ======================================================================
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(employee?.id || '', dateStr);
      let shiftMaster = roster?.shift_id ? attendanceRosterService.getShiftById(roster.shift_id) : null;
      let shiftResolutionSource = 'DEFAULT_REVIEW_QUEUE';
      let shiftConfidenceScore = 50;
      let isAmbiguousShift = false;
      let requiresShiftReview = false;

      if (employee?.assigned_shift_id || employee?.shift_id) {
        // Tier 1: Approved Employee Assignment
        const empShift = attendanceRosterService.getShiftById(employee.assigned_shift_id || employee.shift_id);
        if (empShift) {
          shiftMaster = empShift;
          shiftResolutionSource = 'APPROVED_EMPLOYEE_ASSIGNMENT';
          shiftConfidenceScore = 100;
        }
      } else if (roster?.shift_id && shiftMaster) {
        // Tier 2: Approved Shift Roster / Override
        shiftResolutionSource = roster.is_override ? 'EMERGENCY_REASSIGNMENT' : 'APPROVED_ROSTER_ROTATION';
        shiftConfidenceScore = 100;
      } else if (rawFirstIn) {
        // Tier 5: Adaptive Punch Inference
        // Match punch against candidate shifts (GEN-10: 09:30, GEN-01: 08:30, GEN-09: 09:00, GEN-03: 09:00)
        const punchMin = AttendanceTimeService.getMinutesFromMidnight(rawFirstIn, 'Asia/Kolkata');
        const activeShifts = DEFAULT_SHIFTS;

        let bestShift: any = activeShifts[0];
        let minDiff = 9999;
        let secondDiff = 9999;

        for (const cand of activeShifts) {
          const sMin = timeStringToMinutes(cand.start_time.substring(0, 5)) || 540;
          let diff = Math.abs(punchMin - sMin);
          if (diff > 720) diff = 1440 - diff;
          if (diff < minDiff) {
            secondDiff = minDiff;
            minDiff = diff;
            bestShift = cand;
          } else if (diff < secondDiff) {
            secondDiff = diff;
          }
        }

        if (Math.abs(minDiff - secondDiff) <= 5 && minDiff < 60) {
          isAmbiguousShift = true;
          requiresShiftReview = true;
          shiftResolutionSource = 'DEFAULT_REVIEW_QUEUE';
          unresolvedShiftsCount++;
        } else if (minDiff <= 60) {
          shiftMaster = bestShift as any;
          shiftResolutionSource = 'ADAPTIVE_PUNCH_INFERENCE';
          shiftConfidenceScore = Math.max(70, 100 - minDiff);
          adaptiveShiftsResolvedCount++;
        }
      }

      const shiftCode = shiftMaster?.shift_code || (shiftMaster as any)?.code || roster?.shift_code || 'GEN-10';
      const shiftName = shiftMaster?.shift_name || (shiftMaster as any)?.name || roster?.shift_name || 'General Day Shift (Corporate)';
      const scheduledStart = (shiftMaster?.start_time || '09:30').substring(0, 5);
      const scheduledEnd = (shiftMaster?.end_time || '18:30').substring(0, 5);
      const scheduledTime = `${scheduledStart} – ${scheduledEnd}`;
      const shiftStartMins = timeStringToMinutes(scheduledStart) || 570;
      const shiftEndMins = timeStringToMinutes(scheduledEnd) || 1110;
      const shiftGrace = (shiftMaster as any)?.grace_entry_minutes || (shiftMaster as any)?.grace_in_minutes || 15;
      const shiftEndBufferMins = shiftEndMins + ((shiftMaster as any)?.grace_exit_minutes || (shiftMaster as any)?.grace_out_minutes || 15);
      const isShiftEnded = isPast || (isToday && currentMins >= shiftEndBufferMins);

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
        rawLastOut = regForDate.requested_check_out || regForDate.requested_out_time || '18:30';
      }

      const hasRealPunch = Boolean(rawFirstIn || rawLastOut);

      // Real punches ALWAYS override weekly off (an employee who came in on weekend worked!)
      const isWeeklyOff = !hasRealPunch && (
        roster?.is_weekly_off !== undefined
          ? roster.is_weekly_off
          : (rawRec?.status === 'Weekly Off' || rawRec?.status === 'WEEKLY_OFF') || isSunday || (isSaturday && (rawRec?.status === 'Weekly Off' || !roster))
      );

      // ======================================================================
      // MONTHLY 2-HOUR PERMISSION GOVERNANCE (Policy A: Threshold Crossing Day)
      // ======================================================================
      const dailyPermissionMins = Number(rawRec?.permission_minutes || rawRec?.approved_permission_minutes || 0);
      let isPermissionHalfDay = false;
      let permissionReason: string | undefined = undefined;

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
        if (lateMinutes === 0 && rawFirstIn) {
          const punchMin = AttendanceTimeService.getMinutesFromMidnight(rawFirstIn, 'Asia/Kolkata');
          if (punchMin > (shiftStartMins + shiftGrace)) {
            lateMinutes = punchMin - shiftStartMins;
          }
        }
        earlyMinutes = rawRec?.early_exit_minutes ?? rawRec?.early_checkout_minutes ?? 0;
        otMinutes = rawRec?.overtime_minutes || otMinutes;
        source = (rawRec?.source as any) || (firstIn ? 'MOBILE_GPS' : 'POLICY');

        // Combined Company Policy: Late arrivals beyond shift grace auto-consume from monthly permission quota
        const excessLateMins = includeLateArrivalsBeyondGrace ? Math.max(0, lateMinutes - shiftGrace) : 0;
        const dayCombinedMins = dailyPermissionMins + excessLateMins;

        if (dayCombinedMins > 0) {
          const prevCumulative = cumulativePermissionMinutes;
          cumulativePermissionMinutes += dayCombinedMins;

          // Case 1: Threshold-crossing day (first day cumulative exceeds allowance)
          if (prevCumulative <= monthlyPermissionAllowance && cumulativePermissionMinutes > monthlyPermissionAllowance) {
            isPermissionHalfDay = true;
            thresholdCrossingDate = dateStr;
            permissionHalfDaysCount++;
            permissionReason = `Monthly permission allowance (${monthlyPermissionAllowance}m) exceeded by combined permission and late arrivals (${cumulativePermissionMinutes}m / ${monthlyPermissionAllowance}m; threshold crossed on ${dateStr})`;
          }
          // Case 2: Subsequent Excess Handling: If quota is ALREADY exceeded, and company policy is configured to MARK_EVERY_EXCESS_HALF_DAY
          else if (prevCumulative > monthlyPermissionAllowance && subsequentExcessHandling === 'MARK_EVERY_EXCESS_HALF_DAY') {
            isPermissionHalfDay = true;
            permissionHalfDaysCount++;
            permissionReason = `Monthly permission allowance exhausted (${monthlyPermissionAllowance}m). Subsequent day with ${dayCombinedMins}m excess classified as Half-Day per company policy (Cumulative: ${cumulativePermissionMinutes}m)`;
          }
        }

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
          } else if (isPermissionHalfDay || effectiveWorked < 240 || rawRec?.status === 'Half Day') {
            // Marked Half Day due to Monthly Permission Threshold exceeded or duration
            status = 'Half Day';
            statusBadgeVariant = 'warning';
          } else if (rawRec?.status === 'Late' || lateMinutes > 0) {
            status = 'Late';
            statusBadgeVariant = 'warning';
          } else {
            status = 'Present';
            statusBadgeVariant = 'success';
          }
        } else if (isPermissionHalfDay || rawRec?.status === 'Half Day') {
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
        resolvedShift: {
          shiftCode,
          shiftName,
          scheduledStart,
          scheduledEnd,
          source: shiftResolutionSource,
          confidenceScore: shiftConfidenceScore,
          isAmbiguous: isAmbiguousShift,
          requiresReview: requiresShiftReview,
        },
        permissionMinutes: dailyPermissionMins > 0 ? dailyPermissionMins : undefined,
        monthlyPermissionCumulative: cumulativePermissionMinutes,
        isPermissionHalfDay,
        permissionReason,
        calculationTrace: {
          shiftCode,
          gracePeriodMinutes: shiftGrace,
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
          isPermissionHalfDay,
          permissionMinutes: dailyPermissionMins,
          monthlyPermissionCumulative: cumulativePermissionMinutes,
          shiftResolutionSource,
          shiftConfidenceScore,
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
      totalPermissionMinutes: cumulativePermissionMinutes,
      monthlyPermissionAllowance,
      permissionExcessMinutes: Math.max(0, cumulativePermissionMinutes - monthlyPermissionAllowance),
      permissionHalfDaysCount,
      adaptiveShiftsResolvedCount,
      unresolvedShiftsCount,
    };

    return { dailyRows, metrics };
  }
}

export const attendanceCalculationService = new AttendanceCalculationService();
