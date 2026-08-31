// src/types/payroll.ts
// ============================================================================
// Joy PeopleHR — Production Multi-Tenant Payroll & Compensation Types
// ============================================================================

export type ComponentType =
  | 'Earning'
  | 'Deduction'
  | 'Employer Contribution'
  | 'Information Only'
  | 'Reimbursement'
  | 'Benefit'
  | 'Statutory';

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
  | 'Retiral'
  | 'Gratuity'
  | 'Reimbursement'
  | 'Custom';

export type CalculationType =
  | 'FixedAmount'
  | 'PercentageOfBasic'
  | 'PercentageOfGross'
  | 'PercentageOfCTC'
  | 'Formula'
  | 'Slab'
  | 'PerDay'
  | 'PerHour'
  | 'AttendanceBased'
  | 'OvertimeBased'
  | 'ManualInput'
  | 'Variable';

export interface ComponentSlab {
  min_amount: number;
  max_amount?: number;
  rate_type: 'Fixed' | 'Percentage';
  rate_value: number;
}

export interface ComponentEligibilityRule {
  employment_types?: string[];
  locations?: string[];
  departments?: string[];
  grades?: string[];
  condition_logic: 'ALL' | 'ANY';
}

export type PayrollRunStatus =
  | 'Draft'
  | 'InputCollected'
  | 'Calculating'
  | 'Validation'
  | 'PreviewReady'
  | 'ExceptionReview'
  | 'SubmittedForApproval'
  | 'Approved'
  | 'Finalized'
  | 'DisbursementPending'
  | 'Paid'
  | 'Reversed';

export interface SalaryComponent {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  type: ComponentType;
  category: ComponentCategory;
  calculation_type: CalculationType;
  default_value: number; // Amount or percentage
  formula_expression?: string;
  slabs?: ComponentSlab[];
  daily_basis?: 'CalendarDays' | 'Fixed30Days' | 'WorkingDays26' | 'ActualMonthDays';
  hourly_basis?: string;
  ot_multiplier?: number;
  eligibility?: ComponentEligibilityRule;
  is_taxable: boolean;
  taxability_type?: 'Taxable' | 'NonTaxable' | 'PartiallyTaxable';
  taxable_percentage?: number;
  is_pf_applicable: boolean;
  is_esi_applicable: boolean;
  is_pt_applicable?: boolean;
  is_tds_applicable?: boolean;
  rounding_rule?: 'NoRounding' | 'NearestRupee' | 'RoundUp' | 'RoundDown' | 'Nearest5' | 'Nearest10';
  min_floor?: number;
  max_cap?: number;
  payslip_display_name?: string;
  payslip_group?: string;
  payslip_order?: number;
  show_on_payslip?: boolean;
  show_zero_values?: boolean;
  is_active: boolean;
  status?: 'Active' | 'Draft' | 'Archived';
  description: string;
  version?: number;
  effective_from?: string;
  used_by_structures_count?: number;
  used_by_employees_count?: number;
}

export interface StructureComponentRule {
  component_id: string;
  component_name: string;
  component_code: string;
  type: ComponentType;
  calculation_type: CalculationType;
  value: number; // percentage or fixed amount
  basis?: string;
  is_taxable?: boolean;
  statutory_flags?: string[];
  display_order?: number;
}

export interface SalaryStructure {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string;
  company_id: string;
  applicable_grade: string;
  base_annual_ctc: number;
  components: StructureComponentRule[];
  status: 'Active' | 'Draft' | 'Archived';
  version: number;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSalaryAssignment {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_code: string;
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
  pf_applicable?: boolean;
  esi_applicable?: boolean;
  pt_applicable?: boolean;
  tds_applicable?: boolean;
  effective_from: string;
  status: 'Active' | 'Revised' | 'Inactive' | 'Draft';
  updated_at: string;
}

export interface SalaryRevision {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  previous_ctc: number;
  new_ctc: number;
  hike_percentage: number;
  reason: string;
  effective_from: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  approved_by?: string;
  created_at: string;
}

export interface EmployeePayrollInput {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  designation: string;
  
  // Attendance & Time inputs
  total_working_days: number;
  payable_days: number;
  present_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  lop_days: number;
  overtime_hours: number;
  
  // Base Structure Figures
  ctc_annual: number;
  gross_fixed: number;
  basic: number;
  hra: number;
  special_allowance: number;
  conveyance: number;
  medical: number;
  other_allowances: number;
  
  // Dynamic Additions
  overtime_pay: number;
  incentives: number;
  bonus: number;
  reimbursements: number;
  arrears: number;
  total_earnings: number;
  
  // Deductions
  lop_deduction: number;
  epf_employee: number;
  esic_employee: number;
  professional_tax: number;
  tds_tax: number;
  loan_emi: number;
  advance_recovery: number;
  fines_deductions?: number;
  other_deductions: number;
  total_deductions: number;
  
  // Employer Statutory
  epf_employer: number;
  esic_employer: number;
  
  // Final Net
  net_pay: number;
  net_pay_in_words?: string;
  
  // Status & Bank
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  pan_number: string;
  has_exceptions: boolean;
  exception_notes?: string;
  status: 'Draft' | 'Calculated' | 'Approved' | 'Finalized' | 'Paid' | 'Excluded';
  created_at?: string;
  updated_at?: string;
}

export interface PayrollRun {
  id: string;
  tenant_id: string;
  run_number: string; // e.g. "RUN-2026-08"
  pay_period: string; // e.g. "August 2026"
  period_start: string;
  period_end: string;
  payout_date: string;
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net_payout: number;
  total_employer_statutory: number;
  total_payroll_cost: number;
  status: PayrollRunStatus;
  is_locked: boolean;
  approved_by?: string;
  approved_at?: string;
  finalized_by?: string;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
  employee_records: EmployeePayrollInput[];
}

export interface LoanRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  loan_type: 'Personal Loan' | 'Emergency Advance' | 'Education' | 'Housing Assistance';
  principal_amount: number;
  interest_rate: number;
  tenure_months: number;
  monthly_emi: number;
  total_repayable: number;
  amount_recovered: number;
  balance_amount: number;
  start_period: string; // e.g. "August 2026"
  end_period: string;
  disbursement_date?: string;
  status: 'Active' | 'Completed' | 'Defaulted' | 'Settled';
  approved_by: string;
  created_at: string;
}

export interface SalaryAdvanceRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  advance_amount: number;
  recovered_amount: number;
  balance_amount: number;
  deduction_period: string; // e.g. "August 2026"
  reason: string;
  status: 'Pending' | 'Approved' | 'Deducted' | 'Cancelled';
  created_at: string;
}

export interface ReimbursementClaim {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  category: 'Travel' | 'Client Meal' | 'Internet & Phone' | 'Training & Cert' | 'Medical' | 'Office Supplies';
  claim_date: string;
  amount: number;
  approved_amount: number;
  receipt_number: string;
  receipt_url?: string;
  description: string;
  status: 'Pending' | 'Manager Approved' | 'Finance Approved' | 'Processed in Payroll' | 'Rejected';
  payroll_run_id?: string;
  created_at: string;
}

export interface StatutoryConfig {
  tenant_id: string;
  pf_enabled: boolean;
  pf_employee_percent: number; // 12
  pf_employer_percent: number; // 12
  pf_wage_ceiling: number;    // 15000
  esi_enabled: boolean;
  esi_employee_percent: number; // 0.75
  esi_employer_percent: number; // 3.25
  esi_wage_ceiling: number;     // 21000
  pt_enabled: boolean;
  pt_monthly_slab: number;      // 200
  tds_auto_deduct: boolean;
  lwf_enabled: boolean;
  lwf_amount: number;
}

export type DisbursementBatchStatus =
  | 'Draft'
  | 'ValidationPending'
  | 'ValidationFailed'
  | 'ReadyForApproval'
  | 'PendingApproval'
  | 'Approved'
  | 'Submitting'
  | 'Submitted'
  | 'BankProcessing'
  | 'PartiallySettled'
  | 'Settled'
  | 'Paid'
  | 'Reconciled'
  | 'ExceptionsFound'
  | 'Closed'
  | 'Cancelled'
  | 'FileGenerated';

export interface DisbursementValidationCheck {
  id: string;
  category: 'PAYROLL' | 'EMPLOYEE' | 'BANK' | 'DUPLICATE' | 'AMOUNT' | 'SECURITY';
  name: string;
  status: 'Passed' | 'Warning' | 'Failed';
  severity: 'Blocking' | 'Warning' | 'Info';
  message: string;
  affected_count?: number;
}

export interface BankDisbursementBatch {
  id: string;
  tenant_id: string;
  batch_number: string; // e.g. "PAY-AUG-2026-001"
  payroll_run_id: string;
  pay_period: string;
  template_id?: string;
  template_name?: string;
  total_transactions: number;
  total_amount: number;
  currency: string;
  payment_mode: 'NEFT' | 'RTGS' | 'ACH' | 'Direct Transfer' | 'IMPS';
  bank_account_source: string;
  status: DisbursementBatchStatus;
  generated_by: string;
  maker_name?: string;
  maker_signed_at?: string;
  maker_notes?: string;
  checker_name?: string;
  checker_approved_at?: string;
  checker_notes?: string;
  rejection_reason?: string;
  approved_by?: string;
  submitted_at?: string;
  idempotency_key?: string;
  bank_reference_id?: string;
  bank_acknowledgement_time?: string;
  successful_count?: number;
  failed_count?: number;
  successful_amount?: number;
  failed_amount?: number;
  processed_at?: string;
  reconciled_at?: string;
  reconciled_by?: string;
  closed_at?: string;
  created_at: string;
  confirmation_channel?: 'Email' | 'Phone' | 'NetBanking' | 'BankStatement' | 'FileImport' | 'DirectManual';
  confirmed_by_name?: string;
  confirmation_notes?: string;
  bank_utr_master?: string;
  source_bank_name?: string;
  source_account_number?: string;
  source_ifsc?: string;
  source_branch?: string;
  intra_bank_count?: number;
  intra_bank_amount?: number;
  inter_bank_count?: number;
  inter_bank_amount?: number;
  destination_bank_breakdown?: Array<{
    bank_name: string;
    count: number;
    amount: number;
    transfer_type: 'Intra-Bank (Same Bank FT)' | 'Inter-Bank (NEFT)' | 'Inter-Bank (RTGS)' | 'Inter-Bank (IMPS)';
  }>;
  validation_checks?: DisbursementValidationCheck[];
  items?: BankDisbursementItem[];
}

export interface CorporateFundingAccount {
  id: string;
  tenant_id: string;
  bank_name: string;
  account_number: string;
  account_number_masked: string;
  account_type: 'Current Account' | 'Corporate CMS Account' | 'Escrow Account' | 'Salary Disbursement A/c';
  ifsc_code: string;
  branch_name: string;
  client_code?: string;
  balance_amount?: number;
  is_primary: boolean;
  default_template_id: string;
}

export interface FnFSettlement {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  designation: string;
  resignation_date: string;
  last_working_date: string;
  notice_period_required_days: number;
  notice_period_served_days: number;
  notice_shortfall_days: number;
  
  // Earnings in settlement
  unpaid_salary_days: number;
  unpaid_salary_amount: number;
  earned_leave_balance_days: number;
  leave_encashment_amount: number;
  gratuity_amount: number;
  bonus_incentive_amount: number;
  reimbursement_amount: number;
  total_gross_settlement: number;
  
  // Deductions in settlement
  notice_shortfall_recovery: number;
  loan_outstanding_recovery: number;
  advance_outstanding_recovery: number;
  asset_recovery_deduction: number;
  statutory_deductions: number;
  total_deductions_settlement: number;
  
  // Net settlement
  net_settlement_payable: number;
  net_in_words?: string;
  
  payment_status: 'Calculated' | 'Pending Approval' | 'Approved' | 'Disbursed' | 'Closed';
  settlement_date: string;
  approved_by?: string;
  created_at: string;
}

export interface Payslip {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  designation: string;
  joining_date: string;
  pay_period: string; // e.g. "August 2026"
  payout_date: string;
  payable_days: number;
  lop_days: number;
  bank_name: string;
  account_number_masked: string;
  ifsc_code: string;
  pan_number_masked: string;
  pf_uan: string;
  esic_number: string;
  
  // Earnings Breakup
  earnings: Array<{ name: string; amount: number }>;
  gross_earnings: number;
  
  // Deductions Breakup
  deductions: Array<{ name: string; amount: number }>;
  total_deductions: number;
  
  // Net Pay
  net_pay: number;
  net_pay_in_words: string;
  
  // Employer Contribution Summary
  employer_contributions: Array<{ name: string; amount: number }>;
  
  is_finalized: boolean;
  generated_at: string;
}

export interface TaxDocument {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  doc_type: 'Form 16' | 'Form 12BA' | 'IT Declaration' | 'Salary Certificate';
  financial_year: string;
  generated_at: string;
  status: 'Generated' | 'Signed' | 'Downloaded';
  download_url?: string;
}

export interface CalculationSourceItem {
  name: string;
  category: ComponentCategory | 'Net';
  amount: number;
  source: string; // e.g. "Salary Structure / v4.2 / Effective 01-Apr-2026", "Attendance → Overtime Engine (4.5 hrs @ 1.5x)", "Statutory Rule / TN-PF-01"
  formula_applied?: string;
  rule_version?: string;
  notes?: string;
}

export interface CalculationBreakdown {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  pay_period: string;
  annual_ctc: number;
  gross_earnings: number;
  total_deductions: number;
  net_pay: number;
  net_pay_in_words: string;
  
  // Itemized Traceable Sources
  earnings_breakdown: CalculationSourceItem[];
  deductions_breakdown: CalculationSourceItem[];
  statutory_breakdown: CalculationSourceItem[];
  tax_projection: {
    regime: 'New Regime (Sec 115BAC)' | 'Old Regime';
    projected_annual_gross: number;
    standard_deduction: number;
    exemptions_and_80c: number;
    projected_taxable_income: number;
    annual_tax_liability: number;
    tax_already_deducted: number;
    remaining_tax: number;
    remaining_months: number;
    monthly_tds: number;
    tax_source: string;
  };
  attendance_summary: {
    total_days: number;
    payable_days: number;
    present_days: number;
    paid_leave_days: number;
    lop_days: number;
    overtime_hours: number;
    proration_method: 'Actual Days in Month' | 'Actual Days in Month (DOJ Adjusted)' | 'Fixed 30-Day Basis' | 'Working Days Only';
    source: string;
  };
}

export interface TamilNaduPTSlab {
  id: string;
  jurisdiction_name: string; // e.g., "Greater Chennai Corporation", "Coimbatore Corporation", "Hosur Municipality", "Madurai Corporation", "Tiruppur City"
  local_authority_type: 'Corporation' | 'Municipality' | 'Town Panchayat' | 'Special Economic Zone';
  half_year_period: 'Period I (Apr - Sep)' | 'Period II (Oct - Mar)';
  effective_from: string;
  slabs: Array<{
    min_gross_half_year: number;
    max_gross_half_year: number | null; // null = above
    half_year_tax_amount: number;
    monthly_deduction_amount: number;
  }>;
}

export interface TaxDeclaration12BB {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  financial_year: string; // e.g. "2026-2027"
  tax_regime: 'New (Sec 115BAC)' | 'Old Regime';
  section_80c_total: number; // PPF, ELSS, EPF, LIC (Max 1.5L)
  section_80d_medical: number; // Health insurance (Self & Parents)
  section_24b_home_loan_interest: number; // Max 2L in Old Regime
  hra_rent_paid_annual: number;
  hra_city_type: 'Metro (50%)' | 'Non-Metro (40%)';
  other_exemptions: number;
  proof_status: 'Submitted' | 'Verified' | 'Pending Review' | 'Draft';
  verified_by?: string;
  updated_at: string;
}

export interface ECRRecord {
  uan: string;
  member_name: string;
  gross_wages: number;
  epf_wages: number;
  eps_wages: number;
  edli_wages: number;
  ee_share: number; // 12%
  er_share_epf: number; // 3.67%
  er_share_eps: number; // 8.33%
  ncp_days: number; // Non-contributing / LOP days
  refund_of_advances: number;
}

export interface BankReconciliationDiscrepancy {
  employee_id: string;
  employee_name: string;
  account_number_masked: string;
  expected_amount: number;
  bank_processed_amount: number;
  variance: number;
  reason: string;
  status: 'Pending Investigation' | 'Resolved' | 'Manual Correction';
}

export interface PayslipComponentConfigItem {
  id: string;
  code: string;
  name: string;
  category: 'Earning' | 'Deduction' | 'Employer Contribution' | 'Reimbursement';
  calculation_rule: string;
  visibility: 'always' | 'nonzero' | 'hide';
  order: number;
  is_custom?: boolean;
}

export interface PayslipTemplateConfig {
  id?: string;
  tenant_id: string;
  template_name?: string;
  template_code?: string;
  template_style: 'TamilNaduStandardGrid' | 'ModernMinimal' | 'CorporateClean' | 'ContractWorker' | 'DailyWage';
  status?: 'Active' | 'Draft' | 'Archived';
  version?: string;
  effective_from?: string;
  company_name: string;
  company_logo_url?: string;
  company_address: string;
  site_hr_phone: string;
  manager_phone: string;
  esi_epf_enquiry_phone: string;
  md_phone: string;
  email: string;
  website: string;
  client_name_default: string; // e.g. "Watertec Unit I"
  show_per_day_column: boolean;
  show_monthly_column?: boolean;
  show_ot_breakdown?: boolean;
  show_employer_contributions?: boolean;
  show_food_allowance: boolean;
  show_night_allowance: boolean;
  show_ot_wages: boolean;
  show_attendance_bonus: boolean;
  show_canteen_deduction: boolean;
  show_snacks_deduction: boolean;
  show_tent_deduction: boolean;
  show_lwf_deduction: boolean;
  components?: PayslipComponentConfigItem[];
  footer_disclaimer: string;
}

export interface BankPaymentColumnMapping {
  internal_field:
    | 'employee_code'
    | 'employee_name'
    | 'bank_account'
    | 'ifsc'
    | 'net_pay'
    | 'payment_date'
    | 'narration'
    | 'reference_number'
    | 'payment_mode_code'
    | 'corporate_debit_account'
    | 'client_code'
    | 'beneficiary_email';
  bank_column_header: string;
  format?: string;
  required: boolean;
}

export interface BankPaymentTemplate {
  id: string;
  tenant_id: string;
  template_name: string;
  bank_name: string;
  payment_mode: 'NEFT' | 'RTGS' | 'IMPS' | 'ACH' | 'Internal Transfer' | 'Direct Transfer';
  file_type: 'CSV' | 'TXT' | 'XLSX';
  delimiter: ',' | '|' | '#' | '\t';
  has_header_row: boolean;
  date_format: 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY';
  narration_template: string;
  column_mappings: BankPaymentColumnMapping[];
}

export interface BankDisbursementItem {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department?: string;
  designation?: string;
  bank_name?: string;
  account_number_masked: string;
  account_number_raw?: string;
  ifsc_code: string;
  amount: number;
  currency?: string;
  payment_method?: string;
  source_bank_name?: string;
  source_account_masked?: string;
  transfer_type?: 'Intra-Bank (Same Bank FT)' | 'Inter-Bank (NEFT)' | 'Inter-Bank (RTGS)' | 'Inter-Bank (IMPS)';
  validation_status: 'Passed' | 'MissingIFSC' | 'InvalidAccount' | 'DuplicateAccount' | 'ChangedAccount';
  validation_error?: string;
  bank_status: 'Pending' | 'Success' | 'Failed' | 'Rejected' | 'Settled' | 'Processing';
  bank_reference_number?: string;
  bank_error_code?: string;
  bank_error_message?: string;
  submitted_at?: string;
  settled_at?: string;
  retry_count?: number;
  last_retry_at?: string;
}

export interface OrgTagRuleAssignment {
  id: string;
  tenant_id: string;
  rule_name: string;
  location_tag: string; // e.g. "Hosur Plant", "Chennai Office"
  department_tag: string; // e.g. "Production", "IT"
  grade_tag: string; // e.g. "Grade A", "Staff"
  salary_structure_id: string;
  ot_rule: 'Standard-1.5x' | 'Double-2.0x' | 'Fixed-Rate-150' | 'No-OT';
  lop_rule: 'Calendar-30' | 'Working-Days-26' | 'Actual-Month-Days';
  pt_jurisdiction_id: string;
  pay_cycle: 'Monthly' | 'BiWeekly';
  maker_role: string;
  checker_role: string;
}

export interface PayrollAuditEvent {
  id: string;
  tenant_id: string;
  actor_name: string;
  actor_role: string;
  action_type: 'RUN_CREATED' | 'CALCULATED' | 'APPROVED' | 'FINALIZED' | 'LOCKED' | 'SALARY_REVISED' | 'DISBURSED' | 'FNF_SETTLED' | 'UPDATED' | 'ADJUSTED' | 'REOPENED' | 'DELETED';
  entity_id: string;
  summary: string;
  timestamp: string;
}

// ────────────────────────────────────────────────────────────────────────────
// LAYER 2: IMMUTABLE PAYROLL INPUT SNAPSHOT (Frozen at Payroll Run Creation)
// ────────────────────────────────────────────────────────────────────────────

export interface PayrollInputSnapshot {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  designation: string;
  location: string;
  joining_date: string;
  exit_date?: string;
  is_new_joiner: boolean;
  is_exit_period: boolean;
  employment_status: string;
  
  // Statutory Profile
  pf_eligible: boolean;
  pf_uan?: string;
  pf_capped: boolean;
  esi_eligible: boolean;
  esi_ip_number?: string;
  esi_coverage_status: 'NEW_COVERAGE' | 'CONTINUING_COVERAGE' | 'NOT_COVERED' | 'COVERAGE_ENDED' | 'REVIEW_REQUIRED';
  pt_eligible: boolean;
  pt_state_jurisdiction: string;
  tax_regime: 'NEW' | 'OLD';

  // Base Structure Snapshot
  salary_structure_id: string;
  salary_structure_code: string;
  annual_ctc: number;
  monthly_gross_fixed: number;
  basic_fixed: number;
  hra_fixed: number;
  special_allowance_fixed: number;
  conveyance_fixed: number;
  medical_fixed: number;
  other_allowances_fixed: number;

  // Ingested Attendance Snapshot (Locked from Attendance Module)
  total_calendar_days: number;
  payable_days: number;
  present_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  absent_days: number;
  lop_days: number;
  ncp_days: number;
  approved_ot_hours: number;

  // Dynamic Variable Ingestion
  approved_claims_total: number;
  bonus_amount: number;
  incentives_amount: number;
  loan_emi_due: number;
  advance_recovery_due: number;
  voluntary_deductions: number;

  snapshot_created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// LAYER 3: DISTINCT WAGE CLASSIFICATIONS (Independent Statutory Bases)
// ────────────────────────────────────────────────────────────────────────────

export interface PayrollWageClassification {
  gross_earnings: number;
  pf_wage: number;                  // Basic + qualifying allowances (capped at ₹15,000 or full basic)
  esi_coverage_wage: number;        // Salary excluding OT remuneration for ₹21,000 threshold check
  esi_overtime_wage: number;        // Approved OT earnings
  esi_contribution_wage: number;    // esi_coverage_wage + esi_overtime_wage (once covered)
  gratuity_wage: number;            // Applicable Basic wage base for 4.81% gratuity provision
  taxable_wage: number;             // Gross - statutory exemptions
  lop_wage_base: number;            // Gross or Basic based on configured LOP rule
  ot_wage_base: number;             // Gross or Basic based on configured OT rule
}

// ────────────────────────────────────────────────────────────────────────────
// LAYER 4: NORMALIZED CALCULATION LINE ITEM ("How Calculated" Explainability)
// ────────────────────────────────────────────────────────────────────────────

export interface CalculationLineItem {
  component_code: string;
  component_name: string;
  category: ComponentCategory;
  type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION' | 'STATUTORY';
  basis: string;                    // e.g. "PF_WAGE", "ESI_CONTRIBUTION_WAGE", "MONTHLY_GROSS"
  basis_amount: number;             // Base value evaluated
  rate: number;                     // Rate percentage or fixed multiplier (e.g. 12% = 0.12)
  quantity?: number;                // e.g. 10 hours OT, 2 LOP days
  formula: string;                  // Plain-text readable formula (e.g. "₹15,000 × 12%")
  amount: number;                   // Final calculated amount
  source: string;                   // e.g. "Salary Structure", "Statutory Rule PF-2026", "Attendance Engine"
  rule_version: string;             // e.g. "PF-V4-2026", "ESIC-2026-V1"
  is_employer_cost: boolean;        // True if employer-side liability (NEVER deducted from net)
  is_taxable: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// STATUTORY ASSESSMENTS (Official Indian Compliance Proofs)
// ────────────────────────────────────────────────────────────────────────────

export interface ESIStatutoryAssessment {
  coverage_wage: number;            // Excludes OT
  coverage_limit: number;           // ₹21,000
  overtime_wage: number;            // OT amount
  is_covered: boolean;              // true if coverage_wage <= 21,000 or continuing coverage
  coverage_status: 'NEW_COVERAGE' | 'CONTINUING_COVERAGE' | 'NOT_COVERED' | 'COVERAGE_ENDED';
  contribution_wage: number;        // coverage_wage + overtime_wage if covered, else 0
  employee_rate: number;            // 0.75%
  employee_contribution: number;    // contribution_wage * 0.0075
  employer_rate: number;            // 3.25%
  employer_contribution: number;    // contribution_wage * 0.0325
  rule_version: string;
  explanation: string;
}

export interface PFStatutoryAssessment {
  pf_wage: number;                  // Capped at ₹15,000 ceiling or full basic
  wage_ceiling: number;             // ₹15,000
  employee_rate: number;            // 12%
  employee_contribution: number;    // pf_wage * 0.12
  employer_pf_rate: number;         // 12%
  employer_pf_amount: number;       // pf_wage * 0.12
  employer_gov_portion_rate: number;// 1% (0.5% Admin + 0.5% EDLI)
  employer_gov_portion_amount: number; // pf_wage * 0.01
  total_employer_pf_cost: number;   // employer_pf_amount + employer_gov_portion_amount (13% total)
  rule_version: string;
  explanation: string;
}

export interface GratuityStatutoryAssessment {
  gratuity_wage: number;
  provision_rate: number;           // 4.81%
  employer_provision_amount: number;// gratuity_wage * 0.0481
  rule_version: string;
  is_employer_cost: boolean;        // Always true (not deducted from employee)
  explanation: string;
}

// ────────────────────────────────────────────────────────────────────────────
// LAYER 5: EXCEPTION & VARIANCE ENGINE
// ────────────────────────────────────────────────────────────────────────────

export type ExceptionSeverity = 'BLOCKER' | 'ERROR' | 'WARNING' | 'INFO';

export interface PayrollException {
  id: string;
  tenant_id: string;
  payroll_run_id?: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  severity: ExceptionSeverity;
  category: 'SALARY_MISSING' | 'BANK_INVALID' | 'STATUTORY_MISMATCH' | 'ATTENDANCE_INCOMPLETE' | 'NEGATIVE_NET' | 'ABNORMAL_VARIANCE' | 'ESI_ANOMALY';
  message: string;
  suggested_action: string;
  source: string;
  detected_at: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
}

export interface PayrollVarianceItem {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  previous_net: number;
  current_net: number;
  net_variance_amount: number;
  net_variance_percentage: number;
  primary_reason: string;           // e.g. "LOP: 4 days (₹4,500 deduction)", "Salary Revision (+15%)", "New Joiner (18 days prorated)"
  severity: 'NORMAL' | 'SIGNIFICANT' | 'ABNORMAL';
}



