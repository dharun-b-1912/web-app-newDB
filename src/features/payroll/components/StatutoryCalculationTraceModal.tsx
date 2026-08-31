// src/features/payroll/components/StatutoryCalculationTraceModal.tsx
// ============================================================================
// Joy PeopleHR — Interactive "How Was This Calculated?" Statutory Trace Modal
// Full mathematical audit trail from Employee → Wage → Rule → Account → Ledger
// ============================================================================

import React from 'react';
import {
  X,
  Calculator,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmployeeStatutoryCalculationTrace } from '../../../types/statutoryAudit';

interface StatutoryCalculationTraceModalProps {
  trace: EmployeeStatutoryCalculationTrace | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StatutoryCalculationTraceModal: React.FC<StatutoryCalculationTraceModalProps> = ({
  trace,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !trace) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Statutory Calculation Trace Engine</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                  {trace.pf_rule_version}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic mathematical audit trail for <strong>{trace.employee_name}</strong> ({trace.employee_code})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
          {/* Employee & Registration Metadata Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Employee Name</span>
              <span className="font-bold text-slate-900">{trace.employee_name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Universal Account No (UAN)</span>
              <span className="font-mono font-bold text-emerald-850">{trace.uan}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">ESIC IP Number</span>
              <span className="font-mono font-bold text-blue-800">{trace.esi_ip_number}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Payable / LOP Days</span>
              <span className="font-bold text-slate-900">{trace.payable_days} Days / {trace.lop_days} LOP</span>
            </div>
          </div>

          {/* Government Account Allocations Breakdown Card */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Government Account Allocation Matrix</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* EPFO Account 1 */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-emerald-950">EPFO Account 1 (EPF Fund)</span>
                  </div>
                  <span className="font-mono font-black text-sm text-emerald-800">
                    ₹{trace.account_1_allocation.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Comprises <strong>Employee EPF (12%)</strong>: ₹{trace.employee_epf.toLocaleString('en-IN')} + <strong>Employer EPF (3.67%)</strong>: ₹{trace.employer_epf.toLocaleString('en-IN')}.
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-800 pt-1 border-t border-emerald-200/60">
                  <span>Wage Basis: ₹{trace.pf_wage.toLocaleString('en-IN')}</span>
                  <span>Formula: ₹{trace.employee_epf} + ₹{trace.employer_epf}</span>
                </div>
              </div>

              {/* EPFO Account 10 */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-700" />
                    <span className="font-bold text-blue-950">EPFO Account 10 (EPS Pension)</span>
                  </div>
                  <span className="font-mono font-black text-sm text-blue-800">
                    ₹{trace.account_10_allocation.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Comprises <strong>Employer EPS (8.33%)</strong> allocated directly to the government pension fund.
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-blue-800 pt-1 border-t border-blue-200/60">
                  <span>Wage Ceiling: ₹{trace.eps_wage.toLocaleString('en-IN')}</span>
                  <span>Formula: min(Basic, ₹15,000) × 8.33%</span>
                </div>
              </div>

              {/* ESIC Medical Fund */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-indigo-700" />
                    <span className="font-bold text-indigo-950">ESIC Main Fund</span>
                  </div>
                  <span className="font-mono font-black text-sm text-indigo-800">
                    ₹{trace.total_esi_liability.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Employee (0.75%): ₹{trace.employee_esi} + Employer (3.25%): ₹{trace.employer_esi}.
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-indigo-800 pt-1 border-t border-indigo-200/60">
                  <span>Coverage: {trace.esi_coverage_status}</span>
                  <span>Contribution Wage: ₹{trace.esi_contribution_wage.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Professional Tax (State) */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-amber-950">State Professional Tax</span>
                  </div>
                  <span className="font-mono font-black text-sm text-amber-800">
                    ₹{trace.professional_tax.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  State commercial tax half-yearly deduction allocation (Tamil Nadu Schedule).
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-amber-800 pt-1 border-t border-amber-200/60">
                  <span>Rule: {trace.pt_rule_version}</span>
                  <span>Slab: Gross &gt; ₹15,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step-by-Step Calculation Trace */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <Calculator className="w-4 h-4 text-emerald-700" />
              <span>Step-by-Step Mathematical Calculation Trail</span>
            </h4>

            <div className="space-y-2">
              {trace.steps.map(step => (
                <div
                  key={step.step_number}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-emerald-300 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] flex items-center justify-center font-bold">
                        {step.step_number}
                      </span>
                      {step.label}
                    </span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                      ₹{step.final_value.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-lg font-mono">
                    <div>
                      <span className="text-slate-400">Formula: </span>
                      <strong className="text-slate-800">{step.formula}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Inputs: </span>
                      <span className="text-slate-700">{step.source_value}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic pl-7">{step.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Verification & Integrity Footer */}
          <div className="bg-slate-900 text-slate-300 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2 font-mono">
              <Hash className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Audit Hash: <strong className="text-emerald-400">{trace.calculation_hash}</strong></span>
            </div>
            <div className="flex items-center gap-2 font-mono text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Calculated: {trace.calculation_timestamp.replace('T', ' ').substring(0, 19)}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">
            Pure Deterministic Output • Reconciled against Government Portals
          </span>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close Trace
          </Button>
        </div>
      </div>
    </div>
  );
};
