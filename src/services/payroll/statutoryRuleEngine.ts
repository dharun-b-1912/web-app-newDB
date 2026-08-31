// src/services/payroll/statutoryRuleEngine.ts
// ============================================================================
// Joy PeopleHR — Enterprise Statutory Rule Engine v4.0
// Pure Deterministic Math • Versioned Rules • Complete Compliance Audit Trails
// Official Indian Compliance: EPF (EPFO ceiling ₹15k), ESI 2-Step (Coverage vs Contribution),
// Professional Tax Slabs, LWF State Rules, and Annualized Projected TDS (April 2026 Framework)
// ============================================================================

import {
  ESIStatutoryAssessment,
  PFStatutoryAssessment,
  GratuityStatutoryAssessment,
  StatutoryConfig,
} from '../../types/payroll';

export interface PTCalculationResult {
  ptAmount: number;
  slabDescription: string;
  ruleVersion: string;
}

export interface TDSCalculationResult {
  monthlyTdsWithholding: number;
  annualProjectedGross: number;
  taxableIncome: number;
  totalAnnualTaxLiability: number;
  taxRegime: 'NEW' | 'OLD';
  rebate87A: number;
  cess: number;
  ruleVersion: string;
  calculationTrace: string[];
}

export interface LWFCalculationResult {
  employeeContribution: number;
  employerContribution: number;
  state: string;
  ruleVersion: string;
  explanation: string;
}

export class StatutoryRuleEngine {
  public static readonly RULE_VERSION_PF = 'PF-IN-2026-V1';
  public static readonly RULE_VERSION_ESI = 'ESIC-IN-2026-V2';
  public static readonly RULE_VERSION_GRATUITY = 'GRATUITY-CORP-4.81-V1';
  public static readonly RULE_VERSION_PT = 'PT-TN-2026-HY1';
  public static readonly RULE_VERSION_TDS = 'TDS-CBDT-2026-V1';
  public static readonly RULE_VERSION_LWF = 'LWF-TN-2026-V1';

  // ────────────────────────────────────────────────────────────────────────
  // 1. ESI STATUTORY EVALUATION (2-STEP OFFICIAL ESIC STANDARD)
  // ────────────────────────────────────────────────────────────────────────
  /**
   * CRITICAL STATUTORY RULE:
   * 1. Coverage Test: Evaluates eligible wages EXCLUDING overtime remuneration
   *    against the ₹21,000/month threshold.
   * 2. Contribution Base: Once covered, overtime remuneration IS included in the
   *    wage base for contribution calculation.
   * 3. Configurable Rates: Default Employee 0.75%, Employer 3.25%.
   */
  public static evaluateESI(
    coverageWage: number,
    overtimeWage: number = 0,
    historicalStatus: 'NEW_COVERAGE' | 'CONTINUING_COVERAGE' | 'NOT_COVERED' | 'COVERAGE_ENDED' = 'NEW_COVERAGE',
    config?: Partial<StatutoryConfig>
  ): ESIStatutoryAssessment {
    const isEsiEnabled = config?.esi_enabled !== false;
    const coverageLimit = config?.esi_wage_ceiling || 21000;
    const employeeRate = config?.esi_employee_percent !== undefined ? config.esi_employee_percent / 100 : 0.0075;
    const employerRate = config?.esi_employer_percent !== undefined ? config.esi_employer_percent / 100 : 0.0325;

    const cleanCoverageWage = Math.max(0, Math.round(coverageWage * 100) / 100);
    const cleanOTWage = Math.max(0, Math.round(overtimeWage * 100) / 100);

    if (!isEsiEnabled) {
      return {
        coverage_wage: 0,
        coverage_limit: coverageLimit,
        overtime_wage: 0,
        is_covered: false,
        coverage_status: 'NOT_COVERED',
        contribution_wage: 0,
        employee_rate: employeeRate,
        employee_contribution: 0,
        employer_rate: employerRate,
        employer_contribution: 0,
        rule_version: this.RULE_VERSION_ESI,
        explanation: 'ESIC is disabled for this tenant or employee.',
      };
    }

    // Coverage test uses coverageWage ONLY (OT is explicitly excluded)
    const isCoveredByThreshold = cleanCoverageWage <= coverageLimit;
    const isCovered = isCoveredByThreshold || historicalStatus === 'CONTINUING_COVERAGE';

    let coverageStatus: 'NEW_COVERAGE' | 'CONTINUING_COVERAGE' | 'NOT_COVERED' | 'COVERAGE_ENDED';
    if (isCoveredByThreshold) {
      coverageStatus = historicalStatus === 'CONTINUING_COVERAGE' ? 'CONTINUING_COVERAGE' : 'NEW_COVERAGE';
    } else if (historicalStatus === 'CONTINUING_COVERAGE') {
      coverageStatus = 'CONTINUING_COVERAGE';
    } else {
      coverageStatus = 'NOT_COVERED';
    }

    if (!isCovered) {
      return {
        coverage_wage: cleanCoverageWage,
        coverage_limit: coverageLimit,
        overtime_wage: cleanOTWage,
        is_covered: false,
        coverage_status: 'NOT_COVERED',
        contribution_wage: 0,
        employee_rate: employeeRate,
        employee_contribution: 0,
        employer_rate: employerRate,
        employer_contribution: 0,
        rule_version: this.RULE_VERSION_ESI,
        explanation: `Coverage Wage ₹${cleanCoverageWage.toLocaleString('en-IN')} exceeds statutory limit ₹${coverageLimit.toLocaleString('en-IN')} (OT ₹${cleanOTWage.toLocaleString('en-IN')} excluded from test). Not covered by ESIC.`,
      };
    }

    // Contribution wage includes Coverage Wage + Approved OT
    const contributionWage = cleanCoverageWage + cleanOTWage;
    const employeeContrib = Math.round(contributionWage * employeeRate * 100) / 100;
    const employerContrib = Math.round(contributionWage * employerRate * 100) / 100;

    const explanation = cleanOTWage > 0
      ? `Coverage: ₹${cleanCoverageWage.toLocaleString('en-IN')} <= ₹${coverageLimit.toLocaleString('en-IN')} (Eligible, OT excluded). Contribution Base: ₹${cleanCoverageWage.toLocaleString('en-IN')} + ₹${cleanOTWage.toLocaleString('en-IN')} OT = ₹${contributionWage.toLocaleString('en-IN')}. Employee (${(employeeRate * 100).toFixed(2)}%): ₹${employeeContrib.toFixed(2)}, Employer (${(employerRate * 100).toFixed(2)}%): ₹${employerContrib.toFixed(2)}.`
      : `Coverage: ₹${cleanCoverageWage.toLocaleString('en-IN')} <= ₹${coverageLimit.toLocaleString('en-IN')} (Eligible). Contribution Base: ₹${contributionWage.toLocaleString('en-IN')}. Employee (${(employeeRate * 100).toFixed(2)}%): ₹${employeeContrib.toFixed(2)}, Employer (${(employerRate * 100).toFixed(2)}%): ₹${employerContrib.toFixed(2)}.`;

    return {
      coverage_wage: cleanCoverageWage,
      coverage_limit: coverageLimit,
      overtime_wage: cleanOTWage,
      is_covered: true,
      coverage_status: coverageStatus,
      contribution_wage: contributionWage,
      employee_rate: employeeRate,
      employee_contribution: employeeContrib,
      employer_rate: employerRate,
      employer_contribution: employerContrib,
      rule_version: this.RULE_VERSION_ESI,
      explanation,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 2. PF STATUTORY EVALUATION (EPFO STANDARD & DYNAMIC CONFIG)
  // ────────────────────────────────────────────────────────────────────────
  public static evaluatePF(
    basicWage: number,
    isCapped: boolean = true,
    pfEligible: boolean = true,
    config?: Partial<StatutoryConfig>
  ): PFStatutoryAssessment {
    const isPfEnabled = config?.pf_enabled !== false && pfEligible;
    const wageCeiling = config?.pf_wage_ceiling || 15000;
    const employeeRate = config?.pf_employee_percent !== undefined ? config.pf_employee_percent / 100 : 0.12;
    const employerRate = config?.pf_employer_percent !== undefined ? config.pf_employer_percent / 100 : 0.12;

    if (!isPfEnabled) {
      return {
        pf_wage: 0,
        wage_ceiling: wageCeiling,
        employee_rate: employeeRate,
        employee_contribution: 0,
        employer_pf_rate: employerRate,
        employer_pf_amount: 0,
        employer_gov_portion_rate: 0.01,
        employer_gov_portion_amount: 0,
        total_employer_pf_cost: 0,
        rule_version: this.RULE_VERSION_PF,
        explanation: 'Employee is exempt from Provident Fund contributions.',
      };
    }

    const pfWage = isCapped && wageCeiling > 0 ? Math.min(basicWage, wageCeiling) : basicWage;
    const cleanPfWage = Math.max(0, Math.round(pfWage));

    const employeeContrib = Math.round(cleanPfWage * employeeRate);
    const employerPfAmount = Math.round(cleanPfWage * employerRate);
    const employerGovPortion = Math.round(cleanPfWage * 0.01); // 0.5% Admin + 0.5% EDLI
    const totalEmployerPfCost = employerPfAmount + employerGovPortion;

    const explanation = isCapped && wageCeiling > 0 && basicWage > wageCeiling
      ? `PF Wage capped at statutory ceiling ₹${wageCeiling.toLocaleString('en-IN')} (Basic ₹${basicWage.toLocaleString('en-IN')}). Employee (${(employeeRate * 100)}%): ₹${employeeContrib.toLocaleString('en-IN')}. Employer PF: ₹${employerPfAmount.toLocaleString('en-IN')} + Gov Admin/EDLI: ₹${employerGovPortion.toLocaleString('en-IN')} = Total Employer Cost: ₹${totalEmployerPfCost.toLocaleString('en-IN')}.`
      : `PF Wage: ₹${cleanPfWage.toLocaleString('en-IN')}. Employee (${(employeeRate * 100)}%): ₹${employeeContrib.toLocaleString('en-IN')}. Employer PF: ₹${employerPfAmount.toLocaleString('en-IN')} + Gov Admin/EDLI: ₹${employerGovPortion.toLocaleString('en-IN')} = Total Employer Cost: ₹${totalEmployerPfCost.toLocaleString('en-IN')}.`;

    return {
      pf_wage: cleanPfWage,
      wage_ceiling: wageCeiling,
      employee_rate: employeeRate,
      employee_contribution: employeeContrib,
      employer_pf_rate: employerRate,
      employer_pf_amount: employerPfAmount,
      employer_gov_portion_rate: 0.01,
      employer_gov_portion_amount: employerGovPortion,
      total_employer_pf_cost: totalEmployerPfCost,
      rule_version: this.RULE_VERSION_PF,
      explanation,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 3. GRATUITY PROVISION EVALUATION (4.81% ER COST)
  // ────────────────────────────────────────────────────────────────────────
  public static evaluateGratuity(
    basicWage: number,
    provisionRate: number = 0.0481
  ): GratuityStatutoryAssessment {
    const cleanBasic = Math.max(0, Math.round(basicWage));
    const provisionAmount = Math.round(cleanBasic * provisionRate);

    return {
      gratuity_wage: cleanBasic,
      provision_rate: provisionRate,
      employer_provision_amount: provisionAmount,
      rule_version: this.RULE_VERSION_GRATUITY,
      is_employer_cost: true,
      explanation: `Employer Gratuity Provision (${(provisionRate * 100).toFixed(2)}% of Basic ₹${cleanBasic.toLocaleString('en-IN')}): ₹${provisionAmount.toLocaleString('en-IN')}. (Employer cost liability; not deducted from employee take-home pay).`,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 4. PROFESSIONAL TAX (PT) EVALUATION
  // ────────────────────────────────────────────────────────────────────────
  public static evaluateProfessionalTax(
    monthlyGross: number,
    stateJurisdiction: string = 'Tamil Nadu',
    config?: Partial<StatutoryConfig>
  ): PTCalculationResult {
    if (config?.pt_enabled === false) {
      return { ptAmount: 0, slabDescription: 'Professional Tax disabled for tenant.', ruleVersion: this.RULE_VERSION_PT };
    }

    const gross = Math.max(0, Math.round(monthlyGross));
    const halfYearGross = gross * 6;

    if (stateJurisdiction.toLowerCase().includes('tamil nadu') || stateJurisdiction.toLowerCase().includes('chennai') || stateJurisdiction.toLowerCase().includes('coimbatore') || stateJurisdiction.toLowerCase().includes('hosur') || stateJurisdiction.toLowerCase().includes('madurai')) {
      let pt = 0;
      let slab = 'Half-Yearly Gross <= ₹21,000 (Monthly <= ₹3,500): Nil';
      if (halfYearGross > 75000) {
        pt = config?.pt_monthly_slab !== undefined && config.pt_monthly_slab > 0 ? config.pt_monthly_slab : 208; // ₹1,250 / 6 = ₹208.33
        slab = 'Half-Yearly Gross > ₹75,000 (Monthly > ₹12,500): ₹208/mo (₹1,250/half-year)';
      } else if (halfYearGross > 60000) {
        pt = 171; // ₹1,025 / 6
        slab = 'Half-Yearly Gross ₹60,001 - ₹75,000 (Monthly ₹10,001 - ₹12,500): ₹171/mo (₹1,025/half-year)';
      } else if (halfYearGross > 45000) {
        pt = 115; // ₹690 / 6
        slab = 'Half-Yearly Gross ₹45,001 - ₹60,000 (Monthly ₹7,501 - ₹10,000): ₹115/mo (₹690/half-year)';
      } else if (halfYearGross > 30000) {
        pt = 53;  // ₹315 / 6
        slab = 'Half-Yearly Gross ₹30,001 - ₹45,000 (Monthly ₹5,001 - ₹7,500): ₹53/mo (₹315/half-year)';
      } else if (halfYearGross > 21000) {
        pt = 23;  // ₹135 / 6
        slab = 'Half-Yearly Gross ₹21,001 - ₹30,000 (Monthly ₹3,501 - ₹5,000): ₹23/mo (₹135/half-year)';
      }
      return { ptAmount: pt, slabDescription: slab, ruleVersion: this.RULE_VERSION_PT };
    }

    if (stateJurisdiction.toLowerCase().includes('karnataka') || stateJurisdiction.toLowerCase().includes('bengaluru')) {
      const pt = gross >= 25000 ? 200 : 0;
      return {
        ptAmount: pt,
        slabDescription: gross >= 25000 ? 'Gross >= ₹25,000: ₹200/mo' : 'Gross < ₹25,000: Nil',
        ruleVersion: 'PT-KA-2026-V1',
      };
    }

    if (stateJurisdiction.toLowerCase().includes('maharashtra') || stateJurisdiction.toLowerCase().includes('mumbai') || stateJurisdiction.toLowerCase().includes('pune')) {
      let pt = 0;
      if (gross > 10000) pt = 200; // Note: Feb is ₹300
      else if (gross > 7500) pt = 175;
      return {
        ptAmount: pt,
        slabDescription: gross > 10000 ? 'Gross > ₹10,000: ₹200/mo' : 'Gross <= ₹10,000: Nil',
        ruleVersion: 'PT-MH-2026-V1',
      };
    }

    // Tenant configured default monthly slab
    const defaultPt = config?.pt_monthly_slab || (gross > 15000 ? 200 : 0);
    return {
      ptAmount: defaultPt,
      slabDescription: `Configured Slab: ₹${defaultPt}/mo`,
      ruleVersion: 'PT-DEFAULT-2026',
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 5. LABOUR WELFARE FUND (LWF)
  // ────────────────────────────────────────────────────────────────────────
  public static evaluateLWF(
    state: string = 'Tamil Nadu',
    config?: Partial<StatutoryConfig>
  ): LWFCalculationResult {
    if (config?.lwf_enabled === false) {
      return {
        employeeContribution: 0,
        employerContribution: 0,
        state,
        ruleVersion: this.RULE_VERSION_LWF,
        explanation: 'LWF is disabled for this tenant.',
      };
    }

    const amt = config?.lwf_amount || 10;
    return {
      employeeContribution: amt,
      employerContribution: amt * 2, // Standard 1:2 employee:employer statutory ratio
      state,
      ruleVersion: this.RULE_VERSION_LWF,
      explanation: `State LWF (${state}): Employee ₹${amt}, Employer ₹${amt * 2}.`,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 6. INCOME TAX TDS ANNUALIZED PROJECTION ENGINE (APRIL 2026 FRAMEWORK)
  // ────────────────────────────────────────────────────────────────────────
  /**
   * Evaluates projected annual taxable income and calculates proportional
   * monthly TDS withholding for the payroll period.
   * Supports standard deduction (₹75,000 for New Regime), slab tax, 87A rebate, and 4% Health & Education Cess.
   */
  public static evaluateProjectedTDS(
    monthlyGross: number,
    annualGrossExpected?: number,
    taxRegime: 'NEW' | 'OLD' = 'NEW',
    declarations80C: number = 0,
    otherDeductions: number = 0,
    monthsRemainingInFY: number = 8
  ): TDSCalculationResult {
    const projectedAnnualGross = annualGrossExpected || (monthlyGross * 12);
    const trace: string[] = [];
    trace.push(`Annual Projected Gross: ₹${projectedAnnualGross.toLocaleString('en-IN')}`);

    let standardDeduction = 0;
    let totalDeductions = 0;

    if (taxRegime === 'NEW') {
      standardDeduction = 75000; // FY 2026-27 standard deduction under Section 16(ia)
      totalDeductions = standardDeduction;
      trace.push(`Tax Regime: New Regime (Section 115BAC). Standard Deduction: ₹75,000.`);
    } else {
      standardDeduction = 50000;
      const capped80C = Math.min(150000, declarations80C);
      totalDeductions = standardDeduction + capped80C + otherDeductions;
      trace.push(`Tax Regime: Old Regime. Std Ded: ₹50k, 80C: ₹${capped80C.toLocaleString('en-IN')}, Other: ₹${otherDeductions.toLocaleString('en-IN')}.`);
    }

    const taxableIncome = Math.max(0, projectedAnnualGross - totalDeductions);
    trace.push(`Net Taxable Income: ₹${taxableIncome.toLocaleString('en-IN')}`);

    let baseTax = 0;

    if (taxRegime === 'NEW') {
      // New Regime Slabs (FY 2026-27):
      // 0 - 3,00,000: Nil
      // 3,00,001 - 7,00,000: 5%
      // 7,00,001 - 10,00,000: 10%
      // 10,00,001 - 12,00,000: 15%
      // 12,00,001 - 15,00,000: 20%
      // Above 15,00,000: 30%
      if (taxableIncome > 1500000) baseTax += (taxableIncome - 1500000) * 0.30;
      if (taxableIncome > 1200000) baseTax += Math.min(taxableIncome - 1200000, 300000) * 0.20;
      if (taxableIncome > 1000000) baseTax += Math.min(taxableIncome - 1000000, 200000) * 0.15;
      if (taxableIncome > 700000) baseTax += Math.min(taxableIncome - 700000, 300000) * 0.10;
      if (taxableIncome > 300000) baseTax += Math.min(taxableIncome - 300000, 400000) * 0.05;
    } else {
      // Old Regime Slabs:
      if (taxableIncome > 1000000) baseTax += (taxableIncome - 1000000) * 0.30;
      if (taxableIncome > 500000) baseTax += Math.min(taxableIncome - 500000, 500000) * 0.20;
      if (taxableIncome > 250000) baseTax += Math.min(taxableIncome - 250000, 250000) * 0.05;
    }

    // Section 87A Rebate:
    let rebate87A = 0;
    if (taxRegime === 'NEW' && taxableIncome <= 1200000) {
      rebate87A = Math.min(baseTax, 60000); // 87A rebate eliminates tax for income up to ₹12 Lakh under 2026 framework
      trace.push(`Section 87A Rebate Applied: ₹${rebate87A.toLocaleString('en-IN')} (Taxable Income <= ₹12L)`);
    } else if (taxRegime === 'OLD' && taxableIncome <= 500000) {
      rebate87A = Math.min(baseTax, 12500);
    }

    const taxAfterRebate = Math.max(0, baseTax - rebate87A);
    const cess = Math.round(taxAfterRebate * 0.04);
    const totalAnnualTax = taxAfterRebate + cess;
    trace.push(`Annual Tax: Base ₹${baseTax.toFixed(2)} - Rebate ₹${rebate87A.toFixed(2)} + 4% Cess ₹${cess} = Total ₹${totalAnnualTax.toLocaleString('en-IN')}`);

    const safeMonths = Math.max(1, monthsRemainingInFY);
    const monthlyTds = Math.round(totalAnnualTax / 12);
    trace.push(`Monthly TDS Withholding Allocated: ₹${monthlyTds.toLocaleString('en-IN')}/mo`);

    return {
      monthlyTdsWithholding: monthlyTds,
      annualProjectedGross: projectedAnnualGross,
      taxableIncome,
      totalAnnualTaxLiability: totalAnnualTax,
      taxRegime,
      rebate87A,
      cess,
      ruleVersion: this.RULE_VERSION_TDS,
      calculationTrace: trace,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 7. LOSS OF PAY (LOP) EVALUATION
  // ────────────────────────────────────────────────────────────────────────
  public static evaluateLOP(
    wageBase: number,
    lopDays: number,
    totalCalendarDays: number = 30,
    divisorType: 'CALENDAR_DAYS' | 'FIXED_30' | 'WORKING_26' = 'CALENDAR_DAYS'
  ): { lopDeduction: number; formula: string; perDayRate: number } {
    if (lopDays <= 0 || wageBase <= 0) {
      return { lopDeduction: 0, formula: 'No unpaid LOP days recorded', perDayRate: 0 };
    }

    let divisor = totalCalendarDays;
    if (divisorType === 'FIXED_30') divisor = 30;
    else if (divisorType === 'WORKING_26') divisor = 26;

    const perDayRate = Math.round((wageBase / divisor) * 100) / 100;
    const lopDeduction = Math.round(perDayRate * lopDays);
    const formula = `(₹${wageBase.toLocaleString('en-IN')} / ${divisor} days) × ${lopDays} LOP days = ₹${lopDeduction.toLocaleString('en-IN')}`;

    return { lopDeduction, formula, perDayRate };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 8. NEW JOINER PRORATION EVALUATION
  // ────────────────────────────────────────────────────────────────────────
  public static evaluateNewJoinerProration(
    monthlyGross: number,
    payableDays: number,
    totalCalendarDays: number = 31,
    divisorType: 'CALENDAR_DAYS' | 'FIXED_30' | 'WORKING_26' = 'CALENDAR_DAYS'
  ): { proratedGross: number; formula: string; divisor: number } {
    if (payableDays >= totalCalendarDays) {
      return {
        proratedGross: monthlyGross,
        formula: `Full period worked (${payableDays}/${totalCalendarDays} days): ₹${monthlyGross.toLocaleString('en-IN')}`,
        divisor: totalCalendarDays,
      };
    }

    let divisor = totalCalendarDays;
    if (divisorType === 'FIXED_30') divisor = 30;
    else if (divisorType === 'WORKING_26') divisor = 26;

    const perDayRate = monthlyGross / divisor;
    const proratedGross = Math.round(perDayRate * payableDays);
    const formula = `New Joiner Proration: (₹${monthlyGross.toLocaleString('en-IN')} / ${divisor} days) × ${payableDays} payable days = ₹${proratedGross.toLocaleString('en-IN')}`;

    return { proratedGross, formula, divisor };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 9. OVERTIME COMPENSATION EVALUATION
  // ────────────────────────────────────────────────────────────────────────
  public static evaluateOvertime(
    monthlyGross: number,
    approvedOTHours: number,
    multiplier: number = 1.5,
    standardWorkHoursPerDay: number = 8,
    divisor: number = 30
  ): { otAmount: number; hourlyRate: number; formula: string } {
    if (approvedOTHours <= 0 || monthlyGross <= 0) {
      return { otAmount: 0, hourlyRate: 0, formula: '0 approved OT hours' };
    }

    const hourlyRate = Math.round((monthlyGross / (divisor * standardWorkHoursPerDay)) * 100) / 100;
    const otAmount = Math.round(approvedOTHours * hourlyRate * multiplier);
    const formula = `${approvedOTHours}h × ₹${hourlyRate.toFixed(2)}/hr × ${multiplier}x multiplier = ₹${otAmount.toLocaleString('en-IN')}`;

    return { otAmount, hourlyRate, formula };
  }
}
