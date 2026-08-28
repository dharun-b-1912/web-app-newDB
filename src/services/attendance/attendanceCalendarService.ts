// src/services/attendance/attendanceCalendarService.ts
// ============================================================================
// Joy PeopleHR — Production Real-Data Attendance Calendar Service
// Aggregates:
// - Real Employees (Employee Master)
// - Shift & Roster Schedules (attendanceRosterService)
// - Real Punches (attendanceApi)
// - Approved Leave (leaveApi)
// - Approved WFH (attendanceApi)
// - Late / Early Deviations (attendanceOperationsEngine)
// - Regularizations (attendanceOperationsEngine)
// - Exceptions Queue (attendanceOperationsEngine)
// - Holidays (leaveApi)
// ============================================================================

import { api } from '../api';
import { attendanceApi } from '../attendanceApi';
import { leaveApi } from '../leaveApi';
import { attendanceRosterService } from './attendanceRosterService';
import { attendanceOperationsEngine } from './attendanceOperationsEngine';

export interface CalendarDaySummary {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  dayName: string; // Mon, Tue, etc.
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  holidayName?: string;

  // Real Counts
  scheduled: number;
  present: number;
  wfh: number;
  leave: number;
  absent: number;
  late: number;
  early: number;
  exceptions: number;
  regularizations: number;

  hasIssues: boolean;
  totalIssuesCount: number;
}

export interface DayEmployeeRecord {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  location: string;
  shift_name: string;
  shift_time: string;
  status: 'Present' | 'Late' | 'Early Checkout' | 'Absent' | 'WFH' | 'On Leave' | 'Weekly Off' | 'Holiday' | 'Exception' | 'Not Checked In';
  actual_in?: string;
  actual_out?: string;
  late_minutes?: number;
  early_minutes?: number;
  source?: string;
  hasException?: boolean;
  exceptionReason?: string;
  hasRegularization?: boolean;
  regularizationStatus?: string;
}

export interface MonthInsightMetrics {
  totalDaysWithData: number;
  attendanceRate: number; // e.g. 96.4%
  totalScheduled: number;
  totalPresent: number;
  totalWfh: number;
  totalLeave: number;
  totalLateEarly: number;
  pendingRegularizations: number;
  unresolvedExceptions: number;
}

export interface CalendarFilterOptions {
  department?: string;
  location?: string;
  shift?: string;
  employmentType?: string;
  searchQuery?: string;
  status?: string;
}

class AttendanceCalendarService {
  /**
   * Retrieves aggregated daily data for the entire calendar grid of a given year and month
   */
  public async getMonthlyCalendar(
    year: number,
    month: number, // 0-indexed (0 = Jan, 7 = Aug)
    filters: CalendarFilterOptions = {}
  ): Promise<{ days: CalendarDaySummary[]; metrics: MonthInsightMetrics }> {
    const activeCompany = api.getActiveCompany();
    const allEmployees = await api.getEmployees(activeCompany?.id);

    // Filter employees by scope
    const scopedEmployees = allEmployees.filter(emp => {
      if (emp.status === 'Terminated' || emp.status === 'Exited') return false;
      const dept = emp.department_name || emp.department_id || '';
      const loc = emp.employment?.work_location || emp.branch_name || '';

      if (filters.department && filters.department !== 'ALL' && dept !== filters.department) return false;
      if (filters.location && filters.location !== 'ALL' && loc !== filters.location) return false;
      if (filters.employmentType && filters.employmentType !== 'ALL' && emp.employment_type !== filters.employmentType) return false;
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
        const code = (emp.employee_code || '').toLowerCase();
        if (!name.includes(q) && !code.includes(q)) return false;
      }
      return true;
    });

    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch holidays from leaveApi
    let holidays: Array<{ date: string; name: string }> = [];
    try {
      const calendars = leaveApi.getHolidayCalendars();
      if (calendars && calendars.length > 0) {
        for (const cal of calendars) {
          if (cal.holidays) {
            for (const h of cal.holidays) {
              holidays.push({ date: h.date, name: h.name });
            }
          }
        }
      }
    } catch (_) {}

    // Calculate grid range (including padding days before and after)
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startPadding = firstDayOfMonth.getDay(); // 0 = Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const calendarGridDays: CalendarDaySummary[] = [];

    // All real records for this month
    const allLateEarly = attendanceOperationsEngine.getLateEarlyEvaluations();
    const allRegularizations = attendanceOperationsEngine.getRegularizations();
    const allExceptions = attendanceOperationsEngine.getExceptions();
    const allWfh = attendanceApi.getWfhRequests();
    let allLeaveRequests: any[] = [];
    try {
      allLeaveRequests = leaveApi.getLeaveRequests();
    } catch (_) {}

    // Track monthly aggregates
    let sumScheduled = 0;
    let sumPresent = 0;
    let sumWfh = 0;
    let sumLeave = 0;
    let sumLateEarly = 0;
    let sumPendingReg = 0;
    let sumExceptions = 0;
    let daysWithAttendanceData = 0;

    // Build the grid
    const totalGridCells = Math.ceil((startPadding + totalDaysInMonth) / 7) * 7;

    for (let i = 0; i < totalGridCells; i++) {
      const dayOffset = i - startPadding + 1;
      const cellDate = new Date(year, month, dayOffset);
      const dateStr = cellDate.toISOString().split('T')[0];
      const isCurrentMonth = cellDate.getMonth() === month;
      const dayOfWeek = cellDate.getDay();
      const isWeeklyOff = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

      const holiday = holidays.find(h => h.date === dateStr);
      const isHoliday = !!holiday;

      if (!isCurrentMonth) {
        calendarGridDays.push({
          date: dateStr,
          dayNumber: cellDate.getDate(),
          dayName: cellDate.toLocaleDateString('en-US', { weekday: 'short' }),
          isToday: dateStr === todayStr,
          isCurrentMonth: false,
          isWeeklyOff,
          isHoliday,
          holidayName: holiday?.name,
          scheduled: 0,
          present: 0,
          wfh: 0,
          leave: 0,
          absent: 0,
          late: 0,
          early: 0,
          exceptions: 0,
          regularizations: 0,
          hasIssues: false,
          totalIssuesCount: 0,
        });
        continue;
      }

      // Fetch real attendance records for this specific date
      const dailyAttendance = attendanceApi.getDailyAttendance(dateStr);

      let presentCount = 0;
      let wfhCount = 0;
      let leaveCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let earlyCount = 0;

      // Count only within scoped employees
      const scopedEmpIds = new Set(scopedEmployees.map(e => e.id));

      for (const rec of dailyAttendance) {
        if (!scopedEmpIds.has(rec.employee_id)) continue;

        if (rec.status === 'Present') presentCount++;
        else if (rec.status === 'Late') {
          presentCount++;
          lateCount++;
        } else if (rec.status === 'Early Checkout') {
          presentCount++;
          earlyCount++;
        } else if (rec.status === 'WFH') wfhCount++;
        else if (rec.status === 'On Leave') leaveCount++;
        else if (rec.status === 'Absent') absentCount++;

        if (rec.late_minutes && rec.late_minutes > 0 && rec.status !== 'Late') lateCount++;
        if (rec.early_checkout_minutes && rec.early_checkout_minutes > 0 && rec.status !== 'Early Checkout') earlyCount++;
      }

      // Real WFH requests on this date
      const dateWfh = allWfh.filter(w => w.status === 'Approved' && (w.from_date <= dateStr && w.to_date >= dateStr));
      wfhCount = Math.max(wfhCount, dateWfh.filter(w => scopedEmpIds.has(w.employee_id)).length);

      // Real Leave requests on this date
      const dateLeave = allLeaveRequests.filter(l => (l.status === 'Approved' || l.status === 'HR Approved') && (l.start_date <= dateStr && l.end_date >= dateStr));
      leaveCount = Math.max(leaveCount, dateLeave.filter(l => scopedEmpIds.has(l.employee_id)).length);

      // Late/Early Evaluations on this date
      const dateLateEarly = allLateEarly.filter(le => le.date === dateStr && scopedEmpIds.has(le.employee_id));
      const dateLate = dateLateEarly.filter(le => le.late_minutes > 0 && le.status !== 'REGULARIZED').length;
      const dateEarly = dateLateEarly.filter(le => le.early_minutes > 0 && le.status !== 'REGULARIZED').length;
      lateCount = Math.max(lateCount, dateLate);
      earlyCount = Math.max(earlyCount, dateEarly);

      // Exceptions on this date
      const dateExceptions = allExceptions.filter(exc => exc.date === dateStr && exc.status !== 'RESOLVED' && scopedEmpIds.has(exc.employee_id)).length;

      // Regularizations on this date
      const dateRegs = allRegularizations.filter(r => r.date === dateStr && (r.status === 'Pending Manager' || r.status === 'Pending HR') && scopedEmpIds.has(r.employee_id)).length;

      const scheduledCount = isWeeklyOff || isHoliday ? 0 : scopedEmployees.length;

      const totalIssues = lateCount + earlyCount + dateExceptions + dateRegs;
      const hasIssues = totalIssues > 0;

      if (dailyAttendance.length > 0) {
        daysWithAttendanceData++;
      }

      sumScheduled += scheduledCount;
      sumPresent += presentCount;
      sumWfh += wfhCount;
      sumLeave += leaveCount;
      sumLateEarly += (lateCount + earlyCount);
      sumPendingReg += dateRegs;
      sumExceptions += dateExceptions;

      calendarGridDays.push({
        date: dateStr,
        dayNumber: cellDate.getDate(),
        dayName: cellDate.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: dateStr === todayStr,
        isCurrentMonth: true,
        isWeeklyOff,
        isHoliday,
        holidayName: holiday?.name,
        scheduled: scheduledCount,
        present: presentCount,
        wfh: wfhCount,
        leave: leaveCount,
        absent: absentCount,
        late: lateCount,
        early: earlyCount,
        exceptions: dateExceptions,
        regularizations: dateRegs,
        hasIssues,
        totalIssuesCount: totalIssues,
      });
    }

    const denominator = Math.max(sumScheduled - sumLeave, 1);
    const attendanceRate = sumScheduled > 0
      ? Math.min(100, Math.round(((sumPresent + sumWfh) / denominator) * 1000) / 10)
      : 0;

    const metrics: MonthInsightMetrics = {
      totalDaysWithData: daysWithAttendanceData,
      attendanceRate,
      totalScheduled: sumScheduled,
      totalPresent: sumPresent,
      totalWfh: sumWfh,
      totalLeave: sumLeave,
      totalLateEarly: sumLateEarly,
      pendingRegularizations: sumPendingReg,
      unresolvedExceptions: sumExceptions,
    };

    return {
      days: calendarGridDays,
      metrics,
    };
  }

  /**
   * Retrieves full employee-level records for the right-side Date Detail Drawer
   */
  public async getEmployeeRecordsForDate(
    dateStr: string,
    filters: CalendarFilterOptions = {}
  ): Promise<DayEmployeeRecord[]> {
    const activeCompany = api.getActiveCompany();
    const allEmployees = await api.getEmployees(activeCompany?.id);
    const dailyRecords = attendanceApi.getDailyAttendance(dateStr);
    const allLateEarly = attendanceOperationsEngine.getLateEarlyEvaluations();
    const allRegularizations = attendanceOperationsEngine.getRegularizations();
    const allExceptions = attendanceOperationsEngine.getExceptions();

    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const result: DayEmployeeRecord[] = [];

    for (const emp of allEmployees) {
      if (emp.status === 'Terminated' || emp.status === 'Exited') continue;
      const dept = emp.department_name || emp.department_id || 'Operations';
      const loc = emp.employment?.work_location || emp.branch_name || 'Coimbatore HQ';

      if (filters.department && filters.department !== 'ALL' && dept !== filters.department) continue;
      if (filters.location && filters.location !== 'ALL' && loc !== filters.location) continue;

      const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, dateStr);
      const rec = dailyRecords.find(d => d.employee_id === emp.id);

      const le = allLateEarly.find(l => l.employee_id === emp.id && l.date === dateStr);
      const exc = allExceptions.find(e => e.employee_id === emp.id && e.date === dateStr && e.status !== 'RESOLVED');
      const reg = allRegularizations.find(r => r.employee_id === emp.id && r.date === dateStr);

      let status: DayEmployeeRecord['status'] = isWeekend ? 'Weekly Off' : 'Not Checked In';
      let actualIn = rec?.first_check_in;
      let actualOut = rec?.last_check_out;

      if (rec) {
        status = rec.status as any;
      } else if (le && le.status === 'REGULARIZED') {
        status = 'Present';
        actualIn = le.actual_in;
        actualOut = le.actual_out;
      }

      if (exc) {
        status = 'Exception';
      }

      result.push({
        employee_id: emp.id,
        employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || 'Employee',
        employee_code: emp.employee_code || `WF-${emp.id}`,
        department: dept,
        location: loc,
        shift_name: roster.shift_name,
        shift_time: '09:00 - 18:00',
        status,
        actual_in: actualIn,
        actual_out: actualOut,
        late_minutes: le?.late_minutes || rec?.late_minutes,
        early_minutes: le?.early_minutes || rec?.early_checkout_minutes,
        source: rec?.source || 'SYSTEM',
        hasException: !!exc,
        exceptionReason: exc?.diagnosis_reason,
        hasRegularization: !!reg,
        regularizationStatus: reg?.status,
      });
    }

    return result;
  }
}

export const attendanceCalendarService = new AttendanceCalendarService();
