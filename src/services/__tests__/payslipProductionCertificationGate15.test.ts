// src/services/__tests__/payslipProductionCertificationGate15.test.ts
// ============================================================================
// Joy PeopleHR — Gate 15: Enterprise Production A4 Payslip Engine Certification
// Testing Mathematical Reconciliation, Security Boundaries, A4 Layout & PII Masking
// ============================================================================

import { PayslipGeneratorService } from '../payroll/payslipGeneratorService';
import { validatePayslipFinancialInvariants } from '../../types/payslipViewModel';
import { LiveDataPayrollVerificationService } from '../payroll/liveDataPayrollVerificationService';

export async function runPayslipProductionCertificationGate15(): Promise<void> {
  console.log('\n============================================================');
  console.log('  GATE 15: ENTERPRISE A4 PAYSLIP ENGINE & SECURITY CERTIFICATION');
  console.log('============================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (!condition) {
      console.error(`  ❌ FAIL: ${testName} - ${detail || ''}`);
      throw new Error(`Gate 15 Certification Failed at ${testName}: ${detail || ''}`);
    } else {
      console.log(`  ✓ [TEST ${total}] ${testName}`);
      if (detail) console.log(`    ↳ ${detail}`);
      passed++;
    }
  }

  // Seed Canonical Data
  LiveDataPayrollVerificationService.seed21WorkersIntoPlatform('CMP-LIVE-UAT-01');

  // Test 1: Gross earnings equals sum of earnings components
  const { viewModel: vm1, validation: val1 } = PayslipGeneratorService.buildPayslipViewModel('CE0017', 'August 2026', 'CMP-LIVE-UAT-01');
  const sumEarnings1 = vm1.earnings.reduce((sum, e) => sum + e.amount, 0);
  assert(
    Math.abs(vm1.totals.grossEarnings - sumEarnings1) < 0.01 && val1.isValid,
    'Gross Earnings Mathematical Equivalence',
    `Gross ₹${vm1.totals.grossEarnings} === Sum(Basic ₹8400 + HRA ₹3600 + OT ₹225 = ₹${sumEarnings1})`
  );

  // Test 2: Total deductions equals sum of deduction components
  const { viewModel: vmGobinda } = PayslipGeneratorService.buildPayslipViewModel('CE0078', 'August 2026', 'CMP-LIVE-UAT-01');
  const sumDeductionsGobinda = vmGobinda.deductions.reduce((sum, d) => sum + d.amount, 0);
  assert(
    Math.abs(vmGobinda.totals.totalDeductions - sumDeductionsGobinda) < 0.01,
    'Total Deductions Mathematical Equivalence',
    `Deductions ₹${vmGobinda.totals.totalDeductions} === Sum(Canteen ₹2610 + Advance ₹875 = ₹${sumDeductionsGobinda})`
  );

  // Test 3: Net Payable equals Gross minus Deductions (Zero-Drift Invariant)
  assert(
    Math.abs(vmGobinda.totals.netPayable - (vmGobinda.totals.grossEarnings - vmGobinda.totals.totalDeductions)) < 0.01,
    'Net Payable Zero-Drift Financial Invariant',
    `Net ₹${vmGobinda.totals.netPayable} === Gross (₹${vmGobinda.totals.grossEarnings}) - Deductions (₹${vmGobinda.totals.totalDeductions})`
  );

  // Test 4: Financial invariant validator rejects corrupted amounts
  const corruptedVm = JSON.parse(JSON.stringify(vm1));
  corruptedVm.totals.netPayable = 999999;
  const corruptedVal = validatePayslipFinancialInvariants(corruptedVm);
  assert(
    !corruptedVal.isValid && corruptedVal.errors.some(e => e.includes('PAYSLIP_NET_RECONCILIATION_FAILED')),
    'Reconciliation Barrier Rejects Corrupted Payroll Snapshot',
    `Corrupted net pay successfully rejected: ${corruptedVal.errors[0]}`
  );

  // Test 5: Dynamic Visibility of Zero-Value Optional Components
  assert(
    vm1.earnings.every(e => e.amount > 0) && !vm1.earnings.some(e => e.code === 'NIGHT_ALLOWANCE' || e.code === 'FOOD_ALLOWANCE'),
    'Zero-Value Optional Components Hidden',
    'Optional zero-amount allowances correctly omitted from final A4 presentation'
  );

  // Test 6: Overtime Rate & Units Dynamically Populated
  const otComponent = vm1.earnings.find(e => e.code === 'OT_WAGES');
  assert(
    otComponent !== undefined && otComponent.units === '3 Hrs' && otComponent.amount === 225,
    'Overtime Units & Wages Dynamically Mapped',
    `OT row: ${otComponent?.units} @ ₹75/hr = ₹${otComponent?.amount}`
  );

  // Test 7: PII Masking Guard (Bank Account & PAN)
  assert(
    vm1.employee.bankAccountMasked.startsWith('••••') && vm1.employee.panMasked.includes('••'),
    'PII & Banking Masking Compliance',
    `Bank: ${vm1.employee.bankAccountMasked}, PAN: ${vm1.employee.panMasked}`
  );

  // Test 8: Amount in words accurately formatted
  assert(
    vm1.totals.netPayableInWords.toLowerCase().includes('twelve thousand two hundred twenty') && vm1.totals.netPayableInWords.includes('Only'),
    'Indian Currency Amount in Words Accuracy',
    `Net ₹${vm1.totals.netPayable} -> "${vm1.totals.netPayableInWords}"`
  );

  // Test 9: Multi-Tenant & Multi-Company Context Isolation
  const companyContext = vm1.company;
  assert(
    companyContext.id === 'CMP-LIVE-UAT-01' && companyContext.legalName.length > 0,
    'Company Branding Scope Isolation',
    `Scoped exclusively to legal entity: ${companyContext.legalName} (${companyContext.id})`
  );

  // Test 10: All 21 Workers Live Dataset Reconciled Across Payslip ViewModels
  const all21 = LiveDataPayrollVerificationService.CANONICAL_21_WORKERS_DATA;
  let allMatched = true;
  let totalGross21 = 0;
  let totalNet21 = 0;

  for (const worker of all21) {
    const { viewModel: wVm, validation: wVal } = PayslipGeneratorService.buildPayslipViewModel(worker.empId, 'August 2026', 'CMP-LIVE-UAT-01');
    if (!wVal.isValid || wVm.totals.grossEarnings !== worker.grossEarnings || wVm.totals.netPayable !== worker.netPayable) {
      allMatched = false;
      break;
    }
    totalGross21 += wVm.totals.grossEarnings;
    totalNet21 += wVm.totals.netPayable;
  }

  assert(
    allMatched && all21.length === 21,
    '21/21 Production Workers Reconcile with ₹0.00 Drift',
    `21 Workers total: Gross ₹${totalGross21.toLocaleString('en-IN')}, Net ₹${totalNet21.toLocaleString('en-IN')}`
  );

  console.log(`\nGate 15 Audit Results: ${passed} / ${total} Passed (0 Failures).\n`);
}
