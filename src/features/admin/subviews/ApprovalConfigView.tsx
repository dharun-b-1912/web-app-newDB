import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, ShieldCheck, Clock, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const ApprovalConfigView: React.FC = () => {
  const { showToast } = useToast();

  const policies = [
    { code: 'POL-TRV', module: 'Travel & Expense', sequence: ['Reporting Manager', 'Department Head', 'Finance Head'], escalationHours: 48, status: 'Active' },
    { code: 'POL-LEAVE', module: 'Leave Management', sequence: ['Reporting Manager'], escalationHours: 24, status: 'Active' },
    { code: 'POL-PAY', module: 'Payroll Revision', sequence: ['HR Head', 'Finance Head', 'CEO'], escalationHours: 72, status: 'Active' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#07563D]" />
            <span>Unified Approval Engine & Escalation Policies</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Dynamic approver resolution, multi-tier sequence rules, temporary delegation, and SLA escalations</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Approval Policy modal opened')}>
          Create Approval Policy
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {policies.map(p => (
          <div key={p.code} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {p.code}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{p.module} Policy</h3>
              </div>
              <Badge variant="emerald">{p.status}</Badge>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">Sequential Approver Chain</span>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 font-bold text-gray-800">
                {p.sequence.join(' → ')}
              </div>
              <p className="text-gray-500 text-[11px] font-sans">Escalates after {p.escalationHours} hours if pending.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
