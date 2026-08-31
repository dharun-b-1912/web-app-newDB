import React from 'react';
import { CalculationBreakdown } from '../../../types/payroll';
import {
  X,
  HelpCircle,
  TrendingUp,
  Minus,
  ShieldCheck,
  Calendar,
  Layers,
  FileCheck2,
  AlertCircle,
  Building2,
  DollarSign,
  Printer,
} from 'lucide-react';

interface ExplainCalculationModalProps {
  breakdown: CalculationBreakdown | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExplainCalculationModal: React.FC<ExplainCalculationModalProps> = ({
  breakdown,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !breakdown) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#07563D] to-[#0a7352] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
                <span>Calculation Traceability Engine</span>
                <span>•</span>
                <span>Audit Verified</span>
              </div>
              <h2 className="text-xl font-black tracking-tight">Explain Calculation — Source & Audit Trail</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Employee & Net Pay Banner */}
          <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                {breakdown.employee_code} • {breakdown.employee_name}
              </div>
              <div className="text-sm font-semibold text-gray-700 mt-0.5">
                Pay Period: <span className="font-bold text-gray-900">{breakdown.pay_period}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 italic">
                {breakdown.net_pay_in_words}
              </div>
            </div>
            <div className="text-right shrink-0 bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Computed Net Pay</div>
              <div className="text-2xl font-black text-[#07563D] font-mono">
                ₹{breakdown.net_pay.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Attendance & Proration Basis */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
              <Calendar className="w-3.5 h-3.5 text-[#07563D]" />
              <span>Attendance & Payable Days Foundation</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Month Calendar Days</span>
                <span className="text-sm font-black text-gray-900 font-mono">{breakdown.attendance_summary.total_days} Days</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Present / Paid Days</span>
                <span className="text-sm font-black text-emerald-700 font-mono">{breakdown.attendance_summary.present_days + breakdown.attendance_summary.paid_leave_days} Days</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Loss of Pay (LOP)</span>
                <span className="text-sm font-black text-rose-600 font-mono">{breakdown.attendance_summary.lop_days} Days</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Payable Days Computed</span>
                <span className="text-sm font-black text-[#07563D] font-mono">{breakdown.attendance_summary.payable_days} Days</span>
              </div>
            </div>
            <div className="text-[11px] text-gray-500 mt-2 flex items-center justify-between">
              <span>Source: <strong>{breakdown.attendance_summary.source}</strong></span>
              <span>Proration Method: <strong>{breakdown.attendance_summary.proration_method}</strong></span>
            </div>
          </div>

          {/* 1. Itemized Earnings Breakdown with Traceable Sources */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wide">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>1. Earnings Components & Traceable Sources</span>
              </div>
              <span className="text-xs font-black text-emerald-700 font-mono">
                Total: ₹{breakdown.gross_earnings.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
              {breakdown.earnings_breakdown.map((item: any, idx) => (
                <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50/80 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{item.component_name || item.name}</span>
                      {item.rule_version && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                          {item.rule_version}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Source: <span className="font-semibold text-gray-700">{item.source}</span>
                    </div>
                    {item.formula_applied && (
                      <div className="text-[10px] font-mono text-emerald-800/80">
                        Formula: {item.formula_applied}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-gray-900 font-mono">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Itemized Deductions Breakdown with Traceable Sources */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wide">
                <Minus className="w-4 h-4 text-rose-600" />
                <span>2. Deductions, Statutory & Traceable Sources</span>
              </div>
              <span className="text-xs font-black text-rose-600 font-mono">
                Total: -₹{breakdown.total_deductions.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
              {breakdown.deductions_breakdown.map((item: any, idx) => (
                <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50/80 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{item.component_name || item.name}</span>
                      {item.rule_version && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium border border-rose-100">
                          {item.rule_version}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Source: <span className="font-semibold text-gray-700">{item.source}</span>
                    </div>
                    {item.formula_applied && (
                      <div className="text-[10px] font-mono text-rose-800/80">
                        Formula: {item.formula_applied}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-rose-600 font-mono">
                      -₹{item.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Employer Statutory Liabilities & Retirals (Company Cost - Not Deducted) */}
          {breakdown.statutory_breakdown && breakdown.statutory_breakdown.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wide">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <span>3. Employer Statutory Liabilities & Retirals (Employer Cost)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                  Company Cost • Not Deducted from Take-Home
                </span>
              </div>

              <div className="divide-y divide-gray-100 border border-amber-200/60 rounded-2xl overflow-hidden bg-amber-50/20 shadow-2xs">
                {breakdown.statutory_breakdown.map((item: any, idx) => (
                  <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-amber-50/50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{item.component_name || item.name}</span>
                        {item.rule_version && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200">
                            {item.rule_version}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Source: <span className="font-semibold text-gray-700">{item.source}</span>
                      </div>
                      {item.formula_applied && (
                        <div className="text-[10px] font-mono text-amber-900/80">
                          Formula: {item.formula_applied}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-amber-900 font-mono">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Tax & TDS FY 2026-27 Projection Card */}
          <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/60 p-4 rounded-2xl border border-indigo-100/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-indigo-700" />
                <span>4. Income Tax FY 2026-27 Projection & TDS</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold">
                {breakdown.tax_projection.regime}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-50">
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Projected Gross</span>
                <span className="text-sm font-black text-gray-900 font-mono">₹{breakdown.tax_projection.projected_annual_gross.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-50">
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Standard Deduction</span>
                <span className="text-sm font-black text-indigo-700 font-mono">₹{breakdown.tax_projection.standard_deduction.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-50">
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Taxable Income</span>
                <span className="text-sm font-black text-gray-900 font-mono">₹{breakdown.tax_projection.projected_taxable_income.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-50">
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Monthly TDS Withheld</span>
                <span className="text-sm font-black text-purple-700 font-mono">₹{breakdown.tax_projection.monthly_tds.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="text-[10px] text-indigo-900/70 pt-1">
              Slab Rule: {breakdown.tax_projection.tax_source}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>All calculations conform to Tamil Nadu & Indian Statutory Compliance.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Breakdown</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#07563D] hover:bg-[#0a7352] transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
