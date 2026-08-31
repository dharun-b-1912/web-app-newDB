import {
  TlTeamMember,
  TlTeamSummary,
  TlAttendanceRow,
  TlLeaveRequestItem,
  TlApprovalItem,
  TlTaskItem,
  TlGoalItem,
  TlTrainingItem,
} from '../types/tl';
import { api } from './api';
import { attendanceApi } from './attendanceApi';
import { leaveApi } from './leaveApi';

export const tlApi = {
  getTeamSummary(): TlTeamSummary {
    const employees = api.getEmployeesSync();
    const activeCount = employees.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const recs = attendanceApi.getDailyAttendance(todayStr);
    const presentCount = recs.filter(r => r.status === 'Present' || (r as any).first_punch_time || (r as any).in_time).length;

    return {
      team_id: 'team-eng-01',
      team_name: 'Engineering & People Ops Squad',
      total_strength: activeCount,
      present_count: presentCount,
      absent_count: Math.max(0, activeCount - presentCount),
      late_count: recs.filter(r => (r.late_minutes || 0) > 0).length,
      on_leave_count: recs.filter(r => (r.status as string) === 'Leave' || (r.status as string) === 'On Leave').length,
      wfh_count: 0,
      pending_approvals_count: 0,
      overdue_tasks_count: 0,
    };
  },

  getTeamMembers(): TlTeamMember[] {
    const employees = api.getEmployeesSync();
    const todayStr = new Date().toISOString().split('T')[0];
    const recs = attendanceApi.getDailyAttendance(todayStr);

    return employees.map((emp) => {
      const rec = recs.find((r) => r.employee_id === emp.id);
      const statusStr = rec?.status === 'Present' || rec?.status === 'Late' || rec?.status === 'Absent' || rec?.status === 'Half Day' || rec?.status === 'WFH' ? rec.status : 'Present';
      return {
        id: emp.id,
        employee_id: emp.employee_code || 'WF-EMP',
        name: emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || (emp as any).name || 'Employee',
        email: emp.work_email || 'staff@joycorporate.com',
        designation: emp.designation_title || 'Software Engineer',
        department: emp.department_name || 'Engineering',
        shift_name: 'General Shift (09:00 - 18:00)',
        work_location: emp.branch_name || 'Coimbatore HQ Campus',
        today_status: statusStr as any,
        check_in_time: (rec as any)?.first_punch_time || (rec as any)?.in_time,
        active_tasks_count: 2,
        overdue_tasks_count: 0,
        performance_score: 4.9,
      };
    });
  },

  getTeamAttendance(): TlAttendanceRow[] {
    const todayStr = new Date().toISOString().split('T')[0];
    const recs = attendanceApi.getDailyAttendance(todayStr);

    return recs.map((rec) => {
      const inTime = (rec as any).first_punch_time || (rec as any).in_time || 'N/A';
      const outTime = (rec as any).last_punch_time || (rec as any).out_time || (inTime !== 'N/A' ? 'In Progress' : 'N/A');
      return {
        employee_id: rec.employee_code || rec.employee_id,
        employee_name: rec.employee_name,
        shift: rec.shift_name || 'General (09:00 - 18:00)',
        check_in: inTime,
        check_out: outTime,
        working_hours: rec.net_working_minutes ? `${Math.floor(rec.net_working_minutes / 60)}h ${rec.net_working_minutes % 60}m` : '00h 00m',
        overtime_hours: rec.overtime_minutes ? `${Math.floor(rec.overtime_minutes / 60)}h ${rec.overtime_minutes % 60}m` : '00h 00m',
        status: (rec.status as any) || 'Present',
        location: 'Coimbatore HQ (Geofence Verified)',
      };
    });
  },

  getTeamLeaveRequests(): TlLeaveRequestItem[] {
    return [];
  },

  getPendingApprovals(): TlApprovalItem[] {
    return [];
  },

  getTeamTasks(): TlTaskItem[] {
    return [];
  },

  getTeamGoals(): TlGoalItem[] {
    return [];
  },

  getTeamTrainings(): TlTrainingItem[] {
    return [];
  },

  getTeamTraining(): TlTrainingItem[] {
    return [];
  },
};
