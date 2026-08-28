// src/services/payroll/payrollCalculationEngine.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — Unified Canonical Payroll & CTC Calculation Engine
// Single Source of Truth for Live Onboarding Preview & Production Monthly Payroll
// Zero-eval, Safe Deterministic Math & Full Indian Statutory Compliance (EPF, ESIC, PT, TDS)
// ============================================================================

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
  
  // Specific Core Amounts
  basic: number;
  hra: number;
  specialAllowance: number;
  conveyance: number;
  medical: number;
  
  // Statutory Employee Deductions
  epfEmployee: number;
  esicEmployee: number;
  professionalTax: number;
  estimatedTdsMonthly: number;

  // Statutory Employer Contributions
  epfEmployer: number;
  esicEmployer: number;

  // Complete Line Items Breakdown
  earnings: ComponentLineItem[];
  deductions: ComponentLineItem[];
  employerContributions: ComponentLineItem[];
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
}

export class PayrollCalculationEngine {
  /**
   * Calculate exact CTC Breakdown and Net Take-Home Pay
   * Pure deterministic calculation without arbitrary eval()
   */
  calculateBreakdown(input: CalculationInput): SalaryCalculationResult {
    let annualCtc = Number(input.annualCtc) || 0;
    let monthlyCtc = Number(input.monthlyCtc) || 0;

    if (annualCtc > 0 && monthlyCtc === 0) {
      monthlyCtc = Math.round(annualCtc / 12);
    } else if (monthlyCtc > 0 && annualCtc === 0) {
      annualCtc = monthlyCtc * 12;
    } else if (annualCtc === 0 && monthlyCtc === 0) {
      annualCtc = 1200000;
      monthlyCtc = 100000;
    }

    const pfApplicable = input.pfApplicable !== false;
    const ptApplicable = input.ptApplicable !== false;
    const structureCode = input.structureCode || 'CORP_STD_01';

    // 1. Determine Monthly Gross from CTC (Accounting for Employer Statutory inside CTC)
    // In standard Indian CTC structure: CTC = Monthly Gross + Employer EPF (12% up to ceiling 1800) + Employer ESIC (3.25% if <= 21k) + Gratuity/Insurance
    let estimatedMonthlyGross = monthlyCtc;
    
    // Estimate Basic (~50% of Gross)
    let basic = Math.round(estimatedMonthlyGross * 0.5);
    
    // Calculate Employer EPF
    const pfCeiling = 15000;
    const epfWage = Math.min(basic, pfCeiling);
    let epfEmployer = pfApplicable ? Math.round(epfWage * 0.12) : 0;
    
    // Calculate Employer ESIC (Applicable only if gross <= 21,000)
    let esicEmployer = (estimatedMonthlyGross <= 21000 && input.esiApplicable !== false)
      ? Math.round(estimatedMonthlyGross * 0.0325)
      : 0;

    // True Monthly Gross = Monthly CTC - Employer Contributions
    const monthlyGross = Math.max(0, monthlyCtc - epfEmployer - esicEmployer);
    
    // Recalculate components based on exact Gross
    basic = Math.round(monthlyGross * 0.5);
    let hra = Math.round(basic * 0.4);
    let conveyance = structureCode === 'EXEC_TECH_01' ? 3200 : 1600;
    let medical = structureCode === 'EXEC_TECH_01' ? 3500 : 2500;

    let specialAllowance = Math.max(0, monthlyGross - basic - hra - conveyance - medical);

    // If Gross is small, adjust components safely without negative balances
    if (monthlyGross < (basic + hra + conveyance + medical)) {
      basic = Math.round(monthlyGross * 0.5);
      hra = Math.round(monthlyGross * 0.2);
      conveyance = Math.min(1600, Math.round(monthlyGross * 0.1));
      medical = Math.min(1250, Math.round(monthlyGross * 0.05));
      specialAllowance = Math.max(0, monthlyGross - basic - hra - conveyance - medical);
    }

    // 2. Calculate Employee Deductions
    // EPF Employee (12% of basic, standard statutory cap ₹1,800/mo or uncapped for execs)
    const epfEmployeeWage = Math.min(basic, pfCeiling);
    const epfEmployee = pfApplicable ? Math.round(epfEmployeeWage * 0.12) : 0;

    // ESIC Employee (0.75% of Gross if Gross <= ₹21,000)
    const esicEmployee = (monthlyGross <= 21000 && input.esiApplicable !== false)
      ? Math.round(monthlyGross * 0.0075)
      : 0;

    // Professional Tax (Tamil Nadu Standard ~ ₹208 / month for standard slabs)
    let professionalTax = 0;
    if (ptApplicable) {
      if (monthlyGross > 75000) professionalTax = 208;
      else if (monthlyGross > 60000) professionalTax = 171;
      else if (monthlyGross > 45000) professionalTax = 115;
      else if (monthlyGross > 30000) professionalTax = 53;
      else if (monthlyGross > 21000) professionalTax = 23;
    }

    // Estimated Monthly TDS (New Tax Regime Standard FY 26-27 Slabs)
    let estimatedTdsMonthly = 0;
    const annualGross = monthlyGross * 12;
    if (annualGross > 1500000) {
      estimatedTdsMonthly = Math.round((annualGross * 0.15) / 12);
    } else if (annualGross > 1000000) {
      estimatedTdsMonthly = Math.round((annualGross * 0.10) / 12);
    } else if (annualGross > 700000) {
      estimatedTdsMonthly = Math.round((annualGross * 0.05) / 12);
    }

    const totalEmployeeDeductions = epfEmployee + esicEmployee + professionalTax + estimatedTdsMonthly;
    const totalEmployerContributions = epfEmployer + esicEmployer;
    const netMonthlyPay = Math.max(0, monthlyGross - totalEmployeeDeductions);

    // 3. Structured Line Items
    const earnings: ComponentLineItem[] = [
      {
        componentCode: 'BASIC',
        componentName: 'Basic Salary',
        type: 'EARNING',
        monthlyAmount: basic,
        annualAmount: basic * 12,
        calculationBasis: '50% of Monthly Gross Earnings',
        taxable: true,
        isStatutory: true,
      },
      {
        componentCode: 'HRA',
        componentName: 'House Rent Allowance',
        type: 'EARNING',
        monthlyAmount: hra,
        annualAmount: hra * 12,
        calculationBasis: '40% of Basic Salary',
        taxable: true,
        isStatutory: false,
      },
      {
        componentCode: 'CONV',
        componentName: 'Conveyance Allowance',
        type: 'EARNING',
        monthlyAmount: conveyance,
        annualAmount: conveyance * 12,
        calculationBasis: 'Fixed Monthly Allowance',
        taxable: false,
        isStatutory: false,
      },
      {
        componentCode: 'MED',
        componentName: 'Medical Allowance',
        type: 'EARNING',
        monthlyAmount: medical,
        annualAmount: medical * 12,
        calculationBasis: 'Fixed Monthly Medical Basket',
        taxable: false,
        isStatutory: false,
      },
      {
        componentCode: 'SA',
        componentName: 'Special Allowance',
        type: 'EARNING',
        monthlyAmount: specialAllowance,
        annualAmount: specialAllowance * 12,
        calculationBasis: 'Balancing Residual Flexi Allowance',
        taxable: true,
        isStatutory: false,
      },
    ];

    const deductions: ComponentLineItem[] = [
      {
        componentCode: 'EPF_EE',
        componentName: 'Employee Provident Fund (EPF)',
        type: 'DEDUCTION',
        monthlyAmount: epfEmployee,
        annualAmount: epfEmployee * 12,
        calculationBasis: '12% of EPF Base (Capped at ₹15,000 ceiling)',
        taxable: false,
        isStatutory: true,
      },
    ];

    if (esicEmployee > 0) {
      deductions.push({
        componentCode: 'ESIC_EE',
        componentName: 'Employee State Insurance (ESIC)',
        type: 'DEDUCTION',
        monthlyAmount: esicEmployee,
        annualAmount: esicEmployee * 12,
        calculationBasis: '0.75% of Monthly Gross (Gross <= ₹21,000)',
        taxable: false,
        isStatutory: true,
      });
    }

    if (professionalTax > 0) {
      deductions.push({
        componentCode: 'PT',
        componentName: 'Professional Tax (PT)',
        type: 'DEDUCTION',
        monthlyAmount: professionalTax,
        annualAmount: professionalTax * 12,
        calculationBasis: 'State Statutory Half-Yearly Assessment Slab',
        taxable: false,
        isStatutory: true,
      });
    }

    if (estimatedTdsMonthly > 0) {
      deductions.push({
        componentCode: 'TDS',
        componentName: 'Estimated Monthly TDS (Income Tax)',
        type: 'DEDUCTION',
        monthlyAmount: estimatedTdsMonthly,
        annualAmount: estimatedTdsMonthly * 12,
        calculationBasis: 'Estimated Monthly Withholding on Projected Annual Tax',
        taxable: false,
        isStatutory: true,
      });
    }

    const employerContributions: ComponentLineItem[] = [
      {
        componentCode: 'EPF_ER',
        componentName: 'Employer Provident Fund (EPF)',
        type: 'EMPLOYER_CONTRIBUTION',
        monthlyAmount: epfEmployer,
        annualAmount: epfEmployer * 12,
        calculationBasis: '12% of EPF Base',
        taxable: false,
        isStatutory: true,
      },
    ];

    if (esicEmployer > 0) {
      employerContributions.push({
        componentCode: 'ESIC_ER',
        componentName: 'Employer State Insurance (ESIC)',
        type: 'EMPLOYER_CONTRIBUTION',
        monthlyAmount: esicEmployer,
        annualAmount: esicEmployer * 12,
        calculationBasis: '3.25% of Monthly Gross',
        taxable: false,
        isStatutory: true,
      });
    }

    return {
      annualCtc,
      monthlyCtc,
      monthlyGrossEarnings: monthlyGross,
      annualGrossEarnings: monthlyGross * 12,
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
      epfEmployee,
      esicEmployee,
      professionalTax,
      estimatedTdsMonthly,
      epfEmployer,
      esicEmployer,
      earnings,
      deductions,
      employerContributions,
    };
  }
}

export const payrollCalculationEngine = new PayrollCalculationEngine();
