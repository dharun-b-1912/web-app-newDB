// src/features/clientBilling/components/BillingAuditModal.tsx
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — Billing Audit & Pre-Invoice Validation
// ============================================================================

import React from 'react';
import { BillingRun } from '../../../types/clientBilling';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  FileCheck,
  Building2,
  Users,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface BillingAuditModalProps {
  run: BillingRun;
  isOpen: boolean;
  onClose: () => void;
  onProceedToInvoice: () => void;
}

export const BillingAuditModal: React.FC<BillingAuditModalProps> = ({
  run,
  isOpen,
  onClose,
  onProceedToInvoice,
}) => {
  if (!isOpen) return null;

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const recon = run.reconciliation;
  const validation = run.validation;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-900 via-emerald-800 to-[#07563D] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 block">
                Compliance &amp; Financial Control
              </span>
              <h3 className="text-xl font-black">Pre-Invoice Billing Audit &amp; Reconciliation</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Card */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Client Organization</span>
              <span className="font-bold text-gray-900 text-sm">{run.client_name}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Contract Name</span>
              <span className="font-bold text-gray-900">{run.contract_name}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Billing Cycle</span>
              <span className="font-bold text-gray-900">{run.period}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Audit Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {validation.is_valid ? 'Audit Passed' : 'Action Required'}
              </span>
            </div>
          </div>

          {/* Section 1: Head-to-Head Reconciliation Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span>1. Head-to-Head Statutory Reconciliation Matrix</span>
              </h4>
              <span className="text-[11px] text-gray-500 font-medium">Payroll Engine vs Client Invoice</span>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Compliance Dimension</th>
                    <th className="py-2.5 px-4 text-right">HR Payroll Master</th>
                    <th className="py-2.5 px-4 text-right">Client Billed Total</th>
                    <th className="py-2.5 px-4 text-center">Variance / Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-gray-800">Deployed Headcount</td>
                    <td className="py-2.5 px-4 text-right font-mono">{recon.payroll_employee_count} Associates</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">{recon.billed_employee_count} Associates</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                        recon.employee_count_status === 'MATCHED' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {recon.employee_count_status === 'MATCHED' ? '✓ MATCHED' : '⚠ VARIANCE'}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-gray-800">Total Payable Days</td>
                    <td className="py-2.5 px-4 text-right font-mono">{recon.payroll_total_pay_days} Days</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">{recon.billed_total_pay_days} Days</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                        recon.pay_days_status === 'MATCHED' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {recon.pay_days_status === 'MATCHED' ? '✓ MATCHED' : '⚠ VARIANCE'}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-gray-800">Overtime Hours</td>
                    <td className="py-2.5 px-4 text-right font-mono">{recon.payroll_total_ot_hours} Hrs</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">{recon.billed_total_ot_hours} Hrs</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                        recon.ot_hours_status === 'MATCHED' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {recon.ot_hours_status === 'MATCHED' ? '✓ MATCHED' : '⚠ VARIANCE'}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-gray-800">Employer Provident Fund (PF)</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatINR(recon.payroll_employer_pf)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-800">{formatINR(recon.billed_employer_pf)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                        recon.employer_pf_status === 'MATCHED' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {recon.employer_pf_status === 'MATCHED' ? '✓ MATCHED' : '⚠ VARIANCE'}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-gray-800">Employer State Insurance (ESIC)</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatINR(recon.payroll_employer_esi)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-800">{formatINR(recon.billed_employer_esi)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                        recon.employer_esi_status === 'MATCHED' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {recon.employer_esi_status === 'MATCHED' ? '✓ MATCHED' : '⚠ VARIANCE'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {recon.notes && recon.notes.length > 0 && (
              <div className="mt-2.5 space-y-1">
                {recon.notes.map((note, i) => (
                  <p key={i} className="text-xs text-emerald-800 font-medium">
                    {note}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: 10-Point Pre-Invoice Validation Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                <span>2. Mandatory Pre-Invoice Gatekeeper Checklist</span>
              </h4>
              <span className="text-[11px] text-gray-500 font-medium">Zero-Risk Invoicing Guard</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {validation.checks.map((chk) => (
                <div
                  key={chk.id}
                  className={cn(
                    "p-3 rounded-xl border text-xs flex items-start justify-between gap-3 transition-colors",
                    chk.passed
                      ? "bg-emerald-50/50 border-emerald-200"
                      : chk.severity === 'ERROR'
                      ? "bg-rose-50/70 border-rose-200"
                      : "bg-amber-50/70 border-amber-200"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : chk.severity === 'ERROR' ? (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-gray-900">{chk.label}</div>
                      <div className="text-[11px] text-gray-600 mt-0.5">{chk.message}</div>
                    </div>
                  </div>

                  <span className={cn(
                    "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shrink-0",
                    chk.passed
                      ? "bg-emerald-100 text-emerald-800"
                      : chk.severity === 'ERROR'
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  )}>
                    {chk.passed ? 'PASSED' : 'BLOCKING'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100"
          >
            Close Audit
          </button>

          <button
            onClick={() => {
              onClose();
              onProceedToInvoice();
            }}
            disabled={!validation.is_valid}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#07563D] hover:bg-[#064833] shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>Proceed to Invoice Approval</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
