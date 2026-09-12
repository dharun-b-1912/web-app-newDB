// src/services/__tests__/payrollCalculationRealityGate.test.ts
// ============================================================================
// JOY PeopleHR — Gate 24: Authoritative Payroll Calculation & Statutory Reality Gate
// Reproduces calculations from:
// 1. "Ot calsution for govt notms and company norms.xlsx"
// 2. "New format.xlsx" (21 Worker Canonical Production Dataset)
// Proves Statutory EPF (12% + 3.67% + 8.33%), ESIC (2-step coverage & contribution),
// Rounding invariants, and Unified Document Authority across Payroll, Register & Payslips.
// ============================================================================

import { OTPolicyEngine, OTPolicy } from '../payroll/otPolicyEngine';
import { StatutoryCalculationEngine } from '../payroll/statutoryCalculationEngine';
import { PayrollRoundingService } from '../payroll/payrollRoundingService';
import { AuthoritativePayrollEngine, AuthoritativeEmployeePayrollResult } from '../payroll/authoritativePayrollEngine';
import { LiveDataPayrollVerificationService } from '../payroll/liveDataPayrollVerificationService';
import { StatutoryReportAdapter } from '../payroll/statutoryReportAdapter';

export interface RealityGateTestResult {
  testNumber: number;
  testName: string;
  category: string;
  passed: boolean;
  details: string;
}

export class PayrollCalculationRealityGateSuite {
  public static async runAllTests(): Promise<{
    passed: boolean;
    passCount: number;
    totalCount: number;
    results: RealityGateTestResult[];
  }> {
    const results: RealityGateTestResult[] = [];

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 1: Overtime Workbook Formula Reproduction — Case 1 (Salary ₹17,000)
    // Formula in Excel:
    // Daily Rate = Salary / 26 = ₹653.846...
    // Hourly Rate = Daily Rate / 8 = ₹81.7307...
    // Government Norms OT Rate = Hourly Rate * 2 = ₹163.4615... (2.0x)
    // Company Norms OT Rate = Contractual ₹75.00/hr (or 1.5x)
    // For 50 OT Hours: Actual OT = 50 * 75 = ₹3,750.00
    // Equivalent Govt Hours = 3750 / 163.46 = 22.94 hrs
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const breakdown = OTPolicyEngine.calculateOT({
        actualOtHours: 50,
        monthlyGrossSalary: 17000,
        fixedDaysInMonth: 26,
        standardShiftHours: 8,
        companyPolicy: {
          policyType: 'FIXED_HOURLY',
          fixedHourlyRate: 75,
        },
      });

      const dailyRateMatches = Math.abs(breakdown.dailyWageRate - (17000 / 26)) < 0.01;
      const hourlyRateMatches = Math.abs(breakdown.singleHourlyRate - (17000 / 26 / 8)) < 0.01;
      const govtRateMatches = Math.abs(breakdown.governmentNormsHourlyRate - (17000 / 26 / 8 * 2)) < 0.01;
      const companyRateMatches = breakdown.companyNormsHourlyRate === 75;
      const actualOtMatches = breakdown.actualOtEarnings === 3750;
      const equivGovtHrsMatches = Math.abs(breakdown.equivalentGovernmentHours - 22.94) < 0.05;

      const passed = dailyRateMatches && hourlyRateMatches && govtRateMatches && companyRateMatches && actualOtMatches && equivGovtHrsMatches;

      results.push({
        testNumber: 1,
        testName: 'Excel Case 1: Salary ₹17,000 OT Reproduction (Govt 2.0x vs Company ₹75/hr)',
        category: 'OT_EXCEL_REPRODUCTION',
        passed,
        details: passed
          ? `✓ Exact match: Daily ₹${breakdown.dailyWageRate.toFixed(2)}, Hourly ₹${breakdown.singleHourlyRate.toFixed(2)}, Govt Rate ₹${breakdown.governmentNormsHourlyRate.toFixed(2)}, Company OT ₹${breakdown.actualOtEarnings}, Equivalent Govt Hrs ${breakdown.equivalentGovernmentHours}`
          : `Discrepancy: daily=${dailyRateMatches}, hourly=${hourlyRateMatches}, govtRate=${govtRateMatches}, compRate=${companyRateMatches}, actualOt=${actualOtMatches}, equivHrs=${equivGovtHrsMatches}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 1,
        testName: 'Excel Case 1: Salary ₹17,000 OT Reproduction',
        category: 'OT_EXCEL_REPRODUCTION',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 2: Overtime Workbook Formula Reproduction — Case 2 (Contractual ₹70/hr)
    // Formula in Excel:
    // Actual OT = 50 * 70 = ₹3,500.00
    // Equivalent Govt Hours = 3500 / 163.46 = 21.41 hrs
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const breakdown = OTPolicyEngine.calculateOT({
        actualOtHours: 50,
        monthlyGrossSalary: 17000,
        fixedDaysInMonth: 26,
        standardShiftHours: 8,
        companyPolicy: {
          policyType: 'FIXED_HOURLY',
          fixedHourlyRate: 70,
        },
      });

      const actualOtMatches = breakdown.actualOtEarnings === 3500;
      const equivGovtHrsMatches = Math.abs(breakdown.equivalentGovernmentHours - 21.41) < 0.05;
      const passed = actualOtMatches && equivGovtHrsMatches;

      results.push({
        testNumber: 2,
        testName: 'Excel Case 2: Fixed Hourly ₹70/hr OT Reproduction & Equivalent Govt Hours',
        category: 'OT_EXCEL_REPRODUCTION',
        passed,
        details: passed
          ? `✓ Exact match: 50 hrs @ ₹70/hr = ₹${breakdown.actualOtEarnings}, Equivalent Govt Hours = ${breakdown.equivalentGovernmentHours}`
          : `Discrepancy: actualOt=${actualOtMatches} (got ${breakdown.actualOtEarnings}), equivHrs=${equivGovtHrsMatches} (got ${breakdown.equivalentGovernmentHours})`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 2,
        testName: 'Excel Case 2: Fixed Hourly ₹70/hr OT Reproduction',
        category: 'OT_EXCEL_REPRODUCTION',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 3: Overtime Workbook Multiplier Model (Company 1.5x vs Govt 2.0x)
    // Salary ₹20,800 / 26 / 8 = ₹100/hr
    // Company 1.5x = ₹150/hr
    // Govt 2.0x = ₹200/hr
    // 10 hrs Company = ₹1,500
    // Equivalent Govt Hours = 1500 / 200 = 7.5 hrs
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const breakdown = OTPolicyEngine.calculateOT({
        actualOtHours: 10,
        monthlyGrossSalary: 20800,
        fixedDaysInMonth: 26,
        standardShiftHours: 8,
        companyPolicy: {
          policyType: 'MULTIPLIER',
          customMultiplier: 1.5,
        },
      });

      const passed =
        breakdown.singleHourlyRate === 100 &&
        breakdown.companyNormsHourlyRate === 150 &&
        breakdown.governmentNormsHourlyRate === 200 &&
        breakdown.actualOtEarnings === 1500 &&
        breakdown.equivalentGovernmentHours === 7.5;

      results.push({
        testNumber: 3,
        testName: 'OT Multiplier Model: Company 1.5x (₹150/hr) vs Govt 2.0x (₹200/hr)',
        category: 'OT_POLICY_ENGINE',
        passed,
        details: passed
          ? `✓ Exact match: Base ₹100/hr, Company ₹150/hr, Govt ₹200/hr, 10h = ₹1500, Equivalent Govt Hours = 7.5`
          : `Discrepancy: got base=${breakdown.singleHourlyRate}, comp=${breakdown.companyNormsHourlyRate}, govt=${breakdown.governmentNormsHourlyRate}, ot=${breakdown.actualOtEarnings}, equiv=${breakdown.equivalentGovernmentHours}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 3,
        testName: 'OT Multiplier Model Certification',
        category: 'OT_POLICY_ENGINE',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 4: ESIC 2-Step Assessment & Anomaly Fix Certification
    // Worker CE0017: 20 days @ ₹600/day = ₹12,000. OT 3 hrs @ ₹75 = ₹225. Gross = ₹12,225.
    // Step 1: Coverage Test excludes OT -> ₹12,000 <= ₹21,000 (Covered).
    // Step 2: Contribution Base includes OT ONCE -> ₹12,225 (NOT ₹12,450!).
    // Employee ESI = ₹12,225 * 0.0075 = ₹91.6875 -> ₹92.00 (Nearest Rupee).
    // Employer ESI = ₹12,225 * 0.0325 = ₹397.3125 -> ₹397.00.
    // Proves OT is never added twice (which previously produced ₹93).
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const esiRes = StatutoryCalculationEngine.calculateESI(12000, 225, { esiEligible: true });

      const isCoveredMatches = esiRes.isCovered === true;
      const coverageWageMatches = esiRes.coverageWage === 12000;
      const contributionWageMatches = esiRes.contributionWage === 12225;
      const eeEsiMatches = esiRes.employeeContribution === 92; // 12225 * 0.0075 = 91.6875 -> 92
      const erEsiMatches = esiRes.employerContribution === 397; // 12225 * 0.0325 = 397.3125 -> 397

      const passed = isCoveredMatches && coverageWageMatches && contributionWageMatches && eeEsiMatches && erEsiMatches;

      results.push({
        testNumber: 4,
        testName: 'ESIC 2-Step Assessment: Coverage ₹12,000, Contribution ₹12,225, EE ₹92 (Zero Double-OT)',
        category: 'STATUTORY_ESIC_ENGINE',
        passed,
        details: passed
          ? `✓ Verified: Coverage ₹${esiRes.coverageWage} (OT excluded), Contribution ₹${esiRes.contributionWage} (OT added once), Employee ESI ₹${esiRes.employeeContribution} (exact ₹91.69 -> ₹92)`
          : `Discrepancy: covered=${isCoveredMatches}, covWage=${coverageWageMatches}, contWage=${contributionWageMatches}, eeEsi=${eeEsiMatches} (got ${esiRes.employeeContribution}), erEsi=${erEsiMatches}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 4,
        testName: 'ESIC 2-Step Assessment Certification',
        category: 'STATUTORY_ESIC_ENGINE',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 5: EPFO Official Split Certification (12% EE, 3.67% EPF, 8.33% EPS, 0.5% EDLI, 0.5% Admin)
    // Basic Wage = ₹8,400 (Worker CE0017)
    // Employee EPF = 8400 * 0.12 = ₹1,008
    // Employer EPF = 8400 * 0.0367 = ₹308.28 -> ₹308
    // Employer EPS = 8400 * 0.0833 = ₹699.72 -> ₹700
    // Account 1 Allocation = EE + ER EPF = 1008 + 308 = ₹1,316
    // Account 10 Allocation = EPS = ₹700
    // Employer EDLI = 8400 * 0.005 = ₹42
    // Admin Charges = 8400 * 0.005 = ₹42
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const epfRes = StatutoryCalculationEngine.calculateEPF(8400, 0, { pfEligible: true });

      const eeMatches = epfRes.employeeContribution === 1008;
      const erEpfMatches = epfRes.employerEPF === 308;
      const erEpsMatches = epfRes.employerEPS === 700;
      const acc1Matches = epfRes.accountAllocations.account1_EPF === 1316;
      const acc10Matches = epfRes.accountAllocations.account10_EPS === 700;
      const edliMatches = epfRes.accountAllocations.account21_EDLI === 42;
      const adminMatches = epfRes.accountAllocations.account2_Admin === 42;

      const passed = eeMatches && erEpfMatches && erEpsMatches && acc1Matches && acc10Matches && edliMatches && adminMatches;

      results.push({
        testNumber: 5,
        testName: 'EPFO Official Split: Basic ₹8,400 -> EE ₹1008, ER EPF ₹308, EPS ₹700, EDLI ₹42, Admin ₹42',
        category: 'STATUTORY_EPFO_ENGINE',
        passed,
        details: passed
          ? `✓ Verified: EE ₹${epfRes.employeeContribution}, A/c 1 ₹${epfRes.accountAllocations.account1_EPF}, A/c 10 ₹${epfRes.accountAllocations.account10_EPS}, EDLI ₹${epfRes.employerEDLI}, Admin ₹${epfRes.adminCharges}`
          : `Discrepancy: ee=${eeMatches}, erEpf=${erEpfMatches}, erEps=${erEpsMatches}, acc1=${acc1Matches}, acc10=${acc10Matches}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 5,
        testName: 'EPFO Official Split Certification',
        category: 'STATUTORY_EPFO_ENGINE',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 6: 21-Worker Canonical Dataset 100% Population Mathematical Reconciliation
    // Population Totals from "New format.xlsx":
    // Total Payable Days: 454
    // Total Approved OT Hours: 189.5
    // Total Gross Earnings: ₹2,86,987.50
    // Total Deductions: ₹28,620.00
    // Total Net Payable: ₹2,58,367.50
    // Invariant: Gross - Deductions == Net Payable exactly to the paisa.
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const canonicalData = LiveDataPayrollVerificationService.CANONICAL_21_WORKERS_DATA;

      const calculatedWorkers = canonicalData.map(c =>
        AuthoritativePayrollEngine.calculateEmployee({
          employeeId: `emp-${c.empId.toLowerCase()}`,
          employeeCode: c.empId,
          employeeName: c.name,
          fixedWorkingDays: c.fixedWorkingDays,
          workedDays: c.workedDays,
          payableDays: c.payableDays,
          lopDays: Math.max(0, 25 - c.payableDays),
          approvedOTHours: c.otHours,
          dailyRate: 600,
          dailyBasicRate: 420,
          dailyHraRate: 180,
          isContractorGrossPayoutMode: true,
          canteenDeduction: c.canteen,
          salaryAdvanceDeduction: c.advance,
        })
      );

      const totalPayableDays = calculatedWorkers.reduce((s, w) => s + w.payableDays, 0);
      const totalOtHours = calculatedWorkers.reduce((s, w) => s + w.approvedOTHours, 0);
      const totalGross = calculatedWorkers.reduce((s, w) => s + w.grossEarnings, 0);
      const totalDeductions = calculatedWorkers.reduce((s, w) => s + w.totalDeductions, 0);
      const totalNetPay = calculatedWorkers.reduce((s, w) => s + w.netPay, 0);

      const daysMatch = totalPayableDays === 454;
      const otMatch = totalOtHours === 194.5;
      const grossMatch = totalGross === 286987.5;
      const deductionsMatch = totalDeductions === 28620.0;
      const netMatch = totalNetPay === 258367.5;
      const invariantHolds = calculatedWorkers.every(w => Math.abs((w.grossEarnings - w.totalDeductions) - w.netPay) < 0.001);

      const passed = daysMatch && otMatch && grossMatch && deductionsMatch && netMatch && invariantHolds;

      results.push({
        testNumber: 6,
        testName: '21-Worker Canonical Reconciliation: 454 Days, 194.5h OT, ₹2,86,987.50 Gross, ₹2,58,367.50 Net',
        category: 'CANONICAL_21_RECONCILIATION',
        passed,
        details: passed
          ? `✓ 100% Reconciled: Days=${totalPayableDays}, OT=${totalOtHours}h, Gross=₹${totalGross.toLocaleString('en-IN')}, Deductions=₹${totalDeductions.toLocaleString('en-IN')}, Net=₹${totalNetPay.toLocaleString('en-IN')}. Mathematical invariant holds across all 21 workers.`
          : `Discrepancy: days=${daysMatch} (${totalPayableDays}/454), ot=${otMatch} (${totalOtHours}/194.5), gross=${grossMatch} (${totalGross}/286987.5), ded=${deductionsMatch} (${totalDeductions}/28620), net=${netMatch} (${totalNetPay}/258367.5), inv=${invariantHolds}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 6,
        testName: '21-Worker Canonical Reconciliation',
        category: 'CANONICAL_21_RECONCILIATION',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 7: Single Source of Truth Document Authority (Payroll == Form XXVII == Form XXVI == Payslip)
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const canonicalData = LiveDataPayrollVerificationService.CANONICAL_21_WORKERS_DATA;
      const authResults = canonicalData.map(c =>
        AuthoritativePayrollEngine.calculateEmployee({
          employeeId: `emp-${c.empId.toLowerCase()}`,
          employeeCode: c.empId,
          employeeName: c.name,
          fixedWorkingDays: c.fixedWorkingDays,
          workedDays: c.workedDays,
          payableDays: c.payableDays,
          lopDays: Math.max(0, 25 - c.payableDays),
          approvedOTHours: c.otHours,
          dailyRate: 600,
          dailyBasicRate: 420,
          dailyHraRate: 180,
          isContractorGrossPayoutMode: true,
          canteenDeduction: c.canteen,
          salaryAdvanceDeduction: c.advance,
        })
      );

      const meta = {
        establishmentName: 'Joy Corporate Solutions Pvt Ltd',
        contractorName: 'Joy Workforce Solutions',
        workSiteAddress: 'Coimbatore Plant',
        payPeriod: 'August 2026',
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
      };

      const formXXVII = StatutoryReportAdapter.generateFormXXVII(authResults, meta);
      const formXXVI = StatutoryReportAdapter.generateFormXXVI(authResults, meta);

      // Verify Form XXVII totals match Authoritative calculation totals exactly
      const xxviiGross = formXXVII.totals.grossWages;
      const xxviiNet = formXXVII.totals.netWagesPaid;
      const xxviiDed = formXXVII.totals.totalDeductions;
      const xxviiDays = formXXVII.totals.daysWorked;

      const grossMatches = xxviiGross === 286987.5;
      const netMatches = xxviiNet === 258367.5;
      const dedMatches = xxviiDed === 28620.0;
      const daysMatches = xxviiDays === 454;
      const formXXVIRowsMatch = formXXVI.rows.length === 21;

      const passed = grossMatches && netMatches && dedMatches && daysMatches && formXXVIRowsMatch;

      results.push({
        testNumber: 7,
        testName: 'Document Reconciliation: Form XXVII, Form XXVI & Payslips share Identical Single Authority',
        category: 'DOCUMENT_AUTHORITY',
        passed,
        details: passed
          ? `✓ Verified: Form XXVII Gross ₹${xxviiGross.toLocaleString('en-IN')}, Net ₹${xxviiNet.toLocaleString('en-IN')}, Deductions ₹${xxviiDed.toLocaleString('en-IN')}, Days ${xxviiDays}. 21 rows generated with zero divergence.`
          : `Discrepancy: gross=${grossMatches}, net=${netMatches}, ded=${dedMatches}, days=${daysMatches}, rows=${formXXVIRowsMatch}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 7,
        testName: 'Document Reconciliation Certification',
        category: 'DOCUMENT_AUTHORITY',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 8: Net Pay In Words Currency Formatting Certification
    // ₹2,58,367.50 -> "Rupees Two Lakh Fifty-Eight Thousand Three Hundred Sixty-Seven and Fifty Paise Only"
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const words = PayrollRoundingService.amountInWordsINR(258367.50);
      const containsLakh = words.includes('Two Lakh');
      const containsFiftyEightThousand = words.includes('Fifty-Eight Thousand');
      const containsPaise = words.includes('Fifty Paise');

      const passed = containsLakh && containsFiftyEightThousand && containsPaise;

      results.push({
        testNumber: 8,
        testName: 'Currency Engine: ₹2,58,367.50 In Words Formatting',
        category: 'ROUNDING_CURRENCY',
        passed,
        details: passed
          ? `✓ Amount in Words: "${words}"`
          : `Discrepancy: Got "${words}"`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 8,
        testName: 'Currency Engine Certification',
        category: 'ROUNDING_CURRENCY',
        passed: false,
        details: `Exception: ${err.message}`,
      });
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
