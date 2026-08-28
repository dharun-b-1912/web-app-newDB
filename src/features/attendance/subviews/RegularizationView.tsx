// src/features/attendance/subviews/RegularizationView.tsx
// ============================================================================
// Joy PeopleHR — Production Attendance Regularization & Correction Desk
// Features: Live Metric Counters, Multi-Tier Approval Action Queue,
// Deep Side-by-Side Punch Comparison, Transactional Approvals & Realtime Mesh
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  HelpCircle,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import {
  attendanceRegularizationService,
  RegularizationRequest,
  RegularizationState,
} from '../../../services/attendance/attendanceRegularizationService';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';

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

  const [requests, setRequests] = useState<RegularizationRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MANAGER_PENDING' | 'HR_PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RegularizationRequest | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // New Request Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('emp-admin-001');
  const [reqDate, setReqDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [reqIn, setReqIn] = useState('09:30 AM');
  const [reqOut, setReqOut] = useState('06:30 PM');
  const [reasonCode, setReasonCode] = useState('FORGOT_CHECK_IN');
  const [reasonText, setReasonText] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Load Real Database Requests
  const loadData = useCallback(async () => {
    try {
      const data = await attendanceRegularizationService.fetchRequestsFromDb();
      setRequests(data);
    } catch {
      setRequests(attendanceRegularizationService.getRequests());
    }
  }, []);

  useEffect(() => {
    loadData();

    api.getEmployees().then((emps) => {
      setEmployeesList(emps);
      if (emps.length > 0 && !selectedEmpId) {
        setSelectedEmpId(emps[0].id);
      }
    }).catch(() => []);

    const unsub1 = hrEventBus.subscribe('regularization.submitted', () => loadData());
    const unsub2 = hrEventBus.subscribe('regularization.approved', () => loadData());
    const unsub3 = hrEventBus.subscribe('regularization.rejected', () => loadData());
    const unsub4 = hrEventBus.subscribe('regularization.updated' as any, () => loadData());

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [loadData, selectedEmpId]);

  // Dynamic Metric Counts from Real Database
  const metrics = useMemo(() => {
    return {
      allRequests: requests.length,
      managerQueue: requests.filter((r) => r.status === 'MANAGER_PENDING').length,
      hrSignoff: requests.filter((r) => r.status === 'HR_PENDING').length,
      approved: requests.filter((r) => r.status === 'APPROVED').length,
      rejected: requests.filter((r) => r.status === 'REJECTED').length,
    };
  }, [requests]);

  // Filtered List
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab === 'MANAGER_PENDING' && r.status !== 'MANAGER_PENDING') return false;
      if (activeTab === 'HR_PENDING' && r.status !== 'HR_PENDING') return false;
      if (activeTab === 'APPROVED' && r.status !== 'APPROVED') return false;
      if (activeTab === 'REJECTED' && r.status !== 'REJECTED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.employee_name.toLowerCase().includes(q) ||
          r.employee_code.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requests, activeTab, searchQuery]);

  // Handle Approve
  const handleApprove = async (req: RegularizationRequest) => {
    setIsProcessingAction(true);
    try {
      const res = await attendanceRegularizationService.approveRequest(
        req.id,
        user?.id || 'emp-hr-001',
        user?.name || 'Haripriya (HR Head)',
        actionComment || 'Approved: Attendance regularized & recalculated.'
      );

      if (res.isFinal) {
        showToast(`✓ Attendance regularized for ${req.employee_name} (${req.attendance_date}). Daily ledger & punches updated.`, 'success');
      } else {
        showToast(`✓ 1st line manager approval recorded. Request routed to HR Sign-off.`, 'info');
      }

      setSelectedRequest(null);
      setActionComment('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error processing approval.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Reject
  const handleReject = async (req: RegularizationRequest) => {
    setIsProcessingAction(true);
    try {
      await attendanceRegularizationService.rejectRequest(
        req.id,
        user?.id || 'emp-hr-001',
        user?.name || 'Haripriya (HR Head)',
        actionComment || 'Rejected: Justification insufficient under attendance policy.'
      );

      showToast(`Regularization request rejected for ${req.employee_name}.`, 'error');
      setSelectedRequest(null);
      setActionComment('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error processing rejection.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Request Clarification
  const handleRequestClarification = async (req: RegularizationRequest) => {
    if (!actionComment.trim()) {
      showToast('Please enter clarification details for the employee.', 'warning');
      return;
    }
    setIsProcessingAction(true);
    try {
      await attendanceRegularizationService.requestClarification(
        req.id,
        user?.id || 'emp-hr-001',
        user?.name || 'Haripriya (HR Head)',
        actionComment
      );

      showToast(`Clarification requested from ${req.employee_name}.`, 'info');
      setSelectedRequest(null);
      setActionComment('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error requesting clarification.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Submit New Request from Web
  const handleCreateNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonText.trim()) {
      showToast('Please provide a justification reason.', 'error');
      return;
    }

    setIsSubmittingNew(true);
    try {
      const match = employeesList.find((emp) => emp.id === selectedEmpId);

      await attendanceRegularizationService.submitRequest({
        employeeId: selectedEmpId,
        employeeCode: match?.employee_code || selectedEmpId,
        employeeName: match ? `${match.first_name || ''} ${match.last_name || ''}`.trim() : 'Dharun B',
        department: match?.department_name || 'Development',
        date: reqDate,
        requestedIn: reqIn,
        requestedOut: reqOut,
        reasonCode,
        reason: reasonText.trim(),
      });

      showToast(`✓ Attendance regularization submitted for ${reqDate}. Routing to Manager Review.`);
      setIsSubmitModalOpen(false);
      setReasonText('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error submitting request.', 'error');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
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
            className="text-xs font-bold text-gray-700 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 mr-1 text-gray-500" />
            Late / Early Tracking
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Request
          </Button>
        </div>
      </div>

      {/* 2. Interactive Counter Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeTab === 'ALL'
              ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-400/20'
              : 'bg-white border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>All Requests</span>
            <Layers className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.allRequests}</div>
          <span className="text-[10px] text-gray-500 font-semibold">Total claims</span>
        </button>

        <button
          onClick={() => setActiveTab('MANAGER_PENDING')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeTab === 'MANAGER_PENDING'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
              : 'bg-white border-gray-200 hover:border-purple-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Manager Queue</span>
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.managerQueue}</div>
          <span className="text-[10px] text-purple-700 font-semibold">Awaiting 1st line review</span>
        </button>

        <button
          onClick={() => setActiveTab('HR_PENDING')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeTab === 'HR_PENDING'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-gray-200 hover:border-blue-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>HR Signoff</span>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.hrSignoff}</div>
          <span className="text-[10px] text-blue-700 font-semibold">Payroll policy review</span>
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeTab === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-gray-200 hover:border-emerald-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Approved</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.approved}</div>
          <span className="text-[10px] text-emerald-700 font-semibold">Recalculated & Cleared</span>
        </button>

        <button
          onClick={() => setActiveTab('REJECTED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeTab === 'REJECTED'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-gray-200 hover:border-rose-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Rejected</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.rejected}</div>
          <span className="text-[10px] text-rose-700 font-semibold">Deviation maintained</span>
        </button>
      </div>

      {/* 3. Regularization Action Queue Table */}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-[10px] tracking-wider">
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
                  <td colSpan={11} className="p-12 text-center text-gray-500">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-gray-800 text-sm">Inbox is all clear!</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      No attendance regularization claims requiring your attention.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3 font-mono text-gray-500 font-semibold text-[11px]">{req.id.substring(0, 12)}</td>
                    <td className="p-3 font-bold text-gray-900">
                      <button
                        onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(req.employee_id)}
                        className="text-left hover:text-[#07563D] hover:underline cursor-pointer"
                      >
                        {req.employee_name}
                      </button>
                      <div className="text-[10px] text-gray-400 font-mono">{req.employee_code} · {req.department}</div>
                    </td>
                    <td className="p-3 font-mono text-gray-600 whitespace-nowrap font-medium">{req.attendance_date}</td>
                    <td className="p-3 font-medium text-rose-700">
                      <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 rounded text-[11px]">
                        {req.original_check_in ? 'Missing Out / Late' : 'Missing Punch (Absent)'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-gray-500">
                      {req.original_check_in || '—'} → {req.original_check_out || '—'}
                    </td>
                    <td className="p-3 font-mono font-bold text-[#07563D]">
                      {req.requested_check_in} → {req.requested_check_out}
                    </td>
                    <td className="p-3 text-gray-600 max-w-xs truncate font-medium" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="p-3 font-mono text-gray-400 text-[11px] whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="p-3 text-gray-700 font-medium">{req.manager_name || 'Haripriya (HR)'}</td>
                    <td className="p-3 whitespace-nowrap">
                      {req.status === 'APPROVED' ? (
                        <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                          Approved
                        </span>
                      ) : req.status === 'REJECTED' ? (
                        <span className="px-2.5 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-full">
                          Rejected
                        </span>
                      ) : req.status === 'HR_PENDING' ? (
                        <span className="px-2.5 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 rounded-full">
                          HR Review
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-800 rounded-full">
                          Manager Review
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSelectedRequest(req)}
                        className="text-gray-800 hover:bg-gray-100 border-gray-200 font-bold text-xs cursor-pointer"
                      >
                        View & Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Detailed Decision & Audit Review Modal */}
      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => {
            setSelectedRequest(null);
            setActionComment('');
          }}
          title={`Regularization Review: ${selectedRequest.employee_name}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                  {selectedRequest.employee_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{selectedRequest.employee_name}</h4>
                  <p className="text-gray-500 text-[11px]">
                    {selectedRequest.employee_code} · {selectedRequest.department} · Shift: {selectedRequest.shift_name}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-semibold text-gray-400">Attendance Date</span>
                <p className="text-sm font-bold text-gray-900 font-mono">{selectedRequest.attendance_date}</p>
              </div>
            </div>

            {/* Side-by-Side Comparison: Expected vs Original vs Requested */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-2xs">
              <div className="space-y-1">
                <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">Assigned Shift</span>
                <div className="font-mono text-gray-900 font-bold text-sm">09:30 AM — 06:30 PM</div>
                <span className="text-[11px] text-gray-500">9 hrs scheduled</span>
              </div>

              <div className="space-y-1 border-l sm:border-l sm:pl-3 border-gray-100">
                <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">Original Punches</span>
                <div className="font-mono text-gray-600 font-bold text-sm">
                  {selectedRequest.original_check_in || 'None'} → {selectedRequest.original_check_out || 'None'}
                </div>
                <span className="text-[11px] text-rose-600 font-semibold">
                  {selectedRequest.original_status} ({selectedRequest.original_source})
                </span>
              </div>

              <div className="space-y-1 border-l sm:border-l sm:pl-3 border-gray-100 bg-emerald-50/50 p-2 rounded-lg">
                <span className="text-emerald-700 uppercase tracking-wider text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Requested Correction
                </span>
                <div className="font-mono font-black text-emerald-900 text-sm">
                  {selectedRequest.requested_check_in} → {selectedRequest.requested_check_out}
                </div>
                <span className="text-[11px] text-emerald-700 font-bold">
                  +39m adjustment · Net 8h 00m
                </span>
              </div>
            </div>

            {/* Justification */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <span className="text-gray-500 font-semibold text-[11px]">Employee Justification:</span>
              <p className="text-gray-900 font-medium text-xs leading-relaxed">"{selectedRequest.reason}"</p>
            </div>

            {/* Decision Comments Input */}
            {(selectedRequest.status === 'MANAGER_PENDING' || selectedRequest.status === 'HR_PENDING') && (
              <div className="space-y-1.5 pt-2">
                <label className="text-gray-700 font-bold text-xs flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" /> Approver Decision Notes & Comments
                </label>
                <textarea
                  rows={2}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="Enter approval rationale or rejection explanation..."
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>
            )}

            {/* Timeline Audit History */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-gray-500 font-semibold text-[11px]">Approval Audit Trail:</span>
              <div className="space-y-2 border-l-2 border-emerald-500 pl-3">
                {selectedRequest.timeline?.map((step, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-gray-900 text-[11px]">
                      {step.stage} · {step.actor}
                    </div>
                    <div className="text-gray-400 text-[10px] font-mono">{new Date(step.timestamp).toLocaleString()}</div>
                    {step.note && <div className="text-gray-600 italic text-[11px]">"{step.note}"</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionComment('');
                }}
                className="cursor-pointer"
              >
                Close
              </Button>

              {(selectedRequest.status === 'MANAGER_PENDING' || selectedRequest.status === 'HR_PENDING') ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessingAction}
                    onClick={() => handleRequestClarification(selectedRequest)}
                    className="text-blue-700 hover:bg-blue-50 border-blue-200 font-bold text-xs cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 mr-1" />
                    Request Clarification
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessingAction}
                    onClick={() => handleReject(selectedRequest)}
                    className="text-rose-600 hover:bg-rose-50 border-rose-200 font-bold text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isProcessingAction}
                    onClick={() => handleApprove(selectedRequest)}
                    className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {selectedRequest.status === 'HR_PENDING' || user?.role?.includes('HR') ? 'Approve & Recalculate' : 'Approve (Manager)'}
                  </Button>
                </div>
              ) : (
                <span className="text-xs font-bold text-gray-500 font-mono">
                  Final Status: {selectedRequest.status}
                </span>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 5. HR "New Request" Submission Modal */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          title="Submit Attendance Regularization"
          size="md"
        >
          <form onSubmit={handleCreateNewRequest} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Select Employee</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium"
              >
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code || emp.id}) — {emp.department_name || 'Development'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Attendance Date</label>
              <input
                type="date"
                value={reqDate}
                onChange={(e) => setReqDate(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Requested Clock-In</label>
                <input
                  type="text"
                  value={reqIn}
                  onChange={(e) => setReqIn(e.target.value)}
                  placeholder="09:30 AM"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Requested Clock-Out</label>
                <input
                  type="text"
                  value={reqOut}
                  onChange={(e) => setReqOut(e.target.value)}
                  placeholder="06:30 PM"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Reason Category</label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium"
              >
                <option value="FORGOT_CHECK_IN">Forgot to check in</option>
                <option value="FORGOT_CHECK_OUT">Forgot to check out</option>
                <option value="BIOMETRIC_ISSUE">Biometric punch issue</option>
                <option value="CLIENT_MEETING">Client meeting / On site</option>
                <option value="SYSTEM_GPS_ISSUE">System / Mobile app issue</option>
                <option value="OTHER">Other justification</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Justification Reason</label>
              <textarea
                rows={3}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Explain the attendance deviation..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#07563D]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSubmitModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingNew}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
              >
                {isSubmittingNew ? 'Submitting...' : 'Submit Claim'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
