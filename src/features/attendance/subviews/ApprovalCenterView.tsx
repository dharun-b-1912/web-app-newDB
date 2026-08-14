import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Check, X, ShieldCheck, Clock, FileText, Filter } from 'lucide-react';
import { attendanceApi } from '../../../services/attendanceApi';
import { useToast } from '../../../components/ui/Toast';

export const ApprovalCenterView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'All' | 'Regularization' | 'Overtime' | 'WFH'>('All');

  const regularizations = attendanceApi.getRegularizations().filter(r => r.status === 'Pending Manager');
  const overtimes = attendanceApi.getOvertimeRequests().filter(r => r.status === 'Pending');
  const wfhs = attendanceApi.getWfhRequests().filter(r => r.status === 'Pending Approval');

  const handleApproveAll = () => {
    regularizations.forEach(r => attendanceApi.approveRegularization(r.id, 'Approved'));
    overtimes.forEach(o => attendanceApi.approveOvertime(o.id, 'Approved'));
    wfhs.forEach(w => attendanceApi.approveWfh(w.id, 'Approved'));
    showToast('Batch approved all pending attendance, overtime, and WFH requests!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Unified Attendance Approval Center</h2>
          <p className="text-xs text-gray-500 mt-1">
            Manager sign-off portal for regularization requests, overtime pre-approvals, WFH requests, and late arrival exceptions
          </p>
        </div>
        <Button size="sm" className="bg-[#07563D]" leftIcon={<ShieldCheck className="w-4 h-4" />} onClick={handleApproveAll}>
          Approve All Pending ({regularizations.length + overtimes.length + wfhs.length})
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        {(['All', 'Regularization', 'Overtime', 'WFH'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-[#07563D] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {(activeTab === 'All' || activeTab === 'Regularization') && regularizations.map(r => (
          <Card key={r.id} className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="amber" size="xs">Regularization Request</Badge>
                <span className="text-xs font-bold text-gray-900">{r.employee_name}</span>
                <span className="text-xs text-gray-400">• {r.attendance_date}</span>
              </div>
              <p className="text-xs text-gray-700">{r.reason}</p>
              <div className="text-[10px] font-mono text-emerald-800">Requested: In {r.requested_check_in} | Out {r.requested_check_out}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="xs" variant="outline" className="text-emerald-700 border-emerald-300" onClick={() => { attendanceApi.approveRegularization(r.id, 'Approved'); showToast('Approved'); }}>
                Approve
              </Button>
              <Button size="xs" variant="outline" className="text-rose-700 border-rose-300" onClick={() => { attendanceApi.approveRegularization(r.id, 'Rejected'); showToast('Rejected'); }}>
                Reject
              </Button>
            </div>
          </Card>
        ))}

        {(activeTab === 'All' || activeTab === 'Overtime') && overtimes.map(o => (
          <Card key={o.id} className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="purple" size="xs">Overtime ({o.estimated_hours}h)</Badge>
                <span className="text-xs font-bold text-gray-900">{o.employee_name}</span>
                <span className="text-xs text-gray-400">• {o.date}</span>
              </div>
              <p className="text-xs text-gray-700">{o.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="xs" variant="outline" className="text-emerald-700 border-emerald-300" onClick={() => { attendanceApi.approveOvertime(o.id, 'Approved'); showToast('Approved'); }}>
                Approve
              </Button>
              <Button size="xs" variant="outline" className="text-rose-700 border-rose-300" onClick={() => { attendanceApi.approveOvertime(o.id, 'Rejected'); showToast('Rejected'); }}>
                Reject
              </Button>
            </div>
          </Card>
        ))}

        {(activeTab === 'All' || activeTab === 'WFH') && wfhs.map(w => (
          <Card key={w.id} className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="purple" size="xs">WFH Request ({w.total_days} Days)</Badge>
                <span className="text-xs font-bold text-gray-900">{w.employee_name}</span>
                <span className="text-xs text-gray-400">• {w.from_date} to {w.to_date}</span>
              </div>
              <p className="text-xs text-gray-700">{w.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="xs" variant="outline" className="text-emerald-700 border-emerald-300" onClick={() => { attendanceApi.approveWfh(w.id, 'Approved'); showToast('Approved'); }}>
                Approve
              </Button>
              <Button size="xs" variant="outline" className="text-rose-700 border-rose-300" onClick={() => { attendanceApi.approveWfh(w.id, 'Rejected'); showToast('Rejected'); }}>
                Reject
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
