// src/services/payroll/__tests__/epfoEcrEngine.test.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — Production EPFO ECR Test Suite
// Verifies M.VIJAYAKUMAR (Full-Month) & RAJANI ORAM (Partial-Month, 16 W Days)
// Validates 27-Column Workbook Reproduction & Q=G Company Formula
// ============================================================================

import { EPFWageClassificationService } from '../epfo/epfWageClassificationService';
import { EPFEcrValidationService } from '../epfo/epfEcrValidationService';
import { EPFEcrMappingEngine } from '../epfo/epfEcrMappingEngine';
import { EPFEcrGeneratorService } from '../epfo/epfEcrGeneratorService';
import { EPFFilingService } from '../epfo/epfFilingService';
import { EPFOEcrRow } from '../../../types/epfoCompliance';
import { PayrollRun } from '../../../types/payroll';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[TEST FAILED] ${message}`);
  console.log(`  ✓ ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`[TEST FAILED] ${message} — Expected ${expected}, got ${actual}`);
  }
  console.log(`  ✓ ${message} (${actual} === ${expected})`);
}

export function runAllEPFOTests() {
  console.log('\n============================================================');
  console.log('RUNNING JOY PEOPLEHR EPFO ECR & WORKBOOK REPRODUCTION SUITE');
  console.log('============================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 1: FULL-MONTH GOLDEN RECORD (M.VIJAYAKUMAR)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[TEST CASE 1] Full-Month Golden Record (M.VIJAYAKUMAR):');
  const split1 = EPFWageClassificationService.calculateStatutorySplit({
    grossEarnings: 15000,
    basicSalary: 15000,
    pfCapped: true,
    epsEligible: true,
    edliEligible: true,
    mappingMode: 'COMPANY_MIGRATION_V1',
  });

  assertEqual(split1.grossWages, 15000, 'ECR Gross is ₹15,000 (Q=G PF Wages)');
  assertEqual(split1.epfWages, 15000, 'EPF Wage is ₹15,000');
  assertEqual(split1.epsWages, 15000, 'EPS Wage is ₹15,000');
  assertEqual(split1.edliWages, 15000, 'EDLI Wage is ₹15,000');
  assertEqual(split1.epfContributionRemitted, 1800, 'EPF Remitted is ₹1,800 (12%)');
  assertEqual(split1.epsContributionRemitted, 1250, 'EPS Remitted is ₹1,250 (8.33% capped)');
  assertEqual(split1.epfEpsDifference, 550, 'EPF/EPS Difference is ₹550 (₹1,800 - ₹1,250)');

  const goldenRow1: EPFOEcrRow = {
    id: 'golden-1',
    tenant_id: 'org-joy-01',
    payroll_run_id: 'run-aug-2026',
    employee_id: 'emp-001',
    employee_code: 'JCS-001',
    mapping_mode: 'COMPANY_MIGRATION_V1',
    field_1_uan: '101297618960',
    field_2_member_name: 'M.VIJAYAKUMAR',
    field_3_gross_wages: 15000,
    field_4_epf_wages: 15000,
    field_5_eps_wages: 15000,
    field_6_edli_wages: 15000,
    field_7_epf_contribution_remitted: 1800,
    field_8_eps_contribution_remitted: 1250,
    field_9_epf_eps_difference: 550,
    field_10_ncp_days: 0,
    field_11_refund_of_advance: 0,
    raw_ecr_line: '',
    working_days: 31,
    esi_wages: 15000,
    esi_contribution: 0,
    esi_ip_number: '5610681980',
    eps_eligible: true,
    edli_eligible: true,
    employer_pf_cost_13: 1950,
    employer_gov_portion_1: 150,
    validation_status: 'VALID',
    validation_errors: [],
    validation_warnings: [],
    source_snapshot_id: 'snap-1',
  };

  const line1 = EPFEcrGeneratorService.formatRow(goldenRow1);
  const expectedLine1 = '101297618960#~#M.VIJAYAKUMAR#~#15000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#0#~#0';
  assertEqual(line1, expectedLine1, 'M.VIJAYAKUMAR matches golden line character-for-character');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 2: PARTIAL-MONTH GOLDEN RECORD (RAJANI ORAM, 16 W DAYS)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 2] Partial-Month Golden Record (RAJANI ORAM, 16 Working Days):');
  const split2 = EPFWageClassificationService.calculateStatutorySplit({
    grossEarnings: 8341,
    basicSalary: 7767,
    pfCapped: true,
    epsEligible: true,
    edliEligible: true,
    mappingMode: 'COMPANY_MIGRATION_V1',
  });

  assertEqual(split2.grossWages, 7767, 'ECR Gross is ₹7,767 (Q=G PF Wages in Company Migration Mode)');
  assertEqual(split2.epfWages, 7767, 'EPF Wage is ₹7,767');
  assertEqual(split2.epsWages, 7767, 'EPS Wage is ₹7,767');
  assertEqual(split2.edliWages, 7767, 'EDLI Wage is ₹7,767');
  assertEqual(split2.epfContributionRemitted, 932, 'EPF Remitted is ₹932 (ROUND(7767 * 12%))');
  assertEqual(split2.epsContributionRemitted, 647, 'EPS Remitted is ₹647 (ROUND(7767 * 8.33%))');
  assertEqual(split2.epfEpsDifference, 285, 'EPF/EPS Difference is ₹285 (932 - 647)');

  const goldenRow2: EPFOEcrRow = {
    id: 'golden-2',
    tenant_id: 'org-joy-01',
    payroll_run_id: 'run-aug-2026',
    employee_id: 'emp-002',
    employee_code: 'JCS-002',
    mapping_mode: 'COMPANY_MIGRATION_V1',
    field_1_uan: '101298412891',
    field_2_member_name: 'RAJANI ORAM',
    field_3_gross_wages: 7767,
    field_4_epf_wages: 7767,
    field_5_eps_wages: 7767,
    field_6_edli_wages: 7767,
    field_7_epf_contribution_remitted: 932,
    field_8_eps_contribution_remitted: 647,
    field_9_epf_eps_difference: 285,
    field_10_ncp_days: 11, // 27 - 16 = 11
    field_11_refund_of_advance: 0,
    raw_ecr_line: '',
    working_days: 16,
    esi_wages: 8341,
    esi_contribution: 62, // ROUND(8341 * 0.75%)
    esi_ip_number: '5610781928',
    eps_eligible: true,
    edli_eligible: true,
    employer_pf_cost_13: 1009,
    employer_gov_portion_1: 77,
    validation_status: 'VALID',
    validation_errors: [],
    validation_warnings: [],
    source_snapshot_id: 'snap-2',
  };

  const line2 = EPFEcrGeneratorService.formatRow(goldenRow2);
  const expectedLine2 = '101298412891#~#RAJANI ORAM#~#7767#~#7767#~#7767#~#7767#~#932#~#647#~#285#~#11#~#0';
  assertEqual(line2, expectedLine2, 'RAJANI ORAM matches partial-month golden line character-for-character');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 3: 27-COLUMN COMPANY WORKBOOK REPRESENTATION (COLS A-AA)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 3] 27-Column Workbook Representation Builder:');
  const mockPayrollRun: PayrollRun = {
    id: 'run-aug-2026',
    tenant_id: 'org-joy-01',
    run_number: 'RUN-2026-08',
    pay_period: 'August 2026',
    period_start: '2026-08-01',
    period_end: '2026-08-31',
    payout_date: '2026-08-31',
    total_employees: 2,
    total_gross: 23341,
    total_deductions: 3210,
    total_net_payout: 20131,
    total_employer_statutory: 3230,
    total_payroll_cost: 26571,
    status: 'Finalized',
    is_locked: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    employee_records: [
      {
        id: 'rec-001',
        tenant_id: 'org-joy-01',
        payroll_run_id: 'run-aug-2026',
        employee_id: 'emp-001',
        employee_code: 'JCS-001',
        employee_name: 'M.VIJAYAKUMAR',
        department: 'Production',
        designation: 'Senior Technician',
        total_working_days: 31,
        payable_days: 31,
        present_days: 27,
        paid_leave_days: 4,
        unpaid_leave_days: 0,
        lop_days: 0,
        overtime_hours: 0,
        ctc_annual: 360000,
        gross_fixed: 15000,
        basic: 15000,
        hra: 0,
        special_allowance: 0,
        conveyance: 0,
        medical: 0,
        other_allowances: 0,
        overtime_pay: 0,
        incentives: 0,
        bonus: 0,
        reimbursements: 0,
        arrears: 0,
        total_earnings: 15000,
        lop_deduction: 0,
        epf_employee: 1800,
        esic_employee: 0,
        professional_tax: 208,
        tds_tax: 0,
        loan_emi: 0,
        advance_recovery: 0,
        other_deductions: 0,
        total_deductions: 2008,
        epf_employer: 1950,
        esic_employer: 0,
        net_pay: 12992,
        bank_name: 'HDFC Bank',
        ifsc_code: 'HDFC0000123',
        pan_number: '101297618960',
        account_number: '5610681980',
        has_exceptions: false,
        status: 'Calculated',
      },
      {
        id: 'rec-002',
        tenant_id: 'org-joy-01',
        payroll_run_id: 'run-aug-2026',
        employee_id: 'emp-002',
        employee_code: 'JCS-002',
        employee_name: 'RAJANI ORAM',
        department: 'Manufacturing',
        designation: 'Assembly Operator',
        total_working_days: 31,
        payable_days: 16,
        present_days: 16,
        paid_leave_days: 0,
        unpaid_leave_days: 15,
        lop_days: 11,
        overtime_hours: 0,
        ctc_annual: 180000,
        gross_fixed: 15000,
        basic: 7767,
        hra: 0,
        special_allowance: 574,
        conveyance: 0,
        medical: 0,
        other_allowances: 0,
        overtime_pay: 0,
        incentives: 0,
        bonus: 0,
        reimbursements: 0,
        arrears: 0,
        total_earnings: 8341,
        lop_deduction: 6659,
        epf_employee: 932,
        esic_employee: 62,
        professional_tax: 208,
        tds_tax: 0,
        loan_emi: 0,
        advance_recovery: 0,
        other_deductions: 0,
        total_deductions: 1202,
        epf_employer: 1009,
        esic_employer: 271,
        net_pay: 7139,
        bank_name: 'State Bank of India',
        ifsc_code: 'SBIN0001234',
        pan_number: '101298412891',
        account_number: '5610781928',
        has_exceptions: false,
        status: 'Calculated',
      },
    ],
  };

  const wbRows = EPFEcrMappingEngine.buildCompanyWorkbookRepresentation({
    payrollRun: mockPayrollRun,
    mappingMode: 'COMPANY_MIGRATION_V1',
  });

  assertEqual(wbRows.length, 2, '2 workbook rows mapped');
  assertEqual(wbRows[0].col_d_emp_id, 'JCS-001', 'Row 1 Emp ID matches');
  assertEqual(wbRows[0].col_g_pf_wages, 15000, 'Row 1 PF Wages matches');
  assertEqual(wbRows[0].col_q_gross, 15000, 'Row 1 Col Q Gross matches Col G PF Wage (Q=G)');
  assertEqual(wbRows[0].col_aa_concatenated_ecr_row, expectedLine1, 'Row 1 Col AA concatenated line matches');

  assertEqual(wbRows[1].col_d_emp_id, 'JCS-002', 'Row 2 Emp ID matches');
  assertEqual(wbRows[1].col_f_w_days, 16, 'Row 2 W Days is 16');
  assertEqual(wbRows[1].col_g_pf_wages, 7767, 'Row 2 PF Wages is 7,767');
  assertEqual(wbRows[1].col_h_esi_wages, 8341, 'Row 2 ESI Wages is 8,341');
  assertEqual(wbRows[1].col_i_pf_contribution, 932, 'Row 2 PF is 932');
  assertEqual(wbRows[1].col_j_esi_contribution, 62, 'Row 2 ESI is 62');
  assertEqual(wbRows[1].col_x_ncp_days, 11, 'Row 2 NCP Days is 11');
  assertEqual(wbRows[1].col_aa_concatenated_ecr_row, expectedLine2, 'Row 2 Col AA concatenated line matches');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 4: SELF-INTEGRITY GENERATION & PARSING (2 ROWS, 11 FIELDS EACH)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST CASE 4] Full ECR Batch Generation & Self-Integrity Check:');
  const batch = EPFEcrMappingEngine.buildEcrBatch({
    payrollRun: mockPayrollRun,
    mappingMode: 'COMPANY_MIGRATION_V1',
    version: 1,
  });

  const genResult = EPFEcrGeneratorService.generateEcrText(batch);
  assert(genResult.success === true, 'ECR generation succeeded');
  assert(genResult.integrityVerified === true, 'Self-integrity verification check PASSED');
  assertEqual(genResult.rowCount, 2, 'Batch row count is 2');
  assert(genResult.verificationReport.allLinesHave11Fields, 'All rows contain exactly 11 fields');

  console.log('\n============================================================');
  console.log('ALL WORKBOOK REPRODUCTION & ECR TESTS PASSED (100%)');
  console.log('============================================================\n');
  return true;
}
