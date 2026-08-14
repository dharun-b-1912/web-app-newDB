import React, { useState, useEffect } from 'react';
import { tlApi } from '../../../services/tlApi';
import { TlApprovalItem } from '../../../types/tl';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TlApprovalsView: React.FC = () => {
  const { showToast } = useToast();
  const [approvals, setApprovals] = useState<TlApprovalItem[]>([]);

  useEffect(() => {
    setApprovals(tlApi.getPendingApprovals());
  }, []);

  const handleApprove = (id: string) => {
    setApprovals(prev => prev.map(a => (a.id === id ? { ...a, status: 'Approved' } : a)));
    showToast('Approval Processed Successfully');
  };

  const handleReject = (id: string) => {
    setApprovals(prev => prev.map(a => (a.id === id ? { ...a, status: 'Rejected' } : a)));
    showToast('Request Rejected');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#07563D]" />
            <span>Unified Team Approval Center</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Centralized operational approvals for WFH, attendance regularization, overtime, expense claims, and travel requests</p>
        </div>

        <Badge variant="emerald">Workflow Engine Connected</Badge>
      </div>

      <div className="space-y-4">
        {approvals.map(app => (
          <div key={app.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="emerald" size="sm">{app.request_type}</Badge>
                <span className="text-xs font-mono font-bold text-gray-400 ml-2">{app.request_code}</span>
                <h4 className="text-base font-extrabold text-gray-900 mt-1">{app.employee_name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">Submitted: {app.submitted_date}</p>
              </div>
              <Badge variant={app.status === 'Approved' ? 'emerald' : app.status === 'Rejected' ? 'rose' : 'amber'}>
                {app.status}
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-sans text-gray-800">
              Details: <strong>{app.details_summary}</strong>
            </div>

            {app.status === 'Pending' && (
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => handleApprove(app.id)}>
                  Approve Request
                </Button>
                <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" leftIcon={<XCircle className="w-3.5 h-3.5" />} onClick={() => handleReject(app.id)}>
                  Reject Request
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
