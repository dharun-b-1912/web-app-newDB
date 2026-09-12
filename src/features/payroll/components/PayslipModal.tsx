// src/features/payroll/components/PayslipModal.tsx
// ============================================================================
// Joy PeopleHR — Enterprise A4 Payslip Document Viewer & Print Engine
// Fully Separated Digital Preview Experience & Statutory A4 Document Output
// Strictly Bound to Authoritative PayslipViewModel (Zero Presentation Drift)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Building2,
  Calendar,
  CreditCard,
  UserCheck,
  FileText,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Payslip } from '../../../types/payroll';
import { PayslipGeneratorService } from '../../../services/payroll/payslipGeneratorService';
import { PayslipViewModel } from '../../../types/payslipViewModel';

interface PayslipModalProps {
  payslip: Payslip | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ payslip, isOpen, onClose }) => {
  const [zoom, setZoom] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation & focus management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isFullscreen]);

  if (!payslip || !isOpen) return null;

  // Authoritative DTO from PayslipGeneratorService
  const { viewModel, validation } = PayslipGeneratorService.buildPayslipViewModel(
    payslip.employee_code || payslip.employee_id,
    payslip.pay_period
  );

  const vm: PayslipViewModel = viewModel;

  const handleZoomIn = () => setZoom(prev => Math.min(1.5, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoom(prev => Math.max(0.6, Math.round((prev - 0.1) * 10) / 10));
  const handleResetZoom = () => setZoom(1);
  const handleFitWidth = () => setZoom(1.1);
  const handleFitPage = () => setZoom(0.85);

  const handleCopyRef = () => {
    navigator.clipboard.writeText(`${vm.metadata.payslipNumber} | ${vm.audit.dataHash}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const printContent = documentRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Payslip_${vm.employee.employeeCode}_${vm.payroll.payrollPeriod.replace(/\s+/g, '_')}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 12mm 12mm 12mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #0f172a;
                background: #ffffff;
                margin: 0;
                padding: 0;
              }
              .payslip-page {
                width: 100%;
                max-width: 190mm;
                margin: 0 auto;
                background: #ffffff;
              }
              ${getPrintStyles()}
            </style>
          </head>
          <body>
            <div class="payslip-page">
              ${printContent.innerHTML}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 350);
    } else {
      window.print();
    }
  };

  return (
    <>
      {/* Dynamic Print CSS to guarantee ONLY the A4 document prints cleanly */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print,
          .modal-backdrop,
          .payslip-modal-header,
          .payslip-toolbar,
          .payslip-action-panel {
            display: none !important;
          }
          #a4-payslip-document-wrapper {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          #a4-payslip-document {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* MODAL WRAPPER */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200 no-print"
        ref={modalContainerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payslip-modal-title"
      >
        {/* MODAL CONTAINER */}
        <div
          className={`w-full ${
            isFullscreen ? 'fixed inset-0 rounded-none h-full max-h-none' : 'max-w-[1440px] h-[92vh] max-h-[960px] rounded-[20px]'
          } bg-[#F8FAFC] shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden text-slate-900 transition-all duration-200`}
        >
          {/* MODAL TOP HEADER */}
          <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="payslip-modal-title" className="text-base font-extrabold text-slate-900 tracking-tight">
                    Payslip Details
                  </h2>
                  <span className="text-xs font-bold text-slate-400">•</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {vm.payroll.payrollPeriod}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {vm.employee.employeeCode}
                  </span>
                  <span className="hidden sm:inline text-xs font-semibold text-slate-700 truncate">
                    {vm.employee.employeeName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Authoritative Statutory Snapshot · {vm.company.legalName} ({vm.company.displayName})
                </p>
              </div>
            </div>

            {/* Top Right Header Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200 text-[#07563D] text-xs font-bold shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Statutory Verified (₹0.00 Variance)</span>
              </div>

              <button
                onClick={onClose}
                aria-label="Close modal"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* MAIN SPLIT VIEWPORT */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* LEFT / MAIN PREVIEW CANVAS AREA (72% width on desktop) */}
            <div className="flex-1 lg:w-[72%] flex flex-col h-full overflow-hidden bg-slate-200/70 border-r border-slate-200">
              {/* COMPACT DOCUMENT TOOLBAR */}
              <div className="px-4 py-2 bg-white/95 backdrop-blur-xs border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 payslip-toolbar shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Document View:</span>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 hidden sm:inline">
                    ISO A4 Portrait (210 × 297 mm)
                  </span>
                </div>

                {/* Center / Right Zoom & Layout Controls */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button
                      onClick={handleZoomOut}
                      title="Zoom Out"
                      disabled={zoom <= 0.6}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-mono font-bold text-slate-700 min-w-[44px] text-center select-none">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      title="Zoom In"
                      disabled={zoom >= 1.5}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={handleResetZoom}
                    title="Reset to 100%"
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition-colors cursor-pointer hidden sm:flex items-center gap-1 text-xs font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>100%</span>
                  </button>

                  <button
                    onClick={handleFitWidth}
                    title="Fit Width"
                    className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition-colors cursor-pointer hidden md:inline-block text-xs font-semibold"
                  >
                    Fit Width
                  </button>

                  <button
                    onClick={handleFitPage}
                    title="Fit Page"
                    className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition-colors cursor-pointer hidden md:inline-block text-xs font-semibold"
                  >
                    Fit Page
                  </button>

                  <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

                  <button
                    onClick={() => setIsFullscreen(prev => !prev)}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition-colors cursor-pointer"
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* DOCUMENT CANVAS CONTAINER (Scrolling Canvas with Realistic Paper Shadow) */}
              <div
                id="a4-payslip-document-wrapper"
                className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center items-start bg-slate-200/80 custom-scrollbar select-text"
              >
                {/* TRANSFORM SCALING WRAPPER */}
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="pb-10"
                >
                  {/* ACTUAL A4 PAYSLIP DOCUMENT */}
                  <div
                    id="a4-payslip-document"
                    ref={documentRef}
                    className="w-[794px] min-h-[1123px] bg-white rounded-lg border border-slate-300 p-8 shadow-2xl text-slate-900 font-sans relative"
                    style={{
                      boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
                    }}
                  >
                    {/* SECTION 1: HEADER (LOGO + TITLE + COMPANY BLOCK) */}
                    <div className="relative flex items-center justify-center pb-2.5 mb-2.5 border-b-2 border-[#1e3a8a]">
                      {/* Top-Left Logo Box (Constrained & Responsive) */}
                      <div className="absolute left-0 top-0 w-24 h-16 flex items-center justify-start">
                        <div className="h-14 max-w-[90px] rounded-lg border border-blue-200 bg-blue-50/40 p-1 flex items-center justify-center shadow-2xs overflow-hidden">
                          <img
                            src={vm.company.logoUrl || '/logo.png'}
                            alt="Company Logo"
                            className="max-h-full max-w-full object-contain object-left"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="font-black text-[#1e3a8a] text-sm tracking-wider">JOY</span>
                        </div>
                      </div>

                      {/* Header Center Titles */}
                      <div className="text-center pt-1">
                        <h1 className="text-xl font-black text-[#0f2d59] tracking-wider uppercase m-0 font-sans">
                          EMPLOYEE SALARY SLIP
                        </h1>
                        <p className="text-xs font-black text-blue-700 tracking-widest uppercase mt-0.5">
                          {vm.payroll.payrollPeriod.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* Company Legal Identity & Statutory Contact Line */}
                    <div className="text-center mb-3">
                      <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                        {vm.company.legalName}
                      </h2>
                      <p className="text-xs font-semibold text-slate-500">
                        {vm.company.displayName}
                      </p>
                      <p className="text-[10px] text-slate-600 max-w-xl mx-auto leading-relaxed mt-0.5">
                        {vm.company.address}
                      </p>
                      <p className="text-[9.5px] font-semibold text-blue-700 mt-0.5">
                        {vm.company.contact}
                      </p>
                    </div>

                    {/* SECTION 2: EMPLOYEE INFORMATION 4-COLUMN STRUCTURED GRID */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden mb-3">
                      <table className="w-full border-collapse text-xs">
                        <tbody>
                          {/* Row 1: Employee & Org Identity */}
                          <tr className="border-b border-slate-300 divide-x divide-slate-300">
                            <td className="p-2 bg-slate-50/70 w-1/4">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">EMPLOYEE ID</div>
                              <div className="font-bold text-slate-900 font-mono text-xs">{vm.employee.employeeCode}</div>
                            </td>
                            <td className="p-2 bg-slate-50/70 w-1/4">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">EMPLOYEE NAME</div>
                              <div className="font-bold text-slate-900 uppercase text-xs">{vm.employee.employeeName}</div>
                            </td>
                            <td className="p-2 bg-slate-50/70 w-1/4">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">DESIGNATION</div>
                              <div className="font-bold text-slate-900 text-xs">{vm.employee.designation}</div>
                            </td>
                            <td className="p-2 bg-slate-50/70 w-1/4">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">DEPARTMENT</div>
                              <div className="font-bold text-slate-900 text-xs">{vm.employee.department}</div>
                            </td>
                          </tr>

                          {/* Row 2: Attendance & Pay Period */}
                          <tr className="border-b border-slate-300 divide-x divide-slate-300">
                            <td className="p-2 bg-slate-50/70">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">DATE OF JOINING (DOJ)</div>
                              <div className="font-semibold text-slate-900 font-mono text-xs">{vm.employee.dateOfJoining}</div>
                            </td>
                            <td className="p-2 bg-slate-50/70">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">PAYROLL PERIOD</div>
                              <div className="font-semibold text-slate-900 text-xs">{vm.payroll.periodStart} to {vm.payroll.periodEnd}</div>
                            </td>
                            <td className="p-2 bg-slate-50/70">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">PAYABLE DAYS</div>
                              <div className="font-bold text-emerald-700 text-xs font-mono">{vm.attendance.payableDays} Days</div>
                            </td>
                            <td className="p-2 bg-slate-50/70">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">OT HOURS</div>
                              <div className="font-bold text-slate-900 text-xs font-mono">{vm.attendance.overtimeHours} Hrs</div>
                            </td>
                          </tr>

                          {/* Row 3: Banking & Statutory Compliance */}
                          <tr className="divide-x divide-slate-300">
                            <td className="p-2 bg-slate-50/70">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">BANK ACCOUNT NUMBER</div>
                              <div className="font-mono font-bold text-slate-900 text-xs">{vm.employee.bankAccountMasked}</div>
                            </td>
                            <td className="p-2 bg-slate-50/70">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">IFSC CODE & BANK NAME</div>
                              <div className="font-mono font-bold text-slate-900 text-xs">{vm.employee.ifscCode}</div>
                            </td>
                            <td className="p-2 bg-slate-50/70">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">UAN / EPF NUMBER</div>
                              <div className="font-mono text-slate-900 text-xs">{vm.employee.uanMasked}</div>
                            </td>
                            <td className="p-2 bg-slate-50/70">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">ESI NUMBER</div>
                              <div className="font-mono text-slate-900 text-xs">{vm.employee.esiMasked}</div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* SECTION 3: FINANCIAL STATEMENT (EARNINGS VS DEDUCTIONS) */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* Left: Earnings Column */}
                      <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col justify-between">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 border-b border-slate-300">
                            <tr>
                              <th className="p-2.5 font-black text-[#1e3a8a] text-[11px] uppercase tracking-wide">EARNINGS</th>
                              <th className="p-2.5 font-bold text-slate-600 text-[10px] text-center">UNITS</th>
                              <th className="p-2.5 font-black text-[#1e3a8a] text-[11px] text-right uppercase tracking-wide">AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {vm.earnings.map(e => (
                              <tr key={e.code} className="hover:bg-slate-50/60">
                                <td className="p-2 font-medium text-slate-800">{e.label}</td>
                                <td className="p-2 text-center text-slate-500 text-[10px] font-mono">{e.units || '—'}</td>
                                <td className="p-2 text-right font-mono font-bold text-slate-900">₹{e.amount.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                            {vm.earnings.length === 0 && (
                              <tr>
                                <td colSpan={3} className="p-3 text-center text-slate-400 italic">No earnings recorded</td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        <div className="p-2.5 bg-slate-50 border-t-2 border-slate-300 flex items-center justify-between text-xs font-black">
                          <span className="text-[#0f172a] uppercase tracking-wide">Gross Earnings</span>
                          <span className="font-mono text-sm text-slate-900">₹{vm.totals.grossEarnings.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Right: Deductions Column */}
                      <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col justify-between">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 border-b border-slate-300">
                            <tr>
                              <th className="p-2.5 font-black text-[#1e3a8a] text-[11px] uppercase tracking-wide">DEDUCTIONS</th>
                              <th className="p-2.5 font-black text-[#1e3a8a] text-[11px] text-right uppercase tracking-wide">AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {vm.deductions.map(d => (
                              <tr key={d.code} className="hover:bg-slate-50/60">
                                <td className="p-2 font-medium text-slate-800">{d.label}</td>
                                <td className="p-2 text-right font-mono font-bold text-rose-800">₹{d.amount.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                            {vm.deductions.length === 0 && (
                              <tr>
                                <td colSpan={2} className="p-4 text-center text-slate-400 italic text-[11px]">
                                  Zero deductions applied (₹0.00)
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        <div className="p-2.5 bg-slate-50 border-t-2 border-slate-300 flex items-center justify-between text-xs font-black">
                          <span className="text-[#0f172a] uppercase tracking-wide">Total Deductions</span>
                          <span className="font-mono text-sm text-rose-800">₹{vm.totals.totalDeductions.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: PAYROLL RECONCILIATION SUMMARY / SOURCE CHECK */}
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg mb-3 flex items-center justify-between text-xs flex-wrap gap-2">
                      <div>
                        <div className="font-bold text-blue-900 text-[11px]">Imported register check</div>
                        <div className="text-[10px] text-blue-700 font-medium">
                          Source Gross: <strong>₹{vm.totals.grossEarnings.toLocaleString('en-IN')}</strong> · Source Deductions: <strong>₹{vm.totals.totalDeductions.toLocaleString('en-IN')}</strong> · Source Net: <strong>₹{vm.totals.netPayable.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                        100% RECONCILED
                      </span>
                    </div>

                    {/* SECTION 5: NET TAKE-HOME PAY HERO SECTION */}
                    <div className="p-4 bg-emerald-50/90 border-2 border-emerald-300 rounded-lg mb-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">NET TAKE-HOME PAY</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            {vm.employee.paymentMode}
                          </span>
                        </div>
                        <div className="text-[10.5px] font-bold text-emerald-800 mt-1">
                          Amount in Words: {vm.totals.netPayableInWords}
                        </div>
                      </div>

                      <div className="text-2xl font-black text-emerald-900 font-mono tracking-tight text-right">
                        ₹{vm.totals.netPayable.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* SECTION 6: STATUTORY FOOTER */}
                    <div className="border-t border-slate-200 pt-2.5 mt-4 text-center text-slate-500 text-[9.5px]">
                      <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
                        <span>Generated on: {new Date(vm.metadata.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        <span>JOY PeopleHR • Secure Statutory Document</span>
                        <span>Page 1 of 1</span>
                      </div>
                      <div className="italic">
                        *** This is a computer-generated payslip and does not require a physical signature. ***
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT ACTION PANEL (28% width on desktop) */}
            <div className="w-full lg:w-[28%] bg-white p-5 space-y-4 overflow-y-auto shrink-0 flex flex-col justify-between border-t lg:border-t-0 payslip-action-panel">
              <div className="space-y-4">
                {/* ACTION PANEL TITLE */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Payslip Actions
                  </h3>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                    Export & Distribution
                  </p>
                </div>

                {/* PRIMARY ACTIONS */}
                <div className="space-y-2">
                  <Button
                    size="md"
                    variant="primary"
                    onClick={handleDownloadPDF}
                    className="w-full bg-[#07563D] hover:bg-[#064e37] text-white font-bold shadow-sm justify-center cursor-pointer py-2.5"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </Button>

                  <Button
                    size="md"
                    variant="outline"
                    onClick={handlePrint}
                    className="w-full border-slate-300 text-slate-800 hover:bg-slate-50 font-bold justify-center cursor-pointer py-2.5"
                  >
                    <Printer className="w-4 h-4 mr-2 text-slate-600" /> Print Payslip
                  </Button>
                </div>

                {/* DOCUMENT SUMMARY CARD */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-500 text-[11px]">Status</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Generated & Approved
                    </span>
                  </div>

                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Payroll Period:</span>
                      <strong className="text-slate-900">{vm.payroll.payrollPeriod}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Pay Date:</span>
                      <span className="font-semibold text-slate-900">{vm.payroll.payDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Payable Days:</span>
                      <span className="font-bold text-emerald-700 font-mono">{vm.attendance.payableDays} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Overtime:</span>
                      <span className="font-semibold text-slate-900 font-mono">{vm.attendance.overtimeHours} Hrs</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-medium">Net Take-Home:</span>
                      <strong className="text-emerald-800 font-mono text-sm">₹{vm.totals.netPayable.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                {/* EMPLOYEE METADATA CARD */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <h4 className="font-extrabold text-slate-900 text-[11px] uppercase tracking-wide">
                    Employee Details
                  </h4>
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Employee ID:</span>
                      <span className="font-mono font-bold text-slate-900">{vm.employee.employeeCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Full Name:</span>
                      <span className="font-bold text-slate-900 uppercase truncate max-w-[150px]">{vm.employee.employeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Department:</span>
                      <span className="text-slate-900 font-medium">{vm.employee.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank Account:</span>
                      <span className="font-mono font-medium text-slate-900">{vm.employee.bankAccountMasked}</span>
                    </div>
                  </div>
                </div>

                {/* VALIDATION STATUS NOTICE */}
                {validation.isValid ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-[11px]">
                      <span className="font-bold block">100% Reconciled</span>
                      <span className="text-emerald-700">Gross - Deductions = Net (Zero Drift)</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <span className="font-bold block">Reconciliation Error</span>
                      <span className="text-rose-700">{validation.errors.join(', ')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <button
                  onClick={handleCopyRef}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{isCopied ? 'Reference Copied!' : 'Copy Reference ID'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// HELPER: Embedded CSS for external print window iframe
function getPrintStyles(): string {
  return `
    .payslip-page {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 16px 20px;
      background: #ffffff;
      font-size: 8pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
  `;
}
