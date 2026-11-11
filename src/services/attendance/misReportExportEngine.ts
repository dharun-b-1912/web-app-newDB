/**
 * JOY PeopleHR — Unified HR Intelligence & Workforce MIS Export Engine
 * ---------------------------------------------------------------------------
 * Report-specific Excel (.xlsx), PDF (.pdf), and CSV (.csv) engine with:
 * - Strict report scoping (Daily Attendance -> 1 worksheet by default)
 * - Explicit Consolidated MIS section selector
 * - Unified UI / Excel / CSV / PDF filter + KPI reconciliation
 * - Strict tenant isolation & zero fabricated sample fallbacks
 * - Persistent audit logging into `mis_delivery_audit_logs`
 */

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { supabase } from '../../lib/supabase';
import type {
  DailyWorkforceMisReport,
  DepartmentShiftReportRow,
  EmployeeAttendanceLedgerRecord,
  HrExceptionItem,
  MonthlyEmployeeSummaryRow,
  MonthlyHrMisReport,
  OvertimeRequestDetailRow,
  WeeklyEmployeeSummaryRow,
  WeeklyHrMisReport,
} from './hrIntelligenceMisEngine';
import type {
  EmployeeOvertimeGovernanceRecord,
  OvertimeGovernanceSummary,
} from './overtimeGovernanceService';
import { computeSha256 } from './attendanceMisDeliveryService';

export type MisReportType =
  | 'OVERVIEW'
  | 'DAILY_ATTENDANCE'
  | 'WEEKLY_MIS'
  | 'MONTHLY_HR_MIS'
  | 'OVERTIME_GOVERNANCE'
  | 'DEPARTMENTS_SHIFTS'
  | 'HR_EXCEPTIONS'
  | 'CONSOLIDATED_MIS';

export type MisSingleReportType = Exclude<MisReportType, 'CONSOLIDATED_MIS'>;
export type MisExportFormat = 'EXCEL' | 'PDF' | 'CSV';
export type MisExportScope = 'CURRENT_REPORT' | 'CONSOLIDATED_WORKBOOK';

export interface MisExportFilters {
  date_from: string;
  date_to: string;
  department_id: string; // 'ALL' or department name/id
  shift_id: string; // 'ALL' or shift name/id
  attendance_status: string; // 'ALL' or PRESENT/ABSENT/ON_LEAVE/LATE/MISSING_PUNCH/APPROVED/PENDING/REJECTED/OPEN
  search_query: string;
}

export interface MisExportRequest extends MisExportFilters {
  report_type: MisReportType;
  company_id: string;
  company_name: string;
  generated_by: string;
  requested_format: MisExportFormat;
  requested_scope: MisExportScope;
  consolidated_sections?: MisSingleReportType[];
}

export interface MisSourceDataset {
  organizationId: string;
  companyName: string;
  daily: DailyWorkforceMisReport | null;
  weekly: WeeklyHrMisReport | null;
  monthly: MonthlyHrMisReport | null;
  overtimeSummary: OvertimeGovernanceSummary | null;
  overtimeLedger: OvertimeRequestDetailRow[];
  departmentShifts: DepartmentShiftReportRow[];
  exceptions: HrExceptionItem[];
}

export interface ReconciledKpiCard {
  label: string;
  value: string;
  numericValue?: number;
  sublabel?: string;
}

export interface FilteredMisDataset {
  reportType: MisReportType;
  reportTitle: string;
  periodLabel: string;
  filtersAppliedText: string;
  dailyRows: EmployeeAttendanceLedgerRecord[];
  weeklyEmployeeRows: WeeklyEmployeeSummaryRow[];
  weeklyTrendRows: WeeklyHrMisReport['dailyAttendanceTrend'];
  monthlyEmployeeRows: MonthlyEmployeeSummaryRow[];
  monthlyDeptRows: MonthlyHrMisReport['departmentPerformance'];
  overtimeGovernanceRows: EmployeeOvertimeGovernanceRecord[];
  overtimeLedgerRows: OvertimeRequestDetailRow[];
  departmentShiftRows: DepartmentShiftReportRow[];
  exceptionRows: HrExceptionItem[];
  kpis: ReconciledKpiCard[];
  summaryTotals: {
    headcount: number;
    present: number;
    absent: number;
    onLeave: number;
    late: number;
    earlyDeparture: number;
    missingPunches: number;
    attendanceRatePct: number;
    approvedOtHours: number;
    pendingOtHours: number;
    rejectedOtHours: number;
    exceptionCount: number;
  };
  recordCount: number;
}

export interface MisExportArtifact {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  sha256Checksum: string;
  reportType: MisReportType;
  reportTitle: string;
  recordCount: number;
  worksheetNames?: string[];
  pageCount?: number;
}

export const REPORT_DISPLAY_NAMES: Record<MisReportType, string> = {
  OVERVIEW: 'Executive Overview MIS',
  DAILY_ATTENDANCE: 'Daily Attendance MIS',
  WEEKLY_MIS: 'Weekly Workforce MIS',
  MONTHLY_HR_MIS: 'Monthly HR MIS',
  OVERTIME_GOVERNANCE: 'Overtime Governance MIS',
  DEPARTMENTS_SHIFTS: 'Departments & Shifts MIS',
  HR_EXCEPTIONS: 'HR Exceptions & Compliance MIS',
  CONSOLIDATED_MIS: 'Consolidated Workforce MIS Workbook',
};

export const ALL_CONSOLIDATED_SECTIONS: Array<{ id: MisSingleReportType; label: string }> = [
  { id: 'OVERVIEW', label: 'Executive Overview' },
  { id: 'DAILY_ATTENDANCE', label: 'Daily Attendance' },
  { id: 'WEEKLY_MIS', label: 'Weekly MIS' },
  { id: 'MONTHLY_HR_MIS', label: 'Monthly HR MIS' },
  { id: 'OVERTIME_GOVERNANCE', label: 'Overtime Governance' },
  { id: 'DEPARTMENTS_SHIFTS', label: 'Departments & Shifts' },
  { id: 'HR_EXCEPTIONS', label: 'HR Exceptions' },
];

// ============================================================================
// Security / Tenant Isolation + Filtering Helpers
// ============================================================================

export function assertTenantIsolation(requestCompanyId: string, source: MisSourceDataset): void {
  const reqId = String(requestCompanyId || '').trim();
  const srcId = String(source.organizationId || source.daily?.organizationId || source.weekly?.organizationId || source.monthly?.organizationId || '').trim();
  if (reqId && srcId && reqId !== srcId) {
    throw new Error(
      `Tenant Isolation Violation: requested company (${reqId}) does not match dataset organization (${srcId}).`
    );
  }
}

function norm(val: unknown): string {
  return String(val ?? '').trim().toLowerCase();
}

function matchesCommonFilter(
  row: {
    department?: string;
    shift?: string;
    employeeName?: string;
    name?: string;
    employeeCode?: string;
    employeeId?: string;
    status?: string;
    warningStatus?: string;
    exceptionStatus?: string;
    missingPunchStatus?: string;
    lateDurationMinutes?: number;
    date?: string;
    attendanceDate?: string;
    workDate?: string;
    detectedAt?: string;
  },
  filters: MisExportFilters,
  options?: { ignoreStatus?: boolean; ignoreDate?: boolean }
): boolean {
  if (filters.department_id && filters.department_id !== 'ALL') {
    if (norm(row.department) !== norm(filters.department_id)) return false;
  }
  if (filters.shift_id && filters.shift_id !== 'ALL') {
    const rowShift = norm(row.shift);
    const wantedShift = norm(filters.shift_id);
    if (rowShift && rowShift !== wantedShift && !rowShift.includes(wantedShift)) return false;
    if (!rowShift) return false;
  }
  if (filters.search_query && filters.search_query.trim()) {
    const q = norm(filters.search_query);
    const hay = [row.employeeName, row.name, row.employeeCode, row.employeeId, row.department, row.shift]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (!options?.ignoreDate && filters.date_from && filters.date_to) {
    const d = row.attendanceDate || row.workDate || row.date || row.detectedAt;
    if (d && (d < filters.date_from || d > filters.date_to)) return false;
  }
  if (!options?.ignoreStatus && filters.attendance_status && filters.attendance_status !== 'ALL') {
    const wanted = filters.attendance_status.toUpperCase();
    const rowStatus = String(row.status || row.warningStatus || '').toUpperCase();
    if (wanted === 'LATE') {
      if (!(Number(row.lateDurationMinutes || 0) > 0 || rowStatus === 'LATE')) return false;
    } else if (wanted === 'MISSING_PUNCH') {
      const mp = String(row.missingPunchStatus || '').toUpperCase();
      const ex = String(row.exceptionStatus || '').toUpperCase();
      if (!mp.includes('MISSING') && !ex.includes('MISSING') && rowStatus !== 'MISSING_PUNCH') return false;
    } else if (rowStatus !== wanted) {
      return false;
    }
  }
  return true;
}

export function buildFiltersAppliedLabel(filters: MisExportFilters): string {
  const parts: string[] = [];
  parts.push(
    filters.date_from === filters.date_to
      ? `Date: ${filters.date_to}`
      : `Period: ${filters.date_from} to ${filters.date_to}`
  );
  if (filters.department_id && filters.department_id !== 'ALL') parts.push(`Dept: ${filters.department_id}`);
  if (filters.shift_id && filters.shift_id !== 'ALL') parts.push(`Shift: ${filters.shift_id}`);
  if (filters.attendance_status && filters.attendance_status !== 'ALL') parts.push(`Status: ${filters.attendance_status}`);
  if (filters.search_query && filters.search_query.trim()) parts.push(`Search: "${filters.search_query.trim()}"`);
  return parts.join(' | ');
}

function formatMinutesLabel(mins: number | null | undefined): string {
  if (mins === null || mins === undefined) return '—';
  return `${mins}m`;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildFilteredMisDataset(
  request: MisExportRequest,
  source: MisSourceDataset
): FilteredMisDataset {
  assertTenantIsolation(request.company_id, source);

  const reportType = request.report_type;
  const filters: MisExportFilters = {
    date_from: request.date_from,
    date_to: request.date_to,
    department_id: request.department_id || 'ALL',
    shift_id: request.shift_id || 'ALL',
    attendance_status: request.attendance_status || 'ALL',
    search_query: request.search_query || '',
  };

  // Daily Attendance rows (note: if weekly/monthly date_from != date_to, still respect exact filter or snapshot date)
  const rawDaily = source.daily?.employeeRecords || [];
  const dailyRows = rawDaily.filter((r) =>
    matchesCommonFilter(r, filters, { ignoreDate: filters.date_from === filters.date_to && !r.attendanceDate })
  );

  // Weekly rows
  const rawWeeklyEmps = source.weekly?.employeeSummaries || [];
  const weeklyEmployeeRows = rawWeeklyEmps.filter((r) =>
    matchesCommonFilter(r, filters, { ignoreStatus: true, ignoreDate: true })
  );
  const weeklyTrendRows = (source.weekly?.dailyAttendanceTrend || []).filter(
    (d) => !filters.date_from || !filters.date_to || (d.date >= filters.date_from && d.date <= filters.date_to)
  );

  // Monthly rows
  const rawMonthlyEmps = source.monthly?.employeeMonthlySummaries || [];
  const monthlyEmployeeRows = rawMonthlyEmps.filter((r) =>
    matchesCommonFilter(r, filters, { ignoreStatus: true, ignoreDate: true })
  );
  const monthlyDeptRows = (source.monthly?.departmentPerformance || []).filter(
    (d) => !filters.department_id || filters.department_id === 'ALL' || norm(d.department) === norm(filters.department_id)
  );

  // Overtime governance + ledger (strict date/status/dept/shift separation)
  const rawOtGov = source.overtimeSummary?.employeeRecords || [];
  const overtimeGovernanceRows = rawOtGov.filter((r) =>
    matchesCommonFilter(r, filters, {
      ignoreDate: true,
      ignoreStatus:
        filters.attendance_status === 'ALL' ||
        ['APPROVED', 'PENDING', 'REJECTED', 'PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'].includes(
          filters.attendance_status.toUpperCase()
        ),
    })
  );

  const overtimeLedgerRows = (source.overtimeLedger || []).filter((r) =>
    matchesCommonFilter(r, filters, {
      ignoreStatus:
        filters.attendance_status === 'ALL' ||
        !['APPROVED', 'PENDING', 'REJECTED'].includes(filters.attendance_status.toUpperCase()),
    })
  );

  // Department & Shift matrix
  const departmentShiftRows = (source.departmentShifts || []).filter((r) => {
    if (filters.department_id !== 'ALL' && norm(r.department) !== norm(filters.department_id)) return false;
    if (filters.shift_id !== 'ALL' && !norm(r.shift).includes(norm(filters.shift_id))) return false;
    if (filters.search_query.trim()) {
      const q = norm(filters.search_query);
      if (!`${r.department} ${r.shift}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // HR Exceptions (strictly exception rows only - never normal rows)
  const exceptionRows = (source.exceptions || []).filter((r) =>
    matchesCommonFilter(r, filters, {
      ignoreStatus:
        filters.attendance_status === 'ALL' ||
        ['PRESENT', 'ABSENT', 'ON_LEAVE'].includes(filters.attendance_status.toUpperCase()),
      ignoreDate: !r.date && !r.detectedAt,
    })
  );

  // Reconciled metrics derived strictly from filtered rows per report type
  let present = 0;
  let absent = 0;
  let onLeave = 0;
  let late = 0;
  let earlyDeparture = 0;
  let missingPunches = 0;
  let headcount = 0;
  let approvedOtHours = 0;
  let pendingOtHours = 0;
  let rejectedOtHours = 0;
  let attendanceRatePct = 0;

  if (reportType === 'WEEKLY_MIS') {
    headcount = weeklyEmployeeRows.length;
    present = weeklyEmployeeRows.reduce((s, r) => s + r.presentDays, 0);
    absent = weeklyEmployeeRows.reduce((s, r) => s + r.absentDays, 0);
    onLeave = weeklyEmployeeRows.reduce((s, r) => s + r.leaveDays, 0);
    late = weeklyEmployeeRows.reduce((s, r) => s + r.lateDays, 0);
    missingPunches = weeklyEmployeeRows.reduce((s, r) => s + r.missingPunches, 0);
    approvedOtHours = Number(weeklyEmployeeRows.reduce((s, r) => s + r.overtimeHours, 0).toFixed(2));
    const denom = present + absent;
    attendanceRatePct = denom > 0 ? Number(((present / denom) * 100).toFixed(1)) : 0;
  } else if (reportType === 'MONTHLY_HR_MIS') {
    headcount = monthlyEmployeeRows.length;
    present = monthlyEmployeeRows.reduce((s, r) => s + r.presentDays, 0);
    absent = monthlyEmployeeRows.reduce((s, r) => s + r.absentDays, 0);
    onLeave = monthlyEmployeeRows.reduce((s, r) => s + r.leaveDays, 0);
    late = monthlyEmployeeRows.reduce((s, r) => s + r.lateDays, 0);
    missingPunches = monthlyEmployeeRows.reduce((s, r) => s + r.missingPunches, 0);
    approvedOtHours = Number(monthlyEmployeeRows.reduce((s, r) => s + r.overtimeHours, 0).toFixed(2));
    const denom = present + absent;
    attendanceRatePct = denom > 0 ? Number(((present / denom) * 100).toFixed(1)) : 0;
  } else if (reportType === 'OVERTIME_GOVERNANCE') {
    headcount = overtimeGovernanceRows.length;
    if (overtimeLedgerRows.length > 0) {
      approvedOtHours = Number(overtimeLedgerRows.reduce((s, r) => s + r.approvedOtHours, 0).toFixed(2));
      pendingOtHours = Number(overtimeLedgerRows.reduce((s, r) => s + r.pendingOtHours, 0).toFixed(2));
      rejectedOtHours = Number(overtimeLedgerRows.reduce((s, r) => s + r.rejectedOtHours, 0).toFixed(2));
    } else {
      approvedOtHours = Number(overtimeGovernanceRows.reduce((s, r) => s + r.currentMonthApprovedOtHours, 0).toFixed(2));
      pendingOtHours = Number(overtimeGovernanceRows.reduce((s, r) => s + r.currentMonthPendingOtHours, 0).toFixed(2));
    }
  } else if (reportType === 'DEPARTMENTS_SHIFTS') {
    headcount = departmentShiftRows.reduce((s, r) => s + r.headcount, 0);
    present = departmentShiftRows.reduce((s, r) => s + r.presentCount, 0);
    absent = departmentShiftRows.reduce((s, r) => s + r.absentCount, 0);
    onLeave = departmentShiftRows.reduce((s, r) => s + r.onLeaveCount, 0);
    late = departmentShiftRows.reduce((s, r) => s + r.lateCount, 0);
    missingPunches = departmentShiftRows.reduce((s, r) => s + r.missingPunchCount, 0);
    approvedOtHours = Number(departmentShiftRows.reduce((s, r) => s + r.approvedOtHours, 0).toFixed(2));
    pendingOtHours = Number(departmentShiftRows.reduce((s, r) => s + r.pendingOtHours, 0).toFixed(2));
    const denom = present + absent;
    attendanceRatePct = denom > 0 ? Number(((present / denom) * 100).toFixed(1)) : 0;
  } else {
    // DAILY_ATTENDANCE, OVERVIEW, HR_EXCEPTIONS, CONSOLIDATED_MIS
    headcount = dailyRows.length;
    present = dailyRows.filter((r) => r.status === 'PRESENT' || r.status === 'HALF_DAY').length;
    absent = dailyRows.filter((r) => r.status === 'ABSENT').length;
    onLeave = dailyRows.filter((r) => r.status === 'ON_LEAVE').length;
    late = dailyRows.filter((r) => r.lateDurationMinutes > 0).length;
    earlyDeparture = dailyRows.filter((r) => (r.earlyDepartureMinutes || 0) > 0).length;
    missingPunches = dailyRows.filter((r) => String(r.missingPunchStatus || '').toLowerCase().includes('missing')).length;
    approvedOtHours = Number(dailyRows.reduce((s, r) => s + (r.overtimeHours || 0), 0).toFixed(2));
    pendingOtHours = Number(overtimeLedgerRows.reduce((s, r) => s + r.pendingOtHours, 0).toFixed(2));
    const denom = present + absent;
    attendanceRatePct = denom > 0 ? Number(((present / denom) * 100).toFixed(1)) : 0;
  }

  const exceptionCount = exceptionRows.length;

  const kpis = buildKpisForReport(reportType, {
    headcount,
    present,
    absent,
    onLeave,
    late,
    earlyDeparture,
    missingPunches,
    attendanceRatePct,
    approvedOtHours,
    pendingOtHours,
    rejectedOtHours,
    exceptionCount,
    weeklyTrendRows,
    monthlyEmployeeRows,
    overtimeGovernanceRows,
    overtimeLedgerRows,
    departmentShiftRows,
    exceptionRows,
  });

  const recordCount = getPrimaryRecordCount(reportType, {
    dailyRows,
    weeklyEmployeeRows,
    monthlyEmployeeRows,
    overtimeGovernanceRows,
    overtimeLedgerRows,
    departmentShiftRows,
    exceptionRows,
  });

  return {
    reportType,
    reportTitle: REPORT_DISPLAY_NAMES[reportType],
    periodLabel: filters.date_from === filters.date_to ? filters.date_to : `${filters.date_from} to ${filters.date_to}`,
    filtersAppliedText: buildFiltersAppliedLabel(filters),
    dailyRows,
    weeklyEmployeeRows,
    weeklyTrendRows,
    monthlyEmployeeRows,
    monthlyDeptRows,
    overtimeGovernanceRows,
    overtimeLedgerRows,
    departmentShiftRows,
    exceptionRows,
    kpis,
    summaryTotals: {
      headcount,
      present,
      absent,
      onLeave,
      late,
      earlyDeparture,
      missingPunches,
      attendanceRatePct,
      approvedOtHours,
      pendingOtHours,
      rejectedOtHours,
      exceptionCount,
    },
    recordCount,
  };
}

function getPrimaryRecordCount(
  reportType: MisReportType,
  lists: {
    dailyRows: EmployeeAttendanceLedgerRecord[];
    weeklyEmployeeRows: WeeklyEmployeeSummaryRow[];
    monthlyEmployeeRows: MonthlyEmployeeSummaryRow[];
    overtimeGovernanceRows: EmployeeOvertimeGovernanceRecord[];
    overtimeLedgerRows: OvertimeRequestDetailRow[];
    departmentShiftRows: DepartmentShiftReportRow[];
    exceptionRows: HrExceptionItem[];
  }
): number {
  switch (reportType) {
    case 'DAILY_ATTENDANCE':
      return lists.dailyRows.length;
    case 'WEEKLY_MIS':
      return lists.weeklyEmployeeRows.length;
    case 'MONTHLY_HR_MIS':
      return lists.monthlyEmployeeRows.length;
    case 'OVERTIME_GOVERNANCE':
      return lists.overtimeLedgerRows.length > 0 ? lists.overtimeLedgerRows.length : lists.overtimeGovernanceRows.length;
    case 'DEPARTMENTS_SHIFTS':
      return lists.departmentShiftRows.length;
    case 'HR_EXCEPTIONS':
      return lists.exceptionRows.length;
    case 'OVERVIEW':
    case 'CONSOLIDATED_MIS':
    default:
      return lists.dailyRows.length + lists.overtimeLedgerRows.length + lists.exceptionRows.length;
  }
}

function buildKpisForReport(
  reportType: MisReportType,
  m: {
    headcount: number;
    present: number;
    absent: number;
    onLeave: number;
    late: number;
    earlyDeparture: number;
    missingPunches: number;
    attendanceRatePct: number;
    approvedOtHours: number;
    pendingOtHours: number;
    rejectedOtHours: number;
    exceptionCount: number;
    weeklyTrendRows: WeeklyHrMisReport['dailyAttendanceTrend'];
    monthlyEmployeeRows: MonthlyEmployeeSummaryRow[];
    overtimeGovernanceRows: EmployeeOvertimeGovernanceRecord[];
    overtimeLedgerRows: OvertimeRequestDetailRow[];
    departmentShiftRows: DepartmentShiftReportRow[];
    exceptionRows: HrExceptionItem[];
  }
): ReconciledKpiCard[] {
  if (reportType === 'DAILY_ATTENDANCE') {
    return [
      { label: 'Total Workforce', value: String(m.headcount), numericValue: m.headcount, sublabel: 'Filtered employees' },
      { label: 'Present', value: String(m.present), numericValue: m.present, sublabel: `${m.attendanceRatePct}% turnout` },
      { label: 'Absent', value: String(m.absent), numericValue: m.absent, sublabel: 'Unexcused' },
      { label: 'Late Arrivals', value: String(m.late), numericValue: m.late, sublabel: 'Late punch-in' },
      { label: 'Early Departures', value: String(m.earlyDeparture), numericValue: m.earlyDeparture, sublabel: 'Early check-out' },
      { label: 'On Leave', value: String(m.onLeave), numericValue: m.onLeave, sublabel: 'Approved leave' },
      { label: 'Missing Punches', value: String(m.missingPunches), numericValue: m.missingPunches, sublabel: 'Incomplete in/out' },
      { label: 'OT Hours Logged', value: `${m.approvedOtHours}h`, numericValue: m.approvedOtHours, sublabel: 'Daily overtime' },
    ];
  }
  if (reportType === 'WEEKLY_MIS') {
    return [
      { label: 'Staff Tracked', value: String(m.headcount), numericValue: m.headcount, sublabel: `${m.weeklyTrendRows.length} days window` },
      { label: 'Present Employee-Days', value: String(m.present), numericValue: m.present, sublabel: `${m.attendanceRatePct}% turnout` },
      { label: 'Absent Employee-Days', value: String(m.absent), numericValue: m.absent },
      { label: 'Leave Days', value: String(m.onLeave), numericValue: m.onLeave },
      { label: 'Late Marks', value: String(m.late), numericValue: m.late },
      { label: 'Missing Punches', value: String(m.missingPunches), numericValue: m.missingPunches },
      { label: 'Weekly OT Hours', value: `${m.approvedOtHours}h`, numericValue: m.approvedOtHours },
    ];
  }
  if (reportType === 'MONTHLY_HR_MIS') {
    return [
      { label: 'Active Employees', value: String(m.headcount), numericValue: m.headcount },
      { label: 'Present Days', value: String(m.present), numericValue: m.present, sublabel: `${m.attendanceRatePct}% avg` },
      { label: 'Absent Days', value: String(m.absent), numericValue: m.absent },
      { label: 'Approved Leaves', value: String(m.onLeave), numericValue: m.onLeave },
      { label: 'Late Arrivals', value: String(m.late), numericValue: m.late },
      { label: 'Missing Punches', value: String(m.missingPunches), numericValue: m.missingPunches },
      { label: 'Monthly OT Hours', value: `${m.approvedOtHours}h`, numericValue: m.approvedOtHours },
    ];
  }
  if (reportType === 'OVERTIME_GOVERNANCE') {
    const exceeded = m.overtimeGovernanceRows.filter((r) => r.warningStatus === 'EXCEEDED').length;
    const approaching = m.overtimeGovernanceRows.filter(
      (r) => r.warningStatus === 'APPROACHING' || r.warningStatus === 'HIGH_PRIORITY'
    ).length;
    const totalCost = m.overtimeLedgerRows.reduce((s, r) => s + (r.overtimeCost || 0), 0);
    return [
      { label: 'Approved OT Hours', value: `${m.approvedOtHours}h`, numericValue: m.approvedOtHours },
      { label: 'Pending OT Hours', value: `${m.pendingOtHours}h`, numericValue: m.pendingOtHours },
      { label: 'Rejected OT Hours', value: `${m.rejectedOtHours}h`, numericValue: m.rejectedOtHours },
      { label: 'Exceeded 20h Cap', value: String(exceeded), numericValue: exceeded },
      { label: 'Near Threshold', value: String(approaching), numericValue: approaching },
      {
        label: 'Configured OT Cost',
        value: totalCost > 0 ? `₹${totalCost.toLocaleString('en-IN')}` : 'Not Configured',
        numericValue: totalCost,
      },
    ];
  }
  if (reportType === 'DEPARTMENTS_SHIFTS') {
    return [
      { label: 'Dept-Shift Groups', value: String(m.departmentShiftRows.length), numericValue: m.departmentShiftRows.length },
      { label: 'Assigned Headcount', value: String(m.headcount), numericValue: m.headcount },
      { label: 'Present Instances', value: String(m.present), numericValue: m.present, sublabel: `${m.attendanceRatePct}%` },
      { label: 'Absent Instances', value: String(m.absent), numericValue: m.absent },
      { label: 'Late Marks', value: String(m.late), numericValue: m.late },
      { label: 'Missing Punches', value: String(m.missingPunches), numericValue: m.missingPunches },
      { label: 'Approved OT Hours', value: `${m.approvedOtHours}h`, numericValue: m.approvedOtHours },
    ];
  }
  if (reportType === 'HR_EXCEPTIONS') {
    const missing = m.exceptionRows.filter((e) => e.ruleCategory === 'MISSING_PUNCH').length;
    const late = m.exceptionRows.filter((e) => e.ruleCategory === 'LATE_ARRIVAL' || e.ruleCategory === 'REPEATED_LATE').length;
    const regs = m.exceptionRows.filter((e) => e.ruleCategory === 'PENDING_REGULARIZATION').length;
    const otAlerts = m.exceptionRows.filter((e) => e.ruleCategory === 'OVERTIME_EXCEEDED' || e.ruleCategory === 'OVERTIME_APPROACHING').length;
    const unapp = m.exceptionRows.filter((e) => e.ruleCategory === 'UNAPPROVED_ATTENDANCE').length;
    return [
      { label: 'Total Exceptions', value: String(m.exceptionCount), numericValue: m.exceptionCount },
      { label: 'Missing Punches', value: String(missing), numericValue: missing },
      { label: 'Late Arrival Flags', value: String(late), numericValue: late },
      { label: 'Pending Regularization', value: String(regs), numericValue: regs },
      { label: 'Unapproved Entries', value: String(unapp), numericValue: unapp },
      { label: 'OT Threshold Alerts', value: String(otAlerts), numericValue: otAlerts },
    ];
  }

  return [
    { label: 'Workforce', value: String(m.headcount), numericValue: m.headcount },
    { label: 'Present', value: String(m.present), numericValue: m.present, sublabel: `${m.attendanceRatePct}%` },
    { label: 'Absent', value: String(m.absent), numericValue: m.absent },
    { label: 'Late Arrivals', value: String(m.late), numericValue: m.late },
    { label: 'Missing Punches', value: String(m.missingPunches), numericValue: m.missingPunches },
    { label: 'Approved OT', value: `${m.approvedOtHours}h`, numericValue: m.approvedOtHours },
    { label: 'HR Exceptions', value: String(m.exceptionCount), numericValue: m.exceptionCount },
  ];
}

// ============================================================================
// Tabular Section Specification (Shared by Excel & CSV & PDF)
// ============================================================================

interface TabularColumn {
  key: string;
  header: string;
  width: number; // excel character width
  pdfWeight: number; // proportional width for PDF A4 landscape
  align?: 'left' | 'center' | 'right';
  numFmt?: string;
  sumTotal?: boolean;
}

interface TabularSectionSpec {
  sheetName: string;
  sectionTitle: string;
  columns: TabularColumn[];
  rows: Array<Record<string, string | number>>;
  emptyMessage: string;
}

function buildSectionSpec(
  sectionType: MisSingleReportType,
  dataset: FilteredMisDataset
): TabularSectionSpec[] {
  if (sectionType === 'DAILY_ATTENDANCE') {
    return [
      {
        sheetName: 'Daily Attendance',
        sectionTitle: 'Employee-Wise Daily Attendance Ledger',
        emptyMessage: 'No attendance records matched the selected date and filter criteria.',
        columns: [
          { key: 'employeeCode', header: 'Emp Code', width: 12, pdfWeight: 7, align: 'left' },
          { key: 'employeeName', header: 'Employee Name', width: 22, pdfWeight: 12, align: 'left' },
          { key: 'department', header: 'Department', width: 16, pdfWeight: 9, align: 'left' },
          { key: 'designation', header: 'Designation', width: 16, pdfWeight: 8, align: 'left' },
          { key: 'shift', header: 'Shift', width: 22, pdfWeight: 9, align: 'left' },
          { key: 'attendanceDate', header: 'Date', width: 12, pdfWeight: 6, align: 'center' },
          { key: 'scheduledStart', header: 'Scheduled', width: 11, pdfWeight: 6, align: 'center' },
          { key: 'firstCheckIn', header: 'In-Time', width: 11, pdfWeight: 6, align: 'center' },
          { key: 'lastCheckOut', header: 'Out-Time', width: 11, pdfWeight: 6, align: 'center' },
          { key: 'workingHoursDecimal', header: 'Work Hrs', width: 10, pdfWeight: 5.5, align: 'right', numFmt: '0.00', sumTotal: true },
          { key: 'breakDuration', header: 'Break', width: 9, pdfWeight: 4.5, align: 'center' },
          { key: 'lateDurationMinutes', header: 'Late (m)', width: 10, pdfWeight: 5, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'earlyDepartureMinutes', header: 'Early Dep (m)', width: 13, pdfWeight: 5.5, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'overtimeHours', header: 'OT Hrs', width: 10, pdfWeight: 5, align: 'right', numFmt: '0.00', sumTotal: true },
          { key: 'status', header: 'Status', width: 12, pdfWeight: 6.5, align: 'center' },
          { key: 'missingPunchStatus', header: 'Punch Status', width: 17, pdfWeight: 7.5, align: 'left' },
          { key: 'regularizationStatus', header: 'Regularization', width: 15, pdfWeight: 6.5, align: 'center' },
          { key: 'supervisor', header: 'Supervisor', width: 16, pdfWeight: 7, align: 'left' },
          { key: 'remarks', header: 'Remarks', width: 22, pdfWeight: 8, align: 'left' },
        ],
        rows: dataset.dailyRows.map((r) => ({
          employeeCode: r.employeeCode,
          employeeName: r.employeeName,
          department: r.department,
          designation: r.designation || '—',
          shift: r.shift,
          attendanceDate: r.attendanceDate || dataset.periodLabel,
          scheduledStart: r.scheduledStart || '09:00 AM',
          firstCheckIn: r.firstCheckIn,
          lastCheckOut: r.lastCheckOut,
          workingHoursDecimal: Number(((r.workingMinutes || 0) / 60).toFixed(2)),
          breakDuration: formatMinutesLabel(r.breakDurationMinutes),
          lateDurationMinutes: r.lateDurationMinutes || 0,
          earlyDepartureMinutes: r.earlyDepartureMinutes || 0,
          overtimeHours: Number((r.overtimeHours || 0).toFixed(2)),
          status: r.status,
          missingPunchStatus: r.missingPunchStatus || r.exceptionStatus,
          regularizationStatus: r.regularizationStatus || 'None',
          supervisor: r.supervisor || '—',
          remarks: r.remarks || r.attendanceSource || '—',
        })),
      },
    ];
  }

  if (sectionType === 'WEEKLY_MIS') {
    return [
      {
        sheetName: 'Weekly MIS',
        sectionTitle: 'Weekly Employee Attendance Summary & Exceptions',
        emptyMessage: 'No weekly employee records matched the active filters.',
        columns: [
          { key: 'employeeCode', header: 'Emp Code', width: 12, pdfWeight: 8, align: 'left' },
          { key: 'employeeName', header: 'Employee Name', width: 24, pdfWeight: 16, align: 'left' },
          { key: 'department', header: 'Department', width: 18, pdfWeight: 12, align: 'left' },
          { key: 'shift', header: 'Shift', width: 22, pdfWeight: 12, align: 'left' },
          { key: 'presentDays', header: 'Present Days', width: 13, pdfWeight: 8, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'absentDays', header: 'Absent Days', width: 13, pdfWeight: 8, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'leaveDays', header: 'Leave Days', width: 12, pdfWeight: 7, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'lateCount', header: 'Late Arrivals', width: 13, pdfWeight: 8, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'totalLateMinutes', header: 'Late Mins', width: 12, pdfWeight: 7, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'missingPunchCount', header: 'Missing Punches', width: 15, pdfWeight: 8, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'overtimeHours', header: 'OT Hours', width: 12, pdfWeight: 7, align: 'right', numFmt: '0.00', sumTotal: true },
          { key: 'attendancePct', header: 'Attendance %', width: 14, pdfWeight: 9, align: 'right', numFmt: '0.0' },
        ],
        rows: dataset.weeklyEmployeeRows.map((r) => ({
          employeeCode: r.employeeCode,
          employeeName: r.employeeName,
          department: r.department,
          shift: r.shift,
          presentDays: r.presentDays,
          absentDays: r.absentDays,
          leaveDays: r.leaveDays,
          lateCount: r.lateDays,
          totalLateMinutes: r.lateMinutesTotal,
          missingPunchCount: r.missingPunches,
          overtimeHours: Number(r.overtimeHours.toFixed(2)),
          attendancePct: Number(r.attendancePct.toFixed(1)),
        })),
      },
    ];
  }

  if (sectionType === 'MONTHLY_HR_MIS') {
    return [
      {
        sheetName: 'Monthly HR MIS',
        sectionTitle: 'Monthly Employee-Wise Attendance, Leave, Overtime & Exceptions',
        emptyMessage: 'No monthly employee records matched the active filters.',
        columns: [
          { key: 'employeeCode', header: 'Emp Code', width: 12, pdfWeight: 8, align: 'left' },
          { key: 'employeeName', header: 'Employee Name', width: 24, pdfWeight: 15, align: 'left' },
          { key: 'department', header: 'Department', width: 17, pdfWeight: 11, align: 'left' },
          { key: 'shift', header: 'Shift', width: 22, pdfWeight: 11, align: 'left' },
          { key: 'presentDays', header: 'Present', width: 11, pdfWeight: 7, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'absentDays', header: 'Absent', width: 11, pdfWeight: 7, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'leaveDays', header: 'Leaves', width: 11, pdfWeight: 7, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'lateCount', header: 'Late Count', width: 12, pdfWeight: 7, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'missingPunchCount', header: 'Missing Punch', width: 14, pdfWeight: 8, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'exceptionsCount', header: 'Exceptions', width: 14, pdfWeight: 8, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'overtimeHours', header: 'OT Hours', width: 12, pdfWeight: 7, align: 'right', numFmt: '0.00', sumTotal: true },
          { key: 'attendancePct', header: 'Attendance %', width: 14, pdfWeight: 8, align: 'right', numFmt: '0.0' },
        ],
        rows: dataset.monthlyEmployeeRows.map((r) => ({
          employeeCode: r.employeeCode,
          employeeName: r.employeeName,
          department: r.department,
          shift: r.shift,
          presentDays: r.presentDays,
          absentDays: r.absentDays,
          leaveDays: r.leaveDays,
          lateCount: r.lateDays,
          missingPunchCount: r.missingPunches,
          exceptionsCount: r.exceptionsCount,
          overtimeHours: Number(r.overtimeHours.toFixed(2)),
          attendancePct: Number(r.attendancePct.toFixed(1)),
        })),
      },
    ];
  }

  if (sectionType === 'OVERTIME_GOVERNANCE') {
    if (dataset.overtimeLedgerRows.length > 0) {
      return [
        {
          sheetName: 'Overtime Governance',
          sectionTitle: 'Employee-Wise Overtime Ledger (Approved, Pending & Rejected)',
          emptyMessage: 'No overtime entries found for the selected period and filters.',
          columns: [
            { key: 'employeeCode', header: 'Emp Code', width: 12, pdfWeight: 7, align: 'left' },
            { key: 'employeeName', header: 'Employee Name', width: 22, pdfWeight: 12, align: 'left' },
            { key: 'department', header: 'Department', width: 16, pdfWeight: 9, align: 'left' },
            { key: 'shift', header: 'Shift', width: 20, pdfWeight: 9, align: 'left' },
            { key: 'workDate', header: 'Date', width: 12, pdfWeight: 6.5, align: 'center' },
            { key: 'regularHours', header: 'Reg Hrs', width: 10, pdfWeight: 5.5, align: 'right', numFmt: '0.00', sumTotal: true },
            { key: 'approvedOtHours', header: 'Approved OT', width: 12, pdfWeight: 6.5, align: 'right', numFmt: '0.00', sumTotal: true },
            { key: 'pendingOtHours', header: 'Pending OT', width: 12, pdfWeight: 6.5, align: 'right', numFmt: '0.00', sumTotal: true },
            { key: 'rejectedOtHours', header: 'Rejected OT', width: 12, pdfWeight: 6.5, align: 'right', numFmt: '0.00', sumTotal: true },
            { key: 'status', header: 'Approval Status', width: 14, pdfWeight: 7.5, align: 'center' },
            { key: 'overtimeCostDisplay', header: 'OT Cost', width: 13, pdfWeight: 7, align: 'right' },
            { key: 'approvedBy', header: 'Approved By', width: 16, pdfWeight: 8, align: 'left' },
            { key: 'reason', header: 'Reason / Remarks', width: 24, pdfWeight: 9, align: 'left' },
          ],
          rows: dataset.overtimeLedgerRows.map((r) => ({
            employeeCode: r.employeeCode,
            employeeName: r.employeeName,
            department: r.department,
            shift: r.shift,
            workDate: r.workDate,
            regularHours: r.regularHours,
            approvedOtHours: r.approvedOtHours,
            pendingOtHours: r.pendingOtHours,
            rejectedOtHours: r.rejectedOtHours,
            status: r.status,
            overtimeCostDisplay: r.overtimeCost !== null ? `₹${r.overtimeCost.toFixed(2)}` : 'Not Configured',
            approvedBy: r.approvedBy,
            reason: r.reason,
          })),
        },
      ];
    }

    return [
      {
        sheetName: 'Overtime Governance',
        sectionTitle: '4-Month Statutory Overtime Allocation & Governance Tracker',
        emptyMessage: 'No overtime governance records found for the active filters.',
        columns: [
          { key: 'employeeCode', header: 'Emp Code', width: 12, pdfWeight: 8, align: 'left' },
          { key: 'employeeName', header: 'Employee Name', width: 22, pdfWeight: 14, align: 'left' },
          { key: 'department', header: 'Department', width: 16, pdfWeight: 10, align: 'left' },
          { key: 'shift', header: 'Shift', width: 20, pdfWeight: 10, align: 'left' },
          { key: 'monthApprovedOtHours', header: 'Month Approved (h)', width: 17, pdfWeight: 9, align: 'right', numFmt: '0.00', sumTotal: true },
          { key: 'monthPendingOtHours', header: 'Month Pending (h)', width: 16, pdfWeight: 9, align: 'right', numFmt: '0.00', sumTotal: true },
          { key: 'periodApprovedOtHours', header: '4-Mo Cumulative (h)', width: 18, pdfWeight: 10, align: 'right', numFmt: '0.00', sumTotal: true },
          { key: 'remainingHours', header: 'Remaining Cap (h)', width: 17, pdfWeight: 10, align: 'right', numFmt: '0.00' },
          { key: 'utilizationPercentage', header: 'Cap Used %', width: 13, pdfWeight: 8, align: 'right', numFmt: '0.0' },
          { key: 'warningStatus', header: 'Governance Band', width: 17, pdfWeight: 12, align: 'center' },
        ],
        rows: dataset.overtimeGovernanceRows.map((r) => ({
          employeeCode: r.employeeCode,
          employeeName: r.employeeName,
          department: r.department,
          shift: r.shift,
          monthApprovedOtHours: r.currentMonthApprovedOtHours,
          monthPendingOtHours: r.currentMonthPendingOtHours,
          periodApprovedOtHours: r.currentPeriodApprovedOtHours,
          remainingHours: r.remainingAllocationHours,
          utilizationPercentage: r.utilizationPercentage,
          warningStatus: r.warningStatus,
        })),
      },
    ];
  }

  if (sectionType === 'DEPARTMENTS_SHIFTS') {
    return [
      {
        sheetName: 'Departments & Shifts',
        sectionTitle: 'Department & Shift Attendance, Punctuality & Overtime Comparison',
        emptyMessage: 'No department or shift records matched the active filters.',
        columns: [
          { key: 'department', header: 'Department', width: 20, pdfWeight: 14, align: 'left' },
          { key: 'shift', header: 'Shift', width: 28, pdfWeight: 18, align: 'left' },
          { key: 'headcount', header: 'Headcount', width: 12, pdfWeight: 8, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'scheduledStaff', header: 'Scheduled Slots', width: 15, pdfWeight: 9, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'presentCount', header: 'Present', width: 11, pdfWeight: 7, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'absentCount', header: 'Absent', width: 11, pdfWeight: 7, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'onLeaveCount', header: 'On Leave', width: 11, pdfWeight: 7, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'lateCount', header: 'Late Arrivals', width: 13, pdfWeight: 8, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'missingPunchCount', header: 'Missing Punches', width: 15, pdfWeight: 8, align: 'right', numFmt: '0', sumTotal: true },
          { key: 'approvedOtHours', header: 'Approved OT (h)', width: 15, pdfWeight: 8, align: 'right', numFmt: '0.00', sumTotal: true },
          { key: 'attendanceRatePct', header: 'Attendance %', width: 14, pdfWeight: 9, align: 'right', numFmt: '0.0' },
        ],
        rows: dataset.departmentShiftRows.map((r) => ({ ...r })),
      },
    ];
  }

  if (sectionType === 'HR_EXCEPTIONS') {
    return [
      {
        sheetName: 'HR Exceptions',
        sectionTitle: 'Unresolved HR Exceptions (Missing Punches, Late Marks, Regularizations & OT Alerts)',
        emptyMessage: 'No HR exceptions found matching the selected criteria.',
        columns: [
          { key: 'employeeCode', header: 'Emp Code', width: 12, pdfWeight: 8, align: 'left' },
          { key: 'employeeName', header: 'Employee Name', width: 22, pdfWeight: 14, align: 'left' },
          { key: 'department', header: 'Department', width: 16, pdfWeight: 10, align: 'left' },
          { key: 'shift', header: 'Shift', width: 20, pdfWeight: 10, align: 'left' },
          { key: 'date', header: 'Date', width: 12, pdfWeight: 7, align: 'center' },
          { key: 'ruleCategory', header: 'Exception Type', width: 22, pdfWeight: 12, align: 'left' },
          { key: 'severity', header: 'Severity', width: 11, pdfWeight: 7, align: 'center' },
          { key: 'status', header: 'Status', width: 12, pdfWeight: 7, align: 'center' },
          { key: 'ownerName', header: 'Owner / Approver', width: 18, pdfWeight: 10, align: 'left' },
          { key: 'description', header: 'Exception Details & Remarks', width: 42, pdfWeight: 20, align: 'left' },
        ],
        rows: dataset.exceptionRows.map((e) => ({
          employeeCode: e.employeeCode,
          employeeName: e.employeeName,
          department: e.department,
          shift: e.shift || '—',
          date: e.date || e.detectedAt,
          ruleCategory: e.ruleCategory,
          severity: e.severity,
          status: e.status,
          ownerName: e.ownerName,
          description: e.resolutionRemarks ? `${e.description} | Remarks: ${e.resolutionRemarks}` : e.description,
        })),
      },
    ];
  }

  // OVERVIEW: Single clean Executive KPI & Department Summary sheet
  return [
    {
      sheetName: 'Executive Overview',
      sectionTitle: 'Executive Workforce MIS KPI & Department Summary',
      emptyMessage: 'No department or attendance summary data available for the active filters.',
      columns: [
        { key: 'department', header: 'Department', width: 22, pdfWeight: 16, align: 'left' },
        { key: 'shift', header: 'Shift Coverage', width: 26, pdfWeight: 16, align: 'left' },
        { key: 'headcount', header: 'Headcount', width: 13, pdfWeight: 9, align: 'right', numFmt: '0', sumTotal: true },
        { key: 'presentCount', header: 'Present', width: 12, pdfWeight: 9, align: 'right', numFmt: '0', sumTotal: true },
        { key: 'absentCount', header: 'Absent', width: 12, pdfWeight: 9, align: 'right', numFmt: '0', sumTotal: true },
        { key: 'lateCount', header: 'Late Arrivals', width: 13, pdfWeight: 9, align: 'right', numFmt: '0', sumTotal: true },
        { key: 'missingPunchCount', header: 'Missing Punches', width: 15, pdfWeight: 10, align: 'right', numFmt: '0', sumTotal: true },
        { key: 'approvedOtHours', header: 'Approved OT (h)', width: 15, pdfWeight: 10, align: 'right', numFmt: '0.00', sumTotal: true },
        { key: 'attendanceRatePct', header: 'Turnout %', width: 13, pdfWeight: 12, align: 'right', numFmt: '0.0' },
      ],
      rows: dataset.departmentShiftRows.map((r) => ({ ...r })),
    },
  ];
}

// ============================================================================
// ExcelJS Workbook Generator
// ============================================================================

function populateExcelWorksheet(
  ws: ExcelJS.Worksheet,
  spec: TabularSectionSpec,
  dataset: FilteredMisDataset,
  request: MisExportRequest
): void {
  const colCount = spec.columns.length;
  const lastColLetter = ws.getColumn(Math.max(1, colCount)).letter;

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  // Row 1: Brand Title
  ws.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = `JOY PeopleHR — ${spec.sectionTitle}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 28;

  // Row 2: Company + Metadata + Filters
  ws.mergeCells(`A2:${lastColLetter}2`);
  const metaCell = ws.getCell('A2');
  const istNow = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  metaCell.value = `Organization: ${request.company_name}   |   ${dataset.filtersAppliedText}   |   Generated By: ${request.generated_by} (${istNow} IST)`;
  metaCell.font = { size: 9, color: { argb: 'FF0F172A' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 20;

  // Row 3: Reconciled KPI Summary Strip
  ws.mergeCells(`A3:${lastColLetter}3`);
  const kpiCell = ws.getCell('A3');
  kpiCell.value = dataset.kpis.map((k) => `${k.label}: ${k.value}`).join('   •   ');
  kpiCell.font = { bold: true, size: 9.5, color: { argb: 'FF065F46' } };
  kpiCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  kpiCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(3).height = 22;

  // Row 4: Spacer
  ws.getRow(4).height = 8;

  // Row 5: Table Header
  const headerRowIdx = 5;
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.height = 24;
  spec.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.alignment = { vertical: 'middle', horizontal: col.align || 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F766E' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  ws.views = [{ state: 'frozen', ySplit: headerRowIdx }];
  ws.autoFilter = {
    from: { row: headerRowIdx, column: 1 },
    to: { row: headerRowIdx, column: colCount },
  };
  ws.pageSetup.printTitlesRow = `1:${headerRowIdx}`;

  // Data Rows
  if (spec.rows.length === 0) {
    const emptyRow = ws.getRow(headerRowIdx + 1);
    ws.mergeCells(`A${headerRowIdx + 1}:${lastColLetter}${headerRowIdx + 1}`);
    const emptyCell = emptyRow.getCell(1);
    emptyCell.value = spec.emptyMessage;
    emptyCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    emptyRow.height = 28;
  } else {
    spec.rows.forEach((rowData, rIdx) => {
      const excelRowIdx = headerRowIdx + 1 + rIdx;
      const excelRow = ws.getRow(excelRowIdx);
      excelRow.height = 20;
      const isZebra = rIdx % 2 === 1;

      spec.columns.forEach((col, cIdx) => {
        const cell = excelRow.getCell(cIdx + 1);
        const val = rowData[col.key];
        cell.value = val !== undefined && val !== null ? val : '—';
        cell.font = { size: 9.5, color: { argb: 'FF1E293B' } };
        cell.alignment = { vertical: 'middle', horizontal: col.align || 'left', wrapText: true };
        if (col.numFmt && typeof val === 'number') {
          cell.numFmt = col.numFmt;
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        // Conditional status highlighting
        const upperVal = String(val || '').toUpperCase();
        if (col.key === 'status' || col.key === 'warningStatus' || col.key === 'severity') {
          if (['ABSENT', 'EXCEEDED', 'CRITICAL', 'REJECTED'].includes(upperVal)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { bold: true, size: 9.5, color: { argb: 'FF991B1B' } };
          } else if (['PENDING', 'HIGH_PRIORITY', 'HIGH', 'LATE', 'HALF_DAY', 'OPEN'].includes(upperVal)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            cell.font = { bold: true, size: 9.5, color: { argb: 'FF92400E' } };
          } else if (['PRESENT', 'APPROVED', 'NORMAL', 'ON_LEAVE', 'RESOLVED'].includes(upperVal)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            cell.font = { bold: true, size: 9.5, color: { argb: 'FF166534' } };
          } else if (isZebra) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        } else if (isZebra) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    });

    // Summary Totals Footer Row
    const firstDataRow = headerRowIdx + 1;
    const lastDataRow = headerRowIdx + spec.rows.length;
    const totalRowIdx = lastDataRow + 1;
    const totalRow = ws.getRow(totalRowIdx);
    totalRow.height = 22;

    spec.columns.forEach((col, cIdx) => {
      const cell = totalRow.getCell(cIdx + 1);
      const colLetter = ws.getColumn(cIdx + 1).letter;
      cell.font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };

      if (cIdx === 0) {
        cell.value = `TOTAL (${spec.rows.length} rows)`;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (col.sumTotal) {
        const computedSum = spec.rows.reduce((sum, r) => sum + Number(r[col.key] || 0), 0);
        cell.value = { formula: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})`, result: Number(computedSum.toFixed(2)) };
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (col.numFmt) cell.numFmt = col.numFmt;
      } else {
        cell.value = '';
      }
    });
  }

  // Column widths with generous padding
  spec.columns.forEach((col, idx) => {
    let maxLen = col.header.length;
    for (const r of spec.rows.slice(0, 100)) {
      const len = String(r[col.key] ?? '').length;
      if (len > maxLen) maxLen = len;
    }
    ws.getColumn(idx + 1).width = Math.min(48, Math.max(col.width, maxLen + 3));
  });
}

export async function generateMisExcelWorkbook(
  request: MisExportRequest,
  source: MisSourceDataset
): Promise<MisExportArtifact> {
  assertTenantIsolation(request.company_id, source);

  const wb = new ExcelJS.Workbook();
  wb.creator = request.generated_by || 'JOY PeopleHR MIS Engine';
  wb.created = new Date();
  wb.company = request.company_name;

  const isConsolidated =
    request.requested_scope === 'CONSOLIDATED_WORKBOOK' || request.report_type === 'CONSOLIDATED_MIS';

  const sectionsToRender: MisSingleReportType[] = isConsolidated
    ? request.consolidated_sections && request.consolidated_sections.length > 0
      ? request.consolidated_sections
      : ALL_CONSOLIDATED_SECTIONS.map((s) => s.id)
    : [request.report_type as MisSingleReportType];

  const primaryDataset = buildFilteredMisDataset(request, source);
  const worksheetNames: string[] = [];

  for (const sectionType of sectionsToRender) {
    const sectionDataset = buildFilteredMisDataset(
      { ...request, report_type: sectionType, requested_scope: 'CURRENT_REPORT' },
      source
    );
    const specs = buildSectionSpec(sectionType, sectionDataset);
    for (const spec of specs) {
      const safeName = spec.sheetName.replace(/[\\/*?:[\]]/g, '').slice(0, 31);
      const ws = wb.addWorksheet(safeName);
      populateExcelWorksheet(ws, spec, sectionDataset, request);
      worksheetNames.push(safeName);
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer as ArrayBuffer);
  const sha256Checksum = await computeSha256(bytes);

  const slug = isConsolidated
    ? 'Consolidated_Workforce_MIS'
    : REPORT_DISPLAY_NAMES[request.report_type].replace(/[^a-zA-Z0-9]+/g, '_');
  const periodSlug = request.date_from === request.date_to ? request.date_to : `${request.date_from}_to_${request.date_to}`;

  return {
    bytes,
    fileName: `JOY_PeopleHR_${slug}_${periodSlug}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sha256Checksum,
    reportType: isConsolidated ? 'CONSOLIDATED_MIS' : request.report_type,
    reportTitle: isConsolidated ? REPORT_DISPLAY_NAMES.CONSOLIDATED_MIS : primaryDataset.reportTitle,
    recordCount: primaryDataset.recordCount,
    worksheetNames,
  };
}

// ============================================================================
// Single-Report CSV Generator
// ============================================================================

export async function generateMisCsv(
  request: MisExportRequest,
  source: MisSourceDataset
): Promise<MisExportArtifact> {
  const effectiveType: MisSingleReportType =
    request.report_type === 'CONSOLIDATED_MIS' ? 'DAILY_ATTENDANCE' : request.report_type;
  const dataset = buildFilteredMisDataset({ ...request, report_type: effectiveType }, source);
  const specs = buildSectionSpec(effectiveType, dataset);
  const primarySpec = specs[0];

  const headerLine = primarySpec.columns.map((c) => escapeCsvCell(c.header)).join(',');
  const dataLines = primarySpec.rows.map((row) =>
    primarySpec.columns.map((c) => escapeCsvCell(row[c.key] ?? '')).join(',')
  );

  const csvBody = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const bytes = new TextEncoder().encode(csvBody);
  const sha256Checksum = await computeSha256(bytes);
  const slug = REPORT_DISPLAY_NAMES[effectiveType].replace(/[^a-zA-Z0-9]+/g, '_');
  const periodSlug = request.date_from === request.date_to ? request.date_to : `${request.date_from}_to_${request.date_to}`;

  return {
    bytes,
    fileName: `JOY_PeopleHR_${slug}_${periodSlug}.csv`,
    mimeType: 'text/csv;charset=utf-8;',
    sha256Checksum,
    reportType: effectiveType,
    reportTitle: dataset.reportTitle,
    recordCount: dataset.recordCount,
  };
}

// ============================================================================
// Vector A4 Branded PDF Generator
// ============================================================================

export async function generateMisPdf(
  request: MisExportRequest,
  source: MisSourceDataset
): Promise<MisExportArtifact> {
  assertTenantIsolation(request.company_id, source);

  const isConsolidated =
    request.requested_scope === 'CONSOLIDATED_WORKBOOK' || request.report_type === 'CONSOLIDATED_MIS';
  const sectionsToRender: MisSingleReportType[] = isConsolidated
    ? request.consolidated_sections && request.consolidated_sections.length > 0
      ? request.consolidated_sections
      : ALL_CONSOLIDATED_SECTIONS.map((s) => s.id)
    : [request.report_type as MisSingleReportType];

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const PAGE_W = 297;
  const PAGE_H = 210;
  const MARGIN_X = 10;
  const USABLE_W = PAGE_W - MARGIN_X * 2;
  const FOOTER_Y = PAGE_H - 10;
  const MAX_CONTENT_Y = FOOTER_Y - 6;

  const istNow = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const drawPageHeader = (sectionTitle: string, filtersText: string, continuation: boolean) => {
    doc.setFillColor(6, 78, 59); // #064E3B
    doc.rect(0, 0, PAGE_W, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(
      `JOY PeopleHR — ${sectionTitle}${continuation ? ' (Continued)' : ''}`,
      MARGIN_X,
      7.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      `Organization: ${request.company_name}   |   ${filtersText}`,
      MARGIN_X,
      13.5
    );
    doc.text(`Generated by ${request.generated_by} • ${istNow} IST`, PAGE_W - MARGIN_X, 7.5, {
      align: 'right',
    });
  };

  let isFirstPageOfDoc = true;
  let totalRecordCount = 0;

  for (const sectionType of sectionsToRender) {
    const dataset = buildFilteredMisDataset(
      { ...request, report_type: sectionType, requested_scope: 'CURRENT_REPORT' },
      source
    );
    const specs = buildSectionSpec(sectionType, dataset);
    totalRecordCount += dataset.recordCount;

    for (const spec of specs) {
      if (!isFirstPageOfDoc) {
        doc.addPage('a4', 'landscape');
      }
      isFirstPageOfDoc = false;

      drawPageHeader(spec.sectionTitle, dataset.filtersAppliedText, false);
      let cursorY = 23;

      // KPI Summary Cards strip
      const kpis = dataset.kpis.slice(0, 8);
      if (kpis.length > 0) {
        const gap = 2.5;
        const cardW = (USABLE_W - gap * (kpis.length - 1)) / kpis.length;
        kpis.forEach((k, idx) => {
          const x = MARGIN_X + idx * (cardW + gap);
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(x, cursorY, cardW, 14, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(k.label.toUpperCase(), x + 2.5, cursorY + 4.5, { maxWidth: cardW - 5 });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(6, 78, 59);
          doc.text(k.value, x + 2.5, cursorY + 10.5, { maxWidth: cardW - 5 });
        });
        cursorY += 18;
      }

      // Compute exact proportional column widths
      const totalWeight = spec.columns.reduce((s, c) => s + c.pdfWeight, 0);
      const colWidths = spec.columns.map((c) => (c.pdfWeight / totalWeight) * USABLE_W);

      const drawTableHeader = (y: number): number => {
        doc.setFillColor(15, 118, 110); // #0F766E
        doc.rect(MARGIN_X, y, USABLE_W, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(255, 255, 255);

        let colX = MARGIN_X;
        spec.columns.forEach((col, i) => {
          const w = colWidths[i];
          const textX = col.align === 'right' ? colX + w - 1.5 : col.align === 'center' ? colX + w / 2 : colX + 1.5;
          doc.text(col.header, textX, y + 5.2, {
            align: col.align || 'left',
            maxWidth: w - 3,
          });
          colX += w;
        });
        return y + 8;
      };

      cursorY = drawTableHeader(cursorY);

      if (spec.rows.length === 0) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(MARGIN_X, cursorY, USABLE_W, 18, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);
        doc.text(spec.emptyMessage, PAGE_W / 2, cursorY + 10.5, { align: 'center' });
        continue;
      }

      // Multi-page wrapped table rows
      spec.rows.forEach((rowData, rIdx) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.0);

        const wrappedCells = spec.columns.map((col, cIdx) => {
          const rawVal = rowData[col.key] ?? '—';
          const strVal =
            typeof rawVal === 'number' && col.numFmt === '0.00'
              ? rawVal.toFixed(2)
              : typeof rawVal === 'number' && col.numFmt === '0.0'
              ? rawVal.toFixed(1)
              : String(rawVal);
          return doc.splitTextToSize(strVal, Math.max(8, colWidths[cIdx] - 2.5)) as string[];
        });

        const maxLines = Math.max(1, ...wrappedCells.map((lines) => lines.length));
        const rowH = Math.max(6.2, maxLines * 3.4 + 2.4);

        if (cursorY + rowH > MAX_CONTENT_Y) {
          doc.addPage('a4', 'landscape');
          drawPageHeader(spec.sectionTitle, dataset.filtersAppliedText, true);
          cursorY = drawTableHeader(22);
        }

        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(MARGIN_X, cursorY, USABLE_W, rowH, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.line(MARGIN_X, cursorY + rowH, MARGIN_X + USABLE_W, cursorY + rowH);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.0);
        doc.setTextColor(30, 41, 59);

        let colX = MARGIN_X;
        spec.columns.forEach((col, cIdx) => {
          const w = colWidths[cIdx];
          const lines = wrappedCells[cIdx];
          const textX = col.align === 'right' ? colX + w - 1.5 : col.align === 'center' ? colX + w / 2 : colX + 1.5;
          lines.forEach((line, lIdx) => {
            doc.text(line, textX, cursorY + 4 + lIdx * 3.4, {
              align: col.align || 'left',
            });
          });
          colX += w;
        });

        cursorY += rowH;
      });

      // Totals Summary Footer Row in PDF if any summable columns exist
      if (spec.columns.some((c) => c.sumTotal)) {
        if (cursorY + 7 > MAX_CONTENT_Y) {
          doc.addPage('a4', 'landscape');
          drawPageHeader(spec.sectionTitle, dataset.filtersAppliedText, true);
          cursorY = drawTableHeader(22);
        }
        doc.setFillColor(241, 245, 249);
        doc.rect(MARGIN_X, cursorY, USABLE_W, 7, 'F');
        doc.setDrawColor(148, 163, 184);
        doc.line(MARGIN_X, cursorY, MARGIN_X + USABLE_W, cursorY);
        doc.line(MARGIN_X, cursorY + 7, MARGIN_X + USABLE_W, cursorY + 7);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);

        let colX = MARGIN_X;
        spec.columns.forEach((col, cIdx) => {
          const w = colWidths[cIdx];
          if (cIdx === 0) {
            doc.text(`TOTAL (${spec.rows.length})`, colX + 1.5, cursorY + 4.7);
          } else if (col.sumTotal) {
            const totalVal = spec.rows.reduce((s, r) => s + Number(r[col.key] || 0), 0);
            const label = col.numFmt === '0.00' ? totalVal.toFixed(2) : String(Math.round(totalVal));
            doc.text(label, colX + w - 1.5, cursorY + 4.7, { align: 'right' });
          }
          colX += w;
        });
      }
    }
  }

  // Pass 1 bytes to compute real SHA-256 or stamp page numbers + short checksum tag
  const preChecksumBytes = new Uint8Array(doc.output('arraybuffer'));
  const preHash = await computeSha256(preChecksumBytes);
  const totalPages = doc.getNumberOfPages();
  const reportTitle = REPORT_DISPLAY_NAMES[isConsolidated ? 'CONSOLIDATED_MIS' : request.report_type];

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.line(MARGIN_X, PAGE_H - 13, PAGE_W - MARGIN_X, PAGE_H - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${reportTitle}  |  Confidential — Authorized HR Use Only  |  Checksum: ${preHash.slice(0, 16)}`,
      MARGIN_X,
      FOOTER_Y + 2
    );
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN_X, FOOTER_Y + 2, { align: 'right' });
  }

  const finalBytes = new Uint8Array(doc.output('arraybuffer'));
  const finalSha256 = await computeSha256(finalBytes);
  const slug = reportTitle.replace(/[^a-zA-Z0-9]+/g, '_');
  const periodSlug = request.date_from === request.date_to ? request.date_to : `${request.date_from}_to_${request.date_to}`;

  return {
    bytes: finalBytes,
    fileName: `JOY_PeopleHR_${slug}_${periodSlug}.pdf`,
    mimeType: 'application/pdf',
    sha256Checksum: finalSha256,
    reportType: isConsolidated ? 'CONSOLIDATED_MIS' : request.report_type,
    reportTitle,
    recordCount: totalRecordCount,
    pageCount: totalPages,
  };
}

// ============================================================================
// Browser Download & Audit Log Persistence
// ============================================================================

export function triggerArtifactDownload(artifact: MisExportArtifact): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([artifact.bytes as unknown as BlobPart], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = artifact.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function recordMisExportAuditLog(params: {
  organizationId: string;
  reportType: string;
  reportingDate: string;
  channel: 'EXCEL_DOWNLOAD' | 'PDF_DOWNLOAD' | 'CSV_DOWNLOAD' | 'EMAIL' | 'WHATSAPP';
  recipientTarget: string;
  recipientName?: string;
  dispatchMode?: 'MANUAL' | 'AUTOMATED';
  status?: 'DELIVERED' | 'FAILED';
  sha256Checksum: string;
  fileName: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const idempotencyKey = `${params.channel}_${params.reportType}_${params.reportingDate}_${Date.now()}`;
    const { error } = await supabase.from('mis_delivery_audit_logs').insert({
      organization_id: params.organizationId,
      report_type: params.reportType,
      reporting_date: params.reportingDate,
      channel: params.channel,
      recipient_target: params.recipientTarget,
      recipient_name: params.recipientName || params.recipientTarget,
      dispatch_mode: params.dispatchMode || 'MANUAL',
      status: params.status || 'DELIVERED',
      provider: params.channel.includes('DOWNLOAD') ? 'browser_client' : 'edge_dispatch',
      sha256_checksum: params.sha256Checksum,
      file_name: params.fileName,
      idempotency_key: idempotencyKey,
      metadata: params.metadata || {},
    });
    return !error;
  } catch {
    return false;
  }
}

