// src/types/statutoryAudit.ts
// ============================================================================
// Joy PeopleHR — Enterprise Payroll Statutory Audit & Report Types v5.0
// Multi-Tenant Isolated • 100% Traceable • Component-Based • Audit-Ready
// ============================================================================

export type StatutorySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type ReconciliationStatus = 'MATCHED' | 'WARNING' | 'MISMATCH' | 'NOT_AVAILABLE';

export type StatutoryReportStatus =
  | 'DRAFT'
  | 'CALCULATED'
  | 'VALIDATED'
  | 'EXCEPTION'
  | 'RECONCILED'
  | 'FINAL'
  | 'SUPERSEDED';

export type StatutoryReportCategory =
  | 'payroll_audit'
  | 'epf_audit'
  | 'esi_audit'
  | 'pt_audit'
  | 'tds_audit'
  | 'lwf_audit'
  | 'bank_audit'
  | 'payroll_register'
  | 'earnings_register'
  | 'deductions_register'
  | 'statutory_liability'
  | 'government_reconciliation'
  | 'employee_ledger'
  | 'exceptions'
  | 'calculation_trace';

export interface StatutoryRuleVersion {
  id: string;
  rule_code: 'PF' | 'ESI' | 'PT' | 'TDS' | 'LWF' | 'GRATUITY';
  version_name: string;
  effective_from: string;
  effective_to: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'SUPERSEDED';
  employee_rate: number;
  employer_rate: number;
  wage_ceiling: number;
  eps_rate?: number;
  edli_rate?: number;
  admin_rate?: number;
  edli_admin_rate?: number;
  rounding_method: 'NEAREST_RUPEE' | 'ROUND_UP' | 'ROUND_DOWN' | 'EXACT_DECIMAL';
  eligibility_conditions: string[];
  account_mapping: {
    employee_epf_account: string; // Account 1
    employer_epf_account: string; // Account 1
    employer_eps_account: string; // Account 10
    admin_charges_account: string; // Account 2
    edli_account: string; // Account 21
    edli_admin_account: string; // Account 22
    esi_account: string;
    pt_account: string;
    tds_account: string;
    lwf_account: string;
  };
}

export interface StatutoryCalculationStep {
  step_number: number;
  label: string;
  source_field: string;
  source_value: number | string;
  formula: string;
  raw_result: number;
  rounding_rule: string;
  final_value: number;
  explanation: string;
}

export interface EmployeeStatutoryCalculationTrace {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  gender?: string;
  age?: number;
  father_or_husband_name?: string;
  uan: string;
  esi_ip_number: string;
  department: string;
  designation: string;
  work_location: string;
  payable_days: number;
  lop_days: number;
  ncp_days: number;
  daily_attendance?: string[];
  rate_per_day?: number;
  
  // Wages
  gross_wage: number;
  basic_wage: number;
  hra_wage: number;
  special_allowance: number;
  ot_wage: number;
  pf_wage: number;
  epf_wage: number;
  eps_wage: number;
  edli_wage: number;
  esi_coverage_wage: number;
  esi_contribution_wage: number;
  pt_gross_wage: number;
  
  // EPF / EPS / EDLI Breakdown
  pf_rule_version: string;
  employee_epf: number;
  employer_epf: number;
  employer_eps: number;
  edli_amount: number;
  pf_admin_charges: number;
  total_employee_pf_deduction: number;
  total_employer_pf_liability: number;
  account_1_allocation: number; // Employee EPF + Employer EPF
  account_10_allocation: number; // Employer EPS
  account_2_allocation: number; // PF Admin
  account_21_allocation: number; // EDLI
  account_22_allocation: number; // EDLI Admin
  
  // ESI Breakdown
  esi_rule_version: string;
  esi_is_covered: boolean;
  esi_coverage_status: string;
  employee_esi: number;
  employer_esi: number;
  total_esi_liability: number;
  
  // PT & Other
  pt_rule_version: string;
  professional_tax: number;
  tds_amount: number;
  lwf_employee: number;
  lwf_employer: number;
  
  // Deductions & Net
  total_statutory_deductions: number;
  other_deductions: number;
  net_pay: number;
  
  // Trace Steps
  steps: StatutoryCalculationStep[];
  calculation_timestamp: string;
  calculation_hash: string;
}

export interface GovernmentAccountReconciliationItem {
  account_code: string;
  account_name: string;
  statutory_authority: 'EPFO' | 'ESIC' | 'COMMERCIAL_TAX' | 'INCOME_TAX' | 'LABOUR_WELFARE';
  employee_contribution: number;
  employer_contribution: number;
  expected_liability: number;
  filed_ecr_amount: number;
  challan_amount: number;
  paid_amount: number;
  receipt_amount: number;
  variance: number;
  status: ReconciliationStatus;
  challan_ref_number: string;
  payment_date: string;
  crn_number: string;
  remarks: string;
}

export interface StatutoryExceptionItem {
  id: string;
  severity: StatutorySeverity;
  employee_id?: string;
  employee_name?: string;
  employee_code?: string;
  issue_category:
    | 'MISSING_UAN'
    | 'DUPLICATE_UAN'
    | 'MISSING_ESI_IP'
    | 'WAGE_CEILING_MISMATCH'
    | 'ACCOUNT_MISMATCH'
    | 'NEGATIVE_CONTRIBUTION'
    | 'UNEXPECTED_ZERO'
    | 'COUNT_MISMATCH'
    | 'VARIANCE_DETECTED'
    | 'UNRECONCILED_CHALLAN'
    | 'UNFINALIZED_PAYROLL';
  title: string;
  description: string;
  expected_value: string;
  actual_value: string;
  rule_violated: string;
  source_context: string;
  recommended_action: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'WAIVED';
  created_at: string;
  resolved_by?: string;
  resolved_at?: string;
}

export interface ImmutableReportSnapshot {
  report_id: string;
  report_version: string;
  report_category: StatutoryReportCategory;
  report_title: string;
  generated_at: string;
  generated_by: string;
  user_role: string;
  
  // Hierarchy
  tenant_id: string;
  organization_id: string;
  organization_name: string;
  legal_entity_id: string;
  legal_entity_name: string;
  establishment_id: string;
  establishment_name: string;
  establishment_address: string;
  
  // Payroll Cycle & Run
  payroll_run_id: string;
  period_name: string;
  period_start: string;
  period_end: string;
  payout_date: string;
  payroll_status: string;
  
  // Engine & Rules
  calculation_engine_version: string;
  pf_rule_version: string;
  esi_rule_version: string;
  pt_rule_version: string;
  
  // Data Payload
  total_headcount: number;
  total_covered_epf: number;
  total_covered_esi: number;
  total_gross_wages: number;
  total_pf_wages: number;
  total_esi_wages: number;
  
  total_employee_epf: number;
  total_employer_epf: number;
  total_employer_eps: number;
  total_account_1: number;
  total_account_10: number;
  total_account_2: number;
  total_account_21: number;
  total_account_22: number;
  total_pf_liability: number;
  
  total_employee_esi: number;
  total_employer_esi: number;
  total_esi_liability: number;
  
  total_pt_liability: number;
  total_tds_liability: number;
  total_lwf_liability: number;
  total_government_liability: number;
  
  records: EmployeeStatutoryCalculationTrace[];
  reconciliations: GovernmentAccountReconciliationItem[];
  exceptions: StatutoryExceptionItem[];
  
  // Security & Audit
  data_snapshot_hash: string;
  is_immutable: boolean;
  status: StatutoryReportStatus;
}
