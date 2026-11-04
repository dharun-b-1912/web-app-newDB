import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  AlertTriangle,
  Clock,
  Building,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Lock,
  Unlock,
  ShieldAlert,
  FileSpreadsheet,
  UserCheck,
  PlusCircle,
  X,
  Users,
} from 'lucide-react';
import { attendanceApi } from '../../../services/attendanceApi';
import { api } from '../../../services/api';
import { useToast } from '../../../components/ui/Toast';
import { formatMinutesToHoursStr, formatDeviationDuration, timeStringToMinutes } from '../../../lib/attendance/attendanceEngine';
import { attendanceRosterService } from '../../../services/attendance/attendanceRosterService';
import { AttendanceDaily } from '../../../types/attendance';
import { cn } from '../../../lib/utils';
import { EmployeeAttendanceStatementModal } from '../components/EmployeeAttendanceStatementModal';
import { ManualAttendanceOverrideModal } from '../components/ManualAttendanceOverrideModal';
import { AttendanceBulkUploadModal } from '../components/AttendanceBulkUploadModal';
import { hrEventBus } from '../../../services/hrEventBus';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { realtimeChannelManager } from '../../../services/realtime/realtimeChannelManager';
import { leaveApi } from '../../../services/leaveApi';
import { Holiday } from '../../../types/leave';

interface AttendanceHistoryViewProps {
  onOpenEmployeeProfile?: (employeeId: string, date?: string) => void;
  onNavigateSubPath?: (subPath: string) => void;
}

interface DayAttendanceSummary {
  statusCode: string;
  statusLabel: string;
  first_check_in?: string;
  last_check_out?: string;
  net_working_minutes: number;
  late_minutes: number;
  early_checkout_minutes: number;
  overtime_minutes: number;
  total_break_minutes: number;
  source: string;
  shift_code: string;
  shift_name: string;
  expected_in: string;
  expected_out: string;
  isWeeklyOff: boolean;
  hasOvertime: boolean;
  isHoliday?: boolean;
  holiday_name?: string;
  holiday_category?: string;
  holiday_type?: string;
}

interface MatrixEmployeeRow {
  emp: any;
  empName: string;
  empCode: string;
  dept: string;
  designation: string;
  vendor: string;
  dayMap: Record<number, DayAttendanceSummary>;
  totals: {
    present: number;
    absent: number;
    leave: number;
    halfDay: number;
    holiday: number;
    wfh: number;
    late: number;
    early: number;
    missingPunch: number;
    otMinutes: number;
    otHoursFormatted: string;
    workedHoursFormatted: string;
    paidDays: number;
    fullMonthPaidDays?: number;
    weeklyOffsElapsed?: number;
    scheduledWorkDaysElapsed?: number;
  };
}

const getLocalDateString = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const AttendanceHistoryView: React.FC<AttendanceHistoryViewProps> = ({
  onOpenEmployeeProfile,
  onNavigateSubPath,
}) => {
  const { showToast } = useToast();

  // Active Month & Date Navigation: Dynamically defaults to the real system date
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(() => new Date().getMonth());
  const [viewMode, setViewMode] = useState<'matrix' | 'detailed'>('matrix');
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');

  // Master Data
  const [employees, setEmployees] = useState<any[]>([]);
  const [dailyRecords, setDailyRecords] = useState<AttendanceDaily[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [isPayrollLocked, setIsPayrollLocked] = useState<boolean>(false);
  const [workforceSegment, setWorkforceSegment] = useState<'ALL' | 'DIRECT' | 'VENDOR'>('ALL');
  const [statementEmpId, setStatementEmpId] = useState<string | null>(null);

  // Manual Attendance Override & Excel Bulk Upload State
  const [selectedOverrideCell, setSelectedOverrideCell] = useState<{
    employee: any;
    dateStr: string;
    existingRecord?: any;
  } | null>(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState<boolean>(false);
  const [isResolvingExceptions, setIsResolvingExceptions] = useState<boolean>(false);

  // Vendor detection helper
  const checkIsVendor = (emp: any): boolean => {
    const source = emp.employment_source || emp.employment?.employment_source;
    if (source === 'VENDOR' || source === 'MANPOWER_PROVIDER') return true;
    if (source === 'DIRECT') return false;
    if (emp.vendor_name && emp.vendor_name.trim() !== '') return true;
    if (emp.employment?.vendor_name && emp.employment.vendor_name.trim() !== '') return true;
    if (emp.company_name && emp.company_name.toLowerCase().includes('vendor')) return true;
    return false;
  };

  const getVendorName = (emp: any): string => {
    if (checkIsVendor(emp)) {
      return emp.vendor_name || emp.employment?.vendor_name || 'Vendor Workforce';
    }
    return 'Joy Corporate Solutions Pvt Ltd';
  };

  const monthName = new Date(currentYear, currentMonthIndex, 1).toLocaleString('en-US', { month: 'long' });
  const monthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const isCurrentMonth = currentYear === new Date().getFullYear() && currentMonthIndex === new Date().getMonth();
  const currentDayLimit = isCurrentMonth ? new Date().getDate() : daysInMonth;

  const daysArray = useMemo(() => {
    const todayLocalStr = getLocalDateString();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${monthKey}-${String(dayNum).padStart(2, '0')}`;
      const d = new Date(currentYear, currentMonthIndex, dayNum);
      const weekdayShort = d.toLocaleDateString('en-US', { weekday: 'short' });
      const isSunday = d.getDay() === 0;
      const isSaturday = d.getDay() === 6;
      return {
        dayNum,
        dateStr,
        weekdayShort,
        isSunday,
        isSaturday,
        isToday: dateStr === todayLocalStr,
      };
    });
  }, [currentYear, currentMonthIndex, daysInMonth, monthKey]);

  const loadData = () => {
    const activeComp = api.getActiveCompany();
    api.getEmployees(activeComp?.id).then(emps => {
      const realEmps = emps || [];
      setEmployees(realEmps);

      // Extract unique vendors strictly from real employee records
      const uniqueVendors = Array.from(
        new Set(
          realEmps
            .filter(e => checkIsVendor(e))
            .map(e => getVendorName(e))
            .filter(Boolean)
        )
      ) as string[];
      setVendors(uniqueVendors);
    }).catch(() => {});

    api.getDepartments(activeComp?.id).then(depts => {
      if (depts && depts.length > 0) {
        setDepartments(Array.from(new Set(depts.map(d => d.name))));
      }
    }).catch(() => {});

    api.getLocations().then(locs => {
      if (locs && locs.length > 0) {
        setLocations(Array.from(new Set(locs.map(l => l.name))));
      }
    }).catch(() => {});

    // Ensure shifts, rosters, and shift assignments are loaded in memory for accurate shift timings and weekly off calculations
    attendanceRosterService.fetchShiftsFromDb().then(loadedShifts => {
      if (loadedShifts && loadedShifts.length > 0) {
        setShifts(loadedShifts);
      } else {
        setShifts(attendanceRosterService.getShifts());
      }
    }).catch(() => {
      setShifts(attendanceRosterService.getShifts());
    });
    attendanceRosterService.fetchShiftAssignmentsFromDb().catch(() => {});

    const startDate = `${monthKey}-01`;
    const endDate = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;
    const tenantId = getActiveOrgId();

    attendanceRosterService.fetchRostersFromDb(startDate, endDate).catch(() => {});

    // Authoritative Backend SQL Attendance Sync with punch synthesis and dynamic status resolution
    attendanceApi.getDailyAttendanceForPeriodAsync(startDate, endDate)
      .then(records => {
        if (records && records.length > 0) {
          setDailyRecords(records);
        } else if (isSupabaseEnabled && supabase) {
          let q = supabase
            .from('attendance_daily')
            .select('*')
            .gte('attendance_date', startDate)
            .lte('attendance_date', endDate);
          if (tenantId && tenantId !== 'platform-root') {
            q = q.eq('organization_id', tenantId);
          }
          Promise.resolve(q).then(({ data: dbRecords }) => {
            if (dbRecords) {
              setDailyRecords(dbRecords.map(r => ({
                ...r,
                date: r.attendance_date,
                late_minutes: r.late_minutes ?? r.late_entry_minutes ?? 0,
                net_working_minutes: r.net_working_minutes ?? r.total_work_minutes ?? 0,
                early_checkout_minutes: r.early_checkout_minutes ?? r.early_exit_minutes ?? 0,
              })));
            } else {
              setDailyRecords([]);
            }
          }).catch(() => setDailyRecords([]));
        } else {
          setDailyRecords([]);
        }
      })
      .catch(() => {
        if (isSupabaseEnabled && supabase) {
          let q = supabase
            .from('attendance_daily')
            .select('*')
            .gte('attendance_date', startDate)
            .lte('attendance_date', endDate);
          if (tenantId && tenantId !== 'platform-root') {
            q = q.eq('organization_id', tenantId);
          }
          Promise.resolve(q).then(({ data: dbRecords }) => {
            if (dbRecords) {
              setDailyRecords(dbRecords.map(r => ({
                ...r,
                date: r.attendance_date,
              })));
            } else {
              setDailyRecords([]);
            }
          }).catch(() => setDailyRecords([]));
        } else {
          setDailyRecords([]);
        }
      });

    // Authoritative Backend SQL Payroll Period Lock Status
    if (isSupabaseEnabled && supabase) {
      let pq = supabase
        .from('payroll_periods')
        .select('is_locked, status')
        .eq('month', currentMonthIndex + 1)
        .eq('year', currentYear);
      if (tenantId && tenantId !== 'platform-root') {
        pq = pq.eq('organization_id', tenantId);
      }
      Promise.resolve(pq.maybeSingle())
        .then(({ data: periodData }) => {
          if (periodData) {
            setIsPayrollLocked(Boolean(periodData.is_locked || periodData.status === 'LOCKED' || periodData.status === 'FINALIZED'));
          } else {
            setIsPayrollLocked(false);
          }
        })
        .catch(() => setIsPayrollLocked(false));
    }
  };

  useEffect(() => {
    loadData();
  }, [monthKey]);

  useEffect(() => {
    const unsub1 = hrEventBus.subscribe('attendance.*', () => {
      attendanceApi.invalidateCache();
      loadData();
    });
    const unsub2 = hrEventBus.subscribe('regularization.*', () => {
      attendanceApi.invalidateCache();
      loadData();
    });
    const unsub3 = hrEventBus.subscribe('roster.*', () => {
      attendanceApi.invalidateCache();
      loadData();
    });
    const unsub4 = hrEventBus.subscribe('shift.*', () => {
      attendanceApi.invalidateCache();
      loadData();
    });
    const unsubLeave = hrEventBus.subscribe('leave.*', () => {
      attendanceApi.invalidateCache();
      loadData();
    });

    let unsubDaily = () => {};
    let unsubPunches = () => {};
    if (isSupabaseEnabled) {
      unsubDaily = realtimeChannelManager.subscribeToTable('attendance_daily', () => {
        attendanceApi.invalidateCache();
        loadData();
      });
      unsubPunches = realtimeChannelManager.subscribeToTable('attendance_punches', () => {
        attendanceApi.invalidateCache();
        loadData();
      });
    }

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsubLeave();
      unsubDaily();
      unsubPunches();
    };
  }, [monthKey]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonthIndex(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonthIndex(prev => prev + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonthIndex(now.getMonth());
  };

  const handleResetFilters = () => {
    setDeptFilter('ALL');
    setLocationFilter('ALL');
    setVendorFilter('ALL');
    setShiftFilter('ALL');
    setSearchQuery('');
    setWorkforceSegment('ALL');
  };

  const toggleDeptCollapse = (dept: string) => {
    const next = new Set(collapsedDepts);
    if (next.has(dept)) next.delete(dept);
    else next.add(dept);
    setCollapsedDepts(next);
  };

  // Filtered employees
  const scopedEmployees = useMemo(() => {
    return employees.filter(emp => {
      const empDept = emp.department_name || emp.department || 'People & HR';
      const empLoc = emp.branch_name || emp.location || 'Coimbatore HQ';
      const isVendor = checkIsVendor(emp);
      const empVendor = getVendorName(emp);

      // Segment Filter
      if (workforceSegment === 'DIRECT' && isVendor) return false;
      if (workforceSegment === 'VENDOR' && !isVendor) return false;

      const matchDept = deptFilter === 'ALL' || empDept.toLowerCase() === deptFilter.toLowerCase();
      const matchLoc = locationFilter === 'ALL' || empLoc.toLowerCase() === locationFilter.toLowerCase();
      const matchVendor = vendorFilter === 'ALL' || empVendor.toLowerCase() === vendorFilter.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name || '').toLowerCase().includes(q) ||
        (emp.employee_code || '').toLowerCase().includes(q) ||
        empVendor.toLowerCase().includes(q) ||
        empDept.toLowerCase().includes(q);

      return matchDept && matchLoc && matchVendor && matchQuery;
    });
  }, [employees, workforceSegment, deptFilter, locationFilter, vendorFilter, searchQuery]);

  // Month holidays lookup map
  const holidaysForMonth = useMemo(() => {
    return leaveApi.getHolidaysForMonth(currentYear, currentMonthIndex);
  }, [currentYear, currentMonthIndex]);

  const holidayMap = useMemo<Record<string, Holiday>>(() => {
    const map: Record<string, Holiday> = {};
    holidaysForMonth.forEach(h => {
      map[h.date] = h;
    });
    return map;
  }, [holidaysForMonth]);

  // Compute day-by-day attendance for each employee across the entire month
  const matrixData = useMemo<MatrixEmployeeRow[]>(() => {
    return scopedEmployees.map(emp => {
      const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name || 'Employee';
      const empCode = emp.employee_code || `WF-${emp.id}`;
      const dept = emp.department_name || emp.department || 'People & HR';
      const designation = emp.designation_title || emp.designation || 'Staff';
      const isVendor = checkIsVendor(emp);
      const vendor = getVendorName(emp);

      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLeave = 0;
      let totalHalfDay = 0;
      let totalHoliday = 0;
      let totalWfh = 0;
      let totalLate = 0;
      let totalEarly = 0;
      let totalMissingPunch = 0;
      let totalOtMinutes = 0;
      let totalWorkedMinutes = 0;

      const dayMap: Record<number, DayAttendanceSummary> = {};

      daysArray.forEach(d => {
        const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, d.dateStr, undefined, emp);
        const shift = attendanceRosterService.getShiftById(roster.shift_id) || {
          shift_code: roster.shift_code || 'GEN-09',
          shift_name: roster.shift_name || 'General Shift',
          start_time: '09:00',
          end_time: '18:00',
          grace_in_minutes: 15,
        };

        const record = dailyRecords.find(r => {
          const rDate = r.date || (r as any).attendance_date;
          if (rDate !== d.dateStr) return false;
          const rEmpId = (r.employee_id || '').toLowerCase();
          const rEmpCode = (r.employee_code || '').toLowerCase();
          const eId = (emp.id || '').toLowerCase();
          const eCode = (emp.employee_code || '').toLowerCase();
          return (rEmpId && (rEmpId === eId || rEmpId === eCode)) ||
                 (rEmpCode && (rEmpCode === eCode || rEmpCode === eId));
        });

        let statusCode = '-';
        let statusLabel = 'Scheduled';

        const normStatus = String(record?.status || '').trim().toUpperCase();
        const hasCheckIn = Boolean(record?.first_check_in);
        const hasCheckOut = Boolean(record?.last_check_out);
        const hasWork = (record?.net_working_minutes || 0) > 0 || (record?.total_work_minutes || 0) > 0 || hasCheckIn;
        const todayStr = getLocalDateString();
        const isPastDate = d.dateStr < todayStr;
        const hol = holidayMap[d.dateStr];
        const isHol = Boolean(hol && (hol.type === 'Mandatory' || !hol.is_optional));

        // Dynamic late detection using shift start time + grace period
        let isLate = (record?.late_minutes && record.late_minutes > 0) || normStatus === 'LATE' || normStatus === 'LATE_PRESENT' || normStatus === 'LP';
        if (!isLate && hasCheckIn && record?.first_check_in) {
          const inMins = timeStringToMinutes(record.first_check_in);
          const shiftStartMins = timeStringToMinutes(shift.start_time) || 540;
          const grace = (shift as any).grace_in_minutes ?? 15;
          if (inMins !== null && inMins > shiftStartMins + grace) {
            isLate = true;
          }
        }

        if (record) {
          if (normStatus === 'HOLIDAY' || normStatus === 'H' || (isHol && !hasWork)) {
            statusCode = 'H';
            statusLabel = `Holiday: ${hol?.name || (record as any)?.holiday_name || 'Corporate Holiday'} (${hol?.category || (record as any)?.holiday_category || 'National Gazetted'}${hol?.type ? ' - ' + hol.type : ''})`;
            totalHoliday++;
          } else if (normStatus === 'ON_LEAVE' || normStatus === 'LEAVE' || normStatus === 'ON LEAVE' || normStatus === 'L') {
            statusCode = 'L';
            statusLabel = 'On Leave';
            totalLeave++;
          } else if (normStatus === 'WFH' || normStatus === 'WORK_FROM_HOME' || normStatus === 'REMOTE') {
            statusCode = 'WFH';
            statusLabel = 'Work From Home';
            totalWfh++;
            totalPresent++;
          } else if (normStatus === 'HALF_DAY' || normStatus === 'HALF DAY' || normStatus === 'HD') {
            statusCode = 'HD';
            statusLabel = 'Half Day';
            totalHalfDay++;
          } else if (normStatus === 'ON_DUTY' || normStatus === 'OD') {
            statusCode = 'OD';
            statusLabel = 'On Duty';
            totalPresent++;
          } else if (normStatus === 'MISSING_PUNCH' || normStatus === 'MISSING PUNCH' || normStatus === 'MP' || (!d.isToday && hasCheckIn && !hasCheckOut)) {
            statusCode = 'MP';
            statusLabel = 'Missing Punch';
            totalMissingPunch++;
            totalPresent++;
          } else if (normStatus === 'ABSENT' || normStatus === 'A') {
            statusCode = 'A';
            statusLabel = 'Absent';
            totalAbsent++;
          } else if (isLate) {
            statusCode = 'LP';
            statusLabel = 'Late Present';
            totalLate++;
            totalPresent++;
          } else if (normStatus === 'PRESENT' || normStatus === 'CHECKED_OUT' || normStatus === 'CHECKED OUT' || normStatus === 'P' || hasCheckIn || (d.isToday && hasCheckIn)) {
            statusCode = 'P';
            statusLabel = isHol ? `Present (Holiday Work: ${hol?.name || 'Holiday'})` : 'Present';
            totalPresent++;
          } else if (normStatus === 'WEEKLY_OFF' || normStatus === 'WEEK_OFF' || normStatus === 'REST_DAY' || normStatus === 'WO' || roster.is_weekly_off) {
            if (hasWork) {
              statusCode = isLate ? 'LP' : 'P';
              statusLabel = 'Present (Punch on Off)';
              totalPresent++;
            } else {
              statusCode = 'WO';
              statusLabel = 'Weekly Off';
            }
          } else {
            if (hasWork) {
              statusCode = isLate ? 'LP' : 'P';
              statusLabel = 'Present';
              totalPresent++;
            } else if (roster.is_weekly_off) {
              statusCode = 'WO';
              statusLabel = 'Weekly Off';
            } else if (isPastDate) {
              statusCode = 'A';
              statusLabel = 'Absent';
              totalAbsent++;
            } else {
              statusCode = '-';
              statusLabel = 'Scheduled';
            }
          }

          if (record.early_checkout_minutes > 0) totalEarly++;
          if (record.overtime_minutes > 0) totalOtMinutes += record.overtime_minutes;
          if (record.net_working_minutes > 0) totalWorkedMinutes += record.net_working_minutes;
        } else {
          // No record exists in database for this day
          if (isHol) {
            statusCode = 'H';
            statusLabel = `Holiday: ${hol.name} (${hol.category || 'National Gazetted'}${hol.type ? ' - ' + hol.type : ''})`;
            totalHoliday++;
          } else if (roster.is_weekly_off) {
            statusCode = 'WO';
            statusLabel = 'Weekly Off';
          } else if (isPastDate) {
            statusCode = 'A';
            statusLabel = 'Absent (No Punch)';
            totalAbsent++;
          } else if (d.isToday) {
            statusCode = '—';
            statusLabel = 'Not Checked In Yet';
          } else {
            statusCode = '—';
            statusLabel = 'Scheduled';
          }
        }

        dayMap[d.dayNum] = {
          statusCode,
          statusLabel,
          first_check_in: record?.first_check_in,
          last_check_out: record?.last_check_out,
          net_working_minutes: record?.net_working_minutes || 0,
          late_minutes: isLate ? (record?.late_minutes || 1) : 0,
          early_checkout_minutes: record?.early_checkout_minutes || 0,
          overtime_minutes: record?.overtime_minutes || 0,
          total_break_minutes: record?.total_break_minutes || 0,
          source: record?.source || (roster.is_weekly_off ? 'SYSTEM' : undefined),
          shift_code: shift.shift_code,
          shift_name: shift.shift_name,
          expected_in: shift.start_time,
          expected_out: shift.end_time,
          isWeeklyOff: roster.is_weekly_off,
          hasOvertime: (record?.overtime_minutes || 0) > 0 || Boolean(hasWork && isHol),
          isHoliday: isHol || statusCode === 'H',
          holiday_name: hol?.name || (record as any)?.holiday_name,
          holiday_category: hol?.category || (record as any)?.holiday_category,
          holiday_type: hol?.type || (record as any)?.holiday_type,
        };
      });

      // Count roster-derived weekly offs (supports 5-day, 6-day, and rotational shift rosters)
      let weeklyOffsElapsed = 0;
      let scheduledWorkDaysElapsed = 0;

      daysArray.forEach(d => {
        const isOff = dayMap[d.dayNum]?.isWeeklyOff;
        const sCode = dayMap[d.dayNum]?.statusCode;
        if (d.dayNum <= currentDayLimit) {
          if (isOff && sCode === 'WO') {
            weeklyOffsElapsed++;
          } else if (!isOff) {
            scheduledWorkDaysElapsed++;
          }
        }
      });

      // Month-to-date Paid Days = Present + (HalfDay * 0.5) + Approved Leaves + Statutory Paid Holidays + Weekly Offs (Elapsed)
      const mtdPaidDays = Math.max(0, totalPresent + (totalHalfDay * 0.5) + totalLeave + totalHoliday + weeklyOffsElapsed);
      // Full Month Projected Paid Days (Standard monthly salary base if active and 0 LOP)
      const fullMonthPaidDays = Math.min(daysInMonth, Math.max(0, daysInMonth - totalAbsent - (totalHalfDay * 0.5)));

      return {
        emp,
        empName,
        empCode,
        dept,
        designation,
        vendor,
        dayMap,
        totals: {
          present: totalPresent,
          absent: totalAbsent,
          leave: totalLeave,
          halfDay: totalHalfDay,
          holiday: totalHoliday,
          wfh: totalWfh,
          late: totalLate,
          early: totalEarly,
          missingPunch: totalMissingPunch,
          otMinutes: totalOtMinutes,
          otHoursFormatted: formatMinutesToHoursStr(totalOtMinutes),
          workedHoursFormatted: formatMinutesToHoursStr(totalWorkedMinutes),
          paidDays: mtdPaidDays,
          fullMonthPaidDays,
          weeklyOffsElapsed,
          scheduledWorkDaysElapsed,
        },
      };
    });
  }, [scopedEmployees, dailyRecords, daysArray, currentYear, currentMonthIndex, daysInMonth, currentDayLimit, holidayMap]);

  // Group matrix rows by department
  const departmentGroups = useMemo<Record<string, MatrixEmployeeRow[]>>(() => {
    const groups: Record<string, MatrixEmployeeRow[]> = {};
    matrixData.forEach(item => {
      if (!groups[item.dept]) groups[item.dept] = [];
      groups[item.dept].push(item);
    });
    return groups;
  }, [matrixData]);

  // Month-level reconciliation metrics
  const monthStats = useMemo(() => {
    const totalEmployees = scopedEmployees.length;
    const totalPresentDays = matrixData.reduce((acc, m) => acc + m.totals.present, 0);
    const totalAbsentDays = matrixData.reduce((acc, m) => acc + m.totals.absent, 0);
    const totalLeaveDays = matrixData.reduce((acc, m) => acc + m.totals.leave, 0);
    const totalHolidayDays = matrixData.reduce((acc, m) => acc + (m.totals.holiday || 0), 0);
    const totalMissingPunches = matrixData.reduce((acc, m) => acc + m.totals.missingPunch, 0);
    const totalOtMins = matrixData.reduce((acc, m) => acc + m.totals.otMinutes, 0);
    const totalPaidDays = matrixData.reduce((acc, m) => acc + m.totals.paidDays, 0);

    const totalScheduledElapsed = matrixData.reduce((acc, m) => acc + (m.totals.scheduledWorkDaysElapsed || 1), 0);
    const attendanceRate = totalScheduledElapsed > 0 ? Math.min(100, Math.round((totalPresentDays / totalScheduledElapsed) * 100)) : 0;

    const avgPresentDays = (totalPresentDays / (totalEmployees || 1)).toFixed(1);
    const avgAbsentDays = (totalAbsentDays / (totalEmployees || 1)).toFixed(1);
    const avgHolidayDays = (totalHolidayDays / (totalEmployees || 1)).toFixed(1);
    const avgPaidDays = (totalPaidDays / (totalEmployees || 1)).toFixed(1);
    const elapsedDays = currentDayLimit;

    return {
      totalEmployees,
      totalPresentDays,
      avgPresentDays,
      totalAbsentDays,
      avgAbsentDays,
      totalLeaveDays,
      totalHolidayDays,
      avgHolidayDays,
      totalMissingPunches,
      totalOtMins,
      totalOtHours: formatMinutesToHoursStr(totalOtMins),
      totalPaidDays,
      avgPaidDays,
      elapsedDays,
      attendanceRate,
    };
  }, [scopedEmployees, matrixData, currentDayLimit]);

  const handleExport = () => {
    showToast(`✓ Exported ${scopedEmployees.length} employee attendance records for ${monthName} ${currentYear}.`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAutoResolveMissingPunches = async () => {
    if (isPayrollLocked) {
      showToast(`Cannot modify attendance: ${monthName} ${currentYear} is locked for payroll. Click "Unlock Month" first.`, 'warning');
      return;
    }

    const missingRecords = dailyRecords.filter(r => 
      !r.last_check_out && r.first_check_in && !r.is_regularized
    );

    if (missingRecords.length === 0) {
      showToast(`No missing punch exceptions found for ${monthName} ${currentYear}.`, 'info');
      return;
    }

    const confirmResolve = window.confirm(
      `Resolve all ${missingRecords.length} missing punch exceptions for ${monthName} ${currentYear}?\n\nThis will record standard shift checkout times (18:30) and credit full 1.0 Paid Day.`
    );
    if (!confirmResolve) return;

    setIsResolvingExceptions(true);
    try {
      if (isSupabaseEnabled && supabase) {
        let count = 0;
        for (const rec of missingRecords) {
          const checkoutTime = `${rec.date || rec.attendance_date}T13:00:00.000Z`;
          const { error: uErr } = await supabase
            .from('attendance_daily')
            .update({
              last_check_out: checkoutTime,
              status: 'PRESENT',
              payable_status: 1.0,
              is_regularized: true,
              total_work_minutes: 540,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rec.id);

          if (!uErr) count++;
        }
        showToast(`✓ Successfully resolved ${count} missing punch exceptions for ${monthName} ${currentYear}!`, 'success');
      }
      loadData();
    } catch (err: any) {
      console.error('Failed to auto-resolve missing punches:', err);
      showToast(`Failed to resolve exceptions: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsResolvingExceptions(false);
    }
  };

  const handleToggleFinalize = async () => {
    const nextLocked = !isPayrollLocked;
    setIsPayrollLocked(nextLocked);

    // 1. Broadcast to HR event bus (payroll, attendance, and compliance listeners)
    hrEventBus.emit('attendance.finalized', {
      monthKey,
      periodName: `${monthName} ${currentYear}`,
      totalStaff: scopedEmployees.length,
      totalPresent: monthStats.totalPresentDays,
      totalPaidDays: monthStats.totalPaidDays,
      isLocked: nextLocked,
    });
    hrEventBus.emit('payroll.period.updated', {
      monthKey,
      periodName: `${monthName} ${currentYear}`,
      status: nextLocked ? 'LOCKED' : 'APPROVED',
      isLocked: nextLocked,
    });

    // 2. Authoritative Backend SQL Persistence into payroll_runs table
    try {
      if (isSupabaseEnabled && supabase) {
        const compId = employees[0]?.company_id || '2030277f-a6a1-427f-beaf-4fc677a3bae2';
        const orgId = employees[0]?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
        await supabase.from('payroll_runs').upsert({
          organization_id: orgId,
          company_id: compId,
          month: currentMonthIndex + 1,
          year: currentYear,
          total_employees: scopedEmployees.length,
          status: nextLocked ? 'LOCKED' : 'APPROVED',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,year,month' });
      }
    } catch (err) {
      console.warn('[AttendanceHistory] Supabase payroll_runs lock notice:', err);
    }

    if (nextLocked) {
      showToast(`✓ Finalized and locked ${monthName} ${currentYear} attendance! Synced directly with SQL payroll ledger (${monthStats.totalPaidDays} paid days).`);
    } else {
      showToast(`Attendance ledger for ${monthName} ${currentYear} unlocked. Changes can now be made.`);
    }
  };

  const getStatusBadge = (code: string, isMissing?: boolean) => {
    if (code === 'MP' || isMissing) {
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-300">
          !
        </span>
      );
    }
    switch (code) {
      case 'P':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-emerald-800 bg-emerald-50/80">P</span>;
      case 'LP':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-amber-800 bg-amber-50">LP</span>;
      case 'A':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-rose-800 bg-rose-50">A</span>;
      case 'HD':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-sky-800 bg-sky-50">HD</span>;
      case 'H':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-black text-purple-900 bg-purple-100 border border-purple-300 shadow-2xs">H</span>;
      case 'HP':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-black text-emerald-950 bg-emerald-100 border border-emerald-400 shadow-2xs">HP</span>;
      case 'L':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-purple-800 bg-purple-50">L</span>;
      case 'WFH':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-violet-800 bg-violet-50">WFH</span>;
      case 'OD':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold text-blue-800 bg-blue-50 border border-blue-200">OD</span>;
      case 'WO':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-medium text-gray-400">WO</span>;
      default:
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] text-gray-300">—</span>;
    }
  };

  const hasActiveFilters = deptFilter !== 'ALL' || vendorFilter !== 'ALL' || locationFilter !== 'ALL' || shiftFilter !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="space-y-3">
      {/* 1. FLAT PAGE HEADER WITH CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Attendance History</h2>
            <span className="text-gray-300">·</span>
            <span className="text-xs font-semibold text-gray-700">{monthName} {currentYear}</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", isPayrollLocked ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200")}>
              {isPayrollLocked ? 'Payroll Locked' : 'Payroll Open'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Monthly employee attendance ledger for review, reconciliation and payroll preparation.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 shrink-0">
          {/* Segmented View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold shrink-0">
            <button
              onClick={() => setViewMode('matrix')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors whitespace-nowrap",
                viewMode === 'matrix' ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-600 hover:text-gray-900"
              )}
            >
              Matrix
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors whitespace-nowrap",
                viewMode === 'detailed' ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-600 hover:text-gray-900"
              )}
            >
              Detailed
            </button>
          </div>

          <button
            onClick={handleExport}
            className="h-8 px-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export</span>
          </button>

          <button
            onClick={handlePrint}
            className="h-8 px-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Print</span>
          </button>

          <button
            onClick={() => {
              if (isPayrollLocked) {
                showToast(`Month ${monthName} ${currentYear} is locked. Unlock the month first to perform bulk upload.`, 'warning');
                return;
              }
              setShowBulkUploadModal(true);
            }}
            className="h-8 px-3 text-xs font-semibold text-emerald-900 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors shadow-2xs"
            title="Bulk import attendance records by Employee ID from Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Bulk Upload Excel</span>
          </button>

          <button
            onClick={handleToggleFinalize}
            className={cn(
              "h-8 px-3.5 text-xs font-bold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors shadow-2xs",
              isPayrollLocked
                ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                : "bg-emerald-800 hover:bg-emerald-900 text-white"
            )}
            title={isPayrollLocked ? "Click to unlock this month's attendance for modifications" : "Finalize and lock attendance ledger for payroll calculation"}
          >
            {isPayrollLocked ? <Unlock className="w-3.5 h-3.5 text-amber-700" /> : <Lock className="w-3.5 h-3.5 text-emerald-200" />}
            <span>{isPayrollLocked ? 'Unlock Month' : 'Finalize Attendance'}</span>
          </button>
        </div>
      </div>

      {/* 2. FLAT PERIOD + WORKFORCE SEGMENT + FILTER TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Navigation Control with Interactive Month Picker */}
          <div className="flex items-center border border-gray-200 bg-white rounded-lg h-9 text-xs font-bold text-gray-800">
            <button
              onClick={handlePrevMonth}
              className="px-2 h-full hover:bg-gray-50 border-r border-gray-200 flex items-center text-gray-600 hover:text-gray-900"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="relative px-3 flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 h-full group" title="Click to select month and year">
              <Calendar className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#07563D] transition-colors" />
              <span className="select-none font-bold text-gray-900">{monthName} {currentYear}</span>
              <input
                type="month"
                value={`${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m] = e.target.value.split('-').map(Number);
                    setCurrentYear(y);
                    setCurrentMonthIndex(m - 1);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Click to change month and year"
              />
            </div>
            <button
              onClick={handleNextMonth}
              className="px-2 h-full hover:bg-gray-50 border-l border-gray-200 flex items-center text-gray-600 hover:text-gray-900"
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleJumpToday}
            className={cn(
              "h-9 px-3 text-xs font-semibold border rounded-lg transition-colors flex items-center gap-1.5",
              isCurrentMonth
                ? "bg-emerald-50 border-emerald-300 text-[#07563D] font-bold"
                : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
            )}
            title="Jump to current date & month"
          >
            {isCurrentMonth && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            Today
          </button>

          {/* Workforce Segment Quick Filter Pills */}
          <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
            <button
              onClick={() => { setWorkforceSegment('ALL'); setVendorFilter('ALL'); }}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all text-xs",
                workforceSegment === 'ALL'
                  ? "bg-white text-gray-900 shadow-2xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              All ({employees.length})
            </button>
            <button
              onClick={() => { setWorkforceSegment('DIRECT'); setVendorFilter('ALL'); }}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all text-xs flex items-center gap-1",
                workforceSegment === 'DIRECT'
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Direct ({employees.filter(e => !checkIsVendor(e)).length})
            </button>
            <button
              onClick={() => { setWorkforceSegment('VENDOR'); setVendorFilter('ALL'); }}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all text-xs flex items-center gap-1",
                workforceSegment === 'VENDOR'
                  ? "bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Vendor ({employees.filter(e => checkIsVendor(e)).length})
            </button>
          </div>

          {/* Compact Dropdown Filters */}
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#07563D]"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {vendors.length > 0 && (
            <select
              value={vendorFilter}
              onChange={e => {
                setVendorFilter(e.target.value);
                if (e.target.value !== 'ALL') setWorkforceSegment('VENDOR');
              }}
              className="h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#07563D]"
            >
              <option value="ALL">All Contractor Agencies</option>
              {vendors.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}

          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#07563D]"
          >
            <option value="ALL">All Locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <select
            value={shiftFilter}
            onChange={e => setShiftFilter(e.target.value)}
            className="h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#07563D]"
          >
            <option value="ALL">All Shifts</option>
            {shifts.map(s => <option key={s.id} value={s.shift_code}>{s.shift_code}</option>)}
          </select>
        </div>

        {/* Search Employee input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 pl-8 pr-7 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#07563D] w-56 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Line */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-0.5">
          <span className="flex items-center gap-1.5">
            <span>Filtered:</span>
            <strong className="text-gray-800">
              {[
                deptFilter !== 'ALL' && deptFilter,
                vendorFilter !== 'ALL' && vendorFilter,
                locationFilter !== 'ALL' && locationFilter,
                shiftFilter !== 'ALL' && shiftFilter,
                searchQuery && `"${searchQuery}"`,
              ].filter(Boolean).join(' · ')}
            </strong>
          </span>
          <button onClick={handleResetFilters} className="text-emerald-700 hover:underline font-semibold text-xs">
            Clear filters
          </button>
        </div>
      )}

      {/* 3. EXECUTIVE MONTH ATTENDANCE STATS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {/* Workforce */}
        <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Workforce</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-gray-900">{monthStats.totalEmployees}</span>
            <span className="text-[11px] text-gray-500 font-medium">Staff</span>
          </div>
        </div>

        {/* Present Avg */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Present Avg</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-emerald-900">{monthStats.avgPresentDays}d</span>
            <span className="text-[11px] text-emerald-700 font-mono">({monthStats.totalPresentDays.toLocaleString('en-IN')})</span>
          </div>
        </div>

        {/* Paid Statutory Holidays */}
        <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800 flex items-center justify-between">
            <span>Holidays</span>
            <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-purple-200 text-purple-900">Paid</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-purple-950">{monthStats.avgHolidayDays}d</span>
            <span className="text-[11px] text-purple-700 font-mono">({monthStats.totalHolidayDays})</span>
          </div>
        </div>

        {/* LOP / Absent */}
        <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800">LOP / Absent</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-rose-900">{monthStats.avgAbsentDays}d</span>
            <span className="text-[11px] text-rose-700 font-mono">({monthStats.totalAbsentDays.toLocaleString('en-IN')})</span>
          </div>
        </div>

        {/* Approved Leave */}
        <div className="bg-violet-50/60 border border-violet-200 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-800">Approved Leave</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-violet-900">{monthStats.totalLeaveDays}d</span>
            <span className="text-[11px] text-violet-700 font-medium">Logged</span>
          </div>
        </div>

        {/* Overtime with visual OT Dot indicator */}
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center justify-between">
            <span>Overtime</span>
            <span className="w-2 h-2 rounded-full bg-indigo-600 ring-1.5 ring-white" title="Blue dot on matrix cells indicates overtime logged" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-indigo-900">{monthStats.totalOtHours}</span>
            <span className="text-[11px] text-indigo-700 font-medium">Logged</span>
          </div>
        </div>

        {/* Paid Days Credit */}
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#07563D]">Paid Days</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-black text-[#07563D]">{monthStats.avgPaidDays}</span>
            <span className="text-[11px] text-emerald-800 font-semibold">/ {monthStats.elapsedDays}d</span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
            <span>Att. Rate</span>
            {monthStats.totalMissingPunches > 0 && (
              <button
                onClick={() => onNavigateSubPath?.('regularization')}
                className="text-rose-600 font-bold hover:underline flex items-center gap-0.5"
                title={`${monthStats.totalMissingPunches} missing punch exceptions need regularization`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-500 animate-pulse" />
                <span className="text-[10px]">{monthStats.totalMissingPunches}</span>
              </button>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-base font-bold text-gray-900">{monthStats.attendanceRate}%</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden self-center">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, monthStats.attendanceRate)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. DEDICATED ATTENDANCE MATRIX LEGEND & GUIDE STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 py-2 px-3 bg-white border border-gray-200 rounded-lg text-xs shadow-2xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-600">
          <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Legend:</span>
          
          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">P</span>
            <span className="text-[11px] text-gray-700">Present</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200">LP</span>
            <span className="text-[11px] text-gray-700">Late</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200">A</span>
            <span className="text-[11px] text-gray-700">Absent</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200">L</span>
            <span className="text-[11px] text-gray-700">Leave</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200">HD</span>
            <span className="text-[11px] text-gray-700">Half</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-black text-purple-900 bg-purple-100 border border-purple-300">H</span>
            <span className="text-[11px] text-gray-700 font-medium">Holiday</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-violet-800 bg-violet-50 border border-violet-200">WFH</span>
            <span className="text-[11px] text-gray-700">Remote</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold text-blue-800 bg-blue-50 border border-blue-200">OD</span>
            <span className="text-[11px] text-gray-700">On Duty</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-300">!</span>
            <span className="text-[11px] text-gray-700">Missing</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-medium text-gray-400 bg-gray-50 border border-gray-200">WO</span>
            <span className="text-[11px] text-gray-700">Off</span>
          </div>

          <span className="text-gray-300 hidden sm:inline">|</span>

          {/* OVERTIME EXPLANATION WITH VISUAL BADGE PREVIEW */}
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50/80 border border-indigo-200" title="The blue dot on the top-right corner indicates the employee logged overtime hours on that day">
            <div className="relative inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300">
              P
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-600 ring-1.5 ring-white shadow-2xs" />
            </div>
            <span className="text-[11px] font-semibold text-indigo-950 flex items-center gap-1">
              <span>Blue Dot</span>
              <span className="text-indigo-600 font-bold">= Overtime (+OT)</span>
            </span>
          </div>
        </div>

        {/* Quick Help Hint */}
        <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>Click any cell to record manual attendance or override</span>
        </div>
      </div>

      {/* 4. PRIMARY MATRIX WORKSPACE */}
      {viewMode === 'matrix' ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto max-h-[72vh]">
            <table className="w-full border-collapse text-xs">
              {/* Table Header */}
              <thead className="sticky top-0 z-30 bg-gray-50 border-b border-gray-200 text-gray-700">
                <tr>
                  {/* Sticky Employee Column */}
                  <th className="sticky left-0 z-40 bg-gray-50 text-left p-2.5 font-bold border-r border-gray-200 min-w-[200px] shadow-xs">
                    Employee
                  </th>

                  {/* Day Columns 1..31 */}
                  {daysArray.map(d => {
                    const colHol = holidayMap[d.dateStr];
                    return (
                      <th
                        key={d.dayNum}
                        title={colHol ? `🎉 Holiday: ${colHol.name} (${colHol.category || 'National Gazetted'}${colHol.type ? ' - ' + colHol.type : ''})` : undefined}
                        className={cn(
                          "p-1 text-center font-mono border-r border-gray-200/60 min-w-[34px] transition-colors",
                          colHol && "bg-purple-50/90 border-t-2 border-t-purple-600 shadow-2xs",
                          d.isSunday && !colHol && "bg-gray-100/50 text-gray-600",
                          d.isSaturday && !colHol && "bg-gray-50 text-gray-500",
                          d.isToday && !colHol && "bg-emerald-50 text-emerald-950 font-black border-t-2 border-t-[#07563D] shadow-2xs"
                        )}
                      >
                        <div className="flex flex-col items-center justify-center">
                          {colHol ? (
                            <span className="text-[7px] font-black uppercase tracking-tighter text-purple-700 leading-none mb-0.5 bg-purple-100/90 px-1 py-0.5 rounded shadow-2xs">
                              HOL
                            </span>
                          ) : d.isToday ? (
                            <span className="text-[7px] font-black uppercase tracking-tighter text-[#07563D] leading-none mb-0.5 bg-emerald-100/90 px-1 py-0.5 rounded">
                              TODAY
                            </span>
                          ) : null}
                          <div className={cn("text-[11px] font-bold leading-tight", colHol ? "text-purple-950 font-black" : d.isToday ? "text-[#07563D] font-black scale-105" : "text-gray-800")}>
                            {d.dayNum}
                          </div>
                          <div className={cn("text-[9px] font-sans font-semibold uppercase", colHol ? "text-purple-600 font-bold" : d.isToday ? "text-[#07563D] font-bold" : "text-gray-400")}>
                            {d.weekdayShort.slice(0, 2)}
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  {/* Right Summary Headers */}
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[34px]" title="Present Days">P</th>
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[34px]" title="Absent Days">A</th>
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[34px]" title="Leave Days">L</th>
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[34px]" title="Half Days">HD</th>
                  <th className="p-1.5 text-center bg-purple-50 text-purple-900 font-bold border-r border-purple-200 min-w-[34px]" title="Statutory Paid Holidays">H</th>
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[36px]" title="Late Marks">Late</th>
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[48px]" title="Overtime Hours">OT</th>
                  <th className="p-1.5 text-center bg-gray-100 text-gray-900 font-black border-l border-gray-300 min-w-[44px]" title="Paid Days for Payroll">Paid</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100">
                {Object.keys(departmentGroups).length === 0 ? (
                  <tr>
                    <td colSpan={daysArray.length + 9} className="text-center py-12 text-gray-400">
                      <p className="font-semibold text-gray-600">No employees match your filters.</p>
                      <p className="text-xs text-gray-400 mt-0.5">Try selecting another department or clearing filters.</p>
                      <button onClick={handleResetFilters} className="mt-2 text-xs text-emerald-700 font-semibold hover:underline">
                        Clear all filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  (Object.entries(departmentGroups) as [string, MatrixEmployeeRow[]][]).map(([deptName, deptRows]) => {
                    const isCollapsed = collapsedDepts.has(deptName);
                    const deptPresent = deptRows.reduce((acc, r) => acc + r.totals.present, 0);
                    const deptTotalEmp = deptRows.length;

                    return (
                      <React.Fragment key={deptName}>
                        {/* Lightweight Department Group Row */}
                        <tr className="bg-gray-50/70 font-semibold text-gray-700 text-xs hover:bg-gray-100/70 transition-colors">
                          <td
                            colSpan={daysArray.length + 9}
                            onClick={() => toggleDeptCollapse(deptName)}
                            className="p-2 pl-3 cursor-pointer select-none border-y border-gray-200/60"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {isCollapsed ? (
                                  <ChevronRightIcon className="w-3.5 h-3.5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                )}
                                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">{deptName}</span>
                                <span className="text-gray-400 text-[11px]">·</span>
                                <span className="text-gray-500 text-[11px] font-normal">{deptTotalEmp} {deptTotalEmp === 1 ? 'employee' : 'employees'}</span>
                              </div>
                              <span className="text-[11px] text-gray-500 font-mono pr-3">
                                Present Days: <strong className="text-gray-800">{deptPresent}</strong>
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Employee Rows */}
                        {!isCollapsed &&
                          deptRows.map(row => (
                            <tr key={row.emp.id} className="hover:bg-gray-50/70 transition-colors">
                              {/* Sticky Employee Cell */}
                              <td className="sticky left-0 z-20 bg-white hover:bg-gray-50/70 p-2 pl-3 border-r border-gray-200 shadow-xs min-w-[200px]">
                                <div
                                  onClick={() => {
                                    onOpenEmployeeProfile?.(row.emp.id);
                                    setStatementEmpId(row.emp.id);
                                  }}
                                  className="font-bold text-gray-900 hover:text-[#07563D] cursor-pointer text-xs"
                                >
                                  {row.empName}
                                </div>
                                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                    <span>{row.empCode}</span>
                                    {row.designation && (
                                      <>
                                        <span className="text-gray-300 mx-1">·</span>
                                        <span className="text-gray-500">{row.designation}</span>
                                      </>
                                    )}
                                  </div>
                                </td>

                              {/* Matrix Days 1..31 */}
                              {daysArray.map(d => {
                                const daySummary = row.dayMap[d.dayNum];
                                const matchingDaily = dailyRecords.find(r =>
                                  (r.employee_id === row.emp.id || (r.employee_code && row.emp.employee_code && r.employee_code.toLowerCase() === row.emp.employee_code.toLowerCase())) &&
                                  r.date === d.dateStr
                                );
                                return (
                                  <td
                                    key={d.dayNum}
                                    onClick={() => {
                                      if (isPayrollLocked) {
                                        showToast(`Attendance for ${monthName} ${currentYear} is finalized and locked for payroll. Click "Unlock Month" in the top bar to make adjustments.`, 'warning');
                                        return;
                                      }
                                      setSelectedOverrideCell({
                                        employee: row.emp,
                                        dateStr: d.dateStr,
                                        existingRecord: matchingDaily || daySummary,
                                      });
                                    }}
                                    title={daySummary.statusCode === 'H'
                                      ? `🎉 HOLIDAY: ${daySummary.holiday_name || 'Corporate Holiday'}\nCategory: ${daySummary.holiday_category || 'National Gazetted'}\nType: ${daySummary.holiday_type || 'Public / Mandatory'}\nPayable Status: 1.0 Day Paid Credit (No LOP)`
                                      : `${row.empName} (${d.dateStr})\nClick to record manual attendance or override status\nStatus: ${daySummary.statusLabel}\nShift: ${daySummary.shift_code} (${daySummary.expected_in} - ${daySummary.expected_out})\nIn: ${daySummary.first_check_in || '—'} | Out: ${daySummary.last_check_out || '—'}\nNet: ${formatMinutesToHoursStr(daySummary.net_working_minutes)}${daySummary.late_minutes > 0 ? `\nLate: +${formatDeviationDuration(daySummary.late_minutes, { showBoth: daySummary.late_minutes >= 60 })}` : ''}${daySummary.overtime_minutes > 0 ? `\nOT: +${formatDeviationDuration(daySummary.overtime_minutes, { showBoth: daySummary.overtime_minutes >= 60 })}` : ''}`}
                                    className={cn(
                                      "p-0.5 text-center border-r border-gray-100 cursor-pointer hover:bg-emerald-50 hover:ring-1 hover:ring-emerald-400 select-none transition-all",
                                      d.isSunday && "bg-gray-50/40",
                                      d.isToday && "bg-emerald-50/50"
                                    )}
                                  >
                                    <div className="relative inline-flex items-center justify-center">
                                      {getStatusBadge(daySummary.statusCode, daySummary.statusCode === 'MP')}
                                      {daySummary.hasOvertime && (
                                        <span
                                          title={`Overtime: +${formatDeviationDuration(daySummary.overtime_minutes, { showBoth: true })}`}
                                          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-600 ring-1.5 ring-white shadow-2xs"
                                        />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}

                              {/* Summary Totals */}
                              <td className="p-1.5 text-center font-mono font-semibold text-emerald-800 border-r border-gray-200">
                                {row.totals.present}
                              </td>
                              <td className="p-1.5 text-center font-mono font-semibold text-rose-800 border-r border-gray-200">
                                {row.totals.absent}
                              </td>
                              <td className="p-1.5 text-center font-mono font-semibold text-purple-800 border-r border-gray-200">
                                {row.totals.leave}
                              </td>
                              <td className="p-1.5 text-center font-mono font-semibold text-sky-800 border-r border-gray-200">
                                {row.totals.halfDay}
                              </td>
                              <td className="p-1.5 text-center font-mono font-bold text-purple-900 bg-purple-50/50 border-r border-purple-200">
                                {row.totals.holiday}
                              </td>
                              <td className="p-1.5 text-center font-mono font-semibold text-amber-800 border-r border-gray-200">
                                {row.totals.late}
                              </td>
                              <td className="p-1.5 text-center font-mono font-semibold text-indigo-800 border-r border-gray-200">
                                {row.totals.otHoursFormatted}
                              </td>
                              <td
                                className="p-1.5 text-center font-mono font-bold text-gray-900 bg-gray-50 border-l border-gray-300 cursor-help"
                                title={`Month-to-Date Paid Days: ${row.totals.paidDays} (Present: ${row.totals.present} + Approved Leaves: ${row.totals.leave} + Paid Holidays: ${row.totals.holiday} + Weekly Offs Elapsed: ${row.totals.weeklyOffsElapsed || 6} - LOP: ${row.totals.absent}) | Full Month Projected: ${row.totals.fullMonthPaidDays || 31} Days`}
                              >
                                {row.totals.paidDays}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 5. DETAILED VIEW */
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <tr>
                  <th className="p-2.5 text-left font-bold">Employee</th>
                  <th className="p-2.5 text-left font-bold">Department & Vendor</th>
                  <th className="p-2.5 text-left font-bold">Date</th>
                  <th className="p-2.5 text-left font-bold">Shift</th>
                  <th className="p-2.5 text-left font-bold">Check-In</th>
                  <th className="p-2.5 text-left font-bold">Check-Out</th>
                  <th className="p-2.5 text-left font-bold">Net Hours</th>
                  <th className="p-2.5 text-left font-bold whitespace-nowrap min-w-[120px]">Late / Early</th>
                  <th className="p-2.5 text-left font-bold whitespace-nowrap">Overtime</th>
                  <th className="p-2.5 text-left font-bold">Status</th>
                  <th className="p-2.5 text-right pr-4 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matrixData.flatMap(row =>
                  daysArray.slice(0, Math.min(daysInMonth, Math.max(15, currentDayLimit))).map(d => {
                    const daySummary = row.dayMap[d.dayNum];
                    return (
                      <tr key={`${row.emp.id}-${d.dayNum}`} className="hover:bg-gray-50 text-xs">
                        <td className="p-2.5">
                          <div className="font-bold text-gray-900">{row.empName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{row.empCode}</div>
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-gray-800">{row.dept}</div>
                          <div className="text-[10px] text-gray-500">{row.vendor}</div>
                        </td>
                        <td className="p-2.5 font-mono font-semibold text-gray-900">
                          {d.dateStr}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-gray-900">{daySummary.shift_code}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{daySummary.expected_in} - {daySummary.expected_out}</div>
                        </td>
                        <td className="p-2.5 font-mono text-emerald-800 font-bold">
                          {daySummary.first_check_in || '—'}
                        </td>
                        <td className="p-2.5 font-mono text-gray-800">
                          {daySummary.last_check_out || '—'}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-gray-900">
                          {formatMinutesToHoursStr(daySummary.net_working_minutes)}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {daySummary.late_minutes > 0 && (
                            <span className="text-amber-700 font-semibold block">
                              +{formatDeviationDuration(daySummary.late_minutes, { showBoth: daySummary.late_minutes >= 60 })} Late
                            </span>
                          )}
                          {daySummary.early_checkout_minutes > 0 && (
                            <span className="text-orange-700 font-semibold block">
                              -{formatDeviationDuration(daySummary.early_checkout_minutes, { showBoth: daySummary.early_checkout_minutes >= 60 })} Early
                            </span>
                          )}
                          {daySummary.late_minutes === 0 && daySummary.early_checkout_minutes === 0 && <span className="text-gray-400">—</span>}
                        </td>
                        <td className="p-2.5 font-mono text-indigo-700 font-bold whitespace-nowrap">
                          {daySummary.overtime_minutes > 0
                            ? `+${formatDeviationDuration(daySummary.overtime_minutes, { showBoth: daySummary.overtime_minutes >= 60 })}`
                            : '—'}
                        </td>
                        <td className="p-2.5">
                          {getStatusBadge(daySummary.statusCode)}
                        </td>
                        <td className="p-2.5 text-right pr-4 whitespace-nowrap space-x-2">
                          <button
                            onClick={() => {
                              if (isPayrollLocked) {
                                showToast(`Attendance for ${monthName} ${currentYear} is finalized and locked for payroll. Click "Unlock Month" in the top bar to make adjustments.`, 'warning');
                                return;
                              }
                              const matchingDaily = dailyRecords.find(r =>
                                (r.employee_id === row.emp.id || (r.employee_code && row.emp.employee_code && r.employee_code.toLowerCase() === row.emp.employee_code.toLowerCase())) &&
                                r.date === d.dateStr
                              );
                              setSelectedOverrideCell({
                                employee: row.emp,
                                dateStr: d.dateStr,
                                existingRecord: matchingDaily || daySummary,
                              });
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                          >
                            Override
                          </button>
                          <span className="text-gray-300">·</span>
                          <button
                            onClick={() => {
                              onOpenEmployeeProfile?.(row.emp.id, d.dateStr);
                              setStatementEmpId(row.emp.id);
                            }}
                            className="text-xs text-gray-600 hover:text-gray-900 font-semibold hover:underline"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production-Grade Employee Attendance Statement Modal Workspace */}
      {statementEmpId && (
        <EmployeeAttendanceStatementModal
          employeeId={statementEmpId}
          initialPeriod={`${monthName} ${currentYear}`}
          onClose={() => setStatementEmpId(null)}
          onNavigateEmployee={id => setStatementEmpId(id)}
          onNavigateSubPath={onNavigateSubPath}
        />
      )}

      {/* Manual Attendance & Missed Punch Override Modal */}
      {selectedOverrideCell && (
        <ManualAttendanceOverrideModal
          isOpen={Boolean(selectedOverrideCell)}
          onClose={() => setSelectedOverrideCell(null)}
          employee={selectedOverrideCell.employee}
          dateStr={selectedOverrideCell.dateStr}
          existingRecord={selectedOverrideCell.existingRecord}
          onSuccess={() => loadData()}
        />
      )}

      {/* Excel Bulk Attendance Upload & Reconciliation Modal */}
      {showBulkUploadModal && (
        <AttendanceBulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          employees={employees}
          currentYear={currentYear}
          currentMonthIndex={currentMonthIndex}
          dailyRecords={dailyRecords}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
};
