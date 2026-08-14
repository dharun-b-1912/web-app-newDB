export type LeaveCategory =
  | 'Paid'
  | 'Unpaid'
  | 'Statutory'
  | 'Compensatory'
  | 'OptionalHoliday'
  | 'Custom';

export type AccrualFrequency =
  | 'Monthly'
  | 'Quarterly'
  | 'Yearly'
  | 'JoiningDateBased'
  | 'ConfirmationBased'
  | 'Custom';

export type AccrualStartRule =
  | 'JoiningDate'
  | 'ConfirmationDate'
  | 'CalendarYearStart'
  | 'FinancialYearStart';

export type ProrationMethod =
  | 'CalendarDays'
  | 'Months'
  | 'CompletedMonths'
  | 'JoiningDate'
  | 'CustomFormula';

export type HalfDaySession = 'FirstHalf' | 'SecondHalf' | 'Morning' | 'Afternoon';

export type LeaveRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Withdrawn'
  | 'PartiallyApproved'
  | 'ModificationRequested';

export type LedgerTransactionType =
  | 'Opening'
  | 'Accrual'
  | 'Grant'
  | 'CarryForward'
  | 'Consumption'
  | 'Adjustment'
  | 'Encashment'
  | 'Expiry'
  | 'Reversal'
  | 'Correction'
  | 'LOP';

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string;
  category: LeaveCategory;
  is_paid: boolean;
  is_active: boolean;
  gender_applicability: 'All' | 'Male' | 'Female' | 'Other';
  employment_types: string[]; // e.g. ["Full Time", "Probation"]
  min_service_days: number;
  max_days_per_request: number;
  min_days_per_request: number;
  allow_half_day: boolean;
  allow_hourly: boolean;
  allow_negative_balance: boolean;
  allow_carry_forward: boolean;
  allow_encashment: boolean;
  attachment_required: boolean;
  attachment_mandatory_days_threshold?: number;
  approval_required: boolean;
  allow_backdated: boolean;
  max_backdated_days?: number;
  allow_future: boolean;
  allow_cancellation: boolean;
  allow_modification: boolean;
  converts_to_lop_if_exhausted: boolean;
  applicable_locations: string[]; // ["All"] or location IDs
  applicable_departments: string[]; // ["All"] or dept IDs
  applicable_employee_groups: string[];
  created_at: string;
  updated_at: string;
}

export interface LeavePolicyRule {
  leave_type_id: string;
  annual_entitlement: number;
  accrual_frequency: AccrualFrequency;
  accrual_amount_per_cycle: number;
  accrual_start: AccrualStartRule;
  proration_method: ProrationMethod;
  allow_carry_forward: boolean;
  max_carry_forward_days: number;
  carry_forward_expiry_months: number; // e.g. 3 months into next year
  allow_encashment: boolean;
  max_encashment_days_per_year: number;
  min_balance_for_encashment: number;
  encashment_calculation_basis: 'BasicSalary' | 'GrossSalary' | 'FixedRate';
  allow_half_day: boolean;
  allow_hourly: boolean;
  max_hourly_per_month: number;
  allow_negative_balance: boolean;
  max_negative_balance: number;
  advance_notice_days: number;
  allow_backdated: boolean;
  max_backdated_days: number;
  attachment_required: boolean;
  sandwich_rule_enabled: boolean; // Counts intervening weekend/holidays
  exclude_holidays: boolean;
  exclude_weekly_offs: boolean;
}

export interface LeavePolicy {
  id: string;
  code: string;
  name: string;
  description: string;
  company_id: string;
  applicable_groups: string[];
  employment_types: string[];
  departments: string[];
  locations: string[];
  grades: string[];
  effective_from: string;
  effective_to?: string;
  status: 'Active' | 'Draft' | 'Archived';
  priority: number; // 1 = highest
  rules: LeavePolicyRule[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PolicyAssignment {
  id: string;
  policy_id: string;
  target_type: 'Individual' | 'EmployeeGroup' | 'Department' | 'Branch' | 'Company' | 'Default';
  target_id: string; // e.g., employee_id or dept_id
  target_name: string;
  effective_from: string;
  effective_to?: string;
  assigned_by: string;
}

export interface LeaveEntitlement {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  leave_type_id: string;
  leave_type_name: string;
  policy_id: string;
  policy_name: string;
  period: string; // e.g., "2026-2027" or "2026"
  opening_balance: number;
  granted: number;
  accrued: number;
  carried_forward: number;
  adjustments: number;
  used: number;
  pending: number;
  encashed: number;
  expired: number;
  closing_balance: number;
  available_balance: number;
  updated_at: string;
}

export interface LeaveLedgerTransaction {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type_id: string;
  leave_type_name: string;
  date: string;
  transaction_type: LedgerTransactionType;
  amount: number; // + or -
  balance_after: number;
  reference_id?: string; // leave request ID, adjustment ID, etc.
  actor_id: string;
  actor_name: string;
  reason: string;
  created_at: string;
}

export interface LeaveRequestDay {
  date: string;
  is_working_day: boolean;
  is_holiday: boolean;
  holiday_name?: string;
  is_weekly_off: boolean;
  is_half_day: boolean;
  half_day_session?: HalfDaySession;
  is_sandwich_applied?: boolean;
  leave_count: number; // e.g., 1.0 or 0.5 or 0.0
}

export interface LeaveRequest {
  id: string;
  request_code: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  company_id: string;
  avatar_url?: string;
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  leave_category: LeaveCategory;
  from_date: string;
  to_date: string;
  total_calendar_days: number;
  working_days: number;
  holiday_days: number;
  weekly_off_days: number;
  leave_days_deducted: number;
  is_half_day: boolean;
  half_day_session?: HalfDaySession;
  is_hourly: boolean;
  hourly_duration_minutes?: number;
  reason: string;
  comments?: string;
  attachment_url?: string;
  contact_number?: string;
  alternate_contact?: string;
  manager_id: string;
  manager_name: string;
  status: LeaveRequestStatus;
  submitted_at: string;
  approved_at?: string;
  approved_by_name?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  daily_breakdown: LeaveRequestDay[];
  current_approver_name: string;
  is_lop: boolean;
  created_at: string;
}

export interface LeaveApproval {
  id: string;
  leave_request_id: string;
  approver_id: string;
  approver_name: string;
  role: string; // e.g. "Line Manager", "HR Head"
  step_order: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'ChangesRequested';
  comments?: string;
  action_timestamp?: string;
  is_delegated: boolean;
  delegated_from_name?: string;
}

export interface HolidayCalendar {
  id: string;
  code: string;
  name: string;
  description: string;
  company_id: string;
  location_ids: string[]; // ["All"] or location IDs
  year: number;
  status: 'Active' | 'Draft';
  holidays: Holiday[];
  weekly_offs: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
  created_at: string;
}

export interface Holiday {
  id: string;
  calendar_id: string;
  name: string;
  date: string;
  type: 'Public' | 'National' | 'Regional' | 'Company' | 'Optional' | 'Restricted' | 'WorkingHoliday';
  is_optional: boolean;
  description?: string;
}

export interface CompOffGrant {
  id: string;
  employee_id: string;
  employee_name: string;
  earned_date: string;
  source: 'OvertimeWork' | 'HolidayWork' | 'WeeklyOffWork' | 'HRGrant';
  hours_worked: number;
  comp_off_days_earned: number;
  expiry_date: string;
  status: 'Available' | 'Used' | 'Expired' | 'PendingApproval';
  approved_by_name: string;
  reason: string;
  used_in_request_id?: string;
}

export interface LeaveEncashmentRequest {
  id: string;
  request_code: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  leave_type_id: string;
  leave_type_name: string;
  available_balance: number;
  requested_days: number;
  eligible_days: number;
  calculation_basis: 'BasicSalary' | 'GrossSalary' | 'FixedRate';
  estimated_amount: number;
  payroll_period: string; // e.g. "August 2026"
  status: 'Submitted' | 'Approved' | 'Rejected' | 'ProcessedInPayroll';
  approved_by_name?: string;
  submitted_at: string;
  notes?: string;
}

export interface LeaveAdjustment {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type_id: string;
  leave_type_name: string;
  adjustment_type: 'Add' | 'Deduct' | 'Transfer' | 'Correction' | 'CarryForwardGrant';
  amount: number;
  reason: string;
  reference_no: string;
  effective_date: string;
  created_by_name: string;
  status: 'PendingApproval' | 'Approved' | 'Rejected';
  created_at: string;
}

export interface LeaveDelegation {
  id: string;
  manager_id: string;
  manager_name: string;
  delegated_to_id: string;
  delegated_to_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  is_active: boolean;
}

export type LeaveEncashment = LeaveEncashmentRequest;
export type PublicHoliday = Holiday;

export interface AccrualExecutionLog {
  id: string;
  period: string;
  run_timestamp: string;
  employees_processed: number;
  total_leave_days_credited: number;
  status: 'Completed' | 'Failed' | 'Partial';
}

export interface LeaveException {
  id: string;
  type: string;
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  employee_name: string;
  department_name: string;
  flagged_at: string;
  status: 'Open' | 'Resolved';
}

export interface LeaveAuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: 'LeaveRequest' | 'LeavePolicy' | 'LeaveAdjustment' | 'Encashment' | 'HolidayCalendar';
  entity_id: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
}
