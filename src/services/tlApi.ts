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

const initialSummary: TlTeamSummary = {
  team_id: 'team-eng-01',
  team_name: 'Frontend & UI Engineering Team',
  total_strength: 24,
  present_count: 19,
  absent_count: 2,
  late_count: 2,
  on_leave_count: 1,
  wfh_count: 3,
  pending_approvals_count: 5,
  overdue_tasks_count: 4,
};

const initialTeamMembers: TlTeamMember[] = [
  { id: 'tm-101', employee_id: 'EMP-101', name: 'Rajesh Kumar', email: 'rajesh@workforceos.com', designation: 'Senior Principal Engineer', department: 'Engineering', shift_name: 'General Shift', work_location: 'MAA Campus', today_status: 'Present', check_in_time: '09:05 AM', check_out_time: undefined, active_tasks_count: 3, overdue_tasks_count: 1, performance_score: 4.8 },
  { id: 'tm-102', employee_id: 'EMP-102', name: 'Ananya Sen', email: 'ananya@workforceos.com', designation: 'Senior UI/UX Lead', department: 'Engineering', shift_name: 'General Shift', work_location: 'MAA Campus', today_status: 'Present', check_in_time: '08:55 AM', check_out_time: undefined, active_tasks_count: 2, overdue_tasks_count: 0, performance_score: 4.9 },
  { id: 'tm-103', employee_id: 'EMP-103', name: 'Karthik Raja', email: 'karthik@workforceos.com', designation: 'Software Engineer', department: 'Engineering', shift_name: 'General Shift', work_location: 'Hybrid WFH', today_status: 'WFH', check_in_time: '09:12 AM', check_out_time: undefined, active_tasks_count: 4, overdue_tasks_count: 2, performance_score: 4.2 },
  { id: 'tm-104', employee_id: 'EMP-104', name: 'Priya Sharma', email: 'priya@workforceos.com', designation: 'Frontend Engineer', department: 'Engineering', shift_name: 'General Shift', work_location: 'MAA Campus', today_status: 'On Leave', check_in_time: undefined, check_out_time: undefined, active_tasks_count: 1, overdue_tasks_count: 0, performance_score: 4.5 },
];

const initialAttendance: TlAttendanceRow[] = [
  { employee_id: 'EMP-101', employee_name: 'Rajesh Kumar', shift: 'General (09:00 - 18:00)', check_in: '09:05 AM', check_out: 'In Progress', working_hours: '06h 15m', overtime_hours: '00h 00m', status: 'Present', location: 'MAA Campus (Geofence Verified)' },
  { employee_id: 'EMP-102', employee_name: 'Ananya Sen', shift: 'General (09:00 - 18:00)', check_in: '08:55 AM', check_out: 'In Progress', working_hours: '06h 25m', overtime_hours: '00h 00m', status: 'Present', location: 'MAA Campus (Geofence Verified)' },
  { employee_id: 'EMP-103', employee_name: 'Karthik Raja', shift: 'General (09:00 - 18:00)', check_in: '09:12 AM', check_out: 'In Progress', working_hours: '06h 08m', overtime_hours: '00h 00m', status: 'WFH', location: 'Hybrid WFH Verified' },
  { employee_id: 'EMP-104', employee_name: 'Priya Sharma', shift: 'General (09:00 - 18:00)', check_in: 'N/A', check_out: 'N/A', working_hours: '00h 00m', overtime_hours: '00h 00m', status: 'On Leave', location: 'On Approved Leave' },
];

const initialLeaveRequests: TlLeaveRequestItem[] = [
  { id: 'lr-201', request_code: 'LR-2026-88', employee_id: 'EMP-103', employee_name: 'Karthik Raja', leave_type: 'Casual Leave (CL)', start_date: '2026-08-18', end_date: '2026-08-18', days_count: 1, reason: 'Personal work', submitted_date: '2026-08-11', status: 'Pending', conflict_warning: '2 team members already on leave on 18 Aug.' },
];

const initialApprovals: TlApprovalItem[] = [
  { id: 'app-301', request_code: 'REQ-WFH-2026-99', request_type: 'WFH', employee_name: 'Karthik Raja', submitted_date: '2026-08-11', details_summary: 'Hybrid WFH request for Release Sprint Verification (1 Day)', status: 'Pending' },
  { id: 'app-302', request_code: 'REQ-ATT-2026-44', request_type: 'AttendanceRegularization', employee_name: 'Rajesh Kumar', submitted_date: '2026-08-10', details_summary: 'Missed punch out on 10 Aug due to client call', status: 'Pending' },
];

const initialTasks: TlTaskItem[] = [
  { id: 'tsk-101', task_code: 'TSK-ENG-401', title: 'Implement TL Portal Visual Dashboard Cards', description: 'Build team strength, attendance, leave and approval widgets', assigned_to_name: 'Rajesh Kumar', assigned_to_id: 'EMP-101', priority: 'High', status: 'In Progress', due_date: '2026-08-14', progress_pct: 75, is_overdue: false },
  { id: 'tsk-102', task_code: 'TSK-ENG-402', title: 'Refactor ESS Leave Balance Calculation Engine', description: 'Ensure zero hardcoded values and strict backend RLS enforcement', assigned_to_name: 'Karthik Raja', assigned_to_id: 'EMP-103', priority: 'Critical', status: 'Assigned', due_date: '2026-08-10', progress_pct: 20, is_overdue: true },
];

const initialGoals: TlGoalItem[] = [
  { id: 'gl-1', employee_name: 'Rajesh Kumar', title: 'Deliver 100% On-Time WorkForceOS ESS & TL Master Modules', target_metric: '0 High Defects', progress_pct: 90, weight_pct: 40, due_date: '2026-08-31', status: 'In Progress' },
];

const initialTraining: TlTrainingItem[] = [
  { id: 'tr-1', employee_name: 'Karthik Raja', course_title: 'POSH Statutory Workplace Compliance 2026', category: 'Compliance', progress_pct: 100, is_mandatory: true, due_date: '2026-08-31', status: 'Completed' },
];

export const tlApi = {
  getTeamSummary(): TlTeamSummary {
    return initialSummary;
  },
  getTeamMembers(): TlTeamMember[] {
    return initialTeamMembers;
  },
  getTeamAttendance(): TlAttendanceRow[] {
    return initialAttendance;
  },
  getTeamLeaveRequests(): TlLeaveRequestItem[] {
    return initialLeaveRequests;
  },
  getPendingApprovals(): TlApprovalItem[] {
    return initialApprovals;
  },
  getTeamTasks(): TlTaskItem[] {
    return initialTasks;
  },
  getTeamGoals(): TlGoalItem[] {
    return initialGoals;
  },
  getTeamTraining(): TlTrainingItem[] {
    return initialTraining;
  },
};
