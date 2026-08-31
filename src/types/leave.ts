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
  employment_types: string[]; // e.g. ["Full Time", "Probation", "Contract"]
  min_service_days: number;
  max_days_per_request: number;
  min_days_per_request: number;
  max_consecutive_days?: number;
  min_notice_days?: number;
  allow_half_day: boolean;
  allow_hourly: boolean;
  allow_negative_balance: boolean;
  max_negative_balance_days?: number;
  max_negative_balance?: number;
  allow_carry_forward: boolean;
  max_carry_forward_days?: number;
  carry_forward_expiry_months?: number;
  allow_encashment: boolean;
  min_balance_for_encashment?: number;
  max_encashment_days?: number;
  max_encashment_days_per_year?: number;
  encashment_salary_component?: 'Basic' | 'Gross' | 'Fixed';
  encashment_calculation_basis?: 'BasicSalary' | 'GrossSalary' | 'FixedRate' | string;
  attachment_required: boolean;
  attachment_mandatory_days_threshold?: number;
  reason_required?: boolean;
  approval_required: boolean;
  approval_levels?: number;
  allow_backdated: boolean;
  max_backdated_days?: number;
  allow_future: boolean;
  allow_cancellation: boolean;
  allow_modification: boolean;
  converts_to_lop_if_exhausted: boolean;
  applicable_locations: string[]; // ["All"] or location IDs
  applicable_departments: string[]; // ["All"] or dept IDs
  applicable_employee_groups: string[];
  applicable_designations?: string[];
  applicable_grades?: string[];
  probation_rule?: 'Ineligible' | 'AccrueOnly' | 'FullAccess';
  annual_quota?: number; // e.g. 12 for CL, 10 for SL, 15 for EL
  accrual_frequency?: AccrualFrequency; // 'Monthly' | 'Quarterly' | 'Yearly'
  monthly_accrual_rate?: number; // e.g. 1.0 day/month
  accrual_credit_day?: number; // e.g. 1 (1st of each month)
  prorate_first_year?: boolean; // Pro-rate for mid-year joiners
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
  designations?: string[];
  effective_from: string;
  effective_to?: string;
  status: 'Active' | 'Draft' | 'Archived';
  priority: number; // 1 = highest
  precedence_rule?: 'HighPriorityWins' | 'MostSpecificWins';
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
  employee_code?: string;
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
  emergency_contact?: string;
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

export type HolidayType = 'Mandatory' | 'Restricted' | 'Optional' | 'Public' | 'National' | 'Regional' | 'HalfDay';

export interface Holiday {
  id: string;
  calendar_id?: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: string; // 'Mandatory' | 'Restricted' | 'Optional' | 'Public' | 'National' | 'Regional'
  is_optional?: boolean;
  day_of_week?: string;
  half_day?: boolean;
  category?: 'National' | 'Regional' | 'Religious' | 'Gazetted' | 'Corporate' | 'Cultural';
  description?: string;
  notify_employees?: boolean;
}

export interface HolidayCalendar {
  id: string;
  code: string;
  name: string;
  description: string;
  company_id: string;
  location_ids: string[]; // ["All"] or location IDs
  year: number;
  status: 'Active' | 'Draft' | 'Archived';
  holidays: Holiday[];
  weekly_offs: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
  alternate_saturdays?: 'All' | '2nd_4th' | '1st_3rd_5th' | 'None';
  restricted_holiday_max_allowed?: number;
  is_default?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CompOffGrant {
  id: string;
  employee_id: string;
  employee_name: string;
  earned_date?: string;
  worked_date?: string;
  source?: 'OvertimeWork' | 'HolidayWork' | 'WeeklyOffWork' | 'HRGrant' | string;
  hours_worked?: number;
  comp_off_days_earned?: number;
  credit_days?: number;
  expiry_date: string;
  status: 'Available' | 'Used' | 'Expired' | 'PendingApproval' | 'Approved' | 'Pending';
  approved_by_name?: string;
  reason: string;
  used_in_request_id?: string;
}

export interface LeaveEncashmentRequest {
  id: string;
  request_code?: string;
  employee_id: string;
  employee_name: string;
  department_name?: string;
  leave_type_id: string;
  leave_type_name: string;
  available_balance?: number;
  requested_days?: number;
  days_to_encash?: number;
  eligible_days?: number;
  calculation_basis?: 'BasicSalary' | 'GrossSalary' | 'FixedRate' | string;
  estimated_amount: number;
  payroll_period?: string;
  payroll_status?: 'Pending' | 'Processed' | string;
  status: 'Submitted' | 'Approved' | 'Rejected' | 'ProcessedInPayroll' | 'Pending';
  approved_by_name?: string;
  submitted_at?: string;
  notes?: string;
}

export interface LeaveAdjustment {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type_id: string;
  leave_type_name: string;
  adjustment_type: 'Add' | 'Deduct' | 'Transfer' | 'Correction' | 'CarryForwardGrant' | 'Grant' | 'Deduction';
  amount: number;
  reason: string;
  reference_no?: string;
  effective_date?: string;
  created_by_name?: string;
  actor_name?: string;
  supporting_doc_url?: string;
  status?: 'PendingApproval' | 'Approved' | 'Rejected' | 'Pending';
  created_at?: string;
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
  status: 'Completed' | 'Failed' | 'Partial' | 'Reversed' | 'Success';
  message?: string;
  reversed_at?: string;
  reversed_by?: string;
}

export interface LeaveException {
  id: string;
  type: string;
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  employee_id?: string;
  employee_name: string;
  department_name: string;
  rule_violated?: string;
  current_state?: string;
  recommended_action?: string;
  flagged_at: string;
  status: 'Open' | 'Resolved';
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface LeaveAuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: 'LeaveType' | 'LeaveRequest' | 'LeavePolicy' | 'LeaveAdjustment' | 'Encashment' | 'HolidayCalendar' | 'AccrualBatch';
  entity_id: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
}
