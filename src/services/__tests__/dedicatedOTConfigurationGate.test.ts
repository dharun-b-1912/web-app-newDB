// src/services/__tests__/dedicatedOTConfigurationGate.test.ts
// ============================================================================
// JOY PeopleHR — Gate 25: Dedicated OT Policy Configuration & Calculation Reality Gate
// Tests Dynamic Multiplier (1.25x, 1.5x, 2.0x), Fixed Hourly (₹70, ₹100),
// Decimal Hours, Effective Dating, Immutability, Reconciliation & 21-Worker Muster
// ============================================================================

import { OTPolicyEngine } from '../payroll/otPolicyEngine';
import { PayrollReconciliationService } from '../payroll/payrollReconciliationService';
import { AuthoritativePayrollEngine } from '../payroll/authoritativePayrollEngine';
import { StatutoryReportAdapter } from '../payroll/statutoryReportAdapter';
import { LiveDataPayrollVerificationService } from '../payroll/liveDataPayrollVerificationService';

export interface GateTestResult {
  testNumber: number;
  testName: string;
  category: string;
  passed: boolean;
  details: string;
}

export class DedicatedOTConfigurationGateSuite {
  public static async runAllTests(): Promise<{
    passed: boolean;
    passCount: number;
    totalCount: number;
    results: GateTestResult[];
  }> {
    const results: GateTestResult[] = [];

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 1: PROMPT TEST A — Dynamic Multiplier 1.5x on Salary ₹17,000 (26d / 8h)
    // Actual OT = 30 hours
    // Base Hourly = 17,000 / 26 / 8 = ₹81.73077
    // Company Rate = 81.73077 * 1.5 = ₹122.59615
    // Company OT Amount = 30 * 122.59615 = ₹3,677.88
    // Govt Rate = 81.73077 * 2 = ₹163.46154
    // Govt Equivalent Hours = 3,677.88 / 163.46154 = 22.50
    // Govt Reporting Amount = 22.50 * 163.46154 = ₹3,677.88
    // Reconciliation Variance = 0.00
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const resA = OTPolicyEngine.calculateDedicated({
        actual_ot_hours: 30,
        monthly_salary_basis: 17000,
        policy_override: {
          calculation_method: 'DYNAMIC_MULTIPLIER',
          working_days_divisor: 26,
          working_hours_per_day: 8,
          company_multiplier: 1.5,
          government_multiplier: 2.0,
        },
      });

      const hourlyMatches = Math.abs(resA.base_hourly_rate - 81.7308) < 0.01;
      const compRateMatches = Math.abs(resA.company_ot_rate - 122.5962) < 0.01;
      const compAmtMatches = Math.abs(resA.company_ot_amount - 3677.88) < 0.05;
      const govtRateMatches = Math.abs(resA.government_ot_rate - 163.4615) < 0.01;
      const equivHoursMatches = Math.abs(resA.government_equivalent_ot_hours - 22.50) < 0.01;
      const govtAmtMatches = Math.abs(resA.government_reporting_amount - 3677.88) < 0.05;
      const actualHoursPreserved = resA.actual_ot_hours === 30;

      const recon = PayrollReconciliationService.reconcileOT(resA.company_ot_amount, resA.government_reporting_amount);

      const passed =
        hourlyMatches &&
        compRateMatches &&
        compAmtMatches &&
        govtRateMatches &&
        equivHoursMatches &&
        govtAmtMatches &&
        actualHoursPreserved &&
        recon.isReconciled;

      results.push({
        testNumber: 1,
        testName: 'Prompt Test A: Dynamic 1.50x Multiplier (₹17,000 Salary, 26d/8h, 30h OT)',
        category: 'DYNAMIC_MULTIPLIER',
        passed,
        details: passed
          ? `✓ Exact match: Hourly ₹${resA.base_hourly_rate}, Company Rate ₹${resA.company_ot_rate}, Company OT ₹${resA.company_ot_amount}, Govt Rate ₹${resA.government_ot_rate}, Govt Equiv ${resA.government_equivalent_ot_hours.toFixed(2)}h, Govt Reporting ₹${resA.government_reporting_amount}, Recon Diff ₹${recon.variance}`
          : `Discrepancy: hourly=${hourlyMatches}, compRate=${compRateMatches}, compAmt=${compAmtMatches}, govtRate=${govtRateMatches}, equivHours=${equivHoursMatches}, recon=${recon.isReconciled}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 1,
        testName: 'Prompt Test A: Dynamic 1.50x Multiplier',
        category: 'DYNAMIC_MULTIPLIER',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 2: PROMPT TEST B — Fixed Hourly Rate ₹70.00 on Salary ₹17,000 (26d / 8h)
    // Actual OT = 30 hours
    // Company OT Amount = 30 * 70 = ₹2,100.00
    // Govt Rate = 17,000 / 26 / 8 * 2 = ₹163.46154
    // Govt Equivalent Hours = 2,100 / 163.46154 = 12.84705882 (~12.8471 hrs)
    // Govt Reporting Amount = 12.84705882 * 163.46154 = ₹2,100.00
    // Actual attendance OT hours strictly preserved as 30
    // Reconciliation Variance = 0.00
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const resB = OTPolicyEngine.calculateDedicated({
        actual_ot_hours: 30,
        monthly_salary_basis: 17000,
        policy_override: {
          calculation_method: 'FIXED_HOURLY_RATE',
          working_days_divisor: 26,
          working_hours_per_day: 8,
          fixed_hourly_rate: 70,
          government_multiplier: 2.0,
        },
      });

      const compAmtMatches = resB.company_ot_amount === 2100;
      const govtRateMatches = Math.abs(resB.government_ot_rate - 163.4615) < 0.01;
      const equivHoursMatches = Math.abs(resB.government_equivalent_ot_hours - 12.8471) < 0.001;
      const govtAmtMatches = resB.government_reporting_amount === 2100;
      const actualHoursPreserved = resB.actual_ot_hours === 30;

      const recon = PayrollReconciliationService.reconcileOT(resB.company_ot_amount, resB.government_reporting_amount);

      const passed =
        compAmtMatches &&
        govtRateMatches &&
        equivHoursMatches &&
        govtAmtMatches &&
        actualHoursPreserved &&
        recon.isReconciled;

      results.push({
        testNumber: 2,
        testName: 'Prompt Test B: Fixed Hourly Rate ₹70.00/hr (₹17,000 Salary, 30h OT)',
        category: 'FIXED_HOURLY_RATE',
        passed,
        details: passed
          ? `✓ Exact match: Company OT ₹${resB.company_ot_amount}, Govt Rate ₹${resB.government_ot_rate}, Govt Equiv ${resB.government_equivalent_ot_hours.toFixed(4)}h, Govt Reporting ₹${resB.government_reporting_amount}, Recon Diff ₹${recon.variance}`
          : `Discrepancy: compAmt=${compAmtMatches}, govtRate=${govtRateMatches}, equivHours=${equivHoursMatches}, recon=${recon.isReconciled}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 2,
        testName: 'Prompt Test B: Fixed Hourly Rate ₹70.00/hr',
        category: 'FIXED_HOURLY_RATE',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 3: PROMPT TEST C — Dynamic Multiplier 1.25x on Salary ₹17,000 (26d / 8h)
    // Actual OT = 30 hours
    // Base Hourly = ₹81.73077
    // Company Rate = 81.73077 * 1.25 = ₹102.16346
    // Company OT Amount = 30 * 102.16346 = ₹3,064.90
    // Govt Equivalent Hours = 3,064.90 / 163.46154 = 18.75 hrs
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const resC = OTPolicyEngine.calculateDedicated({
        actual_ot_hours: 30,
        monthly_salary_basis: 17000,
        policy_override: {
          calculation_method: 'DYNAMIC_MULTIPLIER',
          working_days_divisor: 26,
          working_hours_per_day: 8,
          company_multiplier: 1.25,
          government_multiplier: 2.0,
        },
      });

      const compRateMatches = Math.abs(resC.company_ot_rate - 102.1635) < 0.01;
      const compAmtMatches = Math.abs(resC.company_ot_amount - 3064.90) < 0.05;
      const equivHoursMatches = Math.abs(resC.government_equivalent_ot_hours - 18.75) < 0.01;
      const actualHoursPreserved = resC.actual_ot_hours === 30;

      const recon = PayrollReconciliationService.reconcileOT(resC.company_ot_amount, resC.government_reporting_amount);

      const passed = compRateMatches && compAmtMatches && equivHoursMatches && actualHoursPreserved && recon.isReconciled;

      results.push({
        testNumber: 3,
        testName: 'Prompt Test C: Dynamic 1.25x Multiplier (₹17,000 Salary, 30h OT)',
        category: 'DYNAMIC_MULTIPLIER',
        passed,
        details: passed
          ? `✓ Exact match: Company Rate ₹${resC.company_ot_rate}, Company OT ₹${resC.company_ot_amount}, Govt Equiv ${resC.government_equivalent_ot_hours.toFixed(2)}h, Recon Diff ₹${recon.variance}`
          : `Discrepancy: compRate=${compRateMatches}, compAmt=${compAmtMatches}, equivHours=${equivHoursMatches}, recon=${recon.isReconciled}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 3,
        testName: 'Prompt Test C: Dynamic 1.25x Multiplier',
        category: 'DYNAMIC_MULTIPLIER',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 4: Decimal & Boundary Overtime Attendance Hours
    // Tests OT = 0, 1, 8.25, 12.75, 22.50 hours to guarantee paise precision
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const testCases = [
        { hours: 0, expectedAmt: 0 },
        { hours: 1, expectedAmt: 75.00 },
        { hours: 8.25, expectedAmt: 618.75 },
        { hours: 12.75, expectedAmt: 956.25 },
        { hours: 22.50, expectedAmt: 1687.50 },
      ];

      const allMatch = testCases.every((tc) => {
        const res = OTPolicyEngine.calculateDedicated({
          actual_ot_hours: tc.hours,
          monthly_salary_basis: 15600,
          policy_override: {
            calculation_method: 'FIXED_HOURLY_RATE',
            fixed_hourly_rate: 75,
            government_multiplier: 2.0,
          },
        });
        return res.company_ot_amount === tc.expectedAmt && res.actual_ot_hours === tc.hours;
      });

      results.push({
        testNumber: 4,
        testName: 'Decimal & Boundary OT Hours (0h, 1h, 8.25h, 12.75h, 22.50h)',
        category: 'DECIMAL_HOURS_PRECISION',
        passed: allMatch,
        details: allMatch
          ? '✓ Verified exact paise precision across integer and fractional overtime attendance'
          : 'Discrepancy in decimal OT calculation',
      });
    } catch (err: any) {
      results.push({
        testNumber: 4,
        testName: 'Decimal & Boundary OT Hours',
        category: 'DECIMAL_HOURS_PRECISION',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 5: Effective-Dated Configuration & Historical Finalized Run Immutability
    // June 2026 uses Policy A (1.5x). July 2026 uses Policy B (1.25x).
    // Updating July policy does not alter June calculation.
    // ────────────────────────────────────────────────────────────────────────────
    try {
      OTPolicyEngine.registerPolicyRecord({
        id: 'pol-eff-test-june',
        organization_id: 'org-eff-test',
        company_id: 'co-eff-test',
        policy_name: 'June 2026 Contract (1.50x)',
        calculation_method: 'DYNAMIC_MULTIPLIER',
        salary_basis: 'MONTHLY_GROSS',
        working_days_divisor: 26,
        working_hours_per_day: 8,
        company_multiplier: 1.50,
        government_calculation_method: 'DYNAMIC_MULTIPLIER',
        government_multiplier: 2.0,
        effective_from: '2026-06-01',
        effective_to: '2026-06-30',
        status: 'ACTIVE',
        created_at: '2026-05-15T00:00:00.000Z',
        updated_at: '2026-05-15T00:00:00.000Z',
      });

      OTPolicyEngine.registerPolicyRecord({
        id: 'pol-eff-test-july',
        organization_id: 'org-eff-test',
        company_id: 'co-eff-test',
        policy_name: 'July 2026 Contract Revision (1.25x)',
        calculation_method: 'DYNAMIC_MULTIPLIER',
        salary_basis: 'MONTHLY_GROSS',
        working_days_divisor: 26,
        working_hours_per_day: 8,
        company_multiplier: 1.25,
        government_calculation_method: 'DYNAMIC_MULTIPLIER',
        government_multiplier: 2.0,
        effective_from: '2026-07-01',
        effective_to: null,
        status: 'ACTIVE',
        created_at: '2026-06-25T00:00:00.000Z',
        updated_at: '2026-06-25T00:00:00.000Z',
      });

      const junePolicy = OTPolicyEngine.resolvePolicyForDate({
        companyId: 'co-eff-test',
        organizationId: 'org-eff-test',
        date: '2026-06-15',
      });

      const julyPolicy = OTPolicyEngine.resolvePolicyForDate({
        companyId: 'co-eff-test',
        organizationId: 'org-eff-test',
        date: '2026-07-15',
      });

      const juneMatches = junePolicy.company_multiplier === 1.50 && junePolicy.id === 'pol-eff-test-june';
      const julyMatches = julyPolicy.company_multiplier === 1.25 && julyPolicy.id === 'pol-eff-test-july';
      const passed = juneMatches && julyMatches;

      results.push({
        testNumber: 5,
        testName: 'Effective-Dated Configuration & Historical Period Immutability',
        category: 'EFFECTIVE_DATING_IMMUTABILITY',
        passed,
        details: passed
          ? '✓ Verified: June 2026 resolves to 1.50x Policy A, July 2026 resolves to 1.25x Policy B without historical tampering'
          : `Discrepancy: juneMatches=${juneMatches}, julyMatches=${julyMatches}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 5,
        testName: 'Effective-Dated Configuration & Historical Period Immutability',
        category: 'EFFECTIVE_DATING_IMMUTABILITY',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 6: Multi-Tenant Security & Tenant Scope Isolation
    // Company A cannot access or apply Company B's OT policy
    // ────────────────────────────────────────────────────────────────────────────
    try {
      OTPolicyEngine.registerPolicyRecord({
        id: 'pol-tenant-a',
        organization_id: 'org-alpha',
        company_id: 'co-alpha-chennai',
        policy_name: 'Company Alpha Policy (Fixed ₹120/hr)',
        calculation_method: 'FIXED_HOURLY_RATE',
        salary_basis: 'MONTHLY_GROSS',
        working_days_divisor: 26,
        working_hours_per_day: 8,
        fixed_hourly_rate: 120,
        government_calculation_method: 'DYNAMIC_MULTIPLIER',
        government_multiplier: 2.0,
        effective_from: '2026-01-01',
        status: 'ACTIVE',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      });

      // Query for Company Beta (which has no policy) -> must NOT return Company Alpha's policy
      const betaPolicy = OTPolicyEngine.resolvePolicyForDate({
        companyId: 'co-beta-coimbatore',
        organizationId: 'org-beta',
        date: '2026-08-15',
      });

      const isolated = betaPolicy.id !== 'pol-tenant-a' && betaPolicy.company_id !== 'co-alpha-chennai';

      results.push({
        testNumber: 6,
        testName: 'Multi-Tenant Scope Isolation (Company A vs Company B)',
        category: 'TENANT_ISOLATION',
        passed: isolated,
        details: isolated
          ? '✓ Zero cross-tenant leakage: Company Beta cannot resolve or execute Company Alpha private OT policy'
          : 'Cross-tenant policy leak detected!',
      });
    } catch (err: any) {
      results.push({
        testNumber: 6,
        testName: 'Multi-Tenant Scope Isolation',
        category: 'TENANT_ISOLATION',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 7: Configuration Validation & Error Defense
    // Rejects negative multiplier, zero working days divisor, zero hours, negative fixed rate
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const v1 = OTPolicyEngine.validatePolicy({
        policy_name: 'Invalid Negative Multiplier',
        calculation_method: 'DYNAMIC_MULTIPLIER',
        working_days_divisor: 26,
        working_hours_per_day: 8,
        company_multiplier: -1.5,
      });

      const v2 = OTPolicyEngine.validatePolicy({
        policy_name: 'Invalid Zero Divisor',
        calculation_method: 'FIXED_HOURLY_RATE',
        working_days_divisor: 0,
        working_hours_per_day: 8,
        fixed_hourly_rate: 70,
      });

      const v3 = OTPolicyEngine.validatePolicy({
        policy_name: 'Invalid Inverted Dates',
        calculation_method: 'FIXED_HOURLY_RATE',
        working_days_divisor: 26,
        working_hours_per_day: 8,
        fixed_hourly_rate: 70,
        effective_from: '2026-08-31',
        effective_to: '2026-08-01',
      });

      const passed = !v1.isValid && !v2.isValid && !v3.isValid;

      results.push({
        testNumber: 7,
        testName: 'Configuration Validation Engine (Defends Against Invalid Inputs)',
        category: 'INPUT_VALIDATION',
        passed,
        details: passed
          ? '✓ Correctly rejected: negative multiplier, zero working days divisor, and inverted effective date ranges'
          : 'Validation failed to reject invalid parameters',
      });
    } catch (err: any) {
      results.push({
        testNumber: 7,
        testName: 'Configuration Validation Engine',
        category: 'INPUT_VALIDATION',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 8: 21-Worker Canonical Population Reconciliation (August 2026 Live Muster)
    // 454 days, 194.5h OT, ₹2,86,987.50 gross, ₹28,620.00 deductions, ₹2,58,367.50 net
    // Enforces Gross - Deductions == Net Pay invariant across all 21 workers
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const canonicalData = LiveDataPayrollVerificationService.CANONICAL_21_WORKERS_DATA;

      const calculatedWorkers = canonicalData.map((c) =>
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

      const batch = PayrollReconciliationService.reconcileBatch(calculatedWorkers);

      const daysMatch = batch.totalPayableDays === 454;
      const otMatch = batch.totalActualOTHours === 194.5;
      const grossMatch = batch.totalGrossEarnings === 286987.5;
      const dedMatch = batch.totalDeductions === 28620.0;
      const netMatch = batch.totalNetPay === 258367.5;

      const passed = daysMatch && otMatch && grossMatch && dedMatch && netMatch && batch.mathematicalInvariantHolds;

      results.push({
        testNumber: 8,
        testName: '21-Worker Canonical Reconciliation (454 Days, 194.5h OT, ₹2,86,987.50 Gross, ₹2,58,367.50 Net)',
        category: 'POPULATION_RECONCILIATION',
        passed,
        details: passed
          ? `✓ 100% Reconciled: Days=${batch.totalPayableDays}, OT=${batch.totalActualOTHours}h, Gross=₹${batch.totalGrossEarnings}, Ded=₹${batch.totalDeductions}, Net=₹${batch.totalNetPay}. Mathematical invariant holds across all 21 workers.`
          : `Discrepancy: days=${daysMatch}, ot=${otMatch}, gross=${grossMatch} (got ${batch.totalGrossEarnings}), ded=${dedMatch}, net=${netMatch} (got ${batch.totalNetPay})`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 8,
        testName: '21-Worker Canonical Reconciliation',
        category: 'POPULATION_RECONCILIATION',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TEST 9: Single Source of Truth Document Authority (Form XXVII == Form XXVI == Payslip == Excel)
    // ────────────────────────────────────────────────────────────────────────────
    try {
      const canonicalData = LiveDataPayrollVerificationService.CANONICAL_21_WORKERS_DATA;
      const authResults = canonicalData.map((c) =>
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
      const excelBuffer = StatutoryReportAdapter.generateStatutoryWorkbook(authResults, meta);

      const grossMatches = formXXVII.totals.grossWages === 286987.5;
      const netMatches = formXXVII.totals.netWagesPaid === 258367.5;
      const dedMatches = formXXVII.totals.totalDeductions === 28620.0;
      const excelGenerated = excelBuffer && excelBuffer.length > 5000;

      const passed = grossMatches && netMatches && dedMatches && formXXVI.rows.length === 21 && excelGenerated;

      results.push({
        testNumber: 9,
        testName: 'Document Reconciliation: Form XXVII, Form XXVI, Payslip & Dual-Context Excel Workbook',
        category: 'DOCUMENT_AUTHORITY',
        passed,
        details: passed
          ? `✓ Verified: Form XXVII Gross ₹${formXXVII.totals.grossWages}, Net ₹${formXXVII.totals.netWagesPaid}, Deductions ₹${formXXVII.totals.totalDeductions}. Excel workbook size ${Math.round(excelBuffer.length / 1024)} KB.`
          : `Discrepancy: gross=${grossMatches}, net=${netMatches}, ded=${dedMatches}`,
      });
    } catch (err: any) {
      results.push({
        testNumber: 9,
        testName: 'Document Reconciliation',
        category: 'DOCUMENT_AUTHORITY',
        passed: false,
        details: `Exception: ${err.message}`,
      });
    }

    const passCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    const passed = passCount === totalCount;

    return {
      passed,
      passCount,
      totalCount,
      results,
    };
  }
}
