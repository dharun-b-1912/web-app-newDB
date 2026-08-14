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
} from 'lucide-react';

export const AccrualEngineView: React.FC = () => {
  const [logs, setLogs] = useState<AccrualExecutionLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setLogs(leaveApi.getAccrualLogs());
  }, []);

  const handleRunAccrual = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newLog = leaveApi.runMonthlyAccrualJob('2026-08');
      setLogs(leaveApi.getAccrualLogs());
      setIsProcessing(false);
      alert(`Monthly Accrual Job Completed! Processed ${newLog.employees_processed} employees, credited ${newLog.total_leave_days_credited} leave days.`);
    }, 1200);
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
            Idempotent batch engine processing monthly, quarterly, and annual leave accruals with proration
          </p>
        </div>

        <button
          onClick={handleRunAccrual}
          disabled={isProcessing}
          className="px-5 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
        >
          {isProcessing ? (
            <RotateCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{isProcessing ? 'Executing Job...' : 'Run August 2026 Accrual Batch'}</span>
        </button>
      </div>

      {/* Idempotency Safeguard Info Box */}
      <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-3 text-xs text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-[#07563D] shrink-0" />
        <div>
          <span className="font-extrabold block">Strict Idempotency Protection Active</span>
          <span>
            If an accrual batch for period <strong className="font-mono">2026-08</strong> is executed multiple times, duplicate ledger records are automatically blocked.
          </span>
        </div>
      </div>

      {/* Execution Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Accrual Execution Logs</h3>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Run Code</th>
              <th className="p-4">Period</th>
              <th className="p-4">Execution Time</th>
              <th className="p-4 text-center">Employees Processed</th>
              <th className="p-4 text-center">Total Credited Days</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-mono font-bold text-gray-900">{log.id}</td>
                <td className="p-4 font-mono font-bold text-[#07563D]">{log.period}</td>
                <td className="p-4 font-mono text-gray-600">{new Date(log.run_timestamp).toLocaleString()}</td>
                <td className="p-4 text-center font-mono font-bold text-gray-900">{log.employees_processed}</td>
                <td className="p-4 text-center font-mono font-black text-emerald-800 bg-emerald-50/50 rounded-lg">
                  +{log.total_leave_days_credited} d
                </td>
                <td className="p-4 text-center">
                  <Badge variant={log.status === 'Completed' ? 'emerald' : 'rose'} size="sm">
                    {log.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
