import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import {
  Search,
  Download,
  Filter,
  Eye,
  RefreshCw,
  Plus,
  Calendar as CalendarIcon,
  X,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  Building,
  MapPin,
  SlidersHorizontal,
  FileCheck,
  Send,
  MoreVertical,
  Layers,
  ChevronDown,
  Info,
  ArrowLeft,
  Tag,
} from 'lucide-react';
import { AttendanceDaily, PunchSource } from '../../../types/attendance';
import { attendanceApi } from '../../../services/attendanceApi';
import { api } from '../../../services/api';
import { useToast } from '../../../components/ui/Toast';
import { formatMinutesToHoursStr, formatCleanTime, timeStringToMinutes, processAttendanceStatus } from '../../../lib/attendance/attendanceEngine';
import { attendanceRosterService } from '../../../services/attendance/attendanceRosterService';
import { attendanceTimeService } from '../../../services/attendance/attendanceTimeService';
import { GlobalAttendanceFilterState } from '../AttendanceModuleMaster';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';

interface EmployeeAttendanceViewProps {
  filterState?: GlobalAttendanceFilterState;
  onFilterChange?: (filters: GlobalAttendanceFilterState) => void;
  onClearFilters?: () => void;
  openAttendanceDrilldown?: (filters: Partial<GlobalAttendanceFilterState>, targetTab?: string) => void;
  onOpenEmployeeProfile?: (employeeId: string) => void;
  onOpenManualModal?: () => void;
  onBackToDashboard?: () => void;
}

export const EmployeeAttendanceView: React.FC<EmployeeAttendanceViewProps> = ({
  filterState,
  onFilterChange,
  onClearFilters,
  openAttendanceDrilldown,
  onOpenEmployeeProfile,
  onOpenManualModal,
  onBackToDashboard,
}) => {
  const { showToast } = useToast();

  const selectedDate = filterState?.date || new Date().toISOString().split('T')[0];
  const deptFilter = filterState?.department || 'ALL';
  const locationFilter = filterState?.location || 'ALL';
  const vendorFilter = filterState?.vendor || 'ALL';
  const shiftFilter = filterState?.shift || 'ALL';
  const statusFilter = filterState?.status || 'ALL';
  const sourceFilter = filterState?.source || 'ALL';
  const searchQuery = filterState?.searchQuery || '';
  const drilldownTileKey = filterState?.drilldownTileKey;
  const drilldownTileLabel = filterState?.drilldownTileLabel;

  const [employees, setEmployees] = useState<any[]>([]);
  const [dailyRecords, setDailyRecords] = useState<AttendanceDaily[]>([]);
  const [departments, setDepartments] = useState<string[]>(['People & HR', 'Engineering', 'Operations', 'Quality Assurance']);
  const [locations, setLocations] = useState<string[]>(['Coimbatore HQ', 'Chennai Factory', 'Hosur Plant', 'Bangalore Office']);
  const [vendors, setVendors] = useState<string[]>(['Direct Payroll']);
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const checkIsVendor = (emp: any): boolean => {
    const source = emp.employment_source || emp.employment?.employment_source;
    if (source === 'VENDOR' || source === 'MANPOWER_PROVIDER') return true;
    if (source === 'DIRECT') return false;
    if (emp.vendor_name && emp.vendor_name.trim() !== '' && !emp.vendor_name.toLowerCase().includes('joy corporate') && emp.vendor_name.toLowerCase() !== 'direct payroll') return true;
    if (emp.employment?.vendor_name && emp.employment.vendor_name.trim() !== '' && !emp.employment.vendor_name.toLowerCase().includes('joy corporate')) return true;
    if (emp.company_name && emp.company_name.toLowerCase().includes('vendor')) return true;
    return false;
  };

  const getVendorName = (emp: any): string => {
    if (checkIsVendor(emp)) {
      return emp.vendor_name || emp.employment?.vendor_name || 'Contract Agency';
    }
    return 'Direct Payroll';
  };

  const loadData = () => {
    const activeComp = api.getActiveCompany();
    api.getEmployees(activeComp?.id).then(emps => {
      const realEmps = emps || [];
      setEmployees(realEmps);

      const uniqueVendors = Array.from(
        new Set([
          'Direct Payroll',
          ...realEmps
            .filter(e => checkIsVendor(e))
            .map(e => getVendorName(e))
            .filter(Boolean)
        ])
      ) as string[];
      setVendors(uniqueVendors);
    }).catch(() => {});

    api.getDepartments(activeComp?.id).then(depts => {
      if (depts && depts.length > 0) {
        setDepartments(depts.map(d => d.name));
      }
    }).catch(() => {});

    const loadedShifts = attendanceRosterService.getShifts();
    setShifts(loadedShifts);

    const records = attendanceApi.getDailyAttendance(selectedDate);
    setDailyRecords(records);

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase
          .from('attendance_daily')
          .select('*')
          .eq('date', selectedDate)
      )
        .then(({ data, error }: any) => {
          if (!error && Array.isArray(data)) {
            try {
              const currentList = JSON.parse(localStorage.getItem('workforceos_attendance_daily_v2') || '[]');
              const otherDatesList = currentList.filter((a: any) => a.date !== selectedDate);
              const merged = [...data, ...otherDatesList];
              
              const getAttendanceKeys = () => {
                const s = new Set([
                  'workforceos_attendance_daily_v2',
                  'workforceos_attendance_daily_v2_org-joy-01',
                ]);
                try {
                  const activeOrg = localStorage.getItem('workforce_active_org_id');
                  if (activeOrg) s.add(`workforceos_attendance_daily_v2_${activeOrg}`);
                  for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('workforceos_attendance_daily_v2')) {
                      s.add(k);
                    }
                  }
                } catch {}
                return Array.from(s);
              };

              for (const k of getAttendanceKeys()) {
                localStorage.setItem(k, JSON.stringify(merged));
              }

              const refreshedRecords = attendanceApi.getDailyAttendance(selectedDate);
              setDailyRecords(refreshedRecords);
            } catch {}
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Real-time Supabase postgres replication stream for instant punch updates
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const channel = supabase
      .channel(`emp-attendance-live-${selectedDate}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_daily' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  // HR Event Bus listener
  useEffect(() => {
    const unsub = hrEventBus.subscribe('attendance.*', () => {
      loadData();
    });
    return () => unsub();
  }, [selectedDate]);

  // Quiet continuous background synchronization
  useEffect(() => {
    const timer = setInterval(() => {
      loadData();
    }, 3500);
    return () => clearInterval(timer);
  }, [selectedDate]);

  // Scoped and filtered employees & attendance records
  const filteredData = useMemo(() => {
    return employees.filter(emp => {
      const empDept = emp.department_name || emp.department || 'People & HR';
      const empLoc = emp.branch_name || emp.location || 'Coimbatore HQ';
      const empVendor = getVendorName(emp);

      const matchDept = deptFilter === 'ALL' || empDept.toLowerCase() === deptFilter.toLowerCase();
      const matchLoc = locationFilter === 'ALL' || empLoc.toLowerCase() === locationFilter.toLowerCase();
      const matchVendor = vendorFilter === 'ALL' || empVendor.toLowerCase() === vendorFilter.toLowerCase();

      const record = dailyRecords.find(r => 
        (r.employee_id === emp.id || (r.employee_code && emp.employee_code && r.employee_code.toLowerCase() === emp.employee_code.toLowerCase())) && 
        r.date === selectedDate
      );
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, selectedDate);

      const resolvedStatus = record?.status || (roster.is_weekly_off ? 'Weekly Off' : 'Not Checked In');
      const resolvedShiftCode = roster.shift_code || 'GEN-09';
      const resolvedSource = record?.source || 'SYSTEM';

      const matchShift = shiftFilter === 'ALL' || resolvedShiftCode.toLowerCase() === shiftFilter.toLowerCase();

      let matchStatus = true;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Late') {
          matchStatus = (record?.late_minutes || 0) > 0 || resolvedStatus === 'Late';
        } else if (statusFilter === 'Early Checkout') {
          matchStatus = (record?.early_checkout_minutes || 0) > 0 || resolvedStatus === 'Early Checkout';
        } else if (statusFilter === 'Overtime') {
          matchStatus = (record?.overtime_minutes || 0) > 0 || resolvedStatus === 'Overtime';
        } else if (statusFilter === 'Missing Punch') {
          matchStatus = resolvedStatus === 'Missing Punch' || (!!record?.first_check_in && !record?.last_check_out);
        } else if (statusFilter === 'Present') {
          matchStatus = resolvedStatus === 'Present' || resolvedStatus === 'Checked Out' || !!record?.first_check_in;
        } else {
          matchStatus = resolvedStatus.toLowerCase() === statusFilter.toLowerCase();
        }
      }

      const matchSource = sourceFilter === 'ALL' || resolvedSource.toLowerCase() === sourceFilter.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (emp.display_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`).toLowerCase().includes(q) ||
        (emp.employee_code || '').toLowerCase().includes(q) ||
        empDept.toLowerCase().includes(q);

      return matchDept && matchLoc && matchVendor && matchShift && matchStatus && matchSource && matchQuery;
    }).map(emp => {
      const record = dailyRecords.find(r => 
        (r.employee_id === emp.id || (r.employee_code && emp.employee_code && r.employee_code.toLowerCase() === emp.employee_code.toLowerCase())) && 
        r.date === selectedDate
      );
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, selectedDate);
      const shift = attendanceRosterService.getShiftById(roster.shift_id) || {
        shift_name: roster.shift_name,
        shift_code: roster.shift_code,
        start_time: '09:00',
        end_time: '18:00',
        cross_midnight: roster.shift_code.includes('NGT'),
      };

      const isOff = roster.is_weekly_off;
      let resolvedRecord = record;
      if (record && record.first_check_in && (!record.net_working_minutes || record.net_working_minutes === 0)) {
        const inMins = timeStringToMinutes(record.first_check_in);
        const outMins = timeStringToMinutes(record.last_check_out);
        const expIn = timeStringToMinutes(shift.start_time) || 540;
        const expOut = timeStringToMinutes(shift.end_time) || 1080;
        const calc = processAttendanceStatus(inMins, outMins, expIn, expOut);
        resolvedRecord = {
          ...record,
          gross_working_minutes: calc.grossMinutes,
          net_working_minutes: calc.netMinutes,
          late_minutes: record.late_minutes ?? calc.lateMinutes,
          status: record.status || calc.status,
        };
      }

      const status = resolvedRecord?.status || (isOff ? 'Weekly Off' : 'Not Checked In');

      return {
        emp,
        record: resolvedRecord || {
          id: `att-dyn-${emp.id}-${selectedDate}`,
          employee_id: emp.id,
          employee_code: emp.employee_code || `WF-${emp.id}`,
          employee_name: emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name,
          department: emp.department_name || emp.department || 'Operations',
          designation: emp.designation_title || emp.designation || 'Staff',
          date: selectedDate,
          shift_id: roster.shift_id,
          shift_name: roster.shift_name,
          expected_check_in: shift.start_time,
          expected_check_out: shift.end_time,
          first_check_in: undefined,
          last_check_out: undefined,
          gross_working_minutes: 0,
          net_working_minutes: 0,
          total_break_minutes: 0,
          late_minutes: 0,
          early_checkout_minutes: 0,
          overtime_minutes: 0,
          status,
          source: isOff ? 'SYSTEM' : 'WEB',
        },
        roster,
        shift,
      };
    });
  }, [employees, dailyRecords, selectedDate, deptFilter, locationFilter, vendorFilter, shiftFilter, statusFilter, sourceFilter, searchQuery]);

  // Aggregate stats for the active filtered set
  const totalInFilter = filteredData.length;
  const presentCount = filteredData.filter(d => d.record.status === 'Present' || d.record.status === 'Checked Out').length;
  const lateCount = filteredData.filter(d => d.record.late_minutes > 0 || d.record.status === 'Late').length;
  const absentCount = filteredData.filter(d => d.record.status === 'Absent').length;
  const onLeaveCount = filteredData.filter(d => d.record.status === 'On Leave').length;
  const missingPunchCount = filteredData.filter(d => d.record.status === 'Missing Punch' || (d.record.first_check_in && !d.record.last_check_out)).length;

  const hasActiveFilters =
    deptFilter !== 'ALL' ||
    locationFilter !== 'ALL' ||
    vendorFilter !== 'ALL' ||
    shiftFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    searchQuery.trim() !== '' ||
    !!drilldownTileKey;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredData.map(d => d.emp.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleExportCsv = () => {
    showToast(`✓ Exported ${filteredData.length} filtered employee attendance records to CSV.`);
  };

  const handleClearTileFilterOnly = () => {
    if (onFilterChange && filterState) {
      onFilterChange({
        ...filterState,
        status: 'ALL',
        drilldownTileKey: undefined,
        drilldownTileLabel: undefined,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP CONTEXT HEADER BAR WITH RETURN TO DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <Button
                variant="outline"
                size="xs"
                onClick={onBackToDashboard}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                className="text-xs font-bold text-gray-700 hover:text-[#07563D] hover:bg-emerald-50 border-gray-200"
              >
                ← Dashboard
              </Button>
            )}
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Employee Attendance Workspace</h2>
            <Badge variant="gray" size="sm" className="font-mono text-[10px]">
              Payroll: August 2026
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Monitor verified punches, working duration breakdown, attendance source, and regularization exceptions
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="text-xs font-semibold"
          >
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={onOpenManualModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs font-bold bg-[#07563D] hover:bg-[#064e37]"
          >
            + Manual Punch Record
          </Button>
        </div>
      </div>

      {/* 2. SEMANTIC DRILLDOWN CHIP & EXPLANATION BANNER */}
      {hasActiveFilters && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-700" />
                Showing {totalInFilter} {totalInFilter === 1 ? 'employee' : 'employees'} because:
              </span>

              {/* Primary Drilldown Tile Filter Chip */}
              {drilldownTileLabel && (
                <span className="inline-flex items-center gap-1.5 bg-[#07563D] text-white px-2.5 py-1 rounded-lg font-extrabold shadow-2xs">
                  <span>{drilldownTileLabel}</span>
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-rose-200" onClick={handleClearTileFilterOnly} />
                </span>
              )}

              {statusFilter !== 'ALL' && !drilldownTileLabel && (
                <span className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                  Status: {statusFilter}
                  <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => onFilterChange?.({ ...filterState!, status: 'ALL' })} />
                </span>
              )}

              {deptFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                  Dept: {deptFilter}
                  <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => onFilterChange?.({ ...filterState!, department: 'ALL' })} />
                </span>
              )}

              {vendorFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                  Vendor: {vendorFilter}
                  <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => onFilterChange?.({ ...filterState!, vendor: 'ALL' })} />
                </span>
              )}

              {locationFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                  Location: {locationFilter}
                  <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => onFilterChange?.({ ...filterState!, location: 'ALL' })} />
                </span>
              )}

              {shiftFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                  Shift: {shiftFilter}
                  <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => onFilterChange?.({ ...filterState!, shift: 'ALL' })} />
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                  Query: "{searchQuery}"
                  <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => onFilterChange?.({ ...filterState!, searchQuery: '' })} />
                </span>
              )}

              <span className="text-emerald-800 font-mono font-semibold bg-emerald-100/60 px-2 py-0.5 rounded">
                Date: {selectedDate}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {drilldownTileLabel && (
                <button
                  onClick={handleClearTileFilterOnly}
                  className="text-xs text-emerald-800 font-bold hover:underline cursor-pointer"
                >
                  Clear Tile Filter
                </button>
              )}
              <button
                onClick={onClearFilters}
                className="text-xs text-rose-700 font-bold hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. WORKSPACE FILTER TOOLBAR */}
      <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700">
              <CalendarIcon className="w-3.5 h-3.5 text-[#07563D]" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => onFilterChange ? onFilterChange({ ...filterState!, date: e.target.value }) : null}
                className="bg-transparent focus:outline-none cursor-pointer text-xs font-bold"
              />
            </div>

            {/* Department Dropdown */}
            <select
              value={deptFilter}
              onChange={e => onFilterChange ? onFilterChange({ ...filterState!, department: e.target.value }) : null}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Workforce Vendor Dropdown */}
            <select
              value={vendorFilter}
              onChange={e => onFilterChange ? onFilterChange({ ...filterState!, vendor: e.target.value }) : null}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            >
              <option value="ALL">All Workforce Vendors</option>
              {vendors.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={e => onFilterChange ? onFilterChange({ ...filterState!, status: e.target.value, drilldownTileKey: undefined, drilldownTileLabel: undefined }) : null}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Checked Out">Checked Out</option>
              <option value="Late">Late Check-In</option>
              <option value="Early Checkout">Early Checkout</option>
              <option value="Half Day">Half Day</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
              <option value="WFH">WFH Remote</option>
              <option value="Missing Punch">Missing Punch</option>
              <option value="Overtime">Overtime</option>
              <option value="Weekly Off">Weekly Off</option>
              <option value="Not Checked In">Not Checked In</option>
            </select>

            {/* Shift Dropdown */}
            <select
              value={shiftFilter}
              onChange={e => onFilterChange ? onFilterChange({ ...filterState!, shift: e.target.value }) : null}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            >
              <option value="ALL">All Shifts</option>
              {shifts.map(s => (
                <option key={s.id} value={s.shift_code}>{s.shift_code} ({s.start_time} - {s.end_time})</option>
              ))}
            </select>

            {/* Punch Source Dropdown */}
            <select
              value={sourceFilter}
              onChange={e => onFilterChange ? onFilterChange({ ...filterState!, source: e.target.value }) : null}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            >
              <option value="ALL">All Punch Sources</option>
              <option value="BIOMETRIC">Biometric Terminal</option>
              <option value="WEB">Web Portal</option>
              <option value="GPS">Mobile GPS</option>
              <option value="MANUAL">Manual Record</option>
              <option value="SYSTEM">System Auto</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee / code..."
              value={searchQuery}
              onChange={e => onFilterChange ? onFilterChange({ ...filterState!, searchQuery: e.target.value }) : null}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D] w-56"
            />
          </div>
        </div>

        {/* Filter Summary Metric Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span>Matching: <strong className="text-gray-900">{totalInFilter}</strong> Employees</span>
            <span>•</span>
            <span>Present: <strong className="text-emerald-700">{presentCount}</strong></span>
            <span>•</span>
            <span>Late: <strong className="text-amber-700">{lateCount}</strong></span>
            <span>•</span>
            <span>Absent: <strong className="text-rose-700">{absentCount}</strong></span>
            <span>•</span>
            <span>Leave: <strong className="text-purple-700">{onLeaveCount}</strong></span>
            <span>•</span>
            <span>Missing: <strong className="text-rose-700">{missingPunchCount}</strong></span>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-900">
              <span className="font-bold">{selectedIds.size} Selected</span>
              <Button size="xs" variant="outline" className="text-[10px] h-6 bg-white" onClick={() => showToast(`Sent punch reminders to ${selectedIds.size} employees.`)}>
                <Send className="w-3 h-3 mr-1" /> Reminder
              </Button>
              <Button size="xs" variant="outline" className="text-[10px] h-6 bg-white" onClick={() => showToast(`Requested regularization for ${selectedIds.size} records.`)}>
                <FileCheck className="w-3 h-3 mr-1" /> Regularize
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 4. ENTERPRISE EMPLOYEE ATTENDANCE TABLE */}
      <Card className="p-0 bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 text-gray-600 text-xs">
                <TableHead className="w-8 pl-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-[#07563D] focus:ring-[#07563D]"
                  />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Department & Vendor</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Check-In</TableHead>
                <TableHead>Check-Out</TableHead>
                <TableHead>Break</TableHead>
                <TableHead>Net Hours</TableHead>
                <TableHead>Late / Early</TableHead>
                <TableHead>OT</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-16 text-gray-400">
                    <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-2.5 opacity-80" />
                    <p className="text-sm font-bold text-gray-700">
                      {drilldownTileLabel ? `No ${drilldownTileLabel} records found` : 'No attendance records match your filters'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                      There are no employee attendance records matching {drilldownTileLabel || statusFilter} for {selectedDate}
                      {deptFilter !== 'ALL' ? ` in ${deptFilter}` : ''}
                      {vendorFilter !== 'ALL' ? ` (${vendorFilter})` : ''}.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {drilldownTileLabel && (
                        <Button variant="outline" size="sm" onClick={handleClearTileFilterOnly} className="text-xs">
                          Clear Tile Filter
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={onClearFilters} className="text-xs">
                        Reset All Filters
                      </Button>
                      {onBackToDashboard && (
                        <Button size="sm" onClick={onBackToDashboard} className="text-xs bg-[#07563D] hover:bg-[#064e37]">
                          Back to Dashboard
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map(({ emp, record, roster, shift }) => {
                  const empName = emp.display_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                  const empCode = emp.employee_code || `WF-${emp.id}`;
                  const dept = emp.department_name || emp.department || 'Operations';
                  const designation = emp.designation_title || emp.designation || 'Staff';
                  const vendor = emp.vendor_name || 'Direct Payroll';
                  const isNight = shift.cross_midnight || shift.shift_code.includes('NGT');
                  const isSelected = selectedIds.has(emp.id);

                  return (
                    <TableRow key={emp.id} className={cn("hover:bg-gray-50/80 transition-colors text-xs", isSelected && "bg-emerald-50/30")}>
                      <TableCell className="pl-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(emp.id)}
                          className="rounded text-[#07563D] focus:ring-[#07563D]"
                        />
                      </TableCell>

                      {/* Employee Info */}
                      <TableCell>
                        <div
                          onClick={() => onOpenEmployeeProfile?.(emp.id)}
                          className="font-bold text-gray-900 hover:text-[#07563D] cursor-pointer"
                        >
                          {empName}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">{empCode} • {designation}</div>
                      </TableCell>

                      {/* Dept */}
                      <TableCell>
                        <div className="font-semibold text-gray-800">{dept}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{emp.branch_name || emp.location || 'Coimbatore HQ'}</div>
                      </TableCell>

                      {/* Shift */}
                      <TableCell>
                        <div className="font-bold text-gray-900 flex items-center gap-1">
                          <span>{shift.shift_code}</span>
                          {isNight && <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded font-bold">NGT</span>}
                        </div>
                        <div className="text-[10px] text-gray-500">{shift.shift_name}</div>
                      </TableCell>

                      {/* Expected */}
                      <TableCell>
                        <div className="text-gray-700 font-mono font-semibold">
                          {shift.start_time} - {shift.end_time}
                        </div>
                        <div className="text-[10px] text-gray-400">8h 00m standard</div>
                      </TableCell>

                      {/* Check-In */}
                      <TableCell>
                        {record.first_check_in ? (
                          <div>
                            <div className="font-mono font-bold text-emerald-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              {attendanceTimeService.formatAttendanceTime(record.first_check_in, 'Asia/Kolkata', true)}
                            </div>
                            <div className="text-[9px] text-gray-400 font-medium">
                              {record.check_in_source || record.source || 'BIOMETRIC'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>

                      {/* Check-Out */}
                      <TableCell>
                        {record.last_check_out ? (
                          <div>
                            <div className="font-mono font-bold text-rose-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              {attendanceTimeService.formatAttendanceTime(record.last_check_out, 'Asia/Kolkata', true)}
                            </div>
                            <div className="text-[9px] text-gray-400 font-medium">
                              {record.check_out_source || record.source || 'MOBILE'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>

                      {/* Break */}
                      <TableCell>
                        <span className="text-gray-600 font-mono">{record.total_break_minutes || 45}m</span>
                      </TableCell>

                      {/* Net Hours */}
                      <TableCell>
                        <div
                          onClick={() => onOpenEmployeeProfile?.(emp.id)}
                          className="font-mono font-bold text-gray-900 hover:text-[#07563D] cursor-pointer"
                          title="Click to view full calculation trace"
                        >
                          {formatMinutesToHoursStr(record.net_working_minutes)}
                        </div>
                      </TableCell>

                      {/* Late / Early */}
                      <TableCell>
                        {record.late_minutes > 0 && (
                          <span className="text-amber-700 font-bold block text-[11px]">+{record.late_minutes}m Late</span>
                        )}
                        {record.early_checkout_minutes > 0 && (
                          <span className="text-orange-700 font-bold block text-[11px]">-{record.early_checkout_minutes}m Early</span>
                        )}
                        {record.late_minutes === 0 && record.early_checkout_minutes === 0 && (
                          <span className="text-gray-400">No</span>
                        )}
                      </TableCell>

                      {/* OT */}
                      <TableCell>
                        {record.overtime_minutes > 0 ? (
                          <span className="text-indigo-700 font-bold text-[11px]">+{record.overtime_minutes}m</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={
                            record.status === 'Present' || record.status === 'Checked Out'
                              ? 'emerald'
                              : record.status === 'Late' || record.status === 'Early Checkout'
                              ? 'amber'
                              : record.status === 'Absent' || record.status === 'Missing Punch'
                              ? 'rose'
                              : 'gray'
                          }
                          size="sm"
                        >
                          {record.status}
                        </Badge>
                      </TableCell>

                      {/* Source */}
                      <TableCell>
                        <span className={cn(
                          "text-[10px] font-mono px-2 py-0.5 rounded font-semibold border",
                          record.source === 'HYBRID'
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : record.source === 'WEB'
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        )}>
                          {record.source || (record.check_out_source && record.check_out_source !== (record.check_in_source || 'BIOMETRIC') ? 'HYBRID' : 'BIOMETRIC')}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="xs"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => onOpenEmployeeProfile?.(emp.id)}
                          className="text-xs font-semibold"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
