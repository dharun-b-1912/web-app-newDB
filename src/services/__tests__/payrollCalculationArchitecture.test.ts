// src/services/__tests__/payrollCalculationArchitecture.test.ts
// ============================================================================
// Joy PeopleHR — Automated Payroll Architecture & Statutory Verification Suite
// Validates:
// 1. 1-Click Auto Run calculation & storage without ReferenceError
// 2. Elimination of 0-headcount ghost runs with blank pay period
// 3. Statutory Reports & ECR non-zero EPFO/ESIC split (PF Wage, EE EPF, ER EPS, A/C 1, ESI)
// 4. Payslip Symmetrical Breakdown & Mathematical Invariant: Net <= Gross <= CTC
// ============================================================================

import { payrollApi } from '../payrollApi';
import { StatutoryAuditEngine } from '../payroll/statutoryAuditEngine';
import { LiveDataPayrollVerificationService } from '../payroll/liveDataPayrollVerificationService';
import { PayslipGeneratorService } from '../payroll/payslipGeneratorService';
import { PayrollCalculationEngine } from '../payroll/payrollCalculationEngine';

export async function runPayrollCalculationArchitectureTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n============================================================');
  console.log('  PAYROLL CALCULATION ARCHITECTURE & STATUTORY REALITY SUITE');
  console.log('============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Seed 21 Workers and verify valid run list
  // ──────────────────────────────────────────────────────────────────────────
  const seedRes = LiveDataPayrollVerificationService.seed21WorkersIntoPlatform('CMP-TEST-ORG');
  assert(seedRes.success && seedRes.count === 21, `Test 1: Ingested 21 workers successfully (count: ${seedRes.count})`);

  const runs = payrollApi.getPayrollRuns();
  assert(runs.length > 0, `Test 2: Payroll runs retrieved successfully (found: ${runs.length})`);

  const hasGhostRun = runs.some(r => r.total_employees === 0 && r.total_gross === 0 && (!r.pay_period || r.pay_period.trim() === '' || r.pay_period === 'to'));
  assert(!hasGhostRun, 'Test 3: Zero ghost runs with blank pay period or 0 employees found');

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4: 1-Click Auto Run calculation executes without TDZ/ReferenceError
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const autoRun = await payrollApi.calculatePayrollRun(
      'September 2026',
      '2026-09-01',
      '2026-09-30',
      '2026-09-30'
    );
    assert(autoRun.total_employees > 0, `Test 4: 1-Click Auto Run calculated successfully (${autoRun.total_employees} staff, Gross: ₹${autoRun.total_gross})`);
    assert(autoRun.total_net_payout > 0, `Test 5: 1-Click Auto Run net payout calculated (Net: ₹${autoRun.total_net_payout})`);
  } catch (err: any) {
    assert(false, `Test 4: 1-Click Auto Run threw unexpected error: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test 6: Statutory Audit Engine generates non-zero EPFO/ESIC split
  // ──────────────────────────────────────────────────────────────────────────
  const targetRun = payrollApi.getPayrollRuns()[0];
  const salaries = payrollApi.getEmployeeSalariesSync();
  const snapshot = StatutoryAuditEngine.createSnapshot(
    'statutory_liability',
    'Test Statutory Snapshot',
    targetRun,
    salaries as any[],
    {
      tenantId: 'org-test',
      orgId: 'org-test',
      orgName: 'JOY CORPORATE SOLUTIONS',
      legalEntityName: 'JOY CORPORATE SOLUTIONS PVT LTD',
      establishmentName: 'Joy Corporate Solutions',
      establishmentAddress: 'Coimbatore Plant',
      userRole: 'Payroll Superadmin',
      userName: 'HR Administrator',
    }
  );

  assert(snapshot.records.length > 0, `Test 6: Statutory snapshot records generated (${snapshot.records.length} records)`);
  
  const worker1 = snapshot.records[0];
  assert(worker1.gross_wage > 0, `Test 7: Employee 1 Gross Wage is valid (₹${worker1.gross_wage})`);
  assert(worker1.pf_wage > 0, `Test 8: Employee 1 PF Wage is non-zero (₹${worker1.pf_wage})`);
  assert(worker1.employee_epf > 0, `Test 9: Employee 1 EE EPF (12%) is non-zero (₹${worker1.employee_epf})`);
  assert(worker1.employer_eps > 0, `Test 10: Employee 1 ER EPS (8.33%) is non-zero (₹${worker1.employer_eps})`);
  assert(worker1.account_1_allocation > 0, `Test 11: Employee 1 Account 1 (15.67%) is non-zero (₹${worker1.account_1_allocation})`);
  const esiWorker = snapshot.records.find(r => r.total_esi_liability > 0) || worker1;
  assert(snapshot.records.some(r => r.total_esi_liability > 0) || snapshot.total_esi_liability > 0, `Test 12: Statutory Snapshot ESI Liability is non-zero (₹${snapshot.total_esi_liability})`);

  // ──────────────────────────────────────────────────────────────────────────
  // Test 13: Symmetrical Payslip Breakdown & Invariants
  // ──────────────────────────────────────────────────────────────────────────
  const { viewModel } = PayslipGeneratorService.buildPayslipViewModel('CE0017', 'August 2026');
  assert(viewModel.totals.grossEarnings === 12225, `Test 13: CE0017 Payslip Gross Earnings is exact ₹12,225 (got: ₹${viewModel.totals.grossEarnings})`);
  assert(viewModel.totals.netPayable === 12225, `Test 14: CE0017 Payslip Net Take-Home is exact ₹12,225 (got: ₹${viewModel.totals.netPayable})`);
  
  const erContrib = viewModel.totals.totalEmployerContributions || 0;
  const ctc = viewModel.totals.grossEarnings + erContrib;
  assert(viewModel.totals.netPayable <= viewModel.totals.grossEarnings, 'Test 15: Invariant Net Take-Home <= Gross Earnings holds');
  assert(viewModel.totals.grossEarnings <= ctc, `Test 16: Invariant Gross Earnings <= CTC holds (Gross: ₹${viewModel.totals.grossEarnings}, CTC: ₹${ctc})`);

  // ──────────────────────────────────────────────────────────────────────────
  // Test 17: CTC Breakdown Engine (CTC Inclusive vs Gross Based)
  // ──────────────────────────────────────────────────────────────────────────
  const ctcInclusive = PayrollCalculationEngine.calculateCtcBreakdown(18000, 'CTC_INCLUSIVE');
  assert(ctcInclusive.grossEarnings < 18000, `Test 17: CTC_INCLUSIVE derives Gross from CTC (CTC: ₹18,000 -> Gross: ₹${ctcInclusive.grossEarnings})`);
  assert(ctcInclusive.isReconciled, 'Test 18: CTC_INCLUSIVE breakdown is mathematically reconciled');

  const grossBased = PayrollCalculationEngine.calculateCtcBreakdown(18000, 'GROSS_BASED');
  assert(grossBased.grossEarnings === 18000, `Test 19: GROSS_BASED keeps fixed Gross (Gross: ₹${grossBased.grossEarnings} -> CTC: ₹${grossBased.totalEmployerCost})`);
  assert(grossBased.totalEmployerCost > 18000, 'Test 20: GROSS_BASED adds employer contributions to CTC');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}
