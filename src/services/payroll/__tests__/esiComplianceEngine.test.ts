// src/services/payroll/__tests__/esiComplianceEngine.test.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — Comprehensive ESIC Engine Test Suite
// Verifies All 10 Statutory, Upload, Reconciliation & Filing Test Cases
// ============================================================================

import { ESIEligibilityService } from '../esic/esiEligibilityService';
import { ESIReasonCodeService } from '../esic/esiReasonCodeMaster';
import { ESIReconciliationService } from '../esic/esiReconciliationService';
import { ESIUploadBuilderService } from '../esic/esiUploadBuilderService';
import { ESIValidationService } from '../esic/esiValidationService';
import { ESIXlsGeneratorService } from '../esic/esiXlsGeneratorService';
import { ESIFilingService } from '../esic/esiFilingService';
import { ESICUploadRow, ESICRegisteredIPMaster } from '../../../types/esicCompliance';
import { PayrollRun } from '../../../types/payroll';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
  console.log(`  ✓ ${message}`);
}

function assertCloseTo(actual: number, expected: number, delta = 0.05, message: string) {
  if (Math.abs(actual - expected) > delta) {
    throw new Error(`[TEST FAILED] ${message} — Expected ${expected}, got ${actual}`);
  }
  console.log(`  ✓ ${message} (${actual} ≈ ${expected})`);
}

export function runAllESICTests() {
  console.log('\n============================================================');
  console.log('RUNNING JOY PEOPLEHR ESIC COMPLIANCE & UPLOAD TEST SUITE');
  console.log('============================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 1: MANDATORY SALARY ₹20,000 + OT ₹3,000
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[TEST CASE 1] Salary ₹20,000 + OT ₹3,000:');
  const case1 = ESIEligibilityService.evaluateCoverageAndContribution({
    salaryWithoutOT: 20000,
    approvedOTRemuneration: 3000,
  });
  assert(case1.isCovered === true, 'Coverage evaluation: Employee is COVERED');
  assert(case1.coverageWage === 20000, 'Coverage Wage is ₹20,000 (OT strictly excluded)');
  assert(case1.overtimeWage === 3000, 'Overtime Wage is ₹3,000');
  assert(case1.contributionWage === 23000, 'Contribution Wage is ₹23,000 (₹20,000 + ₹3,000)');
  assertCloseTo(case1.employeeContribution, 172.50, 0.01, 'Employee Contribution is ₹172.50 (0.75% of ₹23,000)');
  assertCloseTo(case1.employerContribution, 747.50, 0.01, 'Employer Contribution is ₹747.50 (3.25% of ₹23,000)');
  assertCloseTo(case1.totalLiability, 920.00, 0.01, 'Total Liability is ₹920.00 (4.00% of ₹23,000)');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 2: SALARY ₹22,000 + OT ₹3,000 (ABOVE CEILING)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 2] Salary ₹22,000 + OT ₹3,000 (Exceeds Ceiling):');
  const case2 = ESIEligibilityService.evaluateCoverageAndContribution({
    salaryWithoutOT: 22000,
    approvedOTRemuneration: 3000,
    historicalCoverageStatus: 'NOT_COVERED',
  });
  assert(case2.isCovered === false, 'Coverage Wage ₹22,000 > ₹21,000 is NOT covered');
  assert(case2.contributionWage === 0, 'Contribution Wage is 0 for non-covered employee');
  assert(case2.employeeContribution === 0, 'Employee contribution is 0');

  // Continuing coverage in same contribution cycle
  const case2Cont = ESIEligibilityService.evaluateCoverageAndContribution({
    salaryWithoutOT: 22000,
    approvedOTRemuneration: 3000,
    historicalCoverageStatus: 'CONTINUING_COVERAGE',
  });
  assert(case2Cont.isCovered === true, 'Continuing coverage preserved across contribution period');
  assert(case2Cont.contributionWage === 25000, 'Contribution Wage is ₹25,000 under continuing coverage');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 3: ZERO WAGE + ON LEAVE (CODE 1, LWD BLANK)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 3] Zero Wage + On Leave (Code 1):');
  const rowCase3: ESICUploadRow = {
    id: 'row-3',
    tenant_id: 'org-joy-01',
    payroll_run_id: 'run-aug-2026',
    employee_id: 'emp-003',
    employee_code: 'JCS-003',
    col_a_ip_number: '5611336299',
    col_b_ip_name: 'Bharat Singh',
    col_c_days: 0,
    col_d_monthly_wages: 0,
    col_e_reason_code: 1, // On Leave
    col_f_last_working_day: '',
    internal_payable_days: 0,
    days_transformation_rule: 'CEILING',
    coverage_wage: 0,
    ot_wage: 0,
    employee_esi_contribution: 0,
    employer_esi_contribution: 0,
    reason_name: 'On Leave',
    validation_status: 'VALID',
    validation_errors: [],
    validation_warnings: [],
    source_snapshot_id: 'snap-3',
  };
  const val3 = ESIValidationService.validateRow(rowCase3);
  assert(val3.isValid === true, 'Zero wage + On Leave with blank LWD is VALID');
  assert(val3.errors.length === 0, 'No validation errors generated');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 4: ZERO WAGE + LEFT SERVICE (CODE 2, MANDATORY LWD)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 4] Zero Wage + Left Service (Code 2):');
  const rowCase4MissingLwd: ESICUploadRow = {
    ...rowCase3,
    id: 'row-4a',
    col_e_reason_code: 2, // Left Service
    col_f_last_working_day: '',
  };
  const val4a = ESIValidationService.validateRow(rowCase4MissingLwd);
  assert(val4a.isValid === false, 'Left Service without LWD is INVALID (Blocked)');
  assert(val4a.errors.some(e => e.includes('Last Working Day')), 'Errors contain mandatory LWD requirement');

  const rowCase4Valid: ESICUploadRow = {
    ...rowCase3,
    id: 'row-4b',
    col_e_reason_code: 2,
    col_f_last_working_day: '15/08/2026',
  };
  const val4b = ESIValidationService.validateRow(rowCase4Valid);
  assert(val4b.isValid === true, 'Left Service with valid LWD (15/08/2026) is VALID');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 5: REASON 1 (ON LEAVE) WITH UNEXPECTED LWD (MUST FAIL)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 5] Reason 1 (On Leave) with LWD supplied:');
  const rowCase5: ESICUploadRow = {
    ...rowCase3,
    id: 'row-5',
    col_e_reason_code: 1, // On Leave (prohibits LWD)
    col_f_last_working_day: '10/08/2026',
  };
  const val5 = ESIValidationService.validateRow(rowCase5);
  assert(val5.isValid === false, 'On Leave with LWD supplied is INVALID (LWD must be blank)');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 6: FRACTIONAL DAYS 30.4 -> CEILING 31
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 6] Integer Ceiling Transformation (30.4 -> 31):');
  const mockPayrollRun: PayrollRun = {
    id: 'run-test-days',
    tenant_id: 'org-joy-01',
    run_number: 'RUN-2026-08',
    pay_period: 'August 2026',
    period_start: '2026-08-01',
    period_end: '2026-08-31',
    payout_date: '2026-08-31',
    total_employees: 1,
    total_gross: 20000,
    total_deductions: 1580.50,
    total_net_payout: 18419.50,
    total_employer_statutory: 2047.50,
    total_payroll_cost: 22047.50,
    status: 'Finalized',
    is_locked: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    employee_records: [
      {
        id: 'rec-test-1',
        tenant_id: 'org-joy-01',
        payroll_run_id: 'run-test-days',
        employee_id: 'emp-001',
        employee_code: 'JCS-001',
        employee_name: 'Ravi Kumar',
        department: 'Operations',
        designation: 'Operator',
        total_working_days: 31,
        payable_days: 30.4, // Fractional internal days
        present_days: 26,
        paid_leave_days: 4,
        unpaid_leave_days: 0,
        lop_days: 0,
        overtime_hours: 0,
        ctc_annual: 240000,
        gross_fixed: 20000,
        basic: 10000,
        hra: 4000,
        special_allowance: 4400,
        conveyance: 1600,
        medical: 0,
        other_allowances: 0,
        overtime_pay: 0,
        incentives: 0,
        bonus: 0,
        reimbursements: 0,
        arrears: 0,
        total_earnings: 20000,
        lop_deduction: 0,
        epf_employee: 1200,
        esic_employee: 150,
        professional_tax: 208,
        tds_tax: 0,
        loan_emi: 0,
        advance_recovery: 0,
        other_deductions: 0,
        total_deductions: 1558,
        epf_employer: 1300,
        esic_employer: 650,
        net_pay: 18442,
        bank_name: 'HDFC Bank',
        ifsc_code: 'HDFC0000123',
        pan_number: '101297618960',
        account_number: '5610681980',
        has_exceptions: false,
        status: 'Calculated',
      },
    ],
  };

  const uploadRows = ESIUploadBuilderService.buildUploadRows({ payrollRun: mockPayrollRun });
  assert(uploadRows.length === 1, 'Extracted 1 ESIC upload row');
  assert(uploadRows[0].internal_payable_days === 30.4, 'Internal payable days preserved at 30.4');
  assert(uploadRows[0].col_c_days === 31, 'ESIC upload days transformed to 31 (CEILING)');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 7 & 8: INVALID & DUPLICATE IP DETECTION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 7 & 8] Invalid (9 Digits) & Duplicate IP:');
  const rowInvalidIp: ESICUploadRow = {
    ...rowCase3,
    id: 'row-inv',
    col_a_ip_number: '561068198', // Only 9 digits
  };
  const valInv = ESIValidationService.validateRow(rowInvalidIp);
  assert(valInv.isValid === false, '9-digit IP is INVALID');

  const batchDuplicate = ESIValidationService.validateBatch([
    rowCase3,
    { ...rowCase3, id: 'row-dup', employee_code: 'JCS-099' },
  ]);
  assert(batchDuplicate.hasBlockers === true, 'Duplicate IP across rows detected & BLOCKED');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 9: GENUINE LEGACY XLS GENERATION & INTEGRITY SELF-CHECK
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 9] Legacy ESIC XLS Generation & Self-Verification:');
  const batch = ESIUploadBuilderService.buildUploadBatch({ payrollRun: mockPayrollRun, rows: uploadRows, version: 1 });
  const xlsResult = ESIXlsGeneratorService.generateESICXls(batch);
  assert(xlsResult.success === true, 'XLS generation succeeded');
  assert(xlsResult.integrityVerified === true, 'Self-integrity verification check PASSED');
  assert(xlsResult.rowCount === 1, 'Row count matched exactly');
  assert(xlsResult.xlsContent.includes('IP Number (10 Digits)'), 'Official Header 1 verified');
  assert(xlsResult.xlsContent.includes('Total Monthly Wages'), 'Official Header 4 verified');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 10: FILING & CHALLAN RECONCILIATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 10] ESIC Filing & Challan Payment Reconciliation:');
  ESIFilingService.saveBatch(batch);
  const filing = ESIFilingService.recordPortalSubmission({
    payrollRunId: mockPayrollRun.id,
    submissionReference: 'ESIC-SUB-2026-08-991',
    submittedBy: 'HR Admin',
  });
  assert(filing.status === 'SUBMITTED', 'Filing status updated to SUBMITTED');

  const reconciledFiling = ESIFilingService.recordChallanPayment({
    payrollRunId: mockPayrollRun.id,
    challanNumber: '051261098234',
    challanDate: '2026-09-12',
    paymentReference: 'SBI-REF-91823',
    bankName: 'State Bank of India',
    challanAmount: batch.total_liability_amount,
    paidAmount: batch.total_liability_amount,
    paymentDate: '2026-09-14',
    recordedBy: 'Finance Head',
  });
  assert(reconciledFiling.status === 'RECONCILED', 'Filing reconciled with MATCHED payment status');
  assert(reconciledFiling.challan_record?.variance_amount === 0, 'Variance is exactly ₹0');

  console.log('\n============================================================');
  console.log('ALL 10 ESIC STATUTORY, UPLOAD & FILING TESTS PASSED (100%)');
  console.log('============================================================\n');
  return true;
}
