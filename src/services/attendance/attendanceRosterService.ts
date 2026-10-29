     // src/services/attendance/attendanceRosterService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Multi-Tenant Shift, Roster & Attendance Calculation Engine
// Versioned Policies, Effective-Dated Rosters, Multi-Layer Punch Normalization, 9-State Lifecycle
// ============================================================================

import {
  ShiftMaster,
  ShiftType,
  BreakMode,
  EmployeeRosterEntry,
  AttendancePolicy,
  NormalizedPunch,
  AttendanceLedgerRecord,
  AttendanceLifecycleStatus,
  AttendanceExceptionType,
  PolicyAuditLog,
  PolicyImpactAnalysis,
  CalculationExplanation,
  RosterConflict,
} from '../../types/shiftRoster';
import { hrEventBus } from '../hrEventBus';
import { api, isValidUUID, ensureUUID } from '../api';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from './biometricCommandService';
import { notificationService } from '../notification/notificationService';
import { realtimeChannelManager } from '../realtime/realtimeChannelManager';

const STORAGE_KEYS = {
  SHIFTS: 'workforce_shifts_v2',
  ROSTERS: 'workforce_rosters_v2',
  POLICIES: 'workforce_attendance_policies_v2',
  NORMALIZED_PUNCHES: 'workforce_normalized_punches_v2',
  LEDGER: 'workforce_attendance_ledger_v2',
  AUDIT_LOGS: 'workforce_policy_audit_logs_v2',
};

export function getTenantStorageKey(baseKey: string, tenantId = getActiveOrgId()): string {
  return `${baseKey}_${tenantId}`;
}

const _memoryStore = new Map<string, { data: any; raw: string | null }>();

function getStore<T>(baseKey: string, fallback: T, tenantId = getActiveOrgId()): T {
  try {
    const key = getTenantStorageKey(baseKey, tenantId);
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Fallback migration check
      const legacyRaw = localStorage.getItem(baseKey);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          localStorage.setItem(key, legacyRaw);
          _memoryStore.set(key, { data: parsed, raw: legacyRaw });
          return parsed;
        } catch (_) {}
      }
      return fallback;
    }

    const cached = _memoryStore.get(key);
    if (cached && cached.raw === raw) {
      return cached.data as T;
    }

    const parsed = JSON.parse(raw);
    _memoryStore.set(key, { data: parsed, raw });
    return parsed;
  } catch {
    return fallback;
  }
}

function setStore<T>(baseKey: string, val: T, tenantId = getActiveOrgId()): void {
  try {
    const key = getTenantStorageKey(baseKey, tenantId);
    if (typeof localStorage !== 'undefined') {
      const raw = JSON.stringify(val);
      localStorage.setItem(key, raw);
      _memoryStore.set(key, { data: val, raw });
    }
  } catch (err) {
    console.error(`[attendanceRosterService] Storage error for ${baseKey}:`, err);
  }
}

// ============================================================================
// DEFAULT SEED TEMPLATES (Enterprise Catalog)
// ============================================================================

// One-time synchronous startup purge: completely clear legacy contaminated shift & roster items from browser localStorage
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (
        k.startsWith('workforce_shifts') ||
        k.startsWith('workforce_rosters') ||
        k.startsWith('joy_shifts') ||
        k.startsWith('joy_rosters')
      )) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (_) {}
}

const DEFAULT_SHIFTS: ShiftMaster[] = [
  {
    id: 'f847c561-4bbb-4b9f-a2dd-003162897eef',
    tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    shift_code: 'GEN-09',
    shift_name: 'General Corporate Shift',
    description: 'Corporate General Schedule (09:00 - 18:00) with 15 mins late grace and 1 hour lunch break.',
    shift_type: 'FIXED',
    start_time: '09:00',
    end_time: '18:00',
    scheduled_duration_minutes: 540,
    net_working_minutes: 480,
    cross_midnight: false,
    attendance_date_cutoff: '06:00',
    grace_in_minutes: 15,
    grace_out_minutes: 15,
    early_out_tolerance_minutes: 15,
    late_threshold_minutes: 30,
    min_hours_full_day: 8,
    min_hours_half_day: 4,
    break_mode: 'FIXED',
    breaks: [
      { id: 'brk-gen-1', name: 'Lunch Break', start_time: '13:00', end_time: '14:00', duration_minutes: 60, is_paid: false },
    ],
    ot_enabled: true,
    min_ot_threshold_minutes: 30,
    weekday_ot_rate: 1.0,
    weekly_off_ot_rate: 1.5,
    holiday_ot_rate: 2.0,
    max_ot_daily_minutes: 240,
    requires_manager_approval: true,
    requires_hr_approval: false,
    applies_to: { type: 'ORGANIZATION', ids: [] },
    effective_from: '2026-01-01',
    status: 'ACTIVE',
    version: 1,
    created_at: '2026-09-06T08:34:17.931623+00:00',
    updated_at: '2026-09-06T08:34:17.931623+00:00',
  },
  {
    id: 'f5ff5d00-8489-459b-8d8e-d930ecffef22',
    tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    shift_code: 'GEN-10',
    shift_name: 'General Day Shift (Corporate)',
    description: 'Corporate general schedule (09:30 - 18:30) with 15 mins late grace and 1 hour lunch break.',
    shift_type: 'FIXED',
    start_time: '09:30',
    end_time: '18:30',
    scheduled_duration_minutes: 540,
    net_working_minutes: 480,
    cross_midnight: false,
    attendance_date_cutoff: '06:00',
    grace_in_minutes: 15,
    grace_out_minutes: 15,
    early_out_tolerance_minutes: 15,
    late_threshold_minutes: 30,
    min_hours_full_day: 8,
    min_hours_half_day: 4,
    break_mode: 'FIXED',
    breaks: [
      { id: 'brk-gen10-1', name: 'Lunch Break', start_time: '14:00', end_time: '15:00', duration_minutes: 60, is_paid: false },
    ],
    ot_enabled: true,
    min_ot_threshold_minutes: 30,
    weekday_ot_rate: 1.0,
    weekly_off_ot_rate: 1.5,
    holiday_ot_rate: 2.0,
    max_ot_daily_minutes: 240,
    requires_manager_approval: true,
    requires_hr_approval: false,
    applies_to: { type: 'ORGANIZATION', ids: [] },
    effective_from: '2026-01-01',
    status: 'ACTIVE',
    version: 1,
    created_at: '2026-10-16T05:07:19.21577+00:00',
    updated_at: '2026-10-16T05:12:25.393446+00:00',
  },
];

const DEFAULT_POLICIES: AttendancePolicy[] = [
  {
    id: 'pol-corp-001',
    tenant_id: '',
    policy_code: 'ATT-CORP-001',
    policy_name: 'Corporate Standard Attendance Policy',
    description: 'Enterprise corporate policy: 15m grace, 8h full day, 3 lates = 0.5 day deduction, 30m OT threshold.',
    version: 1,
    status: 'ACTIVE',
    effective_from: '2026-01-01',
    general_rules: {
      full_day_hours: 8,
      half_day_hours: 4,
      absent_threshold_hours: 4,
    },
    check_in_rules: {
      grace_minutes: 15,
      late_threshold_minutes: 30,
      action_after_grace: 'LATE',
      early_check_in_allowed_minutes: 60,
    },
    check_out_rules: {
      early_checkout_grace_minutes: 15,
      action_before_allowed: 'EARLY_OUT',
    },
    break_rules: {
      mode: 'FIXED',
      default_break_minutes: 60,
      auto_deduct: true,
      max_breaks_allowed: 2,
    },
    overtime_rules: {
      enabled: true,
      min_threshold_minutes: 30,
      weekday_rate: 1.0,
      weekly_off_rate: 1.5,
      holiday_rate: 2.0,
      max_daily_minutes: 240,
      requires_approval: true,
    },
    late_deduction_rules: {
      late_count_trigger: 3,
      deduction_amount_days: 0.5,
      reset_period: 'MONTHLY',
    },
    missing_punch_rules: {
      auto_exception: true,
      default_penalty: 'REGULARIZATION_REQUIRED',
    },
    night_shift_rules: {
      cutoff_hour: 6,
    },
    regularization_rules: {
      allowed_within_days: 3,
      max_backdated_days: 30,
      requires_reason: true,
      requires_attachment: false,
      approver_role: 'Reporting Manager',
    },
    approval_workflow: {
      levels: [
        { stage: 'Stage 1: Direct Approval', role: 'Reporting Manager', sla_hours: 24 },
        { stage: 'Stage 2: HR Signoff', role: 'HR Administrator', sla_hours: 48 },
      ],
      auto_escalate: true,
      reminder_hours: 12,
    },
    applies_to: { type: 'ORGANIZATION', ids: [] },
    industry_template: 'CORPORATE',
    covered_employees_count: 21,
    work_calendar: {
      working_days: [1, 2, 3, 4, 5],
      weekly_off: [6, 7],
      alternate_saturdays: false,
      holidays_enabled: true,
    },
    shift_resolution: {
      mode: 'FIXED',
      default_shift_id: 'shift-gen-09',
      allow_adaptive_inference: true,
      emergency_override_precedence: true,
      confidence_threshold: 80,
    },
    permission_governance: {
      enabled: true,
      monthly_allowance_minutes: 120,
      threshold_policy: 'POLICY_A_THRESHOLD_CROSSING_DAY',
      excess_handling: 'MARK_EVERY_EXCESS_HALF_DAY',
      auto_consume_late_arrivals: true,
    },
    section_enablement: {
      work_calendar: true,
      shift_rules: true,
      biometric_punch: true,
      grace_late: true,
      breaks_hours: true,
      permissions: true,
      half_day_absence: true,
      overtime: true,
      exceptions_reg: true,
      payroll_notifications: true,
    },
    payroll_integration: {
      enabled: true,
      auto_freeze_days: 28,
      lop_conversion_rate: 1.0,
      payable_on_regularization: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pol-factory-001',
    tenant_id: '',
    policy_code: 'ATT-FACTORY-001',
    policy_name: 'Plant & Manufacturing Shift Attendance Policy',
    description: 'Strict manufacturing rules: 10m grace, punch-based breaks, 1.5x OT multiplier.',
    version: 1,
    status: 'ACTIVE',
    effective_from: '2026-01-01',
    general_rules: {
      full_day_hours: 8,
      half_day_hours: 4,
      absent_threshold_hours: 4,
    },
    check_in_rules: {
      grace_minutes: 10,
      late_threshold_minutes: 20,
      action_after_grace: 'LATE_WITH_DEDUCTION',
      early_check_in_allowed_minutes: 30,
    },
    check_out_rules: {
      early_checkout_grace_minutes: 10,
      action_before_allowed: 'DEDUCTION',
    },
    break_rules: {
      mode: 'PUNCH_BASED',
      default_break_minutes: 30,
      auto_deduct: false,
      max_breaks_allowed: 3,
    },
    overtime_rules: {
      enabled: true,
      min_threshold_minutes: 15,
      weekday_rate: 1.5,
      weekly_off_rate: 2.0,
      holiday_rate: 2.0,
      max_daily_minutes: 180,
      requires_approval: true,
    },
    late_deduction_rules: {
      late_count_trigger: 2,
      deduction_amount_days: 0.5,
      reset_period: 'MONTHLY',
    },
    missing_punch_rules: {
      auto_exception: true,
      default_penalty: 'REGULARIZATION_REQUIRED',
    },
    night_shift_rules: {
      cutoff_hour: 6,
    },
    regularization_rules: {
      allowed_within_days: 3,
      max_backdated_days: 15,
      requires_reason: true,
      requires_attachment: false,
      approver_role: 'Plant Manager',
    },
    approval_workflow: {
      levels: [
        { stage: 'Stage 1: Plant Lead', role: 'Plant Manager', sla_hours: 12 },
        { stage: 'Stage 2: Operations HR', role: 'Operations HR', sla_hours: 24 },
      ],
      auto_escalate: true,
      reminder_hours: 8,
    },
    applies_to: { type: 'DEPARTMENTS', ids: ['Production', 'Manufacturing', 'Assembly'] },
    industry_template: 'MANUFACTURING',
    covered_employees_count: 14,
    work_calendar: {
      working_days: [1, 2, 3, 4, 5, 6],
      weekly_off: [7],
      alternate_saturdays: false,
      holidays_enabled: true,
    },
    shift_resolution: {
      mode: 'ROSTER',
      allow_adaptive_inference: true,
      emergency_override_precedence: true,
      confidence_threshold: 85,
    },
    permission_governance: {
      enabled: true,
      monthly_allowance_minutes: 120,
      threshold_policy: 'POLICY_A_THRESHOLD_CROSSING_DAY',
      excess_handling: 'MARK_EVERY_EXCESS_HALF_DAY',
      auto_consume_late_arrivals: true,
    },
    section_enablement: {
      work_calendar: true,
      shift_rules: true,
      biometric_punch: true,
      grace_late: true,
      breaks_hours: true,
      permissions: true,
      half_day_absence: true,
      overtime: true,
      exceptions_reg: true,
      payroll_notifications: true,
    },
    payroll_integration: {
      enabled: true,
      auto_freeze_days: 28,
      lop_conversion_rate: 1.0,
      payable_on_regularization: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pol-rota-001',
    tenant_id: '',
    policy_code: 'ATT-ROTA-001',
    policy_name: 'Rotating Workforce 24/7 Operations Policy',
    description: 'Continuous 3-shift rotation rules with shift handover window and night differentials.',
    version: 1,
    status: 'DRAFT',
    effective_from: '2026-10-01',
    general_rules: {
      full_day_hours: 8,
      half_day_hours: 4,
      absent_threshold_hours: 4,
    },
    check_in_rules: {
      grace_minutes: 10,
      late_threshold_minutes: 25,
      action_after_grace: 'LATE',
      early_check_in_allowed_minutes: 45,
    },
    check_out_rules: {
      early_checkout_grace_minutes: 15,
      action_before_allowed: 'EARLY_OUT',
    },
    break_rules: {
      mode: 'FIXED',
      default_break_minutes: 45,
      auto_deduct: true,
      max_breaks_allowed: 2,
    },
    overtime_rules: {
      enabled: true,
      min_threshold_minutes: 30,
      weekday_rate: 1.5,
      weekly_off_rate: 2.0,
      holiday_rate: 2.0,
      max_daily_minutes: 240,
      requires_approval: true,
    },
    late_deduction_rules: {
      late_count_trigger: 3,
      deduction_amount_days: 0.5,
      reset_period: 'MONTHLY',
    },
    missing_punch_rules: {
      auto_exception: true,
      default_penalty: 'REGULARIZATION_REQUIRED',
    },
    night_shift_rules: {
      cutoff_hour: 6,
    },
    regularization_rules: {
      allowed_within_days: 3,
      max_backdated_days: 20,
      requires_reason: true,
      requires_attachment: false,
      approver_role: 'Shift Supervisor',
    },
    approval_workflow: {
      levels: [
        { stage: 'Stage 1: Shift Supervisor', role: 'Shift Supervisor', sla_hours: 12 },
        { stage: 'Stage 2: Operations Head', role: 'Operations Head', sla_hours: 24 },
      ],
      auto_escalate: true,
      reminder_hours: 6,
    },
    applies_to: { type: 'EMPLOYEE_GROUPS', ids: ['Shift Line A', 'Shift Line B', 'Shift Line C'] },
    industry_template: 'ROTATING',
    covered_employees_count: 8,
    work_calendar: {
      working_days: [1, 2, 3, 4, 5, 6],
      weekly_off: [7],
      alternate_saturdays: false,
      holidays_enabled: true,
    },
    shift_resolution: {
      mode: 'ADAPTIVE',
      allow_adaptive_inference: true,
      emergency_override_precedence: true,
      confidence_threshold: 80,
    },
    permission_governance: {
      enabled: true,
      monthly_allowance_minutes: 120,
      threshold_policy: 'POLICY_A_THRESHOLD_CROSSING_DAY',
      excess_handling: 'LOG_EXCESS_ONLY',
      auto_consume_late_arrivals: true,
    },
    section_enablement: {
      work_calendar: true,
      shift_rules: true,
      biometric_punch: true,
      grace_late: true,
      breaks_hours: true,
      permissions: true,
      half_day_absence: true,
      overtime: true,
      exceptions_reg: true,
      payroll_notifications: true,
    },
    payroll_integration: {
      enabled: true,
      auto_freeze_days: 28,
      lop_conversion_rate: 1.0,
      payable_on_regularization: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pol-branch-001',
    tenant_id: '',
    policy_code: 'ATT-RETAIL-001',
    policy_name: 'Multi-Branch Retail & Field Operations Policy',
    description: 'Flexible punch window with GPS geofencing and branch-specific holiday calendar.',
    version: 1,
    status: 'SCHEDULED',
    effective_from: '2026-11-01',
    general_rules: {
      full_day_hours: 8,
      half_day_hours: 4,
      absent_threshold_hours: 4,
    },
    check_in_rules: {
      grace_minutes: 20,
      late_threshold_minutes: 40,
      action_after_grace: 'LATE',
      early_check_in_allowed_minutes: 60,
    },
    check_out_rules: {
      early_checkout_grace_minutes: 15,
      action_before_allowed: 'EARLY_OUT',
    },
    break_rules: {
      mode: 'FLEXIBLE',
      default_break_minutes: 60,
      auto_deduct: true,
      max_breaks_allowed: 2,
    },
    overtime_rules: {
      enabled: false,
      min_threshold_minutes: 30,
      weekday_rate: 1.0,
      weekly_off_rate: 1.5,
      holiday_rate: 2.0,
      max_daily_minutes: 120,
      requires_approval: true,
    },
    late_deduction_rules: {
      late_count_trigger: 4,
      deduction_amount_days: 0.5,
      reset_period: 'MONTHLY',
    },
    missing_punch_rules: {
      auto_exception: true,
      default_penalty: 'REGULARIZATION_REQUIRED',
    },
    night_shift_rules: {
      cutoff_hour: 6,
    },
    regularization_rules: {
      allowed_within_days: 5,
      max_backdated_days: 30,
      requires_reason: true,
      requires_attachment: false,
      approver_role: 'Branch Manager',
    },
    approval_workflow: {
      levels: [
        { stage: 'Stage 1: Branch Manager', role: 'Branch Manager', sla_hours: 24 },
      ],
      auto_escalate: false,
      reminder_hours: 24,
    },
    applies_to: { type: 'LOCATIONS', ids: ['Coimbatore Retail Hub', 'Chennai Field Office'] },
    industry_template: 'BRANCH_RETAIL',
    covered_employees_count: 5,
    work_calendar: {
      working_days: [1, 2, 3, 4, 5, 6],
      weekly_off: [7],
      alternate_saturdays: false,
      holidays_enabled: true,
    },
    shift_resolution: {
      mode: 'FLEXIBLE',
      allow_adaptive_inference: true,
      emergency_override_precedence: true,
      confidence_threshold: 75,
    },
    permission_governance: {
      enabled: true,
      monthly_allowance_minutes: 120,
      threshold_policy: 'POLICY_A_THRESHOLD_CROSSING_DAY',
      excess_handling: 'DEDUCT_PAYROLL_HOURS',
      auto_consume_late_arrivals: true,
    },
    section_enablement: {
      work_calendar: true,
      shift_rules: true,
      biometric_punch: true,
      grace_late: true,
      breaks_hours: true,
      permissions: true,
      half_day_absence: true,
      overtime: false,
      exceptions_reg: true,
      payroll_notifications: true,
    },
    payroll_integration: {
      enabled: true,
      auto_freeze_days: 28,
      lop_conversion_rate: 1.0,
      payable_on_regularization: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export interface EmployeeShiftAssignmentEntry {
  id: string;
  employee_id: string;
  employee_code?: string;
  employee_name?: string;
  shift_id: string;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  weekly_offs: number[];
  effective_from?: string;
  effective_to?: string;
  organization_id?: string;
}

class AttendanceRosterService {
  // ==========================================================================
  // 1. SHIFT MASTER CRUD
  // ==========================================================================

  private _dbShiftsCache: ShiftMaster[] = [];
  private _dbRostersCache: Map<string, EmployeeRosterEntry> = new Map();
  private _dbShiftAssignmentsCache: Map<string, EmployeeShiftAssignmentEntry> = new Map();
  private _realtimeSubscribed: boolean = false;
  private _shiftsInFlight: Promise<ShiftMaster[]> | null = null;
  private _shiftAssignmentsInFlight: Promise<Map<string, EmployeeShiftAssignmentEntry>> | null = null;

  constructor() {
    this.initRealtimeSubscription();
    this.fetchShiftsFromDb().catch(() => {});
    this.fetchShiftAssignmentsFromDb().catch(() => {});
  }

  public initRealtimeSubscription(): void {
    if (this._realtimeSubscribed) return;
    this._realtimeSubscribed = true;
    try {
      realtimeChannelManager.subscribeToTable('shifts', () => {
        this._shiftsInFlight = null;
        this.fetchShiftsFromDb().catch(() => {});
      });
      realtimeChannelManager.subscribeToTable('shift_rosters', () => {
        this._dbRostersCache.clear();
        hrEventBus.emit('roster.updated', {});
      });
      realtimeChannelManager.subscribeToTable('employee_shift_assignments', () => {
        this._dbRostersCache.clear();
        this._shiftAssignmentsInFlight = null;
        this.fetchShiftAssignmentsFromDb().catch(() => {});
        hrEventBus.emit('shift.assigned', {});
      });
    } catch (_) {}
  }

  async fetchShiftAssignmentsFromDb(tenantId = getActiveOrgId()): Promise<Map<string, EmployeeShiftAssignmentEntry>> {
    if (!isSupabaseEnabled || !supabase) return this._dbShiftAssignmentsCache;
    if (this._shiftAssignmentsInFlight) return this._shiftAssignmentsInFlight;

    this._shiftAssignmentsInFlight = (async () => {
      try {
        const orgId = isValidUUID(tenantId) ? tenantId : getActiveOrgId();
        const { data, error } = await supabase
          .from('employee_shift_assignments')
          .select('*, shifts(*), employees(id, employee_code, first_name, last_name)');

        if (!error && data && data.length > 0) {
          for (const item of data) {
            const shiftObj = item.shifts;
            const empObj = item.employees;
            const sTime = shiftObj?.start_time ? shiftObj.start_time.slice(0, 5) : '09:00';
            const eTime = shiftObj?.end_time ? shiftObj.end_time.slice(0, 5) : '18:00';
            const empName = empObj ? `${empObj.first_name || ''} ${empObj.last_name || ''}`.trim() : 'Employee';
            const empCode = empObj?.employee_code || '';

            const entry: EmployeeShiftAssignmentEntry = {
              id: item.id,
              employee_id: item.employee_id,
              employee_code: empCode,
              employee_name: empName,
              shift_id: item.shift_id,
              shift_code: shiftObj?.code || 'GEN-09',
              shift_name: shiftObj?.name || 'General Day Shift',
              start_time: sTime,
              end_time: eTime,
              weekly_offs: Array.isArray(item.weekly_offs) ? item.weekly_offs : [0, 6],
              effective_from: item.effective_from || item.valid_from || '2026-01-01',
              effective_to: item.effective_to || item.valid_to,
              organization_id: item.organization_id || orgId,
            };

            if (item.employee_id) {
              this._dbShiftAssignmentsCache.set(String(item.employee_id).toLowerCase(), entry);
            }
            if (empCode) {
              this._dbShiftAssignmentsCache.set(empCode.toLowerCase(), entry);
              const digits = empCode.replace(/\D/g, '');
              if (digits) {
                this._dbShiftAssignmentsCache.set(digits, entry);
                const unpadded = String(parseInt(digits, 10));
                if (unpadded !== digits) {
                  this._dbShiftAssignmentsCache.set(unpadded, entry);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[attendanceRosterService] Error fetching shift assignments from DB:', e);
      } finally {
        setTimeout(() => { this._shiftAssignmentsInFlight = null; }, 5000);
      }
      return this._dbShiftAssignmentsCache;
    })();

    return this._shiftAssignmentsInFlight;
  }

  getShiftAssignments(): Map<string, EmployeeShiftAssignmentEntry> {
    return this._dbShiftAssignmentsCache;
  }

  async fetchShiftsFromDb(tenantId = getActiveOrgId()): Promise<ShiftMaster[]> {
    if (!isSupabaseEnabled) return this.getShifts(tenantId);
    if (this._shiftsInFlight) return this._shiftsInFlight;

    this._shiftsInFlight = (async () => {
      try {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        const seenIds = new Set<string>();
        const seenCodes = new Set<string>();
        const mapped: ShiftMaster[] = [];

        for (const d of data) {
          if (!d.id || seenIds.has(d.id)) continue;
          const codeKey = (d.code || '').toUpperCase();
          if (codeKey && seenCodes.has(codeKey)) continue;
          seenIds.add(d.id);
          if (codeKey) seenCodes.add(codeKey);

          const sTime = (d.start_time || '09:00:00').slice(0, 5);
          const eTime = (d.end_time || '18:00:00').slice(0, 5);
          mapped.push({
            id: d.id,
            tenant_id: d.organization_id || tenantId,
            shift_code: d.code,
            shift_name: d.name,
            description: `${d.name} (${sTime} - ${eTime})`,
            shift_type: (d.is_overnight ? 'NIGHT_SHIFT' : 'FIXED') as any,
            start_time: sTime,
            end_time: eTime,
            scheduled_duration_minutes: this.calculateDurationMinutes(sTime, eTime, d.is_overnight),
            net_working_minutes: (Number(d.min_full_day_hours) || 8) * 60,
            cross_midnight: Boolean(d.is_overnight),
            attendance_date_cutoff: '06:00',
            grace_in_minutes: d.grace_entry_minutes ?? 15,
            grace_out_minutes: d.grace_exit_minutes ?? 15,
            early_out_tolerance_minutes: 15,
            late_threshold_minutes: 30,
            min_hours_full_day: Number(d.min_full_day_hours) || 8,
            min_hours_half_day: Number(d.min_half_day_hours) || 4,
            break_mode: 'FIXED',
            breaks: [
              { id: `brk-${d.id}`, name: 'Lunch Break', start_time: '13:00', end_time: '14:00', duration_minutes: 60, is_paid: false }
            ],
            ot_enabled: true,
            min_ot_threshold_minutes: 30,
            weekday_ot_rate: 1.0,
            weekly_off_ot_rate: 1.5,
            holiday_ot_rate: 2.0,
            max_ot_daily_minutes: 240,
            requires_manager_approval: true,
            requires_hr_approval: false,
            applies_to: { type: 'ORGANIZATION', ids: [] },
            effective_from: '2026-01-01',
            status: d.is_active ? 'ACTIVE' : 'INACTIVE',
            version: 1,
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || new Date().toISOString(),
          });
        }

        if (mapped.length > 0) {
          this._dbShiftsCache = mapped;
          return mapped;
        }
      }
    } catch (e) {
      console.warn('[attendanceRosterService] Error fetching shifts from DB:', e);
    } finally {
      setTimeout(() => { this._shiftsInFlight = null; }, 5000);
    }
    return this.getShifts(tenantId);
    })();

    return this._shiftsInFlight;
  }

  getShifts(tenantId = getActiveOrgId()): ShiftMaster[] {
    if (this._dbShiftsCache && this._dbShiftsCache.length > 0) {
      return this._dbShiftsCache;
    }
    if (isSupabaseEnabled) {
      this.fetchShiftsFromDb(tenantId).catch(() => {});
      return DEFAULT_SHIFTS.map(s => ({ ...s, tenant_id: tenantId }));
    }
    const list = getStore<ShiftMaster[]>(STORAGE_KEYS.SHIFTS, [], tenantId);
    if (!list || list.length === 0) {
      const tenantShifts = DEFAULT_SHIFTS.map(s => ({ ...s, tenant_id: tenantId }));
      setStore(STORAGE_KEYS.SHIFTS, tenantShifts, tenantId);
      return tenantShifts;
    }
    return list;
  }

  getShiftById(shiftId?: string | null, tenantId = getActiveOrgId()): ShiftMaster | null {
    if (!shiftId) return null;
    const shifts = this.getShifts(tenantId);
    const cleaned = String(shiftId).trim();
    const lower = cleaned.toLowerCase();

    // 1. Direct match by id or shift_code
    let match = shifts.find(s => s.id === cleaned || s.shift_code === cleaned);
    if (match) return match;

    // 2. Case-insensitive id or code
    match = shifts.find(s => s.id.toLowerCase() === lower || s.shift_code.toLowerCase() === lower);
    if (match) return match;

    // 3. Known ID Alias Mapping
    const aliasMap: Record<string, string> = {
      'shift-general-01': 'f847c561-4bbb-4b9f-a2dd-003162897eef',
      'shift-gen-09': 'f847c561-4bbb-4b9f-a2dd-003162897eef',
      'f847c561-4bbb-4b9f-a2dd-003162897eef': 'f847c561-4bbb-4b9f-a2dd-003162897eef',
      'shift-gen-10': 'f5ff5d00-8489-459b-8d8e-d930ecffef22',
      'f5ff5d00-8489-459b-8d8e-d930ecffef22': 'f5ff5d00-8489-459b-8d8e-d930ecffef22',
      'shift-morning-02': 'shift-mor-06',
      'shift-mor-06': 'shift-morning-02',
      'shift-evening-03': 'shift-eve-14',
      'shift-eve-14': 'shift-evening-03',
      'shift-night-04': 'shift-ngt-22',
      'shift-ngt-22': 'shift-night-04',
      'gen-09': 'f847c561-4bbb-4b9f-a2dd-003162897eef',
      'gen-10': 'f5ff5d00-8489-459b-8d8e-d930ecffef22',
      'mor-06': 'shift-mor-06',
      'eve-14': 'shift-eve-14',
      'ngt-22': 'shift-ngt-22',
    };
    const targetAlias = aliasMap[lower];
    if (targetAlias) {
      match = shifts.find(s => s.id.toLowerCase() === targetAlias.toLowerCase() || s.shift_code.toLowerCase() === targetAlias.toLowerCase());
      if (match) return match;
    }

    // 4. Name or keyword match
    match = shifts.find(s => {
      const sName = s.shift_name.toLowerCase();
      const sCode = s.shift_code.toLowerCase();
      if (lower.includes('morning') && (sCode.includes('mor') || sName.includes('morning'))) return true;
      if (lower.includes('evening') && (sCode.includes('eve') || sName.includes('evening'))) return true;
      if (lower.includes('night') && (sCode.includes('ngt') || sName.includes('night'))) return true;
      if (lower.includes('offshore') && (sCode.includes('ngt') || sName.includes('offshore'))) return true;
      if (lower.includes('gen-10') && (sCode === 'gen-10' || sName.includes('gen-10') || sName.includes('corporate )'))) return true;
      if (lower.includes('general') && (sCode.includes('gen') || sName.includes('general'))) return true;
      return sName.includes(lower) || lower.includes(sName);
    });
    if (match) return match;

    // 5. Fallback
    return shifts[0] || DEFAULT_SHIFTS[0] || null;
  }

  saveShift(
    payload: Omit<ShiftMaster, 'id' | 'created_at' | 'updated_at' | 'version'> & { id?: string },
    actorName = 'HR Administrator'
  ): ShiftMaster {
    const tenantId = payload.tenant_id || getActiveOrgId();
    const shifts = this.getShifts(tenantId);

    const scheduledMins = this.calculateDurationMinutes(payload.start_time, payload.end_time, payload.cross_midnight);
    const breakMins = (payload.breaks || []).reduce((acc, b) => acc + (b.duration_minutes || 0), 0);
    const netMins = Math.max(0, scheduledMins - breakMins);

    if (payload.id) {
      const idx = shifts.findIndex(s => s.id === payload.id);
      if (idx !== -1) {
        const oldShift = shifts[idx];
        const updated: ShiftMaster = {
          ...oldShift,
          ...payload,
          id: payload.id,
          tenant_id: tenantId,
          scheduled_duration_minutes: scheduledMins,
          net_working_minutes: netMins,
          version: oldShift.version + 1,
          updated_at: new Date().toISOString(),
        };
        shifts[idx] = updated;
        setStore(STORAGE_KEYS.SHIFTS, shifts, tenantId);

        this.logAudit({
          tenant_id: tenantId,
          actor_name: actorName,
          actor_role: 'HR Admin',
          entity_type: 'SHIFT',
          entity_id: updated.id,
          entity_name: updated.shift_name,
          change_summary: `Updated shift ${updated.shift_code} (${updated.start_time} - ${updated.end_time}). Version ${updated.version}`,
          previous_value: oldShift,
          new_value: updated,
          timestamp: new Date().toISOString(),
        });

        this.syncShiftToDb(updated);
        hrEventBus.emit('shift.updated', { shift: updated });
        return updated;
      }
    }

    // Create New Shift
    const newShift: ShiftMaster = {
      ...payload,
      id: `shift-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      tenant_id: tenantId,
      scheduled_duration_minutes: scheduledMins,
      net_working_minutes: netMins,
      version: 1,
      status: payload.status || 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    shifts.unshift(newShift);
    setStore(STORAGE_KEYS.SHIFTS, shifts, tenantId);

    this.logAudit({
      tenant_id: tenantId,
      actor_name: actorName,
      actor_role: 'HR Admin',
      entity_type: 'SHIFT',
      entity_id: newShift.id,
      entity_name: newShift.shift_name,
      change_summary: `Created shift ${newShift.shift_code} (${newShift.start_time} - ${newShift.end_time})`,
      new_value: newShift,
      timestamp: new Date().toISOString(),
    });

    this.syncShiftToDb(newShift);
    hrEventBus.emit('shift.created', { shift: newShift });
    return newShift;
  }

  public async syncShiftToDb(shift: ShiftMaster): Promise<{ success: boolean; data?: any; error?: any }> {
    if (!isSupabaseEnabled || !supabase) return { success: true };
    try {
      const tenantId = shift.tenant_id || getActiveOrgId();
      const sTime = shift.start_time.length === 5 ? `${shift.start_time}:00` : shift.start_time;
      const eTime = shift.end_time.length === 5 ? `${shift.end_time}:00` : shift.end_time;
      const shiftUUID = isValidUUID(shift.id) ? shift.id : undefined;

      const record: any = {
        name: shift.shift_name,
        code: shift.shift_code,
        start_time: sTime,
        end_time: eTime,
        grace_entry_minutes: shift.grace_in_minutes || 15,
        grace_exit_minutes: shift.grace_out_minutes || 15,
        min_half_day_hours: shift.min_hours_half_day || 4,
        min_full_day_hours: shift.min_hours_full_day || 8,
        is_overnight: Boolean(shift.cross_midnight),
        is_active: shift.status !== 'INACTIVE',
        organization_id: isValidUUID(tenantId) ? tenantId : getActiveOrgId(),
      };
      if (shiftUUID) record.id = shiftUUID;

      const { data, error } = await supabase
        .from('shifts')
        .upsert(record, { onConflict: 'organization_id,code' })
        .select();

      if (error) {
        console.warn('[attendanceRosterService] syncShiftToDb warning:', error);
        return { success: false, error };
      }

      // If Supabase returned a generated UUID for a new shift, update cache id
      if (data && data[0]?.id && (!shiftUUID || shift.id !== data[0].id)) {
        shift.id = data[0].id;
        if (this._dbShiftsCache) {
          const matchIdx = this._dbShiftsCache.findIndex(s => s.shift_code === shift.shift_code);
          if (matchIdx !== -1) {
            this._dbShiftsCache[matchIdx].id = data[0].id;
          }
        }
      }

      // Invalidate in-flight and refresh cache
      this._shiftsInFlight = null;
      return { success: true, data: data?.[0] };
    } catch (e: any) {
      console.warn('[attendanceRosterService] syncShiftToDb error:', e);
      return { success: false, error: e };
    }
  }

  deleteShift(shiftId: string, actorName = 'HR Administrator'): { success: boolean; message: string } {
    const tenantId = getActiveOrgId();
    const shifts = this.getShifts(tenantId);
    const target = shifts.find(s => s.id === shiftId);
    if (!target) return { success: false, message: 'Shift not found' };

    // Safety Check: Check if shift is actively used in roster
    const rosters = this.getRosters('2026-01-01', '2026-12-31', tenantId);
    const inUseCount = rosters.filter(r => r.shift_id === shiftId).length;

    if (inUseCount > 0) {
      target.status = 'INACTIVE';
      target.updated_at = new Date().toISOString();
      setStore(STORAGE_KEYS.SHIFTS, shifts, tenantId);
      this.syncShiftToDb(target).catch(() => {});
      return {
        success: true,
        message: `Shift has ${inUseCount} historical roster assignments. It has been deactivated instead of deleted to protect attendance records.`,
      };
    }

    const filtered = shifts.filter(s => s.id !== shiftId);
    setStore(STORAGE_KEYS.SHIFTS, filtered, tenantId);
    if (this._dbShiftsCache) {
      this._dbShiftsCache = this._dbShiftsCache.filter(s => s.id !== shiftId);
    }

    // Sync deletion to Supabase
    if (isSupabaseEnabled && supabase) {
      if (isValidUUID(shiftId)) {
        Promise.resolve(supabase.from('shifts').delete().eq('id', shiftId)).catch(() => {});
      } else if (target.shift_code) {
        Promise.resolve(supabase.from('shifts').delete().eq('code', target.shift_code)).catch(() => {});
      }
    }

    this.logAudit({
      tenant_id: tenantId,
      actor_name: actorName,
      actor_role: 'HR Admin',
      entity_type: 'SHIFT',
      entity_id: shiftId,
      entity_name: target.shift_name,
      change_summary: `Deleted shift ${target.shift_code}`,
      previous_value: target,
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: `Shift ${target.shift_code} deleted permanently.` };
  }

  // ==========================================================================
  // 2. EMPLOYEE SHIFT ROSTER RESOLVER & BULK ALLOCATOR
  // ==========================================================================

  async fetchRostersFromDb(startDate: string, endDate: string, tenantId = getActiveOrgId()): Promise<EmployeeRosterEntry[]> {
    this.initRealtimeSubscription();
    this.fetchShiftAssignmentsFromDb(tenantId).catch(() => {});
    if (!isSupabaseEnabled || !supabase) return this.getRosters(startDate, endDate, tenantId);
    try {
      const orgId = isValidUUID(tenantId) ? tenantId : getActiveOrgId();
      const { data, error } = await supabase
        .from('shift_rosters')
        .select('*')
        .eq('organization_id', orgId)
        .gte('roster_date', startDate)
        .lte('roster_date', endDate)
        .order('roster_date', { ascending: true });

      if (!error && data) {
        const mapped: EmployeeRosterEntry[] = data.map((d: any) => ({
          id: d.id,
          tenant_id: d.organization_id || orgId,
          employee_id: d.employee_id,
          employee_code: d.employee_code || '',
          employee_name: d.employee_name || 'Employee',
          date: d.roster_date,
          shift_id: d.shift_id,
          shift_code: d.shift_code,
          shift_name: d.shift_name,
          shift_type: (d.shift_code?.includes('NGT') ? 'NIGHT_SHIFT' : 'FIXED') as any,
          is_weekly_off: Boolean(d.is_weekly_off),
          is_holiday: Boolean(d.is_holiday),
          is_override: Boolean(d.is_override),
          override_reason: d.remarks || undefined,
          assigned_by: d.assigned_by || 'System',
          updated_at: d.updated_at || new Date().toISOString(),
        }));

        for (const entry of mapped) {
          this._dbRostersCache.set(`${entry.employee_id}_${entry.date}`, entry);
          this._dbRostersCache.set(`${String(entry.employee_id).toLowerCase()}_${entry.date}`, entry);
          if (entry.employee_code) {
            this._dbRostersCache.set(`${entry.employee_code}_${entry.date}`, entry);
            this._dbRostersCache.set(`${entry.employee_code.toLowerCase()}_${entry.date}`, entry);
            const digits = entry.employee_code.replace(/\D/g, '');
            if (digits) {
              this._dbRostersCache.set(`${digits}_${entry.date}`, entry);
              const unpadded = String(parseInt(digits, 10));
              if (unpadded !== digits) {
                this._dbRostersCache.set(`${unpadded}_${entry.date}`, entry);
              }
            }
          }
        }
        return mapped;
      }
    } catch (e) {
      console.warn('[attendanceRosterService] fetchRostersFromDb notice:', e);
    }
    return this.getRosters(startDate, endDate, tenantId);
  }

  getRosters(startDate: string, endDate: string, tenantId = getActiveOrgId()): EmployeeRosterEntry[] {
    if (this._dbRostersCache.size > 0) {
      const cached = Array.from(new Set(this._dbRostersCache.values())).filter(
        r => r.date >= startDate && r.date <= endDate
      );
      if (cached.length > 0) return cached;
    }
    const list = getStore<EmployeeRosterEntry[]>(STORAGE_KEYS.ROSTERS, [], tenantId);
    return list.filter(r => r.date >= startDate && r.date <= endDate);
  }

  getRosterForEmployeeOnDate(
    employeeId: string,
    date: string,
    tenantId = getActiveOrgId(),
    employeeObj?: any
  ): EmployeeRosterEntry {
    const orgId = isValidUUID(tenantId) ? tenantId : getActiveOrgId();
    const rawId = String(employeeId || '').trim();
    const cleanId = rawId.toLowerCase();
    const digits = cleanId.replace(/\D/g, '');
    const unpadded = digits ? String(parseInt(digits, 10)) : '';

    // 1. Check in-memory DB roster cache (direct UUID, lowercase, code, or digits)
    const cacheKeys = [
      `${rawId}_${date}`,
      `${cleanId}_${date}`,
      digits ? `${digits}_${date}` : '',
      unpadded ? `${unpadded}_${date}` : '',
      employeeObj?.employee_code ? `${employeeObj.employee_code.toLowerCase()}_${date}` : '',
    ].filter(Boolean);

    for (const key of cacheKeys) {
      if (this._dbRostersCache.has(key)) {
        return this._dbRostersCache.get(key)!;
      }
    }

    // 2. Authoritative Database Shift Assignment check (from Supabase PostgreSQL employee_shift_assignments)
    let dbAssignment = this._dbShiftAssignmentsCache.get(cleanId);
    if (!dbAssignment && employeeObj?.id) {
      dbAssignment = this._dbShiftAssignmentsCache.get(String(employeeObj.id).toLowerCase());
    }
    if (!dbAssignment && employeeObj?.employee_code) {
      dbAssignment = this._dbShiftAssignmentsCache.get(String(employeeObj.employee_code).toLowerCase());
    }
    if (!dbAssignment && digits) {
      dbAssignment = this._dbShiftAssignmentsCache.get(digits) || (unpadded ? this._dbShiftAssignmentsCache.get(unpadded) : undefined);
    }

    // 3. Check for specific daily override in storage (if any)
    const list = getStore<EmployeeRosterEntry[]>(STORAGE_KEYS.ROSTERS, [], orgId);
    const match = list.find(r => 
      (r.employee_id === rawId || r.employee_code === rawId || (digits && r.employee_code?.replace(/\D/g, '') === digits)) &&
      r.date === date
    );
    if (match && match.is_override) return match;

    // 4. Resolve shift definition with priority:
    //    dbAssignment -> employee profile -> roster match -> default
    const assignedShiftId =
      dbAssignment?.shift_id ||
      employeeObj?.employment?.shift_id ||
      employeeObj?.shift_id ||
      employeeObj?.profile?.shift_id ||
      employeeObj?.employment?.shift_code ||
      employeeObj?.shift_code ||
      employeeObj?.employment?.shift_name ||
      employeeObj?.shift_name;

    const resolvedShift = (assignedShiftId ? this.getShiftById(assignedShiftId, orgId) : null) ||
      (match ? this.getShiftById(match.shift_id, orgId) : null) ||
      (dbAssignment ? this.getShiftById(dbAssignment.shift_id, orgId) : null) ||
      this.getShifts(orgId)[0] ||
      DEFAULT_SHIFTS[0];

    const dayOfWeek = new Date(date).getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dbAssignment
      ? dbAssignment.weekly_offs.includes(dayOfWeek)
      : (match ? match.is_weekly_off : (dayOfWeek === 0 || dayOfWeek === 6));

    const empName = employeeObj?.display_name || employeeObj?.name || `${employeeObj?.first_name || ''} ${employeeObj?.last_name || ''}`.trim() || dbAssignment?.employee_name || match?.employee_name || 'Employee';
    const empCode = employeeObj?.employee_code || dbAssignment?.employee_code || match?.employee_code || (digits ? `JCS-${digits.padStart(3, '0')}` : `EMP-001`);

    const generated: EmployeeRosterEntry = {
      id: match?.id || `roster-dyn-${employeeId}-${date}`,
      tenant_id: orgId,
      employee_id: dbAssignment?.employee_id || (isValidUUID(rawId) ? rawId : (employeeObj?.id || employeeId)),
      employee_code: empCode,
      employee_name: empName,
      date,
      shift_id: resolvedShift.id,
      shift_code: resolvedShift.shift_code,
      shift_name: resolvedShift.shift_name,
      shift_type: resolvedShift.shift_type,
      is_weekly_off: match ? match.is_weekly_off : isWeekend,
      is_holiday: match ? match.is_holiday : false,
      is_override: false,
      assigned_by: dbAssignment ? 'Database Canonical Shift Assignment' : (employeeObj ? 'Employee Profile Assignment' : (match?.assigned_by || 'System Auto-Default')),
      updated_at: new Date().toISOString(),
    };

    this._dbRostersCache.set(cacheKeys[0], generated);
    if (cacheKeys[1]) this._dbRostersCache.set(cacheKeys[1], generated);
    if (empCode) {
      this._dbRostersCache.set(`${empCode}_${date}`, generated);
      this._dbRostersCache.set(`${empCode.toLowerCase()}_${date}`, generated);
    }
    if (digits) {
      this._dbRostersCache.set(`${digits}_${date}`, generated);
    }
    return generated;
  }

  async bulkAssignRoster(payload: {
    employeeIds: string[];
    startDate: string;
    endDate: string;
    shiftId: string;
    weeklyOffDays?: number[]; // [0, 6] = Sun, Sat
    assignedBy?: string;
  }): Promise<{ assignedCount: number; conflicts: string[]; success: boolean }> {
    const tenantId = getActiveOrgId();
    const activeComp = api.getActiveCompany();
    const companyId = activeComp?.id || null;
    const shift = this.getShiftById(payload.shiftId, tenantId) || this.getShifts(tenantId)[0];
    const weeklyOffs = new Set(payload.weeklyOffDays ?? [0, 6]);
    const assignedBy = payload.assignedBy || 'HR Admin';

    let assignedCount = 0;
    const conflicts: string[] = [];
    const newEntries: EmployeeRosterEntry[] = [];

    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const isOff = weeklyOffs.has(dayOfWeek);

      for (const empId of payload.employeeIds) {
        const key = `${empId}_${dateStr}`;
        const newEntry: EmployeeRosterEntry = {
          id: `roster-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          tenant_id: tenantId,
          employee_id: empId,
          employee_code: `EMP-${empId.replace(/\D/g, '') || '001'}`,
          employee_name: 'Employee',
          date: dateStr,
          shift_id: shift.id,
          shift_code: shift.shift_code,
          shift_name: shift.shift_name,
          shift_type: shift.shift_type,
          is_weekly_off: isOff,
          is_holiday: false,
          is_override: true,
          assigned_by: assignedBy,
          updated_at: new Date().toISOString(),
        };

        newEntries.push(newEntry);
        this._dbRostersCache.set(key, newEntry);
        this._dbRostersCache.set(`${String(empId).toLowerCase()}_${dateStr}`, newEntry);
        assignedCount++;
      }
    }

    // 1. PostgreSQL Stored Procedure & Table Upsert Execution (Multi-Tenant Production DB)
    if (isSupabaseEnabled && supabase) {
      try {
        await supabase.rpc('fn_bulk_assign_shift_roster', {
          p_org_id: tenantId,
          p_company_id: companyId,
          p_employee_ids: payload.employeeIds,
          p_start_date: payload.startDate,
          p_end_date: payload.endDate,
          p_shift_id: shift.id,
          p_weekly_off_days: Array.from(weeklyOffs),
          p_assigned_by: assignedBy,
        });
      } catch (e) {
        console.warn('[attendanceRosterService] RPC error (falling back to direct table upsert):', e);
      }

      // Direct Table Upsert guarantee: persist all generated roster entries into public.shift_rosters
      try {
        await this.syncRosterEntriesToDb(newEntries);
      } catch (e) {
        console.warn('[attendanceRosterService] syncRosterEntriesToDb error:', e);
      }

      // Canonical employee_shift_assignments sync for each employee
      for (const empId of payload.employeeIds) {
        if (isValidUUID(empId) && isValidUUID(shift.id)) {
          try {
            await supabase.from('employee_shift_assignments').upsert({
              organization_id: tenantId,
              company_id: companyId,
              employee_id: empId,
              shift_id: shift.id,
              weekly_offs: Array.from(weeklyOffs),
              effective_from: payload.startDate,
              valid_from: payload.startDate,
            }, { onConflict: 'employee_id' });
          } catch (e) {
            console.warn('[attendanceRosterService] Shift assignment upsert notice:', e);
          }
        }
      }

      // Realtime Outbox event emission
      try {
        await supabase.from('realtime_outbox').insert({
          tenant_id: tenantId,
          organization_id: tenantId,
          event_type: 'roster.bulk_assigned',
          entity_type: 'ROSTER',
          entity_id: shift.shift_code,
          payload: {
            shift_code: shift.shift_code,
            shift_name: shift.shift_name,
            employee_ids: payload.employeeIds,
            start_date: payload.startDate,
            end_date: payload.endDate,
            count: assignedCount,
            updated_at: new Date().toISOString(),
          }
        });
      } catch (_) {}
    }

    // Refresh shift assignments cache from DB
    await this.fetchShiftAssignmentsFromDb(tenantId).catch(() => {});

    hrEventBus.emit('roster.bulk_assigned', {
      shiftCode: shift.shift_code,
      count: assignedCount,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });

    return { assignedCount, conflicts, success: true };
  }

  async setShiftOverride(
    employeeId: string,
    date: string,
    newShiftId: string,
    reason: string,
    actorName = 'HR Administrator'
  ): Promise<EmployeeRosterEntry> {
    const tenantId = getActiveOrgId();
    const activeComp = api.getActiveCompany();
    const shift = this.getShiftById(newShiftId, tenantId) || this.getShifts(tenantId)[0];

    const newEntry: EmployeeRosterEntry = {
      id: `roster-ovr-${Date.now()}`,
      tenant_id: tenantId,
      employee_id: employeeId,
      employee_code: `EMP-${employeeId.replace(/\D/g, '') || '001'}`,
      employee_name: 'Employee',
      date,
      shift_id: shift.id,
      shift_code: shift.shift_code,
      shift_name: shift.shift_name,
      shift_type: shift.shift_type,
      is_weekly_off: false,
      is_holiday: false,
      is_override: true,
      override_reason: reason,
      assigned_by: actorName,
      updated_at: new Date().toISOString(),
    };

    this._dbRostersCache.set(`${employeeId}_${date}`, newEntry);
    this._dbRostersCache.set(`${String(employeeId).toLowerCase()}_${date}`, newEntry);

    // Upsert directly into Supabase shift_rosters table
    if (isSupabaseEnabled && supabase && isValidUUID(tenantId) && isValidUUID(employeeId) && isValidUUID(shift.id)) {
      try {
        await supabase.from('shift_rosters').upsert({
          organization_id: tenantId,
          company_id: activeComp?.id || null,
          employee_id: employeeId,
          roster_date: date,
          shift_id: shift.id,
          shift_code: shift.shift_code,
          shift_name: shift.shift_name,
          is_weekly_off: false,
          is_holiday: false,
          is_override: true,
          assigned_by: actorName,
          remarks: reason,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id,employee_id,roster_date' });
      } catch (e) {
        console.warn('[attendanceRosterService] setShiftOverride DB upsert error:', e);
      }
    }

    hrEventBus.emit('roster.updated', { entry: newEntry });
    return newEntry;
  }

  detectRosterConflicts(startDate: string, endDate: string, tenantId = getActiveOrgId()): RosterConflict[] {
    const rosters = this.getRosters(startDate, endDate, tenantId);
    const shifts = this.getShifts(tenantId);
    const conflicts: RosterConflict[] = [];

    // Group by employee
    const byEmp = new Map<string, EmployeeRosterEntry[]>();
    for (const r of rosters) {
      if (!byEmp.has(r.employee_id)) byEmp.set(r.employee_id, []);
      byEmp.get(r.employee_id)!.push(r);
    }

    for (const [empId, empRosters] of byEmp.entries()) {
      empRosters.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (let i = 0; i < empRosters.length - 1; i++) {
        const curr = empRosters[i];
        const next = empRosters[i + 1];

        // Check Night Shift immediately followed by Morning Shift on next day
        if (curr.shift_code.includes('NGT') && next.shift_code.includes('MOR')) {
          conflicts.push({
            id: `conf-rest-${empId}-${curr.date}`,
            employee_id: empId,
            employee_name: curr.employee_name,
            department_name: curr.department_name,
            date: next.date,
            type: 'REST_PERIOD_VIOLATION',
            severity: 'CRITICAL',
            description: `Night shift on ${curr.date} (ends 06:00 AM) immediately followed by Morning shift on ${next.date} (starts 06:00 AM). Rest period is 0 hours (Minimum required: 11 hours).`,
            scheduled_shift: `${curr.shift_code} → ${next.shift_code}`,
            suggested_fix: `Assign Rest Day (OFF) or Evening Shift on ${next.date}.`,
          });
        }
      }
    }

    return conflicts;
  }

  async generateRotationalRoster(payload: {
    employeeIds: string[];
    patternShifts: string[]; // ['shift-mor-06', 'shift-eve-14', 'shift-ngt-22']
    cycleWeeks: number;
    startDate: string;
    endDate: string;
    weeklyOffDays?: number[];
    teamOffsets?: Record<string, number>;
  }): Promise<{ assignedCount: number }> {
    const tenantId = getActiveOrgId();
    const allShifts = this.getShifts(tenantId);
    const weeklyOffs = new Set(payload.weeklyOffDays ?? [0, 6]);

    let assignedCount = 0;
    const entries: EmployeeRosterEntry[] = [];

    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);

    for (let empIdx = 0; empIdx < payload.employeeIds.length; empIdx++) {
      const empId = payload.employeeIds[empIdx];
      const offset = payload.teamOffsets?.[empId] ?? (empIdx % payload.patternShifts.length);

      let dayIndex = 0;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        const isOff = weeklyOffs.has(dayOfWeek);

        // Compute which shift in rotation applies
        const weekNum = Math.floor(dayIndex / 7);
        const shiftIndex = (weekNum + offset) % payload.patternShifts.length;
        const targetShiftId = payload.patternShifts[shiftIndex];
        const targetShift = allShifts.find(s => s.id === targetShiftId) || allShifts[0];

        const newEntry: EmployeeRosterEntry = {
          id: `roster-rot-${empId}-${dateStr}`,
          tenant_id: tenantId,
          employee_id: empId,
          employee_code: `EMP-${empId.replace(/\D/g, '') || '001'}`,
          employee_name: 'Employee',
          date: dateStr,
          shift_id: targetShift.id,
          shift_code: targetShift.shift_code,
          shift_name: targetShift.shift_name,
          shift_type: targetShift.shift_type,
          is_weekly_off: isOff,
          is_holiday: false,
          is_override: false,
          assigned_by: 'Auto-Rotate Engine',
          updated_at: new Date().toISOString(),
        };

        entries.push(newEntry);
        this._dbRostersCache.set(`${empId}_${dateStr}`, newEntry);
        assignedCount++;
        dayIndex++;
      }
    }

    await this.syncRosterEntriesToDb(entries);

    return { assignedCount };
  }

  async copySchedule(payload: {
    sourceStartDate: string;
    sourceEndDate: string;
    targetStartDate: string;
    employeeIds: string[];
  }): Promise<{ copiedCount: number }> {
    const tenantId = getActiveOrgId();
    // Fetch source entries from DB
    const sourceEntries = await this.fetchRostersFromDb(payload.sourceStartDate, payload.sourceEndDate, tenantId);
    const filteredSource = sourceEntries.filter(
      r => payload.employeeIds.includes(r.employee_id)
    );

    const sourceStart = new Date(payload.sourceStartDate).getTime();
    const targetStart = new Date(payload.targetStartDate).getTime();
    const timeDelta = targetStart - sourceStart;

    const newEntries: EmployeeRosterEntry[] = [];
    for (const src of filteredSource) {
      const srcDate = new Date(src.date).getTime();
      const newTargetDate = new Date(srcDate + timeDelta).toISOString().split('T')[0];

      const copyEntry: EmployeeRosterEntry = {
        ...src,
        id: `roster-cp-${src.employee_id}-${newTargetDate}`,
        date: newTargetDate,
        assigned_by: 'Schedule Copy Tool',
        updated_at: new Date().toISOString(),
      };
      newEntries.push(copyEntry);
      this._dbRostersCache.set(`${src.employee_id}_${newTargetDate}`, copyEntry);
    }

    await this.syncRosterEntriesToDb(newEntries);

    return { copiedCount: newEntries.length };
  }

  // ==========================================================================
  // 3. ATTENDANCE POLICY VERSIONING & IMPACT ANALYSIS
  // ==========================================================================

  getPolicies(tenantId = getActiveOrgId()): AttendancePolicy[] {
    const list = getStore<AttendancePolicy[]>(STORAGE_KEYS.POLICIES, [], tenantId);
    if (!list || list.length === 0) {
      const tenantPolicies = DEFAULT_POLICIES.map(p => ({ ...p, tenant_id: tenantId }));
      setStore(STORAGE_KEYS.POLICIES, tenantPolicies, tenantId);
      return tenantPolicies;
    }
    let modified = false;
    DEFAULT_POLICIES.forEach(dp => {
      const existing = list.find(p => p.policy_code === dp.policy_code);
      if (!existing) {
        list.push({ ...dp, tenant_id: tenantId });
        modified = true;
      } else if (!existing.industry_template || !existing.permission_governance) {
        Object.assign(existing, {
          industry_template: dp.industry_template,
          covered_employees_count: dp.covered_employees_count,
          work_calendar: existing.work_calendar || dp.work_calendar,
          shift_resolution: existing.shift_resolution || dp.shift_resolution,
          permission_governance: existing.permission_governance || dp.permission_governance,
          section_enablement: existing.section_enablement || dp.section_enablement,
          payroll_integration: existing.payroll_integration || dp.payroll_integration,
        });
        modified = true;
      }
    });
    if (modified) {
      setStore(STORAGE_KEYS.POLICIES, list, tenantId);
    }
    return list;
  }

  getActivePolicyForDate(date: string, tenantId = getActiveOrgId()): AttendancePolicy {
    const policies = this.getPolicies(tenantId);
    const active = policies.find(p => p.status === 'ACTIVE' && p.effective_from <= date);
    return active || policies[0] || DEFAULT_POLICIES[0];
  }

  createPolicy(
    newPolicy: Omit<AttendancePolicy, 'id' | 'version' | 'created_at' | 'updated_at'>,
    actorName = 'HR Administrator'
  ): AttendancePolicy {
    const tenantId = getActiveOrgId();
    const policies = this.getPolicies(tenantId);

    const policy: AttendancePolicy = {
      ...newPolicy,
      id: `pol-${Date.now()}`,
      tenant_id: tenantId,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    policies.unshift(policy);
    setStore(STORAGE_KEYS.POLICIES, policies, tenantId);

    this.logAudit({
      tenant_id: tenantId,
      actor_name: actorName,
      actor_role: 'HR Admin',
      entity_type: 'POLICY',
      entity_id: policy.id,
      entity_name: policy.policy_name,
      change_summary: `Created new Attendance Policy: ${policy.policy_name} (${policy.policy_code})`,
      previous_value: null,
      new_value: policy,
      reason: 'New Policy Creation',
      timestamp: new Date().toISOString(),
    });

    hrEventBus.emit('policy.created', { policy });
    return policy;
  }

  duplicatePolicy(
    policyId: string,
    newCode: string,
    newName: string,
    actorName = 'HR Administrator'
  ): AttendancePolicy {
    const tenantId = getActiveOrgId();
    const policies = this.getPolicies(tenantId);
    const existing = policies.find(p => p.id === policyId || p.policy_code === policyId);
    if (!existing) throw new Error('Policy not found to duplicate');

    const duplicated: AttendancePolicy = {
      ...existing,
      id: `pol-${Date.now()}`,
      policy_code: newCode,
      policy_name: newName,
      status: 'DRAFT',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    policies.unshift(duplicated);
    setStore(STORAGE_KEYS.POLICIES, policies, tenantId);

    this.logAudit({
      tenant_id: tenantId,
      actor_name: actorName,
      actor_role: 'HR Admin',
      entity_type: 'POLICY',
      entity_id: duplicated.id,
      entity_name: duplicated.policy_name,
      change_summary: `Cloned policy from ${existing.policy_code} to ${duplicated.policy_code} as Draft`,
      previous_value: null,
      new_value: duplicated,
      reason: 'Duplication / Template Clone',
      timestamp: new Date().toISOString(),
    });

    return duplicated;
  }

  activatePolicy(policyId: string, actorName = 'HR Administrator'): AttendancePolicy {
    const tenantId = getActiveOrgId();
    const policies = this.getPolicies(tenantId);
    const pol = policies.find(p => p.id === policyId);
    if (!pol) throw new Error('Policy not found');

    pol.status = 'ACTIVE';
    pol.updated_at = new Date().toISOString();
    setStore(STORAGE_KEYS.POLICIES, policies, tenantId);

    this.logAudit({
      tenant_id: tenantId,
      actor_name: actorName,
      actor_role: 'HR Admin',
      entity_type: 'POLICY',
      entity_id: pol.id,
      entity_name: pol.policy_name,
      change_summary: `Activated policy ${pol.policy_code} (Version ${pol.version})`,
      previous_value: { ...pol, status: 'DRAFT' },
      new_value: pol,
      reason: 'Policy Activation',
      timestamp: new Date().toISOString(),
    });

    hrEventBus.emit('policy.version_published', { policy: pol });
    return pol;
  }

  suspendPolicy(policyId: string, actorName = 'HR Administrator'): AttendancePolicy {
    const tenantId = getActiveOrgId();
    const policies = this.getPolicies(tenantId);
    const pol = policies.find(p => p.id === policyId);
    if (!pol) throw new Error('Policy not found');

    pol.status = 'SUSPENDED';
    pol.updated_at = new Date().toISOString();
    setStore(STORAGE_KEYS.POLICIES, policies, tenantId);

    this.logAudit({
      tenant_id: tenantId,
      actor_name: actorName,
      actor_role: 'HR Admin',
      entity_type: 'POLICY',
      entity_id: pol.id,
      entity_name: pol.policy_name,
      change_summary: `Suspended policy ${pol.policy_code} (Version ${pol.version}). New daily attendance will fall back to organization baseline.`,
      previous_value: { ...pol, status: 'ACTIVE' },
      new_value: pol,
      reason: 'Policy Suspension',
      timestamp: new Date().toISOString(),
    });

    hrEventBus.emit('attendance.policy_updated', { policy: pol });
    return pol;
  }

  archivePolicy(policyId: string, actorName = 'HR Administrator'): AttendancePolicy {
    const tenantId = getActiveOrgId();
    const policies = this.getPolicies(tenantId);
    const pol = policies.find(p => p.id === policyId);
    if (!pol) throw new Error('Policy not found');

    pol.status = 'ARCHIVED';
    pol.updated_at = new Date().toISOString();
    setStore(STORAGE_KEYS.POLICIES, policies, tenantId);

    this.logAudit({
      tenant_id: tenantId,
      actor_name: actorName,
      actor_role: 'HR Admin',
      entity_type: 'POLICY',
      entity_id: pol.id,
      entity_name: pol.policy_name,
      change_summary: `Archived policy ${pol.policy_code}`,
      previous_value: null,
      new_value: pol,
      reason: 'Policy Archive',
      timestamp: new Date().toISOString(),
    });

    return pol;
  }

  deletePolicy(policyId: string, actorName = 'HR Administrator'): void {
    const tenantId = getActiveOrgId();
    const policies = this.getPolicies(tenantId);
    const idx = policies.findIndex(p => p.id === policyId);
    if (idx === -1) return;

    if (policies[idx].status !== 'DRAFT') {
      throw new Error('Only Draft policies with no historical attendance can be deleted. Use Archive instead.');
    }

    const deleted = policies.splice(idx, 1)[0];
    setStore(STORAGE_KEYS.POLICIES, policies, tenantId);

    this.logAudit({
      tenant_id: tenantId,
      actor_name: actorName,
      actor_role: 'HR Admin',
      entity_type: 'POLICY',
      entity_id: deleted.id,
      entity_name: deleted.policy_name,
      change_summary: `Deleted Draft policy ${deleted.policy_code}`,
      previous_value: deleted,
      new_value: null,
      reason: 'Draft Discarded',
      timestamp: new Date().toISOString(),
    });
  }

  simulatePolicyCalculation(
    policy: AttendancePolicy,
    scenario: {
      scheduled_in: string;  // "09:00"
      scheduled_out: string; // "18:00"
      actual_in: string;     // "09:24"
      actual_out: string;    // "17:42"
      employee_id?: string;
      employee_name?: string;
      date?: string;
      approved_permission_minutes?: number;
      prior_monthly_consumed_minutes?: number;
      is_weekly_off_or_holiday?: boolean;
    }
  ): {
    check_in_status: string;
    late_minutes: number;
    early_minutes: number;
    grace_applied_minutes: number;
    worked_net_minutes: number;
    worked_net_hours: number;
    attendance_status: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'REGULARIZATION_REQUIRED';
    status_reason: string;
    permission_quota: {
      prior_consumed: number;
      event_consumed: number;
      new_consumed: number;
      remaining: number;
      excess: number;
      is_threshold_crossed: boolean;
      classification_effect: string;
    };
    overtime: {
      raw_minutes: number;
      eligible_minutes: number;
      rate_multiplier: number;
      payable_minutes: number;
      requires_approval: boolean;
    };
    regularization_required: boolean;
    approver_chain: string[];
    payroll_consequence: string;
    execution_trace: Array<{ step: string; result: string; details: string; status: 'SUCCESS' | 'WARNING' | 'NEUTRAL' }>;
  } {
    const toMins = (t: string) => {
      const [h, m] = (t || '00:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const schedInMins = toMins(scenario.scheduled_in);
    const schedOutMins = toMins(scenario.scheduled_out);
    const actInMins = toMins(scenario.actual_in);
    const actOutMins = toMins(scenario.actual_out);

    const trace: Array<{ step: string; result: string; details: string; status: 'SUCCESS' | 'WARNING' | 'NEUTRAL' }> = [];

    // Step 1: Policy Scope & Verification
    trace.push({
      step: '1. Policy Scope & Precedence',
      result: `${policy.policy_code} (v${policy.version}) Applied`,
      details: `Matched scope ${policy.applies_to?.type || 'ORGANIZATION'} with deterministic precedence.`,
      status: 'SUCCESS',
    });

    // Step 2: Shift Resolution
    trace.push({
      step: '2. Shift Resolution',
      result: `${scenario.scheduled_in} – ${scenario.scheduled_out}`,
      details: `Resolved timetable against Tier 1/2/5 rules (Contract / Roster / Adaptive Punch Inferred).`,
      status: 'SUCCESS',
    });

    // Step 3: Check-In Grace & Lateness
    const diffIn = actInMins - schedInMins;
    const graceIn = policy.check_in_rules?.grace_minutes ?? 15;
    let lateMinutes = 0;
    let checkInStatus = 'On-Time';

    const isGraceLateEnabled = policy.section_enablement?.grace_late !== false;

    if (!isGraceLateEnabled) {
      checkInStatus = 'On-Time (Grace/Late Rule Disabled)';
      trace.push({
        step: '3. Check-In & Grace',
        result: 'Rule Disabled',
        details: 'Grace & lateness penalty disabled by policy switch. Punch logged without penalties.',
        status: 'NEUTRAL',
      });
    } else if (diffIn > 0) {
      if (diffIn <= graceIn) {
        checkInStatus = `Within Grace (${diffIn}m elapsed ≤ ${graceIn}m grace)`;
        trace.push({
          step: '3. Check-In & Grace',
          result: `Within Grace (+${diffIn}m)`,
          details: `Punch at ${scenario.actual_in} is within the ${graceIn}m grace allowance. No late deduction.`,
          status: 'SUCCESS',
        });
      } else {
        lateMinutes = diffIn - graceIn;
        checkInStatus = `Late by ${lateMinutes}m (${diffIn}m delay - ${graceIn}m grace)`;
        trace.push({
          step: '3. Check-In & Grace',
          result: `Late by ${lateMinutes}m`,
          details: `Arrival at ${scenario.actual_in} exceeded ${graceIn}m grace by ${lateMinutes} minutes.`,
          status: 'WARNING',
        });
      }
    } else {
      checkInStatus = `Early Check-In (${Math.abs(diffIn)}m before shift)`;
      trace.push({
        step: '3. Check-In & Grace',
        result: 'On-Time / Early',
        details: `Punch at ${scenario.actual_in} preceded shift start. Recorded on-time.`,
        status: 'SUCCESS',
      });
    }

    // Step 4: Early Check-Out & Grace
    const diffOut = schedOutMins - actOutMins;
    const graceOut = policy.check_out_rules?.early_checkout_grace_minutes ?? 10;
    let earlyMinutes = 0;

    if (diffOut > 0) {
      if (diffOut > graceOut) {
        earlyMinutes = diffOut - graceOut;
        trace.push({
          step: '4. Check-Out & Departure',
          result: `Early Departure by ${earlyMinutes}m`,
          details: `Departure at ${scenario.actual_out} is ${diffOut}m before scheduled end (exceeds ${graceOut}m tolerance).`,
          status: 'WARNING',
        });
      } else {
        trace.push({
          step: '4. Check-Out & Departure',
          result: `Within Early Tolerance (${diffOut}m)`,
          details: `Checkout at ${scenario.actual_out} is within permitted ${graceOut}m early window.`,
          status: 'SUCCESS',
        });
      }
    } else {
      trace.push({
        step: '4. Check-Out & Departure',
        result: 'Full Shift Completed',
        details: `Checkout at ${scenario.actual_out} met or exceeded scheduled shift end (${scenario.scheduled_out}).`,
        status: 'SUCCESS',
      });
    }

    // Step 5: Net Working Hours & Breaks
    const rawSpanMins = Math.max(0, actOutMins - actInMins);
    const breakMode = policy.break_rules?.mode || 'FIXED';
    const breakDeductMins = policy.break_rules?.auto_deduct ? (policy.break_rules?.default_break_minutes ?? 60) : 0;
    const workedNetMinutes = Math.max(0, rawSpanMins - breakDeductMins);
    const workedNetHours = Number((workedNetMinutes / 60).toFixed(2));

    trace.push({
      step: '5. Working Hours & Breaks',
      result: `${workedNetHours}h Net Worked (${workedNetMinutes}m)`,
      details: `Raw duration: ${rawSpanMins}m, Break deduction: ${breakDeductMins}m (${breakMode} break mode).`,
      status: workedNetHours >= (policy.general_rules?.full_day_hours ?? 8) ? 'SUCCESS' : 'WARNING',
    });

    // Step 6: 120-Minute Monthly Permission Governance & Policy A
    const isPermEnabled = policy.permission_governance?.enabled !== false && policy.section_enablement?.permissions !== false;
    const monthlyAllowance = policy.permission_governance?.monthly_allowance_minutes ?? 120;
    const priorConsumed = scenario.prior_monthly_consumed_minutes ?? 105;
    const approvedPermMinutes = scenario.approved_permission_minutes ?? 0;
    const autoConsumeLate = policy.permission_governance?.auto_consume_late_arrivals ?? true;
    const lateContribution = autoConsumeLate ? lateMinutes : 0;
    const eventConsumed = approvedPermMinutes + lateContribution;
    const newConsumed = priorConsumed + eventConsumed;
    const isThresholdCrossed = priorConsumed <= monthlyAllowance && newConsumed > monthlyAllowance;
    const remainingQuota = Math.max(0, monthlyAllowance - newConsumed);
    const excessMinutes = Math.max(0, newConsumed - monthlyAllowance);

    let permEffect = 'Within Allowance';
    if (!isPermEnabled) {
      permEffect = 'Permission Governance Disabled';
      trace.push({
        step: '6. Monthly Permission Allowance',
        result: 'Rule Disabled',
        details: 'Permission quota tracking disabled by policy switch. Allowance is not deducted.',
        status: 'NEUTRAL',
      });
    } else if (isThresholdCrossed) {
      permEffect = 'Policy A Threshold Crossed (Half-Day Triggered)';
      trace.push({
        step: '6. Monthly Permission Allowance',
        result: `Threshold Crossed: ${newConsumed}m / ${monthlyAllowance}m`,
        details: `Event consumed +${eventConsumed}m (${approvedPermMinutes}m permission + ${lateContribution}m late). Crosses 120m threshold by ${excessMinutes}m. Classified as Half-Day.`,
        status: 'WARNING',
      });
    } else if (newConsumed > monthlyAllowance) {
      const subsequentMode = policy.permission_governance?.excess_handling || 'LOG_EXCESS_ONLY';
      permEffect = subsequentMode === 'MARK_EVERY_EXCESS_HALF_DAY'
        ? 'Subsequent Excess Day (Company Strict: Half-Day)'
        : 'Subsequent Excess Day (Logged in Ledger)';
      trace.push({
        step: '6. Monthly Permission Allowance',
        result: `Cumulative Excess: +${excessMinutes}m`,
        details: `Quota previously exhausted. Subsequent excess handled via ${subsequentMode}.`,
        status: subsequentMode === 'MARK_EVERY_EXCESS_HALF_DAY' ? 'WARNING' : 'NEUTRAL',
      });
    } else {
      permEffect = `Compliant (${remainingQuota}m remaining)`;
      trace.push({
        step: '6. Monthly Permission Allowance',
        result: `Compliant: ${newConsumed}m / ${monthlyAllowance}m`,
        details: `Consumed ${eventConsumed}m this event. Total used: ${newConsumed}m. Remaining allowance: ${remainingQuota}m.`,
        status: 'SUCCESS',
      });
    }

    // Step 7: Attendance Status Classification
    const fullDayHours = policy.general_rules?.full_day_hours ?? 8;
    const halfDayHours = policy.general_rules?.half_day_hours ?? 4;
    let attendanceStatus: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'REGULARIZATION_REQUIRED' = 'PRESENT';
    let statusReason = 'Full day hours met with on-time performance.';

    if (workedNetHours < halfDayHours) {
      attendanceStatus = 'ABSENT';
      statusReason = `Insufficient work duration (${workedNetHours}h < ${halfDayHours}h minimum half-day threshold).`;
    } else if (workedNetHours < fullDayHours) {
      attendanceStatus = 'HALF_DAY';
      statusReason = `Net duration (${workedNetHours}h) met half-day threshold (${halfDayHours}h) but fell short of full-day (${fullDayHours}h).`;
    } else if (isPermEnabled && isThresholdCrossed) {
      attendanceStatus = 'HALF_DAY';
      statusReason = `Policy A Enforcement: Exact threshold-crossing day (${newConsumed}m > ${monthlyAllowance}m quota) classified as Half-Day.`;
    } else if (isPermEnabled && priorConsumed > monthlyAllowance && eventConsumed > 0 && policy.permission_governance?.excess_handling === 'MARK_EVERY_EXCESS_HALF_DAY') {
      attendanceStatus = 'HALF_DAY';
      statusReason = `Company Strict Subsequent Excess Rule: Late arrival/permission beyond 120m quota regulated as Half-Day.`;
    } else if (lateMinutes > (policy.check_in_rules?.late_threshold_minutes ?? 30)) {
      attendanceStatus = 'REGULARIZATION_REQUIRED';
      statusReason = `Late arrival of ${lateMinutes}m exceeds maximum tolerance of ${policy.check_in_rules?.late_threshold_minutes ?? 30}m.`;
    }

    trace.push({
      step: '7. Attendance Status Classification',
      result: `${attendanceStatus}`,
      details: statusReason,
      status: attendanceStatus === 'PRESENT' ? 'SUCCESS' : 'WARNING',
    });

    // Step 8: Overtime Calculation
    const isOtEnabled = policy.overtime_rules?.enabled !== false && policy.section_enablement?.overtime !== false;
    let rawOtMinutes = 0;
    let eligibleOtMinutes = 0;
    let payableOtMinutes = 0;
    const otMultiplier = scenario.is_weekly_off_or_holiday
      ? (policy.overtime_rules?.weekly_off_rate ?? 1.5)
      : (policy.overtime_rules?.weekday_rate ?? 1.0);

    if (isOtEnabled && actOutMins > schedOutMins) {
      rawOtMinutes = actOutMins - schedOutMins;
      const minOtThreshold = policy.overtime_rules?.min_threshold_minutes ?? 30;
      const maxDailyOt = policy.overtime_rules?.max_daily_minutes ?? 240;

      if (rawOtMinutes >= minOtThreshold) {
        eligibleOtMinutes = Math.min(rawOtMinutes, maxDailyOt);
        payableOtMinutes = Math.round(eligibleOtMinutes * otMultiplier);
        trace.push({
          step: '8. Overtime Calculation',
          result: `${eligibleOtMinutes}m Eligible OT (${payableOtMinutes}m Payable @ ${otMultiplier}x)`,
          details: `Extended work after shift end: ${rawOtMinutes}m. Passed ${minOtThreshold}m threshold. Multiplier ${otMultiplier}x applied.`,
          status: 'SUCCESS',
        });
      } else {
        trace.push({
          step: '8. Overtime Calculation',
          result: 'Below Overtime Threshold',
          details: `Extended work of ${rawOtMinutes}m is below minimum eligibility window (${minOtThreshold}m).`,
          status: 'NEUTRAL',
        });
      }
    } else {
      trace.push({
        step: '8. Overtime Calculation',
        result: isOtEnabled ? 'No Overtime Incurred' : 'Overtime Rule Disabled',
        details: isOtEnabled ? 'Checkout did not exceed scheduled shift end.' : 'Overtime calculation disabled in policy.',
        status: 'NEUTRAL',
      });
    }

    // Step 9: Downstream Payroll Consequence
    const regularizationRequired = attendanceStatus === 'REGULARIZATION_REQUIRED' || lateMinutes > 0 || earlyMinutes > 0;
    const approvers = policy.approval_workflow?.levels?.map(l => l.role) || ['Reporting Manager', 'Plant Lead'];
    let payrollConsequence = '1.0 Full Day Payable';

    if (attendanceStatus === 'ABSENT') {
      payrollConsequence = '1.0 Day Loss of Pay (LOP)';
    } else if (attendanceStatus === 'HALF_DAY') {
      payrollConsequence = '0.5 Day Payable • 0.5 Day LOP Deducted';
    } else if (lateMinutes > (policy.check_in_rules?.late_threshold_minutes ?? 30)) {
      payrollConsequence = `${policy.late_deduction_rules?.deduction_amount_days ?? 0.5} Day LOP if unregularized within ${policy.regularization_rules?.allowed_within_days ?? 3} days`;
    }

    if (payableOtMinutes > 0) {
      payrollConsequence += ` + ${(payableOtMinutes / 60).toFixed(1)}h Overtime Wages`;
    }

    trace.push({
      step: '9. Downstream Payroll Consequence',
      result: payrollConsequence,
      details: `Payable status locked upon HR finalization. Approvers: ${approvers.join(' → ')}.`,
      status: attendanceStatus === 'PRESENT' ? 'SUCCESS' : 'WARNING',
    });

    return {
      check_in_status: checkInStatus,
      late_minutes: lateMinutes,
      early_minutes: earlyMinutes,
      grace_applied_minutes: Math.min(diffIn > 0 ? diffIn : 0, graceIn),
      worked_net_minutes: workedNetMinutes,
      worked_net_hours: workedNetHours,
      attendance_status: attendanceStatus,
      status_reason: statusReason,
      permission_quota: {
        prior_consumed: priorConsumed,
        event_consumed: eventConsumed,
        new_consumed: newConsumed,
        remaining: remainingQuota,
        excess: excessMinutes,
        is_threshold_crossed: isThresholdCrossed,
        classification_effect: permEffect,
      },
      overtime: {
        raw_minutes: rawOtMinutes,
        eligible_minutes: eligibleOtMinutes,
        rate_multiplier: otMultiplier,
        payable_minutes: payableOtMinutes,
        requires_approval: policy.overtime_rules?.requires_approval ?? true,
      },
      regularization_required: regularizationRequired,
      approver_chain: approvers,
      payroll_consequence: payrollConsequence,
      execution_trace: trace,
    };
  }

  simulateWorkforceBatch(
    policy: AttendancePolicy,
    sampleSize = 21
  ): {
    total_evaluated: number;
    compliant_count: number;
    half_day_count: number;
    absent_count: number;
    overtime_eligible_count: number;
    regularization_required_count: number;
    projected_lop_days: number;
  } {
    let compliant = 0;
    let halfDay = 0;
    let absent = 0;
    let otCount = 0;
    let regCount = 0;
    let totalLop = 0;

    for (let i = 0; i < sampleSize; i++) {
      // Synthetic representative variations
      const inOffset = (i % 5) * 8; // 0, 8, 16, 24, 32 mins delay
      const outOffset = (i % 4) * 20; // 0, 20, 40, 60 mins extra
      const priorQuota = (i % 6) * 25; // 0, 25, 50, 75, 100, 125 mins prior

      const schedInH = 9;
      const schedOutH = 18;
      const actInMin = inOffset;
      const actInStr = `09:${actInMin.toString().padStart(2, '0')}`;
      const actOutStr = outOffset > 0 ? `18:${outOffset.toString().padStart(2, '0')}` : '18:00';

      const res = this.simulatePolicyCalculation(policy, {
        scheduled_in: '09:00',
        scheduled_out: '18:00',
        actual_in: actInStr,
        actual_out: actOutStr,
        prior_monthly_consumed_minutes: priorQuota,
      });

      if (res.attendance_status === 'PRESENT') compliant++;
      if (res.attendance_status === 'HALF_DAY') {
        halfDay++;
        totalLop += 0.5;
      }
      if (res.attendance_status === 'ABSENT') {
        absent++;
        totalLop += 1.0;
      }
      if (res.overtime.payable_minutes > 0) otCount++;
      if (res.regularization_required) regCount++;
    }

    return {
      total_evaluated: sampleSize,
      compliant_count: compliant,
      half_day_count: halfDay,
      absent_count: absent,
      overtime_eligible_count: otCount,
      regularization_required_count: regCount,
      projected_lop_days: totalLop,
    };
  }

  createNewPolicyVersion(
    policyId: string,
    updatedPolicy: Omit<AttendancePolicy, 'id' | 'version' | 'created_at' | 'updated_at'>,
    actorName = 'HR Administrator',
    reason = 'Policy update'
  ): AttendancePolicy {
    const tenantId = getActiveOrgId();
    const policies = this.getPolicies(tenantId);
    const existing = policies.find(p => p.id === policyId || p.policy_code === policyId);

    const nextVersion = (existing?.version || 1) + 1;
    const newPolicy: AttendancePolicy = {
      ...updatedPolicy,
      id: `pol-${Date.now()}`,
      tenant_id: tenantId,
      policy_code: existing?.policy_code || updatedPolicy.policy_code || 'ATT-CORP-001',
      version: nextVersion,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // If new policy is active from today, set previous to EXPIRED
    if (existing) {
      existing.status = 'EXPIRED';
      existing.effective_to = newPolicy.effective_from;
    }

    policies.unshift(newPolicy);
    setStore(STORAGE_KEYS.POLICIES, policies, tenantId);

    this.logAudit({
      tenant_id: tenantId,
      actor_name: actorName,
      actor_role: 'HR Admin',
      entity_type: 'POLICY',
      entity_id: newPolicy.id,
      entity_name: newPolicy.policy_name,
      change_summary: `Published new Version ${newPolicy.version} of ${newPolicy.policy_code}. Effective: ${newPolicy.effective_from}`,
      previous_value: existing,
      new_value: newPolicy,
      reason,
      timestamp: new Date().toISOString(),
    });

    hrEventBus.emit('policy.version_published', { policy: newPolicy });
    return newPolicy;
  }

  calculatePolicyImpact(policyId: string, _newRules: any, tenantId = getActiveOrgId()): PolicyImpactAnalysis {
    const shifts = this.getShifts(tenantId);
    const rosters = this.getRosters('2026-08-01', '2026-08-31', tenantId);

    // Derive real employee count from local database
    let realCount = 0;
    try {
      const raw = localStorage.getItem('workforce_employees');
      if (raw) {
        const emps = JSON.parse(raw);
        realCount = emps.filter((e: any) => e.status !== 'Terminated' && e.status !== 'Exited').length;
      }
    } catch (_) {}

    return {
      affected_employees_count: realCount > 0 ? realCount : 28,
      affected_locations_count: 2,
      affected_departments_count: 4,
      affected_shifts_count: shifts.length,
      upcoming_roster_entries_count: rosters.length,
      payroll_period_impacted: false,
    };
  }

  // ==========================================================================
  // 4. MULTI-LAYER PUNCH NORMALIZATION & CALCULATION ENGINE
  // ==========================================================================

  normalizeRawPunch(rawPunch: any, tenantId = getActiveOrgId()): NormalizedPunch {
    const punchDate = new Date(rawPunch.punch_time).toISOString().split('T')[0];
    const punchTimeStr = new Date(rawPunch.punch_time).toLocaleTimeString();

    const normalized: NormalizedPunch = {
      id: `norm-${rawPunch.id || Date.now()}`,
      raw_punch_id: rawPunch.id,
      tenant_id: tenantId,
      device_id: rawPunch.device_id,
      device_serial: rawPunch.device_serial || 'CGKK223862906',
      employee_id: rawPunch.employee_id || `WF-${rawPunch.biometric_pin}`,
      employee_code: `EMP-${rawPunch.biometric_pin}`,
      employee_name: rawPunch.employee_name || `User ${rawPunch.biometric_pin}`,
      punch_timestamp: rawPunch.punch_time,
      punch_date: punchDate,
      punch_time_str: punchTimeStr,
      direction: rawPunch.punch_direction || 'IN',
      source: rawPunch.source_type === 'LAN_AGENT' ? 'BIOMETRIC' : 'MANUAL',
      verification_mode: rawPunch.verification_mode || 'Fingerprint',
      is_deduplicated: rawPunch.processed_status !== 'DEDUPLICATED_IGNORED',
    };

    const punches = getStore<NormalizedPunch[]>(STORAGE_KEYS.NORMALIZED_PUNCHES, [], tenantId);
    punches.unshift(normalized);
    setStore(STORAGE_KEYS.NORMALIZED_PUNCHES, punches.slice(0, 1000), tenantId);

    return normalized;
  }

  getNormalizedPunches(tenantId = getActiveOrgId()): NormalizedPunch[] {
    return getStore<NormalizedPunch[]>(STORAGE_KEYS.NORMALIZED_PUNCHES, [], tenantId);
  }

  // Pure Calculation Engine: Evaluates Roster + Shift + Policy Version -> Attendance Ledger
  calculateDailyAttendance(
    employeeId: string,
    date: string,
    tenantId = getActiveOrgId()
  ): AttendanceLedgerRecord {
    const roster = this.getRosterForEmployeeOnDate(employeeId, date, tenantId);
    const shift = this.getShiftById(roster.shift_id, tenantId) || this.getShifts(tenantId)[0];
    const policy = this.getActivePolicyForDate(date, tenantId);

    // 1. Fetch normalized punches for this employee on this date
    const allPunches = this.getNormalizedPunches(tenantId).filter(
      p => p.employee_id === employeeId && p.punch_date === date
    );

    // Sort chronologically
    allPunches.sort((a, b) => new Date(a.punch_timestamp).getTime() - new Date(b.punch_timestamp).getTime());

    // 2. Weekly Off or Holiday handling
    if (roster.is_weekly_off) {
      return {
        id: `att-${employeeId}-${date}`,
        tenant_id: tenantId,
        employee_id: employeeId,
        employee_code: roster.employee_code,
        employee_name: roster.employee_name,
        attendance_date: date,
        shift_id: shift.id,
        shift_code: shift.shift_code,
        shift_name: shift.shift_name,
        policy_id: policy.id,
        policy_code: policy.policy_code,
        policy_version: policy.version,
        lifecycle_status: 'CALCULATED',
        status: 'Week Off',
        exception_type: 'NONE',
        gross_minutes: 0,
        net_minutes: 0,
        break_minutes: 0,
        late_minutes: 0,
        early_minutes: 0,
        overtime_minutes: 0,
        calculation_explanation: {
          check_in_status: 'Weekly Off (No check-in required)',
          check_out_status: 'Weekly Off',
          working_time_status: 'Scheduled Rest Day',
          ot_status: '0m OT',
          policy_summary: `Evaluated using ${policy.policy_name} v${policy.version}`,
          punches: [],
        },
        audit_trail: [{ timestamp: new Date().toISOString(), actor: 'Rule Engine', action: 'CALCULATE', note: 'Weekly Off' }],
        created_at: new Date().toISOString(),
        calculated_at: new Date().toISOString(),
      };
    }

    // 3. Evaluate Punches
    if (allPunches.length === 0) {
      // Absent / Missing
      return {
        id: `att-${employeeId}-${date}`,
        tenant_id: tenantId,
        employee_id: employeeId,
        employee_code: roster.employee_code,
        employee_name: roster.employee_name,
        attendance_date: date,
        shift_id: shift.id,
        shift_code: shift.shift_code,
        shift_name: shift.shift_name,
        policy_id: policy.id,
        policy_code: policy.policy_code,
        policy_version: policy.version,
        lifecycle_status: 'EXCEPTION',
        status: 'Absent',
        exception_type: 'MISSING_IN',
        exception_reason: 'No biometric punches registered for scheduled working day.',
        gross_minutes: 0,
        net_minutes: 0,
        break_minutes: 0,
        late_minutes: 0,
        early_minutes: 0,
        overtime_minutes: 0,
        calculation_explanation: {
          check_in_status: 'No check-in registered (Marked Absent)',
          check_out_status: 'No check-out registered',
          working_time_status: '0h 00m Net Working Time (< 4h Absent)',
          ot_status: '0m OT',
          policy_summary: `Evaluated using ${policy.policy_name} v${policy.version}`,
          punches: [],
        },
        audit_trail: [{ timestamp: new Date().toISOString(), actor: 'Rule Engine', action: 'EXCEPTION_DETECTED', note: 'Missing In/Out' }],
        created_at: new Date().toISOString(),
        calculated_at: new Date().toISOString(),
      };
    }

    const firstInPunch = allPunches[0];
    const lastOutPunch = allPunches.length > 1 ? allPunches[allPunches.length - 1] : null;

    const firstInTimeStr = firstInPunch.punch_time_str;
    const lastOutTimeStr = lastOutPunch ? lastOutPunch.punch_time_str : undefined;

    const inTimeMinutes = this.timeStringToMinutes(firstInTimeStr) || 540;
    const shiftStartMinutes = this.timeStringToMinutes(shift.start_time) || 540;
    const shiftEndMinutes = this.timeStringToMinutes(shift.end_time) || 1080;

    // Check Late In
    const lateGrace = policy.check_in_rules.grace_minutes || shift.grace_in_minutes || 15;
    const isLate = inTimeMinutes > (shiftStartMinutes + lateGrace);
    const lateMinutes = isLate ? inTimeMinutes - shiftStartMinutes : 0;

    // Check Out & Working Time
    let grossMinutes = 0;
    let netMinutes = 0;
    let overtimeMinutes = 0;
    let earlyMinutes = 0;
    let exceptionType: AttendanceExceptionType = 'NONE';
    let exceptionReason: string | undefined;

    if (!lastOutPunch) {
      exceptionType = 'MISSING_OUT';
      exceptionReason = 'Check-in recorded, but check-out punch is missing.';
      grossMinutes = 240; // Default estimate until regularized
      netMinutes = 240;
    } else {
      const outTimeMinutes = this.timeStringToMinutes(lastOutTimeStr) || shiftEndMinutes;
      grossMinutes = Math.max(0, outTimeMinutes - inTimeMinutes);

      const breakDuration = policy.break_rules.default_break_minutes || 60;
      netMinutes = Math.max(0, grossMinutes - breakDuration);

      // Early Departure
      const earlyGrace = policy.check_out_rules.early_checkout_grace_minutes || shift.grace_out_minutes || 15;
      if (outTimeMinutes < (shiftEndMinutes - earlyGrace)) {
        earlyMinutes = shiftEndMinutes - outTimeMinutes;
      }

      // Overtime
      const otThreshold = policy.overtime_rules.min_threshold_minutes || shift.min_ot_threshold_minutes || 30;
      if (outTimeMinutes >= (shiftEndMinutes + otThreshold)) {
        overtimeMinutes = outTimeMinutes - shiftEndMinutes;
      }
    }

    // Determine Day Status
    let dayStatus: 'Present' | 'Half Day' | 'Absent' | 'Late' | 'Exception' = 'Present';
    const fullDayThresholdMins = (policy.general_rules.full_day_hours || 8) * 60;
    const halfDayThresholdMins = (policy.general_rules.half_day_hours || 4) * 60;

    if (exceptionType !== 'NONE') {
      dayStatus = 'Exception';
    } else if (netMinutes < halfDayThresholdMins) {
      dayStatus = 'Absent';
    } else if (netMinutes < fullDayThresholdMins) {
      dayStatus = 'Half Day';
    } else if (isLate) {
      dayStatus = 'Late';
    } else {
      dayStatus = 'Present';
    }

    const explanation: CalculationExplanation = {
      check_in_status: isLate
        ? `${firstInTimeStr} (${lateMinutes}m Late beyond ${lateGrace}m grace)`
        : `${firstInTimeStr} (On-Time within ${lateGrace}m grace)`,
      check_out_status: lastOutTimeStr
        ? `${lastOutTimeStr} (${earlyMinutes > 0 ? `${earlyMinutes}m early exit` : 'Normal departure'})`
        : 'Missing Check-out punch',
      working_time_status: `${Math.floor(netMinutes / 60)}h ${netMinutes % 60}m Net Working Time (${dayStatus})`,
      ot_status: overtimeMinutes > 0
        ? `${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m Overtime (Pending Approval)`
        : '0m OT',
      policy_summary: `Evaluated using ${policy.policy_name} v${policy.version}`,
      punches: allPunches.map(p => ({
        time: p.punch_time_str,
        direction: p.direction,
        source: p.source,
        mode: p.verification_mode,
      })),
    };

    const ledgerRecord: AttendanceLedgerRecord = {
      id: `att-${employeeId}-${date}`,
      tenant_id: tenantId,
      employee_id: employeeId,
      employee_code: roster.employee_code,
      employee_name: roster.employee_name,
      attendance_date: date,
      shift_id: shift.id,
      shift_code: shift.shift_code,
      shift_name: shift.shift_name,
      policy_id: policy.id,
      policy_code: policy.policy_code,
      policy_version: policy.version,
      lifecycle_status: exceptionType !== 'NONE' ? 'EXCEPTION' : 'CALCULATED',
      status: dayStatus,
      exception_type: exceptionType,
      exception_reason: exceptionReason,
      first_in: firstInTimeStr,
      last_out: lastOutTimeStr,
      gross_minutes: grossMinutes,
      net_minutes: netMinutes,
      break_minutes: policy.break_rules.default_break_minutes || 60,
      late_minutes: lateMinutes,
      early_minutes: earlyMinutes,
      overtime_minutes: overtimeMinutes,
      calculation_explanation: explanation,
      audit_trail: [
        {
          timestamp: new Date().toISOString(),
          actor: 'Calculation Engine',
          action: 'CALCULATE',
          note: `Evaluated ${allPunches.length} punches against Shift ${shift.shift_code} & Policy v${policy.version}`,
        },
      ],
      created_at: new Date().toISOString(),
      calculated_at: new Date().toISOString(),
    };

    const ledger = getStore<AttendanceLedgerRecord[]>(STORAGE_KEYS.LEDGER, [], tenantId);
    const existingIdx = ledger.findIndex(l => l.id === ledgerRecord.id);
    if (existingIdx !== -1) {
      ledger[existingIdx] = ledgerRecord;
    } else {
      ledger.unshift(ledgerRecord);
    }
    setStore(STORAGE_KEYS.LEDGER, ledger, tenantId);

    return ledgerRecord;
  }

  getLedger(startDate: string, endDate: string, tenantId = getActiveOrgId()): AttendanceLedgerRecord[] {
    const list = getStore<AttendanceLedgerRecord[]>(STORAGE_KEYS.LEDGER, [], tenantId);
    return list.filter(l => l.attendance_date >= startDate && l.attendance_date <= endDate);
  }

  getExceptions(tenantId = getActiveOrgId()): AttendanceLedgerRecord[] {
    const list = getStore<AttendanceLedgerRecord[]>(STORAGE_KEYS.LEDGER, [], tenantId);
    return list.filter(l => l.lifecycle_status === 'EXCEPTION' || l.lifecycle_status === 'PENDING_APPROVAL');
  }

  // ==========================================================================
  // 5. REGULARIZATION APPROVAL WORKFLOW
  // ==========================================================================

  requestRegularization(
    ledgerId: string,
    requestedIn: string,
    requestedOut: string,
    reason: string,
    actorName = 'Employee'
  ): AttendanceLedgerRecord {
    const tenantId = getActiveOrgId();
    const ledger = getStore<AttendanceLedgerRecord[]>(STORAGE_KEYS.LEDGER, [], tenantId);
    const record = ledger.find(l => l.id === ledgerId);
    if (!record) throw new Error('Attendance ledger record not found');

    record.lifecycle_status = 'PENDING_APPROVAL';
    record.regularization_id = `reg-${Date.now()}`;
    record.regularization_reason = reason;
    record.first_in = requestedIn;
    record.last_out = requestedOut;
    record.status = 'Present';
    record.exception_type = 'MANUAL_REGULARIZATION';

    record.audit_trail.unshift({
      timestamp: new Date().toISOString(),
      actor: actorName,
      action: 'REQUEST_REGULARIZATION',
      note: `Requested In: ${requestedIn}, Out: ${requestedOut}. Reason: ${reason}`,
    });

    setStore(STORAGE_KEYS.LEDGER, ledger, tenantId);
    hrEventBus.emit('attendance.regularization_requested', { record });
    return record;
  }

  approveRegularization(
    ledgerId: string,
    approvedBy = 'Department Manager',
    note = 'Approved'
  ): AttendanceLedgerRecord {
    const tenantId = getActiveOrgId();
    const ledger = getStore<AttendanceLedgerRecord[]>(STORAGE_KEYS.LEDGER, [], tenantId);
    const record = ledger.find(l => l.id === ledgerId);
    if (!record) throw new Error('Record not found');

    record.lifecycle_status = 'APPROVED';
    record.status = 'Present';
    record.exception_type = 'NONE';
    delete record.exception_reason;

    record.audit_trail.unshift({
      timestamp: new Date().toISOString(),
      actor: approvedBy,
      action: 'APPROVE_REGULARIZATION',
      note,
    });

    setStore(STORAGE_KEYS.LEDGER, ledger, tenantId);
    hrEventBus.emit('attendance.regularization_approved', { record });
    return record;
  }

  // ==========================================================================
  // 6. AUDIT TRAIL LOGGING
  // ==========================================================================

  logAudit(entry: Omit<PolicyAuditLog, 'id'>): PolicyAuditLog {
    const tenantId = entry.tenant_id || getActiveOrgId();
    const newLog: PolicyAuditLog = {
      id: `audit-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      ...entry,
    };
    const logs = getStore<PolicyAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, [], tenantId);
    logs.unshift(newLog);
    setStore(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 500), tenantId);
    this.syncAuditLogToDb(newLog);
    return newLog;
  }

  getAuditLogs(tenantId = getActiveOrgId()): PolicyAuditLog[] {
    return getStore<PolicyAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, [], tenantId);
  }

  // ==========================================================================
  // 7. SUPABASE ASYNC DATABASE SYNC HELPERS
  // ==========================================================================

  public async syncRosterEntriesToDb(entries: EmployeeRosterEntry[]): Promise<void> {
    if (!isSupabaseEnabled || !supabase || entries.length === 0) return;
    try {
      const activeTenantId = getActiveOrgId();
      const activeComp = api.getActiveCompany();
      const activeCompId = isValidUUID(activeComp?.id) ? activeComp.id : null;
      const allShifts = this.getShifts();
      const shiftMap = new Map(allShifts.map(s => [s.id, s]));

      // 1. Bulk upsert to public.shift_rosters
      const rosterRows = entries.map(entry => {
        const rowOrg = isValidUUID(entry.tenant_id) ? entry.tenant_id : activeTenantId;
        const shift = shiftMap.get(entry.shift_id) || allShifts.find(s => s.shift_code === entry.shift_code) || allShifts[0];
        return {
          id: isValidUUID(entry.id) ? entry.id : undefined,
          organization_id: rowOrg,
          company_id: activeCompId,
          employee_id: entry.employee_id,
          employee_code: entry.employee_code || null,
          employee_name: entry.employee_name || null,
          roster_date: entry.date,
          shift_id: shift?.id || entry.shift_id,
          shift_code: shift?.shift_code || entry.shift_code,
          shift_name: shift?.shift_name || entry.shift_name,
          is_weekly_off: Boolean(entry.is_weekly_off),
          is_holiday: Boolean(entry.is_holiday),
          is_override: Boolean(entry.is_override),
          assigned_by: entry.assigned_by || 'HR Admin',
          remarks: entry.override_reason || null,
          updated_at: new Date().toISOString(),
        };
      });

      await supabase.from('shift_rosters').upsert(rosterRows, {
        onConflict: 'organization_id,employee_id,roster_date',
      });

      // 2. Canonical employee_shift_assignments sync
      for (const entry of entries) {
        if (entry.shift_id && isValidUUID(entry.employee_id) && isValidUUID(entry.shift_id)) {
          const rowOrg = isValidUUID(entry.tenant_id) ? entry.tenant_id : activeTenantId;
          try {
            await supabase.from('employee_shift_assignments').upsert({
              organization_id: rowOrg,
              company_id: activeCompId,
              employee_id: entry.employee_id,
              shift_id: entry.shift_id,
              effective_from: entry.date,
              valid_from: entry.date,
            }, { onConflict: 'employee_id' });
          } catch (e: any) {
            console.warn('[Roster] Shift assignment sync notice:', e);
          }
        }
      }

      // 3. Dynamic notifications for assigned employees
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      const companyName = activeComp?.name || 'Company';

      for (const entry of entries) {
        const shift = shiftMap.get(entry.shift_id) || allShifts.find(s => s.shift_code === entry.shift_code) || allShifts[0];
        const isOff = entry.is_weekly_off || entry.shift_code === 'OFF';
        const isNight = entry.shift_code.includes('NGT') || shift?.cross_midnight;

        const startTime = shift?.start_time || '09:00';
        const endTime = shift?.end_time || '18:00';
        const startDisplay = isNight ? '10:00 PM' : (startTime.startsWith('14') ? '02:00 PM' : (startTime.startsWith('06') ? '06:00 AM' : (startTime.startsWith('09:30') ? '09:30 AM' : '09:00 AM')));
        const endDisplay = isNight ? '06:00 AM' : (endTime.startsWith('22') ? '10:30 PM' : (endTime.startsWith('14') ? '02:30 PM' : (endTime.startsWith('18:30') ? '06:30 PM' : '06:00 PM')));

        const d = new Date(entry.date);
        const dateDisplay = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const isToday = entry.date === todayStr;
        const isTomorrow = entry.date === tomorrowStr;

        const title = entry.is_override
          ? (isToday ? 'Today — Shift Updated' : `Shift Updated — ${dateDisplay}`)
          : (isToday ? 'Today — Shift Assigned' : (isTomorrow ? 'Tomorrow — Shift Assigned' : `Upcoming Shift Assignment — ${dateDisplay}`));

        const body = isOff
          ? `Your roster for ${dateDisplay} is set to Weekly Off (Rest Day).`
          : `Your shift for ${dateDisplay} has been assigned: ${shift?.shift_name || entry.shift_name} (${entry.shift_code}, ${startDisplay} – ${endDisplay}) at ${companyName}. Assigned by ${entry.assigned_by || 'HR Administrator'}.`;

        notificationService.emitEmployeeNotification({
          employeeId: entry.employee_id,
          organizationId: isValidUUID(entry.tenant_id) ? entry.tenant_id : activeTenantId,
          title,
          message: body,
          actionUrl: '/attendance',
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[attendanceRosterService] syncRosterEntriesToDb error:', e);
    }
  }

  private async syncPolicyToDb(policy: AttendancePolicy): Promise<void> {
    if (!isSupabaseEnabled || !supabase) return;
    try {
      await supabase.from('attendance_policies').upsert({
        id: policy.id,
        organization_id: policy.tenant_id,
        policy_code: policy.policy_code,
        policy_name: policy.policy_name,
        description: policy.description,
        version: policy.version,
        status: policy.status,
        effective_from: policy.effective_from,
        effective_to: policy.effective_to,
        general_rules: policy.general_rules,
        check_in_rules: policy.check_in_rules,
        check_out_rules: policy.check_out_rules,
        break_rules: policy.break_rules,
        overtime_rules: policy.overtime_rules,
        late_deduction_rules: policy.late_deduction_rules,
        missing_punch_rules: policy.missing_punch_rules,
        night_shift_rules: policy.night_shift_rules,
        applies_to: policy.applies_to,
        created_by: policy.created_by,
        updated_at: policy.updated_at,
      });
    } catch (e) {
      console.warn('[attendanceRosterService] syncPolicyToDb fallback:', e);
    }
  }

  private async syncLedgerRecordToDb(record: AttendanceLedgerRecord): Promise<void> {
    if (!isSupabaseEnabled || !supabase) return;
    try {
      const orgId = isValidUUID(record.tenant_id) ? record.tenant_id : getActiveOrgId();
      if (!isValidUUID(record.employee_id)) return;

      const rawStatus = (record.status || 'PRESENT').toUpperCase();
      let dbStatus: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'HOLIDAY' = 'PRESENT';
      let payableStatus = 1.0;
      if (rawStatus.includes('HALF')) {
        dbStatus = 'HALF_DAY';
        payableStatus = 0.5;
      } else if (rawStatus.includes('ABSENT') || rawStatus.includes('LOP') || rawStatus.includes('MISSING')) {
        dbStatus = 'ABSENT';
        payableStatus = 0.0;
      } else if (rawStatus.includes('HOLIDAY')) {
        dbStatus = 'HOLIDAY';
        payableStatus = 1.0;
      }

      await supabase.from('attendance_daily').upsert({
        organization_id: orgId,
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        shift_id: (record.shift_id && record.shift_id.length === 36) ? record.shift_id : null,
        first_check_in: record.first_in ? (record.first_in.includes('T') ? record.first_in : new Date(`${record.attendance_date}T${record.first_in}Z`).toISOString()) : null,
        last_check_out: record.last_out ? (record.last_out.includes('T') ? record.last_out : new Date(`${record.attendance_date}T${record.last_out}Z`).toISOString()) : null,
        total_work_minutes: record.net_minutes || record.gross_minutes || 0,
        break_minutes: record.break_minutes || 0,
        late_entry_minutes: record.late_minutes || 0,
        early_exit_minutes: record.early_minutes || 0,
        overtime_minutes: record.overtime_minutes || 0,
        status: dbStatus,
        payable_status: payableStatus,
        is_regularized: Boolean(record.regularization_id),
        overtime_eligible: (record.overtime_minutes || 0) > 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'employee_id,attendance_date' });
    } catch (e) {
      console.warn('[attendanceRosterService] syncLedgerRecordToDb fallback:', e);
    }
  }

  private async syncAuditLogToDb(log: PolicyAuditLog): Promise<void> {
    if (!isSupabaseEnabled || !supabase) return;
    try {
      const orgId = isValidUUID(log.tenant_id) ? log.tenant_id : getActiveOrgId();
      await supabase.from('audit_logs').insert([{
        organization_id: orgId,
        entity_type: log.entity_type || 'SHIFT_ROSTER',
        entity_id: log.entity_id || 'attendance_policy',
        action: 'POLICY_AUDIT',
        new_values: {
          actor_name: log.actor_name,
          actor_role: log.actor_role,
          entity_name: log.entity_name,
          change_summary: log.change_summary,
          previous_value: log.previous_value,
          new_value: log.new_value,
          reason: log.reason,
          timestamp: log.timestamp,
        },
      }]);
    } catch (e) {
      // Graceful fallback: local audit trail is already persisted
    }
  }

  // Helper
  private calculateDurationMinutes(start: string, end: string, crossMidnight: boolean): number {
    const s = this.timeStringToMinutes(start) || 540;
    const e = this.timeStringToMinutes(end) || 1080;
    if (crossMidnight || e < s) {
      return (1440 - s) + e;
    }
    return e - s;
  }

  private timeStringToMinutes(timeStr?: string): number | null {
    if (!timeStr || timeStr === '—') return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3];
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
  }
}

export const attendanceRosterService = new AttendanceRosterService();
