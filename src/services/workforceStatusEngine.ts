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
    const scopedAttendance = attendanceDaily.filter((a) =>
      scopedEmpIds.has(a.employee_id) || (a.employee_code && scopedEmps.some(e => e.employee_code === a.employee_code))
    );

    const attMap = new Map<string, AttendanceDaily>();
    scopedAttendance.forEach((a) => {
      if (a.employee_id) attMap.set(a.employee_id.toLowerCase(), a);
      if (a.employee_code) attMap.set(a.employee_code.toLowerCase(), a);
    });

    let presentCount = 0;
    let lateCount = 0;
    let wfhCount = 0;
    let absentCount = 0;
    let notMarkedCount = 0;
    let onLeaveMatches = 0;

    const leaveEmpIds = new Set(
      leaveRequests
        .filter((l) => scopedEmpIds.has(l.employee_id) && l.status === 'Approved' && l.from_date <= dateStr && l.to_date >= dateStr)
        .map((l) => l.employee_id.toLowerCase())
    );

    scopedEmps.forEach((emp) => {
      const isLeave = leaveEmpIds.has(emp.id.toLowerCase()) || (emp.status || '').toLowerCase() === 'on leave';
      if (isLeave) {
        onLeaveMatches++;
        return;
      }

      const rec = attMap.get(emp.id.toLowerCase()) || attMap.get((emp.employee_code || '').toLowerCase());
      if (rec) {
        if (rec.status === 'On Leave') {
          onLeaveMatches++;
        } else if (rec.status === 'WFH') {
          wfhCount++;
          presentCount++;
        } else if (rec.status === 'Absent') {
          absentCount++;
        } else if (
          rec.status === 'Present' ||
          rec.status === 'Late' ||
          rec.status === 'Checked Out' ||
          rec.status === 'Early Checkout' ||
          rec.status === 'Half Day' ||
          rec.status === 'Overtime' ||
          Boolean(rec.first_check_in)
        ) {
          presentCount++;
          if (rec.late_minutes > 0 || rec.status === 'Late') {
            lateCount++;
          }
        } else {
          notMarkedCount++;
        }
      } else {
        notMarkedCount++;
      }
    });

    const presentRatePct = total > 0 ? Math.min(100, Math.round((presentCount / total) * 100)) : 0;
    const leaveRatePct = total > 0 ? Math.min(100, Math.round((onLeaveMatches / total) * 100)) : 0;
    const absenceRatePct = total > 0 ? Math.min(100, Math.round((absentCount / total) * 100)) : 0;

    return {
      date: dateStr,
      totalWorkforce: total,
      activeCount,
      presentCount,
      lateCount,
      wfhCount,
      fieldCount: 0,
      onLeaveCount: onLeaveMatches,
      absentCount,
      notMarkedCount,
      presentRatePct,
      leaveRatePct,
      absenceRatePct,
    };
  },
};
