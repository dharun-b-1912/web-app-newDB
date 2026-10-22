// supabase/functions/attendance-report-dispatcher/csvGenerator.ts
// ============================================================================
// Joy PeopleHR Enterprise — Professional Attendance CSV Export Generator
// 100% Parity with src/services/attendance/attendanceReportExportService.ts
// ============================================================================

import {
  AttendanceReportRow,
  computeEmployeeOvertime,
  formatDeviationDuration,
  formatMinutesToHoursStr,
  resolveEmploymentSourceLabel,
} from "./reportHelpers.ts";

export function generateCsvContent(
  rows: AttendanceReportRow[],
  reportType?: 'MORNING_CHECKIN' | 'EVENING_FINAL' | 'FULL_CONSOLIDATED'
): string {
  const isMorning = reportType === 'MORNING_CHECKIN';
  const headers = isMorning
    ? [
        'Sl No',
        'Employee Code',
        'Employee Name',
        'Department',
        'Designation',
        'Workforce Sourcing',
        'Shift Code',
        'Shift Name',
        'Expected In',
        'Actual Morning Check-In',
        'Punch Verification Method',
        'Late Minutes',
        'Morning Turnout Status',
      ]
    : [
        'Sl No',
        'Employee Code',
        'Employee Name',
        'Department',
        'Designation',
        'Employment Type',
        'Shift Code',
        'Shift Name',
        'Expected In',
        'Expected Out',
        'Actual Check-In',
        'Check-In Source',
        'Actual Check-Out',
        'Check-Out Source',
        'Break Minutes',
        'Net Work Hours',
        'Late Minutes',
        'Early Exit Minutes',
        'Overtime Minutes',
        'Overtime Duration (Exact)',
        'Attendance Status',
      ];

  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines: string[] = [headers.map(escapeCsv).join(',')];

  rows.forEach((r, idx) => {
    const emp = r.emp || {};
    const rec = r.record || {};
    const shift = r.shift || {};

    const code = emp.employee_code || rec.employee_code || '';
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name || '';
    const dept = emp.department_name || emp.department || 'General';
    const desig = emp.designation_title || emp.designation || 'Staff';
    const vendor = resolveEmploymentSourceLabel(emp);
    const shiftCode = shift?.shift_code || r.roster?.shift_code || 'GEN-09';
    const shiftName = shift?.shift_name || r.roster?.shift_name || 'General Shift';

    const expIn = shift?.start_time || '09:00';
    const expOut = shift?.end_time || '18:00';
    const lateMins = rec.late_minutes || 0;
    const ot = computeEmployeeOvertime(rec, shift, isMorning);
    const morningStatus = rec.first_check_in
      ? (lateMins > 0 ? 'Late Arrival' : 'Present')
      : 'Awaiting Check-In';

    const lateCsvStr = lateMins > 0 ? formatDeviationDuration(lateMins, { showBoth: lateMins >= 60 }) : '0m';
    const earlyCsvStr = (rec.early_checkout_minutes || 0) > 0 ? formatDeviationDuration(rec.early_checkout_minutes, { showBoth: (rec.early_checkout_minutes || 0) >= 60 }) : '0m';

    const line = isMorning
      ? [
          idx + 1,
          code,
          name,
          dept,
          desig,
          vendor,
          shiftCode,
          shiftName,
          expIn,
          rec.first_check_in || '',
          rec.first_check_in ? (rec.check_in_source || rec.source || 'BIOMETRIC') : '',
          lateCsvStr,
          morningStatus,
        ].map(escapeCsv).join(',')
      : [
          idx + 1,
          code,
          name,
          dept,
          desig,
          vendor,
          shiftCode,
          shiftName,
          expIn,
          expOut,
          rec.first_check_in || '',
          rec.first_check_in ? (rec.check_in_source || rec.source || 'BIOMETRIC') : '',
          rec.last_check_out || '',
          rec.last_check_out ? (rec.check_out_source || rec.source || 'BIOMETRIC') : '',
          rec.total_break_minutes || 0,
          rec.net_working_minutes > 0 ? formatMinutesToHoursStr(rec.net_working_minutes) : '',
          lateCsvStr,
          earlyCsvStr,
          ot.overtimeMinutes,
          ot.hasOvertime ? ot.formatted : '0m',
          rec.status || 'Not Checked In',
        ].map(escapeCsv).join(',');

    lines.push(line);
  });

  return lines.join('\n');
}
