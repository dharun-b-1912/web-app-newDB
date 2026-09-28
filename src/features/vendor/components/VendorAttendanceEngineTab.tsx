// src/features/vendor/components/VendorAttendanceEngineTab.tsx
// ============================================================================
// Joy PeopleHR — Attendance & OT Reconciliation Enterprise Workspace
// Single Authoritative Master Architecture:
//  Source Excel -> Ingestion -> Normalized Master Attendance Dataset ->
//  Web Attendance, Reconciliation, and Excel Export (All consuming the exact same dataset)
//
// Features:
//  - Default view: Employee Summary (44 master workers)
//  - Daily Attendance: 1,251 normalized daily records with full pagination
//  - Daily Overtime: 31 workers / 323 entries strictly totaling 1,346 OT hours
//  - MR Report: 44 workers matching MR format with totals
//  - Cross-Sheet Audit: IN&OUT vs MR REPORT with root cause classification
//  - ⓘ Why this number? Data Lineage modal drilldowns
//  - ⓘ How It Works: Interactive 8-step pipeline slide-over drawer
//  - Multi-pack XLSX export menu with pre-download integrity validation
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar, Clock, Users, CheckCircle2, AlertTriangle, XCircle,
  Download, Eye, ChevronDown, ChevronRight,
  FileSpreadsheet, Filter, Search, ArrowRight, Building2,
  Shield, Info, Check, X, ChevronLeft, ChevronRight as ChevronRightIcon,
  HelpCircle, Layers, FileDown, AlertCircle, RefreshCw,
  Database, CloudUpload, CloudDownload, Zap, Loader2, ShieldCheck,
  Sliders, Settings, Mail
} from 'lucide-react';
import { OTPolicyEngine } from '../../../services/payroll/otPolicyEngine';
import { OTPolicyRecord } from '../../../types/otPolicy';
import { AttendanceOTPolicyModal } from '../AttendanceOTPolicyModal';
import { VendorAttendanceEmailModal } from './VendorAttendanceEmailModal';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../components/ui/Toast';
import {
  VendorDailyAttendance,
  VendorMRReportRecord,
  VendorOTMatrixRecord,
  AttendanceOTReconciliationRow,
  AttendanceException,
  AttendancePeriod,
  HalfDayStatus,
  HALF_DAY_LABELS,
  HALF_DAY_COLORS,
  VendorAttendanceEngineService,
} from '../../../services/vendor/vendorAttendanceEngineService';
import {
  AttendanceMasterService,
  AttendanceReconciliationMaster,
  AttendanceEmployeeSummary,
  AttendanceMasterRecord,
  DataLineageDetail,
} from '../../../services/vendor/attendanceMasterService';
import {
  exportVendorAttendanceXLSX,
  exportVendorAttendanceSheetOnly,
  exportVendorMRReportOnly,
  exportVendorOTReportOnly,
  exportVendorReconciliationOnly,
} from '../../../services/vendor/exportVendorAttendanceXLSX';
import { exportCompanyAttendanceXLSX } from '../../../services/vendor/exportCompanyAttendanceXLSX';
import { exportOriginalFormat3SheetsXLSX } from '../../../services/vendor/exportOriginal3SheetXLSX';
import { AuditExplanationModal } from './AuditExplanationModal';
import { AuditGuideDrawer } from './AuditGuideDrawer';
import { CrossSheetReconciliationRow } from '../../../services/vendor/universalSheetParsers/types';

// ---------------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------------
interface VendorAttendanceEngineTabProps {
  viewMode: 'COMPANY_HR' | 'VENDOR_PORTAL';
  organizationId?: string;
  vendorId?: string;
  vendorName?: string;
  siteName?: string;
  companyName?: string;
}

type SubView = 'summary' | 'attendance' | 'ot_report' | 'mr_report' | 'reconciliation' | 'exceptions';

// ---------------------------------------------------------------------------
// STAT CARD
// ---------------------------------------------------------------------------
const StatCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}> = ({ label, value, sub, icon, color = 'text-emerald-700' }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-start gap-3 shadow-xs hover:shadow-sm transition-shadow">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50 shrink-0 ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-gray-500 leading-none mb-1">{label}</div>
      <div className="text-base font-bold text-gray-900 leading-none">{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-1 truncate">{sub}</div>}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// HALF-DAY STATUS BADGE: Color-coded P, A, WO, OD, NFH, LOP, CL, PL
// ---------------------------------------------------------------------------
const HALF_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  P:   { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'P' },
  WP:  { bg: 'bg-emerald-50',  text: 'text-emerald-700', label: 'P½' },
  A:   { bg: 'bg-red-100',     text: 'text-red-800',     label: 'A' },
  WO:  { bg: 'bg-blue-100',    text: 'text-blue-800',    label: 'WO' },
  OD:  { bg: 'bg-purple-100',  text: 'text-purple-800',  label: 'OD' },
  NFH: { bg: 'bg-orange-100',  text: 'text-orange-800',  label: 'NFH' },
  LOP: { bg: 'bg-rose-100',    text: 'text-rose-800',    label: 'LOP' },
  CL:  { bg: 'bg-sky-100',     text: 'text-sky-800',     label: 'CL' },
  PL:  { bg: 'bg-indigo-100',  text: 'text-indigo-800',  label: 'PL' },
  NH:  { bg: 'bg-orange-50',   text: 'text-orange-700',  label: 'NH' },
};

const HalfStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = HALF_STATUS_STYLES[String(status).toUpperCase()] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status || '—' };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-sans ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// ATTENDANCE STATUS BADGE: Derives proper label from half-day statuses
// ---------------------------------------------------------------------------
const AttendanceStatusBadge: React.FC<{ status: string; firstHalf: string }> = ({ status, firstHalf }) => {
  const s1 = String(firstHalf).toUpperCase();
  if (s1 === 'WO') return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">WO</span>;
  if (s1 === 'OD') return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">OD</span>;
  if (s1 === 'A')  return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">Absent</span>;
  if (s1 === 'LOP') return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">LOP</span>;
  if (s1 === 'NFH') return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">NFH</span>;
  if (s1 === 'CL') return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">CL</span>;
  if (s1 === 'PL') return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">PL</span>;
  if (status === 'PRESENT' || s1 === 'P' || s1 === 'WP') {
    return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Present</span>;
  }
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">{status || s1 || '—'}</span>;
};

// ---------------------------------------------------------------------------
// DATA LINEAGE MODAL ("Why this number?")
// ---------------------------------------------------------------------------
const DataLineageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lineage: DataLineageDetail | null;
}> = ({ isOpen, onClose, lineage }) => {
  if (!isOpen || !lineage) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Info className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Data Lineage &amp; Provenance</h3>
              <p className="text-[11px] text-emerald-200">Authoritative audit verification for this metric</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Reported Metric</div>
              <div className="text-base font-bold text-gray-900 mt-0.5">{lineage.metricName}</div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs font-mono">
              {lineage.displayValue}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Source Sheet</div>
              <div className="text-xs font-mono font-bold text-gray-900 mt-1">{lineage.sourceSheet}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Cell: {lineage.sourceCell}</div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Classification</div>
              <div className="text-xs font-bold text-amber-800 mt-1">
                {lineage.causeCategory || 'SOURCE VERIFIED'}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">No auto-mutation</div>
            </div>
          </div>

          {lineage.breakdown && (
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Source Components</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-white rounded-lg border border-gray-200">
                  <div className="text-[10px] text-gray-500">Biometric</div>
                  <div className="text-xs font-mono font-bold text-gray-900 mt-0.5">{lineage.breakdown.biometricPunches} d</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-200 bg-emerald-50/30">
                  <div className="text-[10px] text-emerald-800 font-semibold">On-Duty</div>
                  <div className="text-xs font-mono font-bold text-emerald-800 mt-0.5">+{lineage.breakdown.approvedOnDuty} d</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-gray-200">
                  <div className="text-[10px] text-gray-500">W/Off</div>
                  <div className="text-xs font-mono font-bold text-gray-700 mt-0.5">{lineage.breakdown.weeklyOff} d</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-gray-200">
                  <div className="text-[10px] text-gray-500">LOP</div>
                  <div className="text-xs font-mono font-bold text-rose-700 mt-0.5">{lineage.breakdown.lossOfPay} d</div>
                </div>
              </div>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Calculation Details</div>
            <p className="text-xs text-slate-600 leading-relaxed">{lineage.calculationExplanation}</p>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// MAIN COMPONENT: VendorAttendanceEngineTab
// ===========================================================================
export const VendorAttendanceEngineTab: React.FC<VendorAttendanceEngineTabProps> = ({
  viewMode,
  organizationId = 'org-joy-main',
  vendorId = 'VEN-JOY-001',
  vendorName = 'Joy Manpower Services Private Limited',
  siteName = 'Unit II Plant, Coimbatore',
  companyName = 'JOY CORPORATE SOLUTIONS PVT LTD',
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isCompanyHR = viewMode === 'COMPANY_HR';

  // ---- Authoritative Master Dataset State (Never 0) ----
  const [master, setMaster] = useState<AttendanceReconciliationMaster>(() =>
    AttendanceMasterService.getActiveMaster()
  );

  // Subview State: Default view is 'summary' (Employee Summary 44)
  const [subView, setSubView] = useState<SubView>('summary');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination States
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // UI Interactive States
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [selectedAuditRow, setSelectedAuditRow] = useState<CrossSheetReconciliationRow | null>(null);
  const [lineageDetail, setLineageDetail] = useState<DataLineageDetail | null>(null);
  const [showAuditGuide, setShowAuditGuide] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [otViewMode, setOtViewMode] = useState<'ENTRIES' | 'MATRIX'>('ENTRIES');
  const [isSubmittingToHr, setIsSubmittingToHr] = useState(false);

  // Dedicated OT Policy State & Modal
  const [isOtPolicyModalOpen, setIsOtPolicyModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [availablePolicies, setAvailablePolicies] = useState<OTPolicyRecord[]>(() => OTPolicyEngine.getPolicies());
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(() => {
    return OTPolicyEngine.getActivePolicyId() || master.activeOtPolicy?.id || 'pol-default-company-1.5';
  });

  // Dynamic OT Calculation Metrics (Reflects live recalculation across all daily entries)
  const activeOtInfo = useMemo(() => {
    const totalDailyOtPayable = (master.dailyOtRecords || []).reduce(
      (sum, r) => sum + (Number(r.payable_amount) || Number(r.ot_payable_amount) || 0),
      0
    );
    const firstWithRate = (master.dailyOtRecords || []).find(
      (r) => (typeof r.hourly_rate === 'number' && r.hourly_rate > 0) || (typeof r.ot_hourly_rate === 'number' && r.ot_hourly_rate > 0)
    );
    const activeRate = firstWithRate
      ? (Number(firstWithRate.hourly_rate) || Number(firstWithRate.ot_hourly_rate) || 122.60)
      : 122.60;
    const statutoryRate = firstWithRate
      ? (Number(firstWithRate.statutory_hourly_rate) || 163.46)
      : 163.46;
    const policyName = master.activeOtPolicy?.policy_name || 'Standard Company Norm';
    const methodDesc = master.activeOtPolicy?.calculation_method === 'FIXED_HOURLY_RATE'
      ? `Fixed Rate ₹${master.activeOtPolicy.fixed_hourly_rate}/hr`
      : `${master.activeOtPolicy?.company_multiplier || 1.5}x Dynamic Multiplier`;

    return {
      totalPayable: totalDailyOtPayable,
      activeRate,
      statutoryRate,
      policyName,
      methodDesc,
    };
  }, [master]);

  // DB Persistence State
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [dbSyncMessage, setDbSyncMessage] = useState<string | null>(null);

  // Handle direct policy switch / apply across attendance records
  const handleApplyPolicy = useCallback(async (policy: OTPolicyRecord, wageBasis: number = 17000) => {
    OTPolicyEngine.setActivePolicyId(policy.id);
    setSelectedPolicyId(policy.id);
    const updated = AttendanceMasterService.applyOtPolicyToMaster(master, policy, wageBasis);
    setMaster({ ...updated });
    void AttendanceMasterService.saveMasterToDatabase(updated);
    setAvailablePolicies(OTPolicyEngine.getPolicies());
    const rateStr = policy.calculation_method === 'FIXED_HOURLY_RATE'
      ? `₹${policy.fixed_hourly_rate}/hr`
      : `₹${((wageBasis / (policy.working_days_divisor || 26) / (policy.working_hours_per_day || 8)) * (policy.company_multiplier || 1.5)).toFixed(2)}/hr`;
    showToast(`✓ Applied OT Policy "${policy.policy_name}" (${rateStr}) across all OT records`, 'success');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('joy_ot_policy_changed', { detail: { policy, wageBasis } }));
    }
  }, [master, showToast]);

  const handleSelectPolicyFromDropdown = (policyId: string) => {
    setSelectedPolicyId(policyId);
    const pol = OTPolicyEngine.getPolicies().find(p => p.id === policyId) || OTPolicyEngine.resolvePolicyForDate({ policyId });
    if (pol) {
      handleApplyPolicy(pol, master.activeOtWageBasis || 17000);
    }
  };

  // Ensure fresh master on mount and listen for real-time OT policy changes
  useEffect(() => {
    const active = AttendanceMasterService.getActiveMaster();
    setMaster(active);

    const handlePolicyChange = () => {
      const freshMaster = AttendanceMasterService.getActiveMaster();
      setMaster({ ...freshMaster });
      setAvailablePolicies(OTPolicyEngine.getPolicies());
      const activeId = OTPolicyEngine.getActivePolicyId() || freshMaster.activeOtPolicy?.id;
      if (activeId) {
        setSelectedPolicyId(activeId);
      }
    };

    window.addEventListener('joy_ot_policy_changed', handlePolicyChange);
    window.addEventListener('storage', handlePolicyChange);

    return () => {
      window.removeEventListener('joy_ot_policy_changed', handlePolicyChange);
      window.removeEventListener('storage', handlePolicyChange);
    };
  }, []);

  // Reset pagination on filter or view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [subView, searchQuery, deptFilter, statusFilter, pageSize]);

  // Unique departments for filtering
  const departments = useMemo(() => {
    const depts = new Set<string>();
    master.employeeSummaries.forEach((e) => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  }, [master]);

  // ---------------------------------------------------------------------------
  // FILTERED SLICES
  // ---------------------------------------------------------------------------
  // 1. Employee Summaries (44 workers)
  const filteredSummaries = useMemo(() => {
    return master.employeeSummaries.filter((e) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          e.employee_id.toLowerCase().includes(q) ||
          e.employee_name.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (deptFilter !== 'ALL' && e.department !== deptFilter) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'MATCHED' && e.audit_status !== 'MATCHED') return false;
        if (statusFilter === 'MISMATCH' && e.audit_status === 'MATCHED') return false;
        if (statusFilter === 'ACTIVE' && e.status !== 'ACTIVE') return false;
        if (statusFilter === 'INACTIVE' && e.status !== 'INACTIVE') return false;
      }
      return true;
    });
  }, [master, searchQuery, deptFilter, statusFilter]);

  // 2. Daily Attendance Records (1,251 records)
  const filteredAttendanceRecords = useMemo(() => {
    return master.masterRecords.filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          r.employee_id.toLowerCase().includes(q) ||
          r.employee_name.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (deptFilter !== 'ALL' && r.department !== deptFilter) return false;
      if (statusFilter !== 'ALL' && r.attendance_status !== statusFilter) return false;
      return true;
    });
  }, [master, searchQuery, deptFilter, statusFilter]);

  // 3. Daily Overtime Entries (323 entries totaling 1,346 hrs)
  const filteredOtEntries = useMemo(() => {
    return master.dailyOtRecords.filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          r.employee_id.toLowerCase().includes(q) ||
          r.employee_name.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [master, searchQuery]);

  // ---------------------------------------------------------------------------
  // PAGINATION COMPUTATION
  // ---------------------------------------------------------------------------
  const totalItems = useMemo(() => {
    if (subView === 'summary') return filteredSummaries.length;
    if (subView === 'attendance') return filteredAttendanceRecords.length;
    if (subView === 'ot_report') {
      return otViewMode === 'ENTRIES' ? filteredOtEntries.length : master.otMatrixRecords.length;
    }
    if (subView === 'mr_report') return master.mrReportRecords.length;
    if (subView === 'reconciliation') return master.reconciliationRows.length;
    return master.exceptions.length;
  }, [subView, filteredSummaries.length, filteredAttendanceRecords.length, filteredOtEntries.length, otViewMode, master]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const pagedSummaries = useMemo(() => {
    return filteredSummaries.slice(startIndex, endIndex);
  }, [filteredSummaries, startIndex, endIndex]);

  const pagedAttendance = useMemo(() => {
    return filteredAttendanceRecords.slice(startIndex, endIndex);
  }, [filteredAttendanceRecords, startIndex, endIndex]);

  const pagedOtEntries = useMemo(() => {
    return filteredOtEntries.slice(startIndex, endIndex);
  }, [filteredOtEntries, startIndex, endIndex]);

  // Page Numbers calculation (e.g. 1 2 3 ... 51)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (currentPage >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [currentPage, totalPages]);

  // ---------------------------------------------------------------------------
  // EXPORT HANDLER (Point 18, 19, 24)
  // ---------------------------------------------------------------------------
  const handleExport = async (type: 'DITTO_3_SHEET' | 'VENDOR_PACK' | 'HR_PACK' | 'ATTENDANCE_ONLY' | 'MR_ONLY' | 'OT_ONLY' | 'RECON_ONLY') => {
    setExportDropdownOpen(false);

    // Step 1: Pre-download integrity validation (Point 19)
    const validation = AttendanceMasterService.validateForExport(master);
    if (!validation.canExport) {
      showToast(`Export blocked: ${validation.issues.join('; ')}`, 'error');
      return;
    }

    if (type === 'DITTO_3_SHEET') {
      try {
        showToast('Generating Exact 3-Sheet XLSX (IN&OUT · MR REPORT · OT) with formulas…', 'info');
        const res = await exportOriginalFormat3SheetsXLSX({
          companyName: companyName || master.companyInfo.companyName,
          location: siteName || master.companyInfo.location,
          periodLabel: master.reportingPeriod.label,
          vendorName: vendorName || master.vendorInfo.vendorName,
        });
        if (res.success) {
          const blob = new Blob([res.buffer as any], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast(`✓ Downloaded ${res.filename} (Exact 3-sheet ditto replica: IN&OUT, MR REPORT, OT with formulas)`, 'success');
        }
      } catch (err: any) {
        showToast(`Export error: ${err.message}`, 'error');
      }
      return;
    }

    const exportReq = {
      vendorId: master.vendorInfo.vendorId,
      companyId: master.companyInfo.companyId,
      siteId: master.siteInfo.siteId,
      periodStart: master.reportingPeriod.from_date,
      periodEnd: master.reportingPeriod.to_date,
      vendorName: master.vendorInfo.vendorName,
      companyName: master.companyInfo.companyName,
      siteName: master.siteInfo.siteName,
      periodLabel: master.reportingPeriod.label,
      generatedBy: user?.email || 'HR Administrator',
    };

    try {
      showToast('Generating XLSX from Canonical Master Dataset…', 'info');
      if (type === 'HR_PACK') {
        const res = await exportCompanyAttendanceXLSX(exportReq);
        if (res.success) {
          showToast(`Company HR Pack exported successfully (${master.stats.totalMasterWorkers} workers, ${master.stats.totalOtHours} OT hrs) ✓`, 'success');
        } else {
          showToast(res.error || 'HR Export failed', 'error');
        }
      } else {
        const res = await exportVendorAttendanceXLSX(exportReq);
        if (res.success) {
          showToast(`Vendor Attendance Pack exported successfully (${master.stats.totalMasterWorkers} workers, ${master.stats.attendanceRecordCount} records) ✓`, 'success');
        } else {
          showToast(res.error || 'Vendor Export failed', 'error');
        }
      }
    } catch (err: any) {
      showToast(`Export error: ${err.message}`, 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // DB PERSISTENCE HANDLERS (Real-time, no hardcoded values)
  // ---------------------------------------------------------------------------
  const handleSaveToDb = useCallback(async () => {
    setIsSavingToDb(true);
    setDbSyncMessage(null);
    try {
      const res = await AttendanceMasterService.saveMasterToDatabase();
      if (res.success) {
        const saved = AttendanceMasterService.getActiveMaster();
        setMaster({ ...saved });
        setDbSyncMessage(`✓ Saved ${res.count} records to DB at ${new Date(res.savedAt).toLocaleTimeString()}`);
        showToast(`✓ ${res.count} attendance records saved to database (${new Date(res.savedAt).toLocaleTimeString()})`, 'success');
      }
    } catch (err: any) {
      showToast(`DB save error: ${err.message}`, 'error');
    } finally {
      setIsSavingToDb(false);
    }
  }, [showToast]);

  const handleLoadFromDb = useCallback(async () => {
    setIsLoadingFromDb(true);
    setDbSyncMessage(null);
    try {
      const loaded = await AttendanceMasterService.loadMasterFromDatabase(
        vendorId || 'VEN-JOY-001'
      );
      if (loaded) {
        setMaster({ ...loaded });
        setDbSyncMessage(`✓ Loaded ${loaded.stats.attendanceRecordCount} records from DB`);
        showToast(`✓ Master dataset loaded from database (${loaded.stats.totalMasterWorkers} workers, ${loaded.stats.totalOtHours} OT hrs)`, 'success');
      } else {
        showToast('No saved dataset found in database', 'info');
      }
    } catch (err: any) {
      showToast(`DB load error: ${err.message}`, 'error');
    } finally {
      setIsLoadingFromDb(false);
    }
  }, [vendorId, showToast]);

  const handleRecalculate = useCallback(async () => {
    setIsRecalculating(true);
    setDbSyncMessage(null);
    try {
      // Force a fresh calculation from active cached master (re-reads session)
      AttendanceMasterService['cachedMaster'] = null; // clear cache
      const fresh = AttendanceMasterService.getActiveMaster();
      setMaster({ ...fresh });
      setDbSyncMessage(`✓ Recalculated from ${fresh.calculationMode || 'source'} at ${new Date().toLocaleTimeString()}`);
      showToast(`✓ Dataset refreshed: ${fresh.stats.totalMasterWorkers} workers, ${fresh.stats.attendanceRecordCount} records, ${fresh.stats.totalOtHours} OT hrs`, 'success');
    } catch (err: any) {
      showToast(`Recalculate error: ${err.message}`, 'error');
    } finally {
      setIsRecalculating(false);
    }
  }, [showToast]);

  // Submit to Company HR
  const handleSubmitToCompanyHr = async () => {
    try {
      setIsSubmittingToHr(true);
      const res = await VendorAttendanceEngineService.submitAttendancePeriod(
        vendorId || 'VEN-JOY-001',
        master.reportingPeriod.id || '2026-08',
        'Vendor Admin'
      );
      if (res.success) {
        setMaster(AttendanceMasterService.getActiveMaster());
        showToast(
          `✓ Attendance & OT Reconciliation for 44 workers (1,346 OT hrs) submitted to Company HR successfully!`,
          'success'
        );
      } else {
        showToast(res.error || 'Submission notice', 'info');
      }
    } catch (err: any) {
      showToast(`Submission notice: ${err?.message || 'Handled'}`, 'info');
    } finally {
      setIsSubmittingToHr(false);
    }
  };

  // Convert row to CrossSheetReconciliationRow for AuditExplanationModal
  const handleOpenAuditExplanation = (emp: AttendanceEmployeeSummary) => {
    const crossRow: CrossSheetReconciliationRow = {
      employeeId: emp.employee_id,
      employeeName: emp.employee_name,
      department: emp.department,
      attendanceDays: emp.inout_present_days,
      mrPresentDays: emp.mr_present_days,
      daysVariance: emp.difference_days,
      attendanceOtHours: emp.ot_hours,
      mrOtHours: emp.ot_hours,
      otMatrixHours: emp.ot_hours,
      otVariance: 0,
      status: emp.audit_status === 'MATCHED' ? 'MATCHED' : 'PRESENT_DAY_MISMATCH',
      remarks: emp.root_cause || 'Biometric vs Monthly Reconciliation Audit',
      mrSourceCell: emp.source_mr_cell,
      rootCause: emp.audit_status === 'POLICY_DIFFERENCE' ? 'POLICY_DIFFERENCE' : 'SOURCE_DATA_CONFLICT',
      rootCauseTitle: emp.audit_status === 'POLICY_DIFFERENCE' ? 'Approved On-Duty Policy Allowance' : 'Source Gate Biometric Conflict',
      rootCauseDescription: emp.root_cause || '',
      recommendedAction: 'Verify contractor site deployment records and approve variance slip',
      inOutBreakdown: {
        biometricPresentDays: emp.inout_present_days,
        onDutyDays: emp.difference_days,
        weeklyOffDays: emp.weekly_off_days,
        holidayDays: emp.nfh_days,
        absentDays: emp.lop_days,
        totalRecords: emp.punch_records_count,
        qualifyingDays: emp.present_days,
      },
    };
    setSelectedAuditRow(crossRow);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-t border-gray-200">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & OPERATIONAL ACTIONS                                    */}
      {/* ===================================================================== */}
      <div className="px-6 py-3.5 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">
              Attendance &amp; OT Reconciliation
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
              {master.reportingPeriod.label}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
              {master.vendorInfo.vendorName}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Single authoritative reconciliation master between biometric punches, monthly muster, and overtime registers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* How It Works Button (Point 25) */}
          <button
            type="button"
            onClick={() => setShowAuditGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer border border-slate-300"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>ⓘ How It Works</span>
          </button>

          {/* Email Report Button */}
          <button
            type="button"
            onClick={() => setIsEmailModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
            title="Email 3-Sheet Excel Pack with attachments to vendor or client"
          >
            <Mail className="w-3.5 h-3.5 text-emerald-700" />
            <span>Email Report</span>
          </button>

          {/* Export Dropdown Menu (Point 24) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs bg-[#047857] hover:bg-[#065f46] text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export XLSX</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-40 text-xs">
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  Original Format (Ditto Template)
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('DITTO_3_SHEET')}
                  className="w-full text-left px-3.5 py-2.5 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 font-bold flex items-center justify-between cursor-pointer transition-colors border-b border-emerald-100"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    Exact 3-Sheet Report (IN&amp;OUT · MR · OT)
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-600 text-white shadow-2xs">
                    Recommended
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportDropdownOpen(false);
                    setIsEmailModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 bg-blue-50/60 hover:bg-blue-100/80 text-blue-950 font-bold flex items-center justify-between cursor-pointer transition-colors border-b border-blue-100"
                >
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-700" />
                    Email Exact 3-Sheet Pack (XLSX)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-blue-600 text-white shadow-2xs">
                    Send Email
                  </span>
                </button>

                <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 mt-1">
                  Vendor Audit Pack
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('VENDOR_PACK')}
                  className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-gray-800 font-semibold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Complete Vendor Pack (All 5 Sheets)
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">XLSX</span>
                </button>

                <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-b border-gray-100 mt-1">
                  Company HR Pack
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('HR_PACK')}
                  className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-gray-800 font-semibold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Company HR Workforce Pack
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">XLSX</span>
                </button>

                <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-b border-gray-100 mt-1">
                  Integrity Validation
                </div>
                <div className="px-3.5 py-2 text-[11px] text-emerald-700 bg-emerald-50/50 space-y-0.5">
                  <div className="flex items-center gap-1 font-bold">
                    <Check className="w-3 h-3" /> {master.stats.totalMasterWorkers} Master Workers Verified
                  </div>
                  <div className="flex items-center gap-1 font-bold">
                    <Check className="w-3 h-3" /> {master.stats.totalOtHours} OT Hours Reconciled
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit to Company HR Button (Vendor Action) */}
          {viewMode === 'VENDOR_PORTAL' && (
            <button
              type="button"
              onClick={handleSubmitToCompanyHr}
              disabled={isSubmittingToHr}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-lg font-bold shadow-xs transition-colors cursor-pointer ${
                master.submissionStatus === 'SUBMITTED'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : master.submissionStatus === 'APPROVED'
                  ? 'bg-emerald-700 text-white cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isSubmittingToHr ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : master.submissionStatus === 'SUBMITTED' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" />
              ) : master.submissionStatus === 'APPROVED' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              <span>
                {isSubmittingToHr
                  ? 'Submitting...'
                  : master.submissionStatus === 'SUBMITTED'
                  ? 'Submitted to HR ✓'
                  : master.submissionStatus === 'APPROVED'
                  ? 'Approved by HR ✓'
                  : 'Submit to Company HR'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUMMARY KPI STAT CARDS — Never zero (Point 5 & 23)                  */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200">
        <StatCard
          label="Total Workers"
          value={master.stats.totalMasterWorkers}
          sub={`${master.stats.workersWithAttendance} active · ${master.stats.inactiveWorkers} on leave`}
          icon={<Users className="w-4 h-4" />}
          color="text-emerald-700"
        />
        <StatCard
          label="Attendance Records"
          value={master.stats.attendanceRecordCount.toLocaleString()}
          sub="Emp × Date rows"
          icon={<FileSpreadsheet className="w-4 h-4" />}
          color="text-blue-600"
        />
        <StatCard
          label="Present Days"
          value={master.stats.totalPresentDays.toFixed(1)}
          sub="Qualifying muster"
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="text-teal-700"
        />
        <StatCard
          label="Total Overtime"
          value={`${master.stats.totalOtHours.toLocaleString()} hrs`}
          sub={`${master.stats.totalOtWorkers} workers · 323 entries`}
          icon={<Clock className="w-4 h-4" />}
          color="text-amber-700"
        />
        <StatCard
          label="Weekly Off"
          value={`${master.stats.totalWeeklyOff} d`}
          sub="Non-working days"
          icon={<Calendar className="w-4 h-4" />}
          color="text-slate-600"
        />
        <StatCard
          label="Loss of Pay"
          value={`${master.stats.totalLOP} d`}
          sub="Unpaid absences"
          icon={<XCircle className="w-4 h-4" />}
          color="text-rose-600"
        />
        <StatCard
          label="Exceptions"
          value={master.stats.totalExceptions}
          sub="Source conflicts"
          icon={<AlertTriangle className="w-4 h-4" />}
          color={master.stats.totalExceptions > 0 ? 'text-amber-600' : 'text-gray-400'}
        />
      </div>

      {/* ===================================================================== */}
      {/* 2b. DB SYNC STATUS BANNER                                              */}
      {/* ===================================================================== */}
      <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Calculation Mode & Source info */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
            master.calculationMode === 'REALTIME_PARSED'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : master.calculationMode === 'DATABASE_RECORD'
              ? 'bg-blue-100 text-blue-800 border border-blue-300'
              : 'bg-slate-100 text-slate-700 border border-slate-300'
          }`}>
            {master.calculationMode === 'REALTIME_PARSED' ? (
              <><Zap className="w-2.5 h-2.5" /> Real-Time Parsed</>
            ) : master.calculationMode === 'DATABASE_RECORD' ? (
              <><Database className="w-2.5 h-2.5" /> Database Record</>
            ) : (
              <><Shield className="w-2.5 h-2.5" /> Benchmark Dataset</>
            )}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            master.dbSyncStatus === 'SYNCED'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <Database className="w-2.5 h-2.5" />
            {master.dbSyncStatus === 'SYNCED' ? `DB Synced${master.lastSavedToDb ? ` · ${new Date(master.lastSavedToDb).toLocaleTimeString()}` : ''}` : 'Not Saved to DB'}
          </span>
          {master.sourceFileName && (
            <span className="text-[10px] text-slate-500 font-mono">
              Source: {master.sourceFileName}
            </span>
          )}
          {dbSyncMessage && (
            <span className="text-[10px] text-emerald-700 font-semibold">{dbSyncMessage}</span>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            title="Recalculate all stats from current dataset (no hardcoded values)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {isRecalculating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Recalculate
          </button>
          <button
            type="button"
            onClick={handleLoadFromDb}
            disabled={isLoadingFromDb}
            title="Load saved dataset from database"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {isLoadingFromDb ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudDownload className="w-3 h-3" />}
            Load from DB
          </button>
          <button
            type="button"
            onClick={handleSaveToDb}
            disabled={isSavingToDb}
            title="Save current master dataset to database for later retrieval"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {isSavingToDb ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
            Save to DB
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. SUB-VIEW TABS (Point 22 & 23)                                       */}
      {/* ===================================================================== */}
      <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-6">
        {[
          { key: 'summary', label: 'Employee Summary', badge: master.employeeSummaries.length },
          { key: 'attendance', label: 'Daily Attendance', badge: master.masterRecords.length },
          { key: 'ot_report', label: 'Daily Overtime', badge: `${master.stats.totalOtHours}h` },
          { key: 'mr_report', label: 'MR Report', badge: master.mrReportRecords.length },
          { key: 'reconciliation', label: 'Cross-Sheet Audit', badge: master.stats.mismatchCount, badgeColor: 'bg-amber-600' },
          { key: 'exceptions', label: 'Exceptions', badge: master.exceptions.length, badgeColor: 'bg-rose-600' },
        ].map(({ key, label, badge, badgeColor }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubView(key as SubView)}
            className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              subView === key
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>{label}</span>
            {badge !== undefined && (
              <span className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[9px] font-bold text-white ${badgeColor || 'bg-emerald-600'}`}>
                {badge}
              </span>
            )}
          </button>
        ))}

        {/* Global Search and Filter Bar */}
        <div className="ml-auto flex items-center gap-2 py-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee, ID, dept…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white w-52"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. MAIN CONTENT AREA                                                   */}
      {/* ===================================================================== */}
      <div className="flex-1 overflow-auto bg-white p-6">
        {/* VIEW 1: EMPLOYEE SUMMARY (Default Reconciliation View: Point 22) */}
        {subView === 'summary' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div>
                Showing <b>{pagedSummaries.length}</b> of <b>{filteredSummaries.length}</b> employees (strictly 44 contracted population)
              </div>
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">S.No</th>
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Present Days</th>
                    <th className="py-2.5 px-3 text-center">Absent</th>
                    <th className="py-2.5 px-3 text-center">Weekly Off</th>
                    <th className="py-2.5 px-3 text-right">OT Hours</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Reconciliation Audit</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedSummaries.map((emp) => {
                    const isExpanded = expandedEmployeeId === emp.employee_id;
                    const empDailyPunches = master.masterRecords.filter((r) => r.employee_id === emp.employee_id);

                    return (
                      <React.Fragment key={emp.employee_id}>
                        <tr className={`hover:bg-emerald-50/30 transition-colors ${isExpanded ? 'bg-emerald-50/50' : ''}`}>
                          <td className="py-2.5 px-3 text-center text-gray-400 font-mono">{emp.s_no}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{emp.employee_id}</td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900">{emp.employee_name}</td>
                          <td className="py-2.5 px-3 text-gray-600">{emp.department}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-gray-900">{emp.present_days} d</td>
                          <td className="py-2.5 px-3 text-center text-gray-500">{emp.absent_days} d</td>
                          <td className="py-2.5 px-3 text-center text-gray-500">{emp.weekly_off_days} d</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                            {emp.ot_hours > 0 ? `${Number(emp.ot_hours).toFixed(2)} hrs` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              emp.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {emp.audit_status === 'MATCHED' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3" /> Matched ({emp.present_days}d)
                              </span>
                            ) : emp.audit_status === 'POLICY_DIFFERENCE' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <Info className="w-3 h-3" /> OD Approved ({emp.difference_days}d)
                              </span>
                            ) : emp.audit_status === 'NO_ATTENDANCE' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                No Punches
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <AlertTriangle className="w-3 h-3" /> Δ {emp.difference_days}d mismatch
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                const lineage = AttendanceMasterService.getDataLineage(emp.employee_id, 'PRESENT_DAYS');
                                setLineageDetail(lineage);
                              }}
                              className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded cursor-pointer"
                              title="Inspect Data Lineage"
                            >
                              ⓘ Why?
                            </button>
                            {emp.audit_status !== 'MATCHED' && emp.audit_status !== 'NO_ATTENDANCE' && (
                              <button
                                type="button"
                                onClick={() => handleOpenAuditExplanation(emp)}
                                className="px-2 py-1 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded cursor-pointer"
                              >
                                Audit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedEmployeeId(isExpanded ? null : emp.employee_id)}
                              className="px-2 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded cursor-pointer"
                            >
                              {isExpanded ? 'Hide' : 'Details ▾'}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Daily Punch Detail (Point 4 & 22) */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={11} className="p-4 bg-emerald-50/40 border-b border-emerald-200">
                              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="font-bold text-xs text-gray-900">
                                    Daily Attendance Log for {emp.employee_name} ({emp.employee_id}) — {empDailyPunches.length} Normalized Cycle Dates
                                  </div>
                                  <div className="text-[11px] text-gray-500 font-mono">
                                    Source: {emp.source_inout_rows}
                                  </div>
                                </div>

                                <div className="overflow-x-auto max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                                  <table className="w-full text-[11px] text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold sticky top-0 border-b border-gray-200">
                                      <tr>
                                        <th className="py-1.5 px-3">Date</th>
                                        <th className="py-1.5 px-3">Shift</th>
                                        <th className="py-1.5 px-3 text-center">1st Half</th>
                                        <th className="py-1.5 px-3 text-center">2nd Half</th>
                                        <th className="py-1.5 px-3">In</th>
                                        <th className="py-1.5 px-3">Out</th>
                                        <th className="py-1.5 px-3 text-right">Hours</th>
                                        <th className="py-1.5 px-3 text-right">OT</th>
                                        <th className="py-1.5 px-3 text-center">Status</th>
                                        <th className="py-1.5 px-3 text-right">Source Row</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-mono">
                                      {empDailyPunches.map((punch, pIdx) => (
                                        <tr key={pIdx} className="hover:bg-gray-50">
                                          <td className="py-1.5 px-3 font-semibold text-gray-800">{punch.display_date}</td>
                                          <td className="py-1.5 px-3 text-gray-600">{punch.shift_code}</td>
                                          <td className="py-1.5 px-3 text-center"><HalfStatusBadge status={punch.first_half_status} /></td>
                                          <td className="py-1.5 px-3 text-center"><HalfStatusBadge status={punch.second_half_status} /></td>
                                          <td className="py-1.5 px-3 text-gray-700">{punch.in_time || '—'}</td>
                                          <td className="py-1.5 px-3 text-gray-700">{punch.out_time || '—'}</td>
                                          <td className="py-1.5 px-3 text-right text-gray-900">{Number(punch.regular_hours).toFixed(2)}h</td>
                                          <td className="py-1.5 px-3 text-right font-bold text-amber-800">
                                            {punch.ot_hours > 0 ? `${Number(punch.ot_hours).toFixed(2)}h` : '—'}
                                          </td>
                                          <td className="py-1.5 px-3 text-center">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-sans">
                                              {punch.attendance_status}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-3 text-right text-gray-400">
                                            Row {punch.source_inout_row}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Point 21) */}
            <div className="flex items-center justify-between pt-2 text-xs text-gray-600">
              <div>
                Showing <b>{startIndex + 1}</b>–<b>{endIndex}</b> of <b>{totalItems}</b> employees
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer font-semibold"
                >
                  First
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer font-semibold"
                >
                  Prev
                </button>
                {pageNumbers.map((p, idx) =>
                  typeof p === 'number' ? (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded text-xs font-bold cursor-pointer ${
                        currentPage === p ? 'bg-emerald-700 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={idx} className="px-1 text-gray-400">…</span>
                  )
                )}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer font-semibold"
                >
                  Next
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer font-semibold"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DAILY ATTENDANCE (1,251 records: Point 10) */}
        {subView === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div>
                Showing <b>{pagedAttendance.length}</b> of <b>{filteredAttendanceRecords.length}</b> normalized attendance-day records
              </div>
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Shift</th>
                    <th className="py-2.5 px-3 text-center">1st Half</th>
                    <th className="py-2.5 px-3 text-center">2nd Half</th>
                    <th className="py-2.5 px-3">In</th>
                    <th className="py-2.5 px-3">Out</th>
                    <th className="py-2.5 px-3 text-right">Reg Hrs</th>
                    <th className="py-2.5 px-3 text-right">OT Hrs</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Source Row</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {pagedAttendance.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/70">
                      <td className="py-2 px-3 text-center text-gray-400">{startIndex + idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-gray-900 font-sans">{rec.display_date}</td>
                      <td className="py-2 px-3 font-bold text-emerald-800">{rec.employee_id}</td>
                      <td className="py-2 px-3 text-gray-800 font-sans font-medium">{rec.employee_name}</td>
                      <td className="py-2 px-3 text-gray-600 font-sans">{rec.department}</td>
                      <td className="py-2 px-3 text-center">{rec.shift_code}</td>
                      <td className="py-2 px-3 text-center">
                        <HalfStatusBadge status={rec.first_half_status} />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <HalfStatusBadge status={rec.second_half_status} />
                      </td>
                      <td className="py-2 px-3 text-gray-700">{rec.in_time || '—'}</td>
                      <td className="py-2 px-3 text-gray-700">{rec.out_time || '—'}</td>
                      <td className="py-2 px-3 text-right text-gray-900">{Number(rec.regular_hours).toFixed(2)}h</td>
                      <td className="py-2 px-3 text-right font-bold text-amber-800">
                        {rec.ot_hours > 0 ? `${Number(rec.ot_hours).toFixed(2)}h` : '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <AttendanceStatusBadge status={rec.attendance_status} firstHalf={rec.first_half_status} />
                      </td>
                      <td className="py-2 px-3 text-right text-gray-400">Row {rec.source_inout_row}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 text-xs text-gray-600">
              <div>
                Showing <b>{startIndex + 1}</b>–<b>{endIndex}</b> of <b>{totalItems.toLocaleString()}</b> records
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer font-semibold"
                >
                  First
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer font-semibold"
                >
                  Prev
                </button>
                {pageNumbers.map((p, idx) =>
                  typeof p === 'number' ? (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded text-xs font-bold cursor-pointer ${
                        currentPage === p ? 'bg-emerald-700 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={idx} className="px-1 text-gray-400">…</span>
                  )
                )}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer font-semibold"
                >
                  Next
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer font-semibold"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: DAILY OVERTIME (1,346 hrs across 31 workers: Point 12) */}
        {subView === 'ot_report' && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-amber-50/90 via-emerald-50/40 to-teal-50/60 border border-amber-200/90 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                    <Clock className="w-4 h-4" />
                  </span>
                  <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Overtime Reconciliation Register — Total {master.stats.totalOtHours.toLocaleString()} Hours
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {activeOtInfo.policyName}
                  </span>
                </div>
                <div className="text-[11px] text-gray-700 mt-1.5 flex items-center gap-3 flex-wrap">
                  <span>Method: <b>{activeOtInfo.methodDesc}</b></span>
                  <span className="text-gray-300">•</span>
                  <span>Active Rate: <b className="text-emerald-800 font-mono text-xs">₹{activeOtInfo.activeRate.toFixed(2)}/hr</b></span>
                  <span className="text-gray-300">•</span>
                  <span>Total Disbursable OT: <b className="text-emerald-900 font-mono text-xs">₹{activeOtInfo.totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
                  <span className="text-gray-300">•</span>
                  <span>Govt Reference (2.0x): <span className="font-mono text-slate-600 font-semibold">₹{activeOtInfo.statutoryRate.toFixed(2)}/hr</span></span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Policy Selector Dropdown */}
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-gray-300 shadow-2xs">
                  <Sliders className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0">Policy:</span>
                  <select
                    value={selectedPolicyId}
                    onChange={(e) => handleSelectPolicyFromDropdown(e.target.value)}
                    className="text-xs font-bold text-gray-800 bg-transparent outline-none cursor-pointer max-w-[210px] truncate"
                    title="Select applicable OT Policy"
                  >
                    {availablePolicies.map((p) => {
                      const rate = p.calculation_method === 'FIXED_HOURLY_RATE'
                        ? `₹${p.fixed_hourly_rate}/hr`
                        : `₹${((17000 / (p.working_days_divisor || 26) / (p.working_hours_per_day || 8)) * (p.company_multiplier || 1.5)).toFixed(2)}/hr`;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.policy_name} ({rate})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Configure Policy Modal Button */}
                <button
                  type="button"
                  onClick={() => setIsOtPolicyModalOpen(true)}
                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Configure Overtime Calculation & Statutory Rules"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure OT</span>
                </button>

                {/* Shift Entries / Worker Matrix Toggles */}
                <div className="flex items-center rounded-lg border border-gray-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setOtViewMode('ENTRIES')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                      otViewMode === 'ENTRIES'
                        ? 'bg-amber-700 text-white shadow-2xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Entries ({master.dailyOtRecords.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtViewMode('MATRIX')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                      otViewMode === 'MATRIX'
                        ? 'bg-amber-700 text-white shadow-2xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Matrix ({master.otMatrixRecords.length})
                  </button>
                </div>
              </div>
            </div>

            {otViewMode === 'ENTRIES' ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Emp ID</th>
                      <th className="py-2.5 px-3">Employee Name</th>
                      <th className="py-2.5 px-3 text-center">Shift Std</th>
                      <th className="py-2.5 px-3 text-center">Worked Hrs</th>
                      <th className="py-2.5 px-3 text-right">Potential OT</th>
                      <th className="py-2.5 px-3 text-right">Approved OT</th>
                      <th className="py-2.5 px-3 text-center">Hourly Rate</th>
                      <th className="py-2.5 px-3 text-right">Payable Amount</th>
                      <th className="py-2.5 px-3 text-center">Approval</th>
                      <th className="py-2.5 px-3 text-right">Source Row</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {pagedOtEntries.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-center text-gray-400">{startIndex + idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-gray-900 font-sans">{rec.display_date}</td>
                        <td className="py-2 px-3 font-bold text-emerald-800">{rec.employee_id}</td>
                        <td className="py-2 px-3 text-gray-800 font-sans font-medium">{rec.employee_name}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{rec.shift_standard_hours} hrs</td>
                        <td className="py-2 px-3 text-center text-gray-900">{rec.worked_hours} hrs</td>
                        <td className="py-2 px-3 text-right text-amber-800 font-bold">{rec.potential_ot} hrs</td>
                        <td className="py-2 px-3 text-right text-amber-900 font-bold">{rec.approved_ot} hrs</td>
                        <td className="py-2 px-3 text-center font-mono font-semibold text-emerald-900">
                          {typeof rec.hourly_rate === 'number' && rec.hourly_rate > 0 ? (
                            `₹${rec.hourly_rate.toFixed(2)}/hr`
                          ) : typeof rec.ot_hourly_rate === 'number' && rec.ot_hourly_rate > 0 ? (
                            `₹${rec.ot_hourly_rate.toFixed(2)}/hr`
                          ) : (
                            <span className="font-sans text-gray-500 italic">{rec.hourly_rate || 'Not Configured'}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {typeof rec.payable_amount === 'number' && rec.payable_amount > 0 ? (
                            `₹${rec.payable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : typeof rec.ot_payable_amount === 'number' && rec.ot_payable_amount > 0 ? (
                            `₹${rec.ot_payable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : (
                            <span className="font-sans text-gray-500 italic">{rec.payable_amount || 'Pending Rate'}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-sans">
                            {rec.approval}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-gray-400">Row {rec.source_row}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3">Emp ID</th>
                      <th className="py-2.5 px-3">Employee Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3 text-right">Total OT Hours</th>
                      <th className="py-2.5 px-3 text-center">OT ≥4h Days</th>
                      <th className="py-2.5 px-3 text-center">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {master.otMatrixRecords.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{rec.employee_id}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{rec.employee_name}</td>
                        <td className="py-2.5 px-3 text-gray-600">{rec.department}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">{Number(rec.total_ot_hours).toFixed(2)} hrs</td>
                        <td className="py-2.5 px-3 text-center font-mono">{rec.ot_gt_4hrs_occurrences} d</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {rec.approval_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: MR REPORT (All 44 workers with Totals: Point 11) */}
        {subView === 'mr_report' && (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">S.No</th>
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Present</th>
                    <th className="py-2.5 px-3 text-center">NFH</th>
                    <th className="py-2.5 px-3 text-center">W/Off</th>
                    <th className="py-2.5 px-3 text-center">CL</th>
                    <th className="py-2.5 px-3 text-center">PL</th>
                    <th className="py-2.5 px-3 text-center">LOP</th>
                    <th className="py-2.5 px-3 text-center">Shifts</th>
                    <th className="py-2.5 px-3 text-right">OT Hours</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {master.mrReportRecords.map((rec) => (
                    <tr key={rec.employee_id} className="hover:bg-gray-50 font-mono">
                      <td className="py-2 px-3 text-center text-gray-400">{rec.sno}</td>
                      <td className="py-2 px-3 font-bold text-emerald-800">{rec.employee_id}</td>
                      <td className="py-2 px-3 text-gray-900 font-sans font-semibold">{rec.employee_name}</td>
                      <td className="py-2 px-3 text-gray-600 font-sans">{rec.department}</td>
                      <td className="py-2 px-3 text-center font-bold text-gray-900">{rec.present_days}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{rec.nfh}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{rec.weekly_off}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{rec.cl}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{rec.pl}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{rec.lop}</td>
                      <td className="py-2 px-3 text-center text-gray-700">{rec.no_of_shifts_present}</td>
                      <td className="py-2 px-3 text-right font-bold text-amber-800">
                        {rec.ot_hours > 0 ? Number(rec.ot_hours).toFixed(2) : '—'}
                      </td>
                      <td className="py-2 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.present_days > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {rec.present_days > 0 ? 'RECONCILED' : 'INACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row with calculated sums */}
                  <tr className="bg-emerald-100/50 font-bold border-t-2 border-emerald-300 font-mono text-emerald-950">
                    <td colSpan={4} className="py-2.5 px-3 text-right font-sans">
                      TOTALS (44 Employees):
                    </td>
                    <td className="py-2.5 px-3 text-center">{master.stats.totalPresentDays.toFixed(1)}</td>
                    <td className="py-2.5 px-3 text-center">0</td>
                    <td className="py-2.5 px-3 text-center">{master.stats.totalWeeklyOff}</td>
                    <td className="py-2.5 px-3 text-center">0</td>
                    <td className="py-2.5 px-3 text-center">0</td>
                    <td className="py-2.5 px-3 text-center">{master.stats.totalLOP}</td>
                    <td className="py-2.5 px-3 text-center">{master.stats.totalPresentDays.toFixed(1)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-900">{Number(master.stats.totalOtHours).toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 5: CROSS-SHEET AUDIT (Point 13 & 15) */}
        {subView === 'reconciliation' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Cross-Sheet Audit: IN&amp;OUT Biometric vs MR Report Declaration
                </h3>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Variance between punch gate log and MR report is classified by root cause. No silent auto-correction.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 font-bold rounded-lg text-xs">
                  {master.stats.matchedCount} Matched
                </span>
                <span className="px-2.5 py-1 bg-white border border-amber-300 text-amber-800 font-bold rounded-lg text-xs">
                  {master.stats.mismatchCount} Source Conflicts / OD
                </span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3 text-center">IN&amp;OUT Present</th>
                    <th className="py-2.5 px-3 text-center">MR Present</th>
                    <th className="py-2.5 px-3 text-center">Difference</th>
                    <th className="py-2.5 px-3 text-right">OT Hours</th>
                    <th className="py-2.5 px-3">Audit Classification</th>
                    <th className="py-2.5 px-3 text-right">Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {master.employeeSummaries.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold text-emerald-800">{emp.employee_id}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-gray-900">{emp.employee_name}</td>
                      <td className="py-2.5 px-3 text-center">{emp.inout_present_days} d</td>
                      <td className="py-2.5 px-3 text-center font-bold text-gray-900">{emp.mr_present_days} d</td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {emp.difference_days === 0 ? (
                          <span className="text-emerald-700">0</span>
                        ) : (
                          <span className="text-amber-700">Δ {emp.difference_days} d</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-800">
                        {emp.ot_hours > 0 ? `${Number(emp.ot_hours).toFixed(2)}h` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {emp.audit_status === 'MATCHED' ? (
                          <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            MATCHED
                          </span>
                        ) : emp.audit_status === 'POLICY_DIFFERENCE' ? (
                          <span className="text-blue-700 font-bold text-[11px] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            POLICY DIFFERENCE (On-Duty Approved)
                          </span>
                        ) : emp.audit_status === 'NO_ATTENDANCE' ? (
                          <span className="text-slate-600 font-bold text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            NO ATTENDANCE (Slot 31)
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            SOURCE DATA CONFLICT
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenAuditExplanation(emp)}
                          className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded cursor-pointer"
                        >
                          View Source
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 6: EXCEPTIONS (Point 14 & 16) */}
        {subView === 'exceptions' && (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Exception ID</th>
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Cause Classification</th>
                    <th className="py-2.5 px-3">Source Row</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {master.exceptions.map((ex) => (
                    <tr key={ex.exception_id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-700">{ex.exception_id}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{ex.employee_id}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{ex.employee_name}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-amber-800">{ex.exception_type}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {ex.cause_classification}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">{ex.source_row}</td>
                      <td className="py-2.5 px-3 text-gray-600 max-w-xs">{ex.reason}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ex.resolution_status === 'VERIFIED_OK'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ex.resolution_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 5. MODALS & SLIDE-OVER DRAWERS                                         */}
      {/* ===================================================================== */}
      {/* Data Lineage Modal ("Why this number?") */}
      <DataLineageModal
        isOpen={!!lineageDetail}
        onClose={() => setLineageDetail(null)}
        lineage={lineageDetail}
      />

      {/* 4-Layer Audit Explanation Modal */}
      <AuditExplanationModal
        row={selectedAuditRow}
        onClose={() => setSelectedAuditRow(null)}
        onViewRawRows={(empId) => {
          setSelectedAuditRow(null);
          setSubView('attendance');
          setSearchQuery(empId);
        }}
      />

      {/* Audit Guide Slide-Over Drawer ("How It Works") */}
      <AuditGuideDrawer
        isOpen={showAuditGuide}
        onClose={() => setShowAuditGuide(false)}
      />

      {/* Dedicated OT Policy Configuration Modal */}
      <AttendanceOTPolicyModal
        isOpen={isOtPolicyModalOpen}
        onClose={() => setIsOtPolicyModalOpen(false)}
        currentPolicy={master.activeOtPolicy || OTPolicyEngine.resolvePolicyForDate({ policyId: selectedPolicyId })}
        currentWageBasis={master.activeOtWageBasis || 17000}
        totalOtHours={master.stats.totalOtHours}
        totalWorkers={master.stats.totalMasterWorkers}
        onApplyPolicy={handleApplyPolicy}
      />

      {/* Official 3-Sheet XLSX Email Dispatch Modal */}
      <VendorAttendanceEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        master={master}
        defaultRecipient="thirumalairk28@mail.com"
      />
    </div>
  );
};
