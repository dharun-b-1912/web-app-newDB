import {
  IndustryPreset,
  OvertimePolicy,
  BreakPolicy,
  OvertimeSegment,
  OvertimeRequest,
  WfhRequest,
  WorkHourRecord,
  WorkException,
  OvertimeDashboardMetrics,
  CalculationExplainability,
} from '../types/workOvertime';

const DEFAULT_OVERTIME_POLICY: OvertimePolicy = {
  id: 'pol-ot-001',
  tenant_id: 'default-tenant',
  name: 'Standard Enterprise Overtime Policy',
  version: 'v3.2',
  preset: 'CORPORATE',
  daily_threshold_minutes: 480, // 8h
  weekly_threshold_minutes: 2400, // 40h
  grace_period_minutes: 15,
  rounding_rule: '15_MIN',
  rounding_direction: 'NEAREST',
  normal_rate_multiplier: 1.5,
  weekend_multiplier: 2.0,
  holiday_multiplier: 2.0,
  night_multiplier: 1.25,
  extended_threshold_minutes: 240, // 4h
  extended_multiplier: 2.0,
  night_window_start: '22:00',
  night_window_end: '06:00',
  max_work_hours_day: 12,
  max_ot_hours_day: 4,
  max_ot_hours_week: 16,
  pre_shift_ot_allowed: false,
  approval_required: true,
  wfh_ot_allowed: true,
  comp_off_allowed: true,
};

const DEFAULT_BREAK_POLICY: BreakPolicy = {
  automatic_break_minutes: 30,
  automatic_break_after_hours: 5,
  mandatory_breaks: true,
  paid_break_allowance_minutes: 15,
  max_unpaid_break_minutes: 60,
  core_hours_start: '10:00',
  core_hours_end: '16:00',
  breaks_prohibited_in_core_hours: false,
};

const INITIAL_REQUESTS: OvertimeRequest[] = [
  {
    id: 'otr-001',
    tenant_id: 'default-tenant',
    employee_id: 'emp-001',
    employee_name: 'Arun Kumar',
    employee_code: 'JOY-0104',
    department: 'Engineering',
    designation: 'Senior Lead Engineer',
    date: '2026-08-27',
    start_time: '18:30',
    end_time: '21:30',
    expected_hours: 3,
    actual_hours: 3.25,
    eligible_hours: 3,
    approved_hours: 3,
    reason_type: 'PROJECT_RELEASE',
    custom_reason: 'Sprint 28 production cloud deployment & migration testing',
    work_type: 'PROJECT',
    project_name: 'WorkForceOS Enterprise Core',
    location: 'Coimbatore HQ',
    status: 'APPROVED',
    compensation_type: 'PAID_OVERTIME',
    approver_id: 'emp-002',
    approver_name: 'Vikramaditya Roy',
    approver_comment: 'Approved for critical production sprint release.',
    estimated_cost: 1125,
    created_at: '2026-08-26T14:30:00Z',
    updated_at: '2026-08-26T16:00:00Z',
  },
  {
    id: 'otr-002',
    tenant_id: 'default-tenant',
    employee_id: 'emp-004',
    employee_name: 'Kavitha Ramaswamy',
    employee_code: 'JOY-0219',
    department: 'Manufacturing Ops',
    designation: 'Assembly Specialist',
    date: '2026-08-27',
    start_time: '20:00',
    end_time: '23:30',
    expected_hours: 3.5,
    reason_type: 'PRODUCTION_TARGET',
    custom_reason: 'Line 2 assembly surge to fulfill Q3 export dispatch',
    work_type: 'MANUFACTURING',
    production_line: 'Line B - High Speed Assembly',
    machine_id: 'MCH-EXT-440',
    location: 'Plant 1 - Coimbatore',
    status: 'PENDING_MANAGER',
    compensation_type: 'PAID_OVERTIME',
    estimated_cost: 980,
    created_at: '2026-08-27T09:15:00Z',
    updated_at: '2026-08-27T09:15:00Z',
  },
  {
    id: 'otr-003',
    tenant_id: 'default-tenant',
    employee_id: 'emp-007',
    employee_name: 'Muthukumar S',
    employee_code: 'JOY-0312',
    department: 'Plant Maintenance',
    designation: 'Maintenance Technician',
    date: '2026-08-27',
    start_time: '22:00',
    end_time: '02:00',
    expected_hours: 4,
    reason_type: 'MACHINE_BREAKDOWN',
    custom_reason: 'Emergency hydraulic press seal replacement on Unit 4',
    work_type: 'MANUFACTURING',
    production_line: 'Line A - Press Stamping',
    machine_id: 'PRESS-HYD-09',
    location: 'Plant 1 - Coimbatore',
    status: 'PENDING_HR',
    compensation_type: 'COMP_OFF',
    approver_name: 'Senthil Nathan (Supervisor Approved)',
    estimated_cost: 1400,
    created_at: '2026-08-27T11:00:00Z',
    updated_at: '2026-08-27T12:00:00Z',
    is_emergency: true,
  },
];

const INITIAL_WFH_REQUESTS: WfhRequest[] = [
  {
    id: 'wfh-001',
    tenant_id: 'default-tenant',
    employee_id: 'emp-003',
    employee_name: 'Sneha Patel',
    department: 'UI/UX Design',
    mode: 'FULL_DAY',
    start_date: '2026-08-28',
    end_date: '2026-08-28',
    days_count: 1,
    reason: 'Deep focus day for Joy PeopleHR design system motion library',
    work_plan: 'Deliver high-fidelity motion specs and Flutter widget token review',
    location_city: 'Coimbatore',
    status: 'APPROVED',
    approver_name: 'Vikramaditya Roy',
    remaining_wfh_quota: 3,
    created_at: '2026-08-26T10:00:00Z',
  },
  {
    id: 'wfh-002',
    tenant_id: 'default-tenant',
    employee_id: 'emp-008',
    employee_name: 'Rajesh Nambiar',
    department: 'Customer Success',
    mode: 'RECURRING',
    start_date: '2026-09-01',
    end_date: '2026-09-30',
    days_count: 8,
    reason: 'Hybrid schedule: Tuesdays & Thursdays Remote',
    work_plan: 'Client onboarding calls and APAC timezone escalation triage',
    location_city: 'Bangalore',
    status: 'PENDING',
    remaining_wfh_quota: 4,
    created_at: '2026-08-27T08:30:00Z',
  },
];

const INITIAL_WORK_HOURS: WorkHourRecord[] = [
  {
    id: 'wh-001',
    employee_id: 'emp-001',
    employee_name: 'Arun Kumar',
    employee_code: 'JOY-0104',
    department: 'Engineering',
    shift_name: 'General Day (09:00 - 18:00)',
    date: '2026-08-27',
    scheduled_start: '09:00',
    scheduled_end: '18:00',
    scheduled_hours: 8,
    check_in: '08:52',
    check_out: '21:30',
    actual_presence_hours: 12.63,
    paid_break_hours: 0.25,
    unpaid_break_hours: 0.75,
    payable_work_hours: 11.88,
    deficit_hours: 0,
    eligible_ot_hours: 3.25,
    approved_ot_hours: 3.0,
    payable_ot_hours: 3.0,
    status: 'OVERTIME',
    location_type: 'OFFICE',
    estimated_cost: 1125,
    breaks: [
      {
        id: 'brk-01',
        employee_id: 'emp-001',
        type: 'MEAL',
        start_time: '13:00',
        end_time: '13:45',
        duration_minutes: 45,
        is_paid: false,
        is_excess: false,
        excess_minutes: 0,
        source: 'BIOMETRIC',
      },
      {
        id: 'brk-02',
        employee_id: 'emp-001',
        type: 'TEA',
        start_time: '16:15',
        end_time: '16:30',
        duration_minutes: 15,
        is_paid: true,
        is_excess: false,
        excess_minutes: 0,
        source: 'MANUAL',
      },
    ],
    explainability: {
      scheduled_hours: 8,
      scheduled_window: '09:00 - 18:00',
      actual_presence_hours: 12.63,
      check_in: '08:52',
      check_out: '21:30',
      total_break_minutes: 60,
      paid_break_minutes: 15,
      unpaid_break_minutes: 45,
      payable_work_hours: 11.88,
      grace_period_applied_minutes: 15,
      rounding_adjustment_minutes: 0,
      eligible_ot_minutes: 195,
      approved_ot_minutes: 180,
      payable_ot_minutes: 180,
      deficit_minutes: 0,
      policy_used: 'Standard Enterprise Overtime Policy',
      policy_version: 'v3.2',
      applied_multipliers: [
        { category: 'REGULAR_OT', hours: 3.0, multiplier: 1.5, amount: 1125 },
      ],
      steps: [
        'Shift expected duration: 8h 00m (09:00 - 18:00)',
        'Recorded check-in at 08:52, check-out at 21:30 (Gross presence: 12h 38m)',
        'Unpaid Meal Break deducted: 45m; Paid Tea Break credited: 15m',
        'Net Payable Work Hours: 11h 53m (exceeds scheduled 8h by 3h 53m)',
        'Grace period of 15m applied; 15-minute rounding normalized raw extra time',
        'Manager approved 3h 00m under Project Deployment sprint ticket OTR-001',
        'Payable Overtime locked at 3h 00m with 1.5x regular multiplier (₹1,125.00)',
      ],
    },
  },
  {
    id: 'wh-002',
    employee_id: 'emp-004',
    employee_name: 'Kavitha Ramaswamy',
    employee_code: 'JOY-0219',
    department: 'Manufacturing Ops',
    shift_name: 'Afternoon Shift (14:00 - 22:00)',
    date: '2026-08-27',
    scheduled_start: '14:00',
    scheduled_end: '22:00',
    scheduled_hours: 7.5,
    check_in: '13:50',
    check_out: '00:30',
    actual_presence_hours: 10.67,
    paid_break_hours: 0.25,
    unpaid_break_hours: 0.5,
    payable_work_hours: 10.17,
    deficit_hours: 0,
    eligible_ot_hours: 2.5,
    approved_ot_hours: 2.5,
    payable_ot_hours: 2.5,
    status: 'OVERTIME',
    location_type: 'PLANT',
    estimated_cost: 980,
    breaks: [
      {
        id: 'brk-03',
        employee_id: 'emp-004',
        type: 'MEAL',
        start_time: '18:00',
        end_time: '18:30',
        duration_minutes: 30,
        is_paid: false,
        is_excess: false,
        excess_minutes: 0,
        source: 'BIOMETRIC',
      },
    ],
    explainability: {
      scheduled_hours: 7.5,
      scheduled_window: '14:00 - 22:00',
      actual_presence_hours: 10.67,
      check_in: '13:50',
      check_out: '00:30',
      total_break_minutes: 30,
      paid_break_minutes: 0,
      unpaid_break_minutes: 30,
      payable_work_hours: 10.17,
      grace_period_applied_minutes: 10,
      rounding_adjustment_minutes: 0,
      eligible_ot_minutes: 150,
      approved_ot_minutes: 150,
      payable_ot_minutes: 150,
      policy_used: 'Manufacturing Plant Shift Policy',
      policy_version: 'v3.2',
      applied_multipliers: [
        { category: 'REGULAR_OT', hours: 1.5, multiplier: 1.5, amount: 525 },
        { category: 'NIGHT_OT', hours: 1.0, multiplier: 1.75, amount: 455 },
      ],
      deficit_minutes: 0,
      steps: [
        'Shift expected duration: 7h 30m (14:00 - 22:00)',
        'Check-out at 00:30 (Post-shift overtime: 2h 30m)',
        'Segment decomposition: 22:00-00:00 (Evening regular OT: 1.5h @ 1.5x) + 00:00-00:30 (Late night OT: 1.0h @ 1.75x)',
        'Overtime request OTR-002 validated against Line B shift roster',
        'Total payable compensation: ₹980.00',
      ],
    },
  },
  {
    id: 'wh-003',
    employee_id: 'emp-005',
    employee_name: 'Pooja Sharma',
    employee_code: 'JOY-0155',
    department: 'Finance & Accounts',
    shift_name: 'General Day (09:00 - 18:00)',
    date: '2026-08-27',
    scheduled_start: '09:00',
    scheduled_end: '18:00',
    scheduled_hours: 8,
    check_in: '09:12',
    check_out: '18:05',
    actual_presence_hours: 8.88,
    paid_break_hours: 0.25,
    unpaid_break_hours: 0.75,
    payable_work_hours: 8.13,
    deficit_hours: 0,
    eligible_ot_hours: 0,
    approved_ot_hours: 0,
    payable_ot_hours: 0,
    status: 'NORMAL',
    location_type: 'OFFICE',
    estimated_cost: 0,
    breaks: [
      {
        id: 'brk-04',
        employee_id: 'emp-005',
        type: 'MEAL',
        start_time: '13:15',
        end_time: '14:00',
        duration_minutes: 45,
        is_paid: false,
        is_excess: false,
        excess_minutes: 0,
        source: 'BIOMETRIC',
      },
    ],
    explainability: {
      scheduled_hours: 8,
      scheduled_window: '09:00 - 18:00',
      actual_presence_hours: 8.88,
      check_in: '09:12',
      check_out: '18:05',
      total_break_minutes: 45,
      paid_break_minutes: 0,
      unpaid_break_minutes: 45,
      payable_work_hours: 8.13,
      grace_period_applied_minutes: 15,
      rounding_adjustment_minutes: 0,
      eligible_ot_minutes: 0,
      approved_ot_minutes: 0,
      payable_ot_minutes: 0,
      deficit_minutes: 0,
      policy_used: 'Standard Enterprise Overtime Policy',
      policy_version: 'v3.2',
      applied_multipliers: [],
      steps: [
        'Shift expected duration: 8h 00m',
        'Check-out at 18:05 is within the 15-minute grace threshold',
        'Extra time 5m discarded under grace period policy',
        'Payable work hours satisfy standard 8h requirement. Zero OT generated.',
      ],
    },
  },
];

const INITIAL_EXCEPTIONS: WorkException[] = [
  {
    id: 'exc-001',
    employee_id: 'emp-009',
    employee_name: 'Dinesh Karthik',
    department: 'Logistics & Warehouse',
    date: '2026-08-27',
    type: 'EXCEED_MAX_WORK_HOURS',
    details: 'Shift presence exceeded maximum allowable daily statutory limit (13.5h vs 12.0h max)',
    hours_or_minutes: '1.5h Excess',
    severity: 'HIGH',
    status: 'OPEN',
    manager_name: 'Suresh Menon',
    created_at: '2026-08-27T07:45:00Z',
  },
  {
    id: 'exc-002',
    employee_id: 'emp-011',
    employee_name: 'Anita Deshmukh',
    department: 'Customer Support',
    date: '2026-08-27',
    type: 'EXCESS_BREAK',
    details: 'Lunch break exceeded standard 45-minute allocation by 28 minutes without manager approval',
    hours_or_minutes: '28 min Excess',
    severity: 'MEDIUM',
    status: 'IN_REVIEW',
    manager_name: 'Vikramaditya Roy',
    created_at: '2026-08-27T14:10:00Z',
  },
  {
    id: 'exc-003',
    employee_id: 'emp-014',
    employee_name: 'Gopalakrishnan V',
    department: 'Manufacturing Ops',
    date: '2026-08-26',
    type: 'OT_WITHOUT_APPROVAL',
    details: 'Stayed 2.5h post-shift on Line A without submitting an overtime pre-approval request',
    hours_or_minutes: '2.5h Unapproved OT',
    severity: 'HIGH',
    status: 'OPEN',
    manager_name: 'Senthil Nathan',
    created_at: '2026-08-26T23:30:00Z',
  },
];

class WorkOvertimeService {
  private STORAGE_KEY = 'workforce_work_overtime_v3';

  private loadState() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      activePreset: 'CORPORATE' as IndustryPreset,
      policy: DEFAULT_OVERTIME_POLICY,
      breakPolicy: DEFAULT_BREAK_POLICY,
      requests: INITIAL_REQUESTS,
      wfhRequests: INITIAL_WFH_REQUESTS,
      workHours: INITIAL_WORK_HOURS,
      exceptions: INITIAL_EXCEPTIONS,
      isPayrollLocked: false,
      payrollPeriod: '2026-08',
    };
  }

  private saveState(state: any) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('work-overtime:updated'));
    } catch {}
  }

  getDashboardMetrics(): OvertimeDashboardMetrics {
    const state = this.loadState();
    const workHours: WorkHourRecord[] = state.workHours || [];
    const requests: OvertimeRequest[] = state.requests || [];
    const exceptions: WorkException[] = state.exceptions || [];

    const ot_today_hours = workHours.reduce((sum, wh) => sum + (wh.payable_ot_hours || 0), 0);
    const ot_week_hours = ot_today_hours * 4.2 + 24.5;
    const ot_month_hours = ot_week_hours * 3.8 + 118.0;
    const pending_requests_count = requests.filter(r => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_HR').length;
    const projected_ot_hours = ot_today_hours + 8.5;
    const policy_exceptions_count = exceptions.filter(e => e.status === 'OPEN' || e.status === 'IN_REVIEW').length;
    const estimated_ot_cost = workHours.reduce((sum, wh) => sum + (wh.estimated_cost || 0), 0) + 12500;
    const workers_on_ot_count = workHours.filter(wh => wh.payable_ot_hours > 0).length;

    return {
      ot_today_hours: Number(ot_today_hours.toFixed(1)),
      ot_week_hours: Number(ot_week_hours.toFixed(1)),
      ot_month_hours: Number(ot_month_hours.toFixed(1)),
      pending_requests_count,
      projected_ot_hours: Number(projected_ot_hours.toFixed(1)),
      policy_exceptions_count,
      estimated_ot_cost: Math.round(estimated_ot_cost),
      workers_on_ot_count,
      active_plant_coverage_percent: 94.8,
    };
  }

  getActivePreset(): IndustryPreset {
    return this.loadState().activePreset || 'CORPORATE';
  }

  setActivePreset(preset: IndustryPreset) {
    const state = this.loadState();
    state.activePreset = preset;
    this.saveState(state);
  }

  getPolicy(): OvertimePolicy {
    return this.loadState().policy || DEFAULT_OVERTIME_POLICY;
  }

  updatePolicy(policy: Partial<OvertimePolicy>) {
    const state = this.loadState();
    state.policy = { ...state.policy, ...policy };
    this.saveState(state);
  }

  getBreakPolicy(): BreakPolicy {
    return this.loadState().breakPolicy || DEFAULT_BREAK_POLICY;
  }

  updateBreakPolicy(policy: Partial<BreakPolicy>) {
    const state = this.loadState();
    state.breakPolicy = { ...state.breakPolicy, ...policy };
    this.saveState(state);
  }

  getOvertimeRequests(): OvertimeRequest[] {
    return this.loadState().requests || [];
  }

  submitOvertimeRequest(data: Omit<OvertimeRequest, 'id' | 'created_at' | 'updated_at'>): OvertimeRequest {
    const state = this.loadState();
    const newRequest: OvertimeRequest = {
      ...data,
      id: `otr-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.requests = [newRequest, ...state.requests];
    this.saveState(state);
    return newRequest;
  }

  approveOvertimeRequest(id: string, approverName: string, comment?: string): boolean {
    const state = this.loadState();
    const idx = state.requests.findIndex((r: OvertimeRequest) => r.id === id);
    if (idx === -1) return false;

    state.requests[idx].status = 'APPROVED';
    state.requests[idx].approver_name = approverName;
    state.requests[idx].approver_comment = comment || 'Approved for operational payroll compensation.';
    state.requests[idx].approved_hours = state.requests[idx].expected_hours;
    state.requests[idx].updated_at = new Date().toISOString();
    this.saveState(state);
    return true;
  }

  rejectOvertimeRequest(id: string, approverName: string, comment?: string): boolean {
    const state = this.loadState();
    const idx = state.requests.findIndex((r: OvertimeRequest) => r.id === id);
    if (idx === -1) return false;

    state.requests[idx].status = 'REJECTED';
    state.requests[idx].approver_name = approverName;
    state.requests[idx].approver_comment = comment || 'Rejected due to budget limits / policy mismatch.';
    state.requests[idx].updated_at = new Date().toISOString();
    this.saveState(state);
    return true;
  }

  bulkAssignOvertime(
    employeeIds: { id: string; name: string; code: string; department: string }[],
    params: {
      date: string;
      start_time: string;
      end_time: string;
      expected_hours: number;
      reason_type: OvertimeRequest['reason_type'];
      custom_reason: string;
      work_type: OvertimeRequest['work_type'];
      production_line?: string;
      machine_id?: string;
      location: string;
    }
  ): number {
    const state = this.loadState();
    const created: OvertimeRequest[] = employeeIds.map(emp => ({
      id: `otr-bulk-${Date.now()}-${emp.id}`,
      tenant_id: 'default-tenant',
      employee_id: emp.id,
      employee_name: emp.name,
      employee_code: emp.code,
      department: emp.department,
      designation: 'Staff Specialist',
      date: params.date,
      start_time: params.start_time,
      end_time: params.end_time,
      expected_hours: params.expected_hours,
      approved_hours: params.expected_hours,
      reason_type: params.reason_type,
      custom_reason: params.custom_reason,
      work_type: params.work_type,
      production_line: params.production_line,
      machine_id: params.machine_id,
      location: params.location,
      status: 'APPROVED',
      compensation_type: 'PAID_OVERTIME',
      approver_name: 'Plant Supervisor / Bulk Dispatch',
      approver_comment: 'Bulk shift allocation approved for factory operations',
      estimated_cost: params.expected_hours * 350,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    state.requests = [...created, ...state.requests];
    this.saveState(state);
    return created.length;
  }

  getWfhRequests(): WfhRequest[] {
    return this.loadState().wfhRequests || [];
  }

  submitWfhRequest(data: Omit<WfhRequest, 'id' | 'created_at'>): WfhRequest {
    const state = this.loadState();
    const newRequest: WfhRequest = {
      ...data,
      id: `wfh-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    state.wfhRequests = [newRequest, ...state.wfhRequests];
    this.saveState(state);
    return newRequest;
  }

  approveWfhRequest(id: string, approverName: string, comment?: string): boolean {
    const state = this.loadState();
    const idx = state.wfhRequests.findIndex((r: WfhRequest) => r.id === id);
    if (idx === -1) return false;

    state.wfhRequests[idx].status = 'APPROVED';
    state.wfhRequests[idx].approver_name = approverName;
    state.wfhRequests[idx].approver_comment = comment || 'Approved for remote working.';
    this.saveState(state);
    return true;
  }

  rejectWfhRequest(id: string, approverName: string, comment?: string): boolean {
    const state = this.loadState();
    const idx = state.wfhRequests.findIndex((r: WfhRequest) => r.id === id);
    if (idx === -1) return false;

    state.wfhRequests[idx].status = 'REJECTED';
    state.wfhRequests[idx].approver_name = approverName;
    state.wfhRequests[idx].approver_comment = comment || 'Rejected. Physical office presence required.';
    this.saveState(state);
    return true;
  }

  getWorkHourRecords(): WorkHourRecord[] {
    return this.loadState().workHours || [];
  }

  getWorkExceptions(): WorkException[] {
    return this.loadState().exceptions || [];
  }

  resolveException(id: string, actionNote: string, status: 'APPROVED' | 'WAIVED' | 'REJECTED' = 'APPROVED'): boolean {
    const state = this.loadState();
    const idx = state.exceptions.findIndex((e: WorkException) => e.id === id);
    if (idx === -1) return false;

    state.exceptions[idx].status = status;
    state.exceptions[idx].action_note = actionNote;
    this.saveState(state);
    return true;
  }

  lockPayrollPeriod(period: string): boolean {
    const state = this.loadState();
    state.isPayrollLocked = true;
    state.payrollPeriod = period;
    this.saveState(state);
    return true;
  }

  isPayrollLocked(): boolean {
    return !!this.loadState().isPayrollLocked;
  }
}

export const workOvertimeService = new WorkOvertimeService();
