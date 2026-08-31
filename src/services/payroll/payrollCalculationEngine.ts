// src/services/payroll/payrollCalculationEngine.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — Layered Canonical Payroll & CTC Engine v4.0
// Single Source of Truth for Live Onboarding Preview & Production Monthly Payroll
// Zero-eval, Safe Deterministic Math & Full Indian Statutory Compliance
// ============================================================================

import {
  PayrollInputSnapshot,
  PayrollWageClassification,
  CalculationLineItem,
  ESIStatutoryAssessment,
  PFStatutoryAssessment,
  GratuityStatutoryAssessment,
  PayrollException,
  EmployeePayrollInput,
  StatutoryConfig,
} from '../../types/payroll';
import { StatutoryRuleEngine, TDSCalculationResult, LWFCalculationResult } from './statutoryRuleEngine';
import { PayrollFormulaEngine } from './formulaEngine';

export interface DetailedEmployeePayrollResult {
  employeeInput: EmployeePayrollInput;
  wageClassification: PayrollWageClassification;
  esiAssessment: ESIStatutoryAssessment;
  pfAssessment: PFStatutoryAssessment;
  gratuityAssessment: GratuityStatutoryAssessment;
  tdsAssessment?: TDSCalculationResult;
  lwfAssessment?: LWFCalculationResult;
  calculationLines: CalculationLineItem[];
  exceptions: PayrollException[];
  prorationDetails?: {
    isProrated: boolean;
    joiningDate: string;
    payableDays: number;
    totalDays: number;
    divisor: number;
    formula: string;
  };
}

export interface CalculationInput {
  annualCtc?: number;
  monthlyCtc?: number;
  structureCode?: string;
  pfApplicable?: boolean;
  esiApplicable?: boolean;
  ptApplicable?: boolean;
  taxRegime?: 'NEW' | 'OLD';
  state?: string;
  statutoryConfig?: Partial<StatutoryConfig>;
}

export interface ComponentLineItem {
  componentCode: string;
  componentName: string;
  type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION' | 'STATUTORY';
  monthlyAmount: number;
  annualAmount: number;
  calculationBasis: string;
  taxable: boolean;
  isStatutory: boolean;
}

export interface SalaryCalculationResult {
  annualCtc: number;
  monthlyCtc: number;
  monthlyGrossEarnings: number;
  annualGrossEarnings: number;
  totalEmployeeDeductions: number;
  annualEmployeeDeductions: number;
  totalEmployerContributions: number;
  annualEmployerContributions: number;
  netMonthlyPay: number;
  annualNetPay: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  conveyance: number;
  medical: number;
  epfEmployee: number;
  esicEmployee: number;
  professionalTax: number;
  estimatedTdsMonthly: number;
  epfEmployer: number;
  esicEmployer: number;
  gratuityProvision: number;
  earnings: ComponentLineItem[];
  deductions: ComponentLineItem[];
  employerContributions: ComponentLineItem[];
}

export class PayrollCalculationEngine {
  /**
   * LAYER 4: Execute Complete Monthly Payroll Calculation for an Employee Snapshot
   */
  public static calculateSnapshot(
    snapshot: PayrollInputSnapshot,
    options: {
      prorationDivisor?: 'CALENDAR_DAYS' | 'FIXED_30' | 'WORKING_26';
      pfCapped?: boolean;
      stateJurisdiction?: string;
      statutoryConfig?: Partial<StatutoryConfig>;
    } = {}
  ): DetailedEmployeePayrollResult {
    const divisorType = options.prorationDivisor || 'CALENDAR_DAYS';
    const pfCapped = options.pfCapped !== false && snapshot.pf_capped !== false;
    const stateJurisdiction = options.stateJurisdiction || snapshot.pt_state_jurisdiction || 'Tamil Nadu';
    const statutoryConfig = options.statutoryConfig;
    const calculationLines: CalculationLineItem[] = [];
    const exceptions: PayrollException[] = [];

    const totalDays = snapshot.total_calendar_days || 31;
    const payableDays = Math.min(snapshot.payable_days, totalDays);
    const lopDays = Math.max(0, snapshot.lop_days || 0);
    const otHours = Math.max(0, snapshot.approved_ot_hours || 0);

    // ── 1. Determine Effective Gross & Proration (New Joiner / Partial Month) ──
    let baseMonthlyGross = snapshot.monthly_gross_fixed;
    let basicFixed = snapshot.basic_fixed;
    let hraFixed = snapshot.hra_fixed;
    let specialFixed = snapshot.special_allowance_fixed;
    let conveyanceFixed = snapshot.conveyance_fixed;
    let medicalFixed = snapshot.medical_fixed;

    // Proration for New Joiners
    let isProrated = false;
    let prorationFormula = '';
    let usedDivisor = totalDays;

    if (snapshot.is_new_joiner && payableDays < totalDays) {
      isProrated = true;
      const proration = StatutoryRuleEngine.evaluateNewJoinerProration(
        baseMonthlyGross,
        payableDays,
        totalDays,
        divisorType
      );
      usedDivisor = proration.divisor;
      prorationFormula = proration.formula;
      
      const prorationFactor = payableDays / usedDivisor;
      baseMonthlyGross = Math.round(baseMonthlyGross * prorationFactor);
      basicFixed = Math.round(basicFixed * prorationFactor);
      hraFixed = Math.round(hraFixed * prorationFactor);
      specialFixed = Math.round(specialFixed * prorationFactor);
      conveyanceFixed = Math.round(conveyanceFixed * prorationFactor);
      medicalFixed = Math.round(medicalFixed * prorationFactor);
    }

    // ── 2. Calculate LOP Deduction (Attendance/Leave Integrated) ───────────────
    let lopDeduction = 0;
    let lopFormula = '0 LOP days';
    if (lopDays > 0 && !isProrated) {
      const lopEval = StatutoryRuleEngine.evaluateLOP(snapshot.monthly_gross_fixed, lopDays, totalDays, divisorType);
      lopDeduction = lopEval.lopDeduction;
      lopFormula = lopEval.formula;
    }

    // ── 3. Calculate Overtime Earnings ─────────────────────────────────────────
    let otEarnings = 0;
    let otFormula = '0 OT hours';
    if (otHours > 0) {
      const otEval = StatutoryRuleEngine.evaluateOvertime(snapshot.monthly_gross_fixed, otHours, 1.5, 8, totalDays);
      otEarnings = otEval.otAmount;
      otFormula = otEval.formula;
    }

    // ── 4. Total Gross Earnings Calculation ────────────────────────────────────
    const claims = snapshot.approved_claims_total || 0;
    const bonus = snapshot.bonus_amount || 0;
    const incentives = snapshot.incentives_amount || 0;

    const actualGrossEarnings = Math.max(0, baseMonthlyGross + otEarnings + bonus + incentives + claims - lopDeduction);

    // ── 5. Statutory Wage Classifications ──────────────────────────────────────
    const esiCoverageWage = Math.max(0, baseMonthlyGross - lopDeduction);
    const esiOvertimeWage = otEarnings;
    const earnedBasic = isProrated ? basicFixed : Math.max(0, Math.round(basicFixed * (payableDays / totalDays)));
    const pfWage = earnedBasic;
    const gratuityWage = earnedBasic;
    const taxableWage = actualGrossEarnings;

    const wageClassification: PayrollWageClassification = {
      gross_earnings: actualGrossEarnings,
      pf_wage: pfWage,
      esi_coverage_wage: esiCoverageWage,
      esi_overtime_wage: esiOvertimeWage,
      esi_contribution_wage: esiCoverageWage + esiOvertimeWage,
      gratuity_wage: gratuityWage,
      taxable_wage: taxableWage,
      lop_wage_base: baseMonthlyGross,
      ot_wage_base: baseMonthlyGross,
    };

    // ── 6. Statutory Rule Evaluations ─────────────────────────────────────────
    // A. ESI 2-Step Assessment
    const esiAssessment = StatutoryRuleEngine.evaluateESI(
      esiCoverageWage,
      esiOvertimeWage,
      snapshot.esi_coverage_status === 'CONTINUING_COVERAGE' ? 'CONTINUING_COVERAGE' : 'NEW_COVERAGE',
      statutoryConfig
    );

    // B. PF Assessment
    const pfAssessment = StatutoryRuleEngine.evaluatePF(
      pfWage,
      pfCapped,
      snapshot.pf_eligible,
      statutoryConfig
    );

    // C. Gratuity Provision
    const gratuityAssessment = StatutoryRuleEngine.evaluateGratuity(gratuityWage, 0.0481);

    // D. Professional Tax (PT)
    const ptEval = StatutoryRuleEngine.evaluateProfessionalTax(actualGrossEarnings, stateJurisdiction, statutoryConfig);
    const professionalTax = snapshot.pt_eligible !== false ? ptEval.ptAmount : 0;

    // E. Dynamic Projected TDS (April 2026 framework)
    const tdsEval = StatutoryRuleEngine.evaluateProjectedTDS(
      actualGrossEarnings,
      actualGrossEarnings * 12,
      snapshot.tax_regime || 'NEW',
      0,
      0,
      8
    );
    const estimatedTds = tdsEval.monthlyTdsWithholding;

    // F. Labour Welfare Fund (LWF)
    const lwfEval = StatutoryRuleEngine.evaluateLWF(stateJurisdiction, statutoryConfig);

    // ── 7. Deductions Aggregation ─────────────────────────────────────────────
    const loanEmi = snapshot.loan_emi_due || 0;
    const advanceRecovery = snapshot.advance_recovery_due || 0;
    const voluntaryDeductions = snapshot.voluntary_deductions || 0;

    const totalEmployeeDeductions =
      pfAssessment.employee_contribution +
      esiAssessment.employee_contribution +
      professionalTax +
      estimatedTds +
      lwfEval.employeeContribution +
      loanEmi +
      advanceRecovery +
      voluntaryDeductions;

    // ── 8. Net Take-Home Pay & Invariant Assertions ────────────────────────────
    const netPay = actualGrossEarnings - totalEmployeeDeductions;

    if (netPay < 0) {
      exceptions.push({
        id: `exc-neg-net-${snapshot.employee_id}`,
        tenant_id: snapshot.tenant_id,
        payroll_run_id: snapshot.payroll_run_id,
        employee_id: snapshot.employee_id,
        employee_code: snapshot.employee_code,
        employee_name: snapshot.employee_name,
        severity: 'BLOCKER',
        category: 'NEGATIVE_NET',
        message: `Total deductions (₹${totalEmployeeDeductions.toLocaleString('en-IN')}) exceed gross earnings (₹${actualGrossEarnings.toLocaleString('en-IN')}). Net pay is ₹${netPay.toLocaleString('en-IN')}.`,
        suggested_action: 'Reduce voluntary deductions, defer loan recovery EMI, or review LOP days.',
        source: 'PAYROLL_CALCULATION_ENGINE',
        detected_at: new Date().toISOString(),
        is_resolved: false,
      });
    }

    // ── 9. Construct Normalized Calculation Line Items ────────────────────────
    calculationLines.push({
      component_code: 'BASIC',
      component_name: 'Basic Salary',
      category: 'Basic',
      type: 'EARNING',
      basis: 'MONTHLY_FIXED_BASIC',
      basis_amount: snapshot.basic_fixed,
      rate: 1,
      formula: isProrated ? `Prorated for ${payableDays}/${usedDivisor} days` : 'Full monthly basic salary',
      amount: basicFixed,
      source: 'Salary Structure',
      rule_version: 'COMP-STD-2026',
      is_employer_cost: false,
      is_taxable: true,
    });

    calculationLines.push({
      component_code: 'HRA',
      component_name: 'House Rent Allowance',
      category: 'HRA',
      type: 'EARNING',
      basis: '40% of Basic',
      basis_amount: basicFixed,
      rate: 0.40,
      formula: '40% of Basic Salary',
      amount: hraFixed,
      source: 'Salary Structure',
      rule_version: 'COMP-STD-2026',
      is_employer_cost: false,
      is_taxable: true,
    });

    if (specialFixed > 0) {
      calculationLines.push({
        component_code: 'SPECIAL',
        component_name: 'Special Allowance',
        category: 'SpecialAllowance',
        type: 'EARNING',
        basis: 'BALANCING_ALLOWANCE',
        basis_amount: specialFixed,
        rate: 1,
        formula: 'Balancing monthly allowance',
        amount: specialFixed,
        source: 'Salary Structure',
        rule_version: 'COMP-STD-2026',
        is_employer_cost: false,
        is_taxable: true,
      });
    }

    if (conveyanceFixed > 0) {
      calculationLines.push({
        component_code: 'CONV',
        component_name: 'Conveyance Allowance',
        category: 'Conveyance',
        type: 'EARNING',
        basis: 'FIXED_MONTHLY',
        basis_amount: conveyanceFixed,
        rate: 1,
        formula: 'Standard travel conveyance allowance',
        amount: conveyanceFixed,
        source: 'Salary Structure',
        rule_version: 'COMP-STD-2026',
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    if (medicalFixed > 0) {
      calculationLines.push({
        component_code: 'MED',
        component_name: 'Medical Allowance',
        category: 'Medical',
        type: 'EARNING',
        basis: 'FIXED_MONTHLY',
        basis_amount: medicalFixed,
        rate: 1,
        formula: 'Medical expense reimbursement allowance',
        amount: medicalFixed,
        source: 'Salary Structure',
        rule_version: 'COMP-STD-2026',
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    if (otEarnings > 0) {
      calculationLines.push({
        component_code: 'OT_PAY',
        component_name: 'Overtime Remuneration',
        category: 'Overtime',
        type: 'EARNING',
        basis: 'APPROVED_OT_HOURS',
        basis_amount: baseMonthlyGross,
        rate: 1.5,
        quantity: otHours,
        formula: otFormula,
        amount: otEarnings,
        source: 'Attendance Overtime Engine',
        rule_version: 'OT-RULE-1.5X-V1',
        is_employer_cost: false,
        is_taxable: true,
      });
    }

    if (bonus > 0) {
      calculationLines.push({
        component_code: 'BONUS',
        component_name: 'Performance / Festive Bonus',
        category: 'Bonus',
        type: 'EARNING',
        basis: 'MANAGEMENT_APPROVED_BONUS',
        basis_amount: bonus,
        rate: 1,
        formula: 'Approved performance / festive bonus',
        amount: bonus,
        source: 'Variable Pay Input',
        rule_version: 'BONUS-2026-V1',
        is_employer_cost: false,
        is_taxable: true,
      });
    }

    if (claims > 0) {
      calculationLines.push({
        component_code: 'REIMBURSEMENT',
        component_name: 'Approved Expense Reimbursements',
        category: 'Reimbursement',
        type: 'EARNING',
        basis: 'FINANCE_APPROVED_CLAIMS',
        basis_amount: claims,
        rate: 1,
        formula: 'Verified and approved employee expense claims',
        amount: claims,
        source: 'Claims Engine',
        rule_version: 'EXPENSE-CLAIMS-V1',
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    // Deduction Lines
    if (lopDeduction > 0) {
      calculationLines.push({
        component_code: 'LOP',
        component_name: 'Loss of Pay (LOP)',
        category: 'LOP',
        type: 'DEDUCTION',
        basis: 'UNPAID_ABSENCE_DAYS',
        basis_amount: snapshot.monthly_gross_fixed,
        rate: lopDays / totalDays,
        quantity: lopDays,
        formula: lopFormula,
        amount: lopDeduction,
        source: 'Attendance Leave Engine',
        rule_version: 'LOP-CALENDAR-V1',
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    if (pfAssessment.employee_contribution > 0) {
      calculationLines.push({
        component_code: 'PF_EE',
        component_name: 'Employee Provident Fund (EPF)',
        category: 'PF',
        type: 'STATUTORY',
        basis: 'PF_WAGE',
        basis_amount: pfAssessment.pf_wage,
        rate: pfAssessment.employee_rate,
        formula: pfAssessment.explanation,
        amount: pfAssessment.employee_contribution,
        source: 'Statutory Rule PF-2026',
        rule_version: pfAssessment.rule_version,
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    if (esiAssessment.employee_contribution > 0) {
      calculationLines.push({
        component_code: 'ESI_EE',
        component_name: 'Employee State Insurance (ESIC)',
        category: 'ESI',
        type: 'STATUTORY',
        basis: 'ESI_CONTRIBUTION_WAGE',
        basis_amount: esiAssessment.contribution_wage,
        rate: esiAssessment.employee_rate,
        formula: esiAssessment.explanation,
        amount: esiAssessment.employee_contribution,
        source: 'Statutory Rule ESIC-2026',
        rule_version: esiAssessment.rule_version,
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    if (professionalTax > 0) {
      calculationLines.push({
        component_code: 'PT',
        component_name: 'Professional Tax (PT)',
        category: 'ProfessionalTax',
        type: 'STATUTORY',
        basis: 'GROSS_EARNINGS',
        basis_amount: actualGrossEarnings,
        rate: 1,
        formula: ptEval.slabDescription,
        amount: professionalTax,
        source: `${stateJurisdiction} PT Slabs`,
        rule_version: ptEval.ruleVersion,
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    if (estimatedTds > 0) {
      calculationLines.push({
        component_code: 'TDS',
        component_name: 'Income Tax (TDS Section 192)',
        category: 'TDS',
        type: 'STATUTORY',
        basis: 'TAXABLE_ANNUAL_PROJECTED',
        basis_amount: actualGrossEarnings * 12,
        rate: 1,
        formula: `${snapshot.tax_regime || 'NEW'} Regime Annualized Projection`,
        amount: estimatedTds,
        source: 'Income Tax Act Slabs',
        rule_version: tdsEval.ruleVersion,
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    if (lwfEval.employeeContribution > 0) {
      calculationLines.push({
        component_code: 'LWF_EE',
        component_name: 'Labour Welfare Fund (LWF)',
        category: 'LWF',
        type: 'STATUTORY',
        basis: 'STATE_LWF_ACT',
        basis_amount: actualGrossEarnings,
        rate: 1,
        formula: lwfEval.explanation,
        amount: lwfEval.employeeContribution,
        source: `${stateJurisdiction} LWF Board`,
        rule_version: lwfEval.ruleVersion,
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    if (loanEmi > 0) {
      calculationLines.push({
        component_code: 'LOAN_EMI',
        component_name: 'Company Loan EMI Recovery',
        category: 'Loan',
        type: 'DEDUCTION',
        basis: 'SCHEDULED_LOAN_INSTALLMENT',
        basis_amount: loanEmi,
        rate: 1,
        formula: 'Scheduled monthly loan principal & interest recovery',
        amount: loanEmi,
        source: 'Loan Management',
        rule_version: 'LOAN-RECOVERY-V1',
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    if (advanceRecovery > 0) {
      calculationLines.push({
        component_code: 'ADVANCE_REC',
        component_name: 'Salary Advance Recovery',
        category: 'Advance',
        type: 'DEDUCTION',
        basis: 'APPROVED_ADVANCE_SCHEDULE',
        basis_amount: advanceRecovery,
        rate: 1,
        formula: 'Scheduled salary advance deduction',
        amount: advanceRecovery,
        source: 'Advance Management',
        rule_version: 'ADVANCE-RECOVERY-V1',
        is_employer_cost: false,
        is_taxable: false,
      });
    }

    // Employer Contribution Lines
    if (pfAssessment.total_employer_pf_cost > 0) {
      calculationLines.push({
        component_code: 'PF_ER',
        component_name: 'Employer EPF (12%) + Admin/EDLI (1%)',
        category: 'PF',
        type: 'EMPLOYER_CONTRIBUTION',
        basis: 'PF_WAGE',
        basis_amount: pfAssessment.pf_wage,
        rate: pfAssessment.employer_pf_rate + pfAssessment.employer_gov_portion_rate,
        formula: pfAssessment.explanation,
        amount: pfAssessment.total_employer_pf_cost,
        source: 'Statutory Rule PF-2026',
        rule_version: pfAssessment.rule_version,
        is_employer_cost: true,
        is_taxable: false,
      });
    }

    if (esiAssessment.employer_contribution > 0) {
      calculationLines.push({
        component_code: 'ESI_ER',
        component_name: 'Employer ESIC Contribution (3.25%)',
        category: 'ESI',
        type: 'EMPLOYER_CONTRIBUTION',
        basis: 'ESI_CONTRIBUTION_WAGE',
        basis_amount: esiAssessment.contribution_wage,
        rate: esiAssessment.employer_rate,
        formula: esiAssessment.explanation,
        amount: esiAssessment.employer_contribution,
        source: 'Statutory Rule ESIC-2026',
        rule_version: esiAssessment.rule_version,
        is_employer_cost: true,
        is_taxable: false,
      });
    }

    if (gratuityAssessment.employer_provision_amount > 0) {
      calculationLines.push({
        component_code: 'GRATUITY_ER',
        component_name: 'Gratuity Provision (4.81%)',
        category: 'Gratuity',
        type: 'EMPLOYER_CONTRIBUTION',
        basis: 'GRATUITY_WAGE',
        basis_amount: gratuityAssessment.gratuity_wage,
        rate: gratuityAssessment.provision_rate,
        formula: gratuityAssessment.explanation,
        amount: gratuityAssessment.employer_provision_amount,
        source: 'Payment of Gratuity Act 1972',
        rule_version: gratuityAssessment.rule_version,
        is_employer_cost: true,
        is_taxable: false,
      });
    }

    // ── 10. Build Final Result ────────────────────────────────────────────────
    const totalEmployerCost =
      actualGrossEarnings +
      pfAssessment.total_employer_pf_cost +
      esiAssessment.employer_contribution +
      gratuityAssessment.employer_provision_amount +
      lwfEval.employerContribution;

    const employeeInput: EmployeePayrollInput = {
      id: `epi-${snapshot.payroll_run_id}-${snapshot.employee_id}`,
      tenant_id: snapshot.tenant_id,
      payroll_run_id: snapshot.payroll_run_id,
      employee_id: snapshot.employee_id,
      employee_code: snapshot.employee_code,
      employee_name: snapshot.employee_name,
      department: snapshot.department || '',
      designation: snapshot.designation || '',
      total_working_days: totalDays,
      payable_days: payableDays,
      present_days: snapshot.present_days ?? payableDays,
      paid_leave_days: snapshot.paid_leave_days ?? 0,
      unpaid_leave_days: snapshot.unpaid_leave_days ?? 0,
      lop_days: lopDays,
      overtime_hours: otHours,
      ctc_annual: snapshot.annual_ctc,
      gross_fixed: snapshot.monthly_gross_fixed,
      basic: basicFixed,
      hra: hraFixed,
      special_allowance: specialFixed,
      conveyance: conveyanceFixed,
      medical: medicalFixed,
      other_allowances: snapshot.other_allowances_fixed ?? 0,
      overtime_pay: otEarnings,
      incentives: incentives,
      bonus: bonus,
      reimbursements: claims,
      arrears: 0,
      total_earnings: actualGrossEarnings,
      lop_deduction: lopDeduction,
      epf_employee: pfAssessment.employee_contribution,
      esic_employee: esiAssessment.employee_contribution,
      professional_tax: professionalTax,
      tds_tax: estimatedTds,
      loan_emi: loanEmi,
      advance_recovery: advanceRecovery,
      other_deductions: voluntaryDeductions + lwfEval.employeeContribution,
      total_deductions: totalEmployeeDeductions,
      epf_employer: pfAssessment.employer_pf_amount,
      esic_employer: esiAssessment.employer_contribution,
      net_pay: netPay,
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      pan_number: '',
      has_exceptions: exceptions.length > 0,
      status: exceptions.some(e => e.severity === 'BLOCKER' || e.severity === 'ERROR') ? 'Excluded' : 'Calculated',
      updated_at: new Date().toISOString(),
    };

    return {
      employeeInput,
      wageClassification,
      esiAssessment,
      pfAssessment,
      gratuityAssessment,
      tdsAssessment: tdsEval,
      lwfAssessment: lwfEval,
      calculationLines,
      exceptions,
      prorationDetails: isProrated
        ? {
            isProrated: true,
            joiningDate: snapshot.joining_date || '',
            payableDays,
            totalDays,
            divisor: usedDivisor,
            formula: prorationFormula,
          }
        : undefined,
    };
  }

  /**
  /**
   * Preview CTC Breakdown calculation for onboarding / salary structuring
   * Deterministically synced with active Statutory Configuration (EPF, ESIC, PT, TDS)
   */
  public static calculateCtcBreakdown(input: CalculationInput): SalaryCalculationResult {
    const annualCtc = input.annualCtc || (input.monthlyCtc ? input.monthlyCtc * 12 : 600000);
    const monthlyCtc = Math.max(0, input.monthlyCtc || Math.round(annualCtc / 12));

    // Resolve tenant statutory config (passed or from unified storage)
    let statutoryConfig: Partial<StatutoryConfig> | undefined = input.statutoryConfig;
    if (!statutoryConfig) {
      try {
        const raw = localStorage.getItem('workforce_statutory_rules_active') ||
                    localStorage.getItem('workforce_payroll_statutory_v2');
        if (raw) {
          statutoryConfig = JSON.parse(raw);
        }
      } catch (_) {}
    }

    const isPfEnabled = statutoryConfig?.pf_enabled !== false && input.pfApplicable !== false;
    const isEsiEnabled = statutoryConfig?.esi_enabled !== false && input.esiApplicable !== false;

    const pfEmployeeRate = (statutoryConfig?.pf_employee_percent !== undefined ? statutoryConfig.pf_employee_percent : 12) / 100;
    const pfEmployerRate = (statutoryConfig?.pf_employer_percent !== undefined ? statutoryConfig.pf_employer_percent : 12) / 100;
    const pfAdminRate = 0.01; // 0.5% Admin + 0.5% EDLI
    const totalPfErFactor = isPfEnabled ? (pfEmployerRate + pfAdminRate) : 0;
    const pfWageCeiling = statutoryConfig?.pf_wage_ceiling || 15000;

    const esiEmployeeRate = (statutoryConfig?.esi_employee_percent !== undefined ? statutoryConfig.esi_employee_percent : 0.75) / 100;
    const esiEmployerRate = (statutoryConfig?.esi_employer_percent !== undefined ? statutoryConfig.esi_employer_percent : 3.25) / 100;
    const totalEsiErFactor = isEsiEnabled ? esiEmployerRate : 0;
    const esiWageCeiling = statutoryConfig?.esi_wage_ceiling || 21000;

    // ── Exact Deterministic CTC-to-Gross Derivation ──────────────────────────
    // Standard Structure: Basic = 50% of Gross, HRA = 40% of Basic (20% of Gross), Special = 30% of Gross
    let grossMonthly: number;
    if (input.structureCode === 'INTERN_STIPEND_01' || monthlyCtc === 0) {
      grossMonthly = monthlyCtc;
    } else {
      // Trial 1: Assume Gross is eligible for ESI (Gross <= esiWageCeiling)
      // CTC = Gross + (0.5 * Gross * totalPfErFactor) + (Gross * totalEsiErFactor)
      const denominatorWithEsi = 1 + (0.5 * totalPfErFactor) + totalEsiErFactor;
      const trialGrossWithEsi = monthlyCtc / denominatorWithEsi;

      if (isEsiEnabled && trialGrossWithEsi <= esiWageCeiling) {
        grossMonthly = Math.round(trialGrossWithEsi);
      } else {
        // ESI is not covered (Gross > esiWageCeiling or ESI disabled)
        // Trial 2: Check if Basic (0.5 * Gross) <= pfWageCeiling (Gross <= 2 * pfWageCeiling)
        const denominatorWithoutEsi = 1 + (0.5 * totalPfErFactor);
        const trialGrossWithoutEsi = monthlyCtc / denominatorWithoutEsi;

        if (!isPfEnabled || trialGrossWithoutEsi <= pfWageCeiling * 2) {
          grossMonthly = Math.round(trialGrossWithoutEsi);
        } else {
          // Trial 3: Basic is above PF wage ceiling, so Employer PF is capped
          const cappedPfCost = isPfEnabled ? Math.round(pfWageCeiling * totalPfErFactor) : 0;
          grossMonthly = Math.max(0, Math.round(monthlyCtc - cappedPfCost));
        }
      }
    }

    const basic = Math.round(grossMonthly * 0.50);
    const hra = Math.round(basic * 0.40);
    const specialAllowance = Math.max(0, grossMonthly - basic - hra);
    const conveyance = 0;
    const medical = 0;

    const pfEval = StatutoryRuleEngine.evaluatePF(
      basic,
      true,
      input.pfApplicable !== false,
      statutoryConfig
    );

    const esiEval = StatutoryRuleEngine.evaluateESI(
      grossMonthly,
      0,
      'NEW_COVERAGE',
      statutoryConfig
    );

    const ptEval = StatutoryRuleEngine.evaluateProfessionalTax(
      grossMonthly,
      input.state || 'Tamil Nadu',
      statutoryConfig
    );

    const tdsEval = StatutoryRuleEngine.evaluateProjectedTDS(
      grossMonthly,
      grossMonthly * 12,
      input.taxRegime || 'NEW'
    );

    const ptAmount = input.ptApplicable !== false ? ptEval.ptAmount : 0;
    const totalEmployeeDeductions =
      pfEval.employee_contribution +
      esiEval.employee_contribution +
      ptAmount +
      tdsEval.monthlyTdsWithholding;

    const totalEmployerContributions =
      pfEval.total_employer_pf_cost +
      esiEval.employer_contribution;

    const netMonthlyPay = Math.max(0, grossMonthly - totalEmployeeDeductions);

    const earnings: ComponentLineItem[] = [
      { componentCode: 'BASIC', componentName: 'Basic Salary', type: 'EARNING', monthlyAmount: basic, annualAmount: basic * 12, calculationBasis: '50% of Gross', taxable: true, isStatutory: false },
      { componentCode: 'HRA', componentName: 'House Rent Allowance', type: 'EARNING', monthlyAmount: hra, annualAmount: hra * 12, calculationBasis: '40% of Basic', taxable: true, isStatutory: false },
      { componentCode: 'SPECIAL', componentName: 'Special Allowance', type: 'EARNING', monthlyAmount: specialAllowance, annualAmount: specialAllowance * 12, calculationBasis: 'Balancing Allowance', taxable: true, isStatutory: false },
    ];

    const deductions: ComponentLineItem[] = [
      { componentCode: 'PF_EE', componentName: `Employee EPF (${(pfEmployeeRate * 100)}%)`, type: 'DEDUCTION', monthlyAmount: pfEval.employee_contribution, annualAmount: pfEval.employee_contribution * 12, calculationBasis: `${(pfEmployeeRate * 100)}% of Basic (capped at ₹${pfWageCeiling.toLocaleString('en-IN')})`, taxable: false, isStatutory: true },
      { componentCode: 'ESI_EE', componentName: `Employee ESIC (${(esiEmployeeRate * 100)}%)`, type: 'DEDUCTION', monthlyAmount: esiEval.employee_contribution, annualAmount: esiEval.employee_contribution * 12, calculationBasis: `${(esiEmployeeRate * 100)}% of Gross`, taxable: false, isStatutory: true },
      { componentCode: 'PT', componentName: 'Professional Tax (PT)', type: 'DEDUCTION', monthlyAmount: ptAmount, annualAmount: ptAmount * 12, calculationBasis: ptEval.slabDescription, taxable: false, isStatutory: true },
      { componentCode: 'TDS', componentName: 'Estimated TDS', type: 'DEDUCTION', monthlyAmount: tdsEval.monthlyTdsWithholding, annualAmount: tdsEval.totalAnnualTaxLiability, calculationBasis: 'Annualized Slab Projection', taxable: false, isStatutory: true },
    ];

    const employerContributions: ComponentLineItem[] = [
      { componentCode: 'PF_ER', componentName: `Employer EPF (${(pfEmployerRate * 100)}%) + Admin/EDLI (1%)`, type: 'EMPLOYER_CONTRIBUTION', monthlyAmount: pfEval.total_employer_pf_cost, annualAmount: pfEval.total_employer_pf_cost * 12, calculationBasis: `${((pfEmployerRate + pfAdminRate) * 100)}% of Basic (capped)`, taxable: false, isStatutory: true },
      { componentCode: 'ESI_ER', componentName: `Employer ESIC (${(esiEmployerRate * 100)}%)`, type: 'EMPLOYER_CONTRIBUTION', monthlyAmount: esiEval.employer_contribution, annualAmount: esiEval.employer_contribution * 12, calculationBasis: `${(esiEmployerRate * 100)}% of Gross`, taxable: false, isStatutory: true },
    ];

    return {
      annualCtc,
      monthlyCtc,
      monthlyGrossEarnings: grossMonthly,
      annualGrossEarnings: grossMonthly * 12,
      totalEmployeeDeductions,
      annualEmployeeDeductions: totalEmployeeDeductions * 12,
      totalEmployerContributions,
      annualEmployerContributions: totalEmployerContributions * 12,
      netMonthlyPay,
      annualNetPay: netMonthlyPay * 12,
      basic,
      hra,
      specialAllowance,
      conveyance,
      medical,
      epfEmployee: pfEval.employee_contribution,
      esicEmployee: esiEval.employee_contribution,
      professionalTax: ptAmount,
      estimatedTdsMonthly: tdsEval.monthlyTdsWithholding,
      epfEmployer: pfEval.employer_pf_amount,
      esicEmployer: esiEval.employer_contribution,
      gratuityProvision: Math.round(basic * 0.0481),
      earnings,
      deductions,
      employerContributions,
    };
  }

  /**
   * Alias for calculateCtcBreakdown used across employee creation wizard & impact simulators
   */
  public static calculateBreakdown(input: CalculationInput): SalaryCalculationResult {
    return this.calculateCtcBreakdown(input);
  }
}

// Export both named instance/namespace and default class for compatibility
export const payrollCalculationEngine = PayrollCalculationEngine;
export default PayrollCalculationEngine;

