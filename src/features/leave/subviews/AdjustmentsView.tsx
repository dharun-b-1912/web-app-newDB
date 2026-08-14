import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveAdjustment } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Sliders,
  Plus,
  CheckCircle,
  Clock,
  Shield,
  FileText,
} from 'lucide-react';

export const AdjustmentsView: React.FC = () => {
  const [adjustments, setAdjustments] = useState<LeaveAdjustment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setAdjustments(leaveApi.getAdjustments());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#07563D]" />
            <span>HR Manual Adjustments & Grants</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit-logged HR manual balance grants, penalty deductions, and policy transfers
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#07563D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#05402e]"
        >
          <Plus className="w-4 h-4" />
          <span>New HR Adjustment</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Adjustment ID</th>
              <th className="p-4">Employee</th>
              <th className="p-4">Leave Type</th>
              <th className="p-4 text-center">Adjustment Type</th>
              <th className="p-4 text-center">Amount</th>
              <th className="p-4">Reason / Mandatory Justification</th>
              <th className="p-4">HR Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {adjustments.map(adj => (
              <tr key={adj.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-mono font-bold text-gray-900">{adj.id}</td>
                <td className="p-4 font-extrabold text-gray-900">{adj.employee_name}</td>
                <td className="p-4 font-bold text-gray-800">{adj.leave_type_name}</td>
                <td className="p-4 text-center">
                  <Badge variant={adj.adjustment_type === 'Grant' ? 'emerald' : 'danger'} size="sm">
                    {adj.adjustment_type}
                  </Badge>
                </td>
                <td className="p-4 text-center font-mono font-black text-gray-900">
                  {adj.amount > 0 ? `+${adj.amount}` : adj.amount} Days
                </td>
                <td className="p-4 font-medium text-gray-600 max-w-xs truncate">{adj.reason}</td>
                <td className="p-4 text-gray-500 font-bold">{adj.actor_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-gray-900">New HR Balance Adjustment</h3>
            <p className="text-xs text-gray-500">Every adjustment immediately creates an immutable ledger entry.</p>

            <div>
              <label className="text-xs font-bold text-gray-700">Select Employee</label>
              <select className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-semibold">
                <option>Rajesh Kumar (EMP-101)</option>
                <option>Ananya Sen (EMP-102)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-700">Adjustment Type</label>
                <select className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-semibold">
                  <option value="Grant">Grant (+ Balance)</option>
                  <option value="Deduction">Deduction (- Balance)</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">Amount (Days)</label>
                <input type="number" defaultValue={1} className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-mono font-bold" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700">Mandatory Justification / Reason *</label>
              <textarea rows={2} required className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs" />
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('HR Adjustment processed and ledger updated.');
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#07563D] text-white text-xs font-bold shadow-xs"
              >
                Execute Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
