import React, { useState } from 'react';
import { essApi } from '../../../services/essApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Calendar, Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EssLeaveView: React.FC = () => {
  const { showToast } = useToast();
  const balances = essApi.getLeaveBalances();

  const requests = [
    { code: 'LR-2026-14', type: 'Casual Leave (CL)', dates: '2026-08-18 (1 Day)', status: 'Approved', approver: 'Anand Viswanathan', submitted: '2026-08-08' },
    { code: 'LR-2026-02', type: 'Earned Leave (EL)', dates: '2026-06-10 to 2026-06-12 (3 Days)', status: 'Approved', approver: 'Anand Viswanathan', submitted: '2026-06-01' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#07563D]" />
            <span>Leave Management & Application Center</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">View real-time leave entitlement balances, apply for leave, track approval status and withdraw pending requests</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Apply Leave Form modal opened')}>
          Apply for Leave
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {balances.map((b, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase">{b.leave_type}</span>
            <div className="text-2xl font-black text-gray-900 font-mono">{b.available} / {b.total_entitlement} Days</div>
            <div className="text-[11px] text-emerald-700 font-semibold">{b.used} Used • {b.pending} Pending Approval</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">My Leave Request Log</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-mono">Code</th>
              <th className="p-4">Leave Type</th>
              <th className="p-4 font-mono">Dates & Duration</th>
              <th className="p-4">Approver</th>
              <th className="p-4 font-mono">Submitted Date</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {requests.map(r => (
              <tr key={r.code} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-bold text-gray-900">{r.code}</td>
                <td className="p-4 font-sans font-extrabold text-gray-900">{r.type}</td>
                <td className="p-4 text-gray-800 font-bold">{r.dates}</td>
                <td className="p-4 font-sans text-gray-700">{r.approver}</td>
                <td className="p-4 text-gray-600">{r.submitted}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
