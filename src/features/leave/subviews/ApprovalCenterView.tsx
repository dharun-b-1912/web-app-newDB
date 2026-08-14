import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveRequest } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Search,
  Filter,
  Users,
  Shield,
  Layers,
} from 'lucide-react';

interface ApprovalCenterViewProps {
  onOpenRequestDetails?: (req: LeaveRequest) => void;
}

export const ApprovalCenterView: React.FC<ApprovalCenterViewProps> = ({ onOpenRequestDetails }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);

  useEffect(() => {
    setRequests(leaveApi.getLeaveRequests());
  }, []);

  const pendingRequests = requests.filter(r => r.status === 'Pending');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Approve all ${selectedIds.length} selected requests?`)) {
      selectedIds.forEach(id => {
        leaveApi.approveLeaveRequest(id, 'Anand Viswanathan (HR Head)', 'Bulk approved');
      });
      setRequests(leaveApi.getLeaveRequests());
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#07563D]" />
            <span>Leave Approval & Delegation Desk</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Review pending leave submissions, perform bulk approvals, or configure manager approval delegation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkApprove}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Bulk Approve ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsDelegationModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-[#07563D]" />
            <span>Delegate Approval Authority</span>
          </button>
        </div>
      </div>

      {/* Pending Queue Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
            Pending Queue ({pendingRequests.length} Items)
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-400">All leave requests have been processed. No pending items.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4 w-10 text-center">Select</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Leave Type</th>
                <th className="p-4">Dates</th>
                <th className="p-4 text-center">Deduction</th>
                <th className="p-4">Reason</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {pendingRequests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(req.id)}
                      onChange={() => toggleSelect(req.id)}
                      className="rounded text-[#07563D]"
                    />
                  </td>
                  <td className="p-4 font-extrabold text-gray-900">
                    {req.employee_name}
                    <span className="block text-[11px] text-gray-400 font-normal">{req.department_name}</span>
                  </td>
                  <td className="p-4 font-bold text-gray-800">{req.leave_type_name}</td>
                  <td className="p-4 font-mono font-bold text-gray-900">
                    {req.from_date} → {req.to_date}
                  </td>
                  <td className="p-4 text-center font-mono font-black text-emerald-800 bg-emerald-50/50 rounded-lg">
                    {req.leave_days_deducted} d
                  </td>
                  <td className="p-4 font-medium text-gray-600 max-w-xs truncate">{req.reason}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => onOpenRequestDetails && onOpenRequestDetails(req)}
                      className="px-3 py-1.5 rounded-lg bg-[#07563D] text-white text-xs font-bold hover:bg-[#05402e]"
                    >
                      Review & Decision
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delegate Modal */}
      {isDelegationModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-gray-900">Delegate Manager Approval Authority</h3>
            <p className="text-xs text-gray-500">Temporarily assign another manager to approve team requests during absence.</p>

            <div>
              <label className="text-xs font-bold text-gray-700">Delegate To Manager</label>
              <select className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-semibold">
                <option>Anand Viswanathan (HR Head)</option>
                <option>Priya Sharma (VP Engineering)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-700">Start Date</label>
                <input type="date" className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-mono" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">End Date</label>
                <input type="date" className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-mono" />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setIsDelegationModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Approval authority delegated successfully.');
                  setIsDelegationModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#07563D] text-white text-xs font-bold shadow-xs"
              >
                Save Delegation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
