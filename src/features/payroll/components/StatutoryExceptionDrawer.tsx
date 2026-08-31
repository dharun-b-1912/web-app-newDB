// src/features/payroll/components/StatutoryExceptionDrawer.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Statutory Exception & Discrepancy Drawer
// Automated anomaly scanner across UAN, ESIC, wage ceilings, variances & counts
// ============================================================================

import React from 'react';
import {
  X,
  AlertTriangle,
  AlertOctagon,
  Info,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { StatutoryExceptionItem, StatutorySeverity } from '../../../types/statutoryAudit';
import { cn } from '../../../lib/utils';

interface StatutoryExceptionDrawerProps {
  exceptions: StatutoryExceptionItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const StatutoryExceptionDrawer: React.FC<StatutoryExceptionDrawerProps> = ({
  exceptions,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const criticalCount = exceptions.filter(e => e.severity === 'CRITICAL').length;
  const highCount = exceptions.filter(e => e.severity === 'HIGH').length;

  const getSeverityBadge = (severity: StatutorySeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge variant="rose" size="sm">CRITICAL</Badge>;
      case 'HIGH':
        return <Badge variant="amber" size="sm">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge variant="blue" size="sm">MEDIUM</Badge>;
      default:
        return <Badge variant="gray" size="sm">{severity}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Statutory Exception Center</h3>
                <span className="bg-rose-500/20 text-rose-300 text-[10px] font-mono px-2 py-0.5 rounded border border-rose-500/30 font-bold">
                  {exceptions.length} Detected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated pre-filing compliance & reconciliation audit findings
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

        {/* Status Bar */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-rose-700">
              <AlertOctagon className="w-4 h-4" />
              <span>{criticalCount} Critical</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <span>{highCount} High Priority</span>
            </span>
          </div>
          <span className="text-slate-500 text-[11px]">Auto-scanned against active payroll run</span>
        </div>

        {/* Content List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {exceptions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Zero Statutory Exceptions</h4>
              <p className="text-slate-500 max-w-sm mx-auto text-xs">
                All employee UANs, ESIC IP numbers, wage caps, and government account balances are 100% compliant.
              </p>
            </div>
          ) : (
            exceptions.map(exc => (
              <div
                key={exc.id}
                className={cn(
                  "p-4 rounded-xl border transition-all space-y-2.5 bg-white",
                  exc.severity === 'CRITICAL'
                    ? "border-rose-300 bg-rose-50/30"
                    : exc.severity === 'HIGH'
                    ? "border-amber-300 bg-amber-50/30"
                    : "border-slate-200"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(exc.severity)}
                      <span className="font-bold text-slate-900">{exc.title}</span>
                    </div>
                    {exc.employee_name && (
                      <span className="text-[11px] text-slate-500 font-mono block">
                        Employee: {exc.employee_name} ({exc.employee_code})
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {exc.issue_category}
                  </span>
                </div>

                <p className="text-slate-600 leading-relaxed">{exc.description}</p>

                {/* Expected vs Actual Grid */}
                <div className="grid grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-lg border border-slate-200/80 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Expected:</span>
                    <strong className="text-emerald-800">{exc.expected_value}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Actual:</span>
                    <strong className="text-rose-700">{exc.actual_value}</strong>
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="text-slate-400">Action:</span>
                    <span className="font-medium text-slate-900">{exc.recommended_action}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">
            Resolve critical exceptions before submitting returns to EPFO/ESIC
          </span>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close Drawer
          </Button>
        </div>
      </div>
    </div>
  );
};
