import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { api } from '../../../services/api';
import { LeaveAdjustment, LeaveType } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Sliders,
  Plus,
  CheckCircle,
  Clock,
  Shield,
  FileText,
  X,
  Check,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useEmployees } from '../../../hooks/useEmployees';

export const AdjustmentsView: React.FC = () => {
  const [adjustments, setAdjustments] = useState<LeaveAdjustment[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { employees } = useEmployees();
  // Form State
  const [selectedEmp, setSelectedEmp] = useState(() => (employees[0]?.id || 'emp-101'));
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('lt-cl');
  const [adjType, setAdjType] = useState<'Grant' | 'Deduction' | 'Transfer'>('Grant');
  const [amount, setAmount] = useState<number>(1.0);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setAdjustments(leaveApi.getAdjustments());
    const types = leaveApi.getLeaveTypes().filter(t => t.is_active);
    setLeaveTypes(types);
    if (types.length > 0) setSelectedLeaveTypeId(types[0].id);
    if (employees.length > 0 && !selectedEmp) setSelectedEmp(employees[0].id);
  }, []);

  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const chosenType = leaveTypes.find(t => t.id === selectedLeaveTypeId) || leaveTypes[0];
    const signedAmount = adjType === 'Deduction' ? -Math.abs(amount) : Math.abs(amount);
    const empObj = employees.find(e => e.id === selectedEmp);
    const empName = empObj ? (empObj.display_name || `${empObj.first_name} ${empObj.last_name}`.trim()) : 'Staff Member';

    leaveApi.createAdjustment({
      employee_id: selectedEmp,
      employee_name: empName,
      leave_type_id: chosenType.id,
      leave_type_name: chosenType.name,
      adjustment_type: adjType,
      amount: signedAmount,
      reason,
      actor_name: 'HR Admin',
    });

    setAdjustments(leaveApi.getAdjustments());
    setIsModalOpen(false);
    setReason('');
    alert('HR Balance Adjustment successfully executed and posted to employee transaction ledger!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#07563D]" />
            <span>HR Manual Balance Adjustments & Grants</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit-logged HR manual balance grants, penalty deductions, and policy transfers with immediate ledger impact
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New HR Adjustment</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
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
                  <Badge variant={adj.adjustment_type === 'Grant' ? 'emerald' : 'rose'} size="sm">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2 text-[#07563D]">
                <Sliders className="w-5 h-5" />
                <h3 className="text-sm font-black text-gray-900">New HR Balance Adjustment</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="p-6 space-y-4 text-xs">
              <p className="text-gray-600 leading-relaxed">
                Every adjustment immediately updates the employee balance and appends an immutable entry to the ledger.
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Employee *</label>
                <select
                  value={selectedEmp}
                  onChange={e => setSelectedEmp(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.display_name || `${emp.first_name} ${emp.last_name}`.trim()} ({emp.employee_code || emp.id} - {emp.department_name || 'Staff'})
                    </option>
                  ))}
                  {employees.length === 0 && (
                    <option value="emp-101">No active employees loaded</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Leave Type *</label>
                <select
                  value={selectedLeaveTypeId}
                  onChange={e => setSelectedLeaveTypeId(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white"
                >
                  {leaveTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Adjustment Type *</label>
                  <select
                    value={adjType}
                    onChange={e => setAdjType(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white"
                  >
                    <option value="Grant">Grant (+ Balance)</option>
                    <option value="Deduction">Deduction (- Balance)</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount (Days) *</label>
                  <input
                    type="number"
                    step={0.5}
                    min={0.5}
                    required
                    value={amount}
                    onChange={e => setAmount(parseFloat(e.target.value) || 1)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Mandatory Justification / Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Special management discretionary grant for extraordinary project turnaround"
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Execute Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
