import {
  EssAttendanceState,
  EssLeaveBalanceItem,
  EssPayslipItem,
  EssRequestItem,
  EssGoalItem,
  EssCourseItem,
  EssDocumentItem,
  EssProfileData,
} from '../types/ess';

const initialAttendance: EssAttendanceState = {
  is_clocked_in: false,
  clock_in_time: undefined,
  today_hours: '00h 00m',
  shift_name: 'General Day Shift',
  shift_timing: '09:00 AM – 06:00 PM',
  location_status: 'Inside Office Geofence (MAA Campus)',
};

const initialLeaveBalances: EssLeaveBalanceItem[] = [
  { leave_type: 'Casual Leave (CL)', available: 8, used: 4, pending: 1, total_entitlement: 12 },
  { leave_type: 'Sick Leave (SL)', available: 10, used: 2, pending: 0, total_entitlement: 12 },
  { leave_type: 'Earned Leave (EL)', available: 14, used: 4, pending: 0, total_entitlement: 18 },
];

const initialPayslips: EssPayslipItem[] = [
  { id: 'ps-2026-07', month_year: 'July 2026', gross_salary: 150000, deductions: 18000, net_salary: 132000, issue_date: '2026-07-31', download_url: '#' },
  { id: 'ps-2026-06', month_year: 'June 2026', gross_salary: 150000, deductions: 18000, net_salary: 132000, issue_date: '2026-06-30', download_url: '#' },
];

const initialRequests: EssRequestItem[] = [
  { id: 'req-101', request_code: 'REQ-WFH-2026-08', request_type: 'WFH', subject: 'Hybrid WFH Request for Release Deployment Review', submitted_date: '2026-08-10', status: 'Approved', current_approver: 'Anand Viswanathan' },
  { id: 'req-102', request_code: 'REQ-LEAVE-2026-14', request_type: 'Leave', subject: 'Casual Leave Application (1 Day)', submitted_date: '2026-08-08', status: 'Approved', current_approver: 'Anand Viswanathan' },
];

const initialGoals: EssGoalItem[] = [
  { id: 'g-1', title: 'Complete WorkForceOS Microservices Migration to Cloud Run', target_metric: '100% Services Deployed', progress_pct: 85, weight_pct: 40, due_date: '2026-09-30', status: 'In Progress' },
  { id: 'g-2', title: 'Achieve 99.9% System Uptime and Zero High-Severity Defect SLA', target_metric: '99.9% Uptime', progress_pct: 100, weight_pct: 30, due_date: '2026-08-31', status: 'Completed' },
];

const initialCourses: EssCourseItem[] = [
  { id: 'c-101', title: 'POSH Statutory Workplace Compliance 2026', category: 'Compliance', progress_pct: 100, is_mandatory: true, due_date: '2026-08-31', certificate_available: true, status: 'Completed' },
  { id: 'c-102', title: 'Microservices & Enterprise Architecture Best Practices', category: 'Technical', progress_pct: 60, is_mandatory: false, due_date: '2026-09-15', certificate_available: false, status: 'In Progress' },
];

const initialDocuments: EssDocumentItem[] = [
  { id: 'doc-1', title: 'Enterprise Employment Appointment Letter', category: 'Employment', date_uploaded: '2025-01-15', requires_acknowledgement: false, acknowledged: true, download_url: '#' },
  { id: 'doc-2', title: 'WorkForceOS Information Security Policy 2026', category: 'Policy', date_uploaded: '2026-01-01', requires_acknowledgement: true, acknowledged: true, download_url: '#' },
];

export const essApi = {
  getAttendanceState(): EssAttendanceState {
    return initialAttendance;
  },
  getLeaveBalances(): EssLeaveBalanceItem[] {
    return initialLeaveBalances;
  },
  getPayslips(): EssPayslipItem[] {
    return initialPayslips;
  },
  getRequests(): EssRequestItem[] {
    return initialRequests;
  },
  getGoals(): EssGoalItem[] {
    return initialGoals;
  },
  getCourses(): EssCourseItem[] {
    return initialCourses;
  },
  getDocuments(): EssDocumentItem[] {
    return initialDocuments;
  },
  getProfile(): EssProfileData {
    return {
      employee_id: 'EMP-101',
      full_name: 'Rajesh Kumar',
      email: 'rajesh@workforceos.com',
      designation: 'Senior Principal Engineer',
      department: 'Engineering & DevOps',
      joining_date: '2025-01-15',
      manager_name: 'Anand Viswanathan (VP HR & Operations)',
      phone: '+91 98765 43210',
      emergency_contact: 'Sunita Kumar (Spouse) - +91 98765 00000',
      bank_name: 'HDFC Bank Ltd (Tidel Park Branch)',
      account_number_masked: 'XXXX XXXX 8819',
    };
  },
};
