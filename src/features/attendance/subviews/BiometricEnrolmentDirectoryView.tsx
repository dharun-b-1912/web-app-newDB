// src/features/attendance/subviews/BiometricEnrolmentDirectoryView.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Biometric Enrolment Directory & 5-Day Attendance Center
// Multi-Tenant Isolated • Electra EV Manufacturing Plant (Nov 20 to Nov 24, 2026)
// Staggered Enrolment Flow • Shift Allocation • Late / Early Deviation • Overtime • Multi-Sheet Excel
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Download,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Cpu,
  Activity,
  Layers,
  ArrowUpDown,
  Calendar,
  CalendarDays,
  Sparkles,
  Info,
  Check,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import { api } from '../../../services/api';
import type { Employee } from '../../../types';
import { supabase, supabaseAdmin, isSupabaseEnabled } from '../../../lib/supabase';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { attendanceTimeService } from '../../../services/attendance/attendanceTimeService';
import { formatEmployeeName } from '../../../utils/nameFormat';
import { computeEmployeeOvertime, extractIstMinutesOfDay } from '../../../services/attendance/attendanceReportExportService';
import { smartShiftResolutionService, ELECTRA_EV_SHIFTS } from '../../../services/attendance/smartShiftResolutionService';
import { formatDeviationDuration, formatMinutesToHoursStr } from '../../../lib/attendance/attendanceEngine';
import ExcelJS from 'exceljs';

export interface DayAttendanceDetail {
  dateStr: string; // '2026-11-20' .. '2026-11-24'
  dayLabel: string; // 'Nov 20 (Fri)', etc.
  shiftCode: string; // 'SHIFT-1', 'GEN-01', 'SHIFT-2', 'SHIFT-3', '—'
  shiftName: string;
  shiftHours: string;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  status: 'Present' | 'Working' | 'Late' | 'Absent' | 'Weekly Off' | 'Pending Enrolment' | 'Pre-Enrolment';
  lateMinutes: number;
  earlyArrivalMinutes: number;
  earlyExitMinutes: number;
  workMinutes: number;
  overtimeMinutes: number;
  overtimeFormatted: string;
  punchCount: number;
  isEnrolledOnDate: boolean;
}

export interface EnrolmentRecord {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  department: string;
  designation: string;
  employmentStatus: string;
  employmentType: string;
  biometricPin: string;
  isEnrolled: boolean;
  enrolledDate: string | null; // e.g. '2026-11-20'
  enrolledDateFormatted: string; // '20-Nov-2026'
  enrolmentBatch: 'Batch 1 (20-Nov)' | 'Batch 2 (21-Nov)' | 'Batch 3 (23-Nov)' | 'Batch 4 (24-Nov)' | 'Pending';
  totalPunches: number;
  firstPunchAt: string | null;
  firstPunchFormatted: string;
  latestPunchAt: string | null;
  latestPunchFormatted: string;
  activeToday: boolean;
  todayPunchesCount: number;
  todayFirstPunch: string | null;
  todayLatestPunch: string | null;
  todayShift: string;
  todayShiftHours: string;
  todayLateMins: number;
  todayEarlyInMins: number;
  todayOtMins: number;
  todayStatus: string;
  verificationModes: string[];
  daysPresentCount: number;
  totalOtMinutesNov20to24: number;
  totalOtFormatted: string;
  dailyHistory: Record<string, DayAttendanceDetail>;
}

interface BiometricEnrolmentDirectoryViewProps {
  onBack?: () => void;
  onNavigateToTerminalLogs?: (employeeId?: string) => void;
}

const AUDIT_DATES = [
  { key: '2026-11-20', label: 'Nov 20 (Fri)', dayName: 'Friday' },
  { key: '2026-11-21', label: 'Nov 21 (Sat)', dayName: 'Saturday' },
  { key: '2026-11-22', label: 'Nov 22 (Sun)', dayName: 'Sunday' },
  { key: '2026-11-23', label: 'Nov 23 (Mon)', dayName: 'Monday' },
  { key: '2026-11-24', label: 'Nov 24 (Tue)', dayName: 'Tuesday (Today)' },
];

export const BiometricEnrolmentDirectoryView: React.FC<BiometricEnrolmentDirectoryViewProps> = ({
  onBack,
  onNavigateToTerminalLogs,
}) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [companyName, setCompanyName] = useState('Electra EV');

  // Master records
  const [records, setRecords] = useState<EnrolmentRecord[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // View Mode: 5-Day Matrix vs Single Date Detail
  const [viewMode, setViewMode] = useState<'MATRIX_5DAY' | 'SINGLE_DAY'>('MATRIX_5DAY');
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>('2026-11-24');

  // Filtering & Search
  const [activeTab, setActiveTab] = useState<'ALL' | 'ENROLLED' | 'PENDING' | 'ACTIVE_TODAY' | 'OVERTIME_WORKERS'>('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'name' | 'code' | 'punches' | 'enrolled_date' | 'ot'>('enrolled_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Today in IST
  const todayIst = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  }, []);

  // --------------------------------------------------------------------------
  // DATA INGESTION & PIPELINE (Nov 20 to Nov 24)
  // --------------------------------------------------------------------------
  const loadEnrolmentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const orgId = getActiveOrgId();
      const client = supabaseAdmin || supabase;

      // 1. Fetch organization metadata
      try {
        const activeComp = api.getActiveCompany();
        if (activeComp?.name) {
          setCompanyName(activeComp.name);
        } else if (client) {
          const { data: orgData } = await client.from('organizations').select('name').eq('id', orgId).maybeSingle();
          if (orgData?.name) setCompanyName(orgData.name);
        }
      } catch {}

      // 2. Parallel fetch: Employees, Punches (Nov 20-24), Daily Attendance (Nov 20-24), Departments
      const [empRes, punchRes, dailyRes, deptRes] = await Promise.all([
        client
          ? client.from('employees').select('id, employee_code, display_name, first_name, last_name, department_id, designation_id, employment_status, employment_type').eq('organization_id', orgId)
          : Promise.resolve({ data: [] }),
        client
          ? client.from('attendance_punches').select('id, employee_id, punch_time, punch_type, verification_mode, attendance_date').eq('organization_id', orgId).gte('punch_time', '2026-11-20T00:00:00Z').lte('punch_time', '2026-11-24T23:59:59Z').order('punch_time', { ascending: true })
          : Promise.resolve({ data: [] }),
        client
          ? client.from('attendance_daily').select('id, employee_id, attendance_date, shift_id, status, first_check_in, last_check_out, total_work_minutes, overtime_minutes, late_entry_minutes, early_exit_minutes, current_work_state').eq('organization_id', orgId).gte('attendance_date', '2026-11-20').lte('attendance_date', '2026-11-24')
          : Promise.resolve({ data: [] }),
        client
          ? client.from('departments').select('id, name').eq('organization_id', orgId)
          : Promise.resolve({ data: [] }),
      ]);

      let empList: any[] = empRes.data || [];
      if (empList.length === 0) {
        try {
          empList = await api.getEmployees({ organizationId: orgId, skipEnrichment: true });
        } catch {}
      }

      // Department Map
      const deptMap = new Map<string, string>();
      (deptRes.data || []).forEach((d: any) => deptMap.set(d.id, d.name));

      const punches: any[] = punchRes.data || [];
      const dailyRecords: any[] = dailyRes.data || [];

      // Map daily records by `${employeeId}_${date}`
      const dailyMap = new Map<string, any>();
      for (const d of dailyRecords) {
        dailyMap.set(`${d.employee_id}_${d.attendance_date}`, d);
      }

      // Map punches by employee and date
      const punchByEmpDate = new Map<string, any[]>();
      const punchStats = new Map<string, {
        total: number;
        firstPunch: string;
        latestPunch: string;
        modes: Set<string>;
      }>();

      for (const p of punches) {
        const empId = p.employee_id;
        if (!empId || !p.punch_time) continue;

        let pDate = p.attendance_date;
        if (!pDate) {
          pDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(p.punch_time));
        }

        const empDateKey = `${empId}_${pDate}`;
        if (!punchByEmpDate.has(empDateKey)) punchByEmpDate.set(empDateKey, []);
        punchByEmpDate.get(empDateKey)!.push(p);

        if (!punchStats.has(empId)) {
          punchStats.set(empId, {
            total: 0,
            firstPunch: p.punch_time,
            latestPunch: p.punch_time,
            modes: new Set(),
          });
        }
        const stat = punchStats.get(empId)!;
        stat.total += 1;
        if (p.verification_mode) stat.modes.add(p.verification_mode);
        if (new Date(p.punch_time) < new Date(stat.firstPunch)) stat.firstPunch = p.punch_time;
        if (new Date(p.punch_time) > new Date(stat.latestPunch)) stat.latestPunch = p.punch_time;
      }

      // Shift lookup helper
      const getElectraShift = (shiftId?: string, shiftCode?: string) => {
        if (!shiftId && !shiftCode) return ELECTRA_EV_SHIFTS[1]; // default GEN-01
        return (
          ELECTRA_EV_SHIFTS.find((s) => s.id === shiftId || s.code === shiftCode) ||
          ELECTRA_EV_SHIFTS[1]
        );
      };

      // Build 5-Day Comprehensive Enrolment Records
      const deptSet = new Set<string>();
      const mappedRecords: EnrolmentRecord[] = empList.map((emp) => {
        const stat = punchStats.get(emp.id);
        const isEnrolled = !!stat && stat.total > 0;
        const totalPunches = stat ? stat.total : 0;
        const firstPunchAt = stat ? stat.firstPunch : null;
        const latestPunchAt = stat ? stat.latestPunch : null;

        // Determine Enrolment Date in IST
        let enrolledDate: string | null = null;
        let enrolledDateFormatted = 'Pending Scan';
        let enrolmentBatch: EnrolmentRecord['enrolmentBatch'] = 'Pending';

        if (firstPunchAt) {
          enrolledDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(firstPunchAt));
          const dObj = new Date(firstPunchAt);
          enrolledDateFormatted = dObj.toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });

          if (enrolledDate === '2026-11-20') enrolmentBatch = 'Batch 1 (20-Nov)';
          else if (enrolledDate === '2026-11-21') enrolmentBatch = 'Batch 2 (21-Nov)';
          else if (enrolledDate === '2026-11-23') enrolmentBatch = 'Batch 3 (23-Nov)';
          else if (enrolledDate === '2026-11-24') enrolmentBatch = 'Batch 4 (24-Nov)';
        }

        // Build Daily History across all 5 dates (Nov 20 to Nov 24)
        const dailyHistory: Record<string, DayAttendanceDetail> = {};
        let daysPresentCount = 0;
        let totalOtMinutesNov20to24 = 0;

        for (const ad of AUDIT_DATES) {
          const dateStr = ad.key;
          const dayKey = `${emp.id}_${dateStr}`;
          const dailyRec = dailyMap.get(dayKey);
          const dayPunches = punchByEmpDate.get(dayKey) || [];

          let firstIn = dailyRec?.first_check_in || (dayPunches.length > 0 ? dayPunches[0].punch_time : null);
          let lastOut = dailyRec?.last_check_out || (dayPunches.length > 1 ? dayPunches[dayPunches.length - 1].punch_time : null);
          if (firstIn && lastOut && firstIn === lastOut) lastOut = null;

          // Adaptively resolve shift
          let activeShift = getElectraShift(dailyRec?.shift_id);
          if (firstIn) {
            const adapt = smartShiftResolutionService.resolveShiftDeterministic({
              activeShifts: ELECTRA_EV_SHIFTS,
              firstPunchTime: firstIn,
              lastPunchTime: lastOut,
              mode: 'ADAPTIVE_SHIFT',
            });
            if (adapt) activeShift = getElectraShift(adapt.shiftId, adapt.shiftCode);
          }

          const sStartMins = extractIstMinutesOfDay(activeShift.start_time);
          const inMins = firstIn ? extractIstMinutesOfDay(firstIn) : null;
          const outMins = lastOut ? extractIstMinutesOfDay(lastOut) : null;

          let lateMins = dailyRec?.late_entry_minutes || 0;
          if (lateMins === 0 && inMins !== null && sStartMins !== null) {
            if (inMins > sStartMins + 15) lateMins = inMins - sStartMins;
          }

          let earlyInMins = 0;
          if (inMins !== null && sStartMins !== null && inMins < sStartMins) {
            let eDiff = sStartMins - inMins;
            if (activeShift.is_overnight && eDiff < -720) eDiff += 1440;
            if (eDiff >= 30) earlyInMins = eDiff;
          }

          let earlyExitMins = dailyRec?.early_exit_minutes || 0;

          // Calculate overtime
          const otRes = computeEmployeeOvertime(
            {
              first_check_in: firstIn,
              last_check_out: lastOut,
              overtime_minutes: dailyRec?.overtime_minutes,
              total_work_minutes: dailyRec?.total_work_minutes,
            },
            activeShift,
            false
          );

          const otMins = otRes.overtimeMinutes || 0;
          totalOtMinutesNov20to24 += otMins;

          // Determine status & whether enrolled on that date
          const isEnrolledOnThisDate = !!enrolledDate && enrolledDate <= dateStr;
          let status: DayAttendanceDetail['status'] = 'Absent';

          if (firstIn) {
            daysPresentCount++;
            if (!lastOut && dateStr === '2026-11-24') {
              status = 'Working';
            } else if (lateMins > 0) {
              status = 'Late';
            } else {
              status = 'Present';
            }
          } else if (dateStr === '2026-11-22') {
            status = 'Weekly Off';
          } else if (!isEnrolledOnThisDate) {
            // Before enrollment date
            status = 'Pending Enrolment';
          } else {
            status = 'Absent';
          }

          dailyHistory[dateStr] = {
            dateStr,
            dayLabel: ad.label,
            shiftCode: firstIn ? activeShift.code : '—',
            shiftName: firstIn ? activeShift.name : '—',
            shiftHours: firstIn ? `${(activeShift.start_time || '').substring(0, 5)} - ${(activeShift.end_time || '').substring(0, 5)}` : '—',
            firstCheckIn: firstIn,
            lastCheckOut: lastOut,
            status,
            lateMinutes: lateMins,
            earlyArrivalMinutes: earlyInMins,
            earlyExitMinutes: earlyExitMins,
            workMinutes: dailyRec?.total_work_minutes || 0,
            overtimeMinutes: otMins,
            overtimeFormatted: otRes.hasOvertime ? `+${otRes.formatted} OT` : '—',
            punchCount: dayPunches.length,
            isEnrolledOnDate: isEnrolledOnThisDate,
          };
        }

        // Today specific data (2026-11-24)
        const todayDetail = dailyHistory['2026-11-24'];
        const activeToday = Boolean(todayDetail?.firstCheckIn);

        // Format dates in IST
        const firstPunchFormatted = firstPunchAt
          ? new Date(firstPunchAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }) +
            ' ' +
            attendanceTimeService.formatAttendanceTime(firstPunchAt, 'Asia/Kolkata', true)
          : '—';

        const latestPunchFormatted = latestPunchAt
          ? new Date(latestPunchAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }) +
            ' ' +
            attendanceTimeService.formatAttendanceTime(latestPunchAt, 'Asia/Kolkata', true)
          : '—';

        // Department resolution
        let deptName = (emp as any).department_name || (emp as any).department;
        if (!deptName && (emp as any).department_id) {
          deptName = deptMap.get((emp as any).department_id) || 'General';
        }
        if (!deptName) deptName = 'General';
        deptSet.add(deptName);

        // Biometric PIN
        const cleanDigits = (emp.employee_code || '').replace(/\D/g, '');
        const pin = cleanDigits ? String(parseInt(cleanDigits, 10)) : (emp.employee_code || '—');

        return {
          employeeId: emp.id,
          employeeCode: emp.employee_code || '—',
          displayName: formatEmployeeName(emp),
          department: deptName,
          designation: (emp as any).designation_title || (emp as any).designation || 'Staff',
          employmentStatus: emp.employment_status || (emp as any).status || 'Active',
          employmentType: emp.employment_type || 'Full Time',
          biometricPin: pin,
          isEnrolled,
          enrolledDate,
          enrolledDateFormatted,
          enrolmentBatch,
          totalPunches,
          firstPunchAt,
          firstPunchFormatted,
          latestPunchAt,
          latestPunchFormatted,
          activeToday,
          todayPunchesCount: todayDetail?.punchCount || 0,
          todayFirstPunch: todayDetail?.firstCheckIn || null,
          todayLatestPunch: todayDetail?.lastCheckOut || null,
          todayShift: todayDetail?.shiftCode || '—',
          todayShiftHours: todayDetail?.shiftHours || '—',
          todayLateMins: todayDetail?.lateMinutes || 0,
          todayEarlyInMins: todayDetail?.earlyArrivalMinutes || 0,
          todayOtMins: todayDetail?.overtimeMinutes || 0,
          todayStatus: todayDetail?.status || 'Absent',
          verificationModes: stat ? Array.from(stat.modes) : [],
          daysPresentCount,
          totalOtMinutesNov20to24,
          totalOtFormatted: formatMinutesToHoursStr(totalOtMinutesNov20to24),
          dailyHistory,
        };
      });

      setRecords(mappedRecords);
      setDepartments(Array.from(deptSet).sort());
    } catch (err: any) {
      console.error('[BiometricEnrolmentDirectory] Load error:', err);
      showToast(err.message || 'Could not load biometric enrolment data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, todayIst]);

  useEffect(() => {
    loadEnrolmentData();
  }, [loadEnrolmentData]);

  // Executive KPI summary
  const kpis = useMemo(() => {
    const total = records.length;
    const enrolled = records.filter((r) => r.isEnrolled).length;
    const pending = total - enrolled;
    const activeToday = records.filter((r) => r.activeToday).length;
    const enrolledRate = total > 0 ? ((enrolled / total) * 100).toFixed(1) : '0.0';

    // Batch Breakdown
    const batch20 = records.filter((r) => r.enrolledDate === '2026-11-20').length;
    const batch21 = records.filter((r) => r.enrolledDate === '2026-11-21').length;
    const batch23 = records.filter((r) => r.enrolledDate === '2026-11-23').length;
    const batch24 = records.filter((r) => r.enrolledDate === '2026-11-24').length;

    // OT earners
    const otEarners = records.filter((r) => r.totalOtMinutesNov20to24 > 0).length;
    const totalOtMinsSum = records.reduce((acc, r) => acc + r.totalOtMinutesNov20to24, 0);

    return {
      total,
      enrolled,
      pending,
      activeToday,
      enrolledRate,
      batch20,
      batch21,
      batch23,
      batch24,
      otEarners,
      totalOtFormatted: formatMinutesToHoursStr(totalOtMinsSum),
    };
  }, [records]);

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        // Tab filter
        if (activeTab === 'ENROLLED' && !r.isEnrolled) return false;
        if (activeTab === 'PENDING' && r.isEnrolled) return false;
        if (activeTab === 'ACTIVE_TODAY' && !r.activeToday) return false;
        if (activeTab === 'OVERTIME_WORKERS' && r.totalOtMinutesNov20to24 <= 0) return false;

        // Shift filter
        if (selectedShiftFilter !== 'ALL') {
          if (viewMode === 'SINGLE_DAY') {
            const dayD = r.dailyHistory[selectedSingleDate];
            if (dayD?.shiftCode !== selectedShiftFilter) return false;
          } else {
            // In 5-day matrix, matches if worker worked this shift on any day
            const hasShift = Object.values(r.dailyHistory).some((d) => d.shiftCode === selectedShiftFilter);
            if (!hasShift) return false;
          }
        }

        // Batch filter
        if (selectedBatchFilter !== 'ALL' && r.enrolmentBatch !== selectedBatchFilter) {
          return false;
        }

        // Department filter
        if (selectedDept !== 'ALL' && r.department !== selectedDept) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            r.displayName.toLowerCase().includes(q) ||
            r.employeeCode.toLowerCase().includes(q) ||
            r.biometricPin.includes(q) ||
            r.department.toLowerCase().includes(q) ||
            r.designation.toLowerCase().includes(q);
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'name') cmp = a.displayName.localeCompare(b.displayName);
        else if (sortField === 'code') cmp = a.employeeCode.localeCompare(b.employeeCode);
        else if (sortField === 'punches') cmp = a.totalPunches - b.totalPunches;
        else if (sortField === 'enrolled_date') cmp = (a.enrolledDate || '9999').localeCompare(b.enrolledDate || '9999');
        else if (sortField === 'ot') cmp = a.totalOtMinutesNov20to24 - b.totalOtMinutesNov20to24;
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [
    records,
    activeTab,
    selectedShiftFilter,
    selectedBatchFilter,
    selectedDept,
    searchQuery,
    sortField,
    sortDirection,
    viewMode,
    selectedSingleDate,
  ]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // --------------------------------------------------------------------------
  // MULTI-SHEET EXCEL EXPORT GENERATION (.xlsx)
  // --------------------------------------------------------------------------
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Joy PeopleHR Enterprise Biometrics';
      workbook.created = new Date();

      // Theme Palettes
      const headerFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF07563D' },
      };
      const subHeaderFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0B7A56' },
      };
      const zebraFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' },
      };

      // Sheet 1: 5-Day Master Attendance & Enrolment Matrix
      const matrixSheet = workbook.addWorksheet('5-Day Master Matrix');
      matrixSheet.views = [{ showGridLines: true }];

      matrixSheet.addRow([`${companyName} — 5-Day Biometric Enrolment & Attendance Master Matrix (Nov 20 to Nov 24, 2026)`]);
      matrixSheet.mergeCells('A1:P1');
      matrixSheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      matrixSheet.getCell('A1').fill = headerFill;
      matrixSheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      matrixSheet.getRow(1).height = 36;

      const matrixHeaders = [
        'S.No',
        'Employee ID',
        'Employee Name',
        'Department',
        'Machine PIN',
        'Enrolment Batch',
        'Enrolment Date',
        'Nov 20 (Fri)',
        'Nov 21 (Sat)',
        'Nov 22 (Sun)',
        'Nov 23 (Mon)',
        'Nov 24 (Tue - Today)',
        'Days Present',
        'Total OT Hours',
        'Lifetime Punches',
        'Latest Punch (IST)',
      ];
      matrixSheet.addRow(matrixHeaders);
      const hRow = matrixSheet.getRow(2);
      hRow.height = 26;
      hRow.eachCell((c) => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        c.fill = subHeaderFill;
        c.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      records.forEach((r, idx) => {
        const d20 = r.dailyHistory['2026-11-20'];
        const d21 = r.dailyHistory['2026-11-21'];
        const d22 = r.dailyHistory['2026-11-22'];
        const d23 = r.dailyHistory['2026-11-23'];
        const d24 = r.dailyHistory['2026-11-24'];

        const fmtDay = (d?: DayAttendanceDetail) => {
          if (!d || !d.firstCheckIn) return d?.status === 'Weekly Off' ? 'Weekly Off' : d?.status === 'Pending Enrolment' ? 'Pending Scan' : 'Absent';
          const inT = attendanceTimeService.formatAttendanceTime(d.firstCheckIn, 'Asia/Kolkata', false);
          const outT = d.lastCheckOut ? attendanceTimeService.formatAttendanceTime(d.lastCheckOut, 'Asia/Kolkata', false) : 'In Shift';
          const otPart = d.overtimeMinutes > 0 ? ` (+${Math.floor(d.overtimeMinutes / 60)}h ${d.overtimeMinutes % 60}m OT)` : '';
          return `${d.shiftCode}: ${inT} - ${outT}${otPart}`;
        };

        const row = matrixSheet.addRow([
          idx + 1,
          r.employeeCode,
          r.displayName,
          r.department,
          `#${r.biometricPin}`,
          r.enrolmentBatch,
          r.enrolledDateFormatted,
          fmtDay(d20),
          fmtDay(d21),
          fmtDay(d22),
          fmtDay(d23),
          fmtDay(d24),
          r.daysPresentCount,
          r.totalOtFormatted,
          r.totalPunches,
          r.latestPunchFormatted,
        ]);
        if (idx % 2 === 1) {
          row.eachCell((c) => (c.fill = zebraFill));
        }
      });

      matrixSheet.columns = [
        { width: 6 },
        { width: 14 },
        { width: 26 },
        { width: 22 },
        { width: 14 },
        { width: 20 },
        { width: 16 },
        { width: 30 },
        { width: 30 },
        { width: 20 },
        { width: 32 },
        { width: 32 },
        { width: 14 },
        { width: 16 },
        { width: 16 },
        { width: 22 },
      ];

      // Sheet 2: Enrolled Workforce (146)
      const enrolledSheet = workbook.addWorksheet('Enrolled Workforce (146)');
      enrolledSheet.addRow([`${companyName} — Biometric Enrolled Workforce on eSSL MB160 Terminal`]);
      enrolledSheet.mergeCells('A1:J1');
      enrolledSheet.getCell('A1').font = { size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      enrolledSheet.getCell('A1').fill = headerFill;
      enrolledSheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      enrolledSheet.getRow(1).height = 32;

      enrolledSheet.addRow([
        'S.No',
        'Employee ID',
        'Employee Name',
        'Department',
        'Machine PIN',
        'Enrolment Date',
        'Batch',
        'Total Punches',
        'Nov 20-24 Days Present',
        'Total OT Hours',
      ]);
      const ehRow = enrolledSheet.getRow(2);
      ehRow.height = 24;
      ehRow.eachCell((c) => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        c.fill = subHeaderFill;
      });

      records
        .filter((r) => r.isEnrolled)
        .forEach((r, idx) => {
          enrolledSheet.addRow([
            idx + 1,
            r.employeeCode,
            r.displayName,
            r.department,
            `#${r.biometricPin}`,
            r.enrolledDateFormatted,
            r.enrolmentBatch,
            r.totalPunches,
            r.daysPresentCount,
            r.totalOtFormatted,
          ]);
        });
      enrolledSheet.columns = [
        { width: 6 },
        { width: 14 },
        { width: 28 },
        { width: 22 },
        { width: 14 },
        { width: 18 },
        { width: 20 },
        { width: 16 },
        { width: 22 },
        { width: 18 },
      ];

      // Sheet 3: Pending Enrolment (71)
      const pendingSheet = workbook.addWorksheet('Pending Enrolment (71)');
      pendingSheet.addRow([`${companyName} — Employees Pending Biometric Machine Enrolment`]);
      pendingSheet.mergeCells('A1:F1');
      pendingSheet.getCell('A1').font = { size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      pendingSheet.getCell('A1').fill = headerFill;
      pendingSheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      pendingSheet.getRow(1).height = 32;

      pendingSheet.addRow(['S.No', 'Employee ID', 'Employee Name', 'Department', 'Machine PIN to Assign', 'Status']);
      const phRow = pendingSheet.getRow(2);
      phRow.height = 24;
      phRow.eachCell((c) => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        c.fill = subHeaderFill;
      });

      records
        .filter((r) => !r.isEnrolled)
        .forEach((r, idx) => {
          pendingSheet.addRow([
            idx + 1,
            r.employeeCode,
            r.displayName,
            r.department,
            `#${r.biometricPin}`,
            'Pending Physical Face/Finger Scan',
          ]);
        });
      pendingSheet.columns = [{ width: 6 }, { width: 14 }, { width: 28 }, { width: 24 }, { width: 24 }, { width: 34 }];

      // Download buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Electra_EV_Biometric_Enrolment_and_Attendance_Report_Nov20_to_Nov24.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      showToast('✓ Comprehensive Excel audit report exported successfully!', 'success');
    } catch (err: any) {
      console.error('[ExcelExport] Error:', err);
      showToast('Failed to export Excel report', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & METADATA */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-[#07563D] hover:underline font-bold mr-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Biometric Hub
                </button>
              )}
              <span>Hardware & Biometrics</span>
              <span>/</span>
              <span className="text-gray-900 font-bold">Enrolment & 5-Day Attendance Matrix</span>
              <Badge variant="emerald" size="sm" className="font-mono text-[9px]">
                SaaS Isolated Mode
              </Badge>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>Biometric Enrolment & Attendance Center</span>
              <span className="text-sm font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-normal">
                {companyName}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-4xl">
              Authoritative biometric machine user mapping and 5-day attendance audit (Nov 20 – Nov 24, 2026). Tracks staggered machine enrollment rollout, shift assignments (Shift 1, General, Shift 2, Shift 3), late arrivals, early check-ins, and overtime hours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('MATRIX_5DAY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'MATRIX_5DAY'
                    ? 'bg-white text-[#07563D] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                5-Day Matrix (Nov 20–24)
              </button>
              <button
                onClick={() => setViewMode('SINGLE_DAY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'SINGLE_DAY'
                    ? 'bg-white text-[#07563D] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Daily Detail
              </button>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={loadEnrolmentData}
              disabled={isLoading}
              className="gap-2 rounded-xl text-xs font-bold text-gray-700 bg-white border-gray-200 hover:bg-gray-50 h-10 px-3.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#07563D] ${isLoading ? 'animate-spin' : ''}`} />
              Sync Hardware
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleExportExcel}
              disabled={isExporting || records.length === 0}
              className="gap-2 rounded-xl text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-sm h-10 px-4"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export Complete Excel (.xlsx)'}
            </Button>
          </div>
        </div>

        {/* Staggered Rollout Context Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-bold text-emerald-950">Rollout Progression:</span>
            <span className="text-emerald-900">
              Biometric terminal onboarded <strong>Friday, Nov 20</strong>. Staggered enrollment rollout: <strong>74 enrolled on 20-Nov</strong>, <strong>26 on 21-Nov</strong>, <strong>46 on 23-Nov</strong> ({kpis.enrolledRate}% complete). Legitimate factory presence prior to scan is preserved cleanly.
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono font-bold text-emerald-900">
            <span>Plant Device: eSSL MB160 Main Gate</span>
            <span>•</span>
            <span>Cumulative Overtime: {kpis.totalOtFormatted}</span>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-2xl cursor-pointer transition-all border ${
            activeTab === 'ALL'
              ? 'border-[#07563D] bg-emerald-50/20 shadow-sm ring-1 ring-[#07563D]'
              : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Headcount</p>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{kpis.total}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Electra EV Master Roster</p>
        </Card>

        <Card
          onClick={() => setActiveTab('ENROLLED')}
          className={`p-4 rounded-2xl cursor-pointer transition-all border ${
            activeTab === 'ENROLLED'
              ? 'border-emerald-600 bg-emerald-50/20 shadow-sm ring-1 ring-emerald-600'
              : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Biometric Enrolled</p>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-1 font-mono">{kpis.enrolled}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-semibold">{kpis.enrolledRate}% machine verified</p>
        </Card>

        <Card
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 rounded-2xl cursor-pointer transition-all border ${
            activeTab === 'PENDING'
              ? 'border-amber-600 bg-amber-50/20 shadow-sm ring-1 ring-amber-600'
              : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending Enrolment</p>
            <UserX className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1 font-mono">{kpis.pending}</p>
          <p className="text-[11px] text-amber-600 mt-0.5 font-semibold">Scheduled for mapping</p>
        </Card>

        <Card
          onClick={() => setActiveTab('ACTIVE_TODAY')}
          className={`p-4 rounded-2xl cursor-pointer transition-all border ${
            activeTab === 'ACTIVE_TODAY'
              ? 'border-teal-600 bg-teal-50/20 shadow-sm ring-1 ring-teal-600'
              : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Active Today (Nov 24)</p>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-800 mt-1 font-mono">{kpis.activeToday}</p>
          <p className="text-[11px] text-teal-600 mt-0.5 font-semibold">Verified punches today</p>
        </Card>

        <Card
          onClick={() => setActiveTab('OVERTIME_WORKERS')}
          className={`p-4 rounded-2xl cursor-pointer transition-all border ${
            activeTab === 'OVERTIME_WORKERS'
              ? 'border-amber-600 bg-amber-50/20 shadow-sm ring-1 ring-amber-600'
              : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Overtime Earners</p>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-1 font-mono">{kpis.otEarners}</p>
          <p className="text-[11px] text-amber-700 mt-0.5 font-semibold font-mono">Total {kpis.totalOtFormatted}</p>
        </Card>
      </div>

      {/* 3. CONTROLS, SHIFT FILTERS & BATCH SELECTORS */}
      <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'ALL', label: `All Employees (${kpis.total})` },
              { id: 'ENROLLED', label: `Enrolled (${kpis.enrolled})` },
              { id: 'PENDING', label: `Pending Enrolment (${kpis.pending})` },
              { id: 'ACTIVE_TODAY', label: `Active Today (${kpis.activeToday})` },
              { id: 'OVERTIME_WORKERS', label: `With Overtime (${kpis.otEarners})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Single Day Date Picker (when in SINGLE_DAY mode) */}
          {viewMode === 'SINGLE_DAY' && (
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase px-2">Date:</span>
              {AUDIT_DATES.map((ad) => (
                <button
                  key={ad.key}
                  onClick={() => setSelectedSingleDate(ad.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                    selectedSingleDate === ad.key ? 'bg-white text-[#07563D] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {ad.label}
                </button>
              ))}
            </div>
          )}

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Shift Filter */}
            <select
              value={selectedShiftFilter}
              onChange={(e) => {
                setSelectedShiftFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D] bg-white font-semibold text-gray-700"
            >
              <option value="ALL">All Plant Shifts</option>
              <option value="SHIFT-1">Shift 1 (06:00 - 14:30)</option>
              <option value="GEN-01">General Shift (08:30 - 17:00)</option>
              <option value="SHIFT-2">Shift 2 (14:30 - 23:00)</option>
              <option value="SHIFT-3">Shift 3 (23:00 - 06:00)</option>
            </select>

            {/* Enrolment Batch Filter */}
            <select
              value={selectedBatchFilter}
              onChange={(e) => {
                setSelectedBatchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D] bg-white font-semibold text-gray-700"
            >
              <option value="ALL">All Enrolment Batches</option>
              <option value="Batch 1 (20-Nov)">Batch 1: 20-Nov (74 enrolled)</option>
              <option value="Batch 2 (21-Nov)">Batch 2: 21-Nov (26 enrolled)</option>
              <option value="Batch 3 (23-Nov)">Batch 3: 23-Nov (46 enrolled)</option>
              <option value="Pending">Pending Enrolment (71)</option>
            </select>

            {/* Department */}
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D] bg-white text-gray-700"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search name, code, PIN..."
                className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 4. ENTERPRISE DATA TABLE */}
      <Card className="p-0 bg-white border border-gray-200/80 rounded-3xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'MATRIX_5DAY' ? (
            /* 5-DAY MATRIX VIEW */
            <Table>
              <TableHeader className="bg-gray-50/90 border-b border-gray-200 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 pl-5 w-[60px]">S.No</TableHead>
                  <TableHead
                    onClick={() => handleSort('code')}
                    className="text-[10px] font-black uppercase text-gray-500 cursor-pointer hover:text-gray-900 w-[110px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Emp ID</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('name')}
                    className="text-[10px] font-black uppercase text-gray-500 cursor-pointer hover:text-gray-900 min-w-[190px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Employee & Role</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 w-[100px]">Machine PIN</TableHead>
                  <TableHead
                    onClick={() => handleSort('enrolled_date')}
                    className="text-[10px] font-black uppercase text-gray-500 cursor-pointer hover:text-gray-900 w-[130px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Enrolment</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-600 min-w-[150px]">20-Nov (Fri)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-600 min-w-[150px]">21-Nov (Sat)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-600 min-w-[110px]">22-Nov (Sun)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-600 min-w-[170px]">23-Nov (Mon)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-emerald-800 min-w-[170px] bg-emerald-50/50">24-Nov (Today)</TableHead>
                  <TableHead
                    onClick={() => handleSort('ot')}
                    className="text-[10px] font-black uppercase text-amber-800 cursor-pointer hover:text-amber-900 text-right pr-6 w-[120px]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total OT</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-gray-500 text-xs">
                      No employee records match the active filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((r, index) => {
                    const sNo = (currentPage - 1) * pageSize + index + 1;
                    const d20 = r.dailyHistory['2026-11-20'];
                    const d21 = r.dailyHistory['2026-11-21'];
                    const d22 = r.dailyHistory['2026-11-22'];
                    const d23 = r.dailyHistory['2026-11-23'];
                    const d24 = r.dailyHistory['2026-11-24'];

                    const renderDayCell = (d?: DayAttendanceDetail, isTodayCell = false) => {
                      if (!d || !d.firstCheckIn) {
                        if (d?.status === 'Weekly Off') {
                          return <span className="text-[10px] text-gray-400 font-semibold italic">Weekly Off</span>;
                        }
                        if (d?.status === 'Pending Enrolment') {
                          return <span className="text-[10px] text-amber-600/80 font-medium">Pending Scan</span>;
                        }
                        return <span className="text-[10px] text-gray-300 font-mono">—</span>;
                      }

                      const inTime = attendanceTimeService.formatAttendanceTime(d.firstCheckIn, 'Asia/Kolkata', false);
                      const outTime = d.lastCheckOut
                        ? attendanceTimeService.formatAttendanceTime(d.lastCheckOut, 'Asia/Kolkata', false)
                        : (isTodayCell ? 'In Shift' : 'Missing Out');

                      return (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-[9px] bg-gray-100 text-gray-800 px-1 py-0.2 rounded border border-gray-200 shrink-0">
                              {d.shiftCode}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-gray-900 whitespace-nowrap">
                              {inTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
                            <span>out: {outTime}</span>
                            {d.overtimeMinutes > 0 && (
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1 rounded border border-amber-200">
                                {d.overtimeFormatted}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <TableRow key={r.employeeId} className="hover:bg-emerald-50/30 transition-colors text-xs border-b border-gray-100">
                        {/* S.No */}
                        <TableCell className="pl-5 font-mono text-gray-400 font-semibold">{sNo}</TableCell>

                        {/* Emp ID */}
                        <TableCell>
                          <Badge variant="gray" size="sm" className="font-mono text-[10px] font-bold">
                            {r.employeeCode}
                          </Badge>
                        </TableCell>

                        {/* Name & Role */}
                        <TableCell>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate">{r.displayName}</span>
                            <span className="text-[10px] text-gray-400 block truncate">
                              {r.department} &bull; {r.designation}
                            </span>
                          </div>
                        </TableCell>

                        {/* PIN */}
                        <TableCell>
                          <span className="font-mono font-bold text-gray-700 text-xs">#{r.biometricPin}</span>
                        </TableCell>

                        {/* Enrolment Status */}
                        <TableCell>
                          {r.isEnrolled ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                {r.enrolledDateFormatted}
                              </span>
                              <span className="block text-[9px] text-gray-400 mt-0.5 font-medium">{r.enrolmentBatch}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                              <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                              Pending
                            </span>
                          )}
                        </TableCell>

                        {/* 20-Nov */}
                        <TableCell>{renderDayCell(d20)}</TableCell>

                        {/* 21-Nov */}
                        <TableCell>{renderDayCell(d21)}</TableCell>

                        {/* 22-Nov */}
                        <TableCell>{renderDayCell(d22)}</TableCell>

                        {/* 23-Nov */}
                        <TableCell>{renderDayCell(d23)}</TableCell>

                        {/* 24-Nov (Today) */}
                        <TableCell className="bg-emerald-50/20">{renderDayCell(d24, true)}</TableCell>

                        {/* Total OT */}
                        <TableCell className="text-right pr-6 font-mono font-bold">
                          {r.totalOtMinutesNov20to24 > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                              {r.totalOtFormatted}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          ) : (
            /* SINGLE DAY DEEP-DIVE VIEW */
            <Table>
              <TableHeader className="bg-gray-50/90 border-b border-gray-200 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 pl-5 w-[60px]">S.No</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 w-[110px]">Emp ID</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 min-w-[200px]">Employee Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 min-w-[150px]">Department</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 min-w-[180px]">Shift & Hours</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 min-w-[120px]">Check-In</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 min-w-[120px]">Check-Out</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 min-w-[140px]">Timing & OT</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 w-[120px]">Net Work</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 text-right pr-6 w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-gray-500 text-xs">
                      No records match the active criteria for {selectedSingleDate}.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((r, index) => {
                    const sNo = (currentPage - 1) * pageSize + index + 1;
                    const dayD = r.dailyHistory[selectedSingleDate];
                    const inTime = dayD?.firstCheckIn
                      ? attendanceTimeService.formatAttendanceTime(dayD.firstCheckIn, 'Asia/Kolkata', true)
                      : null;
                    const outTime = dayD?.lastCheckOut
                      ? attendanceTimeService.formatAttendanceTime(dayD.lastCheckOut, 'Asia/Kolkata', true)
                      : null;

                    return (
                      <TableRow key={r.employeeId} className="hover:bg-emerald-50/30 transition-colors text-xs border-b border-gray-100">
                        {/* S.No */}
                        <TableCell className="pl-5 font-mono text-gray-400 font-semibold">{sNo}</TableCell>

                        {/* ID */}
                        <TableCell>
                          <Badge variant="gray" size="sm" className="font-mono text-[10px] font-bold">
                            {r.employeeCode}
                          </Badge>
                        </TableCell>

                        {/* Name */}
                        <TableCell>
                          <div>
                            <span className="font-bold text-gray-900 block">{r.displayName}</span>
                            <span className="text-[10px] text-gray-400">PIN: #{r.biometricPin}</span>
                          </div>
                        </TableCell>

                        {/* Dept */}
                        <TableCell className="font-semibold text-gray-800">{r.department}</TableCell>

                        {/* Shift & Hours */}
                        <TableCell>
                          {dayD?.shiftCode && dayD.shiftCode !== '—' ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                  {dayD.shiftCode}
                                </span>
                                <span className="font-mono text-gray-600 text-xs">{dayD.shiftHours}</span>
                              </div>
                              <span className="text-[10px] text-gray-400 block">{dayD.shiftName}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 font-mono">—</span>
                          )}
                        </TableCell>

                        {/* Check-In */}
                        <TableCell>
                          {inTime ? (
                            <div className="font-mono font-bold text-gray-900 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              {inTime}
                            </div>
                          ) : (
                            <span className="text-gray-300 font-mono">—</span>
                          )}
                        </TableCell>

                        {/* Check-Out */}
                        <TableCell>
                          {outTime ? (
                            <div className="font-mono font-bold text-gray-900 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {outTime}
                            </div>
                          ) : dayD?.firstCheckIn && selectedSingleDate === '2026-11-24' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              In Shift
                            </span>
                          ) : (
                            <span className="text-gray-300 font-mono">—</span>
                          )}
                        </TableCell>

                        {/* Timing & OT */}
                        <TableCell>
                          {dayD?.firstCheckIn ? (
                            <div className="flex flex-col items-start gap-0.5">
                              {dayD.lateMinutes > 0 ? (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Late {formatDeviationDuration(dayD.lateMinutes)}
                                </span>
                              ) : dayD.earlyArrivalMinutes >= 30 ? (
                                <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                                  Early In {formatDeviationDuration(dayD.earlyArrivalMinutes)}
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  On Time
                                </span>
                              )}

                              {dayD.overtimeMinutes > 0 && (
                                <span className="text-[9.5px] font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                  {dayD.overtimeFormatted}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 font-mono">—</span>
                          )}
                        </TableCell>

                        {/* Net Work */}
                        <TableCell className="font-mono font-bold text-gray-800">
                          {dayD?.workMinutes && dayD.workMinutes > 0 ? (
                            formatMinutesToHoursStr(dayD.workMinutes)
                          ) : dayD?.firstCheckIn && selectedSingleDate === '2026-11-24' ? (
                            <span className="text-emerald-700 text-[10px]">Live</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-right pr-6">
                          {dayD?.status === 'Working' ? (
                            <Badge variant="emerald" size="sm" className="font-bold">
                              Working
                            </Badge>
                          ) : dayD?.status === 'Present' || dayD?.status === 'Late' ? (
                            <Badge variant="emerald" size="sm" className="font-bold">
                              Present
                            </Badge>
                          ) : dayD?.status === 'Weekly Off' ? (
                            <Badge variant="gray" size="sm">
                              Weekly Off
                            </Badge>
                          ) : dayD?.status === 'Pending Enrolment' ? (
                            <Badge variant="amber" size="sm" className="font-medium text-[9.5px]">
                              Pending Scan
                            </Badge>
                          ) : (
                            <Badge variant="red" size="sm">
                              Absent
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* PAGINATION BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gray-50/80 border-t border-gray-200 text-xs">
          <div className="text-gray-500">
            Showing <strong className="text-gray-900 font-mono">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-gray-900 font-mono">
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </strong>{' '}
            of <strong className="text-gray-900 font-mono">{filteredRecords.length}</strong> workforce records
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-xs font-bold rounded-lg h-8 px-3"
            >
              Previous
            </Button>
            <span className="font-mono text-gray-700 font-bold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs font-bold rounded-lg h-8 px-3"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
