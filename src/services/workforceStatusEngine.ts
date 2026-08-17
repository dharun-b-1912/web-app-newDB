import { Employee } from '../types';
import { AttendanceDaily } from '../types/attendance';
import { LeaveRequest } from '../types/leave';
import { HRQueryContext } from './hrDomainFoundation';
import { headcountService } from './headcountService';

export interface DailyWorkforceStatusSnapshot {
  date: string;
  totalWorkforce: number;
  activeCount: number;
  presentCount: number;
  lateCount: number;
  wfhCount: number;
  fieldCount: number;
  onLeaveCount: number;
  absentCount: number;
  notMarkedCount: number;
  presentRatePct: number;
  leaveRatePct: number;
  absenceRatePct: number;
}

export const workforceStatusEngine = {
  // Authoritative Daily Workforce Status Breakdown
  getDailyStatusSnapshot(
    dateStr: string,
    employees: Employee[],
    attendanceDaily: AttendanceDaily[],
    leaveRequests: LeaveRequest[],
    context?: HRQueryContext
  ): DailyWorkforceStatusSnapshot {
    const scopedEmps = headcountService.filterEmployees(employees, context);
    const total = scopedEmps.length;
    const scopedEmpIds = new Set(scopedEmps.map((e) => e.id));

    const activeCount = scopedEmps.filter(
      (e) => !e.status || e.status === 'Active' || e.status === 'Confirmed' || e.status === 'Probation'
    ).length;

    // Filter today's attendance for scoped employees
    const scopedAttendance = attendanceDaily.filter((a) => scopedEmpIds.has(a.employee_id));

    const presentCount = scopedAttendance.filter(
      (a) => a.status === 'Present' || a.status === 'Late' || a.status === 'WFH' || a.status === 'Checked Out'
    ).length;

    const lateCount = scopedAttendance.filter((a) => a.status === 'Late').length;
    const wfhCount = scopedAttendance.filter((a) => a.status === 'WFH').length;
    const fieldCount = 0;

    // Filter approved leave covering dateStr
    const onLeaveMatches = leaveRequests.filter(
      (l) => scopedEmpIds.has(l.employee_id) && l.status === 'Approved' && l.from_date <= dateStr && l.to_date >= dateStr
    ).length;

    const absentCount = Math.max(0, total - presentCount - onLeaveMatches);
    const notMarkedCount = Math.max(0, total - presentCount - onLeaveMatches - absentCount);

    const presentRatePct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    const leaveRatePct = total > 0 ? Math.round((onLeaveMatches / total) * 100) : 0;
    const absenceRatePct = total > 0 ? Math.round((absentCount / total) * 100) : 0;

    return {
      date: dateStr,
      totalWorkforce: total,
      activeCount,
      presentCount,
      lateCount,
      wfhCount,
      fieldCount,
      onLeaveCount: onLeaveMatches,
      absentCount,
      notMarkedCount,
      presentRatePct,
      leaveRatePct,
      absenceRatePct,
    };
  },
};
