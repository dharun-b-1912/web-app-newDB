export interface TlTeamMember {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  shift_name: string;
  work_location: string;
  today_status: 'Present' | 'Absent' | 'Late' | 'On Leave' | 'WFH' | 'Half Day';
  check_in_time?: string;
  check_out_time?: string;
  active_tasks_count: number;
  overdue_tasks_count: number;
  performance_score: number;
}

export interface TlTeamSummary {
  team_id: string;
  team_name: string;
  total_strength: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  on_leave_count: number;
  wfh_count: number;
  pending_approvals_count: number;
  overdue_tasks_count: number;
}

export interface TlAttendanceRow {
  employee_id: string;
  employee_name: string;
  shift: string;
  check_in: string;
  check_out: string;
  working_hours: string;
  overtime_hours: string;
  status: 'Present' | 'Late' | 'Absent' | 'WFH' | 'On Leave' | 'Missing Punch';
  location: string;
  regularization_status?: 'Pending' | 'Approved' | 'None';
}

export interface TlLeaveRequestItem {
  id: string;
  request_code: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  submitted_date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  conflict_warning?: string;
}

export interface TlApprovalItem {
  id: string;
  request_code: string;
  request_type: 'Leave' | 'WFH' | 'AttendanceRegularization' | 'Overtime' | 'Expense' | 'Travel' | 'Other';
  employee_name: string;
  submitted_date: string;
  details_summary: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface TlTaskItem {
  id: string;
  task_code: string;
  title: string;
  description: string;
  assigned_to_name: string;
  assigned_to_id: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Backlog' | 'Assigned' | 'In Progress' | 'Blocked' | 'Under Review' | 'Completed';
  due_date: string;
  progress_pct: number;
  is_overdue: boolean;
}

export interface TlGoalItem {
  id: string;
  employee_name: string;
  title: string;
  target_metric: string;
  progress_pct: number;
  weight_pct: number;
  due_date: string;
  status: 'In Progress' | 'Completed' | 'At Risk';
}

export interface TlTrainingItem {
  id: string;
  employee_name: string;
  course_title: string;
  category: string;
  progress_pct: number;
  is_mandatory: boolean;
  due_date: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Overdue';
}
