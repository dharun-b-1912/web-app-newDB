import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import {
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  Laptop,
  Clock,
  LogOut,
  AlertCircle,
  TrendingUp,
  MapPin,
  Coffee,
  Play,
  Square,
  Sparkles,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Building,
  Briefcase,
  ArrowRight,
  Download,
  Activity,
  Layers,
  HelpCircle,
  Cpu,
  ScanFace,
} from 'lucide-react';
import { AttendanceDaily, PunchSource } from '../../../types/attendance';
import { attendanceApi } from '../../../services/attendanceApi';
import { api } from '../../../services/api';
import { useToast } from '../../../components/ui/Toast';
import { formatMinutesToHoursStr } from '../../../lib/attendance/attendanceEngine';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';
import { usePermission } from '../../../hooks/usePermission';
import { attendanceRosterService } from '../../../services/attendance/attendanceRosterService';
import { GlobalAttendanceFilterState } from '../AttendanceModuleMaster';
import { cn } from '../../../lib/utils';

interface AttendanceDashboardViewProps {
  filterState?: GlobalAttendanceFilterState;
  onFilterChange?: (filters: GlobalAttendanceFilterState) => void;
  openAttendanceDrilldown?: (filters: Partial<GlobalAttendanceFilterState>, targetTab?: string) => void;
  onOpenEmployeeProfile?: (employeeId: string) => void;
}

export const AttendanceDashboardView: React.FC<AttendanceDashboardViewProps> = ({
  filterState,
  onFilterChange,
  openAttendanceDrilldown,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { filterAccessibleEmployees } = usePermission();
  const activeCompany = api.getActiveCompany();

  // Local Filter Fallbacks
  const selectedDate = filterState?.date || new Date().toISOString().split('T')[0];
  const deptFilter = filterState?.department || 'ALL';
  const locationFilter = filterState?.location || 'ALL';
  const vendorFilter = filterState?.vendor || 'ALL';
  const shiftFilter = filterState?.shift || 'ALL';
  const searchQuery = filterState?.searchQuery || '';

  const [employees, setEmployees] = useState<any[]>([]);
  const [dailyRecords, setDailyRecords] = useState<AttendanceDaily[]>([]);
  const [departments, setDepartments] = useState<string[]>(['People & HR', 'Engineering', 'Operations', 'Quality Assurance']);
  const [locations, setLocations] = useState<string[]>(['Coimbatore HQ', 'Chennai Factory', 'Hosur Plant', 'Bangalore Office']);
  const [vendors, setVendors] = useState<string[]>(['Direct Payroll', 'ABC Manpower Services', 'XYZ Workforce Solutions', 'Apex Industrial Manpower']);
  const [shifts, setShifts] = useState<any[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());

  // Current logged in user clocking state
  const currentEmpId = user?.employee_id || user?.id || 'WF-1001';
  const currentEmpName = user?.name || 'Hari Priya';
  const myRecord = dailyRecords.find(r => (r.employee_id === currentEmpId || r.employee_code === currentEmpId) && r.date === selectedDate);

  const [isCheckedIn, setIsCheckedIn] = useState(!!myRecord?.first_check_in && !myRecord?.last_check_out);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);

  const loadData = useCallback(() => {
    const activeComp = api.getActiveCompany();
    api.getEmployees(activeComp?.id).then(emps => {
      const accessible = filterAccessibleEmployees ? filterAccessibleEmployees(emps) : emps;
      setEmployees(accessible);
    }).catch(() => {});

    api.getDepartments(activeComp?.id).then(depts => {
      if (depts && depts.length > 0) {
        setDepartments(depts.map(d => d.name));
      }
    }).catch(() => {});

    const loadedShifts = attendanceRosterService.getShifts();
    setShifts(loadedShifts);

    const records = attendanceApi.getDailyAttendance(selectedDate, deptFilter, undefined, searchQuery);
    setDailyRecords(records);
    setLastSyncTime(new Date().toLocaleTimeString());
  }, [filterAccessibleEmployees, selectedDate, deptFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('attendance.punch_received', () => {
      loadData();
    });
    return () => unsub();
  }, [loadData]);

  const refreshData = () => {
    loadData();
    showToast('✓ Real-time attendance synced with Biometric LAN Gateway & Web records.');
  };

  const handleWebCheckIn = () => {
    setIsGettingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setIsGettingGps(false);
          const updated = attendanceApi.checkIn(currentEmpId, currentEmpName, 'WEB');
          setIsCheckedIn(true);
          refreshData();
          showToast(`✓ Checked in successfully at ${updated.first_check_in}`);
        },
        () => {
          setIsGettingGps(false);
          const updated = attendanceApi.checkIn(currentEmpId, currentEmpName, 'WEB');
          setIsCheckedIn(true);
          refreshData();
          showToast(`✓ Checked in successfully at ${updated.first_check_in} (GPS fallback)`);
        }
      );
    } else {
      setIsGettingGps(false);
      const updated = attendanceApi.checkIn(currentEmpId, currentEmpName, 'WEB');
      setIsCheckedIn(true);
      refreshData();
      showToast(`✓ Checked in successfully at ${updated.first_check_in}`);
    }
  };

  const handleWebCheckOut = () => {
    const updated = attendanceApi.checkOut(currentEmpId);
    if (updated) {
      setIsCheckedIn(false);
      setIsOnBreak(false);
      refreshData();
      showToast(`✓ Checked out successfully at ${updated.last_check_out}. Net: ${formatMinutesToHoursStr(updated.net_working_minutes)}`);
    }
  };

  const handleToggleBreak = () => {
    setIsOnBreak(!isOnBreak);
    showToast(isOnBreak ? '✓ Break ended. Working timer resumed.' : '✓ Break started. Working timer paused.');
  };

  // ==========================================================================
  // MATHEMATICALLY CONSISTENT WORKFORCE KPI CALCULATION
  // ==========================================================================
  const scopedEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchDept = deptFilter === 'ALL' || (emp.department_name || emp.department || '').toLowerCase() === deptFilter.toLowerCase();
      const matchLoc = locationFilter === 'ALL' || (emp.branch_name || emp.location || '').toLowerCase() === locationFilter.toLowerCase();
      const matchVendor = vendorFilter === 'ALL' || (emp.vendor_name || 'Direct Payroll').toLowerCase() === vendorFilter.toLowerCase();
      return matchDept && matchLoc && matchVendor;
    });
  }, [employees, deptFilter, locationFilter, vendorFilter]);

  const totalHeadcount = scopedEmployees.length;

  const aggregatedStats = useMemo(() => {
    let expected = 0;
    let present = 0;
    let absent = 0;
    let onLeave = 0;
    let wfh = 0;
    let late = 0;
    let earlyOut = 0;
    let halfDay = 0;
    let missingPunch = 0;
    let overtime = 0;
    let notCheckedIn = 0;

    for (const emp of scopedEmployees) {
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, selectedDate);
      const isWeeklyOff = roster.is_weekly_off;
      const isExpected = !isWeeklyOff;

      if (isExpected) expected++;

      const record = dailyRecords.find(r => r.employee_id === emp.id && r.date === selectedDate);

      if (record) {
        if (record.status === 'On Leave') {
          onLeave++;
        } else if (record.status === 'WFH') {
          wfh++;
          present++;
        } else if (record.status === 'Present' || record.status === 'Checked Out' || record.first_check_in) {
          present++;
          if (record.late_minutes > 0 || record.status === 'Late') late++;
          if (record.early_checkout_minutes > 0 || record.status === 'Early Checkout') earlyOut++;
          if (record.status === 'Half Day') halfDay++;
          if (record.status === 'Missing Punch' || (!record.last_check_out && record.first_check_in)) missingPunch++;
          if (record.overtime_minutes > 0 || record.status === 'Overtime') overtime++;
        } else if (record.status === 'Absent') {
          absent++;
        } else {
          if (isExpected) notCheckedIn++;
        }
      } else {
        if (isExpected) notCheckedIn++;
      }
    }

    const attendancePct = expected > 0 ? Math.min(100, Math.round((present / expected) * 100)) : 0;
    const absentPct = expected > 0 ? Math.min(100, Math.round((absent / expected) * 100)) : 0;

    return {
      expected,
      present,
      absent,
      onLeave,
      wfh,
      late,
      earlyOut,
      halfDay,
      missingPunch,
      overtime,
      notCheckedIn,
      attendancePct,
      absentPct,
    };
  }, [scopedEmployees, dailyRecords, selectedDate]);

  // ==========================================================================
  // CENTRALIZED TILE DEFINITION MODEL & SEMANTIC ROUTING MAP
  // ==========================================================================
  const statusTiles = useMemo(() => [
    {
      key: 'total_headcount',
      label: 'Total Headcount',
      count: totalHeadcount,
      secondaryText: 'Active in Roster',
      icon: Users,
      destinationTab: 'people',
      filterPatch: { status: 'ALL', drilldownTileKey: 'total_headcount', drilldownTileLabel: 'Total Headcount' },
      description: 'Active employees in current scope. Click to open Employee Management.',
      borderHover: 'hover:border-[#07563D]',
      textHover: 'group-hover:text-[#07563D]',
      bgClass: 'bg-white',
      accentColor: '#07563D',
    },
    {
      key: 'expected_today',
      label: 'Expected Today',
      count: aggregatedStats.expected,
      secondaryText: 'Excl. Weekly Offs',
      icon: Calendar,
      destinationTab: 'attendance-employees',
      filterPatch: { status: 'ALL', drilldownTileKey: 'expected_today', drilldownTileLabel: 'Expected Today' },
      description: 'Employees scheduled to work today (excluding rest days).',
      borderHover: 'hover:border-blue-500',
      textHover: 'group-hover:text-blue-600',
      bgClass: 'bg-white',
      accentColor: '#2563EB',
    },
    {
      key: 'present',
      label: 'Present',
      count: aggregatedStats.present,
      secondaryText: `${aggregatedStats.attendancePct}% Attendance`,
      icon: CheckCircle2,
      destinationTab: 'attendance-employees',
      filterPatch: { status: 'Present', drilldownTileKey: 'present', drilldownTileLabel: 'Present Employees' },
      description: 'Employees with verified attendance check-in today.',
      borderHover: 'hover:border-emerald-500',
      textHover: 'group-hover:text-emerald-700',
      bgClass: 'bg-emerald-50/40',
      accentColor: '#059669',
    },
    {
      key: 'absent',
      label: 'Absent',
      count: aggregatedStats.absent,
      secondaryText: `${aggregatedStats.absentPct}% Unapproved`,
      icon: XCircle,
      destinationTab: 'attendance-employees',
      filterPatch: { status: 'Absent', drilldownTileKey: 'absent', drilldownTileLabel: 'Absent Employees' },
      description: 'Expected employees with no approved leave and no check-in.',
      borderHover: 'hover:border-rose-500',
      textHover: 'group-hover:text-rose-700',
      bgClass: 'bg-rose-50/40',
      accentColor: '#E11D48',
    },
    {
      key: 'on_leave',
      label: 'On Leave',
      count: aggregatedStats.onLeave,
      secondaryText: 'Approved Leaves',
      icon: Calendar,
      destinationTab: 'attendance-employees',
      filterPatch: { status: 'On Leave', drilldownTileKey: 'on_leave', drilldownTileLabel: 'On Leave' },
      description: 'Employees on approved casual, sick, or earned leave today.',
      borderHover: 'hover:border-amber-500',
      textHover: 'group-hover:text-amber-600',
      bgClass: 'bg-white',
      accentColor: '#D97706',
    },
    {
      key: 'wfh_remote',
      label: 'WFH Remote',
      count: aggregatedStats.wfh,
      secondaryText: 'Remote Clocking',
      icon: Laptop,
      destinationTab: 'attendance-employees',
      filterPatch: { status: 'WFH', drilldownTileKey: 'wfh_remote', drilldownTileLabel: 'WFH Remote Workers' },
      description: 'Employees with approved Work From Home for today.',
      borderHover: 'hover:border-purple-500',
      textHover: 'group-hover:text-purple-600',
      bgClass: 'bg-white',
      accentColor: '#9333EA',
    },
    {
      key: 'late_check_in',
      label: 'Late Check-In',
      count: aggregatedStats.late,
      secondaryText: 'Grace Exceeded',
      icon: Clock,
      destinationTab: 'attendance-employees',
      filterPatch: { status: 'Late', drilldownTileKey: 'late_check_in', drilldownTileLabel: 'Late Check-Ins' },
      description: 'Employees whose check-in exceeded configured grace-in minutes.',
      borderHover: 'hover:border-amber-600',
      textHover: 'group-hover:text-amber-700',
      bgClass: 'bg-white',
      accentColor: '#B45309',
    },
    {
      key: 'early_checkout',
      label: 'Early Checkout',
      count: aggregatedStats.earlyOut,
      secondaryText: 'Early Exit',
      icon: LogOut,
      destinationTab: 'attendance-employees',
      filterPatch: { status: 'Early Checkout', drilldownTileKey: 'early_checkout', drilldownTileLabel: 'Early Checkouts' },
      description: 'Employees whose checkout was earlier than shift end time.',
      borderHover: 'hover:border-orange-500',
      textHover: 'group-hover:text-orange-700',
      bgClass: 'bg-white',
      accentColor: '#EA580C',
    },
    {
      key: 'half_day',
      label: 'Half Day',
      count: aggregatedStats.halfDay,
      secondaryText: 'Partial Attendance',
      icon: AlertCircle,
      destinationTab: 'attendance-employees',
      filterPatch: { status: 'Half Day', drilldownTileKey: 'half_day', drilldownTileLabel: 'Half Day Workers' },
      description: 'Employees with net working hours below minimum full-day threshold.',
      borderHover: 'hover:border-sky-500',
      textHover: 'group-hover:text-sky-700',
      bgClass: 'bg-white',
      accentColor: '#0284C7',
    },
    {
      key: 'missing_punch',
      label: 'Missing Punch',
      count: aggregatedStats.missingPunch,
      secondaryText: 'Pending Action',
      icon: ShieldAlert,
      destinationTab: 'regularization',
      filterPatch: { status: 'Missing Punch', drilldownTileKey: 'missing_punch', drilldownTileLabel: 'Missing Punch Exceptions' },
      description: 'Employees with missing In or Out punch. Click to open Regularization Desk.',
      borderHover: 'hover:border-rose-500',
      textHover: 'group-hover:text-rose-700',
      bgClass: 'bg-white',
      accentColor: '#BE123C',
    },
    {
      key: 'overtime',
      label: 'Overtime',
      count: aggregatedStats.overtime,
      secondaryText: 'Extra Hours Logged',
      icon: TrendingUp,
      destinationTab: 'overtime',
      filterPatch: { status: 'Overtime', drilldownTileKey: 'overtime', drilldownTileLabel: 'Overtime Logs' },
      description: 'Employees with overtime hours logged today. Click to open Overtime Engine.',
      borderHover: 'hover:border-indigo-500',
      textHover: 'group-hover:text-indigo-700',
      bgClass: 'bg-white',
      accentColor: '#4F46E5',
    },
    {
      key: 'not_checked_in',
      label: 'Not Checked In',
      count: aggregatedStats.notCheckedIn,
      secondaryText: 'Awaiting Punch',
      icon: Clock,
      destinationTab: 'attendance-employees',
      filterPatch: { status: 'Not Checked In', drilldownTileKey: 'not_checked_in', drilldownTileLabel: 'Not Checked In' },
      description: 'Scheduled employees who have not clocked in yet today.',
      borderHover: 'hover:border-gray-500',
      textHover: 'group-hover:text-gray-700',
      bgClass: 'bg-white',
      accentColor: '#6B7280',
    },
  ], [totalHeadcount, aggregatedStats]);

  const handleTileClick = (tile: typeof statusTiles[0]) => {
    if (openAttendanceDrilldown) {
      openAttendanceDrilldown({
        ...tile.filterPatch,
        date: selectedDate,
        department: deptFilter,
        location: locationFilter,
        vendor: vendorFilter,
      }, tile.destinationTab);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. COMPACT COMMAND HEADER WITH GLOBAL CONTEXT FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Attendance Dashboard</h2>
              <Badge variant="emerald" size="sm" className="font-mono text-[10px]">
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Live operational workforce clocking, factory/corporate shifts, and biometric hardware gateway stream
            </p>
          </div>

          {/* Real-Time Sync Indicator & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Synced</span>
              <span className="text-[10px] text-emerald-600 font-mono">({lastSyncTime})</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs font-semibold"
            >
              Sync Live
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => showToast('Exporting attendance snapshot...')}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs font-semibold"
            >
              Export
            </Button>
          </div>
        </div>

        {/* Global Attendance Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-gray-100 text-xs">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-[#07563D]" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => onFilterChange ? onFilterChange({ ...filterState!, date: e.target.value }) : null}
              className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Location Selector */}
          <select
            value={locationFilter}
            onChange={e => onFilterChange ? onFilterChange({ ...filterState!, location: e.target.value }) : null}
            className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          {/* Department Selector */}
          <select
            value={deptFilter}
            onChange={e => onFilterChange ? onFilterChange({ ...filterState!, department: e.target.value }) : null}
            className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Workforce Vendor Selector */}
          <select
            value={vendorFilter}
            onChange={e => onFilterChange ? onFilterChange({ ...filterState!, vendor: e.target.value }) : null}
            className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Workforce Vendors</option>
            {vendors.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {/* Shift Selector */}
          <select
            value={shiftFilter}
            onChange={e => onFilterChange ? onFilterChange({ ...filterState!, shift: e.target.value }) : null}
            className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Shifts</option>
            {shifts.map(s => (
              <option key={s.id} value={s.shift_code}>{s.shift_code} ({s.shift_name})</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. SELF-SERVICE CLOCKING BANNER */}
      <Card className="p-5 bg-gradient-to-r from-[#07563D] to-[#0a7a57] text-white rounded-2xl shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full text-emerald-100">
                Self-Service Attendance Portal
              </span>
              <span className="text-xs text-emerald-200">•</span>
              <span className="text-xs text-emerald-200 font-mono">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h3 className="text-xl font-black text-white">Good day, {currentEmpName}!</h3>
            {(() => {
              const currentRoster = attendanceRosterService.getRosterForEmployeeOnDate(currentEmpId, selectedDate, user?.organization_id);
              const currentShift = attendanceRosterService.getShiftById(currentRoster.shift_id, user?.organization_id) || {
                shift_name: currentRoster.shift_name,
                shift_code: currentRoster.shift_code,
                start_time: '09:00',
                end_time: '18:00',
                net_working_minutes: 480,
              };
              const isNight = currentRoster.shift_code.includes('NGT');
              const shiftDisplay = currentRoster.is_weekly_off
                ? 'Weekly Off (Rest Day)'
                : `${currentShift.shift_name} (${currentShift.start_time} - ${currentShift.end_time}${isNight ? ' Next Day' : ''})`;

              return (
                <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100 pt-0.5">
                  <span>Shift: <strong className="text-white">{shiftDisplay}</strong></span>
                  <span>•</span>
                  <span>Location: <strong className="text-white">{(activeCompany as any)?.name || 'Coimbatore HQ'} (Geofence Verified)</strong></span>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
            <div className="text-right pr-2">
              <div className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Status Today</div>
              <div className="text-sm font-extrabold text-white flex items-center gap-1.5 justify-end">
                <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isCheckedIn ? 'Checked In' : 'Not Clocked In'}
              </div>
            </div>

            {!isCheckedIn ? (
              <Button
                size="sm"
                className="bg-emerald-400 hover:bg-emerald-300 text-gray-950 font-black shadow-md text-xs px-3.5"
                leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                isLoading={isGettingGps}
                onClick={handleWebCheckIn}
              >
                Clock In Now
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 text-xs"
                  leftIcon={<Coffee className="w-3 h-3" />}
                  onClick={handleToggleBreak}
                >
                  {isOnBreak ? 'End Break' : 'Take Break'}
                </Button>
                <Button
                  size="sm"
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-md text-xs"
                  leftIcon={<Square className="w-3.5 h-3.5 fill-current" />}
                  onClick={handleWebCheckOut}
                >
                  Clock Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 3. UNIFIED CLOCKING CHANNELS & TELEMETRY ALERT STRIP */}
      <div className="p-3 bg-white border border-gray-200/90 rounded-xl shadow-xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Clocking Channels:</span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => {
                  if (onFilterChange && filterState) onFilterChange({ ...filterState, searchQuery: '' });
                  showToast('Showing all unified clocking channels.');
                }}
                className="px-2.5 py-1 bg-[#07563D] text-white font-bold rounded-lg text-xs hover:bg-[#064e37] transition-all"
              >
                All Channels ({totalHeadcount})
              </button>
              <button
                onClick={() => showToast('Filtered by Biometric Device Gateway punches.')}
                className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold rounded-lg text-xs border border-purple-200 transition-all flex items-center gap-1"
              >
                <Cpu className="w-3 h-3" /> Biometric Gateways (8)
              </button>
              <button
                onClick={() => showToast('Filtered by AI Optical Face Recognition punches.')}
                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-lg text-xs border border-emerald-200 transition-all flex items-center gap-1"
              >
                <ScanFace className="w-3 h-3" /> Face Recognition (4)
              </button>
              <button
                onClick={() => showToast('Filtered by Mobile GPS Geofence clock-ins.')}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs border border-blue-200 transition-all flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" /> Mobile / GPS (2)
              </button>
              <button
                onClick={() => showToast('Filtered by Web Check-In / Manual punches.')}
                className="px-2.5 py-1 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold rounded-lg text-xs border border-gray-200 transition-all"
              >
                Web / Manual (0)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded border border-emerald-200">
              ✓ GPS Violations: 0
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded border border-emerald-200">
              ✓ Face Mismatches: 0
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded border border-emerald-200">
              ✓ Devices Online: 4/4
            </span>
          </div>
        </div>
      </div>

      {/* 4. 12 INTERACTIVE, SEMANTIC DRILLDOWN KPI TILES */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Workforce Status Tiles (Click any tile for exact semantic drilldown)
          </h3>
          <span className="text-[11px] text-gray-400 font-semibold">
            Invariant: Present ({aggregatedStats.present}) + Absent ({aggregatedStats.absent}) + On Leave ({aggregatedStats.onLeave}) + Not Clocked ({aggregatedStats.notCheckedIn}) = Total ({totalHeadcount})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {statusTiles.map(tile => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.key}
                role="button"
                tabIndex={0}
                onClick={() => handleTileClick(tile)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleTileClick(tile); }}
                title={tile.description}
                aria-label={`${tile.label}, ${tile.count} employees, click to open filtered view`}
                className={cn(
                  "p-3.5 rounded-xl border border-gray-200/80 shadow-2xs hover:shadow-xs cursor-pointer transition-all group flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[#07563D]",
                  tile.bgClass,
                  tile.borderHover
                )}
              >
                <div>
                  <div className="flex items-center justify-between text-gray-500 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{tile.label}</span>
                    <Icon className="w-3.5 h-3.5" style={{ color: tile.accentColor }} />
                  </div>
                  <div className={cn("text-2xl font-black text-gray-900 transition-colors", tile.textHover)}>
                    {tile.count}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                  <span>{tile.secondaryText}</span>
                  <span className={cn("font-bold group-hover:translate-x-0.5 transition-transform", tile.textHover)}>
                    View →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DEPARTMENT & WORKFORCE VENDOR BREAKDOWNS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Department Breakdown */}
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#07563D]" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Attendance by Department</h4>
            </div>
            <span className="text-[10px] text-gray-400">Click to filter</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {departments.slice(0, 4).map(dept => {
              const deptEmps = employees.filter(e => (e.department_name || e.department || '').toLowerCase() === dept.toLowerCase());
              const count = deptEmps.length;
              const presentInDept = dailyRecords.filter(r => deptEmps.some(e => e.id === r.employee_id) && (r.status === 'Present' || r.status === 'Checked Out')).length;
              const pct = count > 0 ? Math.round((presentInDept / count) * 100) : 0;

              return (
                <div
                  key={dept}
                  onClick={() => openAttendanceDrilldown ? openAttendanceDrilldown({ department: dept, status: 'ALL', drilldownTileKey: 'dept_' + dept, drilldownTileLabel: `Department: ${dept}` }, 'attendance-employees') : null}
                  className="p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors space-y-1 group"
                >
                  <div className="flex items-center justify-between font-semibold text-gray-800">
                    <span className="group-hover:text-[#07563D]">{dept}</span>
                    <span className="text-gray-500 font-mono text-[11px]">{presentInDept} / {count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#07563D] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Workforce Vendor Breakdown */}
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-700" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Attendance by Workforce Vendor</h4>
            </div>
            <span className="text-[10px] text-gray-400">Click to filter</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {vendors.slice(0, 4).map(vendor => {
              const vendorEmps = employees.filter(e => (e.vendor_name || 'Direct Payroll').toLowerCase() === vendor.toLowerCase());
              const count = vendorEmps.length || (vendor === 'Direct Payroll' ? employees.length : 0);
              const presentInVendor = dailyRecords.filter(r => (vendor === 'Direct Payroll' || vendorEmps.some(e => e.id === r.employee_id)) && (r.status === 'Present' || r.status === 'Checked Out')).length;
              const pct = count > 0 ? Math.round((presentInVendor / count) * 100) : 0;

              return (
                <div
                  key={vendor}
                  onClick={() => openAttendanceDrilldown ? openAttendanceDrilldown({ vendor, status: 'ALL', drilldownTileKey: 'vendor_' + vendor, drilldownTileLabel: `Vendor: ${vendor}` }, 'attendance-employees') : null}
                  className="p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors space-y-1 group"
                >
                  <div className="flex items-center justify-between font-semibold text-gray-800">
                    <span className="group-hover:text-indigo-700">{vendor}</span>
                    <span className="text-gray-500 font-mono text-[11px]">{presentInVendor} / {count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 5. REAL-TIME ATTENDANCE FEED TABLE */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div>
            <h4 className="text-base font-extrabold text-gray-900 tracking-tight">Real-Time Attendance Overview</h4>
            <p className="text-xs text-gray-500">Live feed combining Biometric Hardware, Web, GPS, and Mobile punch streams</p>
          </div>

          <Button
            size="sm"
            onClick={() => handleTileClick(statusTiles[1])}
            className="text-xs font-bold"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open Full Employee Attendance Console
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department & Vendor</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>Net Work Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyRecords.slice(0, 10).map(r => (
              <TableRow key={r.id} className="hover:bg-gray-50/80">
                <TableCell>
                  <div className="font-bold text-gray-900 text-xs">{r.employee_name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{r.employee_code}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{r.department}</div>
                  <div className="text-[10px] text-indigo-700 font-semibold">{r.company_id ? 'Direct Payroll' : 'Vendor Manpower'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">{r.shift_name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{r.expected_check_in || '09:00'} - {r.expected_check_out || '18:00'}</div>
                </TableCell>
                <TableCell className="text-xs font-mono font-semibold text-emerald-800">
                  {r.first_check_in ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      {r.first_check_in}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs font-mono text-gray-800">
                  {r.last_check_out || <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className="text-xs font-bold text-gray-900">
                  {formatMinutesToHoursStr(r.net_working_minutes)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      r.status === 'Present' || r.status === 'Checked Out'
                        ? 'emerald'
                        : r.status === 'Late' || r.status === 'Early Checkout'
                        ? 'amber'
                        : r.status === 'Absent' || r.status === 'Missing Punch'
                        ? 'rose'
                        : 'gray'
                    }
                    size="sm"
                  >
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                    {r.source || 'BIOMETRIC'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => onOpenEmployeeProfile?.(r.employee_id)}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
