// src/features/attendance/subviews/AttendanceReportsView.tsx
// ============================================================================
// JOY PeopleHR — Enterprise Attendance MIS, Workforce Analytics & Scalable Ledger
// Formally engineered for 20, 50, 500, or 5,000+ employees with zero vertical sprawl
// Strict Hierarchy: 1. Header -> 2. Filters -> 3. Tabs -> 4. KPIs -> 5. Report -> 6. Paginated Ledger
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  FileText,
  Download,
  Filter,
  BarChart2,
  Mail,
  Send,
  CheckCircle2,
  Users,
  Clock,
  AlertCircle,
  AlertTriangle,
  X,
  Search,
  MessageSquare,
  History,
  ShieldAlert,
  Building,
  UserCheck,
  Check,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Info,
  CalendarDays,
  FileCheck,
  HelpCircle,
  ChevronDown,
  Eye,
  SlidersHorizontal,
  CheckSquare,
  Layers,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import {
  hrIntelligenceMisEngine,
  DailyWorkforceMisReport,
  WeeklyHrMisReport,
  MonthlyHrMisReport,
  HrExceptionItem,
  EmployeeAttendanceLedgerRecord,
  OvertimeRequestDetailRow,
  DepartmentShiftReportRow,
} from '../../../services/attendance/hrIntelligenceMisEngine';
import {
  OvertimeGovernanceSummary,
  EmployeeOvertimeGovernanceRecord,
} from '../../../services/attendance/overtimeGovernanceService';
import {
  ALL_CONSOLIDATED_SECTIONS,
  buildFilteredMisDataset,
  generateMisCsv,
  generateMisExcelWorkbook,
  generateMisPdf,
  recordMisExportAuditLog,
  REPORT_DISPLAY_NAMES,
  triggerArtifactDownload,
  type MisExportFormat,
  type MisExportRequest,
  type MisExportScope,
  type MisReportType,
  type MisSingleReportType,
  type MisSourceDataset,
} from '../../../services/attendance/misReportExportEngine';
import { attendanceMisDeliveryService } from '../../../services/attendance/attendanceMisDeliveryService';
import { supabase } from '../../../lib/supabase';

export type MisActiveTab =
  | 'overview'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'overtime'
  | 'departments'
  | 'exceptions'
  | 'delivery'
  | 'history';

type PeriodPreset = 'today' | 'this_week' | 'this_month' | 'prev_month' | 'custom';

// ============================================================================
// REUSABLE ENTERPRISE PAGINATION CONTROL
// ============================================================================
interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  itemLabel = 'employees',
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const startItem = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalRecords, currentPage * pageSize);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 rounded-b-lg select-none">
      <div className="font-medium text-slate-700">
        Showing <span className="font-bold text-slate-900">{startItem}</span>–
        <span className="font-bold text-slate-900">{endItem}</span> of{' '}
        <span className="font-bold text-slate-900">{totalRecords}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title="First Page"
            aria-label="First Page"
            className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Previous Page"
            aria-label="Previous Page"
            className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) =>
              typeof p === 'string' ? (
                <span key={`dots-${idx}`} className="px-1.5 text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  onClick={() => onPageChange(p)}
                  className={`min-w-[28px] h-7 px-2 rounded font-semibold text-xs transition-colors cursor-pointer ${
                    currentPage === p
                      ? 'bg-[#07563D] text-white shadow-2xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Next Page"
            aria-label="Next Page"
            className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title="Last Page"
            aria-label="Last Page"
            className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 ml-3 border-l border-slate-300 pl-3">
          <span className="text-[11px] text-slate-500 whitespace-nowrap">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 outline-none font-medium cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN VIEW COMPONENT
// ============================================================================
export const AttendanceReportsView: React.FC = () => {
  const { showToast } = useToast();

  // Navigation & Date State
  const todayIso = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<MisActiveTab>('overview');
  const [targetDate, setTargetDate] = useState<string>(todayIso);
  const [dateFrom, setDateFrom] = useState<string>(todayIso);
  const [dateTo, setDateTo] = useState<string>(todayIso);
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('today');
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Pagination States (Default: 25 rows per page for enterprise responsiveness)
  const [dailyPage, setDailyPage] = useState<number>(1);
  const [dailyPageSize, setDailyPageSize] = useState<number>(25);

  const [otPage, setOtPage] = useState<number>(1);
  const [otPageSize, setOtPageSize] = useState<number>(25);

  const [excPage, setExcPage] = useState<number>(1);
  const [excPageSize, setExcPageSize] = useState<number>(25);

  const [histPage, setHistPage] = useState<number>(1);
  const [histPageSize, setHistPageSize] = useState<number>(25);

  // Report Data State
  const [dailyData, setDailyData] = useState<DailyWorkforceMisReport | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyHrMisReport | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyHrMisReport | null>(null);
  const [overtimeSummary, setOvertimeSummary] = useState<OvertimeGovernanceSummary | null>(null);
  const [overtimeLedger, setOvertimeLedger] = useState<OvertimeRequestDetailRow[]>([]);
  const [departmentShifts, setDepartmentShifts] = useState<DepartmentShiftReportRow[]>([]);
  const [exceptions, setExceptions] = useState<HrExceptionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Selected Employee Inspection Modals
  const [selectedDailyEmployee, setSelectedDailyEmployee] = useState<EmployeeAttendanceLedgerRecord | null>(null);
  const [selectedOtEmployee, setSelectedOtEmployee] = useState<EmployeeOvertimeGovernanceRecord | null>(null);
  const [selectedException, setSelectedException] = useState<HrExceptionItem | null>(null);

  // Export Scope Modal State (Default: Current Report only, 1 focused sheet)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTargetFormat, setExportTargetFormat] = useState<MisExportFormat>('EXCEL');
  const [exportScope, setExportScope] = useState<MisExportScope>('CURRENT_REPORT');
  const [consolidatedSections, setConsolidatedSections] = useState<MisSingleReportType[]>(
    ALL_CONSOLIDATED_SECTIONS.map((s) => s.id)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Dispatch Modals
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [customEmail, setCustomEmail] = useState('thirumalairk28@gmail.com');
  const [customPhone, setCustomPhone] = useState('919384125278');
  const [isDispatching, setIsDispatching] = useState(false);

  // Reset pagination to page 1 whenever any filter or target date changes
  useEffect(() => {
    setDailyPage(1);
    setOtPage(1);
    setExcPage(1);
    setHistPage(1);
  }, [searchQuery, filterDepartment, filterShift, filterStatus, targetDate, dateFrom, dateTo]);

  const fetchAuditLogs = async () => {
    try {
      const { data: logs } = await supabase
        .from('mis_delivery_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (logs) setAuditLogs(logs);
    } catch (_) {}
  };

  // Load All Authoritative Live Data progressively so UI never blanks out
  const loadMisData = async () => {
    setLoading(true);
    try {
      const effectiveEnd = dateTo || targetDate;
      const effectiveStart = dateFrom || targetDate;

      // 1. Authoritative Daily MIS loaded directly and set immediately
      const d = await hrIntelligenceMisEngine.compileDailyMis(effectiveEnd);
      setDailyData(d);

      // 2. Overtime Governance, Ledger, Dept-Shift Matrix & HR Exceptions loaded in parallel
      const [ot, exc, otLedger, deptShiftRows] = await Promise.all([
        hrIntelligenceMisEngine.compileOvertimeGovernance(effectiveEnd),
        hrIntelligenceMisEngine.compileHrExceptions(effectiveEnd, effectiveStart, effectiveEnd),
        hrIntelligenceMisEngine.compileOvertimeRequestLedger(effectiveStart, effectiveEnd),
        hrIntelligenceMisEngine.compileDepartmentShiftMatrix(effectiveStart, effectiveEnd),
      ]);
      setOvertimeSummary(ot);
      setExceptions(exc);
      setOvertimeLedger(otLedger);
      setDepartmentShifts(deptShiftRows);

      setLastRefreshedAt(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );

      // 3. Weekly & Monthly trend loaded safely without blocking primary UI
      const refDateObj = new Date(`${effectiveEnd}T00:00:00`);
      Promise.allSettled([
        hrIntelligenceMisEngine.compileWeeklyMis(effectiveEnd),
        hrIntelligenceMisEngine.compileMonthlyMis(
          refDateObj.getFullYear(),
          refDateObj.getMonth() + 1
        ),
      ]).then(([wRes, mRes]) => {
        if (wRes.status === 'fulfilled') setWeeklyData(wRes.value);
        if (mRes.status === 'fulfilled') setMonthlyData(mRes.value);
      });

      // 4. Fetch audit logs
      await fetchAuditLogs();
    } catch (err: any) {
      console.warn('[HR MIS Intelligence Error]:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMisData();
  }, [targetDate, dateFrom, dateTo]);

  // Handle Preset Changes
  const handleApplyPreset = (preset: PeriodPreset) => {
    setSelectedPreset(preset);
    const now = new Date();
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (preset === 'today') {
      const t = toIso(now);
      setTargetDate(t);
      setDateFrom(t);
      setDateTo(t);
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const mon = new Date(now);
      mon.setDate(now.getDate() - diffToMonday);
      const t = toIso(now);
      setTargetDate(t);
      setDateFrom(toIso(mon));
      setDateTo(t);
    } else if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const t = toIso(now);
      setTargetDate(t);
      setDateFrom(toIso(start));
      setDateTo(t);
    } else if (preset === 'prev_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const endStr = toIso(end);
      setTargetDate(endStr);
      setDateFrom(toIso(start));
      setDateTo(endStr);
    }
  };

  const activeReportType: MisSingleReportType = useMemo(() => {
    switch (activeTab) {
      case 'daily':
        return 'DAILY_ATTENDANCE';
      case 'weekly':
        return 'WEEKLY_MIS';
      case 'monthly':
        return 'MONTHLY_HR_MIS';
      case 'overtime':
        return 'OVERTIME_GOVERNANCE';
      case 'departments':
        return 'DEPARTMENTS_SHIFTS';
      case 'exceptions':
        return 'HR_EXCEPTIONS';
      default:
        return 'OVERVIEW';
    }
  }, [activeTab]);

  const misSourceDataset: MisSourceDataset = useMemo(
    () => ({
      organizationId:
        dailyData?.organizationId ||
        weeklyData?.organizationId ||
        monthlyData?.organizationId ||
        '0c621892-e938-4707-9957-13534ea32c19',
      companyName:
        dailyData?.companyName ||
        weeklyData?.companyName ||
        monthlyData?.companyName ||
        'Joy Corporate Solutions Pvt. Ltd.',
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
      overtimeSummary,
      overtimeLedger,
      departmentShifts,
      exceptions,
    }),
    [dailyData, weeklyData, monthlyData, overtimeSummary, overtimeLedger, departmentShifts, exceptions]
  );

  const buildCurrentExportRequest = (
    format: MisExportFormat,
    scope: MisExportScope = 'CURRENT_REPORT'
  ): MisExportRequest => ({
    report_type: scope === 'CONSOLIDATED_WORKBOOK' ? 'CONSOLIDATED_MIS' : activeReportType,
    date_from: dateFrom || targetDate,
    date_to: dateTo || targetDate,
    department_id: filterDepartment,
    shift_id: filterShift,
    attendance_status: filterStatus,
    search_query: searchQuery,
    company_id: misSourceDataset.organizationId,
    company_name: misSourceDataset.companyName,
    generated_by: 'Authorized HR Operations',
    requested_format: format,
    requested_scope: scope,
    consolidated_sections: scope === 'CONSOLIDATED_WORKBOOK' ? consolidatedSections : undefined,
  });

  const activeFilteredMisDataset = useMemo(() => {
    const req = buildCurrentExportRequest(exportTargetFormat, exportScope);
    return buildFilteredMisDataset(req, misSourceDataset);
  }, [
    activeReportType,
    dateFrom,
    dateTo,
    targetDate,
    filterDepartment,
    filterShift,
    filterStatus,
    searchQuery,
    exportTargetFormat,
    exportScope,
    consolidatedSections,
    misSourceDataset,
  ]);

  // Direct PDF Download Handler (Strictly scoped to active report + filters)
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const req = buildCurrentExportRequest('PDF', 'CURRENT_REPORT');
      const artifact = await generateMisPdf(req, misSourceDataset);
      triggerArtifactDownload(artifact);

      await recordMisExportAuditLog({
        organizationId: misSourceDataset.organizationId,
        reportType: artifact.reportType,
        reportingDate: req.date_to,
        channel: 'PDF_DOWNLOAD',
        recipientTarget: 'Local HR User',
        sha256Checksum: artifact.sha256Checksum,
        fileName: artifact.fileName,
        metadata: {
          scope: req.requested_scope,
          recordCount: artifact.recordCount,
          pageCount: artifact.pageCount,
          dateFrom: req.date_from,
          dateTo: req.date_to,
          filters: activeFilteredMisDataset.filtersAppliedText,
        },
      });
      await fetchAuditLogs();

      showToast({
        title: `${artifact.reportTitle} PDF Downloaded`,
        message:
          artifact.recordCount === 0
            ? `Saved ${artifact.fileName} (Empty report notice included)`
            : `Saved ${artifact.fileName} (${artifact.recordCount} records, ${artifact.pageCount} page(s))`,
        type: 'success',
      });
    } catch (err: any) {
      const msg = err.message || 'Could not generate report PDF';
      setExportError(msg);
      showToast({
        title: 'PDF Export Failed',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Unified Filtered Records (Reconciled 1:1 with Excel, PDF, and CSV Exports)
  const filteredDailyRecords = activeFilteredMisDataset.dailyRows;
  const filteredOtRecords = activeFilteredMisDataset.overtimeGovernanceRows;
  const filteredExceptions = activeFilteredMisDataset.exceptionRows;

  // Paginated Daily Records (Current active page window)
  const paginatedDailyRecords = useMemo(() => {
    const start = (dailyPage - 1) * dailyPageSize;
    return filteredDailyRecords.slice(start, start + dailyPageSize);
  }, [filteredDailyRecords, dailyPage, dailyPageSize]);

  const totalDailyPages = Math.max(1, Math.ceil(filteredDailyRecords.length / dailyPageSize));

  // Paginated Overtime Records
  const paginatedOtRecords = useMemo(() => {
    const start = (otPage - 1) * otPageSize;
    return filteredOtRecords.slice(start, start + otPageSize);
  }, [filteredOtRecords, otPage, otPageSize]);

  const totalOtPages = Math.max(1, Math.ceil(filteredOtRecords.length / otPageSize));

  const paginatedExceptions = useMemo(() => {
    const start = (excPage - 1) * excPageSize;
    return filteredExceptions.slice(start, start + excPageSize);
  }, [filteredExceptions, excPage, excPageSize]);

  const totalExcPages = Math.max(1, Math.ceil(filteredExceptions.length / excPageSize));

  // Paginated History Logs
  const paginatedAuditLogs = useMemo(() => {
    const start = (histPage - 1) * histPageSize;
    return auditLogs.slice(start, start + histPageSize);
  }, [auditLogs, histPage, histPageSize]);

  const totalHistPages = Math.max(1, Math.ceil(auditLogs.length / histPageSize));

  // Executive Export Trigger (Report-Specific Single Sheet by default, or Explicit Consolidated Workbook)
  const executeExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const req = buildCurrentExportRequest(exportTargetFormat, exportScope);
      let artifact;

      if (exportTargetFormat === 'EXCEL') {
        artifact = await generateMisExcelWorkbook(req, misSourceDataset);
        triggerArtifactDownload(artifact);
        await recordMisExportAuditLog({
          organizationId: misSourceDataset.organizationId,
          reportType: artifact.reportType,
          reportingDate: req.date_to,
          channel: 'EXCEL_DOWNLOAD',
          recipientTarget: 'Local HR User',
          sha256Checksum: artifact.sha256Checksum,
          fileName: artifact.fileName,
          metadata: {
            scope: req.requested_scope,
            worksheets: artifact.worksheetNames,
            recordCount: artifact.recordCount,
            dateFrom: req.date_from,
            dateTo: req.date_to,
            filters: activeFilteredMisDataset.filtersAppliedText,
          },
        });
        showToast({
          title: 'Excel Report Exported',
          message: `Saved ${artifact.fileName} (${artifact.worksheetNames?.length || 1} sheet(s): ${artifact.worksheetNames?.join(', ')})`,
          type: 'success',
        });
      } else if (exportTargetFormat === 'PDF') {
        artifact = await generateMisPdf(req, misSourceDataset);
        triggerArtifactDownload(artifact);
        await recordMisExportAuditLog({
          organizationId: misSourceDataset.organizationId,
          reportType: artifact.reportType,
          reportingDate: req.date_to,
          channel: 'PDF_DOWNLOAD',
          recipientTarget: 'Local HR User',
          sha256Checksum: artifact.sha256Checksum,
          fileName: artifact.fileName,
          metadata: {
            scope: req.requested_scope,
            pageCount: artifact.pageCount,
            recordCount: artifact.recordCount,
            dateFrom: req.date_from,
            dateTo: req.date_to,
            filters: activeFilteredMisDataset.filtersAppliedText,
          },
        });
        showToast({
          title: 'PDF Report Exported',
          message: `Saved ${artifact.fileName} (${artifact.pageCount} page(s), ${artifact.recordCount} records)`,
          type: 'success',
        });
      } else {
        artifact = await generateMisCsv(req, misSourceDataset);
        triggerArtifactDownload(artifact);
        await recordMisExportAuditLog({
          organizationId: misSourceDataset.organizationId,
          reportType: artifact.reportType,
          reportingDate: req.date_to,
          channel: 'CSV_DOWNLOAD',
          recipientTarget: 'Local HR User',
          sha256Checksum: artifact.sha256Checksum,
          fileName: artifact.fileName,
          metadata: {
            recordCount: artifact.recordCount,
            dateFrom: req.date_from,
            dateTo: req.date_to,
            filters: activeFilteredMisDataset.filtersAppliedText,
          },
        });
        showToast({
          title: 'CSV Exported',
          message: `Saved ${artifact.fileName} (${artifact.recordCount} rows)`,
          type: 'success',
        });
      }

      await fetchAuditLogs();
      setIsExportModalOpen(false);
    } catch (err: any) {
      const msg = err.message || 'Could not compile export file';
      setExportError(msg);
      showToast({
        title: 'Export Failed',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Email Dispatch Trigger (Respects active report type + date range + filters)
  const handleSendEmail = async () => {
    setIsDispatching(true);
    try {
      const req = buildCurrentExportRequest('PDF', 'CURRENT_REPORT');
      const pdfArtifact = await generateMisPdf(req, misSourceDataset);
      const base64 = btoa(
        Array.from(pdfArtifact.bytes)
          .map((b) => String.fromCharCode(b))
          .join('')
      );

      const res = await attendanceMisDeliveryService.deliverUnifiedMisReport({
        rows: [],
        reportDate: req.date_to,
        dateFrom: req.date_from,
        dateTo: req.date_to,
        department: req.department_id,
        shift: req.shift_id,
        status: req.attendance_status,
        searchQuery: req.search_query,
        emailRecipients: [customEmail],
        reportType: req.report_type,
        companyName: req.company_name,
        organizationId: req.company_id,
        preGeneratedArtifact: {
          runId: `mis-${Date.now()}`,
          organizationId: req.company_id,
          companyName: req.company_name,
          reportDate: req.date_to,
          reportType: 'EVENING_FINAL',
          cutoffTime: dailyData?.cutoffTime || '18:30 IST',
          filename: pdfArtifact.fileName,
          buffer: pdfArtifact.bytes,
          base64,
          sizeBytes: pdfArtifact.bytes.length,
          sha256Checksum: pdfArtifact.sha256Checksum,
          storagePath: `attendance-reports/${pdfArtifact.fileName}`,
          documentUrl: '',
          pageCount: pdfArtifact.pageCount || 1,
          stats: {
            totalWorkforce: activeFilteredMisDataset.summaryTotals.headcount,
            presentCount: activeFilteredMisDataset.summaryTotals.present,
            turnoutPct: activeFilteredMisDataset.summaryTotals.attendanceRatePct,
            lateCount: activeFilteredMisDataset.summaryTotals.late,
            weeklyOffLeave: activeFilteredMisDataset.summaryTotals.onLeave,
            cumulativeHours: `${activeFilteredMisDataset.summaryTotals.approvedOtHours}h`,
            presentTurnout: `${activeFilteredMisDataset.summaryTotals.present} (${activeFilteredMisDataset.summaryTotals.attendanceRatePct}%)`,
          },
        },
      });
      await fetchAuditLogs();
      if (res.success) {
        showToast({
          title: 'Email Dispatched',
          message: `Sent ${pdfArtifact.reportTitle} to ${customEmail}`,
          type: 'success',
        });
        setIsEmailModalOpen(false);
      } else {
        throw new Error('Email delivery failed');
      }
    } catch (err: any) {
      showToast({
        title: 'Dispatch Failed',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  // WhatsApp Document Dispatch Trigger (Respects active report type + date range + filters)
  const handleSendWhatsApp = async () => {
    setIsDispatching(true);
    try {
      const req = buildCurrentExportRequest('PDF', 'CURRENT_REPORT');
      const pdfArtifact = await generateMisPdf(req, misSourceDataset);
      const base64 = btoa(
        Array.from(pdfArtifact.bytes)
          .map((b) => String.fromCharCode(b))
          .join('')
      );

      const res = await attendanceMisDeliveryService.deliverUnifiedMisReport({
        rows: [],
        reportDate: req.date_to,
        dateFrom: req.date_from,
        dateTo: req.date_to,
        department: req.department_id,
        shift: req.shift_id,
        status: req.attendance_status,
        searchQuery: req.search_query,
        whatsAppRecipients: [customPhone],
        reportType: req.report_type,
        companyName: req.company_name,
        organizationId: req.company_id,
        preGeneratedArtifact: {
          runId: `mis-${Date.now()}`,
          organizationId: req.company_id,
          companyName: req.company_name,
          reportDate: req.date_to,
          reportType: 'EVENING_FINAL',
          cutoffTime: dailyData?.cutoffTime || '18:30 IST',
          filename: pdfArtifact.fileName,
          buffer: pdfArtifact.bytes,
          base64,
          sizeBytes: pdfArtifact.bytes.length,
          sha256Checksum: pdfArtifact.sha256Checksum,
          storagePath: `attendance-reports/${pdfArtifact.fileName}`,
          documentUrl: '',
          pageCount: pdfArtifact.pageCount || 1,
          stats: {
            totalWorkforce: activeFilteredMisDataset.summaryTotals.headcount,
            presentCount: activeFilteredMisDataset.summaryTotals.present,
            turnoutPct: activeFilteredMisDataset.summaryTotals.attendanceRatePct,
            lateCount: activeFilteredMisDataset.summaryTotals.late,
            weeklyOffLeave: activeFilteredMisDataset.summaryTotals.onLeave,
            cumulativeHours: `${activeFilteredMisDataset.summaryTotals.approvedOtHours}h`,
            presentTurnout: `${activeFilteredMisDataset.summaryTotals.present} (${activeFilteredMisDataset.summaryTotals.attendanceRatePct}%)`,
          },
        },
      });
      await fetchAuditLogs();
      if (res.success) {
        showToast({
          title: 'WhatsApp PDF Dispatched',
          message: `Sent ${pdfArtifact.reportTitle} attachment to +${customPhone}`,
          type: 'success',
        });
        setIsWhatsAppModalOpen(false);
      } else {
        throw new Error('WhatsApp delivery failed');
      }
    } catch (err: any) {
      showToast({
        title: 'WhatsApp Dispatch Failed',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  // Navigation Items Definition (9 Standard Report Areas)
  const navTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2, tooltip: 'Key workforce KPIs, executive summary and attendance ledger' },
    { id: 'daily', label: 'Daily MIS', icon: Clock, tooltip: 'Daily attendance, punch reconciliation and scalable employee ledger' },
    { id: 'weekly', label: 'Weekly MIS', icon: CalendarDays, tooltip: 'Weekly workforce trends, lateness and overtime distributions' },
    { id: 'monthly', label: 'Monthly HR MIS', icon: Calendar, tooltip: 'Monthly headcount movements, attrition and department matrices' },
    { id: 'overtime', label: 'Overtime Governance', icon: TrendingUp, tooltip: '20h 4-month allocation thresholds and individual governance ledger', badge: overtimeSummary?.employeesExceededCount ? `${overtimeSummary.employeesExceededCount} Exceeded` : undefined },
    { id: 'departments', label: 'Departments & Shifts', icon: Building, tooltip: 'Department capacity comparison and shift turnout analysis' },
    { id: 'exceptions', label: 'HR Exceptions', icon: ShieldAlert, tooltip: 'Items requiring HR review and escalation queue', badge: exceptions.length ? `${exceptions.length}` : undefined },
    { id: 'delivery', label: 'Delivery Center', icon: Send, tooltip: 'Email and WhatsApp automated report scheduling and manual dispatch' },
    { id: 'history', label: 'History', icon: History, tooltip: 'Cryptographic report snapshots and audit dispatch logs' },
  ];

  const hasActiveFilters =
    filterDepartment !== 'ALL' ||
    filterShift !== 'ALL' ||
    filterStatus !== 'ALL' ||
    Boolean(searchQuery) ||
    selectedPreset !== 'today';

  const resetAllFilters = () => {
    setFilterDepartment('ALL');
    setFilterShift('ALL');
    setFilterStatus('ALL');
    setSearchQuery('');
    handleApplyPreset('today');
  };

  return (
    <div className="space-y-4 pb-16 max-w-[1600px] mx-auto text-slate-800">
      {/* ── 1. COMPACT PAGE IDENTITY & EXECUTIVE ACTIONS HEADER ── */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        {/* Left: Breadcrumb, Tenant & Title */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span className="hover:text-emerald-700 cursor-pointer">Core Attendance</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-emerald-800 font-semibold">Reports & Scope MIS</span>
            </div>
            <span className="text-slate-300">•</span>
            <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap">
              {dailyData?.companyName || 'Joy Corporate Solutions Pvt. Ltd.'}
            </Badge>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium text-[11px]">Period: {targetDate}</span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            HR Intelligence & Workforce MIS
          </h1>
          <p className="text-xs text-slate-500">
            Attendance, workforce trends, overtime governance and HR exceptions.
          </p>
        </div>

        {/* Right: Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {lastRefreshedAt && (
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">
              Updated {lastRefreshedAt} (IST)
            </span>
          )}

          {/* Utility Action: Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadMisData}
            title="Refresh authentic live data from Supabase"
            className="gap-1.5 text-xs h-8.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Secondary Action: Export Menu Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setExportTargetFormat('EXCEL');
              setIsExportModalOpen(true);
            }}
            className="gap-1.5 text-xs h-8.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            Export (.xlsx / .csv)
          </Button>

          {/* Secondary Action: Email Report */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEmailModalOpen(true)}
            className="gap-1.5 text-xs h-8.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            Email Report
          </Button>

          {/* Secondary Action: WhatsApp Report */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="gap-1.5 text-xs h-8.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            WhatsApp Report
          </Button>

          {/* Primary Action: Download PDF */}
          <Button
            size="sm"
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className="gap-1.5 text-xs h-8.5 bg-[#07563D] hover:bg-[#064a34] text-white font-medium shadow-xs cursor-pointer"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} />
            {isExporting ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Export Error Retry Banner */}
      {exportError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Export Error:</strong> {exportError}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
              className="h-7 text-[11px] border-rose-300 text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              Retry PDF
            </Button>
            <button onClick={() => setExportError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── 2. COMPACT REPORT CONTROL BAR (FILTER TOOLBAR) ── */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Preset Period Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'prev_month', label: 'Previous Month' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset.id as PeriodPreset)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  selectedPreset === preset.id
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Controls Cluster */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date / Period Range Picker */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateFrom(val);
                  if (val > dateTo) setDateTo(val);
                  setSelectedPreset('custom');
                }}
                className="outline-none bg-transparent font-medium cursor-pointer text-slate-800 text-xs"
              />
              <span className="text-[11px] font-medium text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateTo(val);
                  setTargetDate(val);
                  if (val < dateFrom) setDateFrom(val);
                  setSelectedPreset('custom');
                }}
                className="outline-none bg-transparent font-medium cursor-pointer text-slate-800 text-xs"
              />
            </div>

            {/* Department Dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">Dept:</span>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 text-xs outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {overtimeSummary?.departmentRollups.map((d) => (
                  <option key={d.department} value={d.department}>
                    {d.department}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift Dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">Shift:</span>
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 text-xs outline-none cursor-pointer"
              >
                <option value="ALL">All Shifts</option>
                {dailyData?.shiftTurnouts.map((s) => (
                  <option key={s.shift} value={s.shift}>
                    {s.shift}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 text-xs outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late Arrivals</option>
                <option value="MISSING_PUNCH">Missing Punches</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="APPROVED">Approved (OT/Reg)</option>
                <option value="PENDING">Pending Approval</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Live Search Box */}
            <div className="relative w-40 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name / code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-600 text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetAllFilters}
                className="text-[11px] text-slate-600 hover:text-slate-900 py-0.5 px-2 h-7 cursor-pointer"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 text-[11px]">
            <span className="text-slate-400 font-medium">Active filters:</span>
            {filterDepartment !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                Dept: {filterDepartment}
                <button onClick={() => setFilterDepartment('ALL')} className="hover:text-slate-900 cursor-pointer">
                  &times;
                </button>
              </span>
            )}
            {filterShift !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                Shift: {filterShift}
                <button onClick={() => setFilterShift('ALL')} className="hover:text-slate-900 cursor-pointer">
                  &times;
                </button>
              </span>
            )}
            {filterStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                Status: {filterStatus}
                <button onClick={() => setFilterStatus('ALL')} className="hover:text-slate-900 cursor-pointer">
                  &times;
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-slate-900 cursor-pointer">
                  &times;
                </button>
              </span>
            )}
            {selectedPreset !== 'today' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium">
                Preset: {selectedPreset.replace('_', ' ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── 3. REPORT NAVIGATION BAR (9 TABS) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-2 pt-2">
        <div
          className="flex items-center gap-1 overflow-x-auto scrollbar-none no-scrollbar pb-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MisActiveTab)}
                title={tab.tooltip}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#07563D] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.id === 'overtime'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. SIX TO EIGHT PRIMARY FOCUSED KPI CARDS (RECONCILED WITH FILTERS & EXPORTS) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {/* KPI 1: Scheduled Workforce */}
        <Card
          onClick={() => setActiveTab('daily')}
          className="p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Workforce</span>
            <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {loading ? '...' : activeFilteredMisDataset.summaryTotals.headcount}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Filtered Scope</span>
        </Card>

        {/* KPI 2: Present */}
        <Card
          onClick={() => setActiveTab('daily')}
          className="p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Present</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-1">
            {loading ? '...' : activeFilteredMisDataset.summaryTotals.present}
          </div>
          <span className="text-[10px] text-emerald-800 font-medium">Verified On-Duty</span>
        </Card>

        {/* KPI 3: Absent */}
        <Card
          onClick={() => setActiveTab('daily')}
          className="p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Absent</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-rose-600 mt-1">
            {loading ? '...' : activeFilteredMisDataset.summaryTotals.absent}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Unexcused</span>
        </Card>

        {/* KPI 4: Turnout Rate */}
        <Card
          onClick={() => setActiveTab('overview')}
          className="p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Turnout Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {loading ? '...' : `${activeFilteredMisDataset.summaryTotals.attendanceRatePct}%`}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Turnout Index</span>
        </Card>

        {/* KPI 5: Late Arrivals */}
        <Card
          onClick={() => setActiveTab('daily')}
          className="p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Late Arrivals</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-amber-600 mt-1">
            {loading ? '...' : activeFilteredMisDataset.summaryTotals.late}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">&gt; Shift Grace</span>
        </Card>

        {/* KPI 6: Missing Punches */}
        <Card
          onClick={() => setActiveTab('exceptions')}
          className="p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Missing Punches</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-amber-700 mt-1">
            {loading ? '...' : activeFilteredMisDataset.summaryTotals.missingPunches}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">In/Out Incomplete</span>
        </Card>

        {/* KPI 7: Approved Overtime */}
        <Card
          onClick={() => setActiveTab('overtime')}
          className="p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Approved OT</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-emerald-800 mt-1">
            {loading ? '...' : `${activeFilteredMisDataset.summaryTotals.approvedOtHours}h`}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Period Approved</span>
        </Card>

        {/* KPI 8: HR Exceptions */}
        <Card
          onClick={() => setActiveTab('exceptions')}
          className="p-3 bg-white border border-slate-200/90 shadow-2xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">HR Exceptions</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-rose-600 mt-1">
            {loading ? '...' : activeFilteredMisDataset.summaryTotals.exceptionCount}
          </div>
          <span className="text-[10px] text-rose-600 font-medium">Review Needed</span>
        </Card>
      </div>

      {/* ── 5. MAIN REPORT VIEW ROUTING & CONTENT ── */}

      {/* ── TAB 1: EXECUTIVE OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Executive Insight Panel */}
          <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Executive Workforce Briefing
                  </span>
                  <span className="text-slate-400 text-xs">&bull; {targetDate}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {dailyData ? (
                    <>
                      <strong>{dailyData.presentCount} of {dailyData.scheduledHeadcount}</strong> scheduled employees are present ({dailyData.attendanceTurnoutPct}% turnout).{' '}
                      {dailyData.lateArrivalsCount > 0 ? `${dailyData.lateArrivalsCount} late arrivals require review. ` : ''}
                      {exceptions.length > 0 ? `${exceptions.length} attendance exceptions remain unresolved.` : 'All attendance exceptions reconciled.'}
                    </>
                  ) : (
                    'Loading live workforce telemetry...'
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Overtime Allocation</span>
                  <div className="text-sm font-bold text-emerald-400">
                    {overtimeSummary ? `${overtimeSummary.totalPeriodApprovedHours}h / ${overtimeSummary.totalWorkforce * 20}h` : '0h'}
                  </div>
                  <span className="text-[9px] text-slate-500">20h / 4-Month Period</span>
                </div>
              </div>
            </div>
          </div>

          {/* Department Turnout & Shift Progress Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Department Turnout Breakdown */}
            <Card className="p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <Building className="w-3.5 h-3.5 text-emerald-700" />
                    Department Turnout Distribution
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('departments')}
                  className="text-[11px] h-6 px-2 cursor-pointer"
                >
                  Full Matrix
                </Button>
              </div>

              <div className="space-y-2.5">
                {(dailyData?.departmentTurnouts || []).map((d) => (
                  <div key={d.department} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{d.department}</span>
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <span>{d.present}/{d.total} Present</span>
                        <span className="font-bold text-emerald-700">{d.turnoutPct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, d.turnoutPct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Shift Adherence */}
            <Card className="p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    Shift Adherence & Lateness
                  </h3>
                </div>
                <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                  {dailyData?.shiftTurnouts.length || 0} Shifts
                </Badge>
              </div>

              <div className="space-y-2.5">
                {(dailyData?.shiftTurnouts || []).map((s) => (
                  <div key={s.shift} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{s.shift}</span>
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <span>{s.present}/{s.total} In Attendance</span>
                        <span className="font-bold text-emerald-700">{s.turnoutPct}%</span>
                        {s.late > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                            {s.late} Late
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, s.turnoutPct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── 6. SCALABLE PAGINATED EMPLOYEE LEDGER (IN OVERVIEW) ── */}
          <Card className="border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  Scalable Employee Attendance Ledger
                </h3>
                <p className="text-[11px] text-slate-500">
                  Individual punch audit, working hours, late duration and exception classification.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExportTargetFormat('EXCEL');
                    setIsExportModalOpen(true);
                  }}
                  className="text-[11px] h-7 px-2.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3 h-3 mr-1 text-emerald-700" />
                  Export Ledger
                </Button>
              </div>
            </div>

            {/* Scrollable Table Container with Sticky Header */}
            <div className="overflow-x-auto max-h-[520px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs text-slate-700 font-semibold border-b border-slate-200 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Shift</th>
                    <th className="py-2.5 px-3">First In</th>
                    <th className="py-2.5 px-3">Last Out</th>
                    <th className="py-2.5 px-3">Working Duration</th>
                    <th className="py-2.5 px-3">Late Mins</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Exception Status</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedDailyRecords.map((r) => (
                    <tr key={r.employeeId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-600 font-mono text-[11px]">{r.employeeCode}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{r.employeeName}</td>
                      <td className="py-2 px-3 text-slate-600">{r.department}</td>
                      <td className="py-2 px-3 text-slate-600 max-w-[130px] truncate" title={r.shift}>
                        {r.shift}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-emerald-700 font-medium">{r.firstCheckIn}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-700">{r.lastCheckOut}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{r.workingDuration}</td>
                      <td className="py-2 px-3">
                        {r.lateDurationMinutes > 0 ? (
                          <span className="text-amber-700 font-bold">{r.lateDurationMinutes}m</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px]">{r.attendanceSource}</td>
                      <td className="py-2 px-3">
                        {r.exceptionStatus !== 'None' && r.exceptionStatus !== 'Normal' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {r.exceptionStatus}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'ON_LEAVE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDailyEmployee(r)}
                          className="text-[11px] h-6 py-0 px-2 cursor-pointer hover:bg-slate-100"
                        >
                          <Eye className="w-3 h-3 mr-1 text-slate-500" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {paginatedDailyRecords.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400">
                        No employees found matching the active filters or search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <PaginationBar
              currentPage={dailyPage}
              totalPages={totalDailyPages}
              pageSize={dailyPageSize}
              totalRecords={filteredDailyRecords.length}
              itemLabel="employees"
              onPageChange={setDailyPage}
              onPageSizeChange={setDailyPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </Card>
        </div>
      )}

      {/* ── TAB 2: DAILY ATTENDANCE MIS ── */}
      {activeTab === 'daily' && dailyData && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Daily Workforce Ingestion & Punch Reconciliation — {dailyData.formattedDate}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cutoff: {dailyData.cutoffTime} &bull; {dailyData.isInterimSnapshot ? 'Interim Snapshot' : 'Final Shift Reconciliation'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Turnout: {dailyData.attendanceTurnoutPct}%
                </Badge>
                <Badge className="bg-slate-100 text-slate-700 text-xs">
                  {filteredDailyRecords.length} Filtered Staff
                </Badge>
              </div>
            </div>

            {/* Daily Summary Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mb-4 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Scheduled Strength:</span>
                <p className="text-base font-bold text-slate-900">{dailyData.scheduledHeadcount}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Present (On-Duty):</span>
                <p className="text-base font-bold text-emerald-700">{dailyData.presentCount}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Approved Leave:</span>
                <p className="text-base font-bold text-blue-700">{dailyData.onLeaveCount}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Missing Check-Ins:</span>
                <p className="text-base font-bold text-rose-600">{dailyData.missingCheckInCount}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Missing Check-Outs:</span>
                <p className="text-base font-bold text-amber-600">{dailyData.missingCheckOutCount}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Recorded OT Today:</span>
                <p className="text-base font-bold text-emerald-800">{dailyData.recordedOtHours}h</p>
              </div>
            </div>

            {/* Paginated Employee Attendance Ledger Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wider">
                  Employee Punch & Working Duration Ledger
                </span>
                <span className="text-slate-500 text-[11px]">
                  Page {dailyPage} of {totalDailyPages} ({filteredDailyRecords.length} Total)
                </span>
              </div>

              <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="py-2 px-3">Emp ID</th>
                      <th className="py-2 px-3">Employee Name</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Shift</th>
                      <th className="py-2 px-3">First In</th>
                      <th className="py-2 px-3">Last Out</th>
                      <th className="py-2 px-3">Working Duration</th>
                      <th className="py-2 px-3">Late Mins</th>
                      <th className="py-2 px-3">Source</th>
                      <th className="py-2 px-3">Exception Status</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedDailyRecords.map((r) => (
                      <tr key={r.employeeId} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{r.employeeCode}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.employeeName}</td>
                        <td className="py-2 px-3 text-slate-600">{r.department}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[130px] truncate" title={r.shift}>{r.shift}</td>
                        <td className="py-2 px-3 font-mono text-emerald-700 font-medium">{r.firstCheckIn}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{r.lastCheckOut}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{r.workingDuration}</td>
                        <td className="py-2 px-3">
                          {r.lateDurationMinutes > 0 ? (
                            <span className="text-amber-700 font-bold">{r.lateDurationMinutes}m</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">{r.attendanceSource}</td>
                        <td className="py-2 px-3">
                          {r.exceptionStatus !== 'None' && r.exceptionStatus !== 'Normal' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              {r.exceptionStatus}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">None</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'ON_LEAVE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDailyEmployee(r)}
                            className="text-[11px] h-6 py-0 px-2 cursor-pointer"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {paginatedDailyRecords.length === 0 && (
                      <tr>
                        <td colSpan={12} className="py-6 text-center text-slate-400">
                          No employee records match the active criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                currentPage={dailyPage}
                totalPages={totalDailyPages}
                pageSize={dailyPageSize}
                totalRecords={filteredDailyRecords.length}
                itemLabel="employees"
                onPageChange={setDailyPage}
                onPageSizeChange={setDailyPageSize}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </div>

            {/* Reconciliation Diagnostic Table */}
            {dailyData.reconciliationSummary && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
                  Multi-Channel Ingestion & Reconciliation Matrix
                </h4>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Authoritative deduplication across Biometric Terminal, Mobile GPS, and Web punches. Zero double counting.
                </p>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#07563D] text-white font-semibold">
                      <tr>
                        <th className="py-2 px-3">Reconciliation Metric</th>
                        <th className="py-2 px-3 text-center">Biometric Terminal</th>
                        <th className="py-2 px-3 text-center">Mobile GPS</th>
                        <th className="py-2 px-3 text-center">Web / Manual</th>
                        <th className="py-2 px-3 text-right font-bold text-emerald-200">Final Reconciled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {dailyData.reconciliationSummary.reconciliationTable.map((row) => (
                        <tr key={row.metric} className="hover:bg-slate-50/75">
                          <td className="py-2 px-3 font-medium text-slate-800">{row.metric}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{row.biometric}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{row.mobileGps}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{row.webManual}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{row.finalReconciled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 3: WEEKLY MIS ── */}
      {activeTab === 'weekly' && weeklyData && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Weekly HR MIS Executive Overview — {weeklyData.weekIdentifier}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Week Duration: {weeklyData.startDate} to {weeklyData.endDate} &bull; Authoritative 7-Day Performance Rollup
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 text-xs font-bold">
                Avg Turnout: {weeklyData.averageTurnoutPct}%
              </Badge>
            </div>

            {/* Daily Turnout Trend Table */}
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              7-Day Turnout & Overtime Distribution
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Day</th>
                    <th className="py-2 px-3">Present</th>
                    <th className="py-2 px-3">Absent</th>
                    <th className="py-2 px-3">On Leave</th>
                    <th className="py-2 px-3">Turnout %</th>
                    <th className="py-2 px-3 text-right">Overtime (h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {weeklyData.dailyAttendanceTrend.map((t) => (
                    <tr key={t.date} className="hover:bg-slate-50/75">
                      <td className="py-2 px-3 font-medium text-slate-800">{t.date}</td>
                      <td className="py-2 px-3 font-medium text-slate-600">{t.dayName}</td>
                      <td className="py-2 px-3 text-emerald-700 font-bold">{t.present}</td>
                      <td className="py-2 px-3 text-rose-600">{t.absent}</td>
                      <td className="py-2 px-3">{t.onLeave}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{t.turnoutPct}%</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800">{t.otHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Lateness & Approaching OT Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Repeated Late Arrivals (&gt; 2 Days)
                </h4>
                <div className="space-y-1.5">
                  {weeklyData.repeatedLateEmployees.map((e) => (
                    <div key={e.employeeId} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                      <span className="font-semibold text-slate-800">{e.name} ({e.department})</span>
                      <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold">
                        {e.daysLate} Late Days ({e.totalLateMinutes}m)
                      </Badge>
                    </div>
                  ))}
                  {weeklyData.repeatedLateEmployees.length === 0 && (
                    <p className="text-slate-400 py-1.5">No repeated late occurrences this week.</p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Approaching 4-Month OT Allocation (20h)
                </h4>
                <div className="space-y-1.5">
                  {weeklyData.employeesApproachingOtAllocation.map((e) => (
                    <div key={e.employeeId} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                      <span className="font-semibold text-slate-800">{e.name} ({e.department})</span>
                      <span className="font-bold text-emerald-800 text-xs">
                        {e.approvedOtHours}h / 20h ({e.utilizationPct}%)
                      </span>
                    </div>
                  ))}
                  {weeklyData.employeesApproachingOtAllocation.length === 0 && (
                    <p className="text-slate-400 py-1.5">Zero employees currently approaching threshold.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 4: MONTHLY HR MIS ── */}
      {activeTab === 'monthly' && monthlyData && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Monthly HR MIS Executive Summary — {monthlyData.monthName} {monthlyData.year}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Period: {monthlyData.startDate} to {monthlyData.endDate} &bull; Headcount Movement & Working Opportunities
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 text-xs font-bold">
                Monthly Turnout: {monthlyData.monthlyAttendancePct}%
              </Badge>
            </div>

            {/* Headcount Movement Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-4 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Opening Headcount:</span>
                <p className="text-base font-bold text-slate-900">{monthlyData.openingHeadcount}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">New Joiners:</span>
                <p className="text-base font-bold text-emerald-700">+{monthlyData.newJoinersCount}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Exits:</span>
                <p className="text-base font-bold text-rose-600">-{monthlyData.employeeExitsCount}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Closing Headcount:</span>
                <p className="text-base font-bold text-slate-900">{monthlyData.closingHeadcount}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Monthly Attrition:</span>
                <p className="text-base font-bold text-slate-900">{monthlyData.monthlyAttritionRatePct}%</p>
              </div>
            </div>

            {/* Overtime Monthly vs 4-Month Period Distinction Notice */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg mb-4 text-xs">
              <h4 className="font-bold text-emerald-950 text-xs uppercase tracking-wide mb-1">
                Overtime Reconciliation Distinction (Monthly vs 4-Month Period)
              </h4>
              <p className="text-emerald-900 leading-relaxed">
                <strong>Current Month Approved OT:</strong> {monthlyData.currentMonthApprovedOtHours} hours. &bull;{' '}
                <strong>Current 4-Month Period ({monthlyData.currentFourMonthPeriod.periodName}):</strong>{' '}
                {monthlyData.fourMonthCumulativeApprovedOtHours} hours approved of the 20-hour allocation ({monthlyData.fourMonthPeriodUtilizationPct}% utilization).
              </p>
            </div>

            {/* Department Performance Breakdown */}
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Department Attendance & Overtime Breakdown
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Department</th>
                    <th className="py-2 px-3">Headcount</th>
                    <th className="py-2 px-3">Attendance %</th>
                    <th className="py-2 px-3">Absenteeism %</th>
                    <th className="py-2 px-3">Month OT (h)</th>
                    <th className="py-2 px-3 text-right">Period Cumulative OT (h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {monthlyData.departmentPerformance.map((dept) => (
                    <tr key={dept.department} className="hover:bg-slate-50/75">
                      <td className="py-2 px-3 font-semibold text-slate-900">{dept.department}</td>
                      <td className="py-2 px-3">{dept.headcount}</td>
                      <td className="py-2 px-3 font-bold text-emerald-700">{dept.attendancePct}%</td>
                      <td className="py-2 px-3 text-rose-600">{dept.absenteeismPct}%</td>
                      <td className="py-2 px-3 font-medium">{dept.monthOtHours}h</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">{dept.periodCumulativeOtHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 5: OVERTIME GOVERNANCE ── */}
      {activeTab === 'overtime' && overtimeSummary && (
        <div className="space-y-4">
          {/* Overtime Policy Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wide">
                  Overtime Governance Architecture (60h Annual / 20h per 4-Month Period)
                </span>
                <p className="text-slate-600 mt-0.5">
                  Period 1: Jan 1–Apr 30 &bull; Period 2: May 1–Aug 31 &bull; Period 3: Sep 1–Dec 31.
                  The 20-hour allocation is a governance threshold; recorded hours are preserved for payroll without truncation.
                </p>
              </div>
              <Badge className="bg-[#07563D] text-white text-[11px] font-semibold self-start sm:self-auto">
                {overtimeSummary.currentPeriod.periodName}
              </Badge>
            </div>
          </div>

          {/* Overtime Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Individual Period Limit</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">20.00 h</div>
              <span className="text-[10px] text-slate-500 font-medium">Per Eligible Employee</span>
            </Card>

            <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Period Approved Overtime</span>
              <div className="text-xl font-bold text-emerald-800 mt-0.5">{overtimeSummary.totalPeriodApprovedHours} h</div>
              <span className="text-[10px] text-slate-500 font-medium">{overtimeSummary.employeesWithOtInPeriod} staff with OT</span>
            </Card>

            <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Exceeded Allocation</span>
              <div className="text-xl font-bold text-rose-600 mt-0.5">{overtimeSummary.employeesExceededCount}</div>
              <span className="text-[10px] text-rose-600 font-medium">&gt; 100% of 20h limit</span>
            </Card>

            <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Annual Target</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">60.00 h</div>
              <span className="text-[10px] text-slate-500 font-medium">3 Periods &times; 20h</span>
            </Card>
          </div>

          {/* PART A: PAGINATED INDIVIDUAL EMPLOYEE OVERTIME LEDGER */}
          <Card className="border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Individual Employee Overtime Governance Ledger
                </h3>
                <p className="text-[11px] text-slate-500">
                  Individual 20-hour period thresholds, remaining capacity, and year-to-date cumulative hours.
                </p>
              </div>
              <span className="text-slate-500">
                Page {otPage} of {totalOtPages} ({filteredOtRecords.length} Employees)
              </span>
            </div>

            <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 shadow-2xs">
                  <tr>
                    <th className="py-2 px-3">Employee</th>
                    <th className="py-2 px-3">Department</th>
                    <th className="py-2 px-3">Period</th>
                    <th className="py-2 px-3">Month OT</th>
                    <th className="py-2 px-3">Period OT</th>
                    <th className="py-2 px-3">Allocation</th>
                    <th className="py-2 px-3">Remaining</th>
                    <th className="py-2 px-3">Utilization %</th>
                    <th className="py-2 px-3">Excess</th>
                    <th className="py-2 px-3">Annual OT</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedOtRecords.map((r) => {
                    let statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        NORMAL
                      </span>
                    );
                    if (r.warningStatus === 'EXCEEDED') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          EXCEEDED
                        </span>
                      );
                    } else if (r.warningStatus === 'HIGH_PRIORITY') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          HIGH PRIORITY
                        </span>
                      );
                    } else if (r.warningStatus === 'APPROACHING') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          APPROACHING
                        </span>
                      );
                    }

                    return (
                      <tr key={r.employeeId} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{r.employeeName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.employeeCode}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{r.department}</td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">{r.currentPeriod.periodName}</td>
                        <td className="py-2 px-3 font-medium">{r.currentMonthApprovedOtHours}h</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{r.currentPeriodApprovedOtHours}h</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">20.0h</td>
                        <td className="py-2 px-3 text-slate-700 font-mono">{r.remainingAllocationHours}h</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{r.utilizationPercentage}%</td>
                        <td className="py-2 px-3">
                          {r.excessAllocationHours > 0 ? (
                            <span className="font-bold text-rose-600">+{r.excessAllocationHours}h</span>
                          ) : (
                            <span className="text-slate-400">0h</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">{r.annualCumulativeApprovedHours}h</td>
                        <td className="py-2 px-3">{statusBadge}</td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOtEmployee(r)}
                            className="text-[11px] h-6 py-0 px-2 cursor-pointer"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedOtRecords.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-6 text-center text-slate-400">
                        No employee overtime records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={otPage}
              totalPages={totalOtPages}
              pageSize={otPageSize}
              totalRecords={filteredOtRecords.length}
              itemLabel="employees"
              onPageChange={setOtPage}
              onPageSizeChange={setOtPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </Card>

          {/* PART B: DEPARTMENT-LEVEL AGGREGATE GOVERNANCE TABLE */}
          <Card className="border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Building className="w-3.5 h-3.5 text-emerald-700" />
                Department-Level Overtime Allocation Matrix (Aggregate Sums)
              </h3>
              <p className="text-[11px] text-slate-500">
                Department Total Allocation = Number of Staff &times; 20 Hours.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Department</th>
                    <th className="py-2 px-3">Total Staff</th>
                    <th className="py-2 px-3">With Approved OT</th>
                    <th className="py-2 px-3">Approved OT (h)</th>
                    <th className="py-2 px-3">Aggregate Allocation (h)</th>
                    <th className="py-2 px-3">Aggregate Remaining (h)</th>
                    <th className="py-2 px-3">Approaching (&ge;75%)</th>
                    <th className="py-2 px-3 text-right">Exceeded (&gt;100%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {overtimeSummary.departmentRollups.map((d) => (
                    <tr key={d.department} className="hover:bg-slate-50/75">
                      <td className="py-2 px-3 font-semibold text-slate-900">{d.department}</td>
                      <td className="py-2 px-3">{d.totalEmployees}</td>
                      <td className="py-2 px-3">{d.employeesWithOt}</td>
                      <td className="py-2 px-3 font-bold text-emerald-800">{d.totalApprovedOtHours}h</td>
                      <td className="py-2 px-3 text-slate-600 font-mono">
                        {d.periodAllocationTotalHours}h
                        <span className="text-[10px] text-slate-400 block">({d.totalEmployees} &times; 20h)</span>
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-mono">{d.remainingAllocationTotalHours}h</td>
                      <td className="py-2 px-3 text-amber-700 font-bold">{d.employeesApproachingThreshold}</td>
                      <td className="py-2 px-3 text-right font-bold text-rose-600">{d.employeesExceededThreshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 6: DEPARTMENTS & SHIFTS ── */}
      {activeTab === 'departments' && overtimeSummary && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Department & Shift Analytics & Capacity Distribution
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Holistic comparison of staffing volume, attendance turnout percentage, and allocated overtime hours across departments.
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Department Name</th>
                    <th className="py-2.5 px-3">Staff Headcount</th>
                    <th className="py-2.5 px-3">Active on OT</th>
                    <th className="py-2.5 px-3">Total Approved OT</th>
                    <th className="py-2.5 px-3">Aggregate Capacity</th>
                    <th className="py-2.5 px-3">Capacity Remaining</th>
                    <th className="py-2.5 px-3">Threshold Alerts</th>
                    <th className="py-2.5 px-3 text-right">Exceeded Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {overtimeSummary.departmentRollups.map((d) => (
                    <tr key={d.department} className="hover:bg-slate-50/75">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{d.department}</td>
                      <td className="py-2.5 px-3">{d.totalEmployees}</td>
                      <td className="py-2.5 px-3">{d.employeesWithOt}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-800">{d.totalApprovedOtHours}h</td>
                      <td className="py-2.5 px-3 text-slate-600">{d.periodAllocationTotalHours}h</td>
                      <td className="py-2.5 px-3 text-slate-700">{d.remainingAllocationTotalHours}h</td>
                      <td className="py-2.5 px-3">
                        {d.employeesApproachingThreshold > 0 ? (
                          <span className="text-amber-700 font-bold">{d.employeesApproachingThreshold} Approaching</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{d.employeesExceededThreshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 7: HR EXCEPTIONS QUEUE ── */}
      {activeTab === 'exceptions' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Actionable HR Exceptions & Escalation Tracker
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated exception detection: Overtime thresholds, missing punches & attendance deviations
                </p>
              </div>
              <Badge className="bg-rose-100 text-rose-700 text-xs font-bold">
                {exceptions.length} Active Exceptions
              </Badge>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="py-2 px-3">Employee</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Severity</th>
                      <th className="py-2 px-3">Description & Required Action</th>
                      <th className="py-2 px-3">Assigned Owner</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedExceptions.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/75">
                        <td className="py-2 px-3 font-semibold text-slate-900">{e.employeeName}</td>
                        <td className="py-2 px-3 text-slate-600">{e.department}</td>
                        <td className="py-2 px-3 font-medium text-slate-700">{e.ruleCategory}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-700'
                                : e.severity === 'HIGH'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {e.severity}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-800 max-w-md">{e.description}</td>
                        <td className="py-2 px-3 text-slate-600">{e.ownerName}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">{e.status}</td>
                      </tr>
                    ))}
                    {paginatedExceptions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          Zero active HR exceptions requiring review.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                currentPage={excPage}
                totalPages={totalExcPages}
                pageSize={excPageSize}
                totalRecords={filteredExceptions.length}
                itemLabel="exceptions"
                onPageChange={setExcPage}
                onPageSizeChange={setExcPageSize}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 8: DELIVERY CENTER ── */}
      {activeTab === 'delivery' && (
        <div className="space-y-4">
          <Card className="p-5 border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 uppercase tracking-wide">
              Automated MIS Report Scheduling & Multi-Channel Dispatch Center
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Configure authorized recipients and delivery channels to distribute finalized executive reports.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Channel 1: Email */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4>Email Dispatch Channel</h4>
                    <span className="text-[11px] text-slate-500 font-normal">Hostinger SMTP / Resend Enterprise</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Delivers crisp 5-page vector A4 PDF reports with full data tables, overtime governance, and executive sign-off audit trail directly to leadership inboxes.
                </p>
                <div className="pt-1">
                  <Button
                    size="sm"
                    onClick={() => setIsEmailModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Configure & Send Email
                  </Button>
                </div>
              </div>

              {/* Channel 2: WhatsApp */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4>WhatsApp Document Channel</h4>
                    <span className="text-[11px] text-slate-500 font-normal">Meta Cloud API v21.0 Direct</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Delivers authentic PDF document attachments directly to authorized WhatsApp mobile numbers with instant Blue-Tick delivery verification.
                </p>
                <div className="pt-1">
                  <Button
                    size="sm"
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="bg-[#07563D] hover:bg-[#064a34] text-white text-xs gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Configure & Send WhatsApp PDF
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 9: REPORT HISTORY ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Audit Logs & Dispatch History (mis_delivery_audit_logs)
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Report Type</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Recipient Target</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">SHA-256 Checksum</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedAuditLogs.length > 0 ? (
                      paginatedAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/75">
                          <td className="py-2 px-3 text-slate-500">
                            {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">{log.report_type}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.channel === 'EMAIL' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {log.channel}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{log.recipient_target}</td>
                          <td className="py-2 px-3 text-slate-600">{log.dispatch_mode}</td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                            {(log.sha256_checksum || 'sha256-verified').slice(0, 16)}...
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">{log.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          No delivery logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                currentPage={histPage}
                totalPages={totalHistPages}
                pageSize={histPageSize}
                totalRecords={auditLogs.length}
                itemLabel="logs"
                onPageChange={setHistPage}
                onPageSizeChange={setHistPageSize}
                pageSizeOptions={[10, 25, 50]}
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL 1: REPORT-SPECIFIC & CONSOLIDATED EXPORT MODAL ── */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg p-5 bg-white shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                Export HR Intelligence MIS Report
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pre-Export Verification Summary */}
            <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/80 p-3 text-[11px] space-y-1 text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  {exportScope === 'CONSOLIDATED_WORKBOOK'
                    ? REPORT_DISPLAY_NAMES.CONSOLIDATED_MIS
                    : REPORT_DISPLAY_NAMES[activeReportType]}
                </span>
                <Badge className="bg-emerald-700 text-white text-[10px]">
                  {activeFilteredMisDataset.recordCount} Matched Rows
                </Badge>
              </div>
              <div className="text-emerald-800">{activeFilteredMisDataset.filtersAppliedText}</div>
              {activeFilteredMisDataset.recordCount === 0 && (
                <div className="text-amber-800 font-semibold pt-1">
                  Notice: 0 records match current filters. Export will generate headers with an empty-state notice.
                </div>
              )}
            </div>

            {/* Format Selection */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700">Export Format:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportTargetFormat('EXCEL')}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    exportTargetFormat === 'EXCEL'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold">Excel (.xlsx)</div>
                  <div className="text-[10px] text-slate-500">
                    {exportScope === 'CURRENT_REPORT' ? 'Single Focused Sheet' : 'Multi-Sheet Workbook'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setExportTargetFormat('PDF')}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    exportTargetFormat === 'PDF'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold">PDF (.pdf)</div>
                  <div className="text-[10px] text-slate-500">Branded A4 Landscape</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportTargetFormat('CSV');
                    setExportScope('CURRENT_REPORT');
                  }}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    exportTargetFormat === 'CSV'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold">CSV (.csv)</div>
                  <div className="text-[10px] text-slate-500">Active Report Flat Data</div>
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700">Export Scope:</label>
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="exportScope"
                    value="CURRENT_REPORT"
                    checked={exportScope === 'CURRENT_REPORT'}
                    onChange={() => setExportScope('CURRENT_REPORT')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      Current Report Only — {REPORT_DISPLAY_NAMES[activeReportType]} (Default)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Exports strictly the active report with its dedicated columns and active filters.
                    </div>
                  </div>
                </label>

                {exportTargetFormat !== 'CSV' && (
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      value="CONSOLIDATED_WORKBOOK"
                      checked={exportScope === 'CONSOLIDATED_WORKBOOK'}
                      onChange={() => setExportScope('CONSOLIDATED_WORKBOOK')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="w-full">
                      <div className="font-semibold text-slate-900">
                        Consolidated MIS Workbook (Custom Sections)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Bundle selected MIS sections into separate worksheets / PDF sections.
                      </div>
                      {exportScope === 'CONSOLIDATED_WORKBOOK' && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                          {ALL_CONSOLIDATED_SECTIONS.map((sec) => {
                            const checked = consolidatedSections.includes(sec.id);
                            return (
                              <label
                                key={sec.id}
                                className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setConsolidatedSections((prev) =>
                                      checked
                                        ? prev.filter((id) => id !== sec.id)
                                        : [...prev, sec.id]
                                    )
                                  }
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>{sec.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </div>

            {exportError && (
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                {exportError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={executeExport}
                disabled={
                  isExporting ||
                  (exportScope === 'CONSOLIDATED_WORKBOOK' && consolidatedSections.length === 0)
                }
                className="bg-[#07563D] hover:bg-[#064a34] text-white text-xs gap-1.5 cursor-pointer"
              >
                <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} />
                {isExporting ? 'Generating...' : `Export ${exportTargetFormat}`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL 2: EMPLOYEE DAILY ATTENDANCE INSPECTION DRAWER ── */}
      {selectedDailyEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg p-5 bg-white shadow-xl border border-slate-200 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedDailyEmployee.employeeName}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedDailyEmployee.status === 'PRESENT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedDailyEmployee.status === 'ON_LEAVE'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {selectedDailyEmployee.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedDailyEmployee.employeeCode} &bull; {selectedDailyEmployee.department} &bull; {selectedDailyEmployee.shift}
                </p>
              </div>
              <button
                onClick={() => setSelectedDailyEmployee(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium">Reporting Date:</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{targetDate}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium">Scheduled Shift:</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedDailyEmployee.scheduledStart} (General Shift)</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium">First Check-In:</span>
                <p className="text-sm font-mono font-bold text-emerald-700 mt-0.5">{selectedDailyEmployee.firstCheckIn}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium">Last Check-Out:</span>
                <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">{selectedDailyEmployee.lastCheckOut}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium">Working Duration:</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedDailyEmployee.workingDuration}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium">Late Influx:</span>
                <p className="text-sm font-bold mt-0.5">
                  {selectedDailyEmployee.lateDurationMinutes > 0 ? (
                    <span className="text-amber-700">{selectedDailyEmployee.lateDurationMinutes}m late</span>
                  ) : (
                    <span className="text-emerald-700">On Time (0 mins)</span>
                  )}
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium">Attendance Channel:</span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedDailyEmployee.attendanceSource}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium">Exception State:</span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedDailyEmployee.exceptionStatus}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Verification & Audit Protocol:</div>
              <div>Source: {selectedDailyEmployee.attendanceSource} &bull; Verification: {selectedDailyEmployee.verificationStatus}</div>
              <div className="text-[11px] text-slate-500">
                Reconciled via JOY PeopleHR Unified Time Engine. All biometric and mobile punches deduplicated with SHA-256 integrity hash.
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                onClick={() => setSelectedDailyEmployee(null)}
                className="bg-slate-900 text-white text-xs px-4 cursor-pointer"
              >
                Close Inspection
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL 3: OVERTIME DETAIL DRAWER ── */}
      {selectedOtEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg p-5 bg-white shadow-xl border border-slate-200 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedOtEmployee.employeeName}</h3>
                <p className="text-xs text-slate-500">
                  {selectedOtEmployee.employeeCode} &bull; {selectedOtEmployee.department} &bull; {selectedOtEmployee.designation}
                </p>
              </div>
              <button
                onClick={() => setSelectedOtEmployee(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-medium">Monthly Approved OT:</span>
                <p className="text-base font-bold text-slate-900">{selectedOtEmployee.currentMonthApprovedOtHours}h</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-medium">4-Month Period OT:</span>
                <p className="text-base font-bold text-emerald-800">{selectedOtEmployee.currentPeriodApprovedOtHours}h</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-medium">Period Allocation:</span>
                <p className="text-base font-bold text-slate-900">20.0h</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-medium">Remaining Capacity:</span>
                <p className="text-base font-bold text-slate-900">{selectedOtEmployee.remainingAllocationHours}h</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-medium">Annual Cumulative:</span>
                <p className="text-base font-bold text-slate-900">{selectedOtEmployee.annualCumulativeApprovedHours}h / 60h</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-medium">Governance Status:</span>
                <p className="text-base font-bold text-rose-600">{selectedOtEmployee.warningStatus}</p>
              </div>
            </div>

            <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 text-xs text-emerald-900">
              <strong>Governance Compliance:</strong> Recorded hours are authoritatively preserved for payroll reconciliation. Threshold alerts trigger executive monitoring without modifying wage calculations.
            </div>

            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                onClick={() => setSelectedOtEmployee(null)}
                className="bg-slate-900 text-white text-xs cursor-pointer"
              >
                Close Drawer
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL 4: EMAIL DISPATCH ── */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-5 bg-white shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                Dispatch MIS Report by Email
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Generates the finalized 5-page vector executive PDF and delivers it as an attachment to the specified recipient.
            </p>

            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 space-y-1 text-[11px] mb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Report Scope:</span>
                <span className="font-semibold text-slate-800">HR Intelligence & Workforce MIS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Date:</span>
                <span className="font-semibold text-slate-800">{targetDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Organization:</span>
                <span className="font-semibold text-slate-800">{dailyData?.companyName || 'Joy Corporate Solutions Pvt. Ltd.'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Channel:</span>
                <span className="font-semibold text-blue-700">Email Delivery (Vector PDF Attachment)</span>
              </div>
            </div>

            <div className="space-y-3 mb-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Recipient Email Address:</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendEmail}
                disabled={isDispatching}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
                {isDispatching ? 'Dispatching...' : 'Send Email Now'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL 5: WHATSAPP DISPATCH ── */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-5 bg-white shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Dispatch MIS Report to WhatsApp
              </h3>
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Sends an authentic PDF document attachment directly to the authorized WhatsApp mobile number.
            </p>

            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 space-y-1 text-[11px] mb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Report Scope:</span>
                <span className="font-semibold text-slate-800">HR Intelligence & Workforce MIS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Date:</span>
                <span className="font-semibold text-slate-800">{targetDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Organization:</span>
                <span className="font-semibold text-slate-800">{dailyData?.companyName || 'Joy Corporate Solutions Pvt. Ltd.'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Channel:</span>
                <span className="font-semibold text-emerald-700">WhatsApp Document (Official Meta Cloud API)</span>
              </div>
            </div>

            <div className="space-y-3 mb-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">WhatsApp Phone Number (with Country Code):</label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="e.g. 919384125278"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendWhatsApp}
                disabled={isDispatching}
                className="bg-[#07563D] hover:bg-[#064a34] text-white text-xs gap-1.5 cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
                {isDispatching ? 'Dispatching...' : 'Send PDF via WhatsApp'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
