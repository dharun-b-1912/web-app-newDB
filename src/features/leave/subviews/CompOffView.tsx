import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { api } from '../../../services/api';
import { CompOffGrant } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Gift,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  X,
  Check,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useEmployees } from '../../../hooks/useEmployees';

export const CompOffView: React.FC = () => {
  const [grants, setGrants] = useState<CompOffGrant[]>([]);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Form State
  const [workedDate, setWorkedDate] = useState('2026-08-15');
  const [creditDays, setCreditDays] = useState<number>(1.0);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setGrants(leaveApi.getCompOffGrants());
  }, []);

  const currentUser = api.getCurrentUser();
  const { employees } = useEmployees();
  const currentEmp = employees.find(e => e.id === currentUser?.employee_id || e.work_email === currentUser?.email) || employees[0];

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const expiryDateObj = new Date(workedDate);
    expiryDateObj.setDate(expiryDateObj.getDate() + 60);

    leaveApi.claimCompOffCredit({
      employee_id: currentEmp?.id || currentUser?.employee_id || 'WF-1001',
      employee_name: currentEmp ? (currentEmp.display_name || `${currentEmp.first_name} ${currentEmp.last_name}`.trim()) : (currentUser?.name || 'Authorized Staff'),
      worked_date: workedDate,
      earned_date: workedDate,
      reason,
      credit_days: creditDays,
      hours_worked: creditDays === 1.0 ? 8 : 4,
      expiry_date: expiryDateObj.toISOString().split('T')[0],
      source: 'WeekendWork',
      approved_by_name: '',
    });

    setGrants(leaveApi.getCompOffGrants());
    setIsClaimModalOpen(false);
    setReason('');
    alert('Comp-Off claim submitted successfully for manager approval.');
  };

  const handleApprove = (grantId: string) => {
    leaveApi.approveCompOffGrant(grantId, 'HR Operations Admin');
    setGrants(leaveApi.getCompOffGrants());
    alert('Comp-off grant approved and credited to employee ledger!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#07563D]" />
            <span>Compensatory Off (Comp-Off) Module</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Earn leave credits for working on weekly offs or public holidays with automated 60-day expiry enforcement
          </p>
        </div>

        <button
          onClick={() => setIsClaimModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Claim Comp-Off Credit</span>
        </button>
      </div>

      {/* Comp Off Grants Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Grant Code</th>
              <th className="p-4">Employee</th>
              <th className="p-4">Worked Date</th>
              <th className="p-4">Reason / Deliverable</th>
              <th className="p-4 text-center">Credit Days</th>
              <th className="p-4 text-center">Expiry Date (60d)</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {grants.map(g => (
              <tr key={g.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-mono font-bold text-gray-900">{g.id}</td>
                <td className="p-4 font-extrabold text-gray-900">{g.employee_name}</td>
                <td className="p-4 font-mono font-bold text-gray-800">{g.worked_date}</td>
                <td className="p-4 font-medium text-gray-600 max-w-xs truncate">{g.reason}</td>
                <td className="p-4 text-center font-mono font-black text-teal-800 bg-teal-50/60">
                  +{g.credit_days} d
                </td>
                <td className="p-4 text-center font-mono font-bold text-gray-500">{g.expiry_date}</td>
                <td className="p-4 text-center">
                  <Badge variant={g.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                    {g.status}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  {g.status === 'Pending' ? (
                    <button
                      onClick={() => handleApprove(g.id)}
                      className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Approve Credit
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-mono">Credited</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Claim Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2 text-[#07563D]">
                <Gift className="w-5 h-5" />
                <h3 className="text-sm font-black text-gray-900">Claim Compensatory Off Credit</h3>
              </div>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="p-6 space-y-4 text-xs">
              <p className="text-gray-600 leading-relaxed">
                Provide details of weekend/holiday work for manager verification. Approved credits must be used within 60 days.
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Worked Date *</label>
                <input
                  type="date"
                  required
                  value={workedDate}
                  onChange={e => setWorkedDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Worked Hours / Shift *</label>
                <select
                  value={creditDays}
                  onChange={e => setCreditDays(parseFloat(e.target.value))}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white"
                >
                  <option value={1.0}>Full Shift (1.0 Day Credit)</option>
                  <option value={0.5}>Half Shift (0.5 Day Credit)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason / Project Deliverable *</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Critical release support on Saturday"
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Claim</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
