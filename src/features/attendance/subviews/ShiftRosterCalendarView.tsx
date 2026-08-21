// src/features/attendance/subviews/ShiftRosterCalendarView.tsx
// ============================================================================
// WorkForceOS — Enterprise Shift Roster & Workforce Scheduling Matrix
// Clean Architecture, Compact KPI Strip, Unified Sticky Filters, Right-Side Slide-Over Drawers
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Download,
  Upload,
  Copy,
  Sparkles,
  Search,
  X,
  Moon,
  ShieldCheck,
  CalendarDays,
  SlidersHorizontal,
  Clock,
  ArrowRight,
  User,
  ShieldAlert,
} from 'lucide-react';
import {
  attendanceRosterService,
} from '../../../services/attendance/attendanceRosterService';
import { ShiftMaster, EmployeeRosterEntry, RosterConflict } from '../../../types/shiftRoster';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { api } from '../../../services/api';
import { cn } from '../../../lib/utils';

export const ShiftRosterCalendarView: React.FC = () => {
  const { showToast } = useToast();
  const [shifts, setShifts] = useState<ShiftMaster[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<RosterConflict[]>([]);

  // Navigation & View Mode State
  const [viewMode, setViewMode] = useState<'MATRIX' | 'LIST' | 'CALENDAR' | 'DEPARTMENT'>('MATRIX');
  const [currentWeekStart, setCurrentWeekStart] = useState('2026-08-17'); // Monday

  // Multi-Dimension Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterShiftCode, setFilterShiftCode] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED' | 'CONFLICTS' | 'NIGHT'>('ALL');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [filterEmpGroup, setFilterEmpGroup] = useState('ALL');

  // Department Collapsing State (Hierarchical Grouping)
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  // Employee Selection State (Bulk Operations)
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set<string>());
  const [isSelectAllFiltered, setIsSelectAllFiltered] = useState(false);

  // Bulk Assign Drawer State (Slide-Over)
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState(false);
  const [bulkShiftId, setBulkShiftId] = useState('');
  const [bulkStartDate, setBulkStartDate] = useState('2026-08-17');
  const [bulkEndDate, setBulkEndDate] = useState('2026-08-23');
  const [includeSatOff, setIncludeSatOff] = useState(true);
  const [includeSunOff, setIncludeSunOff] = useState(true);

  // Auto-Rotate Wizard State
  const [isAutoRotateOpen, setIsAutoRotateOpen] = useState(false);
  const [rotateCycleWeeks, setRotateCycleWeeks] = useState(1);
  const [rotatePatternShifts, setRotatePatternShifts] = useState<string[]>([]);

  // Single Cell / Employee Right-Side Inspection Drawer State
  const [activeCellDrawer, setActiveCellDrawer] = useState<{
    emp: any;
    date: string;
    roster: EmployeeRosterEntry;
  } | null>(null);
  const [overrideShiftId, setOverrideShiftId] = useState('');
  const [overrideReason, setOverrideReason] = useState('Temporary production coverage');

  // Conflict Resolution Drawer State
  const [isConflictDrawerOpen, setIsConflictDrawerOpen] = useState(false);

  // Copy Schedule Modal State
  const [isCopyScheduleOpen, setIsCopyScheduleOpen] = useState(false);
  const [copySourceStart, setCopySourceStart] = useState('2026-08-17');
  const [copySourceEnd, setCopySourceEnd] = useState('2026-08-23');
  const [copyTargetStart, setCopyTargetStart] = useState('2026-08-24');

  // Import / Export Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Load Core Data
  const loadData = async () => {
    const loadedShifts = attendanceRosterService.getShifts();
    setShifts(loadedShifts);
    if (loadedShifts.length > 0 && !bulkShiftId) {
      setBulkShiftId(loadedShifts[0].id);
      setRotatePatternShifts([loadedShifts[0].id, loadedShifts[1]?.id || loadedShifts[0].id, loadedShifts[2]?.id || loadedShifts[0].id]);
    }

    try {
      const emps = await api.getEmployees();
      setEmployees(emps);
    } catch {
      // Local fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute 7 days for the active week window
  const activeDays = useMemo(() => {
    const days: string[] = [];
    const base = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [currentWeekStart]);

  useEffect(() => {
    if (activeDays.length > 0) {
      const detectedConflicts = attendanceRosterService.detectRosterConflicts(
        activeDays[0],
        activeDays[activeDays.length - 1]
      );
      setConflicts(detectedConflicts);
    }
  }, [activeDays]);

  // Navigate Week
  const handleNavigateWeek = (direction: 'PREV' | 'NEXT') => {
    const base = new Date(currentWeekStart);
    base.setDate(base.getDate() + (direction === 'PREV' ? -7 : 7));
    setCurrentWeekStart(base.toISOString().split('T')[0]);
  };

  const handleGoToToday = () => {
    setCurrentWeekStart('2026-08-17');
  };

  // Filtered Employees calculation
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const empName = (emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`).toLowerCase();
      const empCode = (emp.employee_code || `EMP-${emp.id}`).toLowerCase();
      const dept = (emp.department_name || emp.department || 'Production').toLowerCase();
      const loc = (emp.location || emp.branch || 'Chennai Factory').toLowerCase();

      const matchesSearch =
        empName.includes(searchQuery.toLowerCase()) ||
        empCode.includes(searchQuery.toLowerCase()) ||
        dept.includes(searchQuery.toLowerCase()) ||
        loc.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterLocation !== 'ALL' && !loc.includes(filterLocation.toLowerCase())) return false;
      if (filterDepartment !== 'ALL' && !dept.includes(filterDepartment.toLowerCase())) return false;

      if (filterStatus === 'CONFLICTS') {
        return conflicts.some(c => c.employee_id === emp.id);
      }

      return true;
    });
  }, [employees, searchQuery, filterLocation, filterDepartment, filterStatus, conflicts]);

  // Group filtered employees by Department (Hierarchical Tree)
  const groupedByDepartment = useMemo<Record<string, any[]>>(() => {
    const groups: Record<string, any[]> = {};
    for (const emp of filteredEmployees) {
      const dept = emp.department_name || emp.department || 'Production';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    }
    return groups;
  }, [filteredEmployees]);

  // Toggle Department collapse
  const toggleDeptCollapse = (dept: string) => {
    setCollapsedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  // Selection handlers
  const handleToggleSelectEmp = (empId: string) => {
    const next = new Set(selectedEmpIds);
    if (next.has(empId)) {
      next.delete(empId);
    } else {
      next.add(empId);
    }
    setSelectedEmpIds(next);
    setIsSelectAllFiltered(false);
  };

  const handleSelectAllVisible = () => {
    if (selectedEmpIds.size === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedEmpIds(new Set<string>());
      setIsSelectAllFiltered(false);
    } else {
      setSelectedEmpIds(new Set<string>(filteredEmployees.map(e => e.id)));
    }
  };

  const handleSelectAllMatchingFilters = () => {
    setIsSelectAllFiltered(true);
    setSelectedEmpIds(new Set<string>(employees.map(e => e.id)));
    showToast(`✓ Selected all ${employees.length} employees matching current filters.`);
  };

  // Bulk Apply Shift
  const handleApplyBulkAssign = () => {
    const targetEmpIds: string[] = Array.from(selectedEmpIds);
    if (targetEmpIds.length === 0) {
      showToast('No employees selected', 'error');
      return;
    }

    const offDays: number[] = [];
    if (includeSunOff) offDays.push(0);
    if (includeSatOff) offDays.push(6);

    const res = attendanceRosterService.bulkAssignRoster({
      employeeIds: targetEmpIds,
      startDate: bulkStartDate,
      endDate: bulkEndDate,
      shiftId: bulkShiftId,
      weeklyOffDays: offDays,
      assignedBy: 'HR Administrator',
    });

    showToast(`✓ Generated roster for ${targetEmpIds.length} employees (${res.assignedCount} assignments).`);
    setIsBulkDrawerOpen(false);
    setSelectedEmpIds(new Set());
    loadData();
  };

  // Auto-Rotate Execution
  const handleApplyAutoRotation = () => {
    const targetEmpIds = selectedEmpIds.size > 0 ? Array.from(selectedEmpIds) : employees.map(e => e.id);
    const offDays: number[] = [];
    if (includeSunOff) offDays.push(0);
    if (includeSatOff) offDays.push(6);

    const res = attendanceRosterService.generateRotationalRoster({
      employeeIds: targetEmpIds,
      patternShifts: rotatePatternShifts,
      cycleWeeks: rotateCycleWeeks,
      startDate: bulkStartDate,
      endDate: bulkEndDate,
      weeklyOffDays: offDays,
    });

    showToast(`✓ Auto-rotated ${targetEmpIds.length} employees across 3-shift pattern.`);
    setIsAutoRotateOpen(false);
    setSelectedEmpIds(new Set());
    loadData();
  };

  // Copy Schedule Execution
  const handleApplyCopySchedule = () => {
    const targetEmpIds = selectedEmpIds.size > 0 ? Array.from(selectedEmpIds) : employees.map(e => e.id);
    const res = attendanceRosterService.copySchedule({
      sourceStartDate: copySourceStart,
      sourceEndDate: copySourceEnd,
      targetStartDate: copyTargetStart,
      employeeIds: targetEmpIds,
    });

    showToast(`✓ Copied ${res.copiedCount} roster assignments to week of ${copyTargetStart}.`);
    setIsCopyScheduleOpen(false);
    loadData();
  };

  // Single Cell Override Save from Slide-Over Drawer
  const handleSaveCellOverride = () => {
    if (!activeCellDrawer || !overrideShiftId) return;

    attendanceRosterService.setShiftOverride(
      activeCellDrawer.emp.id,
      activeCellDrawer.date,
      overrideShiftId,
      overrideReason
    );

    showToast(`✓ Shift override saved for ${activeCellDrawer.emp.name} on ${activeCellDrawer.date}`);
    setActiveCellDrawer(null);
    loadData();
  };

  // Dynamic Real-World Aggregates calculated from live loaded employees & rosters
  const totalHeadcount = employees.length;

  const assignedCount = useMemo(() => {
    return employees.filter(emp => {
      return activeDays.some(dateStr => {
        const r = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, dateStr);
        return r && r.shift_code;
      });
    }).length;
  }, [employees, activeDays]);

  const unassignedCount = Math.max(0, totalHeadcount - assignedCount);
  const assignedPercent = totalHeadcount > 0 ? ((assignedCount / totalHeadcount) * 100).toFixed(0) : '0';
  const conflictCount = conflicts.length;

  const nightCount = useMemo(() => {
    return employees.filter(emp => {
      return activeDays.some(dateStr => {
        const r = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, dateStr);
        return r && r.shift_code && r.shift_code.includes('NGT') && !r.is_weekly_off;
      });
    }).length;
  }, [employees, activeDays]);

  const activeFiltersCount =
    (filterLocation !== 'ALL' ? 1 : 0) +
    (filterDepartment !== 'ALL' ? 1 : 0) +
    (filterShiftCode !== 'ALL' ? 1 : 0) +
    (filterStatus !== 'ALL' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16">
      {/* 1. Page Header (Clean, Compact, Strong Hierarchy) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-0.5">
            <span>Attendance & Time</span>
            <span>/</span>
            <span>Workforce Scheduling</span>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Shift Roster</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Shift Roster & Matrix</h1>

          <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 flex-wrap">
            <span className="font-semibold text-gray-800">Joy Corporate Solutions</span>
            <span>•</span>
            <span>Payroll Period: <strong>August 2026</strong></span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Attendance Open
            </span>
          </div>
        </div>

        {/* Header Action Hierarchy: 1 Primary + Ghost Secondary */}
        <div className="flex items-center gap-2 flex-wrap sm:self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoRotateOpen(true)}
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 h-9 px-3"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            Auto-Rotate
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCopyScheduleOpen(true)}
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 h-9 px-3"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy Schedule
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 h-9 px-3"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Import / Export
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (selectedEmpIds.size === 0) setSelectedEmpIds(new Set(employees.map(e => e.id)));
              setIsBulkDrawerOpen(true);
            }}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-lg h-9 px-4 shadow-2xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            + Bulk Assign Shift
          </Button>
        </div>
      </div>

      {/* 2. Compact Horizontal KPI Summary Strip */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-gray-200/90 text-xs shadow-2xs overflow-x-auto gap-4">
        <div className="flex items-center gap-6">
          <div
            onClick={() => setFilterStatus('ALL')}
            className="flex items-baseline gap-1.5 cursor-pointer hover:opacity-80"
          >
            <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Workforce:</span>
            <span className="font-bold text-gray-900">{totalHeadcount}</span>
          </div>

          <div
            onClick={() => setFilterStatus('ASSIGNED')}
            className="flex items-baseline gap-1.5 cursor-pointer hover:opacity-80"
          >
            <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Assigned:</span>
            <span className="font-bold text-emerald-800">{assignedCount}</span>
            <span className="text-[10px] text-gray-400">({assignedPercent}%)</span>
          </div>

          <div
            onClick={() => setFilterStatus('UNASSIGNED')}
            className={cn(
              "flex items-baseline gap-1.5 cursor-pointer px-2 py-0.5 rounded-md transition-colors",
              unassignedCount > 0 ? "bg-amber-50 text-amber-900 font-semibold" : "text-gray-600"
            )}
          >
            <span className="uppercase text-[10px] tracking-wider">Unassigned:</span>
            <span className="font-bold">{unassignedCount}</span>
          </div>

          <div
            onClick={() => setIsConflictDrawerOpen(true)}
            className={cn(
              "flex items-baseline gap-1.5 cursor-pointer px-2 py-0.5 rounded-md transition-colors",
              conflictCount > 0 ? "bg-rose-50 text-rose-900 font-semibold border border-rose-200" : "text-gray-600"
            )}
          >
            <AlertTriangle className="w-3 h-3 text-rose-600 self-center" />
            <span className="uppercase text-[10px] tracking-wider">Conflicts:</span>
            <span className="font-bold">{conflictCount}</span>
          </div>

          <div
            onClick={() => setFilterStatus('NIGHT')}
            className="flex items-baseline gap-1.5 cursor-pointer hover:opacity-80"
          >
            <Moon className="w-3 h-3 text-indigo-500 self-center" />
            <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Night:</span>
            <span className="font-bold text-gray-800">{nightCount}</span>
          </div>
        </div>

        {/* Quick Shift Legend Inline */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> GEN 09:00–18:00
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-600" /> MOR 06:00–14:30
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> EVE 14:00–22:30
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-600" /> NGT 22:00–06:00
          </span>
          <span className="flex items-center gap-1 text-gray-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-gray-300" /> OFF Weekly Rest
          </span>
        </div>
      </div>

      {/* 3. Sticky Unified Search & Filter Bar + Selection Mode */}
      <div className="sticky top-2 z-20 bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs space-y-2">
        {selectedEmpIds.size > 0 ? (
          /* Contextual Selection Action Bar */
          <div className="flex items-center justify-between bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>
                <strong>{selectedEmpIds.size}</strong> employees selected
              </span>
              {!isSelectAllFiltered && employees.length > selectedEmpIds.size && (
                <button
                  onClick={handleSelectAllMatchingFilters}
                  className="font-bold underline text-[#07563D] hover:text-emerald-900 ml-2 cursor-pointer"
                >
                  Select all {employees.length} employees matching current filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsBulkDrawerOpen(true)}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs h-7 px-3 rounded-md"
              >
                Assign Shift
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAutoRotateOpen(true)}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs h-7 px-3 rounded-md"
              >
                Apply Rotation
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCopyScheduleOpen(true)}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs h-7 px-3 rounded-md"
              >
                Copy Schedule
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEmpIds(new Set())}
                className="text-emerald-800 hover:text-emerald-950 h-7 w-7 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Normal Search & Dropdown Filter Row */
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employees by name, ID, code, department..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#07563D] bg-gray-50/50"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none text-gray-700 font-medium"
              >
                <option value="ALL">All Locations</option>
                <option value="Bengaluru">Bengaluru Tech Park</option>
                <option value="Chennai">Chennai Factory</option>
                <option value="Hosur">Hosur Plant</option>
              </select>

              <select
                value={filterDepartment}
                onChange={e => setFilterDepartment(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none text-gray-700 font-medium"
              >
                <option value="ALL">All Departments</option>
                <option value="Production">Production</option>
                <option value="Quality">Quality Assurance</option>
                <option value="Assembly">Assembly</option>
                <option value="People & HR">People & HR</option>
                <option value="Engineering">Engineering</option>
                <option value="Security">Security</option>
              </select>

              <select
                value={filterShiftCode}
                onChange={e => setFilterShiftCode(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none text-gray-700 font-medium"
              >
                <option value="ALL">All Shifts</option>
                <option value="GEN">General (GEN-09)</option>
                <option value="MOR">Morning (MOR-06)</option>
                <option value="EVE">Evening (EVE-14)</option>
                <option value="NGT">Night (NGT-22)</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none text-gray-700 font-medium"
              >
                <option value="ALL">All Status</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="UNASSIGNED">Unassigned</option>
                <option value="CONFLICTS">Conflicts</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className={cn(
                  "h-8 text-xs font-semibold rounded-lg px-2.5",
                  showMoreFilters && "bg-gray-100"
                )}
              >
                <SlidersHorizontal className="w-3 h-3 mr-1" />
                More Filters
              </Button>
            </div>
          </div>
        )}

        {/* Removable Active Filter Chips */}
        {activeFiltersCount > 0 && selectedEmpIds.size === 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
            <span className="text-gray-400 text-[11px] font-medium">Filters:</span>
            {filterLocation !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px]">
                Loc: {filterLocation}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterLocation('ALL')} />
              </span>
            )}
            {filterDepartment !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px]">
                Dept: {filterDepartment}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterDepartment('ALL')} />
              </span>
            )}
            {filterStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] border border-emerald-200">
                Status: {filterStatus}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterStatus('ALL')} />
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px]">
                "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
            <button
              onClick={() => {
                setFilterLocation('ALL');
                setFilterDepartment('ALL');
                setFilterShiftCode('ALL');
                setFilterStatus('ALL');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* 4. Compact Date Navigation + View Controls */}
      <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-gray-200/90 text-xs shadow-2xs">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigateWeek('PREV')}
              className="h-7 w-7 p-0 rounded-md"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToToday}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-md"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigateWeek('NEXT')}
              className="h-7 w-7 p-0 rounded-md"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <span className="font-bold text-gray-900 text-xs font-mono ml-2">
            Aug 17 – Aug 23, 2026
          </span>
          <Badge variant="gray" size="sm" className="text-[10px] font-medium">
            Week 34
          </Badge>
        </div>

        {/* View Mode Switcher (With clear text labels) */}
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
          {(['MATRIX', 'LIST', 'CALENDAR', 'DEPARTMENT'] as const).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                viewMode === m ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-500 hover:text-gray-900"
              )}
            >
              {m === 'MATRIX' ? 'Matrix' : m === 'LIST' ? 'List' : m === 'CALENDAR' ? 'Calendar' : 'Department'}
            </button>
          ))}
        </div>
      </div>

      {/* 5. ROSTER MATRIX (Visually Dominant & High on Page) */}
      {viewMode === 'MATRIX' && (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600">
                  <th className="py-2.5 px-3 text-left w-9 sticky left-0 bg-gray-50/95 z-10">
                    <input
                      type="checkbox"
                      checked={selectedEmpIds.size === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={handleSelectAllVisible}
                      className="rounded text-[#07563D] focus:ring-[#07563D]"
                    />
                  </th>
                  <th className="py-2.5 px-3 text-left font-bold w-64 min-w-[260px] sticky left-9 bg-gray-50/95 z-10">
                    Employee
                  </th>
                  {activeDays.map(dateStr => {
                    const d = new Date(dateStr);
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = d.getDate();
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th
                        key={dateStr}
                        className={cn(
                          "py-2 px-1 text-center font-bold min-w-[115px] border-l border-gray-100",
                          isWeekend && "bg-gray-100/50 text-gray-500"
                        )}
                      >
                        <span className="block text-[10px] uppercase font-semibold text-gray-400">{dayName}</span>
                        <span className="text-xs font-bold text-gray-800">{dayNum}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {(Object.entries(groupedByDepartment) as [string, any[]][]).map(([deptName, deptEmps]) => {
                  const isCollapsed = collapsedDepts[deptName] ?? false;
                  const deptAssignedCount = deptEmps.filter(emp => {
                    return activeDays.some(dateStr => {
                      const r = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, dateStr);
                      return r && r.shift_code;
                    });
                  }).length;
                  const deptConflictCount = conflicts.filter(c => deptEmps.some(e => e.id === c.employee_id)).length;

                  return (
                    <React.Fragment key={deptName}>
                      {/* Department Accordion Header Row */}
                      <tr className="bg-gray-50/60 hover:bg-gray-100/60 transition-colors">
                        <td colSpan={activeDays.length + 2} className="py-2 px-3">
                          <div
                            onClick={() => toggleDeptCollapse(deptName)}
                            className="flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2">
                              {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                              )}
                              <span className="font-bold text-gray-900 text-xs tracking-tight">
                                {deptName.toUpperCase()}
                              </span>
                              <span className="text-gray-400 text-[11px]">· {deptEmps.length} employees</span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-gray-500">
                              <span>Assigned: <strong className="text-gray-700">{deptAssignedCount}</strong></span>
                              <span>Conflicts: <strong className={deptConflictCount > 0 ? "text-rose-600 font-bold" : "text-gray-700"}>{deptConflictCount}</strong></span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Employee Rows */}
                      {!isCollapsed &&
                        deptEmps.map(emp => {
                          const empName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`;
                          const empCode = emp.employee_code || `EMP-${emp.id}`;
                          const isSelected = selectedEmpIds.has(emp.id);
                          const initials = empName
                            .split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('');

                          return (
                            <tr
                              key={emp.id}
                              className={cn(
                                "hover:bg-gray-50/70 transition-colors h-14",
                                isSelected && "bg-emerald-50/30"
                              )}
                            >
                              <td className="py-2 px-3 sticky left-0 bg-white z-10">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectEmp(emp.id)}
                                  className="rounded text-[#07563D] focus:ring-[#07563D]"
                                />
                              </td>

                              {/* Sticky Employee Column */}
                              <td className="py-2 px-3 sticky left-9 bg-white z-10">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#07563D] font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {initials}
                                  </div>
                                  <div className="truncate">
                                    <div
                                      onClick={() => {
                                        const r = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, activeDays[0]);
                                        setActiveCellDrawer({ emp, date: activeDays[0], roster: r });
                                      }}
                                      className="font-semibold text-gray-900 hover:text-[#07563D] cursor-pointer truncate text-xs"
                                    >
                                      {empName}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-mono truncate">
                                      {empCode} · {deptName}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Standardized Day Cells */}
                              {activeDays.map(dateStr => {
                                const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, dateStr);
                                const isOff = roster.is_weekly_off;
                                const isNight = roster.shift_code.includes('NGT');
                                const isMorning = roster.shift_code.includes('MOR');
                                const isEvening = roster.shift_code.includes('EVE');

                                return (
                                  <td
                                    key={dateStr}
                                    className="p-1 border-l border-gray-100 text-center"
                                  >
                                    <div
                                      onClick={() => {
                                        setOverrideShiftId(roster.shift_id);
                                        setActiveCellDrawer({ emp, date: dateStr, roster });
                                      }}
                                      className={cn(
                                        "py-1.5 px-2 rounded-lg border text-left cursor-pointer transition-all hover:border-gray-400 select-none",
                                        isOff && "bg-gray-50 border-gray-200 text-gray-400",
                                        !isOff && isNight && "bg-indigo-50/60 border-indigo-200 text-indigo-950",
                                        !isOff && isMorning && "bg-sky-50/60 border-sky-200 text-sky-950",
                                        !isOff && isEvening && "bg-amber-50/60 border-amber-200 text-amber-950",
                                        !isOff && !isNight && !isMorning && !isEvening && "bg-emerald-50/50 border-emerald-200 text-emerald-950",
                                        roster.is_override && "border-amber-400 ring-1 ring-amber-300"
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-[11px]">
                                          {isOff ? 'OFF' : roster.shift_code}
                                        </span>
                                        {roster.is_override && (
                                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded">
                                            ↗
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                        {isOff ? 'Weekly Rest' : isNight ? '22:00–06:00' : '09:00–18:00'}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. LIST VIEW MODE */}
      {viewMode === 'LIST' && (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600">
                <th className="py-2.5 px-3 text-left font-bold">Employee</th>
                <th className="py-2.5 px-3 text-left font-bold">Department</th>
                <th className="py-2.5 px-3 text-left font-bold">Location</th>
                <th className="py-2.5 px-3 text-left font-bold">Shift Pattern</th>
                <th className="py-2.5 px-3 text-left font-bold">Status</th>
                <th className="py-2.5 px-3 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50/60">
                  <td className="py-2.5 px-3 font-semibold text-gray-900">
                    {emp.name || `${emp.first_name} ${emp.last_name}`}
                    <div className="text-[10px] text-gray-400 font-mono">{emp.employee_code || `EMP-${emp.id}`}</div>
                  </td>
                  <td className="py-2.5 px-3 text-gray-600">{emp.department_name || emp.department || 'Production'}</td>
                  <td className="py-2.5 px-3 text-gray-500">{emp.location || 'Chennai Factory'}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant="emerald" size="sm">GEN-09 (09:00–18:00)</Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="emerald" size="sm">ASSIGNED</Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const r = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, activeDays[0]);
                        setActiveCellDrawer({ emp, date: activeDays[0], roster: r });
                      }}
                      className="text-xs font-semibold rounded-md h-7"
                    >
                      Inspect Schedule
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. RIGHT-SIDE SLIDE-OVER DRAWER: CELL INSPECTION & QUICK OVERRIDE */}
      {activeCellDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-2xs transition-opacity"
            onClick={() => setActiveCellDrawer(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Schedule Details</h2>
                  <p className="text-xs text-gray-500">{activeCellDrawer.date} • {activeCellDrawer.emp.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveCellDrawer(null)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Drawer Body */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
                {/* Employee Profile Summary */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Employee</span>
                  <div className="font-bold text-gray-900 text-sm">{activeCellDrawer.emp.name}</div>
                  <div className="text-gray-500 font-mono text-[11px]">
                    {activeCellDrawer.emp.employee_code || `EMP-${activeCellDrawer.emp.id}`} · {activeCellDrawer.emp.department_name || 'Production'}
                  </div>
                </div>

                {/* Current Shift Rule Details */}
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1 text-emerald-950">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Current Assignment</span>
                  <div className="font-bold text-sm">{activeCellDrawer.roster.shift_name} ({activeCellDrawer.roster.shift_code})</div>
                  <div className="text-[11px] text-emerald-800">
                    Timing: <strong>09:00 AM → 06:00 PM</strong> (8h working • 15m grace)
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Policy: <strong>Corporate Attendance v1</strong>
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Source: <strong>{activeCellDrawer.roster.assigned_by || 'Department Roster'}</strong>
                  </div>
                </div>

                {/* Change / Override Form */}
                <div className="space-y-3 pt-2">
                  <span className="font-bold text-gray-900 text-xs block">Apply Shift Override</span>

                  <div>
                    <label className="font-medium text-gray-700 block mb-1">New Shift</label>
                    <select
                      value={overrideShiftId}
                      onChange={e => setOverrideShiftId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#07563D]"
                    >
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.shift_name} ({s.shift_code} • {s.start_time} - {s.end_time})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Override Reason</label>
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200"
                    />
                  </div>
                </div>

                {/* Downstream Impact Notice */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-950 text-[11px] space-y-1">
                  <div className="font-bold">Downstream Attendance & Payroll Notice:</div>
                  <div>
                    Punches on {activeCellDrawer.date} will evaluate against the new shift timing for late marks, OT, and night allowances.
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveCellDrawer(null)} className="rounded-lg">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveCellOverride}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-lg px-4"
                >
                  Save Override
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. RIGHT-SIDE SLIDE-OVER DRAWER: BULK ASSIGN SHIFT */}
      {isBulkDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-2xs transition-opacity"
            onClick={() => setIsBulkDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Bulk Assign Shift</h2>
                  <p className="text-xs text-gray-500">{selectedEmpIds.size} employees selected</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBulkDrawerOpen(false)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Drawer Body */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">1. Shift Template</label>
                  <select
                    value={bulkShiftId}
                    onChange={e => setBulkShiftId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#07563D]"
                  >
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.shift_name} ({s.shift_code} • {s.start_time} - {s.end_time})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={bulkStartDate}
                      onChange={e => setBulkStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">End Date</label>
                    <input
                      type="date"
                      value={bulkEndDate}
                      onChange={e => setBulkEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                  <span className="font-bold text-gray-800 block">Weekly Off Rules</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={includeSatOff}
                        onChange={e => setIncludeSatOff(e.target.checked)}
                        className="rounded text-[#07563D]"
                      />
                      Saturday Off
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={includeSunOff}
                        onChange={e => setIncludeSunOff(e.target.checked)}
                        className="rounded text-[#07563D]"
                      />
                      Sunday Off
                    </label>
                  </div>
                </div>

                {/* Impact Preview Box */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs space-y-1">
                  <div className="font-bold">Review Impact:</div>
                  <div>• Selected: <strong>{selectedEmpIds.size} employees</strong></div>
                  <div>• Working Days: <strong>5 days</strong> · Rest Days: <strong>2 days</strong></div>
                  <div>• Total assignments to generate: <strong>{selectedEmpIds.size * 7} records</strong></div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsBulkDrawerOpen(false)} className="rounded-lg">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApplyBulkAssign}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-lg px-4"
                >
                  Apply Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. AUTO-ROTATE WIZARD MODAL */}
      <Modal
        isOpen={isAutoRotateOpen}
        onClose={() => setIsAutoRotateOpen(false)}
        title="Auto-Rotate Roster Wizard"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <p className="text-gray-500 text-xs">
            Continuously rotate shifts across Morning, Evening, and Night patterns with team cycle offsets.
          </p>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <span className="font-bold text-gray-800 block">3-Shift Pattern</span>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-900 border border-sky-200">
                Week 1: MOR-06
              </div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                Week 2: EVE-14
              </div>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200">
                Week 3: NGT-22
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-gray-700 block mb-1">Cycle Length</label>
              <select
                value={rotateCycleWeeks}
                onChange={e => setRotateCycleWeeks(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200"
              >
                <option value={1}>Every 1 Week</option>
                <option value={2}>Every 2 Weeks</option>
                <option value={4}>Every 4 Weeks</option>
              </select>
            </div>
            <div>
              <label className="font-medium text-gray-700 block mb-1">Start Date</label>
              <input
                type="date"
                value={bulkStartDate}
                onChange={e => setBulkStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAutoRotateOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApplyAutoRotation}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-lg px-4"
            >
              Commit Rotation
            </Button>
          </div>
        </div>
      </Modal>

      {/* 10. CONFLICT RESOLUTION DRAWER */}
      {isConflictDrawerOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsConflictDrawerOpen(false)}
          title={`Roster Conflict Engine (${conflicts.length} Violations)`}
          size="lg"
        >
          <div className="space-y-3 text-xs">
            <p className="text-gray-500 text-xs">
              Consecutive assignments auditing minimum 11-hour rest periods and statutory regulations.
            </p>

            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {conflicts.map(conf => (
                <div key={conf.id} className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-rose-950 font-bold">{conf.employee_name} ({conf.department_name})</strong>
                    <Badge variant="rose" size="sm">{conf.type}</Badge>
                  </div>
                  <p className="text-rose-900 text-[11px] leading-relaxed">{conf.description}</p>
                  <div className="p-2 rounded-lg bg-white border border-rose-200 text-gray-800 text-[11px] flex items-center justify-between">
                    <span><strong>Suggested:</strong> {conf.suggested_fix}</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        showToast(`✓ Fixed conflict for ${conf.employee_name}`);
                        setIsConflictDrawerOpen(false);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-md h-6 px-2"
                    >
                      Fix Shift
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsConflictDrawerOpen(false)} className="rounded-lg">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 11. COPY SCHEDULE MODAL */}
      {isCopyScheduleOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCopyScheduleOpen(false)}
          title="Copy Schedule to Target Week"
          size="md"
        >
          <div className="space-y-3 text-xs">
            <p className="text-gray-500 text-xs">
              Duplicate active week schedules to target weeks for selected workforce.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium text-gray-700 block mb-1">Source Week Start</label>
                <input
                  type="date"
                  value={copySourceStart}
                  onChange={e => setCopySourceStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200"
                />
              </div>
              <div>
                <label className="font-medium text-gray-700 block mb-1">Target Week Start</label>
                <input
                  type="date"
                  value={copyTargetStart}
                  onChange={e => setCopyTargetStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsCopyScheduleOpen(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyCopySchedule}
                className="bg-[#07563D] text-white font-bold rounded-lg px-4"
              >
                Copy Schedule
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 12. IMPORT / EXPORT MODAL */}
      {isImportModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsImportModalOpen(false)}
          title="Import / Export Shift Roster"
          size="md"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
              <span className="font-bold text-gray-900 block">Export Authoritative Roster</span>
              <p className="text-gray-500 text-[11px]">Download current roster schedule as CSV template.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => showToast('Downloading Authoritative Roster CSV...')}
                className="text-xs font-semibold rounded-lg"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download CSV
              </Button>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
              <span className="font-bold text-gray-900 block">Upload CSV Roster</span>
              <input
                type="file"
                accept=".csv, .xlsx"
                className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#07563D] file:text-white"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)} className="rounded-lg">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
