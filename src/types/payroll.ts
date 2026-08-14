export type ComponentType = 'Earning' | 'Deduction' | 'Statutory' | 'Reimbursement';

export type ComponentCategory =
  | 'Basic'
  | 'HRA'
  | 'DA'
  | 'SpecialAllowance'
  | 'Medical'
  | 'Conveyance'
  | 'Overtime'
  | 'Bonus'
  | 'Incentive'
  | 'PF'
  | 'ESI'
  | 'ProfessionalTax'
  | 'TDS'
  | 'LWF'
  | 'Loan'
  | 'Advance'
  | 'LOP'
  | 'Custom';

export type CalculationType =
  | 'FixedAmount'
  | 'PercentageOfBasic'
  | 'PercentageOfGross'
  | 'Formula'
  | 'Variable';

export type PayrollRunStatus =
  | 'Draft'
  | 'InputCollected'
  | 'PreviewReady'
  | 'SubmittedForApproval'
  | 'Approved'
  | 'Finalized'
  | 'Paid';

export type EarningType = 'Overtime' | 'Incentive' | 'Bonus' | 'Reimbursement';
export type DeductionType = 'LOP' | 'Loan' | 'SalaryAdvance' | 'Other';

export interface SalaryComponent {
  id: string;
  code: string;
  name: string;
  type: ComponentType;
  category: ComponentCategory;
  calculation_type: CalculationType;
  default_value: number; // Amount or percentage
  is_taxable: boolean;
  is_pf_applicable: boolean;
  is_esi_applicable: boolean;
  is_active: boolean;
  description: string;
}

export interface StructureComponentRule {
  component_id: string;
  component_name: string;
  type: ComponentType;
  calculation_type: CalculationType;
  value: number; // percentage or fixed amount
}

export interface SalaryStructure {
  id: string;
  code: string;
  name: string;
  description: string;
  company_id: string;
  applicable_grade: string;
  base_annual_ctc: number;
  components: StructureComponentRule[];
  status: 'Active' | 'Draft' | 'Archived';
  created_at: string;
  updated_at: string;
}

export interface EmployeeSalaryAssignment {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  designation: string;
  salary_structure_id: string;
  salary_structure_name: string;
  annual_ctc: number;
  gross_monthly: number;
  basic_monthly: number;
  net_monthly_estimate: number;
  payment_mode: 'BankTransfer' | 'Cheque' | 'Cash';
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  pan_number: string;
  pf_uan: string;
  esic_number: string;
  effective_from: string;
  updated_at: string;
}

export interface SalaryRevision {
  id: string;
  employee_id: string;
  employee_name: string;
  effective_date: string;
  previous_ctc: number;
  revised_ctc: number;
  increment_percentage: number;
  reason: string;
  approved_by_name: string;
  status: 'Approved' | 'Pending' | 'Draft';
  created_at: string;
}

export interface PayrollRun {
  id: string;
  run_code: string;
  pay_period: string; // e.g., "August 2026"
  month: string;
  year: number;
  total_employees: number;
  total_gross_pay: number;
  total_net_pay: number;
  total_statutory_deductions: number;
  status: PayrollRunStatus;
  processed_by_name: string;
  approved_by_name?: string;
  created_at: string;
  finalized_at?: string;
}

export interface EmployeePayrollInput {
  employee_id: string;
  employee_name: string;
  department_name: string;
  designation: string;
  bank_account: string;
  ifsc_code: string;
  pan_number: string;
  pf_uan: string;
  
  total_working_days: number;
  days_present: number;
  leave_paid_days: number;
  lop_days: number;
  overtime_hours: number;

  // Earnings Breakdown
  basic_pay: number;
  hra: number;
  special_allowance: number;
  medical_allowance: number;
  conveyance_allowance: number;
  overtime_pay: number;
  incentives: number;
  bonus: number;
  reimbursements: number;
  gross_earnings: number;

  // Deductions Breakdown
  lop_deduction: number;
  pf_employee: number;
  esi_employee: number;
  professional_tax: number;
  tds_income_tax: number;
  lwf_employee: number;
  loan_emi: number;
  salary_advance_deduction: number;
  other_deductions: number;
  total_deductions: number;

  net_pay: number;

  // Employer Statutory Contributions
  pf_employer: number;
  esi_employer: number;
  lwf_employer: number;
  gratuity_provision: number;
  total_ctc_impact: number;
}

export interface EarningRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  type: EarningType;
  amount: number;
  period: string;
  description: string;
  status: 'Approved' | 'Pending' | 'Processed';
  created_at: string;
}

export interface LoanRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  loan_type: 'PersonalLoan' | 'EmergencyLoan' | 'VehicleLoan' | 'HousingLoan';
  principal_amount: number;
  disbursed_amount: number;
  monthly_emi: number;
  total_tenure_months: number;
  paid_tenure_months: number;
  outstanding_balance: number;
  status: 'Active' | 'Closed' | 'PendingApproval';
  disbursed_date: string;
}

export interface SalaryAdvanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  advance_amount: number;
  recovery_month: string;
  recovered_amount: number;
  status: 'Recovered' | 'Pending' | 'PartiallyRecovered';
  requested_date: string;
}

export interface StatutoryConfig {
  pf: {
    employee_rate: number; // 12%
    employer_rate: number; // 12%
    wage_ceiling: number; // 15000
    admin_charge_rate: number; // 0.5%
    edli_rate: number; // 0.5%
  };
  esi: {
    employee_rate: number; // 0.75%
    employer_rate: number; // 3.25%
    wage_ceiling: number; // 21000
  };
  pt: {
    state: string;
    slab_enabled: boolean;
  };
  tds: {
    regime: 'NewRegime' | 'OldRegime';
    standard_deduction: number; // 75000
  };
  lwf: {
    employee_contribution: number; // e.g., 20
    employer_contribution: number; // e.g., 40
  };
  gratuity: {
    formula: string; // (15 * Basic * Years) / 26
    min_years_service: number; // 5 years
  };
}

export interface Payslip {
  id: string;
  payroll_run_id: string;
  pay_period: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  designation: string;
  date_of_joining: string;
  bank_name: string;
  account_number: string;
  pan_number: string;
  pf_uan: string;
  esic_number: string;
  
  total_working_days: number;
  payable_days: number;
  lop_days: number;

  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  
  gross_earnings: number;
  total_deductions: number;
  net_pay: number;
  net_pay_words: string;

  generated_date: string;
}

export interface TaxDocument {
  id: string;
  employee_id: string;
  employee_name: string;
  document_type: 'Form16_PartA' | 'Form16_PartB' | 'TaxComputationSheet' | 'SalaryCertificate';
  assessment_year: string;
  financial_year: string;
  issued_date: string;
  download_url: string;
}

export interface FnFSettlement {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  resignation_date: string;
  last_working_day: string;
  notice_period_days: number;
  notice_shortfall_days: number;
  
  // Computations
  earned_basic_salary: number;
  leave_encashment_days: number;
  leave_encashment_amount: number;
  gratuity_amount: number;
  pending_bonus_reimbursements: number;
  
  // Recoveries
  notice_shortfall_recovery: number;
  outstanding_loan_recovery: number;
  unreturned_asset_deduction: number;

  total_gross_settlement: number;
  total_deductions_recovery: number;
  final_net_settlement_pay: number;
  
  status: 'Draft' | 'SubmittedForApproval' | 'Approved' | 'Disbursed';
  settlement_date: string;
  remarks: string;
}

export interface PayrollReport {
  id: string;
  name: string;
  description: string;
  category: 'Salary' | 'Statutory' | 'Variance' | 'Tax' | 'Audit';
}
