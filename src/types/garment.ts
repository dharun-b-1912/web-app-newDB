// ============================================================================
// JOY PeopleHR — Garment & Clothing Workforce Management TypeScript Domain Model
// ============================================================================

export type WageMethod = 'DAILY' | 'HOURLY' | 'PIECE_RATE' | 'HYBRID';
export type PaymentFrequency = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'CUSTOM';
export type WorkerCategory = 'PERMANENT' | 'TEMPORARY' | 'CONTRACT' | 'MIGRANT' | 'PIECE_RATE';
export type SkillGrade = 'HELPER' | 'GRADE_C' | 'GRADE_B' | 'GRADE_A' | 'MASTER_TAILOR';

export type PieceRateCalculationMode =
  | 'INDIVIDUAL_OPERATION'
  | 'SHARED_LINE_OUTPUT'
  | 'CONFIGURABLE_PER_ORDER';

export type SharedSplitMethod = 'EQUAL' | 'BY_HOURS' | 'BY_SKILL_WEIGHT';
export type ReworkPaymentRule =
  | 'ACCEPTED_ONLY'
  | 'ACCEPTED_PLUS_REWORK_ACCEPTED'
  | 'PROPORTIONAL_REWORK';
export type RejectedPaymentRule = 'NEVER_PAY' | 'PARTIAL_OVERRIDE';

export type UnitType = 'FACTORY' | 'FLOOR' | 'LINE' | 'SECTION';
export type LineStage = 'CUTTING' | 'STITCHING' | 'FINISHING' | 'CHECKING' | 'PACKING' | 'GENERAL';
export type OperationStage =
  | 'CUTTING'
  | 'STITCHING'
  | 'COLLAR_ATTACH'
  | 'SLEEVE_ATTACH'
  | 'BUTTON_FIXING'
  | 'IRONING'
  | 'CHECKING'
  | 'PACKING'
  | 'CUSTOM';

export type FloorAttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'LEAVE'
  | 'WEEK_OFF'
  | 'HOLIDAY';

export type ProductionApprovalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'SUPERVISOR_APPROVED'
  | 'MANAGER_APPROVED'
  | 'HR_APPROVED'
  | 'LOCKED'
  | 'CORRECTION_REQUESTED';

export type PayrollCycleStatus =
  | 'DRAFT'
  | 'CALCULATED'
  | 'SUPERVISOR_APPROVED'
  | 'MANAGER_APPROVED'
  | 'HR_APPROVED'
  | 'AUTHORIZED'
  | 'PAID'
  | 'LOCKED'
  | 'REOPENED';

export interface OrganizationAddonEntitlement {
  id: string;
  organization_id: string;
  addon_key: string;
  is_enabled: boolean;
  plan_tier?: string | null;
  max_units?: number | null;
  max_workers?: number | null;
  config_json: Record<string, any>;
  enabled_at?: string | null;
  disabled_at?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentOrgSettings {
  organization_id: string;
  piece_rate_calculation_mode: PieceRateCalculationMode;
  default_shared_split_method: SharedSplitMethod;
  default_rework_payment_rule: ReworkPaymentRule;
  rework_rate_percentage: number;
  rejected_payment_rule: RejectedPaymentRule;
  rejected_rate_percentage: number;
  require_qc_before_piece_pay: boolean;
  supervisor_can_override_rate: boolean;
  allow_backdated_entry_days: number;
  overtime_multiplier_daily: number;
  overtime_multiplier_hourly: number;
  overtime_applies_to_piece_rate: boolean;
  standard_hours_per_day: number;
  max_deduction_pct_of_gross: number;
  enforce_minimum_wage_check: boolean;
  statutory_minimum_daily_wage: number;
  currency_code: string;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentProductionUnit {
  id: string;
  organization_id: string;
  company_id?: string | null;
  branch_id?: string | null;
  work_location_id?: string | null;
  parent_unit_id?: string | null;
  unit_code: string;
  unit_name: string;
  unit_type: UnitType;
  line_stage: LineStage;
  supervisor_employee_id?: string | null;
  tl_employee_id?: string | null;
  qc_inspector_employee_id?: string | null;
  piece_rate_mode_override?: 'INDIVIDUAL_OPERATION' | 'SHARED_LINE_OUTPUT' | null;
  shared_split_method_override?: SharedSplitMethod | null;
  daily_target_qty: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentProductionTeam {
  id: string;
  organization_id: string;
  production_unit_id: string;
  shift_id?: string | null;
  team_code: string;
  team_name: string;
  tl_employee_id?: string | null;
  supervisor_employee_id?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentWorkerProfile {
  id: string;
  organization_id: string;
  employee_id: string;
  contractor_vendor_id?: string | null;
  worker_category: WorkerCategory;
  skill_grade: SkillGrade;
  skill_weightage: number;
  primary_unit_id?: string | null;
  primary_team_id?: string | null;
  default_wage_method: WageMethod;
  default_payment_frequency: PaymentFrequency;
  settlement_day_of_week: number;
  attendance_mode: 'STANDARD_BIOMETRIC_GPS' | 'SUPERVISOR_FLOOR' | 'BOTH';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentWageAssignment {
  id: string;
  organization_id: string;
  employee_id: string;
  wage_method: WageMethod;
  payment_frequency: PaymentFrequency;
  daily_rate: number;
  hourly_rate: number;
  hybrid_base_daily_rate: number;
  hybrid_base_hourly_rate: number;
  default_piece_rate: number;
  overtime_hourly_rate: number;
  minimum_daily_guarantee: number;
  incentive_eligible: boolean;
  custom_rules_json: Record<string, any>;
  effective_from: string;
  effective_to?: string | null;
  version: number;
  is_active: boolean;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentStyle {
  id: string;
  organization_id: string;
  style_code: string;
  style_name: string;
  garment_category: string;
  buyer_name?: string | null;
  season?: string | null;
  standard_sam_minutes: number;
  target_efficiency_pct: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentOperation {
  id: string;
  organization_id: string;
  operation_code: string;
  operation_name: string;
  department_stage: OperationStage;
  sequence_order: number;
  unit_of_measure: string;
  default_smv: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentProductionOrder {
  id: string;
  organization_id: string;
  order_number: string;
  buyer_name?: string | null;
  style_id: string;
  production_unit_id?: string | null;
  target_quantity: number;
  completed_quantity: number;
  rejected_quantity: number;
  start_date: string;
  due_date?: string | null;
  piece_rate_mode_override?: 'INDIVIDUAL_OPERATION' | 'SHARED_LINE_OUTPUT' | null;
  shared_split_method_override?: SharedSplitMethod | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentPieceRateCard {
  id: string;
  organization_id: string;
  work_location_id?: string | null;
  production_unit_id?: string | null;
  order_id?: string | null;
  style_id?: string | null;
  operation_id: string;
  skill_grade?: SkillGrade | null;
  rate_per_unit: number;
  rework_rate_per_unit: number;
  rejected_rate_per_unit: number;
  overtime_multiplier: number;
  currency: string;
  effective_from: string;
  effective_to?: string | null;
  version: number;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentFloorAttendance {
  id: string;
  organization_id: string;
  work_date: string;
  shift_id?: string | null;
  production_unit_id?: string | null;
  team_id?: string | null;
  employee_id: string;
  supervisor_employee_id?: string | null;
  status: FloorAttendanceStatus;
  payable_day_factor: number;
  worked_hours: number;
  overtime_hours: number;
  late_minutes: number;
  early_exit_minutes: number;
  check_in_at?: string | null;
  check_out_at?: string | null;
  source: 'SUPERVISOR_MOBILE' | 'BIOMETRIC_SYNC' | 'GPS_MOBILE' | 'HR_WEB';
  sync_to_core_attendance: boolean;
  approval_status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED' | 'CORRECTION_REQUESTED';
  client_idempotency_key?: string | null;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentProductionEntry {
  id: string;
  organization_id: string;
  work_date: string;
  shift_id?: string | null;
  production_unit_id?: string | null;
  team_id?: string | null;
  order_id?: string | null;
  style_id?: string | null;
  operation_id: string;
  allocation_mode: 'INDIVIDUAL' | 'SHARED_LINE';
  shared_split_method?: SharedSplitMethod | null;
  employee_id?: string | null;
  supervisor_employee_id?: string | null;
  qc_inspector_employee_id?: string | null;
  produced_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  rework_qty: number;
  rework_accepted_qty: number;
  pending_qc_qty: number;
  rejection_reason_code?: string | null;
  rejection_reason_notes?: string | null;
  applied_rate_card_id?: string | null;
  applied_unit_rate: number;
  applied_rework_rate: number;
  payable_units: number;
  computed_piece_amount: number;
  qc_status: 'PENDING' | 'QC_VERIFIED' | 'REJECTED_ENTRY';
  approval_status: ProductionApprovalStatus;
  client_idempotency_key?: string | null;
  submitted_at?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentProductionAllocation {
  id: string;
  organization_id: string;
  production_entry_id: string;
  work_date: string;
  employee_id: string;
  order_id?: string | null;
  style_id?: string | null;
  operation_id: string;
  share_ratio: number;
  allocated_produced_qty: number;
  allocated_accepted_qty: number;
  allocated_rejected_qty: number;
  allocated_rework_qty: number;
  allocated_rework_accepted_qty: number;
  payable_units: number;
  unit_rate: number;
  earned_piece_amount: number;
  incentive_amount: number;
  is_locked: boolean;
  payroll_cycle_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentIncentiveRule {
  id: string;
  organization_id: string;
  rule_code: string;
  rule_name: string;
  rule_type: 'TARGET_ACHIEVEMENT' | 'QUALITY_ZERO_DEFECT' | 'ATTENDANCE_REGULARITY' | 'LINE_EFFICIENCY' | 'CUSTOM';
  production_unit_id?: string | null;
  worker_category?: WorkerCategory | null;
  threshold_value: number;
  reward_type: 'FIXED_AMOUNT' | 'PER_PIECE_BONUS' | 'PERCENT_OF_EARNINGS';
  reward_value: number;
  period_type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentIncentiveAward {
  id: string;
  organization_id: string;
  award_date: string;
  employee_id: string;
  production_unit_id?: string | null;
  incentive_rule_id?: string | null;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  payroll_cycle_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type GarmentAdvanceEntryType =
  | 'ADVANCE_GIVEN'
  | 'ADVANCE_RECOVERY'
  | 'LOAN_DISBURSED'
  | 'LOAN_RECOVERY'
  | 'CANTEEN'
  | 'HOSTEL'
  | 'DAMAGE_RECOVERY'
  | 'OTHER_DEDUCTION'
  | 'OTHER_EARNING';

export interface GarmentAdvanceLedgerEntry {
  id: string;
  organization_id: string;
  employee_id: string;
  entry_date: string;
  entry_type: GarmentAdvanceEntryType;
  amount: number;
  recovered_amount: number;
  balance_remaining: number;
  reference_code?: string | null;
  reason?: string | null;
  core_advance_id?: string | null;
  core_loan_id?: string | null;
  status: 'PENDING' | 'APPROVED' | 'SETTLED' | 'CANCELLED';
  payroll_cycle_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApprovalChainStep {
  stage: 'SUPERVISOR' | 'MANAGER' | 'HR' | 'AUTHORIZED' | 'PAID' | 'LOCKED' | 'REOPENED';
  actor_id?: string;
  actor_name: string;
  action: 'APPROVED' | 'LOCKED' | 'REOPENED' | 'PAID';
  notes?: string;
  at: string;
}

export interface GarmentPayrollCycle {
  id: string;
  organization_id: string;
  cycle_code: string;
  cycle_name: string;
  payment_frequency: PaymentFrequency;
  period_start: string;
  period_end: string;
  production_unit_id?: string | null;
  wage_method_filter?: WageMethod | null;
  status: PayrollCycleStatus;
  total_workers: number;
  total_gross: number;
  total_deductions: number;
  total_net_pay: number;
  calculation_hash?: string | null;
  calculated_at?: string | null;
  approved_chain_json: ApprovalChainStep[];
  locked_at?: string | null;
  locked_by?: string | null;
  reopen_reason?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentPayrollLine {
  id: string;
  organization_id: string;
  payroll_cycle_id: string;
  employee_id: string;
  worker_category: WorkerCategory | string;
  wage_method_snapshot: WageMethod | string;
  payable_days: number;
  worked_hours: number;
  overtime_hours: number;
  produced_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  rework_qty: number;
  rework_accepted_qty: number;
  daily_wage_earnings: number;
  hourly_wage_earnings: number;
  piece_rate_earnings: number;
  overtime_earnings: number;
  incentive_earnings: number;
  other_earnings: number;
  minimum_wage_topup: number;
  gross_earnings: number;
  advance_recovery: number;
  loan_deduction: number;
  statutory_pf: number;
  statutory_esi: number;
  statutory_pt: number;
  canteen_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_payable: number;
  calculation_trace_json: Record<string, any>;
  worker_payslip_published: boolean;
  payslip_published_at?: string | null;
  disbursement_status: 'PENDING' | 'QUEUED' | 'PAID' | 'ON_HOLD';
  paid_at?: string | null;
  payment_reference?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentCorrectionRequest {
  id: string;
  organization_id: string;
  request_type: 'ATTENDANCE_CORRECTION' | 'PRODUCTION_CORRECTION' | 'WORKER_DISPUTE';
  target_table: string;
  target_record_id: string;
  work_date?: string | null;
  employee_id?: string | null;
  requested_by_employee_id?: string | null;
  reason: string;
  requested_changes_json: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentAuditLog {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id?: string | null;
  action: string;
  actor_user_id?: string | null;
  actor_employee_id?: string | null;
  actor_role?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  reason?: string | null;
  created_at: string;
}

