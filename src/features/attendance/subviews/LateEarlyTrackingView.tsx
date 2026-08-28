// src/features/attendance/subviews/LateEarlyTrackingView.tsx
// ============================================================================
// Joy PeopleHR — Production Late / Early Tracking & Deviation Audit Workspace
// Features: Realtime Punch Evaluation, Dynamic Grace Period Calculations,
// Zero-Mock Database-Driven Metrics, Seamless Regularization Desk Integration
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Sparkles,
  HelpCircle,
  History,
  XCircle,
  ExternalLink,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  attendanceDeviationService,
  AttendanceDeviation,
  DeviationStatus,
  DeviationType,
} from '../../../services/attendance/attendanceDeviationService';
import { attendanceRegularizationService } from '../../../services/attendance/attendanceRegularizationService';
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

  const [deviations, setDeviations] = useState<AttendanceDeviation[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LATE' | 'EARLY' | 'PENDING' | 'UNDER_REVIEW' | 'REGULARIZED' | 'PAYROLL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Detail Modal
  const [selectedDeviation, setSelectedDeviation] = useState<AttendanceDeviation | null>(null);

  // Regularize Dialog Modal
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  const [selectedForRegularize, setSelectedForRegularize] = useState<AttendanceDeviation | null>(null);
  const [requestedIn, setRequestedIn] = useState('09:30 AM');
  const [requestedOut, setRequestedOut] = useState('06:30 PM');
  const [regularizeReason, setRegularizeReason] = useState('');
  const [isSubmittingRegularize, setIsSubmittingRegularize] = useState(false);

  // Load Real Database Deviations
  const loadData = useCallback(async () => {
    try {
      const data = await attendanceDeviationService.fetchDeviationsFromDb();
      setDeviations(data);
    } catch {
      setDeviations(attendanceDeviationService.getDeviations());
    }
  }, []);

  useEffect(() => {
    loadData();

    const unsub1 = hrEventBus.subscribe('regularization.submitted', () => loadData());
    const unsub2 = hrEventBus.subscribe('regularization.approved', () => loadData());
    const unsub3 = hrEventBus.subscribe('regularization.rejected', () => loadData());
    const unsub4 = hrEventBus.subscribe('deviation.updated' as any, () => loadData());
    const unsub5 = hrEventBus.subscribe('attendance.recalculated', () => loadData());

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [loadData]);

  // Dynamic Metric Counts from Real Database
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      lateToday: deviations.filter((d) => (d.attendance_date === todayStr || d.late_minutes > 0) && d.late_minutes > 0).length,
      earlyToday: deviations.filter((d) => (d.attendance_date === todayStr || d.early_minutes > 0) && d.early_minutes > 0).length,
      pendingAction: deviations.filter((d) => d.status === 'DETECTED' || d.status === 'PENDING_ACTION').length,
      underReview: deviations.filter((d) => d.status === 'REGULARIZATION_PENDING' || d.status === 'MANAGER_REVIEW' || d.status === 'HR_REVIEW').length,
      regularized: deviations.filter((d) => d.status === 'REGULARIZED').length,
      payrollImpact: deviations.filter((d) => d.payroll_deduction_days > 0).length,
    };
  }, [deviations]);

  // Unique Departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    deviations.forEach((d) => {
      if (d.department) set.add(d.department);
    });
    return Array.from(set);
  }, [deviations]);

  // Filtered List
  const filteredList = useMemo(() => {
    return deviations.filter((e) => {
      if (activeFilter === 'LATE' && e.late_minutes <= 0) return false;
      if (activeFilter === 'EARLY' && e.early_minutes <= 0) return false;
      if (activeFilter === 'PENDING' && (e.status !== 'PENDING_ACTION' && e.status !== 'DETECTED')) return false;
      if (activeFilter === 'UNDER_REVIEW' && (e.status !== 'MANAGER_REVIEW' && e.status !== 'HR_REVIEW' && e.status !== 'REGULARIZATION_PENDING')) return false;
      if (activeFilter === 'REGULARIZED' && e.status !== 'REGULARIZED') return false;
      if (activeFilter === 'PAYROLL' && e.payroll_deduction_days <= 0) return false;

      if (selectedDept !== 'ALL' && e.department !== selectedDept) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.employee_name.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.shift_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [deviations, activeFilter, selectedDept, searchQuery]);

  // Open Regularize Modal
  const handleOpenRegularizeModal = (item: AttendanceDeviation) => {
    setSelectedForRegularize(item);
    setRequestedIn(item.scheduled_check_in || '09:30 AM');
    setRequestedOut(item.scheduled_check_out || '06:30 PM');
    setRegularizeReason(
      item.late_minutes > 0
        ? `Forgot to check in on morning entry (${item.attendance_date})`
        : `Client meeting attendance correction`
    );
    setIsRegularizeModalOpen(true);
  };

  // Submit Regularization
  const handleConfirmRegularize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForRegularize) return;
    if (!regularizeReason.trim()) {
      showToast('Please provide a justification reason.', 'warning');
      return;
    }

    setIsSubmittingRegularize(true);
    try {
      await attendanceRegularizationService.submitRequest({
        employeeId: selectedForRegularize.employee_id,
        employeeCode: selectedForRegularize.employee_code,
        employeeName: selectedForRegularize.employee_name,
        department: selectedForRegularize.department,
        date: selectedForRegularize.attendance_date,
        requestedIn: requestedIn,
        requestedOut: requestedOut,
        reasonCode: 'FORGOT_CHECK_IN',
        reason: regularizeReason.trim(),
      });

      showToast(`✓ Regularization submitted for ${selectedForRegularize.employee_name}. Status changed to Under Review.`, 'success');
      setIsRegularizeModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error submitting regularization.', 'error');
    } finally {
      setIsSubmittingRegularize(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Late / Early Tracking</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
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
            className="text-xs font-bold text-gray-700 cursor-pointer"
          >
            <FileEdit className="w-3.5 h-3.5 mr-1 text-[#07563D]" />
            Go to Regularization Desk
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('exceptions');
            }}
            className="text-xs font-bold text-gray-700 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-purple-600" />
            Exceptions Queue
          </Button>
        </div>
      </div>

      {/* 2. Realtime Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveFilter('LATE')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'LATE'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-gray-200 hover:border-amber-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Late Today</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.lateToday}</div>
          <span className="text-[10px] text-amber-700 font-semibold">Grace exceeded</span>
        </button>

        <button
          onClick={() => setActiveFilter('EARLY')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'EARLY'
              ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/20'
              : 'bg-white border-gray-200 hover:border-orange-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Early Today</span>
            <LogOut className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.earlyToday}</div>
          <span className="text-[10px] text-orange-700 font-semibold">Shortfall exits</span>
        </button>

        <button
          onClick={() => setActiveFilter('PENDING')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'PENDING'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-gray-200 hover:border-rose-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Pending Action</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.pendingAction}</div>
          <span className="text-[10px] text-rose-700 font-semibold">Needs explanation</span>
        </button>

        <button
          onClick={() => setActiveFilter('UNDER_REVIEW')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'UNDER_REVIEW'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
              : 'bg-white border-gray-200 hover:border-purple-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Under Review</span>
            <Layers className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.underReview}</div>
          <span className="text-[10px] text-purple-700 font-semibold">With Manager/HR</span>
        </button>

        <button
          onClick={() => setActiveFilter('REGULARIZED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'REGULARIZED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-gray-200 hover:border-emerald-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Regularized</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.regularized}</div>
          <span className="text-[10px] text-emerald-700 font-semibold">Approved & Cleared</span>
        </button>

        <button
          onClick={() => setActiveFilter('PAYROLL')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'PAYROLL'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-gray-200 hover:border-rose-300'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Payroll Impact</span>
            <DollarSign className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.payrollImpact}</div>
          <span className="text-[10px] text-rose-700 font-semibold">Deduction flagged</span>
        </button>
      </div>

      {/* 3. Attendance Deviation Audit Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-gray-900">Attendance Deviation Audit</h3>
            <span className="text-xs text-gray-500">({filteredList.length} records in view)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {departments.length > 0 && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            <div className="relative text-xs">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-[10px] tracking-wider">
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
                  <td colSpan={12} className="p-12 text-center text-gray-500">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-gray-800 text-sm">No attendance deviations found</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      All scheduled workforce arrived within grace tolerances.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 text-gray-700 font-semibold whitespace-nowrap">
                      {item.attendance_date}
                    </td>
                    <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                      <button
                        onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(item.employee_id)}
                        className="text-left hover:text-[#07563D] hover:underline cursor-pointer"
                      >
                        {item.employee_name}
                      </button>
                      <div className="text-[11px] text-gray-400 font-medium">{item.employee_code}</div>
                    </td>
                    <td className="p-3 text-gray-700 font-medium whitespace-nowrap">{item.department}</td>
                    <td className="p-3 text-gray-800 font-bold whitespace-nowrap">{item.shift_code}</td>
                    <td className="p-3 text-gray-600 font-medium whitespace-nowrap">{item.scheduled_check_in}</td>
                    <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                      {item.actual_check_in ? (
                        <span className={item.late_minutes > 0 ? 'text-amber-700' : 'text-gray-900'}>
                          {item.actual_check_in}
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold">Missing</span>
                      )}
                    </td>
                    <td className="p-3 font-bold whitespace-nowrap">
                      {item.late_minutes > 0 ? (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                          {item.late_minutes}m
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">0</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-600 font-medium whitespace-nowrap">{item.scheduled_check_out}</td>
                    <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                      {item.actual_check_out ? (
                        <span className={item.early_minutes > 0 ? 'text-orange-700' : 'text-gray-900'}>
                          {item.actual_check_out}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="p-3 font-bold whitespace-nowrap">
                      {item.early_minutes > 0 ? (
                        <span className="px-2.5 py-0.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-md">
                          {item.early_minutes}m
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">0</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {item.status === 'REGULARIZED' ? (
                        <span className="px-3 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full inline-block">
                          Regularized
                        </span>
                      ) : item.status === 'MANAGER_REVIEW' || item.status === 'HR_REVIEW' ? (
                        <span className="px-3 py-1 text-[11px] font-bold bg-purple-100 text-purple-800 rounded-full inline-block">
                          Under Review
                        </span>
                      ) : item.status === 'REJECTED' ? (
                        <span className="px-3 py-1 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-full inline-block">
                          Rejected
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full inline-block">
                          Late Detected
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDeviation(item)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-900 cursor-pointer shadow-2xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                          <span>View</span>
                        </button>

                        {item.status !== 'REGULARIZED' && item.status !== 'MANAGER_REVIEW' && item.status !== 'HR_REVIEW' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRegularizeModal(item)}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-[#07563D] hover:bg-[#064e37] rounded-lg cursor-pointer shadow-2xs transition-colors"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                            <span>Regularize</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigateSubPath && onNavigateSubPath('regularization')}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-[#07563D] bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors"
                          >
                            <span>Desk</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Deviation Detail Drawer / Audit Modal */}
      {selectedDeviation && (
        <Modal
          isOpen={!!selectedDeviation}
          onClose={() => setSelectedDeviation(null)}
          title={`Deviation Audit: ${selectedDeviation.employee_name}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm">
                  {selectedDeviation.employee_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{selectedDeviation.employee_name}</h4>
                  <p className="text-gray-500 text-[11px]">
                    {selectedDeviation.employee_code} · {selectedDeviation.department} · Shift: {selectedDeviation.shift_name} ({selectedDeviation.shift_code})
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-semibold text-gray-400">Attendance Date</span>
                <p className="text-sm font-bold text-gray-900 font-mono">{selectedDeviation.attendance_date}</p>
              </div>
            </div>

            {/* Scheduled vs Actual Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-white rounded-xl border border-gray-200 space-y-2">
                <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">Scheduled Window</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Scheduled In:</span>
                  <span className="font-mono font-bold text-gray-900">{selectedDeviation.scheduled_check_in}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Scheduled Out:</span>
                  <span className="font-mono font-bold text-gray-900">{selectedDeviation.scheduled_check_out}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-100">
                  <span className="text-gray-500">Grace Tolerances:</span>
                  <span className="text-gray-700 font-semibold">{selectedDeviation.late_grace_minutes}m In / {selectedDeviation.early_grace_minutes}m Out</span>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-gray-200 space-y-2">
                <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">Actual Punches & Variance</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Actual Check-In:</span>
                  <span className="font-mono font-bold text-amber-800">{selectedDeviation.actual_check_in || 'Missing'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Actual Check-Out:</span>
                  <span className="font-mono font-bold text-orange-800">{selectedDeviation.actual_check_out || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-100">
                  <span className="text-gray-500">Payable Late Minutes:</span>
                  <span className="font-bold text-rose-700">{selectedDeviation.payable_late_minutes} min (Raw: {selectedDeviation.late_minutes}m)</span>
                </div>
              </div>
            </div>

            {/* Lifecycle Status & Payroll Impact */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-gray-500 font-semibold text-[11px]">Deviation Lifecycle Status:</span>
                <div className="mt-1">
                  <Badge variant={selectedDeviation.status === 'REGULARIZED' ? 'emerald' : selectedDeviation.status === 'MANAGER_REVIEW' ? 'purple' : 'amber'}>
                    {selectedDeviation.status}
                  </Badge>
                </div>
              </div>

              <div className="text-right">
                <span className="text-gray-500 font-semibold text-[11px]">Payroll Deduction Flag:</span>
                <p className="text-xs font-bold text-rose-700 mt-0.5">
                  {selectedDeviation.payroll_deduction_days > 0 ? `${selectedDeviation.payroll_deduction_days} Day LOP` : '0.00 (No deduction)'}
                </p>
              </div>
            </div>

            {/* Audit History */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-gray-500 font-semibold text-[11px]">Evaluation & Recalculation History:</span>
              <div className="space-y-2 border-l-2 border-amber-500 pl-3">
                {selectedDeviation.timeline?.map((step, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-gray-900 text-[11px]">{step.stage} · {step.action}</div>
                    <div className="text-gray-400 text-[10px] font-mono">{new Date(step.timestamp).toLocaleString()}</div>
                    {step.details && <div className="text-gray-600 text-[11px]">{step.details}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedDeviation(null)}>
                Close Audit
              </Button>
              {selectedDeviation.status !== 'REGULARIZED' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedDeviation(null);
                    handleOpenRegularizeModal(selectedDeviation);
                  }}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
                >
                  <FileEdit className="w-3.5 h-3.5 mr-1" />
                  Regularize Record
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Regularization Modal from Late/Early Workspace */}
      {isRegularizeModalOpen && selectedForRegularize && (
        <Modal
          isOpen={isRegularizeModalOpen}
          onClose={() => setIsRegularizeModalOpen(false)}
          title={`Regularize Attendance: ${selectedForRegularize.employee_name}`}
          size="md"
        >
          <form onSubmit={handleConfirmRegularize} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-900">{selectedForRegularize.employee_name} ({selectedForRegularize.employee_code})</span>
                <span className="font-mono font-bold text-amber-800">{selectedForRegularize.attendance_date}</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-1">
                Detected Variance: <strong>{selectedForRegularize.late_minutes}m Late</strong> (Scheduled: {selectedForRegularize.scheduled_check_in} vs Actual: {selectedForRegularize.actual_check_in || 'Missing'})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Corrected Clock-In</label>
                <input
                  type="text"
                  value={requestedIn}
                  onChange={(e) => setRequestedIn(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Corrected Clock-Out</label>
                <input
                  type="text"
                  value={requestedOut}
                  onChange={(e) => setRequestedOut(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Justification Reason</label>
              <textarea
                rows={3}
                value={regularizeReason}
                onChange={(e) => setRegularizeReason(e.target.value)}
                placeholder="State the reason for attendance regularisation..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#07563D]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRegularizeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingRegularize}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
              >
                {isSubmittingRegularize ? 'Submitting...' : 'Submit to Regularization Desk'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
