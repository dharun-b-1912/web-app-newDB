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
import { api } from './api';
import { attendanceRosterService } from './attendance/attendanceRosterService';
import { attendanceApi } from './attendanceApi';
import { leaveApi } from './leaveApi';

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
  { id: 'g-1', title: 'Complete Joy PeopleHR Microservices Migration to Cloud Run', target_metric: '100% Services Deployed', progress_pct: 85, weight_pct: 40, due_date: '2026-09-30', status: 'In Progress' },
  { id: 'g-2', title: 'Achieve 99.9% System Uptime and Zero High-Severity Defect SLA', target_metric: '99.9% Uptime', progress_pct: 100, weight_pct: 30, due_date: '2026-08-31', status: 'Completed' },
];

const initialCourses: EssCourseItem[] = [
  { id: 'c-101', title: 'POSH Statutory Workplace Compliance 2026', category: 'Compliance', progress_pct: 100, is_mandatory: true, due_date: '2026-08-31', certificate_available: true, status: 'Completed' },
  { id: 'c-102', title: 'Microservices & Enterprise Architecture Best Practices', category: 'Technical', progress_pct: 60, is_mandatory: false, due_date: '2026-09-15', certificate_available: false, status: 'In Progress' },
];

const initialDocuments: EssDocumentItem[] = [
  { id: 'doc-1', title: 'Enterprise Employment Appointment Letter', category: 'Employment', date_uploaded: '2025-01-15', requires_acknowledgement: false, acknowledged: true, download_url: '#' },
  { id: 'doc-2', title: 'Joy PeopleHR Information Security Policy 2026', category: 'Policy', date_uploaded: '2026-01-01', requires_acknowledgement: true, acknowledged: true, download_url: '#' },
];

export const essApi = {
  getAttendanceState(): EssAttendanceState {
    const user = api.getCurrentUser();
    const todayStr = new Date().toISOString().split('T')[0];
    const empId = user?.employee_id || user?.id || 'WF-1001';
    const orgId = user?.organization_id || 'org-joy-01';

    const roster = attendanceRosterService.getRosterForEmployeeOnDate(empId, todayStr, orgId);
    const shift = attendanceRosterService.getShiftById(roster.shift_id, orgId) || {
      shift_name: roster.shift_name,
      shift_code: roster.shift_code,
      start_time: '09:00',
      end_time: '18:00',
    };

    const isNight = roster.shift_code.includes('NGT');
    const shiftTimings = roster.is_weekly_off
      ? 'Weekly Off (Rest Day)'
      : `${shift.start_time || '09:00 AM'} – ${shift.end_time || '06:00 PM'} ${isNight ? '(Next Day)' : ''}`;

    const dailyAtt = attendanceApi.getDailyAttendance(todayStr).find(a => a.employee_id === empId);

    return {
      is_clocked_in: dailyAtt?.status === 'Present' || (Boolean(dailyAtt?.first_check_in) && !dailyAtt?.last_check_out),
      clock_in_time: dailyAtt?.first_check_in || '09:10 AM',
      today_hours: dailyAtt?.gross_working_minutes ? `${Math.floor(dailyAtt.gross_working_minutes / 60)}h ${dailyAtt.gross_working_minutes % 60}m` : '00h 00m',
      shift_name: `${roster.shift_name} (${roster.shift_code})`,
      shift_timing: shiftTimings,
      location_status: 'Inside Office Geofence (HQ Campus)',
    };
  },
  getLeaveBalances(): EssLeaveBalanceItem[] {
    const leaveTypes = leaveApi.getLeaveTypes().filter(t => t.is_active);
    if (leaveTypes.length > 0) {
      return leaveTypes.map(t => ({
        leave_type: `${t.name} (${t.code})`,
        available: t.annual_quota || 12,
        used: 0,
        pending: 0,
        total_entitlement: t.annual_quota || 12,
      }));
    }
    return [
      { leave_type: 'Casual Leave (CL)', available: 12, used: 0, pending: 0, total_entitlement: 12 },
      { leave_type: 'Sick Leave (SL)', available: 12, used: 0, pending: 0, total_entitlement: 12 },
      { leave_type: 'Earned Leave (EL)', available: 18, used: 0, pending: 0, total_entitlement: 18 },
    ];
  },
  getPayslips(): EssPayslipItem[] {
    return initialPayslips;
  },
  getRequests(): EssRequestItem[] {
    const user = api.getCurrentUser();
    const empId = user?.employee_id || user?.id;
    const leaveReqs = leaveApi.getLeaveRequests().filter(r => !empId || r.employee_id === empId);
    if (leaveReqs.length > 0) {
      return leaveReqs.map(r => ({
        id: r.id,
        request_code: r.request_code || `REQ-${r.id}`,
        request_type: 'Leave',
        subject: `${r.leave_type_name} (${r.from_date} to ${r.to_date})`,
        submitted_date: r.submitted_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: r.status as any,
        current_approver: r.manager_name || 'Reporting Manager',
      }));
    }
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
    const user = api.getCurrentUser();
    const employees = api.getEmployeesSync();
    const emp = employees.find(e => e.id === user?.employee_id || e.work_email === user?.email) || employees[0];
    const fullName = emp ? (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()) : (user?.name || 'Authorized User');
    const email = emp?.work_email || user?.email || 'user@joypeoplehr.com';
    const designation = emp?.designation_title || (user?.roles || [])[0]?.name || 'Staff Member';
    const department = emp?.department_name || 'Enterprise Operations';

    return {
      employee_id: emp?.employee_code || user?.employee_id || (user?.id ? `WF-${user.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}` : 'WF-1001'),
      full_name: fullName,
      email: email,
      designation: designation === 'Super Admin' ? 'Platform Super Admin' : designation,
      department: department,
      joining_date: emp?.employment?.doj || (emp?.employment as any)?.joining_date || '2024-01-01',
      manager_name: emp?.employment?.reporting_manager_name || (emp?.employment as any)?.reports_to_name || 'Executive Management',
      phone: emp?.profile?.phone || user?.phone || '+91 98401 00000',
      emergency_contact: emp?.profile?.emergency_contact_phone || 'Not Specified',
      bank_name: (emp as any)?.bank_details?.bank_name || 'HDFC Bank Ltd',
      account_number_masked: 'XXXX XXXX 4521',
    };
  },
};
