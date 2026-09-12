// src/services/payroll/statutoryCalculationEngine.ts
// ============================================================================
// JOY PeopleHR — Authoritative Indian Statutory Calculation Engine
// Compliant with EPFO (EPF/EPS/EDLI Scheme) & ESIC (2-Step Assessment) Standards
// Zero-eval • Explicit Wage Bases • Exact Account Allocations • Full Traceability
// ============================================================================

import { PayrollRoundingService, RoundingResult } from './payrollRoundingService';

export interface StatutoryConfiguration {
  // EPF Configuration
  pfEnabled: boolean;
  pfEmployeeRate: number;        // Default 0.12 (12%)
  pfEmployerEPFRate: number;     // Default 0.0367 (3.67%)
  pfEmployerEPSRate: number;     // Default 0.0833 (8.33%)
  pfEmployerEDLIRate: number;    // Default 0.005 (0.5%)
  pfAdminChargesRate: number;    // Default 0.005 (0.5%)
  pfWageCeiling: number;         // Default ₹15,000
  pfCapped: boolean;             // If true, cap contributions at ₹15,000
  voluntaryHigherWage: boolean;  // If true, allow full wage contribution
  minAdminChargeMonthly: number; // Minimum ₹500 at establishment level

  // ESI Configuration
  esiEnabled: boolean;
  esiCoverageCeiling: number;    // Default ₹21,000/month
  esiEmployeeRate: number;       // Default 0.0075 (0.75%)
  esiEmployerRate: number;       // Default 0.0325 (3.25%)
  esiUseCeilRounding: boolean;   // Round to next higher rupee if configured

  // Professional Tax Configuration
  ptEnabled: boolean;
  stateJurisdiction: string;     // Default 'Tamil Nadu'

  // Labour Welfare Fund
  lwfEnabled: boolean;
  lwfEmployeeAmount: number;     // Default ₹10
  lwfEmployerAmount: number;     // Default ₹20

  effectiveFrom: string;
  effectiveTo?: string;
}

export interface EPFCalculationResult {
  pfWageBasis: number;           // Actual eligible wage (Basic + DA)
  cappedPfWage: number;          // Capped at ₹15,000 if ceiling active
  employeeContributionRaw: number;
  employeeContribution: number;  // Rounded (Deducted from Employee)
  employeeRoundingDiff: number;

  employerEPFRaw: number;        // 3.67%
  employerEPF: number;           // Rounded A/c 1
  employerEPSRaw: number;        // 8.33% (Max ₹1,250)
  employerEPS: number;           // Rounded A/c 10
  employerEDLIRaw: number;       // 0.5% (Max ₹75)
  employerEDLI: number;          // Rounded A/c 21
  adminChargesRaw: number;       // 0.5%
  adminCharges: number;          // Rounded A/c 2
  totalEmployerPFLiability: number; // A/c 1 + 10 + 21 + 2

  accountAllocations: {
    account1_EPF: number;        // Employee PF + Employer EPF
    account10_EPS: number;       // Employer Pension Scheme
    account2_Admin: number;      // PF Administrative Charges
    account21_EDLI: number;      // Employee Deposit Linked Insurance
    account22_EDLIAdmin: number; // 0
  };
  explanation: string;
}

export interface ESICalculationResult {
  isCovered: boolean;
  coverageWage: number;          // Evaluated against ₹21,000 (OT EXCLUDED!)
  coverageCeiling: number;
  contributionWage: number;      // Evaluated for contribution (Coverage + Approved OT ONCE)
  overtimeRemuneration: number;  // OT component

  employeeContributionRaw: number; // 0.75%
  employeeContribution: number;    // Rounded (Deducted from Employee)
  employeeRoundingDiff: number;

  employerContributionRaw: number; // 3.25%
  employerContribution: number;    // Rounded (Employer Cost)
  employerRoundingDiff: number;

  totalESILiability: number;       // EE + ER
  explanation: string;
}

export interface PTCalculationResult {
  isApplicable: boolean;
  grossWage: number;
  state: string;
  ptAmount: number;
  slabDescription: string;
}

export interface LWFCalculationResult {
  isApplicable: boolean;
  state: string;
  employeeAmount: number;
  employerAmount: number;
  totalLWF: number;
  explanation: string;
}

export class StatutoryCalculationEngine {
  public static readonly DEFAULT_CONFIG: StatutoryConfiguration = {
    pfEnabled: true,
    pfEmployeeRate: 0.12,
    pfEmployerEPFRate: 0.0367,
    pfEmployerEPSRate: 0.0833,
    pfEmployerEDLIRate: 0.005,
    pfAdminChargesRate: 0.005,
    pfWageCeiling: 15000,
    pfCapped: true,
    voluntaryHigherWage: false,
    minAdminChargeMonthly: 500,

    esiEnabled: true,
    esiCoverageCeiling: 21000,
    esiEmployeeRate: 0.0075,
    esiEmployerRate: 0.0325,
    esiUseCeilRounding: false,

    ptEnabled: true,
    stateJurisdiction: 'Tamil Nadu',

    lwfEnabled: true,
    lwfEmployeeAmount: 10,
    lwfEmployerAmount: 20,

    effectiveFrom: '2026-01-01',
  };

  /**
   * 1. Calculate Authoritative Employee & Employer EPF Contributions
   */
  public static calculateEPF(
    basicWage: number,
    daWage: number = 0,
    options?: {
      pfEligible?: boolean;
      config?: Partial<StatutoryConfiguration>;
      isContractorExempt?: boolean;
    }
  ): EPFCalculationResult {
    const config = { ...this.DEFAULT_CONFIG, ...(options?.config || {}) };
    const isEligible = options?.pfEligible !== false && config.pfEnabled && !options?.isContractorExempt;

    if (!isEligible || (basicWage <= 0 && daWage <= 0)) {
      return {
        pfWageBasis: 0,
        cappedPfWage: 0,
        employeeContributionRaw: 0,
        employeeContribution: 0,
        employeeRoundingDiff: 0,
        employerEPFRaw: 0,
        employerEPF: 0,
        employerEPSRaw: 0,
        employerEPS: 0,
        employerEDLIRaw: 0,
        employerEDLI: 0,
        adminChargesRaw: 0,
        adminCharges: 0,
        totalEmployerPFLiability: 0,
        accountAllocations: {
          account1_EPF: 0,
          account10_EPS: 0,
          account2_Admin: 0,
          account21_EDLI: 0,
          account22_EDLIAdmin: 0,
        },
        explanation: 'Exempt from Provident Fund contributions (Contractor contractual gross or PF ineligible).',
      };
    }

    const pfWageBasis = basicWage + daWage;
    const cappedPfWage = config.pfCapped && !config.voluntaryHigherWage && config.pfWageCeiling > 0
      ? Math.min(pfWageBasis, config.pfWageCeiling)
      : pfWageBasis;

    // A. Employee PF: 12% of capped wage
    const rawEE = cappedPfWage * config.pfEmployeeRate;
    const roundEE = PayrollRoundingService.roundEPF(rawEE);

    // B. Employer EPS: 8.33% capped at ₹15,000 ceiling (Statutory maximum ₹1,250/mo)
    const epsWageBasis = Math.min(cappedPfWage, 15000);
    const rawEPS = epsWageBasis * config.pfEmployerEPSRate;
    const roundEPS = PayrollRoundingService.roundEPF(rawEPS);

    // C. Employer EPF: Balance of 12% total employer share (or 3.67% of wage)
    const rawEPF = Math.max(0, (cappedPfWage * config.pfEmployeeRate) - rawEPS);
    const roundEPF = PayrollRoundingService.roundEPF(rawEPF);

    // D. Employer EDLI: 0.5% (Capped at ₹15,000 ceiling -> Max ₹75/mo)
    const rawEDLI = epsWageBasis * config.pfEmployerEDLIRate;
    const roundEDLI = PayrollRoundingService.roundEPF(rawEDLI);

    // E. Employer Admin Charges: 0.5%
    const rawAdmin = cappedPfWage * config.pfAdminChargesRate;
    const roundAdmin = PayrollRoundingService.roundEPF(rawAdmin);

    const totalErCost = roundEPF.roundedValue + roundEPS.roundedValue + roundEDLI.roundedValue + roundAdmin.roundedValue;

    const explanation = `PF Wage Basis: ₹${pfWageBasis.toLocaleString('en-IN')}${config.pfCapped && pfWageBasis > config.pfWageCeiling ? ` (Capped at ₹${config.pfWageCeiling.toLocaleString('en-IN')})` : ''}. ` +
      `Employee PF (12%): ₹${roundEE.roundedValue}. Employer EPF (3.67%): ₹${roundEPF.roundedValue}, EPS (8.33%): ₹${roundEPS.roundedValue}, EDLI (0.5%): ₹${roundEDLI.roundedValue}, Admin (0.5%): ₹${roundAdmin.roundedValue}. ` +
      `Total Employer PF Liability: ₹${totalErCost}.`;

    return {
      pfWageBasis,
      cappedPfWage,
      employeeContributionRaw: Number(rawEE.toFixed(4)),
      employeeContribution: roundEE.roundedValue,
      employeeRoundingDiff: roundEE.roundingDifference,
      employerEPFRaw: Number(rawEPF.toFixed(4)),
      employerEPF: roundEPF.roundedValue,
      employerEPSRaw: Number(rawEPS.toFixed(4)),
      employerEPS: roundEPS.roundedValue,
      employerEDLIRaw: Number(rawEDLI.toFixed(4)),
      employerEDLI: roundEDLI.roundedValue,
      adminChargesRaw: Number(rawAdmin.toFixed(4)),
      adminCharges: roundAdmin.roundedValue,
      totalEmployerPFLiability: totalErCost,
      accountAllocations: {
        account1_EPF: roundEE.roundedValue + roundEPF.roundedValue,
        account10_EPS: roundEPS.roundedValue,
        account2_Admin: roundAdmin.roundedValue,
        account21_EDLI: roundEDLI.roundedValue,
        account22_EDLIAdmin: 0,
      },
      explanation,
    };
  }

  /**
   * 2. Calculate Authoritative ESIC Coverage & Contributions (2-Step Assessment)
   */
  public static calculateESI(
    grossWageExcludingOT: number,
    approvedOTRemuneration: number = 0,
    options?: {
      esiEligible?: boolean;
      isContinuingCoverage?: boolean;
      config?: Partial<StatutoryConfiguration>;
      isContractorExempt?: boolean;
    }
  ): ESICalculationResult {
    const config = { ...this.DEFAULT_CONFIG, ...(options?.config || {}) };
    const isEligible = options?.esiEligible !== false && config.esiEnabled && !options?.isContractorExempt;

    const coverageWage = Math.max(0, grossWageExcludingOT);
    const otWage = Math.max(0, approvedOTRemuneration);

    if (!isEligible || (coverageWage <= 0 && otWage <= 0)) {
      return {
        isCovered: false,
        coverageWage: 0,
        coverageCeiling: config.esiCoverageCeiling,
        contributionWage: 0,
        overtimeRemuneration: 0,
        employeeContributionRaw: 0,
        employeeContribution: 0,
        employeeRoundingDiff: 0,
        employerContributionRaw: 0,
        employerContribution: 0,
        employerRoundingDiff: 0,
        totalESILiability: 0,
        explanation: 'Exempt from ESIC contributions.',
      };
    }

    // Step 1: Coverage Test (Excluding OT against ₹21,000 threshold)
    const isCovered = coverageWage <= config.esiCoverageCeiling || options?.isContinuingCoverage === true;

    if (!isCovered) {
      return {
        isCovered: false,
        coverageWage,
        coverageCeiling: config.esiCoverageCeiling,
        contributionWage: 0,
        overtimeRemuneration: otWage,
        employeeContributionRaw: 0,
        employeeContribution: 0,
        employeeRoundingDiff: 0,
        employerContributionRaw: 0,
        employerContribution: 0,
        employerRoundingDiff: 0,
        totalESILiability: 0,
        explanation: `Coverage wage ₹${coverageWage.toLocaleString('en-IN')} exceeds statutory limit ₹${config.esiCoverageCeiling.toLocaleString('en-IN')} (OT excluded from test). Not covered by ESIC.`,
      };
    }

    // Step 2: Contribution Base = Coverage Wage + Approved OT (Included once, never double-counted!)
    const contributionWage = coverageWage + otWage;

    // Rates: Employee 0.75%, Employer 3.25%
    const rawEE = contributionWage * config.esiEmployeeRate;
    const rawER = contributionWage * config.esiEmployerRate;

    const roundEE = PayrollRoundingService.roundESI(rawEE, config.esiUseCeilRounding);
    const roundER = PayrollRoundingService.roundESI(rawER, config.esiUseCeilRounding);

    const explanation = `Coverage Wage: ₹${coverageWage.toLocaleString('en-IN')} <= ₹${config.esiCoverageCeiling.toLocaleString('en-IN')} (Eligible). ` +
      `Contribution Wage: ₹${contributionWage.toLocaleString('en-IN')} (Base ₹${coverageWage.toLocaleString('en-IN')} + OT ₹${otWage.toLocaleString('en-IN')}). ` +
      `Employee ESI (0.75%): ₹${roundEE.roundedValue} (Raw: ₹${rawEE.toFixed(4)}), Employer ESI (3.25%): ₹${roundER.roundedValue} (Raw: ₹${rawER.toFixed(4)}).`;

    return {
      isCovered: true,
      coverageWage,
      coverageCeiling: config.esiCoverageCeiling,
      contributionWage,
      overtimeRemuneration: otWage,
      employeeContributionRaw: Number(rawEE.toFixed(4)),
      employeeContribution: roundEE.roundedValue,
      employeeRoundingDiff: roundEE.roundingDifference,
      employerContributionRaw: Number(rawER.toFixed(4)),
      employerContribution: roundER.roundedValue,
      employerRoundingDiff: roundER.roundingDifference,
      totalESILiability: roundEE.roundedValue + roundER.roundedValue,
      explanation,
    };
  }

  /**
   * 3. Calculate Professional Tax (PT) dynamically from State Slabs
   */
  public static calculatePT(
    monthlyGross: number,
    stateJurisdiction: string = 'Tamil Nadu',
    options?: { ptEligible?: boolean; isContractorExempt?: boolean }
  ): PTCalculationResult {
    if (options?.ptEligible === false || options?.isContractorExempt) {
      return {
        isApplicable: false,
        grossWage: monthlyGross,
        state: stateJurisdiction,
        ptAmount: 0,
        slabDescription: 'Professional Tax not applicable or exempt.',
      };
    }

    const state = (stateJurisdiction || 'Tamil Nadu').toLowerCase();
    const gross = Math.max(0, monthlyGross);

    // Tamil Nadu Half-Yearly PT Slabs (Standard corporate monthly accrual)
    if (state.includes('tamil nadu') || state.includes('chennai') || state.includes('coimbatore')) {
      const halfYearGross = gross * 6;
      let pt = 0;
      let slab = 'Half-Yearly Gross <= ₹21,000 (Monthly <= ₹3,500): Nil';

      if (halfYearGross > 75000) {
        pt = 208; // ₹1,250 / 6 = ₹208.33
        slab = 'Monthly Gross > ₹12,500 (Half-Yearly > ₹75,000): ₹208/mo (₹1,250/half-year)';
      } else if (halfYearGross > 60000) {
        pt = 171; // ₹1,025 / 6
        slab = 'Monthly Gross ₹10,001 - ₹12,500: ₹171/mo (₹1,025/half-year)';
      } else if (halfYearGross > 45000) {
        pt = 115; // ₹690 / 6
        slab = 'Monthly Gross ₹7,501 - ₹10,000: ₹115/mo (₹690/half-year)';
      } else if (halfYearGross > 30000) {
        pt = 48;  // ₹290 / 6
        slab = 'Monthly Gross ₹5,001 - ₹7,500: ₹48/mo (₹290/half-year)';
      }

      return {
        isApplicable: pt > 0,
        grossWage: gross,
        state: 'Tamil Nadu',
        ptAmount: pt,
        slabDescription: slab,
      };
    }

    // Maharashtra PT Slabs
    if (state.includes('maharashtra') || state.includes('mumbai') || state.includes('pune')) {
      let pt = 0;
      if (gross > 10000) pt = 200; // Standard month (Feb is ₹300)
      else if (gross > 7500) pt = 175;
      return {
        isApplicable: pt > 0,
        grossWage: gross,
        state: 'Maharashtra',
        ptAmount: pt,
        slabDescription: gross > 10000 ? 'Gross > ₹10,000: ₹200/mo' : 'Gross <= ₹7,500: Nil',
      };
    }

    // Default Fallback Slab
    const defaultPt = gross > 15000 ? 200 : 0;
    return {
      isApplicable: defaultPt > 0,
      grossWage: gross,
      state: stateJurisdiction,
      ptAmount: defaultPt,
      slabDescription: `Default State Slab: ₹${defaultPt}/mo`,
    };
  }

  /**
   * 4. Calculate Labour Welfare Fund (LWF)
   */
  public static calculateLWF(
    stateJurisdiction: string = 'Tamil Nadu',
    options?: { lwfEligible?: boolean; isContractorExempt?: boolean }
  ): LWFCalculationResult {
    if (options?.lwfEligible === false || options?.isContractorExempt) {
      return {
        isApplicable: false,
        state: stateJurisdiction,
        employeeAmount: 0,
        employerAmount: 0,
        totalLWF: 0,
        explanation: 'Labour Welfare Fund not applicable or exempt.',
      };
    }

    const state = (stateJurisdiction || 'Tamil Nadu').toLowerCase();
    let ee = 10;
    let er = 20;

    if (state.includes('maharashtra')) {
      ee = 12;
      er = 36;
    } else if (state.includes('karnataka')) {
      ee = 20;
      er = 40;
    }

    return {
      isApplicable: true,
      state: stateJurisdiction,
      employeeAmount: ee,
      employerAmount: er,
      totalLWF: ee + er,
      explanation: `${stateJurisdiction} LWF: Employee ₹${ee}, Employer ₹${er}. Total: ₹${ee + er}.`,
    };
  }
}
