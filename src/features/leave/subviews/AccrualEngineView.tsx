import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { AccrualExecutionLog } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Play,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Zap,
  Undo2,
  Users,
  Calendar,
  X,
  Check,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export const AccrualEngineView: React.FC = () => {
  const [logs, setLogs] = useState<AccrualExecutionLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreExecModalOpen, setIsPreExecModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-08');

  useEffect(() => {
    setLogs(leaveApi.getAccrualLogs());
  }, []);

  const handleRunAccrual = () => {
    setIsPreExecModalOpen(false);
    setIsProcessing(true);
    setTimeout(() => {
      const newLog = leaveApi.runMonthlyAccrualJob(selectedPeriod);
      setLogs(leaveApi.getAccrualLogs());
      setIsProcessing(false);
      alert(
        `Monthly Accrual Job Completed! Processed ${newLog.employees_processed} employees, credited ${newLog.total_leave_days_credited} leave days.`
      );
    }, 1000);
  };

  const handleReverseJob = (jobId: string) => {
    if (confirm(`Are you sure you want to rollback and reverse accrual job ${jobId}? This will remove ledger credits.`)) {
      try {
        const res = leaveApi.reverseAccrualJob(jobId, 'HR Operations Admin');
        alert(res.message);
        setLogs(leaveApi.getAccrualLogs());
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#07563D]" />
            <span>Accrual Schedule Runner & Automation Engine</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Idempotent batch engine processing monthly, quarterly, and annual leave accruals with proration and rollback support
          </p>
        </div>

        <button
          onClick={() => setIsPreExecModalOpen(true)}
          disabled={isProcessing}
          className="px-5 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          {isProcessing ? (
            <RotateCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{isProcessing ? 'Executing Batch...' : 'Run Scheduled Accrual Batch'}</span>
        </button>
      </div>

      {/* Idempotency Safeguard Info Box */}
      <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs text-emerald-900">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-[#07563D] shrink-0" />
          <div>
            <span className="font-extrabold block">Strict Idempotency & Rollback Protection Active</span>
            <span>
              If an accrual batch for period <strong className="font-mono">{selectedPeriod}</strong> is triggered multiple times, duplicate ledger postings are blocked. Jobs can also be safely rolled back.
            </span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-950 font-bold font-mono text-[11px] shrink-0">
          Engine: Idempotent v3.0
        </span>
      </div>

      {/* Execution Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Accrual Execution Logs & Run History</h3>
          <span className="text-[11px] text-gray-500 font-mono">{logs.length} Batch Runs</span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Run Code</th>
              <th className="p-4">Period</th>
              <th className="p-4">Execution Time</th>
              <th className="p-4 text-center">Employees Processed</th>
              <th className="p-4 text-center">Total Credited Days</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-mono font-bold text-gray-900">{log.id}</td>
                <td className="p-4 font-mono font-bold text-[#07563D]">{log.period}</td>
                <td className="p-4 font-mono text-gray-600">
                  {new Date(log.run_timestamp).toLocaleString()}
                </td>
                <td className="p-4 text-center font-mono font-bold text-gray-900">
                  {log.employees_processed}
                </td>
                <td className="p-4 text-center font-mono font-black text-emerald-800">
                  +{log.total_leave_days_credited} d
                </td>
                <td className="p-4 text-center">
                  <Badge
                    variant={
                      log.status === 'Success'
                        ? 'emerald'
                        : log.status === 'Reversed'
                        ? 'amber'
                        : 'rose'
                    }
                    size="sm"
                  >
                    {log.status}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  {log.status === 'Success' && (
                    <button
                      onClick={() => handleReverseJob(log.id)}
                      className="px-2.5 py-1 rounded-lg border border-amber-300 hover:bg-amber-50 text-amber-800 font-bold text-[11px] flex items-center gap-1 ml-auto cursor-pointer"
                      title="Rollback this batch execution"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Rollback</span>
                    </button>
                  )}
                  {log.status === 'Reversed' && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      Reversed at {log.reversed_at ? new Date(log.reversed_at).toLocaleDateString() : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pre-Execution Summary Dialog */}
      {isPreExecModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2 text-[#07563D]">
                <Zap className="w-5 h-5" />
                <h3 className="text-sm font-black text-gray-900">Pre-Execution Accrual Summary</h3>
              </div>
              <button
                onClick={() => setIsPreExecModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Period:</span>
                  <input
                    type="month"
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    className="p-1 border border-gray-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Employee Headcount:</span>
                  <strong className="text-gray-900 font-mono">428 Active Staff</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estimated Total Credit:</span>
                  <strong className="text-emerald-700 font-mono font-black">+856.0 Leave Days</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mid-Month Joining Proration:</span>
                  <strong className="text-gray-900">Active (Calendar Days)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Execution Mode:</span>
                  <strong className="text-gray-900">Atomic Multi-Ledger Transaction</strong>
                </div>
              </div>

              <p className="text-gray-600 text-[11px] leading-relaxed">
                Running this batch will append credit transactions to employee leave ledgers for all active policy rules. Idempotency guarantees prevent duplicate accruals if rerun for the same period.
              </p>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreExecModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRunAccrual}
                  className="px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Execute Accrual Run</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
