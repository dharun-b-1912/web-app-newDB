import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { CompOffGrant } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Gift,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';

export const CompOffView: React.FC = () => {
  const [grants, setGrants] = useState<CompOffGrant[]>([]);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  useEffect(() => {
    setGrants(leaveApi.getCompOffGrants());
  }, []);

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
          className="px-4 py-2 rounded-xl bg-[#07563D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#05402e]"
        >
          <Plus className="w-4 h-4" />
          <span>Claim Comp-Off Credit</span>
        </button>
      </div>

      {/* Comp Off Grants Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Grant Code</th>
              <th className="p-4">Employee</th>
              <th className="p-4">Worked Date</th>
              <th className="p-4">Reason / Project</th>
              <th className="p-4 text-center">Credit Days</th>
              <th className="p-4 text-center">Expiry Date</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {grants.map(g => (
              <tr key={g.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-mono font-bold text-gray-900">{g.id}</td>
                <td className="p-4 font-extrabold text-gray-900">{g.employee_name}</td>
                <td className="p-4 font-mono font-bold text-gray-800">{g.worked_date}</td>
                <td className="p-4 font-medium text-gray-600 max-w-xs truncate">{g.reason}</td>
                <td className="p-4 text-center font-mono font-black text-teal-800 bg-teal-50/60 rounded-lg">
                  +{g.credit_days} d
                </td>
                <td className="p-4 text-center font-mono font-bold text-gray-500">{g.expiry_date}</td>
                <td className="p-4 text-center">
                  <Badge variant={g.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                    {g.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Claim Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-gray-900">Claim Compensatory Off Credit</h3>
            <p className="text-xs text-gray-500">Provide details of weekend/holiday work for manager verification.</p>

            <div>
              <label className="text-xs font-bold text-gray-700">Worked Date *</label>
              <input type="date" className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-mono" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700">Worked Hours / Shift</label>
              <select className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-bold">
                <option value="Full Day">Full Shift (1.0 Day Credit)</option>
                <option value="Half Day">Half Shift (0.5 Day Credit)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700">Reason / Project Deliverable *</label>
              <textarea rows={2} className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs" />
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Comp-Off claim submitted for approval.');
                  setIsClaimModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#07563D] text-white text-xs font-bold shadow-xs"
              >
                Submit Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
