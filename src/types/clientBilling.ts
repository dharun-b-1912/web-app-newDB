// src/types/clientBilling.ts
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — Client Payroll & Billing Engine Types
// ============================================================================

export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PROSPECT';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWAL_PENDING';

export type BillingFrequency = 'MONTHLY' | 'WEEKLY' | 'FORTNIGHTLY' | 'CUSTOM';

export type ServiceType =
  | 'MANPOWER_SUPPLY'
  | 'CONTRACT_LABOUR'
  | 'STAFFING'
  | 'OUTSOURCING'
  | 'SECURITY'
  | 'HOUSEKEEPING'
  | 'FACILITY_MANAGEMENT'
  | 'TECHNICAL_STAFFING'
  | 'IT_CONTRACTING';

export type WageType =
  | 'MONTHLY_SALARY'
  | 'DAILY_WAGE'
  | 'HOURLY_WAGE'
  | 'SHIFT_WAGE'
  | 'PIECE_RATE'
  | 'FIXED_CONTRACT_WAGE';

export type SalaryDivisorType =
  | 'CALENDAR_DAYS'
  | 'FIXED_26'
  | 'FIXED_30'
  | 'FIXED_31'
  | 'WORKING_DAYS'
  | 'CLIENT_CUSTOM';

export type RuleCalculationMethod =
  | 'FIXED_AMOUNT'
  | 'PERCENTAGE_OF_GROSS'
  | 'PERCENTAGE_OF_BASIC'
  | 'PERCENTAGE_OF_BILLABLE_WAGES'
  | 'PER_EMPLOYEE'
  | 'PER_DAY'
  | 'PER_HOUR'
  | 'PER_OT_HOUR'
  | 'CUSTOM_FORMULA';

export type BillingRunStatus =
  | 'DRAFT'
  | 'CALCULATED'
  | 'AUDIT_REVIEW'
  | 'FINANCE_REVIEW'
  | 'APPROVED'
  | 'INVOICE_GENERATED'
  | 'SENT'
  | 'PAID'
  | 'CLOSED'
  | 'VOIDED';

export type SupplyType = 'INTRASTATE' | 'INTERSTATE' | 'SEZ' | 'EXPORT';

export type RoundingPolicy = 'ROUND' | 'ROUND_UP' | 'ROUND_DOWN' | 'NO_ROUND';

// ----------------------------------------------------------------------------
// Client Master
// ----------------------------------------------------------------------------
export interface ClientMaster {
  id: string;
  tenant_id: string;
  client_code: string;
  legal_name: string;
  display_name: string;
  gstin: string;
  pan: string;
  registered_address: string;
  billing_address: string;
  city: string;
  state: string;
  state_code: string; // e.g. '33' for Tamil Nadu, '29' for Karnataka
  pincode: string;
  contact_person: string;
  contact_designation?: string;
  email: string;
  phone: string;
  payment_terms: string; // e.g. '30 Days', 'Immediate'
  credit_period_days: number;
  currency: string; // 'INR'
  status: ClientStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Client Contract Master
// ----------------------------------------------------------------------------
export interface ClientContract {
  id: string;
  tenant_id: string;
  client_id: string;
  contract_name: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  service_type: ServiceType;
  sac_code: string; // Default: '998519' (Other support services / Manpower Supply)
  billing_frequency: BillingFrequency;
  billing_period_start_day: number; // e.g. 1
  billing_period_end_day: number; // e.g. 31
  salary_divisor_type: SalaryDivisorType;
  custom_divisor_days?: number;
  standard_working_hours_per_day: number; // Default: 8
  ot_multiplier: number; // Default: 2.0 (Double Rate)
  is_pf_billable: boolean; // Employer PF pass-through to invoice
  is_esi_billable: boolean; // Employer ESI pass-through to invoice
  is_canteen_deducted_from_billing: boolean; // Deduct canteen from billable wages or treat as employee recovery
  default_service_charge_pct: number; // e.g. 8.5%
  transport_rate_per_employee: number; // e.g. ₹375
  canteen_rate_per_employee: number; // e.g. ₹650
  status: ContractStatus;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Employee Client Deployment (Historical & Active)
// ----------------------------------------------------------------------------
export interface EmployeeClientDeployment {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  client_id: string;
  contract_id: string;
  location_id?: string;
  location_name?: string;
  department_id?: string;
  department_name?: string;
  designation: string;
  grade?: string;
  wage_type: WageType;
  monthly_fixed_wage?: number;
  daily_wage_rate?: number;
  hourly_wage_rate?: number;
  shift_rate?: number;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  status: 'ACTIVE' | 'TRANSFERRED' | 'RELEASED';
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Billing Rules & Configuration Master
// ----------------------------------------------------------------------------
export interface BillingRule {
  id: string;
  tenant_id: string;
  client_id?: string; // If undefined, applies globally
  contract_id?: string; // If undefined, applies to all client contracts
  rule_code: string;
  rule_name: string;
  charge_category: 'SERVICE_CHARGE' | 'TRANSPORT' | 'CANTEEN' | 'ACCOMMODATION' | 'UNIFORM' | 'STATUTORY_ADMIN' | 'REIMBURSEMENT' | 'CUSTOM';
  calculation_method: RuleCalculationMethod;
  rate_value: number; // Amount or percentage
  base_field?: 'GROSS_BILLABLE_WAGES' | 'BASIC_WAGES' | 'TOTAL_EARNINGS' | 'EMPLOYEE_COUNT' | 'PAYABLE_DAYS' | 'OT_HOURS';
  custom_formula_expression?: string;
  is_taxable_under_gst: boolean;
  priority: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  notes?: string;
}

export interface ClientBillingPolicy {
  id: string;
  tenant_id: string;
  client_id: string;
  contract_id: string;
  billable_components: {
    basic: boolean;
    da: boolean;
    hra: boolean;
    special_allowance: boolean;
    overtime: boolean;
    attendance_bonus: boolean;
    incentive: boolean;
    arrears: boolean;
    leave_wages: boolean;
    food_allowance: boolean;
    other_allowances: boolean;
  };
  employer_statutory_billing: {
    bill_employer_pf: boolean;
    pf_rate_pct: number; // 12% (or 13% with admin/edli)
    bill_pf_admin_charges: boolean;
    pf_admin_rate_pct: number; // 0.5%
    pf_edli_rate_pct: number; // 0.5%
    bill_employer_esi: boolean;
    esi_rate_pct: number; // 3.25%
    bill_employer_lwf: boolean;
    lwf_amount_per_employee: number;
  };
  recovery_treatment: {
    canteen_recovery_deducted_from_gross: boolean;
    uniform_recovery_deducted_from_gross: boolean;
    pass_through_recoveries_to_client: boolean;
  };
  gst_configuration: {
    supplier_state_code: string; // e.g. '33'
    supplier_gstin: string;
    gst_rate_pct: number; // 18%
    is_rcm_applicable: boolean;
  };
  rounding: {
    policy: RoundingPolicy;
    decimals: number; // 0, 2
  };
  invoice_prefix: string; // e.g. 'JCS/2026-27/'
}

// ----------------------------------------------------------------------------
// Employee Calculation Item Result
// ----------------------------------------------------------------------------
export interface BillingEmployeeResult {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  uan?: string;
  esi_number?: string;
  designation: string;
  department: string;
  deployment_wage_type: WageType;
  
  // Attendance
  calendar_days: number;
  salary_divisor_days: number;
  present_days: number;
  paid_leaves: number;
  paid_holidays: number;
  weekly_offs: number;
  lop_days: number;
  payable_days: number;
  ot_hours: number;
  
  // Earnings Calculated
  basic_earned: number;
  da_earned: number;
  hra_earned: number;
  special_allowance_earned: number;
  ot_amount_earned: number;
  attendance_bonus_earned: number;
  incentive_earned: number;
  arrears_earned: number;
  leave_wages_earned: number;
  other_earnings: number;
  gross_earnings: number;

  // Billable Wages (Derived from policy)
  gross_billable_wages: number;

  // Employee Deductions
  employee_pf: number;
  employee_esi: number;
  employee_pt: number;
  employee_tds: number;
  canteen_deduction: number;
  uniform_deduction: number;
  advance_recovery: number;
  other_deductions: number;
  total_employee_deductions: number;
  net_employee_payable: number;

  // Employer Statutory Cost (Separated for billing)
  employer_epf_3_67: number;
  employer_eps_8_33: number;
  employer_pf_total_12: number;
  employer_edli_0_5: number;
  employer_pf_admin_0_5: number;
  total_employer_pf_cost: number;
  employer_esi_3_25: number;
  employer_lwf: number;
  total_employer_statutory_cost: number;

  // Employee Level Billing Total
  billed_direct_wages: number;
  billed_statutory_cost: number;
  employee_total_billing: number;
}

// ----------------------------------------------------------------------------
// Dynamic Calculation Explainability Tree
// ----------------------------------------------------------------------------
export interface CalculationExplainerItem {
  id: string;
  title: string;
  formula: string;
  inputs: { label: string; value: string | number }[];
  result: string | number;
  notes?: string;
}

export interface CalculationExplainability {
  employee_count: number;
  total_payable_days: number;
  total_ot_hours: number;
  gross_earnings_explainer: CalculationExplainerItem;
  billable_wages_explainer: CalculationExplainerItem;
  employer_pf_explainer: CalculationExplainerItem;
  employer_esi_explainer: CalculationExplainerItem;
  service_charge_explainer: CalculationExplainerItem;
  transport_charge_explainer: CalculationExplainerItem;
  canteen_recovery_explainer: CalculationExplainerItem;
  taxable_amount_explainer: CalculationExplainerItem;
  gst_tax_explainer: CalculationExplainerItem;
  grand_total_explainer: CalculationExplainerItem;
}

// ----------------------------------------------------------------------------
// Billing Run Execution & Line Items
// ----------------------------------------------------------------------------
export interface BillingLineItem {
  id: string;
  sequence: number;
  sac_code: string;
  category: 'WAGE' | 'STATUTORY_PF' | 'STATUTORY_ESI' | 'SERVICE_CHARGE' | 'TRANSPORT' | 'CANTEEN_RECOVERY' | 'OTHER_CHARGE' | 'DISCOUNT';
  description: string;
  quantity?: number;
  unit_rate?: number;
  calculation_basis_text?: string;
  amount: number;
  is_taxable: boolean;
}

export interface BillingTaxSummary {
  supplier_state_code: string;
  supplier_state_name: string;
  client_state_code: string;
  client_state_name: string;
  supply_type: SupplyType;
  taxable_value: number;
  cgst_rate_pct: number;
  cgst_amount: number;
  sgst_rate_pct: number;
  sgst_amount: number;
  igst_rate_pct: number;
  igst_amount: number;
  total_tax_amount: number;
  round_off_amount: number;
  grand_total: number;
  amount_in_words: string;
}

export interface BillingStatutoryReconciliation {
  payroll_employee_count: number;
  billed_employee_count: number;
  employee_count_status: 'MATCHED' | 'VARIANCE';
  
  payroll_total_pay_days: number;
  billed_total_pay_days: number;
  pay_days_status: 'MATCHED' | 'VARIANCE';

  payroll_total_ot_hours: number;
  billed_total_ot_hours: number;
  ot_hours_status: 'MATCHED' | 'VARIANCE';

  payroll_employer_pf: number;
  billed_employer_pf: number;
  employer_pf_status: 'MATCHED' | 'VARIANCE';

  payroll_employer_esi: number;
  billed_employer_esi: number;
  employer_esi_status: 'MATCHED' | 'VARIANCE';

  notes: string[];
}

export interface PreInvoiceValidationResult {
  is_valid: boolean;
  checks: {
    id: string;
    label: string;
    passed: boolean;
    severity: 'ERROR' | 'WARNING';
    message: string;
    action_label?: string;
    action_route?: string;
  }[];
}

export interface BillingRun {
  id: string;
  tenant_id: string;
  run_number: string;
  client_id: string;
  client_name: string;
  contract_id: string;
  contract_number: string;
  contract_name: string;
  period: string; // e.g. 'August 2026'
  period_start_date: string;
  period_end_date: string;
  status: BillingRunStatus;
  
  // Aggregated Counts & Totals
  active_employee_count: number;
  total_payable_days: number;
  total_ot_hours: number;

  total_employee_gross_earnings: number;
  total_employee_recoveries: number;
  total_employee_net_salary: number;

  total_gross_billable_wages: number;
  total_employer_pf: number;
  total_employer_esi: number;
  total_employer_statutory: number;

  total_service_charges: number;
  total_transport_charges: number;
  total_other_charges: number;
  total_canteen_recoveries: number;

  taxable_amount: number;
  tax_summary: BillingTaxSummary;

  // Granular line items & employees
  line_items: BillingLineItem[];
  employee_results: BillingEmployeeResult[];
  reconciliation: BillingStatutoryReconciliation;
  validation: PreInvoiceValidationResult;
  explainability: CalculationExplainability;

  // Generated Invoice Info (if approved)
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  approved_by?: string;
  approved_at?: string;

  // Immutable Snapshots
  payroll_snapshot_id?: string;
  billing_snapshot_data?: string; // Serialized immutable JSON snapshot
  
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Excel Legacy Template Mapping Definition
// ----------------------------------------------------------------------------
export interface ExcelColumnMapping {
  column_key: string;
  header_label: string;
  source_path: string; // e.g. 'employee.employee_name', 'attendance.payable_days', 'wages.gross_earnings'
  formula_expression?: string; // e.g. 'SUM(BASIC, HRA, OT)'
  format: 'TEXT' | 'NUMBER' | 'CURRENCY' | 'PERCENTAGE' | 'DATE';
  width?: number;
  is_visible: boolean;
  order: number;
}

export interface ExcelSheetTemplate {
  sheet_id: string;
  sheet_name: string;
  sheet_type: 'SALARY_WORKING' | 'SUMMARY' | 'INVOICE' | 'WAGE_REGISTER' | 'OT_BILL' | 'STATUTORY_RECONCILIATION';
  title_header: string;
  columns: ExcelColumnMapping[];
}

export interface LegacyClientTemplateConfig {
  id: string;
  tenant_id: string;
  client_id: string;
  template_code: string;
  template_name: string;
  description: string;
  sheets: ExcelSheetTemplate[];
  created_at: string;
}
