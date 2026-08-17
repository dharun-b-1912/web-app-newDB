import {
  CompOffGrant,
  HolidayCalendar,
  LeaveAdjustment,
  LeaveApproval,
  LeaveAuditLog,
  LeaveDelegation,
  LeaveEncashmentRequest,
  LeaveEntitlement,
  LeaveLedgerTransaction,
  LeavePolicy,
  LeaveRequest,
  LeaveType,
} from '../types/leave';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

const STORAGE_KEYS = {
  LEAVE_TYPES: 'workforce_leave_types_v1',
  LEAVE_POLICIES: 'workforce_leave_policies_v1',
  HOLIDAY_CALENDARS: 'workforce_holiday_calendars_v1',
  ENTITLEMENTS: 'workforce_leave_entitlements_v1',
  LEDGER: 'workforce_leave_ledger_v1',
  REQUESTS: 'workforce_leave_requests_v1',
  APPROVALS: 'workforce_leave_approvals_v1',
  COMP_OFFS: 'workforce_comp_offs_v1',
  ENCASHMENTS: 'workforce_leave_encashments_v1',
  ADJUSTMENTS: 'workforce_leave_adjustments_v1',
  DELEGATIONS: 'workforce_leave_delegations_v1',
  AUDIT_LOGS: 'workforce_leave_audit_logs_v1',
};

// Default seed data
const initialLeaveTypes: LeaveType[] = [
  {
    id: 'lt-cl',
    code: 'CL',
    name: 'Casual Leave',
    description: 'For short-notice personal or urgent emergency matters.',
    category: 'Paid',
    is_paid: true,
    is_active: true,
    gender_applicability: 'All',
    employment_types: ['Full Time', 'Probation', 'Confirmed'],
    min_service_days: 0,
    max_days_per_request: 3,
    min_days_per_request: 0.5,
    allow_half_day: true,
    allow_hourly: false,
    allow_negative_balance: false,
    allow_carry_forward: false,
    allow_encashment: false,
    attachment_required: false,
    approval_required: true,
    allow_backdated: true,
    max_backdated_days: 2,
    allow_future: true,
    allow_cancellation: true,
    allow_modification: true,
    converts_to_lop_if_exhausted: true,
    applicable_locations: ['All'],
    applicable_departments: ['All'],
    applicable_employee_groups: ['All'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lt-sl',
    code: 'SL',
    name: 'Sick Leave / Medical',
    description: 'For illness, medical checkups, or surgical recovery.',
    category: 'Paid',
    is_paid: true,
    is_active: true,
    gender_applicability: 'All',
    employment_types: ['Full Time', 'Probation', 'Confirmed'],
    min_service_days: 0,
    max_days_per_request: 14,
    min_days_per_request: 0.5,
    allow_half_day: true,
    allow_hourly: true,
    allow_negative_balance: true,
    allow_carry_forward: true,
    allow_encashment: false,
    attachment_required: true,
    attachment_mandatory_days_threshold: 2,
    approval_required: true,
    allow_backdated: true,
    max_backdated_days: 7,
    allow_future: false,
    allow_cancellation: true,
    allow_modification: true,
    converts_to_lop_if_exhausted: true,
    applicable_locations: ['All'],
    applicable_departments: ['All'],
    applicable_employee_groups: ['All'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lt-pl',
    code: 'PL',
    name: 'Privilege / Earned Leave',
    description: 'Annual planned vacation leave accrued monthly.',
    category: 'Paid',
    is_paid: true,
    is_active: true,
    gender_applicability: 'All',
    employment_types: ['Full Time', 'Confirmed'],
    min_service_days: 90,
    max_days_per_request: 30,
    min_days_per_request: 1,
    allow_half_day: false,
    allow_hourly: false,
    allow_negative_balance: false,
    allow_carry_forward: true,
    allow_encashment: true,
    attachment_required: false,
    approval_required: true,
    allow_backdated: false,
    allow_future: true,
    allow_cancellation: true,
    allow_modification: true,
    converts_to_lop_if_exhausted: false,
    applicable_locations: ['All'],
    applicable_departments: ['All'],
    applicable_employee_groups: ['All'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lt-ml',
    code: 'ML',
    name: 'Maternity Leave',
    description: 'Statutory maternity leave under Maternity Benefit Act.',
    category: 'Statutory',
    is_paid: true,
    is_active: true,
    gender_applicability: 'Female',
    employment_types: ['Full Time', 'Confirmed', 'Probation'],
    min_service_days: 80,
    max_days_per_request: 182,
    min_days_per_request: 30,
    allow_half_day: false,
    allow_hourly: false,
    allow_negative_balance: false,
    allow_carry_forward: false,
    allow_encashment: false,
    attachment_required: true,
    attachment_mandatory_days_threshold: 1,
    approval_required: true,
    allow_backdated: true,
    max_backdated_days: 14,
    allow_future: true,
    allow_cancellation: false,
    allow_modification: true,
    converts_to_lop_if_exhausted: false,
    applicable_locations: ['All'],
    applicable_departments: ['All'],
    applicable_employee_groups: ['All'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lt-comp',
    code: 'COMP',
    name: 'Compensatory Off',
    description: 'Leave credited for working on a weekly off or public holiday.',
    category: 'Compensatory',
    is_paid: true,
    is_active: true,
    gender_applicability: 'All',
    employment_types: ['Full Time', 'Confirmed'],
    min_service_days: 0,
    max_days_per_request: 5,
    min_days_per_request: 0.5,
    allow_half_day: true,
    allow_hourly: false,
    allow_negative_balance: false,
    allow_carry_forward: false,
    allow_encashment: false,
    attachment_required: false,
    approval_required: true,
    allow_backdated: false,
    allow_future: true,
    allow_cancellation: true,
    allow_modification: true,
    converts_to_lop_if_exhausted: false,
    applicable_locations: ['All'],
    applicable_departments: ['All'],
    applicable_employee_groups: ['All'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lt-lop',
    code: 'LOP',
    name: 'Loss of Pay (LWP)',
    description: 'Unpaid absence or exhausted leave balance.',
    category: 'Unpaid',
    is_paid: false,
    is_active: true,
    gender_applicability: 'All',
    employment_types: ['Full Time', 'Part Time', 'Contract', 'Probation'],
    min_service_days: 0,
    max_days_per_request: 90,
    min_days_per_request: 0.5,
    allow_half_day: true,
    allow_hourly: false,
    allow_negative_balance: true,
    allow_carry_forward: false,
    allow_encashment: false,
    attachment_required: false,
    approval_required: true,
    allow_backdated: true,
    max_backdated_days: 30,
    allow_future: true,
    allow_cancellation: true,
    allow_modification: true,
    converts_to_lop_if_exhausted: true,
    applicable_locations: ['All'],
    applicable_departments: ['All'],
    applicable_employee_groups: ['All'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const initialHolidayCalendars: HolidayCalendar[] = [
  {
    id: 'hol-tn-2026',
    code: 'TN-2026',
    name: 'Tamil Nadu India Holidays 2026',
    description: 'Official statutory and regional holiday list for Coimbatore & TN branches.',
    company_id: 'comp-01',
    location_ids: ['loc-cbe-01'],
    year: 2026,
    status: 'Active',
    weekly_offs: ['Saturday', 'Sunday'],
    created_at: '2026-01-01T00:00:00Z',
    holidays: [
      { id: 'h1', calendar_id: 'hol-tn-2026', name: 'New Year Day', date: '2026-01-01', type: 'Public', is_optional: false },
      { id: 'h2', calendar_id: 'hol-tn-2026', name: 'Pongal / Makar Sankranti', date: '2026-01-14', type: 'Regional', is_optional: false },
      { id: 'h3', calendar_id: 'hol-tn-2026', name: 'Thiruvalluvar Day', date: '2026-01-15', type: 'Regional', is_optional: false },
      { id: 'h4', calendar_id: 'hol-tn-2026', name: 'Republic Day', date: '2026-01-26', type: 'National', is_optional: false },
      { id: 'h5', calendar_id: 'hol-tn-2026', name: 'Good Friday', date: '2026-04-03', type: 'Public', is_optional: false },
      { id: 'h6', calendar_id: 'hol-tn-2026', name: 'May Day / Labor Day', date: '2026-05-01', type: 'National', is_optional: false },
      { id: 'h7', calendar_id: 'hol-tn-2026', name: 'Independence Day', date: '2026-08-15', type: 'National', is_optional: false },
      { id: 'h8', calendar_id: 'hol-tn-2026', name: 'Vinayakar Chathurthi', date: '2026-09-14', type: 'Regional', is_optional: true },
      { id: 'h9', calendar_id: 'hol-tn-2026', name: 'Gandhi Jayanthi', date: '2026-10-02', type: 'National', is_optional: false },
      { id: 'h10', calendar_id: 'hol-tn-2026', name: 'Deepavali', date: '2026-11-08', type: 'Public', is_optional: false },
      { id: 'h11', calendar_id: 'hol-tn-2026', name: 'Christmas Day', date: '2026-12-25', type: 'Public', is_optional: false },
    ],
  },
];

const initialLeaveRequests: LeaveRequest[] = [];

const initialEntitlements: LeaveEntitlement[] = [
  {
    id: 'ent-101-pl',
    employee_id: 'emp-101',
    employee_name: 'Rajesh Kumar',
    department_name: 'Engineering',
    leave_type_id: 'lt-pl',
    leave_type_name: 'Privilege / Earned Leave',
    policy_id: 'pol-ind-01',
    policy_name: 'Acme India Standard Policy 2026',
    period: '2026',
    opening_balance: 10,
    granted: 12,
    accrued: 14,
    carried_forward: 5,
    adjustments: 0,
    used: 4,
    pending: 4,
    encashed: 0,
    expired: 0,
    closing_balance: 25,
    available_balance: 21,
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'ent-101-cl',
    employee_id: 'emp-101',
    employee_name: 'Rajesh Kumar',
    department_name: 'Engineering',
    leave_type_id: 'lt-cl',
    leave_type_name: 'Casual Leave',
    policy_id: 'pol-ind-01',
    policy_name: 'Acme India Standard Policy 2026',
    period: '2026',
    opening_balance: 0,
    granted: 12,
    accrued: 8,
    carried_forward: 0,
    adjustments: 1,
    used: 3,
    pending: 0,
    encashed: 0,
    expired: 0,
    closing_balance: 6,
    available_balance: 6,
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'ent-102-cl',
    employee_id: 'emp-102',
    employee_name: 'Sarah Jenkins',
    department_name: 'Product Management',
    leave_type_id: 'lt-cl',
    leave_type_name: 'Casual Leave',
    policy_id: 'pol-ind-01',
    policy_name: 'Acme India Standard Policy 2026',
    period: '2026',
    opening_balance: 0,
    granted: 12,
    accrued: 8,
    carried_forward: 0,
    adjustments: 0,
    used: 4,
    pending: 0,
    encashed: 0,
    expired: 0,
    closing_balance: 4,
    available_balance: 4,
    updated_at: '2026-08-01T00:00:00Z',
  },
];

const initialLedger: LeaveLedgerTransaction[] = [
  {
    id: 'led-1',
    employee_id: 'emp-101',
    employee_name: 'Rajesh Kumar',
    leave_type_id: 'lt-pl',
    leave_type_name: 'Privilege / Earned Leave',
    date: '2026-01-01',
    transaction_type: 'Opening',
    amount: 5,
    balance_after: 5,
    actor_id: 'sys',
    actor_name: 'Yearly Carry Forward Job',
    reason: 'Carry forward balance from 2025',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'led-2',
    employee_id: 'emp-101',
    employee_name: 'Rajesh Kumar',
    leave_type_id: 'lt-pl',
    leave_type_name: 'Privilege / Earned Leave',
    date: '2026-01-01',
    transaction_type: 'Accrual',
    amount: 14,
    balance_after: 19,
    actor_id: 'sys',
    actor_name: 'Monthly Accrual Job',
    reason: 'Monthly accrual grant',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'led-3',
    employee_id: 'emp-101',
    employee_name: 'Rajesh Kumar',
    leave_type_id: 'lt-pl',
    leave_type_name: 'Privilege / Earned Leave',
    date: '2026-05-10',
    transaction_type: 'Consumption',
    amount: -4,
    balance_after: 15,
    reference_id: 'lr-099',
    actor_id: 'emp-100',
    actor_name: 'Anand Viswanathan',
    reason: 'Approved Leave Request LR-2026-055',
    created_at: '2026-05-10T14:00:00Z',
  },
];

// Helper Functions for Local Storage
function getStored<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('LocalStorage error', e);
  }
}

export const leaveApi = {
  // --- Leave Types ---
  getLeaveTypes: (): LeaveType[] => {
    return getStored(STORAGE_KEYS.LEAVE_TYPES, initialLeaveTypes);
  },

  saveLeaveType: (type: LeaveType): LeaveType => {
    const types = leaveApi.getLeaveTypes();
    const idx = types.findIndex(t => t.id === type.id);
    if (idx >= 0) {
      types[idx] = { ...type, updated_at: new Date().toISOString() };
    } else {
      types.push({ ...type, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    setStored(STORAGE_KEYS.LEAVE_TYPES, types);
    return type;
  },

  // --- Holiday Calendars ---
  getHolidayCalendars: (): HolidayCalendar[] => {
    return getStored(STORAGE_KEYS.HOLIDAY_CALENDARS, initialHolidayCalendars);
  },

  saveHolidayCalendar: (calendar: HolidayCalendar): HolidayCalendar => {
    const cals = leaveApi.getHolidayCalendars();
    const idx = cals.findIndex(c => c.id === calendar.id);
    if (idx >= 0) {
      cals[idx] = calendar;
    } else {
      cals.push(calendar);
    }
    setStored(STORAGE_KEYS.HOLIDAY_CALENDARS, cals);
    return calendar;
  },

  // --- Leave Requests ---
  getLeaveRequests: (): LeaveRequest[] => {
    return getStored(STORAGE_KEYS.REQUESTS, initialLeaveRequests);
  },

  submitLeaveRequest: (req: Partial<LeaveRequest>): LeaveRequest => {
    const requests = leaveApi.getLeaveRequests();
    const newReq: LeaveRequest = {
      id: `lr-${Date.now()}`,
      request_code: `LR-2026-${Math.floor(100 + Math.random() * 900)}`,
      employee_id: req.employee_id || 'emp-101',
      employee_name: req.employee_name || 'Rajesh Kumar',
      department_name: req.department_name || 'Engineering',
      company_id: req.company_id || 'comp-01',
      avatar_url: req.avatar_url,
      leave_type_id: req.leave_type_id || 'lt-cl',
      leave_type_name: req.leave_type_name || 'Casual Leave',
      leave_type_code: req.leave_type_code || 'CL',
      leave_category: req.leave_category || 'Paid',
      from_date: req.from_date || '',
      to_date: req.to_date || '',
      total_calendar_days: req.total_calendar_days || 1,
      working_days: req.working_days || 1,
      holiday_days: req.holiday_days || 0,
      weekly_off_days: req.weekly_off_days || 0,
      leave_days_deducted: req.leave_days_deducted || 1,
      is_half_day: req.is_half_day || false,
      half_day_session: req.half_day_session,
      is_hourly: req.is_hourly || false,
      reason: req.reason || '',
      attachment_url: req.attachment_url,
      contact_number: req.contact_number,
      manager_id: req.manager_id || 'emp-100',
      manager_name: req.manager_name || 'Anand Viswanathan',
      status: 'Pending',
      submitted_at: new Date().toISOString(),
      daily_breakdown: req.daily_breakdown || [],
      current_approver_name: req.manager_name || 'Anand Viswanathan',
      is_lop: req.is_lop || false,
      created_at: new Date().toISOString(),
    };

    requests.unshift(newReq);
    setStored(STORAGE_KEYS.REQUESTS, requests);

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase
          .from('leave_requests')
          .insert({
            id: newReq.id,
            organization_id: 'org-01',
            company_id: newReq.company_id || 'comp-01',
            employee_id: newReq.employee_id,
            request_code: newReq.request_code,
            employee_name: newReq.employee_name,
            department_name: newReq.department_name,
            leave_type_id: newReq.leave_type_id,
            leave_type_name: newReq.leave_type_name,
            leave_type_code: newReq.leave_type_code,
            from_date: newReq.from_date,
            to_date: newReq.to_date,
            total_calendar_days: newReq.total_calendar_days,
            working_days: newReq.working_days,
            leave_days_deducted: newReq.leave_days_deducted,
            reason: newReq.reason,
            manager_id: newReq.manager_id,
            manager_name: newReq.manager_name,
            status: newReq.status,
            submitted_at: newReq.submitted_at,
            created_at: newReq.created_at,
          })
      ).catch((e: any) => console.warn('[Supabase Leave] insert failed:', e));
    }

    // Audit log entry
    leaveApi.addAuditLog({
      actor_id: newReq.employee_id,
      actor_name: newReq.employee_name,
      action: 'SUBMIT_LEAVE_REQUEST',
      entity_type: 'LeaveRequest',
      entity_id: newReq.id,
      new_value: `Requested ${newReq.leave_days_deducted} days of ${newReq.leave_type_name} from ${newReq.from_date} to ${newReq.to_date}`,
    });

    return newReq;
  },

  approveLeaveRequest: (requestId: string, approverName: string, comments?: string): LeaveRequest => {
    const requests = leaveApi.getLeaveRequests();
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx < 0) throw new Error('Request not found');

    const req = requests[idx];
    req.status = 'Approved';
    req.approved_at = new Date().toISOString();
    req.approved_by_name = approverName;
    req.current_approver_name = 'Completed';
    req.comments = comments;

    setStored(STORAGE_KEYS.REQUESTS, requests);

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase
          .from('leave_requests')
          .update({
            status: 'Approved',
            approved_at: req.approved_at,
          })
          .eq('id', req.id)
      ).catch((e: any) => console.warn('[Supabase Leave] approve failed:', e));
    }

    // 1. Post consumption transaction to Ledger
    const ledger = leaveApi.getLedger();
    const prevBalance = ledger.filter(l => l.employee_id === req.employee_id && l.leave_type_id === req.leave_type_id)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const newLedgerEntry: LeaveLedgerTransaction = {
      id: `led-${Date.now()}`,
      employee_id: req.employee_id,
      employee_name: req.employee_name,
      leave_type_id: req.leave_type_id,
      leave_type_name: req.leave_type_name,
      date: new Date().toISOString().split('T')[0],
      transaction_type: 'Consumption',
      amount: -req.leave_days_deducted,
      balance_after: prevBalance - req.leave_days_deducted,
      reference_id: req.id,
      actor_id: 'approver',
      actor_name: approverName,
      reason: `Approved leave request ${req.request_code}`,
      created_at: new Date().toISOString(),
    };

    ledger.unshift(newLedgerEntry);
    setStored(STORAGE_KEYS.LEDGER, ledger);

    // 2. Attendance Integration Bridge: Post Attendance records for leave dates
    try {
      const storedAttendanceKey = 'workforce_attendance_daily_logs_v1';
      const rawAtt = localStorage.getItem(storedAttendanceKey);
      const attLogs = rawAtt ? JSON.parse(rawAtt) : [];

      req.daily_breakdown.forEach(day => {
        if (day.is_working_day) {
          const status = day.is_half_day ? 'Half Day' : 'On Leave';
          attLogs.unshift({
            id: `att-leave-${Date.now()}-${day.date}`,
            employee_id: req.employee_id,
            employee_name: req.employee_name,
            department: req.department_name,
            date: day.date,
            shift_name: 'General Day Shift (09:00 - 18:00)',
            scheduled_start: '09:00',
            scheduled_end: '18:00',
            first_check_in: '-',
            last_check_out: '-',
            gross_hours: 0,
            break_hours: 0,
            net_hours: day.is_half_day ? 4 : 0,
            status: status,
            punch_source: 'Manual / System',
            is_late_arrival: false,
            is_early_checkout: false,
            regularization_status: 'Approved',
            overtime_hours: 0,
          });
        }
      });
      localStorage.setItem(storedAttendanceKey, JSON.stringify(attLogs));
    } catch (e) {
      console.warn('Attendance sync exception:', e);
    }

    // Audit log
    leaveApi.addAuditLog({
      actor_id: 'approver',
      actor_name: approverName,
      action: 'APPROVE_LEAVE_REQUEST',
      entity_type: 'LeaveRequest',
      entity_id: req.id,
      new_value: `Approved request ${req.request_code} for ${req.employee_name}`,
    });

    return req;
  },

  rejectLeaveRequest: (requestId: string, rejectorName: string, reason: string): LeaveRequest => {
    const requests = leaveApi.getLeaveRequests();
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx < 0) throw new Error('Request not found');

    const req = requests[idx];
    req.status = 'Rejected';
    req.rejection_reason = reason;
    req.current_approver_name = 'Completed';

    setStored(STORAGE_KEYS.REQUESTS, requests);

    leaveApi.addAuditLog({
      actor_id: 'rejector',
      actor_name: rejectorName,
      action: 'REJECT_LEAVE_REQUEST',
      entity_type: 'LeaveRequest',
      entity_id: req.id,
      new_value: `Rejected ${req.request_code}. Reason: ${reason}`,
    });

    return req;
  },

  cancelLeaveRequest: (requestId: string, actorName: string, reason: string): LeaveRequest => {
    const requests = leaveApi.getLeaveRequests();
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx < 0) throw new Error('Request not found');

    const req = requests[idx];
    const wasApproved = req.status === 'Approved';
    req.status = 'Cancelled';
    req.cancellation_reason = reason;

    setStored(STORAGE_KEYS.REQUESTS, requests);

    // If request was previously approved, issue a reversal transaction to restore balance
    if (wasApproved) {
      const ledger = leaveApi.getLedger();
      const prevBalance = ledger
        .filter(l => l.employee_id === req.employee_id && l.leave_type_id === req.leave_type_id)
        .reduce((acc, curr) => acc + curr.amount, 0);

      const reversalEntry: LeaveLedgerTransaction = {
        id: `led-${Date.now()}`,
        employee_id: req.employee_id,
        employee_name: req.employee_name,
        leave_type_id: req.leave_type_id,
        leave_type_name: req.leave_type_name,
        date: new Date().toISOString().split('T')[0],
        transaction_type: 'Reversal',
        amount: req.leave_days_deducted,
        balance_after: prevBalance + req.leave_days_deducted,
        reference_id: req.id,
        actor_id: 'user',
        actor_name: actorName,
        reason: `Reversal for cancelled leave request ${req.request_code}: ${reason}`,
        created_at: new Date().toISOString(),
      };
      ledger.unshift(reversalEntry);
      setStored(STORAGE_KEYS.LEDGER, ledger);
    }

    leaveApi.addAuditLog({
      actor_id: 'user',
      actor_name: actorName,
      action: 'CANCEL_LEAVE_REQUEST',
      entity_type: 'LeaveRequest',
      entity_id: req.id,
      new_value: `Cancelled request ${req.request_code}`,
    });

    return req;
  },

  // --- Entitlements & Ledger ---
  getEntitlements: (): LeaveEntitlement[] => {
    return getStored(STORAGE_KEYS.ENTITLEMENTS, initialEntitlements);
  },

  getLedger: (): LeaveLedgerTransaction[] => {
    return getStored(STORAGE_KEYS.LEDGER, initialLedger);
  },

  // --- Compensatory Offs ---
  getCompOffGrants: (): CompOffGrant[] => {
    return getStored(STORAGE_KEYS.COMP_OFFS, [
      {
        id: 'co-101',
        employee_id: 'emp-101',
        employee_name: 'Rajesh Kumar',
        earned_date: '2026-07-26',
        source: 'HolidayWork',
        hours_worked: 8,
        comp_off_days_earned: 1,
        expiry_date: '2026-10-26',
        status: 'Available',
        approved_by_name: 'Anand Viswanathan',
        reason: 'Worked on Sunday deployment shift for Cloud release v4.2',
      },
    ]);
  },

  // --- Leave Encashment ---
  getEncashments: (): LeaveEncashmentRequest[] => {
    return getStored(STORAGE_KEYS.ENCASHMENTS, [
      {
        id: 'enc-101',
        request_code: 'ENC-2026-01',
        employee_id: 'emp-101',
        employee_name: 'Rajesh Kumar',
        department_name: 'Engineering',
        leave_type_id: 'lt-pl',
        leave_type_name: 'Privilege / Earned Leave',
        available_balance: 21,
        requested_days: 5,
        eligible_days: 10,
        calculation_basis: 'BasicSalary',
        estimated_amount: 18500,
        payroll_period: 'August 2026',
        status: 'Submitted',
        submitted_at: '2026-08-01T10:00:00Z',
        notes: 'Mid-year leave encashment request per company policy.',
      },
    ]);
  },

  // --- Leave Adjustments ---
  getAdjustments: (): LeaveAdjustment[] => {
    return getStored(STORAGE_KEYS.ADJUSTMENTS, [
      {
        id: 'adj-101',
        employee_id: 'emp-101',
        employee_name: 'Rajesh Kumar',
        leave_type_id: 'lt-cl',
        leave_type_name: 'Casual Leave',
        adjustment_type: 'Add',
        amount: 1,
        reason: 'Correction for unrecorded compensatory credit',
        reference_no: 'HR-ADJ-2026-044',
        effective_date: '2026-07-15',
        created_by_name: 'Anand Viswanathan (HR Head)',
        status: 'Approved',
        created_at: '2026-07-15T10:00:00Z',
      },
    ]);
  },

  // --- Accrual Engine Logs & Batch Processing ---
  getAccrualLogs: () => {
    return getStored('workforce_accrual_logs_v1', [
      {
        id: 'acc-2026-07',
        period: '2026-07',
        run_timestamp: '2026-07-01T00:05:00Z',
        employees_processed: 428,
        total_leave_days_credited: 856,
        status: 'Completed',
      },
      {
        id: 'acc-2026-06',
        period: '2026-06',
        run_timestamp: '2026-06-01T00:05:00Z',
        employees_processed: 425,
        total_leave_days_credited: 850,
        status: 'Completed',
      },
    ]);
  },

  runMonthlyAccrualJob: (period: string) => {
    const logs = leaveApi.getAccrualLogs();
    const existing = logs.find(l => l.period === period);
    if (existing) {
      return existing; // Idempotent check
    }

    const newLog = {
      id: `acc-${Date.now()}`,
      period: period,
      run_timestamp: new Date().toISOString(),
      employees_processed: 428,
      total_leave_days_credited: 856,
      status: 'Completed' as const,
    };

    logs.unshift(newLog);
    setStored('workforce_accrual_logs_v1', logs);
    return newLog;
  },

  // --- Leave Exceptions ---
  getExceptions: () => {
    return getStored('workforce_leave_exceptions_v1', [
      {
        id: 'exc-01',
        type: 'Staffing Capacity Threshold Warning',
        severity: 'High' as const,
        title: 'Engineering Team Availability Under 80%',
        description: '4 members in Engineering requested leave on August 18–21.',
        employee_name: 'Rajesh Kumar & 3 Others',
        department_name: 'Engineering',
        flagged_at: '2026-08-10T12:00:00Z',
        status: 'Open' as const,
      },
      {
        id: 'exc-02',
        type: 'Missing Attachment Flag',
        severity: 'Medium' as const,
        title: 'Sick Leave > 2 Days Without Medical Certificate',
        description: 'Vikramaditya Rao applied for 3 days Sick Leave without mandatory attachment.',
        employee_name: 'Vikramaditya Rao',
        department_name: 'DevOps & Cloud',
        flagged_at: '2026-08-11T08:00:00Z',
        status: 'Open' as const,
      },
    ]);
  },

  // --- Audit Logs ---
  getAuditLogs: (): LeaveAuditLog[] => {
    return getStored(STORAGE_KEYS.AUDIT_LOGS, []);
  },

  addAuditLog: (log: Omit<LeaveAuditLog, 'id' | 'timestamp'>) => {
    const logs = leaveApi.getAuditLogs();
    const newLog: LeaveAuditLog = {
      ...log,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    setStored(STORAGE_KEYS.AUDIT_LOGS, logs);
  },
};
