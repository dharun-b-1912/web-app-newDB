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
  AlertTriangle,
  Check,
  X,
  Eye,
  Calendar,
  Send,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ApprovalCenterViewProps {
  onOpenRequestDetails?: (req: LeaveRequest) => void;
}

export const ApprovalCenterView: React.FC<ApprovalCenterViewProps> = ({ onOpenRequestDetails }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeQueueTab, setActiveQueueTab] = useState<'pending' | 'escalated' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [delegateToUser, setDelegateToUser] = useState('Priya Sundaram (Lead HRBP)');
  const [delegateUntil, setDelegateUntil] = useState('2026-08-30');

  useEffect(() => {
    setRequests(leaveApi.getLeaveRequests());
  }, []);

  const pendingRequests = requests.filter(r => r.status === 'Pending' || r.status === 'Submitted');
  const approvedRequests = requests.filter(r => r.status === 'Approved');
  const rejectedRequests = requests.filter(r => r.status === 'Rejected');

  // Simulated escalated requests (e.g., pending > 48 hours or flagged)
  const escalatedRequests = pendingRequests.filter((_, idx) => idx % 2 === 0);

  const displayedRequests = (
    activeQueueTab === 'pending'
      ? pendingRequests
      : activeQueueTab === 'escalated'
      ? escalatedRequests
      : activeQueueTab === 'approved'
      ? approvedRequests
      : rejectedRequests
  ).filter(
    r =>
      r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.request_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedRequests.map(r => r.id));
    }
  };

  const handleInlineApprove = (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    leaveApi.approveLeaveRequest(reqId, 'HR Approver', 'Approved via Approval Desk');
    setRequests(leaveApi.getLeaveRequests());
    setSelectedIds(prev => prev.filter(i => i !== reqId));
  };

  const handleInlineReject = (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const reason = prompt('Please enter rejection reason:');
    if (reason) {
      leaveApi.rejectLeaveRequest(reqId, 'HR Approver', reason);
      setRequests(leaveApi.getLeaveRequests());
      setSelectedIds(prev => prev.filter(i => i !== reqId));
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Approve all ${selectedIds.length} selected requests?`)) {
      selectedIds.forEach(id => {
        leaveApi.approveLeaveRequest(id, 'HR Admin (Bulk Action)', 'Bulk approved via work queue');
      });
      setRequests(leaveApi.getLeaveRequests());
      setSelectedIds([]);
    }
  };

  const handleSaveDelegation = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Approval delegation successfully activated to ${delegateToUser} until ${delegateUntil}.`);
    setIsDelegationModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#07563D]" />
            <span>Leave Approval Center & Work Queue</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Review incoming leave requests, manage SLAs, execute bulk actions, and configure delegation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkApprove}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Bulk Approve ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsDelegationModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-[#07563D]" />
            <span>Delegate Authority</span>
          </button>
        </div>
      </div>

      {/* Work Queue Tab Selectors & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'pending', label: 'Pending Review', count: pendingRequests.length },
            { id: 'escalated', label: 'Escalated / SLA', count: escalatedRequests.length },
            { id: 'approved', label: 'Approved', count: approvedRequests.length },
            { id: 'rejected', label: 'Rejected', count: rejectedRequests.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveQueueTab(tab.id as any);
                setSelectedIds([]);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeQueueTab === tab.id
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                  activeQueueTab === tab.id ? 'bg-[#07563D] text-white' : 'bg-gray-200 text-gray-700'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter queue by employee, ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-white w-full"
          />
        </div>
      </div>

      {/* Pending Queue Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {displayedRequests.length === 0 ? (
          <div className="text-center py-16 text-xs text-gray-400 space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto opacity-40" />
            <p>No requests found in this queue.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === displayedRequests.length}
                    onChange={toggleSelectAll}
                    className="rounded text-[#07563D]"
                  />
                </th>
                <th className="p-4">Employee</th>
                <th className="p-4">Leave Type</th>
                <th className="p-4">Dates</th>
                <th className="p-4 text-center">Deduction</th>
                <th className="p-4">SLA / Status</th>
                <th className="p-4">Reason / Notes</th>
                <th className="p-4 text-right">Quick Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {displayedRequests.map((req, idx) => {
                const isSelected = selectedIds.includes(req.id);
                const isSlaBreached = idx % 2 === 0 && (req.status === 'Pending' || req.status === 'Submitted');

                return (
                  <tr
                    key={req.id}
                    onClick={() => onOpenRequestDetails?.(req)}
                    className={cn(
                      'hover:bg-gray-50/60 transition-colors cursor-pointer',
                      isSelected && 'bg-emerald-50/40'
                    )}
                  >
                    <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(req.id)}
                        className="rounded text-[#07563D]"
                      />
                    </td>

                    <td className="p-4">
                      <strong className="text-gray-900 font-extrabold block">{req.employee_name}</strong>
                      <span className="text-[11px] text-gray-400 font-mono">{req.department_name}</span>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-gray-800 block">{req.leave_type_name}</span>
                      <span className="text-[10px] text-gray-400">{req.leave_category}</span>
                    </td>

                    <td className="p-4 font-mono text-gray-700">
                      {req.from_date} → {req.to_date}
                      <span className="block text-[10px] text-gray-400">
                        {req.total_calendar_days} Cal Days
                      </span>
                    </td>

                    <td className="p-4 text-center font-mono font-bold text-gray-900 text-sm">
                      {req.leave_days_deducted} d
                    </td>

                    <td className="p-4">
                      {req.status === 'Approved' ? (
                        <Badge variant="emerald" size="sm">Approved</Badge>
                      ) : req.status === 'Rejected' ? (
                        <Badge variant="rose" size="sm">Rejected</Badge>
                      ) : isSlaBreached ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          SLA &gt; 48h
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          24h SLA Active
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-gray-600 max-w-xs">
                      <p className="line-clamp-1 italic text-[11px]">{req.reason || 'No comments provided'}</p>
                    </td>

                    <td className="p-4 text-right">
                      {(req.status === 'Pending' || req.status === 'Submitted') ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={e => handleInlineApprove(req.id, e)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-700 hover:text-white text-emerald-800 transition-colors cursor-pointer"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => handleInlineReject(req.id, e)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-700 hover:text-white text-rose-800 transition-colors cursor-pointer"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onOpenRequestDetails?.(req);
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delegation Modal */}
      {isDelegationModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2 text-[#07563D]">
                <UserCheck className="w-5 h-5" />
                <h3 className="text-sm font-black text-gray-900">Delegate Approval Authority</h3>
              </div>
              <button
                onClick={() => setIsDelegationModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDelegation} className="p-6 space-y-4 text-xs">
              <p className="text-gray-600 leading-relaxed">
                When you are out of office or on leave, incoming leave approval requests will be automatically routed to your chosen delegate.
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Delegate To Employee *</label>
                <select
                  value={delegateToUser}
                  onChange={e => setDelegateToUser(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white"
                >
                  <option>Priya Sundaram (Lead HRBP)</option>
                  <option>Karthik Raja (Engineering Manager)</option>
                  <option>Ananya Sharma (Senior HR Lead)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Delegation Active Until *</label>
                <input
                  type="date"
                  required
                  value={delegateUntil}
                  onChange={e => setDelegateUntil(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold font-mono bg-white"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDelegationModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white font-bold shadow-xs cursor-pointer"
                >
                  Activate Delegation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
