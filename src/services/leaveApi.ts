import {
  CompOffGrant,
  Holiday,
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
  AccrualExecutionLog,
  LeaveException,
} from '../types/leave';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { hrEventBus } from './hrEventBus';
import { attendanceRosterService } from './attendance/attendanceRosterService';

const STORAGE_KEYS = {
  LEAVE_TYPES: 'workforce_leave_types_v2',
  LEAVE_POLICIES: 'workforce_leave_policies_v2',
  HOLIDAY_CALENDARS: 'workforce_holiday_calendars_v2',
  ENTITLEMENTS: 'workforce_leave_entitlements_v2',
  LEDGER: 'workforce_leave_ledger_v2',
  REQUESTS: 'workforce_leave_requests_v2',
  APPROVALS: 'workforce_leave_approvals_v2',
  COMP_OFFS: 'workforce_comp_offs_v2',
  ENCASHMENTS: 'workforce_leave_encashments_v2',
  ADJUSTMENTS: 'workforce_leave_adjustments_v2',
  DELEGATIONS: 'workforce_leave_delegations_v2',
  AUDIT_LOGS: 'workforce_leave_audit_logs_v2',
  ACCRUAL_LOGS: 'workforce_accrual_logs_v2',
  EXCEPTIONS: 'workforce_leave_exceptions_v2',
};

// Purge legacy mock data from browser localStorage once
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const legacyKeys = [
      'workforce_leave_exceptions_v1',
      'workforce_accrual_logs_v1',
      'workforce_comp_offs_v1',
      'workforce_leave_encashments_v1',
      'workforce_leave_adjustments_v1',
      'workforce_leave_entitlements_v1',
      'workforce_leave_ledger_v1',
      'workforce_leave_requests_v1',
      'workforce_leave_approvals_v1',
    ];
    legacyKeys.forEach(k => window.localStorage.removeItem(k));
  }
} catch (_) {}

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
    annual_quota: 12,
    accrual_frequency: 'Monthly',
    monthly_accrual_rate: 1.0,
    accrual_credit_day: 1,
    prorate_first_year: true,
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
    annual_quota: 10,
    accrual_frequency: 'Monthly',
    monthly_accrual_rate: 0.83,
    accrual_credit_day: 1,
    prorate_first_year: true,
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
    annual_quota: 15,
    accrual_frequency: 'Monthly',
    monthly_accrual_rate: 1.25,
    accrual_credit_day: 1,
    prorate_first_year: true,
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
    description: 'Official statutory and regional holiday list for Coimbatore & Chennai branches.',
    company_id: 'comp-01',
    location_ids: ['loc-cbe-01', 'loc-che-01'],
    year: 2026,
    status: 'Active',
    weekly_offs: ['Saturday', 'Sunday'],
    alternate_saturdays: 'None',
    restricted_holiday_max_allowed: 2,
    is_default: true,
    created_at: '2026-01-01T00:00:00Z',
    holidays: [
      { id: 'tn-h1', calendar_id: 'hol-tn-2026', name: 'New Year Day', date: '2026-01-01', type: 'Restricted', is_optional: true, day_of_week: 'Thu', category: 'Cultural', description: 'Celebration of Gregorian New Year' },
      { id: 'tn-h2', calendar_id: 'hol-tn-2026', name: 'Pongal / Makar Sankranti', date: '2026-01-14', type: 'Mandatory', is_optional: false, day_of_week: 'Wed', category: 'Regional', description: 'Tamil Harvest Festival' },
      { id: 'tn-h3', calendar_id: 'hol-tn-2026', name: 'Thiruvalluvar Day', date: '2026-01-15', type: 'Mandatory', is_optional: false, day_of_week: 'Thu', category: 'Regional', description: 'Honoring saint-philosopher Thiruvalluvar' },
      { id: 'tn-h4', calendar_id: 'hol-tn-2026', name: 'Uzhavar Thirunal', date: '2026-01-16', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Regional', description: 'Farmers festival and celebration' },
      { id: 'tn-h5', calendar_id: 'hol-tn-2026', name: 'Republic Day', date: '2026-01-26', type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'National Republic Day celebration' },
      { id: 'tn-h6', calendar_id: 'hol-tn-2026', name: 'Telugu / Tamil New Year (Ugadi / Puthandu)', date: '2026-03-20', type: 'Restricted', is_optional: true, day_of_week: 'Fri', category: 'Religious', description: 'Vernal equinox new year celebration' },
      { id: 'tn-h7', calendar_id: 'hol-tn-2026', name: 'Good Friday', date: '2026-04-03', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Christian remembrance of Good Friday' },
      { id: 'tn-h8', calendar_id: 'hol-tn-2026', name: 'Dr. B.R. Ambedkar Jayanti', date: '2026-04-14', type: 'Mandatory', is_optional: false, day_of_week: 'Tue', category: 'National', description: 'Commemoration of the father of the Constitution' },
      { id: 'tn-h9', calendar_id: 'hol-tn-2026', name: 'May Day / International Workers Day', date: '2026-05-01', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'National', description: 'Statutory holiday honoring workers' },
      { id: 'tn-h10', calendar_id: 'hol-tn-2026', name: 'Bakrid / Eid al-Adha', date: '2026-05-27', type: 'Mandatory', is_optional: false, day_of_week: 'Wed', category: 'Religious', description: 'Islamic Feast of the Sacrifice' },
      { id: 'tn-h11', calendar_id: 'hol-tn-2026', name: 'Independence Day', date: '2026-08-15', type: 'Mandatory', is_optional: false, day_of_week: 'Sat', category: 'National', description: '79th Indian Independence Day' },
      { id: 'tn-h12', calendar_id: 'hol-tn-2026', name: 'Vinayakar Chathurthi', date: '2026-09-14', type: 'Restricted', is_optional: true, day_of_week: 'Mon', category: 'Religious', description: 'Ganesh Chaturthi festival' },
      { id: 'tn-h13', calendar_id: 'hol-tn-2026', name: 'Gandhi Jayanthi', date: '2026-10-02', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'National', description: 'Mahatma Gandhi birthday commemoration' },
      { id: 'tn-h14', calendar_id: 'hol-tn-2026', name: 'Ayutha Pooja / Vijaya Dasami', date: '2026-10-20', type: 'Mandatory', is_optional: false, day_of_week: 'Tue', category: 'Regional', description: 'Dussehra and Saraswati/Ayudha Puja' },
      { id: 'tn-h15', calendar_id: 'hol-tn-2026', name: 'Deepavali Festival of Lights', date: '2026-11-08', type: 'Mandatory', is_optional: false, day_of_week: 'Sun', category: 'Religious', description: 'Major cultural festival of lights' },
      { id: 'tn-h16', calendar_id: 'hol-tn-2026', name: 'Christmas Day', date: '2026-12-25', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Christmas celebration' },
    ],
  },
  {
    id: 'hol-ka-2026',
    code: 'KA-2026',
    name: 'Karnataka Tech Hub Holidays 2026',
    description: 'Official statutory and regional holiday list for Bengaluru Electronic City & Koramangala tech offices.',
    company_id: 'comp-01',
    location_ids: ['loc-blr-01'],
    year: 2026,
    status: 'Active',
    weekly_offs: ['Saturday', 'Sunday'],
    alternate_saturdays: 'None',
    restricted_holiday_max_allowed: 2,
    created_at: '2026-01-01T00:00:00Z',
    holidays: [
      { id: 'ka-h1', calendar_id: 'hol-ka-2026', name: 'New Year Day', date: '2026-01-01', type: 'Restricted', is_optional: true, day_of_week: 'Thu', category: 'Cultural', description: 'New Year celebration' },
      { id: 'ka-h2', calendar_id: 'hol-ka-2026', name: 'Makara Sankranti', date: '2026-01-14', type: 'Mandatory', is_optional: false, day_of_week: 'Wed', category: 'Regional', description: 'Harvest festival in Karnataka' },
      { id: 'ka-h3', calendar_id: 'hol-ka-2026', name: 'Republic Day', date: '2026-01-26', type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'National Republic Day' },
      { id: 'ka-h4', calendar_id: 'hol-ka-2026', name: 'Maha Shivaratri', date: '2026-02-16', type: 'Restricted', is_optional: true, day_of_week: 'Mon', category: 'Religious', description: 'Great night of Shiva' },
      { id: 'ka-h5', calendar_id: 'hol-ka-2026', name: 'Chandramana Ugadi', date: '2026-03-20', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Regional', description: 'Kannada New Year' },
      { id: 'ka-h6', calendar_id: 'hol-ka-2026', name: 'Good Friday', date: '2026-04-03', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Good Friday' },
      { id: 'ka-h7', calendar_id: 'hol-ka-2026', name: 'Dr. B.R. Ambedkar Jayanti', date: '2026-04-14', type: 'Mandatory', is_optional: false, day_of_week: 'Tue', category: 'National', description: 'Ambedkar Jayanti' },
      { id: 'ka-h8', calendar_id: 'hol-ka-2026', name: 'May Day', date: '2026-05-01', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'National', description: 'Labour Day' },
      { id: 'ka-h9', calendar_id: 'hol-ka-2026', name: 'Independence Day', date: '2026-08-15', type: 'Mandatory', is_optional: false, day_of_week: 'Sat', category: 'National', description: 'Indian Independence Day' },
      { id: 'ka-h10', calendar_id: 'hol-ka-2026', name: 'Ganesh Chaturthi', date: '2026-09-14', type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'Religious', description: 'Ganesh Festival' },
      { id: 'ka-h11', calendar_id: 'hol-ka-2026', name: 'Gandhi Jayanthi', date: '2026-10-02', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'National', description: 'Gandhi Jayanthi' },
      { id: 'ka-h12', calendar_id: 'hol-ka-2026', name: 'Kannada Rajyotsava', date: '2026-11-01', type: 'Mandatory', is_optional: false, day_of_week: 'Sun', category: 'Regional', description: 'Karnataka State Formation Day' },
      { id: 'ka-h13', calendar_id: 'hol-ka-2026', name: 'Deepavali / Balipadyami', date: '2026-11-09', type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'Religious', description: 'Diwali Balipadyami' },
      { id: 'ka-h14', calendar_id: 'hol-ka-2026', name: 'Christmas Day', date: '2026-12-25', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Christmas' },
    ],
  },
  {
    id: 'hol-mh-2026',
    code: 'MH-2026',
    name: 'Maharashtra / Mumbai Office 2026',
    description: 'Statutory and state holiday calendar for Mumbai BKC & Pune development centers.',
    company_id: 'comp-01',
    location_ids: ['loc-mum-01', 'loc-pun-01'],
    year: 2026,
    status: 'Active',
    weekly_offs: ['Saturday', 'Sunday'],
    alternate_saturdays: 'None',
    restricted_holiday_max_allowed: 2,
    created_at: '2026-01-01T00:00:00Z',
    holidays: [
      { id: 'mh-h1', calendar_id: 'hol-mh-2026', name: 'Republic Day', date: '2026-01-26', type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'Republic Day' },
      { id: 'mh-h2', calendar_id: 'hol-mh-2026', name: 'Chhatrapati Shivaji Maharaj Jayanti', date: '2026-02-19', type: 'Mandatory', is_optional: false, day_of_week: 'Thu', category: 'Regional', description: 'Shiv Jayanti' },
      { id: 'mh-h3', calendar_id: 'hol-mh-2026', name: 'Holi (Second Day - Dhulivandan)', date: '2026-03-04', type: 'Mandatory', is_optional: false, day_of_week: 'Wed', category: 'Religious', description: 'Festival of Colors' },
      { id: 'mh-h4', calendar_id: 'hol-mh-2026', name: 'Gudi Padwa', date: '2026-03-20', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Regional', description: 'Marathi New Year' },
      { id: 'mh-h5', calendar_id: 'hol-mh-2026', name: 'Maharashtra Din / May Day', date: '2026-05-01', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Regional', description: 'Maharashtra State Formation Day' },
      { id: 'mh-h6', calendar_id: 'hol-mh-2026', name: 'Independence Day', date: '2026-08-15', type: 'Mandatory', is_optional: false, day_of_week: 'Sat', category: 'National', description: 'Independence Day' },
      { id: 'mh-h7', calendar_id: 'hol-mh-2026', name: 'Ganesh Chaturthi', date: '2026-09-14', type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'Regional', description: 'Ganesh Chaturthi' },
      { id: 'mh-h8', calendar_id: 'hol-mh-2026', name: 'Gandhi Jayanthi', date: '2026-10-02', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'National', description: 'Gandhi Jayanthi' },
      { id: 'mh-h9', calendar_id: 'hol-mh-2026', name: 'Dussehra (Vijayadashami)', date: '2026-10-20', type: 'Mandatory', is_optional: false, day_of_week: 'Tue', category: 'Religious', description: 'Dussehra festival' },
      { id: 'mh-h10', calendar_id: 'hol-mh-2026', name: 'Diwali (Laxmi Pujan)', date: '2026-11-08', type: 'Mandatory', is_optional: false, day_of_week: 'Sun', category: 'Religious', description: 'Diwali Laxmi Pujan' },
      { id: 'mh-h11', calendar_id: 'hol-mh-2026', name: 'Diwali (Bhaubeej / Balipratipada)', date: '2026-11-10', type: 'Mandatory', is_optional: false, day_of_week: 'Tue', category: 'Religious', description: 'Bhaubeej' },
      { id: 'mh-h12', calendar_id: 'hol-mh-2026', name: 'Christmas Day', date: '2026-12-25', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Christmas' },
    ],
  },
  {
    id: 'hol-us-2026',
    code: 'US-2026',
    name: 'US Global Branch Holidays 2026',
    description: 'Federal and corporate holiday calendar for US-based remote & Austin branch personnel.',
    company_id: 'comp-01',
    location_ids: ['loc-us-01', 'loc-us-austin'],
    year: 2026,
    status: 'Active',
    weekly_offs: ['Saturday', 'Sunday'],
    alternate_saturdays: 'None',
    restricted_holiday_max_allowed: 3,
    created_at: '2026-01-01T00:00:00Z',
    holidays: [
      { id: 'us-h1', calendar_id: 'hol-us-2026', name: "New Year's Day", date: '2026-01-01', type: 'Mandatory', is_optional: false, day_of_week: 'Thu', category: 'National', description: 'Federal New Year Holiday' },
      { id: 'us-h2', calendar_id: 'hol-us-2026', name: 'Martin Luther King Jr. Day', date: '2026-01-19', type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'MLK Jr. Birthday remembrance' },
      { id: 'us-h3', calendar_id: 'hol-us-2026', name: "Presidents' Day", date: '2026-02-16', type: 'Restricted', is_optional: true, day_of_week: 'Mon', category: 'National', description: "Washington's Birthday" },
      { id: 'us-h4', calendar_id: 'hol-us-2026', name: 'Memorial Day', date: '2026-05-25', type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'Honoring US Military Personnel' },
      { id: 'us-h5', calendar_id: 'hol-us-2026', name: 'Juneteenth National Independence Day', date: '2026-06-19', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'National', description: 'Emancipation commemoration' },
      { id: 'us-h6', calendar_id: 'hol-us-2026', name: 'Independence Day (Observed)', date: '2026-07-03', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'National', description: '4th of July celebration' },
      { id: 'us-h7', calendar_id: 'hol-us-2026', name: 'Labor Day', date: '2026-09-07', type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'Federal Labor Day' },
      { id: 'us-h8', calendar_id: 'hol-us-2026', name: 'Veterans Day', date: '2026-11-11', type: 'Restricted', is_optional: true, day_of_week: 'Wed', category: 'National', description: 'Honoring military veterans' },
      { id: 'us-h9', calendar_id: 'hol-us-2026', name: 'Thanksgiving Day', date: '2026-11-26', type: 'Mandatory', is_optional: false, day_of_week: 'Thu', category: 'National', description: 'National Thanksgiving' },
      { id: 'us-h10', calendar_id: 'hol-us-2026', name: 'Day After Thanksgiving (Black Friday)', date: '2026-11-27', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Corporate', description: 'Corporate floating holiday' },
      { id: 'us-h11', calendar_id: 'hol-us-2026', name: 'Christmas Day', date: '2026-12-25', type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Federal Christmas Day' },
    ],
  },
];

const initialLeaveRequests: LeaveRequest[] = [];
const initialEntitlements: LeaveEntitlement[] = [];
const initialLedger: LeaveLedgerTransaction[] = [];

const initialLeavePolicies: LeavePolicy[] = [
  {
    id: 'pol-ind-01',
    code: 'POL-IND-FT-2026',
    name: 'Standard Corporate Full-Time Policy',
    description: 'Leave policy for permanent corporate & technology staff.',
    company_id: 'comp-01',
    applicable_groups: ['All'],
    employment_types: ['Full Time', 'Confirmed'],
    departments: ['All'],
    locations: ['All'],
    grades: ['All'],
    effective_from: '2026-01-01',
    status: 'Active',
    priority: 1,
    precedence_rule: 'HighPriorityWins',
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    rules: [
      {
        leave_type_id: 'lt-pl',
        annual_entitlement: 24,
        accrual_frequency: 'Monthly',
        accrual_amount_per_cycle: 2,
        accrual_start: 'JoiningDate',
        proration_method: 'CalendarDays',
        allow_carry_forward: true,
        max_carry_forward_days: 10,
        carry_forward_expiry_months: 3,
        allow_encashment: true,
        max_encashment_days_per_year: 10,
        min_balance_for_encashment: 15,
        encashment_calculation_basis: 'BasicSalary',
        allow_half_day: false,
        allow_hourly: false,
        max_hourly_per_month: 0,
        allow_negative_balance: false,
        max_negative_balance: 0,
        advance_notice_days: 3,
        allow_backdated: false,
        max_backdated_days: 0,
        attachment_required: false,
        sandwich_rule_enabled: true,
        exclude_holidays: true,
        exclude_weekly_offs: true,
      },
      {
        leave_type_id: 'lt-cl',
        annual_entitlement: 12,
        accrual_frequency: 'Quarterly',
        accrual_amount_per_cycle: 3,
        accrual_start: 'JoiningDate',
        proration_method: 'CalendarDays',
        allow_carry_forward: false,
        max_carry_forward_days: 0,
        carry_forward_expiry_months: 0,
        allow_encashment: false,
        max_encashment_days_per_year: 0,
        min_balance_for_encashment: 0,
        encashment_calculation_basis: 'BasicSalary',
        allow_half_day: true,
        allow_hourly: false,
        max_hourly_per_month: 0,
        allow_negative_balance: false,
        max_negative_balance: 0,
        advance_notice_days: 0,
        allow_backdated: true,
        max_backdated_days: 2,
        attachment_required: false,
        sandwich_rule_enabled: false,
        exclude_holidays: true,
        exclude_weekly_offs: true,
      },
      {
        leave_type_id: 'lt-sl',
        annual_entitlement: 12,
        accrual_frequency: 'Yearly',
        accrual_amount_per_cycle: 12,
        accrual_start: 'CalendarYearStart',
        proration_method: 'CompletedMonths',
        allow_carry_forward: true,
        max_carry_forward_days: 6,
        carry_forward_expiry_months: 12,
        allow_encashment: false,
        max_encashment_days_per_year: 0,
        min_balance_for_encashment: 0,
        encashment_calculation_basis: 'BasicSalary',
        allow_half_day: true,
        allow_hourly: true,
        max_hourly_per_month: 4,
        allow_negative_balance: true,
        max_negative_balance: 3,
        advance_notice_days: 0,
        allow_backdated: true,
        max_backdated_days: 7,
        attachment_required: true,
        sandwich_rule_enabled: false,
        exclude_holidays: true,
        exclude_weekly_offs: true,
      },
    ],
  },
  {
    id: 'pol-mfg-01',
    code: 'POL-PLANT-OPS-2026',
    name: 'Plant & Operations Shift Policy',
    description: 'Custom leave parameters for manufacturing and shift workers.',
    company_id: 'comp-01',
    applicable_groups: ['Operations'],
    employment_types: ['Full Time', 'Contract'],
    departments: ['Operations', 'Manufacturing'],
    locations: ['All'],
    grades: ['All'],
    effective_from: '2026-01-01',
    status: 'Active',
    priority: 2,
    precedence_rule: 'MostSpecificWins',
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    rules: [
      {
        leave_type_id: 'lt-pl',
        annual_entitlement: 18,
        accrual_frequency: 'Monthly',
        accrual_amount_per_cycle: 1.5,
        accrual_start: 'JoiningDate',
        proration_method: 'CalendarDays',
        allow_carry_forward: true,
        max_carry_forward_days: 8,
        carry_forward_expiry_months: 3,
        allow_encashment: true,
        max_encashment_days_per_year: 8,
        min_balance_for_encashment: 10,
        encashment_calculation_basis: 'BasicSalary',
        allow_half_day: false,
        allow_hourly: false,
        max_hourly_per_month: 0,
        allow_negative_balance: false,
        max_negative_balance: 0,
        advance_notice_days: 7,
        allow_backdated: false,
        max_backdated_days: 0,
        attachment_required: false,
        sandwich_rule_enabled: true,
        exclude_holidays: true,
        exclude_weekly_offs: true,
      },
    ],
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

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.from('leave_types').upsert({
          id: type.id,
          code: type.code,
          name: type.name,
          description: type.description,
          category: type.category,
          is_paid: type.is_paid,
          is_active: type.is_active,
          gender_applicability: type.gender_applicability,
          employment_types: type.employment_types,
          min_service_days: type.min_service_days,
          max_days_per_request: type.max_days_per_request,
          min_days_per_request: type.min_days_per_request,
          allow_half_day: type.allow_half_day,
          allow_hourly: type.allow_hourly,
          allow_negative_balance: type.allow_negative_balance,
          max_negative_balance: type.max_negative_balance ?? (type as any).max_negative_balance_days ?? 0,
          allow_carry_forward: type.allow_carry_forward,
          max_carry_forward_days: type.max_carry_forward_days,
          carry_forward_expiry_months: type.carry_forward_expiry_months,
          allow_encashment: type.allow_encashment,
          max_encashment_days_per_year: type.max_encashment_days_per_year,
          min_balance_for_encashment: type.min_balance_for_encashment,
          encashment_calculation_basis: type.encashment_calculation_basis,
          attachment_required: type.attachment_required,
          attachment_mandatory_days_threshold: type.attachment_mandatory_days_threshold,
          approval_required: type.approval_required,
          allow_backdated: type.allow_backdated,
          max_backdated_days: type.max_backdated_days,
          allow_future: type.allow_future,
          allow_cancellation: type.allow_cancellation,
          allow_modification: type.allow_modification,
          converts_to_lop_if_exhausted: type.converts_to_lop_if_exhausted,
          applicable_locations: type.applicable_locations,
          applicable_departments: type.applicable_departments,
          applicable_employee_groups: type.applicable_employee_groups,
          updated_at: new Date().toISOString(),
        })
      ).catch((e: any) => console.warn('[Supabase Leave] upsert leave_type failed:', e));
    }

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: 'HR Admin',
      action: idx >= 0 ? 'UPDATE_LEAVE_TYPE' : 'CREATE_LEAVE_TYPE',
      entity_type: 'LeaveType',
      entity_id: type.id,
      new_value: `Leave Type ${type.name} (${type.code}) saved.`,
    });

    hrEventBus.publish('leave.type_updated', type, { actorId: 'admin' });

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.from('realtime_outbox').insert({
          tenant_id: 'org-joy-01',
          organization_id: 'org-joy-01',
          entity_type: 'leave_types',
          entity_id: type.id,
          event_type: 'leave.type_updated',
          actor_id: 'admin',
          payload: type,
        })
      ).catch(() => {});
    }

    return type;
  },

  deleteLeaveType: (typeId: string): { success: boolean; deactivated?: boolean; message: string } => {
    const types = leaveApi.getLeaveTypes();
    const target = types.find(t => t.id === typeId);
    if (!target) throw new Error('Leave type not found');

    const ledger = leaveApi.getLedger();
    const requests = leaveApi.getLeaveRequests();
    const hasTransactions = ledger.some(l => l.leave_type_id === typeId) || requests.some(r => r.leave_type_id === typeId);

    if (hasTransactions) {
      // Soft deactivation to preserve financial/audit integrity
      target.is_active = false;
      target.updated_at = new Date().toISOString();
      setStored(STORAGE_KEYS.LEAVE_TYPES, types);

      if (isSupabaseEnabled) {
        Promise.resolve(
          supabase.from('leave_types').update({ is_active: false, updated_at: target.updated_at }).eq('id', typeId)
        ).catch((e: any) => console.warn('[Supabase Leave] soft delete leave_type failed:', e));
      }

      leaveApi.addAuditLog({
        actor_id: 'admin',
        actor_name: 'HR Admin',
        action: 'DEACTIVATE_LEAVE_TYPE',
        entity_type: 'LeaveType',
        entity_id: target.id,
        new_value: `Deactivated ${target.name} due to existing transaction history.`,
      });

      hrEventBus.publish('leave.type_updated', target, { actorId: 'admin' });
      return { success: true, deactivated: true, message: 'This leave type has historical ledger transactions. It has been deactivated instead of permanently deleted to preserve audit integrity.' };
    }

    const filtered = types.filter(t => t.id !== typeId);
    setStored(STORAGE_KEYS.LEAVE_TYPES, filtered);

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.from('leave_types').delete().eq('id', typeId)
      ).catch((e: any) => console.warn('[Supabase Leave] delete leave_type failed:', e));

      Promise.resolve(
        supabase.from('realtime_outbox').insert({
          tenant_id: 'org-joy-01',
          organization_id: 'org-joy-01',
          entity_type: 'leave_types',
          entity_id: typeId,
          event_type: 'leave.type_deleted',
          actor_id: 'admin',
          payload: { id: typeId, code: target.code, name: target.name },
        })
      ).catch(() => {});
    }

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: 'HR Admin',
      action: 'DELETE_LEAVE_TYPE',
      entity_type: 'LeaveType',
      entity_id: typeId,
      new_value: `Deleted ${target.name}.`,
    });

    hrEventBus.publish('leave.type_deleted', { id: typeId, code: target.code, name: target.name }, { actorId: 'admin' });
    return { success: true, deactivated: false, message: 'Leave type permanently deleted.' };
  },

  // --- Leave Policies ---
  getLeavePolicies: (): LeavePolicy[] => {
    return getStored(STORAGE_KEYS.LEAVE_POLICIES, initialLeavePolicies);
  },

  saveLeavePolicy: (policy: LeavePolicy): LeavePolicy => {
    const policies = leaveApi.getLeavePolicies();
    const idx = policies.findIndex(p => p.id === policy.id);
    if (idx >= 0) {
      policies[idx] = { ...policy, updated_at: new Date().toISOString(), version: (policy.version || 1) + 1 };
    } else {
      policies.push({ ...policy, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), version: 1 });
    }
    setStored(STORAGE_KEYS.LEAVE_POLICIES, policies);

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.from('leave_policies').upsert({
          id: policy.id,
          code: policy.code,
          name: policy.name,
          description: policy.description,
          applicable_groups: policy.applicable_groups,
          employment_types: policy.employment_types,
          departments: policy.departments,
          locations: policy.locations,
          grades: policy.grades,
          designations: policy.designations,
          effective_from: policy.effective_from,
          effective_to: policy.effective_to,
          status: policy.status,
          priority: policy.priority,
          precedence_rule: policy.precedence_rule,
          rules: policy.rules,
          version: policy.version,
          updated_at: new Date().toISOString(),
        })
      ).catch((e: any) => console.warn('[Supabase Leave] upsert leave_policy failed:', e));
    }

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: 'HR Admin',
      action: idx >= 0 ? 'UPDATE_LEAVE_POLICY' : 'CREATE_LEAVE_POLICY',
      entity_type: 'LeavePolicy',
      entity_id: policy.id,
      new_value: `Leave Policy ${policy.name} (${policy.code}) updated.`,
    });

    return policy;
  },

  deleteLeavePolicy: (policyId: string): void => {
    const policies = leaveApi.getLeavePolicies();
    const filtered = policies.filter(p => p.id !== policyId);
    setStored(STORAGE_KEYS.LEAVE_POLICIES, filtered);

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: 'HR Admin',
      action: 'DELETE_LEAVE_POLICY',
      entity_type: 'LeavePolicy',
      entity_id: policyId,
    });
  },

  detectPolicyConflicts: (): { employee_id: string; employee_name: string; matching_policies: string[]; winning_policy: string; rule: string }[] => {
    // Audit active policies against employee criteria
    const policies = leaveApi.getLeavePolicies().filter(p => p.status === 'Active');
    const conflicts: { employee_id: string; employee_name: string; matching_policies: string[]; winning_policy: string; rule: string }[] = [];

    // Check actual employee population or empty
    const sampleEmployees: any[] = [];

    sampleEmployees.forEach(emp => {
      const matches = policies.filter(pol => {
        const deptMatch = pol.departments.includes('All') || pol.departments.includes(emp.dept);
        const typeMatch = pol.employment_types.includes('All') || pol.employment_types.includes(emp.employment_type);
        return deptMatch && typeMatch;
      });

      if (matches.length > 1) {
        // Sort by priority ascending (1 is highest)
        const sorted = [...matches].sort((a, b) => a.priority - b.priority);
        conflicts.push({
          employee_id: emp.id,
          employee_name: emp.name,
          matching_policies: matches.map(m => m.name),
          winning_policy: sorted[0].name,
          rule: `Resolved via Priority #${sorted[0].priority} (${sorted[0].precedence_rule || 'HighPriorityWins'})`,
        });
      }
    });

    return conflicts;
  },

  // --- Holiday Calendars ---
  getHolidayCalendars: (): HolidayCalendar[] => {
    return getStored(STORAGE_KEYS.HOLIDAY_CALENDARS, initialHolidayCalendars);
  },

  saveHolidayCalendar: (calendar: HolidayCalendar): HolidayCalendar => {
    const cals = leaveApi.getHolidayCalendars();
    const idx = cals.findIndex(c => c.id === calendar.id);
    const updatedCal: HolidayCalendar = {
      ...calendar,
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) {
      cals[idx] = updatedCal;
    } else {
      cals.push(updatedCal);
    }
    setStored(STORAGE_KEYS.HOLIDAY_CALENDARS, cals);

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: 'HR Admin',
      action: idx >= 0 ? 'UPDATE_HOLIDAY_CALENDAR' : 'CREATE_HOLIDAY_CALENDAR',
      entity_type: 'HolidayCalendar',
      entity_id: calendar.id,
      new_value: `Saved holiday calendar: ${calendar.name} (${calendar.year}) with ${calendar.holidays?.length || 0} holidays`,
    });

    hrEventBus.publish('leave.holiday_updated', { calendar: updatedCal });
    hrEventBus.publish('leave.calendar_updated', { calendarId: updatedCal.id });
    return updatedCal;
  },

  deleteHolidayCalendar: (calendarId: string): { success: boolean; message: string } => {
    const cals = leaveApi.getHolidayCalendars();
    const target = cals.find(c => c.id === calendarId);
    if (!target) throw new Error('Holiday calendar not found');

    const filtered = cals.filter(c => c.id !== calendarId);
    setStored(STORAGE_KEYS.HOLIDAY_CALENDARS, filtered);

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: 'HR Admin',
      action: 'DELETE_HOLIDAY_CALENDAR',
      entity_type: 'HolidayCalendar',
      entity_id: calendarId,
      new_value: `Deleted holiday calendar: ${target.name} (${target.year})`,
    });

    hrEventBus.publish('leave.holiday_updated', { deletedCalendarId: calendarId });
    hrEventBus.publish('leave.calendar_updated', { calendarId });
    return { success: true, message: `Holiday calendar "${target.name}" deleted.` };
  },

  addHoliday: (calendarId: string, holiday: Omit<Holiday, 'id'>): Holiday => {
    const cals = leaveApi.getHolidayCalendars();
    const calIdx = cals.findIndex(c => c.id === calendarId);
    if (calIdx < 0) throw new Error('Holiday calendar not found');

    const newHoliday: Holiday = {
      ...holiday,
      id: `hol-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      calendar_id: calendarId,
    };

    const currentHolidays = cals[calIdx].holidays || [];
    const updatedHolidays = [...currentHolidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date));
    cals[calIdx] = {
      ...cals[calIdx],
      holidays: updatedHolidays,
      updated_at: new Date().toISOString(),
    };

    setStored(STORAGE_KEYS.HOLIDAY_CALENDARS, cals);

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: 'HR Admin',
      action: 'ADD_HOLIDAY',
      entity_type: 'HolidayCalendar',
      entity_id: calendarId,
      new_value: `Added holiday "${newHoliday.name}" on ${newHoliday.date} (${newHoliday.type}) to ${cals[calIdx].name}`,
    });

    hrEventBus.publish('leave.holiday_updated', { calendarId, holiday: newHoliday });
    hrEventBus.publish('leave.calendar_updated', { calendarId });
    return newHoliday;
  },

  updateHoliday: (calendarId: string, holiday: Holiday): Holiday => {
    const cals = leaveApi.getHolidayCalendars();
    const calIdx = cals.findIndex(c => c.id === calendarId);
    if (calIdx < 0) throw new Error('Holiday calendar not found');

    const currentHolidays = cals[calIdx].holidays || [];
    const hIdx = currentHolidays.findIndex(h => h.id === holiday.id);
    if (hIdx < 0) throw new Error('Holiday not found');

    currentHolidays[hIdx] = holiday;
    currentHolidays.sort((a, b) => a.date.localeCompare(b.date));

    cals[calIdx] = {
      ...cals[calIdx],
      holidays: currentHolidays,
      updated_at: new Date().toISOString(),
    };

    setStored(STORAGE_KEYS.HOLIDAY_CALENDARS, cals);

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: 'HR Admin',
      action: 'UPDATE_HOLIDAY',
      entity_type: 'HolidayCalendar',
      entity_id: calendarId,
      new_value: `Updated holiday "${holiday.name}" on ${holiday.date}`,
    });

    hrEventBus.publish('leave.holiday_updated', { calendarId, holiday });
    hrEventBus.publish('leave.calendar_updated', { calendarId });
    return holiday;
  },

  deleteHoliday: (calendarId: string, holidayId: string): void => {
    const cals = leaveApi.getHolidayCalendars();
    const calIdx = cals.findIndex(c => c.id === calendarId);
    if (calIdx < 0) throw new Error('Holiday calendar not found');

    const currentHolidays = cals[calIdx].holidays || [];
    const targetH = currentHolidays.find(h => h.id === holidayId);
    const updatedHolidays = currentHolidays.filter(h => h.id !== holidayId);

    cals[calIdx] = {
      ...cals[calIdx],
      holidays: updatedHolidays,
      updated_at: new Date().toISOString(),
    };

    setStored(STORAGE_KEYS.HOLIDAY_CALENDARS, cals);

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: 'HR Admin',
      action: 'DELETE_HOLIDAY',
      entity_type: 'HolidayCalendar',
      entity_id: calendarId,
      new_value: `Removed holiday "${targetH?.name || holidayId}" from ${cals[calIdx].name}`,
    });

    hrEventBus.publish('leave.holiday_updated', { calendarId, deletedHolidayId: holidayId });
    hrEventBus.publish('leave.calendar_updated', { calendarId });
  },

  duplicateHolidayCalendar: (sourceCalId: string, targetYear: number, newName: string): HolidayCalendar => {
    const cals = leaveApi.getHolidayCalendars();
    const source = cals.find(c => c.id === sourceCalId);
    if (!source) throw new Error('Source holiday calendar not found');

    const yearDiff = targetYear - source.year;
    const newId = `hol-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const clonedHolidays: Holiday[] = (source.holidays || []).map((h, i) => {
      const parts = h.date.split('-');
      const month = parts[1];
      const day = parts[2];
      const newDate = `${targetYear}-${month}-${day}`;
      const dt = new Date(`${newDate}T00:00:00`);
      const dayOfWeek = isNaN(dt.getTime()) ? h.day_of_week : dt.toLocaleDateString('en-US', { weekday: 'short' });

      return {
        ...h,
        id: `${newId}-h${i + 1}`,
        calendar_id: newId,
        date: newDate,
        day_of_week: dayOfWeek,
      };
    });

    const newCalendar: HolidayCalendar = {
      ...source,
      id: newId,
      code: `${source.code.replace(/\d{4}$/, '')}${targetYear}`,
      name: newName || `${source.name.replace(/\d{4}$/, '')} ${targetYear}`,
      year: targetYear,
      holidays: clonedHolidays,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    cals.push(newCalendar);
    setStored(STORAGE_KEYS.HOLIDAY_CALENDARS, cals);

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: 'HR Admin',
      action: 'DUPLICATE_HOLIDAY_CALENDAR',
      entity_type: 'HolidayCalendar',
      entity_id: newId,
      new_value: `Cloned calendar "${source.name}" (${source.year}) into "${newCalendar.name}" (${targetYear}) with ${clonedHolidays.length} holidays.`,
    });

    hrEventBus.publish('leave.holiday_updated', { calendar: newCalendar });
    hrEventBus.publish('leave.calendar_updated', { calendarId: newId });
    return newCalendar;
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

    hrEventBus.publish('leave.submitted', newReq, { actorId: newReq.employee_id });

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
      (async () => {
        try {
          // Ensure request exists in Supabase before approving
          await supabase
            .from('leave_requests')
            .upsert({
              id: req.id,
              organization_id: 'org-joy-01',
              company_id: req.company_id || 'comp-01',
              employee_id: req.employee_id,
              request_code: req.request_code,
              employee_name: req.employee_name,
              department_name: req.department_name,
              leave_type_id: req.leave_type_id,
              leave_type_name: req.leave_type_name,
              leave_type_code: req.leave_type_code || 'CL',
              from_date: req.from_date,
              to_date: req.to_date,
              total_calendar_days: req.total_calendar_days || 1,
              working_days: req.working_days || 1,
              leave_days_deducted: req.leave_days_deducted || 1,
              reason: req.reason || 'Leave request',
              manager_id: req.manager_id,
              manager_name: req.manager_name,
              status: 'Pending',
              submitted_at: req.submitted_at || new Date().toISOString(),
              created_at: req.created_at || new Date().toISOString(),
            }, { onConflict: 'id', ignoreDuplicates: true });

          const { error: rpcErr } = await supabase.rpc('fn_approve_leave_request', {
            p_request_id: req.id,
            p_approver_id: 'hr-admin',
            p_approver_name: approverName,
            p_comments: comments || null,
          });

          if (rpcErr) {
            console.warn('[Supabase Leave] RPC approve notice:', rpcErr);
            await supabase
              .from('leave_requests')
              .update({
                status: 'Approved',
                approved_at: req.approved_at,
                current_approver_name: approverName,
              })
              .eq('id', req.id);
          }
        } catch (e: any) {
          console.warn('[Supabase Leave] approve sync failed:', e);
        }
      })();
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

      if (Array.isArray(req.daily_breakdown) && req.daily_breakdown.length > 0) {
        req.daily_breakdown.forEach((day: any) => {
          if (day.is_working_day) {
            attLogs.unshift({
              id: `att-leave-${Date.now()}-${day.date}`,
              employee_id: req.employee_id,
              employee_name: req.employee_name,
              department: req.department_name,
              date: day.date,
              status: day.is_half_day ? 'Half Day' : 'On Leave',
              is_approved_leave: true,
              leave_type_code: req.leave_type_code || 'CL',
              created_at: new Date().toISOString(),
            });
          }
        });
      }
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

    hrEventBus.publish('leave.approved', req, { actorId: approverName });

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

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.rpc('fn_reject_leave_request', {
          p_request_id: req.id,
          p_rejector_id: 'hr-admin',
          p_rejector_name: rejectorName,
          p_rejection_reason: reason,
        })
      ).catch((e: any) => {
        console.warn('[Supabase Leave] RPC reject failed, fallback to direct update:', e);
        supabase
          .from('leave_requests')
          .update({
            status: 'Rejected',
            rejection_reason: reason,
          })
          .eq('id', req.id);
      });
    }

    leaveApi.addAuditLog({
      actor_id: 'rejector',
      actor_name: rejectorName,
      action: 'REJECT_LEAVE_REQUEST',
      entity_type: 'LeaveRequest',
      entity_id: req.id,
      new_value: `Rejected ${req.request_code}. Reason: ${reason}`,
    });

    hrEventBus.publish('leave.rejected', req, { actorId: rejectorName });

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

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.rpc('fn_cancel_leave_request', {
          p_request_id: req.id,
          p_actor_id: 'hr-admin',
          p_actor_name: actorName,
          p_cancellation_reason: reason,
        })
      ).catch((e: any) => {
        console.warn('[Supabase Leave] RPC cancel failed, fallback to direct update:', e);
        supabase
          .from('leave_requests')
          .update({
            status: 'Cancelled',
            rejection_reason: reason,
          })
          .eq('id', req.id);
      });
    }

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
        transaction_type: 'Adjustment',
        amount: req.leave_days_deducted,
        balance_after: prevBalance + req.leave_days_deducted,
        reference_id: req.id,
        actor_id: 'system',
        actor_name: actorName,
        reason: `Reversal for cancelled leave ${req.request_code}: ${reason}`,
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
      new_value: `Cancelled ${req.request_code}. Reason: ${reason}`,
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

  saveEntitlement: (ent: LeaveEntitlement): LeaveEntitlement => {
    const entitlements = leaveApi.getEntitlements();
    const idx = entitlements.findIndex(e => e.id === ent.id);
    if (idx >= 0) {
      entitlements[idx] = { ...ent, updated_at: new Date().toISOString() };
    } else {
      entitlements.push({ ...ent, updated_at: new Date().toISOString() });
    }
    setStored(STORAGE_KEYS.ENTITLEMENTS, entitlements);
    return ent;
  },

  // --- Compensatory Off (Comp-Off) ---
  getCompOffGrants: (): CompOffGrant[] => {
    return getStored(STORAGE_KEYS.COMP_OFFS, []);
  },

  claimCompOffCredit: (grant: Omit<CompOffGrant, 'id' | 'status' | 'comp_off_days_earned'>): CompOffGrant => {
    const grants = leaveApi.getCompOffGrants();
    const daysEarned = (grant.hours_worked && grant.hours_worked >= 8) || grant.credit_days === 1.0 ? 1 : 0.5;
    const newGrant: CompOffGrant = {
      ...grant,
      id: `co-${Date.now()}`,
      comp_off_days_earned: daysEarned,
      credit_days: daysEarned,
      status: 'PendingApproval',
    };
    grants.unshift(newGrant);
    setStored(STORAGE_KEYS.COMP_OFFS, grants);

    leaveApi.addAuditLog({
      actor_id: grant.employee_id,
      actor_name: grant.employee_name,
      action: 'CLAIM_COMP_OFF',
      entity_type: 'LeaveRequest',
      entity_id: newGrant.id,
      new_value: `Claimed ${daysEarned} day(s) for working on ${grant.earned_date || grant.worked_date}`,
    });

    return newGrant;
  },

  approveCompOffGrant: (grantId: string, approverName: string): CompOffGrant => {
    const grants = leaveApi.getCompOffGrants();
    const target = grants.find(g => g.id === grantId);
    if (!target) throw new Error('Grant not found');
    target.status = 'Approved';
    target.approved_by_name = approverName;
    setStored(STORAGE_KEYS.COMP_OFFS, grants);

    const daysCredit = target.comp_off_days_earned || target.credit_days || 1.0;

    // Credit to ledger
    const ledger = leaveApi.getLedger();
    const prevBal = ledger.filter(l => l.employee_id === target.employee_id && l.leave_type_id === 'lt-comp')
      .reduce((acc, curr) => acc + curr.amount, 0);

    ledger.unshift({
      id: `led-${Date.now()}`,
      employee_id: target.employee_id,
      employee_name: target.employee_name,
      leave_type_id: 'lt-comp',
      leave_type_name: 'Compensatory Off',
      date: new Date().toISOString().split('T')[0],
      transaction_type: 'Grant',
      amount: daysCredit,
      balance_after: prevBal + daysCredit,
      reference_id: target.id,
      actor_id: 'approver',
      actor_name: approverName,
      reason: `Comp-off approved: ${target.reason}`,
      created_at: new Date().toISOString(),
    });
    setStored(STORAGE_KEYS.LEDGER, ledger);

    // Also update entitlement balance for lt-comp
    const entitlements = leaveApi.getEntitlements();
    const ent = entitlements.find(e => e.employee_id === target.employee_id && e.leave_type_id === 'lt-comp');
    if (ent) {
      ent.accrued = (ent.accrued || 0) + daysCredit;
      ent.available_balance = (ent.available_balance || 0) + daysCredit;
      setStored(STORAGE_KEYS.ENTITLEMENTS, entitlements);
    }

    leaveApi.addAuditLog({
      actor_id: 'approver',
      actor_name: approverName,
      action: 'APPROVE_COMP_OFF',
      entity_type: 'LeaveRequest',
      entity_id: target.id,
      new_value: `Approved ${daysCredit} comp-off day(s) for ${target.employee_name}`,
    });

    return target;
  },

  approveCompOff: (grantId: string, approverName: string): CompOffGrant => {
    return leaveApi.approveCompOffGrant(grantId, approverName);
  },

  // --- Leave Encashment ---
  getEncashments: (): LeaveEncashmentRequest[] => {
    return getStored(STORAGE_KEYS.ENCASHMENTS, []);
  },

  submitEncashmentRequest: (req: Omit<LeaveEncashmentRequest, 'id' | 'request_code' | 'submitted_at' | 'status'>): LeaveEncashmentRequest => {
    const encashments = leaveApi.getEncashments();
    const requestedDays = req.days_to_encash || req.requested_days || 5;
    const newEnc: LeaveEncashmentRequest = {
      ...req,
      id: `enc-${Date.now()}`,
      request_code: `ENC-2026-${Math.floor(100 + Math.random() * 900)}`,
      requested_days: requestedDays,
      days_to_encash: requestedDays,
      status: 'Submitted',
      payroll_status: 'Pending',
      submitted_at: new Date().toISOString(),
    };
    encashments.unshift(newEnc);
    setStored(STORAGE_KEYS.ENCASHMENTS, encashments);

    leaveApi.addAuditLog({
      actor_id: req.employee_id,
      actor_name: req.employee_name,
      action: 'SUBMIT_ENCASHMENT',
      entity_type: 'Encashment',
      entity_id: newEnc.id,
      new_value: `Requested encashment of ${requestedDays} days (${req.leave_type_name})`,
    });

    return newEnc;
  },

  approveEncashmentRequest: (encId: string, approverName: string): LeaveEncashmentRequest => {
    const encashments = leaveApi.getEncashments();
    const target = encashments.find(e => e.id === encId);
    if (!target) throw new Error('Encashment request not found');
    target.status = 'Approved';
    target.payroll_status = 'Processed';
    target.approved_by_name = approverName;
    setStored(STORAGE_KEYS.ENCASHMENTS, encashments);

    const encashDays = target.days_to_encash || target.requested_days || 0;

    // Post encashment deduction to ledger
    const ledger = leaveApi.getLedger();
    const prevBal = ledger.filter(l => l.employee_id === target.employee_id && l.leave_type_id === target.leave_type_id)
      .reduce((acc, curr) => acc + curr.amount, 0);

    ledger.unshift({
      id: `led-${Date.now()}`,
      employee_id: target.employee_id,
      employee_name: target.employee_name,
      leave_type_id: target.leave_type_id,
      leave_type_name: target.leave_type_name,
      date: new Date().toISOString().split('T')[0],
      transaction_type: 'Encashment',
      amount: -encashDays,
      balance_after: prevBal - encashDays,
      reference_id: target.id,
      actor_id: 'approver',
      actor_name: approverName,
      reason: `Leave encashment approved (${target.request_code || target.id}) for ${target.payroll_period || 'Payroll'}`,
      created_at: new Date().toISOString(),
    });
    setStored(STORAGE_KEYS.LEDGER, ledger);

    // Also update entitlement balance
    const entitlements = leaveApi.getEntitlements();
    const ent = entitlements.find(e => e.employee_id === target.employee_id && e.leave_type_id === target.leave_type_id);
    if (ent) {
      ent.encashed = (ent.encashed || 0) + encashDays;
      ent.available_balance = Math.max(0, (ent.available_balance || 0) - encashDays);
      setStored(STORAGE_KEYS.ENTITLEMENTS, entitlements);
    }

    leaveApi.addAuditLog({
      actor_id: 'approver',
      actor_name: approverName,
      action: 'APPROVE_ENCASHMENT',
      entity_type: 'Encashment',
      entity_id: target.id,
      new_value: `Approved ${encashDays} days encashment for ${target.employee_name}`,
    });

    return target;
  },

  approveEncashment: (encId: string, approverName: string): LeaveEncashmentRequest => {
    return leaveApi.approveEncashmentRequest(encId, approverName);
  },

  // --- Leave Adjustments ---
  getAdjustments: (): LeaveAdjustment[] => {
    return getStored(STORAGE_KEYS.ADJUSTMENTS, []);
  },

  createAdjustment: (adj: Omit<LeaveAdjustment, 'id' | 'created_at'>): LeaveAdjustment => {
    const adjustments = leaveApi.getAdjustments();
    const actorName = adj.actor_name || adj.created_by_name || 'HR Admin';
    const effectiveDate = adj.effective_date || new Date().toISOString().split('T')[0];
    const refNo = adj.reference_no || `ADJ-${Date.now()}`;
    const status = adj.status || 'Approved';

    const newAdj: LeaveAdjustment = {
      ...adj,
      id: `adj-${Date.now()}`,
      actor_name: actorName,
      created_by_name: actorName,
      effective_date: effectiveDate,
      reference_no: refNo,
      status: status,
      created_at: new Date().toISOString(),
    };
    adjustments.unshift(newAdj);
    setStored(STORAGE_KEYS.ADJUSTMENTS, adjustments);

    // If immediate approved, reflect directly in ledger & entitlements
    if (newAdj.status === 'Approved') {
      const ledger = leaveApi.getLedger();
      const prevBal = ledger.filter(l => l.employee_id === adj.employee_id && l.leave_type_id === adj.leave_type_id)
        .reduce((acc, curr) => acc + curr.amount, 0);

      const isDeduct = adj.adjustment_type === 'Deduct' || adj.adjustment_type === 'Deduction';
      const netAmount = Math.abs(adj.amount) * (isDeduct ? -1 : 1);

      ledger.unshift({
        id: `led-${Date.now()}`,
        employee_id: adj.employee_id,
        employee_name: adj.employee_name,
        leave_type_id: adj.leave_type_id,
        leave_type_name: adj.leave_type_name,
        date: effectiveDate,
        transaction_type: 'Adjustment',
        amount: netAmount,
        balance_after: prevBal + netAmount,
        reference_id: refNo,
        actor_id: 'admin',
        actor_name: actorName,
        reason: `HR Adjustment: ${adj.reason}`,
        created_at: new Date().toISOString(),
      });
      setStored(STORAGE_KEYS.LEDGER, ledger);

      // Update entitlement balance
      const entitlements = leaveApi.getEntitlements();
      const ent = entitlements.find(e => e.employee_id === adj.employee_id && e.leave_type_id === adj.leave_type_id);
      if (ent) {
        ent.adjustments = (ent.adjustments || 0) + netAmount;
        ent.available_balance = (ent.available_balance || 0) + netAmount;
        setStored(STORAGE_KEYS.ENTITLEMENTS, entitlements);
      }
    }

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: actorName,
      action: 'CREATE_LEAVE_ADJUSTMENT',
      entity_type: 'LeaveAdjustment',
      entity_id: newAdj.id,
      new_value: `${adj.adjustment_type} ${adj.amount} days for ${adj.employee_name}. Reason: ${adj.reason}`,
    });

    return newAdj;
  },

  // --- Accrual Engine Logs & Batch Processing ---
  getAccrualLogs: (): AccrualExecutionLog[] => {
    return getStored(STORAGE_KEYS.ACCRUAL_LOGS, []);
  },

  runMonthlyAccrualJob: (period: string): AccrualExecutionLog => {
    const logs = leaveApi.getAccrualLogs();
    const existing = logs.find(l => l.period === period && l.status === 'Completed');
    if (existing) {
      return existing; // Idempotent check
    }

    const newLog: AccrualExecutionLog = {
      id: `acc-${Date.now()}`,
      period: period,
      run_timestamp: new Date().toISOString(),
      employees_processed: 0,
      total_leave_days_credited: 0,
      status: 'Completed',
    };

    logs.unshift(newLog);
    setStored(STORAGE_KEYS.ACCRUAL_LOGS, logs);

    leaveApi.addAuditLog({
      actor_id: 'system',
      actor_name: 'Accrual Scheduler Engine',
      action: 'RUN_ACCRUAL_BATCH',
      entity_type: 'AccrualBatch',
      entity_id: newLog.id,
      new_value: `Executed monthly accrual for ${period}. Credited ${newLog.total_leave_days_credited} days across ${newLog.employees_processed} employees.`,
    });

    return newLog;
  },

  reverseAccrualJob: (logId: string, actorName: string): AccrualExecutionLog => {
    const logs = leaveApi.getAccrualLogs();
    const target = logs.find(l => l.id === logId);
    if (!target) throw new Error('Accrual log not found');
    target.status = 'Reversed';
    target.reversed_at = new Date().toISOString();
    target.reversed_by = actorName;
    setStored(STORAGE_KEYS.ACCRUAL_LOGS, logs);

    leaveApi.addAuditLog({
      actor_id: 'admin',
      actor_name: actorName,
      action: 'REVERSE_ACCRUAL_BATCH',
      entity_type: 'AccrualBatch',
      entity_id: target.id,
      new_value: `Reversed accrual batch ${target.period} (${target.id})`,
    });

    return target;
  },

  // --- Leave Exceptions ---
  getExceptions: (): LeaveException[] => {
    return getStored(STORAGE_KEYS.EXCEPTIONS, []);
  },

  resolveException: (exceptionId: string, resolvedBy: string, resolutionNotes?: string): void => {
    const exceptions = leaveApi.getExceptions();
    const target = exceptions.find(e => e.id === exceptionId);
    if (target) {
      target.status = 'Resolved';
      target.resolved_by = resolvedBy;
      target.resolved_at = new Date().toISOString();
      if (resolutionNotes) {
        target.resolution_notes = resolutionNotes;
      }
      setStored(STORAGE_KEYS.EXCEPTIONS, exceptions);

      leaveApi.addAuditLog({
        actor_id: 'admin',
        actor_name: resolvedBy,
        action: 'RESOLVE_LEAVE_EXCEPTION',
        entity_type: 'LeaveRequest',
        entity_id: exceptionId,
        new_value: `Resolved exception #${exceptionId} (${target.title})${resolutionNotes ? `: ${resolutionNotes}` : ''}`,
      });
    }
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

  // --- Realtime Supabase Sync Engine ---
  syncWithSupabase: async (): Promise<void> => {
    if (!isSupabaseEnabled) return;
    try {
      // 1. Fetch Leave Requests
      const { data: remoteRequests, error: reqErr } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!reqErr && Array.isArray(remoteRequests)) {
        setStored(STORAGE_KEYS.REQUESTS, remoteRequests);
      }

      // 2. Fetch Leave Entitlements
      const { data: remoteEntitlements, error: entErr } = await supabase
        .from('leave_entitlements')
        .select('*');

      if (!entErr && Array.isArray(remoteEntitlements) && remoteEntitlements.length > 0) {
        setStored(STORAGE_KEYS.ENTITLEMENTS, remoteEntitlements);
      }

      // 3. Fetch Leave Types
      const { data: remoteTypes, error: typeErr } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');

      if (!typeErr && Array.isArray(remoteTypes) && remoteTypes.length > 0) {
        setStored(STORAGE_KEYS.LEAVE_TYPES, remoteTypes);
      }

      // 4. Fetch Ledger
      const { data: remoteLedger, error: ledErr } = await supabase
        .from('leave_ledger_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!ledErr && Array.isArray(remoteLedger) && remoteLedger.length > 0) {
        setStored(STORAGE_KEYS.LEDGER, remoteLedger);
      }
    } catch (e) {
      console.warn('[leaveApi] syncWithSupabase notice:', e);
    }
  },
};

// Initial background hydration from Supabase
if (typeof window !== 'undefined') {
  setTimeout(() => {
    leaveApi.syncWithSupabase().catch(() => {});
  }, 100);

  // Auto-sync when leave events occur
  hrEventBus.subscribe('leave.*', () => {
    setTimeout(() => {
      leaveApi.syncWithSupabase().catch(() => {});
    }, 200);
  });
}
