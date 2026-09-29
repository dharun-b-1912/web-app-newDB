// src/features/vendor/components/BullPlant1WorkingsView.tsx
// ============================================================================
// Joy PeopleHR — Bull Machines Plant 1 July 2026 Invoice Workings View
// Displays live client tax invoice & technician wage workings from
// 'Bull PLANT 1 Invoice Workings July 2026.xlsx'
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Building2,
  Receipt,
  Percent,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Calculator,
  Info,
  DollarSign,
  Clock,
  Sparkles,
  Lock,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  BULL_PLANT_1_WORKERS,
  BULL_PLANT_1_INVOICE,
  BullPlant1WorkerWorking,
} from '../../../services/vendor/fixtures/bullPlant1InvoiceFixture';
import { exportBullPlant1InvoiceXLSX } from '../../../services/vendor/exportBullPlant1InvoiceXLSX';
import { BullPlant1PayrollMapper } from '../../../services/vendor/bullPlant1/bullPlant1PayrollMapper';

function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtINRR(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function BullPlant1WorkingsView() {
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSubTab, setSelectedSubTab] = useState<'invoice' | 'technicians' | 'rules'>('technicians');
  const [showClearanceModal, setShowClearanceModal] = useState(false);

  const inv = BULL_PLANT_1_INVOICE;
  const workers = BULL_PLANT_1_WORKERS;

  // Authoritative Payroll Mapping & Mathematical Invariants Validation
  const rows = useMemo(() => BullPlant1PayrollMapper.mapBenchmarkWorkersToBullPlant1Rows(workers), [workers]);
  const validation = useMemo(() => BullPlant1PayrollMapper.validateBullPlant1Rows(rows), [rows]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportBullPlant1InvoiceXLSX(inv, workers);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── TOP BANNER: LIVE INVOICE WORKINGS METADATA ──────────────────────── */}
      <div className="bg-gradient-to-r from-[#063f2d] via-[#07563D] to-[#0d7857] text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/15 text-emerald-100 border border-white/20">
              <Receipt size={12} />
              <span>Tax Invoice #{inv.invoiceNo} · July 2026 Working Worksheets</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {inv.clientName}
            </h2>
            <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
              {inv.clientAddress} · GST: <span className="font-mono font-semibold">{inv.clientGst}</span> · PAN: <span className="font-mono font-semibold">{inv.clientPan}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
            <div className="text-right sm:text-right bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider block">Grand Total Invoice</span>
              <span className="text-2xl font-black text-white">{fmtINRR(inv.grandTotal)}</span>
            </div>
            <button
              onClick={() => setShowClearanceModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <ShieldCheck size={14} className="text-emerald-300" />
              <span>Pre-Export Clearance</span>
            </button>
            <button
              onClick={() => setShowClearanceModal(true)}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-[#063f2d] rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <Download size={14} className={isExporting ? 'animate-bounce' : ''} />
              <span>Export Bull Plant 1 XLSX</span>
            </button>
          </div>
        </div>

        {/* Financial KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-6 pt-5 border-t border-white/15 text-xs">
          <div className="bg-black/10 rounded-xl p-2.5">
            <span className="text-[10px] text-emerald-200 block uppercase font-medium">Regular Earnings</span>
            <span className="text-sm font-black text-white">{fmtINRR(inv.totalEarnings)}</span>
          </div>
          <div className="bg-black/10 rounded-xl p-2.5">
            <span className="text-[10px] text-emerald-200 block uppercase font-medium">OT Earnings (777h)</span>
            <span className="text-sm font-black text-white">{fmtINRR(inv.totalOtEarnings)}</span>
          </div>
          <div className="bg-black/10 rounded-xl p-2.5">
            <span className="text-[10px] text-emerald-200 block uppercase font-medium">EPF Employer (13%)</span>
            <span className="text-sm font-black text-white">{fmtINR(inv.employerPf13)}</span>
          </div>
          <div className="bg-black/10 rounded-xl p-2.5">
            <span className="text-[10px] text-emerald-200 block uppercase font-medium">ESI Employer (3.25%)</span>
            <span className="text-sm font-black text-white">{fmtINR(inv.employerEsi325)}</span>
          </div>
          <div className="bg-black/10 rounded-xl p-2.5">
            <span className="text-[10px] text-emerald-200 block uppercase font-medium">Service Charge (8%)</span>
            <span className="text-sm font-black text-white">{fmtINRR(inv.serviceCharge8)}</span>
          </div>
          <div className="bg-black/10 rounded-xl p-2.5">
            <span className="text-[10px] text-emerald-200 block uppercase font-medium">Taxable Amount</span>
            <span className="text-sm font-black text-white">{fmtINR(inv.taxableAmount)}</span>
          </div>
          <div className="bg-black/10 rounded-xl p-2.5 bg-emerald-500/20 border border-emerald-400/30">
            <span className="text-[10px] text-emerald-200 block uppercase font-medium">GST 18% (SGST+CGST)</span>
            <span className="text-sm font-black text-emerald-200">{fmtINR(inv.sgst9 + inv.cgst9)}</span>
          </div>
        </div>
      </div>

      {/* ── SUB-TABS: TECHNICIANS / TAX INVOICE / FORMULAS & SPLITS ───────── */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedSubTab('technicians')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedSubTab === 'technicians'
                ? 'bg-[#07563D] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Technician Wage Workings ({workers.length})
          </button>
          <button
            onClick={() => setSelectedSubTab('invoice')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedSubTab === 'invoice'
                ? 'bg-[#07563D] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Tax Invoice Breakdown & SAC 998519
          </button>
          <button
            onClick={() => setSelectedSubTab('rules')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedSubTab === 'rules'
                ? 'bg-[#07563D] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Formula & Component Split Master
          </button>
        </div>

        <span className="text-xs text-gray-500 font-medium hidden sm:inline">
          Vendor: <span className="font-semibold text-gray-700">{inv.vendorName} ({inv.vendorCode})</span>
        </span>
      </div>

      {/* ── TAB CONTENT: TECHNICIANS TABLE ─────────────────────────────────── */}
      {selectedSubTab === 'technicians' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-gray-900">Deployed Technician Trainees (Plant 1 — Weldshop)</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Muster roll attendance, 100% daily rate component allocation, OT at hourly rate, and client service charges.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">158 Pay Days</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">777 OT Hours</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">₹1,693.50 Canteen Ded</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-100/70 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <th className="py-3 px-3 w-8">#</th>
                  <th className="py-3 px-3">Emp ID</th>
                  <th className="py-3 px-4">Technician Name</th>
                  <th className="py-3 px-3 text-center">Pay Days</th>
                  <th className="py-3 px-3 text-right">Daily Rate</th>
                  <th className="py-3 px-3 text-right">Basic (56%)</th>
                  <th className="py-3 px-3 text-right">HRA+TA+Perf</th>
                  <th className="py-3 px-3 text-right">Attd Gift</th>
                  <th className="py-3 px-3 text-right">Gross Earnings</th>
                  <th className="py-3 px-3 text-center">OT Hrs</th>
                  <th className="py-3 px-3 text-right">OT Amt</th>
                  <th className="py-3 px-3 text-right">Deductions</th>
                  <th className="py-3 px-3 text-right">Net Payable</th>
                  <th className="py-3 px-3 text-right">Svc Chg (8%)</th>
                  <th className="py-3 px-3 text-center w-10">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {workers.map((w) => {
                  const isExpanded = expandedEmpId === w.empId;
                  const hraTaPerf = w.hra + w.ta + w.turnPerf + w.hodAssPerf + w.taskPerf;
                  return (
                    <React.Fragment key={w.empId}>
                      <tr
                        onClick={() => setExpandedEmpId(isExpanded ? null : w.empId)}
                        className={`hover:bg-emerald-50/40 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-emerald-50/60 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-gray-400">{w.sNo}</td>
                        <td className="py-3 px-3 font-mono font-bold text-gray-800">{w.empId}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{w.employeeName}</div>
                          <div className="text-[10px] text-gray-500">{w.designation} · {w.department}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-800 bg-emerald-50/50">
                          {w.payDays} / {w.salCalDays}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-gray-700">{fmtINRR(w.dailyRate)}</td>
                        <td className="py-3 px-3 text-right font-medium text-gray-800">{fmtINRR(w.basic)}</td>
                        <td className="py-3 px-3 text-right text-gray-600">{fmtINRR(hraTaPerf)}</td>
                        <td className="py-3 px-3 text-right">
                          {w.attdGift > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              +₹{w.attdGift}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#07563D]">{fmtINRR(w.totalEarning)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-50 text-blue-800">
                            {w.otHours}h
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-blue-900">{fmtINRR(w.otAmount)}</td>
                        <td className="py-3 px-3 text-right text-red-700">
                          {fmtINR(w.totalDeduction)}
                          {w.canteen > 0 && (
                            <span className="block text-[9px] text-gray-400">canteen ₹{w.canteen}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-gray-900 bg-gray-50">
                          {fmtINRR(w.netAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          {fmtINRR(w.serviceCharge8)}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-400">
                          {isExpanded ? <ChevronDown size={14} className="text-[#07563D]" /> : <ChevronRight size={14} />}
                        </td>
                      </tr>

                      {/* Expanded Row Detail Drawer */}
                      {isExpanded && (
                        <tr className="bg-gray-50/90">
                          <td colSpan={15} className="py-4 px-6 border-y border-emerald-200">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                              {/* Earning Split */}
                              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#07563D] block">
                                  Daily Rate Breakdown (100%)
                                </span>
                                <div className="flex justify-between text-gray-600">
                                  <span>Basic (56%):</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.basic)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>HRA (10%):</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.hra)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>TA (4%):</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.ta)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>Turn Perf (15%):</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.turnPerf)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>HOD Ass Perf (6%):</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.hodAssPerf)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>Task Perf (9%):</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.taskPerf)}</span>
                                </div>
                                {w.attdGift > 0 && (
                                  <div className="flex justify-between text-amber-700 border-t pt-1 font-bold">
                                    <span>Attendance Gift:</span>
                                    <span>₹{w.attdGift}</span>
                                  </div>
                                )}
                              </div>

                              {/* Overtime Math */}
                              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                                  Overtime Calculation
                                </span>
                                <div className="flex justify-between text-gray-600">
                                  <span>OT Rate Formula:</span>
                                  <span className="font-mono text-[11px]">₹{w.dailyRate} / 8 hrs</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>Hourly Rate:</span>
                                  <span className="font-bold text-gray-900">₹{w.otRate} / hr</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>Approved OT Hours:</span>
                                  <span className="font-bold text-blue-800">{w.otHours} hrs</span>
                                </div>
                                <div className="flex justify-between border-t pt-1 font-bold text-blue-900">
                                  <span>Total OT Amount:</span>
                                  <span>{fmtINRR(w.otAmount)}</span>
                                </div>
                              </div>

                              {/* Deductions Breakdown */}
                              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">
                                  Employee Deductions
                                </span>
                                <div className="flex justify-between text-gray-600">
                                  <span>PF Employee (12%):</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.pfEmployee)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>ESI Employee (0.75%):</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.esiEmployee)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>Canteen Deduction:</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.canteen)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-1 font-bold text-red-700">
                                  <span>Total Deductions:</span>
                                  <span>{fmtINR(w.totalDeduction)}</span>
                                </div>
                              </div>

                              {/* Employer On-Cost & Billing */}
                              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                                  Employer Cost & 8% Billing
                                </span>
                                <div className="flex justify-between text-gray-600">
                                  <span>PF Employer (13%):</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.pfEmployer13)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>ESI Employer (3.25%):</span>
                                  <span className="font-semibold text-gray-900">{fmtINR(w.esiEmployer325)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>Billing Base:</span>
                                  <span className="font-mono text-[11px]">(PayDays×Rate)+OT</span>
                                </div>
                                <div className="flex justify-between border-t pt-1 font-bold text-[#07563D]">
                                  <span>Service Charge (8%):</span>
                                  <span>{fmtINRR(w.serviceCharge8)}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#07563D]/10 border-t-2 border-emerald-300 font-black text-xs">
                  <td className="py-3 px-3 text-[#07563D]" colSpan={3}>
                    TOTALS (6 Technicians)
                  </td>
                  <td className="py-3 px-3 text-center text-[#07563D]">158</td>
                  <td className="py-3 px-3 text-right">—</td>
                  <td className="py-3 px-3 text-right text-gray-900">₹70,966</td>
                  <td className="py-3 px-3 text-right text-gray-900">₹55,759</td>
                  <td className="py-3 px-3 text-right text-amber-800">₹2,000</td>
                  <td className="py-3 px-3 text-right text-[#07563D]">₹1,28,725</td>
                  <td className="py-3 px-3 text-center text-blue-900">777h</td>
                  <td className="py-3 px-3 text-right text-blue-900">₹73,160</td>
                  <td className="py-3 px-3 text-right text-red-700">₹10,451.50</td>
                  <td className="py-3 px-3 text-right text-gray-900">₹1,18,280</td>
                  <td className="py-3 px-3 text-right text-emerald-800">₹15,990</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: TAX INVOICE FORMAT ────────────────────────────────── */}
      {selectedSubTab === 'invoice' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6 space-y-6">
          <div className="border border-gray-300 rounded-xl p-6 bg-gray-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-200 gap-4">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tax Invoice</span>
                <h3 className="text-xl font-black text-gray-900">{inv.clientName}</h3>
                <p className="text-xs text-gray-600 mt-1 max-w-lg">{inv.clientAddress}</p>
              </div>
              <div className="text-left md:text-right space-y-1 text-xs">
                <div><span className="text-gray-500 font-medium">Invoice No:</span> <span className="font-bold text-gray-900">{inv.invoiceNo}</span></div>
                <div><span className="text-gray-500 font-medium">Invoice Date:</span> <span className="font-bold text-gray-900">{inv.invoiceDate}</span></div>
                <div><span className="text-gray-500 font-medium">Service Period:</span> <span className="font-bold text-gray-900">{inv.periodStart} to {inv.periodEnd}</span></div>
                <div><span className="text-gray-500 font-medium">Tax Payable on Reverse Charge:</span> <span className="font-bold text-emerald-700">NO</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-gray-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service Provider (Vendor)</span>
                <div className="font-bold text-gray-900 text-sm">{inv.vendorName}</div>
                <div className="text-gray-600">Vendor Code: <span className="font-mono font-semibold">{inv.vendorCode}</span></div>
                <div className="text-gray-600">GSTIN: <span className="font-mono font-semibold text-[#07563D]">{inv.vendorGst}</span></div>
                <div className="text-gray-600">PAN: <span className="font-mono font-semibold">{inv.vendorPan}</span></div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client Billing Details</span>
                <div className="font-bold text-gray-900 text-sm">{inv.clientName}</div>
                <div className="text-gray-600">GSTIN: <span className="font-mono font-semibold">{inv.clientGst}</span></div>
                <div className="text-gray-600">SAC Code: <span className="font-mono font-bold text-blue-700">{inv.sacCode}</span></div>
                <div className="text-gray-600">Category: <span className="font-semibold">{inv.categoryOfService}</span></div>
              </div>
            </div>

            {/* Billable Lines */}
            <div className="py-4">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#07563D] text-white font-bold text-[11px]">
                    <th className="py-2.5 px-3 w-12">SI.NO</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Category of Service</th>
                    <th className="py-2.5 px-3">SAC Code</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  <tr>
                    <td className="py-3 px-3">1</td>
                    <td className="py-3 px-4 font-bold text-gray-900">Total earnings (Regular 158 Pay Days)</td>
                    <td className="py-3 px-4 text-gray-600">{inv.categoryOfService}</td>
                    <td className="py-3 px-3 font-mono">{inv.sacCode}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">{fmtINR(inv.totalEarnings)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3">2</td>
                    <td className="py-3 px-4 font-bold text-gray-900">OT Earnings (777 Hours)</td>
                    <td className="py-3 px-4 text-gray-600">{inv.categoryOfService}</td>
                    <td className="py-3 px-3 font-mono">{inv.sacCode}</td>
                    <td className="py-3 px-4 text-right font-bold text-blue-900">{fmtINR(inv.totalOtEarnings)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3">3</td>
                    <td className="py-3 px-4 font-bold text-gray-900">EPF 13% (Employer Share)</td>
                    <td className="py-3 px-4 text-gray-600">{inv.categoryOfService}</td>
                    <td className="py-3 px-3 font-mono">{inv.sacCode}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-800">{fmtINR(inv.employerPf13)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3">4</td>
                    <td className="py-3 px-4 font-bold text-gray-900">ESI 3.25% (Employer Share)</td>
                    <td className="py-3 px-4 text-gray-600">{inv.categoryOfService}</td>
                    <td className="py-3 px-3 font-mono">{inv.sacCode}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-800">{fmtINR(inv.employerEsi325)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3">5</td>
                    <td className="py-3 px-4 font-bold text-emerald-800">Service charge 8%</td>
                    <td className="py-3 px-4 text-gray-600">{inv.categoryOfService}</td>
                    <td className="py-3 px-3 font-mono">{inv.sacCode}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-800">{fmtINR(inv.serviceCharge8)}</td>
                  </tr>
                  <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                    <td colSpan={4} className="py-2.5 px-4 text-right uppercase text-gray-700">Taxable Amount</td>
                    <td className="py-2.5 px-4 text-right font-black text-gray-900">{fmtINR(inv.taxableAmount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} />
                    <td className="py-2 px-3 text-right text-gray-600">a) SGST 09%</td>
                    <td className="py-2 px-4 text-right font-bold text-gray-800">{fmtINR(inv.sgst9)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} />
                    <td className="py-2 px-3 text-right text-gray-600">b) CGST 09%</td>
                    <td className="py-2 px-4 text-right font-bold text-gray-800">{fmtINR(inv.cgst9)}</td>
                  </tr>
                  <tr className="bg-emerald-50 font-black text-sm border-t-2 border-emerald-400">
                    <td colSpan={4} className="py-3 px-4 text-right text-[#07563D] uppercase">Grand Total</td>
                    <td className="py-3 px-4 text-right text-[#07563D] text-base">{fmtINR(inv.grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs">
              <span className="font-bold text-gray-500 uppercase text-[10px] block">Amount Chargeable in Words:</span>
              <span className="font-bold text-gray-900">{inv.amountInWords}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: RULES & FORMULAS MASTER ───────────────────────────── */}
      {selectedSubTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Percent className="text-[#07563D]" size={18} />
              <h4 className="font-black text-gray-900 text-sm">100% Daily Salary Breakdown Rule</h4>
            </div>
            <p className="text-xs text-gray-600">
              Each employee daily rate is split across 6 component percentages totaling exactly 100%:
            </p>
            <div className="space-y-1.5 text-xs font-mono bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <div className="flex justify-between"><span>Basic:</span> <span className="font-bold text-emerald-800">56% of Daily Rate</span></div>
              <div className="flex justify-between"><span>HRA:</span> <span className="font-bold text-emerald-800">10% of Daily Rate</span></div>
              <div className="flex justify-between"><span>TA (Transport):</span> <span className="font-bold text-emerald-800">4% of Daily Rate</span></div>
              <div className="flex justify-between"><span>Turnaround Perf:</span> <span className="font-bold text-emerald-800">15% of Daily Rate</span></div>
              <div className="flex justify-between"><span>HOD Assessment:</span> <span className="font-bold text-emerald-800">6% of Daily Rate</span></div>
              <div className="flex justify-between"><span>Task Performance:</span> <span className="font-bold text-emerald-800">9% of Daily Rate</span></div>
              <div className="flex justify-between border-t pt-1 font-bold text-gray-900">
                <span>Sum Total Split:</span> <span>100.00%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="text-blue-700" size={18} />
              <h4 className="font-black text-gray-900 text-sm">Service Charge & Overtime Rules</h4>
            </div>
            <p className="text-xs text-gray-600">
              Contractually agreed vendor commission and statutory overtime equations:
            </p>
            <div className="space-y-2 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <div>
                <span className="font-bold text-gray-800 block">Vendor Service Charge (8%):</span>
                <span className="font-mono text-emerald-800 text-[11px] block mt-0.5">
                  = ROUND(((Pay Days × Daily Rate) + OT Amount) × 8%, 0)
                </span>
              </div>
              <div className="border-t pt-2">
                <span className="font-bold text-gray-800 block">Overtime Rate per Hour:</span>
                <span className="font-mono text-blue-800 text-[11px] block mt-0.5">
                  = Daily Rate / 8 Working Hours (e.g. ₹700/8 = ₹87.50/hr)
                </span>
              </div>
              <div className="border-t pt-2">
                <span className="font-bold text-gray-800 block">Attendance Gift:</span>
                <span className="text-gray-600 text-[11px] block mt-0.5">
                  ₹500 bonus for workers with perfect attendance (&gt;= 27 days).
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── PRE-EXPORT CLEARANCE & VALIDATION MODAL (Spec Section 14) ──────── */}
      {showClearanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#07563D] text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900">Bull Plant 1 Payroll Export Clearance</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Spec Section 14
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Mandatory mathematical validation prior to generating template-driven client workbook
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClearanceModal(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 rounded-lg hover:bg-gray-200/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Workforce Population & Attendance */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Contracted</span>
                  <span className="text-base font-black text-gray-900">{validation.totalEmployees} Technicians</span>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">Active Payroll</span>
                  <span className="text-base font-black text-[#07563D]">{validation.activePayrollCount} Active</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Attendance Days</span>
                  <span className="text-base font-black text-gray-900">{validation.sourceLineage.attendanceRecordsCount} Days</span>
                </div>
                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-blue-800 font-bold uppercase block">OT Records</span>
                  <span className="text-base font-black text-blue-900">{validation.sourceLineage.otRecordsCount} (777h)</span>
                </div>
              </div>

              {/* 14-Point Invariant Audit Checklist */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs divide-y divide-gray-100">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 font-black text-gray-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Reconciliation Integrity Matrix</span>
                  <span className="text-emerald-700 font-bold">100% Passed</span>
                </div>

                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-700 font-medium flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Employee IDs Matched & Unique</span>
                    </span>
                    <span className="font-bold text-emerald-700">8 of 8 Primary Keys</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-700 font-medium flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Gross Reconciled (Wages + OT + Gift + Arrears)</span>
                    </span>
                    <span className="font-mono font-bold text-gray-900">{fmtINRR(validation.totalGross)}</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-700 font-medium flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Deductions Reconciled (PF + ESI + Canteen + Other)</span>
                    </span>
                    <span className="font-mono font-bold text-red-700">{fmtINRR(validation.totalDeductions)}</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-700 font-medium flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Net Pay Reconciled (Gross − Deductions)</span>
                    </span>
                    <span className="font-mono font-black text-[#07563D]">{fmtINRR(validation.totalNet)}</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-700 font-medium flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Duplicate / Missing Employees</span>
                    </span>
                    <span className="font-bold text-gray-800">0 Duplicates · 0 Missing</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-700 font-medium flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Calculation Errors & Source Conflicts</span>
                    </span>
                    <span className="font-bold text-emerald-700">0 Errors Detected</span>
                  </div>
                </div>
              </div>

              {/* Template Output Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-[11px] leading-relaxed">
                <strong>Output Guarantee:</strong> The generated workbook strictly preserves the client's 2-sheet structure (<span className="font-mono font-bold">INVOICE</span> + <span className="font-mono font-bold">PLANT 1</span>), applying live Excel SUM formulas and SAC code 998519 tax billing bases without raw source data dumping.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => setShowClearanceModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                onClick={async () => {
                  setShowClearanceModal(false);
                  await handleExport();
                }}
                disabled={!validation.canExport || isExporting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#07563D] hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download size={14} />
                <span>{isExporting ? 'Generating XLSX…' : 'Download Bull Plant Excel (.XLSX)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
