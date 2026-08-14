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
} from 'lucide-react';

export const LeaveBalanceView: React.FC = () => {
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [ledger, setLedger] = useState<LeaveLedgerTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    setEntitlements(leaveApi.getEntitlements());
    setLedger(leaveApi.getLedger());
  }, []);

  const filteredEntitlements = entitlements.filter(
    e =>
      e.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.leave_type_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedLedgerEntries = selectedEmployeeId
    ? ledger.filter(l => l.employee_id === selectedEmployeeId)
    : [];

  const selectedEmployeeName = selectedLedgerEntries[0]?.employee_name || 'Employee';

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#07563D]" />
            <span>Leave Balances & Immutable Ledger</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time balance derived from audit-proof transaction ledger entries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee or leave type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-white w-64"
            />
          </div>
        </div>
      </div>

      {/* Balance Cards Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Employee</th>
              <th className="p-4">Leave Type</th>
              <th className="p-4 text-right">Opening</th>
              <th className="p-4 text-right">Accrued</th>
              <th className="p-4 text-right">Used</th>
              <th className="p-4 text-right">Pending</th>
              <th className="p-4 text-right">Available</th>
              <th className="p-4 text-center">Ledger Statement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filteredEntitlements.map(ent => (
              <tr key={ent.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-extrabold text-gray-900">
                  {ent.employee_name}
                  <span className="block text-[11px] text-gray-400 font-normal">{ent.department_name}</span>
                </td>
                <td className="p-4 font-bold text-gray-800">
                  {ent.leave_type_name}
                  <span className="block text-[10px] text-gray-400 font-normal">Period: {ent.period}</span>
                </td>
                <td className="p-4 text-right font-mono font-bold text-gray-600">{ent.opening_balance}</td>
                <td className="p-4 text-right font-mono font-bold text-emerald-700">+{ent.accrued}</td>
                <td className="p-4 text-right font-mono font-bold text-rose-700">-{ent.used}</td>
                <td className="p-4 text-right font-mono font-bold text-amber-700">{ent.pending}</td>
                <td className="p-4 text-right">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-mono font-black text-xs">
                    {ent.available_balance} Days
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => setSelectedEmployeeId(ent.employee_id)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 hover:border-[#07563D] hover:bg-emerald-50 text-xs font-bold text-[#07563D] flex items-center gap-1.5 mx-auto transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Ledger</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ledger History Drawer */}
      {selectedEmployeeId && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900">Transaction Ledger Statement</h3>
                <p className="text-xs text-gray-500">Immutable ledger history for {selectedEmployeeName}</p>
              </div>
              <button
                onClick={() => setSelectedEmployeeId(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 flex-1">
              {selectedLedgerEntries.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">No ledger entries found for this employee.</div>
              ) : (
                selectedLedgerEntries.map(tx => (
                  <div key={tx.id} className="p-4 rounded-xl border border-gray-200 bg-white flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{tx.leave_type_name}</span>
                        <Badge variant={tx.amount > 0 ? 'emerald' : 'danger'} size="sm">
                          {tx.transaction_type}
                        </Badge>
                      </div>
                      <p className="text-gray-500 font-medium">{tx.reason}</p>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Date: {tx.date} • Actor: {tx.actor_name}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className={`font-mono font-black text-sm ${tx.amount > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} Days
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono block">
                        Balance: {tx.balance_after}
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
