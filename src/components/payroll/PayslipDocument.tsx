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
      className={`w-[820px] min-h-[1140px] bg-white text-slate-900 font-sans relative flex flex-col justify-between p-8 border-2 border-[#0f2d59] rounded-lg shadow-xl mx-auto box-border ${className}`}
      style={{
        width: '820px',
        minHeight: '1140px',
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
        <div className="flex items-start justify-between pb-3.5 mb-3 border-b-2 border-[#0f2d59]">
          <div className="flex items-center gap-3.5 max-w-[65%]">
            <div className="w-16 h-16 rounded-lg border-2 border-blue-200 bg-emerald-50/40 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
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
                className="font-black text-[#0f2d59] text-lg tracking-wider"
                style={{ display: company.logoUrl ? 'none' : 'flex' }}
              >
                JOY
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black text-[#0f2d59] uppercase tracking-wide leading-tight">
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

          <div className="text-right flex flex-col items-end">
            <div className="px-3.5 py-1.5 bg-[#0f2d59] text-white font-black text-xs rounded-md uppercase tracking-wider shadow-xs">
              PAYSLIP FOR {payroll.periodMonth?.toUpperCase() || 'AUGUST'} {payroll.periodYear || 2026}
            </div>
            <div className="text-[11px] font-mono text-slate-800 mt-1.5 space-y-0.5 font-semibold text-right">
              <div>Pay Date: <strong>{payroll.payDate}</strong></div>
              <div>Period: <strong>{payroll.periodStart} to {payroll.periodEnd}</strong></div>
              <div>Ref: <strong>{metadata.payslipNumber}</strong></div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. EMPLOYEE MASTER & DEPLOYMENT INFORMATION GRID (4 COLUMNS) */}
        {/* =================================================================== */}
        <div className="border-2 border-slate-400 rounded-lg overflow-hidden mb-3 bg-slate-50/50">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {/* Row 1: Identity */}
              <tr className="border-b border-slate-300 divide-x divide-slate-300">
                <td className="p-2 w-1/4">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">EMPLOYEE ID / CODE</div>
                  <div className="font-extrabold text-slate-900 font-mono text-xs">{employee.employeeCode}</div>
                </td>
                <td className="p-2 w-1/4">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">EMPLOYEE NAME</div>
                  <div className="font-extrabold text-slate-900 uppercase text-xs">{employee.employeeName}</div>
                </td>
                <td className="p-2 w-1/4">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">DESIGNATION</div>
                  <div className="font-bold text-slate-800 text-xs">{employee.designation}</div>
                </td>
                <td className="p-2 w-1/4">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">DEPARTMENT</div>
                  <div className="font-bold text-slate-800 text-xs">{employee.department}</div>
                </td>
              </tr>

              {/* Row 2: Employment & Payout */}
              <tr className="border-b border-slate-300 divide-x divide-slate-300">
                <td className="p-2">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">DATE OF JOINING</div>
                  <div className="font-bold text-slate-900 font-mono text-xs">{employee.dateOfJoining}</div>
                </td>
                <td className="p-2">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">WORK LOCATION</div>
                  <div className="font-bold text-slate-800 text-xs">{employee.workLocation || 'Coimbatore Factory'}</div>
                </td>
                <td className="p-2">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">EMPLOYMENT TYPE</div>
                  <div className="font-bold text-slate-800 text-xs">{employee.employmentType || 'Full Time'}</div>
                </td>
                <td className="p-2">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">PAYOUT MODE</div>
                  <div className="font-extrabold text-emerald-800 text-xs">{employee.paymentMode || 'Direct Bank Transfer'}</div>
                </td>
              </tr>

              {/* Row 3: Bank & Statutory Numbers */}
              <tr className={`${isVendorWorker ? 'border-b border-slate-300' : ''} divide-x divide-slate-300`}>
                <td className="p-2">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">BANK ACCOUNT NO.</div>
                  <div className="font-mono font-extrabold text-slate-900 text-xs">{employee.bankAccountMasked}</div>
                </td>
                <td className="p-2">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">BANK & IFSC CODE</div>
                  <div className="font-mono font-bold text-slate-800 text-xs">{employee.bankName} ({employee.ifscCode})</div>
                </td>
                <td className="p-2">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">UAN / EPF NUMBER</div>
                  <div className="font-mono font-bold text-slate-800 text-xs">{employee.uanMasked || '—'}</div>
                </td>
                <td className="p-2">
                  <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">ESIC NUMBER</div>
                  <div className="font-mono font-bold text-slate-800 text-xs">{employee.esiMasked || '—'}</div>
                </td>
              </tr>

              {/* Row 4: Client & Vendor (rendered only for vendor / manpower workers) */}
              {isVendorWorker && (
                <tr className="divide-x divide-slate-300 bg-blue-50/40">
                  <td className="p-2">
                    <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">EMPLOYMENT SOURCE</div>
                    <div className="font-bold text-[#0f2d59] text-xs">Manpower / Vendor</div>
                  </td>
                  <td className="p-2" colSpan={2}>
                    <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">CLIENT NAME</div>
                    <div className="font-bold text-slate-900 text-xs">{employee.clientName || company.legalName}</div>
                  </td>
                  <td className="p-2">
                    <div className="text-[10px] font-extrabold text-[#0f2d59] uppercase tracking-wide">MANPOWER VENDOR / AGENCY</div>
                    <div className="font-bold text-slate-900 text-xs">{employee.vendor || 'Joy Manpower Services Pvt Ltd'}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* =================================================================== */}
        {/* 3. ATTENDANCE & LEAVE SUMMARY RIBBON */}
        {/* =================================================================== */}
        <div className="grid grid-cols-7 border-2 border-slate-400 rounded-lg overflow-hidden mb-3 bg-white text-center">
          <div className="p-2 border-r border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-600 uppercase block">CALENDAR</span>
            <strong className="text-sm font-black font-mono text-slate-900">{attendance.calendarDays || 30}</strong>
          </div>
          <div className="p-2 border-r border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-600 uppercase block">WORKED</span>
            <strong className="text-sm font-black font-mono text-slate-900">{attendance.presentDays || attendance.payableDays}</strong>
          </div>
          <div className="p-2 border-r border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-600 uppercase block">WEEKLY OFF</span>
            <strong className="text-sm font-black font-mono text-slate-900">{attendance.weeklyOffDays ?? 4}</strong>
          </div>
          <div className="p-2 border-r border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-600 uppercase block">HOLIDAYS</span>
            <strong className="text-sm font-black font-mono text-slate-900">{attendance.paidHolidays ?? 0}</strong>
          </div>
          <div className="p-2 border-r border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-600 uppercase block">LOP</span>
            <strong className={`text-sm font-black font-mono ${attendance.lopDays > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {attendance.lopDays || 0}
            </strong>
          </div>
          <div className="p-2 border-r border-slate-300 bg-emerald-50">
            <span className="text-[10px] font-extrabold text-emerald-800 uppercase block">PAID DAYS</span>
            <strong className="text-sm font-black font-mono text-emerald-950">{attendance.payableDays} Days</strong>
          </div>
          <div className="p-2 bg-amber-50">
            <span className="text-[10px] font-extrabold text-amber-800 uppercase block">OVERTIME</span>
            <strong className="text-sm font-black font-mono text-amber-950">{attendance.overtimeHours || 0} Hrs</strong>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 4. FINANCIAL STATEMENT: EARNINGS VS DEDUCTIONS SIDE-BY-SIDE */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Left Column: Earnings */}
          <div className="border-2 border-slate-400 rounded-lg overflow-hidden flex flex-col justify-between bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0f2d59] text-white">
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
                {earnings.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-3 text-center text-slate-400 italic">No earnings recorded</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="p-2.5 bg-blue-50/80 border-t-2 border-[#0f2d59] flex items-center justify-between text-xs font-black">
              <span className="text-[#0f2d59] uppercase tracking-wide text-xs">GROSS EARNINGS</span>
              <span className="font-mono text-sm text-[#0f2d59]">
                ₹{totals.grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Right Column: Employee Deductions */}
          <div className="border-2 border-slate-400 rounded-lg overflow-hidden flex flex-col justify-between bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0f2d59] text-white">
                <tr>
                  <th className="p-2 font-black text-xs uppercase tracking-wide">DEDUCTIONS COMPONENT</th>
                  <th className="p-2 font-black text-xs text-right uppercase tracking-wide">AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deductions.map((d) => (
                  <tr key={d.code} className="hover:bg-slate-50/60">
                    <td className="p-2 font-semibold text-slate-900 text-xs">{d.label}</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-800 text-xs">
                      ₹{d.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {deductions.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-slate-400 italic text-xs">
                      Zero deductions applied (₹0.00)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="p-2.5 bg-rose-50/80 border-t-2 border-rose-600 flex items-center justify-between text-xs font-black">
              <span className="text-rose-900 uppercase tracking-wide text-xs">TOTAL DEDUCTIONS</span>
              <span className="font-mono text-sm text-rose-900">
                ₹{totals.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 5. NET TAKE-HOME SALARY HERO BANNER */}
        {/* =================================================================== */}
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-lg mb-3 flex items-center justify-between shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">NET TAKE-HOME SALARY</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {employee.paymentMode || 'Direct Bank Transfer'}
              </span>
            </div>
            <div className="text-xs font-bold text-emerald-900 mt-1">
              Amount in Words: <strong>{totals.netPayableInWords}</strong>
            </div>
          </div>

          <div className="text-2xl font-black text-emerald-900 font-mono tracking-tight text-right">
            ₹{totals.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* =================================================================== */}
        {/* 6. SYMMETRICAL STATUTORY SUMMARY & EMPLOYER CONTRIBUTIONS (CTC) */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 gap-3 mb-3">
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
                  <tr>
                    <td className="py-1 text-slate-600 font-sans">Tax Deducted at Source (TDS):</td>
                    <td className="py-1 text-right font-bold text-slate-900">
                      {tdsEmployee > 0 ? `₹${tdsEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Nil'}
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
                      <div className="text-[9.5px] text-slate-500 font-sans">
                        Split: 3.67% EPF + 8.33% EPS{erPf > 0 && Math.round((erPf / (earnings.find(e => e.code === 'BASIC')?.amount || (totals.grossEarnings * 0.5))) * 100) > 12 ? ' + 1% Admin/EDLI' : ''}
                      </div>
                    </td>
                    <td className="py-1 text-right font-bold text-slate-900 align-top">
                      {erPf > 0 ? `₹${erPf.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not Applicable'}
                    </td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-1 text-slate-700 font-sans">
                      <div className="font-semibold text-slate-800">Employer ESIC (3.25%):</div>
                      <div className="text-[9.5px] text-slate-500 font-sans">
                        Medical &amp; Disability Social Security
                      </div>
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
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
          <span>
            Generated: <strong>{new Date(metadata.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
          </span>
          <span>JOY PeopleHR • Secure Statutory Enterprise Suite</span>
          <span>Doc ID: <strong>{metadata.payslipNumber}</strong> • Page 1 of 1</span>
        </div>
        <div className="italic text-[10px] text-slate-400">
          *** This is a computer-generated payslip and does not require a physical signature. Confidential & Proprietary. ***
        </div>
      </div>
    </div>
  );
};
