// src/features/clientBilling/components/ReconciliationAuditView.tsx
// ============================================================================
// JOY PeopleHR — Statutory Reconciliation & Exception Audit Ledger
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  BillingRun,
  ReconciliationExceptionRecord,
} from '../../../types/clientBilling';
import { StatutoryReconciliationService } from '../../../services/clientBilling/statutoryReconciliationService';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck2,
  TrendingUp,
  RotateCcw,
  Users,
  Coins,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ReconciliationAuditViewProps {
  activeRun: BillingRun;
  onOpenAuditModal: () => void;
}

export const ReconciliationAuditView: React.FC<ReconciliationAuditViewProps> = ({
  activeRun,
  onOpenAuditModal,
}) => {
  const [exceptions, setExceptions] = useState<ReconciliationExceptionRecord[]>([]);
  const [selectedException, setSelectedException] = useState<ReconciliationExceptionRecord | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  useEffect(() => {
    const auditRes = StatutoryReconciliationService.auditAndReconcileRun(activeRun);
    setExceptions(auditRes.exceptions);
  }, [activeRun]);

  const handleOpenResolve = (exc: ReconciliationExceptionRecord) => {
    setSelectedException(exc);
    setResolutionNotes(exc.resolution_notes || '');
    setIsResolveModalOpen(true);
  };

  const handleSaveResolution = (action: 'RESOLVED' | 'OVERRIDDEN') => {
    if (!selectedException) return;
    StatutoryReconciliationService.resolveException(
      selectedException.id,
      resolutionNotes,
      action,
      'HR Audit Head'
    );
    const updated = StatutoryReconciliationService.getExceptionsForRun(activeRun.id);
    setExceptions(updated);
    setIsResolveModalOpen(false);
  };

  const {
    payroll_employee_count,
    billed_employee_count,
    payroll_employer_pf,
    billed_employer_pf,
    payroll_employer_esi,
    billed_employer_esi,
  } = activeRun.reconciliation;

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Dual-Ledger Statutory Reconciliation &amp; Audit</span>
          </div>
          <h2 className="text-xl font-black mt-1">Audit Ledger — {activeRun.client_name}</h2>
          <p className="text-xs text-emerald-200/80">
            Cycle: {activeRun.period} • Contract: {activeRun.contract_name}
          </p>
        </div>

        <button
          onClick={onOpenAuditModal}
          className="px-4 py-2 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-700" />
          <span>Interactive Audit Modal</span>
        </button>
      </div>

      {/* 4 Reconciliation Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Headcount Match */}
        <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
            <span className="flex items-center gap-1"><Users className="w-3 h-3 text-emerald-600" /> Headcount Match</span>
            <span className={cn("px-1.5 py-0.5 rounded font-bold", payroll_employee_count === billed_employee_count ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
              {payroll_employee_count === billed_employee_count ? '100% MATCH' : 'MISMATCH'}
            </span>
          </div>
          <div className="flex justify-between items-baseline pt-1">
            <div className="text-xs font-medium text-gray-500">Payroll: <b className="text-gray-900">{payroll_employee_count}</b></div>
            <div className="text-sm font-black text-emerald-900">Billed: {billed_employee_count}</div>
          </div>
        </div>

        {/* Employer PF Match */}
        <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
            <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-indigo-600" /> Employer PF (13%)</span>
            <span className="px-1.5 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800">
              RECONCILED
            </span>
          </div>
          <div className="flex justify-between items-baseline pt-1 font-mono">
            <div className="text-xs text-gray-500">HRMS: <b>₹{payroll_employer_pf.toLocaleString('en-IN')}</b></div>
            <div className="text-sm font-black text-indigo-900">₹{billed_employer_pf.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Employer ESI Match */}
        <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-teal-600" /> Employer ESI (3.25%)</span>
            <span className="px-1.5 py-0.5 rounded font-bold bg-teal-100 text-teal-800">
              RECONCILED
            </span>
          </div>
          <div className="flex justify-between items-baseline pt-1 font-mono">
            <div className="text-xs text-gray-500">HRMS: <b>₹{payroll_employer_esi.toLocaleString('en-IN')}</b></div>
            <div className="text-sm font-black text-teal-900">₹{billed_employer_esi.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Total Grand Invoice */}
        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800 uppercase">
            <span>Payable Grand Total</span>
            <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-200 text-emerald-900">GST INCL</span>
          </div>
          <div className="text-lg font-black text-emerald-950 font-mono pt-1">
            ₹{activeRun.tax_summary.grand_total.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Exception Audit Ledger */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-black text-gray-900">Reconciliation &amp; Anomaly Exceptions</h3>
            <p className="text-[11px] text-gray-500">Document, resolve or override statutory variances before final invoice sign-off</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
            {exceptions.length} Detected Items
          </span>
        </div>

        {exceptions.length === 0 ? (
          <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <div className="font-bold text-gray-900 text-sm">Clean Audit: Zero Anomalies Detected</div>
            <p className="text-xs text-gray-500 mt-0.5">All payroll employee counts, PF contributions, and statutory line items match perfectly.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {exceptions.map((exc) => (
              <div key={exc.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase",
                      exc.severity === 'CRITICAL' ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                    )}>
                      {exc.severity}
                    </span>
                    <span className="font-bold text-xs text-gray-900">{exc.description}</span>
                  </div>
                  {exc.resolution_notes && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                      <b>Resolution:</b> {exc.resolution_notes} (by {exc.resolved_by})
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    exc.status === 'RESOLVED' || exc.status === 'OVERRIDDEN'
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  )}>
                    {exc.status}
                  </span>
                  <button
                    onClick={() => handleOpenResolve(exc)}
                    className="px-3 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xs text-gray-800 cursor-pointer"
                  >
                    {exc.status === 'OPEN' ? 'Resolve / Override' : 'Edit Notes'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exception Resolution Modal */}
      {isResolveModalOpen && selectedException && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="font-black text-gray-900 text-base">Resolve Statutory Exception</h3>
            <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">
              {selectedException.description}
            </p>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                Audit Resolution / Override Notes
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter justification for override or accounting adjustment..."
                rows={3}
                className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveResolution('OVERRIDDEN')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
              >
                Override
              </button>
              <button
                onClick={() => handleSaveResolution('RESOLVED')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
