import { PunchSource } from './attendance';

export type IndustryPreset = 'CORPORATE' | 'MANUFACTURING' | 'IT_SERVICES' | 'RETAIL' | 'HEALTHCARE' | 'CONSTRUCTION';

export type OvertimeCategory =
  | 'REGULAR_OT'
  | 'WEEKEND_OT'
  | 'HOLIDAY_OT'
  | 'NIGHT_OT'
  | 'EXTENDED_OT'
  | 'EMERGENCY_OT'
  | 'CALL_BACK_OT'
  | 'FIELD_OT';

export type OvertimeRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_MANAGER'
  | 'PENDING_HR'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED'
  | 'PAYROLL_LOCKED';

export type CompensationType = 'PAID_OVERTIME' | 'COMP_OFF' | 'UNPAID';

export type WfhMode = 'FULL_DAY' | 'HALF_DAY' | 'PARTIAL_HOURS' | 'RECURRING';

export type WfhStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type BreakType = 'MEAL' | 'TEA' | 'REST' | 'PERSONAL' | 'PRAYER' | 'MEDICAL' | 'PRODUCTION';

export type WorkExceptionType =
  | 'OT_WITHOUT_APPROVAL'
  | 'EXCEED_MAX_WORK_HOURS'
  | 'EXCESS_BREAK'
  | 'CORE_HOURS_VIOLATION'
  | 'HOLIDAY_WORK_UNAPPROVED'
  | 'MISSING_CHECKOUT'
  | 'PRE_SHIFT_UNAUTHORIZED'
  | 'CONCURRENT_REQUEST_OVERLAP';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OvertimePolicy {
  id: string;
  tenant_id: string;
  name: string;
  version: string;
  preset: IndustryPreset;
  daily_threshold_minutes: number; // e.g. 480 (8h)
  weekly_threshold_minutes: number; // e.g. 2400 (40h)
  monthly_threshold_minutes?: number;
  grace_period_minutes: number; // e.g. 15m
  rounding_rule: 'NONE' | '5_MIN' | '10_MIN' | '15_MIN' | '30_MIN';
  rounding_direction: 'NEAREST' | 'UP' | 'DOWN';
  normal_rate_multiplier: number; // 1.5x
  weekend_multiplier: number; // 2.0x
  holiday_multiplier: number; // 2.0x
  night_multiplier: number; // 1.25x
  extended_threshold_minutes: number; // 240m (after 4h OT)
  extended_multiplier: number; // 2.0x
  night_window_start: string; // "22:00"
  night_window_end: string; // "06:00"
  max_work_hours_day: number; // 12h
  max_ot_hours_day: number; // 4h
  max_ot_hours_week: number; // 16h
  pre_shift_ot_allowed: boolean;
  approval_required: boolean;
  wfh_ot_allowed: boolean;
  comp_off_allowed: boolean;
}

export interface BreakPolicy {
  automatic_break_minutes: number; // 30m
  automatic_break_after_hours: number; // 5h
  mandatory_breaks: boolean;
  paid_break_allowance_minutes: number; // 15m
  max_unpaid_break_minutes: number; // 60m
  core_hours_start: string; // "10:00"
  core_hours_end: string; // "16:00"
  breaks_prohibited_in_core_hours: boolean;
}

export interface OvertimeSegment {
  id: string;
  employee_id: string;
  employee_name: string;
  work_date: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  category: OvertimeCategory;
  rate_multiplier: number;
  policy_version: string;
  approval_status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'AUTO_ELIGIBLE';
  payable_status: 'PAYABLE' | 'NON_PAYABLE' | 'PAYROLL_LOCKED';
  estimated_cost: number;
}

export interface OvertimeRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  designation: string;
  date: string;
  start_time: string;
  end_time: string;
  expected_hours: number;
  actual_hours?: number;
  eligible_hours?: number;
  approved_hours?: number;
  reason_type:
    | 'PRODUCTION_TARGET'
    | 'MACHINE_BREAKDOWN'
    | 'PREVENTIVE_MAINTENANCE'
    | 'PROJECT_RELEASE'
    | 'CLIENT_SUPPORT'
    | 'URGENT_DISPATCH'
    | 'SYSTEM_UPGRADE'
    | 'STAFF_SHORTAGE'
    | 'OTHER';
  custom_reason: string;
  work_type: 'OFFICE' | 'MANUFACTURING' | 'PROJECT' | 'FIELD' | 'REMOTE';
  project_name?: string;
  production_line?: string;
  machine_id?: string;
  location: string;
  status: OvertimeRequestStatus;
  compensation_type: CompensationType;
  approver_id?: string;
  approver_name?: string;
  approver_comment?: string;
  estimated_cost: number;
  created_at: string;
  updated_at: string;
  is_emergency?: boolean;
}

export interface WfhRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  department: string;
  mode: WfhMode;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  work_plan: string;
  location_city: string;
  status: WfhStatus;
  approver_name?: string;
  approver_comment?: string;
  remaining_wfh_quota: number;
  created_at: string;
}

export interface BreakRecord {
  id: string;
  employee_id: string;
  type: BreakType;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  is_paid: boolean;
  is_excess: boolean;
  excess_minutes: number;
  source: PunchSource | 'AUTOMATIC' | 'ADMIN' | 'QR';
}

export interface CalculationExplainability {
  scheduled_hours: number;
  scheduled_window: string;
  actual_presence_hours: number;
  check_in: string;
  check_out: string;
  total_break_minutes: number;
  paid_break_minutes: number;
  unpaid_break_minutes: number;
  payable_work_hours: number;
  grace_period_applied_minutes: number;
  rounding_adjustment_minutes: number;
  eligible_ot_minutes: number;
  approved_ot_minutes: number;
  payable_ot_minutes: number;
  deficit_minutes: number;
  policy_used: string;
  policy_version: string;
  applied_multipliers: { category: OvertimeCategory; hours: number; multiplier: number; amount: number }[];
  steps: string[];
}

export interface WorkHourRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  shift_name: string;
  date: string;
  scheduled_start: string;
  scheduled_end: string;
  scheduled_hours: number;
  check_in?: string;
  check_out?: string;
  actual_presence_hours: number;
  paid_break_hours: number;
  unpaid_break_hours: number;
  payable_work_hours: number;
  deficit_hours: number;
  eligible_ot_hours: number;
  approved_ot_hours: number;
  payable_ot_hours: number;
  status: 'NORMAL' | 'OVERTIME' | 'DEFICIT' | 'EXCEED_MAX' | 'BREAK_EXCEEDED' | 'ON_LEAVE' | 'WFH' | 'ABSENT';
  location_type: 'OFFICE' | 'PLANT' | 'FIELD' | 'REMOTE' | 'WFH';
  estimated_cost: number;
  breaks: BreakRecord[];
  explainability: CalculationExplainability;
}

export interface WorkException {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  date: string;
  type: WorkExceptionType;
  details: string;
  hours_or_minutes: string;
  severity: ExceptionSeverity;
  status: 'OPEN' | 'IN_REVIEW' | 'APPROVED' | 'WAIVED' | 'REJECTED';
  manager_name: string;
  action_note?: string;
  created_at: string;
}

export interface OvertimeDashboardMetrics {
  ot_today_hours: number;
  ot_week_hours: number;
  ot_month_hours: number;
  pending_requests_count: number;
  projected_ot_hours: number;
  policy_exceptions_count: number;
  estimated_ot_cost: number;
  workers_on_ot_count: number;
  active_plant_coverage_percent?: number;
}
