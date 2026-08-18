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
    const currentUser = api.getCurrentUser();
    const employees = (api as any).getEmployees ? (api as any).getEmployees() : [];
    const empList = Array.isArray(employees) ? employees : [];

    // Match direct reports or department team members
    const teamMembers = empList.filter(
      (e) =>
        e.employment?.team_lead_id === currentUser.employee_id ||
        e.employment?.reporting_manager_id === currentUser.employee_id ||
        e.department_id === 'dept-eng'
    );

    const activeCount = teamMembers.length > 0 ? teamMembers.length : 3;
    const leaveCount = teamMembers.filter((e) => e.status === 'On Leave' || e.status === 'Onboarding').length;
    const presentCount = Math.max(1, activeCount - leaveCount);

    return {
      team_id: 'team-eng-01',
      team_name: 'Engineering & DevOps Squad',
      total_strength: activeCount,
      present_count: presentCount,
      absent_count: 0,
      late_count: 0,
      on_leave_count: leaveCount,
      wfh_count: 1,
      pending_approvals_count: 2,
      overdue_tasks_count: 0,
    };
  },

  getTeamMembers(): TlTeamMember[] {
    const currentUser = api.getCurrentUser();
    return [
      {
        id: 'emp-001',
        employee_id: 'WF-1004',
        name: 'Priya Sharma',
        email: 'priya.sharma@joycorporate.com',
        designation: 'Senior Software Engineer',
        department: 'Engineering & DevOps',
        shift_name: 'General Shift (09:00 - 18:00)',
        work_location: 'Coimbatore HQ Campus',
        today_status: 'Present',
        check_in_time: '09:02 AM',
        active_tasks_count: 2,
        overdue_tasks_count: 0,
        performance_score: 4.9,
      },
      {
        id: 'emp-1040',
        employee_id: 'EMP-1040',
        name: 'Priya Sundaram',
        email: 'priya.sundaram@joycorporate.com',
        designation: 'Senior Staff Frontend Architect',
        department: 'Engineering & DevOps',
        shift_name: 'General Shift (09:00 - 18:00)',
        work_location: 'Coimbatore HQ Campus',
        today_status: 'On Leave',
        check_in_time: undefined,
        active_tasks_count: 8,
        overdue_tasks_count: 0,
        performance_score: 5.0,
      },
      {
        id: 'emp-tl-001',
        employee_id: 'WF-1003',
        name: 'Deepa Subramanian',
        email: 'deepa.s@joycorporate.com',
        designation: 'Senior Lead Engineer',
        department: 'Engineering & DevOps',
        shift_name: 'General Shift (09:00 - 18:00)',
        work_location: 'Coimbatore HQ Campus',
        today_status: 'Present',
        check_in_time: '08:50 AM',
        active_tasks_count: 3,
        overdue_tasks_count: 0,
        performance_score: 4.8,
      },
    ];
  },

  getTeamAttendance(): TlAttendanceRow[] {
    return [
      { employee_id: 'WF-1004', employee_name: 'Priya Sharma', shift: 'General (09:00 - 18:00)', check_in: '09:02 AM', check_out: 'In Progress', working_hours: '06h 40m', overtime_hours: '00h 00m', status: 'Present', location: 'Coimbatore HQ (Geofence Verified)' },
      { employee_id: 'EMP-1040', employee_name: 'Priya Sundaram', shift: 'General (09:00 - 18:00)', check_in: 'N/A', check_out: 'N/A', working_hours: '00h 00m', overtime_hours: '00h 00m', status: 'On Leave', location: 'Onboarding Schedule' },
      { employee_id: 'WF-1003', employee_name: 'Deepa Subramanian', shift: 'General (09:00 - 18:00)', check_in: '08:50 AM', check_out: 'In Progress', working_hours: '06h 50m', overtime_hours: '00h 00m', status: 'Present', location: 'Coimbatore HQ (Geofence Verified)' },
    ];
  },

  getTeamLeaveRequests(): TlLeaveRequestItem[] {
    return [
      { id: 'lr-1040', request_code: 'LR-2026-01', employee_id: 'EMP-1040', employee_name: 'Priya Sundaram', leave_type: 'Onboarding Preparation', start_date: '2026-08-20', end_date: '2026-08-20', days_count: 1, reason: 'Joining formalities', submitted_date: '2026-08-15', status: 'Pending', conflict_warning: 'First day of onboarding.' },
    ];
  },

  getPendingApprovals(): TlApprovalItem[] {
    return [
      { id: 'app-301', request_code: 'REQ-WFH-2026-01', request_type: 'WFH', employee_name: 'Priya Sharma', submitted_date: '2026-08-16', details_summary: 'Hybrid WFH for Sprint Architecture Review (1 Day)', status: 'Pending' },
      { id: 'app-302', request_code: 'REQ-ONB-2026-02', request_type: 'Other', employee_name: 'Priya Sundaram', submitted_date: '2026-08-16', details_summary: 'Team Lead 1-on-1 & Codebase Introduction Task Verification', status: 'Pending' },
    ];
  },

  getTeamTasks(): TlTaskItem[] {
    return [
      { id: 'tsk-101', task_code: 'TSK-ENG-501', title: 'Complete Team Architecture Review', description: 'Review JoyHRMS ESS & TL portals with Staff Architect Priya Sundaram', assigned_to_name: 'Priya Sharma', assigned_to_id: 'WF-1004', priority: 'High', status: 'In Progress', due_date: '2026-08-21', progress_pct: 80, is_overdue: false },
      { id: 'tsk-102', task_code: 'TSK-ENG-502', title: 'Staff Frontend Architect Onboarding Setup', description: 'Assign Dev Environment, Repository Access, and Buddy Pair', assigned_to_name: 'Deepa Subramanian', assigned_to_id: 'WF-1003', priority: 'Critical', status: 'In Progress', due_date: '2026-08-20', progress_pct: 60, is_overdue: false },
    ];
  },

  getTeamGoals(): TlGoalItem[] {
    return [
      { id: 'gl-1', employee_name: 'Priya Sharma', title: 'Deliver 100% Zero-Defect Employee Portal & Live Realtime Sync', target_metric: '0 Defects', progress_pct: 95, weight_pct: 50, due_date: '2026-08-31', status: 'In Progress' },
    ];
  },

  getTeamTraining(): TlTrainingItem[] {
    return [
      { id: 'tr-1', employee_name: 'Priya Sundaram', course_title: 'WorkforceOS Enterprise Architecture & Security 2026', category: 'Compliance & Engineering', progress_pct: 100, is_mandatory: true, due_date: '2026-08-31', status: 'Completed' },
    ];
  },
};
