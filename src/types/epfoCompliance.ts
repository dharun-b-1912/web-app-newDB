// src/types/epfoCompliance.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — Production EPFO ECR Compliance Data Models
// 100% Exact Standard 11-Field ECR Schema (#~# Delimited) • Auditable • Versioned
// Supports Company Migration Mode V1 (Q=G PF Wage) & Statutory Standard V2
// ============================================================================

export type EPFOFilingStatus =
  | 'DRAFT'
  | 'READY'
  | 'FILE_GENERATED'
  | 'DOWNLOADED'
  | 'SUBMITTED'
  | 'CHALLAN_GENERATED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'RECONCILED'
  | 'FAILED'
  | 'SUPERSEDED';

export type EPFReconciliationStatus =
  | 'MATCHED'
  | 'MISSING_UAN'
  | 'MISSING_FROM_EPF'
  | 'NEW_PF_EMPLOYEE'
  | 'EXITED_EMPLOYEE'
  | 'DUPLICATE_UAN'
  | 'INVALID_UAN'
  | 'NAME_MISMATCH'
  | 'PF_NOT_APPLICABLE'
  | 'EPS_REVIEW'
  | 'EDLI_REVIEW';

export type ECRMappingMode =
  | 'COMPANY_MIGRATION_V1'  // Field 3 (Gross) mapped from PF Wages (Col Q = G) — Current Excel Process
  | 'STATUTORY_STANDARD_V2'; // Field 3 (Gross) mapped from Actual Gross Earnings — Official Portal Rule

/**
 * 27-Column Company Workbook Row Structure (Sheet1)
 * Section A (Cols A–L): Working Payroll & Statutory Calculation
 * Section B (Cols N–AA): ECR Format Builder & Concatenator
 */
export interface CompanyWorkbookWorkingRow {
  // Section A: Payroll Input
  col_a_sl_no: number;
  col_b_unit: string;
  col_c_sl_no_sub: number;
  col_d_emp_id: string;
  col_e_name: string;
  col_f_w_days: number;
  col_g_pf_wages: number;
  col_h_esi_wages: number;
  col_i_pf_contribution: number;
  col_j_esi_contribution: number;
  col_k_uan_number: string;
  col_l_esi_number: string;

  // Section B: ECR Builder
  col_n_format: '#~#';
  col_o_uan: string;
  col_p_name: string;
  col_q_gross: number;
  col_r_epf_wage: number;
  col_s_eps_wage: number;
  col_t_edli_wage: number;
  col_u_epf_contrib: number;
  col_v_eps_contrib: number;
  col_w_epr_diff: number;
  col_x_ncp_days: number;
  col_y_refund: number;
  col_aa_concatenated_ecr_row: string;
}

/**
 * The Exact Standard 11-Field EPFO ECR Model
 * Raw Plain-Text Output: Field1#~#Field2#~#Field3#~#Field4#~#Field5#~#Field6#~#Field7#~#Field8#~#Field9#~#Field10#~#Field11
 */
export interface EPFOEcrRow {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_code: string;
  mapping_mode: ECRMappingMode;

  // ── 11 OFFICIAL EPFO ECR FIELDS ──
  field_1_uan: string;                  // Field 1: UAN / Member identifier (12 Digits)
  field_2_member_name: string;          // Field 2: Member Name (As registered in EPFO)
  field_3_gross_wages: number;          // Field 3: Gross Wages (PF Wage in V1, Total Gross in V2)
  field_4_epf_wages: number;            // Field 4: EPF Wages (Capped at ₹15k or actual)
  field_5_eps_wages: number;            // Field 5: EPS Wages (Capped at ₹15k ceiling)
  field_6_edli_wages: number;           // Field 6: EDLI Wages (Capped at ₹15k ceiling)
  field_7_epf_contribution_remitted: number; // Field 7: EPF Contribution Remitted (12% of EPF Wage)
  field_8_eps_contribution_remitted: number; // Field 8: EPS Contribution Remitted (8.33% of EPS Wage, Max ₹1,250)
  field_9_epf_eps_difference: number;   // Field 9: EPF/EPS Difference (Field 7 - Field 8)
  field_10_ncp_days: number;            // Field 10: NCP Days (Non-Contributing Period / LOP Days)
  field_11_refund_of_advance: number;   // Field 11: Refund of Advance (Default 0)

  // Internal Audit & Verification Metadata (Not in final TXT row)
  raw_ecr_line: string;                 // The exact '#~#' concatenated string
  working_days: number;                 // W Days from attendance
  esi_wages: number;                    // ESI contribution wage
  esi_contribution: number;             // ESI employee deduction
  esi_ip_number: string;                // 10-digit IP number
  eps_eligible: boolean;
  edli_eligible: boolean;
  employer_pf_cost_13: number;          // Internal 13% employer cost
  employer_gov_portion_1: number;       // Internal 1% admin/edli
  validation_status: 'VALID' | 'WARNING' | 'INVALID';
  validation_errors: string[];
  validation_warnings: string[];
  source_snapshot_id: string;
}

export interface EPFOEcrBatch {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  pay_period: string;
  file_name: string;
  file_format: 'TXT';
  version: number;
  mapping_mode: ECRMappingMode;
  is_current: boolean;
  status: EPFOFilingStatus;

  total_records: number;
  ready_records: number;
  blocked_records: number;
  warning_records: number;

  total_gross_wages: number;
  total_epf_wages: number;
  total_eps_wages: number;
  total_edli_wages: number;
  total_epf_contribution: number;
  total_eps_contribution: number;
  total_epf_eps_difference: number;
  total_ncp_days: number;
  total_refund_of_advance: number;

  file_size_bytes?: number;
  data_hash: string;
  file_hash?: string;
  txt_content?: string;

  rows: EPFOEcrRow[];
  generated_at?: string;
  generated_by?: string;
  downloaded_at?: string;
  downloaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EPFOChallanRecord {
  id: string;
  filing_id: string;
  tenant_id: string;
  trn_number: string;                   // Temporary Return Reference Number (TRRN)
  challan_number: string;
  challan_date: string;
  challan_amount: number;
  paid_amount: number;
  payment_reference: string;
  bank_name: string;
  payment_date: string;
  payment_status: 'MATCHED' | 'SHORT' | 'EXCESS' | 'PENDING';
  variance_amount: number;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface EPFOFilingRecord {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  pay_period: string;
  active_batch_id: string;
  file_version: number;
  file_name: string;
  status: EPFOFilingStatus;

  trrn_number?: string;
  submission_reference?: string;
  submitted_at?: string;
  submitted_by?: string;

  challan_record?: EPFOChallanRecord;

  history_versions: Array<{
    batch_id: string;
    version: number;
    file_name: string;
    status: EPFOFilingStatus;
    superseded_at?: string;
    superseded_reason?: string;
  }>;

  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EPFOReconciliationItem {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  uan: string;
  status: EPFReconciliationStatus;
  is_blocking: boolean;
  recommended_action: string;
  exception_message?: string;
}

export interface EPFOReconciliationSummary {
  tenant_id: string;
  pay_period: string;
  total_payroll_pf_employees: number;
  matched_count: number;
  missing_uan_count: number;
  invalid_uan_count: number;
  duplicate_uan_count: number;
  name_mismatch_count: number;
  is_ready_for_export: boolean;
  blocking_count: number;
  items: EPFOReconciliationItem[];
}
