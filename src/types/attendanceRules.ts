// src/types/attendanceRules.ts
// ============================================================================
// JOY PeopleHR — Biometric Attendance Rules & Automation Engine Types
// Time-Based Rules • Shift • Grace • Exceptions • Multi-Rules • OT • Deterministic Priority
// ============================================================================

export type RuleStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'SCHEDULED' | 'EXPIRED' | 'ARCHIVED';

export type RuleCategory =
  | 'CHECK_IN_OUT'
  | 'GRACE_LATE'
  | 'BREAKS'
  | 'OVERTIME'
  | 'MISSING_PUNCH'
  | 'DUPLICATES'
  | 'EMPLOYEE_EXCEPTIONS'
  | 'DEVICE_RULES'
  | 'ADVANCED';

export type RuleScopeType =
  | 'ORGANIZATION'
  | 'BRANCH'
  | 'SITE'
  | 'DEPARTMENT'
  | 'DESIGNATION'
  | 'EMPLOYEE_GROUP'
  | 'SHIFT'
  | 'VENDOR'
  | 'INDIVIDUAL_EMPLOYEE'
  | 'DEVICE'
  | 'DEVICE_GROUP';

export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL'
  | 'BETWEEN'
  | 'BEFORE_SHIFT_START'
  | 'AFTER_SHIFT_START'
  | 'BEFORE_SHIFT_END'
  | 'AFTER_SHIFT_END'
  | 'WITHIN_MINUTES_BEFORE'
  | 'WITHIN_MINUTES_AFTER'
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'IN_LIST';

export interface AttendanceRuleCondition {
  id: string;
  field:
    | 'shift_code'
    | 'shift_id'
    | 'punch_time'
    | 'punch_direction'
    | 'punch_source'
    | 'verification_method'
    | 'existing_punches_count'
    | 'existing_state'
    | 'department'
    | 'designation'
    | 'branch'
    | 'device_id'
    | 'is_first_punch_of_day'
    | 'time_since_last_punch_minutes'
    | 'minutes_after_shift_start'
    | 'minutes_after_shift_end'
    | 'is_weekend_or_holiday';
  operator: ConditionOperator;
  value: string | number | boolean | string[];
  value_to?: string | number;
  logical_group?: 'AND' | 'OR';
  description?: string;
}

export type ActionType =
  | 'CLASSIFY_CHECK_IN'
  | 'CLASSIFY_CHECK_OUT'
  | 'CLASSIFY_BREAK_OUT'
  | 'CLASSIFY_BREAK_IN'
  | 'APPLY_GRACE'
  | 'MARK_LATE'
  | 'MARK_EARLY'
  | 'CALCULATE_OT'
  | 'IGNORE_DUPLICATE'
  | 'FLAG_EXCEPTION'
  | 'REQUIRE_REGULARIZATION'
  | 'AUTO_CLOSE'
  | 'SET_PUNCH_MODE';

export interface AttendanceRuleAction {
  id: string;
  action_type: ActionType;
  parameters: {
    grace_minutes?: number;
    early_window_minutes?: number;
    early_checkout_grace_minutes?: number;
    ot_threshold_minutes?: number;
    ot_grace_minutes?: number;
    ot_rounding?: 'EXACT' | '5_MIN' | '10_MIN' | '15_MIN' | '30_MIN' | '60_MIN';
    ot_multiplier?: number;
    min_punch_gap_minutes?: number;
    unpaid_break_minutes?: number;
    cutoff_time?: string;
    flag_reason?: string;
    attendance_mode?: 'FIRST_IN_LAST_OUT' | 'PAIR_PUNCHES' | 'DEVICE_DIRECTION' | 'AUTO';
    check_in_window_start?: string;
    check_in_window_end?: string;
    midday_buffer_start?: string;
    midday_buffer_end?: string;
    check_out_window_start?: string;
  };
}

export interface AttendanceRule {
  id: string;
  organization_id: string;
  rule_name: string;
  rule_code: string;
  description: string;
  category: RuleCategory;
  status: RuleStatus;
  priority: number; // 1 (highest) to 100 (lowest)
  scope_type: RuleScopeType;
  scope_ids: string[]; // IDs or names of target departments, shifts, employees, etc.
  scope_labels?: string[];
  trigger_event: 'FIRST_PUNCH' | 'ANY_PUNCH' | 'BEFORE_SHIFT' | 'DURING_SHIFT' | 'AFTER_SHIFT' | 'BETWEEN_TIME' | 'AFTER_SHIFT_END';
  conditions: AttendanceRuleCondition[];
  actions: AttendanceRuleAction[];
  effective_from: string; // ISO Date YYYY-MM-DD
  effective_to?: string;   // ISO Date YYYY-MM-DD
  human_readable_summary: string;
  rule_version: number;
  is_system_default?: boolean;
  covered_employees_count?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ExceptionOverrideType =
  | 'SHIFT_OVERRIDE'
  | 'GRACE_OVERRIDE'
  | 'OT_THRESHOLD_OVERRIDE'
  | 'BREAK_OVERRIDE'
  | 'ATTENDANCE_MODE_OVERRIDE'
  | 'DEVICE_OVERRIDE'
  | 'LATE_POLICY_OVERRIDE'
  | 'EARLY_DEPARTURE_OVERRIDE';

export interface EmployeeAttendanceException {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department?: string;
  exception_type: ExceptionOverrideType;
  title: string;
  reason: string;
  override_values: {
    shift_id?: string;
    shift_code?: string;
    start_time?: string;
    end_time?: string;
    grace_minutes?: number;
    ot_threshold_minutes?: number;
    ot_grace_minutes?: number;
    min_punch_gap_minutes?: number;
    allowed_device_ids?: string[];
    attendance_mode?: 'FIRST_IN_LAST_OUT' | 'PAIR_PUNCHES' | 'DEVICE_DIRECTION' | 'AUTO';
  };
  effective_from: string;
  effective_to: string;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'EXPIRED' | 'REVOKED';
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface AttendanceRuleExecutionLog {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  device_id?: string;
  device_user_id?: string;
  device_name?: string;
  raw_event_id: string;
  matched_rule_id: string;
  rule_name: string;
  rule_version: number;
  priority_rank: number;
  source: string;
  verification_method: string;
  punch_time_str: string;
  classification: string;
  applied_actions: string[];
  execution_status: 'SUCCESS' | 'CONFLICT_RESOLVED' | 'FAILED' | 'EXCEPTION_APPLIED';
  reason: string;
  trace_steps: string[];
  executed_at: string;
}

export interface RuleSimulationRequest {
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  date: string;
  punch_time: string; // HH:mm:ss or HH:mm or ISO
  source: 'BIOMETRIC' | 'MOBILE' | 'WEB' | 'MANUAL';
  verification_method: 'FINGERPRINT' | 'FACE' | 'CARD' | 'PIN';
  device_id?: string;
  device_name?: string;
  punch_direction?: 'IN' | 'OUT' | 'AUTO';
  existing_punches?: Array<{ time: string; direction: 'IN' | 'OUT'; classification: string }>;
}

export interface RuleSimulationResult {
  simulation_id: string;
  employee_id: string;
  employee_name: string;
  resolved_shift: {
    shift_code: string;
    shift_name: string;
    start_time: string;
    end_time: string;
  };
  evaluated_rules: Array<{
    rule_id: string;
    rule_name: string;
    priority: number;
    category: string;
    is_matched: boolean;
    reason: string;
  }>;
  selected_rule: {
    rule_id: string;
    rule_name: string;
    priority: number;
    reason: string;
  };
  has_employee_exception: boolean;
  exception_details?: string;
  classification: string;
  grace_status: 'ON_TIME' | 'WITHIN_GRACE' | 'LATE';
  late_minutes: number;
  early_departure_minutes: number;
  overtime_minutes: number;
  overtime_calculation_details?: string;
  execution_trace: string[];
}

export interface RuleDryRunResult {
  rule_id: string;
  rule_name: string;
  simulation_period: string; // e.g. "Last 7 Days"
  affected_employees_count: number;
  affected_attendance_count: number;
  new_late_flags_count: number;
  new_ot_hours_total: number;
  conflict_count: number;
  sample_changes: Array<{
    employee_name: string;
    date: string;
    before_status: string;
    after_status: string;
    before_hours: string;
    after_hours: string;
  }>;
}

export interface AttendanceRuleMetrics {
  active_rules_count: number;
  employees_covered_count: number;
  active_exceptions_count: number;
  today_auto_processed_count: number;
  rule_conflicts_count: number;
  failed_calculations_count: number;
}
