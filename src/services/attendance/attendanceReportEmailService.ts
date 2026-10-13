// src/services/attendance/attendanceReportEmailService.ts
// ============================================================================
// Joy PeopleHR Enterprise — Daily Attendance & Punching Report Email Dispatcher
// Dispatches structured reports via Hostinger SMTP / Resend API Gateway
// ============================================================================

import { resendEmailService, EmailAttachment, EmailDeliveryResponse } from '../email/resendEmailService';
import { attendanceReportExportService, AttendanceReportRow } from './attendanceReportExportService';
import { ClassifiedPunchEvent } from './attendanceClassificationEngine';
import { formatMinutesToHoursStr } from '../../lib/attendance/attendanceEngine';

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
  attachCsv?: boolean;
}

export const attendanceReportEmailService = {
  /**
   * Generates attachments and dispatches the attendance and punch report to HR / Management.
   */
  async sendReportToHR(params: SendAttendanceReportEmailParams): Promise<EmailDeliveryResponse> {
    const company = params.companyName || 'Joy Corporate Solutions';
    const dateStr = params.reportDate;
    const rows = params.rows || [];
    const punches = params.punches || [];

    // Calculate executive KPIs
    const totalHeadcount = rows.length;
    const presentCount = rows.filter(
      r => r.record.status === 'Present' || r.record.status === 'Checked Out' || !!r.record.first_check_in
    ).length;
    const lateCount = rows.filter(r => (r.record.late_minutes || 0) > 0 || r.record.status === 'Late').length;
    const notCheckedInCount = rows.filter(
      r => (r.record.status === 'Not Checked In' || !r.record.status) && !r.record.first_check_in
    ).length;
    const absentCount = rows.filter(r => r.record.status === 'Absent').length;
    const onLeaveCount = rows.filter(r => r.record.status === 'On Leave').length;
    const overtimeWorkersCount = rows.filter(r => (r.record.overtime_minutes || 0) > 0).length;

    const totalNetMinutes = rows.reduce((acc, r) => acc + (r.record.net_working_minutes || 0), 0);
    const totalOtMinutes = rows.reduce((acc, r) => acc + (r.record.overtime_minutes || 0), 0);

    const attachments: EmailAttachment[] = [];

    // 1. Generate Excel Attachment if enabled (default true)
    if (params.attachExcel !== false) {
      const excelRes = await attendanceReportExportService.generateExcelWorkbook(rows, punches, {
        companyName: company,
        reportDate: dateStr,
        includePunches: true,
      });

      attachments.push({
        filename: excelRes.filename,
        content: excelRes.base64,
      });
    }

    // 2. Generate CSV Attachment if enabled
    if (params.attachCsv) {
      const csvContent = attendanceReportExportService.generateCsvContent(rows);
      // Base64 encode for attachment
      const csvBase64 = btoa(unescape(encodeURIComponent(csvContent)));
      const safeComp = company.replace(/[^a-zA-Z0-9]/g, '_');
      attachments.push({
        filename: `${safeComp}_Daily_Attendance_${dateStr}.csv`,
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

    // Default subject
    const subject =
      params.subject ||
      `[Joy PeopleHR] Daily Attendance & Punching Audit Report — ${dateStr} (${company})`;

    // Generate responsive HTML Email template
    const previewRows = rows.slice(0, 20); // Top 20 rows in HTML, full set in Excel

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attendance &amp; Punch Audit Report</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 720px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 16px 24px -4px rgba(0, 0, 0, 0.07);">
    
    <!-- Enterprise Brand Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #064E3B 0%, #047857 100%); padding: 30px 28px; text-align: left; color: #ffffff;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #6ee7b7; margin-bottom: 4px;">
                JOY PEOPLEHR TIME &amp; ATTENDANCE ENGINE
              </div>
              <h1 style="margin: 0; font-size: 21px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; line-height: 1.2;">
                Daily Attendance &amp; Punching Audit Report
              </h1>
              <div style="font-size: 13px; color: #d1fae5; margin-top: 6px; font-weight: 500;">
                Company: <strong>${company}</strong> &bull; Date: <strong>${dateStr}</strong>
              </div>
            </td>
            <td align="right" valign="top" style="padding-left: 12px;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 9999px; padding: 5px 12px; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
                Verified Audit
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Metadata Strip -->
    <tr>
      <td style="background-color: #f8fafc; padding: 14px 28px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <strong>Generated:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} &bull;
              <strong>Target Scope:</strong> ${totalHeadcount} Employees &bull;
              <strong>Attachments:</strong> ${attachments.length} files attached (.xlsx / .csv)
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content Area -->
    <tr>
      <td style="padding: 26px 28px;">
        
        ${params.customMessage ? `
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 16px; margin-bottom: 22px; font-size: 13px; color: #065f46; border-radius: 6px;">
          <strong style="color: #047857;">Operations &amp; HR Note:</strong> ${params.customMessage}
        </div>
        ` : ''}

        <p style="margin: 0 0 18px 0; font-size: 13.5px; color: #334155; line-height: 1.6;">
          Please find below the consolidated daily workforce attendance breakdown and machine punch verification ledger for <strong>${company}</strong> on <strong>${dateStr}</strong>. The complete multi-sheet spreadsheet workbook has been attached for your records.
        </p>

        <!-- KPI Summary Cards Grid -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td width="31%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px;">Total Workforce</div>
              <div style="font-size: 22px; font-weight: 900; color: #14532d; margin-top: 3px;">${totalHeadcount}</div>
              <div style="font-size: 11px; color: #15803d; margin-top: 2px;">Scheduled Shift Staff</div>
            </td>
            <td width="3%"></td>
            <td width="32%" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px;">Present / Working</div>
              <div style="font-size: 22px; font-weight: 900; color: #047857; margin-top: 3px;">${presentCount}</div>
              <div style="font-size: 11px; color: #059669; margin-top: 2px;">${Math.round((presentCount / (totalHeadcount || 1)) * 100)}% Turnout Ratio</div>
            </td>
            <td width="3%"></td>
            <td width="31%" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400e; letter-spacing: 0.5px;">Late Arrivals</div>
              <div style="font-size: 22px; font-weight: 900; color: #b45309; margin-top: 3px;">${lateCount}</div>
              <div style="font-size: 11px; color: #d97706; margin-top: 2px;">Beyond Grace Period</div>
            </td>
          </tr>
          <tr><td height="10" colspan="5"></td></tr>
          <tr>
            <td width="31%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #991b1b; letter-spacing: 0.5px;">Not Checked In</div>
              <div style="font-size: 22px; font-weight: 900; color: #b91c1c; margin-top: 3px;">${notCheckedInCount}</div>
              <div style="font-size: 11px; color: #dc2626; margin-top: 2px;">Absent / Pending Punch</div>
            </td>
            <td width="3%"></td>
            <td width="32%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e40af; letter-spacing: 0.5px;">Total Net Work</div>
              <div style="font-size: 22px; font-weight: 900; color: #1e3a8a; margin-top: 3px;">${formatMinutesToHoursStr(totalNetMinutes)}</div>
              <div style="font-size: 11px; color: #2563eb; margin-top: 2px;">Cumulative Hours</div>
            </td>
            <td width="3%"></td>
            <td width="31%" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 14px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #6b21a8; letter-spacing: 0.5px;">Overtime Log</div>
              <div style="font-size: 22px; font-weight: 900; color: #7e22ce; margin-top: 3px;">${formatMinutesToHoursStr(totalOtMinutes)}</div>
              <div style="font-size: 11px; color: #9333ea; margin-top: 2px;">${overtimeWorkersCount} Overtime Staff</div>
            </td>
          </tr>
        </table>

        <!-- Employee Highlights Table Header -->
        <div style="margin: 24px 0 10px 0; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            Workforce Attendance &amp; Shift Ledger
          </h2>
          <span style="font-size: 12px; color: #64748b;">
            Showing top ${previewRows.length} of ${rows.length} records (Full list in attachment)
          </span>
        </div>

        <!-- Attendance Summary Table -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; font-size: 11.5px; margin-bottom: 22px;">
          <thead>
            <tr style="background-color: #064E3B; color: #ffffff; text-align: left;">
              <th style="padding: 10px 12px; font-weight: 700; border-bottom: 1px solid #cbd5e1;">Employee</th>
              <th style="padding: 10px 10px; font-weight: 700; border-bottom: 1px solid #cbd5e1;">Shift</th>
              <th style="padding: 10px 10px; font-weight: 700; border-bottom: 1px solid #cbd5e1; text-align: center;">In</th>
              <th style="padding: 10px 10px; font-weight: 700; border-bottom: 1px solid #cbd5e1; text-align: center;">Out</th>
              <th style="padding: 10px 10px; font-weight: 700; border-bottom: 1px solid #cbd5e1; text-align: center;">Hours</th>
              <th style="padding: 10px 12px; font-weight: 700; border-bottom: 1px solid #cbd5e1; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${previewRows.map((r, i) => {
              const emp = r.emp;
              const rec = r.record;
              const shift = r.shift;
              const code = emp.employee_code || rec.employee_code || '—';
              const name = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name;
              const shiftCode = shift?.shift_code || r.roster?.shift_code || 'GEN-09';
              const checkIn = rec.first_check_in || '—';
              const checkOut = rec.last_check_out || '—';
              const netStr = rec.net_working_minutes > 0 ? formatMinutesToHoursStr(rec.net_working_minutes) : (rec.first_check_in && !rec.last_check_out ? 'In Progress' : '—');
              const statusStr = rec.status || 'Not Checked In';
              const isEven = i % 2 === 0;

              let badgeBg = '#f1f5f9';
              let badgeColor = '#475569';
              if (statusStr === 'Present' || (statusStr as string) === 'Working' || statusStr === 'Checked Out') {
                badgeBg = '#d1fae5';
                badgeColor = '#065f46';
              } else if (statusStr === 'Late') {
                badgeBg = '#fef3c7';
                badgeColor = '#92400e';
              } else if (statusStr === 'Not Checked In' || statusStr === 'Absent') {
                badgeBg = '#fee2e2';
                badgeColor = '#991b1b';
              }

              return `
              <tr style="background-color: ${isEven ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 9px 12px;">
                  <div style="font-weight: 800; color: #0f172a;">${name}</div>
                  <div style="font-size: 10.5px; color: #64748b;">${code} &bull; ${emp.department_name || emp.department || 'General'}</div>
                </td>
                <td style="padding: 9px 10px; color: #334155;">
                  <div style="font-weight: 700;">${shiftCode}</div>
                  <div style="font-size: 10.5px; color: #64748b;">${shift?.start_time || '09:30'} - ${shift?.end_time || '18:30'}</div>
                </td>
                <td style="padding: 9px 10px; text-align: center; font-weight: 700; color: ${checkIn !== '—' ? '#047857' : '#94a3b8'};">
                  ${checkIn}
                </td>
                <td style="padding: 9px 10px; text-align: center; font-weight: 700; color: ${checkOut !== '—' ? '#0f172a' : '#94a3b8'};">
                  ${checkOut}
                </td>
                <td style="padding: 9px 10px; text-align: center; font-weight: 700; color: #0284c7;">
                  ${netStr}
                </td>
                <td style="padding: 9px 12px; text-align: center;">
                  <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 10.5px;">
                    ${statusStr}
                  </span>
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Attachment Notice Box -->
        <div style="background-color: #f8fafc; border: 1px dashed #94a3b8; border-radius: 10px; padding: 14px 18px; margin-top: 20px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td valign="middle">
                <div style="font-size: 13px; font-weight: 800; color: #0f172a;">
                  📁 Complete Excel &amp; CSV Report Attached
                </div>
                <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
                  Includes full headcount (${totalHeadcount} employees), exact check-in/out timestamps, overtime hours, and verified biometric machine logs.
                </div>
              </td>
            </tr>
          </table>
        </div>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b;">
        <p style="margin: 0 0 6px 0;">
          <strong>Joy PeopleHR Enterprise</strong> &bull; Time, Attendance &amp; Workforce Operating System
        </p>
        <p style="margin: 0; color: #94a3b8;">
          This automated report was dispatched on behalf of HR Head &amp; Authorized Operations Personnel.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>
    `;

    // Dispatch via resendEmailService
    const result = await resendEmailService.sendEmail({
      to: validRecipients,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return result;
  },
};
