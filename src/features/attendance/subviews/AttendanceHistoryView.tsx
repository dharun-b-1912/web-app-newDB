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
} from 'lucide-react';
import { attendanceApi } from '../../../services/attendanceApi';
import { api } from '../../../services/api';
import { useToast } from '../../../components/ui/Toast';
import { formatMinutesToHoursStr } from '../../../lib/attendance/attendanceEngine';
import { attendanceRosterService } from '../../../services/attendance/attendanceRosterService';
import { AttendanceDaily } from '../../../types/attendance';
import { cn } from '../../../lib/utils';
import { EmployeeAttendanceStatementModal } from '../components/EmployeeAttendanceStatementModal';
import { hrEventBus } from '../../../services/hrEventBus';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';

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

export const AttendanceHistoryView: React.FC<AttendanceHistoryViewProps> = ({
  onOpenEmployeeProfile,
  onNavigateSubPath,
}) => {
  const { showToast } = useToast();

  // Active Month & Date Navigation (Defaults to August 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(7); // 0-indexed (7 = August)
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
      return emp.vendor_name || emp.employment?.vendor_name || 'Contract Agency';
    }
    return 'Joy Corporate Solutions Pvt Ltd';
  };

  const monthName = new Date(currentYear, currentMonthIndex, 1).toLocaleString('en-US', { month: 'long' });
  const monthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const isCurrentMonth = currentYear === new Date().getFullYear() && currentMonthIndex === new Date().getMonth();
  const currentDayLimit = isCurrentMonth ? new Date().getDate() : daysInMonth;

  const daysArray = useMemo(() => {
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
        isToday: dateStr === new Date().toISOString().split('T')[0],
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

    const loadedShifts = attendanceRosterService.getShifts();
    setShifts(loadedShifts);

    const records = attendanceApi.getDailyAttendance();
    setDailyRecords(records);

    if (isSupabaseEnabled) {
      const startDate = `${monthKey}-01`;
      const endDate = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;
      Promise.resolve(
        supabase
          .from('attendance_daily')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
      )
        .then(({ data, error }: any) => {
          if (!error && data && data.length > 0) {
            try {
              const currentList = JSON.parse(localStorage.getItem('workforceos_attendance_daily_v2') || '[]');
              const merged = [...currentList];
              for (const row of data) {
                const idx = merged.findIndex((a: any) => a.id === row.id || (a.employee_id === row.employee_id && a.date === row.date));
                if (idx >= 0) {
                  merged[idx] = { ...merged[idx], ...row };
                } else {
                  merged.unshift(row);
                }
              }
              localStorage.setItem('workforceos_attendance_daily_v2', JSON.stringify(merged));
              localStorage.setItem('workforceos_attendance_daily_v2_org-joy-01', JSON.stringify(merged));
              const refreshedRecords = attendanceApi.getDailyAttendance();
              setDailyRecords(refreshedRecords);
            } catch {}
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    loadData();
  }, [monthKey]);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('attendance.*', () => {
      loadData();
    });
    return () => unsub();
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
        (emp.display_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`).toLowerCase().includes(q) ||
        (emp.employee_code || '').toLowerCase().includes(q) ||
        empVendor.toLowerCase().includes(q) ||
        empDept.toLowerCase().includes(q);

      return matchDept && matchLoc && matchVendor && matchQuery;
    });
  }, [employees, workforceSegment, deptFilter, locationFilter, vendorFilter, searchQuery]);

  // Compute day-by-day attendance for each employee across the entire month
  const matrixData = useMemo<MatrixEmployeeRow[]>(() => {
    return scopedEmployees.map(emp => {
      const empName = emp.display_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
      const empCode = emp.employee_code || `WF-${emp.id}`;
      const dept = emp.department_name || emp.department || 'People & HR';
      const designation = emp.designation_title || emp.designation || 'Staff';
      const isVendor = checkIsVendor(emp);
      const vendor = getVendorName(emp);

      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLeave = 0;
      let totalHalfDay = 0;
      let totalWfh = 0;
      let totalLate = 0;
      let totalEarly = 0;
      let totalMissingPunch = 0;
      let totalOtMinutes = 0;
      let totalWorkedMinutes = 0;

      const dayMap: Record<number, DayAttendanceSummary> = {};

      daysArray.forEach(d => {
        const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, d.dateStr);
        const shift = attendanceRosterService.getShiftById(roster.shift_id) || {
          shift_code: roster.shift_code || 'GEN-09',
          shift_name: roster.shift_name || 'General Shift',
          start_time: '09:00',
          end_time: '18:00',
          grace_in_minutes: 15,
        };

        const record = dailyRecords.find(r => 
          (r.employee_id === emp.id || (r.employee_code && emp.employee_code && r.employee_code.toLowerCase() === emp.employee_code.toLowerCase())) && 
          r.date === d.dateStr
        );

        let statusCode = 'P';
        let statusLabel = 'Present';

        if (roster.is_weekly_off) {
          statusCode = 'WO';
          statusLabel = 'Weekly Off';
        } else if (record) {
          if (record.status === 'On Leave') {
            statusCode = 'L';
            statusLabel = 'On Leave';
            totalLeave++;
          } else if (record.status === 'WFH') {
            statusCode = 'WFH';
            statusLabel = 'Work From Home';
            totalWfh++;
            totalPresent++;
          } else if (record.status === 'Half Day') {
            statusCode = 'HD';
            statusLabel = 'Half Day';
            totalHalfDay++;
            totalPresent++;
          } else if (record.status === 'Missing Punch' || (!d.isToday && record.first_check_in && !record.last_check_out)) {
            statusCode = 'MP';
            statusLabel = 'Missing Punch';
            totalMissingPunch++;
            totalPresent++;
          } else if (record.status === 'Absent') {
            statusCode = 'A';
            statusLabel = 'Absent';
            totalAbsent++;
          } else if (record.late_minutes > 0 || record.status === 'Late') {
            statusCode = 'LP';
            statusLabel = 'Late Present';
            totalLate++;
            totalPresent++;
          } else if (record.status === 'Present' || record.status === 'Checked Out' || (d.isToday && record.first_check_in)) {
            statusCode = 'P';
            statusLabel = 'Present';
            totalPresent++;
          } else {
            statusCode = 'WO';
            statusLabel = 'Rest Day';
          }

          if (record.early_checkout_minutes > 0) totalEarly++;
          if (record.overtime_minutes > 0) totalOtMinutes += record.overtime_minutes;
          if (record.net_working_minutes > 0) totalWorkedMinutes += record.net_working_minutes;
        } else {
          // No record exists in database for this day
          if (roster.is_weekly_off) {
            statusCode = 'WO';
            statusLabel = 'Weekly Off';
          } else if (isCurrentMonth && d.dayNum < new Date().getDate()) {
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
          late_minutes: record?.late_minutes || 0,
          early_checkout_minutes: record?.early_checkout_minutes || 0,
          overtime_minutes: record?.overtime_minutes || 0,
          total_break_minutes: record?.total_break_minutes || 0,
          source: record?.source || (roster.is_weekly_off ? 'SYSTEM' : 'WEB'),
          shift_code: shift.shift_code,
          shift_name: shift.shift_name,
          expected_in: shift.start_time,
          expected_out: shift.end_time,
          isWeeklyOff: roster.is_weekly_off,
          hasOvertime: (record?.overtime_minutes || 0) > 0,
        };
      });

      // Count roster-derived weekly offs (supports 5-day, 6-day, and rotational shift rosters)
      let weeklyOffsElapsed = 0;
      let scheduledWorkDaysElapsed = 0;

      daysArray.forEach(d => {
        const isOff = dayMap[d.dayNum]?.isWeeklyOff;
        if (d.dayNum <= currentDayLimit) {
          if (isOff) {
            weeklyOffsElapsed++;
          } else {
            scheduledWorkDaysElapsed++;
          }
        }
      });

      // Month-to-date Paid Days = Present + (HalfDay * 0.5) + Approved Leaves + Weekly Offs (Elapsed)
      const mtdPaidDays = Math.max(0, totalPresent + (totalHalfDay * 0.5) + totalLeave + weeklyOffsElapsed);
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
  }, [scopedEmployees, dailyRecords, daysArray, currentYear, currentMonthIndex, daysInMonth, currentDayLimit]);

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
    const totalMissingPunches = matrixData.reduce((acc, m) => acc + m.totals.missingPunch, 0);
    const totalOtMins = matrixData.reduce((acc, m) => acc + m.totals.otMinutes, 0);
    const totalPaidDays = matrixData.reduce((acc, m) => acc + m.totals.paidDays, 0);

    const totalScheduledElapsed = matrixData.reduce((acc, m) => acc + (m.totals.scheduledWorkDaysElapsed || 1), 0);
    const attendanceRate = totalScheduledElapsed > 0 ? Math.min(100, Math.round((totalPresentDays / totalScheduledElapsed) * 100)) : 0;

    const avgPresentDays = (totalPresentDays / (totalEmployees || 1)).toFixed(1);
    const avgAbsentDays = (totalAbsentDays / (totalEmployees || 1)).toFixed(1);
    const avgPaidDays = (totalPaidDays / (totalEmployees || 1)).toFixed(1);
    const elapsedDays = currentDayLimit;

    return {
      totalEmployees,
      totalPresentDays,
      avgPresentDays,
      totalAbsentDays,
      avgAbsentDays,
      totalLeaveDays,
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
      case 'L':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-purple-800 bg-purple-50">L</span>;
      case 'WFH':
        return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-violet-800 bg-violet-50">WFH</span>;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
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
        <div className="flex items-center gap-2">
          {/* Segmented View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewMode('matrix')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors",
                viewMode === 'matrix' ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-600 hover:text-gray-900"
              )}
            >
              Matrix
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors",
                viewMode === 'detailed' ? "bg-white text-gray-900 shadow-2xs font-bold" : "text-gray-600 hover:text-gray-900"
              )}
            >
              Detailed
            </button>
          </div>

          <button
            onClick={handleExport}
            className="h-8 px-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export</span>
          </button>

          <button
            onClick={handlePrint}
            className="h-8 px-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Print</span>
          </button>

          <button
            onClick={() => {
              setIsPayrollLocked(!isPayrollLocked);
              showToast(isPayrollLocked ? 'Unlocked August 2026 attendance ledger.' : 'Finalized and locked August 2026 attendance ledger for payroll calculation.');
            }}
            className={cn(
              "h-8 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors",
              isPayrollLocked
                ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                : "bg-[#07563D] hover:bg-[#064e37] text-white shadow-2xs"
            )}
          >
            {isPayrollLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isPayrollLocked ? 'Unlock Month' : 'Finalize Attendance'}</span>
          </button>
        </div>
      </div>

      {/* 2. FLAT PERIOD + WORKFORCE SEGMENT + FILTER TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Navigation Control */}
          <div className="flex items-center border border-gray-200 bg-white rounded-lg h-9 text-xs font-bold text-gray-800">
            <button
              onClick={handlePrevMonth}
              className="px-2 h-full hover:bg-gray-50 border-r border-gray-200 flex items-center text-gray-600 hover:text-gray-900"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 select-none">{monthName} {currentYear}</span>
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
            className="h-9 px-3 text-xs font-semibold border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-700"
          >
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
            className="h-9 pl-8 pr-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#07563D] w-52"
          />
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

      {/* 3. LIGHTWEIGHT METRIC STRIP + INLINE HORIZONTAL LEGEND */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-2 px-3 bg-gray-50/90 border border-gray-200/90 rounded-lg text-xs">
        {/* Metric Strip */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400">Workforce:</span>
            <strong className="text-gray-900 font-bold">{monthStats.totalEmployees} Staff</strong>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400">Present:</span>
            <strong className="text-emerald-700 font-bold">{monthStats.avgPresentDays}d avg</strong>
            <span className="text-[11px] text-gray-400 font-mono">({monthStats.totalPresentDays.toLocaleString('en-IN')})</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400">LOP:</span>
            <strong className={cn("font-bold", monthStats.totalAbsentDays > 0 ? "text-rose-700" : "text-gray-900")}>
              {monthStats.avgAbsentDays}d avg
            </strong>
            <span className="text-[11px] text-gray-400 font-mono">({monthStats.totalAbsentDays.toLocaleString('en-IN')})</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400">Leave:</span>
            <strong className="text-purple-700 font-bold">{monthStats.totalLeaveDays}d</strong>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400">OT:</span>
            <strong className="text-indigo-700 font-bold">{monthStats.totalOtHours}</strong>
          </span>
          <span className="text-gray-300">|</span>
          <span
            className="flex items-center gap-1.5 cursor-help"
            title={`Month-to-Date Average: ${monthStats.avgPaidDays} paid days per employee out of ${monthStats.elapsedDays} elapsed days (Total ${monthStats.totalPaidDays.toLocaleString('en-IN')} workforce man-days credited).`}
          >
            <span className="text-[10px] uppercase font-bold text-gray-400">Paid:</span>
            <strong className="text-gray-900 font-black text-xs text-[#07563D]">{monthStats.avgPaidDays} / {monthStats.elapsedDays}d avg</strong>
            <span className="text-[11px] text-gray-400 font-mono">({monthStats.totalPaidDays.toLocaleString('en-IN')} total)</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400">Rate:</span>
            <strong className="text-gray-900 font-bold">{monthStats.attendanceRate}%</strong>
          </span>

          {monthStats.totalMissingPunches > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => onNavigateSubPath?.('regularization')}
                className="flex items-center gap-1 text-rose-700 font-bold hover:underline"
              >
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>{monthStats.totalMissingPunches} Exceptions</span>
              </button>
            </>
          )}
        </div>

        {/* Inline Horizontal Legend */}
        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium overflow-x-auto whitespace-nowrap">
          <span className="text-gray-400 text-[10px] font-bold uppercase">Legend:</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /><strong>P</strong> Present</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-600" /><strong>LP</strong> Late</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-600" /><strong>A</strong> Absent</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-600" /><strong>L</strong> Leave</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-600" /><strong>HD</strong> Half</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-600" /><strong>WFH</strong> Remote</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-600" /><strong>!</strong> Missing</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /><strong>WO</strong> Off</span>
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
                  {daysArray.map(d => (
                    <th
                      key={d.dayNum}
                      className={cn(
                        "p-1 text-center font-mono border-r border-gray-200/60 min-w-[32px]",
                        d.isSunday && "bg-gray-100/50 text-gray-600",
                        d.isSaturday && "bg-gray-50 text-gray-500",
                        d.isToday && "bg-emerald-50/50 text-emerald-950 font-black border-t-2 border-t-[#07563D]"
                      )}
                    >
                      <div className="text-[11px] font-bold leading-tight">{d.dayNum}</div>
                      <div className="text-[9px] text-gray-400 font-sans font-semibold uppercase">{d.weekdayShort.slice(0, 2)}</div>
                    </th>
                  ))}

                  {/* Right Summary Headers */}
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[34px]" title="Present Days">P</th>
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[34px]" title="Absent Days">A</th>
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[34px]" title="Leave Days">L</th>
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[34px]" title="Half Days">HD</th>
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[36px]" title="Late Marks">Late</th>
                  <th className="p-1.5 text-center bg-gray-50 text-gray-800 font-bold border-r border-gray-200 min-w-[48px]" title="Overtime Hours">OT</th>
                  <th className="p-1.5 text-center bg-gray-100 text-gray-900 font-black border-l border-gray-300 min-w-[44px]" title="Paid Days for Payroll">Paid</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100">
                {Object.keys(departmentGroups).length === 0 ? (
                  <tr>
                    <td colSpan={daysArray.length + 8} className="text-center py-12 text-gray-400">
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
                            colSpan={daysArray.length + 8}
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
                                return (
                                  <td
                                    key={d.dayNum}
                                    onClick={() => {
                                      onOpenEmployeeProfile?.(row.emp.id, d.dateStr);
                                      setStatementEmpId(row.emp.id);
                                    }}
                                    title={`${row.empName} (${d.dateStr})\nStatus: ${daySummary.statusLabel}\nShift: ${daySummary.shift_code} (${daySummary.expected_in} - ${daySummary.expected_out})\nIn: ${daySummary.first_check_in || '—'} | Out: ${daySummary.last_check_out || '—'}\nNet: ${formatMinutesToHoursStr(daySummary.net_working_minutes)}${daySummary.late_minutes > 0 ? `\nLate: +${daySummary.late_minutes}m` : ''}${daySummary.overtime_minutes > 0 ? `\nOT: +${daySummary.overtime_minutes}m` : ''}`}
                                    className={cn(
                                      "p-0.5 text-center border-r border-gray-100 cursor-pointer hover:bg-gray-100/60 select-none",
                                      d.isSunday && "bg-gray-50/40",
                                      d.isToday && "bg-emerald-50/30"
                                    )}
                                  >
                                    <div className="relative inline-flex items-center justify-center">
                                      {getStatusBadge(daySummary.statusCode, daySummary.statusCode === 'MP')}
                                      {daySummary.hasOvertime && (
                                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-600" />
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
                              <td className="p-1.5 text-center font-mono font-semibold text-amber-800 border-r border-gray-200">
                                {row.totals.late}
                              </td>
                              <td className="p-1.5 text-center font-mono font-semibold text-indigo-800 border-r border-gray-200">
                                {row.totals.otHoursFormatted}
                              </td>
                              <td
                                className="p-1.5 text-center font-mono font-bold text-gray-900 bg-gray-50 border-l border-gray-300 cursor-help"
                                title={`Month-to-Date Paid Days: ${row.totals.paidDays} (Present: ${row.totals.present} + Approved Leaves: ${row.totals.leave} + Weekly Offs Elapsed: ${row.totals.weeklyOffsElapsed || 6} - LOP: ${row.totals.absent}) | Full Month Projected: ${row.totals.fullMonthPaidDays || 31} Days`}
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
                  <th className="p-2.5 text-left font-bold">Late / Early</th>
                  <th className="p-2.5 text-left font-bold">Overtime</th>
                  <th className="p-2.5 text-left font-bold">Status</th>
                  <th className="p-2.5 text-right pr-4 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matrixData.flatMap(row =>
                  daysArray.slice(0, 15).map(d => {
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
                        <td className="p-2.5">
                          {daySummary.late_minutes > 0 && <span className="text-amber-700 font-semibold block">+{daySummary.late_minutes}m Late</span>}
                          {daySummary.early_checkout_minutes > 0 && <span className="text-orange-700 font-semibold block">-{daySummary.early_checkout_minutes}m Early</span>}
                          {daySummary.late_minutes === 0 && daySummary.early_checkout_minutes === 0 && <span className="text-gray-400">—</span>}
                        </td>
                        <td className="p-2.5 font-mono text-indigo-700 font-bold">
                          {daySummary.overtime_minutes > 0 ? `+${daySummary.overtime_minutes}m` : '—'}
                        </td>
                        <td className="p-2.5">
                          {getStatusBadge(daySummary.statusCode)}
                        </td>
                        <td className="p-2.5 text-right pr-4">
                          <button
                            onClick={() => {
                              onOpenEmployeeProfile?.(row.emp.id, d.dateStr);
                              setStatementEmpId(row.emp.id);
                            }}
                            className="text-xs text-[#07563D] hover:underline font-semibold"
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
          initialPeriod="August 2026"
          onClose={() => setStatementEmpId(null)}
          onNavigateEmployee={id => setStatementEmpId(id)}
          onNavigateSubPath={onNavigateSubPath}
        />
      )}
    </div>
  );
};
