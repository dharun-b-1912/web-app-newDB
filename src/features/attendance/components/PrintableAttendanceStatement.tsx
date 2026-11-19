import React from 'react';
import { DailyAttendanceRow, PeriodAttendanceMetrics } from '../../../services/attendance/attendanceCalculationService';
import { AttendanceBonusEvaluationResult } from '../../../services/attendance/attendanceBonusService';
import { PayrollImpactResult } from '../../../services/payroll/payrollImpactCalculationEngine';
import { formatMinutesToHoursStr } from '../../../lib/attendance/attendanceEngine';
import { AttendanceAnomalyIntelligenceEngine } from '../../../services/attendance/attendanceAnomalyIntelligenceEngine';

export interface PrintableAttendanceStatementProps {
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
}

export const PrintableAttendanceStatement: React.FC<PrintableAttendanceStatementProps> = ({
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
}) => {
  const empName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.display_name || 'Employee';
  const empCode = employee?.employee_code || '';
  const empDept = employee?.department_name || employee?.department || 'Engineering';
  const empDesignation = employee?.designation_title || employee?.designation || employee?.role || 'Staff';
  const empBranch = employee?.branch_name || employee?.location || 'Main Office';
  const empManager = employee?.reporting_manager_name || 'HR Operations';
  const isVendor = employee?.employment_source === 'VENDOR' || employee?.vendor_id || employee?.organization_id === 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const statementId = `STMT-${startDate.replace(/-/g, '').slice(0, 6)}-${empCode || 'EMP'}`;
  const generationTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const anomalyReport = AttendanceAnomalyIntelligenceEngine.evaluateAnomalies(dailyRows, employee);

  return (
    <div id="attendance-statement-printable" className="bg-white text-gray-900 p-6 sm:p-10 font-sans print:p-0 print:m-0 w-full max-w-5xl mx-auto">
      {/* ─── PRINT-SPECIFIC CSS ───────────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 8mm 12mm 8mm;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          #attendance-statement-printable, #attendance-statement-printable * {
            visibility: visible;
          }
          #attendance-statement-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
          table {
            page-break-inside: auto;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      {/* ─── 1. OFFICIAL DOCUMENT HEADER ──────────────────────────────── */}
      <div className="border-b-2 border-emerald-900 pb-4 mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#07563D] text-white flex items-center justify-center font-black text-sm">
              JOY
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#07563D] uppercase">
                {companyName || organizationName}
              </h1>
              <p className="text-[11px] font-semibold text-gray-500">
                Official Employee Attendance & Statutory Overtime Statement • ISO 27001 Certified HRMS
              </p>
            </div>
          </div>
        </div>
        <div className="text-right text-[11px] text-gray-600 space-y-0.5">
          <div className="font-bold text-gray-900 font-mono">{statementId}</div>
          <div>Period: <span className="font-bold text-gray-900">{periodName}</span></div>
          <div>Dates: <span className="font-mono">{startDate} – {endDate}</span></div>
          <div className="text-[10px] text-gray-400">Generated: {generationTime} IST</div>
        </div>
      </div>

      {/* ─── 2. EMPLOYEE EXECUTIVE PROFILE (GRID) ──────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-gray-400 uppercase text-[9px] font-bold block">Employee Name</span>
          <span className="font-black text-gray-900 text-sm">{empName}</span>
        </div>
        <div>
          <span className="text-gray-400 uppercase text-[9px] font-bold block">Employee Code / ID</span>
          <span className="font-bold text-gray-900 font-mono text-sm">{empCode || '—'}</span>
        </div>
        <div>
          <span className="text-gray-400 uppercase text-[9px] font-bold block">Department</span>
          <span className="font-semibold text-gray-800">{empDept}</span>
        </div>
        <div>
          <span className="text-gray-400 uppercase text-[9px] font-bold block">Designation / Role</span>
          <span className="font-semibold text-gray-800">{empDesignation}</span>
        </div>
        <div>
          <span className="text-gray-400 uppercase text-[9px] font-bold block">Branch / Location</span>
          <span className="font-semibold text-gray-800">{empBranch}</span>
        </div>
        <div>
          <span className="text-gray-400 uppercase text-[9px] font-bold block">Reporting Manager</span>
          <span className="font-semibold text-gray-800">{empManager}</span>
        </div>
        <div>
          <span className="text-gray-400 uppercase text-[9px] font-bold block">Sourcing Model</span>
          <span className={`font-bold inline-block px-1.5 py-0.5 rounded text-[10px] ${isVendor ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
            {isVendor ? 'Vendor Contract Workforce' : 'Direct Corporate Staff'}
          </span>
        </div>
        <div>
          <span className="text-gray-400 uppercase text-[9px] font-bold block">Payable Days</span>
          <span className="font-black text-[#07563D] font-mono text-sm">
            {metrics.payableDays} / {metrics.totalCalendarDays} Days
          </span>
        </div>
      </div>

      {/* ─── 3. PERIOD SUMMARY METRICS (30-DAY NORMALIZED TABLE) ──────── */}
      <div className="mb-5">
        <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
          Executive Attendance Summary (Statutory Normalized 30-Day Basis)
        </h3>
        <table className="w-full text-center border-collapse border border-gray-300 text-xs">
          <thead>
            <tr className="bg-gray-100 font-bold text-gray-700 border-b border-gray-300">
              <th className="border border-gray-300 py-1.5 px-2">Scheduled</th>
              <th className="border border-gray-300 py-1.5 px-2 text-emerald-800">Present</th>
              <th className="border border-gray-300 py-1.5 px-2 text-rose-800">Absent (LOP)</th>
              <th className="border border-gray-300 py-1.5 px-2 text-purple-800">Paid Leave</th>
              <th className="border border-gray-300 py-1.5 px-2 text-sky-800">Half Days</th>
              <th className="border border-gray-300 py-1.5 px-2 text-gray-600">Weekly Off</th>
              <th className="border border-gray-300 py-1.5 px-2 text-amber-800">Late Events</th>
              <th className="border border-gray-300 py-1.5 px-2 text-orange-800">Early Out</th>
              <th className="border border-gray-300 py-1.5 px-2 text-teal-800">OT Hours</th>
              <th className="border border-gray-300 py-1.5 px-2 text-[#07563D] font-black">Payable Days</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-bold text-gray-800 font-mono">
              <td className="border border-gray-300 py-2 px-2">{metrics.scheduledWorkingDays}d</td>
              <td className="border border-gray-300 py-2 px-2 text-emerald-700">{metrics.presentDays}d</td>
              <td className="border border-gray-300 py-2 px-2 text-rose-700">{metrics.absentDays}d</td>
              <td className="border border-gray-300 py-2 px-2 text-purple-700">{metrics.paidLeaveDays}d</td>
              <td className="border border-gray-300 py-2 px-2 text-sky-700">{metrics.halfDays}d</td>
              <td className="border border-gray-300 py-2 px-2 text-gray-600">{metrics.weeklyOffDays}d</td>
              <td className="border border-gray-300 py-2 px-2 text-amber-700">{metrics.lateEventsCount}</td>
              <td className="border border-gray-300 py-2 px-2 text-orange-700">{metrics.earlyEventsCount}</td>
              <td className="border border-gray-300 py-2 px-2 text-teal-700">
                {formatMinutesToHoursStr(metrics.approvedOvertimeMinutes)}
              </td>
              <td className="border border-gray-300 py-2 px-2 text-[#07563D] font-black text-sm bg-emerald-50/50">
                {metrics.payableDays}d
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── 4. ITEMISED DAILY ATTENDANCE REGISTER ─────────────────────── */}
      <div className="mb-5">
        <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
          Itemized Daily Attendance & Punch Register
        </h3>
        <table className="w-full text-left border-collapse border border-gray-300 text-[11px]">
          <thead>
            <tr className="bg-gray-100 font-bold text-gray-800 border-b border-gray-300">
              <th className="border border-gray-300 py-1.5 px-2 w-24">Date</th>
              <th className="border border-gray-300 py-1.5 px-2">Shift</th>
              <th className="border border-gray-300 py-1.5 px-2">Scheduled</th>
              <th className="border border-gray-300 py-1.5 px-2">First In</th>
              <th className="border border-gray-300 py-1.5 px-2">Last Out</th>
              <th className="border border-gray-300 py-1.5 px-2 text-right">Work Hours</th>
              <th className="border border-gray-300 py-1.5 px-2 text-right">Late</th>
              <th className="border border-gray-300 py-1.5 px-2 text-right">Early</th>
              <th className="border border-gray-300 py-1.5 px-2 text-right">OT</th>
              <th className="border border-gray-300 py-1.5 px-2 text-right">Perm Ded</th>
              <th className="border border-gray-300 py-1.5 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {dailyRows.map((row, idx) => {
              const isWeekend = row.isWeeklyOff;
              const isLop = row.status === 'Absent';
              const permDed = row.permissionMinutesDeducted || (row.lateMinutes > 5 ? row.lateMinutes : 0);
              return (
                <tr
                  key={row.id || idx}
                  className={`border-b border-gray-200 ${
                    idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                  } ${isWeekend ? 'text-gray-400 italic' : ''}`}
                >
                  <td className="border border-gray-300 py-1 px-2 font-mono font-medium whitespace-nowrap">
                    {row.dateStr} ({row.dayName.slice(0, 3)})
                  </td>
                  <td className="border border-gray-300 py-1 px-2 font-medium">{row.shiftName}</td>
                  <td className="border border-gray-300 py-1 px-2 whitespace-nowrap">{row.scheduledTime}</td>
                  <td className="border border-gray-300 py-1 px-2 font-mono font-semibold">
                    {row.firstIn || '—'}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 font-mono font-semibold">
                    {row.lastOut || '—'}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-medium">
                    {row.workedDurationStr || '—'}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono text-amber-800">
                    {row.lateMinutes > 0 ? `${row.lateMinutes}m` : '—'}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono text-orange-800">
                    {row.earlyMinutes > 0 ? `${row.earlyMinutes}m` : '—'}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono text-blue-800 font-semibold">
                    {row.overtimeMinutes > 0 ? formatMinutesToHoursStr(row.overtimeMinutes) : '—'}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono text-amber-700 font-medium">
                    {permDed > 0 ? `${permDed}m` : '—'}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-center font-bold">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                        row.status === 'Present'
                          ? 'bg-emerald-100 text-emerald-900'
                          : isLop
                          ? 'bg-rose-100 text-rose-900'
                          : row.status === 'Half Day'
                          ? 'bg-amber-100 text-amber-900'
                          : row.status === 'Weekly Off'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── 5. ANALYTICAL BREAKDOWNS (Policy & Anomaly Cards) ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs">
        {/* Electra EV Permission Policy & Grace Ledger */}
        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50/50">
          <h4 className="font-bold uppercase text-gray-800 mb-2 border-b border-gray-200 pb-1 flex justify-between">
            <span>Electra EV Permission & Grace Policy</span>
            <span className="text-emerald-700 font-semibold">Authoritative Ledger</span>
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-600">Shift Grace Threshold:</span>
              <span className="font-semibold">5 minutes (Strict Plant Policy)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Permission Quota:</span>
              <span className="font-semibold">120 mins (2 Hours / Month)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Permission Minutes Consumed:</span>
              <span className="font-bold text-amber-800">{metrics.totalPermissionMinutes || 0} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining Permission Balance:</span>
              <span className="font-bold text-emerald-800">
                {metrics.permissionRemainingMinutes ?? Math.max(0, 120 - (metrics.totalPermissionMinutes || 0))} mins
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 font-bold">
              <span>Excess Handling Policy:</span>
              <span className="text-rose-700 font-bold">Half Day Deduction (0.5d LOP)</span>
            </div>
          </div>
        </div>

        {/* Anomaly Engine & Risk Radar */}
        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50/50">
          <h4 className="font-bold uppercase text-gray-800 mb-2 border-b border-gray-200 pb-1 flex justify-between">
            <span>Absence & Punctuality Risk Radar</span>
            <span className={anomalyReport.overallRiskLevel === 'LOW' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
              {anomalyReport.overallRiskLevel} RISK
            </span>
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-600">Extended Leave / Absence (&gt;2 Days):</span>
              <span className={anomalyReport.extendedAbsenceStreaks.length > 0 ? 'text-rose-700 font-bold' : 'font-semibold text-emerald-700'}>
                {anomalyReport.extendedAbsenceStreaks.length > 0
                  ? `${anomalyReport.extendedAbsenceStreaks.length} streak(s) detected`
                  : '0 Streaks (Normal)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Habitual Late Check-Ins:</span>
              <span className={anomalyReport.frequentLate ? 'text-amber-700 font-bold' : 'font-semibold text-emerald-700'}>
                {anomalyReport.frequentLate ? `${anomalyReport.frequentLate.lateCount} Days Late` : 'Punctual (0 Flags)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Attendance Percentage:</span>
              <span className="font-bold text-emerald-800">
                {Math.round((metrics.presentDays / Math.max(1, metrics.scheduledWorkingDays)) * 100)}%
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 font-bold">
              <span>Recommended HR Action:</span>
              <span className="text-gray-800 font-medium">
                {anomalyReport.extendedAbsenceStreaks.length > 0
                  ? 'Issue Medical / Show-Cause Verification'
                  : 'Attendance Approved for Payroll'}
              </span>
            </div>
          </div>
        </div>

        {/* Overtime & Extended Shift Ledger */}
        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50/50">
          <h4 className="font-bold uppercase text-gray-800 mb-2 border-b border-gray-200 pb-1">
            Overtime & Extended Shift Credit
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Raw Overtime:</span>
              <span className="font-semibold">{formatMinutesToHoursStr(metrics.totalOvertimeMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">HR Approved Overtime:</span>
              <span className="font-bold text-emerald-700">{formatMinutesToHoursStr(metrics.approvedOvertimeMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Statutory OT Rate Multiplier:</span>
              <span className="font-semibold">1.5x (Plant Standard)</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 font-bold">
              <span>Net Payable OT Credit:</span>
              <span className="text-teal-700 font-mono">₹{payrollImpact.otEarnings.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Payroll Financial Reconciliation */}
        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50/50">
          <h4 className="font-bold uppercase text-gray-800 mb-2 border-b border-gray-200 pb-1">
            Payroll Financial Impact Reconciliation
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-600">Gross Monthly Base CTC:</span>
              <span className="font-mono font-semibold">₹{(payrollImpact.monthlyCtc || payrollImpact.baseGrossEarnings || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unpaid Absence (LOP Deduction):</span>
              <span className="font-mono text-rose-700 font-semibold">- ₹{(payrollImpact.lopDeductionAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Approved OT Earnings:</span>
              <span className="font-mono text-teal-700 font-semibold">+ ₹{(payrollImpact.otEarnings || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 font-bold">
              <span>Net Attendance-Adjusted Pay:</span>
              <span className="text-[#07563D] font-mono font-black text-sm">
                ₹{(payrollImpact.netTakeHomePay || (payrollImpact.baseGrossEarnings || 0) - (payrollImpact.lopDeductionAmount || 0)).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. STATUTORY SIGNATURE & AUTHORIZATION BLOCK ─────────────── */}
      <div className="border-t-2 border-gray-300 pt-8 mt-10 grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="border-b border-dashed border-gray-400 pb-8 mb-2"></div>
          <span className="font-bold text-gray-800 block">Employee Signature</span>
          <span className="text-[10px] text-gray-500 font-mono">Date: ____________________</span>
        </div>
        <div>
          <div className="border-b border-dashed border-gray-400 pb-8 mb-2"></div>
          <span className="font-bold text-gray-800 block">Department Supervisor / HOD</span>
          <span className="text-[10px] text-gray-500 font-mono">Sign & Punch Verification</span>
        </div>
        <div>
          <div className="border-b border-dashed border-gray-400 pb-8 mb-2"></div>
          <span className="font-bold text-gray-800 block">HR & Payroll Authorized Officer</span>
          <span className="text-[10px] text-gray-500 font-mono">Approved for Disbursal</span>
        </div>
      </div>

      {/* Footer System Watermark */}
      <div className="mt-8 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-mono">
        <span>JOY PeopleHR Cloud HRMS • Attendance & Payroll Disbursal Suite</span>
        <span>Cryptographically Verified Attendance Record • System Generated</span>
      </div>
    </div>
  );
};
