import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveEntitlement, LeaveLedgerTransaction } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  FileText,
  Search,
  Filter,
  History,
  TrendingUp,
  Download,
  X,
  User,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';

export const LeaveBalanceView: React.FC = () => {
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [ledger, setLedger] = useState<LeaveLedgerTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const loadData = () => {
    setEntitlements(leaveApi.getEntitlements());
    setLedger(leaveApi.getLedger());
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('leave.*', () => loadData());
    return () => unsub();
  }, []);

  const departments = Array.from(new Set(entitlements.map(e => e.department_name)));

  const filteredEntitlements = entitlements.filter(e => {
    const matchesSearch =
      e.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.leave_type_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'All' || e.department_name === deptFilter;
    return matchesSearch && matchesDept;
  });

  const selectedLedgerEntries = selectedEmployeeId
    ? ledger.filter(l => l.employee_id === selectedEmployeeId)
    : [];

  const selectedEmployeeName =
    entitlements.find(e => e.employee_id === selectedEmployeeId)?.employee_name ||
    selectedLedgerEntries[0]?.employee_name ||
    'Employee';

  const handleExportCsv = () => {
    const headers = [
      'Employee Name',
      'Department',
      'Leave Type',
      'Opening',
      'Accrued',
      'Adjusted',
      'Used',
      'Encashed',
      'Expired',
      'Available Closing Balance',
      'Period',
    ];
    const rows = filteredEntitlements.map(e => [
      `"${e.employee_name}"`,
      `"${e.department_name}"`,
      `"${e.leave_type_name}"`,
      e.opening_balance,
      e.accrued,
      e.adjusted || 0,
      e.used,
      e.encashed || 0,
      e.expired || 0,
      e.available_balance,
      `"${e.period}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leave_balances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#07563D]" />
            <span>Leave Balance Matrix & Immutable Ledger</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Transparent mathematical closing balance derived from audit-proof transaction ledger records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Balance CSV</span>
          </button>
        </div>
      </div>

      {/* Formula Explanation Callout */}
      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono font-bold text-[11px]">
          <span className="text-gray-500 font-sans">Formula:</span>
          <span>Opening ({'{O}'})</span>
          <span>+</span>
          <span className="text-emerald-700">Accrued ({'{A}'})</span>
          <span>+</span>
          <span className="text-blue-700">Adjustments ({'{Adj}'})</span>
          <span>-</span>
          <span className="text-rose-700">Used ({'{U}'})</span>
          <span>-</span>
          <span className="text-amber-700">Encashed ({'{E}'})</span>
          <span>-</span>
          <span className="text-gray-500">Expired ({'{Exp}'})</span>
          <span>=</span>
          <strong className="text-[#07563D] font-black underline">Closing Available</strong>
        </div>
        <span className="text-[10px] text-emerald-800 font-semibold font-mono">
          Tenant FY 2026-27
        </span>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee, leave type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-white w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-xl text-xs font-bold bg-white"
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Balance Calculation Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4">Leave Type</th>
                <th className="p-4 text-right font-mono">Opening</th>
                <th className="p-4 text-right font-mono text-emerald-700">+ Accrued</th>
                <th className="p-4 text-right font-mono text-blue-700">+ Adj</th>
                <th className="p-4 text-right font-mono text-rose-700">- Used</th>
                <th className="p-4 text-right font-mono text-amber-700">- Encashed</th>
                <th className="p-4 text-right font-mono text-gray-400">- Expired</th>
                <th className="p-4 text-right font-mono text-[#07563D] bg-emerald-50/40 font-black">
                  = Closing Available
                </th>
                <th className="p-4 text-center">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredEntitlements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-xs text-gray-400">
                    No balance records matching criteria.
                  </td>
                </tr>
              ) : (
                filteredEntitlements.map(ent => (
                  <tr key={ent.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-4">
                      <strong className="text-gray-900 font-extrabold block">{ent.employee_name}</strong>
                      <span className="text-[11px] text-gray-400 font-normal">{ent.department_name}</span>
                    </td>
                    <td className="p-4 font-bold text-gray-800">
                      {ent.leave_type_name}
                      <span className="block text-[10px] text-gray-400 font-normal">Period: {ent.period}</span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-gray-600">
                      {ent.opening_balance.toFixed(1)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-700">
                      +{ent.accrued.toFixed(1)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-blue-700">
                      +{(ent.adjusted || 0).toFixed(1)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-rose-700">
                      -{ent.used.toFixed(1)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-amber-700">
                      -{(ent.encashed || 0).toFixed(1)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-gray-400">
                      -{(ent.expired || 0).toFixed(1)}
                    </td>
                    <td className="p-4 text-right font-mono bg-emerald-50/40">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-950 font-black text-xs font-mono inline-block">
                        {ent.available_balance.toFixed(1)} d
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedEmployeeId(ent.employee_id)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 hover:border-[#07563D] hover:bg-emerald-50 text-xs font-bold text-[#07563D] flex items-center gap-1.5 mx-auto transition-colors cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Statement</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledger History Slide-Over Drawer */}
      {selectedEmployeeId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-[#07563D]" />
                  <span>Immutable Leave Ledger Statement</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Audit-proof chronological transaction history for <strong>{selectedEmployeeName}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeId(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 flex-1 overflow-y-auto">
              {selectedLedgerEntries.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-xs space-y-2">
                  <FileSpreadsheet className="w-8 h-8 mx-auto opacity-40 text-gray-400" />
                  <p>No ledger transactions recorded for this employee.</p>
                </div>
              ) : (
                selectedLedgerEntries.map(tx => (
                  <div
                    key={tx.id}
                    className="p-4 rounded-2xl border border-gray-200 bg-white flex items-start justify-between gap-3 text-xs shadow-2xs hover:border-gray-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{tx.leave_type_name}</span>
                        <Badge
                          variant={
                            tx.transaction_type === 'Accrual' || tx.transaction_type === 'Grant'
                              ? 'emerald'
                              : tx.transaction_type === 'Debit' || tx.transaction_type === 'Encashment'
                              ? 'rose'
                              : 'blue'
                          }
                          size="sm"
                        >
                          {tx.transaction_type}
                        </Badge>
                      </div>
                      <p className="text-gray-600 font-medium">{tx.reason}</p>
                      <span className="text-[10px] text-gray-400 font-mono block">
                        Tx Date: {tx.date} • Actor: {tx.actor_name}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={cn(
                          'font-mono font-black text-sm',
                          tx.amount > 0 ? 'text-emerald-700' : 'text-rose-700'
                        )}
                      >
                        {tx.amount > 0 ? `+${tx.amount.toFixed(1)}` : tx.amount.toFixed(1)} d
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono block font-semibold mt-0.5">
                        Balance After: {tx.balance_after.toFixed(1)} d
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
