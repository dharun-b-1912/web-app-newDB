import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import {
  Clock,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  FileEdit,
  ArrowRight,
  Filter,
  Search,
  Download,
  DollarSign,
  ShieldAlert,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  attendanceOperationsEngine,
  LateEarlyEvaluation,
} from '../../../services/attendance/attendanceOperationsEngine';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';

export interface LateEarlyTrackingViewProps {
  onNavigateSubPath?: (subPath: string) => void;
  onOpenEmployeeProfile?: (empId: string) => void;
}

export const LateEarlyTrackingView: React.FC<LateEarlyTrackingViewProps> = ({
  onNavigateSubPath,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [evaluations, setEvaluations] = useState<LateEarlyEvaluation[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LATE' | 'EARLY' | 'PENDING' | 'PENDING_APPROVAL' | 'REGULARIZED' | 'PAYROLL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Regularize Dialog Modal
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  const [selectedForRegularize, setSelectedForRegularize] = useState<LateEarlyEvaluation | null>(null);
  const [requestedIn, setRequestedIn] = useState('');
  const [requestedOut, setRequestedOut] = useState('');
  const [regularizeReason, setRegularizeReason] = useState('');

  const loadData = () => {
    const list = attendanceOperationsEngine.getLateEarlyEvaluations();
    setEvaluations(list);
  };

  useEffect(() => {
    loadData();
    const unsub1 = hrEventBus.subscribe('regularization.approved', () => loadData());
    const unsub2 = hrEventBus.subscribe('attendance.recalculated', () => loadData());
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const filteredList = useMemo(() => {
    return evaluations.filter(e => {
      if (activeFilter === 'LATE' && e.late_minutes <= 0) return false;
      if (activeFilter === 'EARLY' && e.early_minutes <= 0) return false;
      if (activeFilter === 'PENDING' && e.status !== 'PENDING_ACTION') return false;
      if (activeFilter === 'PENDING_APPROVAL' && (e.status !== 'PENDING_MANAGER' && e.status !== 'PENDING_HR')) return false;
      if (activeFilter === 'REGULARIZED' && e.status !== 'REGULARIZED') return false;
      if (activeFilter === 'PAYROLL' && e.payroll_deduction_days <= 0) return false;

      if (selectedDept !== 'ALL' && e.department !== selectedDept) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.employee_name.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [evaluations, activeFilter, selectedDept, searchQuery]);

  const handleOpenRegularizeModal = (item: LateEarlyEvaluation) => {
    setSelectedForRegularize(item);
    setRequestedIn(item.scheduled_in || '09:00 AM');
    setRequestedOut(item.scheduled_out || '06:00 PM');
    setRegularizeReason(item.late_minutes > 0 ? `Client transit delay on ${item.date}` : `Early exit with manager verbal signoff`);
    setIsRegularizeModalOpen(true);
  };

  const handleConfirmRegularize = () => {
    if (!selectedForRegularize) return;
    if (!regularizeReason.trim()) {
      showToast('Please enter a valid reason for regularization.', 'error');
      return;
    }

    attendanceOperationsEngine.submitRegularizationFromLateEarly(selectedForRegularize.id, {
      requested_in: requestedIn,
      requested_out: requestedOut,
      reason: regularizeReason,
      submitted_by: user?.name || selectedForRegularize.employee_name,
    });

    showToast(`✓ Regularization request submitted for ${selectedForRegularize.employee_name}. Routed to Manager approval inbox.`);
    setIsRegularizeModalOpen(false);
    loadData();
  };

  // Metrics
  const lateCount = evaluations.filter(e => e.late_minutes > 0).length;
  const earlyCount = evaluations.filter(e => e.early_minutes > 0).length;
  const pendingActionCount = evaluations.filter(e => e.status === 'PENDING_ACTION').length;
  const pendingApprovalCount = evaluations.filter(e => e.status === 'PENDING_MANAGER' || e.status === 'PENDING_HR').length;
  const regularizedCount = evaluations.filter(e => e.status === 'REGULARIZED').length;
  const payrollImpactCount = evaluations.filter(e => e.payroll_deduction_days > 0).length;

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-800">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Late / Early Tracking</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 rounded-full">
              Detection Workspace
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Monitor attendance deviations against effective shifts and trigger employee justifications or system investigations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('regularization');
            }}
            className="text-xs font-bold text-gray-700"
          >
            <FileEdit className="w-3.5 h-3.5 mr-1" />
            Go to Regularization Desk
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('exceptions');
            }}
            className="text-xs font-bold text-gray-700"
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
            Exceptions Queue
          </Button>
        </div>
      </div>

      {/* 2. Compact Clickable Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveFilter('LATE')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeFilter === 'LATE' ? "bg-rose-50 border-rose-300 ring-2 ring-rose-500/20" : "bg-white border-gray-200 hover:border-rose-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Late Today</span>
            <Clock className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{lateCount}</div>
          <span className="text-[10px] text-rose-700 font-semibold">Grace exceeded</span>
        </button>

        <button
          onClick={() => setActiveFilter('EARLY')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeFilter === 'EARLY' ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/20" : "bg-white border-gray-200 hover:border-amber-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Early Today</span>
            <LogOut className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{earlyCount}</div>
          <span className="text-[10px] text-amber-700 font-semibold">Shortfall exits</span>
        </button>

        <button
          onClick={() => setActiveFilter('PENDING')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeFilter === 'PENDING' ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20" : "bg-white border-gray-200 hover:border-blue-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Pending Action</span>
            <AlertTriangle className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{pendingActionCount}</div>
          <span className="text-[10px] text-blue-700 font-semibold">Needs explanation</span>
        </button>

        <button
          onClick={() => setActiveFilter('PENDING_APPROVAL')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeFilter === 'PENDING_APPROVAL' ? "bg-purple-50 border-purple-300 ring-2 ring-purple-500/20" : "bg-white border-gray-200 hover:border-purple-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Under Review</span>
            <Layers className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{pendingApprovalCount}</div>
          <span className="text-[10px] text-purple-700 font-semibold">With Manager/HR</span>
        </button>

        <button
          onClick={() => setActiveFilter('REGULARIZED')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeFilter === 'REGULARIZED' ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20" : "bg-white border-gray-200 hover:border-emerald-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Regularized</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{regularizedCount}</div>
          <span className="text-[10px] text-emerald-700 font-semibold">Approved & Cleared</span>
        </button>

        <button
          onClick={() => setActiveFilter('PAYROLL')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeFilter === 'PAYROLL' ? "bg-rose-50 border-rose-300 ring-2 ring-rose-500/20" : "bg-white border-gray-200 hover:border-rose-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Payroll Impact</span>
            <DollarSign className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{payrollImpactCount}</div>
          <span className="text-[10px] text-rose-700 font-semibold">Deduction flagged</span>
        </button>
      </div>

      {/* 3. Main Data Workspace Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-gray-900">Attendance Deviation Audit</h3>
            <span className="text-xs text-gray-500">({filteredList.length} records in view)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>

            {activeFilter !== 'ALL' && (
              <button
                onClick={() => setActiveFilter('ALL')}
                className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 font-semibold underline"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Department</th>
                <th className="p-3">Shift</th>
                <th className="p-3">Scheduled IN</th>
                <th className="p-3">Actual IN</th>
                <th className="p-3">Late Mins</th>
                <th className="p-3">Scheduled OUT</th>
                <th className="p-3">Actual OUT</th>
                <th className="p-3">Early Mins</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-gray-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold text-gray-800">No attendance deviations found</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">All scheduled workforce arrived within grace tolerances.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/70">
                    <td className="p-3 font-mono text-gray-600 whitespace-nowrap">{item.date}</td>
                    <td className="p-3 font-bold text-gray-900">
                      <button
                        onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(item.employee_id)}
                        className="text-left hover:text-[#07563D] hover:underline"
                      >
                        {item.employee_name}
                      </button>
                      <div className="text-[10px] text-gray-400 font-mono">{item.employee_code}</div>
                    </td>
                    <td className="p-3 text-gray-600">{item.department}</td>
                    <td className="p-3 font-medium text-gray-700">{item.shift_name}</td>
                    <td className="p-3 font-mono text-gray-500">{item.scheduled_in}</td>
                    <td className="p-3 font-mono font-bold text-gray-900">{item.actual_in}</td>
                    <td className="p-3 font-bold">
                      {item.late_minutes > 0 ? (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded">+{item.late_minutes}m</span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-gray-500">{item.scheduled_out}</td>
                    <td className="p-3 font-mono font-bold text-gray-900">{item.actual_out}</td>
                    <td className="p-3 font-bold">
                      {item.early_minutes > 0 ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">-{item.early_minutes}m</span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {item.status === 'REGULARIZED' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          Regularized
                        </span>
                      ) : item.status === 'PENDING_MANAGER' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded">
                          Pending Manager
                        </span>
                      ) : item.status === 'PENDING_HR' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                          Pending HR
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                          Pending Action
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {item.status === 'PENDING_ACTION' ? (
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={() => handleOpenRegularizeModal(item)}
                          className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
                        >
                          Regularize
                        </Button>
                      ) : item.status === 'REGULARIZED' ? (
                        <button
                          onClick={() => onNavigateSubPath && onNavigateSubPath('regularization')}
                          className="text-[#07563D] hover:underline font-bold text-xs"
                        >
                          View Approval
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigateSubPath && onNavigateSubPath('regularization')}
                          className="text-purple-700 hover:underline font-bold text-xs"
                        >
                          Review Inbox
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

      {/* 4. MODAL: REGULARIZE DEVIATION */}
      {isRegularizeModalOpen && selectedForRegularize && (
        <Modal
          isOpen={isRegularizeModalOpen}
          onClose={() => setIsRegularizeModalOpen(false)}
          title="Submit Attendance Regularization Request"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="font-bold text-amber-900">
                Attendance Deviation Detected: {selectedForRegularize.employee_name} ({selectedForRegularize.employee_code})
              </p>
              <p className="text-amber-700 mt-1">
                Date: <span className="font-semibold">{selectedForRegularize.date}</span> • Scheduled:{' '}
                <span className="font-semibold">{selectedForRegularize.scheduled_in} - {selectedForRegularize.scheduled_out}</span> •
                Actual Check-In: <span className="font-semibold">{selectedForRegularize.actual_in}</span> ({selectedForRegularize.late_minutes}m late).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Requested Check-In</label>
                <input
                  type="text"
                  value={requestedIn}
                  onChange={e => setRequestedIn(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#07563D]"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Requested Check-Out</label>
                <input
                  type="text"
                  value={requestedOut}
                  onChange={e => setRequestedOut(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#07563D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Justification Reason *</label>
              <textarea
                rows={3}
                value={regularizeReason}
                onChange={e => setRegularizeReason(e.target.value)}
                placeholder="Explain the attendance deviation (e.g. client meeting, transit failure, hardware queue)..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsRegularizeModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleConfirmRegularize} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Submit for Manager Review
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
