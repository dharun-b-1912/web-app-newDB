import {
  SalaryComponent,
  SalaryStructure,
  EmployeeSalaryAssignment,
  SalaryRevision,
  PayrollRun,
  PayrollRunStatus,
  EmployeePayrollInput,
  EarningRecord,
  LoanRecord,
  SalaryAdvanceRecord,
  StatutoryConfig,
  Payslip,
  TaxDocument,
  FnFSettlement,
} from '../types/payroll';
import { leaveApi } from './leaveApi';

const STORAGE_KEYS = {
  COMPONENTS: 'workforce_payroll_components_v1',
  STRUCTURES: 'workforce_payroll_structures_v1',
  SALARIES: 'workforce_payroll_salaries_v1',
  REVISIONS: 'workforce_payroll_revisions_v1',
  RUNS: 'workforce_payroll_runs_v1',
  EARNINGS: 'workforce_payroll_earnings_v1',
  LOANS: 'workforce_payroll_loans_v1',
  ADVANCES: 'workforce_payroll_advances_v1',
  STATUTORY: 'workforce_payroll_statutory_v1',
  SETTLEMENTS: 'workforce_payroll_settlements_v1',
};

// Seed Components
const initialComponents: SalaryComponent[] = [
  { id: 'cmp-basic', code: 'BASIC', name: 'Basic Salary', type: 'Earning', category: 'Basic', calculation_type: 'PercentageOfGross', default_value: 50, is_taxable: true, is_pf_applicable: true, is_esi_applicable: true, is_active: true, description: 'Core basic salary component (50% of Gross)' },
  { id: 'cmp-hra', code: 'HRA', name: 'House Rent Allowance', type: 'Earning', category: 'HRA', calculation_type: 'PercentageOfBasic', default_value: 40, is_taxable: true, is_pf_applicable: false, is_esi_applicable: true, is_active: true, description: 'House Rent Allowance (40% of Basic)' },
  { id: 'cmp-sa', code: 'SA', name: 'Special Allowance', type: 'Earning', category: 'SpecialAllowance', calculation_type: 'FixedAmount', default_value: 15000, is_taxable: true, is_pf_applicable: false, is_esi_applicable: true, is_active: true, description: 'Flexible balancing allowance' },
  { id: 'cmp-med', code: 'MED', name: 'Medical Allowance', type: 'Earning', category: 'Medical', calculation_type: 'FixedAmount', default_value: 2500, is_taxable: false, is_pf_applicable: false, is_esi_applicable: true, is_active: true, description: 'Medical expense reimbursement allowance' },
  { id: 'cmp-conv', code: 'CONV', name: 'Conveyance Allowance', type: 'Earning', category: 'Conveyance', calculation_type: 'FixedAmount', default_value: 1600, is_taxable: false, is_pf_applicable: false, is_esi_applicable: true, is_active: true, description: 'Standard travel conveyance allowance' },
  { id: 'cmp-pf-emp', code: 'PF_EMP', name: 'Employee Provident Fund (EPF)', type: 'Statutory', category: 'PF', calculation_type: 'PercentageOfBasic', default_value: 12, is_taxable: false, is_pf_applicable: true, is_esi_applicable: false, is_active: true, description: 'Statutory EPF employee contribution (12% of Basic)' },
  { id: 'cmp-esi-emp', code: 'ESI_EMP', name: 'Employee State Insurance (ESIC)', type: 'Statutory', category: 'ESI', calculation_type: 'PercentageOfGross', default_value: 0.75, is_taxable: false, is_pf_applicable: false, is_esi_applicable: true, is_active: true, description: 'Statutory ESIC employee contribution (0.75% of Gross)' },
  { id: 'cmp-pt', code: 'PT', name: 'Professional Tax (PT)', type: 'Statutory', category: 'ProfessionalTax', calculation_type: 'FixedAmount', default_value: 200, is_taxable: false, is_pf_applicable: false, is_esi_applicable: false, is_active: true, description: 'State professional tax deduction' },
  { id: 'cmp-tds', code: 'TDS', name: 'Tax Deducted at Source (TDS)', type: 'Statutory', category: 'TDS', calculation_type: 'Variable', default_value: 0, is_taxable: false, is_pf_applicable: false, is_esi_applicable: false, is_active: true, description: 'Monthly income tax withholding' },
];

// Seed Salary Structures
const initialStructures: SalaryStructure[] = [
  {
    id: 'str-eng-sr',
    code: 'ENG_SR_01',
    name: 'Senior Engineering CTC Structure',
    description: 'Standard CTC package for L4/L5 Senior Software Engineers & Tech Leads',
    company_id: 'comp-01',
    applicable_grade: 'Grade L4 / L5',
    base_annual_ctc: 1800000,
    components: [
      { component_id: 'cmp-basic', component_name: 'Basic Salary', type: 'Earning', calculation_type: 'PercentageOfGross', value: 50 },
      { component_id: 'cmp-hra', component_name: 'House Rent Allowance', type: 'Earning', calculation_type: 'PercentageOfBasic', value: 40 },
      { component_id: 'cmp-sa', component_name: 'Special Allowance', type: 'Earning', calculation_type: 'FixedAmount', value: 25000 },
      { component_id: 'cmp-med', component_name: 'Medical Allowance', type: 'Earning', calculation_type: 'FixedAmount', value: 2500 },
      { component_id: 'cmp-conv', component_name: 'Conveyance Allowance', type: 'Earning', calculation_type: 'FixedAmount', value: 1600 },
    ],
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'str-exec',
    code: 'EXEC_01',
    name: 'Executive & Management Structure',
    description: 'Structure for Directors, VPs, and Department Heads',
    company_id: 'comp-01',
    applicable_grade: 'Grade L6 / L7',
    base_annual_ctc: 3200000,
    components: [
      { component_id: 'cmp-basic', component_name: 'Basic Salary', type: 'Earning', calculation_type: 'PercentageOfGross', value: 50 },
      { component_id: 'cmp-hra', component_name: 'House Rent Allowance', type: 'Earning', calculation_type: 'PercentageOfBasic', value: 50 },
      { component_id: 'cmp-sa', component_name: 'Special Allowance', type: 'Earning', calculation_type: 'FixedAmount', value: 45000 },
    ],
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

// Seed Employee Salaries
const initialSalaries: EmployeeSalaryAssignment[] = [
  {
    id: 'sal-101',
    employee_id: 'emp-101',
    employee_name: 'Rajesh Kumar',
    department_name: 'Engineering',
    designation: 'Staff Software Architect',
    salary_structure_id: 'str-eng-sr',
    salary_structure_name: 'Senior Engineering CTC Structure',
    annual_ctc: 2400000,
    gross_monthly: 200000,
    basic_monthly: 100000,
    net_monthly_estimate: 172400,
    payment_mode: 'BankTransfer',
    bank_name: 'HDFC Bank Ltd',
    account_number: '50100234918231',
    ifsc_code: 'HDFC0001242',
    pan_number: 'ABCDE1234F',
    pf_uan: '100918234812',
    esic_number: '3192847192',
    effective_from: '2026-01-01',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sal-102',
    employee_id: 'emp-102',
    employee_name: 'Ananya Sen',
    department_name: 'Product & Design',
    designation: 'Lead Product Manager',
    salary_structure_id: 'str-eng-sr',
    salary_structure_name: 'Senior Engineering CTC Structure',
    annual_ctc: 2100000,
    gross_monthly: 175000,
    basic_monthly: 87500,
    net_monthly_estimate: 151200,
    payment_mode: 'BankTransfer',
    bank_name: 'ICICI Bank Ltd',
    account_number: '001105928173',
    ifsc_code: 'ICIC0000011',
    pan_number: 'BKWPS9812K',
    pf_uan: '100492817492',
    esic_number: '3190029182',
    effective_from: '2026-01-01',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sal-103',
    employee_id: 'emp-103',
    employee_name: 'Vikramaditya Rao',
    department_name: 'Engineering',
    designation: 'Senior DevOps Engineer',
    salary_structure_id: 'str-eng-sr',
    salary_structure_name: 'Senior Engineering CTC Structure',
    annual_ctc: 1800000,
    gross_monthly: 150000,
    basic_monthly: 75000,
    net_monthly_estimate: 129800,
    payment_mode: 'BankTransfer',
    bank_name: 'Axis Bank Ltd',
    account_number: '918020039182',
    ifsc_code: 'UTIB0000412',
    pan_number: 'CHJPR8721L',
    pf_uan: '100817294812',
    esic_number: '3192039182',
    effective_from: '2026-01-01',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

// Seed Historical Payroll Runs
const initialRuns: PayrollRun[] = [
  {
    id: 'run-jul-2026',
    run_code: 'PR-2026-07',
    pay_period: 'July 2026',
    month: 'July',
    year: 2026,
    total_employees: 428,
    total_gross_pay: 48250000,
    total_net_pay: 41210000,
    total_statutory_deductions: 7040000,
    status: 'Finalized',
    processed_by_name: 'Anand Viswanathan (HR Head)',
    approved_by_name: 'Anand Viswanathan (HR Head)',
    created_at: '2026-07-28T10:00:00Z',
    finalized_at: '2026-07-31T18:00:00Z',
  },
  {
    id: 'run-jun-2026',
    run_code: 'PR-2026-06',
    pay_period: 'June 2026',
    month: 'June',
    year: 2026,
    total_employees: 422,
    total_gross_pay: 47520000,
    total_net_pay: 40580000,
    total_statutory_deductions: 6940000,
    status: 'Finalized',
    processed_by_name: 'Anand Viswanathan (HR Head)',
    approved_by_name: 'Anand Viswanathan (HR Head)',
    created_at: '2026-06-27T10:00:00Z',
    finalized_at: '2026-06-30T18:00:00Z',
  },
];

// Helper storage functions
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage write error', err);
  }
}

export const payrollApi = {
  // 1. Components & Structures
  getComponents(): SalaryComponent[] {
    return getItem(STORAGE_KEYS.COMPONENTS, initialComponents);
  },
  saveComponent(component: Partial<SalaryComponent>): SalaryComponent {
    const list = this.getComponents();
    let updated: SalaryComponent;
    if (component.id) {
      updated = { ...list.find(c => c.id === component.id)!, ...component } as SalaryComponent;
      setItem(
        STORAGE_KEYS.COMPONENTS,
        list.map(c => (c.id === component.id ? updated : c))
      );
    } else {
      updated = {
        id: `cmp-${Date.now()}`,
        code: component.code || 'CUSTOM',
        name: component.name || 'Custom Component',
        type: component.type || 'Earning',
        category: component.category || 'Custom',
        calculation_type: component.calculation_type || 'FixedAmount',
        default_value: component.default_value || 0,
        is_taxable: component.is_taxable ?? true,
        is_pf_applicable: component.is_pf_applicable ?? false,
        is_esi_applicable: component.is_esi_applicable ?? false,
        is_active: true,
        description: component.description || '',
      };
      setItem(STORAGE_KEYS.COMPONENTS, [updated, ...list]);
    }
    return updated;
  },

  getStructures(): SalaryStructure[] {
    return getItem(STORAGE_KEYS.STRUCTURES, initialStructures);
  },
  saveStructure(structure: Partial<SalaryStructure>): SalaryStructure {
    const list = this.getStructures();
    let updated: SalaryStructure;
    if (structure.id) {
      updated = { ...list.find(s => s.id === structure.id)!, ...structure, updated_at: new Date().toISOString() } as SalaryStructure;
      setItem(
        STORAGE_KEYS.STRUCTURES,
        list.map(s => (s.id === structure.id ? updated : s))
      );
    } else {
      updated = {
        id: `str-${Date.now()}`,
        code: structure.code || 'STR_NEW',
        name: structure.name || 'New Structure',
        description: structure.description || '',
        company_id: structure.company_id || 'comp-01',
        applicable_grade: structure.applicable_grade || 'All Grades',
        base_annual_ctc: structure.base_annual_ctc || 1200000,
        components: structure.components || [],
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setItem(STORAGE_KEYS.STRUCTURES, [updated, ...list]);
    }
    return updated;
  },

  // 2. Employee Salary Assignments & Revisions
  getEmployeeSalaries(): EmployeeSalaryAssignment[] {
    return getItem(STORAGE_KEYS.SALARIES, initialSalaries);
  },
  assignEmployeeSalary(assignment: Partial<EmployeeSalaryAssignment>): EmployeeSalaryAssignment {
    const list = this.getEmployeeSalaries();
    const updated: EmployeeSalaryAssignment = {
      id: assignment.id || `sal-${Date.now()}`,
      employee_id: assignment.employee_id || 'emp-new',
      employee_name: assignment.employee_name || 'Employee',
      department_name: assignment.department_name || 'Engineering',
      designation: assignment.designation || 'Software Engineer',
      salary_structure_id: assignment.salary_structure_id || 'str-eng-sr',
      salary_structure_name: assignment.salary_structure_name || 'Senior Engineering CTC Structure',
      annual_ctc: assignment.annual_ctc || 1200000,
      gross_monthly: assignment.gross_monthly || 100000,
      basic_monthly: assignment.basic_monthly || 50000,
      net_monthly_estimate: assignment.net_monthly_estimate || 86000,
      payment_mode: assignment.payment_mode || 'BankTransfer',
      bank_name: assignment.bank_name || 'HDFC Bank Ltd',
      account_number: assignment.account_number || '501000928172',
      ifsc_code: assignment.ifsc_code || 'HDFC0001242',
      pan_number: assignment.pan_number || 'ABCDE1234F',
      pf_uan: assignment.pf_uan || '100918273819',
      esic_number: assignment.esic_number || '3192039182',
      effective_from: assignment.effective_from || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    };
    setItem(
      STORAGE_KEYS.SALARIES,
      list.some(s => s.employee_id === updated.employee_id)
        ? list.map(s => (s.employee_id === updated.employee_id ? updated : s))
        : [updated, ...list]
    );
    return updated;
  },

  getSalaryRevisions(): SalaryRevision[] {
    return getItem(STORAGE_KEYS.REVISIONS, [
      {
        id: 'rev-01',
        employee_id: 'emp-101',
        employee_name: 'Rajesh Kumar',
        effective_date: '2026-04-01',
        previous_ctc: 2100000,
        revised_ctc: 2400000,
        increment_percentage: 14.28,
        reason: 'Annual Appraisal FY26 Performance Bonus & Merit Promotion',
        approved_by_name: 'Anand Viswanathan (HR Head)',
        status: 'Approved',
        created_at: '2026-03-25T10:00:00Z',
      },
    ]);
  },

  // 3. Payroll Runs & Computation Engine
  getPayrollRuns(): PayrollRun[] {
    return getItem(STORAGE_KEYS.RUNS, initialRuns);
  },

  createPayrollRun(month: string, year: number): PayrollRun {
    const list = this.getPayrollRuns();
    const payPeriod = `${month} ${year}`;
    const newRun: PayrollRun = {
      id: `run-${month.toLowerCase()}-${year}`,
      run_code: `PR-${year}-${month.substring(0, 3).toUpperCase()}`,
      pay_period: payPeriod,
      month,
      year,
      total_employees: 428,
      total_gross_pay: 49500000,
      total_net_pay: 42300000,
      total_statutory_deductions: 7200000,
      status: 'Draft',
      processed_by_name: 'Anand Viswanathan (HR Head)',
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.RUNS, [newRun, ...list]);
    return newRun;
  },

  updatePayrollRunStatus(runId: string, status: PayrollRunStatus, approver?: string): PayrollRun {
    const list = this.getPayrollRuns();
    const run = list.find(r => r.id === runId);
    if (!run) throw new Error('Run not found');
    const updated = {
      ...run,
      status,
      approved_by_name: approver || run.approved_by_name,
      finalized_at: status === 'Finalized' ? new Date().toISOString() : run.finalized_at,
    };
    setItem(
      STORAGE_KEYS.RUNS,
      list.map(r => (r.id === runId ? updated : r))
    );
    return updated;
  },

  // Compute Employee Payroll Items dynamically using Leave and Attendance Integration
  computePayrollInputsForRun(runId: string): EmployeePayrollInput[] {
    const salaries = this.getEmployeeSalaries();
    const leaveRequests = leaveApi.getLeaveRequests();

    return salaries.map(sal => {
      // Fetch LOP days dynamically from Leave Module approved requests
      const empLopDays = leaveRequests
        .filter(r => r.employee_id === sal.employee_id && r.status === 'Approved' && r.is_lop)
        .reduce((acc, r) => acc + r.leave_days_deducted, 0);

      const totalWorkingDays = 22;
      const lopDays = empLopDays || 0;
      const payableDays = Math.max(0, totalWorkingDays - lopDays);

      const basicPay = Math.round((sal.basic_monthly / totalWorkingDays) * payableDays);
      const hra = Math.round((sal.basic_monthly * 0.4 / totalWorkingDays) * payableDays);
      const sa = Math.round(((sal.gross_monthly - sal.basic_monthly - (sal.basic_monthly * 0.4)) / totalWorkingDays) * payableDays);
      const grossEarnings = basicPay + hra + sa;

      // LOP deduction amount
      const lopDeduction = Math.round((sal.gross_monthly / totalWorkingDays) * lopDays);

      // Statutory deductions
      const pfEmployee = Math.min(1800, Math.round(basicPay * 0.12));
      const esiEmployee = grossEarnings <= 21000 ? Math.round(grossEarnings * 0.0075) : 0;
      const professionalTax = grossEarnings > 20000 ? 200 : 0;
      const tdsTax = Math.round(grossEarnings * 0.10); // Estimate
      const totalDeductions = lopDeduction + pfEmployee + esiEmployee + professionalTax + tdsTax;
      const netPay = Math.max(0, grossEarnings - totalDeductions);

      return {
        employee_id: sal.employee_id,
        employee_name: sal.employee_name,
        department_name: sal.department_name,
        designation: sal.designation,
        bank_account: sal.account_number,
        ifsc_code: sal.ifsc_code,
        pan_number: sal.pan_number,
        pf_uan: sal.pf_uan,

        total_working_days: totalWorkingDays,
        days_present: payableDays - 2,
        leave_paid_days: 2,
        lop_days: lopDays,
        overtime_hours: 4,

        basic_pay: basicPay,
        hra,
        special_allowance: sa,
        medical_allowance: 2500,
        conveyance_allowance: 1600,
        overtime_pay: 1500,
        incentives: 0,
        bonus: 0,
        reimbursements: 0,
        gross_earnings: grossEarnings + 1500 + 2500 + 1600,

        lop_deduction: lopDeduction,
        pf_employee: pfEmployee,
        esi_employee: esiEmployee,
        professional_tax: professionalTax,
        tds_income_tax: tdsTax,
        lwf_employee: 20,
        loan_emi: 0,
        salary_advance_deduction: 0,
        other_deductions: 0,
        total_deductions: totalDeductions + 20,

        net_pay: netPay,

        pf_employer: pfEmployee,
        esi_employer: grossEarnings <= 21000 ? Math.round(grossEarnings * 0.0325) : 0,
        lwf_employer: 40,
        gratuity_provision: Math.round(basicPay * (15 / 26) * (1 / 12)),
        total_ctc_impact: grossEarnings + pfEmployee + 40,
      };
    });
  },

  // 4. Earnings & Deductions
  getEarnings(): EarningRecord[] {
    return getItem(STORAGE_KEYS.EARNINGS, [
      {
        id: 'earn-01',
        employee_id: 'emp-101',
        employee_name: 'Rajesh Kumar',
        type: 'Overtime',
        amount: 4500,
        period: 'August 2026',
        description: 'Critical Release Night Shift Support (12 Hours)',
        status: 'Approved',
        created_at: '2026-08-10T10:00:00Z',
      },
      {
        id: 'earn-02',
        employee_id: 'emp-102',
        employee_name: 'Ananya Sen',
        type: 'Incentive',
        amount: 25000,
        period: 'August 2026',
        description: 'Q2 Product Launch Milestone Achievement Award',
        status: 'Approved',
        created_at: '2026-08-08T10:00:00Z',
      },
    ]);
  },

  getLoans(): LoanRecord[] {
    return getItem(STORAGE_KEYS.LOANS, [
      {
        id: 'loan-01',
        employee_id: 'emp-103',
        employee_name: 'Vikramaditya Rao',
        loan_type: 'PersonalLoan',
        principal_amount: 150000,
        disbursed_amount: 150000,
        monthly_emi: 12500,
        total_tenure_months: 12,
        paid_tenure_months: 4,
        outstanding_balance: 100000,
        status: 'Active',
        disbursed_date: '2026-04-10',
      },
    ]);
  },

  // 5. Statutory Configuration
  getStatutoryConfig(): StatutoryConfig {
    return getItem(STORAGE_KEYS.STATUTORY, {
      pf: { employee_rate: 12, employer_rate: 12, wage_ceiling: 15000, admin_charge_rate: 0.5, edli_rate: 0.5 },
      esi: { employee_rate: 0.75, employer_rate: 3.25, wage_ceiling: 21000 },
      pt: { state: 'Tamil Nadu', slab_enabled: true },
      tds: { regime: 'NewRegime', standard_deduction: 75000 },
      lwf: { employee_contribution: 20, employer_contribution: 40 },
      gratuity: { formula: '(15 * Basic * Years) / 26', min_years_service: 5 },
    });
  },

  // 6. Full & Final Settlement (FnF)
  getFnFSettlements(): FnFSettlement[] {
    return getItem(STORAGE_KEYS.SETTLEMENTS, [
      {
        id: 'fnf-01',
        employee_id: 'emp-99',
        employee_name: 'Suresh Raina',
        department_name: 'Sales',
        resignation_date: '2026-07-01',
        last_working_day: '2026-07-31',
        notice_period_days: 60,
        notice_shortfall_days: 0,
        earned_basic_salary: 45000,
        leave_encashment_days: 12,
        leave_encashment_amount: 22500,
        gratuity_amount: 135000,
        pending_bonus_reimbursements: 15000,
        notice_shortfall_recovery: 0,
        outstanding_loan_recovery: 0,
        unreturned_asset_deduction: 0,
        total_gross_settlement: 217500,
        total_deductions_recovery: 18000,
        final_net_settlement_pay: 199500,
        status: 'Approved',
        settlement_date: '2026-08-05',
        remarks: 'No dues pending across IT, Admin, and HR.',
      },
    ]);
  },

  // 7. Payslip Generator
  getPayslipForEmployee(employeeId: string, payPeriod: string): Payslip {
    const salaries = this.getEmployeeSalaries();
    const sal = salaries.find(s => s.employee_id === employeeId) || salaries[0];

    const basic = sal.basic_monthly;
    const hra = Math.round(basic * 0.4);
    const sa = Math.round(sal.gross_monthly - basic - hra);
    const pf = Math.min(1800, Math.round(basic * 0.12));
    const pt = 200;
    const tds = Math.round(sal.gross_monthly * 0.08);

    const totalDeductions = pf + pt + tds;
    const net = sal.gross_monthly - totalDeductions;

    return {
      id: `ps-${employeeId}-${payPeriod.replace(' ', '-')}`,
      payroll_run_id: 'run-jul-2026',
      pay_period: payPeriod,
      employee_id: sal.employee_id,
      employee_name: sal.employee_name,
      department_name: sal.department_name,
      designation: sal.designation,
      date_of_joining: '2022-06-15',
      bank_name: sal.bank_name,
      account_number: sal.account_number,
      pan_number: sal.pan_number,
      pf_uan: sal.pf_uan,
      esic_number: sal.esic_number,
      total_working_days: 22,
      payable_days: 22,
      lop_days: 0,
      earnings: [
        { name: 'Basic Salary', amount: basic },
        { name: 'House Rent Allowance (HRA)', amount: hra },
        { name: 'Special Allowance', amount: sa },
        { name: 'Medical Allowance', amount: 2500 },
        { name: 'Conveyance Allowance', amount: 1600 },
      ],
      deductions: [
        { name: 'Employee Provident Fund (EPF)', amount: pf },
        { name: 'Professional Tax (PT)', amount: pt },
        { name: 'Tax Deducted at Source (TDS)', amount: tds },
      ],
      gross_earnings: sal.gross_monthly + 4100,
      total_deductions: totalDeductions,
      net_pay: net + 4100,
      net_pay_words: 'One Lakh Seventy Six Thousand Five Hundred Rupees Only',
      generated_date: new Date().toISOString().split('T')[0],
    };
  },
};
