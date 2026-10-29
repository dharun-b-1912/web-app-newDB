// src/features/attendance/subviews/PermissionGovernanceView.tsx
// ============================================================================
// JOY PeopleHR — Enterprise Permission Governance & Allowance Console
// Production-Grade UI/UX | Compact Accordion Policies | Monthly Event Timeline Drawer
// Concurrency-Safe Ledger | 120m Quota | Policy A Crossing-Day Governance | Server-Ready
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  Clock,
  Plus,
  Search,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  User,
  Zap,
  Info,
  CheckCircle,
  TrendingDown,
  Sliders,
  Flame,
  ArrowRight,
  ExternalLink,
  History,
  AlertCircle,
  X,
  CalendarDays,
  Activity,
  FileCheck2,
} from 'lucide-react';
import { api } from '../../../services/api';
import { supabase } from '../../../lib/supabase';
import {
  permissionGovernanceService,
  EmployeeMonthlyPermissionLedger,
  PermissionPolicyConfig,
  PermissionThresholdPolicy,
  AttendancePermissionRecord,
} from '../../../services/attendance/permissionGovernanceService';
import { cn } from '../../../lib/utils';

export const PermissionGovernanceView: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'LEDGER' | 'POLICY' | 'EXCEPTIONS'>('LEDGER');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Pagination for Employee Monthly Ledger
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Policy Settings State
  const [policyConfig, setPolicyConfig] = useState<PermissionPolicyConfig>(() =>
    permissionGovernanceService.loadPolicyConfig()
  );
  const [monthlyAllowanceMins, setMonthlyAllowanceMins] = useState(policyConfig.monthlyAllowanceMinutes);
  const [activePolicy, setActivePolicy] = useState<PermissionThresholdPolicy>(policyConfig.activePolicy);
  const [consumeOn, setConsumeOn] = useState(policyConfig.consumeOn);
  const [includeLateArrivals, setIncludeLateArrivals] = useState(policyConfig.includeLateArrivalsBeyondGrace ?? true);
  const [excessHandling, setExcessHandling] = useState(policyConfig.subsequentExcessHandling || 'MARK_EVERY_EXCESS_HALF_DAY');

  // Collapsible Accordion States for Policy Settings
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    allowance: true,
    consumption: false,
    threshold: false,
    excess: false,
    classification: false,
    audit: false,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Record Permission Modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permEmployeeId, setPermEmployeeId] = useState('');
  const [permDate, setPermDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [permCategory, setPermCategory] = useState<'LATE_ARRIVAL_PERMISSION' | 'EARLY_DEPARTURE_PERMISSION' | 'MIDDAY_PERSONAL_PERMISSION'>('LATE_ARRIVAL_PERMISSION');
  const [permMinutes, setPermMinutes] = useState(30);
  const [permReason, setPermReason] = useState('Personal urgent appointment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Employee Detail Slide-Over Drawer
  const [selectedDrawerEmp, setSelectedDrawerEmp] = useState<EmployeeMonthlyPermissionLedger | null>(null);
  const [drawerHistory, setDrawerHistory] = useState<AttendancePermissionRecord[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // In-memory calculated ledgers
  const [ledgers, setLedgers] = useState<EmployeeMonthlyPermissionLedger[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const empList = await api.getEmployees().catch(() => api.getEmployeesSync());
      setEmployees(empList || []);

      const orgId = '0c621892-e938-4707-9957-13534ea32c19';
      const calcLedgers: EmployeeMonthlyPermissionLedger[] = [];

      for (const emp of (empList || [])) {
        const l = await permissionGovernanceService.calculateMonthlyLedger(orgId, emp.id, selectedMonth, {
          employeeCode: emp.employee_code,
          employeeName: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        });
        calcLedgers.push(l);
      }
      setLedgers(calcLedgers);
    } catch (err: any) {
      showToast('Failed to load permission ledger data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      const d = e.department || (e.departments as any)?.name;
      if (d) set.add(d);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered ledgers
  const filteredLedgers = useMemo(() => {
    return ledgers.filter((l) => {
      const name = l.employeeName.toLowerCase();
      const code = l.employeeCode.toLowerCase();
      const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());
      const empObj = employees.find((e) => e.id === l.employeeId);
      const matchesDept = selectedDept === 'ALL' || empObj?.department === selectedDept || (empObj?.departments as any)?.name === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [ledgers, searchQuery, selectedDept, employees]);

  // Paginated ledgers
  const paginatedLedgers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLedgers.slice(start, start + pageSize);
  }, [filteredLedgers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredLedgers.length / pageSize) || 1;

  // Save Policy Changes
  const handleSavePolicy = () => {
    const updated = permissionGovernanceService.savePolicyConfig({
      monthlyAllowanceMinutes: Number(monthlyAllowanceMins),
      activePolicy,
      consumeOn,
      includeLateArrivalsBeyondGrace: includeLateArrivals,
      subsequentExcessHandling: excessHandling,
    });
    setPolicyConfig(updated);
    showToast('Permission policy configuration saved & applied to current period', 'success');
    loadData();
  };

  // Record New Permission Request
  const handleRecordPermission = async () => {
    if (!permEmployeeId) {
      showToast('Please select an employee', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedEmp = employees.find((e) => e.id === permEmployeeId);
      await permissionGovernanceService.recordPermission({
        organizationId: '0c621892-e938-4707-9957-13534ea32c19',
        employeeId: permEmployeeId,
        employeeCode: selectedEmp?.employee_code || permEmployeeId,
        employeeName: `${selectedEmp?.first_name || ''} ${selectedEmp?.last_name || ''}`.trim(),
        attendanceDate: permDate,
        category: permCategory,
        requestedMinutes: Number(permMinutes),
        approvedMinutes: Number(permMinutes),
        usedMinutes: Number(permMinutes),
        reason: permReason,
        status: 'APPROVED',
        approvedBy: 'HR Administrator',
        approvedAt: new Date().toISOString(),
      });

      showToast(`Logged ${permMinutes}m approved permission for ${selectedEmp?.first_name || 'employee'} on ${permDate}`, 'success');
      setIsPermModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error recording permission', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Slide-over Drawer for an Employee
  const handleOpenDrawer = async (ledger: EmployeeMonthlyPermissionLedger) => {
    setSelectedDrawerEmp(ledger);
    setDrawerLoading(true);
    try {
      const history = await permissionGovernanceService.getEmployeePermissionsForMonth(ledger.employeeId, selectedMonth);
      setDrawerHistory(history || []);
    } catch (_) {
      setDrawerHistory([]);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Exceptions list: approaching or exceeded allowance
  const exceptionLedgers = useMemo(() => {
    return ledgers.filter((l) => l.totalApprovedMinutes > 90 || l.isThresholdExceeded);
  }, [ledgers]);

  const getInitials = (name?: string) => {
    if (!name) return 'EM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Get selected employee's current ledger stats for the modal preview
  const selectedEmpLedger = useMemo(() => {
    return ledgers.find((l) => l.employeeId === permEmployeeId);
  }, [ledgers, permEmployeeId]);

  return (
    <div className="space-y-6">
      {/* 1. Top Enterprise Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span>Shift & Scheduling</span>
              <span>•</span>
              <span className="text-gray-900 font-bold">Permission Governance</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#07563D] border border-emerald-200/80">
                <ShieldCheck className="w-3.5 h-3.5 text-[#07563D]" />
                120m Monthly Quota Engine
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Permission Allowance & Ledger Console</h1>
            <p className="text-xs text-gray-500 mt-1">
              Deterministic 2-hour (120m) monthly quota tracking, Policy A threshold-crossing day evaluation, and subsequent excess half-day regulation.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs font-mono font-medium rounded-xl border border-gray-200/90 text-gray-800 bg-gray-50/50 hover:bg-white focus:outline-none focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/10 transition-all h-10"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 h-10 px-3.5 gap-2"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              <span>Recalculate</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                if (employees.length > 0) setPermEmployeeId(employees[0].id);
                setIsPermModalOpen(true);
              }}
              className="rounded-xl bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs h-10 px-4 gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Permission</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Compact Real-Time KPI Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-blue-200 transition-all">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Monthly Quota</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-1">{monthlyAllowanceMins}m</div>
          <div className="text-[11px] text-gray-500 mt-1">2.0 Hours per Staff / Mo</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-purple-200 transition-all">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Staff Evaluated</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-1">{ledgers.length}</div>
          <div className="text-[11px] text-gray-500 mt-1">Active Workforce Headcount</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-200 transition-all">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Within Allowance</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#07563D] mt-1">
            {ledgers.filter((l) => !l.isThresholdExceeded).length}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Compliant within 120m</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-amber-200 transition-all">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Threshold Crossed</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {ledgers.filter((l) => l.isThresholdExceeded).length}
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">Half-Day Classified</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-indigo-200 transition-all">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Active Policy</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-sm font-black text-gray-900 mt-1 truncate">Policy A (Crossing)</div>
          <div className="text-[11px] text-indigo-700 font-semibold mt-1 truncate">
            {excessHandling === 'MARK_EVERY_EXCESS_HALF_DAY' ? 'Company Strict' : 'Enterprise Log'}
          </div>
        </div>
      </div>

      {/* 3. Segmented Pill Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1.5 bg-gray-100/90 rounded-2xl w-fit border border-gray-200/60">
        {[
          { id: 'LEDGER', label: 'Employee Monthly Ledger', icon: Layers },
          { id: 'POLICY', label: 'Policy Settings & Thresholds', icon: SlidersHorizontal },
          { id: 'EXCEPTIONS', label: 'Exceptions & Review Desk', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer',
                isActive
                  ? 'bg-white text-gray-900 shadow-2xs ring-1 ring-black/5'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-[#07563D]' : 'text-gray-400')} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMPLOYEE MONTHLY LEDGER */}
      {activeTab === 'LEDGER' && (
        <Card className="p-6 rounded-3xl border-gray-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name or employee code..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/10"
                />
              </div>

              <div className="relative">
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none text-xs border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-gray-700 bg-white focus:outline-none focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/10 cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="text-xs text-gray-500 font-semibold flex items-center gap-3">
              <span>
                Month: <strong className="text-gray-900 font-mono font-bold">{selectedMonth}</strong> • Quota:{' '}
                <strong className="text-[#07563D] font-mono font-bold">{monthlyAllowanceMins}m</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  <TableHead className="text-xs font-bold text-gray-600">Employee</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Month</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Approved Permissions</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Late Beyond Grace</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Combined Quota (120m)</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Remaining</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Excess</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Threshold Date</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Classification Status</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLedgers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-xs text-gray-500">
                      No records match the specified filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLedgers.map((l) => {
                    const pct = l.consumptionPercentage || Math.min(100, Math.round((l.totalApprovedMinutes / l.openingAllowanceMinutes) * 100));
                    return (
                      <TableRow key={l.id} className="hover:bg-gray-50/60">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#07563D] font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(l.employeeName)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-xs">{l.employeeName}</div>
                              <div className="text-[11px] text-gray-400 font-mono">{l.employeeCode}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-gray-700">{l.monthStr}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-blue-700">
                          {l.permissionMinutesOnly || 0}m
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold text-amber-700">
                          {l.lateMinutesConsumed || 0}m
                        </TableCell>
                        <TableCell>
                          <div className="w-36">
                            <div className="flex justify-between items-center text-[11px] font-mono mb-1">
                              <span className="font-bold text-gray-900">{l.totalApprovedMinutes}m</span>
                              <span className="text-gray-500 font-semibold">{pct}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                )}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold text-emerald-700">
                          {l.remainingAllowanceMinutes}m
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {l.excessMinutes > 0 ? (
                            <span className="text-rose-600 font-black">+{l.excessMinutes}m</span>
                          ) : (
                            <span className="text-gray-400">0m</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-gray-700 font-medium">
                          {l.thresholdCrossingDate || '—'}
                        </TableCell>
                        <TableCell>
                          {l.isThresholdExceeded ? (
                            <Badge variant="warning" className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-300">
                              Threshold Crossed (Half-Day)
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px] font-bold bg-emerald-50 text-[#07563D] border-emerald-200">
                              Within Allowance
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDrawer(l)}
                            className="h-8 text-xs text-[#07563D] hover:text-[#064e37] hover:bg-emerald-50 px-2.5 rounded-xl font-bold"
                          >
                            Breakdown
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Page <strong className="text-gray-900">{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg h-8 px-2.5 text-xs border-gray-200"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg h-8 px-2.5 text-xs border-gray-200"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: POLICY SETTINGS WITH COMPACT ACCORDION GROUPS */}
      {activeTab === 'POLICY' && (
        <Card className="p-6 rounded-3xl border-gray-200/80 shadow-2xs max-w-4xl space-y-6">
          {/* Active Policy Concise Summary Card */}
          <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white p-5 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#07563D] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#07563D]" />
                Active Attendance Governance Summary
              </span>
              <span className="text-[10px] font-bold bg-[#07563D] text-white px-2.5 py-0.5 rounded-full">
                Policy Version 2.0 • Live
              </span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              Every staff member receives a <strong>120-minute (2-Hour)</strong> monthly permission allowance. When combined permissions and late arrivals beyond the 15-minute grace period exceed 120 minutes, <strong>Policy A classifies the exact threshold-crossing day as a Half-Day</strong>. Under <strong>Company Strict subsequent excess governance</strong>, each subsequent day with excess arrival is also regulated as a Half-Day.
            </p>
          </div>

          <div className="space-y-4">
            {/* Accordion 1: Monthly Allowance Quota */}
            <div className="rounded-2xl border border-gray-200/90 overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('allowance')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Monthly Allowance & Workforce Scope</span>
                    <span className="text-[11px] text-gray-500">Configure standard minute quotas for the corporate entity</span>
                  </div>
                </div>
                {openSections.allowance ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {openSections.allowance && (
                <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/40 space-y-3">
                  <label className="text-xs font-bold text-gray-800 block mt-3">Monthly Allowance Quota</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={monthlyAllowanceMins}
                      onChange={(e) => setMonthlyAllowanceMins(Number(e.target.value))}
                      className="w-32 text-sm font-mono font-bold border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 bg-white focus:outline-none focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/10"
                    />
                    <span className="text-xs text-gray-600">
                      Minutes = <strong className="text-gray-900 font-bold">{(monthlyAllowanceMins / 60).toFixed(1)} Hours</strong> per employee / month
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: Consumption Basis & Grace Period */}
            <div className="rounded-2xl border border-gray-200/90 overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('consumption')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Consumption Basis & Late Arrival Integration</span>
                    <span className="text-[11px] text-gray-500">Define what events consume the 120-minute allowance</span>
                  </div>
                </div>
                {openSections.consumption ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {openSections.consumption && (
                <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/40 space-y-3">
                  <div className="mt-3 bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Auto-Consume Quota for Late Arrivals Beyond 15-Minute Grace</span>
                      <span className="text-[11px] text-gray-500">Excess minutes past the shift grace window automatically deduct from the 120m allowance.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeLateArrivals}
                      onChange={(e) => setIncludeLateArrivals(e.target.checked)}
                      className="w-5 h-5 rounded-md text-[#07563D] focus:ring-[#07563D] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Threshold-Crossing Day Classification */}
            <div className="rounded-2xl border border-gray-200/90 overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('threshold')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Threshold-Crossing Day Classification Rule</span>
                    <span className="text-[11px] text-gray-500">Determine whether Policy A, Policy B, or HR Review applies</span>
                  </div>
                </div>
                {openSections.threshold ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {openSections.threshold && (
                <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/40 space-y-3">
                  <div className="mt-3 space-y-2.5">
                    <label className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer',
                      activePolicy === 'POLICY_A_THRESHOLD_CROSSING_DAY'
                        ? 'border-emerald-300 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50/60'
                    )}>
                      <input
                        type="radio"
                        name="policyChoice"
                        checked={activePolicy === 'POLICY_A_THRESHOLD_CROSSING_DAY'}
                        onChange={() => setActivePolicy('POLICY_A_THRESHOLD_CROSSING_DAY')}
                        className="mt-0.5 text-[#07563D] focus:ring-[#07563D]"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Policy A — Threshold-Crossing Day Only (Standard Enterprise Default)
                        </span>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          The exact date on which the employee’s cumulative monthly minutes exceed 120m is classified as Half-Day. Prior days within quota remain full-day regularized.
                        </p>
                      </div>
                    </label>

                    <label className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer',
                      activePolicy === 'POLICY_B_EXCESS_PERMISSION_DAY'
                        ? 'border-emerald-300 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50/60'
                    )}>
                      <input
                        type="radio"
                        name="policyChoice"
                        checked={activePolicy === 'POLICY_B_EXCESS_PERMISSION_DAY'}
                        onChange={() => setActivePolicy('POLICY_B_EXCESS_PERMISSION_DAY')}
                        className="mt-0.5 text-[#07563D] focus:ring-[#07563D]"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Policy B — Excess Single-Day Permission
                        </span>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Any single permission that independently exceeds the daily threshold triggers Half-Day classification.
                        </p>
                      </div>
                    </label>

                    <label className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer',
                      activePolicy === 'POLICY_C_HR_REVIEW'
                        ? 'border-emerald-300 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50/60'
                    )}>
                      <input
                        type="radio"
                        name="policyChoice"
                        checked={activePolicy === 'POLICY_C_HR_REVIEW'}
                        onChange={() => setActivePolicy('POLICY_C_HR_REVIEW')}
                        className="mt-0.5 text-[#07563D] focus:ring-[#07563D]"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Policy C — HR Review & Discretionary Classification
                        </span>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Threshold-crossing events are queued in the Exceptions Desk for authorized HR review before any Half-Day status is applied.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 4: Subsequent Excess Usage Handling */}
            <div className="rounded-2xl border border-gray-200/90 overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('excess')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Subsequent Excess Handling (Company Client Policy)</span>
                    <span className="text-[11px] text-gray-500">Configure treatment after the 120-minute quota is exhausted</span>
                  </div>
                </div>
                {openSections.excess ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {openSections.excess && (
                <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/40 space-y-3">
                  <div className="mt-3 space-y-2.5">
                    <label className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer',
                      excessHandling === 'MARK_EVERY_EXCESS_HALF_DAY'
                        ? 'border-[#07563D] bg-emerald-50/50 shadow-2xs ring-1 ring-[#07563D]/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50/60'
                    )}>
                      <input
                        type="radio"
                        name="excessChoice"
                        checked={excessHandling === 'MARK_EVERY_EXCESS_HALF_DAY'}
                        onChange={() => setExcessHandling('MARK_EVERY_EXCESS_HALF_DAY')}
                        className="mt-0.5 text-[#07563D] focus:ring-[#07563D]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">
                            Company Strict: Mark Every Subsequent Excess Day as Half-Day
                          </span>
                          <span className="text-[10px] font-bold bg-[#07563D] text-white px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Any subsequent late arrival or permission after exhausting the 120m threshold is automatically classified as Half-Day to prevent quota abuse.
                        </p>
                      </div>
                    </label>

                    <label className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer',
                      excessHandling === 'LOG_EXCESS_ONLY'
                        ? 'border-emerald-300 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50/60'
                    )}>
                      <input
                        type="radio"
                        name="excessChoice"
                        checked={excessHandling === 'LOG_EXCESS_ONLY'}
                        onChange={() => setExcessHandling('LOG_EXCESS_ONLY')}
                        className="mt-0.5 text-[#07563D] focus:ring-[#07563D]"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Standard Enterprise: Log Excess Minutes in Ledger Only
                        </span>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Only the threshold-crossing date is marked as Half-Day. Subsequent excess minutes are tracked in the monthly ledger without automatic deductions.
                        </p>
                      </div>
                    </label>

                    <label className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer',
                      excessHandling === 'DEDUCT_PAYROLL_HOURS'
                        ? 'border-emerald-300 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50/60'
                    )}>
                      <input
                        type="radio"
                        name="excessChoice"
                        checked={excessHandling === 'DEDUCT_PAYROLL_HOURS'}
                        onChange={() => setExcessHandling('DEDUCT_PAYROLL_HOURS')}
                        className="mt-0.5 text-[#07563D] focus:ring-[#07563D]"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Payroll LOP: Deduct Cumulative Excess from Payable Hours
                        </span>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Converts all cumulative minutes beyond 120m into hourly Loss of Pay (LOP) deductions during end-of-month payroll computation.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 5: Attendance Classification Rules */}
            <div className="rounded-2xl border border-gray-200/90 overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('classification')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Attendance Classification & Minimum Duration</span>
                    <span className="text-[11px] text-gray-500">Rules governing worked hours, missing punches, and leaves</span>
                  </div>
                </div>
                {openSections.classification ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {openSections.classification && (
                <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/40 space-y-2 text-xs text-gray-600">
                  <p className="mt-3">
                    • Minimum full day threshold: <strong>8.0 Net Hours (480 mins)</strong>.
                  </p>
                  <p>
                    • Minimum half day threshold: <strong>4.0 Net Hours (240 mins)</strong>.
                  </p>
                  <p>
                    • Missing biometric checkout events do NOT automatically trigger an absent mark; they are routed to the Exceptions & Regularization Desk.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Save Policy Button */}
          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleSavePolicy}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs rounded-xl h-10 px-6 shadow-xs gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save & Apply Policy Configuration</span>
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 3: EXCEPTIONS & REVIEW DESK */}
      {activeTab === 'EXCEPTIONS' && (
        <Card className="p-6 rounded-3xl border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Allowance Threshold Exceptions & Reviews</h3>
              <p className="text-xs text-gray-500">Staff members who have either reached 75% of quota (&gt;90m) or triggered Policy A Half-Day classification.</p>
            </div>
            <Badge variant="warning" className="text-xs bg-amber-50 text-amber-800 border-amber-300 font-bold">
              {exceptionLedgers.length} Flagged Ledgers
            </Badge>
          </div>

          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  <TableHead className="text-xs font-bold text-gray-600">Employee</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Month</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Total Approved</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Excess Minutes</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Threshold Date</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600">Action Required</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 text-right">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptionLedgers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-gray-500">
                      Zero quota threshold exceptions in this month. All staff are within 120m allowance.
                    </TableCell>
                  </TableRow>
                ) : (
                  exceptionLedgers.map((l) => (
                    <TableRow key={l.id} className="hover:bg-gray-50/60">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(l.employeeName)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-xs">{l.employeeName}</div>
                            <div className="text-[11px] text-gray-400 font-mono">{l.employeeCode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-700">{l.monthStr}</TableCell>
                      <TableCell className="text-xs font-mono font-bold">
                        <span className="text-gray-900">{l.totalApprovedMinutes}m</span> / 120m
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-rose-600">
                        +{l.excessMinutes}m
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-700 font-medium">{l.thresholdCrossingDate || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="warning" className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-300">
                          Half-Day Classified on {l.thresholdCrossingDate}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDrawer(l)}
                          className="h-8 text-xs text-[#07563D] hover:text-[#064e37] hover:bg-emerald-50 px-2.5 rounded-xl font-bold"
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* SLIDE-OVER DETAIL DRAWER: MONTHLY EVENT TIMELINE & AUDIT LOG */}
      {selectedDrawerEmp && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-[#07563D] font-bold text-xs flex items-center justify-center">
                    {getInitials(selectedDrawerEmp.employeeName)}
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-gray-900">{selectedDrawerEmp.employeeName}</h3>
                    <span className="text-xs text-gray-400 font-mono">{selectedDrawerEmp.employeeCode}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close Drawer"
                data-testid="close-drawer"
                onClick={() => setSelectedDrawerEmp(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quota Progress Summary */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Monthly Quota Consumption ({selectedMonth})
                  </span>
                  <span className="text-xs font-mono font-bold text-[#07563D]">
                    {selectedDrawerEmp.totalApprovedMinutes}m / {selectedDrawerEmp.openingAllowanceMinutes}m
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      selectedDrawerEmp.isThresholdExceeded ? 'bg-rose-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min(100, (selectedDrawerEmp.totalApprovedMinutes / selectedDrawerEmp.openingAllowanceMinutes) * 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-white p-2 rounded-xl border border-gray-200/70">
                    <span className="text-[10px] text-gray-400 block font-semibold">Remaining</span>
                    <span className="text-xs font-bold text-emerald-700 font-mono">{selectedDrawerEmp.remainingAllowanceMinutes}m</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-200/70">
                    <span className="text-[10px] text-gray-400 block font-semibold">Excess</span>
                    <span className="text-xs font-bold text-rose-600 font-mono">+{selectedDrawerEmp.excessMinutes}m</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-200/70">
                    <span className="text-[10px] text-gray-400 block font-semibold">Status</span>
                    <span className={cn('text-[11px] font-bold', selectedDrawerEmp.isThresholdExceeded ? 'text-amber-700' : 'text-emerald-700')}>
                      {selectedDrawerEmp.isThresholdExceeded ? 'Half-Day' : 'Compliant'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Timeline */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-gray-400" />
                  Monthly Permission Events
                </h4>

                {drawerLoading ? (
                  <div className="text-center py-8 text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#07563D]" />
                    <span>Loading event history...</span>
                  </div>
                ) : drawerHistory.length === 0 ? (
                  <div className="bg-gray-50/60 p-4 rounded-xl text-center text-xs text-gray-500 border border-gray-200/60">
                    No individual formal permission events recorded this month. All minute consumption is derived from late arrivals beyond shift grace.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {drawerHistory.map((h) => (
                      <div key={h.id} className="p-3.5 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 font-mono">{h.attendanceDate}</span>
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-mono">
                            {h.approvedMinutes} mins
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{h.reason}</p>
                        <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1 border-t border-gray-100">
                          <span>Approved by: {h.approvedBy || 'HR Admin'}</span>
                          <span>Category: {h.category.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDrawerEmp(null)}
                className="rounded-xl border-gray-200 text-xs h-9 px-4 font-semibold"
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECORD APPROVED ATTENDANCE PERMISSION */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title="Record Approved Attendance Permission"
        maxWidth="lg"
      >
        <div className="space-y-4 pt-1">
          {/* Employee */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span>Select Employee</span>
            </label>
            <div className="relative">
              <select
                value={permEmployeeId}
                onChange={(e) => setPermEmployeeId(e.target.value)}
                className="w-full appearance-none text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 bg-white focus:outline-none focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/10 font-medium cursor-pointer pr-10 shadow-2xs"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} ({e.employee_code || e.id.substring(0, 8)}) — {e.department || 'Operations'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Attendance Date</span>
              </label>
              <input
                type="date"
                value={permDate}
                onChange={(e) => setPermDate(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 font-mono text-gray-800 bg-white focus:outline-none focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/10 shadow-2xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Duration (Minutes)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="5"
                  min="5"
                  max="180"
                  value={permMinutes}
                  onChange={(e) => setPermMinutes(Number(e.target.value))}
                  className="w-24 text-xs font-mono font-bold border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 bg-white focus:outline-none focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/10 shadow-2xs"
                />
                <div className="flex gap-1">
                  {[15, 30, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPermMinutes(m)}
                      className={cn(
                        'px-2 py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer',
                        permMinutes === m
                          ? 'bg-[#07563D] text-white border-[#07563D]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      )}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              <span>Permission Category</span>
            </label>
            <div className="relative">
              <select
                value={permCategory}
                onChange={(e) => setPermCategory(e.target.value as any)}
                className="w-full appearance-none text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 bg-white focus:outline-none focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/10 font-medium cursor-pointer pr-10 shadow-2xs"
              >
                <option value="LATE_ARRIVAL_PERMISSION">Late-Arrival Permission (Morning traffic / personal delay)</option>
                <option value="EARLY_DEPARTURE_PERMISSION">Early-Departure Permission (Urgent family errand)</option>
                <option value="MIDDAY_PERSONAL_PERMISSION">Midday Temporary Absence (Medical / official bank errand)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span>Operational Justification / Note</span>
            </label>
            <textarea
              rows={2}
              value={permReason}
              onChange={(e) => setPermReason(e.target.value)}
              placeholder="e.g. Doctor appointment, urgent domestic errand..."
              className="w-full text-xs border border-gray-200 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/10 shadow-2xs placeholder:text-gray-400"
            />
          </div>

          {/* Quota Impact Live Preview */}
          {selectedEmpLedger && (
            <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-2xl flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900">
                <span className="font-bold block text-blue-800">Monthly Quota Consumption Preview</span>
                <span className="text-blue-700/90 text-[11px] block mt-0.5">
                  Current Used: <strong>{selectedEmpLedger.totalApprovedMinutes}m</strong> / 120m • After this request: <strong>{selectedEmpLedger.totalApprovedMinutes + permMinutes}m</strong>.
                  {selectedEmpLedger.totalApprovedMinutes + permMinutes > 120 && (
                    <span className="text-rose-700 font-bold block mt-1">
                      ⚠️ This request will exceed the 120m quota and classify {permDate} as Half-Day under Policy A!
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPermModalOpen(false)}
              className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 text-xs h-10 px-4 font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRecordPermission}
              disabled={isSubmitting}
              className="rounded-xl bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs h-10 px-5 shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Record Permission</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
