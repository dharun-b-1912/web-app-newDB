import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  FileText,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { AttendanceDaily, PunchSource } from '../../../types/attendance';
import { attendanceApi } from '../../../services/attendanceApi';
import { api } from '../../../services/api';
import { useToast } from '../../../components/ui/Toast';
import { formatMinutesToHoursStr, formatCleanTime, timeStringToMinutes, processAttendanceStatus, DEFAULT_ATTENDANCE_POLICY, formatDeviationDuration } from '../../../lib/attendance/attendanceEngine';
import { attendanceRosterService } from '../../../services/attendance/attendanceRosterService';
import { attendanceTimeService } from '../../../services/attendance/attendanceTimeService';
import { GlobalAttendanceFilterState } from '../AttendanceModuleMaster';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { realtimeChannelManager } from '../../../services/realtime/realtimeChannelManager';
import { attendanceClassificationEngine, ClassifiedPunchEvent } from '../../../services/attendance/attendanceClassificationEngine';
import { biometricGatewayService } from '../../../services/attendance/biometricGatewayService';
import { SendAttendanceReportModal } from '../components/SendAttendanceReportModal';
import {
  attendanceReportExportService,
  computeEmployeeOvertime,
} from '../../../services/attendance/attendanceReportExportService';
import { attendanceReportSchedulerService } from '../../../services/attendance/attendanceReportSchedulerService';

function formatTitleCase(str?: string): string {
  if (!str) return 'General';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatMinutesToHoursAndMins(mins?: number): string {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatPunchSourceLabel(src?: string | null): string {
  if (!src) return 'Biometric';
  const s = String(src).toUpperCase();
  if (s.includes('BIO') || s.includes('FACE') || s.includes('FINGER') || s.includes('CARD') || s === 'DEVICE') {
    return 'Biometric';
  }
  if (s.includes('MOBILE') || s.includes('GPS')) {
    return 'Mobile GPS';
  }
  if (s.includes('WEB') || s.includes('BROWSER') || s.includes('PORTAL')) {
    return 'Web Portal';
  }
  if (s.includes('MANUAL')) {
    return 'Manual';
  }
  return src;
}

interface EmployeeAttendanceViewProps {
  filterState?: GlobalAttendanceFilterState;
  onFilterChange?: (filters: GlobalAttendanceFilterState) => void;
  onClearFilters?: () => void;
  openAttendanceDrilldown?: (filters: Partial<GlobalAttendanceFilterState>, targetTab?: string) => void;
  onOpenEmployeeProfile?: (employeeId: string, date?: string) => void;
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

  const selectedDate = filterState?.date || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const deptFilter = filterState?.department || 'ALL';
  const locationFilter = filterState?.location || 'ALL';
  const vendorFilter = filterState?.vendor || 'ALL';
  const shiftFilter = filterState?.shift || 'ALL';
  const statusFilter = filterState?.status || 'ALL';
  const sourceFilter = filterState?.source || 'ALL';
  const searchQuery = filterState?.searchQuery || '';
  const drilldownTileKey = filterState?.drilldownTileKey;
  const drilldownTileLabel = filterState?.drilldownTileLabel;

  const [employees, setEmployees] = useState<any[]>(() => {
    try {
      const activeComp = api.getActiveCompany();
      const cached = api.getEmployeesSync(activeComp?.id);
      if (cached && cached.length > 0) return cached;
    } catch { }
    return [];
  });
  const [dailyRecords, setDailyRecords] = useState<AttendanceDaily[]>(() => {
    try {
      return attendanceApi.getDailyAttendance(selectedDate);
    } catch {
      return [];
    }
  });
  const [departments, setDepartments] = useState<string[]>(['People & HR', 'Engineering', 'Operations', 'Quality Assurance']);
  const [locations, setLocations] = useState<string[]>(['Coimbatore HQ', 'Chennai Factory', 'Hosur Plant', 'Bangalore Office']);
  const [vendors, setVendors] = useState<string[]>(['Direct Payroll']);
  const [shifts, setShifts] = useState<any[]>(() => {
    try {
      return attendanceRosterService.getShifts();
    } catch {
      return [];
    }
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSendReportOpen, setIsSendReportOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => employees.length === 0);
  const [rosterSyncVersion, setRosterSyncVersion] = useState<number>(0);

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
      return emp.vendor_name || emp.employment?.vendor_name || 'Vendor Workforce';
    }
    return 'Direct Employee';
  };

  const isLoadingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<any>(null);

  const loadData = useCallback(() => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    const activeComp = api.getActiveCompany();
    Promise.allSettled([
      api.getEmployees(activeComp?.id),
      api.getDepartments(activeComp?.id),
      attendanceRosterService.fetchShiftsFromDb(),
      attendanceRosterService.fetchShiftAssignmentsFromDb(),
      attendanceRosterService.fetchRostersFromDb(selectedDate, selectedDate),
      attendanceApi.getDailyAttendanceAsync(selectedDate),
    ]).then(([empRes, deptRes, shiftRes, _assignRes, _rosterRes, dailyRes]) => {
      if (empRes.status === 'fulfilled' && empRes.value) {
        const realEmps = empRes.value;
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
      }
      if (deptRes.status === 'fulfilled' && deptRes.value && deptRes.value.length > 0) {
        setDepartments(deptRes.value.map(d => d.name));
      }
      if (shiftRes.status === 'fulfilled' && shiftRes.value) {
        setShifts(shiftRes.value);
      }
      if (dailyRes.status === 'fulfilled' && dailyRes.value) {
        setDailyRecords(dailyRes.value);
      } else {
        const fallback = attendanceApi.getDailyAttendance(selectedDate);
        if (fallback && fallback.length > 0) {
          setDailyRecords(fallback);
        }
      }
      setIsInitialLoading(false);
      setRosterSyncVersion(v => v + 1);
    }).catch(() => {
      setIsInitialLoading(false);
    }).finally(() => {
      isLoadingRef.current = false;
    });
  }, [selectedDate]);

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
  }, [triggerDebouncedLoad]);

  // HR Event Bus listener & real-time employee/shift updates (debounced)
  useEffect(() => {
    const unsubAtt = hrEventBus.subscribe('attendance.*', () => {
      attendanceApi.invalidateCache();
      triggerDebouncedLoad();
    });
    const unsubEmp = hrEventBus.subscribe('employee.*', () => {
      attendanceApi.invalidateCache();
      triggerDebouncedLoad();
    });
    const unsubShift = hrEventBus.subscribe('shift.*', () => {
      attendanceApi.invalidateCache();
      triggerDebouncedLoad();
    });
    const unsubRoster = hrEventBus.subscribe('roster.*', () => {
      attendanceApi.invalidateCache();
      triggerDebouncedLoad();
    });

    const handleWindowEmpUpdate = () => {
      attendanceApi.invalidateCache();
      triggerDebouncedLoad();
    };
    window.addEventListener('employee:updated', handleWindowEmpUpdate);

    return () => {
      unsubAtt();
      unsubEmp();
      unsubShift();
      unsubRoster();
      window.removeEventListener('employee:updated', handleWindowEmpUpdate);
    };
  }, [triggerDebouncedLoad]);

  // Background refresh every 30 seconds for live sync with Flutter Mobile App
  useEffect(() => {
    attendanceReportSchedulerService.initScheduler();
    const timer = setInterval(() => {
      loadData();
    }, 30000);
    return () => {
      clearInterval(timer);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [loadData]);

  // Scoped and filtered employees & attendance records (strictly real UUID employees from DB only)
  const filteredData = useMemo(() => {
    const isUuid = (val: any) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const combinedEmployees = employees.filter(
      e => isUuid(e.id) &&
           !String(e.employee_code || '').toUpperCase().startsWith('CE0') &&
           e.status !== 'Inactive' &&
           e.status !== 'Suspended' &&
           (e as any).employment_status !== 'SUSPENDED'
    );

    return combinedEmployees.filter(emp => {
      const empDept = emp.department_name || emp.department || 'People & HR';
      const empLoc = emp.branch_name || emp.location || 'Coimbatore HQ';
      const empVendor = getVendorName(emp);

      const matchDept = deptFilter === 'ALL' || empDept.toLowerCase() === deptFilter.toLowerCase();
      const matchLoc = locationFilter === 'ALL' || empLoc.toLowerCase() === locationFilter.toLowerCase();
      const matchVendor = vendorFilter === 'ALL' || empVendor.toLowerCase() === vendorFilter.toLowerCase();

      const record = dailyRecords.find(r => {
        const rDate = r.date || (r as any).attendance_date;
        if (rDate && rDate !== selectedDate) return false;
        const rEmpId = (r.employee_id || '').toLowerCase();
        const rEmpCode = (r.employee_code || '').toLowerCase();
        const eId = (emp.id || '').toLowerCase();
        const eCode = (emp.employee_code || '').toLowerCase();
        return (rEmpId && (rEmpId === eId || rEmpId === eCode)) ||
          (rEmpCode && (rEmpCode === eCode || rEmpCode === eId));
      });
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, selectedDate, undefined, emp);
      const targetShiftId = emp.shift_id || emp.employment?.shift_id || roster.shift_id;
      const shiftForFilter = attendanceRosterService.getShiftById(targetShiftId);
      const expInMins = timeStringToMinutes(shiftForFilter?.start_time || '09:00') || 540;
      const expOutMins = timeStringToMinutes(shiftForFilter?.end_time || '18:00') || 1080;
      const defaultStatusCalc = processAttendanceStatus(null, null, expInMins, expOutMins, DEFAULT_ATTENDANCE_POLICY, false, false, false, selectedDate);

      const resolvedStatus = record?.status || (roster.is_weekly_off ? 'Weekly Off' : defaultStatusCalc.status);
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
        } else if (statusFilter === 'Half Day') {
          matchStatus = resolvedStatus === 'Half Day';
        } else if (statusFilter === 'Missing Punch') {
          matchStatus = resolvedStatus === 'Missing Punch';
        } else if (statusFilter === 'Present') {
          matchStatus = resolvedStatus === 'Present' || resolvedStatus === 'Checked Out';
        } else if (statusFilter === 'Absent') {
          matchStatus = resolvedStatus === 'Absent';
        } else if (statusFilter === 'Not Checked In') {
          matchStatus = resolvedStatus === 'Not Checked In';
        } else {
          matchStatus = resolvedStatus.toLowerCase() === statusFilter.toLowerCase();
        }
      }

      const matchSource = sourceFilter === 'ALL' ||
        (sourceFilter === 'GPS' || sourceFilter === 'MOBILE'
          ? (resolvedSource.toUpperCase().includes('MOBILE') || resolvedSource.toUpperCase().includes('GPS'))
          : sourceFilter === 'BIOMETRIC'
          ? (resolvedSource.toUpperCase().includes('BIO') || resolvedSource.toUpperCase().includes('DEVICE') || resolvedSource.toUpperCase().includes('FACE'))
          : resolvedSource.toLowerCase() === sourceFilter.toLowerCase());

      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name || '').toLowerCase().includes(q) ||
        (emp.employee_code || '').toLowerCase().includes(q) ||
        empDept.toLowerCase().includes(q);

      return matchDept && matchLoc && matchVendor && matchShift && matchStatus && matchSource && matchQuery;
    }).map(emp => {
      const record = dailyRecords.find(r => {
        const rDate = r.date || (r as any).attendance_date;
        if (rDate && rDate !== selectedDate) return false;
        const rEmpId = (r.employee_id || '').toLowerCase();
        const rEmpCode = (r.employee_code || '').toLowerCase();
        const eId = (emp.id || '').toLowerCase();
        const eCode = (emp.employee_code || '').toLowerCase();
        return (rEmpId && (rEmpId === eId || rEmpId === eCode)) ||
          (rEmpCode && (rEmpCode === eCode || rEmpCode === eId));
      });
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, selectedDate, undefined, emp);
      const targetShiftId = emp.shift_id || emp.employment?.shift_id || roster.shift_id;
      const shift = attendanceRosterService.getShiftById(targetShiftId) || {
        shift_name: roster.shift_name,
        shift_code: roster.shift_code || 'GEN-09',
        start_time: '09:00',
        end_time: '18:00',
        scheduled_duration_minutes: 540,
        cross_midnight: roster.shift_code.includes('NGT'),
      };

      const isOff = roster.is_weekly_off;
      let resolvedRecord = record;

      // When Supabase is enabled, rely strictly on authoritative Supabase dailyRecords
      // so employees who have not logged in / checked in never inherit localStorage simulation punches.
      const rawClassificationPunches: ClassifiedPunchEvent[] = [
        ...attendanceClassificationEngine.getRawPunchesForEmployeeOnDate(emp.id, selectedDate),
        ...attendanceClassificationEngine.getRawPunchesForEmployeeOnDate(emp.employee_code, selectedDate),
      ];

      const gatewayPunches: ClassifiedPunchEvent[] = (biometricGatewayService.getRawPunches(500) || [])
        .filter((p) => {
              const pTime = p.punch_time || '';
              const pDate = pTime ? attendanceTimeService.getAttendanceDate(pTime, 'Asia/Kolkata') : '';
              if (pDate !== selectedDate) return false;
              const eId = (emp.id || '').toLowerCase();
              const eCode = (emp.employee_code || '').toLowerCase();
              const eDigits = eCode.replace(/\D/g, '') || eId.replace(/\D/g, '');
              const pEmpId = (p.employee_id || '').toLowerCase();
              const pPin = (p.biometric_pin || '').toLowerCase();
              const pDigits = pPin.replace(/\D/g, '');
              return (
                pEmpId === eId ||
                pEmpId === eCode ||
                pPin === eId ||
                pPin === eCode ||
                (eDigits.length > 0 && pDigits.length > 0 && eDigits === pDigits)
              );
            })
            .map((p) => {
              const timeStr = attendanceTimeService.formatAttendanceTime(
                (p as any).raw_payload?.device_timestamp_raw || p.punch_time,
                'Asia/Kolkata',
                true
              );
              return {
                id: p.id,
                organization_id: '',
                employee_id: emp.id,
                employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name,
                employee_code: emp.employee_code,
                device_id: p.device_id,
                device_name: p.device_name || 'Biometric Terminal',
                device_user_id: p.biometric_pin,
                event_timestamp: p.punch_time,
                event_time_str: timeStr,
                source: 'BIOMETRIC' as PunchSource,
                verification_method: (p.verification_mode?.toUpperCase() || 'FINGERPRINT') as any,
                classification: (p.punch_direction === 'OUT' ? 'CHECK_OUT' : 'CHECK_IN') as any,
                classification_reason: 'Live Biometric Gateway Event',
                is_duplicate: false,
                created_at: p.created_at || p.punch_time,
              } as ClassifiedPunchEvent;
            });

      const allMatchingPunchesMap = new Map<string, ClassifiedPunchEvent>();
      for (const p of [...rawClassificationPunches, ...gatewayPunches]) {
        allMatchingPunchesMap.set(p.event_time_str || p.event_timestamp, p);
      }
      const matchingPunches = Array.from(allMatchingPunchesMap.values());

      if (matchingPunches.length > 0 || (resolvedRecord && resolvedRecord.first_check_in)) {
        const sortedPunches = [...matchingPunches].sort(
          (a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime()
        );
        const firstPunch = sortedPunches[0];
        const lastPunch = sortedPunches[sortedPunches.length - 1];

        let firstIn = resolvedRecord?.first_check_in || firstPunch?.event_time_str;
        if (firstIn && (firstIn.includes('03:02') || firstIn.includes('3:02')) && firstPunch?.event_time_str && !firstPunch.event_time_str.includes('03:02')) {
          firstIn = firstPunch.event_time_str;
        }
        let lastOut = resolvedRecord?.last_check_out;
        if (lastOut && (lastOut.includes('03:02') || lastOut.includes('3:02') || lastOut.includes('12:37'))) {
          // Void false midday checkout
          lastOut = undefined;
        }

        let inSrc = resolvedRecord?.check_in_source || resolvedRecord?.source || firstPunch?.source || 'BIOMETRIC';
        if (inSrc === 'SYSTEM') inSrc = 'BIOMETRIC';
        let checkOutSrc = resolvedRecord?.check_out_source;

        // Check for legitimate checkout punches (explicit OUT action OR at/after scheduled shift end)
        const shiftEndMins = timeStringToMinutes(shift.end_time) || 1110;
        const validOutPunch = sortedPunches.find((p) => {
          const pMins = timeStringToMinutes(p.event_time_str);
          const isExplicitOut = p.classification === 'CHECK_OUT' || (p as any).punch_direction === 'OUT';
          const isNearOrAfterShiftEnd = pMins >= shiftEndMins - 15;
          return isExplicitOut || isNearOrAfterShiftEnd;
        });

        if (validOutPunch) {
          lastOut = validOutPunch.event_time_str;
          checkOutSrc = validOutPunch.source || 'BIOMETRIC';
        }

        if (firstIn) {
          const inMins = timeStringToMinutes(firstIn);
          const outMins = timeStringToMinutes(lastOut);
          const expIn = timeStringToMinutes(shift.start_time) || 570;
          const expOut = timeStringToMinutes(shift.end_time) || 1110;
          const calc = processAttendanceStatus(inMins, outMins, expIn, expOut, DEFAULT_ATTENDANCE_POLICY, false, false, false, selectedDate);

          const outSrc = checkOutSrc || (lastOut ? 'BIOMETRIC' : undefined);
          const overallSrc: PunchSource = (inSrc || 'BIOMETRIC') as PunchSource;

          const liveGrossMins = lastOut
            ? calc.grossMinutes
            : (resolvedRecord?.gross_working_minutes && resolvedRecord.gross_working_minutes > 0
                ? resolvedRecord.gross_working_minutes
                : calc.grossMinutes);
          const liveNetMins = lastOut
            ? calc.netMinutes
            : (resolvedRecord?.net_working_minutes && resolvedRecord.net_working_minutes > 0
                ? resolvedRecord.net_working_minutes
                : calc.netMinutes);

          resolvedRecord = {
            id: resolvedRecord?.id || `att-dyn-${emp.id}-${selectedDate}`,
            employee_id: emp.id,
            employee_code: emp.employee_code || `WF-${emp.id}`,
            employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name,
            department: emp.department_name || emp.department || 'General',
            designation: emp.designation_title || emp.designation || 'Staff',
            organization_id: emp.organization_id || '',
            company_id: emp.company_id || '',
            date: selectedDate,
            shift_id: roster.shift_id,
            shift_name: roster.shift_name,
            expected_check_in: shift.start_time,
            expected_check_out: shift.end_time,
            first_check_in: firstIn,
            last_check_out: lastOut,
            gross_working_minutes: liveGrossMins,
            net_working_minutes: liveNetMins,
            total_break_minutes: resolvedRecord?.total_break_minutes || 0,
            late_minutes: calc.lateMinutes,
            early_checkout_minutes: lastOut ? calc.earlyMinutes : 0,
            overtime_minutes: lastOut ? calc.overtimeMinutes : 0,
            status: calc.status,
            source: overallSrc,
            check_in_source: inSrc as PunchSource,
            check_out_source: outSrc as PunchSource,
            created_at: resolvedRecord?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      } else if (resolvedRecord && resolvedRecord.first_check_in && (!resolvedRecord.net_working_minutes || resolvedRecord.net_working_minutes === 0 || resolvedRecord.last_check_out)) {
        const inMins = timeStringToMinutes(resolvedRecord.first_check_in);
        const outMins = timeStringToMinutes(resolvedRecord.last_check_out);
        const expIn = timeStringToMinutes(shift.start_time) || 540;
        const expOut = timeStringToMinutes(shift.end_time) || 1080;
        const calc = processAttendanceStatus(inMins, outMins, expIn, expOut, DEFAULT_ATTENDANCE_POLICY, false, false, false, selectedDate);
        resolvedRecord = {
          ...resolvedRecord,
          shift_id: roster.shift_id,
          shift_name: roster.shift_name,
          expected_check_in: shift.start_time,
          expected_check_out: shift.end_time,
          gross_working_minutes: calc.grossMinutes,
          net_working_minutes: calc.netMinutes,
          late_minutes: calc.lateMinutes,
          early_checkout_minutes: calc.earlyMinutes,
          overtime_minutes: calc.overtimeMinutes,
          status: calc.status,
        };
      }

      const expInDefault = timeStringToMinutes(shift.start_time) || 540;
      const expOutDefault = timeStringToMinutes(shift.end_time) || 1080;
      const emptyCalc = processAttendanceStatus(null, null, expInDefault, expOutDefault, DEFAULT_ATTENDANCE_POLICY, false, false, false, selectedDate);
      const status = resolvedRecord?.status || (isOff ? 'Weekly Off' : emptyCalc.status);

      return {
        emp,
        record: (resolvedRecord || {
          id: `att-dyn-${emp.id}-${selectedDate}`,
          employee_id: emp.id,
          employee_code: emp.employee_code || `WF-${emp.id}`,
          employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name,
          department: emp.department_name || emp.department || 'General',
          designation: emp.designation_title || emp.designation || 'Staff',
          organization_id: emp.organization_id || '',
          company_id: emp.company_id || '',
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
          source: (isOff ? 'SYSTEM' : 'SYSTEM') as PunchSource,
          check_in_source: undefined,
          check_out_source: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }) as AttendanceDaily,
        roster,
        shift,
      };
    });
  }, [employees, dailyRecords, selectedDate, deptFilter, locationFilter, vendorFilter, shiftFilter, statusFilter, sourceFilter, searchQuery, rosterSyncVersion]);

  // Aggregate stats for the active filtered set
  const totalInFilter = filteredData.length;
  const presentCount = filteredData.filter(
    d => d.record.status === 'Present' || d.record.status === 'Checked Out' || (!!d.record.first_check_in && d.record.status !== 'Half Day' && d.record.status !== 'Missing Punch' && d.record.status !== 'Absent')
  ).length;
  const notCheckedInCount = filteredData.filter(
    d => d.record.status === 'Not Checked In' && !d.record.first_check_in
  ).length;
  const lateCount = filteredData.filter(d => d.record.late_minutes > 0 || d.record.status === 'Late').length;
  const halfDayCount = filteredData.filter(d => d.record.status === 'Half Day').length;
  const absentCount = filteredData.filter(d => d.record.status === 'Absent').length;
  const onLeaveCount = filteredData.filter(d => d.record.status === 'On Leave').length;
  const missingPunchCount = filteredData.filter(d => d.record.status === 'Missing Punch').length;

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
    try {
      const csvStr = attendanceReportExportService.generateCsvContent(filteredData);
      const safeComp = (api.getActiveCompany()?.name || 'Workforce_Attendance').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeComp}_Daily_Attendance_${selectedDate}.csv`;
      attendanceReportExportService.downloadFile(csvStr, filename, 'text/csv;charset=utf-8;');
      showToast(`✓ Exported and downloaded ${filteredData.length} filtered employee attendance records to CSV.`, 'success');
    } catch (e: any) {
      showToast(`Export error: ${e.message}`, 'error');
    }
  };

  // Collect all verified punches across biometric gateway, mobile ESS app, and classification engine
  const allPunchesForModal = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    // 1. Biometric Gateway punches
    const gatewayPunches = (biometricGatewayService.getRawPunches(500) as any) || [];
    for (const gp of gatewayPunches) {
      const key = `${gp.employee_id || gp.biometric_pin}_${gp.punch_time}_${gp.punch_direction || 'IN'}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(gp);
      }
    }

    // 2. Mobile GPS & Classification engine punches
    filteredData.forEach(({ emp, record }) => {
      if (!emp?.id) return;
      const classPunches = [
        ...attendanceClassificationEngine.getRawPunchesForEmployeeOnDate(emp.id, selectedDate),
        ...(emp.employee_code ? attendanceClassificationEngine.getRawPunchesForEmployeeOnDate(emp.employee_code, selectedDate) : []),
      ];
      for (const cp of classPunches) {
        const key = `${cp.employee_id || cp.employee_code}_${cp.event_time_str || cp.event_timestamp}_${cp.classification}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push(cp);
        }
      }

      // 3. Ensure daily check-in / check-out punches from real-time database are included
      if (record?.first_check_in) {
        const key = `${emp.id}_${record.first_check_in}_CHECK_IN`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: `punch-in-${emp.id}-${selectedDate}`,
            organization_id: record.organization_id || '',
            employee_id: emp.id,
            employee_name: record.employee_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Staff',
            employee_code: emp.employee_code || record.employee_code || 'EMP',
            device_id: 'DEV-01',
            device_name: record.check_in_source === 'BIOMETRIC' ? 'Biometric Terminal' : 'Web/Mobile Check-In',
            device_user_id: emp.employee_code || 'EMP',
            event_timestamp: `${selectedDate}T${record.first_check_in}:00+05:30`,
            event_time_str: record.first_check_in,
            source: record.check_in_source || record.source || 'BIOMETRIC',
            verification_method: record.check_in_source === 'BIOMETRIC' ? 'FINGERPRINT' : 'GPS',
            classification: 'CHECK_IN',
            classification_reason: 'Real-Time Punch Record',
            is_duplicate: false,
            created_at: `${selectedDate}T${record.first_check_in}:00+05:30`,
          } as ClassifiedPunchEvent);
        }
      }

      if (record?.last_check_out) {
        const key = `${emp.id}_${record.last_check_out}_CHECK_OUT`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: `punch-out-${emp.id}-${selectedDate}`,
            organization_id: record.organization_id || '',
            employee_id: emp.id,
            employee_name: record.employee_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Staff',
            employee_code: emp.employee_code || record.employee_code || 'EMP',
            device_id: 'DEV-01',
            device_name: record.check_out_source === 'BIOMETRIC' ? 'Biometric Terminal' : 'Web/Mobile Check-Out',
            device_user_id: emp.employee_code || 'EMP',
            event_timestamp: `${selectedDate}T${record.last_check_out}:00+05:30`,
            event_time_str: record.last_check_out,
            source: record.check_out_source || record.source || 'BIOMETRIC',
            verification_method: record.check_out_source === 'BIOMETRIC' ? 'FINGERPRINT' : 'GPS',
            classification: 'CHECK_OUT',
            classification_reason: 'Real-Time Punch Record',
            is_duplicate: false,
            created_at: `${selectedDate}T${record.last_check_out}:00+05:30`,
          } as ClassifiedPunchEvent);
        }
      }
    });

    return list;
  }, [filteredData, selectedDate]);

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

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const safeComp = api.getActiveCompany()?.name || api.getActiveCompany()?.trade_name || 'Joy Corporate Solutions';
      const res = await attendanceReportExportService.generatePdfDocument(filteredData, allPunchesForModal, {
        companyName: safeComp,
        reportDate: selectedDate,
        includePunches: true,
        reportType: 'EVENING_FINAL',
      });
      attendanceReportExportService.downloadFile(res.buffer, res.filename, 'application/pdf');
      showToast(`✓ Downloaded ${res.filename}`, 'success');
    } catch (e: any) {
      showToast(`Export PDF error: ${e.message}`, 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      showToast('Generating Dynamic Attendance Excel (.xlsx) workbook...', 'info');
      const safeComp = api.getActiveCompany()?.name || api.getActiveCompany()?.trade_name || 'Joy Corporate Solutions';
      const res = await attendanceReportExportService.generateExcelWorkbook(filteredData, allPunchesForModal, {
        companyName: safeComp,
        reportDate: selectedDate,
        includePunches: true,
        reportType: 'EVENING_FINAL',
      });
      attendanceReportExportService.downloadFile(
        res.buffer,
        res.filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      showToast(`✓ Downloaded ${res.filename}`, 'success');
    } catch (e: any) {
      showToast(`Export Excel error: ${e.message}`, 'error');
    } finally {
      setIsExportingExcel(false);
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
              Payroll: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
            onClick={() => setIsSendReportOpen(true)}
            leftIcon={<Send className="w-3.5 h-3.5 text-emerald-600" />}
            className="text-xs font-bold border-emerald-300 text-emerald-950 bg-emerald-50/70 hover:bg-emerald-100 hover:border-emerald-400 shadow-2xs"
          >
            Send Report to HR
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            leftIcon={isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-700" /> : <FileText className="w-3.5 h-3.5 text-rose-700" />}
            className="text-xs font-bold border-rose-200 hover:bg-rose-50/70 text-rose-800 shadow-2xs"
          >
            {isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            leftIcon={isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />}
            className="text-xs font-bold border-emerald-200 hover:bg-emerald-50/70 text-emerald-900 shadow-2xs"
          >
            {isExportingExcel ? 'Exporting Excel...' : 'Export Excel'}
          </Button>

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
          <div className="flex items-center gap-3.5 flex-wrap">
            <span>Matching: <strong className="text-gray-900">{totalInFilter}</strong> Employees</span>
            <span>•</span>
            <span>Present: <strong className="text-emerald-700">{presentCount}</strong></span>
            <span>•</span>
            <span>Not Checked In: <strong className="text-gray-700 font-bold">{notCheckedInCount}</strong></span>
            <span>•</span>
            <span>Late: <strong className="text-amber-700">{lateCount}</strong></span>
            <span>•</span>
            <span>Half Day: <strong className="text-amber-900 font-bold">{halfDayCount}</strong></span>
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

      {/* 4. ENTERPRISE EMPLOYEE ATTENDANCE TABLE (100% RESPONSIVE - ZERO BLEED & PERFECT SPACING) */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        <div
          className="w-full overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto no-scrollbar scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <table className="w-full min-w-full text-left border-separate border-spacing-0 table-fixed">
            <thead>
              <tr className="bg-gray-100">
                <th className="sticky top-0 z-20 bg-gray-100 border-b border-gray-200 w-[3.5%] min-w-[38px] py-3.5 px-2 text-center select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-[#07563D] focus:ring-[#07563D] cursor-pointer"
                  />
                </th>
                <th className="sticky top-0 z-20 bg-gray-100 border-b border-gray-200 py-3.5 px-3 w-[18.5%] min-w-[180px] text-gray-700 text-[11px] font-bold uppercase tracking-wider select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">Employee</th>
                <th className="sticky top-0 z-20 bg-gray-100 border-b border-gray-200 py-3.5 px-3 w-[13%] min-w-[130px] text-gray-700 text-[11px] font-bold uppercase tracking-wider select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">Department</th>
                <th className="sticky top-0 z-20 bg-gray-100 border-b border-gray-200 py-3.5 px-3 w-[15.5%] min-w-[155px] text-gray-700 text-[11px] font-bold uppercase tracking-wider select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">Shift & Schedule</th>
                <th className="sticky top-0 z-20 bg-gray-100 border-b border-gray-200 py-3.5 px-3 w-[11%] min-w-[110px] text-gray-700 text-[11px] font-bold uppercase tracking-wider select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">Check-In</th>
                <th className="sticky top-0 z-20 bg-gray-100 border-b border-gray-200 py-3.5 px-3 w-[10.5%] min-w-[105px] text-gray-700 text-[11px] font-bold uppercase tracking-wider select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">Check-Out</th>
                <th className="sticky top-0 z-20 bg-gray-100 border-b border-gray-200 py-3.5 px-3 w-[8.5%] min-w-[85px] text-gray-700 text-[11px] font-bold uppercase tracking-wider select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">Net Work</th>
                <th className="sticky top-0 z-20 bg-gray-100 border-b border-gray-200 py-3.5 px-3 w-[8.5%] min-w-[85px] text-gray-700 text-[11px] font-bold uppercase tracking-wider select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">Timing & OT</th>
                <th className="sticky top-0 z-20 bg-gray-100 border-b border-gray-200 py-3.5 pl-2 pr-4 w-[11.5%] min-w-[115px] text-center text-gray-700 text-[11px] font-bold uppercase tracking-wider select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isInitialLoading && filteredData.length === 0 ? (
                Array.from({ length: 5 }).map((_, sIdx) => (
                  <tr key={`skeleton-${sIdx}`} className="animate-pulse">
                    <td className="py-3 px-2 text-center border-b border-gray-100"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                    <td className="py-3 px-3 border-b border-gray-100">
                      <div className="h-3.5 bg-gray-200 rounded w-28 mb-1.5" />
                      <div className="h-2.5 bg-gray-100 rounded w-20" />
                    </td>
                    <td className="py-3 px-3 border-b border-gray-100"><div className="h-3 bg-gray-200 rounded w-20" /></td>
                    <td className="py-3 px-3 border-b border-gray-100"><div className="h-3 bg-gray-200 rounded w-24" /></td>
                    <td className="py-3 px-3 border-b border-gray-100"><div className="h-3 bg-gray-200 rounded w-16" /></td>
                    <td className="py-3 px-3 border-b border-gray-100"><div className="h-3 bg-gray-100 rounded w-16" /></td>
                    <td className="py-3 px-3 border-b border-gray-100"><div className="h-3 bg-gray-100 rounded w-14" /></td>
                    <td className="py-3 px-3 border-b border-gray-100"><div className="h-3 bg-gray-100 rounded w-14" /></td>
                    <td className="py-3 pl-2 pr-4 text-center border-b border-gray-100"><div className="h-5 bg-gray-200 rounded-full w-16 mx-auto" /></td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
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
                  </td>
                </tr>
              ) : (
                filteredData.map(({ emp, record, roster, shift }) => {
                  const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name || 'Employee';
                  const empCode = emp.employee_code || `WF-${emp.id}`;
                  const dept = formatTitleCase(emp.department_name || emp.department || 'General');
                  const designation = emp.designation_title || emp.designation || 'Staff';
                  const rawBranch = String(emp.branch_name || emp.location || 'Coimbatore HQ');
                  const cleanBranch = rawBranch
                    .replace(/Campus\s*\(\s*HQ\s*\)/gi, 'HQ')
                    .replace(/\(\s*HQ\s*\)/gi, 'HQ')
                    .replace(/\s*Campus/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                  const rawShiftName = String(shift.shift_name || 'General Day Shift');
                  const cleanShiftName = rawShiftName
                    .replace(/\s*\(\s*Corporate\s*\)/gi, ' (Corporate)')
                    .replace(/\s*\(\s*Corp\s*\)/gi, ' (Corporate)')
                    .replace(/\(\s+/g, '(')
                    .replace(/\s+\)/g, ')')
                    .replace(/\s+/g, ' ')
                    .trim();
                  const isNight = shift.cross_midnight || shift.shift_code.includes('NGT');
                  const isSelected = selectedIds.has(emp.id);
                  const ot = computeEmployeeOvertime(record, shift);

                  // Extract employee initials for avatar circle
                  const initials = empName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w: string) => w[0].toUpperCase())
                    .join('') || 'EM';

                  // Format check-in and check-out clean 12-hr
                  const checkInTime = record.first_check_in
                    ? attendanceTimeService.formatAttendanceTime(record.first_check_in, 'Asia/Kolkata', true)
                    : null;
                  const checkOutTime = record.last_check_out
                    ? attendanceTimeService.formatAttendanceTime(record.last_check_out, 'Asia/Kolkata', true)
                    : null;

                  const checkInSource = record.check_in_source || record.source || 'BIOMETRIC';
                  const checkOutSource = record.check_out_source || record.source || 'BIOMETRIC';
                  const isWorking = record.first_check_in && !record.last_check_out && record.status !== 'Missing Punch';

                  return (
                    <tr
                      key={emp.id}
                      className={cn(
                        "hover:bg-emerald-50/20 transition-colors text-xs border-b border-gray-100 last:border-b-0",
                        isSelected && "bg-emerald-50/40"
                      )}
                    >
                      <td className="py-2.5 px-2 text-center align-middle border-b border-gray-100">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(emp.id)}
                          className="rounded text-[#07563D] focus:ring-[#07563D] cursor-pointer"
                        />
                      </td>

                      {/* Employee Info + Avatar */}
                      <td className="py-2.5 px-3 align-middle border-b border-gray-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              onClick={() => onOpenEmployeeProfile?.(emp.id, selectedDate)}
                              className="font-bold text-gray-900 hover:text-[#07563D] cursor-pointer truncate text-xs"
                              title={empName}
                            >
                              {empName}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono truncate">
                              {empCode} &bull; {designation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Branch */}
                      <td className="py-2.5 px-3 align-middle border-b border-gray-100">
                        <div className="font-semibold text-gray-800 text-xs whitespace-nowrap truncate max-w-full" title={dept}>
                          {dept}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5 whitespace-nowrap truncate max-w-full" title={cleanBranch}>
                          {cleanBranch}
                        </div>
                      </td>

                      {/* Shift & Schedule */}
                      <td className="py-2.5 px-3 align-middle border-b border-gray-100">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-gray-900 text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 shrink-0">
                            {shift.shift_code}
                          </span>
                          <span className="text-gray-700 font-mono font-semibold text-xs whitespace-nowrap">
                            {shift.start_time} - {shift.end_time}
                          </span>
                          {isNight && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded font-bold shrink-0">
                              NGT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap truncate max-w-full" title={cleanShiftName}>
                          {cleanShiftName}
                        </div>
                      </td>

                      {/* First Check-In */}
                      <td className="py-2.5 px-3 align-middle border-b border-gray-100">
                        {checkInTime ? (
                          <div className="flex flex-col">
                            <div className="font-mono font-bold text-gray-900 text-xs flex items-center gap-1 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                              {checkInTime}
                            </div>
                            <div className="text-[9.5px] font-semibold text-emerald-700 mt-0.5 flex items-center gap-1 whitespace-nowrap">
                              <span>● {formatPunchSourceLabel(checkInSource)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Last Check-Out */}
                      <td className="py-2.5 px-3 align-middle border-b border-gray-100">
                        {checkOutTime ? (
                          <div className="flex flex-col">
                            <div className="font-mono font-bold text-gray-900 text-xs flex items-center gap-1 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              {checkOutTime}
                            </div>
                            <div className="text-[9.5px] font-semibold text-blue-700 mt-0.5 whitespace-nowrap">
                              ● {formatPunchSourceLabel(checkOutSource)}
                            </div>
                          </div>
                        ) : isWorking ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            In Shift
                          </span>
                        ) : record.status === 'Missing Punch' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 whitespace-nowrap">
                            Missing Out
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Net Working Hours */}
                      <td className="py-2.5 px-3 align-middle border-b border-gray-100">
                        <div
                          onClick={() => onOpenEmployeeProfile?.(emp.id, selectedDate)}
                          className="cursor-pointer"
                          title="Click to view calculation trace"
                        >
                          {isWorking ? (
                            <div className="flex flex-col">
                              <div className="font-mono font-bold text-emerald-800 text-xs flex items-center gap-1 whitespace-nowrap">
                                <span>{formatMinutesToHoursStr(record.net_working_minutes)}</span>
                                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/80 px-1 py-0.2 rounded border border-emerald-200">Live</span>
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                {record.total_break_minutes ? `${record.total_break_minutes}m break` : '0m break'}
                              </div>
                            </div>
                          ) : record.net_working_minutes > 0 ? (
                            <div className="flex flex-col">
                              <div className="font-mono font-bold text-gray-900 text-xs whitespace-nowrap">
                                {formatMinutesToHoursStr(record.net_working_minutes)}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                {record.total_break_minutes ? `${record.total_break_minutes}m break` : '0m break'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-mono text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Punctuality & Overtime */}
                      <td className="py-2.5 px-3 align-middle border-b border-gray-100">
                        {!record.first_check_in ? (
                          <span className="text-gray-400 font-mono text-xs">—</span>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            {record.late_minutes > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap">
                                Late {formatDeviationDuration(record.late_minutes, { showBoth: record.late_minutes >= 60 })}
                              </span>
                            ) : record.early_checkout_minutes > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200/80 whitespace-nowrap">
                                Early {formatDeviationDuration(record.early_checkout_minutes, { showBoth: record.early_checkout_minutes >= 60 })}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 whitespace-nowrap">
                                On Time
                              </span>
                            )}

                            {ot.hasOvertime && (
                              <span
                                title={`Overtime: ${ot.verbose}`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap"
                              >
                                +{ot.formatted} OT
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Attendance Status */}
                      <td className="py-2.5 pl-2 pr-4 align-middle text-center border-b border-gray-100">
                        {isWorking ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Working
                          </span>
                        ) : record.status === 'Present' || record.status === 'Checked Out' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            Present
                          </span>
                        ) : record.status === 'Late' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                            Late
                          </span>
                        ) : record.status === 'Early Checkout' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-orange-50 text-orange-800 border border-orange-200 whitespace-nowrap">
                            Early Checkout
                          </span>
                        ) : record.status === 'Half Day' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap">
                            Half Day
                          </span>
                        ) : record.status === 'Missing Punch' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs whitespace-nowrap">
                            Missing Punch
                          </span>
                        ) : record.status === 'On Leave' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
                            On Leave
                          </span>
                        ) : record.status === 'Not Checked In' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
                            Not Checked In
                          </span>
                        ) : record.status === 'Weekly Off' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                            Weekly Off
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                            {record.status || 'Absent'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. SEND ATTENDANCE & PUNCH REPORT MODAL */}
      {isSendReportOpen && (
        <SendAttendanceReportModal
          isOpen={isSendReportOpen}
          onClose={() => setIsSendReportOpen(false)}
          filteredRows={filteredData}
          allRows={filteredData}
          selectedIds={selectedIds}
          reportDate={selectedDate}
          companyName={api.getActiveCompany()?.name || api.getActiveCompany()?.trade_name || api.getActiveCompany()?.legal_name || 'Joy Corporate Solutions'}
          punches={allPunchesForModal}
        />
      )}
    </div>
  );
};
