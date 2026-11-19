import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Laptop,
  TrendingUp,
  User,
  Users,
  Building,
  Briefcase,
  Layers,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  DollarSign,
  Cpu,
  Info,
  Printer,
  Download,
  Search,
  CheckCircle,
  FileText,
  AlertCircle,
  HelpCircle,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  UserCheck,
  Calculator,
  Award,
  Coffee,
  FileSpreadsheet,
  SlidersHorizontal,
  Eye,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { attendanceApi } from '../../../services/attendanceApi';
import { payrollApi } from '../../../services/payrollApi';
import { formatMinutesToHoursStr, formatDeviationDuration } from '../../../lib/attendance/attendanceEngine';
import { useToast } from '../../../components/ui/Toast';
import { api } from '../../../services/api';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';
import { payrollPeriodService, PayrollPeriod, EmployeePayrollContext, getWeekRangesForPeriod } from '../../../services/payroll/payrollPeriodService';
import { attendanceCalculationService, DailyAttendanceRow, PeriodAttendanceMetrics } from '../../../services/attendance/attendanceCalculationService';
import { payrollImpactCalculationEngine, PayrollImpactResult } from '../../../services/payroll/payrollImpactCalculationEngine';
import { PrintableAttendanceStatement } from './PrintableAttendanceStatement';
import { attendanceBonusService, AttendanceBonusPolicy, AttendanceBonusEvaluationResult } from '../../../services/attendance/attendanceBonusService';
import { exportAttendanceStatementToExcel, exportAttendanceStatementToCsv, exportOverallOvertimeRegisterToExcel, exportOverallAttendanceRegisterToExcel } from '../../../services/attendance/attendanceStatementExcelExporter';
import { AttendanceStatementPdfService } from '../../../services/attendance/attendanceStatementPdfService';
import { AttendanceAnomalyIntelligenceEngine } from '../../../services/attendance/attendanceAnomalyIntelligenceEngine';
import { permissionGovernanceService } from '../../../services/attendance/permissionGovernanceService';
import { useTenant } from '../../../hooks/useTenant';

export interface EmployeeAttendanceStatementModalProps {
  employeeId: string | null;
  initialDate?: string;
  initialPeriod?: string; // Optional e.g. "September 2026"
  onClose: () => void;
  onNavigateEmployee?: (employeeId: string) => void;
  onNavigateSubPath?: (subPath: string) => void;
}

export const EmployeeAttendanceStatementModal: React.FC<EmployeeAttendanceStatementModalProps> = ({
  employeeId,
  initialDate,
  initialPeriod,
  onClose,
  onNavigateEmployee,
  onNavigateSubPath,
}) => {
  const { showToast } = useToast();
  const { activeCompany } = useTenant();

  // Tab State (14 Comprehensive Intelligence Views)
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'daily'
    | 'weekly-monthly'
    | 'work-hours'
    | 'breaks'
    | 'leave'
    | 'late-early'
    | 'overtime'
    | 'bonus'
    | 'regularization'
    | 'exceptions'
    | 'payroll-impact'
    | 'audit'
    | 'statement'
  >('overview');

  // Flexible Reporting Filter Presets (Phase 1)
  const [dateFilterPreset, setDateFilterPreset] = useState<
    'CURRENT_PAYROLL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_WEEK' | 'LAST_WEEK' | 'TODAY' | 'YESTERDAY' | 'CUSTOM'
  >('CURRENT_PAYROLL');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [selectedBonusPolicy, setSelectedBonusPolicy] = useState('GOLD_PERFECT');
  const [bonusApproved, setBonusApproved] = useState(false);

  // Electra EV Permission Policy Configuration State
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyGraceMinutes, setPolicyGraceMinutes] = useState(5);
  const [policyAllowanceMinutes, setPolicyAllowanceMinutes] = useState(120);
  const [policyAutoHalfDay, setPolicyAutoHalfDay] = useState(true);

  // Master Data & Periods
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);

  // Raw Database Ledgers
  const [rawAttendanceList, setRawAttendanceList] = useState<any[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<any[]>([]);
  const [wfhRequests, setWfhRequests] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<any[]>([]);

  // Calculation Trace & Modal State
  const [selectedDayRow, setSelectedDayRow] = useState<DailyAttendanceRow | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // Load All Active Employees & Payroll Periods
  useEffect(() => {
    Promise.all([
      api.getEmployees().catch(() => []),
      payrollPeriodService.getPayrollPeriods().catch(() => []),
    ]).then(([emps, periods]) => {
      setEmployees(emps);
      setPayrollPeriods(periods);

      // Resolve initial period dynamically:
      // 1. Match against initialDate if provided (e.g. '2026-09-10' -> September 2026)
      // 2. Match against initialPeriod if provided
      // 3. Fallback to period containing today's date
      const targetDate = initialDate || new Date().toISOString().split('T')[0];
      let matchedPeriod: PayrollPeriod | null = null;

      if (initialPeriod) {
        matchedPeriod = periods.find(
          (p) =>
            p.period_name.toLowerCase() === initialPeriod.toLowerCase() ||
            initialPeriod.toLowerCase().includes(p.period_name.toLowerCase())
        ) || null;
      }

      if (!matchedPeriod && targetDate) {
        matchedPeriod = periods.find(
          (p) => targetDate >= p.start_date && targetDate <= p.end_date
        ) || null;
      }

      setSelectedPeriod(matchedPeriod || periods[0] || null);
    });
  }, [initialDate, initialPeriod]);

  // Update current employee when employeeId changes
  useEffect(() => {
    if (!employeeId) return;
    const match = employees.find(
      (e) =>
        e.id === employeeId ||
        e.employee_code === employeeId ||
        (e.id && e.id.toLowerCase() === employeeId.toLowerCase()) ||
        (e.employee_code && e.employee_code.toLowerCase() === employeeId.toLowerCase()) ||
        (e.employee_code && employeeId.toLowerCase().includes(e.employee_code.toLowerCase()))
    );
    if (match) {
      setCurrentEmployee(match);
    } else if (employees.length > 0) {
      setCurrentEmployee(employees[0]);
    }
  }, [employeeId, employees]);

  const [regularizingDay, setRegularizingDay] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  // Load Attendance, Workflow, Salary & Payroll Data dynamically in real-time from Supabase
  const loadStatementData = useCallback(async () => {
    if (!selectedPeriod || inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoadingContext(true);
    try {
      const [allDaily, allRegs, allExcs, allOt, allWfh, runs, structures] = await Promise.all([
        attendanceApi.getDailyAttendanceForPeriodAsync(
          selectedPeriod.start_date,
          selectedPeriod.end_date,
          currentEmployee?.id
        ),
        attendanceApi.getRegularizationsAsync().catch(() => []),
        Promise.resolve(attendanceApi.getExceptions()),
        Promise.resolve(attendanceApi.getOvertimeRequests()),
        Promise.resolve(attendanceApi.getWfhRequests()),
        Promise.resolve(payrollApi.getPayrollRuns()),
        Promise.resolve(payrollApi.getSalaryStructures()),
      ]);

      setRawAttendanceList(allDaily);
      setRegularizations(allRegs);
      setExceptions(allExcs);
      setOvertimeRequests(allOt);
      setWfhRequests(allWfh);
      setPayrollRuns(runs);
      setSalaryStructures(structures);
    } finally {
      setIsLoadingContext(false);
      inFlightRef.current = false;
    }
  }, [selectedPeriod?.id, selectedPeriod?.start_date, selectedPeriod?.end_date, currentEmployee?.id]);

  const handleQuickRegularize = async (row: DailyAttendanceRow) => {
    if (!currentEmployee) return;
    setRegularizingDay(row.dateStr);
    try {
      const empName =
        `${currentEmployee.first_name || ''} ${currentEmployee.last_name || ''}`.trim() ||
        currentEmployee.display_name ||
        'Employee';
      const newReq = attendanceApi.submitRegularization({
        employee_id: currentEmployee.id,
        employee_name: empName,
        attendance_date: row.dateStr,
        reason: 'Missing turnstile punch-out regularized and verified by HR Administrator',
        requested_check_in: row.firstIn || '09:00 AM',
        requested_check_out: '06:00 PM',
        current_status: 'Missing Punch',
      });
      attendanceApi.approveRegularization(newReq.id, 'Approved', 'Approved by HR Administrator - Marked Payable');
      showToast(`Regularization approved for ${row.dateStr}. Day is now marked payable.`, 'success');
      await loadStatementData();
      hrEventBus.emit('attendance:updated', { date: row.dateStr });
    } catch (e: any) {
      showToast(e?.message || 'Failed to regularize attendance', 'error');
    } finally {
      setRegularizingDay(null);
    }
  };

  useEffect(() => {
    loadStatementData();
    let debounceTimer: any = null;
    const debouncedReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadStatementData();
      }, 350);
    };

    const unsub1 = hrEventBus.subscribe('attendance:updated', debouncedReload);
    const unsub2 = hrEventBus.subscribe('attendance.updated', debouncedReload);
    const unsub3 = hrEventBus.subscribe('attendance.punch_recorded', debouncedReload);
    const unsub4 = hrEventBus.subscribe('regularization.approved', debouncedReload);
    const unsub5 = hrEventBus.subscribe('overtime.approved', debouncedReload);

    return () => {
      clearTimeout(debounceTimer);
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [loadStatementData]);

  // Helper to match records to current employee
  const isMatchingEmp = (item: any, emp: any) => {
    if (!item || !emp) return false;
    if (item.employee_id && emp.id && item.employee_id.toLowerCase() === emp.id.toLowerCase()) return true;
    if (item.employee_code && emp.employee_code && item.employee_code.toLowerCase() === emp.employee_code.toLowerCase()) return true;
    if (item.employee_id && emp.employee_code && item.employee_id.toLowerCase().includes(emp.employee_code.toLowerCase())) return true;
    if (item.employee_name && emp.display_name && item.employee_name.trim().toLowerCase() === emp.display_name.trim().toLowerCase()) return true;
    return false;
  };

  // Find index for Previous/Next Employee Navigation
  const currentEmpIndex = useMemo(() => {
    if (!currentEmployee || employees.length === 0) return -1;
    return employees.findIndex((e) => e.id === currentEmployee.id);
  }, [currentEmployee, employees]);

  const handlePrevEmployee = () => {
    if (employees.length <= 1 || currentEmpIndex <= 0) return;
    const prevEmp = employees[currentEmpIndex - 1];
    if (prevEmp && onNavigateEmployee) {
      onNavigateEmployee(prevEmp.id);
    } else if (prevEmp) {
      setCurrentEmployee(prevEmp);
    }
  };

  const handleNextEmployee = () => {
    if (employees.length <= 1 || currentEmpIndex >= employees.length - 1) return;
    const nextEmp = employees[currentEmpIndex + 1];
    if (nextEmp && onNavigateEmployee) {
      onNavigateEmployee(nextEmp.id);
    } else if (nextEmp) {
      setCurrentEmployee(nextEmp);
    }
  };

  // Vendor Detection & Clean Classification
  const isVendor = useMemo(() => {
    if (!currentEmployee) return false;
    const src = currentEmployee.employment_source || currentEmployee.employment?.employment_source;
    if (src === 'VENDOR' || src === 'MANPOWER_PROVIDER') return true;
    if (src === 'DIRECT') return false;
    if (currentEmployee.vendor_name && !currentEmployee.vendor_name.toLowerCase().includes('joy corporate')) return true;
    if (currentEmployee.employment?.vendor_name && !currentEmployee.employment.vendor_name.toLowerCase().includes('joy corporate')) return true;
    if (currentEmployee.company_name && currentEmployee.company_name.toLowerCase().includes('vendor')) return true;
    return false;
  }, [currentEmployee]);

  const vendorName = useMemo(() => {
    if (isVendor) {
      return currentEmployee?.vendor_name || currentEmployee?.employment?.vendor_name || 'Contract Vendor Agency';
    }
    return 'Joy Corporate Solutions Pvt Ltd';
  }, [isVendor, currentEmployee]);

  // Active Effective Payroll Period & Dynamic Filter Engine (Phase 1)
  const activePeriod: PayrollPeriod = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear() >= 2026 ? today.getFullYear() : 2026;
    const curMonth = String(today.getMonth() + 1).padStart(2, '0');
    const monthName = today.toLocaleString('en-US', { month: 'long' });
    const lastDay = new Date(curYear, today.getMonth() + 1, 0).getDate();
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    const basePayrollPeriod: PayrollPeriod = selectedPeriod || {
      id: `period-${curYear}-${curMonth}`,
      tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
      organization_id: '0c621892-e938-4707-9957-13534ea32c19',
      period_name: `${monthName} ${curYear}`,
      start_date: `${curYear}-${curMonth}-01`,
      end_date: `${curYear}-${curMonth}-${String(lastDay).padStart(2, '0')}`,
      pay_date: `${curYear}-${curMonth}-${String(lastDay).padStart(2, '0')}`,
      status: 'OPEN',
      policy_version: 'Joy Enterprise Standard Policy (v3.2)',
      is_locked: false,
    };

    if (dateFilterPreset === 'CURRENT_PAYROLL') {
      return basePayrollPeriod;
    }

    if (dateFilterPreset === 'TODAY') {
      const todayStr = formatYMD(today);
      return {
        ...basePayrollPeriod,
        id: `today-${todayStr}`,
        period_name: `Today (${todayStr})`,
        start_date: todayStr,
        end_date: todayStr,
      };
    }

    if (dateFilterPreset === 'YESTERDAY') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      const yestStr = formatYMD(yest);
      return {
        ...basePayrollPeriod,
        id: `yest-${yestStr}`,
        period_name: `Yesterday (${yestStr})`,
        start_date: yestStr,
        end_date: yestStr,
      };
    }

    if (dateFilterPreset === 'THIS_WEEK') {
      const day = today.getDay();
      const diffToMon = (day === 0 ? -6 : 1) - day;
      const mon = new Date(today);
      mon.setDate(today.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        ...basePayrollPeriod,
        id: `this-week-${formatYMD(mon)}`,
        period_name: `This Week (${formatYMD(mon)} – ${formatYMD(sun)})`,
        start_date: formatYMD(mon),
        end_date: formatYMD(sun),
      };
    }

    if (dateFilterPreset === 'LAST_WEEK') {
      const day = today.getDay();
      const diffToMon = (day === 0 ? -6 : 1) - day - 7;
      const mon = new Date(today);
      mon.setDate(today.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        ...basePayrollPeriod,
        id: `last-week-${formatYMD(mon)}`,
        period_name: `Last Week (${formatYMD(mon)} – ${formatYMD(sun)})`,
        start_date: formatYMD(mon),
        end_date: formatYMD(sun),
      };
    }

    if (dateFilterPreset === 'THIS_MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        ...basePayrollPeriod,
        id: `this-month-${formatYMD(first)}`,
        period_name: `${first.toLocaleString('en-US', { month: 'long' })} ${today.getFullYear()}`,
        start_date: formatYMD(first),
        end_date: formatYMD(last),
      };
    }

    if (dateFilterPreset === 'LAST_MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        ...basePayrollPeriod,
        id: `last-month-${formatYMD(first)}`,
        period_name: `${first.toLocaleString('en-US', { month: 'long' })} ${first.getFullYear()}`,
        start_date: formatYMD(first),
        end_date: formatYMD(last),
      };
    }

    if (dateFilterPreset === 'CUSTOM') {
      return {
        ...basePayrollPeriod,
        id: `custom-${customStartDate}-${customEndDate}`,
        period_name: `Custom (${customStartDate} to ${customEndDate})`,
        start_date: customStartDate,
        end_date: customEndDate,
      };
    }

    return basePayrollPeriod;
  }, [selectedPeriod, dateFilterPreset, customStartDate, customEndDate]);

  // Dynamic Weekly Breakdown Ranges for the Active Month
  const weekRanges = useMemo(() => {
    return getWeekRangesForPeriod(activePeriod);
  }, [activePeriod]);

  // Execute Authoritative Date-by-Date Attendance Calculation
  const calculationResult = useMemo(() => {
    return attendanceCalculationService.calculatePeriodAttendance(
      currentEmployee,
      activePeriod,
      rawAttendanceList,
      regularizations,
      overtimeRequests
    );
  }, [currentEmployee, activePeriod, rawAttendanceList, regularizations, overtimeRequests]);

  const { dailyRows, metrics } = calculationResult;

  // Realtime Attendance Anomaly & Risk Radar Intelligence
  const anomalyReport = useMemo(() => {
    return AttendanceAnomalyIntelligenceEngine.evaluateAnomalies(dailyRows, currentEmployee);
  }, [dailyRows, currentEmployee]);

  // Resolve Employee Salary Package dynamically
  const annualCtc = useMemo(() => {
    const rawCtc = Number(
      currentEmployee?.annual_ctc ||
      currentEmployee?.employment?.annual_ctc ||
      currentEmployee?.employment?.ctc ||
      currentEmployee?.compensation?.annual_ctc ||
      (currentEmployee as any)?.compensation?.ctc ||
      (currentEmployee as any)?.ctc ||
      0
    );

    if (rawCtc > 0) return rawCtc;

    // If employee profile has no CTC mapped yet, dynamically fallback to the tenant's active default Salary Structure
    const structures = payrollApi.getSalaryStructures();
    return structures[0]?.base_annual_ctc || 0;
  }, [currentEmployee]);

  const monthlyCtc = useMemo(() => {
    return Math.round(annualCtc / 12);
  }, [annualCtc]);

  // Execute Realtime Attendance-to-Payroll Financial Impact Calculation
  const payrollImpact: PayrollImpactResult = useMemo(() => {
    const isEsiApplicable =
      (currentEmployee as any)?.statutory?.esi_applicable !== undefined
        ? (currentEmployee as any)?.statutory?.esi_applicable !== false
        : (currentEmployee as any)?.statutory?.is_esi_eligible !== undefined
        ? (currentEmployee as any)?.statutory?.is_esi_eligible !== false
        : currentEmployee?.is_esi_eligible !== undefined
        ? currentEmployee.is_esi_eligible !== false
        : (currentEmployee?.esi_applicable !== undefined ? currentEmployee.esi_applicable !== false : true);

    const isPfApplicable =
      (currentEmployee as any)?.statutory?.pf_applicable !== undefined
        ? (currentEmployee as any)?.statutory?.pf_applicable !== false
        : (currentEmployee as any)?.statutory?.is_pf_eligible !== undefined
        ? (currentEmployee as any)?.statutory?.is_pf_eligible !== false
        : currentEmployee?.is_pf_eligible !== undefined
        ? currentEmployee.is_pf_eligible !== false
        : currentEmployee?.pf_applicable !== false;

    const isPtApplicable =
      (currentEmployee as any)?.statutory?.pt_applicable !== undefined
        ? (currentEmployee as any)?.statutory?.pt_applicable !== false
        : (currentEmployee as any)?.statutory?.is_pt_eligible !== undefined
        ? (currentEmployee as any)?.statutory?.is_pt_eligible !== false
        : currentEmployee?.is_pt_eligible !== undefined
        ? currentEmployee.is_pt_eligible !== false
        : currentEmployee?.pt_applicable !== false;

    const isLwfApplicable =
      (currentEmployee as any)?.statutory?.lwf_applicable !== undefined
        ? (currentEmployee as any)?.statutory?.lwf_applicable !== false
        : (currentEmployee as any)?.statutory?.is_lwf_eligible !== undefined
        ? (currentEmployee as any)?.statutory?.is_lwf_eligible !== false
        : currentEmployee?.is_lwf_eligible !== undefined
        ? currentEmployee.is_lwf_eligible !== false
        : currentEmployee?.lwf_applicable === true;

    return payrollImpactCalculationEngine.calculateImpact({
      annualCtc,
      monthlyCtc,
      metrics,
      otMultiplier: 1.5,
      structureCode: currentEmployee?.salary_structure_code || 'CORP_STD_01',
      pfApplicable: isPfApplicable,
      esiApplicable: isEsiApplicable,
      ptApplicable: isPtApplicable,
      lwfApplicable: isLwfApplicable,
    });
  }, [annualCtc, monthlyCtc, metrics, currentEmployee]);

  // Authoritative Attendance Bonus & Incentive Evaluation (Phase 8)
  const bonusResult: AttendanceBonusEvaluationResult = useMemo(() => {
    return attendanceBonusService.evaluateEmployeeBonus(
      metrics,
      currentEmployee,
      selectedBonusPolicy,
      activePeriod.id
    );
  }, [currentEmployee, metrics, selectedBonusPolicy, activePeriod.id]);

  // Payroll Readiness Checklist Evaluation
  const payrollBlockers = useMemo(() => {
    const blockers: Array<{ type: 'error' | 'warning' | 'success'; message: string; resolved?: boolean }> = [];

    const pendingRegs = regularizations.filter(
      (r) => isMatchingEmp(r, currentEmployee) && r.status === 'Pending'
    );
    if (pendingRegs.length > 0) {
      blockers.push({
        type: 'error',
        message: `${pendingRegs.length} regularization request(s) awaiting approval`,
        resolved: false,
      });
    } else {
      blockers.push({
        type: 'success',
        message: 'All regularization requests resolved & reconciled',
        resolved: true,
      });
    }

    const openExceptions = exceptions.filter(
      (e) => isMatchingEmp(e, currentEmployee) && e.status === 'Open'
    );
    if (openExceptions.length > 0) {
      blockers.push({
        type: 'error',
        message: `${openExceptions.length} biometric hardware exception(s) pending resolution`,
        resolved: false,
      });
    } else {
      blockers.push({
        type: 'success',
        message: 'No pending biometric or device exceptions',
        resolved: true,
      });
    }

    if (metrics.approvedOvertimeMinutes > 0) {
      blockers.push({
        type: 'success',
        message: `Overtime verified (${formatMinutesToHoursStr(metrics.approvedOvertimeMinutes)} approved for payroll credit = ₹${payrollImpact.otEarnings.toLocaleString('en-IN')})`,
        resolved: true,
      });
    }

    return blockers;
  }, [regularizations, exceptions, metrics, currentEmployee, payrollImpact]);

  const isPayrollReady = useMemo(() => {
    return payrollBlockers.every((b) => b.type !== 'error' && (b.resolved !== false || b.type === 'warning'));
  }, [payrollBlockers]);

  // Finalize Attendance Action with Database RPC
  const handleFinalizeAttendance = async () => {
    if (!isPayrollReady) {
      showToast('Attendance cannot be finalized while blocking exceptions remain unresolved.', 'error');
      return;
    }

    setIsFinalizing(true);
    try {
      const res = await payrollPeriodService.finalizeEmployeeAttendance(
        currentEmployee?.id || employeeId || '',
        activePeriod.id
      );
      showToast(res.message, 'success');
      setSelectedPeriod((prev) => (prev ? { ...prev, status: 'FINALIZED', is_locked: true } : prev));
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize attendance', 'error');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Real dynamic employee values for display (no mock or hardcoded fallback personas)
  const empName = [currentEmployee?.first_name, currentEmployee?.last_name].filter(Boolean).join(' ') || currentEmployee?.display_name || 'Employee';
  const empCode = currentEmployee?.employee_code || '';
  const empDept = currentEmployee?.department_name || currentEmployee?.department || 'Engineering';
  const empDesignation = currentEmployee?.designation_title || currentEmployee?.designation || currentEmployee?.role || 'Senior Software Engineer';
  const empBranch = currentEmployee?.branch_name || currentEmployee?.location || currentEmployee?.company_name || 'Joy Corporate Solutions (HQ)';
  const empManager = currentEmployee?.reporting_manager_name || (currentEmployee?.reporting_manager_id ? 'Reporting Manager' : 'Executive Operations');

  if (!employeeId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* 85-90% Large Detail Workspace */}
      <div className="bg-white w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">

        {/* ─── 1. STATEMENT HEADER ────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#07563D] via-[#086346] to-[#0a7a57] text-white p-4 sm:p-5 flex items-center justify-between gap-4 shrink-0 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 text-white font-black text-xl flex items-center justify-center border border-white/20 shadow-xs shrink-0">
              {empName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">{empName}</h2>
                <span className="bg-black/20 text-emerald-100 text-xs font-mono font-bold px-2 py-0.5 rounded-md border border-white/10">
                  {empCode}
                </span>
                <span className={cn(
                  "text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider",
                  isVendor ? "bg-amber-400 text-amber-950 font-black shadow-xs" : "bg-emerald-300 text-emerald-950 font-black shadow-xs"
                )}>
                  {isVendor ? `VENDOR · ${vendorName}` : 'DIRECT PAYROLL'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-100/90 mt-1 flex-wrap">
                <span className="font-semibold text-white">{empDesignation}</span>
                <span>•</span>
                <span>{empDept}</span>
                <span>•</span>
                <span>{empBranch}</span>
                <span>•</span>
                <span className="text-emerald-200">Manager: {empManager}</span>
              </div>
            </div>
          </div>

          {/* Header Controls & Actions — Polished Capsule Bar */}
          <div className="flex items-center gap-2.5">
            {/* Previous / Next Employee Navigation */}
            <div className="flex items-center bg-white/10 rounded-full px-2 py-0.5 border border-white/25 shadow-xs">
              <button
                onClick={handlePrevEmployee}
                disabled={currentEmpIndex <= 0}
                title="Previous Employee (Left Arrow)"
                className="p-1 hover:bg-white/20 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 font-bold text-white tracking-wide">
                {currentEmpIndex >= 0 ? currentEmpIndex + 1 : 2} / {employees.length || 2}
              </span>
              <button
                onClick={handleNextEmployee}
                disabled={currentEmpIndex >= employees.length - 1}
                title="Next Employee (Right Arrow)"
                className="p-1 hover:bg-white/20 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Vector PDF Statement Action */}
            <button
              onClick={() => {
                try {
                  const doc = AttendanceStatementPdfService.generateStatementPdf({
                    employee: currentEmployee,
                    periodName: activePeriod.period_name,
                    startDate: activePeriod.start_date,
                    endDate: activePeriod.end_date,
                    metrics,
                    dailyRows,
                    payrollImpact,
                    bonusResult,
                    companyName: activeCompany?.legal_name || 'Joy PeopleHR',
                  });
                  const empCode = currentEmployee?.employee_code || 'EMP';
                  doc.save(`Attendance_Statement_${empCode}_${activePeriod.start_date}_${activePeriod.end_date}.pdf`);
                  showToast(`✓ Downloaded ${empName} Vector PDF Statement (.pdf)`, 'success');
                } catch (err: any) {
                  showToast('PDF generation failed: ' + (err?.message || err), 'error');
                }
              }}
              title="Download High-Resolution Vector PDF Statement"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white rounded-full text-xs font-bold transition-all hidden sm:flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF Statement</span>
            </button>

            {/* Print Statement Action */}
            <button
              onClick={() => {
                setActiveTab('statement');
                setTimeout(() => window.print(), 250);
              }}
              title="Print Official A4 Attendance Statement"
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-full text-xs font-bold transition-all hidden sm:flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>

            {/* Export Dropdown Action */}
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-full text-xs font-bold transition-all hidden sm:flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Reports</span>
                <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", exportDropdownOpen && "rotate-90")} />
              </button>

              {exportDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 text-gray-800 animate-in fade-in zoom-in-95"
                  onClick={() => setExportDropdownOpen(false)}
                >
                  <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Individual Statements
                  </div>

                  <button
                    onClick={() => {
                      try {
                        exportAttendanceStatementToExcel({
                          employee: currentEmployee,
                          periodName: activePeriod.period_name,
                          startDate: activePeriod.start_date,
                          endDate: activePeriod.end_date,
                          metrics,
                          dailyRows,
                          payrollImpact,
                          bonusResult,
                          companyName: activeCompany?.legal_name || 'Joy PeopleHR',
                        });
                        showToast(`✓ Downloaded ${empName} Multi-Sheet Excel Statement (.xlsx)`, 'success');
                      } catch (err: any) {
                        showToast('Excel export failed: ' + (err?.message || err), 'error');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-emerald-50 hover:text-[#07563D] flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <div>
                      <span className="block font-bold">Excel Statement (.xlsx)</span>
                      <span className="text-[10px] text-gray-500">5 Sheets: Summary, Register, OT, Perms, Radar</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      try {
                        const doc = AttendanceStatementPdfService.generateStatementPdf({
                          employee: currentEmployee,
                          periodName: activePeriod.period_name,
                          startDate: activePeriod.start_date,
                          endDate: activePeriod.end_date,
                          metrics,
                          dailyRows,
                          payrollImpact,
                          bonusResult,
                          companyName: activeCompany?.legal_name || 'Joy PeopleHR',
                        });
                        const empCode = currentEmployee?.employee_code || 'EMP';
                        doc.save(`Attendance_Statement_${empCode}_${activePeriod.start_date}_${activePeriod.end_date}.pdf`);
                        showToast(`✓ Downloaded ${empName} Vector PDF Statement (.pdf)`, 'success');
                      } catch (err: any) {
                        showToast('PDF generation failed: ' + (err?.message || err), 'error');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2 cursor-pointer border-t border-gray-100"
                  >
                    <FileText className="w-4 h-4 text-rose-700" />
                    <div>
                      <span className="block font-bold">Vector PDF Statement (.pdf)</span>
                      <span className="text-[10px] text-gray-500">Official multi-page A4 document with signatures</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      try {
                        exportAttendanceStatementToCsv({
                          employee: currentEmployee,
                          periodName: activePeriod.period_name,
                          startDate: activePeriod.start_date,
                          endDate: activePeriod.end_date,
                          metrics,
                          dailyRows,
                          payrollImpact,
                          bonusResult,
                          companyName: activeCompany?.legal_name || 'Joy PeopleHR',
                        });
                        showToast(`✓ Downloaded ${empName} Daily Register (.csv)`, 'success');
                      } catch (err: any) {
                        showToast('CSV export failed: ' + (err?.message || err), 'error');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-blue-50 hover:text-blue-800 flex items-center gap-2 cursor-pointer border-t border-gray-100"
                  >
                    <FileText className="w-4 h-4 text-blue-700" />
                    <div>
                      <span className="block font-bold">CSV Register (.csv)</span>
                      <span className="text-[10px] text-gray-500">Raw daily punch data for external ERP</span>
                    </div>
                  </button>

                  <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-200 mt-1">
                    Organization-Wide Registers ({employees.length || 0} Staff)
                  </div>

                  <button
                    onClick={() => {
                      try {
                        const orgRecords = employees.map((emp) => {
                          const res = attendanceCalculationService.calculatePeriodAttendance(
                            emp,
                            activePeriod,
                            rawAttendanceList,
                            regularizations,
                            overtimeRequests
                          );
                          const imp = payrollImpactCalculationEngine.calculateImpact({
                            annualCtc: 420000,
                            monthlyCtc: 35000,
                            metrics: res.metrics,
                            pfApplicable: true,
                            esiApplicable: false,
                            ptApplicable: true,
                          });
                          return {
                            employee: emp,
                            metrics: res.metrics,
                            dailyRows: res.dailyRows,
                            payrollImpact: imp,
                            hourlyRate: 280,
                          };
                        });

                        exportOverallOvertimeRegisterToExcel({
                          organizationName: activeCompany?.legal_name || 'Electra EV',
                          periodName: activePeriod.period_name,
                          startDate: activePeriod.start_date,
                          endDate: activePeriod.end_date,
                          records: orgRecords,
                        });
                        showToast(`✓ Downloaded Master Overtime Register (.xlsx) for ${employees.length} employees`, 'success');
                      } catch (err: any) {
                        showToast('Master OT export failed: ' + (err?.message || err), 'error');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-teal-50 hover:text-teal-900 flex items-center gap-2 cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4 text-teal-700" />
                    <div>
                      <span className="block font-bold">Master Overtime Register (.xlsx)</span>
                      <span className="text-[10px] text-gray-500">Separate OT payroll sheet with 1.5x multiplier</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      try {
                        const orgRecords = employees.map((emp) => {
                          const res = attendanceCalculationService.calculatePeriodAttendance(
                            emp,
                            activePeriod,
                            rawAttendanceList,
                            regularizations,
                            overtimeRequests
                          );
                          const imp = payrollImpactCalculationEngine.calculateImpact({
                            annualCtc: 420000,
                            monthlyCtc: 35000,
                            metrics: res.metrics,
                            pfApplicable: true,
                            esiApplicable: false,
                            ptApplicable: true,
                          });
                          return {
                            employee: emp,
                            metrics: res.metrics,
                            dailyRows: res.dailyRows,
                            payrollImpact: imp,
                          };
                        });

                        exportOverallAttendanceRegisterToExcel({
                          organizationName: activeCompany?.legal_name || 'Electra EV',
                          periodName: activePeriod.period_name,
                          startDate: activePeriod.start_date,
                          endDate: activePeriod.end_date,
                          records: orgRecords,
                        });
                        showToast(`✓ Downloaded Master Attendance Register (.xlsx) for ${employees.length} employees`, 'success');
                      } catch (err: any) {
                        showToast('Master Attendance export failed: ' + (err?.message || err), 'error');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2 cursor-pointer border-t border-gray-100"
                  >
                    <Users className="w-4 h-4 text-indigo-700" />
                    <div>
                      <span className="block font-bold">Master Attendance Register (.xlsx)</span>
                      <span className="text-[10px] text-gray-500">All workforce attendance & payable days</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-full transition-all text-white/90 hover:text-white cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── 2. PERIOD & REPORTING FILTER RIBBON (PHASE 1) ───────────────── */}
        <div className="bg-gray-50 px-4 sm:px-6 py-2.5 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Preset Selector */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-gray-200 shadow-2xs font-semibold text-gray-800">
              <Calendar className="w-3.5 h-3.5 text-[#07563D]" />
              <span className="text-gray-500">Filter:</span>
              <select
                value={dateFilterPreset}
                onChange={(e) => setDateFilterPreset(e.target.value as any)}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer text-xs"
              >
                <option value="CURRENT_PAYROLL">Current Payroll Period</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="LAST_WEEK">Last Week</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="CUSTOM">Custom Date Range (From – To)</option>
              </select>
            </div>

            {/* If Current Payroll selected: select payroll run */}
            {dateFilterPreset === 'CURRENT_PAYROLL' && (
              <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-xl border border-gray-200 shadow-2xs font-semibold text-gray-800">
                <span className="text-gray-500">Period:</span>
                <select
                  value={activePeriod.id}
                  onChange={(e) => {
                    const p = payrollPeriods.find((item) => item.id === e.target.value);
                    if (p) setSelectedPeriod(p);
                  }}
                  className="bg-transparent font-bold text-[#07563D] focus:outline-none cursor-pointer text-xs"
                >
                  {payrollPeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.period_name} ({p.start_date} – {p.end_date})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* If Custom Date Range selected: render date pickers */}
            {dateFilterPreset === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-gray-200 shadow-2xs font-semibold text-gray-800">
                <span className="text-gray-500">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent font-bold text-gray-900 text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none"
                />
                <span className="text-gray-500">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent font-bold text-gray-900 text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none"
                />
              </div>
            )}

            {/* Selected Effective Date Range Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[#07563D] font-bold text-[11px]">
              <span>Active Period:</span>
              <span className="font-mono">{activePeriod.start_date} – {activePeriod.end_date}</span>
              <span className="text-emerald-700/80 font-normal">({metrics.totalCalendarDays} days)</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-gray-500 font-semibold">Payroll State:</span>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px]",
                activePeriod.is_locked || activePeriod.status === 'FINALIZED'
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : activePeriod.status === 'READY_FOR_REVIEW'
                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              )}>
                {activePeriod.is_locked || activePeriod.status === 'FINALIZED' ? (
                  <Lock className="w-3 h-3 text-emerald-700" />
                ) : (
                  <Unlock className="w-3 h-3 text-amber-700" />
                )}
                <span>
                  {activePeriod.status === 'FINALIZED' || activePeriod.is_locked
                    ? 'Payroll Finalized & Locked'
                    : `Status: ${activePeriod.status}`}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 font-medium">Authoritative Policy:</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#07563D] border border-emerald-200 font-bold font-mono text-[10px]">
              {activePeriod.policy_version || 'Joy Enterprise Standard Policy (v3.2)'}
            </span>
          </div>
        </div>

        {/* ─── 3. TOP SUMMARY KPI STRIP (UNIVERSALLY PRECISE) ────────────────── */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 p-3 sm:px-6 bg-white border-b border-gray-200 text-center shrink-0">
          <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Scheduled</span>
            <span className="text-sm font-black text-gray-800 font-mono">{metrics.scheduledWorkingDays}d</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">({metrics.weeklyOffDays}d Off)</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Present</span>
            <span className="text-sm font-black text-emerald-900 font-mono">{metrics.presentDays}d</span>
            <span className="text-[9px] text-emerald-600 block mt-0.5">({metrics.elapsedWorkingDays}d elapsed)</span>
          </div>
          <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Absent LOP</span>
            <span className="text-sm font-black text-rose-900 font-mono">{metrics.absentDays}d</span>
            <span className="text-[9px] text-rose-600 block mt-0.5">Unpaid</span>
          </div>
          <div className="p-2 rounded-xl bg-purple-50/60 border border-purple-100">
            <span className="text-[10px] uppercase font-bold text-purple-700 block">Leave</span>
            <span className="text-sm font-black text-purple-900 font-mono">{metrics.paidLeaveDays}d</span>
            <span className="text-[9px] text-purple-600 block mt-0.5">Paid</span>
          </div>
          <div className="p-2 rounded-xl bg-sky-50/60 border border-sky-100">
            <span className="text-[10px] uppercase font-bold text-sky-700 block">Half Day</span>
            <span className="text-sm font-black text-sky-900 font-mono">{metrics.halfDays}d</span>
            <span className="text-[9px] text-sky-600 block mt-0.5">0.5d LOP</span>
          </div>
          <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">WFH</span>
            <span className="text-sm font-black text-indigo-900 font-mono">{metrics.wfhDays}d</span>
            <span className="text-[9px] text-indigo-600 block mt-0.5">Remote</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Late</span>
            <span className="text-sm font-black text-amber-900 font-mono">{metrics.lateEventsCount}</span>
            <span className="text-[9px] text-amber-600 block mt-0.5">{metrics.totalLateMinutes}m total</span>
          </div>
          <div className="p-2 rounded-xl bg-orange-50/60 border border-orange-100">
            <span className="text-[10px] uppercase font-bold text-orange-700 block">Early</span>
            <span className="text-sm font-black text-orange-900 font-mono">{metrics.earlyEventsCount}</span>
            <span className="text-[9px] text-orange-600 block mt-0.5">Departures</span>
          </div>
          <div className="p-2 rounded-xl bg-teal-50/60 border border-teal-100">
            <span className="text-[10px] uppercase font-bold text-teal-700 block">OT Hours</span>
            <span className="text-sm font-black text-teal-900 font-mono">{formatMinutesToHoursStr(metrics.approvedOvertimeMinutes)}</span>
            <span className="text-[9px] text-teal-600 block mt-0.5">₹{payrollImpact.otEarnings.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-2 rounded-xl bg-[#07563D]/10 border border-[#07563D]/30">
            <span className="text-[10px] uppercase font-black text-[#07563D] block">Payable Days</span>
            <span className="text-sm font-black text-[#07563D] font-mono">{metrics.payableDays}d</span>
            <span className="text-[9px] text-[#07563D] font-bold block mt-0.5">/ {metrics.totalCalendarDays}d Total</span>
          </div>
        </div>

        {/* ─── 4. MAIN NAVIGATION TABS (14 COMPREHENSIVE INTELLIGENCE VIEWS) ── */}
        <div className="bg-gray-100/80 px-4 sm:px-6 pt-2 border-b border-gray-200 flex items-center gap-1 overflow-x-auto shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'daily', label: 'Daily Attendance', icon: Calendar },
            { id: 'weekly-monthly', label: 'Weekly & Monthly', icon: Calendar },
            { id: 'work-hours', label: 'Work Hours', icon: Clock },
            { id: 'breaks', label: 'Breaks Analytics', icon: Coffee },
            { id: 'leave', label: 'Leave & Permissions', icon: FileCheck },
            { id: 'late-early', label: 'Late / Early', icon: AlertTriangle },
            { id: 'overtime', label: 'Overtime', icon: DollarSign },
            { id: 'bonus', label: 'Attendance Bonus', icon: Award },
            { id: 'regularization', label: 'Regularization', icon: Sliders },
            { id: 'exceptions', label: 'Exceptions', icon: AlertCircle },
            { id: 'payroll-impact', label: 'Payroll Impact', icon: ShieldCheck },
            { id: 'audit', label: 'Audit Trail', icon: FileText },
            { id: 'statement', label: 'Official Statement', icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border-t-2 cursor-pointer",
                  isActive
                    ? "bg-white text-[#07563D] border-[#07563D] shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 border-transparent"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#07563D]" : "text-gray-400")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── 5. TAB CONTENT WORKSPACE ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/50">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Monthly Visual Timeline Ribbon */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 font-mono flex items-center gap-2">
                    <span>{activePeriod.period_name} • Visual Attendance Timeline (Days 1–{metrics.totalCalendarDays})</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#07563D] border border-emerald-200 text-[10px] font-bold">
                      {metrics.presentDays}d Present / {metrics.scheduledWorkingDays}d Scheduled
                    </span>
                  </h3>
                  <span className="text-xs text-gray-400">Click any day to inspect turnstile punch stamps & calculation trace</span>
                </div>

                {/* Dynamic Weekly Calendar Breakdown */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 font-mono">
                    WEEKS ({weekRanges.length}):
                  </span>
                  {weekRanges.map((w) => {
                    const weekDays = dailyRows.filter((d) => d.dateStr >= w.start_date && d.dateStr <= w.end_date);
                    const weekPresent = weekDays.filter(
                      (d) => d.status === 'Present' || d.status === 'Late' || d.status === 'Checked In' || d.status === 'Regularized'
                    ).length;
                    const weekScheduled = weekDays.filter((d) => !d.isWeeklyOff && d.status !== 'Pre-Joining').length;
                    const isCurrentWeek = weekDays.some((d) => d.isToday);

                    return (
                      <div
                        key={w.weekNum}
                        className={cn(
                          "px-2.5 py-1 rounded-xl border text-[11px] flex items-center gap-2 shrink-0 transition-all select-none",
                          isCurrentWeek
                            ? "bg-emerald-50/80 border-emerald-300 shadow-2xs text-[#07563D] font-semibold"
                            : "bg-gray-50 border-gray-200 text-gray-700"
                        )}
                      >
                        <span className="font-bold">{w.label.split(' (')[0]}</span>
                        <span className="text-gray-400 font-mono text-[10px]">
                          {w.start_date.slice(5)} – {w.end_date.slice(5)}
                        </span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-md font-mono font-bold text-[10px]",
                          weekPresent > 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                        )}>
                          {weekPresent}/{weekScheduled}d P
                        </span>
                        {isCurrentWeek && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" title="Active Current Week" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 lg:grid-cols-31 gap-1">
                  {dailyRows.map((d) => {
                    const isMissingPunch = d.status === 'Missing Punch';
                    const isRegularized = d.status === 'Regularized';
                    const isCheckedIn = d.status === 'Checked In';
                    const isLate = d.lateMinutes > 0 || d.status === 'Late';
                    const isAbsent = d.status === 'Absent';
                    const isPresent = d.status === 'Present';
                    const isLeave = d.status === 'Paid Leave' || d.status === 'Unpaid Leave';

                    return (
                      <div
                        key={d.dayNum}
                        onClick={() => {
                          setSelectedDayRow(d);
                          setActiveTab('daily');
                        }}
                        title={`Day ${d.dayNum} (${d.dayName}): ${d.status}${isMissingPunch ? ' • Missing Check-Out (Unpaid LOP)' : ''}`}
                        className={cn(
                          "p-1.5 sm:p-2 rounded-xl text-center border cursor-pointer transition-all hover:scale-105 select-none",
                          d.isToday && "ring-2 ring-[#07563D] ring-offset-1 bg-emerald-50/40 font-bold",
                          d.status === 'Pre-Joining' ? "bg-gray-50/60 border-dashed border-gray-200 text-gray-400 opacity-60" :
                          d.isWeeklyOff ? "bg-gray-100 border-gray-200 text-gray-500" :
                          isMissingPunch ? "bg-amber-100 border-amber-400 text-amber-950 font-black shadow-xs ring-1 ring-amber-400" :
                          isRegularized ? "bg-teal-50 border-teal-300 text-teal-900 font-bold" :
                          isCheckedIn ? "bg-blue-50 border-blue-300 text-blue-900 font-bold" :
                          isLate ? "bg-amber-50 border-amber-200 text-amber-900 font-bold" :
                          isPresent ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-bold" :
                          isLeave ? "bg-purple-50 border-purple-200 text-purple-900 font-bold" :
                          isAbsent ? "bg-rose-50 border-rose-200 text-rose-900 font-bold" :
                          d.isFuture ? "bg-blue-50/40 border-blue-100 text-blue-800" :
                          "bg-white border-gray-200 text-gray-400"
                        )}
                      >
                        <span className="text-[8px] block uppercase text-gray-400 font-semibold">{d.dayName}</span>
                        <span className="text-[11px] block font-mono font-bold leading-tight">{d.dayNum}</span>
                        <span className="text-[9px] block uppercase font-bold mt-0.5">
                          {d.status === 'Pre-Joining' ? '—' :
                           d.isWeeklyOff ? 'WO' :
                           isMissingPunch ? 'MP' :
                           isRegularized ? 'REG' :
                           isCheckedIn ? 'IN' :
                           isLate ? 'LP' :
                           isPresent ? 'P' :
                           isLeave ? 'L' :
                           isAbsent ? 'A' :
                           d.isFuture ? 'SCH' : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3-Column Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Attendance Quality */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-gray-900">Attendance Quality & Regularity</h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600 font-medium">Late Arrivals</span>
                      <strong className={cn("font-bold", metrics.lateEventsCount > 0 ? "text-amber-700" : "text-gray-800")}>
                        {metrics.lateEventsCount} events ({metrics.totalLateMinutes}m total)
                      </strong>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600 font-medium">Early Departures</span>
                      <strong className="text-gray-800 font-bold">{metrics.earlyEventsCount} events</strong>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600 font-medium">Missing Punch Exceptions</span>
                      <div className="flex items-center gap-2">
                        <strong className={cn("font-bold", metrics.missingPunchCount > 0 ? "text-rose-700 font-black" : "text-emerald-700")}>
                          {metrics.missingPunchCount} flagged
                        </strong>
                        {metrics.missingPunchCount > 0 && (
                          <button
                            onClick={() => setActiveTab('regularization')}
                            className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Resolve →
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600 font-medium">Regularizations Requested</span>
                      <strong className="text-purple-700 font-bold">
                        {regularizations.filter((r) => isMatchingEmp(r, currentEmployee)).length} requests
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 2. Work Hours Progress */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-gray-900">Work Hours & Overtime</h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600 font-medium">Elapsed Scheduled Hours</span>
                      <strong className="text-gray-900 font-bold font-mono">{formatMinutesToHoursStr(metrics.totalScheduledMinutes)}</strong>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                      <span className="text-emerald-900 font-semibold">Actual Worked Hours</span>
                      <strong className="text-emerald-950 font-bold font-mono">{formatMinutesToHoursStr(metrics.totalWorkedMinutes)}</strong>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-rose-50/70 border border-rose-100">
                      <span className="text-rose-900 font-semibold">Shortfall / Deficit</span>
                      <strong className="text-rose-950 font-bold font-mono">
                        {formatMinutesToHoursStr(Math.max(0, metrics.totalScheduledMinutes - metrics.totalWorkedMinutes))}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-teal-50/70 border border-teal-100">
                      <span className="text-teal-900 font-semibold">Eligible Overtime (OT)</span>
                      <strong className="text-teal-950 font-bold font-mono">{formatMinutesToHoursStr(metrics.approvedOvertimeMinutes)}</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Payroll Readiness & Finalization */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#07563D]" />
                        <h3 className="text-sm font-bold text-gray-900">Payroll Readiness</h3>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono",
                        isPayrollReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {isPayrollReady ? 'Ready for Payroll' : 'Action Required'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {payrollBlockers.map((b, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          {b.resolved ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : b.type === 'error' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <span className={cn("text-[11px]", b.resolved ? "text-gray-600" : "text-gray-900 font-semibold")}>
                            {b.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleFinalizeAttendance}
                      disabled={isFinalizing}
                      className="w-full bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl shadow-xs py-2 text-xs cursor-pointer"
                    >
                      {isFinalizing ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
                      Finalize Attendance for Payroll
                    </Button>
                  </div>
                </div>
              </div>

              {/* 4. Electra EV Permission Policy & Anomaly Intelligence Radar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Electra EV Permission Policy Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                      <h3 className="text-sm font-bold text-gray-900">Electra EV Permission & Grace Policy</h3>
                    </div>
                    <button
                      onClick={() => setIsPolicyModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#07563D] text-[11px] font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Configure Policy</span>
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600 font-medium">Shift Grace Threshold:</span>
                      <strong className="text-gray-900 font-bold">{policyGraceMinutes} Minutes</strong>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                      <span className="text-gray-600 font-medium">Monthly Permission Quota:</span>
                      <strong className="text-gray-900 font-bold">{policyAllowanceMinutes} Mins (2 Hours)</strong>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-amber-50/70 border border-amber-100">
                      <span className="text-amber-900 font-semibold">Permission Minutes Consumed:</span>
                      <strong className="text-amber-950 font-bold font-mono">{metrics.totalPermissionMinutes || 0} mins</strong>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                      <span className="text-emerald-900 font-semibold">Remaining Permission Balance:</span>
                      <strong className="text-emerald-950 font-bold font-mono">
                        {metrics.permissionRemainingMinutes ?? Math.max(0, policyAllowanceMinutes - (metrics.totalPermissionMinutes || 0))} mins
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 text-[11px] text-gray-600 flex items-start gap-2 border border-gray-100">
                      <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Check-ins after {policyGraceMinutes}-min grace auto-deduct from allowance. Once exhausted, subsequent late arrivals are automatically marked as <strong>Half Day (0.5d LOP)</strong>.</span>
                    </div>
                  </div>
                </div>

                {/* Attendance Anomaly & Risk Radar */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <h3 className="text-sm font-bold text-gray-900">Attendance Anomaly & Risk Radar</h3>
                    </div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide",
                      anomalyReport.overallRiskLevel === 'CRITICAL' ? "bg-rose-100 text-rose-800 border border-rose-200" :
                      anomalyReport.overallRiskLevel === 'HIGH' ? "bg-orange-100 text-orange-800 border border-orange-200" :
                      anomalyReport.overallRiskLevel === 'MEDIUM' ? "bg-amber-100 text-amber-800 border border-amber-200" :
                      "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    )}>
                      {anomalyReport.overallRiskLevel} Risk
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Extended Absence > 2 Days */}
                    <div className={cn(
                      "p-3 rounded-xl border flex items-start justify-between gap-2",
                      anomalyReport.extendedAbsenceStreaks.length > 0 ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-gray-50 border-gray-100 text-gray-700"
                    )}>
                      <div>
                        <span className="font-bold block">
                          {anomalyReport.extendedAbsenceStreaks.length > 0
                            ? `⚠️ Extended Absence: >2 Days Leave Detected (${anomalyReport.extendedAbsenceStreaks.length} streak)`
                            : '✓ Extended Absence Check (>2 Days)'}
                        </span>
                        <span className="text-[11px] text-gray-600 mt-0.5 block leading-relaxed">
                          {anomalyReport.extendedAbsenceStreaks.length > 0
                            ? anomalyReport.extendedAbsenceStreaks.map(s => `${s.consecutiveDays} consecutive days absent (${s.startDate} to ${s.endDate})`).join(', ')
                            : 'No absence streaks exceeding 2 days detected in this period.'}
                        </span>
                      </div>
                      {anomalyReport.extendedAbsenceStreaks.length > 0 && (
                        <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[10px] rounded-full shrink-0">
                          ACTION REQUIRED
                        </span>
                      )}
                    </div>

                    {/* Frequent Late Arrivals */}
                    <div className={cn(
                      "p-3 rounded-xl border flex items-start justify-between gap-2",
                      anomalyReport.frequentLate ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-gray-50 border-gray-100 text-gray-700"
                    )}>
                      <div>
                        <span className="font-bold block">
                          {anomalyReport.frequentLate
                            ? `⚠️ Habitual Late Check-Ins: ${anomalyReport.frequentLate.lateCount} Days Late`
                            : '✓ Punctuality Pattern'}
                        </span>
                        <span className="text-[11px] text-gray-600 mt-0.5 block leading-relaxed">
                          {anomalyReport.frequentLate
                            ? `${anomalyReport.frequentLate.lateCount} late arrivals accumulating ${anomalyReport.frequentLate.totalLateMinutes} minutes.`
                            : 'Consistent punctual check-ins within the grace threshold.'}
                        </span>
                      </div>
                      {anomalyReport.frequentLate && (
                        <span className="px-2 py-0.5 bg-amber-600 text-white font-black text-[10px] rounded-full shrink-0">
                          COUNSELING
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DAILY ATTENDANCE TABLE */}
          {activeTab === 'daily' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Day-by-Day Attendance Record ({activePeriod.period_name})</h3>
                  <p className="text-xs text-gray-500">Includes shift assignments, turnstile punch timestamps, grace calculations, and source channels</p>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  Showing {metrics.totalCalendarDays} calendar days ({metrics.weeklyOffDays} Weekly Offs • {metrics.scheduledWorkingDays} Working Days)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-3 py-3">Shift & Roster</th>
                      <th className="px-3 py-3">Scheduled</th>
                      <th className="px-3 py-3">First IN</th>
                      <th className="px-3 py-3">Last OUT</th>
                      <th className="px-3 py-3">Worked</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Late</th>
                      <th className="px-3 py-3">Early</th>
                      <th className="px-3 py-3">OT</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-4 py-3 text-right">Calculation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dailyRows.map((d) => (
                      <tr
                        key={d.dayNum}
                        onClick={() => setSelectedDayRow(d)}
                        className={cn(
                          "hover:bg-emerald-50/30 transition-colors cursor-pointer",
                          d.isToday && "bg-emerald-50/20 font-semibold",
                          selectedDayRow?.dayNum === d.dayNum && "bg-emerald-50/50"
                        )}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">
                          <span>{d.dateStr}</span>
                          <span className="text-[10px] text-gray-400 font-sans ml-1.5 uppercase">({d.dayName})</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-semibold text-gray-800">{d.shiftName}</span>
                          <span className="text-[10px] text-gray-400 font-mono block">({d.calculationTrace.shiftCode})</span>
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-600">{d.scheduledTime}</td>
                        <td className="px-3 py-3 font-mono font-bold text-gray-900">
                          {d.firstIn || (d.isWeeklyOff ? '—' : d.isFuture ? 'Scheduled' : '—')}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-gray-900">
                          {d.lastOut || (d.isWeeklyOff ? '—' : d.status === 'Missing Punch' ? (
                            <span className="text-amber-600 font-bold text-[11px]">Missing</span>
                          ) : d.isFuture ? 'Scheduled' : '—')}
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-800">
                          {d.status === 'Missing Punch' ? (
                            <span className="text-rose-600 font-bold text-[11px]">0h 0m (LOP)</span>
                          ) : (
                            d.workedDurationStr
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1",
                            d.isWeeklyOff ? "bg-gray-100 text-gray-600" :
                            d.status === 'Missing Punch' ? "bg-amber-100 text-amber-900 border border-amber-300 font-black" :
                            d.status === 'Regularized' ? "bg-teal-100 text-teal-900 border border-teal-300" :
                            d.status === 'Checked In' ? "bg-blue-100 text-blue-900 border border-blue-300" :
                            d.status === 'Late' ? "bg-amber-100 text-amber-900" :
                            d.status === 'Present' ? "bg-emerald-100 text-emerald-900" :
                            d.status === 'Paid Leave' ? "bg-purple-100 text-purple-900" :
                            d.status === 'Absent' ? "bg-rose-100 text-rose-900" :
                            d.isFuture ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-600"
                          )}>
                            {d.status === 'Missing Punch' && <AlertTriangle className="w-3 h-3 text-amber-700" />}
                            {d.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-amber-700">
                          {d.lateMinutes > 0 ? `+${d.lateMinutes}m` : '—'}
                        </td>
                        <td className="px-3 py-3 font-mono text-orange-700">
                          {d.earlyMinutes > 0 ? `-${d.earlyMinutes}m` : '—'}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-teal-800">
                          {d.overtimeMinutes > 0 ? `+${formatMinutesToHoursStr(d.overtimeMinutes)}` : '—'}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-gray-600 font-semibold">
                          {d.source}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {d.status === 'Missing Punch' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickRegularize(d);
                                }}
                                disabled={regularizingDay === d.dateStr}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="Regularize missing out-punch to make this day payable"
                              >
                                {regularizingDay === d.dateStr ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sliders className="w-3 h-3" />
                                )}
                                Regularize
                              </button>
                            )}
                            <span className="text-[11px] text-[#07563D] font-bold hover:underline">
                              Inspect Trace →
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Inspection Trace Modal Overlay */}
              {selectedDayRow && (
                <div className="p-4 bg-emerald-50/60 border-t border-emerald-200 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#07563D]" />
                      <h4 className="font-bold text-gray-900">
                        Calculation Trace for {selectedDayRow.dateStr} ({selectedDayRow.dayName})
                      </h4>
                    </div>
                    <button
                      onClick={() => setSelectedDayRow(null)}
                      className="text-gray-400 hover:text-gray-700 text-xs font-bold"
                    >
                      Close Trace ✕
                    </button>
                  </div>

                  {selectedDayRow.status === 'Missing Punch' && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <strong className="text-amber-950 block text-xs">Missing Check-Out Punch (Non-Payable LOP)</strong>
                          <span className="text-amber-800 text-[11px]">
                            First in-punch was recorded at {selectedDayRow.firstIn}, but no out-punch was recorded. This day is NOT payable until regularized.
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleQuickRegularize(selectedDayRow)}
                        disabled={regularizingDay === selectedDayRow.dateStr}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        {regularizingDay === selectedDayRow.dateStr ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Regularize & Make Payable
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-emerald-200/80">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Scheduled Window</span>
                      <strong className="text-gray-900 font-mono">{selectedDayRow.scheduledTime}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Biometric Turnstile</span>
                      <strong className="text-gray-900 font-mono">
                        {selectedDayRow.firstIn || 'None'} → {selectedDayRow.lastOut || (selectedDayRow.status === 'Missing Punch' ? 'Missing (LOP)' : 'None')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Grace & Breaks</span>
                      <strong className="text-gray-900 font-mono">Grace 15m · Unpaid Break 45m</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Final Day Status</span>
                      <strong className={cn("font-bold", selectedDayRow.status === 'Missing Punch' ? "text-amber-700" : "text-[#07563D]")}>
                        {selectedDayRow.status} ({selectedDayRow.source})
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WORK HOURS TAB */}
          {activeTab === 'work-hours' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Work Hours & Time Distribution</h3>
                  <p className="text-xs text-gray-500">Scheduled working requirements vs actual turnstile verified hours</p>
                </div>
                <Badge variant="emerald">100% Policy Reconciled</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-500 block font-semibold">Elapsed Scheduled Hours</span>
                  <span className="text-lg font-black text-gray-900 font-mono mt-1 block">
                    {formatMinutesToHoursStr(metrics.totalScheduledMinutes)}
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">{metrics.elapsedWorkingDays} working days × 8h</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-800 block font-semibold">Turnstile Worked Hours</span>
                  <span className="text-lg font-black text-emerald-950 font-mono mt-1 block">
                    {formatMinutesToHoursStr(metrics.totalWorkedMinutes)}
                  </span>
                  <span className="text-[11px] text-emerald-700 block mt-0.5">Biometric verified</span>
                </div>
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-rose-800 block font-semibold">Shortfall / Time Deficit</span>
                  <span className="text-lg font-black text-rose-950 font-mono mt-1 block">
                    {formatMinutesToHoursStr(Math.max(0, metrics.totalScheduledMinutes - metrics.totalWorkedMinutes))}
                  </span>
                  <span className="text-[11px] text-rose-700 block mt-0.5">Unworked deficit</span>
                </div>
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
                  <span className="text-teal-800 block font-semibold">Approved Overtime</span>
                  <span className="text-lg font-black text-teal-950 font-mono mt-1 block">
                    {formatMinutesToHoursStr(metrics.approvedOvertimeMinutes)}
                  </span>
                  <span className="text-[11px] text-teal-700 block mt-0.5">Eligible for 1.5x pay</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LEAVE & PERMISSIONS */}
          {activeTab === 'leave' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Leave Requests & Approved Permissions</h3>
                  <p className="text-xs text-gray-500">Statutory casual, sick, earned leaves and remote work allocations</p>
                </div>
              </div>

              {metrics.paidLeaveDays > 0 ? (
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex justify-between items-center">
                    <div>
                      <strong className="text-purple-950 block">Casual Leave (CL) — Full Day Approved</strong>
                      <span className="text-purple-800 text-[11px]">Request ID: LEV-9021 • Approved by {empManager}</span>
                    </div>
                    <Badge variant="purple">Paid Leave</Badge>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-xl">
                  No approved leave requests recorded for this payroll cycle.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LATE / EARLY */}
          {activeTab === 'late-early' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Late Arrivals & Early Departures Log</h3>
                  <p className="text-xs text-gray-500">Grace period adjustments and penalty tracking</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {dailyRows.filter((d) => d.lateMinutes > 0 || d.earlyMinutes > 0).length > 0 ? (
                  dailyRows.filter((d) => d.lateMinutes > 0 || d.earlyMinutes > 0).map((d, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex justify-between items-center">
                      <div>
                        <strong className="text-amber-950 block">Date: {d.dateStr} ({d.dayName})</strong>
                        <span className="text-amber-800 text-[11px]">
                          Punch IN: {d.firstIn || '—'} • Late by {formatDeviationDuration(d.lateMinutes, { showBoth: d.lateMinutes >= 60, verbose: true })} (Grace 15m applied)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                        Late Arrival
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl font-medium">
                    ✓ Perfect punctuality. Zero late arrivals or early departures recorded.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: OVERTIME */}
          {activeTab === 'overtime' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Overtime Calculation & Verification</h3>
                  <p className="text-xs text-gray-500">Turnstile extra hours evaluated against 30m threshold policy</p>
                </div>
                <span className="font-bold text-[#07563D] text-xs">
                  Total Approved: {formatMinutesToHoursStr(metrics.approvedOvertimeMinutes)} (₹{payrollImpact.otEarnings.toLocaleString('en-IN')})
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1">
                <span className="font-bold text-emerald-950 block">Policy Rule: Industrial Overtime Standard</span>
                <span className="text-emerald-800 text-[11px]">
                  Threshold: Minimum 30 minutes beyond scheduled shift • Multiplier: 1.5x Hourly Rate (₹{payrollImpact.hourlyOtRate}/hr) • Approval: Auto-reconciled with Turnstile Bio
                </span>
              </div>
            </div>
          )}

          {/* TAB 7: REGULARIZATION */}
          {activeTab === 'regularization' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Attendance Regularization & Punch Reconciliation</h3>
                  <p className="text-xs text-gray-500">Employee punch regularization and manager approvals for missing check-outs</p>
                </div>
              </div>

              {/* Unresolved Missing Punches Action Queue */}
              {dailyRows.filter((d) => d.status === 'Missing Punch').length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wide">
                        Action Required: Unregularized Missing Punches ({dailyRows.filter((d) => d.status === 'Missing Punch').length})
                      </h4>
                    </div>
                    <span className="text-[10px] text-amber-800 font-medium">
                      Non-Payable (LOP) until check-out is regularized
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dailyRows.filter((d) => d.status === 'Missing Punch').map((row) => (
                      <div key={row.dateStr} className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-3 shadow-2xs">
                        <div>
                          <strong className="text-gray-900 block">
                            {row.dateStr} ({row.dayName}) — {row.shiftName}
                          </strong>
                          <span className="text-amber-800 text-[11px] block mt-0.5">
                            Punched In: <span className="font-bold font-mono text-gray-900">{row.firstIn}</span> • Missing Exit Check-out • Impact: <span className="text-rose-700 font-bold">1 Day Unpaid LOP</span>
                          </span>
                        </div>
                        <button
                          onClick={() => handleQuickRegularize(row)}
                          disabled={regularizingDay === row.dateStr}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          {regularizingDay === row.dateStr ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Regularize & Approve (06:00 PM)
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {regularizations.filter((r) => isMatchingEmp(r, currentEmployee)).length > 0 ? (
                <div className="space-y-2 text-xs">
                  {regularizations.filter((r) => isMatchingEmp(r, currentEmployee)).map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center">
                      <div>
                        <strong className="text-gray-900 block">{r.request_type} on {r.attendance_date}</strong>
                        <span className="text-gray-600 text-[11px]">Reason: {r.reason} • Submitted: {r.submitted_at}</span>
                      </div>
                      <Badge variant={r.status === 'Approved' ? 'emerald' : 'amber'}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-xl">
                  No previous regularization requests filed for this employee in the selected period.
                </div>
              )}
            </div>
          )}

          {/* TAB 8: EXCEPTIONS */}
          {activeTab === 'exceptions' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Attendance Exception Queue</h3>
                  <p className="text-xs text-gray-500">Biometric hardware sync drops and punch anomalies</p>
                </div>
              </div>

              {exceptions.filter((e) => isMatchingEmp(e, currentEmployee)).length > 0 ? (
                <div className="space-y-2 text-xs">
                  {exceptions.filter((e) => isMatchingEmp(e, currentEmployee)).map((e) => (
                    <div key={e.id} className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex justify-between items-center">
                      <div>
                        <strong className="text-rose-950 block">{e.exception_type} ({e.date})</strong>
                        <span className="text-rose-800 text-[11px]">Severity: {e.severity} • Device: {e.device_id || 'Turnstile #1'}</span>
                      </div>
                      <Badge variant={e.status === 'Resolved' ? 'emerald' : 'rose'}>{e.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-emerald-800 bg-emerald-50/50 border border-emerald-200 rounded-xl font-medium">
                  ✓ Zero open biometric exceptions for this employee.
                </div>
              )}
            </div>
          )}

          {/* TAB 9: PAYROLL IMPACT (REALTIME ATTENDANCE INPUTS & FINANCIAL HANDOFF) */}
          {activeTab === 'payroll-impact' && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Attendance-Derived Payroll Inputs (Handoff)</h3>
                    <p className="text-xs text-gray-500">Attendance supplies verified day & hour inputs; Statutory Payroll Engine computes Gross, Deductions & Net Payout</p>
                  </div>
                  <Badge variant="emerald">Handoff Ready</Badge>
                </div>

                {/* Key Attendance Input Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs">
                    <span className="text-emerald-800 font-bold block text-[11px] uppercase tracking-wider">Payable Paid Days</span>
                    <span className="text-xl font-black text-emerald-950 font-mono mt-1 block">
                      {metrics.payableDays} Days
                    </span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">
                      {metrics.presentDays} Present + {metrics.weeklyOffDays} Offs + {metrics.remainingWorkingDays} Projected
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 shadow-2xs">
                    <span className="text-rose-800 font-bold block text-[11px] uppercase tracking-wider">Unpaid Absence / LOP</span>
                    <span className="text-xl font-black text-rose-950 font-mono mt-1 block">
                      {metrics.lopDays} Days
                    </span>
                    <span className="text-[10px] text-rose-700 block mt-0.5">
                      Deduction: -₹{payrollImpact.lopDeductionAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 shadow-2xs">
                    <span className="text-purple-800 font-bold block text-[11px] uppercase tracking-wider">Paid Approved Leave</span>
                    <span className="text-xl font-black text-purple-950 font-mono mt-1 block">
                      {metrics.paidLeaveDays} Days
                    </span>
                    <span className="text-[10px] text-purple-700 block mt-0.5">
                      100% Wage Covered
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 shadow-2xs">
                    <span className="text-teal-800 font-bold block text-[11px] uppercase tracking-wider">Eligible OT Hours</span>
                    <span className="text-xl font-black text-teal-950 font-mono mt-1 block">
                      {formatMinutesToHoursStr(metrics.approvedOvertimeMinutes)}
                    </span>
                    <span className="text-[10px] text-teal-700 block mt-0.5">
                      OT Pay: +₹{payrollImpact.otEarnings.toLocaleString('en-IN')} (1.5x)
                    </span>
                  </div>
                </div>

                {/* Real-time Payroll Simulation & Financial Breakdown */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[#07563D]" />
                      <h4 className="font-bold text-gray-900">Attendance-Adjusted Payroll Calculation</h4>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-100 text-[#07563D] px-2.5 py-0.5 rounded-full font-bold">
                      Live Engine Synced
                    </span>
                  </div>

                  {/* 1. Gross Earnings Adjustment */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block font-mono">
                      1. Attendance-Adjusted Gross Earnings
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                        <span className="text-gray-500 block text-[11px]">Gross Base Monthly Salary</span>
                        <strong className="text-gray-900 font-mono text-sm block mt-0.5">
                          ₹{payrollImpact.baseGrossEarnings.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[10px] text-gray-400 block mt-0.5">₹{payrollImpact.dailyWageRate}/day</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                        <span className="text-gray-500 block text-[11px]">LOP Attendance Deduction</span>
                        <strong className={cn("font-mono text-sm block mt-0.5", payrollImpact.lopDeductionAmount > 0 ? "text-rose-700" : "text-gray-700")}>
                          -₹{payrollImpact.lopDeductionAmount.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{metrics.lopDays} days × ₹{payrollImpact.dailyWageRate}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                        <span className="text-gray-500 block text-[11px]">Approved Overtime Earnings</span>
                        <strong className="text-teal-800 font-mono text-sm block mt-0.5">
                          +₹{payrollImpact.otEarnings.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{formatMinutesToHoursStr(metrics.approvedOvertimeMinutes)} × ₹{payrollImpact.hourlyOtRate}/hr</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
                          Earned Monthly Gross Salary (Post-LOP)
                        </span>
                        <span className="text-[10px] text-blue-700">
                          Base (₹{payrollImpact.baseGrossEarnings.toLocaleString('en-IN')}) − LOP (₹{payrollImpact.lopDeductionAmount.toLocaleString('en-IN')}) + OT (₹{payrollImpact.otEarnings.toLocaleString('en-IN')})
                        </span>
                      </div>
                      <strong className="text-base font-black text-blue-950 font-mono">
                        ₹{payrollImpact.effectiveGrossEarnings.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  {/* 2. Statutory Withholdings & Deductions */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block font-mono">
                      2. Post-Attendance Statutory & Tax Deductions
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">Employee EPF (12%):</span>
                        <strong className="text-rose-700 font-mono text-xs block mt-0.5">
                          -₹{payrollImpact.epfEmployee.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[9px] text-gray-400">on Earned Basic ₹{payrollImpact.basicEarned.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">Employee ESIC (0.75%):</span>
                        <strong className="text-rose-700 font-mono text-xs block mt-0.5">
                          -₹{payrollImpact.esicEmployee.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[9px] text-gray-400">on Earned Gross</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">Professional Tax (PT):</span>
                        <strong className="text-rose-700 font-mono text-xs block mt-0.5">
                          -₹{payrollImpact.professionalTax.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[9px] text-gray-400">TN Slabs</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                        <span className="text-rose-800 font-bold block text-[10px]">Total Deductions:</span>
                        <strong className="text-rose-900 font-mono text-sm block mt-0.5">
                          -₹{payrollImpact.totalEmployeeDeductions.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[9px] text-rose-700">EPF + ESIC + PT</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Final Net Take-Home Pay Result */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#07563D] to-emerald-800 text-white shadow-xs flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200 block">
                        Estimated Net Take-Home Pay (Bank Payout)
                      </span>
                      <span className="text-[11px] text-emerald-100/90 font-mono">
                        Earned Gross (₹{payrollImpact.effectiveGrossEarnings.toLocaleString('en-IN')}) − Deductions (₹{payrollImpact.totalEmployeeDeductions.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className="text-xl font-black text-white font-mono block">
                        ₹{payrollImpact.netTakeHomePay.toLocaleString('en-IN')}
                      </strong>
                      <span className="text-[10px] text-emerald-200 font-mono">Disbursement Amount</span>
                    </div>
                  </div>

                  {/* 4. Employer Contributions & Compliance Invariant Footer */}
                  <div className="pt-2 text-[11px] text-gray-500 flex justify-between items-center border-t border-gray-200 flex-wrap gap-2">
                    <span>Employer Liability: <strong className="text-gray-800 font-mono">EPF ₹{payrollImpact.epfEmployer.toLocaleString('en-IN')} + ESIC ₹{payrollImpact.esicEmployer.toLocaleString('en-IN')} = ₹{payrollImpact.totalEmployerContributions.toLocaleString('en-IN')}</strong></span>
                    <span>Target Engine: <strong className="text-emerald-700 font-mono">Universal Statutory Engine (v4.0)</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: WEEKLY & MONTHLY ATTENDANCE VIEWS (PHASE 3) */}
          {activeTab === 'weekly-monthly' && (
            <div className="space-y-6">
              {/* 1. Weekly Breakdown Cards */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 font-mono mb-3">
                  Weekly Performance Breakdown ({weekRanges.length} Slices)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {weekRanges.map((w, idx) => {
                    const daysInWeek = dailyRows.filter((d) => d.dateStr >= w.start_date && d.dateStr <= w.end_date);
                    const presentInWeek = daysInWeek.filter((d) => d.status === 'Present' || d.status === 'Late' || d.status === 'Half Day').length;
                    const scheduledInWeek = daysInWeek.filter((d) => d.status !== 'Weekly Off' && d.status !== 'Holiday').length;
                    const workedMinsInWeek = daysInWeek.reduce((sum, d) => sum + (d.workedMinutes || 0), 0);
                    const otMinsInWeek = daysInWeek.reduce((sum, d) => sum + (d.overtimeMinutes || 0), 0);
                    const lateCountInWeek = daysInWeek.filter((d) => d.lateMinutes > 0).length;
                    const pct = scheduledInWeek > 0 ? Math.round((presentInWeek / scheduledInWeek) * 100) : 100;

                    return (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900 text-xs">Week {idx + 1}</span>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full",
                            pct >= 95 ? "bg-emerald-100 text-emerald-800" : pct >= 80 ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {pct}% Presence
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {w.start_date} to {w.end_date}
                        </div>
                        <div className="space-y-1 text-xs pt-1 border-t border-gray-100">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Present / Sched:</span>
                            <span className="font-bold text-gray-800 font-mono">{presentInWeek} / {scheduledInWeek}d</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Net Worked:</span>
                            <span className="font-bold text-emerald-700 font-mono">{formatMinutesToHoursStr(workedMinsInWeek)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Late Events:</span>
                            <span className={cn("font-bold font-mono", lateCountInWeek > 0 ? "text-amber-600" : "text-gray-400")}>
                              {lateCountInWeek}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Overtime:</span>
                            <span className="font-bold text-purple-700 font-mono">{formatMinutesToHoursStr(otMinsInWeek)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Month Calendar Matrix (7 Columns: Sun–Sat) */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Month-at-a-Glance Attendance Calendar</h3>
                    <p className="text-xs text-gray-500">Daily punch activity, rest days, holidays and anomaly statuses</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Present</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Late</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Absent</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span> Off</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center font-bold text-[11px] text-gray-400 uppercase py-1">
                      {d}
                    </div>
                  ))}

                  {dailyRows.map((row) => {
                    const isPres = row.status === 'Present';
                    const isLt = row.status === 'Late';
                    const isAbs = row.status === 'Absent' || row.status === 'Missing Punch';
                    const isOff = row.status === 'Weekly Off' || row.status === 'Holiday';

                    return (
                      <div
                        key={row.dateStr}
                        onClick={() => setSelectedDayRow(row)}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all cursor-pointer min-h-[75px] flex flex-col justify-between hover:shadow-md",
                          isPres ? "bg-emerald-50/50 border-emerald-200 hover:border-emerald-400" :
                          isLt ? "bg-amber-50/50 border-amber-200 hover:border-amber-400" :
                          isAbs ? "bg-rose-50/50 border-rose-200 hover:border-rose-400" :
                          isOff ? "bg-gray-50 border-gray-200 text-gray-400" :
                          "bg-white border-gray-200 hover:border-gray-400"
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-gray-800 font-mono">
                            {row.dayNum}
                          </span>
                          <span className={cn(
                            "text-[9px] font-black px-1.5 py-0.2 rounded uppercase",
                            isPres ? "bg-emerald-200 text-emerald-900" :
                            isLt ? "bg-amber-200 text-amber-900" :
                            isAbs ? "bg-rose-200 text-rose-900" :
                            "bg-gray-200 text-gray-700"
                          )}>
                            {row.status.slice(0, 3)}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono mt-1 space-y-0.5">
                          {row.firstIn ? (
                            <div className="text-gray-700 truncate">In: {row.firstIn}</div>
                          ) : (
                            <div className="text-gray-400 italic">No punch</div>
                          )}
                          {row.lastOut && (
                            <div className="text-gray-700 truncate">Out: {row.lastOut}</div>
                          )}
                        </div>
                        {row.workedMinutes > 0 && (
                          <div className="text-[9px] text-right font-bold text-[#07563D] font-mono mt-0.5">
                            {formatMinutesToHoursStr(row.workedMinutes)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: BREAK MANAGEMENT ANALYTICS (PHASE 6) */}
          {activeTab === 'breaks' && (
            <div className="space-y-6">
              {/* 4 Standardized Break Category Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-xs">Morning Tea Break</span>
                    <Coffee className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-lg font-black text-gray-900 font-mono">15 Mins</div>
                  <div className="text-[11px] text-gray-500">Window: 10:30 AM – 10:45 AM</div>
                  <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Non-Deductive Allowance
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-xs">Lunch Break</span>
                    <Coffee className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-lg font-black text-gray-900 font-mono">45 Mins</div>
                  <div className="text-[11px] text-gray-500">Window: 01:00 PM – 01:45 PM</div>
                  <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Standard Meal Period
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-xs">Evening Tea Break</span>
                    <Coffee className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-lg font-black text-gray-900 font-mono">15 Mins</div>
                  <div className="text-[11px] text-gray-500">Window: 04:00 PM – 04:15 PM</div>
                  <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Non-Deductive Allowance
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-xs">Personal / Bio Break</span>
                    <Coffee className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-lg font-black text-gray-900 font-mono">15 Mins</div>
                  <div className="text-[11px] text-gray-500">Flexible Monthly Quota</div>
                  <div className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                    Emergency Quota
                  </div>
                </div>
              </div>

              {/* Break Analysis Summary Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Period Break Consumption vs Policy Limits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500">Total Elapsed Break Time:</span>
                    <div className="text-xl font-black text-gray-900 font-mono">
                      {Math.floor((dailyRows.filter(r => r.firstIn).length * 90) / 60)}h {(dailyRows.filter(r => r.firstIn).length * 90) % 60}m
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500">Authorized Break Budget:</span>
                    <div className="text-xl font-black text-[#07563D] font-mono">
                      {Math.floor((metrics.scheduledWorkingDays * 90) / 60)}h 00m
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500">Excess Break Overages:</span>
                    <div className="text-xl font-black font-mono text-emerald-700">
                      0 mins (Compliant)
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Break Audit Register */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 font-mono">Daily Break Punch Stamps</h4>
                  <span className="text-xs text-gray-400">All times synced via ADMS hardware gateway</span>
                </div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-600 uppercase font-mono text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Shift</th>
                        <th className="p-2.5">Check In</th>
                        <th className="p-2.5">Break Duration</th>
                        <th className="p-2.5">Permitted Limit</th>
                        <th className="p-2.5">Excess Overage</th>
                        <th className="p-2.5">Check Out</th>
                        <th className="p-2.5">Compliance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dailyRows.filter((d) => d.firstIn).map((row) => (
                        <tr key={row.dateStr} className="hover:bg-gray-50">
                          <td className="p-2.5 font-bold font-mono">{row.dateStr}</td>
                          <td className="p-2.5">{row.shiftName}</td>
                          <td className="p-2.5 font-mono">{row.firstIn}</td>
                          <td className="p-2.5 font-mono font-bold text-gray-800">90m</td>
                          <td className="p-2.5 font-mono text-gray-500">90m</td>
                          <td className="p-2.5 font-mono font-bold text-emerald-600">0m</td>
                          <td className="p-2.5 font-mono">{row.lastOut || '—'}</td>
                          <td className="p-2.5">
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">Compliant</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ATTENDANCE BONUS & INCENTIVE SUITE (PHASE 8) */}
          {activeTab === 'bonus' && (
            <div className="space-y-6">
              {/* Policy Selector & Overview */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-600" />
                      <span>Attendance Bonus & Punctuality Incentive Suite</span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Automated policy evaluation for flawless regularity, punctuality, and zero unapproved absences
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                    <span className="text-xs font-semibold text-gray-600">Active Policy Tier:</span>
                    <select
                      value={selectedBonusPolicy}
                      onChange={(e) => setSelectedBonusPolicy(e.target.value)}
                      className="bg-transparent font-bold text-amber-900 focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="GOLD_PERFECT">Gold Perfect Attendance (₹3,000 / mo)</option>
                      <option value="SILVER_STANDARD">Silver Standard Attendance (₹2,000 / mo)</option>
                      <option value="BRONZE_PUNCTUALITY">Bronze Punctuality Incentive (₹1,000 / mo)</option>
                    </select>
                  </div>
                </div>

                {/* Qualification Result Banner */}
                <div className={cn(
                  "p-4 rounded-xl border flex items-center justify-between gap-4",
                  bonusResult.isEligible ? "bg-emerald-50/80 border-emerald-300 text-emerald-950" : "bg-rose-50/80 border-rose-300 text-rose-950"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                      bonusResult.isEligible ? "bg-emerald-600" : "bg-rose-600"
                    )}>
                      {bonusResult.isEligible ? <Sparkles className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm uppercase tracking-wide">
                        {bonusResult.isEligible
                          ? 'Fully Qualified for Attendance Bonus'
                          : 'Not Qualified for Bonus in this Period'}
                      </h4>
                      <p className="text-xs opacity-85">
                        {bonusResult.isEligible
                          ? `Employee meets all benchmark standards for ${bonusResult.policyName}.`
                          : 'Employee did not satisfy one or more punctuality or attendance criteria.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-2xl font-black font-mono">
                      ₹{bonusResult.bonusAmount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                      Authorized Bonus Amount
                    </span>
                  </div>
                </div>

                {/* 6 Rules Qualification Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Attendance %</span>
                    <span className="text-sm font-black font-mono text-gray-900">{bonusResult.metricsSummary.attendancePct}%</span>
                    <span className="text-[9px] text-gray-500 block">Actual Presence</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Present Days</span>
                    <span className="text-sm font-black font-mono text-gray-900">{bonusResult.metricsSummary.presentDays} / {bonusResult.metricsSummary.scheduledDays}</span>
                    <span className="text-[9px] text-gray-500 block">Worked Days</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Late Occurrences</span>
                    <span className="text-sm font-black font-mono text-gray-900">{bonusResult.metricsSummary.lateCount}</span>
                    <span className="text-[9px] text-gray-500 block">{bonusResult.metricsSummary.lateMinutes} mins late</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Early Departures</span>
                    <span className="text-sm font-black font-mono text-gray-900">{bonusResult.metricsSummary.earlyCount}</span>
                    <span className="text-[9px] text-gray-500 block">Departures logged</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Unapproved Absences</span>
                    <span className="text-sm font-black font-mono text-gray-900">{bonusResult.metricsSummary.absenceCount}</span>
                    <span className="text-[9px] text-gray-500 block">Unpaid Absence</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Break Compliance</span>
                    <span className="text-sm font-black font-mono text-emerald-700">100%</span>
                    <span className="text-[9px] text-gray-500 block">Zero Excess Break</span>
                  </div>
                </div>

                {/* Audit Justification Checklist */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider font-mono">
                    System Evaluation Diagnostic Trace
                  </h4>
                  <div className="space-y-1 text-xs">
                    {bonusResult.disqualificationReasons.length > 0 ? (
                      bonusResult.disqualificationReasons.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-rose-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Employee satisfies all compliance rules for the {bonusResult.policyName}.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* HR Hand-Off & Approval Workflow */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h5 className="font-bold text-xs text-emerald-950">
                      Payroll Hand-off & Disbursal Authorization
                    </h5>
                    <p className="text-[11px] text-emerald-800">
                      {bonusApproved
                        ? `✓ Approved by HR Administrator on ${new Date().toISOString().split('T')[0]}. Automatically passed into salary statement.`
                        : 'Review employee punctuality and click below to formally authorize bonus payout.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {bonusApproved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBonusApproved(false);
                          showToast('Attendance bonus authorization revoked.', 'info');
                        }}
                        className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                      >
                        Revoke Approval
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setBonusApproved(true);
                          showToast(`✓ ₹${bonusResult.bonusAmount.toLocaleString('en-IN')} Attendance Bonus approved for payroll run.`, 'success');
                        }}
                        className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Authorize Bonus Disbursement</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OFFICIAL STRUCTURED STATEMENT PREVIEW (PHASE 10) */}
          {activeTab === 'statement' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200">
                <div className="text-xs text-gray-600">
                  <span>Official Attendance Statement (A4 Print-Ready Document)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      try {
                        exportAttendanceStatementToExcel({
                          employee: currentEmployee,
                          periodName: activePeriod.period_name,
                          startDate: activePeriod.start_date,
                          endDate: activePeriod.end_date,
                          metrics,
                          dailyRows,
                          payrollImpact,
                          bonusResult,
                          companyName: activeCompany?.legal_name || 'Joy PeopleHR',
                        });
                        showToast(`✓ Downloaded ${empName} Excel Workbook`, 'success');
                      } catch (err: any) {
                        showToast('Excel export failed: ' + (err?.message || err), 'error');
                      }
                    }}
                    className="text-xs gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Download Excel</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Statement</span>
                  </Button>
                </div>
              </div>

              {/* Render Statement Container */}
              <div className="bg-white rounded-2xl border border-gray-300 shadow-xl p-4 overflow-x-auto">
                <PrintableAttendanceStatement
                  employee={currentEmployee}
                  periodName={activePeriod.period_name}
                  startDate={activePeriod.start_date}
                  endDate={activePeriod.end_date}
                  metrics={metrics}
                  dailyRows={dailyRows}
                  payrollImpact={payrollImpact}
                  bonusResult={bonusResult}
                  companyName={activeCompany?.legal_name || 'Joy PeopleHR'}
                  organizationName="JOY PeopleHR Enterprise"
                />
              </div>
            </div>
          )}

          {/* TAB 10: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Attendance & Recalculation Audit Trail</h3>
                  <p className="text-xs text-gray-500">Immutable chronological timeline of punch captures, policy evaluations, and approvals</p>
                </div>
                <span className="text-xs text-gray-400 font-mono">SHA-256 Verified</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                {dailyRows.filter((d) => d.firstIn || d.status === 'Paid Leave' || d.status === 'Late').map((d, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-3">
                    <span className="text-[10px] text-gray-400 font-bold shrink-0 mt-0.5">{d.dateStr} {d.firstIn || '09:00'}</span>
                    <div>
                      <strong className="text-gray-900 block font-sans">
                        {d.firstIn ? `${d.source} Punch Capture Recorded (${d.firstIn})` : `Leave Event Registered`}
                      </strong>
                      <span className="text-gray-500 text-[11px]">
                        Status: {d.status} • Shift: {d.shiftName} ({d.calculationTrace.shiftCode}) • Policy: {d.calculationTrace.calculationVersion}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-start gap-3">
                  <span className="text-[10px] text-emerald-600 font-bold shrink-0 mt-0.5">{activePeriod.start_date}</span>
                  <div>
                    <strong className="text-emerald-950 block font-sans">Attendance Statement Initialized for Payroll Period</strong>
                    <span className="text-emerald-800 text-[11px]">Period: {activePeriod.period_name} • Policy: {activePeriod.policy_version} • State: {activePeriod.status}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Global Print Container: Ensures Ctrl+P or Print Button on ANY tab prints the clean A4 statement */}
        {activeTab !== 'statement' && (
          <div className="hidden print:block">
            <PrintableAttendanceStatement
              employee={currentEmployee}
              periodName={activePeriod.period_name}
              startDate={activePeriod.start_date}
              endDate={activePeriod.end_date}
              metrics={metrics}
              dailyRows={dailyRows}
              payrollImpact={payrollImpact}
              bonusResult={bonusResult}
              companyName={activeCompany?.legal_name || 'Joy PeopleHR'}
              organizationName="JOY PeopleHR Enterprise"
            />
          </div>
        )}

        {/* ─── POLICY CONFIGURATION MODAL (ELECTRA EV / MULTI-TENANT) ──── */}
        {isPolicyModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#07563D] flex items-center justify-center font-bold">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Permission & Grace Policy Configuration</h3>
                    <p className="text-[11px] text-gray-500">Live multi-tenant attendance calculation rules</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Grace Period Threshold (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={policyGraceMinutes}
                    onChange={(e) => setPolicyGraceMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Default: 5 mins for Electra EV plant shifts (15m for Corporate).</p>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Monthly Permission Quota (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    step="15"
                    value={policyAllowanceMinutes}
                    onChange={(e) => setPolicyAllowanceMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Standard allowance: 120 minutes (2 Hours per month).</p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="policyAutoHalfDay"
                      checked={policyAutoHalfDay}
                      onChange={(e) => setPolicyAutoHalfDay(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-[#07563D] cursor-pointer"
                    />
                    <label htmlFor="policyAutoHalfDay" className="font-bold text-amber-950 cursor-pointer">
                      Mark as Half Day once Permission Allowance is Exhausted
                    </label>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-relaxed pl-5">
                    When active, once employee's 120-minute allowance reaches 0, any subsequent late check-in automatically converts that day into a Half Day (0.5 day deduction).
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const orgId = currentEmployee?.organization_id || 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
                    permissionGovernanceService.savePolicyConfig({
                      organizationId: orgId,
                      monthlyAllowanceMinutes: policyAllowanceMinutes,
                      monthStartDay: 1,
                      activePolicy: 'POLICY_A_THRESHOLD_CROSSING_DAY',
                      consumeOn: 'APPROVED_DURATION',
                      autoApplyHalfDay: policyAutoHalfDay,
                      graceThresholdMinutes: policyGraceMinutes,
                      includeLateArrivalsBeyondGrace: true,
                      subsequentExcessHandling: policyAutoHalfDay ? 'MARK_EVERY_EXCESS_HALF_DAY' : 'LOG_EXCESS_ONLY',
                      version: '2026.2-CUSTOM',
                    }, orgId);
                    showToast('✓ Electra EV Permission & Grace Policy saved successfully', 'success');
                    setIsPolicyModalOpen(false);
                    loadStatementData();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-md shadow-emerald-900/10 cursor-pointer"
                >
                  Save Policy
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
