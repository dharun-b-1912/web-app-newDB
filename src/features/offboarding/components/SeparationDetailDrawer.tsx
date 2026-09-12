import React, { useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { offboardingService } from '../../../services/offboardingService';
import { payrollApi } from '../../../services/payrollApi';
import {
  EmployeeSeparation,
  ClearanceStatus,
  AssetRecoveryStatus,
  RetentionStatus,
  FnFStatus,
} from '../../../types';
import {
  X,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Laptop,
  Calculator,
  CreditCard,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Building,
  RotateCcw,
  Sparkles,
  ChevronRight,
  MessageSquare,
  HelpCircle,
  CheckSquare,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface SeparationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  separation: EmployeeSeparation | null;
  onRefresh: () => void;
  onOpenNoticeModal: (sep: EmployeeSeparation) => void;
  onOpenExitInterviewModal: (sep: EmployeeSeparation) => void;
}

export const SeparationDetailDrawer: React.FC<SeparationDetailDrawerProps> = ({
  isOpen,
  onClose,
  separation,
  onRefresh,
  onOpenNoticeModal,
  onOpenExitInterviewModal,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'clearance' | 'assets' | 'tasks' | 'exit_interview' | 'fnf' | 'audit'
  >('overview');

  // Exception modal state
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState<boolean>(false);
  const [exceptionReason, setExceptionReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Clearance comment state
  const [activeClearanceCommentId, setActiveClearanceCommentId] = useState<string | null>(null);
  const [clearanceComment, setClearanceComment] = useState<string>('');

  if (!isOpen || !separation) return null;

  const emp = separation.employee;
  const fullName = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee';
  const progressPct = separation.progress_percentage || 0;
  const fnfSettlement = separation ? payrollApi.getFnFSettlements().find(s => s.separation_id === separation.id || s.employee_id === separation.employee_id) : null;

  const handleGenerateFnF = () => {
    try {
      const lwd = separation.actual_last_working_date || separation.approved_last_working_date || separation.expected_last_working_date || new Date().toISOString().split('T')[0];
      const resDate = separation.resignation_date || new Date().toISOString().split('T')[0];
      const rDate = new Date(resDate);
      const lDate = new Date(lwd);
      const served = Math.max(0, Math.round((lDate.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24)));
      const required = separation.notice_period_days || 30;
      const leaveDays = separation.fnf_readiness?.leave_encashment_days || 12;
      const assetDeds = (separation.assets || []).reduce((sum, a) => {
        if (a.recovery_status === 'DAMAGED' || a.recovery_status === 'MISSING') {
          return sum + (Number(a.financial_recovery_amount) || 0);
        }
        return sum;
      }, 0);

      payrollApi.calculateFnFSettlement(
        separation.employee_id,
        resDate,
        lwd,
        required,
        served,
        leaveDays,
        'HR Administrator',
        undefined,
        {
          separation_id: separation.id,
          asset_recovery_deduction: assetDeds,
        }
      );
      showToast('✓ Generated F&F Settlement Draft in Core Payroll Engine', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate F&F', 'error');
    }
  };

  // Clearance handler
  const handleUpdateClearance = async (clearanceId: string, status: ClearanceStatus) => {
    try {
      await offboardingService.updateClearance(clearanceId, {
        status,
        comments: clearanceComment || undefined,
      });
      showToast(`Clearance marked as ${status}`, 'success');
      setActiveClearanceCommentId(null);
      setClearanceComment('');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update clearance', 'error');
    }
  };

  // Asset recovery handler
  const handleUpdateAsset = async (assetId: string, recoveryStatus: AssetRecoveryStatus) => {
    try {
      await offboardingService.updateAssetRecovery(assetId, {
        recovery_status: recoveryStatus,
      });
      showToast(`Asset marked as ${recoveryStatus}`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update asset status', 'error');
    }
  };

  // Manager action handler
  const handleManagerAction = async (action: 'RECOMMEND_RELEASE' | 'REQUEST_RETENTION' | 'REQUEST_CHANGE') => {
    try {
      await offboardingService.managerReview(separation.id, { action });
      showToast(`Manager review submitted: ${action}`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit manager review', 'error');
    }
  };

  // Retention status handler
  const handleRetentionUpdate = async (status: RetentionStatus) => {
    try {
      await offboardingService.updateRetentionStatus(
        separation.id,
        status,
        status === 'RETAINED' ? 'Retention discussion successful. Resignation withdrawn.' : 'Exit will proceed.'
      );
      showToast(`Retention status updated to ${status}`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update retention status', 'error');
    }
  };

  // Final exit execution
  const handleCompleteSeparation = async (withException: boolean = false) => {
    setIsProcessing(true);
    try {
      await offboardingService.completeSeparation(separation.id, {
        allow_exception: withException,
        exception_reason: withException ? exceptionReason : undefined,
      });
      showToast('Separation completed successfully! Employee status updated to EXITED.', 'success');
      setIsExceptionModalOpen(false);
      onRefresh();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete separation', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Resignation withdrawal
  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this resignation and restore the employee to active status?')) return;
    try {
      await offboardingService.withdrawResignation(separation.id, 'Withdrawn by employee/HR request');
      showToast('Resignation withdrawn successfully.', 'success');
      onRefresh();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to withdraw resignation', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="emerald" className="font-bold">COMPLETED / EXITED</Badge>;
      case 'READY_TO_EXIT':
        return <Badge variant="emerald" className="font-bold">READY FOR EXIT</Badge>;
      case 'NOTICE_PERIOD':
        return <Badge variant="amber" className="font-bold">NOTICE PERIOD</Badge>;
      case 'CLEARANCE':
        return <Badge variant="info" className="font-bold">CLEARANCE PENDING</Badge>;
      case 'FNF_PROCESSING':
        return <Badge variant="purple" className="font-bold">F&F PROCESSING</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral" className="font-bold">WITHDRAWN / RETAINED</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" className="font-bold">REJECTED</Badge>;
      default:
        return <Badge variant="amber" className="font-bold">{status}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-4xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#07563D] text-white font-extrabold text-xl flex items-center justify-center shadow-md">
              {fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-gray-900">{fullName}</h2>
                <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  {emp?.employee_code || separation.employee_id}
                </span>
                {getStatusBadge(separation.status)}
              </div>
              <p className="text-xs text-gray-600 mt-1 flex items-center gap-3">
                <span>{emp?.designation_title || 'Designation'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-gray-400" />
                  {emp?.department_name || 'Engineering'}
                </span>
                <span>•</span>
                <span>Manager: <strong className="text-gray-900">{emp?.employment?.reporting_manager_name || 'Dharun Joy'}</strong></span>
                {separation.employment_source === 'VENDOR' && (
                  <>
                    <span>•</span>
                    <Badge variant="purple" className="text-[10px]">Vendor: {separation.vendor_name || 'Partner'}</Badge>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar & Quick Stats */}
        <div className="px-6 py-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="w-36 bg-emerald-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#07563D] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="font-bold text-[#07563D]">{progressPct}% Clearance Ready</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-700">
              Clearances: <strong>{separation.cleared_clearances_count || 0}/{separation.total_clearances_count || 0} Cleared</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {separation.status !== 'COMPLETED' && separation.status !== 'CANCELLED' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenNoticeModal(separation)}
                  className="text-xs h-7"
                >
                  Adjust Notice / LWD
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenExitInterviewModal(separation)}
                  className="text-xs h-7"
                >
                  Exit Interview
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-gray-200 flex items-center gap-6 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Overview & Timeline
          </button>
          <button
            onClick={() => setActiveTab('clearance')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'clearance'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Clearance Matrix ({separation.cleared_clearances_count || 0}/{separation.total_clearances_count || 0})
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'assets'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Asset Recovery ({separation.returned_assets_count || 0}/{separation.total_assets_count || 0})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'tasks'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Knowledge Transfer
          </button>
          <button
            onClick={() => setActiveTab('exit_interview')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'exit_interview'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Exit Interview
          </button>
          <button
            onClick={() => setActiveTab('fnf')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'fnf'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Full & Final Readiness
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Audit Log
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* TAB 1: OVERVIEW & TIMELINE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400 uppercase block">Separation Type</span>
                  <span className="text-sm font-extrabold text-gray-900 mt-1 block">{separation.separation_type}</span>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400 uppercase block">Resignation Date</span>
                  <span className="text-sm font-extrabold text-gray-900 mt-1 block">{separation.resignation_date}</span>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[11px] font-bold text-gray-400 uppercase block">Notice Period</span>
                  <span className="text-sm font-extrabold text-gray-900 mt-1 block">{separation.notice_period_days} Days</span>
                </div>
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase block">Approved LWD</span>
                  <span className="text-sm font-extrabold text-emerald-950 mt-1 block">
                    {separation.approved_last_working_date || separation.expected_last_working_date}
                  </span>
                </div>
              </div>

              {/* Retention Discussion Banner */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Manager Retention Workflow
                  </div>
                  <Badge variant={separation.retention_status === 'RETAINED' ? 'emerald' : 'amber'}>
                    {separation.retention_status}
                  </Badge>
                </div>
                <p className="text-xs text-amber-800">
                  {separation.retention_notes ||
                    'Review if counter-offer, role enhancement, or project transfer is feasible before clearing notice.'}
                </p>
                {separation.status !== 'COMPLETED' && separation.status !== 'CANCELLED' && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleRetentionUpdate('RETAINED')}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7"
                    >
                      Mark Employee Retained (Cancel Exit)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetentionUpdate('CONTINUE_EXIT')}
                      className="text-xs h-7"
                    >
                      Proceed with Separation
                    </Button>
                  </div>
                )}
              </div>

              {/* Reason & Comments */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Reason Taxonomy & Remarks</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{separation.reason_code}</Badge>
                  <span className="text-xs text-gray-600">{separation.reason_text || 'No additional remarks provided.'}</span>
                </div>
              </div>

              {/* Blocker Alert Box */}
              {separation.blockers && separation.blockers.length > 0 && separation.status !== 'COMPLETED' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    {separation.blockers.length} Blockers Remaining Before Exit Completion:
                  </div>
                  <ul className="list-disc list-inside text-xs text-red-700 space-y-1 pl-1">
                    {separation.blockers.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CLEARANCE MATRIX */}
          {activeTab === 'clearance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-gray-900">Departmental Clearance Matrix</h3>
                <span className="text-xs text-gray-500">Each department owner must verify obligations</span>
              </div>

              <div className="space-y-3">
                {(separation.clearances || []).map(c => {
                  const isCleared = c.status === 'CLEARED' || c.status === 'WAIVED';
                  const isRejected = c.status === 'REJECTED';

                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCleared
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : isRejected
                          ? 'bg-red-50/50 border-red-200'
                          : 'bg-white border-gray-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="purple" className="font-bold text-[10px]">
                              {c.department}
                            </Badge>
                            <span className="text-xs font-bold text-gray-900">{c.clearance_item}</span>
                          </div>
                          {c.comments && <p className="text-xs text-gray-500 italic">"{c.comments}"</p>}
                          {c.completed_at && (
                            <p className="text-[10px] text-emerald-700 font-medium">
                              Signed off by {c.completed_by} on {new Date(c.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {separation.status !== 'COMPLETED' && (
                            <>
                              <Button
                                size="sm"
                                variant={c.status === 'CLEARED' ? 'primary' : 'outline'}
                                onClick={() => handleUpdateClearance(c.id, 'CLEARED')}
                                className={`text-xs h-7 ${c.status === 'CLEARED' ? 'bg-emerald-700 text-white' : ''}`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Clear
                              </Button>
                              <Button
                                size="sm"
                                variant={c.status === 'REJECTED' ? 'danger' : 'outline'}
                                onClick={() => handleUpdateClearance(c.id, 'REJECTED')}
                                className="text-xs h-7 text-red-600 hover:bg-red-50"
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateClearance(c.id, 'WAIVED')}
                                className="text-xs h-7 text-gray-500"
                              >
                                Waive
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ASSETS */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-gray-900">Company Assets & Hardware Custody</h3>
                <span className="text-xs text-gray-500">Query active assets assigned to this employee</span>
              </div>

              <div className="space-y-3">
                {(separation.assets || []).map(a => (
                  <div
                    key={a.id}
                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gray-100 text-gray-700 rounded-xl">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-gray-900">{a.asset_name}</h4>
                          <span className="text-[10px] font-mono text-gray-500">SN: {a.serial_number || 'N/A'}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Assigned: {a.assigned_date || 'Active'} • Value: ${a.asset_value} • Condition: {a.condition}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          a.recovery_status === 'RETURNED'
                            ? 'emerald'
                            : a.recovery_status === 'MISSING' || a.recovery_status === 'DAMAGED'
                            ? 'danger'
                            : 'amber'
                        }
                      >
                        {a.recovery_status}
                      </Badge>

                      {separation.status !== 'COMPLETED' && a.recovery_status !== 'RETURNED' && (
                        <div className="flex items-center gap-1.5 ml-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateAsset(a.id, 'RETURNED')}
                            className="bg-emerald-700 text-white text-xs h-7"
                          >
                            Mark Returned
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateAsset(a.id, 'DAMAGED')}
                            className="text-xs h-7 text-amber-700 hover:bg-amber-50"
                          >
                            Damaged
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateAsset(a.id, 'MISSING')}
                            className="text-xs h-7 text-red-700 hover:bg-red-50"
                          >
                            Missing
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: KNOWLEDGE TRANSFER TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900">Knowledge Transfer & Handover Tasks</h3>
              <div className="space-y-3">
                {(separation.tasks || []).map(t => (
                  <div key={t.id} className="p-4 bg-white rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{t.title}</span>
                      <Badge variant={t.status === 'COMPLETED' ? 'emerald' : 'amber'}>{t.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">{t.description}</p>
                    <div className="text-[11px] text-gray-400 flex items-center gap-4">
                      <span>Owner: <strong>{t.handover_owner_name}</strong></span>
                      <span>Recipient: <strong>{t.recipient_name}</strong></span>
                      <span>Due: <strong>{t.due_date}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: EXIT INTERVIEW */}
          {activeTab === 'exit_interview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-gray-900">Exit Interview Feedback & Rehire Assessment</h3>
                {separation.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    onClick={() => onOpenExitInterviewModal(separation)}
                    className="bg-[#07563D] text-white text-xs"
                  >
                    {separation.exit_interview ? 'Edit Exit Interview' : 'Conduct Exit Interview'}
                  </Button>
                )}
              </div>

              {separation.exit_interview ? (
                <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block font-medium">Primary Reason</span>
                      <span className="font-bold text-gray-900">{separation.exit_interview.primary_reason}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Rehire Eligibility</span>
                      <Badge variant={separation.exit_interview.rehire_eligible === 'ELIGIBLE' ? 'emerald' : 'danger'}>
                        {separation.exit_interview.rehire_eligible}
                      </Badge>
                    </div>
                  </div>

                  {separation.exit_interview.manager_feedback && (
                    <div className="text-xs">
                      <span className="text-gray-400 block font-medium">Leadership Feedback:</span>
                      <p className="text-gray-800 mt-0.5">{separation.exit_interview.manager_feedback}</p>
                    </div>
                  )}

                  {separation.exit_interview.culture_feedback && (
                    <div className="text-xs">
                      <span className="text-gray-400 block font-medium">Culture & Work-Life Feedback:</span>
                      <p className="text-gray-800 mt-0.5">{separation.exit_interview.culture_feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500">
                  <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  No exit interview recorded yet. Click above to conduct the structured exit interview.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: F&F READINESS & PAYROLL SETTLEMENT */}
          {activeTab === 'fnf' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-gray-900">Full & Final Settlement Engine</h3>
                <div className="flex items-center gap-2">
                  {fnfSettlement ? (
                    <Badge variant="emerald" className="font-bold">
                      SETTLEMENT: {fnfSettlement.payment_status.toUpperCase()}
                    </Badge>
                  ) : (
                    <Badge variant={separation.fnf_readiness?.status === 'APPROVED' ? 'emerald' : 'amber'}>
                      {separation.fnf_readiness?.status || 'INPUTS_PENDING'}
                    </Badge>
                  )}
                </div>
              </div>

              {fnfSettlement ? (
                <div className="p-5 bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Core Payroll Net Payout
                      </span>
                      <span className="text-2xl font-black text-[#07563D] mt-0.5 block font-mono">
                        ₹ {fnfSettlement.net_settlement_payable.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <Badge variant={fnfSettlement.payment_status === 'Disbursed' ? 'emerald' : 'info'} className="text-xs font-bold">
                      {fnfSettlement.payment_status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-emerald-100">
                      <span className="text-gray-400 block font-medium">Unpaid Salary</span>
                      <span className="font-bold text-gray-900 mt-0.5 block font-mono">
                        ₹ {fnfSettlement.unpaid_salary_amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-gray-400">({fnfSettlement.unpaid_salary_days} Days)</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-emerald-100">
                      <span className="text-gray-400 block font-medium">Leave Encashment</span>
                      <span className="font-bold text-gray-900 mt-0.5 block font-mono">
                        ₹ {fnfSettlement.leave_encashment_amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-gray-400">({fnfSettlement.earned_leave_balance_days} Days)</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-emerald-100">
                      <span className="text-gray-400 block font-medium">Gratuity</span>
                      <span className="font-bold text-gray-900 mt-0.5 block font-mono">
                        ₹ {fnfSettlement.gratuity_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-rose-100">
                      <span className="text-gray-400 block font-medium">Total Deductions</span>
                      <span className="font-bold text-rose-600 mt-0.5 block font-mono">
                        - ₹ {fnfSettlement.total_deductions_settlement.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-100/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Authoritative Settlement Record linked in Core Payroll Module
                    </span>
                    <Button
                      size="sm"
                      onClick={handleGenerateFnF}
                      className="bg-[#07563D] hover:bg-[#064e37] text-white text-[11px] h-7 px-2 font-bold cursor-pointer"
                    >
                      Recalculate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-gray-100">
                      <span className="text-gray-400 block font-medium">Notice Served</span>
                      <span className="font-extrabold text-gray-900 text-sm mt-0.5 block">
                        {separation.notice_period_days || 30} Days
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100">
                      <span className="text-gray-400 block font-medium">Notice Shortfall</span>
                      <span className="font-extrabold text-red-600 text-sm mt-0.5 block">
                        {separation.notice_buyout_days || 0} Days
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100">
                      <span className="text-gray-400 block font-medium">Leave Encashment</span>
                      <span className="font-extrabold text-emerald-700 text-sm mt-0.5 block">
                        {separation.fnf_readiness?.leave_encashment_days || 12} Days
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100">
                      <span className="text-gray-400 block font-medium">Asset Deductions</span>
                      <span className="font-extrabold text-rose-700 text-sm mt-0.5 block">
                        ₹ {(separation.assets || []).reduce((sum, a) => (a.recovery_status === 'DAMAGED' || a.recovery_status === 'MISSING' ? sum + (Number(a.financial_recovery_amount) || 0) : sum), 0)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2">
                      <DollarSign className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Automated Cross-Module Hand-off:</span>
                        <p className="text-[11px] text-blue-800 mt-0.5">
                          Click below to automatically dispatch these verified exit inputs directly into the Payroll FnF Settlement calculation sheet.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleGenerateFnF}
                      className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                    >
                      <Calculator className="w-3.5 h-3.5 mr-1" />
                      Generate Draft FnF
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-gray-900">Immutable Audit Trail</h3>
              <div className="space-y-2">
                {offboardingService.getAuditLogs(separation.id).map(log => (
                  <div key={log.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{log.action}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-600">Actor: <strong>{log.actor_name || 'System'}</strong></p>
                    {log.reason && <p className="text-amber-800 text-[11px] italic">Reason: {log.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Operational Action Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {separation.status === 'COMPLETED' ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Separation completed on {separation.actual_last_working_date}
              </span>
            ) : separation.is_ready_for_exit ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> All clearance conditions satisfied. Ready to complete exit.
              </span>
            ) : (
              <span className="text-amber-700 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {separation.blockers?.length || 0} blockers pending
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {separation.status !== 'COMPLETED' && separation.status !== 'CANCELLED' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWithdraw}
                  className="text-xs text-gray-700"
                >
                  Withdraw Resignation
                </Button>

                {/* Normal Complete or Complete with Exception */}
                {separation.is_ready_for_exit ? (
                  <Button
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleCompleteSeparation(false)}
                    className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
                  >
                    {isProcessing ? 'Completing...' : 'Complete Separation & Exit Employee'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setIsExceptionModalOpen(true)}
                    className="text-xs font-bold"
                  >
                    Complete with HR Head Exception
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* HR Head Exception Override Modal */}
        {isExceptionModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-start gap-3 text-red-900">
                <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-base">HR Head Exception Override</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Bypassing outstanding blockers requires mandatory executive justification and is permanently
                    audited.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Executive Override Reason *
                </label>
                <textarea
                  rows={3}
                  value={exceptionReason}
                  onChange={e => setExceptionReason(e.target.value)}
                  required
                  placeholder="State reason why remaining blockers are waived by HR leadership..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsExceptionModalOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isProcessing || !exceptionReason.trim()}
                  onClick={() => handleCompleteSeparation(true)}
                >
                  {isProcessing ? 'Processing...' : 'Authorize & Complete Exit'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
