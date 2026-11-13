import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  Coffee,
  Clock,
  ShieldAlert,
  Settings,
  AlertTriangle,
  X,
  Save,
  Info,
  RefreshCw,
  Search,
  Plus,
  CheckCircle2,
  Trash2,
  Edit3,
  History,
  Users,
  Timer,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import {
  BreakCategoryCode,
  PersistedBreakEvent,
  ScopedBreakPolicy,
  buildAttendanceTimelineIntervals,
} from '../../services/workHoursCalculator';
import {
  BreakCorrectionRow,
  BreakExceptionRow,
  BreakOperationalKpis,
  DailyBreakLedgerRow,
  FALLBACK_SCOPED_POLICY,
  ShiftPolicyOption,
  breakWorkHoursService,
} from '../../services/breakWorkHoursService';

function formatMinutesAsHoursMins(mins: number): string {
  const safe = Math.max(0, Math.round(mins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h 00m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function formatTimeShort(iso?: string | null): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toLocalTimeInput(iso?: string | null): string {
  if (!iso) return '13:00';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '13:00';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function combineDateAndTimeIso(dateStr: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map((n) => Number(n || 0));
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export const BreaksWorkHoursView: React.FC = () => {
  const { showToast } = useToast();
  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, description: string) =>
    showToast(`${title}: ${description}`, type);
  const { user } = useAuth();
  const { organization } = useTenant();
  const organizationId = organization?.id || user?.organization_id || '';

  const initialSearchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const [selectedDate, setSelectedDate] = useState(
    initialSearchParams?.get('date') || new Date().toISOString().split('T')[0]
  );
  const [deepLinkEmployeeId, setDeepLinkEmployeeId] = useState<string | null>(
    initialSearchParams?.get('employeeId') || null
  );
  const [rows, setRows] = useState<DailyBreakLedgerRow[]>([]);
  const [kpis, setKpis] = useState<BreakOperationalKpis>({
    scheduledCount: 0,
    checkedInCount: 0,
    workingCount: 0,
    onBreakCount: 0,
    checkedOutCount: 0,
    absentCount: 0,
    missingBreaksCount: 0,
    exceededBreaksCount: 0,
    incompleteBreaksCount: 0,
    openExceptionsCount: 0,
  });
  const [policy, setPolicy] = useState<ScopedBreakPolicy>(FALLBACK_SCOPED_POLICY);
  const [allPolicies, setAllPolicies] = useState<ScopedBreakPolicy[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ShiftPolicyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<'state' | 'name' | 'net_payable' | 'exceptions'>('state');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | BreakCategoryCode>('ALL');
  const [exceptionsOnly, setExceptionsOnly] = useState(false);

  // Interactive Timeline selection
  const [timelineRowId, setTimelineRowId] = useState<string | null>(null);

  // Policy Modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ScopedBreakPolicy>(FALLBACK_SCOPED_POLICY);
  const [policyChangeSummary, setPolicyChangeSummary] = useState('');
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Employee Breakdown & HR Correction Drawer
  const [selectedRow, setSelectedRow] = useState<DailyBreakLedgerRow | null>(null);
  const [corrections, setCorrections] = useState<BreakCorrectionRow[]>([]);
  const [loadingCorrections, setLoadingCorrections] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [addBreakMode, setAddBreakMode] = useState(false);
  const [editingBreak, setEditingBreak] = useState<PersistedBreakEvent | null>(null);
  const [formCategory, setFormCategory] = useState<BreakCategoryCode>('LUNCH');
  const [formStartTime, setFormStartTime] = useState('13:00');
  const [formEndTime, setFormEndTime] = useState('13:45');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const loadData = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await breakWorkHoursService.getOperationalDashboard(organizationId, selectedDate);
      setRows(res.rows);
      setKpis(res.kpis);
      setPolicy(res.activePolicy);
      setAllPolicies(res.policies);
      setShiftOptions(res.shifts);

      if (deepLinkEmployeeId) {
        const target = res.rows.find((r) => r.employee_id === deepLinkEmployeeId);
        if (target) {
          setSelectedRow(target);
          setTimelineRowId(target.id);
          setDeepLinkEmployeeId(null);
        }
      } else if (selectedRow) {
        const refreshed = res.rows.find((r) => r.employee_id === selectedRow.employee_id) || null;
        setSelectedRow(refreshed);
      }
    } catch (err: any) {
      console.error('[BreaksWorkHoursView] loadData error:', err);
      setLoadError(err?.message || 'Unable to load attendance & break records.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, selectedDate, deepLinkEmployeeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!organizationId) return;
    const unsub = breakWorkHoursService.subscribeBreakOperations(organizationId, () => {
      loadData();
    });
    return unsub;
  }, [organizationId, loadData]);

  const loadCorrectionsForRow = useCallback(
    async (row: DailyBreakLedgerRow) => {
      if (!organizationId) return;
      setLoadingCorrections(true);
      try {
        const history = await breakWorkHoursService.getCorrections(
          organizationId,
          row.employee_id,
          row.attendance_date
        );
        setCorrections(history);
      } finally {
        setLoadingCorrections(false);
      }
    },
    [organizationId]
  );

  const openBreakdownDrawer = (row: DailyBreakLedgerRow) => {
    setSelectedRow(row);
    setTimelineRowId(row.id);
    setAddBreakMode(false);
    setEditingBreak(null);
    setCorrectionReason('');
    loadCorrectionsForRow(row);
  };

  const branches = useMemo(
    () => Array.from(new Set(rows.map((r) => r.branch_name).filter(Boolean))).sort(),
    [rows]
  );
  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department).filter(Boolean))).sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q) {
        const matches =
          r.employee_name.toLowerCase().includes(q) ||
          r.employee_code.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (branchFilter !== 'ALL' && r.branch_name !== branchFilter) return false;
      if (deptFilter !== 'ALL' && r.department !== deptFilter) return false;
      if (stateFilter !== 'ALL' && r.work_state !== stateFilter) return false;
      if (
        categoryFilter !== 'ALL' &&
        !r.breaks.some((b) => b.break_category === categoryFilter && b.status !== 'CANCELLED')
      ) {
        return false;
      }
      if (exceptionsOnly && !r.has_break_exception && r.exceptions.length === 0) {
        return false;
      }
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.employee_name.localeCompare(b.employee_name) * dir;
      if (sortBy === 'net_payable') return (a.net_payable_minutes - b.net_payable_minutes) * dir;
      if (sortBy === 'exceptions') return (a.exceptions.length - b.exceptions.length) * dir;
      const prio = (s: DailyBreakLedgerRow['work_state']) =>
        s === 'ON_BREAK' ? 0 : s === 'WORKING' ? 1 : s === 'CHECKED_OUT' ? 2 : 3;
      const diff = (prio(a.work_state) - prio(b.work_state)) * dir;
      return diff !== 0 ? diff : a.employee_name.localeCompare(b.employee_name);
    });
  }, [rows, searchQuery, branchFilter, deptFilter, stateFilter, categoryFilter, exceptionsOnly, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRows, safePage]
  );

  const exportLedgerCsv = () => {
    const header = [
      'Employee Code',
      'Employee Name',
      'Branch',
      'Department',
      'Shift',
      'Work State',
      'Check In',
      'Check Out',
      'Gross Presence (m)',
      'Paid Break (m)',
      'Unpaid Break (m)',
      'Auto Deducted (m)',
      'Net Payable (m)',
      'Approved OT (m)',
      'Open Exceptions',
    ];
    const lines = filteredRows.map((r) => [
      r.employee_code,
      `"${r.employee_name.replace(/"/g, '""')}"`,
      `"${r.branch_name.replace(/"/g, '""')}"`,
      `"${r.department.replace(/"/g, '""')}"`,
      r.shift_code,
      r.work_state,
      r.check_in_at || '',
      r.check_out_at || '',
      r.gross_presence_minutes,
      r.paid_break_minutes,
      r.unpaid_break_minutes,
      r.auto_deducted_break_minutes,
      r.net_payable_minutes,
      r.approved_ot_minutes,
      r.exceptions.filter((e) => e.status === 'OPEN' || e.status === 'IN_REVIEW').length,
    ]);
    const csv = [header.join(','), ...lines.map((l) => l.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breaks-work-hours-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeTimelineRow = useMemo(() => {
    if (timelineRowId) {
      const found = filteredRows.find((r) => r.id === timelineRowId);
      if (found) return found;
    }
    return (
      filteredRows.find(
        (r) => r.work_state === 'ON_BREAK' || r.work_state === 'WORKING' || r.breaks.length > 0
      ) ||
      filteredRows.find((r) => Boolean(r.check_in_at)) ||
      null
    );
  }, [filteredRows, timelineRowId]);

  const handleSavePolicy = async () => {
    if (!organizationId) return;
    setSavingPolicy(true);
    try {
      const saved = await breakWorkHoursService.saveBreakPolicy(
        { ...editingPolicy, organization_id: organizationId },
        user?.id,
        policyChangeSummary || 'Updated via Breaks & Work Hours Operational Center'
      );
      if (saved.scope_type === 'ORGANIZATION') {
        setPolicy(saved);
      }
      setIsPolicyModalOpen(false);
      setPolicyChangeSummary('');
      addToast('success', 'Break Policy Saved', `${saved.name} (v${saved.version}) is now active.`);
      await loadData();
    } catch (err: any) {
      addToast('error', 'Failed to Save Policy', err?.message || 'Unable to update break policy.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleSubmitBreakCorrection = async () => {
    if (!selectedRow || !organizationId) return;
    if (!correctionReason.trim()) {
      addToast('error', 'Reason Required', 'Please provide an HR audit reason before saving.');
      return;
    }

    setSubmittingCorrection(true);
    try {
      const startedAt = combineDateAndTimeIso(selectedRow.attendance_date, formStartTime);
      const endedAt = combineDateAndTimeIso(selectedRow.attendance_date, formEndTime);
      if (new Date(endedAt) <= new Date(startedAt)) {
        addToast('error', 'Invalid Time Window', 'Break end time must be after break start time.');
        setSubmittingCorrection(false);
        return;
      }

      await breakWorkHoursService.hrCorrectBreakEvent({
        organizationId,
        employeeId: selectedRow.employee_id,
        attendanceDate: selectedRow.attendance_date,
        actionType: editingBreak ? 'EDIT_BREAK' : 'ADD_BREAK',
        breakCategory: formCategory,
        breakEventId: editingBreak?.id,
        newStartedAt: startedAt,
        newEndedAt: endedAt,
        reason: correctionReason.trim(),
        actorId: user?.id,
        actorName: user?.name || user?.email || 'HR Admin',
      });

      addToast(
        'success',
        editingBreak ? 'Break Updated' : 'Break Added',
        'Attendance work hours & break deductions recalculated.'
      );
      setAddBreakMode(false);
      setEditingBreak(null);
      setCorrectionReason('');
      await loadData();
      await loadCorrectionsForRow(selectedRow);
    } catch (err: any) {
      addToast('error', 'Correction Failed', err?.message || 'Unable to apply break correction.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleDeleteBreak = async (brk: PersistedBreakEvent) => {
    if (!selectedRow || !organizationId) return;
    const reason = correctionReason.trim() || window.prompt('Enter mandatory HR reason to remove this break:');
    if (!reason || !reason.trim()) return;

    setSubmittingCorrection(true);
    try {
      await breakWorkHoursService.hrCorrectBreakEvent({
        organizationId,
        employeeId: selectedRow.employee_id,
        attendanceDate: selectedRow.attendance_date,
        actionType: 'DELETE_BREAK',
        breakEventId: brk.id,
        reason: reason.trim(),
        actorId: user?.id,
        actorName: user?.name || user?.email || 'HR Admin',
      });
      addToast('success', 'Break Removed', 'Daily totals recalculated.');
      setCorrectionReason('');
      await loadData();
      await loadCorrectionsForRow(selectedRow);
    } catch (err: any) {
      addToast('error', 'Delete Failed', err?.message || 'Unable to delete break.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleResolveException = async (
    ex: BreakExceptionRow,
    actionType: 'APPROVE_EXCEPTION' | 'WAIVE_EXCEPTION' | 'REJECT_EXCEPTION'
  ) => {
    if (!selectedRow || !organizationId) return;
    const reason = correctionReason.trim() || `${actionType.replace('_EXCEPTION', '')} by HR`;

    setSubmittingCorrection(true);
    try {
      await breakWorkHoursService.hrCorrectBreakEvent({
        organizationId,
        employeeId: selectedRow.employee_id,
        attendanceDate: selectedRow.attendance_date,
        actionType,
        exceptionId: ex.id,
        reason,
        actorId: user?.id,
        actorName: user?.name || user?.email || 'HR Admin',
      });
      addToast('success', 'Exception Updated', `Marked as ${actionType.replace('_EXCEPTION', '')}.`);
      setCorrectionReason('');
      await loadData();
      await loadCorrectionsForRow(selectedRow);
    } catch (err: any) {
      addToast('error', 'Action Failed', err?.message || 'Unable to update exception.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const renderWorkStateBadge = (row: DailyBreakLedgerRow) => {
    if (row.work_state === 'ON_BREAK') {
      return (
        <Badge variant="warning" className="text-[11px] font-semibold">
          On {row.active_break_category || 'Break'}
        </Badge>
      );
    }
    if (row.work_state === 'WORKING') {
      return (
        <Badge variant="success" className="text-[11px] font-semibold">
          Working
        </Badge>
      );
    }
    if (row.work_state === 'CHECKED_OUT') {
      return (
        <Badge variant="info" className="text-[11px] font-semibold">
          Checked Out
        </Badge>
      );
    }
    if (row.work_state === 'ON_LEAVE') {
      return (
        <Badge variant="neutral" className="text-[11px] font-semibold">
          On Leave
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" className="text-[11px] font-semibold">
        {row.work_state === 'ABSENT' ? 'Absent' : 'Not Checked In'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Operational Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Breaks & Work Hours Operational Center
            </h1>
            <Badge variant="info" className="font-semibold">
              Time Control Engine • v{policy.version}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Live employee break tracking, paid allowances, unpaid deductions, exception monitoring & payroll reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm font-medium border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingPolicy(JSON.parse(JSON.stringify(policy)));
              setIsPolicyModalOpen(true);
            }}
          >
            <Settings className="w-4 h-4 mr-1.5" /> Break Policies
          </Button>
        </div>
      </div>

      {/* Live Daily Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>CHECKED IN</span>
            <Users className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {kpis.checkedInCount}
            <span className="text-xs font-medium text-gray-400 ml-1">/ {kpis.scheduledCount}</span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">{kpis.workingCount} actively working</div>
        </Card>

        <Card className="p-3.5 border-amber-100 bg-amber-50/30">
          <div className="flex items-center justify-between text-xs text-amber-700 font-semibold">
            <span>ON BREAK NOW</span>
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{kpis.onBreakCount}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Live break sessions</div>
        </Card>

        <Card className="p-3.5 border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>CHECKED OUT</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.checkedOutCount}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{kpis.absentCount} absent / pending</div>
        </Card>

        <Card className="p-3.5 border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>MISSING BREAKS</span>
            <Timer className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-700 mt-1">{kpis.missingBreaksCount}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Mandatory lunch check</div>
        </Card>

        <Card className="p-3.5 border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>EXCEEDED LIMIT</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{kpis.exceededBreaksCount}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{kpis.incompleteBreaksCount} incomplete</div>
        </Card>

        <Card className="p-3.5 border-rose-100 bg-rose-50/30">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>OPEN EXCEPTIONS</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-800 mt-1">{kpis.openExceptionsCount}</div>
          <div className="text-[11px] text-rose-700 mt-0.5">Requires HR review</div>
        </Card>
      </div>

      {/* Policy Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase">Auto-Deduction Rule</span>
            <Coffee className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {policy.auto_deduct_enabled ? `${policy.auto_deduct_minutes} Minutes` : 'Disabled'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            After {Math.round(policy.auto_deduct_after_minutes / 60)}h continuous presence (non-duplicating)
          </p>
        </Card>

        <Card className="p-4 border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase">Paid Break Allowance</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {policy.paid_break_allowance_minutes} Minutes / Day
          </div>
          <p className="text-xs text-gray-500 mt-1">Credited only when paid break is logged</p>
        </Card>

        <Card className="p-4 border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase">Core Working Hours</span>
            <ShieldAlert className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {policy.core_hours_start} - {policy.core_hours_end}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {policy.breaks_prohibited_in_core_hours ? 'Breaks prohibited in core window' : 'Core presence window'}
          </p>
        </Card>

        <Card className="p-4 border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase">Max Unpaid Break Limit</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{policy.max_unpaid_break_minutes} Minutes</div>
          <p className="text-xs text-rose-600 font-medium mt-1">Excess generates review exception</p>
        </Card>
      </div>

      {/* Real Interactive Day Timeline (Zero Hardcoded Demo Data) */}
      <Card className="p-5 border-gray-100">
        {activeTimelineRow ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Interactive Day Timeline
                </h3>
                <p className="text-sm font-bold text-gray-900">
                  {activeTimelineRow.employee_name} ({activeTimelineRow.employee_code}) —{' '}
                  {activeTimelineRow.shift_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {renderWorkStateBadge(activeTimelineRow)}
                <Badge variant="success" className="text-xs">
                  {formatMinutesAsHoursMins(activeTimelineRow.net_payable_minutes)} Payable
                </Badge>
                <Button size="sm" variant="outline" onClick={() => openBreakdownDrawer(activeTimelineRow)}>
                  Inspect & Correct
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              {buildAttendanceTimelineIntervals({
                checkInAt: activeTimelineRow.check_in_at,
                checkOutAt: activeTimelineRow.check_out_at,
                breaks: activeTimelineRow.breaks,
                approvedOtMinutes: activeTimelineRow.approved_ot_minutes,
              }).map((seg) => {
                const segStyle =
                  seg.type === 'CHECK_IN' || seg.type === 'CHECK_OUT'
                    ? 'bg-slate-900 text-white'
                    : seg.type === 'WORK'
                    ? seg.is_current
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-emerald-600 text-white'
                    : seg.type === 'PAID_BREAK'
                    ? seg.is_current
                      ? 'bg-teal-600 text-white animate-pulse ring-2 ring-teal-300'
                      : 'bg-teal-600 text-white'
                    : seg.type === 'UNPAID_BREAK'
                    ? seg.is_current
                      ? 'bg-amber-600 text-white animate-pulse ring-2 ring-amber-300'
                      : 'bg-amber-500 text-white'
                    : 'bg-purple-600 text-white';

                const timeWindow = seg.end_at
                  ? `${formatTimeShort(seg.start_at)}–${formatTimeShort(seg.end_at)}`
                  : formatTimeShort(seg.start_at);

                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => openBreakdownDrawer(activeTimelineRow)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition hover:opacity-90 flex items-center gap-1.5 ${segStyle}`}
                  >
                    <span>
                      {seg.title}: {timeWindow}
                      {seg.duration_minutes > 0 ? ` (${formatMinutesAsHoursMins(seg.duration_minutes)})` : ''}
                    </span>
                    {seg.is_current && (
                      <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-extrabold">
                        LIVE
                      </span>
                    )}
                  </button>
                );
              })}

              {!activeTimelineRow.check_out_at && (
                <div className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold ml-auto">
                  Shift Ends: {activeTimelineRow.scheduled_end}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-sm text-gray-500">
            No checked-in attendance sessions recorded for <span className="font-semibold">{selectedDate}</span> yet.
            Click any employee row below once punches arrive to inspect their live presence and break cycle.
          </div>
        )}
      </Card>

      {/* Filter Bar */}
      <Card className="p-4 border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700"
          >
            <option value="ALL">All States</option>
            <option value="ON_BREAK">On Break</option>
            <option value="WORKING">Working</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="NOT_CHECKED_IN">Not Checked In</option>
            <option value="ABSENT">Absent</option>
          </select>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | BreakCategoryCode)}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700"
            >
              <option value="ALL">All Breaks</option>
              <option value="LUNCH">Lunch</option>
              <option value="TEA">Tea</option>
              <option value="COFFEE">Coffee</option>
              <option value="PERSONAL">Personal</option>
              <option value="REST">Rest</option>
              <option value="OTHER">Other</option>
            </select>
            <button
              type="button"
              onClick={() => setExceptionsOnly((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                exceptionsOnly
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Exceptions
            </button>
          </div>
        </div>
      </Card>

      {/* Work Hours & Break Deduction Ledger */}
      {loadError && (
        <Card className="p-4 border-rose-200 bg-rose-50 flex items-center justify-between gap-3">
          <div className="text-sm text-rose-800 font-medium">
            Failed to load live break & attendance records: {loadError}
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </Card>
      )}

      <Card className="overflow-hidden border-gray-100">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
            Work Hours & Break Deduction Ledger ({filteredRows.length})
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split(':') as [typeof sortBy, typeof sortDir];
                setSortBy(k);
                setSortDir(d);
              }}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-700"
            >
              <option value="state:asc">Sort: Live State</option>
              <option value="name:asc">Sort: Name (A–Z)</option>
              <option value="net_payable:desc">Sort: Net Payable (High–Low)</option>
              <option value="exceptions:desc">Sort: Exceptions</option>
            </select>
            <Button variant="outline" size="sm" onClick={exportLedgerCsv} disabled={filteredRows.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Shift & State</TableHead>
              <TableHead>Actual Presence</TableHead>
              <TableHead>Break Deductions (Unpaid)</TableHead>
              <TableHead>Paid Allowances</TableHead>
              <TableHead>Net Payable Work</TableHead>
              <TableHead>Exceptions</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500 text-sm">
                  {loading ? 'Loading break & work hours ledger...' : 'No matching employees found.'}
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map((rec) => {
                const openExcCount = rec.exceptions.filter(
                  (e) => e.status === 'OPEN' || e.status === 'IN_REVIEW'
                ).length;
                const totalUnpaidDeducted =
                  rec.unpaid_break_minutes + rec.auto_deducted_break_minutes;

                return (
                  <TableRow
                    key={rec.id}
                    className="hover:bg-gray-50/70 cursor-pointer"
                    onClick={() => openBreakdownDrawer(rec)}
                  >
                    <TableCell>
                      <div className="font-semibold text-gray-900">{rec.employee_name}</div>
                      <div className="text-xs text-gray-500">
                        {rec.employee_code} • {rec.department}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-800">{rec.shift_code}</span>
                        {renderWorkStateBadge(rec)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {rec.scheduled_start}–{rec.scheduled_end} ({formatMinutesAsHoursMins(rec.scheduled_minutes)}) •{' '}
                        <span className="font-medium text-gray-700">
                          Net {formatMinutesAsHoursMins(rec.expected_net_work_minutes)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-gray-800">
                        {formatMinutesAsHoursMins(rec.gross_presence_minutes)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatTimeShort(rec.check_in_at)} → {formatTimeShort(rec.check_out_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-rose-600">-{totalUnpaidDeducted}m</div>
                      <div className="text-xs text-gray-400">
                        {rec.auto_deducted_break_minutes > 0
                          ? `Incl. ${rec.auto_deducted_break_minutes}m auto-deduct`
                          : `${rec.breaks.filter((b) => !b.is_paid && b.status !== 'CANCELLED').length} unpaid breaks`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`font-semibold ${
                          rec.paid_break_minutes > 0 ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      >
                        {rec.paid_break_minutes > 0 ? `+${rec.paid_break_minutes}m` : '0m'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {rec.paid_break_minutes > 0 ? 'Credited paid break' : 'None logged'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-gray-900 text-base">
                        {formatMinutesAsHoursMins(rec.net_payable_minutes)}
                      </div>
                      {rec.approved_ot_minutes > 0 ? (
                        <div className="text-xs font-medium text-purple-600">
                          +{formatMinutesAsHoursMins(rec.approved_ot_minutes)} Approved OT
                        </div>
                      ) : rec.check_in_at && !rec.check_out_at ? (
                        <div className="text-xs font-medium text-emerald-600">
                          Shift in progress
                        </div>
                      ) : rec.deficit_minutes > 0 && rec.check_out_at ? (
                        <div className="text-xs font-medium text-rose-600">
                          -{rec.deficit_minutes}m Deficit
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {rec.check_in_at ? 'On track' : 'No presence'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {openExcCount > 0 ? (
                        <Badge variant="danger" className="text-[11px] font-bold">
                          {openExcCount} Open
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">Clear</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBreakdownDrawer(rec);
                        }}
                      >
                        <Info className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Breakdown
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>
              Page {safePage} of {totalPages} ({filteredRows.length} employees)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Break Policy Configuration Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Break Policy & Category Rules (v{policy.version})
                </h2>
                <p className="text-xs text-gray-500">
                  Changes create a new versioned snapshot in break_policy_versions for payroll auditability
                </p>
              </div>
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Apply Policy To (Scope)
                </label>
                <select
                  value={
                    editingPolicy.scope_type === 'SHIFT' && editingPolicy.scope_id
                      ? `SHIFT:${editingPolicy.scope_id}`
                      : 'ORGANIZATION'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ORGANIZATION') {
                      const existingOrg =
                        allPolicies.find((p) => p.scope_type === 'ORGANIZATION' && p.is_active) || policy;
                      setEditingPolicy(JSON.parse(JSON.stringify(existingOrg)));
                    } else if (val.startsWith('SHIFT:')) {
                      const shiftId = val.replace('SHIFT:', '');
                      const existingShiftPol = allPolicies.find(
                        (p) => p.scope_type === 'SHIFT' && p.scope_id === shiftId && p.is_active
                      );
                      if (existingShiftPol) {
                        setEditingPolicy(JSON.parse(JSON.stringify(existingShiftPol)));
                      } else {
                        const sh = shiftOptions.find((s) => s.id === shiftId);
                        const base = JSON.parse(JSON.stringify(policy)) as ScopedBreakPolicy;
                        setEditingPolicy({
                          ...base,
                          id: '',
                          version: 1,
                          scope_type: 'SHIFT',
                          scope_id: shiftId,
                          name: sh ? `${sh.code} (${sh.start_time}–${sh.end_time}) Break Policy` : 'Shift Break Policy',
                        });
                      }
                    }
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="ORGANIZATION">Organization Default (All Shifts)</option>
                  {shiftOptions.map((sh) => {
                    const hasCustom = allPolicies.some(
                      (p) => p.scope_type === 'SHIFT' && p.scope_id === sh.id && p.is_active
                    );
                    return (
                      <option key={sh.id} value={`SHIFT:${sh.id}`}>
                        Shift: {sh.code} ({sh.start_time}–{sh.end_time}, {sh.min_full_day_hours}h net)
                        {hasCustom ? ' ★ Custom' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex items-end text-xs text-gray-500 pb-1">
                {editingPolicy.scope_type === 'SHIFT'
                  ? 'Shift-specific rules override the Organization Default for employees on this shift (e.g., 8h vs 9h vs 12h shifts).'
                  : 'Applies to all shifts unless overridden by a Shift-specific policy.'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Policy Name</label>
                <input
                  type="text"
                  value={editingPolicy.name}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Effective From</label>
                <input
                  type="date"
                  value={editingPolicy.effective_from}
                  onChange={(e) =>
                    setEditingPolicy({ ...editingPolicy, effective_from: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Rounding Rule</label>
                <select
                  value={editingPolicy.rounding_rule}
                  onChange={(e) =>
                    setEditingPolicy({
                      ...editingPolicy,
                      rounding_rule: e.target.value as ScopedBreakPolicy['rounding_rule'],
                    })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                >
                  <option value="NONE">Exact Minute (None)</option>
                  <option value="NEAREST_5">Nearest 5 Minutes</option>
                  <option value="UP_5">Round Up 5 Minutes</option>
                  <option value="DOWN_5">Round Down 5 Minutes</option>
                  <option value="NEAREST_15">Nearest 15 Minutes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Auto-Deduct (mins)
                </label>
                <input
                  type="number"
                  value={editingPolicy.auto_deduct_minutes}
                  onChange={(e) =>
                    setEditingPolicy({
                      ...editingPolicy,
                      auto_deduct_minutes: Number(e.target.value || 0),
                    })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  After Work (mins)
                </label>
                <input
                  type="number"
                  value={editingPolicy.auto_deduct_after_minutes}
                  onChange={(e) =>
                    setEditingPolicy({
                      ...editingPolicy,
                      auto_deduct_after_minutes: Number(e.target.value || 0),
                    })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Paid Allowance (mins)
                </label>
                <input
                  type="number"
                  value={editingPolicy.paid_break_allowance_minutes}
                  onChange={(e) =>
                    setEditingPolicy({
                      ...editingPolicy,
                      paid_break_allowance_minutes: Number(e.target.value || 0),
                    })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Max Unpaid / Day (mins)
                </label>
                <input
                  type="number"
                  value={editingPolicy.max_unpaid_break_minutes}
                  onChange={(e) =>
                    setEditingPolicy({
                      ...editingPolicy,
                      max_unpaid_break_minutes: Number(e.target.value || 0),
                    })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Core Hours Start
                </label>
                <input
                  type="time"
                  value={editingPolicy.core_hours_start}
                  onChange={(e) =>
                    setEditingPolicy({ ...editingPolicy, core_hours_start: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Core Hours End
                </label>
                <input
                  type="time"
                  value={editingPolicy.core_hours_end}
                  onChange={(e) =>
                    setEditingPolicy({ ...editingPolicy, core_hours_end: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPolicy.auto_deduct_enabled}
                  onChange={(e) =>
                    setEditingPolicy({ ...editingPolicy, auto_deduct_enabled: e.target.checked })
                  }
                />
                Enable non-duplicating auto-deduction
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPolicy.mandatory_lunch_break}
                  onChange={(e) =>
                    setEditingPolicy({ ...editingPolicy, mandatory_lunch_break: e.target.checked })
                  }
                />
                Flag missing mandatory lunch break
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPolicy.breaks_prohibited_in_core_hours}
                  onChange={(e) =>
                    setEditingPolicy({
                      ...editingPolicy,
                      breaks_prohibited_in_core_hours: e.target.checked,
                    })
                  }
                />
                Prohibit personal/other breaks during core hours
              </label>
            </div>

            {/* Category Rules Table */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 uppercase">
                Break Category Configuration
              </div>
              <div className="divide-y divide-gray-100">
                {editingPolicy.categories.map((cat, idx) => (
                  <div
                    key={cat.code}
                    className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-xs"
                  >
                    <div className="col-span-3 font-semibold text-gray-800">{cat.label}</div>
                    <label className="col-span-2 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cat.enabled}
                        onChange={(e) => {
                          const next = [...editingPolicy.categories];
                          next[idx] = { ...cat, enabled: e.target.checked };
                          setEditingPolicy({ ...editingPolicy, categories: next });
                        }}
                      />
                      Enabled
                    </label>
                    <label className="col-span-2 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cat.paid}
                        onChange={(e) => {
                          const next = [...editingPolicy.categories];
                          next[idx] = { ...cat, paid: e.target.checked };
                          setEditingPolicy({ ...editingPolicy, categories: next });
                        }}
                      />
                      Paid
                    </label>
                    <div className="col-span-3 flex items-center gap-1">
                      <span className="text-gray-500">Max min:</span>
                      <input
                        type="number"
                        value={cat.max_minutes_per_break}
                        onChange={(e) => {
                          const next = [...editingPolicy.categories];
                          next[idx] = {
                            ...cat,
                            max_minutes_per_break: Number(e.target.value || 15),
                          };
                          setEditingPolicy({ ...editingPolicy, categories: next });
                        }}
                        className="w-16 border border-gray-200 rounded px-1.5 py-1"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="text-gray-500">Day:</span>
                      <input
                        type="number"
                        value={cat.max_per_day}
                        onChange={(e) => {
                          const next = [...editingPolicy.categories];
                          next[idx] = { ...cat, max_per_day: Number(e.target.value || 1) };
                          setEditingPolicy({ ...editingPolicy, categories: next });
                        }}
                        className="w-12 border border-gray-200 rounded px-1.5 py-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Policy Change Summary (Audit Log)
              </label>
              <input
                type="text"
                placeholder="e.g. Increased tea break allowance to 20m for plant shifts"
                value={policyChangeSummary}
                onChange={(e) => setPolicyChangeSummary(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setIsPolicyModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSavePolicy} disabled={savingPolicy}>
                <Save className="w-4 h-4 mr-1.5" />
                {savingPolicy ? 'Saving...' : 'Save Policy Version'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Employee Break Breakdown & HR Correction Drawer */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{selectedRow.employee_name}</h2>
                  {renderWorkStateBadge(selectedRow)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedRow.employee_code} • {selectedRow.department} • {selectedRow.attendance_date}
                </p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-[11px] text-gray-500 font-semibold">PRESENCE</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">
                  {formatMinutesAsHoursMins(selectedRow.gross_presence_minutes)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-[11px] text-emerald-700 font-semibold">PAID BREAK</div>
                <div className="text-sm font-bold text-emerald-800 mt-0.5">
                  {selectedRow.paid_break_minutes}m
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <div className="text-[11px] text-rose-700 font-semibold">DEDUCTED</div>
                <div className="text-sm font-bold text-rose-800 mt-0.5">
                  -{selectedRow.unpaid_break_minutes + selectedRow.auto_deducted_break_minutes}m
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 text-white">
                <div className="text-[11px] text-slate-300 font-semibold">NET PAYABLE</div>
                <div className="text-sm font-bold mt-0.5">
                  {formatMinutesAsHoursMins(selectedRow.net_payable_minutes)}
                </div>
              </div>
            </div>

            {/* Calculation Steps */}
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-1.5">
              <div className="text-xs font-bold text-gray-700 uppercase">
                Calculation Explainability (Policy v{selectedRow.policy_version})
              </div>
              {selectedRow.steps.map((step, i) => (
                <div key={i} className="text-xs text-gray-600">
                  {step}
                </div>
              ))}
            </div>

            {/* Open / Historical Exceptions */}
            {selectedRow.exceptions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-gray-700">Break Exceptions</h4>
                {selectedRow.exceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-800">{ex.exception_type}</span>
                      <Badge variant={ex.status === 'OPEN' ? 'danger' : 'neutral'} className="text-[10px]">
                        {ex.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700">{ex.details}</p>
                    {(ex.status === 'OPEN' || ex.status === 'IN_REVIEW') && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submittingCorrection}
                          onClick={() => handleResolveException(ex, 'APPROVE_EXCEPTION')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submittingCorrection}
                          onClick={() => handleResolveException(ex, 'WAIVE_EXCEPTION')}
                        >
                          Waive
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={submittingCorrection}
                          onClick={() => handleResolveException(ex, 'REJECT_EXCEPTION')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recorded Break Events + Add/Edit */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-gray-700">
                  Recorded Break Events ({selectedRow.breaks.filter((b) => b.status !== 'CANCELLED').length})
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingBreak(null);
                    setAddBreakMode((v) => !v);
                    setFormCategory('LUNCH');
                    setFormStartTime('13:00');
                    setFormEndTime('13:45');
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Missed Break
                </Button>
              </div>

              {(addBreakMode || editingBreak) && (
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                  <div className="text-xs font-bold text-emerald-900">
                    {editingBreak ? `Edit ${editingBreak.break_category} Break` : 'Add Missed Break Event'}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as BreakCategoryCode)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                    >
                      <option value="LUNCH">LUNCH</option>
                      <option value="TEA">TEA</option>
                      <option value="COFFEE">COFFEE</option>
                      <option value="PERSONAL">PERSONAL</option>
                      <option value="REST">REST</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                    />
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Mandatory HR audit reason (required)..."
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddBreakMode(false);
                        setEditingBreak(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={submittingCorrection}
                      onClick={handleSubmitBreakCorrection}
                    >
                      Save & Recalculate
                    </Button>
                  </div>
                </div>
              )}

              {selectedRow.breaks.filter((b) => b.status !== 'CANCELLED').length === 0 ? (
                <div className="text-xs text-gray-500 py-3 text-center border border-dashed border-gray-200 rounded-xl">
                  No break events recorded for this date.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRow.breaks
                    .filter((b) => b.status !== 'CANCELLED')
                    .map((brk) => (
                      <div
                        key={brk.id}
                        className="p-3 rounded-xl border border-gray-200 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">
                              {brk.break_category}
                            </span>
                            <Badge variant={brk.is_paid ? 'success' : 'warning'} className="text-[10px]">
                              {brk.is_paid ? 'Paid' : 'Unpaid'}
                            </Badge>
                            {brk.status === 'ACTIVE' && (
                              <Badge variant="warning" className="text-[10px]">
                                ACTIVE
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatTimeShort(brk.started_at)} →{' '}
                            {brk.ended_at ? formatTimeShort(brk.ended_at) : 'In progress'} (
                            {brk.duration_minutes ?? 0}m) • Source: {brk.source}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingBreak(brk);
                              setAddBreakMode(false);
                              setFormCategory(brk.break_category);
                              setFormStartTime(toLocalTimeInput(brk.started_at));
                              setFormEndTime(toLocalTimeInput(brk.ended_at || brk.started_at));
                            }}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBreak(brk)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Correction Audit Trail */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-gray-700">
                <History className="w-3.5 h-3.5" /> Audit Trail ({corrections.length})
              </div>
              {loadingCorrections ? (
                <div className="text-xs text-gray-400">Loading audit log...</div>
              ) : corrections.length === 0 ? (
                <div className="text-xs text-gray-400">No HR corrections recorded for this session.</div>
              ) : (
                <div className="space-y-1.5">
                  {corrections.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                      <div className="flex items-center justify-between font-semibold text-gray-800">
                        <span>{c.action_type}</span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-gray-600 mt-0.5">
                        {c.reason} — <span className="font-medium">{c.actor_name || 'HR Admin'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
