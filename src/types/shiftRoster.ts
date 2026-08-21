// src/types/shiftRoster.ts
// ============================================================================
// WorkForceOS — Tenant-Aware Shift, Roster, Policy & Multi-Layer Attendance Types
// Enterprise Grade: Versioned Policies, Effective Dates, 9-State Lifecycle, Immutable Audit
// ============================================================================

export type ShiftType =
  | 'FIXED'
  | 'FLEXIBLE'
  | 'ROTATIONAL'
  | 'SPLIT_SHIFT'
  | 'NIGHT_SHIFT'
  | 'OPEN_SHIFT';

export type BreakMode =
  | 'FIXED'
  | 'FLEXIBLE'
  | 'PUNCH_BASED'
  | 'NO_DEDUCTION';

export type PolicyStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'ARCHIVED';

export type AttendanceLifecycleStatus =
  | 'RAW'
  | 'MAPPED'
  | 'PROCESSING'
  | 'CALCULATED'
  | 'EXCEPTION'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'LOCKED'
  | 'PAYROLL_EXPORTED';

export type AttendanceExceptionType =
  | 'NONE'
  | 'UNKNOWN_EMPLOYEE'
  | 'UNMAPPED_DEVICE_USER'
  | 'MISSING_IN'
  | 'MISSING_OUT'
  | 'DUPLICATE_PUNCH'
  | 'INVALID_SEQUENCE'
  | 'OUTSIDE_ROSTER'
  | 'NO_SHIFT_ASSIGNED'
  | 'CROSS_MIDNIGHT_REVIEW'
  | 'MANUAL_REGULARIZATION';

export interface ShiftBreakItem {
  id: string;
  name: string;
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  is_paid: boolean;
  requires_punch?: boolean;
}

export interface ShiftApplicability {
  type: 'ORGANIZATION' | 'LOCATIONS' | 'DEPARTMENTS' | 'EMPLOYEE_GROUPS' | 'INDIVIDUALS';
  ids: string[];
  names?: string[];
}

export interface ShiftMaster {
  id: string;
  tenant_id: string;
  shift_code: string;
  shift_name: string;
  description?: string;
  shift_type: ShiftType;
  start_time: string; // "09:00"
  end_time: string;   // "18:00"
  scheduled_duration_minutes: number; // 540 (9h)
  net_working_minutes: number;        // 480 (8h)
  cross_midnight: boolean;
  attendance_date_cutoff: string;     // "06:00"
  grace_in_minutes: number;           // 15
  grace_out_minutes: number;          // 15
  early_out_tolerance_minutes: number; // 15
  late_threshold_minutes: number;     // 30
  min_hours_full_day: number;         // 8
  min_hours_half_day: number;         // 4
  break_mode: BreakMode;
  breaks: ShiftBreakItem[];
  ot_enabled: boolean;
  min_ot_threshold_minutes: number;   // 30
  weekday_ot_rate: number;            // 1.0 or 1.5
  weekly_off_ot_rate: number;         // 1.5 or 2.0
  holiday_ot_rate: number;            // 2.0
  max_ot_daily_minutes?: number;
  requires_manager_approval: boolean;
  requires_hr_approval: boolean;
  applies_to: ShiftApplicability;
  effective_from: string;             // YYYY-MM-DD
  effective_to?: string;              // YYYY-MM-DD
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeRosterEntry {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department_name?: string;
  location_name?: string;
  date: string; // YYYY-MM-DD
  shift_id: string;
  shift_code: string;
  shift_name: string;
  shift_type: ShiftType;
  is_weekly_off: boolean;
  is_holiday: boolean;
  is_override: boolean;
  override_reason?: string;
  assigned_by: string;
  updated_at: string;
}

export interface AttendancePolicy {
  id: string;
  tenant_id: string;
  policy_code: string; // "ATT-CORP-001"
  policy_name: string;
  description?: string;
  version: number;     // 1, 2, 3
  status: PolicyStatus;
  effective_from: string; // YYYY-MM-DD
  effective_to?: string;

  general_rules: {
    full_day_hours: number;        // 8
    half_day_hours: number;        // 4
    absent_threshold_hours: number; // 4
  };

  check_in_rules: {
    grace_minutes: number;         // 15
    late_threshold_minutes: number; // 30
    action_after_grace: 'LATE' | 'LATE_WITH_DEDUCTION' | 'EXCEPTION';
    early_check_in_allowed_minutes?: number;
  };

  check_out_rules: {
    early_checkout_grace_minutes: number; // 15
    action_before_allowed: 'EARLY_OUT' | 'EXCEPTION' | 'DEDUCTION';
  };

  break_rules: {
    mode: BreakMode;
    default_break_minutes: number;
    auto_deduct: boolean;
    max_breaks_allowed?: number;
  };

  overtime_rules: {
    enabled: boolean;
    min_threshold_minutes: number; // 30
    weekday_rate: number;          // 1.0 or 1.5
    weekly_off_rate: number;       // 1.5
    holiday_rate: number;          // 2.0
    max_daily_minutes: number;     // 240
    requires_approval: boolean;
  };

  late_deduction_rules: {
    late_count_trigger: number;    // 3 lates
    deduction_amount_days: number; // 0.5 day
    reset_period: 'MONTHLY' | 'PAYROLL_CYCLE';
  };

  missing_punch_rules: {
    auto_exception: boolean;
    default_penalty: 'REGULARIZATION_REQUIRED' | 'MARK_HALF_DAY' | 'MARK_ABSENT';
  };

  regularization_rules?: {
    allowed_within_days: number;
    max_backdated_days: number;
    requires_reason: boolean;
    requires_attachment: boolean;
    approver_role: string;
  };

  approval_workflow?: {
    levels: Array<{ stage: string; role: string; sla_hours: number }>;
    auto_escalate: boolean;
    reminder_hours: number;
  };

  policy_type?: 'GENERAL' | 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'REGULARIZATION' | 'OVERTIME' | 'EXCEPTION' | 'FACTORY_PLANT';

  night_shift_rules: {
    cutoff_hour: number;           // 6 (06:00 AM)
  };

  applies_to: ShiftApplicability;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface NormalizedPunch {
  id: string;
  raw_punch_id: string;
  tenant_id: string;
  device_id: string;
  device_serial: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  punch_timestamp: string; // ISO
  punch_date: string;      // YYYY-MM-DD
  punch_time_str: string;  // "09:12:44 AM"
  direction: 'IN' | 'OUT' | 'AUTO';
  source: 'BIOMETRIC' | 'MOBILE' | 'WEB' | 'MANUAL';
  verification_mode: string;
  is_deduplicated: boolean;
}

export interface CalculationExplanation {
  check_in_status: string;       // "09:12 AM (On-Time within 15m grace)"
  check_out_status: string;      // "06:34 PM (Normal departure after 06:00 PM)"
  working_time_status: string;   // "8h 22m Net (Exceeds 8h full day threshold)"
  ot_status: string;             // "34m Overtime (Exceeds 30m threshold, Pending Approval)"
  policy_summary: string;        // "Calculated using Corporate Attendance v3"
  punches: Array<{
    time: string;
    direction: string;
    source: string;
    mode: string;
  }>;
}

export interface AttendanceLedgerRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department?: string;
  location?: string;
  attendance_date: string; // YYYY-MM-DD
  roster_id?: string;
  shift_id: string;
  shift_code: string;
  shift_name: string;
  policy_id: string;
  policy_code: string;
  policy_version: number;
  lifecycle_status: AttendanceLifecycleStatus;
  status: 'Present' | 'Half Day' | 'Absent' | 'Late' | 'Week Off' | 'Holiday' | 'On Leave' | 'Exception';
  exception_type: AttendanceExceptionType;
  exception_reason?: string;
  first_in?: string;
  last_out?: string;
  gross_minutes: number;
  net_minutes: number;
  break_minutes: number;
  late_minutes: number;
  early_minutes: number;
  overtime_minutes: number;
  regularization_id?: string;
  regularization_reason?: string;
  calculation_explanation: CalculationExplanation;
  audit_trail: Array<{
    timestamp: string;
    actor: string;
    action: string;
    note: string;
  }>;
  created_at: string;
  calculated_at: string;
}

export interface PolicyAuditLog {
  id: string;
  tenant_id: string;
  actor_name: string;
  actor_role: string;
  entity_type: 'SHIFT' | 'POLICY' | 'ROSTER' | 'REGULARIZATION';
  entity_id: string;
  entity_name: string;
  change_summary: string;
  previous_value?: any;
  new_value?: any;
  reason?: string;
  timestamp: string;
}

export interface PolicyImpactAnalysis {
  affected_employees_count: number;
  affected_locations_count: number;
  affected_departments_count: number;
  affected_shifts_count: number;
  upcoming_roster_entries_count: number;
  payroll_period_impacted: boolean;
}

export interface RosterConflict {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name?: string;
  date: string;
  type: 'REST_PERIOD_VIOLATION' | 'OVERLAPPING_SHIFTS' | 'HOLIDAY_CONFLICT' | 'DUPLICATE_ASSIGNMENT';
  severity: 'CRITICAL' | 'WARNING';
  description: string;
  scheduled_shift: string;
  suggested_fix?: string;
}
