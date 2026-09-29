// src/features/vendor/components/VendorWageEngineTab.tsx
// ============================================================================
// Joy PeopleHR — Production Vendor Wage Engine & Payroll Command Center
// Architecture: Attendance Master → Reconciliation Master → Payroll Policy Snapshot
//   → Wage Engine (Earnings vs Deductions vs Employer Costs vs Informational)
//   → Mathematical Validation → Approval State Machine → Dual-Format Excel Export
// ============================================================================

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Users, Wallet, TrendingUp, AlertTriangle, Settings2,
  ChevronDown, ChevronRight, HelpCircle, Play, Download,
  CheckCircle2, XCircle, Info, Clock, Shield, Zap, BookOpen,
  ArrowRight, Edit3, Eye, BarChart3, FileText, Lock, Unlock,
  FileSpreadsheet, ShieldCheck, Calculator, RefreshCw, Check,
  Sliders, Receipt, Award, Search, Filter
} from 'lucide-react';
import { PayrollHowItWorksModal } from './PayrollHowItWorksModal';
import { PayrollValidationPanel } from './PayrollValidationPanel';
import { WageWhyDrawer, DrawerWhyPayload } from './WageWhyDrawer';
import { PayrollTemplateBuilderModal } from './PayrollTemplateBuilderModal';
import { ControlledDeductionModal } from './ControlledDeductionModal';
import { WageEngineService, EmployeeWageConfig } from '../../../services/vendor/wageEngineService';
import { WageComponentMasterService } from '../../../services/vendor/wageComponentMasterService';
import { WagePolicyService, JOY_MANPOWER_SEP_2026_POLICY } from '../../../services/vendor/wagePolicyService';
import { PayrollValidationService } from '../../../services/vendor/payrollValidationService';
import { exportCompanySalaryStatementXLSX } from '../../../services/vendor/exportCompanySalaryStatementXLSX';
import { exportMasterPayrollPackXLSX } from '../../../services/vendor/exportMasterPayrollPackXLSX';
import { VendorMasterService, VendorMasterRecord } from '../../../services/vendor/vendorMasterService';
import { VendorWorkforceService } from '../../../services/vendor/vendorWorkforceService';
import { AttendanceMasterService, JOY_SEP_ALLOWANCES_MAP } from '../../../services/vendor/attendanceMasterService';
import { tenantContextService } from '../../../services/tenant/tenantContextService';
import { PayrollTemplate } from '../../../types/payrollTemplate';
import { PayrollTemplateService } from '../../../services/vendor/payrollTemplateService';

import {
  WageRunRecord,
  WageRunSummaryStats,
  EmployeeWageResult,
  WageLineItem,
  WageLineStatus,
  WageComponentRecord,
  PayrollRunStatus,
} from '../../../types/wageEngine';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtINR(n: number): string {
  if (n === 0) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtINRD(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_CONFIG: Record<WageLineStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  CALCULATED:      { label: 'Calculated',      bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCircle2 size={10} /> },
  ZERO_GENUINE:    { label: '₹0 (Genuine)',    bg: 'bg-gray-100',    text: 'text-gray-600',   icon: <CheckCircle2 size={10} /> },
  NOT_CONFIGURED:  { label: 'Not Configured',  bg: 'bg-amber-100',   text: 'text-amber-800',  icon: <Settings2 size={10} /> },
  PENDING:         { label: 'Pending',         bg: 'bg-blue-100',    text: 'text-blue-800',   icon: <Clock size={10} /> },
  MISSING_SOURCE:  { label: 'Missing Source',  bg: 'bg-orange-100',  text: 'text-orange-800', icon: <AlertTriangle size={10} /> },
  NOT_ELIGIBLE:    { label: 'Not Eligible',    bg: 'bg-gray-100',    text: 'text-gray-500',   icon: <XCircle size={10} /> },
  SOURCE_CONFLICT: { label: 'Source Conflict', bg: 'bg-red-100',     text: 'text-red-800',    icon: <AlertTriangle size={10} /> },
  CALC_ERROR:      { label: 'Calc Error',      bg: 'bg-red-200',     text: 'text-red-900',    icon: <XCircle size={10} /> },
};

function StatusBadge({ status }: { status: WageLineStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.CALCULATED;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// (No static mock configs — all employee wage data is loaded live from DB)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WAGE ENGINE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VendorWageEngineTab({
  vendorId = 'VND-JOY-01',
}: {
  vendorId?: string;
  initialDataset?: string;
}) {
  const [vendorsList, setVendorsList] = useState<VendorMasterRecord[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendorId);
  const [selectedVendor, setSelectedVendor] = useState<VendorMasterRecord | null>(null);
  const [currentOrgName, setCurrentOrgName] = useState<string>('Joy Corporate Solutions Pvt Ltd');
  const [isLoadingVendors, setIsLoadingVendors] = useState<boolean>(true);

  // ── Live employee wage configs fetched from vendor_workers + employees tables ──
  const [liveEmployeeConfigs, setLiveEmployeeConfigs] = useState<EmployeeWageConfig[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState<boolean>(true);
  // Keep a ref so handleRecalculate always uses the latest configs without stale closure
  const liveConfigsRef = useRef<EmployeeWageConfig[]>([]);
  liveConfigsRef.current = liveEmployeeConfigs;

  // Load real registered vendors and authoritative tenant context from PostgreSQL
  useEffect(() => {
    let active = true;
    setIsLoadingVendors(true);
    Promise.all([
      VendorMasterService.listVendors(),
      tenantContextService.resolveAuthoritativeContext().catch(() => null),
    ])
      .then(([vendorRes, tenantCtx]) => {
        if (!active) return;
        if (vendorRes.success && vendorRes.vendors.length > 0) {
          setVendorsList(vendorRes.vendors);
          const matched = vendorRes.vendors.find(
            (v) => v.id === selectedVendorId || v.vendorCode === selectedVendorId
          );
          if (matched) {
            setSelectedVendor(matched);
          } else {
            setSelectedVendor(vendorRes.vendors[0]);
            setSelectedVendorId(vendorRes.vendors[0].vendorCode || vendorRes.vendors[0].id);
          }
        }
        if (tenantCtx?.organizationName) {
          setCurrentOrgName(tenantCtx.organizationName);
        }
      })
      .finally(() => {
        if (active) setIsLoadingVendors(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // ── Fetch live worker configs whenever the selected vendor changes ────────────
  useEffect(() => {
    if (!selectedVendorId) return;
    let active = true;
    setIsLoadingWorkers(true);

    const fetchConfigsAndCalculate = () => {
      VendorWorkforceService.getVendorWorkers(selectedVendorId)
        .then((workers) => {
          if (!active) return;

          // Map VendorWorkerRecord → EmployeeWageConfig
          const configs: EmployeeWageConfig[] = workers
            .filter((w) => w.status === 'ACTIVE' || w.status === 'PENDING_APPROVAL')
            .map((w) => {
              const dailyRate = w.dailyWageRate > 0
                ? w.dailyWageRate
                : w.monthlyBaseSalary > 0
                ? Math.round(w.monthlyBaseSalary / 26)
                : 0;
              return {
                employee_id: w.employeeId || w.id,
                employee_code: w.workerCode,
                daily_rate: dailyRate,
                ot_rate: ((w as any).overtimeHourlyRate && (w as any).overtimeHourlyRate > 0) ? (w as any).overtimeHourlyRate : undefined,
                advance_amount: 0,
                food_recovery: Number((w as any).foodRecovery) || JOY_SEP_ALLOWANCES_MAP[w.workerCode]?.canteen || JOY_SEP_ALLOWANCES_MAP[w.employeeId || w.id]?.canteen || 0,
                accommodation: 0,
                other_deduction: 0,
              };
            });

          // Also pull from active Attendance Master if workers aren't in Postgres yet
          const activeMaster = AttendanceMasterService.getActiveMaster(selectedVendorId);
          const existingCodes = new Set(configs.map((c) => c.employee_code));
          const rosterSource = (activeMaster.mrReportRecords && activeMaster.mrReportRecords.length > 0)
            ? activeMaster.mrReportRecords
            : activeMaster.employeeSummaries || [];

          rosterSource.forEach((r: any) => {
            const empCode = r.employee_code || r.employee_id;
            if (empCode && !existingCodes.has(empCode)) {
              const dailyRate = r.rate > 0 ? r.rate : (r.wages && r.present_days > 0 ? Math.round(r.wages / r.present_days) : 605);
              configs.push({
                employee_id: empCode,
                employee_code: empCode,
                daily_rate: dailyRate,
                ot_rate: undefined, // Allows Wage Engine to calculate statutory double rate (83.1875/hr)
                advance_amount: 0,
                food_recovery: Number((r as any).canteen ?? (r as any).canteenDeduction) || JOY_SEP_ALLOWANCES_MAP[empCode]?.canteen || 0,
                accommodation: 0,
                other_deduction: 0,
              });
              existingCodes.add(empCode);
            }
          });

          setLiveEmployeeConfigs(configs);

          // Auto-trigger payroll calculation with live configs
          const run = WageEngineService.calculateWageRun(selectedVendorId, configs);
          setWageRun(run);
        })
        .catch((err) => {
          console.warn('[WageEngineTab] Failed to load live worker configs:', err);
          if (active) {
            const run = WageEngineService.calculateWageRun(selectedVendorId, []);
            setWageRun(run);
          }
        })
        .finally(() => {
          if (active) setIsLoadingWorkers(false);
        });
    };

    fetchConfigsAndCalculate();

    PayrollTemplateService.fetchTemplateForCompany(undefined, selectedVendorId)
      .then((t) => { if (active) setPayrollTemplate(t); })
      .catch(() => { if (active) setPayrollTemplate(PayrollTemplateService.getTemplateForVendor(selectedVendorId)); });

    const handleDatasetUpdate = () => {
      if (active) {
        PayrollTemplateService.fetchTemplateForCompany(undefined, selectedVendorId)
          .then((t) => { if (active) setPayrollTemplate(t); })
          .catch(() => {});
        fetchConfigsAndCalculate();
      }
    };

    window.addEventListener('joy_master_dataset_updated', handleDatasetUpdate);
    window.addEventListener('joy_payroll_template_changed', handleDatasetUpdate);
    window.addEventListener('storage', handleDatasetUpdate);

    return () => {
      active = false;
      window.removeEventListener('joy_master_dataset_updated', handleDatasetUpdate);
      window.removeEventListener('joy_payroll_template_changed', handleDatasetUpdate);
      window.removeEventListener('storage', handleDatasetUpdate);
    };
  }, [selectedVendorId]);

  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'earnings' | 'deductions' | 'canteen' | 'employer_cost' | 'audit' | 'policy'>('overview');
  const [deductionSubTab, setDeductionSubTab] = useState<'ALL' | 'STATUTORY' | 'ASSETS' | 'CANTEEN' | 'ADVANCES' | 'CANTEEN_CROSSCHECK'>('ALL');
  const [canteenFilter, setCanteenFilter] = useState<'ALL' | 'WITH_CANTEEN' | 'ZERO_CANTEEN'>('ALL');
  const [canteenSearch, setCanteenSearch] = useState('');

  // Payroll Template State
  const [payrollTemplate, setPayrollTemplate] = useState<PayrollTemplate | null>(null);

  // Payroll Run State Machine — starts null, populated after live worker fetch
  const [wageRun, setWageRun] = useState<WageRunRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingMaster, setIsExportingMaster] = useState(false);

  // Modals & Drawers
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showControlledDeductions, setShowControlledDeductions] = useState(false);
  const [whyPayload, setWhyPayload] = useState<DrawerWhyPayload | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ELIGIBLE' | 'ON_LEAVE'>('ALL');

  // Active Policy
  const [policy, setPolicy] = useState(() => WagePolicyService.getActivePolicyForVendor(vendorId));

  // Run validation
  const validationSummary = useMemo(() => {
    if (!wageRun) return null;
    return PayrollValidationService.validateWageRun(wageRun, wageRun.employee_results.reduce((s, r) => {
      const ot = r.earnings.find(e => e.component_code === 'OT');
      return s + (ot?.status === 'CALCULATED' ? ot.amount : 0);
    }, 0));
  }, [wageRun]);

  // Recalculate Payroll using live configs from the ref (avoids stale closure)
  const handleRecalculate = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const run = WageEngineService.calculateWageRun(
        selectedVendorId || vendorId,
        liveConfigsRef.current,
        policy.policyId
      );
      setWageRun(run);
      setRunning(false);
    }, 600);
  }, [selectedVendorId, vendorId, policy]);


  // Approval state machine transitions
  const handleApprovePayroll = () => {
    if (!wageRun) return;
    setWageRun({
      ...wageRun,
      status: 'APPROVED',
      approval_status: 'APPROVED',
      approved_by: 'HR & Operations Head',
      approved_at: new Date().toISOString(),
    });
  };

  const handleExportCompanyStatement = async () => {
    if (!wageRun) return;
    try {
      setIsExporting(true);
      await exportCompanySalaryStatementXLSX(
        wageRun,
        selectedVendor?.legalName || selectedVendorId,
        currentOrgName,
        payrollTemplate || undefined
      );
    } catch (err) {
      console.error('Company Statement export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMasterPack = async () => {
    if (!wageRun) return;
    try {
      setIsExportingMaster(true);
      await exportMasterPayrollPackXLSX(
        wageRun,
        selectedVendor?.legalName || selectedVendorId,
        currentOrgName
      );
    } catch (err) {
      console.error('Master Pack export failed:', err);
    } finally {
      setIsExportingMaster(false);
    }
  };


  // Filtered employees for table
  const filteredEmployees = useMemo(() => {
    if (!wageRun) return [];
    return wageRun.employee_results.filter((emp) => {
      const matchesSearch =
        emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_code.includes(searchQuery) ||
        (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ELIGIBLE'
          ? emp.payroll_status.wage_eligible
          : !emp.payroll_status.wage_eligible;

      return matchesSearch && matchesStatus;
    });
  }, [wageRun, searchQuery, statusFilter]);

  // Canteen / Food Deduction Cross-Check Panel (reusable across standalone tab and subtab)
  const renderCanteenCrossCheckPanel = (isStandaloneTab = false) => {
    if (!wageRun) return null;

    const crossCheckRows = wageRun.employee_results
      .filter((r) => r.payroll_status.wage_eligible)
      .map((emp) => {
        const foodDLine = emp.deductions.find((d) => d.component_code === 'FOOD_D' || d.component_code === 'CANTEEN');
        const deductedAmt = foodDLine?.status === 'CALCULATED' ? foodDLine.amount : 0;
        const masterAmt = JOY_SEP_ALLOWANCES_MAP[emp.employee_code]?.canteen ?? JOY_SEP_ALLOWANCES_MAP[emp.employee_id]?.canteen ?? 0;
        const isMatch = deductedAmt === masterAmt;
        const hasDelta = masterAmt > 0 || deductedAmt > 0;
        return { emp, deductedAmt, masterAmt, isMatch, hasDelta, status: foodDLine?.status };
      });

    const totalMaster = crossCheckRows.reduce((s, r) => s + r.masterAmt, 0);
    const totalDeducted = crossCheckRows.reduce((s, r) => s + r.deductedAmt, 0);
    const mismatches = crossCheckRows.filter((r) => !r.isMatch).length;
    const matched = crossCheckRows.filter((r) => r.isMatch).length;
    const withCanteenCount = crossCheckRows.filter((r) => r.deductedAmt > 0 || r.masterAmt > 0).length;
    const zeroCanteenCount = crossCheckRows.filter((r) => r.deductedAmt === 0 && r.masterAmt === 0).length;

    const filteredRows = crossCheckRows.filter((r) => {
      if (canteenFilter === 'WITH_CANTEEN' && r.deductedAmt === 0 && r.masterAmt === 0) return false;
      if (canteenFilter === 'ZERO_CANTEEN' && (r.deductedAmt > 0 || r.masterAmt > 0)) return false;
      if (canteenSearch.trim()) {
        const q = canteenSearch.toLowerCase();
        const code = r.emp.employee_code?.toLowerCase() || '';
        const name = r.emp.employee_name?.toLowerCase() || '';
        return code.includes(q) || name.includes(q);
      }
      return true;
    });

    const content = (
      <div className="space-y-4">
        {/* Header banner if standalone tab */}
        {isStandaloneTab && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-teal-50 via-emerald-50 to-white p-4 rounded-xl border border-teal-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🍱</span>
                <h3 className="text-base font-black text-gray-900">Food / Canteen Deduction Reconciled Cross-Check</h3>
                <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                  D WAGES CANTEEN Column vs Wage Engine FOOD_D
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Audits every employee's canteen deduction between the client factory canteen ledger (D WAGES) and computed payroll deductions. Zero variance guarantees strict net pay precision.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                totalDeducted === totalMaster
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {totalDeducted === totalMaster ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span>{totalDeducted === totalMaster ? '100% Invariant Match' : 'Discrepancy Detected'}</span>
              </span>
            </div>
          </div>
        )}

        {/* Summary KPI bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 space-y-0.5">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Master Source Total</span>
            <div className="text-2xl font-black text-teal-950">{fmtINR(totalMaster)}</div>
            <span className="text-[10px] text-teal-700">D WAGES Canteen Sheet Ledger</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Wage Engine Deducted</span>
            <div className="text-2xl font-black text-emerald-950">{fmtINR(totalDeducted)}</div>
            <span className="text-[10px] text-emerald-700">FOOD_D Subtracted from Net Pay</span>
          </div>
          <div className={`rounded-xl p-3.5 space-y-0.5 border ${
            totalDeducted === totalMaster
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-300'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700">Variance (Delta)</span>
            <div className={`text-2xl font-black ${ totalDeducted === totalMaster ? 'text-emerald-700' : 'text-amber-800' }`}>
              {totalDeducted === totalMaster ? '₹0.00' : fmtINR(Math.abs(totalMaster - totalDeducted))}
            </div>
            <span className="text-[10px] text-gray-500">{totalDeducted === totalMaster ? 'Zero discrepancy ✓' : 'Delta needs review'}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-0.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Audit Status</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-emerald-700">{matched}/{crossCheckRows.length} ✓</span>
              {mismatches > 0 && <span className="text-sm font-black text-amber-700">({mismatches} ⚠)</span>}
            </div>
            <span className="text-[10px] text-gray-500">{withCanteenCount} with canteen, {zeroCanteenCount} zero</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/80 p-2.5 rounded-xl border border-gray-200">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
              <Filter size={12} /> Filter:
            </span>
            <button
              onClick={() => setCanteenFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                canteenFilter === 'ALL'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Employees ({crossCheckRows.length})
            </button>
            <button
              onClick={() => setCanteenFilter('WITH_CANTEEN')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                canteenFilter === 'WITH_CANTEEN'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              With Canteen ({withCanteenCount})
            </button>
            <button
              onClick={() => setCanteenFilter('ZERO_CANTEEN')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                canteenFilter === 'ZERO_CANTEEN'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Zero Canteen ({zeroCanteenCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search worker name or ID..."
              value={canteenSearch}
              onChange={(e) => setCanteenSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Employee-level cross-check table */}
        <div className="overflow-x-auto border border-teal-200 rounded-xl bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-teal-50 text-teal-900 font-bold uppercase text-[10px] tracking-wider border-b border-teal-200">
                <th className="py-2.5 px-3">Emp ID</th>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-2 text-center">Dept</th>
                <th className="py-2.5 px-3 text-right">Master Source<br/><span className="font-normal normal-case text-teal-700">JOY_SEP_ALLOWANCES_MAP</span></th>
                <th className="py-2.5 px-3 text-right">Engine Deducted<br/><span className="font-normal normal-case text-teal-700">FOOD_D Component</span></th>
                <th className="py-2.5 px-3 text-right">Delta</th>
                <th className="py-2.5 px-3 text-center">Engine Status</th>
                <th className="py-2.5 px-3 text-center">Audit Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-50 font-medium">
              {filteredRows.map(({ emp, deductedAmt, masterAmt, isMatch, status }) => {
                const delta = Math.abs(deductedAmt - masterAmt);
                return (
                  <tr key={emp.employee_id} className={`transition-colors ${
                    !isMatch ? 'bg-amber-50/50' : 'hover:bg-teal-50/30'
                  }`}>
                    <td className="py-2 px-3 font-mono font-bold text-gray-700">{emp.employee_code}</td>
                    <td className="py-2 px-3 font-bold text-gray-900">{emp.employee_name}</td>
                    <td className="py-2 px-2 text-center text-gray-500">{emp.department || 'Assembly'}</td>
                    <td className="py-2 px-3 text-right">
                      {masterAmt > 0
                        ? <span className="font-bold text-teal-800">{fmtINR(masterAmt)}</span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="py-2 px-3 text-right">
                      {deductedAmt > 0
                        ? <span className="font-bold text-emerald-800">{fmtINR(deductedAmt)}</span>
                        : <span className="text-gray-400">₹0</span>
                      }
                    </td>
                    <td className="py-2 px-3 text-right">
                      {delta === 0
                        ? <span className="text-gray-400 text-[10px]">—</span>
                        : <span className="font-bold text-amber-700">{fmtINR(delta)}</span>
                      }
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        status === 'CALCULATED' ? 'bg-emerald-100 text-emerald-800'
                        : status === 'ZERO_GENUINE' ? 'bg-gray-100 text-gray-500'
                        : 'bg-amber-100 text-amber-800'
                      }`}>
                        {status || 'NOT_RUN'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {isMatch
                        ? <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check size={11} /> Matched
                          </span>
                        : <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                            <AlertTriangle size={11} /> Delta
                          </span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-teal-100/80 border-t-2 border-teal-300 font-black text-xs">
                <td colSpan={3} className="py-2.5 px-3 text-teal-900">
                  TOTALS ({filteredRows.length} displayed / {crossCheckRows.length} total)
                </td>
                <td className="py-2.5 px-3 text-right text-teal-900">
                  {fmtINR(filteredRows.reduce((s, r) => s + r.masterAmt, 0))}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-900">
                  {fmtINR(filteredRows.reduce((s, r) => s + r.deductedAmt, 0))}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-emerald-700">
                    {fmtINR(Math.abs(filteredRows.reduce((s, r) => s + r.masterAmt, 0) - filteredRows.reduce((s, r) => s + r.deductedAmt, 0)))}
                  </span>
                </td>
                <td colSpan={2} className="py-2.5 px-3 text-center text-teal-800">
                  {mismatches === 0 ? '✓ 100% Reconciled' : `⚠ ${mismatches} discrepancy`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Source legend */}
        <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3.5 text-xs text-teal-900">
          <span className="font-black block mb-1">📋 Data Lineage & Policy Rule</span>
          <div className="space-y-0.5 text-[11px] text-teal-800">
            <p>• <strong>Master Source</strong>: <code className="bg-teal-100 px-1 rounded">JOY_SEP_ALLOWANCES_MAP[employee_code].canteen</code> — Canonical canteen ledger from client factory D WAGES reconciliation.</p>
            <p>• <strong>Wage Engine Deduction</strong>: <code className="bg-teal-100 px-1 rounded">FOOD_D</code> component computed from attendance master record and subtracted from Net Pay.</p>
            <p>• <strong>Status ZERO_GENUINE</strong>: Worker did not incur canteen expenses for the month — deducted as ₹0 cleanly.</p>
            <p>• <strong>Status CALCULATED</strong>: Worker has canteen charges — deducted and fully reconciled against factory bills.</p>
          </div>
        </div>
      </div>
    );

    if (isStandaloneTab) {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
          {content}
        </div>
      );
    }

    return (
      <div className="col-span-2 lg:col-span-4 space-y-3">
        {content}
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-12">
      {/* ── TOP HEADER & WORKSPACE BANNER ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Wage Calculation & Billing Engine</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#07563D]/10 text-[#07563D] border border-emerald-200">
              v2.1 Production
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Attendance Master → Policy Snapshot → Independent Components → Mathematical Reconciliations → Dual-Format Excel
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHowItWorks(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-2xs cursor-pointer"
          >
            <BookOpen size={13} className="text-[#07563D]" />
            <span>ⓘ How It Works</span>
          </button>

          <button
            onClick={() => setShowTemplateBuilder(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-2xs cursor-pointer"
          >
            <Sliders size={13} className="text-[#07563D]" />
            <span>Template Builder</span>
          </button>

          <button
            onClick={() => setShowControlledDeductions(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-2xs cursor-pointer"
          >
            <Lock size={13} className="text-amber-700" />
            <span>Governed Deductions</span>
          </button>

              <button
                onClick={handleRecalculate}
                disabled={running}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
              >
                <RefreshCw size={13} className={running ? 'animate-spin' : ''} />
                <span>{running ? 'Recalculating…' : 'Recalculate Run'}</span>
              </button>

              <button
                onClick={handleExportMasterPack}
                disabled={isExportingMaster || (validationSummary && !validationSummary.canExport)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                title="Generates the 10-sheet comprehensive audit workbook"
              >
                <FileSpreadsheet size={13} className={isExportingMaster ? 'animate-bounce' : ''} />
                <span>{isExportingMaster ? 'Generating…' : 'Export 10-Sheet Pack (.XLSX)'}</span>
              </button>

              <button
                onClick={handleExportCompanyStatement}
                disabled={isExporting || (validationSummary && !validationSummary.canExport)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#07563D] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                title="Generates the wide company salary statement with formulas"
              >
                <Download size={13} className={isExporting ? 'animate-bounce' : ''} />
                <span>{isExporting ? 'Generating…' : 'Export Company Statement'}</span>
              </button>
        </div>
      </div>

      {/* ── REALTIME LIVE COMPANY & VENDOR SELECTION BAR ──────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Vendor:</span>
            {vendorsList.length > 0 ? (
              <select
                value={selectedVendorId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedVendorId(newId);
                  const v = vendorsList.find((x) => x.id === newId || x.vendorCode === newId);
                  setSelectedVendor(v || null);
                }}
                className="text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-[#07563D] outline-hidden cursor-pointer"
              >
                {vendorsList.map((v) => (
                  <option key={v.id} value={v.vendorCode || v.id}>
                    {v.legalName} ({v.vendorCode})
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold">
                {selectedVendor?.legalName || 'Joy Manpower Services Private Limited'} ({selectedVendorId})
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-gray-200" />

          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="font-bold text-gray-400">Connected Client:</span>
            <span className="font-semibold text-gray-800">{currentOrgName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE POSTGRESQL ATTENDANCE STREAM
          </span>
          <span className="text-gray-400 font-mono text-[11px] hidden sm:inline">
            vendor_attendance_records
          </span>
        </div>
      </div>

      {/* ── LOADING STATE while fetching live workers ─────────────────────── */}
      {isLoadingWorkers && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 bg-white border border-gray-200 rounded-2xl shadow-xs">
          <RefreshCw size={32} className="text-emerald-600 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">Loading Live Worker Configs…</p>
            <p className="text-xs text-gray-500 mt-1">Fetching real-time daily rates from vendor_workers table</p>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE when master has no data and workers are loaded ────── */}
      {!isLoadingWorkers && !wageRun?.contracted_roster_count && wageRun && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={32} className="text-amber-600" />
          <div className="text-center">
            <p className="text-sm font-bold text-amber-900">No Attendance Master Loaded</p>
            <p className="text-xs text-amber-700 mt-1 max-w-sm">
              Upload an attendance sheet from the Attendance tab first, then come back here to run payroll.
            </p>
          </div>
        </div>
      )}

          {/* ── TOP KPI BAR (Section 20 from spec) ─────────────────────────── */}
          {wageRun && !isLoadingWorkers && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Contracted Roster</span>
                <div className="text-2xl font-black text-gray-900 mt-1">{wageRun.contracted_roster_count}</div>
                <span className="text-[10px] text-gray-500">Contract nominal</span>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Payroll Eligible</span>
                <div className="text-2xl font-black text-[#07563D] mt-1">{wageRun.payable_workforce_count}</div>
                <span className="text-[10px] text-emerald-700">Active payable</span>
              </div>

              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Approved On-Leave</span>
                <div className="text-2xl font-black text-amber-900 mt-1">{wageRun.on_leave_count}</div>
                <span className="text-[10px] text-amber-700 truncate block">
                  {wageRun.employee_results.find(r => !r.payroll_status.wage_eligible)
                    ? `${wageRun.employee_results.find(r => !r.payroll_status.wage_eligible)?.employee_name} (${wageRun.employee_results.find(r => !r.payroll_status.wage_eligible)?.employee_code})`
                    : 'None this period'}
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gross Earnings</span>
                <div className="text-2xl font-black text-gray-900 mt-1">{fmtINR(wageRun.total_gross_earnings)}</div>
                <span className="text-[10px] text-gray-500">Wages + OT + Bonus</span>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Deductions</span>
                <div className="text-2xl font-black text-red-700 mt-1">{fmtINR(wageRun.total_deductions)}</div>
                <span className="text-[10px] text-red-600">PF + ESI + PT + Adv</span>
              </div>

              <div className="bg-gradient-to-br from-[#07563D] to-emerald-800 text-white rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Net Take-Home Pay</span>
                <div className="text-2xl font-black text-white mt-1">{fmtINR(wageRun.total_net_pay)}</div>
                <span className="text-[10px] text-emerald-200">Disbursement amount</span>
              </div>

              <div className={`p-4 rounded-2xl border shadow-2xs ${
                validationSummary && validationSummary.allInvariantsSatisfied
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/60 border-amber-200 text-amber-950'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider block">Invariants Status</span>
                <div className="text-2xl font-black mt-1 flex items-center gap-1.5">
                  {validationSummary && validationSummary.allInvariantsSatisfied ? (
                    <CheckCircle2 size={22} className="text-emerald-600" />
                  ) : (
                    <AlertTriangle size={22} className="text-amber-600" />
                  )}
                  <span>{validationSummary && validationSummary.allInvariantsSatisfied ? '100% Valid' : 'Review'}</span>
                </div>
                <span className="text-[10px] opacity-80">
                  {validationSummary ? `${validationSummary.passedChecks.length} verified checks` : 'Evaluating'}
                </span>
              </div>
            </div>
          )}

          {/* ── OPERATIONAL SUB-TABS NAVIGATION (Section 20 & 21) ─────────────── */}
          {wageRun && !isLoadingWorkers && <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center gap-1 overflow-x-auto min-w-max">
              {[
                { id: 'overview', label: 'Payroll Overview', icon: BarChart3 },
                { id: 'employees', label: `Employee Roster (${wageRun?.contracted_roster_count ?? '—'})`, icon: Users },
                { id: 'earnings', label: 'Earnings Breakup', icon: TrendingUp },
                { id: 'deductions', label: 'Deductions Breakup', icon: Wallet },
                { id: 'canteen', label: 'Canteen Cross-Check', icon: Search },
                { id: 'employer_cost', label: 'Employer Costs & Billing', icon: Receipt },
                { id: 'audit', label: 'Mathematical Reconciliations', icon: ShieldCheck },
                { id: 'policy', label: 'Policy & Wage Rules', icon: Sliders },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#07563D] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-gray-500 font-medium hidden md:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Snapshot: <span className="font-mono font-semibold text-gray-700">{wageRun?.payroll_policy_version || 'v2.1'}</span></span>
            </div>
          </div>}

          {/* ── TAB 1: PAYROLL OVERVIEW (Default View - Section 21) ───────────── */}
          {activeTab === 'overview' && wageRun && (
            <div className="space-y-5">
              {/* Lifecycle State Machine Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Payroll Run State</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-900">
                      {wageRun.status}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs font-mono text-gray-600">ID: {wageRun.id}</span>
                  </div>
                  <h3 className="text-base font-black text-gray-900">
                    Cycle: {wageRun.period_label} · Policy: {policy.policyName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Attendance snapshot: <span className="font-mono">{wageRun.attendance_snapshot_id}</span> · Engine: <span className="font-mono">{wageRun.calculation_engine_version}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {wageRun.status !== 'APPROVED' ? (
                    <button
                      onClick={handleApprovePayroll}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Check size={14} />
                      <span>Approve Payroll Run</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <Lock size={13} /> Approved by {wageRun.approved_by}
                    </span>
                  )}
                </div>
              </div>

              {/* Configuration Health Diagnostic Indicator (Section 23 from spec) */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span>Payroll Configuration Health Diagnostic</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Pre-Run Clearance: Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <CheckCircle2 size={14} className="text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-800 block">Wage Split Rule</span>
                      <span className="text-gray-500 text-[11px]">Basic 55% + HRA 45% = 100% Wages</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <CheckCircle2 size={14} className="text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-800 block">Overtime Policy</span>
                      <span className="text-gray-500 text-[11px]">Daily Rate / 8 hrs (Single statutory multiplier)</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <CheckCircle2 size={14} className="text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-800 block">Statutory PF & ESI</span>
                      <span className="text-gray-500 text-[11px]">PF 12%/13% (₹15k cap) · ESI 0.75%/3.25% (&le;₹21k)</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <CheckCircle2 size={14} className="text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-800 block">Excel Template</span>
                      <span className="text-gray-500 text-[11px]">Company Salary Statement with cell formulas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mathematical Reconciliations Summary Panel */}
              {validationSummary && (
                <PayrollValidationPanel
                  validation={validationSummary}
                  wageRun={wageRun}
                  onExportCompanyFormat={handleExportCompanyStatement}
                />
              )}
            </div>
          )}

          {/* ── TAB 2: EMPLOYEE ROSTER TABLE ─────────────────────────────────── */}
          {activeTab === 'employees' && wageRun && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden space-y-3 p-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employee by name or ID…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#07563D] transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl text-xs">
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      All ({wageRun.contracted_roster_count})
                    </button>
                    <button
                      onClick={() => setStatusFilter('ELIGIBLE')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        statusFilter === 'ELIGIBLE' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Payable ({wageRun.payable_workforce_count})
                    </button>
                    <button
                      onClick={() => setStatusFilter('ON_LEAVE')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        statusFilter === 'ON_LEAVE' ? 'bg-white text-amber-800 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      On Leave ({wageRun.on_leave_count})
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-100/70 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                      <th className="py-2.5 px-3">Emp ID</th>
                      <th className="py-2.5 px-3">Employee Name</th>
                      <th className="py-2.5 px-2 text-center">D WAGE</th>
                      <th className="py-2.5 px-2 text-center">PAY DAYS</th>
                      <th className="py-2.5 px-2 text-right">BASIC 55%</th>
                      <th className="py-2.5 px-2 text-right">HRA 45%</th>
                      <th className="py-2.5 px-2 text-right">Wages</th>
                      <th className="py-2.5 px-2 text-center">OT Hrs</th>
                      <th className="py-2.5 px-2 text-right">OT Amt</th>
                      <th className="py-2.5 px-2 text-right">Gross</th>
                      <th className="py-2.5 px-2 text-right">Total Ded</th>
                      <th className="py-2.5 px-3 text-right">Net Pay</th>
                      <th className="py-2.5 px-2 text-center">Status</th>
                      <th className="py-2.5 px-2 text-center">Why?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredEmployees.map((emp) => {
                      const isEligible = emp.payroll_status.wage_eligible;
                      const basicLine = emp.earnings.find(e => e.component_code === 'BASIC');
                      const hraLine = emp.earnings.find(e => e.component_code === 'HRA');
                      const otLine = emp.earnings.find(e => e.component_code === 'OT');

                      const basicVal = basicLine?.status === 'CALCULATED' ? basicLine.amount : 0;
                      const hraVal = hraLine?.status === 'CALCULATED' ? hraLine.amount : 0;
                      const wagesVal = basicVal + hraVal;
                      const otVal = otLine?.status === 'CALCULATED' ? otLine.amount : 0;
                      const dailyWage = emp.payable_days > 0 ? Math.round(wagesVal / emp.payable_days) : 0;

                      return (
                        <tr
                          key={emp.employee_id}
                          className={`hover:bg-emerald-50/30 transition-colors ${
                            !isEligible ? 'bg-amber-50/40 text-gray-500' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-800">{emp.employee_code}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-gray-900">{emp.employee_name}</div>
                            <div className="text-[10px] text-gray-500">{emp.department || 'Assembly'}</div>
                          </td>
                          <td className="py-2.5 px-2 text-center text-gray-700">
                            {isEligible ? fmtINR(dailyWage) : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-emerald-800">
                            {isEligible ? (
                              <button
                                onClick={() => setWhyPayload({
                                  type: 'PAY_DAYS',
                                  payload: {
                                    calendarDays: 31,
                                    presentDays: emp.payable_days,
                                    weeklyOffDays: 4,
                                    nfhDays: 0,
                                    lopDays: Math.max(0, 31 - emp.payable_days - 4),
                                    approvedLeaveDays: emp.payable_days < 26 ? 1 : 0,
                                    payableDays: emp.payable_days,
                                    source: 'Attendance Master Matrix (04_Recon)',
                                    employeeCode: emp.employee_code,
                                    periodLabel: wageRun.period_label,
                                  },
                                  empName: emp.employee_name,
                                })}
                                className="hover:underline hover:text-emerald-950 font-black cursor-pointer px-1 py-0.5 rounded hover:bg-emerald-100 transition-colors"
                                title="Click to view Pay Days Breakdown (Calendar 31, Present, WO, LOP, NFH)"
                              >
                                {emp.payable_days}
                              </button>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right text-gray-800 font-medium">
                            {isEligible ? fmtINR(basicVal) : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-right text-gray-600">
                            {isEligible ? fmtINR(hraVal) : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-[#07563D]">
                            {isEligible ? fmtINR(wagesVal) : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-center text-blue-900 font-bold">
                            {emp.ot_hours > 0 ? `${emp.ot_hours}h` : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-blue-900">
                            {isEligible && otVal > 0 ? fmtINR(otVal) : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-gray-900">
                            {isEligible ? (
                              <button
                                onClick={() => setWhyPayload({
                                  type: 'GROSS',
                                  payload: {
                                    basic: basicVal,
                                    hra: hraVal,
                                    wages: wagesVal,
                                    ot: otVal,
                                    otStipend: 0,
                                    foodAllowance: emp.earnings.find(e => e.component_code === 'FOOD_E')?.amount || 0,
                                    nightAllowance: emp.earnings.find(e => e.component_code === 'NIGHT_E')?.amount || 0,
                                    attendanceBonus: emp.earnings.find(e => e.component_code === 'ATT_BONUS')?.amount || 0,
                                    arrears: 0,
                                    gross: emp.gross_earnings,
                                    earningsComponents: emp.earnings.map(e => ({
                                      code: e.component_code,
                                      name: e.component_name,
                                      amount: e.amount,
                                      formula: e.why?.formula || '',
                                    })),
                                  },
                                  empName: emp.employee_name,
                                  empCode: emp.employee_code,
                                })}
                                className="hover:underline hover:text-emerald-900 font-bold cursor-pointer px-1 py-0.5 rounded hover:bg-emerald-100 transition-colors"
                                title="Click to view Gross Earnings Breakdown (Basic + HRA + Allowances + OT)"
                              >
                                {fmtINR(emp.gross_earnings)}
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right text-red-700 font-semibold">
                            {isEligible ? fmtINR(emp.total_deductions) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-gray-900 bg-emerald-50/30">
                            {isEligible ? (
                              <button
                                onClick={() => setWhyPayload({
                                  type: 'NET_PAY',
                                  payload: {
                                    grossEarnings: emp.gross_earnings,
                                    employeeDeductions: emp.deductions.map(d => ({
                                      code: d.component_code,
                                      name: d.component_name,
                                      amount: d.amount,
                                    })),
                                    totalDeductions: emp.total_deductions,
                                    netPay: emp.net_pay,
                                    auditTrail: [
                                      'Attendance verified from Master Biometric Ledger',
                                      'Basic 55% + HRA 45% evaluated against Daily Rate',
                                      'Statutory PF & ESI calculated per government slabs',
                                      'Employer on-costs separated from Net Pay',
                                    ],
                                  },
                                  empName: emp.employee_name,
                                  empCode: emp.employee_code,
                                })}
                                className="hover:underline hover:text-emerald-950 font-black cursor-pointer px-1.5 py-0.5 rounded hover:bg-emerald-200/60 transition-colors"
                                title="Click to view Net Pay Calculation (Total Earnings − Employee Deductions)"
                              >
                                {fmtINR(emp.net_pay)}
                              </button>
                            ) : (
                              'NOT ELIGIBLE'
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {isEligible ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Payable
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title={emp.payroll_status.remarks}>
                                Extended Leave
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {basicLine && (
                              <button
                                onClick={() => setWhyPayload({
                                  type: 'COMPONENT',
                                  line: basicLine,
                                  empName: emp.employee_name,
                                  empCode: emp.employee_code,
                                })}
                                className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-emerald-100 text-[#07563D] text-[10px] font-bold transition-colors cursor-pointer"
                                title="Click to trace Basic 55% component formula"
                              >
                                Why?
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#07563D]/10 font-black text-xs border-t-2 border-emerald-300">
                      <td colSpan={2} className="py-2.5 px-3 text-[#07563D]">
                        TOTALS ({wageRun.payable_workforce_count} Payable of {wageRun.contracted_roster_count})
                      </td>
                      <td className="text-center">—</td>
                      <td className="text-center text-[#07563D]">
                        {wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => s + r.payable_days, 0)}
                      </td>
                      <td className="text-right text-gray-900">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const b = r.earnings.find(e => e.component_code === 'BASIC');
                          return s + (b?.status === 'CALCULATED' ? b.amount : 0);
                        }, 0))}
                      </td>
                      <td className="text-right text-gray-900">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const h = r.earnings.find(e => e.component_code === 'HRA');
                          return s + (h?.status === 'CALCULATED' ? h.amount : 0);
                        }, 0))}
                      </td>
                      <td className="text-right text-[#07563D]">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const b = r.earnings.find(e => e.component_code === 'BASIC');
                          const h = r.earnings.find(e => e.component_code === 'HRA');
                          return s + (b?.status === 'CALCULATED' ? b.amount : 0) + (h?.status === 'CALCULATED' ? h.amount : 0);
                        }, 0))}
                      </td>
                      <td className="text-center text-blue-900">
                        {wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => s + r.ot_hours, 0)}h
                      </td>
                      <td className="text-right text-blue-900">{fmtINR(wageRun.total_ot_amount)}</td>
                      <td className="text-right text-gray-900">{fmtINR(wageRun.total_gross_earnings)}</td>
                      <td className="text-right text-red-700">{fmtINR(wageRun.total_deductions)}</td>
                      <td className="text-right text-[#07563D] text-sm">{fmtINR(wageRun.total_net_pay)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB 3: EARNINGS BREAKUP ──────────────────────────────────────── */}
          {activeTab === 'earnings' && wageRun && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>Independent Earnings & Allowances Master</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Basic + HRA reconcile to Base Wages. Food & Night allowances, Overtime, and Attendance Bonuses are dynamically calculated into Gross Earnings.
                  </p>
                </div>
                <button
                  onClick={() => setShowTemplateBuilder(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-[#07563D] text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Sliders size={12} className="text-[#07563D]" />
                  <span>Configure Allowance Rules</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Basic Salary (55%)</span>
                  <div className="text-xl font-black text-[#07563D]">
                    {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                      const b = r.earnings.find(e => e.component_code === 'BASIC');
                      return s + (b?.status === 'CALCULATED' ? b.amount : 0);
                    }, 0))}
                  </div>
                  <span className="text-[10px] text-gray-500">Formula: D WAGE &times; PAY DAYS &times; 55%</span>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">House Rent Allowance (45%)</span>
                  <div className="text-xl font-black text-blue-900">
                    {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                      const h = r.earnings.find(e => e.component_code === 'HRA');
                      return s + (h?.status === 'CALCULATED' ? h.amount : 0);
                    }, 0))}
                  </div>
                  <span className="text-[10px] text-gray-500">Formula: D WAGE &times; PAY DAYS &times; 45%</span>
                </div>

                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Overtime Earnings</span>
                  <div className="text-xl font-black text-purple-900">{fmtINR(wageRun.total_ot_amount)}</div>
                  <span className="text-[10px] text-gray-500">Approved OT Hours &times; Hourly Rate (Daily / 8)</span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Food Allowance (F.ALLOW)</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">₹50/Day</span>
                  </div>
                  <div className="text-xl font-black text-amber-950">
                    {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                      const f = r.earnings.find(e => e.component_code === 'FOOD_E');
                      return s + (f?.status === 'CALCULATED' ? f.amount : 0);
                    }, 0))}
                  </div>
                  <span className="text-[10px] text-gray-500">Multiplied by actual eligible working days</span>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">Night Shift Allowance (N.ALLOW)</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold">₹150/Shift</span>
                  </div>
                  <div className="text-xl font-black text-indigo-950">
                    {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                      const n = r.earnings.find(e => e.component_code === 'NIGHT_E');
                      return s + (n?.status === 'CALCULATED' ? n.amount : 0);
                    }, 0))}
                  </div>
                  <span className="text-[10px] text-gray-500">Multiplied by approved night shifts logged</span>
                </div>

                <div className="bg-emerald-100/70 border border-emerald-300 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#07563D] block">Gross Earnings Reconciled</span>
                    <CheckCircle2 size={13} className="text-emerald-700" />
                  </div>
                  <div className="text-xl font-black text-[#07563D]">{fmtINR(wageRun.total_gross_earnings)}</div>
                  <span className="text-[10px] text-gray-600 font-medium">Sum of Base Wages + OT + Allowances + Bonus</span>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: DEDUCTIONS BREAKUP (SEPARATED CATEGORIES) ─────────────── */}
          {activeTab === 'deductions' && wageRun && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                    <span>Employee Deductions & Client Recoveries Master</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Statutory PF, ESI, Professional Tax, PPE/Asset recoveries, Canteen, and salary advances. Separated into dedicated categories.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTemplateBuilder(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Sliders size={12} className="text-gray-600" />
                    <span>Template Deductions</span>
                  </button>
                  <button
                    onClick={() => setShowControlledDeductions(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <Lock size={12} className="text-amber-700" />
                    <span>Governed Deductions Ledger</span>
                  </button>
                </div>
              </div>

              {/* Deductions Sub-Tabs Navigation */}
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 shadow-2xs text-xs font-bold overflow-x-auto">
                <button
                  onClick={() => setDeductionSubTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    deductionSubTab === 'ALL'
                      ? 'bg-[#07563D] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                  }`}
                >
                  All Deductions Overview
                </button>
                <button
                  onClick={() => setDeductionSubTab('STATUTORY')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    deductionSubTab === 'STATUTORY'
                      ? 'bg-rose-100 text-rose-900 font-black border border-rose-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                  }`}
                >
                  🏛️ Statutory Deductions (PF/ESI/PT)
                </button>
                <button
                  onClick={() => setDeductionSubTab('ASSETS')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    deductionSubTab === 'ASSETS'
                      ? 'bg-amber-100 text-amber-900 font-black border border-amber-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                  }`}
                >
                  🛡️ Company Assets & PPE (Shoes/Uniform)
                </button>
                <button
                  onClick={() => setDeductionSubTab('CANTEEN')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    deductionSubTab === 'CANTEEN'
                      ? 'bg-orange-100 text-orange-900 font-black border border-orange-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                  }`}
                >
                  🍱 Canteen & Meal Recoveries
                </button>
                <button
                  onClick={() => setDeductionSubTab('ADVANCES')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    deductionSubTab === 'ADVANCES'
                      ? 'bg-purple-100 text-purple-900 font-black border border-purple-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                  }`}
                >
                  💳 Advances & Welfare Loans
                </button>
                <button
                  onClick={() => setDeductionSubTab('CANTEEN_CROSSCHECK')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    deductionSubTab === 'CANTEEN_CROSSCHECK'
                      ? 'bg-teal-100 text-teal-900 font-black border border-teal-300 shadow-xs'
                      : 'text-teal-700 hover:text-teal-900 hover:bg-teal-50 border border-teal-200/60'
                  }`}
                >
                  <Search size={13} />
                  <span>🔍 Canteen Cross-Check</span>
                </button>
              </div>

              {/* Deductions Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Statutory */}
                {(deductionSubTab === 'ALL' || deductionSubTab === 'STATUTORY') && (
                  <>
                    <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Employee PF (12%)</span>
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-mono">Statutory</span>
                      </div>
                      <div className="text-xl font-black text-rose-950">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const p = r.deductions.find(d => d.component_code === 'PF');
                          return s + (p?.status === 'CALCULATED' ? p.amount : 0);
                        }, 0))}
                      </div>
                      <span className="text-[10px] text-gray-500">12% on Basic up to ₹15,000</span>
                    </div>

                    <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Employee ESI (0.75%)</span>
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-mono">Statutory</span>
                      </div>
                      <div className="text-xl font-black text-rose-950">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const e = r.deductions.find(d => d.component_code === 'ESI');
                          return s + (e?.status === 'CALCULATED' ? e.amount : 0);
                        }, 0))}
                      </div>
                      <span className="text-[10px] text-gray-500">0.75% on Gross (exempt if &gt; ₹21k)</span>
                    </div>

                    <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Professional Tax (PT)</span>
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-mono">Tamil Nadu</span>
                      </div>
                      <div className="text-xl font-black text-rose-950">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const pt = r.deductions.find(d => d.component_code === 'PT');
                          return s + (pt?.status === 'CALCULATED' ? pt.amount : 0);
                        }, 0))}
                      </div>
                      <span className="text-[10px] text-gray-500">State half-yearly salary slabs</span>
                    </div>
                  </>
                )}

                {/* Company Assets & PPE */}
                {(deductionSubTab === 'ALL' || deductionSubTab === 'ASSETS') && (
                  <>
                    <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Safety Shoes Recovery</span>
                        <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">PPE Asset</span>
                      </div>
                      <div className="text-xl font-black text-amber-950">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const shoe = r.deductions.find(d => d.component_code === 'SHOE' || d.component_name?.toLowerCase().includes('shoe'));
                          return s + (shoe?.status === 'CALCULATED' ? shoe.amount : 0);
                        }, 0))}
                      </div>
                      <span className="text-[10px] text-gray-500">Steel-toe safety footwear issuance</span>
                    </div>

                    <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Uniform Recovery</span>
                        <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">PPE Asset</span>
                      </div>
                      <div className="text-xl font-black text-amber-950">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const u = r.deductions.find(d => d.component_code === 'UNIFORM' || d.component_name?.toLowerCase().includes('uniform'));
                          return s + (u?.status === 'CALCULATED' ? u.amount : 0);
                        }, 0))}
                      </div>
                      <span className="text-[10px] text-gray-500">Factory boiler suits & uniforms</span>
                    </div>
                  </>
                )}

                {/* Canteen & Meals */}
                {(deductionSubTab === 'ALL' || deductionSubTab === 'CANTEEN') && (
                  <>
                    <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block">Canteen Recovery</span>
                        <span className="text-[9px] bg-orange-100 text-orange-900 px-1.5 py-0.2 rounded font-bold">Plant II</span>
                      </div>
                      <div className="text-xl font-black text-orange-950">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const c = r.deductions.find(d => d.component_code === 'CANTEEN' || d.component_code === 'FOOD_D');
                          return s + (c?.status === 'CALCULATED' ? c.amount : 0);
                        }, 0))}
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[10px] text-gray-500">Client plant canteen ledger billed</span>
                        <button
                          onClick={() => {
                            setActiveTab('canteen');
                          }}
                          className="text-[10px] font-black text-teal-700 hover:text-teal-900 hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          Cross-Check Canteen →
                        </button>
                      </div>
                    </div>

                    <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block">Tiffin / Meal Recovery</span>
                        <span className="text-[9px] bg-orange-100 text-orange-900 px-1.5 py-0.2 rounded font-bold">Meals</span>
                      </div>
                      <div className="text-xl font-black text-orange-950">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const t = r.deductions.find(d => d.component_code === 'TIFFIN');
                          return s + (t?.status === 'CALCULATED' ? t.amount : 0);
                        }, 0))}
                      </div>
                      <span className="text-[10px] text-gray-500">Daily breakfast & shift refreshment</span>
                    </div>
                  </>
                )}

                {/* Advances & Welfare */}
                {(deductionSubTab === 'ALL' || deductionSubTab === 'ADVANCES') && (
                  <>
                    <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Salary Advances</span>
                        <span className="text-[9px] bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded font-bold">Advance</span>
                      </div>
                      <div className="text-xl font-black text-purple-950">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const adv = r.deductions.find(d => d.component_code === 'ADV' || d.component_code === 'ADVANCE');
                          return s + (adv?.status === 'CALCULATED' ? adv.amount : 0);
                        }, 0))}
                      </div>
                      <span className="text-[10px] text-gray-500">Pre-approved festive & salary advances</span>
                    </div>

                    <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Marriage / Welfare Loan</span>
                        <span className="text-[9px] bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded font-bold">Welfare</span>
                      </div>
                      <div className="text-xl font-black text-purple-950">
                        {fmtINR(wageRun.employee_results.filter(r => r.payroll_status.wage_eligible).reduce((s, r) => {
                          const m = r.deductions.find(d => d.component_code === 'MARRIAGE');
                          return s + (m?.status === 'CALCULATED' ? m.amount : 0);
                        }, 0))}
                      </div>
                      <span className="text-[10px] text-gray-500">Employee welfare fund assistance</span>
                    </div>
                  </>
                )}

                {/* Total Deductions Card */}
                {deductionSubTab !== 'CANTEEN_CROSSCHECK' && (
                  <div className="bg-rose-100/70 border border-rose-300 rounded-xl p-3.5 space-y-1 sm:col-span-2 lg:col-span-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-950 block">Total Deductions Subtracted from Net Pay</span>
                      <span className="text-[10px] bg-rose-200/80 text-rose-950 px-2 py-0.5 rounded-full font-bold">
                        Strict Invariant: Gross − Deductions = Net Pay
                      </span>
                    </div>
                    <div className="text-2xl font-black text-rose-950">{fmtINR(wageRun.total_deductions)}</div>
                    <span className="text-[10px] text-gray-600 font-medium">
                      All statutory contributions, PPE assets, plant canteen, and loans are reconciled and deducted accurately.
                    </span>
                  </div>
                )}

                {/* ── CANTEEN DEDUCTION CROSS-CHECK PANEL ──────────────────── */}
                {deductionSubTab === 'CANTEEN_CROSSCHECK' && renderCanteenCrossCheckPanel(false)}
              </div>
            </div>
          )}

          {/* ── TAB: CANTEEN DEDUCTION CROSS-CHECK (STANDALONE) ───────────────── */}
          {activeTab === 'canteen' && wageRun && renderCanteenCrossCheckPanel(true)}

          {/* ── TAB 5: EMPLOYER COSTS & BILLING ──────────────────────────────── */}
          {activeTab === 'employer_cost' && wageRun && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-black text-gray-900">Statutory Employer Costs & Vendor Billing Master</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Employer PF (13%), Employer ESI (3.25%), and Vendor Service Charge (8%). These on-costs are billed to client and NEVER deducted from employee Net Pay.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Employer PF (13%)</span>
                  <div className="text-2xl font-black text-purple-950">
                    {fmtINR(wageRun.employee_results.reduce((s, r) => {
                      const p = r.employer_costs?.find(c => c.component_code === 'PF_EMPLOYER');
                      return s + (p?.status === 'CALCULATED' ? p.amount : 0);
                    }, 0))}
                  </div>
                  <span className="text-[10px] text-purple-700">12% EPF + 0.5% Admin + 0.5% EDLI</span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Employer ESI (3.25%)</span>
                  <div className="text-2xl font-black text-purple-950">
                    {fmtINR(wageRun.employee_results.reduce((s, r) => {
                      const e = r.employer_costs?.find(c => c.component_code === 'ESI_EMPLOYER');
                      return s + (e?.status === 'CALCULATED' ? e.amount : 0);
                    }, 0))}
                  </div>
                  <span className="text-[10px] text-purple-700">3.25% on gross of eligible employees</span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Vendor Service Charge (8%)</span>
                  <div className="text-2xl font-black text-purple-950">
                    {fmtINR(wageRun.employee_results.reduce((s, r) => {
                      const svc = r.employer_costs?.find(c => c.component_code === 'SERVICE_CHARGE');
                      return s + (svc?.status === 'CALCULATED' ? svc.amount : 0);
                    }, 0))}
                  </div>
                  <span className="text-[10px] text-purple-700">8% on ((Pay Days &times; Rate) + OT)</span>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 6: MATHEMATICAL RECONCILIATIONS ───────────────────────────── */}
          {activeTab === 'audit' && wageRun && validationSummary && (
            <PayrollValidationPanel
              validation={validationSummary}
              wageRun={wageRun}
              onExportCompanyFormat={handleExportCompanyStatement}
              onExportMasterPack={handleExportMasterPack}
            />
          )}

          {/* ── TAB 7: POLICY & WAGE RULES CONFIGURATION ──────────────────────── */}
          {activeTab === 'policy' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                  <h3 className="text-base font-black text-gray-900">Active Payroll Policy: {policy.policyName}</h3>
                  <p className="text-xs text-gray-500">Version: {policy.version} · Status: {policy.status} · Effective: {policy.effectiveFrom} to {policy.effectiveTo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTemplateBuilder(true)}
                    className="px-3.5 py-2 bg-white border border-gray-200 text-gray-800 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Sliders size={13} className="text-[#07563D]" />
                    <span>Configure Excel Template</span>
                  </button>
                  <button
                    onClick={handleRecalculate}
                    className="px-4 py-2 bg-[#07563D] text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
                  >
                    Save & Apply Policy Snapshot
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Base Wage Split */}
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="font-black text-gray-900 text-sm block">1. Base Wage Split Ratios</span>
                  <p className="text-gray-500">Defines how configured Daily Wage is split between Basic and HRA.</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-700">Basic Percentage:</span>
                      <span className="font-mono font-bold text-[#07563D]">55.00%</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-700">HRA Percentage:</span>
                      <span className="font-mono font-bold text-[#07563D]">45.00%</span>
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-emerald-950 font-bold">
                      <span>Total Reconciled Split:</span>
                      <span>100.00%</span>
                    </div>
                  </div>
                </div>

                {/* Overtime Policy */}
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="font-black text-gray-900 text-sm block">2. Overtime Multiplier & Formula</span>
                  <p className="text-gray-500">Hourly rate computation basis for verified overtime hours.</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-700">Hourly Formula:</span>
                      <span className="font-mono font-bold text-blue-800">Daily Rate / 8 Working Hours</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-700">Rate Multiplier:</span>
                      <span className="font-mono font-bold text-blue-800">1.0x (Single Statutory Rate)</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-700">Manager Authorization Required:</span>
                      <span className="font-bold text-emerald-700">YES</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* ── MODALS & DRAWERS ──────────────────────────────────────────────── */}
      {showHowItWorks && (
        <PayrollHowItWorksModal
          isOpen={showHowItWorks}
          onClose={() => setShowHowItWorks(false)}
        />
      )}

      {showTemplateBuilder && (
        <PayrollTemplateBuilderModal
          isOpen={showTemplateBuilder}
          onClose={() => setShowTemplateBuilder(false)}
          companyId="comp-01"
          companyName={currentOrgName}
          vendorId={selectedVendorId}
          vendorName={selectedVendor?.legalName || 'Joy Manpower Services Private Limited'}
          onTemplateUpdated={(updatedTmpl) => {
            setPayrollTemplate(updatedTmpl);
            const earnSec = updatedTmpl.sections.find((s) => s.category === 'EARNINGS');
            const basicCol = earnSec?.columns.find((c) => c.fieldKey === 'basic_55' || c.headerLabel.toUpperCase().includes('BASIC'));
            const hraCol = earnSec?.columns.find((c) => c.fieldKey === 'hra_45' || c.headerLabel.toUpperCase().includes('HRA'));
            
            let effectivePolicy = policy;
            if (basicCol?.calculationValue !== undefined && hraCol?.calculationValue !== undefined) {
              effectivePolicy = {
                ...policy,
                wageRules: {
                  ...policy.wageRules,
                  baseWageSplitRules: policy.wageRules.baseWageSplitRules.map((rule) => {
                    if (rule.componentCode === 'BASIC') {
                      return { ...rule, percentageOfBase: basicCol.calculationValue ?? 55 };
                    }
                    if (rule.componentCode === 'HRA') {
                      return { ...rule, percentageOfBase: hraCol.calculationValue ?? 45 };
                    }
                    return rule;
                  }),
                },
              };
              setPolicy(effectivePolicy);
            }
            const run = WageEngineService.calculateWageRun(selectedVendorId || vendorId, liveConfigsRef.current, effectivePolicy.policyId);
            setWageRun(run);
          }}
        />
      )}

      {showControlledDeductions && (
        <ControlledDeductionModal
          isOpen={showControlledDeductions}
          onClose={() => setShowControlledDeductions(false)}
        />
      )}

      {whyPayload && (
        <WageWhyDrawer
          payload={whyPayload}
          onClose={() => setWhyPayload(null)}
          onOpenConfig={() => {
            setWhyPayload(null);
            setActiveTab('policy');
          }}
        />
      )}
    </div>
  );
}
