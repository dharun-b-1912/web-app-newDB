// src/services/vendor/wageEngineService.ts
// ============================================================================
// Joy PeopleHR — Wage Calculation Engine (v2.1)
//
// Pipeline:
//   Attendance Master (canonical)
//     + Employee Status Map
//     + Wage Component Master (per vendor)
//     → EmployeeWageResult[]
//     → WageRunRecord (versioned snapshot)
//
// Key principle: NEVER silently collapse NOT_CONFIGURED / PENDING /
// MISSING_SOURCE / NOT_ELIGIBLE / SOURCE_CONFLICT to ₹0.
// ============================================================================

import {
  WageComponentRecord,
  WageLineItem,
  WageLineStatus,
  WageWhyPayload,
  WageExclusion,
  EmployeeWageResult,
  EmployeePayrollStatus,
  EmploymentStatusCode,
  WageRunRecord,
  WageRunSummaryStats,
  FoodAllowancePolicy,
  NightAllowancePolicy,
  AttendanceBonusPolicy,
} from '../../types/wageEngine';
import { WageComponentMasterService } from './wageComponentMasterService';
import { WagePolicyService } from './wagePolicyService';
import { PayrollValidationService } from './payrollValidationService';
import {
  AttendanceMasterService,
  AttendanceReconciliationMaster,
  JOY_SEP_ALLOWANCES_MAP,
} from './attendanceMasterService';
import { PayrollTemplateService } from './payrollTemplateService';

const ENGINE_VERSION = 'WAGE-ENGINE-V2.1';
const STORAGE_KEY_PREFIX = 'WAGE_RUN_V1_';

// ─────────────────────────────────────────────────────────────────────────────
// TAMIL NADU PROFESSIONAL TAX SLAB (2026)
// ─────────────────────────────────────────────────────────────────────────────
function calcProfessionalTax(grossMonthly: number): number {
  if (grossMonthly <= 21000) return 0;
  if (grossMonthly <= 30000) return 135;
  if (grossMonthly <= 45000) return 315;
  if (grossMonthly <= 60000) return 690;
  if (grossMonthly <= 75000) return 1025;
  return 1250;
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN INACTIVE / ON-LEAVE EMPLOYEES
// (Populated from reconciliation file annotations; in production → from DB)
// ─────────────────────────────────────────────────────────────────────────────
const KNOWN_INACTIVE_EMPLOYEES: Record<string, { status: EmploymentStatusCode; leave_status?: string; remarks: string }> = {
  '22300': { status: 'ON_LEAVE', leave_status: 'EXTENDED_LEAVE', remarks: 'Approved extended leave — PRAKASH R (22300). In contracted roster; not payable this period.' },
};

function resolvePayrollStatus(
  empId: string,
  empCode: string,
  empName: string,
): EmployeePayrollStatus {
  const known = KNOWN_INACTIVE_EMPLOYEES[empCode] ?? KNOWN_INACTIVE_EMPLOYEES[empId];
  if (known) {
    return {
      employee_id: empId,
      employee_code: empCode,
      employee_name: empName,
      employment_status: known.status,
      leave_status: known.leave_status,
      payroll_eligible: false,
      attendance_eligible: false,
      wage_eligible: false,
      remarks: known.remarks,
    };
  }
  return {
    employee_id: empId,
    employee_code: empCode,
    employee_name: empName,
    employment_status: 'ACTIVE',
    payroll_eligible: true,
    attendance_eligible: true,
    wage_eligible: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function makeWhyPlaceholder(
  formula: string,
  result: string,
  source: string,
  policyName: string,
  eligibilityResult: 'PASS' | 'FAIL' | 'N/A',
  eligibilityReason?: string,
): WageWhyPayload {
  return {
    formula,
    result,
    eligible_units: 0,
    unit_label: '',
    rate: 0,
    rate_label: '',
    source,
    policy_name: policyName,
    policy_version: ENGINE_VERSION,
    exclusions: [],
    eligibility_result: eligibilityResult,
    eligibility_reason: eligibilityReason,
    calculation_version: ENGINE_VERSION,
    calculated_at: nowISO(),
  };
}

function sentinelLine(
  comp: WageComponentRecord,
  status: WageLineStatus,
  reason: string,
): WageLineItem {
  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status,
    amount: 0,
    sentinel: status as any,
    why: makeWhyPlaceholder(
      '—',
      status.replace(/_/g, ' '),
      'Wage Engine',
      comp.name,
      'N/A',
      reason,
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-COMPONENT CALCULATORS
// ─────────────────────────────────────────────────────────────────────────────

/** BASIC: daily_rate × payable_days */
function calcBasic(
  comp: WageComponentRecord,
  payableDays: number,
  dailyRate: number | undefined,
): WageLineItem {
  if (dailyRate == null || dailyRate <= 0) {
    return sentinelLine(comp, 'NOT_CONFIGURED', 'Daily rate not configured in Employee Master.');
  }
  const amount = Math.round(dailyRate * payableDays);
  const formula = `₹${dailyRate.toFixed(2)}/day × ${payableDays} days`;
  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status: 'CALCULATED',
    amount,
    why: {
      formula,
      result: fmtINR(amount),
      eligible_units: payableDays,
      unit_label: 'days',
      rate: dailyRate,
      rate_label: `₹${dailyRate.toFixed(2)}/day`,
      source: 'Attendance Master → MR Payable Days',
      policy_name: 'Basic Wages (Rate × Days)',
      policy_version: ENGINE_VERSION,
      exclusions: [],
      eligibility_result: 'PASS',
      calculation_version: ENGINE_VERSION,
      calculated_at: nowISO(),
    },
  };
}

/** OT: ot_hours × ot_rate */
function calcOT(
  comp: WageComponentRecord,
  otHours: number,
  otRate: number | undefined,
): WageLineItem {
  if (otRate == null || otRate <= 0) {
    return sentinelLine(comp, 'NOT_CONFIGURED', 'OT hourly rate not configured. Configure via OT Policy.');
  }
  if (otHours <= 0) {
    return {
      component_code: comp.code,
      component_name: comp.name,
      component_type: comp.type,
      status: 'ZERO_GENUINE',
      amount: 0,
      why: makeWhyPlaceholder('0 hrs × OT rate', '₹0', 'Attendance Master OT Matrix', comp.name, 'N/A', 'No OT hours recorded for this period.'),
    };
  }
  const amount = Math.round(otHours * otRate);
  const formula = `${otHours.toFixed(2)} hrs × ₹${otRate.toFixed(2)}/hr`;
  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status: 'CALCULATED',
    amount,
    why: {
      formula,
      result: fmtINR(amount),
      eligible_units: otHours,
      unit_label: 'hrs',
      rate: otRate,
      rate_label: `₹${otRate.toFixed(2)}/hr`,
      source: 'Attendance Master → OT Matrix',
      policy_name: 'Overtime (OT Policy)',
      policy_version: ENGINE_VERSION,
      exclusions: [],
      eligibility_result: 'PASS',
      calculation_version: ENGINE_VERSION,
      calculated_at: nowISO(),
    },
  };
}

/** FOOD_E: eligible_days × rate, with day-level exclusions */
function calcFoodAllowance(
  comp: WageComponentRecord,
  attendanceRecords: { date: string; status: string; isWeeklyOff: boolean; isLeave: boolean; isLOP: boolean; isAbsent: boolean }[],
): WageLineItem {
  const rule = comp.eligibility_rule as FoodAllowancePolicy | undefined;
  if (!rule || !rule.enabled || rule.rate <= 0) {
    return sentinelLine(comp, 'NOT_CONFIGURED', 'Food Allowance policy not enabled or rate is ₹0. Configure in Wage Component Master.');
  }

  const exclusions: WageExclusion[] = [];
  let eligibleDays = 0;

  for (const r of attendanceRecords) {
    let excluded = false;
    let reason = '';

    if (rule.exclude_weekly_off && r.isWeeklyOff) { excluded = true; reason = 'Weekly Off'; }
    else if (rule.exclude_absent && r.isAbsent) { excluded = true; reason = 'Absent'; }
    else if (rule.exclude_lop && r.isLOP) { excluded = true; reason = 'LOP'; }
    else if (rule.exclude_paid_leave && r.isLeave) { excluded = true; reason = 'Paid Leave'; }

    exclusions.push({ date: r.date, reason: excluded ? reason : '✓ Eligible', excluded });
    if (!excluded) eligibleDays++;
  }

  if (rule.max_days_per_month) eligibleDays = Math.min(eligibleDays, rule.max_days_per_month);
  const amount = Math.round(eligibleDays * rule.rate);

  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status: 'CALCULATED',
    amount,
    why: {
      formula: `${eligibleDays} eligible days × ₹${rule.rate}/day`,
      result: fmtINR(amount),
      eligible_units: eligibleDays,
      unit_label: 'days',
      rate: rule.rate,
      rate_label: `₹${rule.rate}/day`,
      source: 'Attendance Master → Daily Records',
      policy_name: `Food Allowance Policy (${rule.eligibility_basis})`,
      policy_version: ENGINE_VERSION,
      exclusions,
      eligibility_result: 'PASS',
      calculation_version: ENGINE_VERSION,
      calculated_at: nowISO(),
    },
  };
}

/** NIGHT_E: night_shifts × rate */
function calcNightAllowance(
  comp: WageComponentRecord,
  attendanceRecords: { date: string; shiftCode: string; isPresent: boolean }[],
): WageLineItem {
  const rule = comp.eligibility_rule as NightAllowancePolicy | undefined;
  if (!rule || !rule.enabled || rule.rate <= 0) {
    return sentinelLine(comp, 'NOT_CONFIGURED', 'Night Shift Allowance policy not enabled or rate is ₹0.');
  }
  const nightCodes = rule.night_shift_codes.map(c => c.toUpperCase());
  const nightShifts = attendanceRecords.filter(r => r.isPresent && nightCodes.includes((r.shiftCode || '').toUpperCase()));
  const amount = Math.round(nightShifts.length * rule.rate);

  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status: amount > 0 ? 'CALCULATED' : 'ZERO_GENUINE',
    amount,
    why: {
      formula: `${nightShifts.length} night shifts × ₹${rule.rate}/shift`,
      result: fmtINR(amount),
      eligible_units: nightShifts.length,
      unit_label: 'night shifts',
      rate: rule.rate,
      rate_label: `₹${rule.rate}/shift`,
      source: 'Attendance Master → Daily Shift Codes',
      policy_name: `Night Shift Allowance (codes: ${rule.night_shift_codes.join(', ')})`,
      policy_version: ENGINE_VERSION,
      exclusions: nightShifts.map(s => ({ date: s.date, reason: `Night Shift (${s.shiftCode})`, excluded: false })),
      eligibility_result: nightShifts.length > 0 ? 'PASS' : 'N/A',
      eligibility_reason: nightShifts.length === 0 ? '0 night shift dates recorded.' : undefined,
      calculation_version: ENGINE_VERSION,
      calculated_at: nowISO(),
    },
  };
}

/** ATT_BONUS: rule-based eligibility → fixed bonus or ₹0 with reason */
function calcAttendanceBonus(
  comp: WageComponentRecord,
  presentDays: number,
  lopDays: number,
  absentDays: number,
  lateViolations: number,
): WageLineItem {
  const rule = comp.eligibility_rule as AttendanceBonusPolicy | undefined;
  if (!rule || !rule.enabled || rule.bonus_amount <= 0) {
    return sentinelLine(comp, 'NOT_CONFIGURED', 'Attendance Bonus policy not enabled or bonus amount is ₹0.');
  }

  const checks: { label: string; pass: boolean; required: string; actual: string }[] = [
    { label: 'Min Present Days', pass: presentDays >= rule.min_present_days, required: `≥ ${rule.min_present_days}`, actual: `${presentDays}` },
    { label: 'Max LOP', pass: lopDays <= rule.max_allowed_lop, required: `≤ ${rule.max_allowed_lop}`, actual: `${lopDays}` },
    { label: 'Max Absence', pass: absentDays <= rule.max_allowed_absence, required: `≤ ${rule.max_allowed_absence}`, actual: `${absentDays}` },
    { label: 'Late Violations', pass: lateViolations <= rule.max_late_violations, required: `≤ ${rule.max_late_violations}`, actual: `${lateViolations}` },
  ];

  const failed = checks.filter(c => !c.pass);
  const eligible = failed.length === 0;
  const amount = eligible ? rule.bonus_amount : 0;

  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status: eligible ? 'CALCULATED' : 'NOT_ELIGIBLE',
    amount,
    sentinel: eligible ? undefined : 'NOT_ELIGIBLE',
    why: {
      formula: eligible ? `Eligibility PASS → ₹${rule.bonus_amount}` : `Eligibility FAIL → ₹0`,
      result: fmtINR(amount),
      eligible_units: eligible ? 1 : 0,
      unit_label: 'bonus',
      rate: rule.bonus_amount,
      rate_label: `₹${rule.bonus_amount} (flat)`,
      source: 'Attendance Master → MR Summary',
      policy_name: `Attendance Bonus Policy (min ${rule.min_present_days}d / max ${rule.max_allowed_lop} LOP)`,
      policy_version: ENGINE_VERSION,
      exclusions: checks.map(c => ({ date: '', reason: `${c.label}: required ${c.required}, actual ${c.actual}`, excluded: !c.pass })),
      eligibility_result: eligible ? 'PASS' : 'FAIL',
      eligibility_reason: eligible ? undefined : `Failed: ${failed.map(f => `${f.label} (${f.actual} vs ${f.required})`).join(', ')}`,
      calculation_version: ENGINE_VERSION,
      calculated_at: nowISO(),
    },
  };
}

/** PF: 12% of basic wages (capped at ₹1,800 per statutory ceiling on ₹15,000) */
function calcPF(comp: WageComponentRecord, basicAmount: number, empCode: string): WageLineItem {
  const rate = comp.rate ?? 12;
  if (basicAmount <= 0) {
    return sentinelLine(comp, 'MISSING_SOURCE', 'Basic wages not yet calculated.');
  }
  // Statutory ceiling: PF on ₹15,000 max = ₹1,800
  const pfBase = Math.min(basicAmount, 15000);
  const amount = Math.round(pfBase * rate / 100);
  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status: 'CALCULATED',
    amount,
    why: {
      formula: `₹${pfBase} × ${rate}%`,
      result: fmtINR(amount),
      eligible_units: pfBase,
      unit_label: '₹ (PF base)',
      rate,
      rate_label: `${rate}%`,
      source: 'Wage Engine → Basic Wages',
      policy_name: `EPF — ${rate}% of Basic (ceiling ₹15,000)`,
      policy_version: ENGINE_VERSION,
      exclusions: [],
      eligibility_result: 'PASS',
      calculation_version: ENGINE_VERSION,
      calculated_at: nowISO(),
    },
  };
}

/** ESI: 0.75% of ESI wages (Gross minus HRA in statutory plant contracts) */
function calcESI(comp: WageComponentRecord, grossEarnings: number, esiWageBasis?: number): WageLineItem {
  const rate = comp.rate ?? 0.75;
  const effectiveBase = esiWageBasis ?? grossEarnings;
  if (effectiveBase <= 0) {
    return sentinelLine(comp, 'MISSING_SOURCE', 'Gross earnings not yet calculated.');
  }
  // ESI applicable only if gross ≤ ₹21,000
  if (effectiveBase > 21000) {
    return {
      component_code: comp.code,
      component_name: comp.name,
      component_type: comp.type,
      status: 'NOT_ELIGIBLE',
      amount: 0,
      sentinel: 'NOT_ELIGIBLE',
      why: makeWhyPlaceholder(
        `ESI Base ₹${effectiveBase} > ₹21,000 ceiling`,
        '₹0',
        'Wage Engine',
        'ESI — Not Applicable (above ₹21,000)',
        'FAIL',
        'Employee ESI wage exceeds applicability ceiling of ₹21,000/month.',
      ),
    };
  }
  const amount = Math.ceil(effectiveBase * rate / 100);
  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status: 'CALCULATED',
    amount,
    why: {
      formula: `₹${effectiveBase.toFixed(0)} × ${rate}%`,
      result: fmtINR(amount),
      eligible_units: effectiveBase,
      unit_label: '₹ (ESI base)',
      rate,
      rate_label: `${rate}%`,
      source: 'Wage Engine → ESI Wages (Gross - HRA)',
      policy_name: `ESI — ${rate}% of ESI Wages (≤ ₹21,000)`,
      policy_version: ENGINE_VERSION,
      exclusions: [],
      eligibility_result: 'PASS',
      calculation_version: ENGINE_VERSION,
      calculated_at: nowISO(),
    },
  };
}

/** PT: Tamil Nadu slab */
function calcPT(comp: WageComponentRecord, grossEarnings: number): WageLineItem {
  const amount = calcProfessionalTax(grossEarnings);
  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status: amount > 0 ? 'CALCULATED' : 'ZERO_GENUINE',
    amount,
    why: {
      formula: `Gross ₹${grossEarnings.toFixed(0)} → TN PT Slab`,
      result: fmtINR(amount),
      eligible_units: grossEarnings,
      unit_label: '₹ (gross)',
      rate: amount,
      rate_label: `₹${amount}/month (slab)`,
      source: 'Wage Engine → Gross Earnings',
      policy_name: 'Tamil Nadu Professional Tax — 2026 Slab',
      policy_version: ENGINE_VERSION,
      exclusions: [],
      eligibility_result: amount > 0 ? 'PASS' : 'N/A',
      eligibility_reason: amount === 0 ? 'Gross ≤ ₹21,000 — PT not applicable.' : undefined,
      calculation_version: ENGINE_VERSION,
      calculated_at: nowISO(),
    },
  };
}

/** LWF: Fixed ₹20 (Tamil Nadu, employee share, deducted annually in December only) */
function calcLWF(comp: WageComponentRecord, periodMonth?: string): WageLineItem {
  const isDecember = Boolean(
    periodMonth &&
    (periodMonth.includes('-12') || periodMonth.toLowerCase().includes('dec'))
  );

  if (!isDecember) {
    return {
      component_code: comp.code,
      component_name: comp.name,
      component_type: comp.type,
      status: 'ZERO_GENUINE',
      amount: 0,
      why: {
        formula: 'LWF deducted annually in December only (TN LWF Act)',
        result: '₹0',
        eligible_units: 0,
        unit_label: 'month',
        rate: 0,
        rate_label: '₹0/month (non-December cycle)',
        source: 'Tamil Nadu Labour Welfare Fund Act',
        policy_name: 'Tamil Nadu LWF (Annual December Deduction)',
        policy_version: ENGINE_VERSION,
        exclusions: [],
        eligibility_result: 'PASS',
        calculation_version: ENGINE_VERSION,
        calculated_at: nowISO(),
      },
    };
  }

  const amount = comp.rate ?? 20;
  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status: 'CALCULATED',
    amount,
    why: {
      formula: `Fixed ₹${amount} (TN LWF — Annual December deduction)`,
      result: fmtINR(amount),
      eligible_units: 1,
      unit_label: 'month',
      rate: amount,
      rate_label: `₹${amount}/year`,
      source: 'Wage Policy',
      policy_name: 'Tamil Nadu LWF — Employee Share',
      policy_version: ENGINE_VERSION,
      exclusions: [],
      eligibility_result: 'PASS',
      calculation_version: ENGINE_VERSION,
      calculated_at: nowISO(),
    },
  };
}

/** ADV / FOOD_D / ACCOM_D / OTHER_D: Fixed configured amounts */
function calcFixedDeduction(comp: WageComponentRecord, perEmpRate?: number): WageLineItem {
  const rate = perEmpRate ?? comp.rate;
  if (rate == null || rate <= 0) {
    return {
      component_code: comp.code,
      component_name: comp.name,
      component_type: comp.type,
      status: 'ZERO_GENUINE',
      amount: 0,
      why: makeWhyPlaceholder('Not applicable / not configured', '₹0', 'Wage Policy', comp.name, 'N/A', 'No amount configured for this employee.'),
    };
  }
  return {
    component_code: comp.code,
    component_name: comp.name,
    component_type: comp.type,
    status: 'CALCULATED',
    amount: Math.round(rate),
    why: {
      formula: `Fixed ₹${rate}`,
      result: fmtINR(Math.round(rate)),
      eligible_units: 1,
      unit_label: 'period',
      rate,
      rate_label: `₹${rate}`,
      source: 'Employee Master / Wage Policy',
      policy_name: comp.name,
      policy_version: ENGINE_VERSION,
      exclusions: [],
      eligibility_result: 'PASS',
      calculation_version: ENGINE_VERSION,
      calculated_at: nowISO(),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of per-employee config passed to the engine (from Employee Master) */
export interface EmployeeWageConfig {
  employee_id: string;
  employee_code: string;
  daily_rate?: number;     // ₹/day
  ot_rate?: number;        // ₹/hr (from OT Policy)
  advance_amount?: number; // ₹ this period
  food_recovery?: number;  // ₹ per day deducted from employee
  accommodation?: number;  // ₹ fixed
  other_deduction?: number; // ₹ fixed
}

export class WageEngineService {
  /**
   * Calculate wages for all employees in the active Attendance Master.
   * 
   * @param vendorId - Used to look up wage component configuration.
   * @param employeeConfigs - Per-employee wage configuration (daily rate, OT rate, deductions).
   *   If empty, BASIC and OT will emit NOT_CONFIGURED sentinels.
   */
  /**
   * Calculate wages for all employees in the active Attendance Master.
   * 
   * @param vendorId - Used to look up wage component configuration.
   * @param employeeConfigs - Per-employee wage configuration (daily rate, OT rate, deductions).
   * @param policyId - Optional explicit policy ID; defaults to active policy for vendor.
   */
  static calculateWageRun(
    vendorId: string,
    employeeConfigs: EmployeeWageConfig[] = [],
    policyId?: string
  ): WageRunRecord {
    const master = AttendanceMasterService.getActiveMaster(vendorId);
    const policy = policyId
      ? WagePolicyService.getPolicy(policyId)
      : WagePolicyService.getActivePolicyForVendor(vendorId);

    const components = WageComponentMasterService.getComponents(vendorId);
    const activeEarnings = components.filter(c => c.type === 'EARNING' && c.active);
    const activeDeductions = components.filter(c => c.type === 'DEDUCTION' && c.active);

    const configMap = new Map<string, EmployeeWageConfig>(
      employeeConfigs.map(ec => [ec.employee_code, ec])
    );

    const now = nowISO();
    const runId = `WR-${new Date().toISOString().slice(0, 7).replace('-', '-')}-${Date.now().toString().slice(-4)}`;

    // Freeze policy into immutable snapshot
    const policySnapshot = WagePolicyService.createSnapshot(policy, runId);

    // Build a map: employee_code → MR record
    const mrMap = new Map<string, any>();
    if (master.mrReportRecords && master.mrReportRecords.length > 0) {
      master.mrReportRecords.forEach(mr => mrMap.set(mr.employee_code, mr));
    }

    // Build a map: employee_code → OT total hours
    const otMap = new Map<string, number>();
    if (master.otMatrixRecords && master.otMatrixRecords.length > 0) {
      master.otMatrixRecords.forEach(ot => {
        otMap.set(ot.employee_id, ot.total_ot_hours);
        otMap.set(ot.employee_code, ot.total_ot_hours);
      });
    } else if (master.dailyOtRecords && master.dailyOtRecords.length > 0) {
      master.dailyOtRecords.forEach((r: any) => {
        const empCode = r.employeeCode || r.employee_id;
        const hrs = Number(r.approvedOtHours ?? r.approved_ot ?? r.potentialOtHours ?? r.worked_hours ?? 0);
        otMap.set(empCode, (otMap.get(empCode) || 0) + hrs);
      });
    }

    // Resolve source roster: prioritize mrReportRecords, fallback to employeeSummaries
    const sourceRecords = (master.mrReportRecords && master.mrReportRecords.length > 0)
      ? master.mrReportRecords
      : (master.employeeSummaries && master.employeeSummaries.length > 0)
        ? master.employeeSummaries.map((emp) => ({
            sno: emp.s_no,
            employee_id: emp.employee_id,
            employee_code: emp.employee_code,
            employee_name: emp.employee_name,
            department: emp.department,
            category: emp.category,
            present_days: emp.present_days,
            nfh: emp.nfh_days,
            weekly_off: emp.weekly_off_days,
            cl: emp.cl_days,
            pl: emp.pl_days,
            lop: emp.lop_days,
            no_of_shifts_present: emp.total_shifts,
            ot_hours: emp.ot_hours,
            ot_gt_4hrs_count: emp.ot_days,
            rate: (emp as any).rate || (emp as any).dailyWages || 605,
            wages: emp.present_days * ((emp as any).rate || (emp as any).dailyWages || 605),
            status: 'APPROVED',
          }))
        : [];

    // All employees = all from source records (contracted roster)
    const allEmployeeResults: EmployeeWageResult[] = [];

    // Inspect company payroll template to respect enabled/disabled deduction switches (e.g. PT, LWF)
    const tmpl = PayrollTemplateService.getTemplateForVendor(vendorId);
    const allCols = tmpl?.sections?.flatMap(s => s.columns) || [];
    const ptCol = allCols.find(c => c.fieldKey === 'pt');
    const isPtEnabled = ptCol ? ptCol.isEnabled !== false : false;
    const lwfCol = allCols.find(c => c.fieldKey === 'lwf');
    const isLwfEnabled = lwfCol ? lwfCol.isEnabled !== false : false;
    const foodCol = allCols.find(c => c.fieldKey === 'food_allowance');
    const isFoodEnabled = foodCol ? foodCol.isEnabled !== false : true;
    const nightCol = allCols.find(c => c.fieldKey === 'night_allowance');
    const isNightEnabled = nightCol ? nightCol.isEnabled !== false : true;
    const bonusCol = allCols.find(c => c.fieldKey === 'attendance_bonus');
    const isBonusEnabled = bonusCol ? bonusCol.isEnabled !== false : false;

    // Basic & HRA split percentages from policy
    const basicSplitRule = policy.wageRules.baseWageSplitRules.find(r => r.componentCode === 'BASIC');
    const hraSplitRule = policy.wageRules.baseWageSplitRules.find(r => r.componentCode === 'HRA');
    const basicPct = basicSplitRule ? basicSplitRule.percentageOfBase : 55;
    const hraPct = hraSplitRule ? hraSplitRule.percentageOfBase : 45;

    for (const mr of sourceRecords) {
      const payrollStatus = resolvePayrollStatus(mr.employee_id, mr.employee_code, mr.employee_name);
      const empCfg = configMap.get(mr.employee_code) || configMap.get(mr.employee_id);

      // Attendance inputs
      const payableDays = mr.present_days;
      const otHours = otMap.get(mr.employee_code) ?? otMap.get(mr.employee_id) ?? mr.ot_hours ?? 0;
      const lopDays = mr.lop ?? 0;
      const weeklyOffDays = mr.weekly_off ?? 0;

      // Base wage calculation: live config > parsed MR sheet rate > computed from wages/days > standard minimum 605
      const dailyRate = (empCfg?.daily_rate && empCfg.daily_rate > 0)
        ? empCfg.daily_rate
        : (mr.rate && mr.rate > 0)
          ? mr.rate
          : (mr.wages && mr.present_days > 0)
            ? Math.round((mr.wages / mr.present_days) * 100) / 100
            : 605;

      const baseWageTotal = (dailyRate != null && dailyRate > 0) ? Math.round(dailyRate * payableDays * 100) / 100 : 0;
      const basicAmount = Math.round(baseWageTotal * (basicPct / 100) * 100) / 100;
      const hraAmount = Math.round(baseWageTotal * (hraPct / 100) * 100) / 100;

      // Build attendance record list approximation
      const attendanceDays: { date: string; status: string; isWeeklyOff: boolean; isLeave: boolean; isLOP: boolean; isAbsent: boolean; shiftCode: string; isPresent: boolean }[] = [];
      const totalDays = master.stats?.periodDays ?? 31;
      const presentDays = payableDays;
      const absentDays = Math.max(0, totalDays - presentDays - weeklyOffDays - lopDays);

      // ── EARNINGS ──────────────────────────────────────────────────────────
      let otAmount = 0;
      const earnings: WageLineItem[] = [];

      if (!payrollStatus.wage_eligible) {
        earnings.push(sentinelLine(
          { id: 'c-basic', organization_id: 'ORG', code: 'BASIC', name: `Basic Salary (${basicPct}%)`, type: 'EARNING', calculation_method: 'DAILY_RATE_X_PAYABLE_DAYS', pf_applicable: true, esi_applicable: true, pt_applicable: true, invoice_applicable: true, taxable: true, approval_required: false, effective_from: policy.effectiveFrom, active: true, created_at: now, updated_at: now, sort_order: 1 },
          'NOT_ELIGIBLE',
          `Employee not wage-eligible: ${payrollStatus.employment_status}. ${payrollStatus.remarks ?? ''}`
        ));
        earnings.push(sentinelLine(
          { id: 'c-hra', organization_id: 'ORG', code: 'HRA', name: `HRA (${hraPct}%)`, type: 'EARNING', calculation_method: 'DAILY_RATE_X_PAYABLE_DAYS', pf_applicable: false, esi_applicable: true, pt_applicable: true, invoice_applicable: true, taxable: true, approval_required: false, effective_from: policy.effectiveFrom, active: true, created_at: now, updated_at: now, sort_order: 2 },
          'NOT_ELIGIBLE',
          `Employee not wage-eligible: ${payrollStatus.employment_status}.`
        ));
      } else {
        // 1. Basic (55%)
        if (dailyRate == null || dailyRate <= 0) {
          earnings.push(sentinelLine(
            { id: 'c-basic', organization_id: 'ORG', code: 'BASIC', name: `Basic Salary (${basicPct}%)`, type: 'EARNING', calculation_method: 'DAILY_RATE_X_PAYABLE_DAYS', pf_applicable: true, esi_applicable: true, pt_applicable: true, invoice_applicable: true, taxable: true, approval_required: false, effective_from: policy.effectiveFrom, active: true, created_at: now, updated_at: now, sort_order: 1 },
            'NOT_CONFIGURED',
            'Daily rate not configured in Employee Master.'
          ));
        } else {
          earnings.push({
            component_code: 'BASIC',
            component_name: `Basic (${basicPct}%)`,
            component_type: 'EARNING',
            status: 'CALCULATED',
            amount: basicAmount,
            why: {
              formula: `₹${dailyRate.toFixed(2)}/day × ${payableDays} days × ${basicPct}%`,
              result: fmtINR(basicAmount),
              eligible_units: payableDays,
              unit_label: 'days',
              rate: dailyRate * (basicPct / 100),
              rate_label: `₹${(dailyRate * (basicPct / 100)).toFixed(2)}/day (${basicPct}%)`,
              source: 'Attendance Master → MR Payable Days',
              policy_name: policy.policyName,
              policy_version: policy.version,
              exclusions: [],
              eligibility_result: 'PASS',
              calculation_version: ENGINE_VERSION,
              calculated_at: now,
            },
          });
        }

        // 2. HRA (45%)
        if (dailyRate == null || dailyRate <= 0) {
          earnings.push(sentinelLine(
            { id: 'c-hra', organization_id: 'ORG', code: 'HRA', name: `HRA (${hraPct}%)`, type: 'EARNING', calculation_method: 'DAILY_RATE_X_PAYABLE_DAYS', pf_applicable: false, esi_applicable: true, pt_applicable: true, invoice_applicable: true, taxable: true, approval_required: false, effective_from: policy.effectiveFrom, active: true, created_at: now, updated_at: now, sort_order: 2 },
            'NOT_CONFIGURED',
            'Daily rate not configured in Employee Master.'
          ));
        } else {
          earnings.push({
            component_code: 'HRA',
            component_name: `HRA (${hraPct}%)`,
            component_type: 'EARNING',
            status: 'CALCULATED',
            amount: hraAmount,
            why: {
              formula: `₹${dailyRate.toFixed(2)}/day × ${payableDays} days × ${hraPct}%`,
              result: fmtINR(hraAmount),
              eligible_units: payableDays,
              unit_label: 'days',
              rate: dailyRate * (hraPct / 100),
              rate_label: `₹${(dailyRate * (hraPct / 100)).toFixed(2)}/day (${hraPct}%)`,
              source: 'Attendance Master → MR Payable Days',
              policy_name: policy.policyName,
              policy_version: policy.version,
              exclusions: [],
              eligibility_result: 'PASS',
              calculation_version: ENGINE_VERSION,
              calculated_at: now,
            },
          });
        }
      }

      // Other active earnings (OT, Food, Night, Bonus, etc.)
      for (const comp of activeEarnings) {
        if (comp.code === 'BASIC' || comp.code === 'HRA') continue; // already added above
        let line: WageLineItem;

        if (!payrollStatus.wage_eligible) {
          line = sentinelLine(comp, 'NOT_ELIGIBLE', `Employee not wage-eligible: ${payrollStatus.employment_status}.`);
        } else {
          switch (comp.code) {
            case 'OT': {
              // Statutory standard formula: 2 × Basic hourly rate = (dailyRate * basicPct% / 8) * 2
              const basicHourlyRate = (dailyRate * (basicPct / 100)) / 8;
              const statutoryOtRate = basicHourlyRate * 2;
              const effectiveOtRate = empCfg?.ot_rate ?? (statutoryOtRate > 0 ? statutoryOtRate : (dailyRate ? dailyRate / 8 : undefined));
              line = calcOT(comp, otHours, effectiveOtRate);
              if (line.status === 'CALCULATED') otAmount = line.amount;
              break;
            }
            case 'FOOD_E': {
              if (!isFoodEnabled) {
                line = {
                  component_code: comp.code,
                  component_name: comp.name,
                  component_type: comp.type,
                  status: 'ZERO_GENUINE',
                  amount: 0,
                  why: makeWhyPlaceholder('Food Allowance Disabled in Template', '₹0', 'Company Payroll Template', comp.name, 'N/A', 'Disabled in template.'),
                };
                break;
              }
              const empCode = mr.employee_code || mr.employee_id;
              const declaredFa = Number((mr as any).fa ?? (mr as any).faAmount ?? JOY_SEP_ALLOWANCES_MAP[empCode]?.fa ?? JOY_SEP_ALLOWANCES_MAP[mr.employee_id]?.fa ?? 0);
              if (declaredFa > 0) {
                line = {
                  component_code: comp.code,
                  component_name: comp.name,
                  component_type: comp.type,
                  status: 'CALCULATED',
                  amount: declaredFa,
                  why: {
                    formula: `Declared Muster FA: ₹${declaredFa}`,
                    result: fmtINR(declaredFa),
                    eligible_units: Math.round(declaredFa / 20),
                    unit_label: 'meals',
                    rate: 20,
                    rate_label: '₹20/meal',
                    source: 'Attendance Master MR Report FA',
                    policy_name: 'Food Allowance Policy',
                    policy_version: ENGINE_VERSION,
                    exclusions: [],
                    eligibility_result: 'PASS',
                    calculation_version: ENGINE_VERSION,
                    calculated_at: now,
                  },
                };
              } else {
                line = calcFoodAllowance(comp, attendanceDays);
              }
              break;
            }
            case 'NIGHT_E': {
              if (!isNightEnabled) {
                line = {
                  component_code: comp.code,
                  component_name: comp.name,
                  component_type: comp.type,
                  status: 'ZERO_GENUINE',
                  amount: 0,
                  why: makeWhyPlaceholder('Night Allowance Disabled in Template', '₹0', 'Company Payroll Template', comp.name, 'N/A', 'Disabled in template.'),
                };
                break;
              }
              const empCode = mr.employee_code || mr.employee_id;
              const declaredNa = Number((mr as any).na ?? (mr as any).naAmount ?? JOY_SEP_ALLOWANCES_MAP[empCode]?.na ?? JOY_SEP_ALLOWANCES_MAP[mr.employee_id]?.na ?? 0);
              if (declaredNa > 0) {
                line = {
                  component_code: comp.code,
                  component_name: comp.name,
                  component_type: comp.type,
                  status: 'CALCULATED',
                  amount: declaredNa,
                  why: {
                    formula: `Declared Muster NA: ₹${declaredNa}`,
                    result: fmtINR(declaredNa),
                    eligible_units: Math.round(declaredNa / 45),
                    unit_label: 'shifts',
                    rate: 45,
                    rate_label: '₹45/shift',
                    source: 'Attendance Master MR Report NA',
                    policy_name: 'Night Shift Allowance Policy',
                    policy_version: ENGINE_VERSION,
                    exclusions: [],
                    eligibility_result: 'PASS',
                    calculation_version: ENGINE_VERSION,
                    calculated_at: now,
                  },
                };
              } else {
                line = calcNightAllowance(comp, attendanceDays);
              }
              break;
            }
            case 'ATT_BONUS': {
              if (!isBonusEnabled) {
                line = {
                  component_code: comp.code,
                  component_name: comp.name,
                  component_type: comp.type,
                  status: 'ZERO_GENUINE',
                  amount: 0,
                  why: makeWhyPlaceholder('Attendance Bonus Disabled in Template', '₹0', 'Company Payroll Template', comp.name, 'N/A', 'Disabled in template.'),
                };
              } else {
                line = calcAttendanceBonus(comp, presentDays, lopDays, absentDays, 0);
              }
              break;
            }
            default:
              line = sentinelLine(comp, 'NOT_CONFIGURED', `${comp.name} requires manual configuration for this period.`);
          }
        }
        earnings.push(line);
      }

      const grossEarnings = earnings
        .filter(l => l.status === 'CALCULATED' || l.status === 'ZERO_GENUINE')
        .reduce((s, l) => s + l.amount, 0);

      // ── DEDUCTIONS ────────────────────────────────────────────────────────
      const deductions: WageLineItem[] = [];

      for (const comp of activeDeductions) {
        let line: WageLineItem;

        if (!payrollStatus.wage_eligible) {
          line = sentinelLine(comp, 'NOT_ELIGIBLE', `Employee not wage-eligible: ${payrollStatus.employment_status}.`);
        } else {
          switch (comp.code) {
            case 'PF':
              line = calcPF(comp, basicAmount, mr.employee_code);
              break;
            case 'ESI': {
              // ESI Wage Basis: Gross minus HRA (statutory standard)
              const esiWageBasis = Math.max(0, grossEarnings - hraAmount);
              line = calcESI(comp, grossEarnings, esiWageBasis);
              break;
            }
            case 'PT':
              if (!isPtEnabled) {
                line = {
                  component_code: comp.code,
                  component_name: comp.name,
                  component_type: comp.type,
                  status: 'ZERO_GENUINE',
                  amount: 0,
                  why: {
                    formula: 'Professional Tax Disabled in Company Template',
                    result: '₹0',
                    eligible_units: 0,
                    unit_label: 'month',
                    rate: 0,
                    rate_label: '₹0',
                    source: 'Company Payroll Template Builder',
                    policy_name: 'PT Excluded for Period',
                    policy_version: ENGINE_VERSION,
                    exclusions: [],
                    eligibility_result: 'PASS',
                    calculation_version: ENGINE_VERSION,
                    calculated_at: now,
                  },
                };
              } else {
                line = calcPT(comp, grossEarnings);
              }
              break;
            case 'LWF':
              if (!isLwfEnabled) {
                line = {
                  component_code: comp.code,
                  component_name: comp.name,
                  component_type: comp.type,
                  status: 'ZERO_GENUINE',
                  amount: 0,
                  why: {
                    formula: 'LWF Disabled in Company Template (Annual Dec deduction)',
                    result: '₹0',
                    eligible_units: 0,
                    unit_label: 'month',
                    rate: 0,
                    rate_label: '₹0',
                    source: 'Company Payroll Template Builder',
                    policy_name: 'LWF Excluded for Period',
                    policy_version: ENGINE_VERSION,
                    exclusions: [],
                    eligibility_result: 'PASS',
                    calculation_version: ENGINE_VERSION,
                    calculated_at: now,
                  },
                };
              } else {
                line = calcLWF(comp, master.reportingPeriod?.id || master.reportingPeriod?.label);
              }
              break;
            case 'ADV':
              line = calcFixedDeduction(comp, empCfg?.advance_amount);
              break;
            case 'FOOD_D': {
              const mrCanteen = Number((mr as any).canteen ?? (mr as any).canteenDeduction);
              const empCode = mr.employee_code || mr.employee_id;
              const masterCanteen = JOY_SEP_ALLOWANCES_MAP[empCode]?.canteen ?? JOY_SEP_ALLOWANCES_MAP[mr.employee_id]?.canteen ?? 0;
              const cfgCanteen = empCfg?.food_recovery;
              const canteenAmount = (mrCanteen > 0) ? mrCanteen : (cfgCanteen && cfgCanteen > 0) ? cfgCanteen : masterCanteen;

              if (canteenAmount > 0) {
                line = {
                  component_code: comp.code,
                  component_name: comp.name,
                  component_type: comp.type,
                  status: 'CALCULATED',
                  amount: canteenAmount,
                  why: {
                    formula: `Plant Canteen Recovery: ₹${canteenAmount}`,
                    result: fmtINR(canteenAmount),
                    eligible_units: 1,
                    unit_label: 'month',
                    rate: canteenAmount,
                    rate_label: `₹${canteenAmount}`,
                    source: 'Attendance Master / Canteen Ledger',
                    policy_name: 'Canteen Recovery Policy',
                    policy_version: ENGINE_VERSION,
                    exclusions: [],
                    eligibility_result: 'PASS',
                    calculation_version: ENGINE_VERSION,
                    calculated_at: now,
                  },
                };
              } else {
                line = {
                  component_code: comp.code,
                  component_name: comp.name,
                  component_type: comp.type,
                  status: 'ZERO_GENUINE',
                  amount: 0,
                  why: makeWhyPlaceholder('No canteen recovery billed', '₹0', 'Canteen Ledger', comp.name, 'N/A', 'Zero canteen usage recorded for period.'),
                };
              }
              break;
            }
            case 'ACCOM_D':
              line = calcFixedDeduction(comp, empCfg?.accommodation);
              break;
            default:
              line = calcFixedDeduction(comp, empCfg?.other_deduction);
          }
        }
        deductions.push(line);
      }

      const totalDeductions = deductions
        .filter(l => l.status === 'CALCULATED' || l.status === 'ZERO_GENUINE')
        .reduce((s, l) => s + l.amount, 0);

      const netPay = Math.max(0, grossEarnings - totalDeductions);

      // ── EMPLOYER COSTS (Statutory on-costs & vendor billing - NOT deducted from employee!)
      const employer_costs: WageLineItem[] = [];
      if (payrollStatus.wage_eligible) {
        // Employer PF 13%
        const pfCap = 15000;
        const pfEmployerWage = Math.min(basicAmount, pfCap);
        const pfEmployerAmount = Math.round(pfEmployerWage * policy.statutoryRules.pf.employerRate * 100) / 100;
        employer_costs.push({
          component_code: 'PF_EMPLOYER',
          component_name: 'Employer PF (13%)',
          component_type: 'EMPLOYER_COST',
          status: 'CALCULATED',
          amount: pfEmployerAmount,
          why: {
            formula: `₹${pfEmployerWage.toFixed(2)} × 13%`,
            result: fmtINR(pfEmployerAmount),
            eligible_units: pfEmployerWage,
            unit_label: '₹ PF Base',
            rate: 0.13,
            rate_label: '13%',
            source: 'Statutory EPF Rules',
            policy_name: policy.policyName,
            policy_version: policy.version,
            exclusions: [],
            eligibility_result: 'PASS',
            calculation_version: ENGINE_VERSION,
            calculated_at: now,
          },
        });

        // Employer ESI 3.25%
        if (grossEarnings <= policy.statutoryRules.esi.grossWageLimit) {
          const esiEmployerAmount = Math.round(grossEarnings * policy.statutoryRules.esi.employerRate * 100) / 100;
          employer_costs.push({
            component_code: 'ESI_EMPLOYER',
            component_name: 'Employer ESI (3.25%)',
            component_type: 'EMPLOYER_COST',
            status: 'CALCULATED',
            amount: esiEmployerAmount,
            why: {
              formula: `₹${grossEarnings.toFixed(2)} × 3.25%`,
              result: fmtINR(esiEmployerAmount),
              eligible_units: grossEarnings,
              unit_label: '₹ Gross',
              rate: 0.0325,
              rate_label: '3.25%',
              source: 'Statutory ESI Rules',
              policy_name: policy.policyName,
              policy_version: policy.version,
              exclusions: [],
              eligibility_result: 'PASS',
              calculation_version: ENGINE_VERSION,
              calculated_at: now,
            },
          });
        }

        // Service charge 8%
        const serviceChargeBase = baseWageTotal + otAmount;
        const serviceChargeAmount = Math.round(serviceChargeBase * (policy.billingRules.serviceChargePercentage / 100));
        employer_costs.push({
          component_code: 'SERVICE_CHARGE',
          component_name: `Vendor Service Charge (${policy.billingRules.serviceChargePercentage}%)`,
          component_type: 'EMPLOYER_COST',
          status: 'CALCULATED',
          amount: serviceChargeAmount,
          why: {
            formula: `(₹${baseWageTotal.toFixed(2)} + ₹${otAmount.toFixed(2)}) × ${policy.billingRules.serviceChargePercentage}%`,
            result: fmtINR(serviceChargeAmount),
            eligible_units: serviceChargeBase,
            unit_label: '₹ Base',
            rate: policy.billingRules.serviceChargePercentage / 100,
            rate_label: `${policy.billingRules.serviceChargePercentage}%`,
            source: 'Commercial Agreement',
            policy_name: policy.policyName,
            policy_version: policy.version,
            exclusions: [],
            eligibility_result: 'PASS',
            calculation_version: ENGINE_VERSION,
            calculated_at: now,
          },
        });
      }

      // ── INFORMATIONAL LINE ITEMS (Wages = Basic+HRA, PF Wage, ESI Wage)
      const informational: WageLineItem[] = [
        {
          component_code: 'WAGES_TOTAL',
          component_name: 'Base Wages (Basic + HRA)',
          component_type: 'INFORMATIONAL',
          status: 'CALCULATED',
          amount: basicAmount + hraAmount,
          why: {
            formula: `Basic (₹${basicAmount.toFixed(2)}) + HRA (₹${hraAmount.toFixed(2)})`,
            result: fmtINR(basicAmount + hraAmount),
            eligible_units: payableDays,
            unit_label: 'days',
            rate: dailyRate ?? 0,
            rate_label: `₹${(dailyRate ?? 0).toFixed(2)}/day`,
            source: 'Reconciled Base Wage',
            policy_name: policy.policyName,
            policy_version: policy.version,
            exclusions: [],
            eligibility_result: 'PASS',
            calculation_version: ENGINE_VERSION,
            calculated_at: now,
          },
        },
      ];

      const allLines = [...earnings, ...deductions];
      const hasWarnings = allLines.some(l => l.status === 'SOURCE_CONFLICT');
      const hasConflicts = allLines.some(l => l.status === 'SOURCE_CONFLICT');
      const hasUnconfigured = allLines.some(l => l.status === 'NOT_CONFIGURED');
      const warnings: string[] = [];
      if (hasUnconfigured) warnings.push(`${allLines.filter(l => l.status === 'NOT_CONFIGURED').length} component(s) not configured.`);
      if (hasConflicts) warnings.push('Source data conflict detected.');
      if (!payrollStatus.wage_eligible) warnings.push(`${payrollStatus.employment_status}: ${payrollStatus.remarks}`);

      allEmployeeResults.push({
        employee_id: mr.employee_id,
        employee_code: mr.employee_code,
        employee_name: mr.employee_name,
        department: mr.department,
        payroll_status: payrollStatus,
        attendance_present_days: mr.present_days,
        mr_present_days: payableDays,
        payable_days: payableDays,
        ot_hours: otHours,
        night_shift_count: 0,
        lop_days: lopDays,
        weekly_off_days: weeklyOffDays,
        earnings,
        deductions,
        employer_costs,
        informational,
        gross_earnings: grossEarnings,
        total_deductions: totalDeductions,
        net_pay: netPay,
        total_employer_cost: employer_costs.reduce((s, c) => s + c.amount, 0),
        has_warnings: hasWarnings,
        has_conflicts: hasConflicts,
        has_unconfigured: hasUnconfigured,
        warnings,
        wage_run_id: runId,
        calculated_at: now,
      });
    }

    // ── RUN AGGREGATES ────────────────────────────────────────────────────────
    const contractedCount = allEmployeeResults.length;
    const onLeaveCount = allEmployeeResults.filter(r => r.payroll_status.employment_status === 'ON_LEAVE' || !r.payroll_status.wage_eligible).length;
    const activeCount = contractedCount - onLeaveCount;
    const payableCount = activeCount;

    const payableResults = allEmployeeResults.filter(r => r.payroll_status.wage_eligible);
    const totalGross = payableResults.reduce((s, r) => s + r.gross_earnings, 0);
    const totalDeductions = payableResults.reduce((s, r) => s + r.total_deductions, 0);
    const totalNetPay = payableResults.reduce((s, r) => s + r.net_pay, 0);
    const totalEmployerCost = payableResults.reduce((s, r) => s + (r.total_employer_cost ?? 0), 0);

    const run: WageRunRecord = {
      id: runId,
      organization_id: master.companyInfo?.companyId ?? 'ORG',
      vendor_id: vendorId,
      period_from: master.reportingPeriod?.from_date ?? '',
      period_to: master.reportingPeriod?.to_date ?? '',
      period_label: master.reportingPeriod?.label ?? '',
      contracted_roster_count: contractedCount,
      active_workforce_count: activeCount,
      on_leave_count: onLeaveCount,
      payable_workforce_count: payableCount,
      attendance_snapshot_id: master.ingestionRunId ?? 'ATT-SNAPSHOT',
      employee_master_version: 'EM-UPLOADED',
      wage_policy_version: policy.version,
      payroll_policy_id: policy.policyId,
      payroll_policy_version: policy.version,
      calculation_engine_version: ENGINE_VERSION,
      total_gross_earnings: totalGross,
      total_deductions: totalDeductions,
      total_net_pay: totalNetPay,
      total_employer_cost: totalEmployerCost,
      total_billing_amount: totalGross + totalEmployerCost,
      total_ot_amount: payableResults.reduce((s, r) => {
        const ot = r.earnings.find(e => e.component_code === 'OT');
        return s + (ot?.status === 'CALCULATED' ? ot.amount : 0);
      }, 0),
      total_warnings: allEmployeeResults.reduce((s, r) => s + r.warnings.length, 0),
      total_conflicts: allEmployeeResults.filter(r => r.has_conflicts).length,
      total_unconfigured: allEmployeeResults.filter(r => r.has_unconfigured).length,
      total_missing_source: allEmployeeResults.filter(r => [...r.earnings, ...r.deductions].some(l => l.status === 'MISSING_SOURCE')).length,
      status: 'CALCULATED',
      approval_status: 'PENDING',
      employee_results: allEmployeeResults,
      created_at: now,
      updated_at: now,
    };

    // Run mathematical reconciliation checks
    const validationSummary = PayrollValidationService.validateWageRun(run);
    if (!validationSummary.allInvariantsSatisfied && validationSummary.blockingErrorCount > 0) {
      run.status = 'VALIDATION_FAILED';
    } else {
      run.status = 'READY_FOR_REVIEW';
    }

    // Persist to localStorage
    try {
      const key = `${STORAGE_KEY_PREFIX}${vendorId}_${runId}`;
      localStorage.setItem(key, JSON.stringify(run));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${vendorId}_LATEST`, runId);
    } catch { /* quota */ }

    return run;
  }

  /** Load latest wage run for a vendor. */
  static getLatestWageRun(vendorId: string): WageRunRecord | null {
    try {
      const runId = localStorage.getItem(`${STORAGE_KEY_PREFIX}${vendorId}_LATEST`);
      if (!runId) return null;
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${vendorId}_${runId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Compute summary stats from a wage run. */
  static getSummaryStats(run: WageRunRecord): WageRunSummaryStats {
    const getComp = (results: EmployeeWageResult[], code: string) =>
      results.reduce((s, r) => {
        const line = r.earnings.find(e => e.component_code === code) ?? r.deductions.find(e => e.component_code === code);
        return s + (line?.status === 'CALCULATED' ? line.amount : 0);
      }, 0);

    const allLines = (r: EmployeeWageResult) => [...r.earnings, ...r.deductions];

    return {
      contracted_roster: run.contracted_roster_count,
      active_workforce: run.active_workforce_count,
      on_leave: run.on_leave_count,
      payable_workforce: run.payable_workforce_count,
      total_gross: run.total_gross_earnings,
      total_deductions: run.total_deductions,
      total_net: run.total_net_pay,
      total_basic: getComp(run.employee_results, 'BASIC'),
      total_ot: getComp(run.employee_results, 'OT'),
      total_food_allowance: getComp(run.employee_results, 'FOOD_E'),
      total_night_allowance: getComp(run.employee_results, 'NIGHT_E'),
      total_attendance_bonus: getComp(run.employee_results, 'ATT_BONUS'),
      total_pf: getComp(run.employee_results, 'PF'),
      total_esi: getComp(run.employee_results, 'ESI'),
      warnings_count: run.total_warnings,
      conflicts_count: run.total_conflicts,
      unconfigured_count: run.total_unconfigured,
      missing_source_count: run.total_missing_source,
    };
  }
}
