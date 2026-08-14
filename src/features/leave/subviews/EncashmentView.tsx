import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveEncashment } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Coins,
  Plus,
  CheckCircle,
  Clock,
  DollarSign,
  Building,
} from 'lucide-react';

export const EncashmentView: React.FC = () => {
  const [encashments, setEncashments] = useState<LeaveEncashment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setEncashments(leaveApi.getEncashments());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#07563D]" />
            <span>Leave Encashment & Payroll Handoff</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Process earned privilege leave encashment payouts directly linked to active payroll processing
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#07563D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#05402e]"
        >
          <Plus className="w-4 h-4" />
          <span>Apply Encashment</span>
        </button>
      </div>

      {/* Encashments Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Request Code</th>
              <th className="p-4">Employee</th>
              <th className="p-4">Leave Type</th>
              <th className="p-4 text-center">Days Encashed</th>
              <th className="p-4 text-right">Estimated Payout (INR)</th>
              <th className="p-4 text-center">Payroll Status</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {encashments.map(enc => (
              <tr key={enc.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-mono font-bold text-gray-900">{enc.id}</td>
                <td className="p-4 font-extrabold text-gray-900">{enc.employee_name}</td>
                <td className="p-4 font-bold text-gray-800">{enc.leave_type_name}</td>
                <td className="p-4 text-center font-mono font-black text-blue-800 bg-blue-50/60 rounded-lg">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-gray-900">Apply for Privilege Leave Encashment</h3>
            <p className="text-xs text-gray-500">
              Eligible balance: 18 Days PL. Maximum encashable per policy: 10 Days.
            </p>

            <div>
              <label className="text-xs font-bold text-gray-700">Number of Days to Encash *</label>
              <input
                type="number"
                max={10}
                defaultValue={5}
                className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Calculation Basis:</span>
                <span className="font-bold text-gray-900">Basic Salary</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Estimated Payout:</span>
                <span className="font-bold text-emerald-800 font-mono">₹16,665</span>
              </div>
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
                  alert('Encashment request submitted for payroll approval.');
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#07563D] text-white text-xs font-bold shadow-xs"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
