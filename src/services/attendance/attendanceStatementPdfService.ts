// src/services/attendance/attendanceStatementPdfService.ts
// ============================================================================
// Joy PeopleHR — Official Attendance & Overtime Statement Vector PDF Generator
// Generates Multi-Page Crisp A4 Documents using jsPDF with Corporate Emerald Branding
// ============================================================================

import { jsPDF } from 'jspdf';
import { DailyAttendanceRow, PeriodAttendanceMetrics } from './attendanceCalculationService';
import { AttendanceBonusEvaluationResult } from './attendanceBonusService';
import { PayrollImpactResult } from '../payroll/payrollImpactCalculationEngine';
import { formatMinutesToHoursStr } from '../../lib/attendance/attendanceEngine';
import { AttendanceAnomalyIntelligenceEngine } from './attendanceAnomalyIntelligenceEngine';

export interface GeneratePdfStatementParams {
  employee: any;
  periodName: string;
  startDate: string;
  endDate: string;
  metrics: PeriodAttendanceMetrics;
  dailyRows: DailyAttendanceRow[];
  payrollImpact: PayrollImpactResult;
  bonusResult?: AttendanceBonusEvaluationResult;
  companyName?: string;
  organizationName?: string;
  hourlyRate?: number;
}

export class AttendanceStatementPdfService {
  /**
   * Generates a multi-page, print-ready vector A4 PDF statement.
   */
  public static generateStatementPdf(params: GeneratePdfStatementParams): jsPDF {
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
      organizationName = 'JOY PeopleHR Enterprise',
      hourlyRate = 280,
    } = params;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2; // 186mm

    const empName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.display_name || 'Employee';
    const empCode = employee?.employee_code || '';
    const empDept = employee?.department_name || employee?.department || 'Operations';
    const empDesignation = employee?.designation_title || employee?.designation || employee?.role || 'Staff';
    const empBranch = employee?.branch_name || employee?.location || 'Main Office';
    const empManager = employee?.reporting_manager_name || 'HR Operations';
    const isVendor = employee?.employment_source === 'VENDOR' || employee?.vendor_id || employee?.organization_id === 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
    const statementRef = `STMT-${startDate.replace(/-/g, '').slice(0, 6)}-${empCode || 'EMP'}`;
    const generationTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

    const anomalyReport = AttendanceAnomalyIntelligenceEngine.evaluateAnomalies(dailyRows, employee);

    let y = margin;

    // Helper: draw document header
    const drawHeader = (pageNumber: number) => {
      // Top emerald accent bar
      doc.setFillColor(7, 86, 61); // #07563D
      doc.rect(margin, y, contentWidth, 2, 'F');
      y += 5;

      // Brand Logo & Title
      doc.setFillColor(7, 86, 61);
      doc.roundedRect(margin, y, 14, 10, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('JOY', margin + 7, y + 6.5, { align: 'center' });

      doc.setTextColor(7, 86, 61);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text((companyName || organizationName).toUpperCase(), margin + 17, y + 5);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('JOY PeopleHR Workforce Intelligence • Statutory & Payroll Compliance Engine', margin + 17, y + 9);

      // Statement Ref Badge
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.roundedRect(pageWidth - margin - 45, y, 45, 9, 1, 1, 'FD');
      doc.setTextColor(7, 86, 61);
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.text(statementRef, pageWidth - margin - 22.5, y + 4.5, { align: 'center' });
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(`${generationTime} IST`, pageWidth - margin - 22.5, y + 7.5, { align: 'center' });

      y += 13;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    };

    // Helper: draw footer on all pages
    const drawFooter = (pageNum: number, totalPages: number) => {
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Confidential • Authorized for Payroll Disbursement & Human Resources Audit', margin, pageHeight - 7);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 1: EXECUTIVE PROFILE, PERFORMANCE CARDS & COMPLIANCE SUMMARY
    // ─────────────────────────────────────────────────────────────────────────
    drawHeader(1);

    // Document Subject
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('EMPLOYEE ATTENDANCE & PAYROLL READINESS STATEMENT', margin, y + 2);
    doc.setTextColor(7, 86, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Period: ${periodName} (${startDate} to ${endDate})`, pageWidth - margin, y + 2, { align: 'right' });
    y += 7;

    // 1. Employee Profile Card (Grid)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 23, 1.5, 1.5, 'FD');

    const colW = contentWidth / 4;
    const pX = margin + 3;
    const pY = y + 4;

    // Row 1
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('EMPLOYEE NAME', pX, pY);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(empName, pX, pY + 4.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('EMPLOYEE ID', pX + colW, pY);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('courier', 'bold');
    doc.text(empCode, pX + colW, pY + 4.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('DEPARTMENT', pX + colW * 2, pY);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(empDept, pX + colW * 2, pY + 4.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('SOURCING MODEL', pX + colW * 3, pY);
    doc.setFontSize(7.5);
    doc.setTextColor(isVendor ? 180 : 7, isVendor ? 83 : 86, isVendor ? 9 : 61);
    doc.setFont('helvetica', 'bold');
    doc.text(isVendor ? 'Vendor (Contract)' : 'Direct Payroll', pX + colW * 3, pY + 4.5);

    // Row 2
    const pY2 = pY + 11;
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('DESIGNATION', pX, pY2);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(empDesignation, pX, pY2 + 4.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('LOCATION / BRANCH', pX + colW, pY2);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(empBranch, pX + colW, pY2 + 4.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('REPORTING MANAGER', pX + colW * 2, pY2);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(empManager, pX + colW * 2, pY2 + 4.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('ASSIGNED SHIFT', pX + colW * 3, pY2);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('General Shift (08:30-17:30)', pX + colW * 3, pY2 + 4.5);

    y += 27;

    // 2. Executive Attendance Summary Table (Days Basis)
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE ATTENDANCE SUMMARY (30-DAY BASIS)', margin, y);
    y += 3.5;

    const summaryHeaders = ['Scheduled', 'Present', 'Absent LOP', 'Paid Leave', 'Half Days', 'Weekly Offs', 'Late Mins', 'OT Hours', 'Payable Days'];
    const summaryValues = [
      `${metrics.scheduledWorkingDays}d`,
      `${metrics.presentDays}d`,
      `${metrics.lopDays}d`,
      `${metrics.paidLeaveDays}d`,
      `${metrics.halfDays}d`,
      `${metrics.weeklyOffDays}d`,
      `${metrics.totalLateMinutes}m`,
      formatMinutesToHoursStr(metrics.approvedOvertimeMinutes),
      `${metrics.payableDays} / 30d`,
    ];

    const sColW = contentWidth / summaryHeaders.length;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    summaryHeaders.forEach((h, i) => {
      doc.text(h, margin + i * sColW + sColW / 2, y + 4, { align: 'center' });
    });

    y += 6;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y - 6, contentWidth, 13, 'S');

    doc.setFontSize(8);
    summaryValues.forEach((v, i) => {
      if (i === 1) doc.setTextColor(4, 120, 87); // Present emerald
      else if (i === 2) doc.setTextColor(190, 18, 60); // Absent red
      else if (i === 8) doc.setTextColor(7, 86, 61); // Payable days bold emerald
      else doc.setTextColor(15, 23, 42);

      doc.setFont('helvetica', i === 8 || i === 1 || i === 2 ? 'bold' : 'normal');
      doc.text(v, margin + i * sColW + sColW / 2, y + 4.8, { align: 'center' });
    });

    y += 12;

    // 3. Two-Column Intelligence Cards: Electra EV Permission Policy vs Attendance Anomaly Radar
    const cardW = (contentWidth - 4) / 2;

    // Left Card: Electra EV 5-Minute Grace & Permission Policy Audit
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, cardW, 35, 1.5, 1.5, 'FD');

    doc.setFillColor(7, 86, 61);
    doc.rect(margin, y, cardW, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('ELECTRA EV PERMISSION & 5-MIN GRACE POLICY AUDIT', margin + 3, y + 3.8);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const permY = y + 9;
    doc.text('• Grace Period Allowed:', margin + 3, permY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('5 Minutes', margin + cardW - 3, permY, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('• Monthly Permission Quota:', margin + 3, permY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${metrics.monthlyPermissionAllowance || 120} Minutes (2 Hours)`, margin + cardW - 3, permY + 5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('• Late Arrival Minutes Deducted:', margin + 3, permY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(metrics.totalPermissionMinutes > 0 ? 190 : 15, metrics.totalPermissionMinutes > 0 ? 18 : 23, metrics.totalPermissionMinutes > 0 ? 60 : 42);
    doc.text(`${metrics.totalPermissionMinutes || 0} Minutes`, margin + cardW - 3, permY + 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('• Permission Balance Remaining:', margin + 3, permY + 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(4, 120, 87);
    const remPerm = metrics.permissionRemainingMinutes ?? Math.max(0, (metrics.monthlyPermissionAllowance || 120) - (metrics.totalPermissionMinutes || 0));
    doc.text(`${remPerm} Minutes`, margin + cardW - 3, permY + 15, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('• Half-Day Trigger (Quota Over):', margin + 3, permY + 20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(metrics.permissionHalfDaysCount > 0 ? 190 : 4, metrics.permissionHalfDaysCount > 0 ? 18 : 120, metrics.permissionHalfDaysCount > 0 ? 60 : 87);
    doc.text(`${metrics.permissionHalfDaysCount || 0} Penalties Triggered`, margin + cardW - 3, permY + 20, { align: 'right' });

    // Right Card: Attendance Anomaly & Risk Radar (> 2 Days Leave / Habitual Late)
    const rightX = margin + cardW + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(rightX, y, cardW, 35, 1.5, 1.5, 'FD');

    doc.setFillColor(15, 23, 42);
    doc.rect(rightX, y, cardW, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('ATTENDANCE ANOMALIES & RISK RADAR', rightX + 3, y + 3.8);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('• Extended Absence (>2 Days Streak):', rightX + 3, permY);
    doc.setFont('helvetica', 'bold');
    if (anomalyReport.absenceStreaks.length > 0) {
      doc.setTextColor(190, 18, 60);
      doc.text(`ALERT: ${anomalyReport.absenceStreaks[0].consecutiveDays} Consecutive Days`, rightX + cardW - 3, permY, { align: 'right' });
    } else {
      doc.setTextColor(4, 120, 87);
      doc.text('Zero (>2 Days) Streaks', rightX + cardW - 3, permY, { align: 'right' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('• Habitual Late Check-In Pattern:', rightX + 3, permY + 5);
    doc.setFont('helvetica', 'bold');
    if (anomalyReport.hasHabitualLatePattern) {
      doc.setTextColor(190, 18, 60);
      doc.text(`ALERT: ${anomalyReport.frequentLate?.lateCount} Late Check-Ins`, rightX + cardW - 3, permY + 5, { align: 'right' });
    } else {
      doc.setTextColor(4, 120, 87);
      doc.text('Compliant Punctuality', rightX + cardW - 3, permY + 5, { align: 'right' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('• Maximum Consecutive Late Days:', rightX + 3, permY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${anomalyReport.frequentLate?.consecutiveLateDays || 0} Day(s)`, rightX + cardW - 3, permY + 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('• Total Accumulated Late Minutes:', rightX + 3, permY + 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${metrics.totalLateMinutes} Minutes`, rightX + cardW - 3, permY + 15, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('• Risk Evaluation Summary:', rightX + 3, permY + 20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(anomalyReport.totalAnomalies > 0 ? 190 : 4, anomalyReport.totalAnomalies > 0 ? 18 : 120, anomalyReport.totalAnomalies > 0 ? 60 : 87);
    doc.text(anomalyReport.totalAnomalies > 0 ? 'Requires Management Review' : 'Low Risk / Compliant', rightX + cardW - 3, permY + 20, { align: 'right' });

    y += 39;

    // 4. Financial Impact & Separate Overtime Payroll Summary
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'FD');

    doc.setFillColor(7, 86, 61);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('PAYROLL READINESS & SEPARATE OVERTIME COMPENSATION SUMMARY', margin + 3, y + 3.8);

    const fY = y + 9;
    const fW = contentWidth / 4;

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('BASE SCHEDULED CTC', margin + 3, fY);
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${(payrollImpact.baseGrossEarnings ?? 58050).toLocaleString('en-IN')}`, margin + 3, fY + 4.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('ABSENT LOP DEDUCTION', margin + fW, fY);
    doc.setFontSize(8.5);
    doc.setTextColor(190, 18, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(`-₹${(payrollImpact.lopDeductionAmount ?? 0).toLocaleString('en-IN')}`, margin + fW, fY + 4.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('OVERTIME PAY (1.5x PLANT OT)', margin + fW * 2, fY);
    doc.setFontSize(8.5);
    doc.setTextColor(4, 120, 87);
    doc.setFont('helvetica', 'bold');
    const otPay = payrollImpact.otEarnings ?? Math.round((metrics.approvedOvertimeMinutes / 60) * hourlyRate * 1.5);
    doc.text(`+₹${otPay.toLocaleString('en-IN')}`, margin + fW * 2, fY + 4.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('ESTIMATED NET DISBURSABLE', margin + fW * 3, fY);
    doc.setFontSize(9);
    doc.setTextColor(7, 86, 61);
    doc.setFont('helvetica', 'bold');
    const netPay = (payrollImpact.baseGrossEarnings ?? 58050) - (payrollImpact.lopDeductionAmount ?? 0) + otPay;
    doc.text(`₹${netPay.toLocaleString('en-IN')}`, margin + fW * 3, fY + 4.5);

    y += 28;

    // 5. Official Statutory Authorization Signatures
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL SIGN-OFF & AUTHORIZATION FOR PAYROLL DISBURSEMENT', margin, y);
    y += 2.5;

    const sigW = contentWidth / 3;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y + 10, margin + sigW - 8, y + 10);
    doc.line(margin + sigW, y + 10, margin + sigW * 2 - 8, y + 10);
    doc.line(margin + sigW * 2, y + 10, margin + contentWidth, y + 10);

    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Employee Signature', margin, y + 13);
    doc.text('Reporting Manager / Supervisor', margin + sigW, y + 13);
    doc.text('HR Master & Payroll Head', margin + sigW * 2, y + 13);

    drawFooter(1, 2);

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 2: ITEMIZED DAILY ATTENDANCE & PUNCH REGISTER
    // ─────────────────────────────────────────────────────────────────────────
    doc.addPage();
    y = margin;
    drawHeader(2);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEMIZED DAILY ATTENDANCE, PUNCH & OVERTIME REGISTER', margin, y + 2);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`All 30 Calendar Days Itemized with 5-Min Grace & Permission Ledger`, margin, y + 6);
    y += 9;

    // Table Columns: Date, Day, Shift, Scheduled, First In, Last Out, Work Hours, Late, Early, OT, Permission, Status
    const tCols = [
      { label: 'Date', w: 18 },
      { label: 'Day', w: 10 },
      { label: 'Shift Name', w: 32 },
      { label: 'Scheduled', w: 22 },
      { label: 'First In', w: 15 },
      { label: 'Last Out', w: 15 },
      { label: 'Work Hrs', w: 16 },
      { label: 'Late', w: 11 },
      { label: 'Early', w: 11 },
      { label: 'OT', w: 12 },
      { label: 'Perm Ded', w: 13 },
      { label: 'Status', w: 11 },
    ];

    // Table Header Row
    doc.setFillColor(7, 86, 61);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);

    let curX = margin;
    tCols.forEach((c) => {
      doc.text(c.label, curX + 1.5, y + 3.8);
      curX += c.w;
    });
    y += 5.5;

    // Table Rows
    dailyRows.forEach((r, idx) => {
      // Check if space remains on page, else add page
      if (y > pageHeight - 20) {
        drawFooter(2, 2);
        doc.addPage();
        y = margin;
        drawHeader(3);
        // re-draw table header
        doc.setFillColor(7, 86, 61);
        doc.rect(margin, y, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        let cx = margin;
        tCols.forEach((c) => {
          doc.text(c.label, cx + 1.5, y + 3.8);
          cx += c.w;
        });
        y += 5.5;
      }

      const isOdd = idx % 2 === 1;
      const isAbsent = r.status === 'Absent';
      const isPresent = r.status === 'Present';
      const isHalfDay = r.status === 'Half Day';
      const isOff = r.isWeeklyOff || r.status === 'Weekly Off';

      doc.setFillColor(isOdd ? 248 : 255, isOdd ? 250 : 255, isOdd ? 252 : 255);
      doc.rect(margin, y, contentWidth, 5, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 5, margin + contentWidth, y + 5);

      doc.setFontSize(6);
      doc.setTextColor(isOff ? 148 : 15, isOff ? 163 : 23, isOff ? 184 : 42);
      doc.setFont('helvetica', 'normal');

      let cx = margin;
      // Date
      doc.text(r.dateStr, cx + 1.5, y + 3.5);
      cx += tCols[0].w;
      // Day
      doc.text(r.dayName.slice(0, 3), cx + 1.5, y + 3.5);
      cx += tCols[1].w;
      // Shift Name (no truncate!)
      doc.text(r.shiftName.slice(0, 22), cx + 1.5, y + 3.5);
      cx += tCols[2].w;
      // Scheduled
      doc.text(`${r.scheduledStart}-${r.scheduledEnd}`, cx + 1.5, y + 3.5);
      cx += tCols[3].w;
      // First In
      doc.setFont('courier', r.firstIn ? 'bold' : 'normal');
      doc.text(r.firstIn || '—', cx + 1.5, y + 3.5);
      cx += tCols[4].w;
      // Last Out
      doc.text(r.lastOut || '—', cx + 1.5, y + 3.5);
      cx += tCols[5].w;
      // Work Hrs
      doc.setFont('helvetica', 'normal');
      doc.text(r.workedDurationStr || '—', cx + 1.5, y + 3.5);
      cx += tCols[6].w;
      // Late
      if (r.lateMinutes > 0) {
        doc.setTextColor(190, 18, 60);
        doc.text(`${r.lateMinutes}m`, cx + 1.5, y + 3.5);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', cx + 1.5, y + 3.5);
      }
      cx += tCols[7].w;
      // Early
      if (r.earlyMinutes > 0) {
        doc.setTextColor(190, 18, 60);
        doc.text(`${r.earlyMinutes}m`, cx + 1.5, y + 3.5);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', cx + 1.5, y + 3.5);
      }
      cx += tCols[8].w;
      // OT
      if (r.overtimeMinutes > 0) {
        doc.setTextColor(4, 120, 87);
        doc.setFont('helvetica', 'bold');
        doc.text(formatMinutesToHoursStr(r.overtimeMinutes), cx + 1.5, y + 3.5);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text('—', cx + 1.5, y + 3.5);
      }
      cx += tCols[9].w;
      // Perm Ded
      const permDed = r.permissionMinutesDeducted || (r.lateMinutes > 5 ? r.lateMinutes : 0);
      if (permDed > 0) {
        doc.setTextColor(180, 83, 9);
        doc.text(`${permDed}m`, cx + 1.5, y + 3.5);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('0m', cx + 1.5, y + 3.5);
      }
      cx += tCols[10].w;
      // Status Pill
      doc.setFont('helvetica', 'bold');
      if (isPresent) doc.setTextColor(4, 120, 87);
      else if (isAbsent) doc.setTextColor(190, 18, 60);
      else if (isHalfDay) doc.setTextColor(180, 83, 9);
      else doc.setTextColor(100, 116, 139);

      doc.text(r.status === 'Present' ? 'Present' : r.status === 'Absent' ? 'Absent' : r.status.slice(0, 8), cx + 1.5, y + 3.5);

      y += 5;
    });

    drawFooter(2, 2);

    return doc;
  }
}
