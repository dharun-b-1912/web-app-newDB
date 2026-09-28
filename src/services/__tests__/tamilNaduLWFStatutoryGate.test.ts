// src/services/__tests__/tamilNaduLWFStatutoryGate.test.ts
// ============================================================================
// Joy PeopleHR — Enterprise Test Gate 26: Tamil Nadu Labour Welfare Fund (TNLWF Act 1972)
// Validates: 1:2 Ratio (₹20/₹40), Annual Frequency (December deduction),
// Headcount threshold (5+ workers), Service Days (30+), and Managerial Exemption.
// ============================================================================

import { StatutoryRuleEngine } from '../payroll/statutoryRuleEngine';
import { StatutoryCalculationEngine } from '../payroll/statutoryCalculationEngine';
import { StatutoryConfig } from '../../types/payroll';

export interface GateTestResult {
  testNumber: number;
  testName: string;
  category: string;
  passed: boolean;
  details: string;
}

export class TamilNaduLWFStatutoryGateSuite {
  public static async runAllTests(): Promise<{
    passed: boolean;
    passCount: number;
    totalCount: number;
    results: GateTestResult[];
  }> {
    const results: GateTestResult[] = [];
    const tnConfig: Partial<StatutoryConfig> = {
      lwf_enabled: true,
      lwf_state_preset: 'TAMIL_NADU',
      lwf_state_jurisdiction: 'Tamil Nadu',
      lwf_employee_amount: 20,
      lwf_employer_amount: 40,
      lwf_frequency: 'YEARLY',
      lwf_deduction_months: [12],
      lwf_min_establishment_headcount: 5,
      lwf_min_service_days: 30,
      lwf_exclude_managerial: true,
      lwf_managerial_wage_ceiling: 15000,
    };

    // Test 1: TN December deduction ₹20 EE & ₹40 ER
    try {
      const res = StatutoryRuleEngine.evaluateLWF('Tamil Nadu', tnConfig, {
        payrollMonth: 12,
        establishmentHeadcount: 20,
        workedDaysInPrecedingYear: 300,
        isManagerial: false,
      });
      const passed = res.employeeContribution === 20 && res.employerContribution === 40 && res.isDeductionMonth === true;
      results.push({
        testNumber: 1,
        testName: 'Tamil Nadu December Statutory Deduction (₹20 EE / ₹40 ER 1:2 ratio)',
        category: 'Statutory Presets',
        passed,
        details: `EE: ₹${res.employeeContribution}, ER: ₹${res.employerContribution}, Due: Jan 31st`,
      });
    } catch (e: any) {
      results.push({ testNumber: 1, testName: 'TN December Deduction', category: 'Statutory Presets', passed: false, details: e.message });
    }

    // Test 2: Non-December months return ₹0
    try {
      let allZero = true;
      for (const m of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
        const res = StatutoryRuleEngine.evaluateLWF('Tamil Nadu', tnConfig, { payrollMonth: m });
        if (res.employeeContribution !== 0 || res.employerContribution !== 0 || res.isDeductionMonth !== false) {
          allZero = false;
        }
      }
      results.push({
        testNumber: 2,
        testName: 'Annual Frequency Month Enforcement (Jan-Nov return ₹0 deduction)',
        category: 'Frequency Engine',
        passed: allZero,
        details: allZero ? 'All 11 non-deduction months returned ₹0.00' : 'Failed to return ₹0 for non-deduction months',
      });
    } catch (e: any) {
      results.push({ testNumber: 2, testName: 'Annual Frequency Month Enforcement', category: 'Frequency Engine', passed: false, details: e.message });
    }

    // Test 3: Establishment Headcount < 5 Exemption
    try {
      const res = StatutoryRuleEngine.evaluateLWF('Tamil Nadu', tnConfig, {
        payrollMonth: 12,
        establishmentHeadcount: 4,
        workedDaysInPrecedingYear: 300,
      });
      const passed = res.employeeContribution === 0 && res.isExempt === true && res.exemptionReason === 'ESTABLISHMENT_BELOW_MINIMUM_HEADCOUNT';
      results.push({
        testNumber: 3,
        testName: 'Minimum Establishment Headcount Threshold (< 5 workers exempt)',
        category: 'Statutory Eligibility',
        passed,
        details: res.explanation,
      });
    } catch (e: any) {
      results.push({ testNumber: 3, testName: 'Headcount Exemption', category: 'Statutory Eligibility', passed: false, details: e.message });
    }

    // Test 4: Minimum Service Days < 30 Exemption
    try {
      const res = StatutoryRuleEngine.evaluateLWF('Tamil Nadu', tnConfig, {
        payrollMonth: 12,
        establishmentHeadcount: 10,
        workedDaysInPrecedingYear: 25,
      });
      const passed = res.employeeContribution === 0 && res.isExempt === true && res.exemptionReason === 'SERVICE_DAYS_BELOW_THRESHOLD';
      results.push({
        testNumber: 4,
        testName: 'Minimum 30-Day Service Requirement (< 30 days exempt)',
        category: 'Worker Definition',
        passed,
        details: res.explanation,
      });
    } catch (e: any) {
      results.push({ testNumber: 4, testName: 'Service Days Exemption', category: 'Worker Definition', passed: false, details: e.message });
    }

    // Test 5: Managerial Exemption
    try {
      const res = StatutoryRuleEngine.evaluateLWF('Tamil Nadu', tnConfig, {
        payrollMonth: 12,
        establishmentHeadcount: 20,
        workedDaysInPrecedingYear: 365,
        isManagerial: true,
      });
      const passed = res.employeeContribution === 0 && res.isExempt === true && res.exemptionReason === 'MANAGERIAL_EXEMPTION';
      results.push({
        testNumber: 5,
        testName: 'Managerial & Supervisory Statutory Exclusion',
        category: 'Statutory Exclusions',
        passed,
        details: res.explanation,
      });
    } catch (e: any) {
      results.push({ testNumber: 5, testName: 'Managerial Exclusion', category: 'Statutory Exclusions', passed: false, details: e.message });
    }

    // Test 6: Multi-state bi-annual preset (Maharashtra June & Dec)
    try {
      const mhConfig: Partial<StatutoryConfig> = {
        lwf_enabled: true,
        lwf_state_preset: 'MAHARASHTRA',
        lwf_state_jurisdiction: 'Maharashtra',
        lwf_employee_amount: 12,
        lwf_employer_amount: 36,
        lwf_frequency: 'HALF_YEARLY',
        lwf_deduction_months: [6, 12],
      };
      const resJun = StatutoryRuleEngine.evaluateLWF('Maharashtra', mhConfig, { payrollMonth: 6 });
      const resDec = StatutoryRuleEngine.evaluateLWF('Maharashtra', mhConfig, { payrollMonth: 12 });
      const resMay = StatutoryRuleEngine.evaluateLWF('Maharashtra', mhConfig, { payrollMonth: 5 });

      const passed = resJun.employeeContribution === 12 && resDec.employeeContribution === 12 && resMay.employeeContribution === 0;
      results.push({
        testNumber: 6,
        testName: 'Multi-State Bi-Annual Frequency (Maharashtra ₹12/₹36 in June & December)',
        category: 'Multi-State Presets',
        passed,
        details: `Jun: ₹${resJun.employeeContribution}, Dec: ₹${resDec.employeeContribution}, May: ₹${resMay.employeeContribution}`,
      });
    } catch (e: any) {
      results.push({ testNumber: 6, testName: 'Multi-State Bi-Annual', category: 'Multi-State Presets', passed: false, details: e.message });
    }

    // Test 7: StatutoryCalculationEngine integration
    try {
      const resDec = StatutoryCalculationEngine.calculateLWF('Tamil Nadu', {
        config: {
          lwfEnabled: true,
          lwfEmployeeAmount: 20,
          lwfEmployerAmount: 40,
          lwfFrequency: 'YEARLY',
          lwfDeductionMonths: [12],
        },
        payrollMonth: 12,
        workedDays: 300,
        isManagerial: false,
      });
      const resApr = StatutoryCalculationEngine.calculateLWF('Tamil Nadu', {
        config: {
          lwfEnabled: true,
          lwfEmployeeAmount: 20,
          lwfEmployerAmount: 40,
          lwfFrequency: 'YEARLY',
          lwfDeductionMonths: [12],
        },
        payrollMonth: 4,
        workedDays: 300,
        isManagerial: false,
      });
      const passed = resDec.isApplicable === true && resDec.totalLWF === 60 && resApr.isApplicable === false && resApr.totalLWF === 0;
      results.push({
        testNumber: 7,
        testName: 'StatutoryCalculationEngine Dec/Apr Dynamic Dispatch',
        category: 'Authoritative Engine',
        passed,
        details: `Dec Total: ₹${resDec.totalLWF}, Apr Total: ₹${resApr.totalLWF}`,
      });
    } catch (e: any) {
      results.push({ testNumber: 7, testName: 'StatutoryCalculationEngine Integration', category: 'Authoritative Engine', passed: false, details: e.message });
    }

    const passCount = results.filter(r => r.passed).length;
    return {
      passed: passCount === results.length,
      passCount,
      totalCount: results.length,
      results,
    };
  }
}
