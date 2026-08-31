import {
  IndustryPreset,
  OvertimePolicy,
  BreakPolicy,
  OvertimeRequest,
  WfhRequest,
  WorkHourRecord,
  WorkException,
  OvertimeDashboardMetrics,
  CalculationExplainability,
} from '../types/workOvertime';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { hrEventBus } from './hrEventBus';
import { attendanceApi } from './attendanceApi';
import { attendanceRosterService } from './attendance/attendanceRosterService';
import { api } from './api';

const DEFAULT_OVERTIME_POLICY: OvertimePolicy = {
  id: 'pol-ot-001',
  tenant_id: 'org-joy-01',
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

function getActiveOrgId(): string {
  if (typeof window !== 'undefined') {
    try {
      const storedOrg = localStorage.getItem('workforce_active_organization');
      if (storedOrg) {
        const parsed = JSON.parse(storedOrg);
        if (parsed && parsed.id) return parsed.id;
      }
      const stored = localStorage.getItem('workforce_active_org_id');
      if (stored) return stored;
    } catch {}
  }
  return 'org-joy-01';
}

class WorkOvertimeService {
  private isRealtimeSubscribed = false;

  private getStorageKey(tenantId = getActiveOrgId()): string {
    return `workforce_work_overtime_v4_${tenantId}`;
  }

  private loadState(tenantId = getActiveOrgId()) {
    try {
      const sKey = this.getStorageKey(tenantId);
      const saved = localStorage.getItem(sKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          activePreset: (parsed.activePreset || 'CORPORATE') as IndustryPreset,
          policy: { ...DEFAULT_OVERTIME_POLICY, ...(parsed.policy || {}) },
          breakPolicy: { ...DEFAULT_BREAK_POLICY, ...(parsed.breakPolicy || {}) },
          requests: (parsed.requests || []) as OvertimeRequest[],
          wfhRequests: (parsed.wfhRequests || []) as WfhRequest[],
          isPayrollLocked: !!parsed.isPayrollLocked,
          payrollPeriod: parsed.payrollPeriod || new Date().toISOString().slice(0, 7),
        };
      }
    } catch {}

    return {
      activePreset: 'CORPORATE' as IndustryPreset,
      policy: DEFAULT_OVERTIME_POLICY,
      breakPolicy: DEFAULT_BREAK_POLICY,
      requests: [] as OvertimeRequest[],
      wfhRequests: [] as WfhRequest[],
      isPayrollLocked: false,
      payrollPeriod: new Date().toISOString().slice(0, 7),
    };
  }

  private saveState(state: any, tenantId = getActiveOrgId()) {
    try {
      const sKey = this.getStorageKey(tenantId);
      localStorage.setItem(sKey, JSON.stringify(state));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('work-overtime:updated'));
      }
    } catch {}
  }

  // ==========================================================================
  // REALTIME MESH SUBSCRIPTION
  // ==========================================================================
  public initRealtimeSubscription(tenantId = getActiveOrgId()): void {
    if (this.isRealtimeSubscribed || !isSupabaseEnabled) return;
    this.isRealtimeSubscribed = true;

    try {
      const channelName = `work_overtime_mesh_${tenantId}`;
      const existingChannel = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
      if (existingChannel) {
        supabase.removeChannel(existingChannel);
      }

      const channel = supabase.channel(channelName);

      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'realtime_outbox',
            filter: `entity_type=in.(overtime_requests,wfh_requests)`,
          },
          () => {
            this.fetchFromSupabase(tenantId).then(() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('work-overtime:updated'));
              }
            });
          }
        )
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED' && status !== 'TIMED_OUT') {
            this.isRealtimeSubscribed = false;
          }
        });
    } catch (e) {
      console.warn('[WorkOvertime] Realtime subscription notice:', e);
      this.isRealtimeSubscribed = false;
    }
  }

  public async fetchFromSupabase(tenantId = getActiveOrgId()): Promise<void> {
    if (!isSupabaseEnabled) return;
    try {
      const { data: outboxRows } = await supabase
        .from('realtime_outbox')
        .select('*')
        .in('entity_type', ['overtime_requests', 'wfh_requests'])
        .order('created_at', { ascending: true });

      if (outboxRows && outboxRows.length > 0) {
        const state = this.loadState(tenantId);
        const otMap = new Map<string, OvertimeRequest>();
        const wfhMap = new Map<string, WfhRequest>();

        state.requests.forEach((r) => otMap.set(r.id, r));
        state.wfhRequests.forEach((w) => wfhMap.set(w.id, w));

        outboxRows.forEach((row: any) => {
          if (row.entity_type === 'overtime_requests' && row.payload?.id) {
            otMap.set(row.payload.id, { ...(otMap.get(row.payload.id) || {}), ...row.payload });
          } else if (row.entity_type === 'wfh_requests' && row.payload?.id) {
            wfhMap.set(row.payload.id, { ...(wfhMap.get(row.payload.id) || {}), ...row.payload });
          }
        });

        state.requests = Array.from(otMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        state.wfhRequests = Array.from(wfhMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        this.saveState(state, tenantId);
      }
    } catch (err) {
      console.warn('[WorkOvertime] fetchFromSupabase error:', err);
    }
  }

  // ==========================================================================
  // DASHBOARD METRICS (ZERO-MOCK REAL DATA ENGINE)
  // ==========================================================================
  getDashboardMetrics(selectedDate = new Date().toISOString().split('T')[0]): OvertimeDashboardMetrics {
    const tenantId = getActiveOrgId();
    this.initRealtimeSubscription(tenantId);

    const state = this.loadState(tenantId);
    const workHours = this.getWorkHourRecords(selectedDate);
    const requests = state.requests || [];
    const exceptions = this.getWorkExceptions(selectedDate);

    // Sum actual overtime hours from today's real attendance
    const ot_today_hours = workHours.reduce((sum, wh) => sum + (wh.payable_ot_hours || 0), 0);

    // Compute month and week actuals from attendance daily logs
    const allAttendance = attendanceApi.getAllAttendanceLogs();
    const currDate = new Date(selectedDate);
    const currMonthPrefix = selectedDate.slice(0, 7); // YYYY-MM

    // Month total OT
    const monthRecords = allAttendance.filter((a: any) => (a.date || '').startsWith(currMonthPrefix));
    const ot_month_minutes = monthRecords.reduce((sum: number, a: any) => sum + (a.overtime_minutes || 0), 0);
    const ot_month_hours = Math.round((ot_month_minutes / 60) * 10) / 10;

    // Week total OT (last 7 days)
    const sevenDaysAgo = new Date(currDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekRecords = allAttendance.filter((a: any) => {
      const d = new Date(a.date);
      return d >= sevenDaysAgo && d <= currDate;
    });
    const ot_week_minutes = weekRecords.reduce((sum: number, a: any) => sum + (a.overtime_minutes || 0), 0);
    const ot_week_hours = Math.round((ot_week_minutes / 60) * 10) / 10;

    const pending_requests_count = requests.filter(
      (r) => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_HR' || r.status === 'SUBMITTED'
    ).length;

    const policy_exceptions_count = exceptions.filter((e) => e.status === 'OPEN' || e.status === 'IN_REVIEW').length;
    const workers_on_ot_count = workHours.filter((wh) => wh.payable_ot_hours > 0).length;

    // Estimated cost: real sum of (payable_ot_hours * standard rate * multiplier)
    const estimated_ot_cost = workHours.reduce((sum, wh) => sum + (wh.estimated_cost || 0), 0);

    // Active plant / department presence percentage
    const active_plant_coverage_percent = workHours.length > 0
      ? Math.round((workHours.filter((w) => w.status !== 'ABSENT').length / workHours.length) * 1000) / 10
      : 100;

    return {
      ot_today_hours: Number(ot_today_hours.toFixed(1)),
      ot_week_hours: Number(ot_week_hours.toFixed(1)),
      ot_month_hours: Number(ot_month_hours.toFixed(1)),
      pending_requests_count,
      projected_ot_hours: Number((ot_today_hours + requests.filter((r) => r.status === 'APPROVED').reduce((s, r) => s + (r.approved_hours || 0), 0)).toFixed(1)),
      policy_exceptions_count,
      estimated_ot_cost: Math.round(estimated_ot_cost),
      workers_on_ot_count,
      active_plant_coverage_percent,
    };
  }

  // ==========================================================================
  // WORK HOURS & REALTIME OVERTIME DECOMPOSITION ENGINE
  // ==========================================================================
  getWorkHourRecords(selectedDate = new Date().toISOString().split('T')[0]): WorkHourRecord[] {
    const tenantId = getActiveOrgId();
    const activeComp = api.getActiveCompany();
    const employees = api.getEmployeesSync(activeComp?.id) || [];
    const dailyRecords = attendanceApi.getDailyAttendance(selectedDate);
    const policy = this.getPolicy();
    const breakPolicy = this.getBreakPolicy();

    if (employees.length === 0) return [];

    return employees.map((emp) => {
      const record = dailyRecords.find(
        (r) =>
          r.employee_id === emp.id ||
          (r.employee_code && emp.employee_code && r.employee_code.toLowerCase() === emp.employee_code.toLowerCase())
      );
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, selectedDate);
      const shift = attendanceRosterService.getShiftById(roster.shift_id) || {
        shift_name: roster.shift_name || 'General Day Shift',
        shift_code: roster.shift_code || 'GEN-09',
        start_time: '09:00',
        end_time: '18:00',
        cross_midnight: (roster.shift_code || '').includes('NGT'),
      };

      const scheduledHours = 8.0;
      const scheduledWindow = `${shift.start_time} - ${shift.end_time}`;
      const checkIn = record?.first_check_in || null;
      const checkOut = record?.last_check_out || null;

      const grossMinutes = record?.gross_working_minutes || 0;
      const netMinutes = record?.net_working_minutes || 0;
      const breakMinutes = record?.total_break_minutes || (grossMinutes > 300 ? breakPolicy.automatic_break_minutes : 0);
      const actualPresenceHours = Math.round((grossMinutes / 60) * 100) / 100;
      const payableWorkHours = Math.round((netMinutes / 60) * 100) / 100;

      // Overtime calculation
      const otMinutes = record?.overtime_minutes || Math.max(0, netMinutes - policy.daily_threshold_minutes);
      const eligibleOtHours = Math.round((otMinutes / 60) * 100) / 100;
      const payableOtHours = eligibleOtHours;

      const hourlyRate = 350; // Standard base hourly rate
      const estimatedCost = Math.round(payableOtHours * hourlyRate * policy.normal_rate_multiplier);

      const status: WorkHourRecord['status'] =
        payableOtHours > 0
          ? 'OVERTIME'
          : record?.status === 'Absent' || (!checkIn && !roster.is_weekly_off)
          ? 'DEFICIT'
          : 'NORMAL';

      const explainSteps: string[] = [
        `Shift scheduled duration: ${scheduledHours}h 00m (${scheduledWindow})`,
        checkIn ? `Check-in recorded at ${checkIn}` : 'No check-in recorded for date',
        checkOut ? `Check-out recorded at ${checkOut}` : 'Open presence / no check-out recorded',
        `Presence duration: ${grossMinutes}m gross, with ${breakMinutes}m break deductions`,
      ];

      if (payableOtHours > 0) {
        explainSteps.push(
          `Overtime threshold (${policy.daily_threshold_minutes}m) exceeded by ${otMinutes}m (${payableOtHours}h)`,
          `Multipliers applied: Regular OT ${policy.normal_rate_multiplier}x. Estimated compensation: ₹${estimatedCost}`
        );
      } else {
        explainSteps.push('Presence within standard working limit. 0h overtime generated.');
      }

      const explainability: CalculationExplainability = {
        scheduled_hours: scheduledHours,
        scheduled_window: scheduledWindow,
        actual_presence_hours: actualPresenceHours,
        check_in: checkIn || '--:--',
        check_out: checkOut || '--:--',
        total_break_minutes: breakMinutes,
        paid_break_minutes: breakPolicy.paid_break_allowance_minutes,
        unpaid_break_minutes: Math.max(0, breakMinutes - breakPolicy.paid_break_allowance_minutes),
        payable_work_hours: payableWorkHours,
        grace_period_applied_minutes: policy.grace_period_minutes,
        rounding_adjustment_minutes: 0,
        eligible_ot_minutes: otMinutes,
        approved_ot_minutes: otMinutes,
        payable_ot_minutes: otMinutes,
        deficit_minutes: Math.max(0, Math.round((scheduledHours - payableWorkHours) * 60)),
        policy_used: policy.name,
        policy_version: policy.version,
        applied_multipliers: payableOtHours > 0 ? [{ category: 'REGULAR_OT', hours: payableOtHours, multiplier: policy.normal_rate_multiplier, amount: estimatedCost }] : [],
        steps: explainSteps,
      };

      return {
        id: `wh-${emp.id}-${selectedDate}`,
        employee_id: emp.id,
        employee_name: emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || (emp as any).name || 'Employee',
        employee_code: emp.employee_code || `WF-${emp.id}`,
        department: emp.department_name || (emp as any).department || 'Operations',
        shift_name: `${shift.shift_code} (${shift.shift_name})`,
        date: selectedDate,
        scheduled_start: shift.start_time,
        scheduled_end: shift.end_time,
        scheduled_hours: scheduledHours,
        check_in: checkIn || undefined,
        check_out: checkOut || undefined,
        actual_presence_hours: actualPresenceHours,
        paid_break_hours: Math.round((breakPolicy.paid_break_allowance_minutes / 60) * 100) / 100,
        unpaid_break_hours: Math.round((Math.max(0, breakMinutes - breakPolicy.paid_break_allowance_minutes) / 60) * 100) / 100,
        payable_work_hours: payableWorkHours,
        deficit_hours: Math.max(0, Math.round((scheduledHours - payableWorkHours) * 100) / 100),
        eligible_ot_hours: eligibleOtHours,
        approved_ot_hours: payableOtHours,
        payable_ot_hours: payableOtHours,
        status,
        location_type: record?.status === 'WFH' ? 'WFH' : 'OFFICE',
        estimated_cost: estimatedCost,
        breaks: [
          {
            id: `brk-${emp.id}-${selectedDate}`,
            employee_id: emp.id,
            type: 'MEAL',
            start_time: '13:00',
            end_time: '13:30',
            duration_minutes: breakMinutes,
            is_paid: false,
            is_excess: breakMinutes > breakPolicy.max_unpaid_break_minutes,
            excess_minutes: Math.max(0, breakMinutes - breakPolicy.max_unpaid_break_minutes),
            source: record?.source || 'SYSTEM',
          },
        ],
        explainability,
      };
    });
  }

  // ==========================================================================
  // DYNAMIC WORK EXCEPTIONS ENGINE
  // ==========================================================================
  getWorkExceptions(selectedDate = new Date().toISOString().split('T')[0]): WorkException[] {
    const workHours = this.getWorkHourRecords(selectedDate);
    const policy = this.getPolicy();
    const breakPolicy = this.getBreakPolicy();
    const exceptions: WorkException[] = [];

    workHours.forEach((wh) => {
      // 1. Exceeding max allowable daily work hours (e.g. > 12h limit)
      if (wh.actual_presence_hours > policy.max_work_hours_day) {
        exceptions.push({
          id: `exc-max-${wh.employee_id}-${wh.date}`,
          employee_id: wh.employee_id,
          employee_name: wh.employee_name,
          department: wh.department,
          date: wh.date,
          type: 'EXCEED_MAX_WORK_HOURS',
          details: `Shift presence (${wh.actual_presence_hours}h) exceeded maximum daily statutory limit of ${policy.max_work_hours_day}h.`,
          hours_or_minutes: `${(wh.actual_presence_hours - policy.max_work_hours_day).toFixed(1)}h Excess`,
          severity: 'HIGH',
          status: 'OPEN',
          manager_name: 'Department Manager',
          created_at: new Date().toISOString(),
        });
      }

      // 2. Excess break duration without authorization
      const breakDuration = wh.breaks.reduce((s, b) => s + b.duration_minutes, 0);
      if (breakDuration > breakPolicy.max_unpaid_break_minutes) {
        exceptions.push({
          id: `exc-brk-${wh.employee_id}-${wh.date}`,
          employee_id: wh.employee_id,
          employee_name: wh.employee_name,
          department: wh.department,
          date: wh.date,
          type: 'EXCESS_BREAK',
          details: `Break time (${breakDuration}m) exceeded policy limit of ${breakPolicy.max_unpaid_break_minutes}m.`,
          hours_or_minutes: `${breakDuration - breakPolicy.max_unpaid_break_minutes}m Excess`,
          severity: 'MEDIUM',
          status: 'IN_REVIEW',
          manager_name: 'Team Supervisor',
          created_at: new Date().toISOString(),
        });
      }

      // 3. Overtime generated without prior approved request
      if (wh.payable_ot_hours > 0 && policy.approval_required) {
        const approvedReq = this.getOvertimeRequests().find(
          (r) => (r.employee_id === wh.employee_id || r.employee_name === wh.employee_name) && r.date === wh.date && r.status === 'APPROVED'
        );
        if (!approvedReq) {
          exceptions.push({
            id: `exc-ot-${wh.employee_id}-${wh.date}`,
            employee_id: wh.employee_id,
            employee_name: wh.employee_name,
            department: wh.department,
            date: wh.date,
            type: 'OT_WITHOUT_APPROVAL',
            details: `Employee logged ${wh.payable_ot_hours}h of overtime without an approved pre-shift overtime authorization.`,
            hours_or_minutes: `${wh.payable_ot_hours}h Unapproved OT`,
            severity: 'HIGH',
            status: 'OPEN',
            manager_name: 'Operations Manager',
            created_at: new Date().toISOString(),
          });
        }
      }
    });

    return exceptions;
  }

  // ==========================================================================
  // POLICIES & PRESETS
  // ==========================================================================
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

  // ==========================================================================
  // OVERTIME REQUESTS CRUD + DATABASE PERSISTENCE
  // ==========================================================================
  getOvertimeRequests(): OvertimeRequest[] {
    return this.loadState().requests || [];
  }

  public async submitOvertimeRequest(
    data: Omit<OvertimeRequest, 'id' | 'created_at' | 'updated_at'>,
    tenantId = getActiveOrgId()
  ): Promise<OvertimeRequest> {
    const state = this.loadState(tenantId);
    const now = new Date().toISOString();
    const newRequest: OvertimeRequest = {
      ...data,
      id: `otr-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };

    state.requests = [newRequest, ...state.requests];
    this.saveState(state, tenantId);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('realtime_outbox').insert([
          {
            tenant_id: tenantId,
            organization_id: tenantId,
            entity_type: 'overtime_requests',
            entity_id: newRequest.id,
            event_type: 'overtime.submitted',
            actor_id: newRequest.employee_id,
            payload: newRequest,
          },
        ]);
      } catch (err) {
        console.warn('[WorkOvertime] Outbox insert error:', err);
      }
    }

    hrEventBus.publish('custom', { type: 'overtime.submitted', data: newRequest });
    return newRequest;
  }

  public async approveOvertimeRequest(
    id: string,
    approverName: string,
    comment?: string,
    tenantId = getActiveOrgId()
  ): Promise<boolean> {
    const state = this.loadState(tenantId);
    const idx = state.requests.findIndex((r: OvertimeRequest) => r.id === id);
    if (idx === -1) return false;

    const now = new Date().toISOString();
    const req = state.requests[idx];
    req.status = 'APPROVED';
    req.approver_name = approverName;
    req.approver_comment = comment || 'Approved for operational payroll compensation.';
    req.approved_hours = req.expected_hours;
    req.updated_at = now;

    this.saveState(state, tenantId);

    // Apply Overtime directly to Daily Attendance record
    try {
      const otMinutes = Math.round((req.approved_hours || req.expected_hours) * 60);
      const storageKeys = [
        'workforceos_attendance_daily_v2',
        `workforceos_attendance_daily_v2_${tenantId}`,
        'workforceos_attendance_daily_v2_org-joy-01',
      ];
      for (const sKey of storageKeys) {
        const raw = localStorage.getItem(sKey);
        let list: any[] = raw ? JSON.parse(raw) : [];
        const mIdx = list.findIndex(
          (a) => (a.employee_id === req.employee_id || a.employee_code === req.employee_code) && a.date === req.date
        );
        if (mIdx >= 0) {
          list[mIdx].overtime_minutes = otMinutes;
          localStorage.setItem(sKey, JSON.stringify(list));
        }
      }

      if (isSupabaseEnabled) {
        await supabase
          .from('attendance_daily')
          .update({ overtime_minutes: otMinutes, updated_at: now })
          .match({ employee_id: req.employee_id, date: req.date });

        await supabase.from('realtime_outbox').insert([
          {
            tenant_id: tenantId,
            organization_id: tenantId,
            entity_type: 'overtime_requests',
            entity_id: req.id,
            event_type: 'overtime.approved',
            actor_id: req.employee_id,
            payload: req,
          },
        ]);
      }
    } catch (err) {
      console.warn('[WorkOvertime] Attendance OT sync error:', err);
    }

    hrEventBus.publish('custom', { type: 'overtime.approved', data: req });
    return true;
  }

  public async rejectOvertimeRequest(
    id: string,
    approverName: string,
    comment?: string,
    tenantId = getActiveOrgId()
  ): Promise<boolean> {
    const state = this.loadState(tenantId);
    const idx = state.requests.findIndex((r: OvertimeRequest) => r.id === id);
    if (idx === -1) return false;

    const now = new Date().toISOString();
    const req = state.requests[idx];
    req.status = 'REJECTED';
    req.approver_name = approverName;
    req.approver_comment = comment || 'Rejected due to budget limits / policy mismatch.';
    req.updated_at = now;

    this.saveState(state, tenantId);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('realtime_outbox').insert([
          {
            tenant_id: tenantId,
            organization_id: tenantId,
            entity_type: 'overtime_requests',
            entity_id: req.id,
            event_type: 'overtime.rejected',
            actor_id: req.employee_id,
            payload: req,
          },
        ]);
      } catch (err) {
        console.warn('[WorkOvertime] Outbox insert error:', err);
      }
    }

    hrEventBus.publish('custom', { type: 'overtime.rejected', data: req });
    return true;
  }

  public bulkAssignOvertime(
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
    },
    tenantId = getActiveOrgId()
  ): number {
    const state = this.loadState(tenantId);
    const now = new Date().toISOString();
    const created: OvertimeRequest[] = employeeIds.map((emp) => ({
      id: `otr-bulk-${Date.now()}-${emp.id}`,
      tenant_id: tenantId,
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
      approver_name: 'Operations Dispatch',
      approver_comment: 'Bulk shift allocation approved for factory operations',
      estimated_cost: params.expected_hours * 350 * 1.5,
      created_at: now,
      updated_at: now,
    }));

    state.requests = [...created, ...state.requests];
    this.saveState(state, tenantId);

    // Save to Supabase Outbox
    if (isSupabaseEnabled) {
      try {
        const outboxEntries = created.map((req) => ({
          tenant_id: tenantId,
          organization_id: tenantId,
          entity_type: 'overtime_requests',
          entity_id: req.id,
          event_type: 'overtime.approved',
          actor_id: req.employee_id,
          payload: req,
        }));
        supabase.from('realtime_outbox').insert(outboxEntries).then(() => {});
      } catch (_) {}
    }

    return created.length;
  }

  // ==========================================================================
  // WFH REQUESTS CRUD + DATABASE PERSISTENCE
  // ==========================================================================
  getWfhRequests(): WfhRequest[] {
    return this.loadState().wfhRequests || [];
  }

  public async submitWfhRequest(
    data: Omit<WfhRequest, 'id' | 'created_at'>,
    tenantId = getActiveOrgId()
  ): Promise<WfhRequest> {
    const state = this.loadState(tenantId);
    const now = new Date().toISOString();
    const newRequest: WfhRequest = {
      ...data,
      id: `wfh-${Date.now()}`,
      created_at: now,
    };

    state.wfhRequests = [newRequest, ...state.wfhRequests];
    this.saveState(state, tenantId);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('realtime_outbox').insert([
          {
            tenant_id: tenantId,
            organization_id: tenantId,
            entity_type: 'wfh_requests',
            entity_id: newRequest.id,
            event_type: 'wfh.submitted',
            actor_id: newRequest.employee_id,
            payload: newRequest,
          },
        ]);
      } catch (err) {
        console.warn('[WorkOvertime] Outbox insert error:', err);
      }
    }

    hrEventBus.publish('custom', { type: 'wfh.submitted', data: newRequest });
    return newRequest;
  }

  public async approveWfhRequest(
    id: string,
    approverName: string,
    comment?: string,
    tenantId = getActiveOrgId()
  ): Promise<boolean> {
    const state = this.loadState(tenantId);
    const idx = state.wfhRequests.findIndex((r: WfhRequest) => r.id === id);
    if (idx === -1) return false;

    const req = state.wfhRequests[idx];
    req.status = 'APPROVED';
    req.approver_name = approverName;
    req.approver_comment = comment || 'Approved for remote working.';

    this.saveState(state, tenantId);

    // Apply WFH to Daily Attendance
    try {
      const storageKeys = [
        'workforceos_attendance_daily_v2',
        `workforceos_attendance_daily_v2_${tenantId}`,
        'workforceos_attendance_daily_v2_org-joy-01',
      ];
      for (const sKey of storageKeys) {
        const raw = localStorage.getItem(sKey);
        let list: any[] = raw ? JSON.parse(raw) : [];
        const mIdx = list.findIndex(
          (a) => (a.employee_id === req.employee_id || (req.employee_code && a.employee_code === req.employee_code)) && a.date === req.start_date
        );
        if (mIdx >= 0) {
          list[mIdx].status = 'WFH';
          localStorage.setItem(sKey, JSON.stringify(list));
        }
      }

      if (isSupabaseEnabled) {
        await supabase
          .from('attendance_daily')
          .update({ status: 'WFH', updated_at: new Date().toISOString() })
          .match({ employee_id: req.employee_id, date: req.start_date });

        await supabase.from('realtime_outbox').insert([
          {
            tenant_id: tenantId,
            organization_id: tenantId,
            entity_type: 'wfh_requests',
            entity_id: req.id,
            event_type: 'wfh.approved',
            actor_id: req.employee_id,
            payload: req,
          },
        ]);
      }
    } catch (err) {
      console.warn('[WorkOvertime] Attendance WFH sync error:', err);
    }

    hrEventBus.publish('custom', { type: 'wfh.approved', data: req });
    return true;
  }

  public async rejectWfhRequest(
    id: string,
    approverName: string,
    comment?: string,
    tenantId = getActiveOrgId()
  ): Promise<boolean> {
    const state = this.loadState(tenantId);
    const idx = state.wfhRequests.findIndex((r: WfhRequest) => r.id === id);
    if (idx === -1) return false;

    const req = state.wfhRequests[idx];
    req.status = 'REJECTED';
    req.approver_name = approverName;
    req.approver_comment = comment || 'Rejected. Physical office presence required.';

    this.saveState(state, tenantId);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('realtime_outbox').insert([
          {
            tenant_id: tenantId,
            organization_id: tenantId,
            entity_type: 'wfh_requests',
            entity_id: req.id,
            event_type: 'wfh.rejected',
            actor_id: req.employee_id,
            payload: req,
          },
        ]);
      } catch (err) {
        console.warn('[WorkOvertime] Outbox insert error:', err);
      }
    }

    hrEventBus.publish('custom', { type: 'wfh.rejected', data: req });
    return true;
  }

  // ==========================================================================
  // EXCEPTIONS RESOLUTION
  // ==========================================================================
  resolveException(id: string, actionNote: string, status: 'APPROVED' | 'WAIVED' | 'REJECTED' = 'APPROVED'): boolean {
    const state = this.loadState();
    const exceptions = this.getWorkExceptions();
    const idx = exceptions.findIndex((e) => e.id === id);
    if (idx >= 0) {
      exceptions[idx].status = status;
      exceptions[idx].action_note = actionNote;
    }
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
