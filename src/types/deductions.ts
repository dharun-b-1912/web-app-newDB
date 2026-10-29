// ============================================================================
// Joy PeopleHR: Configurable Deductions, Loans & EMI, Salary Advances & LOP Types
// ============================================================================

export type LOPCalculationMethod = 'CALENDAR_DAYS' | 'FIXED_30_DAYS' | 'SCHEDULED_WORKING_DAYS';

export type LoanInterestMethod = 'INTEREST_FREE' | 'REDUCING_BALANCE' | 'FLAT_RATE';

export type InsufficientSalaryHandling = 'PARTIAL_AND_CARRY_FORWARD' | 'DEFER_INSTALLMENT' | 'STOP_RECOVERY';

export type DeductionCategory = 'STATUTORY' | 'LOP' | 'SALARY_ADVANCE' | 'LOAN_EMI' | 'VOLUNTARY' | 'OTHER';

export interface PayrollDeductionPolicy {
  id: string;
  organization_id: string;
  company_id: string;
  policy_name: string;
  lop_calculation_method: LOPCalculationMethod;
  lop_days_divisor: number;
  max_total_deduction_percent: number; // e.g. 50%
  max_salary_advance_percent: number;  // e.g. 50%
  max_active_loans_per_employee: number;
  max_active_advances_per_employee: number;
  loan_interest_method: LoanInterestMethod;
  default_loan_annual_interest_rate: number;
  loan_tenure_min_months: number;
  loan_tenure_max_months: number;
  deduction_priority_order: DeductionCategory[];
  insufficient_salary_handling: InsufficientSalaryHandling;
  effective_from: string;
  effective_to?: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface LoanAmortizationInstallment {
  id?: string;
  installment_number: number;
  payroll_period: string; // 'YYYY-MM'
  due_date: string;
  opening_balance: number;
  principal_component: number;
  interest_component: number;
  total_installment_amount: number;
  recovered_amount: number;
  outstanding_amount: number;
  closing_balance: number;
  recovery_status: 'SCHEDULED' | 'RECOVERED' | 'PARTIALLY_RECOVERED' | 'DEFERRED' | 'WAIVED';
  payroll_run_id?: string;
  recovered_at?: string;
}

export interface EmployeeLoanAccount {
  id: string;
  organization_id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  loan_code: string;
  loan_type: string;
  principal_amount: number;
  annual_interest_rate: number;
  interest_method: LoanInterestMethod;
  tenure_months: number;
  monthly_emi: number;
  total_interest: number;
  total_repayable: number;
  amount_recovered: number;
  balance_amount: number;
  disbursement_date?: string;
  disbursement_reference?: string;
  disbursement_status: 'PENDING' | 'DISBURSED' | 'CANCELLED';
  emi_start_period: string;
  emi_end_period: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'DISBURSED' | 'ACTIVE' | 'PAUSED' | 'SETTLED' | 'REJECTED' | 'CANCELLED';
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  approved_at?: string;
  reason?: string;
  schedules?: LoanAmortizationInstallment[];
  created_at: string;
  updated_at: string;
}

export interface SalaryAdvanceItem {
  id: string;
  organization_id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  advance_code: string;
  advance_amount: number;
  recovery_period: string;
  recovery_installments_count: number;
  monthly_recovery_amount: number;
  amount_recovered: number;
  balance_amount: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DISBURSED' | 'ACTIVE' | 'SETTLED' | 'REJECTED' | 'CANCELLED';
  disbursement_status: 'PENDING' | 'DISBURSED';
  disbursement_date?: string;
  disbursement_reference?: string;
  approved_by?: string;
  approved_at?: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeLopRecord {
  id?: string;
  organization_id: string;
  payroll_period: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  monthly_gross: number;
  calculation_basis: LOPCalculationMethod;
  divisor_used: number;
  daily_wage_rate: number;
  unpaid_absence_days: number;
  unpaid_leave_days: number;
  unregularized_missing_punch_days: number;
  total_lop_days: number;
  computed_lop_deduction: number;
  source_attendance_count: number;
  status: 'CALCULATED' | 'FINALIZED' | 'OVERRIDDEN';
}

export interface PayrollDeductionItem {
  id?: string;
  organization_id: string;
  payroll_period: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  deduction_category: DeductionCategory;
  source_id?: string;
  scheduled_amount: number;
  applied_amount: number;
  deferred_amount: number;
  reason_for_deferral?: string;
  status: 'PENDING' | 'APPLIED' | 'DEFERRED' | 'REVERSED';
  payroll_run_id?: string;
  created_at?: string;
}

export interface PayrollReconciliationRow {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  monthly_gross: number;
  lop_days: number;
  lop_deduction: number;
  advance_recovery: number;
  loan_emi: number;
  statutory_deductions: number; // PF, ESI, PT
  total_scheduled_deductions: number;
  permitted_deduction_cap: number;
  actual_applied_deductions: number;
  deferred_deductions: number;
  estimated_net_pay: number;
  reconciliation_status: 'BALANCED' | 'CAPPED_AND_DEFERRED' | 'INSUFFICIENT_SALARY' | 'WARNING';
}
