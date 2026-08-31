// src/types/esicCompliance.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — Production ESIC Compliance & Upload Models
// 100% Exact Standard 6-Column ESIC Schema • Reconciled • Versioned
// ============================================================================

export type ESICoverageStatus =
  | 'NOT_COVERED'
  | 'COVERED'
  | 'NEWLY_COVERED'
  | 'CONTINUING_COVERAGE'
  | 'COVERAGE_REVIEW'
  | 'LEFT_SERVICE'
  | 'RETIRED'
  | 'EXPIRED'
  | 'OUT_OF_COVERAGE'
  | 'DUPLICATE'
  | 'INVALID_IP'
  | 'MISSING_IP';

export type ESICReconciliationStatus =
  | 'MATCHED'
  | 'MISSING_FROM_ESIC'
  | 'MISSING_FROM_PAYROLL'
  | 'NAME_MISMATCH'
  | 'DUPLICATE_IP'
  | 'INVALID_IP'
  | 'INACTIVE_EMPLOYEE'
  | 'UNEXPECTED_IP';

export type ESICFilingStatus =
  | 'DRAFT'
  | 'READY'
  | 'FILE_GENERATED'
  | 'SUBMITTED'
  | 'CHALLAN_GENERATED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'RECONCILED'
  | 'FAILED'
  | 'SUPERSEDED';

export interface ESIZeroWageReason {
  code: number;
  name: string;
  description: string;
  requires_last_working_day: boolean;
  allows_zero_wage: boolean;
  is_high_risk: boolean;
  active: boolean;
  sort_order: number;
}

export interface ESIStatutoryProfile {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  ip_number: string; // Exactly 10 digits
  ip_name_snapshot: string;
  esi_applicable: boolean;
  coverage_status: ESICoverageStatus;
  coverage_start_date: string;
  coverage_end_date?: string;
  contribution_period_id: string;
  is_disability_category?: boolean;
  statutory_name_override?: string;
  name_override_reason?: string;
  status: 'Active' | 'Inactive' | 'Archived';
  created_at: string;
  updated_at: string;
}

export interface ESICRegisteredIPMaster {
  id: string;
  tenant_id: string;
  ip_number: string;
  registered_ip_name: string;
  date_of_registration: string;
  employer_code: string;
  employer_name: string;
  branch_office: string;
  dispensary_name: string;
  is_active: boolean;
  last_verified_at: string;
}

export interface ESICReconciliationItem {
  id: string;
  employee_id?: string;
  employee_code?: string;
  payroll_name?: string;
  ip_number: string;
  esic_registered_name?: string;
  status: ESICReconciliationStatus;
  name_match: boolean;
  ip_match: boolean;
  payroll_status: 'Active' | 'Exited' | 'Not Found';
  esic_status: 'Registered' | 'Not Found' | 'Inactive';
  coverage_status: ESICoverageStatus;
  recommended_action: string;
  exception_message?: string;
  is_blocking: boolean;
}

export interface ESICReconciliationSummary {
  tenant_id: string;
  pay_period: string;
  total_payroll_esi_employees: number;
  total_esic_master_ips: number;
  matched_count: number;
  missing_from_esic_count: number;
  missing_from_payroll_count: number;
  name_mismatch_count: number;
  duplicate_ip_count: number;
  invalid_ip_count: number;
  is_ready_for_upload: boolean;
  blocking_exceptions_count: number;
  items: ESICReconciliationItem[];
}

/**
 * The Exact Standard 6-Column ESIC Monthly Contribution Upload Model
 */
export interface ESICUploadRow {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_code: string;
  
  // ── 6 OFFICIAL ESIC COLUMNS ──
  col_a_ip_number: string;       // Column A: IP Number (10 Digits)
  col_b_ip_name: string;         // Column B: IP Name (Only alphabets and space)
  col_c_days: number;            // Column C: No of Days for which wages paid/payable (CEILING)
  col_d_monthly_wages: number;   // Column D: Total Monthly Wages (From ESI Contribution Wage)
  col_e_reason_code: number;     // Column E: Reason Code for Zero workings days (0-13)
  col_f_last_working_day: string;// Column F: Last Working Day (DD/MM/YYYY or blank)

  // Internal Audit & Traceability Metadata (Not Exported in Upload Sheet)
  internal_payable_days: number;
  days_transformation_rule: 'CEILING' | 'EXACT';
  coverage_wage: number;
  ot_wage: number;
  employee_esi_contribution: number;
  employer_esi_contribution: number;
  reason_name: string;
  validation_status: 'VALID' | 'WARNING' | 'INVALID';
  validation_errors: string[];
  validation_warnings: string[];
  source_snapshot_id: string;
}

export interface ESICUploadBatch {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  pay_period: string;
  contribution_period: string;
  file_name: string;
  file_format: 'XLS';
  version: number;
  is_current: boolean;
  status: ESICFilingStatus;
  
  total_records: number;
  ready_records: number;
  blocked_records: number;
  warning_records: number;
  zero_wage_records: number;
  
  total_esi_wages: number;
  total_employee_contribution: number;
  total_employer_contribution: number;
  total_liability_amount: number;
  
  file_size_bytes?: number;
  data_hash: string;
  file_hash?: string;
  
  rows: ESICUploadRow[];
  generated_at?: string;
  generated_by?: string;
  downloaded_at?: string;
  downloaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ESICPaymentChallanRecord {
  id: string;
  filing_id: string;
  tenant_id: string;
  challan_number: string;
  challan_date: string;
  payment_reference_number: string;
  bank_transaction_id: string;
  bank_name: string;
  calculated_liability: number;
  challan_amount: number;
  paid_amount: number;
  payment_date: string;
  payment_status: 'MATCHED' | 'SHORT' | 'EXCESS' | 'PENDING';
  variance_amount: number;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface ESICFilingRecord {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  pay_period: string;
  contribution_period: string;
  active_batch_id: string;
  file_version: number;
  file_name: string;
  status: ESICFilingStatus;
  
  portal_submission_reference?: string;
  submitted_at?: string;
  submitted_by?: string;
  
  challan_record?: ESICPaymentChallanRecord;
  
  history_versions: Array<{
    batch_id: string;
    version: number;
    file_name: string;
    status: ESICFilingStatus;
    superseded_at?: string;
    superseded_reason?: string;
  }>;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ESIContributionRegisterItem {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  ip_number: string;
  ip_name: string;
  department: string;
  designation: string;
  coverage_status: ESICoverageStatus;
  coverage_wage: number;
  overtime_wage: number;
  contribution_wage: number;
  internal_payable_days: number;
  upload_days: number;
  employee_esi: number;
  employer_esi: number;
  total_esi_liability: number;
  zero_wage_reason_code: number;
  zero_wage_reason_name: string;
  last_working_day?: string;
  validation_status: 'READY' | 'WARNING' | 'BLOCKED';
  validation_messages: string[];
}
