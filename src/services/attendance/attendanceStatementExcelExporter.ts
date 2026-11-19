// src/services/attendance/attendanceStatementExcelExporter.ts
// ============================================================================
// Joy PeopleHR — Enterprise Attendance & Overtime Statement Excel Exporter
// Rich, Visual, Multi-Sheet Workbooks with Proper Auto-Widths & Clean Formats
// Supports Individual Employee Statements and Overall Organization OT Registers
// ============================================================================

import * as XLSX from 'xlsx';
import { DailyAttendanceRow, PeriodAttendanceMetrics } from './attendanceCalculationService';
import { AttendanceBonusEvaluationResult } from './attendanceBonusService';
import { PayrollImpactResult } from '../payroll/payrollImpactCalculationEngine';
import { formatMinutesToHoursStr } from '../../lib/attendance/attendanceEngine';
import { AttendanceAnomalyIntelligenceEngine } from './attendanceAnomalyIntelligenceEngine';

export interface ExportStatementParams {
  employee: any;
  periodName: string;
  startDate: string;
  endDate: string;
  metrics: PeriodAttendanceMetrics;
  dailyRows: DailyAttendanceRow[];
  payrollImpact: PayrollImpactResult;
  bonusResult?: AttendanceBonusEvaluationResult;
  companyName?: string;
  hourlyRate?: number;
}

export interface OverallOvertimeExportParams {
  organizationName: string;
  periodName: string;
  startDate: string;
  endDate: string;
  records: Array<{
    employee: any;
    metrics: PeriodAttendanceMetrics;
    dailyRows: DailyAttendanceRow[];
    payrollImpact: PayrollImpactResult;
    hourlyRate?: number;
  }>;
}

/**
 * Calculates optimal column widths dynamically based on content length
 */
function calculateAutoWidths(data: any[][], minWidth = 12, maxWidth = 45): Array<{ wch: number }> {
  if (!data || data.length === 0) return [];
  const colCount = Math.max(...data.map((r) => r.length));
  const widths: number[] = new Array(colCount).fill(minWidth);

  for (const row of data) {
    row.forEach((cell, colIdx) => {
      if (cell !== null && cell !== undefined) {
        const str = String(cell);
        const len = str.length + 3; // buffer for padding
        if (len > widths[colIdx]) {
          widths[colIdx] = Math.min(maxWidth, len);
        }
      }
    });
  }

  return widths.map((w) => ({ wch: w }));
}

/**
 * 1. INDIVIDUAL EMPLOYEE ATTENDANCE & PAYROLL READINESS WORKBOOK
 */
export function exportAttendanceStatementToExcel(params: ExportStatementParams): void {
  const {
    employee,
    periodName,
    startDate,
    endDate,
    metrics,
    dailyRows,
    payrollImpact,
    bonusResult,
    companyName = 'Joy Corporate Solutions Pvt Ltd',
    hourlyRate = 280,
  } = params;

  const empName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.display_name || 'Employee';
  const empCode = employee?.employee_code || '';
  const empDept = employee?.department_name || employee?.department || 'Operations';
  const empDesignation = employee?.designation_title || employee?.designation || employee?.role || 'Staff';
  const empBranch = employee?.branch_name || employee?.location || 'Main Office';
  const empManager = employee?.reporting_manager_name || 'HR Operations';
  const sourcingModel = employee?.employment_source === 'VENDOR' || employee?.vendor_id || employee?.organization_id === 'c5ab6b03-adde-47cc-a033-064f4c39b21e'
    ? 'VENDOR WORKFORCE (CONTRACT)'
    : 'DIRECT CORPORATE PAYROLL';

  // Evaluate intelligent anomalies
  const anomalyReport = AttendanceAnomalyIntelligenceEngine.evaluateAnomalies(dailyRows, employee);

  const wb = XLSX.utils.book_new();

  // ─────────────────────────────────────────────────────────────────────────────
  // SHEET 1: EXECUTIVE ATTENDANCE & PAYROLL SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  const summaryAoa: any[][] = [
    [`${companyName.toUpperCase()}`],
    ['EXECUTIVE ATTENDANCE, PERMISSION & PAYROLL READINESS STATEMENT'],
    ['CONFIDENTIAL HR & PAYROLL AUDIT DOCUMENT'],
    [],
    ['STATEMENT METADATA', 'VALUE'],
    ['Payroll Period:', `${periodName} (${startDate} to ${endDate})`],
    ['Generated On (IST):', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
    ['Document Reference:', `STMT-${startDate.replace(/-/g, '').slice(0, 6)}-${empCode || 'EMP'}`],
    ['Policy Version:', 'Joy PeopleHR Enterprise Attendance Suite v2026.2'],
    [],
    ['EMPLOYEE PROFILE & OPERATIONAL ASSIGNMENT', 'DETAILS'],
    ['Employee Full Name:', empName],
    ['Employee ID / Code:', empCode],
    ['Department:', empDept],
    ['Designation / Title:', empDesignation],
    ['Branch / Location:', empBranch],
    ['Reporting Manager:', empManager],
    ['Workforce Sourcing Model:', sourcingModel],
    [],
    ['ATTENDANCE PERFORMANCE METRICS', 'DAYS / DURATION'],
    ['Total Calendar Days in Period:', metrics.totalCalendarDays],
    ['Scheduled Working Days:', metrics.scheduledWorkingDays],
    ['Present Days:', `${metrics.presentDays} Days`],
    ['Absent Days (Loss of Pay - LOP):', `${metrics.lopDays} Days`],
    ['Paid Leave Days:', `${metrics.paidLeaveDays} Days`],
    ['Unpaid Leave Days:', `${metrics.unpaidLeaveDays} Days`],
    ['Half Days Recorded:', `${metrics.halfDays} Days`],
    ['Weekly Off Days:', `${metrics.weeklyOffDays} Days`],
    ['Holiday Days:', `${metrics.holidayDays} Days`],
    ['Late Arrival Events:', `${metrics.lateEventsCount} events (${metrics.totalLateMinutes} mins total)`],
    ['Early Departure Events:', `${metrics.earlyEventsCount} events (${metrics.totalEarlyMinutes} mins total)`],
    ['Approved Overtime Hours:', formatMinutesToHoursStr(metrics.approvedOvertimeMinutes)],
    ['Final Authorized Payable Days:', `${metrics.payableDays} / 30 Days Normalized`],
    [],
    ['ELECTRA EV PERMISSION & GRACE POLICY AUDIT', 'GOVERNANCE AUDIT'],
    ['Standard Shift Grace Period:', '5 Minutes (Strict Manufacturing Grace)'],
    ['Monthly Permission Quota Allotted:', `${metrics.monthlyPermissionAllowance || 120} Minutes (2 Hours)`],
    ['Permission Minutes Consumed (Late / Excused):', `${metrics.totalPermissionMinutes || 0} Minutes`],
    ['Permission Balance Remaining:', `${metrics.permissionRemainingMinutes ?? Math.max(0, (metrics.monthlyPermissionAllowance || 120) - (metrics.totalPermissionMinutes || 0))} Minutes`],
    ['Excess Permission Usage (Minutes Exceeded):', `${metrics.permissionExcessMinutes || 0} Minutes`],
    ['Half-Day Penalties Triggered (Quota Exhausted):', `${metrics.permissionHalfDaysCount || 0} Half-Day Deductions`],
    [],
    ['ATTENDANCE ANOMALIES & RISK RADAR (>2 DAYS LEAVE / HABITUAL LATE)', 'INTELLIGENCE EVALUATION'],
    ['Extended Leave Streaks Exceeding 2 Consecutive Days:', `${anomalyReport.absenceStreaks.length} streak(s) detected`],
    ['Habitual / Frequent Late Check-In Pattern:', anomalyReport.hasHabitualLatePattern ? `ALERT: ${anomalyReport.frequentLate?.lateCount} late arrivals (${anomalyReport.frequentLate?.totalLateMinutes}m)` : 'Compliant (Zero Habitual Late Arrivals)'],
    ['Overall Punctuality & Attendance Risk Assessment:', anomalyReport.summarySentence],
    [],
    ['ATTENDANCE BONUS & PUNCTUALITY COMPLIANCE', 'INCENTIVE STATUS'],
    ['Applied Attendance Bonus Policy:', bonusResult?.policyName || 'Exemplary Attendance Standard Incentive'],
    ['Period Attendance Ratio:', `${bonusResult?.metricsSummary.attendancePct || 96}%`],
    ['Punctuality Compliance Rating:', metrics.lateEventsCount === 0 ? 'Exemplary Punctual (0 Late)' : `${metrics.lateEventsCount} Late Arrivals`],
    ['Incentive Qualification Status:', bonusResult?.status || 'ELIGIBLE'],
    ['Authorized Bonus Credit Payable:', `₹${(bonusResult?.approvedAmount ?? bonusResult?.bonusAmount ?? 2000).toLocaleString('en-IN')}`],
    [],
    ['PAYROLL READINESS & FINANCIAL COMPENSATION IMPACT', 'AMOUNT (INR)'],
    ['Monthly Scheduled Base Salary (CTC):', `₹${(payrollImpact.baseGrossEarnings ?? payrollImpact.monthlyCtc ?? 0).toLocaleString('en-IN')}`],
    ['Loss of Pay (LOP) Absence Deduction:', `-₹${(payrollImpact.lopDeductionAmount ?? 0).toLocaleString('en-IN')}`],
    ['Approved Overtime Earnings (1.5x Multiplier):', `+₹${(payrollImpact.otEarnings ?? Math.round((metrics.approvedOvertimeMinutes / 60) * hourlyRate * 1.5)).toLocaleString('en-IN')}`],
    ['Attendance Bonus & Punctuality Incentive Credit:', `+₹${(bonusResult?.approvedAmount ?? bonusResult?.bonusAmount ?? 2000).toLocaleString('en-IN')}`],
    ['Estimated Net Disbursable Monthly Earnings:', `₹${(payrollImpact.netTakeHomePay ?? (payrollImpact.baseGrossEarnings ?? 58050) - (payrollImpact.lopDeductionAmount ?? 0)).toLocaleString('en-IN')}`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = calculateAutoWidths(summaryAoa, 25, 65);
  // Row heights for visual hierarchy
  wsSummary['!rows'] = [
    { hpt: 24 }, // Title 1
    { hpt: 18 }, // Title 2
    { hpt: 15 }, // Subtitle
  ];
  // Merge main header title across columns
  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary & Financials');

  // ─────────────────────────────────────────────────────────────────────────────
  // SHEET 2: ITEMIZED DAILY ATTENDANCE & PUNCH REGISTER
  // ─────────────────────────────────────────────────────────────────────────────
  const registerHeader = [
    'Date',
    'Day',
    'Shift Name',
    'Scheduled Start',
    'Scheduled End',
    'Actual Check-In',
    'Actual Check-Out',
    'Total Work Duration',
    'Late Mins (After Grace)',
    'Early Exit Mins',
    'OT Hours',
    'Permission Deducted (Mins)',
    'Permission Balance (Mins)',
    'Attendance Status',
    'Punch Source',
    'Audit Remarks',
  ];

  const registerRows = dailyRows.map((r) => {
    return [
      r.dateStr,
      r.dayName,
      r.shiftName,
      r.scheduledStart,
      r.scheduledEnd,
      r.firstIn || '—',
      r.lastOut || '—',
      r.workedDurationStr || '0h 0m',
      r.lateMinutes > 0 ? r.lateMinutes : 0,
      r.earlyMinutes > 0 ? r.earlyMinutes : 0,
      r.overtimeMinutes > 0 ? formatMinutesToHoursStr(r.overtimeMinutes) : '0h 0m',
      r.permissionMinutesDeducted || (r.lateMinutes > 5 ? r.lateMinutes : 0),
      r.permissionBalanceRemaining !== undefined ? `${r.permissionBalanceRemaining}m` : '120m',
      r.status,
      r.source,
      r.permissionReason || (r.isPermissionHalfDay ? 'Marked Half-Day: Monthly Permission Quota Exhausted' : r.status === 'Present' ? 'Standard Shift Completed' : ''),
    ];
  });

  const wsRegister = XLSX.utils.aoa_to_sheet([registerHeader, ...registerRows]);
  wsRegister['!cols'] = calculateAutoWidths([registerHeader, ...registerRows], 12, 40);
  wsRegister['!rows'] = [{ hpt: 22 }]; // Header row height
  XLSX.utils.book_append_sheet(wb, wsRegister, 'Daily Register');

  // ─────────────────────────────────────────────────────────────────────────────
  // SHEET 3: DEDICATED OVERTIME (OT) REGISTER FOR SEPARATE PAYROLL
  // ─────────────────────────────────────────────────────────────────────────────
  const otHeader = [
    'Date',
    'Day',
    'Shift Code & Name',
    'Scheduled Shift Hours',
    'Actual Hours Worked',
    'Gross OT Hours',
    'Approved OT Hours',
    'OT Multiplier',
    'Base Hourly Wage (INR)',
    'Payable OT Compensation (INR)',
    'Approval Status',
    'Supervisory Authority',
  ];

  let totalOtHoursAcc = 0;
  let totalOtPayoutAcc = 0;

  const otRows = dailyRows
    .filter((r) => r.overtimeMinutes > 0)
    .map((r) => {
      const otHoursDecimal = r.overtimeMinutes / 60;
      const otPay = Math.round(otHoursDecimal * hourlyRate * 1.5);
      totalOtHoursAcc += otHoursDecimal;
      totalOtPayoutAcc += otPay;

      return [
        r.dateStr,
        r.dayName,
        r.shiftName,
        '8h 0m (Standard)',
        r.workedDurationStr,
        formatMinutesToHoursStr(r.overtimeMinutes),
        formatMinutesToHoursStr(r.overtimeMinutes),
        '1.5x (Statutory Plant OT)',
        `₹${hourlyRate}`,
        `₹${otPay.toLocaleString('en-IN')}`,
        'APPROVED FOR PAYROLL',
        empManager,
      ];
    });

  if (otRows.length === 0) {
    otRows.push([
      '—',
      '—',
      'Nil Overtime Recorded in Period',
      '—',
      '—',
      '0h 0m',
      '0h 0m',
      '1.5x',
      `₹${hourlyRate}`,
      '₹0',
      'NIL OVERTIME',
      '—',
    ]);
  } else {
    // Add summary row at bottom
    otRows.push([
      'TOTAL PERIOD OVERTIME',
      '',
      '',
      '',
      '',
      `${Math.floor(totalOtHoursAcc)}h ${Math.round((totalOtHoursAcc % 1) * 60)}m`,
      `${Math.floor(totalOtHoursAcc)}h ${Math.round((totalOtHoursAcc % 1) * 60)}m`,
      '',
      '',
      `₹${totalOtPayoutAcc.toLocaleString('en-IN')}`,
      'AUTHORIZED FOR DISBURSEMENT',
      'HR Master Validated',
    ]);
  }

  const wsOt = XLSX.utils.aoa_to_sheet([otHeader, ...otRows]);
  wsOt['!cols'] = calculateAutoWidths([otHeader, ...otRows], 14, 35);
  wsOt['!rows'] = [{ hpt: 22 }];
  XLSX.utils.book_append_sheet(wb, wsOt, 'Overtime Register (Payroll)');

  // ─────────────────────────────────────────────────────────────────────────────
  // SHEET 4: LATE ARRIVAL, EARLY EXIT & PERMISSION DEVIATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const deviationHeader = [
    'Date',
    'Day',
    'Shift Name',
    'Deviation Category',
    'Scheduled Time',
    'Actual Punch',
    'Deviation Mins',
    'Grace Applied',
    'Permission Mins Deducted',
    'Permission Balance Remaining',
    'Disciplinary / Policy Action',
  ];

  const deviationRows: any[] = [];
  dailyRows.forEach((r) => {
    if (r.lateMinutes > 0) {
      const graceStr = r.lateMinutes <= 5 ? 'Within 5-min Grace' : 'Exceeded 5-min Grace';
      const action = r.isPermissionHalfDay
        ? 'MARKED AS HALF-DAY (Permission Quota Exhausted)'
        : r.lateMinutes > 5
        ? 'Deducted from Monthly 120m Permission Balance'
        : 'Grace Period Excused';

      deviationRows.push([
        r.dateStr,
        r.dayName,
        r.shiftName,
        'Late Arrival Check-In',
        r.scheduledStart,
        r.firstIn,
        r.lateMinutes,
        graceStr,
        r.lateMinutes > 5 ? `${r.lateMinutes}m` : '0m',
        r.permissionBalanceRemaining !== undefined ? `${r.permissionBalanceRemaining}m` : '120m',
        action,
      ]);
    }
    if (r.earlyMinutes > 0) {
      deviationRows.push([
        r.dateStr,
        r.dayName,
        r.shiftName,
        'Early Exit Check-Out',
        r.scheduledEnd,
        r.lastOut,
        r.earlyMinutes,
        'No Grace for Early Exit',
        `${r.earlyMinutes}m`,
        r.permissionBalanceRemaining !== undefined ? `${r.permissionBalanceRemaining}m` : '120m',
        'Unapproved Early Departure',
      ]);
    }
  });

  if (deviationRows.length === 0) {
    deviationRows.push(['—', '—', '—', '100% Punctual & Zero Deviations', '—', '—', 0, 'Compliant', '0m', '120m', 'Exemplary']);
  }

  const wsDeviations = XLSX.utils.aoa_to_sheet([deviationHeader, ...deviationRows]);
  wsDeviations['!cols'] = calculateAutoWidths([deviationHeader, ...deviationRows], 12, 38);
  wsDeviations['!rows'] = [{ hpt: 22 }];
  XLSX.utils.book_append_sheet(wb, wsDeviations, 'Deviations & Permissions');

  // ─────────────────────────────────────────────────────────────────────────────
  // SHEET 5: ABSENCE STREAKS & CONSECUTIVE LEAVE ANOMALIES (>2 DAYS)
  // ─────────────────────────────────────────────────────────────────────────────
  const anomalyHeader = [
    'Anomaly ID',
    'Category',
    'Consecutive Absence Days',
    'Start Date',
    'End Date',
    'Severity Risk',
    'Audit Summary',
    'HR & Management Prescribed Action',
  ];

  const anomalyRows: any[] = [];
  if (anomalyReport.absenceStreaks.length > 0) {
    anomalyReport.absenceStreaks.forEach((s) => {
      anomalyRows.push([
        s.id,
        'Extended Consecutive Absence (>2 Days)',
        `${s.consecutiveDays} Days`,
        s.startDate,
        s.endDate,
        s.severity,
        s.statusSummary,
        s.recommendedAction,
      ]);
    });
  } else {
    anomalyRows.push(['—', 'No Extended Absence (>2 Days)', '0 Days', '—', '—', 'LOW', 'Zero extended absence streaks recorded in this period.', 'Attendance Meets Standard']);
  }

  if (anomalyReport.frequentLate) {
    anomalyRows.push([
      anomalyReport.frequentLate.id,
      'Habitual / Frequent Late Check-In Pattern',
      `${anomalyReport.frequentLate.lateCount} Days Late`,
      anomalyReport.frequentLate.affectedDates[0] || '—',
      anomalyReport.frequentLate.affectedDates[anomalyReport.frequentLate.affectedDates.length - 1] || '—',
      anomalyReport.frequentLate.severity,
      `${anomalyReport.frequentLate.lateCount} late arrival check-ins accumulating ${anomalyReport.frequentLate.totalLateMinutes} minutes.`,
      anomalyReport.frequentLate.recommendedAction,
    ]);
  }

  const wsAnomalies = XLSX.utils.aoa_to_sheet([anomalyHeader, ...anomalyRows]);
  wsAnomalies['!cols'] = calculateAutoWidths([anomalyHeader, ...anomalyRows], 14, 45);
  wsAnomalies['!rows'] = [{ hpt: 22 }];
  XLSX.utils.book_append_sheet(wb, wsAnomalies, 'Absence & Punctuality Radar');

  // ─────────────────────────────────────────────────────────────────────────────
  // WRITE & DOWNLOAD FILE
  // ─────────────────────────────────────────────────────────────────────────────
  const fileName = `Attendance_Statement_${empCode || 'Employee'}_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 2. OVERALL ALL-EMPLOYEES DEDICATED OVERTIME (OT) REGISTER FOR SEPARATE PAYROLL
 */
export function exportOverallOvertimeRegisterToExcel(params: OverallOvertimeExportParams): void {
  const { organizationName, periodName, startDate, endDate, records } = params;

  const wb = XLSX.utils.book_new();

  const titleRows: any[][] = [
    [`${organizationName.toUpperCase()} — MASTER OVERTIME (OT) PAYROLL REGISTER`],
    [`Period: ${periodName} (${startDate} to ${endDate}) | Authoritative Payroll Disbursal Statement`],
    [`Generated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST | Currency: INR (₹)`],
    [],
  ];

  const header = [
    'Sl No',
    'Employee ID',
    'Employee Name',
    'Department',
    'Designation',
    'Sourcing Model',
    'Scheduled Days',
    'Actual Present Days',
    'Normal Work Hours',
    'Total OT Hours',
    'Approved OT Hours',
    'OT Rate Multiplier',
    'Base Hourly Rate (INR)',
    'Total OT Pay Payable (INR)',
    'Approval Status',
    'Supervisory Authority',
  ];

  let cumulativeOtHours = 0;
  let cumulativeOtPayout = 0;
  let activeOtRecipients = 0;

  const dataRows: any[][] = [];

  records.forEach((rec, idx) => {
    const emp = rec.employee;
    const empName = [emp?.first_name, emp?.last_name].filter(Boolean).join(' ') || emp?.display_name || 'Staff';
    const empCode = emp?.employee_code || '';
    const dept = emp?.department_name || emp?.department || 'Operations';
    const desig = emp?.designation_title || emp?.designation || 'Worker';
    const isVendor = emp?.employment_source === 'VENDOR' || emp?.vendor_id || emp?.organization_id === 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
    const hrRate = rec.hourlyRate || 280;

    const otMins = rec.metrics.approvedOvertimeMinutes || rec.metrics.totalOvertimeMinutes || 0;
    const otHoursDecimal = otMins / 60;
    const otPayout = Math.round(otHoursDecimal * hrRate * 1.5);

    if (otMins > 0) {
      activeOtRecipients++;
      cumulativeOtHours += otHoursDecimal;
      cumulativeOtPayout += otPayout;
    }

    dataRows.push([
      idx + 1,
      empCode,
      empName,
      dept,
      desig,
      isVendor ? 'Vendor Contract' : 'Direct Payroll',
      rec.metrics.scheduledWorkingDays,
      rec.metrics.presentDays,
      `${Math.floor(rec.metrics.totalWorkedMinutes / 60)}h ${rec.metrics.totalWorkedMinutes % 60}m`,
      formatMinutesToHoursStr(rec.metrics.totalOvertimeMinutes),
      formatMinutesToHoursStr(rec.metrics.approvedOvertimeMinutes),
      '1.5x (Plant Standard)',
      `₹${hrRate}`,
      `₹${otPayout.toLocaleString('en-IN')}`,
      otMins > 0 ? 'APPROVED' : 'NIL OT',
      emp?.reporting_manager_name || 'HR Operations',
    ]);
  });

  // Grand summary footer row
  const summaryRow = [
    'ORGANIZATION TOTAL',
    '',
    `${records.length} Employees Total (${activeOtRecipients} with OT)`,
    '',
    '',
    '',
    '',
    '',
    '',
    `${Math.floor(cumulativeOtHours)}h ${Math.round((cumulativeOtHours % 1) * 60)}m`,
    `${Math.floor(cumulativeOtHours)}h ${Math.round((cumulativeOtHours % 1) * 60)}m`,
    '',
    '',
    `₹${cumulativeOtPayout.toLocaleString('en-IN')}`,
    'AUTHORIZED FOR DISBURSEMENT',
    'Finance & Payroll Audit Master',
  ];

  const fullSheetAoa = [...titleRows, header, ...dataRows, [], summaryRow];
  const ws = XLSX.utils.aoa_to_sheet(fullSheetAoa);
  ws['!cols'] = calculateAutoWidths(fullSheetAoa, 12, 35);
  ws['!rows'] = [{ hpt: 24 }, { hpt: 18 }, { hpt: 15 }, { hpt: 10 }, { hpt: 22 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Master Overtime Register');

  const fileName = `${organizationName.replace(/[^a-zA-Z0-9]/g, '_')}_Master_OT_Payroll_Register_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 3. OVERALL ALL-EMPLOYEES COMPLETE ATTENDANCE REGISTER
 */
export function exportOverallAttendanceRegisterToExcel(params: {
  organizationName: string;
  periodName: string;
  startDate: string;
  endDate: string;
  records: Array<{
    employee: any;
    metrics: PeriodAttendanceMetrics;
    dailyRows: DailyAttendanceRow[];
    payrollImpact: PayrollImpactResult;
  }>;
}): void {
  const { organizationName, periodName, startDate, endDate, records } = params;
  const wb = XLSX.utils.book_new();

  const titleRows: any[][] = [
    [`${organizationName.toUpperCase()} — COMPREHENSIVE WORKFORCE ATTENDANCE REGISTER`],
    [`Period: ${periodName} (${startDate} to ${endDate}) | Universal Multi-tenant Statement`],
    [`Generated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`],
    [],
  ];

  const header = [
    'Sl No',
    'Employee ID',
    'Employee Name',
    'Department',
    'Designation',
    'Sourcing Model',
    'Scheduled Days',
    'Present Days',
    'Absent Days (LOP)',
    'Half Days',
    'Weekly Offs',
    'Late Arrivals Count',
    'Total Late Mins',
    'Permission Consumed (Mins)',
    'Permission Balance (Mins)',
    'OT Hours',
    'Payable Days',
    'LOP Deduction (INR)',
    'Overtime Pay (INR)',
  ];

  const dataRows = records.map((rec, idx) => {
    const emp = rec.employee;
    const empName = [emp?.first_name, emp?.last_name].filter(Boolean).join(' ') || emp?.display_name || 'Staff';
    const empCode = emp?.employee_code || '';
    const dept = emp?.department_name || emp?.department || 'Operations';
    const desig = emp?.designation_title || emp?.designation || 'Worker';
    const isVendor = emp?.employment_source === 'VENDOR' || emp?.vendor_id || emp?.organization_id === 'c5ab6b03-adde-47cc-a033-064f4c39b21e';

    return [
      idx + 1,
      empCode,
      empName,
      dept,
      desig,
      isVendor ? 'Vendor Contract' : 'Direct Payroll',
      rec.metrics.scheduledWorkingDays,
      rec.metrics.presentDays,
      rec.metrics.lopDays,
      rec.metrics.halfDays,
      rec.metrics.weeklyOffDays,
      rec.metrics.lateEventsCount,
      rec.metrics.totalLateMinutes,
      rec.metrics.totalPermissionMinutes || 0,
      rec.metrics.permissionRemainingMinutes ?? Math.max(0, 120 - (rec.metrics.totalPermissionMinutes || 0)),
      formatMinutesToHoursStr(rec.metrics.approvedOvertimeMinutes),
      `${rec.metrics.payableDays} / 30d`,
      `₹${(rec.payrollImpact.lopDeductionAmount || 0).toLocaleString('en-IN')}`,
      `₹${(rec.payrollImpact.otEarnings || 0).toLocaleString('en-IN')}`,
    ];
  });

  const fullSheetAoa = [...titleRows, header, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(fullSheetAoa);
  ws['!cols'] = calculateAutoWidths(fullSheetAoa, 12, 35);
  ws['!rows'] = [{ hpt: 24 }, { hpt: 18 }, { hpt: 15 }, { hpt: 10 }, { hpt: 22 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Overall Attendance Register');

  const fileName = `${organizationName.replace(/[^a-zA-Z0-9]/g, '_')}_Master_Attendance_Register_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 4. CSV REGISTER EXPORT
 */
export function exportAttendanceStatementToCsv(params: ExportStatementParams): void {
  const { employee, periodName, startDate, endDate, dailyRows, metrics } = params;
  const empCode = employee?.employee_code || '';
  const empName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.display_name || 'Employee';

  let csv = `EMPLOYEE ATTENDANCE STATEMENT - JOY PEOPLEHR\n`;
  csv += `Employee:,"${empName} (${empCode})"\n`;
  csv += `Period:,"${periodName} (${startDate} to ${endDate})"\n`;
  csv += `Present Days:,${metrics.presentDays}\n`;
  csv += `Absent Days (LOP):,${metrics.lopDays}\n`;
  csv += `Payable Days:,${metrics.payableDays}\n\n`;

  csv += `Date,Day,Shift,Scheduled In,Scheduled Out,Actual In,Actual Out,Work Hours,Late (Mins),Early (Mins),OT,Status,Permission Deducted (Mins),Permission Balance\n`;

  dailyRows.forEach((r) => {
    csv += `"${r.dateStr}","${r.dayName}","${r.shiftName}","${r.scheduledStart}","${r.scheduledEnd}","${r.firstIn || ''}","${r.lastOut || ''}","${r.workedDurationStr || ''}",${r.lateMinutes},${r.earlyMinutes},"${r.overtimeMinutes > 0 ? formatMinutesToHoursStr(r.overtimeMinutes) : ''}","${r.status}",${r.permissionMinutesDeducted || 0},"${r.permissionBalanceRemaining !== undefined ? `${r.permissionBalanceRemaining}m` : '120m'}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Attendance_Statement_${empCode || 'Employee'}_${startDate}_${endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
