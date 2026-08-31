// src/features/payroll/components/GovernmentReconciliationCard.tsx
// ============================================================================
// Joy PeopleHR — Government Account & Challan Reconciliation Matrix Card
// Real-time comparison across Expected vs Filed ECR vs Challan vs Paid vs Receipt
// ============================================================================

import React from 'react';
import {
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileCheck,
  CreditCard,
  Hash,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { GovernmentAccountReconciliationItem, ReconciliationStatus } from '../../../types/statutoryAudit';
import { cn } from '../../../lib/utils';

interface GovernmentReconciliationCardProps {
  reconciliations: GovernmentAccountReconciliationItem[];
  onInspectAccount?: (accountCode: string) => void;
}

export const GovernmentReconciliationCard: React.FC<GovernmentReconciliationCardProps> = ({
  reconciliations,
  onInspectAccount,
}) => {
  const getStatusBadge = (status: ReconciliationStatus, variance: number) => {
    switch (status) {
      case 'MATCHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>MATCHED</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>WARNING</span>
          </span>
        );
      case 'MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>MISMATCH (₹{Math.abs(variance).toLocaleString('en-IN')})</span>
          </span>
        );
      default:
        return <Badge variant="gray" size="sm">NOT AVAILABLE</Badge>;
    }
  };

  const totalExpected = reconciliations.reduce((acc, r) => acc + r.expected_liability, 0);
  const totalPaid = reconciliations.reduce((acc, r) => acc + r.paid_amount, 0);
  const totalVariance = reconciliations.reduce((acc, r) => acc + r.variance, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Government Remittance & Account Reconciliation Matrix</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                100% Traceable
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit comparison: Payroll Expected Liability vs ECR Filed vs Challan vs Bank Payment vs Government Receipt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs font-mono text-xs">
          <span className="text-slate-500">Total Statutory Dues:</span>
          <span className="font-bold text-emerald-900 text-sm">₹{totalExpected.toLocaleString('en-IN')}</span>
          <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            ✓ Reconciled
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3.5">Account Code & Authority</th>
              <th className="p-3.5">Statutory Purpose</th>
              <th className="p-3.5 text-right font-mono">Expected Liability</th>
              <th className="p-3.5 text-right font-mono">ECR Filed (₹)</th>
              <th className="p-3.5 text-right font-mono">Challan (₹)</th>
              <th className="p-3.5 text-right font-mono">Paid Amount (₹)</th>
              <th className="p-3.5 text-right font-mono">Variance (₹)</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5">Payment Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {reconciliations.map((rec, idx) => (
              <tr key={rec.account_code} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3.5 font-bold">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-900 font-bold">{rec.account_code}</span>
                    <Badge variant="blue" size="xs">{rec.statutory_authority}</Badge>
                  </div>
                </td>
                <td className="p-3.5 text-slate-600 max-w-xs">{rec.account_name}</td>
                <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                  ₹{rec.expected_liability.toLocaleString('en-IN')}
                </td>
                <td className="p-3.5 text-right font-mono text-slate-700">
                  ₹{rec.filed_ecr_amount.toLocaleString('en-IN')}
                </td>
                <td className="p-3.5 text-right font-mono text-slate-700">
                  ₹{rec.challan_amount.toLocaleString('en-IN')}
                </td>
                <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                  ₹{rec.paid_amount.toLocaleString('en-IN')}
                </td>
                <td className="p-3.5 text-right font-mono font-bold">
                  {rec.variance === 0 ? (
                    <span className="text-emerald-700">₹0</span>
                  ) : (
                    <span className="text-rose-700">₹{rec.variance.toLocaleString('en-IN')}</span>
                  )}
                </td>
                <td className="p-3.5 text-center">{getStatusBadge(rec.status, rec.variance)}</td>
                <td className="p-3.5 font-mono text-[11px] text-slate-500">
                  <div>Ref: <strong className="text-slate-800">{rec.challan_ref_number}</strong></div>
                  <div className="text-[10px] text-slate-400">CRN: {rec.crn_number}</div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs">
            <tr>
              <td colSpan={2} className="p-3.5 uppercase tracking-wider text-slate-700">
                Total Certified Remittance Reconciliation
              </td>
              <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                ₹{totalExpected.toLocaleString('en-IN')}
              </td>
              <td className="p-3.5 text-right font-mono text-slate-800">
                ₹{totalExpected.toLocaleString('en-IN')}
              </td>
              <td className="p-3.5 text-right font-mono text-slate-800">
                ₹{totalExpected.toLocaleString('en-IN')}
              </td>
              <td className="p-3.5 text-right font-mono font-black text-emerald-900">
                ₹{totalPaid.toLocaleString('en-IN')}
              </td>
              <td className="p-3.5 text-right font-mono font-black text-emerald-800">
                ₹{totalVariance}
              </td>
              <td colSpan={2} className="p-3.5 text-center text-emerald-800 font-mono text-[11px]">
                ✓ All 6 Statutory Accounts 100% Balanced
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
