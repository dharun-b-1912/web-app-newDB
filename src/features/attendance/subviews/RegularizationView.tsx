import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import {
  FileEdit,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  FileText,
  UserCheck,
  Check,
  X,
  Send,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import {
  attendanceOperationsEngine,
  RegularizationItem,
  RegularizationStatus,
} from '../../../services/attendance/attendanceOperationsEngine';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';

export interface RegularizationViewProps {
  onNavigateSubPath?: (subPath: string) => void;
  onOpenEmployeeProfile?: (empId: string) => void;
}

export const RegularizationView: React.FC<RegularizationViewProps> = ({
  onNavigateSubPath,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [requests, setRequests] = useState<RegularizationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY_PENDING' | 'MANAGER_PENDING' | 'HR_PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RegularizationItem | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  // Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [empName, setEmpName] = useState(user?.name || '');
  const [empCode, setEmpCode] = useState(user?.id || '');
  const [reqDate, setReqDate] = useState(new Date().toISOString().split('T')[0]);
  const [reqIn, setReqIn] = useState('09:00 AM');
  const [reqOut, setReqOut] = useState('06:00 PM');
  const [reason, setReason] = useState('');

  const loadData = () => {
    const list = attendanceOperationsEngine.getRegularizations();
    setRequests(list);
  };

  useEffect(() => {
    loadData();
    const unsub1 = hrEventBus.subscribe('regularization.submitted', () => loadData());
    const unsub2 = hrEventBus.subscribe('regularization.approved', () => loadData());
    const unsub3 = hrEventBus.subscribe('regularization.rejected', () => loadData());
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (activeTab === 'MANAGER_PENDING' && r.status !== 'Pending Manager') return false;
      if (activeTab === 'HR_PENDING' && r.status !== 'Pending HR') return false;
      if (activeTab === 'APPROVED' && r.status !== 'Approved') return false;
      if (activeTab === 'REJECTED' && r.status !== 'Rejected') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.employee_name.toLowerCase().includes(q) ||
          r.employee_code.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requests, activeTab, searchQuery]);

  const handleApprove = (req: RegularizationItem) => {
    attendanceOperationsEngine.approveRegularization(
      req.id,
      user?.name || 'Authorized Approver',
      approvalComment || 'Approved: Attendance regularized & recalculated.'
    );
    showToast(`✓ Regularization request approved for ${req.employee_name}. Attendance recalculation triggered.`);
    setSelectedRequest(null);
    setApprovalComment('');
    loadData();
  };

  const handleReject = (req: RegularizationItem) => {
    attendanceOperationsEngine.rejectRegularization(
      req.id,
      user?.name || 'Authorized Approver',
      approvalComment || 'Rejected: Justification insufficient under attendance policy.'
    );
    showToast(`Regularization request rejected for ${req.employee_name}.`, 'error');
    setSelectedRequest(null);
    setApprovalComment('');
    loadData();
  };

  const handleCreateManualRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please provide a reason for regularization.', 'error');
      return;
    }

    attendanceOperationsEngine.submitRegularizationFromLateEarly('manual', {
      requested_in: reqIn,
      requested_out: reqOut,
      reason,
      submitted_by: user?.name || empName,
    });

    showToast('✓ Regularization request submitted successfully.');
    setIsSubmitModalOpen(false);
    setReason('');
    loadData();
  };

  // Metric counts
  const totalCount = requests.length;
  const managerPendingCount = requests.filter(r => r.status === 'Pending Manager').length;
  const hrPendingCount = requests.filter(r => r.status === 'Pending HR').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const rejectedCount = requests.filter(r => r.status === 'Rejected').length;

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <FileEdit className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Regularization Desk</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-100 text-purple-800 rounded-full">
              Correction & Approval Inbox
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review, correct, and approve attendance deviations, missing punches, and late arrival justifications.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('late-early');
            }}
            className="text-xs font-bold text-gray-700"
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
            Late / Early Tracking
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Request
          </Button>
        </div>
      </div>

      {/* 2. Compact Status Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'ALL' ? "bg-gray-100 border-gray-400 ring-2 ring-gray-400/20" : "bg-white border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>All Requests</span>
            <Layers className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{totalCount}</div>
          <span className="text-[10px] text-gray-500 font-semibold">Total claims</span>
        </button>

        <button
          onClick={() => setActiveTab('MANAGER_PENDING')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'MANAGER_PENDING' ? "bg-purple-50 border-purple-300 ring-2 ring-purple-500/20" : "bg-white border-gray-200 hover:border-purple-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Manager Queue</span>
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{managerPendingCount}</div>
          <span className="text-[10px] text-purple-700 font-semibold">Awaiting 1st line review</span>
        </button>

        <button
          onClick={() => setActiveTab('HR_PENDING')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'HR_PENDING' ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20" : "bg-white border-gray-200 hover:border-blue-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>HR Signoff</span>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{hrPendingCount}</div>
          <span className="text-[10px] text-blue-700 font-semibold">Payroll policy review</span>
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'APPROVED' ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20" : "bg-white border-gray-200 hover:border-emerald-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Approved</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{approvedCount}</div>
          <span className="text-[10px] text-emerald-700 font-semibold">Recalculated & Cleared</span>
        </button>

        <button
          onClick={() => setActiveTab('REJECTED')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'REJECTED' ? "bg-rose-50 border-rose-300 ring-2 ring-rose-500/20" : "bg-white border-gray-200 hover:border-rose-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Rejected</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{rejectedCount}</div>
          <span className="text-[10px] text-rose-700 font-semibold">Deviation maintained</span>
        </button>
      </div>

      {/* 3. Action Inbox Workspace Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-gray-900">Regularization Action Queue</h3>
            <span className="text-xs text-gray-500">({filteredRequests.length} in inbox)</span>
          </div>

          <div className="relative text-xs">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search request or reason..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">Req ID</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Date</th>
                <th className="p-3">Attendance Issue</th>
                <th className="p-3">Original Punch</th>
                <th className="p-3">Requested Punch</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Submitted On</th>
                <th className="p-3">Approver</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold text-gray-800">Inbox is all clear!</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">No attendance regularization claims requiring your attention.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50/70">
                    <td className="p-3 font-mono text-gray-500">{req.id}</td>
                    <td className="p-3 font-bold text-gray-900">
                      <button
                        onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(req.employee_id)}
                        className="text-left hover:text-[#07563D] hover:underline"
                      >
                        {req.employee_name}
                      </button>
                      <div className="text-[10px] text-gray-400 font-mono">{req.employee_code}</div>
                    </td>
                    <td className="p-3 font-mono text-gray-600 whitespace-nowrap">{req.date}</td>
                    <td className="p-3 font-medium text-rose-700">{req.issue_type}</td>
                    <td className="p-3 font-mono text-gray-500">{req.original_in} - {req.original_out}</td>
                    <td className="p-3 font-mono font-bold text-[#07563D]">{req.requested_in} - {req.requested_out}</td>
                    <td className="p-3 text-gray-600 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                    <td className="p-3 font-mono text-gray-400 text-[11px] whitespace-nowrap">{req.submitted_at}</td>
                    <td className="p-3 text-gray-700">{req.approver_name}</td>
                    <td className="p-3 whitespace-nowrap">
                      {req.status === 'Approved' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          Approved
                        </span>
                      ) : req.status === 'Rejected' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">
                          Rejected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded">
                          {req.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {req.status === 'Pending Manager' || req.status === 'Pending HR' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => handleApprove(req)}
                            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleReject(req)}
                            className="text-rose-600 hover:bg-rose-50 border-rose-200 font-bold text-xs"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="text-[#07563D] hover:underline font-bold text-xs"
                        >
                          View Audit Trace
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. DETAIL DRAWER / AUDIT MODAL */}
      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={`Regularization Audit: ${selectedRequest.id}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">{selectedRequest.employee_name} ({selectedRequest.employee_code})</span>
                <span className="text-gray-500">{selectedRequest.department}</span>
              </div>
              <p className="text-gray-600">Attendance Date: <span className="font-semibold text-gray-900">{selectedRequest.date}</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-500 font-semibold">Original System Record:</span>
                <div className="font-mono text-gray-900 mt-0.5">{selectedRequest.original_in} - {selectedRequest.original_out}</div>
              </div>
              <div>
                <span className="text-gray-500 font-semibold">Approved Correction:</span>
                <div className="font-mono font-bold text-[#07563D] mt-0.5">{selectedRequest.requested_in} - {selectedRequest.requested_out}</div>
              </div>
            </div>

            <div>
              <span className="text-gray-500 font-semibold">Employee Justification:</span>
              <p className="p-2.5 bg-gray-50 rounded-lg text-gray-800 mt-1">{selectedRequest.reason}</p>
            </div>

            <div>
              <span className="text-gray-500 font-semibold">Approval & Calculation Timeline:</span>
              <div className="mt-2 space-y-2 border-l-2 border-emerald-500 pl-3">
                {selectedRequest.timeline?.map((step, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-gray-900">{step.stage} • {step.actor}</div>
                    <div className="text-gray-500 text-[11px] font-mono">{step.timestamp}</div>
                    {step.note && <div className="text-gray-600 italic text-[11px]">"{step.note}"</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>
                Close Audit
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. MANUAL REQUEST MODAL */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          title="Create New Attendance Regularization Claim"
          size="md"
        >
          <form onSubmit={handleCreateManualRequest} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Employee Name</label>
                <input
                  type="text"
                  value={empName}
                  onChange={e => setEmpName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Attendance Date</label>
                <input
                  type="date"
                  value={reqDate}
                  onChange={e => setReqDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Requested Check-In</label>
                <input
                  type="text"
                  value={reqIn}
                  onChange={e => setReqIn(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Requested Check-Out</label>
                <input
                  type="text"
                  value={reqOut}
                  onChange={e => setReqOut(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Reason & Justification *</label>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain the attendance issue..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsSubmitModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Submit Request
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
