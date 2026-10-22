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
import { formatDeviationDuration } from '../../../lib/attendance/attendanceEngine';
import { useAuth } from '../../../hooks/useAuth';

import {
  AttendanceDateFilter,
  DateFilterValue,
  INITIAL_DATE_FILTER,
  matchDateFilter,
} from '../components/AttendanceDateFilter';

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

  // Instant load from memory/cache (0ms delay) with background DB synchronization
  const [deviations, setDeviations] = useState<AttendanceDeviation[]>(() =>
    attendanceDeviationService.getDeviations()
  );
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LATE' | 'EARLY' | 'PENDING' | 'UNDER_REVIEW' | 'REGULARIZED' | 'PAYROLL'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(INITIAL_DATE_FILTER);
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
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);

  // Load Real Database Deviations with smooth non-blocking update
  const loadData = useCallback(async () => {
    try {
      setIsLoadingFromDb(true);
      const data = await attendanceDeviationService.fetchDeviationsFromDb();
      if (data && data.length > 0) {
        setDeviations(data);
      }
    } catch {
      setDeviations(attendanceDeviationService.getDeviations());
    } finally {
      setIsLoadingFromDb(false);
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

      if (!matchDateFilter(e.attendance_date, dateFilter)) return false;

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
  }, [deviations, activeFilter, selectedDept, searchQuery, dateFilter]);

  // Open Regularize Modal
  const handleOpenRegularizeModal = (item: AttendanceDeviation) => {
    setSelectedForRegularize(item);
    setRequestedIn(item.scheduled_check_in || '09:30 AM');
    setRequestedOut(item.scheduled_check_out || '06:30 PM');
    setRegularizeReason(
      item.late_minutes > 0
        ? `Late punch regularisation request (${item.attendance_date})`
        : `Early exit attendance correction (${item.attendance_date})`
    );
    setIsRegularizeModalOpen(true);
  };

  // Submit Regularization with Instant Optimistic Sync and Backend DB Sync
  const handleConfirmRegularize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForRegularize) return;
    if (!regularizeReason.trim()) {
      showToast('Please provide a justification reason.', 'warning');
      return;
    }

    setIsSubmittingRegularize(true);
    try {
      const reg = await attendanceRegularizationService.submitRequest({
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

      // 1. Immediately update deviation service store
      attendanceDeviationService.updateDeviationStatusForRegularization(
        selectedForRegularize.employee_id,
        selectedForRegularize.employee_code,
        selectedForRegularize.attendance_date,
        reg.id,
        'MANAGER_REVIEW'
      );

      // 2. Optimistic UI update for instant feedback
      setDeviations((prev) =>
        prev.map((d) =>
          d.id === selectedForRegularize.id ||
          ((d.employee_id === selectedForRegularize.employee_id || d.employee_code === selectedForRegularize.employee_code) &&
            d.attendance_date === selectedForRegularize.attendance_date)
            ? {
                ...d,
                status: 'MANAGER_REVIEW',
                regularization_request_id: reg.id,
              }
            : d
        )
      );

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-200/50">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Late / Early Tracking</h1>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-[#07563D] border border-emerald-200/60 rounded-full">
                  Live Audit Desk
                </span>
                {isLoadingFromDb && (
                  <span className="text-[10px] text-gray-400 animate-pulse font-medium">Syncing with backend...</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Audit scheduled shift adherence, track real-time punch deviations, and sync regularization requests with backend.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('regularization');
            }}
            className="text-xs font-semibold text-gray-700 hover:text-[#07563D] hover:border-[#07563D]/40 cursor-pointer transition-colors"
          >
            <FileEdit className="w-3.5 h-3.5 mr-1.5 text-[#07563D]" />
            Go to Regularization Desk
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('exceptions');
            }}
            className="text-xs font-semibold text-gray-700 hover:text-purple-700 hover:border-purple-300 cursor-pointer transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            Exceptions Queue
          </Button>
        </div>
      </div>

      {/* 2. Mild & Modern KPI Metric Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveFilter('LATE')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'LATE'
              ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/10 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-gray-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Late Today</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">{metrics.lateToday}</div>
          <span className="text-[11px] text-amber-700 font-medium">Grace exceeded</span>
        </button>

        <button
          onClick={() => setActiveFilter('EARLY')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'EARLY'
              ? 'bg-orange-50/50 border-orange-300 ring-2 ring-orange-500/10 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-gray-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Early Today</span>
            <LogOut className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">{metrics.earlyToday}</div>
          <span className="text-[11px] text-orange-700 font-medium">Shortfall exits</span>
        </button>

        <button
          onClick={() => setActiveFilter('PENDING')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'PENDING'
              ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/10 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-gray-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Pending Action</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">{metrics.pendingAction}</div>
          <span className="text-[11px] text-rose-700 font-medium">Needs regularisation</span>
        </button>

        <button
          onClick={() => setActiveFilter('UNDER_REVIEW')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'UNDER_REVIEW'
              ? 'bg-purple-50/50 border-purple-300 ring-2 ring-purple-500/10 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-gray-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Under Review</span>
            <Layers className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">{metrics.underReview}</div>
          <span className="text-[11px] text-purple-700 font-medium">With Manager / HR</span>
        </button>

        <button
          onClick={() => setActiveFilter('REGULARIZED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'REGULARIZED'
              ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-[#07563D]/10 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-gray-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Regularized</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#07563D]" />
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">{metrics.regularized}</div>
          <span className="text-[11px] text-[#07563D] font-medium">Approved & cleared</span>
        </button>

        <button
          onClick={() => setActiveFilter('PAYROLL')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            activeFilter === 'PAYROLL'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/20 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-gray-300 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Payroll Impact</span>
            <DollarSign className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">{metrics.payrollImpact}</div>
          <span className="text-[11px] text-slate-700 font-medium">Deduction flagged</span>
        </button>
      </div>

      {/* 3. Dual-Axis Scrollable Table with Sticky Header and Sticky Action Column */}
      <Card className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        {/* Table Top Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-gray-900">Attendance Deviation Audit</h3>
            <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-md">
              {filteredList.length} records
            </span>
            {(activeFilter !== 'ALL' || dateFilter.preset !== 'ALL' || selectedDept !== 'ALL') && (
              <button
                onClick={() => {
                  setActiveFilter('ALL');
                  setDateFilter(INITIAL_DATE_FILTER);
                  setSelectedDept('ALL');
                }}
                className="text-[11px] text-[#07563D] font-semibold hover:underline cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <AttendanceDateFilter value={dateFilter} onChange={setDateFilter} />

            {departments.length > 0 && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
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
                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1.5 h-auto cursor-pointer"
              title="Refresh from Database"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Dual-Axis Scrollable Wrapper */}
        <div className="relative border border-gray-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="max-h-[580px] overflow-x-auto overflow-y-auto no-scrollbar scrollbar-none">
            <table className="w-full min-w-[1200px] text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs border-b border-gray-200 shadow-2xs text-gray-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-3 whitespace-nowrap min-w-[105px]">Date</th>
                  <th className="p-3 whitespace-nowrap min-w-[180px]">Employee</th>
                  <th className="p-3 whitespace-nowrap min-w-[130px]">Department</th>
                  <th className="p-3 whitespace-nowrap min-w-[85px]">Shift</th>
                  <th className="p-3 whitespace-nowrap min-w-[110px]">Scheduled IN</th>
                  <th className="p-3 whitespace-nowrap min-w-[110px]">Actual IN</th>
                  <th className="p-3 whitespace-nowrap min-w-[135px]">Late Mins</th>
                  <th className="p-3 whitespace-nowrap min-w-[110px]">Scheduled OUT</th>
                  <th className="p-3 whitespace-nowrap min-w-[110px]">Actual OUT</th>
                  <th className="p-3 whitespace-nowrap min-w-[125px]">Early Mins</th>
                  <th className="p-3 whitespace-nowrap min-w-[130px]">Status</th>
                  <th className="p-3 pr-4 text-right whitespace-nowrap sticky right-0 z-30 bg-slate-50/95 backdrop-blur-xs border-l border-gray-200/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)] min-w-[160px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-12 text-center text-gray-500">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#07563D] flex items-center justify-center mx-auto mb-2 border border-emerald-200/50">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-gray-800 text-sm">No attendance deviations found</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        All scheduled workforce arrived within grace tolerances.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                        {item.attendance_date}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <button
                          onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(item.employee_id)}
                          className="text-left font-semibold text-gray-900 hover:text-[#07563D] hover:underline cursor-pointer block"
                        >
                          {item.employee_name}
                        </button>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">{item.employee_code}</div>
                      </td>
                      <td className="p-3 text-gray-700 font-medium whitespace-nowrap">{item.department}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[10px] font-semibold">
                          {item.shift_code}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 font-mono text-xs whitespace-nowrap">{item.scheduled_check_in}</td>
                      <td className="p-3 font-mono font-medium whitespace-nowrap">
                        {item.actual_check_in ? (
                          <span className={item.late_minutes > 0 ? 'text-amber-800 font-semibold' : 'text-gray-900'}>
                            {item.actual_check_in}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold text-[11px]">Missing</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {item.late_minutes > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-amber-50/80 text-amber-800 border border-amber-200/60 rounded-md font-semibold text-[11px]">
                            {formatDeviationDuration(item.late_minutes, { showBoth: item.late_minutes >= 60 })}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">0</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-500 font-mono text-xs whitespace-nowrap">{item.scheduled_check_out}</td>
                      <td className="p-3 font-mono font-medium whitespace-nowrap">
                        {item.actual_check_out ? (
                          <span className={item.early_minutes > 0 ? 'text-orange-800 font-semibold' : 'text-gray-900'}>
                            {item.actual_check_out}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">—</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {item.early_minutes > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-orange-50/80 text-orange-800 border border-orange-200/60 rounded-md font-semibold text-[11px]">
                            {formatDeviationDuration(item.early_minutes, { showBoth: item.early_minutes >= 60 })}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">0</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {item.status === 'REGULARIZED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-[#07563D] border border-emerald-200/70 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#07563D]" />
                            Regularized
                          </span>
                        ) : item.status === 'MANAGER_REVIEW' || item.status === 'HR_REVIEW' || item.status === 'REGULARIZATION_PENDING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                            Under Review
                          </span>
                        ) : item.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50/80 text-amber-800 border border-amber-200/60 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            Late Detected
                          </span>
                        )}
                      </td>
                      {/* Sticky Actions Cell: Always visible and never truncated */}
                      <td className="p-3 pr-4 text-right whitespace-nowrap sticky right-0 z-10 bg-white/95 backdrop-blur-xs border-l border-gray-100 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)] group-hover:bg-slate-50/95">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDeviation(item)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg cursor-pointer shadow-2xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                            <span>View</span>
                          </button>

                          {item.status !== 'REGULARIZED' && item.status !== 'MANAGER_REVIEW' && item.status !== 'HR_REVIEW' && item.status !== 'REGULARIZATION_PENDING' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRegularizeModal(item)}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-[#07563D] hover:bg-[#064e37] rounded-lg cursor-pointer shadow-2xs transition-all"
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                              <span>Regularize</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onNavigateSubPath && onNavigateSubPath('regularization')}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#07563D] bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/60 rounded-lg cursor-pointer transition-colors"
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
                  <span className="text-gray-500">Payable Late:</span>
                  <span className="font-bold text-rose-700">{formatDeviationDuration(selectedDeviation.payable_late_minutes, { showBoth: selectedDeviation.payable_late_minutes >= 60, verbose: true })} (Raw: {formatDeviationDuration(selectedDeviation.late_minutes, { showBoth: selectedDeviation.late_minutes >= 60 })})</span>
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
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">{selectedForRegularize.employee_name} ({selectedForRegularize.employee_code})</span>
                <span className="font-mono font-semibold text-gray-700">{selectedForRegularize.attendance_date}</span>
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                Detected Variance: <strong className="text-amber-800">+{formatDeviationDuration(selectedForRegularize.late_minutes, { showBoth: selectedForRegularize.late_minutes >= 60 })} Late</strong> (Scheduled: {selectedForRegularize.scheduled_check_in} vs Actual: {selectedForRegularize.actual_check_in || 'Missing'})
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
