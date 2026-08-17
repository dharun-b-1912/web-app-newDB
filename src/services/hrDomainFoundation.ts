import { Employee, Department, Branch, Location, Designation } from '../types';

export interface MetricResponse<T> {
  value: T;
  previousValue?: T;
  change?: number;
  changePercent?: number;
  period: string;
  source: 'Employee Master' | 'Attendance' | 'Leave' | 'Payroll' | 'ATS' | 'Compliance' | 'Organization';
  lastUpdated: string;
  dataAvailable: boolean;
}

export interface HRQueryContext {
  organizationId?: string;
  companyId?: string;
  departmentId?: string;
  locationId?: string;
  branchId?: string;
  managerId?: string;
  employmentType?: string;
  workMode?: string;
  status?: string;
  search?: string;
  period?: string; // 'this_month' | 'prev_month' | 'qtd' | 'prev_quarter' | 'ytd' | 'prev_year' | 'custom'
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
  timezone?: string;
}

export interface PointInTimeFilter {
  asOfDate: string;
}

export interface EmploymentHistoryEntry {
  id: string;
  employee_id: string;
  effective_from: string;
  effective_to?: string;
  department_id?: string;
  department_name?: string;
  designation_id?: string;
  designation_title?: string;
  manager_id?: string;
  manager_name?: string;
  location_id?: string;
  location_name?: string;
  employment_type?: string;
  work_mode?: string;
  change_type: 'Joined' | 'Transfer' | 'Promotion' | 'Manager Change' | 'Designation Change' | 'Exit';
  changed_by: string;
  changed_at: string;
  reason?: string;
}

export const HR_TIMEZONES = {
  DEFAULT: 'Asia/Kolkata',
};
