// src/services/attendance/attendanceReportEmailService.ts
// ============================================================================
// Joy PeopleHR Enterprise — Daily Attendance & Punching Report Email Dispatcher
// Dispatches Clean, Executive, Noise-Free Audit Reports via SMTP Gateway
// ============================================================================

import { resendEmailService, EmailAttachment, EmailDeliveryResponse } from '../email/resendEmailService';
import {
  attendanceReportExportService,
  AttendanceReportRow,
  computeEmployeeOvertime,
  formatTo12HourTime,
} from './attendanceReportExportService';
import { ClassifiedPunchEvent } from './attendanceClassificationEngine';
import { formatMinutesToHoursStr } from '../../lib/attendance/attendanceEngine';

export interface PreGeneratedPdfArtifact {
  filename: string;
  buffer: Uint8Array;
  base64: string;
  sha256Checksum?: string;
  sizeBytes?: number;
}

export interface SendAttendanceReportEmailParams {
  to: string | string[];
  cc?: string | string[];
  companyName?: string;
  reportDate: string;
  rows: AttendanceReportRow[];
  punches?: ClassifiedPunchEvent[];
  customMessage?: string;
  subject?: string;
  attachExcel?: boolean;
  attachPdf?: boolean;
  attachCsv?: boolean;
  reportType?: 'MORNING_CHECKIN' | 'EVENING_FINAL' | 'FULL_CONSOLIDATED' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | string;
  preGeneratedPdf?: PreGeneratedPdfArtifact;
}

export const attendanceReportEmailService = {
  /**
   * Generates attachments and dispatches the attendance and punch report to HR / Management.
   * Supports Morning Check-In Turnout Report and Evening Final Reconciliation Report.
   */
  async sendReportToHR(
    params: SendAttendanceReportEmailParams
  ): Promise<EmailDeliveryResponse & { pdfArtifact?: PreGeneratedPdfArtifact }> {
    const company = params.companyName || 'Joy Corporate Solutions';
    const dateStr = params.reportDate;
    const rows = params.rows || [];
    const punches = params.punches || [];
    const isMorning = params.reportType === 'MORNING_CHECKIN';

    // Calculate executive KPIs
    const totalHeadcount = rows.length;
    const presentCount = rows.filter(
      r => r.record.status === 'Present' || r.record.status === 'Checked Out' || !!r.record.first_check_in
    ).length;
    const lateCount = rows.filter(r => (r.record.late_minutes || 0) > 0 || r.record.status === 'Late').length;
    const notCheckedInCount = rows.filter(
      r => (r.record.status === 'Not Checked In' || !r.record.status) && !r.record.first_check_in
    ).length;

    // Accurate Overtime accounting: evaluate explicit overtime_minutes, checkout past shift end, and hours > 8h
    let totalOtMinutes = 0;
    let overtimeWorkersCount = 0;
    rows.forEach(r => {
      const ot = computeEmployeeOvertime(r.record, r.shift);
      if (ot.hasOvertime) {
        totalOtMinutes += ot.overtimeMinutes;
        overtimeWorkersCount += 1;
      }
    });

    const totalNetMinutes = rows.reduce((acc, r) => acc + (r.record.total_work_minutes || r.record.net_working_minutes || 0), 0);
    const turnoutRatio = Math.round((presentCount / (totalHeadcount || 1)) * 100);

    const attachments: EmailAttachment[] = [];

    // 1. Executive PDF Attachment (default true)
    let pdfArtifact: PreGeneratedPdfArtifact | undefined = params.preGeneratedPdf;
    if (params.attachPdf !== false) {
      if (!pdfArtifact) {
        const pdfRes = await attendanceReportExportService.generatePdfDocument(rows, punches, {
          companyName: company,
          reportDate: dateStr,
          includePunches: true,
          reportType: params.reportType,
        });
        pdfArtifact = {
          filename: pdfRes.filename,
          buffer: pdfRes.buffer,
          base64: pdfRes.base64,
          sizeBytes: pdfRes.buffer.byteLength,
        };
      }

      attachments.push({
        filename: pdfArtifact.filename,
        content: pdfArtifact.base64,
      });
    }

    // 2. Generate Excel Attachment with AutoFilter and Frozen Panes (default true)
    if (params.attachExcel !== false) {
      const excelRes = await attendanceReportExportService.generateExcelWorkbook(rows, punches, {
        companyName: company,
        reportDate: dateStr,
        includePunches: true,
        reportType: params.reportType,
      });

      attachments.push({
        filename: excelRes.filename,
        content: excelRes.base64,
      });
    }

    // 2. Generate CSV Attachment if enabled
    if (params.attachCsv) {
      const csvContent = attendanceReportExportService.generateCsvContent(rows, params.reportType);
      const csvBase64 = btoa(unescape(encodeURIComponent(csvContent)));
      const safeComp = company.replace(/[^a-zA-Z0-9]/g, '_');
      const csvName = isMorning
        ? `${safeComp}_Morning_CheckIn_Turnout_${dateStr}.csv`
        : `${safeComp}_Daily_Attendance_${dateStr}.csv`;
      attachments.push({
        filename: csvName,
        content: csvBase64,
      });
    }

    // Prepare recipient list
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    const validRecipients = recipients
      .map(e => e.trim())
      .filter(e => e.length > 0 && e.includes('@'));

    if (validRecipients.length === 0) {
      return {
        success: false,
        error: 'No valid recipient email address provided.',
      };
    }

    const isWeekly = (params.reportType || '').toUpperCase() === 'WEEKLY';
    const isMonthly = (params.reportType || '').toUpperCase() === 'MONTHLY';

    // Default subject
    const subject =
      params.subject ||
      (isWeekly
        ? `[Joy PeopleHR] Weekly Executive Attendance & Overtime Audit Report — ${dateStr} (${company})`
        : isMonthly
        ? `[Joy PeopleHR] Monthly Statutory Attendance & Overtime Governance Report — ${dateStr} (${company})`
        : isMorning
        ? `[Joy PeopleHR] Morning Check-In & Turnout Status Report — ${dateStr} (${company})`
        : `[Joy PeopleHR] End-of-Day Final Attendance & Working Hours Report — ${dateStr} (${company})`);

    // Preview top 20 rows in HTML, full set in attached spreadsheet
    const previewRows = rows.slice(0, 20);

    // Format human-friendly audit date (e.g. Thursday, 15 Oct 2026)
    let formattedDateLabel = dateStr;
    try {
      const d = new Date(dateStr + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        formattedDateLabel = d.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      formattedDateLabel = dateStr;
    }

    // Build Premium, Noise-Free, Outlook-Compatible Executive HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Daily Workforce Attendance Audit Report</title>
  <style>
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
  </style>
</head>
<body style="margin: 0; padding: 28px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">

  <!-- Outer Container Table -->
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    
    <!-- Header: Executive Midnight Obsidian -->
    <tr>
      <td style="background-color: #0f172a; padding: 26px 28px; text-align: left; border-bottom: 2px solid #334155;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle">
              <div style="font-size: 10.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px;">
                JOY PEOPLEHR &bull; WORKFORCE AUDIT
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; color: #ffffff; line-height: 1.3;">
                ${isWeekly ? 'Weekly Executive Attendance &amp; Overtime Audit' : isMonthly ? 'Monthly Workforce Attendance &amp; Statutory Governance' : isMorning ? 'Morning Shift Check-In &amp; Turnout Report' : 'Daily Attendance &amp; Shift Audit Report'}
              </h1>
              <div style="font-size: 12.5px; color: #cbd5e1; margin-top: 5px; font-weight: 400;">
                ${company} &bull; <strong style="color: #ffffff;">${formattedDateLabel}</strong> &bull; <span style="color: #94a3b8;">${isWeekly ? 'Weekly Executive Audit' : isMonthly ? 'Monthly Executive Audit' : isMorning ? 'Morning Slot 1' : 'Evening Slot 2'}</span>
              </div>
            </td>
            <td align="right" valign="top" style="padding-left: 12px;">
              <span style="display: inline-block; background-color: ${isWeekly ? '#059669' : isMonthly ? '#7c3aed' : '#1e293b'}; border: 1px solid #475569; border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
                ${isWeekly ? 'WEEKLY MIS' : isMonthly ? 'MONTHLY GOVERNANCE' : isMorning ? 'MORNING CHECK-IN' : 'AUDITED'}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Metadata Sub-bar -->
    <tr>
      <td style="background-color: #f8fafc; padding: 12px 28px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span><strong>Scope:</strong> ${totalHeadcount} Staff</span>
              <span style="margin: 0 8px; color: #cbd5e1;">|</span>
              <span><strong>Turnout:</strong> ${turnoutRatio}%</span>
              <span style="margin: 0 8px; color: #cbd5e1;">|</span>
              <span><strong>Workbook:</strong> Excel (.xlsx) Attached</span>
            </td>
            <td align="right" style="color: #94a3b8; font-size: 11px;">
              ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Area -->
    <tr>
      <td style="padding: 24px 28px;">

        ${params.customMessage ? `
        <!-- HR / Operational Note -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 22px;">
          <tr>
            <td style="background-color: #f8fafc; border-left: 3px solid #0f172a; padding: 12px 16px; border-radius: 0 6px 6px 0; font-size: 12.5px; color: #334155; line-height: 1.5;">
              <strong style="color: #0f172a;">Operational Note:</strong> ${params.customMessage}
            </td>
          </tr>
        </table>
        ` : ''}

        <!-- Clean, Non-Noisy Executive KPI Grid -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <!-- Metric 1: Total Workforce -->
            <td width="31%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Workforce</div>
              <div style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 4px 0 2px 0;">${totalHeadcount}</div>
              <div style="font-size: 11px; color: #64748b;">Scheduled Shift</div>
            </td>
            <td width="3%"></td>
            <!-- Metric 2: Present / Working -->
            <td width="32%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Present</div>
              <div style="font-size: 24px; font-weight: 800; color: #166534; margin: 4px 0 2px 0;">${presentCount}</div>
              <div style="font-size: 11px; color: #166534; font-weight: 600;">${turnoutRatio}% Turnout</div>
            </td>
            <td width="3%"></td>
            <!-- Metric 3: Late Arrivals -->
            <td width="31%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Late Arrivals</div>
              <div style="font-size: 24px; font-weight: 800; color: ${lateCount > 0 ? '#b45309' : '#0f172a'}; margin: 4px 0 2px 0;">${lateCount}</div>
              <div style="font-size: 11px; color: ${lateCount > 0 ? '#92400e' : '#64748b'};">Grace Exceeded</div>
            </td>
          </tr>
          <tr><td height="10" colspan="5"></td></tr>
          <tr>
            <!-- Metric 4: Not Checked In -->
            <td width="31%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Pending Punch</div>
              <div style="font-size: 24px; font-weight: 800; color: ${notCheckedInCount > 0 ? '#b91c1c' : '#0f172a'}; margin: 4px 0 2px 0;">${notCheckedInCount}</div>
              <div style="font-size: 11px; color: ${notCheckedInCount > 0 ? '#991b1b' : '#64748b'};">${isMorning ? 'Awaiting Arrival' : 'Missing Check-In'}</div>
            </td>
            <td width="3%"></td>
            <!-- Metric 5: Net Working Hours / On-Time -->
            <td width="32%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">${isMorning ? 'On-Time In' : 'Total Net Work'}</div>
              <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 4px 0 2px 0;">${isMorning ? Math.max(0, presentCount - lateCount) : formatMinutesToHoursStr(totalNetMinutes)}</div>
              <div style="font-size: 11px; color: #64748b;">${isMorning ? 'Punctual Arrivals' : 'Cumulative Time'}</div>
            </td>
            <td width="3%"></td>
            <!-- Metric 6: Overtime / Morning Grace -->
            <td width="31%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">${isMorning ? 'Morning Window' : 'Overtime Logged'}</div>
              <div style="font-size: 22px; font-weight: 800; color: ${totalOtMinutes > 0 ? '#b45309' : '#0f172a'}; margin: 4px 0 2px 0;">${isMorning ? '09:30 AM' : formatMinutesToHoursStr(totalOtMinutes)}</div>
              <div style="font-size: 11px; color: ${totalOtMinutes > 0 ? '#92400e' : '#64748b'}; font-weight: 600;">${isMorning ? 'Standard Shift In' : `${overtimeWorkersCount} Staff with OT`}</div>
            </td>
          </tr>
        </table>

        <!-- Overtime High-Impact Notice for Evening Report -->
        ${!isMorning && overtimeWorkersCount > 0 ? `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            <td style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; padding: 12px 16px; border-radius: 6px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="28" valign="top" style="font-size: 18px; padding-top: 1px;">⏱️</td>
                  <td valign="middle" style="font-size: 12px; color: #92400e; line-height: 1.5;">
                    <strong style="color: #78350f;">Overtime Audit Registered:</strong>
                    <strong>${overtimeWorkersCount} employees</strong> completed overtime work today totaling <strong>${formatMinutesToHoursStr(totalOtMinutes)}</strong>. Exact overtime hours &amp; minutes are highlighted below and in the attached Excel ledger.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        ` : ''}

        <!-- Section Title -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 22px 0 10px 0;">
          <tr>
            <td valign="middle">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                ${isMorning ? 'Morning Turnout & Punch In Roster' : 'Attendance Summary Roster'}
              </span>
            </td>
            <td align="right" valign="middle">
              <span style="font-size: 11.5px; color: #64748b;">
                Showing ${previewRows.length} of ${rows.length} records
              </span>
            </td>
          </tr>
        </table>

        <!-- Summary Table (Clean, High-Readability Corporate Design) -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; font-size: 11.5px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; text-align: left;">
              <th style="padding: 10px 12px; font-weight: 600; font-size: 11px; letter-spacing: 0.3px;">Employee</th>
              <th style="padding: 10px 8px; font-weight: 600; font-size: 11px; letter-spacing: 0.3px;">Shift</th>
              <th style="padding: 10px 8px; font-weight: 600; font-size: 11px; text-align: center;">${isMorning ? 'Expected In' : 'In'}</th>
              <th style="padding: 10px 8px; font-weight: 600; font-size: 11px; text-align: center;">${isMorning ? 'Morning In' : 'Out'}</th>
              <th style="padding: 10px 8px; font-weight: 600; font-size: 11px; text-align: center;">${isMorning ? 'Late' : 'Net Work'}</th>
              ${!isMorning ? `<th style="padding: 10px 8px; font-weight: 600; font-size: 11px; text-align: center;">Overtime (OT)</th>` : ''}
              <th style="padding: 10px 10px; font-weight: 600; font-size: 11px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${previewRows.map((r, i) => {
              const emp = r.emp;
              const rec = r.record;
              const shift = r.shift;
              const code = emp.employee_code || rec.employee_code || '—';
              const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name;
              const shiftCode = shift?.shift_code || r.roster?.shift_code || 'GEN-09';
              const checkIn = rec.first_check_in ? formatTo12HourTime(rec.first_check_in) : '—';
              const checkInSrc = rec.first_check_in ? (rec.check_in_source || rec.source || 'BIOMETRIC') : '—';
              const checkOut = rec.last_check_out ? formatTo12HourTime(rec.last_check_out) : '—';
              const lateMins = rec.late_entry_minutes || rec.late_minutes || 0;
              const ot = computeEmployeeOvertime(rec, shift);
              const netMins = rec.total_work_minutes || rec.net_working_minutes || 0;
              const netStr = netMins > 0 ? formatMinutesToHoursStr(netMins) : (rec.first_check_in && !rec.last_check_out ? 'In Progress' : '—');
              const isEven = i % 2 === 0;

              let statusStr: string = rec.status || (rec.first_check_in ? 'Present' : 'Not Checked In');
              if (isMorning) {
                statusStr = rec.first_check_in
                  ? (lateMins > 0 ? `Late (${lateMins}m)` : 'Present')
                  : 'Pending In';
              }

              let badgeBg = '#f1f5f9';
              let badgeColor = '#475569';
              if (statusStr.includes('Present') || (statusStr as string) === 'Working' || statusStr === 'Checked Out') {
                badgeBg = '#dcfce7';
                badgeColor = '#166534';
              } else if (statusStr.includes('Late')) {
                badgeBg = '#fef3c7';
                badgeColor = '#92400e';
              } else if (statusStr.includes('Not Checked') || statusStr.includes('Absent') || statusStr.includes('Pending')) {
                badgeBg = '#fee2e2';
                badgeColor = '#991b1b';
              }

              return `
              <tr style="background-color: ${isEven ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 12px;">
                  <div style="font-weight: 700; color: #0f172a;">${name}</div>
                  <div style="font-size: 10px; color: #64748b;">${code} &bull; ${emp.department_name || emp.department || 'General'}</div>
                </td>
                <td style="padding: 8px 8px; color: #334155;">
                  <div style="font-weight: 600;">${shiftCode}</div>
                  <div style="font-size: 10px; color: #64748b;">${shift?.start_time || '09:30'} - ${shift?.end_time || '18:30'}</div>
                </td>
                <td style="padding: 8px 8px; text-align: center; font-weight: 600; color: ${checkIn !== '—' ? '#0f172a' : '#94a3b8'};">
                  ${checkIn}
                </td>
                <td style="padding: 8px 8px; text-align: center; font-weight: 600; color: #0f172a;">
                  ${isMorning ? `<span style="font-size: 10px; color: #475569;">${checkInSrc}</span>` : (checkOut !== '—' ? checkOut : '<span style="color:#94a3b8">—</span>')}
                </td>
                <td style="padding: 8px 8px; text-align: center; font-weight: 600; color: ${isMorning ? (lateMins > 0 ? '#b45309' : '#166534') : '#334155'};">
                  ${isMorning ? (lateMins > 0 ? `${lateMins}m` : '0m') : netStr}
                </td>
                ${!isMorning ? `
                <td style="padding: 8px 8px; text-align: center;">
                  ${ot.hasOvertime
                    ? `<span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 11px;">+${ot.formatted}</span>`
                    : `<span style="color: #94a3b8; font-size: 11px;">0m</span>`}
                </td>
                ` : ''}
                <td style="padding: 8px 10px; text-align: center;">
                  <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10px;">
                    ${statusStr}
                  </span>
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Attachment Guidance Card -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" width="28" style="font-size: 16px; padding-top: 2px;">
                    📎
                  </td>
                  <td valign="middle">
                    <div style="font-size: 12.5px; font-weight: 700; color: #0f172a;">
                      Attached: Executive Print-Ready PDF &amp; Consolidated Excel Workbook (.xlsx)
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 3px; line-height: 1.4;">
                      Includes formatted <strong>Landscape A4 PDF Audit Document</strong> for rapid executive review/printing, plus <strong>Full 6-Sheet Excel Workbook</strong> with native AutoFilter and Frozen Panes for deep departmental analysis.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- Clean Corporate Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
        <div style="font-weight: 700; color: #334155; margin-bottom: 3px;">
          Joy PeopleHR Enterprise Operating System
        </div>
        <div>
          Confidential &bull; Dispatched for authorized HR &amp; Operational Leadership &bull; Automated System Audit
        </div>
      </td>
    </tr>

  </table>
</body>
</html>
    `;

    // Dispatch via SMTP Gateway
    const result = await resendEmailService.sendEmail({
      from: 'Joy PeopleHR <noreply@joypeoplehr.com>',
      to: validRecipients,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return {
      ...result,
      pdfArtifact,
    };
  },
};
