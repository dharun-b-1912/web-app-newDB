import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { api } from '../../../services/api';
import { LeaveEncashment } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Coins,
  Plus,
  CheckCircle,
  Clock,
  DollarSign,
  Building,
  X,
  Check,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export const EncashmentView: React.FC = () => {
  const [encashments, setEncashments] = useState<LeaveEncashment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [daysToEncash, setDaysToEncash] = useState<number>(5);

  useEffect(() => {
    setEncashments(leaveApi.getEncashments());
  }, []);

  const currentUser = api.getCurrentUser();
  const employees = api.getEmployeesSync();
  const currentEmp = employees.find(e => e.id === currentUser?.employee_id || e.work_email === currentUser?.email) || employees[0];

  const dailyBasicPay = 3333;
  const estimatedAmount = daysToEncash * dailyBasicPay;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (daysToEncash <= 0 || daysToEncash > 10) {
      alert('Encashment days must be between 1 and 10 days.');
      return;
    }

    leaveApi.submitEncashmentRequest({
      employee_id: currentEmp?.id || currentUser?.employee_id || 'WF-1001',
      employee_name: currentEmp ? (currentEmp.display_name || `${currentEmp.first_name} ${currentEmp.last_name}`.trim()) : (currentUser?.name || 'Authorized Staff'),
      department_name: currentEmp?.department_name || 'Enterprise Operations',
      leave_type_id: 'lt-pl',
      leave_type_name: 'Privilege Leave',
      requested_days: daysToEncash,
      days_to_encash: daysToEncash,
      available_balance: 21,
      eligible_days: 10,
      estimated_amount: estimatedAmount,
      calculation_basis: 'BasicSalary',
      payroll_period: 'August 2026',
      notes: 'Mid-year leave encashment request submitted via portal.',
    });

    setEncashments(leaveApi.getEncashments());
    setIsModalOpen(false);
    alert('Leave encashment request submitted successfully.');
  };

  const handleApprove = (encId: string) => {
    leaveApi.approveEncashment(encId, 'HR Compensation Manager');
    setEncashments(leaveApi.getEncashments());
    alert('Encashment approved and debited from leave ledger for payroll disbursement!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#07563D]" />
            <span>Leave Encashment & Payroll Integration</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Process privilege leave encashment payouts directly linked to active payroll calculation and ledger deductions
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Apply Encashment</span>
        </button>
      </div>

      {/* Encashments Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Request Code</th>
              <th className="p-4">Employee</th>
              <th className="p-4">Leave Type</th>
              <th className="p-4 text-center">Days Encashed</th>
              <th className="p-4 text-right">Estimated Payout (INR)</th>
              <th className="p-4 text-center">Payroll Handoff</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {encashments.map(enc => (
              <tr key={enc.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-mono font-bold text-gray-900">{enc.id}</td>
                <td className="p-4 font-extrabold text-gray-900">{enc.employee_name}</td>
                <td className="p-4 font-bold text-gray-800">{enc.leave_type_name}</td>
                <td className="p-4 text-center font-mono font-black text-blue-800 bg-blue-50/60">
                  {enc.days_to_encash} d
                </td>
                <td className="p-4 text-right font-mono font-extrabold text-gray-900">
                  ₹{enc.estimated_amount.toLocaleString('en-IN')}
                </td>
                <td className="p-4 text-center">
                  <Badge variant={enc.payroll_status === 'Processed' ? 'emerald' : 'amber'} size="sm">
                    {enc.payroll_status}
                  </Badge>
                </td>
                <td className="p-4 text-center">
                  <Badge variant={enc.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                    {enc.status}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  {enc.status === 'Pending' ? (
                    <button
                      onClick={() => handleApprove(enc.id)}
                      className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Approve Payout
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-mono">Approved</span>
                  )}
                </td>
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
                <Coins className="w-5 h-5" />
                <h3 className="text-sm font-black text-gray-900">Apply for Leave Encashment</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-gray-600 leading-relaxed">
                Eligible balance: <strong>18 Days PL</strong>. Maximum encashable per organizational policy is <strong>10 Days</strong>.
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Number of Days to Encash *</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={daysToEncash}
                  onChange={e => setDaysToEncash(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold bg-white"
                />
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Calculation Formula Basis:</span>
                  <span className="font-bold text-gray-900">Basic Salary / 30 Days</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Estimated Total Gross Payout:</span>
                  <span className="font-extrabold text-[#07563D] font-mono text-sm">
                    ₹{estimatedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
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
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
