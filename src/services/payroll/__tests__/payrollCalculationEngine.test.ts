// src/services/payroll/__tests__/payrollCalculationEngine.test.ts
// ============================================================================
// Joy PeopleHR Enterprise Payroll Engine — Comprehensive Automated Test Suite
// Validates Layered Architecture, Dynamic Statutory Rules, AST Formulas, & Eligibility Pre-Flight
// ============================================================================

import { StatutoryRuleEngine } from '../statutoryRuleEngine';
import { PayrollCalculationEngine } from '../payrollCalculationEngine';
import { PayrollFormulaEngine, ComponentNode } from '../formulaEngine';
import { PayrollEligibilityService } from '../payrollEligibilityService';
import { PayrollInputSnapshot, EmployeeSalaryAssignment, SalaryStructure } from '../../../types/payroll';
import { Employee } from '../../../types';

/**
 * Lightweight deterministic test runner
 */
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function assertCloseTo(actual: number, expected: number, delta = 0.01, message: string) {
  if (Math.abs(actual - expected) > delta) {
    throw new Error(`[TEST FAILED] ${message} — Expected ${expected}, got ${actual}`);
  }
  console.log(`  ✓ ${message} (${actual} ≈ ${expected})`);
}

export function runAllPayrollTests() {
  console.log('\n============================================================');
  console.log('RUNNING JOY PEOPLEHR PAYROLL ENGINE TEST SUITE');
  console.log('============================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: FORMULA ENGINE & DEPENDENCY GRAPH TESTS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[GROUP 1] AST Formula Engine & Dependency Graph Tests:');

  const validNodes: ComponentNode[] = [
    { code: 'BASIC', name: 'Basic', formulaType: 'PercentageOfGross', percentage: 50, dependencies: [] },
    { code: 'HRA', name: 'HRA', formulaType: 'PercentageOfComponent', baseComponentCode: 'BASIC', percentage: 40, dependencies: ['BASIC'] },
    { code: 'SPECIAL', name: 'Special', formulaType: 'Formula', formulaExpression: 'GROSS - BASIC - HRA', dependencies: ['BASIC', 'HRA'] },
  ];

  const graphResult = PayrollFormulaEngine.buildDependencyGraph(validNodes);
  assert(graphResult.isValid === true, 'Dependency graph resolved valid topological order');
  assert(graphResult.evaluationOrder[0] === 'BASIC', 'BASIC evaluated first in topological order');
  assert(graphResult.evaluationOrder.includes('HRA'), 'HRA included in evaluation order');

  // Circular dependency detection
  const cyclicNodes: ComponentNode[] = [
    { code: 'A', name: 'Comp A', formulaType: 'Formula', formulaExpression: 'B + 100', dependencies: ['B'], baseComponentCode: 'B' },
    { code: 'B', name: 'Comp B', formulaType: 'Formula', formulaExpression: 'A + 200', dependencies: ['A'], baseComponentCode: 'A' },
  ];
  const cyclicResult = PayrollFormulaEngine.buildDependencyGraph(cyclicNodes);
  assert(cyclicResult.hasCycle === true, 'Circular dependency correctly detected (A <-> B)');
  assert(cyclicResult.isValid === false, 'Cyclic graph marked invalid');

  // Safe AST evaluation
  const safeMath = PayrollFormulaEngine.evaluateSafeExpression('BASIC * 0.4 + 500', { BASIC: 20000 });
  assert(safeMath === 8500, 'Safe AST expression evaluated (20000 * 0.4 + 500 = 8500)');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: MANDATORY ESI 2-STEP EVALUATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[GROUP 2] Mandatory ESI 2-Step Statutory Tests:');

  // Test 2.1: Mandatory User Test Case: Salary ₹20,000 + OT ₹3,000
  const esiMandatory = StatutoryRuleEngine.evaluateESI(20000, 3000);
  assert(esiMandatory.is_covered === true, 'Salary ₹20,000 + OT ₹3,000 is COVERED by ESIC');
  assert(esiMandatory.coverage_wage === 20000, 'ESI Coverage Wage is ₹20,000 (OT excluded from coverage test)');
  assert(esiMandatory.overtime_wage === 3000, 'ESI Overtime Wage is ₹3,000');
  assert(esiMandatory.contribution_wage === 23000, 'ESI Contribution Wage is ₹23,000 (₹20,000 + ₹3,000 OT)');
  assertCloseTo(esiMandatory.employee_contribution, 172.50, 0.01, 'Employee ESI is ₹172.50 (0.75% of ₹23,000)');
  assertCloseTo(esiMandatory.employer_contribution, 747.50, 0.01, 'Employer ESI is ₹747.50 (3.25% of ₹23,000)');

  // Test 2.2: Salary ₹21,000 exactly + OT ₹5,000
  const esiExact = StatutoryRuleEngine.evaluateESI(21000, 5000);
  assert(esiExact.is_covered === true, 'Salary exactly ₹21,000 is COVERED');
  assert(esiExact.contribution_wage === 26000, 'Contribution wage is ₹26,000');
  assertCloseTo(esiExact.employee_contribution, 195.00, 0.01, 'Employee ESI is ₹195.00');
  assertCloseTo(esiExact.employer_contribution, 845.00, 0.01, 'Employer ESI is ₹845.00');

  // Test 2.3: Salary ₹22,000 (above threshold) + OT ₹3,000
  const esiAbove = StatutoryRuleEngine.evaluateESI(22000, 3000);
  assert(esiAbove.is_covered === false, 'Salary ₹22,000 (> ₹21,000) is NOT covered');
  assert(esiAbove.contribution_wage === 0, 'Contribution wage is 0 when not covered');
  assert(esiAbove.employee_contribution === 0, 'Employee contribution is 0');
  assert(esiAbove.employer_contribution === 0, 'Employer contribution is 0');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: PROVIDENT FUND (EPF) & HIGHER WAGE TESTS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[GROUP 3] Provident Fund (EPF) Tests:');

  // Test 3.1: Basic ₹30,000 with statutory ₹15,000 ceiling
  const pfCapped = StatutoryRuleEngine.evaluatePF(30000, true, true);
  assert(pfCapped.pf_wage === 15000, 'PF Wage capped at ₹15,000');
  assert(pfCapped.employee_contribution === 1800, 'Employee PF is ₹1,800 (12%)');
  assert(pfCapped.employer_pf_amount === 1800, 'Employer PF is ₹1,800 (12%)');
  assert(pfCapped.employer_gov_portion_amount === 150, 'Employer Gov portion is ₹150 (1% Admin/EDLI)');
  assert(pfCapped.total_employer_pf_cost === 1950, 'Total Employer PF cost is ₹1,950 (13%)');

  // Test 3.2: Basic ₹12,000 (below ceiling)
  const pfBelow = StatutoryRuleEngine.evaluatePF(12000, true, true);
  assert(pfBelow.pf_wage === 12000, 'PF Wage is ₹12,000');
  assert(pfBelow.employee_contribution === 1440, 'Employee PF is ₹1,440');
  assert(pfBelow.total_employer_pf_cost === 1560, 'Total Employer PF cost is ₹1,560 (13%)');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 4: ANNUALIZED PROJECTED TDS (APRIL 2026 FRAMEWORK)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[GROUP 4] Annualized Projected TDS Tests:');

  // Test 4.1: ₹10,00,000 annual income in New Regime (Subject to 87A rebate)
  const tdsUnder12L = StatutoryRuleEngine.evaluateProjectedTDS(80000, 960000, 'NEW');
  assert(tdsUnder12L.taxableIncome === 885000, 'Taxable income is ₹8,85,000 after ₹75k Std Deduction');
  assert(tdsUnder12L.rebate87A > 0, 'Section 87A rebate applied for income <= ₹12L');
  assert(tdsUnder12L.totalAnnualTaxLiability === 0, 'Net Annual Tax is ₹0 with 87A rebate under FY26 framework');

  // Test 4.2: ₹20,00,000 annual income in New Regime
  const tdsAbove15L = StatutoryRuleEngine.evaluateProjectedTDS(166667, 2000000, 'NEW');
  assert(tdsAbove15L.taxableIncome === 1925000, 'Taxable income is ₹19,25,000');
  assert(tdsAbove15L.totalAnnualTaxLiability > 0, 'Annual tax liability is computed with slabs and 4% cess');
  assert(tdsAbove15L.monthlyTdsWithholding > 0, 'Monthly TDS withholding allocated');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 5: PRE-FLIGHT READINESS & BLOCKER ENGINE
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[GROUP 5] Payroll Pre-Flight Readiness Engine Tests:');

  const testEmployees: Employee[] = [
    {
      id: 'emp-101',
      organization_id: 'org-joy-01',
      company_id: 'comp-1',
      department_id: 'dept-1',
      designation_id: 'desig-1',
      employee_code: 'WF-101',
      first_name: 'Aarav',
      last_name: 'Sharma',
      work_email: 'aarav@joycorp.com',
      status: 'Active',
      employment_type: 'Full Time',
      company_name: 'Joy Corp',
      branch_name: 'HQ',
      department_name: 'Tech',
      designation_title: 'Engineer',
      employment: { doj: '2026-01-01' },
      bank: { account_number: '9876543210', ifsc_code: 'HDFC0001234' },
      statutory: { pan_number: 'ABCDE1234F' },
      profile: {},
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'emp-102',
      organization_id: 'org-joy-01',
      company_id: 'comp-1',
      department_id: 'dept-1',
      designation_id: 'desig-2',
      employee_code: 'WF-102',
      first_name: 'Diya',
      last_name: 'Patel',
      work_email: 'diya@joycorp.com',
      status: 'Active',
      employment_type: 'Full Time',
      company_name: 'Joy Corp',
      branch_name: 'HQ',
      department_name: 'Tech',
      designation_title: 'QA',
      employment: { doj: '2026-01-01' },
      bank: { account_number: '', ifsc_code: '' }, // Missing bank
      statutory: {},
      profile: {},
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  const testAssignments: EmployeeSalaryAssignment[] = [
    {
      id: 'sal-101',
      tenant_id: 'org-joy-01',
      employee_id: 'emp-101',
      employee_code: 'WF-101',
      employee_name: 'Aarav Sharma',
      department_name: 'Tech',
      designation: 'Engineer',
      salary_structure_id: 'str-01',
      salary_structure_name: 'Standard Structure',
      annual_ctc: 600000,
      gross_monthly: 50000,
      basic_monthly: 25000,
      net_monthly_estimate: 45000,
      payment_mode: 'BankTransfer',
      bank_name: 'HDFC Bank',
      account_number: '9876543210',
      ifsc_code: 'HDFC0001234',
      pan_number: 'ABCDE1234F',
      pf_uan: '100918234812',
      esic_number: '',
      status: 'Active',
      effective_from: '2026-04-01',
      updated_at: new Date().toISOString(),
    },
  ];

  const testStructures: SalaryStructure[] = [
    {
      id: 'str-01',
      tenant_id: 'org-joy-01',
      code: 'STD',
      name: 'Standard Structure',
      description: 'Standard',
      company_id: 'comp-1',
      applicable_grade: 'L1',
      base_annual_ctc: 600000,
      components: [],
      status: 'Active',
      version: 1,
      effective_from: '2026-04-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const readinessReport = PayrollEligibilityService.evaluateReadiness(
    testEmployees,
    testAssignments,
    testStructures,
    'August 2026',
    '2026-08-01',
    '2026-08-31'
  );

  assert(readinessReport.totalEmployeesDetected === 2, 'Detected 2 employees');
  assert(readinessReport.readyCount === 1, '1 employee ready (Aarav)');
  assert(readinessReport.blockerCount === 1, '1 employee blocked (Diya: missing structure and bank details)');
  assert(readinessReport.canProceedToCalculation === false, 'Calculation blocked until blockers are resolved');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 6: END-TO-END SNAPSHOT EXECUTION & INVARIANTS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[GROUP 6] End-to-End Layer 4 Snapshot Calculation:');

  const sampleSnapshot: PayrollInputSnapshot = {
    id: 'snap-emp-001-test',
    tenant_id: 'org-joy-01',
    payroll_run_id: 'run-aug-2026',
    employee_id: 'emp-admin-001',
    employee_code: 'JCS-017',
    employee_name: 'Dharun B',
    department: 'Engineering',
    designation: 'Software Engineer',
    location: 'Coimbatore HQ',
    joining_date: '2026-01-01',
    is_new_joiner: false,
    is_exit_period: false,
    employment_status: 'Active',
    pf_eligible: true,
    pf_uan: '100918234812',
    pf_capped: true,
    esi_eligible: true,
    esi_ip_number: '3192847192',
    esi_coverage_status: 'NEW_COVERAGE',
    pt_eligible: true,
    pt_state_jurisdiction: 'Tamil Nadu',
    tax_regime: 'NEW',
    salary_structure_id: 'str-corp-std',
    salary_structure_code: 'CORP_STD_01',
    annual_ctc: 720000,
    monthly_gross_fixed: 60000,
    basic_fixed: 30000,
    hra_fixed: 12000,
    special_allowance_fixed: 15150,
    conveyance_fixed: 1600,
    medical_fixed: 1250,
    other_allowances_fixed: 0,
    total_calendar_days: 31,
    payable_days: 31,
    present_days: 26,
    paid_leave_days: 5,
    unpaid_leave_days: 0,
    absent_days: 0,
    lop_days: 0,
    ncp_days: 0,
    approved_ot_hours: 0,
    approved_claims_total: 0,
    bonus_amount: 0,
    incentives_amount: 0,
    loan_emi_due: 0,
    advance_recovery_due: 0,
    voluntary_deductions: 0,
    snapshot_created_at: new Date().toISOString(),
  };

  const detailedResult = PayrollCalculationEngine.calculateSnapshot(sampleSnapshot);
  assert(detailedResult.employeeInput.total_earnings === 60000, 'Gross Earnings = ₹60,000');
  assert(detailedResult.pfAssessment.employee_contribution === 1800, 'Employee PF = ₹1,800');
  assert(detailedResult.esiAssessment.is_covered === false, 'ESI is not covered (> ₹21,000)');
  assert(detailedResult.employeeInput.professional_tax === 208, 'Tamil Nadu PT = ₹208');
  assert(detailedResult.calculationLines.length >= 6, 'Generated complete calculation lines');
  assert(detailedResult.exceptions.length === 0, 'No blocker exceptions detected');

  console.log('\n============================================================');
  console.log('ALL PAYROLL STATUTORY & CALCULATION TESTS PASSED SUCCESSFULLY (100%)');
  console.log('============================================================\n');
  return true;
}
