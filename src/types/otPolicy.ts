// src/types/otPolicy.ts
// ============================================================================
// JOY PeopleHR — Dedicated Overtime (OT) Policy & Calculation Types
// Supports Dynamic Multiplier & Fixed Hourly Rate with Effective Dating
// ============================================================================

export type OTCalculationMethod = 'DYNAMIC_MULTIPLIER' | 'FIXED_HOURLY_RATE';
export type OTSalaryBasis = 'MONTHLY_GROSS' | 'BASIC_ONLY' | 'BASIC_PLUS_DA' | 'DAILY_WAGE_X26';
export type OTRoundingMode = 'ROUND_HALF_UP' | 'ROUND_UP' | 'ROUND_DOWN' | 'EXACT';

export interface DynamicMultiplierConfig {
  calculation_method: 'DYNAMIC_MULTIPLIER';
  company_multiplier: number; // e.g. 1.25, 1.50, 2.00, or custom
}

export interface FixedHourlyRateConfig {
  calculation_method: 'FIXED_HOURLY_RATE';
  fixed_hourly_rate: number; // e.g. 70.00, 75.00, 100.00
}

export type OTPolicyMethodConfig = DynamicMultiplierConfig | FixedHourlyRateConfig;

export interface OTPolicyRecord {
  id: string;
  organization_id: string;
  company_id?: string;
  policy_name: string;
  calculation_method: OTCalculationMethod;
  salary_basis: OTSalaryBasis;
  working_days_divisor: number;    // e.g. 26 (standard), 25, 30
  working_hours_per_day: number;   // e.g. 8 (standard shift)
  company_multiplier?: number;     // for DYNAMIC_MULTIPLIER
  fixed_hourly_rate?: number;      // for FIXED_HOURLY_RATE
  government_calculation_method: 'DYNAMIC_MULTIPLIER';
  government_multiplier: number;   // standard 2.0x (Factories Act)
  effective_from: string;          // YYYY-MM-DD
  effective_to?: string | null;    // YYYY-MM-DD or null if open-ended
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  rounding_mode?: OTRoundingMode;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface OTPolicyCalculationInput {
  actual_ot_hours: number;          // Authoritative attendance OT hours (never altered)
  monthly_salary_basis: number;     // e.g. ₹17,000 or (daily ₹600 * 26)
  company_id?: string;
  organization_id?: string;
  payroll_date?: string;            // for effective-dated lookup (YYYY-MM-DD)
  policy_override?: Partial<OTPolicyRecord>;
}

export interface OTPolicyCalculationResult {
  // Authoritative Attendance Record
  actual_ot_hours: number;

  // Base Derivation
  monthly_salary_basis: number;
  working_days_divisor: number;
  working_hours_per_day: number;
  base_daily_rate: number;
  base_hourly_rate: number;

  // Company Payroll Context (Drives payslip & net pay)
  company_calculation_method: OTCalculationMethod;
  company_multiplier?: number;
  company_fixed_hourly_rate?: number;
  company_ot_rate: number;
  company_ot_amount: number;

  // Government / Statutory Context
  government_multiplier: number;
  government_ot_rate: number;
  government_statutory_amount: number;

  // Government Equivalent Reporting Context (when required to represent equivalent value)
  government_equivalent_ot_hours: number;
  government_reporting_amount: number;

  // Reconciliation Check
  reconciliation_difference: number;
  is_reconciled: boolean;
  reconciliation_status: 'RECONCILED' | 'VARIANCE_DETECTED';

  // Metadata & Audit
  policy_id: string;
  policy_name: string;
  formula_description: string;
  calculated_at: string;
}

export interface OTPolicyAuditLog {
  id: string;
  organization_id: string;
  ot_policy_id: string;
  actor_id?: string;
  actor_name?: string;
  action: 'CREATED' | 'UPDATED' | 'DEACTIVATED';
  old_values?: Partial<OTPolicyRecord>;
  new_values: Partial<OTPolicyRecord>;
  change_reason?: string;
  created_at: string;
}

export interface OTReconciliationReport {
  isReconciled: boolean;
  companyAmount: number;
  governmentReportingAmount: number;
  variance: number;
  status: 'RECONCILED' | 'VARIANCE_DETECTED';
  explanation: string;
}
