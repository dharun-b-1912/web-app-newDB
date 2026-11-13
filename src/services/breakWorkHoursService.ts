import { supabase } from '../lib/supabase';
import {
  BreakCategoryCode,
  BreakCategoryConfig,
  DEFAULT_BREAK_CATEGORIES,
  PersistedBreakEvent,
  ScopedBreakPolicy,
  computeWorkHoursWithBreaks,
} from './workHoursCalculator';

export interface BreakExceptionRow {
  id: string;
  organization_id: string;
  employee_id: string;
  attendance_daily_id: string | null;
  attendance_date: string;
  break_event_id: string | null;
  exception_type:
    | 'EXCEEDED_CATEGORY_LIMIT'
    | 'EXCEEDED_UNPAID_LIMIT'
    | 'CORE_HOURS_VIOLATION'
    | 'MISSING_MANDATORY_BREAK'
    | 'OPEN_BREAK_AT_CHECKOUT'
    | 'AUTO_CLOSED_BREAK'
    | 'MISSED_BREAK_END'
    | 'CONSECUTIVE_BREAK_ABUSE'
    | 'OUTSIDE_WORK_HOURS_BREAK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_REVIEW' | 'APPROVED' | 'WAIVED' | 'REJECTED';
  threshold_minutes: number | null;
  actual_minutes: number | null;
  excess_minutes: number | null;
  details: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export interface BreakCorrectionRow {
  id: string;
  organization_id: string;
  employee_id: string;
  attendance_date: string;
  break_event_id: string | null;
  exception_id: string | null;
  action_type:
    | 'ADD_BREAK'
    | 'EDIT_BREAK'
    | 'DELETE_BREAK'
    | 'APPROVE_EXCEPTION'
    | 'WAIVE_EXCEPTION'
    | 'REJECT_EXCEPTION'
    | 'CLOSE_OPEN_BREAK';
  previous_payload: Record<string, unknown> | null;
  new_payload: Record<string, unknown> | null;
  reason: string;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface DailyBreakLedgerRow {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  branch_name: string;
  shift_id: string | null;
  shift_name: string;
  shift_code: string;
  scheduled_start: string;
  scheduled_end: string;
  scheduled_minutes: number;
  expected_net_work_minutes: number;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  attendance_status: string;
  work_state: 'NOT_CHECKED_IN' | 'WORKING' | 'ON_BREAK' | 'CHECKED_OUT' | 'ABSENT' | 'ON_LEAVE';
  active_break_category: BreakCategoryCode | null;
  active_break_started_at: string | null;
  gross_presence_minutes: number;
  paid_break_minutes: number;
  unpaid_break_minutes: number;
  auto_deducted_break_minutes: number;
  net_payable_minutes: number;
  approved_ot_minutes: number;
  deficit_minutes: number;
  has_break_exception: boolean;
  policy_id: string | null;
  policy_version: number;
  breaks: PersistedBreakEvent[];
  exceptions: BreakExceptionRow[];
  steps: string[];
}

export interface ShiftPolicyOption {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  min_full_day_hours: number;
}

export interface BreakOperationalKpis {
  scheduledCount: number;
  checkedInCount: number;
  workingCount: number;
  onBreakCount: number;
  checkedOutCount: number;
  absentCount: number;
  missingBreaksCount: number;
  exceededBreaksCount: number;
  incompleteBreaksCount: number;
  openExceptionsCount: number;
}

export const FALLBACK_SCOPED_POLICY: ScopedBreakPolicy = {
  id: 'default',
  organization_id: '',
  name: 'Standard Break Policy',
  version: 1,
  scope_type: 'ORGANIZATION',
  scope_id: null,
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: null,
  is_active: true,
  auto_deduct_enabled: true,
  auto_deduct_after_minutes: 300,
  auto_deduct_minutes: 30,
  paid_break_allowance_minutes: 15,
  max_unpaid_break_minutes: 60,
  max_breaks_per_day: 4,
  core_hours_start: '10:00',
  core_hours_end: '16:00',
  breaks_prohibited_in_core_hours: false,
  mandatory_lunch_break: false,
  rounding_rule: 'NONE',
  categories: DEFAULT_BREAK_CATEGORIES,
};

function normalizePolicyRow(row: Record<string, unknown>): ScopedBreakPolicy {
  const rawCats = Array.isArray(row.categories)
    ? (row.categories as Record<string, unknown>[]).map((c) => ({
        code: (c.code as BreakCategoryCode) || 'OTHER',
        label: String(c.label || c.code || 'Break'),
        paid: Boolean(c.is_paid ?? c.paid),
        max_minutes_per_break: Number(c.max_duration_minutes ?? c.max_minutes_per_break ?? 30),
        max_per_day: Number(c.max_occurrences ?? c.max_per_day ?? 2),
        auto_deduct_eligible: Boolean(c.auto_deduct_eligible ?? c.code === 'LUNCH'),
        core_hours_allowed: Boolean(c.core_hours_allowed ?? true),
        enabled: c.enabled !== false,
      }))
    : [];
  const autoHours = row.automatic_break_after_hours != null ? Number(row.automatic_break_after_hours) : null;
  const autoAfterMins =
    row.auto_deduct_after_minutes != null
      ? Number(row.auto_deduct_after_minutes)
      : autoHours != null
      ? Math.round(autoHours * 60)
      : 300;
  const autoMins = Number(row.automatic_break_minutes ?? row.auto_deduct_minutes ?? 30);
  return {
    id: String(row.id || ''),
    organization_id: String(row.organization_id || ''),
    name: String(row.policy_name || row.name || 'Standard Break Policy'),
    version: Number(row.version || 1),
    scope_type: (row.scope_type as ScopedBreakPolicy['scope_type']) || 'ORGANIZATION',
    scope_id: row.scope_id ? String(row.scope_id) : null,
    effective_from: String(row.effective_from || new Date().toISOString().slice(0, 10)),
    effective_to: row.effective_to ? String(row.effective_to) : null,
    is_active: row.status ? row.status === 'ACTIVE' : row.is_active !== false,
    auto_deduct_enabled: row.auto_deduct_enabled !== undefined ? Boolean(row.auto_deduct_enabled) : autoMins > 0,
    auto_deduct_after_minutes: autoAfterMins,
    auto_deduct_minutes: autoMins,
    paid_break_allowance_minutes: Number(row.paid_break_allowance_minutes ?? 15),
    max_unpaid_break_minutes: Number(row.max_unpaid_break_minutes ?? 60),
    max_breaks_per_day: Number(row.max_breaks_per_day ?? 4),
    core_hours_start: String(row.core_hours_start || '10:00').slice(0, 5),
    core_hours_end: String(row.core_hours_end || '16:00').slice(0, 5),
    breaks_prohibited_in_core_hours: Boolean(row.breaks_prohibited_in_core_hours),
    mandatory_lunch_break: Boolean(row.mandatory_breaks ?? row.mandatory_lunch_break),
    rounding_rule: (row.rounding_rule as ScopedBreakPolicy['rounding_rule']) || 'NONE',
    categories: rawCats.length > 0 ? rawCats : DEFAULT_BREAK_CATEGORIES,
  };
}

function parseShiftDurationMinutes(startTime?: string | null, endTime?: string | null): number {
  if (!startTime || !endTime) return 480;
  const [sh, sm] = startTime.split(':').map((n) => Number(n || 0));
  const [eh, em] = endTime.split(':').map((n) => Number(n || 0));
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  const diff = e > s ? e - s : 1440 - s + e;
  return diff > 0 ? diff : 480;
}

class BreakWorkHoursService {
  async listPolicies(organizationId: string): Promise<ScopedBreakPolicy[]> {
    if (!organizationId) return [FALLBACK_SCOPED_POLICY];
    const { data, error } = await supabase
      .from('break_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('scope_type', { ascending: true })
      .order('effective_from', { ascending: false });

    if (error || !data || data.length === 0) {
      return [{ ...FALLBACK_SCOPED_POLICY, organization_id: organizationId }];
    }
    return data.map((r) => normalizePolicyRow(r as Record<string, unknown>));
  }

  async getActiveOrgPolicy(organizationId: string): Promise<ScopedBreakPolicy> {
    const policies = await this.listPolicies(organizationId);
    return (
      policies.find((p) => p.scope_type === 'ORGANIZATION' && p.is_active) ||
      policies[0] || { ...FALLBACK_SCOPED_POLICY, organization_id: organizationId }
    );
  }

  async saveBreakPolicy(
    policy: Omit<ScopedBreakPolicy, 'id' | 'version'> & { id?: string; version?: number },
    actorId?: string,
    changeSummary?: string
  ): Promise<ScopedBreakPolicy> {
    const isExistingUuid =
      policy.id &&
      policy.id !== 'default' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(policy.id);

    const nextVersion = isExistingUuid ? (policy.version || 1) + 1 : 1;

    const payload = {
      organization_id: policy.organization_id,
      policy_name: policy.name,
      version: nextVersion,
      scope_type: policy.scope_type,
      scope_id: policy.scope_id || null,
      effective_from: policy.effective_from,
      effective_to: policy.effective_to || null,
      status: policy.is_active ? 'ACTIVE' : 'INACTIVE',
      automatic_break_minutes: policy.auto_deduct_enabled ? policy.auto_deduct_minutes : 0,
      automatic_break_after_hours: Number((policy.auto_deduct_after_minutes / 60).toFixed(2)),
      mandatory_breaks: policy.mandatory_lunch_break,
      paid_break_allowance_minutes: policy.paid_break_allowance_minutes,
      max_unpaid_break_minutes: policy.max_unpaid_break_minutes,
      max_breaks_per_day: policy.max_breaks_per_day,
      core_hours_start: policy.core_hours_start,
      core_hours_end: policy.core_hours_end,
      breaks_prohibited_in_core_hours: policy.breaks_prohibited_in_core_hours,
      categories: policy.categories.map((c) => ({
        code: c.code,
        label: c.label,
        is_paid: c.paid,
        max_duration_minutes: c.max_minutes_per_break,
        max_occurrences: c.max_per_day,
        enabled: c.enabled,
      })),
      updated_by: actorId || null,
    };

    let savedRow: Record<string, unknown>;
    if (isExistingUuid) {
      const { data, error } = await supabase
        .from('break_policies')
        .update(payload)
        .eq('id', policy.id)
        .select('*')
        .single();
      if (error) throw error;
      savedRow = data as Record<string, unknown>;
    } else {
      const { data, error } = await supabase
        .from('break_policies')
        .insert({ ...payload, created_by: actorId || null })
        .select('*')
        .single();
      if (error) throw error;
      savedRow = data as Record<string, unknown>;
    }

    await supabase.from('break_policy_versions').insert({
      policy_id: savedRow.id,
      organization_id: policy.organization_id,
      version: nextVersion,
      snapshot: savedRow,
      effective_from: policy.effective_from,
      changed_by: actorId || null,
      change_reason: changeSummary || 'Updated break policy configuration',
    });

    return normalizePolicyRow(savedRow);
  }

  async getOperationalDashboard(
    organizationId: string,
    attendanceDate: string
  ): Promise<{
    rows: DailyBreakLedgerRow[];
    kpis: BreakOperationalKpis;
    activePolicy: ScopedBreakPolicy;
    policies: ScopedBreakPolicy[];
    shifts: ShiftPolicyOption[];
  }> {
    const policies = await this.listPolicies(organizationId);
    const activePolicy =
      policies.find((p) => p.scope_type === 'ORGANIZATION' && p.is_active) ||
      policies[0] || { ...FALLBACK_SCOPED_POLICY, organization_id: organizationId };
    if (!organizationId) {
      return {
        rows: [],
        kpis: {
          scheduledCount: 0,
          checkedInCount: 0,
          workingCount: 0,
          onBreakCount: 0,
          checkedOutCount: 0,
          absentCount: 0,
          missingBreaksCount: 0,
          exceededBreaksCount: 0,
          incompleteBreaksCount: 0,
          openExceptionsCount: 0,
        },
        activePolicy,
        policies,
        shifts: [],
      };
    }

    const [empRes, dailyRes, breaksRes, excRes, otRes, shiftsRes, branchesRes, deptsRes, shiftAssignRes] =
      await Promise.all([
        supabase
          .from('employees')
          .select(
            'id, employee_code, first_name, last_name, display_name, branch_id, department_id, reporting_manager_id, user_id, employment_status'
          )
          .eq('organization_id', organizationId)
          .or('employment_status.is.null,and(employment_status.neq.TERMINATED,employment_status.neq.RESIGNED)'),
        supabase
          .from('attendance_daily')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('attendance_date', attendanceDate),
        supabase
          .from('attendance_break_events')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('attendance_date', attendanceDate)
          .order('started_at', { ascending: true }),
        supabase
          .from('attendance_break_exceptions')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('attendance_date', attendanceDate)
          .order('created_at', { ascending: false }),
        supabase
          .from('overtime_records')
          .select('employee_id, approved_hours, requested_hours, status, payroll_eligible')
          .eq('organization_id', organizationId)
          .eq('attendance_date', attendanceDate),
        supabase
          .from('shifts')
          .select('id, name, code, start_time, end_time, min_full_day_hours')
          .eq('organization_id', organizationId),
        supabase
          .from('branches')
          .select('id, name')
          .eq('organization_id', organizationId),
        supabase
          .from('departments')
          .select('id, name')
          .eq('organization_id', organizationId),
        supabase
          .from('employee_shift_assignments')
          .select('employee_id, shift_id, effective_from, effective_to, valid_from, valid_to')
          .eq('organization_id', organizationId),
      ]);

    if (empRes.error) throw new Error(`Failed to load employees: ${empRes.error.message}`);
    if (dailyRes.error) throw new Error(`Failed to load daily attendance: ${dailyRes.error.message}`);

    const employees = (empRes.data || []) as Record<string, unknown>[];
    const dailyList = (dailyRes.data || []) as Record<string, unknown>[];
    const breakList = (breaksRes.data || []) as PersistedBreakEvent[];
    const exceptionList = ((excRes.data || []) as Record<string, unknown>[]).map((ex) => ({
      ...(ex as unknown as BreakExceptionRow),
      status: String(ex.resolution_status || ex.status || 'OPEN') as BreakExceptionRow['status'],
      details: String(ex.description || ex.details || ''),
    }));
    const otList = (otRes.data || []) as Record<string, unknown>[];
    const shiftsMap = new Map<string, Record<string, unknown>>();
    for (const s of (shiftsRes.data || []) as Record<string, unknown>[]) {
      shiftsMap.set(String(s.id), s);
    }
    const branchesMap = new Map<string, string>();
    for (const b of (branchesRes.data || []) as Record<string, unknown>[]) {
      branchesMap.set(String(b.id), String(b.name || 'Main Branch'));
    }
    const deptsMap = new Map<string, string>();
    for (const d of (deptsRes.data || []) as Record<string, unknown>[]) {
      deptsMap.set(String(d.id), String(d.name || 'Operations'));
    }
    const shiftAssignByEmp = new Map<string, string>();
    for (const sa of (shiftAssignRes.data || []) as Record<string, unknown>[]) {
      const from = String(sa.effective_from || sa.valid_from || '');
      const to = sa.effective_to || sa.valid_to ? String(sa.effective_to || sa.valid_to) : null;
      if ((!from || from <= attendanceDate) && (!to || to >= attendanceDate) && sa.shift_id) {
        shiftAssignByEmp.set(String(sa.employee_id), String(sa.shift_id));
      }
    }

    const dailyByEmp = new Map<string, Record<string, unknown>>();
    for (const d of dailyList) {
      dailyByEmp.set(String(d.employee_id), d);
    }

    const breaksByEmp = new Map<string, PersistedBreakEvent[]>();
    for (const b of breakList) {
      const list = breaksByEmp.get(b.employee_id) || [];
      list.push(b);
      breaksByEmp.set(b.employee_id, list);
    }

    const excByEmp = new Map<string, BreakExceptionRow[]>();
    for (const ex of exceptionList) {
      const list = excByEmp.get(ex.employee_id) || [];
      list.push(ex);
      excByEmp.set(ex.employee_id, list);
    }

    const otByEmp = new Map<string, number>();
    for (const ot of otList) {
      const st = String(ot.status || '').toUpperCase();
      if (st === 'APPROVED' || st === 'PAYABLE') {
        const hrs = Number(ot.approved_hours ?? ot.requested_hours ?? 0);
        const mins = Math.round(hrs * 60);
        otByEmp.set(String(ot.employee_id), (otByEmp.get(String(ot.employee_id)) || 0) + mins);
      }
    }

    const rows: DailyBreakLedgerRow[] = [];
    const kpis: BreakOperationalKpis = {
      scheduledCount: employees.length,
      checkedInCount: 0,
      workingCount: 0,
      onBreakCount: 0,
      checkedOutCount: 0,
      absentCount: 0,
      missingBreaksCount: 0,
      exceededBreaksCount: 0,
      incompleteBreaksCount: 0,
      openExceptionsCount: 0,
    };

    for (const emp of employees) {
      const empId = String(emp.id);
      const daily = dailyByEmp.get(empId);
      const empBreaks = breaksByEmp.get(empId) || [];
      const empExceptions = excByEmp.get(empId) || [];
      const approvedOt = otByEmp.get(empId) || 0;

      const shiftId = daily?.shift_id
        ? String(daily.shift_id)
        : shiftAssignByEmp.get(empId) || null;
      const shift = shiftId ? shiftsMap.get(shiftId) : undefined;
      // Prefer shift-scoped policy, then department/branch, then org default
      const empPolicy =
        (shiftId && policies.find((p) => p.scope_type === 'SHIFT' && p.scope_id === shiftId && p.is_active)) ||
        (emp.department_id && policies.find((p) => p.scope_type === 'DEPARTMENT' && p.scope_id === String(emp.department_id) && p.is_active)) ||
        (emp.branch_id && policies.find((p) => p.scope_type === 'BRANCH' && p.scope_id === String(emp.branch_id) && p.is_active)) ||
        activePolicy;

      const scheduledStart = shift?.start_time ? String(shift.start_time).slice(0, 5) : '09:00';
      const scheduledEnd = shift?.end_time ? String(shift.end_time).slice(0, 5) : '18:00';
      const scheduledMinutes = parseShiftDurationMinutes(scheduledStart, scheduledEnd);
      const shiftMinFullDayHours = Number(shift?.min_full_day_hours ?? 0);
      const expectedNetWorkMinutes =
        shiftMinFullDayHours > 0
          ? Math.min(scheduledMinutes, Math.round(shiftMinFullDayHours * 60))
          : empPolicy.auto_deduct_enabled &&
              scheduledMinutes >= empPolicy.auto_deduct_after_minutes
            ? Math.max(0, scheduledMinutes - empPolicy.auto_deduct_minutes)
            : scheduledMinutes;

      const checkInAt = daily?.first_check_in ? String(daily.first_check_in) : null;
      const checkOutAt = daily?.last_check_out ? String(daily.last_check_out) : null;
      const dbStatus = String(daily?.status || '').toUpperCase();

      const computed = computeWorkHoursWithBreaks({
        grossPresenceMinutes: Number(daily?.gross_presence_minutes ?? 0),
        checkInAt,
        checkOutAt,
        scheduledMinutes: expectedNetWorkMinutes,
        approvedOtMinutes: approvedOt,
        breaks: empBreaks,
        policy: empPolicy,
      });

      const activeBreak = empBreaks.find((b) => b.status === 'ACTIVE' && !b.ended_at);
      let workState: DailyBreakLedgerRow['work_state'] = 'NOT_CHECKED_IN';
      if (dbStatus === 'ON_LEAVE' || dbStatus === 'LEAVE') {
        workState = 'ON_LEAVE';
      } else if (checkInAt && !checkOutAt) {
        workState = activeBreak ? 'ON_BREAK' : 'WORKING';
      } else if (checkInAt && checkOutAt) {
        workState = 'CHECKED_OUT';
      } else if (daily) {
        workState = dbStatus === 'ABSENT' ? 'ABSENT' : 'NOT_CHECKED_IN';
      }

      if (checkInAt) kpis.checkedInCount += 1;
      if (workState === 'WORKING') kpis.workingCount += 1;
      if (workState === 'ON_BREAK') kpis.onBreakCount += 1;
      if (workState === 'CHECKED_OUT') kpis.checkedOutCount += 1;
      if (workState === 'ABSENT' || workState === 'NOT_CHECKED_IN') kpis.absentCount += 1;

      const hasMissing =
        computed.hasMissingLunchException ||
        empExceptions.some((e) => e.exception_type === 'MISSING_MANDATORY_BREAK' && e.status === 'OPEN');
      const hasExceeded =
        computed.hasExceededUnpaidLimit ||
        empExceptions.some(
          (e) =>
            (e.exception_type === 'EXCEEDED_UNPAID_LIMIT' ||
              e.exception_type === 'EXCEEDED_CATEGORY_LIMIT') &&
            e.status === 'OPEN'
        );
      const hasIncomplete =
        Boolean(activeBreak && checkOutAt) ||
        empExceptions.some(
          (e) =>
            (e.exception_type === 'OPEN_BREAK_AT_CHECKOUT' ||
              e.exception_type === 'MISSED_BREAK_END') &&
            e.status === 'OPEN'
        );

      if (hasMissing) kpis.missingBreaksCount += 1;
      if (hasExceeded) kpis.exceededBreaksCount += 1;
      if (hasIncomplete) kpis.incompleteBreaksCount += 1;
      const openExCount = empExceptions.filter((e) => e.status === 'OPEN' || e.status === 'IN_REVIEW').length;
      kpis.openExceptionsCount += openExCount;

      const fullName = String(
        emp.display_name ||
          `${emp.first_name || ''} ${emp.last_name || ''}`.trim() ||
          emp.employee_code ||
          'Employee'
      );
      const deptName = emp.department_id
        ? deptsMap.get(String(emp.department_id)) || 'Operations'
        : 'Operations';
      const branchName = emp.branch_id
        ? branchesMap.get(String(emp.branch_id)) || 'Main Branch'
        : 'Main Branch';

      rows.push({
        id: daily ? String(daily.id) : `${empId}_${attendanceDate}`,
        employee_id: empId,
        employee_code: String(emp.employee_code || 'EMP'),
        employee_name: fullName,
        department: deptName,
        branch_name: branchName,
        shift_id: shiftId,
        shift_name: String(shift?.name || 'General Shift'),
        shift_code: String(shift?.code || 'GEN'),
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        scheduled_minutes: scheduledMinutes,
        expected_net_work_minutes: expectedNetWorkMinutes,
        attendance_date: attendanceDate,
        check_in_at: checkInAt,
        check_out_at: checkOutAt,
        attendance_status: dbStatus || (checkInAt ? 'PRESENT' : 'ABSENT'),
        work_state: workState,
        active_break_category: activeBreak ? activeBreak.break_category : null,
        active_break_started_at: activeBreak ? activeBreak.started_at : null,
        gross_presence_minutes:
          daily?.gross_presence_minutes != null && Number(daily.gross_presence_minutes) > 0
            ? Number(daily.gross_presence_minutes)
            : computed.grossPresenceMinutes,
        paid_break_minutes:
          daily?.paid_break_minutes != null && checkOutAt
            ? Number(daily.paid_break_minutes)
            : computed.paidBreakMinutes,
        unpaid_break_minutes:
          daily?.unpaid_break_minutes != null && checkOutAt
            ? Number(daily.unpaid_break_minutes)
            : computed.unpaidBreakMinutes,
        auto_deducted_break_minutes:
          daily?.auto_deducted_break_minutes != null && checkOutAt
            ? Number(daily.auto_deducted_break_minutes)
            : computed.autoDeductedBreakMinutes,
        net_payable_minutes:
          daily?.net_payable_minutes != null && checkOutAt
            ? Number(daily.net_payable_minutes)
            : computed.netPayableMinutes,
        approved_ot_minutes: approvedOt,
        deficit_minutes: computed.deficitMinutes,
        has_break_exception: openExCount > 0 || Boolean(daily?.has_break_exception),
        policy_id: daily?.break_policy_id ? String(daily.break_policy_id) : empPolicy.id,
        policy_version: Number(daily?.break_policy_version ?? empPolicy.version),
        breaks: empBreaks,
        exceptions: empExceptions,
        steps: computed.steps,
      });
    }

    rows.sort((a, b) => {
      const priority = (s: DailyBreakLedgerRow['work_state']) =>
        s === 'ON_BREAK' ? 0 : s === 'WORKING' ? 1 : s === 'CHECKED_OUT' ? 2 : 3;
      const diff = priority(a.work_state) - priority(b.work_state);
      if (diff !== 0) return diff;
      return a.employee_name.localeCompare(b.employee_name);
    });

    const shifts: ShiftPolicyOption[] = Array.from(shiftsMap.values()).map((s) => ({
      id: String(s.id),
      code: String(s.code || 'SHIFT'),
      name: String(s.name || 'Shift'),
      start_time: String(s.start_time || '09:00').slice(0, 5),
      end_time: String(s.end_time || '18:00').slice(0, 5),
      min_full_day_hours: Number(s.min_full_day_hours ?? 8),
    }));

    return { rows, kpis, activePolicy, policies, shifts };
  }

  async getCorrections(
    organizationId: string,
    employeeId: string,
    attendanceDate: string
  ): Promise<BreakCorrectionRow[]> {
    if (!organizationId || !employeeId) return [];
    const { data, error } = await supabase
      .from('attendance_break_corrections')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('employee_id', employeeId)
      .eq('attendance_date', attendanceDate)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as BreakCorrectionRow[];
  }

  async recordBreakEvent(params: {
    eventType: 'BREAK_START' | 'BREAK_END';
    breakCategory?: BreakCategoryCode;
    source?: string;
    idempotencyKey?: string;
    notes?: string;
    employeeId?: string;
  }) {
    const { data, error } = await supabase.rpc('fn_record_break_event', {
      p_event_type: params.eventType,
      p_break_category: params.breakCategory || null,
      p_source: params.source || 'WEB',
      p_idempotency_key: params.idempotencyKey || crypto.randomUUID(),
      p_device_timestamp: new Date().toISOString(),
      p_notes: params.notes || null,
      p_employee_id: params.employeeId || null,
    });
    if (error) throw error;
    return data;
  }

  async hrCorrectBreakEvent(params: {
    organizationId: string;
    employeeId: string;
    attendanceDate: string;
    actionType:
      | 'ADD_BREAK'
      | 'EDIT_BREAK'
      | 'DELETE_BREAK'
      | 'APPROVE_EXCEPTION'
      | 'WAIVE_EXCEPTION'
      | 'REJECT_EXCEPTION'
      | 'CLOSE_OPEN_BREAK';
    breakCategory?: BreakCategoryCode;
    breakEventId?: string;
    exceptionId?: string;
    newStartedAt?: string;
    newEndedAt?: string;
    reason: string;
    actorId?: string;
    actorName?: string;
  }) {
    const rpcActionMap: Record<string, string> = {
      ADD_BREAK: 'MISSED_BREAK_ADD',
      EDIT_BREAK: 'CORRECTION',
      DELETE_BREAK: 'CORRECTION',
      CLOSE_OPEN_BREAK: 'RESOLVE_ACTIVE',
      APPROVE_EXCEPTION: 'APPROVE_EXCEPTION',
      WAIVE_EXCEPTION: 'APPROVE_EXCEPTION',
      REJECT_EXCEPTION: 'REJECT_EXCEPTION',
    };
    const { data, error } = await supabase.rpc('fn_hr_correct_break_event', {
      p_organization_id: params.organizationId,
      p_employee_id: params.employeeId,
      p_attendance_date: params.attendanceDate,
      p_action_type: rpcActionMap[params.actionType] || params.actionType,
      p_break_category: params.breakCategory || 'LUNCH',
      p_break_event_id: params.breakEventId || null,
      p_exception_id: params.exceptionId || null,
      p_new_started_at: params.newStartedAt || null,
      p_new_ended_at: params.newEndedAt || null,
      p_reason: params.reason,
      p_actor_id: params.actorId || null,
      p_actor_name: params.actorName || 'HR Admin',
    });
    if (error) throw error;
    return data;
  }

  subscribeBreakOperations(organizationId: string, onChange: () => void): () => void {
    if (!organizationId) return () => {};
    const channel = supabase
      .channel(`break_ops_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_break_events',
          filter: `organization_id=eq.${organizationId}`,
        },
        onChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_daily',
          filter: `organization_id=eq.${organizationId}`,
        },
        onChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_break_exceptions',
          filter: `organization_id=eq.${organizationId}`,
        },
        onChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'break_policies',
          filter: `organization_id=eq.${organizationId}`,
        },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const breakWorkHoursService = new BreakWorkHoursService();
