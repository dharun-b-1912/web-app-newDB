import React, { useState, useEffect } from 'react';
import { tlApi } from '../../../services/tlApi';
import { TlLeaveRequestItem } from '../../../types/tl';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Calendar, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TlLeaveView: React.FC = () => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<TlLeaveRequestItem[]>([]);

  useEffect(() => {
    setRequests(tlApi.getTeamLeaveRequests());
  }, []);

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(r => (r.id === id ? { ...r, status: 'Approved' } : r)));
    showToast('Team Leave Request Approved');
  };

  const handleReject = (id: string) => {
    setRequests(prev => prev.map(r => (r.id === id ? { ...r, status: 'Rejected' } : r)));
    showToast('Team Leave Request Rejected');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#07563D]" />
            <span>Team Leave Requests & Overlapping Calendar</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Review leave requests, detect staffing availability conflicts, and approve/reject according to team thresholds</p>
        </div>

        <Badge variant="emerald">Leave Conflict Engine Active</Badge>
      </div>

      <div className="space-y-4">
        {requests.map(req => (
          <div key={req.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {req.request_code}
                </span>
                <h4 className="text-base font-extrabold text-gray-900 mt-1">{req.employee_name} ({req.leave_type})</h4>
                <p className="text-xs text-gray-500 mt-0.5">Dates: {req.start_date} to {req.end_date} ({req.days_count} Days) • Submitted: {req.submitted_date}</p>
              </div>
              <Badge variant={req.status === 'Approved' ? 'emerald' : req.status === 'Rejected' ? 'rose' : 'amber'}>
                {req.status}
              </Badge>
            </div>

            {req.conflict_warning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2 text-xs font-mono text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Availability Warning: {req.conflict_warning}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-sans text-gray-700">
              Reason: <strong>{req.reason}</strong>
            </div>

            {req.status === 'Pending' && (
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => handleApprove(req.id)}>
                  Approve Leave
                </Button>
                <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" leftIcon={<XCircle className="w-3.5 h-3.5" />} onClick={() => handleReject(req.id)}>
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
