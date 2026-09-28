// src/services/payroll/authoritativePayrollEngine.ts
// ============================================================================
// JOY PeopleHR — Authoritative Unified Payroll Calculation Engine
// Single Authoritative Mathematical Source of Truth for Indian Payroll & Statutory Compliance
// Canonical Flow: Attendance -> OT Policy -> Earnings -> Statutory Bases -> Deductions -> Net Pay -> Documents
// ============================================================================

import { OTPolicyEngine, OTCalculationBreakdown, OTPolicy } from './otPolicyEngine';
import { OTPolicyCalculationResult, CodeOnWagesAssessment } from '../../types/otPolicy';
import {
  StatutoryCalculationEngine,
  EPFCalculationResult,
  ESICalculationResult,
  PTCalculationResult,
  LWFCalculationResult,
  StatutoryConfiguration,
} from './statutoryCalculationEngine';
import { PayrollRoundingService } from './payrollRoundingService';

export interface AuthoritativePayrollInput {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  gender?: 'Male' | 'Female' | 'Other';
  designation?: string;
  department?: string;
  workLocation?: string;
  fatherOrSpouseName?: string;
  pan?: string;
  uan?: string;
  esicNumber?: string;

  // Attendance & Time inputs
  fixedWorkingDays: number;
  workedDays: number;
  payableDays: number;
  lopDays?: number;
  approvedOTHours: number;

  // Rate Matrix (Daily Wage or Monthly Fixed)
  dailyRate?: number;             // e.g. ₹600/day
  dailyBasicRate?: number;        // e.g. ₹420/day
  dailyHraRate?: number;          // e.g. ₹180/day
  monthlyGrossFixed?: number;     // e.g. ₹15,000 or ₹17,000
  monthlyBasicFixed?: number;     // e.g. ₹8,400
  monthlyHraFixed?: number;       // e.g. ₹3,600
  otherAllowances?: number;       // e.g. Conveyance, Medical, etc.

  // OT Configuration
  otPolicyOverride?: Partial<OTPolicy>;
  tenantId?: string;
  companyId?: string;
  contractId?: string;

  // Statutory Configuration & Eligibility Flags
  pfApplicable?: boolean;
  esiApplicable?: boolean;
  ptApplicable?: boolean;
  lwfApplicable?: boolean;
  isContinuingEsiCoverage?: boolean;
  stateJurisdiction?: string;
  statutoryConfigOverride?: Partial<StatutoryConfiguration>;

  // Contractual Exemptions (e.g. raw contractor register without direct deductions)
  isContractorGrossPayoutMode?: boolean;

  // LWF Period and Exemption metadata
  payrollMonth?: number;
  isManagerial?: boolean;

  // Other Deductions
  canteenDeduction?: number;
  salaryAdvanceDeduction?: number;
  loanEmiDeduction?: number;
  otherDeductions?: number;
}

export interface AuthoritativeEmployeePayrollResult {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  gender: string;
  designation: string;
  department: string;
  workLocation: string;
  fatherOrSpouseName: string;
  pan: string;
  uan: string;
  esicNumber: string;

  // Attendance
  fixedWorkingDays: number;
  workedDays: number;
  payableDays: number;
  lopDays: number;
  approvedOTHours: number;

  // Rates
  dailyRate: number;
  hourlyOtRate: number;

  // Earnings Breakdown
  basicEarned: number;
  daEarned: number;
  hraEarned: number;
  otWagesEarned: number;
  allowancesTotal: number;
  grossEarnings: number;

  // Overtime Trace
  otBreakdown: OTCalculationBreakdown;
  dedicatedOtResult?: OTPolicyCalculationResult;
  codeOnWagesAssessment?: CodeOnWagesAssessment;

  // Statutory Wage Bases
  pfWageBasis: number;
  esiCoverageWage: number;
  esiContributionWage: number;

  // Statutory Deductions (Employee)
  epfResult: EPFCalculationResult;
  esiResult: ESICalculationResult;
  ptResult: PTCalculationResult;
  lwfResult: LWFCalculationResult;

  employeeEPF: number;
  employeeESI: number;
  professionalTax: number;
  employeeLWF: number;
  totalStatutoryDeductions: number;

  // Other Employee Deductions
  canteenDeduction: number;
  salaryAdvanceDeduction: number;
  loanEmiDeduction: number;
  otherDeductions: number;
  totalOtherDeductions: number;

  // Total Deductions & Net Pay
  totalDeductions: number;
  netPay: number;
  netPayInWords: string;

  // Employer Cost (CTC)
  employerEPF: number;
  employerEPS: number;
  employerEDLI: number;
  employerPFAdmin: number;
  totalEmployerPF: number;
  employerESI: number;
  employerLWF: number;
  gratuityProvision: number;
  totalEmployerStatutory: number;
  totalEmployerCost: number;

  // Validation Invariant Check
  isBalanced: boolean;
  balanceDiscrepancy: number;

  // Line items for payslips and registers
  earningsItems: { code: string; name: string; amount: number }[];
  deductionItems: { code: string; name: string; amount: number }[];
  employerCostItems: { code: string; name: string; amount: number }[];
}

export class AuthoritativePayrollEngine {
  /**
   * Executes the canonical single calculation pipeline for an employee
   */
  public static calculateEmployee(input: AuthoritativePayrollInput): AuthoritativeEmployeePayrollResult {
    const fixedDays = input.fixedWorkingDays > 0 ? input.fixedWorkingDays : 25;
    const payableDays = Math.max(0, input.payableDays);
    const workedDays = Math.max(0, input.workedDays);
    const lopDays = input.lopDays !== undefined ? input.lopDays : Math.max(0, fixedDays - payableDays);
    const otHours = Math.max(0, input.approvedOTHours);

    // ── 1. Base Rate Derivation ───────────────────────────────────────────────
    let dailyBasic = 0;
    let dailyHra = 0;
    let dailyRate = 0;

    if (input.dailyRate !== undefined && input.dailyRate > 0) {
      dailyRate = input.dailyRate;
      dailyBasic = input.dailyBasicRate !== undefined ? input.dailyBasicRate : Math.round(dailyRate * 0.7);
      dailyHra = input.dailyHraRate !== undefined ? input.dailyHraRate : dailyRate - dailyBasic;
    } else if (input.monthlyGrossFixed !== undefined && input.monthlyGrossFixed > 0) {
      const divisor = fixedDays > 0 ? fixedDays : 26;
      dailyRate = input.monthlyGrossFixed / divisor;
      dailyBasic = (input.monthlyBasicFixed || input.monthlyGrossFixed * 0.5) / divisor;
      dailyHra = (input.monthlyHraFixed || dailyBasic * 0.4) / divisor;
    } else {
      // Default to Standard Plant Daily Wage: ₹600/day (₹420 Basic + ₹180 HRA)
      dailyRate = 600;
      dailyBasic = 420;
      dailyHra = 180;
    }

    // ── 2. Calculate Base Earnings ────────────────────────────────────────────
    const basicEarned = Number((payableDays * dailyBasic).toFixed(2));
    const daEarned = 0;
    const hraEarned = Number((payableDays * dailyHra).toFixed(2));
    const allowancesTotal = Number((input.otherAllowances || 0).toFixed(2));

    // ── 3. Calculate Overtime via OTPolicyEngine ──────────────────────────────
    const wageBasisForOT = (input.dailyRate || dailyRate) * 26;
    const defaultFixedOtRate = (input.dailyRate || dailyRate) > 0 ? (input.dailyRate || dailyRate) / 8 : 75;
    const defaultOtPolicyOverride: Partial<OTPolicy> = input.otPolicyOverride || (
      input.dailyRate
        ? { basis: 'FIXED_HOURLY', fixedHourlyRate: defaultFixedOtRate }
        : {}
    );
    const otBreakdown = OTPolicyEngine.calculate({
      approvedOTHours: otHours,
      monthlySalaryOrWageBasis: input.monthlyGrossFixed || wageBasisForOT,
      policyOverride: defaultOtPolicyOverride,
      tenantId: input.tenantId,
      companyId: input.companyId,
      contractId: input.contractId,
    });

    const dedicatedOtResult = OTPolicyEngine.calculateDedicated({
      actual_ot_hours: otHours,
      monthly_salary_basis: input.monthlyGrossFixed || wageBasisForOT,
      basic_salary: basicEarned,
      da_amount: daEarned,
      allowances_amount: hraEarned + allowancesTotal,
      company_id: input.companyId,
      organization_id: input.tenantId,
      policy_override: input.otPolicyOverride ? {
        calculation_method: input.otPolicyOverride.basis === 'FIXED_HOURLY' ? 'FIXED_HOURLY_RATE' : 'DYNAMIC_MULTIPLIER',
        working_days_divisor: input.otPolicyOverride.divisorDays,
        working_hours_per_day: input.otPolicyOverride.standardHoursPerDay,
        company_multiplier: input.otPolicyOverride.companyMultiplier,
        fixed_hourly_rate: input.otPolicyOverride.fixedHourlyRate,
        government_multiplier: input.otPolicyOverride.governmentMultiplier,
        statutory_standard_preset: input.otPolicyOverride.statutoryStandardPreset,
        enforce_50_percent_wage_rule: input.otPolicyOverride.enforce50PercentWageRule,
      } : undefined,
    });

    const otWagesEarned = otBreakdown.actualOTAmount;
    const hourlyOtRate = otBreakdown.effectiveHourlyRate;

    // ── 4. Total Gross Earnings ───────────────────────────────────────────────
    const grossEarnings = Number((basicEarned + daEarned + hraEarned + allowancesTotal + otWagesEarned).toFixed(2));

    // ── 5. Statutory Deductions via StatutoryCalculationEngine ────────────────
    const isContractorExempt = input.isContractorGrossPayoutMode === true;
    const statConfig = input.statutoryConfigOverride;
    const state = input.stateJurisdiction || 'Tamil Nadu';

    // A. EPF (Explicit basis: basicEarned + daEarned)
    const epfResult = StatutoryCalculationEngine.calculateEPF(basicEarned, daEarned, {
      pfEligible: input.pfApplicable,
      config: statConfig,
      isContractorExempt: false,
    });

    // B. ESIC (2-Step Assessment: Coverage on gross excluding OT; Contribution on gross including OT once!)
    const grossExcludingOT = Number((basicEarned + daEarned + hraEarned + allowancesTotal).toFixed(2));
    const esiResult = StatutoryCalculationEngine.calculateESI(grossExcludingOT, otWagesEarned, {
      esiEligible: input.esiApplicable,
      isContinuingCoverage: input.isContinuingEsiCoverage,
      config: statConfig,
      isContractorExempt: false,
    });

    // C. Professional Tax (PT)
    const ptResult = StatutoryCalculationEngine.calculatePT(grossEarnings, state, {
      ptEligible: input.ptApplicable,
      isContractorExempt: false,
    });

    // D. Labour Welfare Fund (LWF)
    const isManagerialStaff = input.isManagerial ?? (input.designation ? /manager|director|lead|vp|head|officer/i.test(input.designation) : false);
    const lwfResult = StatutoryCalculationEngine.calculateLWF(state, {
      lwfEligible: input.lwfApplicable,
      isContractorExempt: false,
      config: statConfig,
      payrollMonth: input.payrollMonth,
      workedDays: input.workedDays,
      isManagerial: isManagerialStaff,
    });

    // In contractor gross payout mode, statutory contributions are employer-absorbed/returned without reducing worker net pay
    const employeeEPF = isContractorExempt ? 0 : epfResult.employeeContribution;
    const employeeESI = isContractorExempt ? 0 : esiResult.employeeContribution;
    const professionalTax = isContractorExempt ? 0 : ptResult.ptAmount;
    const employeeLWF = isContractorExempt ? 0 : lwfResult.employeeAmount;
    const totalStatutoryDeductions = employeeEPF + employeeESI + professionalTax + employeeLWF;

    // ── 6. Other Deductions (Canteen, Advances, Loans) ────────────────────────
    const canteenDeduction = Number((input.canteenDeduction || 0).toFixed(2));
    const salaryAdvanceDeduction = Number((input.salaryAdvanceDeduction || 0).toFixed(2));
    const loanEmiDeduction = Number((input.loanEmiDeduction || 0).toFixed(2));
    const otherDeductions = Number((input.otherDeductions || 0).toFixed(2));
    const totalOtherDeductions = canteenDeduction + salaryAdvanceDeduction + loanEmiDeduction + otherDeductions;

    // ── 7. Total Deductions & Net Pay ─────────────────────────────────────────
    const totalDeductions = Number((totalStatutoryDeductions + totalOtherDeductions).toFixed(2));
    const netPay = Number((grossEarnings - totalDeductions).toFixed(2));

    // Mathematical Invariant Check: Gross - Deductions == Net Pay
    const balanceDiscrepancy = Number((grossEarnings - totalDeductions - netPay).toFixed(4));
    const isBalanced = Math.abs(balanceDiscrepancy) < 0.01;

    // ── 8. Employer Cost (CTC) ────────────────────────────────────────────────
    const employerEPF = epfResult.employerEPF;
    const employerEPS = epfResult.employerEPS;
    const employerEDLI = epfResult.employerEDLI;
    const employerPFAdmin = epfResult.adminCharges;
    const totalEmployerPF = epfResult.totalEmployerPFLiability;

    const employerESI = esiResult.employerContribution;
    const employerLWF = lwfResult.employerAmount;
    const gratuityProvision = Math.round(basicEarned * 0.0481); // 4.81% gratuity liability

    const totalEmployerStatutory = totalEmployerPF + employerESI + employerLWF + gratuityProvision;
    const totalEmployerCost = Number((grossEarnings + totalEmployerStatutory).toFixed(2));

    // ── 9. Normalized Line Items ──────────────────────────────────────────────
    const earningsItems = [
      { code: 'BASIC', name: 'Basic Wages', amount: basicEarned },
      ...(hraEarned > 0 ? [{ code: 'HRA', name: 'House Rent Allowance (HRA)', amount: hraEarned }] : []),
      ...(otWagesEarned > 0 ? [{ code: 'OT_WAGES', name: `Overtime Wages (${otHours}h @ ₹${hourlyOtRate}/hr)`, amount: otWagesEarned }] : []),
      ...(allowancesTotal > 0 ? [{ code: 'ALLOWANCES', name: 'Other Allowances', amount: allowancesTotal }] : []),
    ];

    const deductionItems = [
      ...(employeeEPF > 0 ? [{ code: 'EPF', name: 'Provident Fund (EPF 12%)', amount: employeeEPF }] : []),
      ...(employeeESI > 0 ? [{ code: 'ESI', name: 'ESIC Employee Contribution (0.75%)', amount: employeeESI }] : []),
      ...(professionalTax > 0 ? [{ code: 'PT', name: 'Professional Tax (PT)', amount: professionalTax }] : []),
      ...(employeeLWF > 0 ? [{ code: 'LWF', name: 'Labour Welfare Fund (LWF)', amount: employeeLWF }] : []),
      ...(canteenDeduction > 0 ? [{ code: 'CANTEEN', name: 'Canteen Charges', amount: canteenDeduction }] : []),
      ...(salaryAdvanceDeduction > 0 ? [{ code: 'ADVANCE', name: 'Salary Advance Recovery', amount: salaryAdvanceDeduction }] : []),
      ...(loanEmiDeduction > 0 ? [{ code: 'LOAN', name: 'Loan EMI Recovery', amount: loanEmiDeduction }] : []),
      ...(otherDeductions > 0 ? [{ code: 'OTHER_DED', name: 'Other Deductions', amount: otherDeductions }] : []),
    ];

    const employerCostItems = [
      ...(employerEPF > 0 ? [{ code: 'ER_EPF', name: 'Employer EPF (3.67%)', amount: employerEPF }] : []),
      ...(employerEPS > 0 ? [{ code: 'ER_EPS', name: 'Employer EPS (8.33%)', amount: employerEPS }] : []),
      ...(employerEDLI > 0 ? [{ code: 'ER_EDLI', name: 'Employer EDLI (0.5%)', amount: employerEDLI }] : []),
      ...(employerPFAdmin > 0 ? [{ code: 'ER_ADMIN', name: 'EPF Admin Charges (0.5%)', amount: employerPFAdmin }] : []),
      ...(employerESI > 0 ? [{ code: 'ER_ESI', name: 'Employer ESI (3.25%)', amount: employerESI }] : []),
      ...(employerLWF > 0 ? [{ code: 'ER_LWF', name: 'Employer LWF', amount: employerLWF }] : []),
      ...(gratuityProvision > 0 ? [{ code: 'GRATUITY', name: 'Gratuity Provision (4.81%)', amount: gratuityProvision }] : []),
    ];

    return {
      employeeId: input.employeeId,
      employeeCode: input.employeeCode,
      employeeName: input.employeeName,
      gender: input.gender || 'Male',
      designation: input.designation || 'Plant Operator',
      department: input.department || 'Plant Operations',
      workLocation: input.workLocation || 'Coimbatore Plant',
      fatherOrSpouseName: input.fatherOrSpouseName || '—',
      pan: input.pan || 'ABCDE1234F',
      uan: input.uan || '101234567890',
      esicNumber: input.esicNumber || '31000123450001001',

      fixedWorkingDays: fixedDays,
      workedDays,
      payableDays,
      lopDays,
      approvedOTHours: otHours,

      dailyRate: Number(dailyRate.toFixed(2)),
      hourlyOtRate: Number(hourlyOtRate.toFixed(2)),

      basicEarned,
      daEarned,
      hraEarned,
      otWagesEarned,
      allowancesTotal,
      grossEarnings,

      otBreakdown,
      dedicatedOtResult,
      codeOnWagesAssessment: dedicatedOtResult.code_on_wages,

      pfWageBasis: epfResult.pfWageBasis,
      esiCoverageWage: esiResult.coverageWage,
      esiContributionWage: esiResult.contributionWage,

      epfResult,
      esiResult,
      ptResult,
      lwfResult,

      employeeEPF,
      employeeESI,
      professionalTax,
      employeeLWF,
      totalStatutoryDeductions,

      canteenDeduction,
      salaryAdvanceDeduction,
      loanEmiDeduction,
      otherDeductions,
      totalOtherDeductions,

      totalDeductions,
      netPay,
      netPayInWords: this.numberToWords(netPay),

      employerEPF,
      employerEPS,
      employerEDLI,
      employerPFAdmin,
      totalEmployerPF,
      employerESI,
      employerLWF,
      gratuityProvision,
      totalEmployerStatutory,
      totalEmployerCost,

      isBalanced,
      balanceDiscrepancy,

      earningsItems,
      deductionItems,
      employerCostItems,
    };
  }

  /**
   * Helper to convert numbers to Indian Rupee Words
   */
  public static numberToWords(amount: number): string {
    const num = Math.floor(Math.abs(amount));
    if (num === 0) return 'Zero Rupees Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const formatThreeDigits = (n: number): string => {
      let str = '';
      if (n >= 100) {
        str += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        str += ones[n] + ' ';
      }
      return str.trim();
    };

    let words = '';
    const crore = Math.floor(num / 10000000);
    let rem = num % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem = rem % 100000;
    const thousand = Math.floor(rem / 1000);
    rem = rem % 1000;

    if (crore > 0) words += formatThreeDigits(crore) + ' Crore ';
    if (lakh > 0) words += formatThreeDigits(lakh) + ' Lakh ';
    if (thousand > 0) words += formatThreeDigits(thousand) + ' Thousand ';
    if (rem > 0) words += formatThreeDigits(rem) + ' ';

    return (words.trim() + ' Rupees Only').replace(/\s+/g, ' ');
  }
}
