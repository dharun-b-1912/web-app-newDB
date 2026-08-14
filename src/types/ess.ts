export interface EssAttendanceState {
  is_clocked_in: boolean;
  clock_in_time?: string;
  today_hours: string;
  shift_name: string;
  shift_timing: string;
  location_status: string;
}

export interface EssLeaveBalanceItem {
  leave_type: string;
  available: number;
  used: number;
  pending: number;
  total_entitlement: number;
}

export interface EssPayslipItem {
  id: string;
  month_year: string;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  issue_date: string;
  download_url: string;
}

export interface EssRequestItem {
  id: string;
  request_code: string;
  request_type: 'Leave' | 'WFH' | 'AttendanceRegularization' | 'Overtime' | 'Travel' | 'Expense' | 'SalaryAdvance' | 'Loan' | 'Document' | 'Helpdesk';
  subject: string;
  submitted_date: string;
  status: 'Draft' | 'Submitted' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Completed';
  current_approver: string;
}

export interface EssGoalItem {
  id: string;
  title: string;
  target_metric: string;
  progress_pct: number;
  weight_pct: number;
  due_date: string;
  status: 'In Progress' | 'Completed' | 'At Risk';
}

export interface EssCourseItem {
  id: string;
  title: string;
  category: string;
  progress_pct: number;
  is_mandatory: boolean;
  due_date: string;
  certificate_available: boolean;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface EssDocumentItem {
  id: string;
  title: string;
  category: string;
  date_uploaded: string;
  requires_acknowledgement: boolean;
  acknowledged: boolean;
  download_url: string;
}

export interface EssProfileData {
  employee_id: string;
  full_name: string;
  email: string;
  designation: string;
  department: string;
  joining_date: string;
  manager_name: string;
  phone: string;
  emergency_contact: string;
  bank_name: string;
  account_number_masked: string;
}
