// src/types/wageEngine.ts
// ============================================================================
// Joy PeopleHR — Wage & Earnings/Deductions Engine Type System
// Versioned, auditable, policy-driven wage calculation
// ============================================================================

// ---------------------------------------------------------------------------
// SENTINEL VALUES — never silently collapse to ₹0
// ---------------------------------------------------------------------------
export type WageSentinel =
  | 'NOT_CONFIGURED'   // Rate/policy not yet set up
  | 'PENDING'          // Awaiting approval/input
  | 'MISSING_SOURCE'   // Attendance data absent for this employee/period
  | 'NOT_ELIGIBLE'     // Rule evaluated; employee did not qualify
  | 'SOURCE_CONFLICT'  // Attendance vs MR vs OT inputs disagree
  | 'CALC_ERROR';      // Engine threw exception — see audit log

// ---------------------------------------------------------------------------
// 4 COMPONENT CATEGORIES
// ---------------------------------------------------------------------------
export type WageComponentCategory =
  | 'EARNING'           // Money paid to employee (Basic, HRA, Food, Night, OT, Bonus, etc.)
  | 'DEDUCTION'         // Money deducted from employee (PF, ESI, PT, LWF, Advance, Canteen, Rent)
  | 'EMPLOYER_COST'     // Employer statutory & billing on-costs (Employer PF 13%, Employer ESI 3.25%, Service Charge) - NOT deducted from employee!
  | 'INFORMATIONAL';    // Calculated/display-only values (OT Hours, Pay Days, PF Wage, ESI Wage, Gross Wage)

export type WageComponentType = WageComponentCategory;

// ---------------------------------------------------------------------------
// WAGE BASIS
// ---------------------------------------------------------------------------
export type WageBasis =
  | 'BASIC_WAGE'
  | 'GROSS'
  | 'PF_WAGE'
  | 'ESI_WAGE'
  | 'PAYABLE_DAYS'
  | 'PRESENT_DAYS'
  | 'OT_HOURS'
  | 'OT_AMOUNT'
  | 'ELIGIBLE_DAYS'
  | 'NIGHT_SHIFTS'
  | 'CUSTOM';

// ---------------------------------------------------------------------------
// DISTINCT STATUS ENUMS (Separate Calculation vs Data Quality vs Approval)
// ---------------------------------------------------------------------------
export type CalculationStatus =
  | 'CALCULATED'
  | 'ZERO_GENUINE'
  | 'NOT_ELIGIBLE'
  | 'NOT_CONFIGURED'
  | 'OVERRIDDEN'
  | 'MANUALLY_ADJUSTED'
  | 'WAIVED'
  | 'ROUNDING_ADJUSTMENT'
  | 'CALC_ERROR';

export type DataQualityStatus =
  | 'VALID'
  | 'MISSING_SOURCE'
  | 'SOURCE_CONFLICT'
  | 'INVALID_INPUT'
  | 'DUPLICATE_SOURCE'
  | 'POLICY_EXPIRED'
  | 'POLICY_CONFLICT';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'OVERRIDDEN';

export type PayrollRunStatus =
  | 'DRAFT'
  | 'CALCULATING'
  | 'CALCULATED'
  | 'VALIDATION_FAILED'
  | 'READY_FOR_REVIEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'EXPORTED'
  | 'LOCKED'
  | 'REJECTED';

export type WageCalculationMethod =
  | 'DAILY_RATE_X_PAYABLE_DAYS'   // BASIC: daily_rate × payable_days
  | 'OT_HOURS_X_OT_RATE'          // OT: ot_hours × ot_rate
  | 'ELIGIBLE_DAYS_X_RATE'        // FOOD_E: eligible_days × rate
  | 'SHIFT_COUNT_X_RATE'          // NIGHT_E: night_shift_count × rate
  | 'RULE_BASED'                  // ATT_BONUS: eligibility rule → fixed amount
  | 'PCT_OF_BASIC'                // PF: 12% of basic
  | 'PCT_OF_GROSS'                // ESI: 0.75% of gross
  | 'TAX_SLAB'                    // PT: state slab table
  | 'FIXED_AMOUNT'                // LWF, ADV: configured fixed value
  | 'FIXED_SCHEDULED'             // Advance: EMI-style schedule
  | 'PERCENTAGE_X_BASIS'          // General percentage of any WageBasis
  | 'CONFIGURED';                 // Other — manual input per period

export type WageStatutoryApplicability = 'APPLICABLE' | 'NOT_APPLICABLE' | 'CONDITIONAL';

// ---------------------------------------------------------------------------
// FOOD ALLOWANCE POLICY
// ---------------------------------------------------------------------------
export interface FoodAllowancePolicy {
  type: 'FOOD_ALLOWANCE';
  enabled: boolean;
  rate: number;                     // ₹ per eligible day
  eligibility_basis: 'PRESENT_DAY' | 'SHIFT' | 'OT' | 'NIGHT_SHIFT' | 'MIN_HOURS' | 'MANUAL';
  min_hours_threshold?: number;     // for MIN_HOURS basis
  max_days_per_month?: number;
  exclude_weekly_off: boolean;
  exclude_paid_leave: boolean;
  exclude_absent: boolean;
  exclude_lop: boolean;
  effective_from: string;
  effective_to?: string | null;
}

// ---------------------------------------------------------------------------
// NIGHT ALLOWANCE POLICY
// ---------------------------------------------------------------------------
export interface NightAllowancePolicy {
  type: 'NIGHT_ALLOWANCE';
  enabled: boolean;
  rate: number;                     // ₹ per night shift
  night_shift_codes: string[];      // e.g. ['NIGHT', 'C3', 'SHIFT3', 'III']
  requires_approved_shift: boolean;
  effective_from: string;
  effective_to?: string | null;
}

// ---------------------------------------------------------------------------
// ATTENDANCE BONUS POLICY
// ---------------------------------------------------------------------------
export interface AttendanceBonusPolicy {
  type: 'ATTENDANCE_BONUS';
  enabled: boolean;
  bonus_amount: number;             // fixed ₹ if eligible
  min_present_days: number;         // e.g. 24
  max_allowed_lop: number;          // e.g. 0
  max_allowed_absence: number;      // e.g. 0
  weekly_off_counts_as_present: boolean;
  paid_leave_counts_as_present: boolean;
  nfh_counts_as_present: boolean;
  max_late_violations: number;      // 0 = no late allowed
  max_early_exit_violations: number;
  min_ot_hours_required?: number;   // optional OT requirement
  approval_required: boolean;
  effective_from: string;
  effective_to?: string | null;
}

export type WageEligibilityRule =
  | FoodAllowancePolicy
  | NightAllowancePolicy
  | AttendanceBonusPolicy;

// ---------------------------------------------------------------------------
// WAGE COMPONENT MASTER RECORD
// ---------------------------------------------------------------------------
export interface WageComponentRecord {
  id: string;
  organization_id: string;
  vendor_id?: string;              // null = org-level default
  code: string;                    // e.g. 'FOOD_E', 'PF', 'ATT_BONUS'
  name: string;                    // e.g. 'Food Allowance', 'EPF'
  type: WageComponentType;
  calculation_method: WageCalculationMethod;
  rate?: number;                   // base rate (₹/day, ₹/shift, %)
  rate_unit?: 'PER_DAY' | 'PER_SHIFT' | 'PER_HOUR' | 'PERCENT' | 'FIXED';
  eligibility_rule?: WageEligibilityRule;
  pf_applicable: boolean;
  esi_applicable: boolean;
  pt_applicable: boolean;
  invoice_applicable: boolean;
  taxable: boolean;
  approval_required: boolean;
  effective_from: string;          // YYYY-MM-DD
  effective_to?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  sort_order: number;              // display order
}

// ---------------------------------------------------------------------------
// EMPLOYEE PAYROLL STATUS — distinguishes contracted from payable
// ---------------------------------------------------------------------------
export type EmploymentStatusCode =
  | 'ACTIVE'          // working, payable
  | 'ON_LEAVE'        // approved leave — in roster but not payable this period
  | 'INACTIVE'        // no longer deployed
  | 'SUSPENDED'       // administrative hold
  | 'RELIEVED';       // separated

export interface EmployeePayrollStatus {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  employment_status: EmploymentStatusCode;
  leave_status?: string;           // 'EXTENDED_LEAVE', 'MEDICAL_LEAVE', etc.
  payroll_eligible: boolean;
  attendance_eligible: boolean;
  wage_eligible: boolean;
  effective_from?: string;
  effective_to?: string;
  remarks?: string;                // e.g. 'Approved extended leave per HR/22300'
}

// ---------------------------------------------------------------------------
// WAGE EXCLUSION — for Why? drawer day-by-day breakdown
// ---------------------------------------------------------------------------
export interface WageExclusion {
  date: string;
  reason: string;                  // 'Weekly Off', 'Absent', 'LOP'
  excluded: boolean;
}

// ---------------------------------------------------------------------------
// WAGE WHY PAYLOAD — drives the Why? drawer
// ---------------------------------------------------------------------------
export interface WageWhyPayload {
  formula: string;                 // e.g. '18 × ₹100'
  result: string;                  // e.g. '₹1,800'
  eligible_units: number;          // days, shifts, hours, etc.
  unit_label: string;              // 'days', 'shifts', 'hours'
  rate: number;
  rate_label: string;              // '₹100/day'
  source: string;                  // 'Attendance Master'
  policy_name: string;             // 'Food Allowance Policy v1'
  policy_version: string;
  exclusions: WageExclusion[];
  eligibility_result: 'PASS' | 'FAIL' | 'N/A';
  eligibility_reason?: string;
  source_rows?: string[];          // attendance row references
  calculation_version: string;
  calculated_at: string;
}

// ---------------------------------------------------------------------------
// WAGE LINE STATUS
// ---------------------------------------------------------------------------
export type WageLineStatus =
  | 'CALCULATED'
  | 'NOT_CONFIGURED'
  | 'PENDING'
  | 'MISSING_SOURCE'
  | 'NOT_ELIGIBLE'
  | 'SOURCE_CONFLICT'
  | 'CALC_ERROR'
  | 'ZERO_GENUINE';   // genuinely ₹0, not a sentinel

// ---------------------------------------------------------------------------
// WAGE LINE ITEM — one component's result for one employee
// ---------------------------------------------------------------------------
export interface WageLineItem {
  component_code: string;
  component_name: string;
  component_type: WageComponentType;
  status: WageLineStatus;
  amount: number;                  // 0 when status !== 'CALCULATED' && !== 'ZERO_GENUINE'
  sentinel?: WageSentinel;         // set when status is a sentinel
  why: WageWhyPayload;
}

// ---------------------------------------------------------------------------
// EMPLOYEE WAGE RESULT — full gross/net breakdown per employee
// ---------------------------------------------------------------------------
export interface EmployeeWageResult {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  payroll_status: EmployeePayrollStatus;

  // Attendance inputs (from Attendance Master)
  attendance_present_days: number;
  mr_present_days: number;
  payable_days: number;
  ot_hours: number;
  night_shift_count: number;
  lop_days: number;
  weekly_off_days: number;

  // Earnings
  earnings: WageLineItem[];        // all EARNING components

  // Deductions
  deductions: WageLineItem[];      // all DEDUCTION components

  // Employer Costs (NOT deducted from employee net pay)
  employer_costs: WageLineItem[];  // all EMPLOYER_COST components (Employer PF 13%, Employer ESI 3.25%, Service Charge)

  // Informational / Breakup Line Items (display & audit)
  informational: WageLineItem[];   // display-only (Wages = Basic+HRA, PF Wage, ESI Wage, OT Hours)

  // Totals (only sum CALCULATED lines)
  gross_earnings: number;
  total_deductions: number;
  net_pay: number;
  total_employer_cost?: number;

  // Validation flags
  has_warnings: boolean;
  has_conflicts: boolean;
  has_unconfigured: boolean;
  warnings: string[];

  // Lineage
  wage_run_id: string;
  calculated_at: string;
}

// ---------------------------------------------------------------------------
// WAGE RUN RECORD — versioned calculation snapshot
// ---------------------------------------------------------------------------
export interface WageRunRecord {
  id: string;                      // e.g. 'WR-2026-09-001'
  organization_id: string;
  vendor_id: string;
  period_from: string;             // YYYY-MM-DD
  period_to: string;               // YYYY-MM-DD
  period_label: string;            // '26-Aug-2026 to 25-Sep-2026'

  // Population counts
  contracted_roster_count: number; // e.g. 44 — total in roster
  active_workforce_count: number;  // e.g. 43 — excluding on-leave/inactive
  on_leave_count: number;          // e.g. 1 — PRAKASH R
  payable_workforce_count: number; // e.g. 43 — wage_eligible = true

  // Version lineage & Policy Snapshot
  attendance_snapshot_id: string;  // ATT-RUN-17
  employee_master_version: string; // EM-V3
  wage_policy_version: string;     // WP-V5
  payroll_policy_id?: string;
  payroll_policy_version?: string;
  calculation_engine_version: string; // WAGE-ENGINE-V2.1

  // Aggregates
  total_gross_earnings: number;
  total_deductions: number;
  total_net_pay: number;
  total_ot_amount: number;
  total_employer_cost?: number;
  total_billing_amount?: number;

  // Quality metrics
  total_warnings: number;
  total_conflicts: number;
  total_unconfigured: number;
  total_missing_source: number;

  // Workflow status
  status: PayrollRunStatus;
  approval_status?: ApprovalStatus;
  submitted_by?: string;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;

  // Full results
  employee_results: EmployeeWageResult[];

  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// WAGE AUDIT ENTRY — formula chain for one component × one employee
// ---------------------------------------------------------------------------
export interface WageAuditEntry {
  wage_run_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  component_code: string;
  component_name: string;
  component_type: WageComponentType;
  calculation_method: WageCalculationMethod;
  input_values: Record<string, number | string>;
  formula_expression: string;
  eligible_units: number;
  unit_label: string;
  rate_applied: number;
  amount_calculated: number;
  status: WageLineStatus;
  sentinel?: WageSentinel;
  policy_snapshot: Partial<WageComponentRecord>;
  attendance_source_rows: string[];
  calculated_at: string;
}

// ---------------------------------------------------------------------------
// EXPORT OPTIONS
// ---------------------------------------------------------------------------
export interface WagePackExportOptions {
  wage_run_id: string;
  company_name?: string;
  vendor_name?: string;
  period_label?: string;
  location?: string;
  include_audit_sheet?: boolean;
  include_lineage_sheet?: boolean;
}

// ---------------------------------------------------------------------------
// SUMMARY STATS — for UI header banners
// ---------------------------------------------------------------------------
export interface WageRunSummaryStats {
  contracted_roster: number;
  active_workforce: number;
  on_leave: number;
  payable_workforce: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_basic: number;
  total_ot: number;
  total_food_allowance: number;
  total_night_allowance: number;
  total_attendance_bonus: number;
  total_pf: number;
  total_esi: number;
  warnings_count: number;
  conflicts_count: number;
  unconfigured_count: number;
  missing_source_count: number;
}
