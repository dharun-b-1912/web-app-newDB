// src/features/vendor/components/PayrollValidationPanel.tsx
// ============================================================================
// Joy PeopleHR — Payroll Reconciliation & Mathematical Invariant Validation UI
// Visual verification that Basic+HRA=Wages, Earnings=Gross, Net=Gross-Deductions,
// and 44 roster vs 43 payable vs 1 on-leave are 100% reconciled.
// ============================================================================

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Calculator,
  Lock,
  Download,
  Info,
} from 'lucide-react';
import { PayrollRunValidationSummary } from '../../../types/payrollValidation';
import { WageRunRecord } from '../../../types/wageEngine';

interface PayrollValidationPanelProps {
  validation: PayrollRunValidationSummary;
  wageRun: WageRunRecord;
  onExportCompanyFormat: () => void;
  onExportMasterPack?: () => void;
}

export function PayrollValidationPanel({
  validation,
  wageRun,
  onExportCompanyFormat,
  onExportMasterPack,
}: PayrollValidationPanelProps) {
  const { allInvariantsSatisfied, canExport, blockingErrors, warnings, passedChecks } = validation;

  return (
    <div className="space-y-4">
      {/* ── STATUS CARD ──────────────────────────────────────────────────────── */}
      <div className={`p-5 rounded-2xl border ${
        allInvariantsSatisfied
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
          : blockingErrors.length > 0
          ? 'bg-red-50/80 border-red-300 text-red-950'
          : 'bg-amber-50/80 border-amber-300 text-amber-950'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              allInvariantsSatisfied ? 'bg-emerald-500 text-white' : blockingErrors.length > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
            }`}>
              {allInvariantsSatisfied ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">
                  {allInvariantsSatisfied
                    ? 'All Mathematical Invariants & Reconciliations Satisfied'
                    : blockingErrors.length > 0
                    ? 'Blocking Validation Errors — Export Locked'
                    : 'Payroll Reconciled with Non-Blocking Warnings'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  allInvariantsSatisfied ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                }`}>
                  {wageRun.status}
                </span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                Evaluation timestamp: {new Date(validation.evaluatedAt).toLocaleString('en-IN')} · Evaluated across {validation.totalPassedEmployees + validation.totalFailedEmployees} employees
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onExportMasterPack && (
              <button
                onClick={onExportMasterPack}
                disabled={!canExport}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  canExport
                    ? 'bg-blue-700 hover:bg-blue-800 text-white active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Download size={14} />
                <span>Export Master 10-Sheet Pack (.XLSX)</span>
              </button>
            )}

            <button
              onClick={onExportCompanyFormat}
              disabled={!canExport}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                canExport
                  ? 'bg-[#07563D] hover:bg-emerald-800 text-white active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Download size={14} />
              <span>Export Company Statement (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* Blocking Errors Banner */}
        {blockingErrors.length > 0 && (
          <div className="mt-4 pt-3 border-t border-red-200 space-y-1.5 text-xs text-red-900">
            <span className="font-bold flex items-center gap-1.5 text-red-700">
              <XCircle size={14} /> {blockingErrors.length} Blocking Issue(s) Require Resolution:
            </span>
            <ul className="list-disc pl-5 space-y-0.5">
              {blockingErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── 2-COLUMN GRID: PASSED CHECKS VS WARNINGS ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Passed Checks */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Verified Invariants ({passedChecks.length})</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              100% Balanced
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-gray-700">
            {passedChecks.map((chk, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50/70 border border-gray-100">
                <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                <span className="leading-snug">{chk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Non-Blocking Warnings & Audit Notes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              <span>Audit Observations & Warnings ({warnings.length})</span>
            </span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              Non-Blocking
            </span>
          </div>

          {warnings.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">
              No warnings or configuration conflicts detected.
            </div>
          ) : (
            <div className="space-y-1.5 text-xs text-gray-700">
              {warnings.map((warn, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100 text-amber-950">
                  <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                  <span className="leading-snug">{warn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
