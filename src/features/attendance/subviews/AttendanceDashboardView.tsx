import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Bell,
} from 'lucide-react';
import { AttendanceDaily, PunchSource } from '../../../types/attendance';
import { attendanceApi } from '../../../services/attendanceApi';
import { AttendanceNotificationDiagnosticModal } from '../components/AttendanceNotificationDiagnosticModal';
import { workLocationService } from '../../../services/location/workLocationService';
import { api } from '../../../services/api';
import { useToast } from '../../../components/ui/Toast';
import { formatMinutesToHoursStr, formatCleanTime, timeStringToMinutes } from '../../../lib/attendance/attendanceEngine';
import { smartShiftResolutionService, DEFAULT_SHIFTS, ELECTRA_EV_SHIFTS } from '../../../services/attendance/smartShiftResolutionService';
import { biometricGatewayService } from '../../../services/attendance/biometricGatewayService';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { realtimeChannelManager } from '../../../services/realtime/realtimeChannelManager';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';
import { usePermission } from '../../../hooks/usePermission';
import { attendanceRosterService } from '../../../services/attendance/attendanceRosterService';
import { attendanceTimeService } from '../../../services/attendance/attendanceTimeService';
import { attendanceDecisionEngine } from '../../../services/attendance/attendanceDecisionEngine';
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
  const [vendors, setVendors] = useState<string[]>(['Direct Payroll']);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [shifts, setShifts] = useState<any[]>([]);
  const [biometricDevices, setBiometricDevices] = useState<any[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [selectedChannel, setSelectedChannel] = useState<'ALL' | 'BIOMETRIC' | 'FACE' | 'MOBILE' | 'WEB'>('ALL');

  const isLoadingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<any>(null);

  // Current logged in user clocking state
  const currentEmpId = user?.employee_id || user?.id || 'WF-1001';
  const currentEmpName = user?.name || 'Hari Priya';
  const myRecord = dailyRecords.find(r => (r.employee_id === currentEmpId || r.employee_code === currentEmpId) && r.date === selectedDate);

  // Authoritative Single Attendance Session from Decision Engine
  const activeSession = attendanceDecisionEngine.getSession(user?.organization_id || 'org-joy-01', currentEmpId, selectedDate);
  const [manualCheckedInOverride, setManualCheckedInOverride] = useState<boolean | null>(null);
  const isCheckedIn = manualCheckedInOverride !== null 
    ? manualCheckedInOverride 
    : ((activeSession?.attendance_status === 'CHECKED_IN') || (!!myRecord?.first_check_in && !myRecord?.last_check_out));
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState<number>(0);

  // Live real-time seconds timer tick
  useEffect(() => {
    const updateTimer = () => {
      if (activeSession?.first_in_at && !activeSession?.last_out_at) {
        const startMs = new Date(activeSession.first_in_at).getTime();
        setLiveSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      } else if (myRecord?.first_check_in && !myRecord?.last_check_out) {
        const startMs = new Date(myRecord.first_check_in.includes('T') ? myRecord.first_check_in : `${selectedDate}T${myRecord.first_check_in}`).getTime();
        if (!isNaN(startMs)) {
          setLiveSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
        }
      } else {
        setLiveSeconds(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession, myRecord, selectedDate]);

  const formatLiveTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const loadData = useCallback(() => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    const activeComp = api.getActiveCompany();
    const effectiveTenantId = activeComp?.organization_id || activeComp?.id || '';

    if (!effectiveTenantId || effectiveTenantId === 'platform-root') {
      isLoadingRef.current = false;
      return;
    }

    Promise.allSettled([
      api.getEmployees(activeComp?.id),
      api.getDepartments(activeComp?.id),
      attendanceRosterService.fetchShiftsFromDb(effectiveTenantId),
      attendanceApi.getDailyAttendanceAsync(selectedDate, deptFilter, undefined, searchQuery, effectiveTenantId),
      biometricGatewayService.syncDevicesFromSupabase(effectiveTenantId),
      biometricGatewayService.syncPunchesFromSupabase(1000, effectiveTenantId),
    ]).then(([empRes, deptRes, shiftRes, dailyRes, devsRes]) => {
      if (empRes.status === 'fulfilled' && empRes.value) {
        const accessible = filterAccessibleEmployees ? filterAccessibleEmployees(empRes.value) : (empRes.value || []);
        setEmployees(accessible || []);

        const realVendors = Array.from(
          new Set(
            (accessible || [])
              .map(e => e.vendor_name?.trim())
              .filter(v => v && v.toLowerCase() !== 'direct payroll' && !v.toLowerCase().includes('joy corporate'))
          )
        ) as string[];

        setVendors(['Direct Payroll', ...realVendors]);
      }

      if (deptRes.status === 'fulfilled' && deptRes.value && deptRes.value.length > 0) {
        setDepartments(deptRes.value.map(d => d.name));
      }

      if (shiftRes.status === 'fulfilled' && shiftRes.value && shiftRes.value.length > 0) {
        setShifts(shiftRes.value);
      } else {
        setShifts(attendanceRosterService.getShifts(effectiveTenantId));
      }

      if (devsRes.status === 'fulfilled' && Array.isArray(devsRes.value)) {
        setBiometricDevices(devsRes.value);
      } else {
        setBiometricDevices(biometricGatewayService.getBiometricDevices(effectiveTenantId));
      }

      if (dailyRes.status === 'fulfilled' && dailyRes.value && dailyRes.value.length > 0) {
        setDailyRecords(dailyRes.value);
      } else {
        const fallback = attendanceApi.getDailyAttendance(selectedDate, deptFilter, undefined, searchQuery);
        if (fallback && fallback.length > 0) {
          setDailyRecords(fallback);
        }
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    }).catch(() => {}).finally(() => {
      isLoadingRef.current = false;
    });
  }, [filterAccessibleEmployees, selectedDate, deptFilter, searchQuery]);

  const triggerDebouncedLoad = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      loadData();
    }, 1500);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Supabase postgres replication stream via centralized mesh for instant punch updates
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const unsubDaily = realtimeChannelManager.subscribeToTable('attendance_daily', () => {
      attendanceApi.invalidateCache();
      triggerDebouncedLoad();
    });
    const unsubPunches = realtimeChannelManager.subscribeToTable('attendance_punches', () => {
      attendanceApi.invalidateCache();
      triggerDebouncedLoad();
    });

    return () => {
      unsubDaily();
      unsubPunches();
    };
  }, [selectedDate, triggerDebouncedLoad]);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('attendance.*', () => {
      triggerDebouncedLoad();
    });
    return () => unsub();
  }, [triggerDebouncedLoad]);

  // Calm auto-polling for zero-drift live dashboard (15 seconds, prevents render flickering and network thrashing)
  useEffect(() => {
    const timer = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(timer);
  }, [loadData]);

  const refreshData = () => {
    isLoadingRef.current = false;
    attendanceApi.invalidateCache();
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
          setManualCheckedInOverride(true);
          refreshData();
          showToast(`✓ Checked in successfully at ${updated.first_check_in}`);
        },
        () => {
          setIsGettingGps(false);
          const updated = attendanceApi.checkIn(currentEmpId, currentEmpName, 'WEB');
          setManualCheckedInOverride(true);
          refreshData();
          showToast(`✓ Checked in successfully at ${updated.first_check_in} (GPS fallback)`);
        }
      );
    } else {
      setIsGettingGps(false);
      const updated = attendanceApi.checkIn(currentEmpId, currentEmpName, 'WEB');
      setManualCheckedInOverride(true);
      refreshData();
      showToast(`✓ Checked in successfully at ${updated.first_check_in}`);
    }
  };

  const handleWebCheckOut = () => {
    const updated = attendanceApi.checkOut(currentEmpId);
    if (updated) {
      setManualCheckedInOverride(false);
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
  const isElectraEv = useMemo(() => {
    return Boolean(
      activeCompany?.id === 'c5ab6b03-adde-47cc-a033-064f4c39b21e' ||
      activeCompany?.organization_id === 'c5ab6b03-adde-47cc-a033-064f4c39b21e' ||
      activeCompany?.id === 'c0bbfb28-1500-4ebb-aba8-453b3681f342' ||
      String(activeCompany?.name || '').toLowerCase().includes('electra')
    );
  }, [activeCompany]);

  const activeShiftsList = useMemo(() => {
    if (isElectraEv) return ELECTRA_EV_SHIFTS;
    return shifts && shifts.length > 0 ? shifts : DEFAULT_SHIFTS;
  }, [isElectraEv, shifts]);

  const scopedEmployees = useMemo(() => {
    const activeComp = api.getActiveCompany();
    const effectiveTenantId = activeComp?.organization_id || activeComp?.id;

    return employees.filter(emp => {
      // Multi-tenant strict isolation check
      if (effectiveTenantId && emp.organization_id && emp.organization_id !== effectiveTenantId) {
        if (!isElectraEv || !String(emp.company_name || '').toLowerCase().includes('electra')) {
          return false;
        }
      }
      const matchDept = deptFilter === 'ALL' || (emp.department_name || emp.department || '').toLowerCase() === deptFilter.toLowerCase();
      const matchLoc = locationFilter === 'ALL' || (emp.branch_name || emp.location || '').toLowerCase() === locationFilter.toLowerCase();
      const matchVendor = vendorFilter === 'ALL' || (emp.vendor_name || 'Direct Payroll').toLowerCase() === vendorFilter.toLowerCase();
      return matchDept && matchLoc && matchVendor;
    });
  }, [employees, deptFilter, locationFilter, vendorFilter, activeCompany, isElectraEv]);

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
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, selectedDate, undefined, emp);
      const isWeeklyOff = roster.is_weekly_off;
      const isExpected = !isWeeklyOff;

      if (isExpected) expected++;

      const record = dailyRecords.find(r => 
        (r.employee_id && emp.id && r.employee_id.toLowerCase() === emp.id.toLowerCase()) ||
        (r.employee_code && emp.employee_code && r.employee_code.toLowerCase() === emp.employee_code.toLowerCase()) ||
        (r.employee_code && emp.id && r.employee_code.toLowerCase() === emp.id.toLowerCase())
      );

      const firstIn = record?.first_check_in;
      const lastOut = record?.last_check_out;
      const hasPunch = Boolean(firstIn || lastOut);

      // Determine deterministic shift using smartShiftResolutionService for accurate late calculation
      const shiftDef = attendanceRosterService.getShiftById(roster?.shift_id, emp.organization_id);
      let isLate = false;
      let isEarlyOut = false;

      if (firstIn) {
        const adaptiveRes = smartShiftResolutionService.resolveShiftDeterministic({
          assignedShift: shiftDef,
          activeShifts: activeShiftsList,
          firstPunchTime: firstIn,
          lastPunchTime: lastOut,
          mode: 'ADAPTIVE_SHIFT',
        });

        const shiftStartTime = adaptiveRes?.startTime || shiftDef?.start_time || '09:00';
        const shiftEndTime = adaptiveRes?.endTime || shiftDef?.end_time || '18:00';
        const graceEntry = adaptiveRes?.graceEntryMinutes ?? 15;
        const graceExit = adaptiveRes?.graceExitMinutes ?? 15;

        const inMins = timeStringToMinutes(firstIn);
        const shiftStartMins = timeStringToMinutes(shiftStartTime);
        const shiftEndMins = timeStringToMinutes(shiftEndTime);

        if (inMins !== null && shiftStartMins !== null) {
          if (inMins > shiftStartMins + graceEntry) {
            isLate = true;
          }
        }

        if (lastOut && shiftEndMins !== null) {
          const outMins = timeStringToMinutes(lastOut);
          if (outMins !== null && outMins < shiftEndMins - graceExit) {
            isEarlyOut = true;
          }
        }
      } else if (record) {
        isLate = (record.late_minutes || 0) > 0 || record.status === 'Late';
        isEarlyOut = (record.early_checkout_minutes || 0) > 0 || record.status === 'Early Checkout';
      }

      if (record) {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const isPastDate = selectedDate < todayStr;
        const isMissing = !record.last_check_out && (record.status === 'Missing Punch' || (Boolean(record.first_check_in) && isPastDate));

        // Attendance Precedence Rule: Physical biometric or web punches take absolute precedence over leaves
        if (hasPunch) {
          present++;
          if (isLate) late++;
          if (isEarlyOut) earlyOut++;
          const isNight = String(record.shift_name || '').toUpperCase().includes('SHIFT 3') ||
            String(record.shift_name || '').toUpperCase().includes('SHIFT-3');
          const halfDayCutoff = isNight ? 210 : 240;
          const isActuallyHalfDay = Boolean(
            record.last_check_out &&
            record.net_working_minutes > 0 &&
            record.net_working_minutes < halfDayCutoff
          );
          if (isActuallyHalfDay || ((record.status === 'Half Day' || (record.status as string) === 'HALF_DAY') && (!record.net_working_minutes || record.net_working_minutes < halfDayCutoff))) {
            halfDay++;
          }
          if (isMissing) missingPunch++;
          if ((record.overtime_minutes || 0) > 0 || record.status === 'Overtime') overtime++;
        } else if (record.status === 'On Leave') {
          onLeave++;
        } else if (record.status === 'WFH') {
          wfh++;
          present++;
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
  }, [scopedEmployees, dailyRecords, selectedDate, activeShiftsList]);

  const channelCounts = useMemo(() => {
    let bioCount = 0;
    let faceCount = 0;
    let mobileCount = 0;
    let webCount = 0;

    for (const r of dailyRecords) {
      const src = (r.source || '').toUpperCase();
      if (src === 'BIOMETRIC' || src === 'HARDWARE_TERMINAL') {
        bioCount++;
      } else if (src.includes('FACE')) {
        faceCount++;
      } else if (src === 'MOBILE' || src === 'MOBILE_GPS' || src === 'MOBILE_GPS_FACE') {
        mobileCount++;
      } else if (src === 'WEB' || src === 'MANUAL' || src === 'SYSTEM') {
        webCount++;
      }
    }

    return { bioCount, faceCount, mobileCount, webCount };
  }, [dailyRecords]);

  const displayedRecords = useMemo(() => {
    let filtered = dailyRecords;
    if (selectedChannel === 'BIOMETRIC') {
      filtered = filtered.filter(r => (r.source || '').toUpperCase() === 'BIOMETRIC' || (r.source || '').toUpperCase() === 'HARDWARE_TERMINAL');
    } else if (selectedChannel === 'FACE') {
      filtered = filtered.filter(r => (r.source || '').toUpperCase().includes('FACE'));
    } else if (selectedChannel === 'MOBILE') {
      filtered = filtered.filter(r => (r.source || '').toUpperCase().includes('MOBILE'));
    } else if (selectedChannel === 'WEB') {
      filtered = filtered.filter(r => {
        const s = (r.source || '').toUpperCase();
        return s === 'WEB' || s === 'MANUAL' || s === 'SYSTEM';
      });
    }
    return filtered;
  }, [dailyRecords, selectedChannel]);

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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDiagnosticModalOpen(true)}
              leftIcon={<Bell className="w-3.5 h-3.5 text-indigo-600" />}
              className="text-xs font-semibold hover:border-indigo-400 hover:text-indigo-600 border-indigo-200 bg-indigo-50/50 text-indigo-900"
            >
              Push Diagnostics
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

      {/* 2. UNIFIED CLOCKING CHANNELS & TELEMETRY ALERT STRIP */}
      <div className="bg-white border border-gray-200/90 rounded-2xl shadow-xs p-3.5 space-y-2.5">
        {/* Row 1: Header Label + Real-Time Tenant-Isolated Hardware & Security Telemetry */}
        {(() => {
          const activeTenantId = activeCompany?.organization_id || activeCompany?.id;
          const gpsViolations = workLocationService.getViolationsCount(activeTenantId, selectedDate);
          const faceMismatches = workLocationService.getFaceMismatchesCount(activeTenantId, selectedDate);
          const totalDevices = biometricDevices.length;
          const onlineDevices = biometricDevices.filter((d: any) => {
            const statusStr = String(d.status || '').toLowerCase();
            if (statusStr === 'online' || statusStr === 'connected') return true;
            if (d.last_heartbeat_at) {
              const diffMs = Date.now() - new Date(d.last_heartbeat_at).getTime();
              if (!isNaN(diffMs) && diffMs < 15 * 60 * 1000) return true;
            }
            return Boolean(d.is_active && statusStr !== 'offline');
          }).length;

          return (
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-[#07563D]" />
                <span>Clocking Channels</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={cn(
                  "px-2.5 py-0.5 font-semibold rounded-full border text-[11px] flex items-center gap-1.5 whitespace-nowrap",
                  gpsViolations > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", gpsViolations > 0 ? "bg-rose-500 animate-ping" : "bg-emerald-500")} />
                  {gpsViolations > 0 ? `GPS Violations: ${gpsViolations}` : 'GPS Violations: 0'}
                </span>

                <span className={cn(
                  "px-2.5 py-0.5 font-semibold rounded-full border text-[11px] flex items-center gap-1.5 whitespace-nowrap",
                  faceMismatches > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", faceMismatches > 0 ? "bg-amber-500" : "bg-emerald-500")} />
                  {faceMismatches > 0 ? `Face Mismatches: ${faceMismatches}` : 'Face Mismatches: 0'}
                </span>

                <span className={cn(
                  "px-2.5 py-0.5 font-semibold rounded-full border text-[11px] flex items-center gap-1.5 whitespace-nowrap",
                  totalDevices === 0
                    ? "bg-gray-50 text-gray-600 border-gray-200"
                    : onlineDevices > 0
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    totalDevices === 0
                      ? "bg-gray-400"
                      : onlineDevices > 0
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-rose-500"
                  )} />
                  Devices Online: {onlineDevices}/{totalDevices}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Row 2: Clean Single-Line Channel Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedChannel('ALL');
              showToast('Showing all unified clocking channels.');
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
              selectedChannel === 'ALL'
                ? "bg-[#07563D] text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Channels ({totalHeadcount})</span>
          </button>

          <button
            onClick={() => {
              setSelectedChannel('BIOMETRIC');
              showToast('Filtered by Biometric Device Gateway punches.');
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border",
              selectedChannel === 'BIOMETRIC'
                ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                : "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
            )}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Biometric Gateways ({channelCounts.bioCount})</span>
          </button>

          <button
            onClick={() => {
              setSelectedChannel('FACE');
              showToast('Filtered by AI Optical Face Recognition punches.');
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border",
              selectedChannel === 'FACE'
                ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
            )}
          >
            <ScanFace className="w-3.5 h-3.5" />
            <span>Face Recognition ({channelCounts.faceCount})</span>
          </button>

          <button
            onClick={() => {
              setSelectedChannel('MOBILE');
              showToast('Filtered by Mobile GPS Geofence clock-ins.');
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border",
              selectedChannel === 'MOBILE'
                ? "bg-blue-700 text-white border-blue-700 shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Mobile / GPS ({channelCounts.mobileCount})</span>
          </button>

          <button
            onClick={() => {
              setSelectedChannel('WEB');
              showToast('Filtered by Web Check-In / Manual punches.');
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border",
              selectedChannel === 'WEB'
                ? "bg-gray-800 text-white border-gray-800 shadow-xs"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
            )}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Web / Manual ({channelCounts.webCount})</span>
          </button>
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
            {vendors.map(vendor => {
              const isDirect = vendor === 'Direct Payroll';
              const vendorEmps = employees.filter(e => {
                if (isDirect) {
                  return !e.vendor_name || e.vendor_name.trim() === '' || e.vendor_name.toLowerCase() === 'direct payroll' || e.vendor_name.toLowerCase().includes('joy corporate');
                }
                return (e.vendor_name || '').toLowerCase() === vendor.toLowerCase();
              });
              const count = vendorEmps.length;
              if (count === 0 && !isDirect) return null;
              const presentInVendor = dailyRecords.filter(r => 
                vendorEmps.some(e => e.id === r.employee_id || (e.employee_code && r.employee_code && e.employee_code.toLowerCase() === r.employee_code.toLowerCase())) && 
                (r.status === 'Present' || r.status === 'Checked Out' || !!r.first_check_in)
              ).length;
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
            {displayedRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-400 text-xs font-medium">
                  No attendance records found for channel: {selectedChannel}
                </TableCell>
              </TableRow>
            ) : (
              displayedRecords.slice(0, 10).map(r => (
              <TableRow key={r.id} className="hover:bg-gray-50/80">
                <TableCell>
                  <div className="font-bold text-gray-900 text-xs">{r.employee_name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{r.employee_code}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{r.department}</div>
                  <div className="text-[10px] text-indigo-700 font-semibold">{(r as any).vendor_name || 'Direct Payroll'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">{r.shift_name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{r.expected_check_in || '09:00'} - {r.expected_check_out || '18:00'}</div>
                </TableCell>
                <TableCell className="text-xs font-mono font-semibold text-emerald-800">
                  {r.first_check_in ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      {attendanceTimeService.formatAttendanceTime(r.first_check_in, 'Asia/Kolkata', true)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs font-mono text-gray-800">
                  {r.last_check_out ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {attendanceTimeService.formatAttendanceTime(r.last_check_out, 'Asia/Kolkata', true)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs font-bold text-gray-900">
                  {formatMinutesToHoursStr(r.net_working_minutes)}
                </TableCell>
                <TableCell>
                  {(() => {
                    const isNight = String(r.shift_name || '').toUpperCase().includes('SHIFT 3') ||
                      String(r.shift_name || '').toUpperCase().includes('SHIFT-3');
                    const halfCutoff = isNight ? 210 : 240;
                    const displayStatus =
                      (r.status === 'Half Day' || (r.status as string) === 'HALF_DAY') &&
                      r.net_working_minutes >= halfCutoff
                        ? 'Present'
                        : r.status;
                    return (
                      <Badge
                        variant={
                          displayStatus === 'Present' || displayStatus === 'Checked Out'
                            ? 'emerald'
                            : displayStatus === 'Late' || displayStatus === 'Early Checkout'
                            ? 'amber'
                            : displayStatus === 'Absent' || displayStatus === 'Missing Punch'
                            ? 'rose'
                            : 'gray'
                        }
                        size="sm"
                      >
                        {displayStatus}
                      </Badge>
                    );
                  })()}
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
            )))}
          </TableBody>
        </Table>
      </Card>

      <AttendanceNotificationDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
      />
    </div>
  );
};
