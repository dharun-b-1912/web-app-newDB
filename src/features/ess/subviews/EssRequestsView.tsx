import React, { useState, useEffect } from 'react';
import { essApi } from '../../../services/essApi';
import { EssRequestItem } from '../../../types/ess';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EssRequestsView: React.FC = () => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<EssRequestItem[]>([]);

  useEffect(() => {
    setRequests(essApi.getRequests());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#07563D]" />
            <span>Unified Employee Request Center</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Submit & track requests for Leave, WFH, Regularization, Overtime, Travel, Expenses, Salary Advances, Loans, Documents & Helpdesk</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create New Request modal opened')}>
          Submit New Request
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-mono">Code</th>
              <th className="p-4">Request Type</th>
              <th className="p-4">Subject</th>
              <th className="p-4 font-mono">Submitted Date</th>
              <th className="p-4">Current Approver</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-bold text-gray-900">{r.request_code}</td>
                <td className="p-4 font-sans font-extrabold text-gray-900">
                  <Badge variant="emerald">{r.request_type}</Badge>
                </td>
                <td className="p-4 font-sans text-gray-800 font-medium">{r.subject}</td>
                <td className="p-4 text-gray-600">{r.submitted_date}</td>
                <td className="p-4 font-sans text-gray-700">{r.current_approver}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
