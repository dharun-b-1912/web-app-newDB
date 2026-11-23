// src/features/attendance/subviews/BiometricEnrolmentDirectoryView.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Biometric Enrolment Directory & Workforce Audit
// Multi-Tenant Isolated • Live Hardware Correlation • Real-time Stats • Excel Export
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
  ExternalLink,
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
import ExcelJS from 'exceljs';

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
  totalPunches: number;
  firstPunchAt: string | null;
  firstPunchFormatted: string;
  latestPunchAt: string | null;
  latestPunchFormatted: string;
  activeToday: boolean;
  todayPunchesCount: number;
  todayFirstPunch: string | null;
  todayLatestPunch: string | null;
  verificationModes: string[];
}

interface BiometricEnrolmentDirectoryViewProps {
  onBack?: () => void;
  onNavigateToTerminalLogs?: (employeeId?: string) => void;
}

export const BiometricEnrolmentDirectoryView: React.FC<BiometricEnrolmentDirectoryViewProps> = ({
  onBack,
  onNavigateToTerminalLogs,
}) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [companyName, setCompanyName] = useState('Organization');

  // Master records
  const [records, setRecords] = useState<EnrolmentRecord[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // Filtering & search
  const [activeTab, setActiveTab] = useState<'ALL' | 'ENROLLED' | 'ACTIVE_TODAY' | 'ABSENT_TODAY' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'name' | 'code' | 'punches' | 'latest'>('latest');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Today in IST
  const todayIst = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  }, []);

  // Load live data from Supabase & API scoped to active tenant
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

      // 2. Fetch all employees for this tenant
      let empList: Employee[] = [];
      try {
        empList = await api.getEmployees({ organizationId: orgId, skipEnrichment: true });
      } catch (err) {
        console.warn('[EnrolmentDirectory] api.getEmployees fallback:', err);
      }

      if ((!empList || empList.length === 0) && client) {
        const { data: rawEmps } = await client
          .from('employees')
          .select('id, employee_code, display_name, first_name, last_name, department_id, designation_id, employment_status, employment_type')
          .eq('organization_id', orgId);
        empList = (rawEmps || []) as any;
      }

      // Department lookup map
      let deptMap = new Map<string, string>();
      if (client) {
        const { data: depts } = await client.from('departments').select('id, name').eq('organization_id', orgId);
        if (depts) {
          depts.forEach((d: any) => deptMap.set(d.id, d.name));
        }
      }

      // 3. Fetch all biometric punches for this organization
      let punches: any[] = [];
      if (client) {
        const { data: punchData, error: punchErr } = await client
          .from('attendance_punches')
          .select('id, employee_id, device_id, punch_time, punch_type, verification_mode, punch_source, attendance_date')
          .eq('organization_id', orgId)
          .order('punch_time', { ascending: true });

        if (!punchErr && punchData) {
          punches = punchData;
        }
      }

      // 4. Map punches per employee
      const punchStats = new Map<string, {
        total: number;
        firstPunch: string;
        latestPunch: string;
        modes: Set<string>;
        todayPunches: string[];
      }>();

      // Correlate punches
      for (const p of punches) {
        const empId = p.employee_id;
        if (!empId) continue;

        const pTime = p.punch_time;
        if (!pTime) continue;

        // Check if punch is today in IST
        let punchDate = p.attendance_date;
        if (!punchDate) {
          punchDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(pTime));
        }
        const isToday = punchDate === todayIst;

        if (!punchStats.has(empId)) {
          punchStats.set(empId, {
            total: 0,
            firstPunch: pTime,
            latestPunch: pTime,
            modes: new Set(),
            todayPunches: [],
          });
        }

        const stat = punchStats.get(empId)!;
        stat.total += 1;
        if (p.verification_mode) stat.modes.add(p.verification_mode);
        if (new Date(pTime) < new Date(stat.firstPunch)) stat.firstPunch = pTime;
        if (new Date(pTime) > new Date(stat.latestPunch)) stat.latestPunch = pTime;
        if (isToday) stat.todayPunches.push(pTime);
      }

      // 5. Build Enrolment Records
      const deptSet = new Set<string>();
      const mappedRecords: EnrolmentRecord[] = empList.map((emp) => {
        const stat = punchStats.get(emp.id);
        const isEnrolled = !!stat && stat.total > 0;
        const totalPunches = stat ? stat.total : 0;
        const firstPunchAt = stat ? stat.firstPunch : null;
        const latestPunchAt = stat ? stat.latestPunch : null;

        const todayPunches = stat ? stat.todayPunches : [];
        const activeToday = todayPunches.length > 0;
        const todayFirstPunch = todayPunches.length > 0 ? todayPunches[0] : null;
        const todayLatestPunch = todayPunches.length > 0 ? todayPunches[todayPunches.length - 1] : null;

        // Format dates in IST
        const firstPunchFormatted = firstPunchAt
          ? new Date(firstPunchAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' +
            attendanceTimeService.formatAttendanceTime(firstPunchAt, 'Asia/Kolkata', true)
          : '—';

        const latestPunchFormatted = latestPunchAt
          ? new Date(latestPunchAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) +
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
          displayName: emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee',
          department: deptName,
          designation: (emp as any).designation_title || (emp as any).designation || 'Staff',
          employmentStatus: emp.employment_status || (emp as any).status || 'Active',
          employmentType: emp.employment_type || 'Full Time',
          biometricPin: pin,
          isEnrolled,
          totalPunches,
          firstPunchAt,
          firstPunchFormatted,
          latestPunchAt,
          latestPunchFormatted,
          activeToday,
          todayPunchesCount: todayPunches.length,
          todayFirstPunch,
          todayLatestPunch,
          verificationModes: stat ? Array.from(stat.modes) : [],
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

  // Real-time listener for incoming punches from devices
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const orgId = getActiveOrgId();

    const channel = supabase
      .channel(`biometric-enrolment-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_punches',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          loadEnrolmentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEnrolmentData]);

  // Executive KPI summary calculations
  const kpis = useMemo(() => {
    const total = records.length;
    const enrolled = records.filter((r) => r.isEnrolled).length;
    const pending = total - enrolled;
    const activeToday = records.filter((r) => r.activeToday).length;
    const absentToday = records.filter((r) => r.isEnrolled && !r.activeToday).length;
    const enrolledRate = total > 0 ? ((enrolled / total) * 100).toFixed(1) : '0.0';
    const activeRate = enrolled > 0 ? ((activeToday / enrolled) * 100).toFixed(1) : '0.0';

    return {
      total,
      enrolled,
      pending,
      activeToday,
      absentToday,
      enrolledRate,
      activeRate,
    };
  }, [records]);

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        // Tab filter
        if (activeTab === 'ENROLLED' && !r.isEnrolled) return false;
        if (activeTab === 'ACTIVE_TODAY' && !r.activeToday) return false;
        if (activeTab === 'ABSENT_TODAY' && (!r.isEnrolled || r.activeToday)) return false;
        if (activeTab === 'PENDING' && r.isEnrolled) return false;

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
        if (sortField === 'name') {
          cmp = a.displayName.localeCompare(b.displayName);
        } else if (sortField === 'code') {
          cmp = a.employeeCode.localeCompare(b.employeeCode);
        } else if (sortField === 'punches') {
          cmp = a.totalPunches - b.totalPunches;
        } else if (sortField === 'latest') {
          const timeA = a.latestPunchAt ? new Date(a.latestPunchAt).getTime() : 0;
          const timeB = b.latestPunchAt ? new Date(b.latestPunchAt).getTime() : 0;
          cmp = timeA - timeB;
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [records, activeTab, selectedDept, searchQuery, sortField, sortDirection]);

  // Paginated Rows
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Toggle Sorting
  const handleSort = (field: 'name' | 'code' | 'punches' | 'latest') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // ==========================================================================
  // EXPORT COMPREHENSIVE MULTI-SHEET EXCEL REPORT
  // ==========================================================================
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Joy PeopleHR Biometric System';
      workbook.created = new Date();

      const headerFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF07563D' },
      };
      const headerFont: Partial<ExcelJS.Font> = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      const subHeaderFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FDF4' },
      };

      // -------------------------------------------------------------
      // Sheet 1: Executive Summary
      // -------------------------------------------------------------
      const summarySheet = workbook.addWorksheet('Enrolment Summary');
      summarySheet.views = [{ showGridLines: true }];

      summarySheet.addRow([`${companyName} — Biometric Terminal Enrolment Audit`]);
      summarySheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF07563D' } };
      summarySheet.addRow([`Report Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`]);
      summarySheet.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF555555' } };
      summarySheet.addRow([]);

      summarySheet.addRow(['Metric', 'Count / Value', 'Percentage / Details']);
      const sHRow = summarySheet.getRow(4);
      sHRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      summarySheet.addRow(['Total Workforce', kpis.total, '100% Registered in HR Master']);
      summarySheet.addRow(['Enrolled on Biometric Terminal', kpis.enrolled, `${kpis.enrolledRate}% Enrolment Rate`]);
      summarySheet.addRow(['Pending Terminal Enrolment', kpis.pending, `${(100 - Number(kpis.enrolledRate)).toFixed(1)}% Pending Physical Scan`]);
      summarySheet.addRow(['Active on Site Today', kpis.activeToday, `${kpis.activeRate}% of Enrolled Workforce`]);
      summarySheet.addRow(['Enrolled Absent Today', kpis.absentToday, `${(100 - Number(kpis.activeRate)).toFixed(1)}% of Enrolled Workforce`]);

      summarySheet.columns = [
        { width: 34 },
        { width: 22 },
        { width: 38 },
      ];

      // -------------------------------------------------------------
      // Helper function to build detailed table sheets
      // -------------------------------------------------------------
      const buildSheet = (
        sheetName: string,
        title: string,
        rows: EnrolmentRecord[],
        includeTodayPunches = false
      ) => {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.views = [{ showGridLines: true }];

        sheet.addRow([title]);
        sheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF07563D' } };
        sheet.addRow([`Tenant: ${companyName} | Total Records: ${rows.length} | Audit Date: ${todayIst}`]);
        sheet.getCell('A2').font = { size: 9, italic: true, color: { argb: 'FF666666' } };
        sheet.addRow([]);

        const headers = [
          'S.No',
          'Employee ID',
          'Employee Name',
          'Department',
          'Designation',
          'Machine User ID (PIN)',
          'Enrolment Status',
          'First Enrolment Punch',
          'Latest Terminal Punch',
          'Lifetime Punches',
          includeTodayPunches ? "Today's Status" : 'HR Status',
        ];

        const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell) => {
          cell.fill = headerFill;
          cell.font = headerFont;
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        rows.forEach((r, idx) => {
          const rowData = [
            idx + 1,
            r.employeeCode,
            r.displayName,
            r.department,
            r.designation,
            r.biometricPin,
            r.isEnrolled ? 'ENROLLED' : 'PENDING',
            r.firstPunchFormatted,
            r.latestPunchFormatted,
            r.totalPunches,
            includeTodayPunches
              ? r.activeToday
                ? `ACTIVE TODAY (${r.todayPunchesCount} punches)`
                : 'ABSENT TODAY'
              : r.employmentStatus,
          ];
          const row = sheet.addRow(rowData);
          row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Segoe UI', size: 10 };
            if (colNumber === 1 || colNumber === 6 || colNumber === 10) {
              cell.alignment = { horizontal: 'center' };
            }
          });
        });

        sheet.columns = [
          { width: 8 },
          { width: 16 },
          { width: 28 },
          { width: 22 },
          { width: 24 },
          { width: 24 },
          { width: 18 },
          { width: 26 },
          { width: 26 },
          { width: 18 },
          { width: 26 },
        ];
      };

      // -------------------------------------------------------------
      // Sheet 2: All Enrolled Employees
      // -------------------------------------------------------------
      const enrolledRows = records.filter((r) => r.isEnrolled);
      buildSheet('All Enrolled', `${companyName} — All Enrolled Employees on Terminal`, enrolledRows, true);

      // -------------------------------------------------------------
      // Sheet 3: Active Today
      // -------------------------------------------------------------
      const activeRows = records.filter((r) => r.activeToday);
      buildSheet('Active Today', `${companyName} — Active Employees on Site Today (${todayIst})`, activeRows, true);

      // -------------------------------------------------------------
      // Sheet 4: Enrolled Absent Today
      // -------------------------------------------------------------
      const absentRows = records.filter((r) => r.isEnrolled && !r.activeToday);
      buildSheet('Enrolled Absent Today', `${companyName} — Enrolled Employees Absent Today (${todayIst})`, absentRows, true);

      // -------------------------------------------------------------
      // Sheet 5: Pending Terminal Enrolment
      // -------------------------------------------------------------
      const pendingRows = records.filter((r) => !r.isEnrolled);
      buildSheet('Pending Enrolment', `${companyName} — Employees Pending Terminal Enrolment`, pendingRows, false);

      // Trigger browser download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const safeCompName = companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
      anchor.download = `${safeCompName}_Biometric_Enrolment_Report_${todayIst}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      showToast(`✓ Excel report successfully exported: ${anchor.download}`, 'success');
    } catch (err: any) {
      console.error('[BiometricEnrolmentDirectory] Excel export failed:', err);
      showToast(err.message || 'Failed to export Excel report', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <span className="text-gray-900 font-bold">Biometric Enrolment Directory</span>
              <Badge variant="emerald" size="sm" className="font-mono text-[9px]">
                SaaS Isolated Mode
              </Badge>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>Biometric Terminal Enrolment Center</span>
              <span className="text-sm font-semibold text-gray-500 font-normal">({companyName})</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Authoritative biometric machine user mapping • Audit enrolled vs pending workforce, verify machine PINs, track active site presence, and export compliance reports.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={loadEnrolmentData}
              disabled={isLoading}
              className="gap-2 rounded-xl text-xs font-bold text-gray-700 bg-white border-gray-200 hover:bg-gray-50 h-10 px-4"
            >
              <RefreshCw className={`w-4 h-4 text-[#07563D] ${isLoading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleExportExcel}
              disabled={isExporting || records.length === 0}
              className="gap-2 rounded-xl text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-sm h-10 px-4"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export Excel (.xlsx)'}
            </Button>
          </div>
        </div>

        {/* Live Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-950">Hardware Synchronization:</span>
            <span className="text-emerald-800">
              Live bi-directional synchronization active for <strong>{companyName}</strong>.
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-emerald-900">
            <span>Audit Date: <strong className="font-mono">{todayIst}</strong></span>
            <span>Enrolment Health: <strong className="font-mono text-emerald-700">{kpis.enrolledRate}% Enrolled</strong></span>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-2xl cursor-pointer transition-all border ${
            activeTab === 'ALL' ? 'border-[#07563D] bg-emerald-50/20 shadow-sm ring-1 ring-[#07563D]' : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Workforce</p>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{kpis.total}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Master employee database</p>
        </Card>

        <Card
          onClick={() => setActiveTab('ENROLLED')}
          className={`p-4 rounded-2xl cursor-pointer transition-all border ${
            activeTab === 'ENROLLED' ? 'border-emerald-600 bg-emerald-50/20 shadow-sm ring-1 ring-emerald-600' : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Enrolled on Terminal</p>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-1 font-mono">{kpis.enrolled}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-semibold">{kpis.enrolledRate}% of total workforce</p>
        </Card>

        <Card
          onClick={() => setActiveTab('ACTIVE_TODAY')}
          className={`p-4 rounded-2xl cursor-pointer transition-all border ${
            activeTab === 'ACTIVE_TODAY' ? 'border-teal-600 bg-teal-50/20 shadow-sm ring-1 ring-teal-600' : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Active Today</p>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-800 mt-1 font-mono">{kpis.activeToday}</p>
          <p className="text-[11px] text-teal-600 mt-0.5 font-semibold">Punched today ({todayIst})</p>
        </Card>

        <Card
          onClick={() => setActiveTab('ABSENT_TODAY')}
          className={`p-4 rounded-2xl cursor-pointer transition-all border ${
            activeTab === 'ABSENT_TODAY' ? 'border-amber-600 bg-amber-50/20 shadow-sm ring-1 ring-amber-600' : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Enrolled Absent Today</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800 mt-1 font-mono">{kpis.absentToday}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Enrolled, no punch today</p>
        </Card>

        <Card
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 rounded-2xl cursor-pointer transition-all border ${
            activeTab === 'PENDING' ? 'border-red-600 bg-red-50/20 shadow-sm ring-1 ring-red-600' : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Pending Enrolment</p>
            <UserX className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-700 mt-1 font-mono">{kpis.pending}</p>
          <p className="text-[11px] text-red-600 mt-0.5">Not yet scanned on terminal</p>
        </Card>
      </div>

      {/* 3. FILTER & SEARCH BAR */}
      <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'ALL', label: `All Employees (${kpis.total})` },
              { id: 'ENROLLED', label: `Enrolled (${kpis.enrolled})` },
              { id: 'ACTIVE_TODAY', label: `Active Today (${kpis.activeToday})` },
              { id: 'ABSENT_TODAY', label: `Absent Today (${kpis.absentToday})` },
              { id: 'PENDING', label: `Pending Enrolment (${kpis.pending})` },
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

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search name, PIN, code..."
                className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>

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

            {/* Rows Per Page */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D] bg-white font-mono font-bold text-gray-700"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={250}>250 / page</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 4. ENTERPRISE ENROLMENT AUDIT TABLE */}
      <Card className="p-0 bg-white border border-gray-200/80 rounded-3xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/80 border-b border-gray-200">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase text-gray-500 pl-6 w-[70px]">S.No</TableHead>
                <TableHead
                  onClick={() => handleSort('code')}
                  className="text-[10px] font-black uppercase text-gray-500 cursor-pointer hover:text-gray-900 w-[130px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Employee ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('name')}
                  className="text-[10px] font-black uppercase text-gray-500 cursor-pointer hover:text-gray-900 min-w-[200px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Employee Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase text-gray-500 min-w-[150px]">
                  Department & Role
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase text-gray-500 w-[150px]">
                  Machine PIN / User ID
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase text-gray-500 w-[140px]">
                  Enrolment Status
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase text-gray-500 min-w-[170px]">
                  First Terminal Scan
                </TableHead>
                <TableHead
                  onClick={() => handleSort('latest')}
                  className="text-[10px] font-black uppercase text-gray-500 cursor-pointer hover:text-gray-900 min-w-[170px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Latest Punch (IST)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('punches')}
                  className="text-[10px] font-black uppercase text-gray-500 text-center cursor-pointer hover:text-gray-900 w-[110px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Punches</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase text-gray-500 text-right pr-6 w-[130px]">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-gray-500 text-xs">
                    No workforce records match your active search or filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((r, index) => {
                  const sNo = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <TableRow key={r.employeeId} className="hover:bg-emerald-50/40 transition-colors text-xs">
                      {/* S.No */}
                      <TableCell className="pl-6 font-mono text-gray-400 font-semibold">{sNo}</TableCell>

                      {/* Employee Code */}
                      <TableCell>
                        <Badge variant="gray" size="sm" className="font-mono text-[10px] font-bold">
                          {r.employeeCode}
                        </Badge>
                      </TableCell>

                      {/* Employee Name */}
                      <TableCell>
                        <div>
                          <span className="font-bold text-gray-900 block">{r.displayName}</span>
                          <span className="text-[10px] text-gray-400 block">{r.employmentType}</span>
                        </div>
                      </TableCell>

                      {/* Department & Role */}
                      <TableCell>
                        <div>
                          <span className="font-semibold text-gray-800 block">{r.department}</span>
                          <span className="text-[10px] text-gray-400 block">{r.designation}</span>
                        </div>
                      </TableCell>

                      {/* Machine User ID / PIN */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono">
                          <Cpu className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-bold text-gray-900">#{r.biometricPin}</span>
                        </div>
                      </TableCell>

                      {/* Enrolment Status */}
                      <TableCell>
                        {r.isEnrolled ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ENROLLED
                            </span>
                            {r.activeToday ? (
                              <span className="block text-[9px] font-bold text-teal-700">
                                ● Active Today ({r.todayPunchesCount} punches)
                              </span>
                            ) : (
                              <span className="block text-[9px] text-amber-700 font-medium">
                                Absent Today
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            PENDING SCAN
                          </span>
                        )}
                      </TableCell>

                      {/* First Enrolment Punch */}
                      <TableCell className="font-mono text-gray-600 text-[11px]">
                        {r.firstPunchFormatted}
                      </TableCell>

                      {/* Latest Terminal Punch */}
                      <TableCell className="font-mono text-gray-900 font-semibold text-[11px]">
                        {r.latestPunchFormatted}
                      </TableCell>

                      {/* Lifetime Punches */}
                      <TableCell className="text-center font-mono">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          r.totalPunches > 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {r.totalPunches}
                        </span>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right pr-6">
                        {r.isEnrolled && onNavigateToTerminalLogs ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onNavigateToTerminalLogs(r.employeeId)}
                            className="text-xs font-semibold text-[#07563D] hover:bg-emerald-50 gap-1"
                          >
                            <span>Ledger</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No logs</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 5. TABLE PAGINATION FOOTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50/80 border-t border-gray-200 text-xs text-gray-600">
          <div>
            Showing <strong className="font-mono font-bold text-gray-900">{filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="font-mono font-bold text-gray-900">{Math.min(currentPage * pageSize, filteredRecords.length)}</strong> of{' '}
            <strong className="font-mono font-bold text-gray-900">{filteredRecords.length}</strong> employees
            {filteredRecords.length !== records.length && (
              <span className="text-gray-400"> (filtered from {records.length} total)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg font-bold"
            >
              Previous
            </Button>
            <span className="font-mono text-xs font-bold text-gray-800 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg font-bold"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

