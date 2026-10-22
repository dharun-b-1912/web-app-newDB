// src/components/payroll/PayslipDocument.tsx
// ============================================================================
// Joy PeopleHR — Canonical Enterprise A4 Payslip Document Component
// Authoritative Single Source of Truth for Web Preview, Downloaded PDF, and Print A4
// 100% Layout & Data Parity • Complete Salary & Statutory Breakdown • Zero Drift
// ============================================================================

import React from 'react';
import { PayslipViewModel } from '../../types/payslipViewModel';

interface PayslipDocumentProps {
  model: PayslipViewModel;
  mode?: 'screen' | 'pdf' | 'print';
  id?: string;
  className?: string;
}

export const PayslipDocument: React.FC<PayslipDocumentProps> = ({
  model: vm,
  mode = 'screen',
  id = 'a4-payslip-document',
  className = '',
}) => {
  const {
    company,
    payroll,
    employee,
    attendance,
    earnings,
    deductions,
    statutoryDetails,
    employerContributions,
    totals,
    metadata,
  } = vm;

  const isVendorWorker = employee.employmentSource === 'VENDOR' || !!employee.vendor;
  const erPf = employerContributions.find(e => e.code === 'PF_ER')?.amount || 0;
  const erEsi = employerContributions.find(e => e.code === 'ESI_ER')?.amount || 0;
  const totalErContrib = totals.totalEmployerContributions || (erPf + erEsi);
  const totalCtc = totals.grossEarnings + totalErContrib;

  const pfEmployee = deductions.find(d => d.code === 'PF_EE')?.amount || 0;
  const esiEmployee = deductions.find(d => d.code === 'ESI_EE')?.amount || 0;
  const ptEmployee = deductions.find(d => d.code === 'PT')?.amount || 0;
  const tdsEmployee = deductions.find(d => d.code === 'TDS' || d.label.includes('TDS'))?.amount || 0;
  const lwfEmployee = deductions.find(d => d.code === 'LWF' || d.label.includes('LWF'))?.amount || 0;

  // Derive eligibility/display states:
  // If contribution > 0 -> Applicable with amount
  // If contribution === 0 and employee has UAN -> Eligible / Zero for this period or Not Applicable
  const isPfApplicable = pfEmployee > 0 || erPf > 0;
  const isEsiApplicable = esiEmployee > 0 || erEsi > 0;

  // Real Reconciliation Calculation
  const calculatedNet = totals.grossEarnings - totals.totalDeductions;
  const isReconciled = calculatedNet === totals.netPayable;
  const variance = Math.abs(calculatedNet - totals.netPayable);

  return (
    <div
      id={id}
      data-payslip-ref={metadata.payslipNumber}
      className={`w-full max-w-[820px] min-h-[1050px] bg-white text-slate-900 font-sans relative flex flex-col justify-between p-4 sm:p-8 border-2 border-[#0f2d59] rounded-lg shadow-xl mx-auto box-border ${className}`}
      style={{
        maxWidth: '820px',
        width: '100%',
        minHeight: '1050px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* =================================================================== */}
      {/* 1. TOP HEADER: LOGO, COMPANY DETAILS & PAYSLIP PERIOD BANNER */}
      {/* =================================================================== */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-3.5 mb-3 border-b-2 border-[#0f2d59] gap-3">
          <div className="flex items-center gap-3.5 max-w-full sm:max-w-[65%]">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border-2 border-blue-200 bg-emerald-50/40 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
              <img
                src={company.logoUrl || '/logo.png'}
                alt="Company Logo"
                className="max-h-full max-w-full object-contain"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById(`doc-logo-fallback-${employee.employeeCode}`);
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                id={`doc-logo-fallback-${employee.employeeCode}`}
                className="font-black text-[#0f2d59] text-base sm:text-lg tracking-wider"
                style={{ display: company.logoUrl ? 'none' : 'flex' }}
              >
                JOY
              </div>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-[#0f2d59] uppercase tracking-wide leading-tight">
                {company.legalName}
              </h1>
              {company.displayName && company.displayName !== company.legalName && (
                <div className="text-xs font-bold text-slate-700 mt-0.5">{company.displayName}</div>
              )}
              <div className="text-[11px] font-medium text-slate-600 mt-0.5 leading-snug">
                {company.address || 'Corporate Headquarters & Registered Office'}
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-900 mt-1 flex gap-2 flex-wrap">
                {company.gstin && <span>GSTIN: <strong>{company.gstin}</strong></span>}
                {company.pan && <span>· PAN: <strong>{company.pan}</strong></span>}
                {company.pfEstablishmentCode && <span>· PF: <strong>{company.pfEstablishmentCode}</strong></span>}
                {company.esiEmployerCode && <span>· ESI: <strong>{company.esiEmployerCode}</strong></span>}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right flex flex-col items-start sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            <div className="px-3.5 py-1.5 bg-[#0f2d59] text-white font-black text-xs rounded-md uppercase tracking-wider shadow-xs">
              PAYSLIP FOR {payroll.periodMonth?.toUpperCase() || 'AUGUST'} {payroll.periodYear || 2026}
            </div>
            <div className="text-[11px] font-mono text-slate-800 mt-1.5 space-y-0.5 font-semibold sm:text-right">
              <div>Pay Date: <strong>{payroll.payDate}</strong></div>
              <div>Period: <strong>{payroll.periodStart} to {payroll.periodEnd}</strong></div>
              <div>Ref: <strong>{metadata.payslipNumber}</strong></div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. EMPLOYEE INFORMATION GRID (RESPONSIVE 2-COLUMN) */}
        {/* =================================================================== */}
        <div className="border-2 border-slate-300 rounded-lg overflow-hidden mb-3 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="p-3 space-y-2">
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed border-slate-100">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">EMPLOYEE ID</span>
                <span className="font-mono font-bold text-slate-900">{employee.employeeCode}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed border-slate-100">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">EMPLOYEE NAME</span>
                <span className="font-bold text-slate-900 uppercase">{employee.employeeName}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed border-slate-100">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">DESIGNATION</span>
                <span className="font-semibold text-slate-800">{employee.designation}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed border-slate-100">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">DEPARTMENT</span>
                <span className="font-semibold text-slate-800">{employee.department}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed border-slate-100">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">DATE OF JOINING</span>
                <span className="font-mono text-slate-800">{employee.dateOfJoining}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">WORK LOCATION</span>
                <span className="text-slate-800">{employee.workLocation || 'Main Campus'}</span>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed border-slate-100">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">BANK ACCOUNT</span>
                <span className="font-mono font-bold text-slate-900">{employee.bankAccountMasked}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed border-slate-100">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">BANK &amp; IFSC</span>
                <span className="font-mono text-slate-800">{employee.bankName} ({employee.ifscCode})</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed border-slate-100">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">PAYMENT STATUS</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  ((payroll as any)?.disbursedAt || (payroll.payrollStatus as string) === 'PAID')
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-sky-100 text-sky-800 border border-sky-300'
                }`}>
                  {((payroll as any)?.disbursedAt || (payroll.payrollStatus as string) === 'PAID') ? 'Disbursed / Paid' : 'Payment Scheduled'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed border-slate-100">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">UAN / EPF NO.</span>
                <span className="font-mono text-slate-800">{employee.uanMasked || 'Not Applicable'}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed border-slate-100">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">ESIC NUMBER</span>
                <span className="font-mono text-slate-800">{employee.esiMasked || 'Not Applicable'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] font-extrabold text-[#0f2d59] uppercase">PAN NUMBER</span>
                <span className="font-mono text-slate-800">{employee.panMasked || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3. MODULAR ATTENDANCE SUMMARY RIBBON */}
        {/* =================================================================== */}
        <div className="border-2 border-slate-300 rounded-lg overflow-hidden mb-3 bg-white text-center">
          <div className="grid grid-cols-3 border-b border-slate-200">
            <div className="p-2 sm:p-2.5 bg-emerald-50 border-r border-slate-200">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase block">PAYABLE DAYS</span>
              <strong className="text-sm sm:text-base font-black font-mono text-emerald-950">{attendance.payableDays} Days</strong>
            </div>
            <div className="p-2 sm:p-2.5 bg-slate-50 border-r border-slate-200">
              <span className="text-[10px] font-extrabold text-slate-600 uppercase block">WORKED DAYS</span>
              <strong className="text-sm sm:text-base font-black font-mono text-slate-900">
                {typeof (attendance as any).workedDays === 'number' ? (attendance as any).workedDays : (attendance.presentDays || attendance.payableDays)} Days
              </strong>
            </div>
            <div className="p-2 sm:p-2.5 bg-amber-50">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase block">OVERTIME (OT)</span>
              <strong className="text-sm sm:text-base font-black font-mono text-amber-950">{attendance.overtimeHours || 0} Hrs</strong>
            </div>
          </div>

          <div className="p-2 bg-white flex flex-wrap justify-around items-center text-xs font-mono text-slate-600 gap-2">
            <span>Calendar Days: <strong className="text-slate-900">{attendance.calendarDays || 30}</strong></span>
            <span>Weekly Offs: <strong className="text-slate-900">{attendance.weeklyOffDays ?? 4}</strong></span>
            <span>Paid Holidays: <strong className="text-slate-900">{attendance.paidHolidays ?? 0}</strong></span>
            <span>Loss of Pay (LOP): <strong className={attendance.lopDays > 0 ? 'text-rose-700 font-black' : 'text-slate-900'}>{attendance.lopDays || 0}</strong></span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 4. FINANCIAL STATEMENT: EARNINGS & DEDUCTIONS */}
        {/* =================================================================== */}
        {deductions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {/* Earnings Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                  <tr>
                    <th className="p-2 font-black text-xs uppercase tracking-wide">EARNINGS COMPONENT</th>
                    <th className="p-2 font-bold text-xs text-center">UNITS</th>
                    <th className="p-2 font-black text-xs text-right uppercase tracking-wide">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {earnings.map((e) => (
                    <tr key={e.code} className="hover:bg-slate-50/60">
                      <td className="p-2 font-semibold text-slate-900 text-xs">{e.label}</td>
                      <td className="p-2 text-center text-slate-600 text-xs font-mono">{e.units || '—'}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-950 text-xs">
                        ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs font-black">
                <span className="text-emerald-900 uppercase tracking-wide text-xs">GROSS EARNINGS</span>
                <span className="font-mono text-sm text-emerald-900">
                  ₹{totals.grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Deductions Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                  <tr>
                    <th className="p-2 font-black text-xs uppercase tracking-wide">DEDUCTIONS COMPONENT</th>
                    <th className="p-2 font-bold text-xs text-center">CATEGORY</th>
                    <th className="p-2 font-black text-xs text-right uppercase tracking-wide">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deductions.map((d) => (
                    <tr key={d.code} className="hover:bg-slate-50/60">
                      <td className="p-2 font-semibold text-slate-900 text-xs">{d.label}</td>
                      <td className="p-2 text-center text-slate-600 text-xs font-mono">{d.units || 'Employee'}</td>
                      <td className="p-2 text-right font-mono font-bold text-rose-800 text-xs">
                        ₹{d.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-2 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs font-black">
                <span className="text-rose-900 uppercase tracking-wide text-xs">TOTAL DEDUCTIONS</span>
                <span className="font-mono text-sm text-rose-900">
                  ₹{totals.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-3 space-y-2">
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                  <tr>
                    <th className="p-2 font-black text-xs uppercase tracking-wide">EARNINGS COMPONENT</th>
                    <th className="p-2 font-bold text-xs text-center">RATE / UNITS</th>
                    <th className="p-2 font-black text-xs text-right uppercase tracking-wide">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {earnings.map((e) => (
                    <tr key={e.code} className="hover:bg-slate-50/60">
                      <td className="p-2 font-semibold text-slate-900 text-xs">{e.label}</td>
                      <td className="p-2 text-center text-slate-600 text-xs font-mono">{e.units || '—'}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-950 text-xs">
                        ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs font-black">
                <span className="text-emerald-900 uppercase tracking-wide text-xs">GROSS EARNINGS</span>
                <span className="font-mono text-sm text-emerald-900">
                  ₹{totals.grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-semibold text-slate-700">
              <span><strong>DEDUCTIONS:</strong> No statutory or voluntary deductions applied for this payroll cycle.</span>
              <span className="font-mono font-bold text-emerald-800">₹0.00</span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 5. NET TAKE-HOME SALARY HERO CARD */}
        {/* =================================================================== */}
        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-600 rounded-lg mb-3 flex flex-col sm:flex-row sm:items-center justify-between shadow-xs gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">NET TAKE-HOME SALARY</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                ((payroll as any)?.disbursedAt || (payroll.payrollStatus as string) === 'PAID')
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-sky-100 text-sky-800 border border-sky-300'
              }`}>
                {((payroll as any)?.disbursedAt || (payroll.payrollStatus as string) === 'PAID') ? 'Disbursed / Paid' : 'Payment Scheduled'}
              </span>
            </div>
            <div className="text-xs font-bold text-emerald-900 mt-1">
              Amount in Words: <strong>{totals.netPayableInWords}</strong>
            </div>
          </div>

          <div className="text-2xl font-black text-emerald-900 font-mono tracking-tight sm:text-right">
            ₹{totals.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* =================================================================== */}
        {/* 6. STATUTORY SUMMARY & EMPLOYER CONTRIBUTIONS (CTC) */}
        {/* =================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {/* Left Box: Symmetrical Statutory Breakdown */}
          <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-lg text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-[#0f2d59] uppercase text-[10px] tracking-wide">
                  STATUTORY COMPLIANCE SUMMARY
                </span>
                <span
                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                    isReconciled ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {isReconciled ? 'Statutory Verified (₹0.00 Variance)' : `Statutory Exception (₹${variance.toFixed(2)})`}
                </span>
              </div>

              <table className="w-full text-xs font-mono border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 text-slate-600 font-sans">Employee PF (12%):</td>
                    <td className="py-1 text-right font-bold text-slate-900">
                      {isPfApplicable ? (pfEmployee > 0 ? `₹${pfEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Exempt / Co. Paid (₹0.00)') : 'Not Applicable'}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 text-slate-600 font-sans">Employee ESI (0.75%):</td>
                    <td className="py-1 text-right font-bold text-slate-900">
                      {isEsiApplicable ? (esiEmployee > 0 ? `₹${esiEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Exempt / Co. Paid (₹0.00)') : 'Not Applicable'}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 text-slate-600 font-sans">Professional Tax (PT):</td>
                    <td className="py-1 text-right font-bold text-slate-900">
                      {ptEmployee > 0 ? `₹${ptEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Nil'}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 text-slate-600 font-sans">Tax Deducted at Source (TDS):</td>
                    <td className="py-1 text-right font-bold text-slate-900">
                      {tdsEmployee > 0 ? `₹${tdsEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Nil'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600 font-sans">Labour Welfare Fund (LWF):</td>
                    <td className="py-1 text-right font-bold text-slate-900">
                      {lwfEmployee > 0 ? `₹${lwfEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Nil'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-slate-500 font-sans mt-2 pt-1 border-t border-slate-200 flex justify-between">
              <span>UAN: {employee.uanMasked || '—'}</span>
              <span>PAN: {employee.panMasked || '—'}</span>
            </div>
          </div>

          {/* Right Box: Employer Contributions & CTC Cost */}
          <div className="p-3 bg-blue-50/70 border-2 border-blue-200 rounded-lg text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-[#0f2d59] uppercase text-[10px] tracking-wide">
                  EMPLOYER CONTRIBUTIONS (CTC IMPACT)
                </span>
                <span className="text-[9px] font-extrabold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full border border-blue-300">
                  Non-Deductible
                </span>
              </div>

              <table className="w-full text-xs font-mono border-collapse">
                <tbody>
                  <tr className="border-b border-blue-100">
                    <td className="py-1 text-slate-700 font-sans">
                      <div className="font-semibold text-slate-800">Employer EPF ({erPf > 0 ? (Math.round((erPf / (earnings.find(e => e.code === 'BASIC')?.amount || (totals.grossEarnings * 0.5))) * 100)) : 12}%):</div>
                    </td>
                    <td className="py-1 text-right font-bold text-slate-900 align-top">
                      {erPf > 0 ? `₹${erPf.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not Applicable'}
                    </td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-1 text-slate-700 font-sans">
                      <div className="font-semibold text-slate-800">Employer ESIC (3.25%):</div>
                    </td>
                    <td className="py-1 text-right font-bold text-slate-900 align-top">
                      {erEsi > 0 ? `₹${erEsi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not Applicable'}
                    </td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-1 text-slate-700 font-sans">Other Employer Benefits:</td>
                    <td className="py-1 text-right font-bold text-slate-900">Nil</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-700 font-sans font-bold">Total Employer Contribution:</td>
                    <td className="py-1 text-right font-bold text-[#0f2d59]">
                      ₹{totalErContrib.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-2 pt-1 border-t-2 border-[#0f2d59] flex items-center justify-between text-xs font-black">
              <span className="text-[#0f2d59] uppercase text-[10px] tracking-wide">EMPLOYER COST / CTC:</span>
              <span className="font-mono text-sm text-[#0f2d59]">
                ₹{totalCtc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 7. SECURE STATUTORY FOOTER */}
      {/* =================================================================== */}
      <div className="border-t border-slate-300 pt-2.5 text-center text-slate-600 text-xs mt-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-slate-500 mb-1 gap-1">
          <span>
            Generated: <strong>{new Date(metadata.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
          </span>
          <span>JOY PeopleHR • Secure Statutory Enterprise Suite</span>
          <span>Ref: <strong>{metadata.payslipNumber}</strong></span>
        </div>
        <div className="italic text-[10px] text-slate-400">
          *** This is a computer-generated payslip and does not require a physical signature. Confidential &amp; Proprietary. ***
        </div>
      </div>
    </div>
  );
};
