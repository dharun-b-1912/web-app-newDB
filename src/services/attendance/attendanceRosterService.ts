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
import { getActiveOrgId } from './biometricCommandService';
import { hrEventBus } from '../hrEventBus';
import { api } from '../api';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

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

function getStore<T>(baseKey: string, fallback: T, tenantId = getActiveOrgId()): T {
  try {
    const key = getTenantStorageKey(baseKey, tenantId);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Fallback migration check
    const legacyRaw = localStorage.getItem(baseKey);
    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw);
        localStorage.setItem(key, legacyRaw);
        return parsed;
      } catch (_) {}
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function setStore<T>(baseKey: string, val: T, tenantId = getActiveOrgId()): void {
  try {
    const key = getTenantStorageKey(baseKey, tenantId);
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`[attendanceRosterService] Storage error for ${baseKey}:`, err);
  }
}

// ============================================================================
// DEFAULT SEED TEMPLATES (Enterprise Catalog)
// ============================================================================

const DEFAULT_SHIFTS: ShiftMaster[] = [
  {
    id: 'shift-gen-09',
    tenant_id: 'org-joy-01',
    shift_code: 'GEN-09',
    shift_name: 'General Day Shift (Corporate)',
    description: 'Standard 9-hour corporate schedule with 1 hour lunch and 15 mins late grace.',
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
      { id: 'brk-1', name: 'Lunch Break', start_time: '13:00', end_time: '14:00', duration_minutes: 60, is_paid: false },
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'shift-mor-06',
    tenant_id: 'org-joy-01',
    shift_code: 'MOR-06',
    shift_name: 'Morning Shift A (Factory)',
    description: 'Early plant shift for manufacturing line with 10 mins grace and 30m break.',
    shift_type: 'ROTATIONAL',
    start_time: '06:00',
    end_time: '14:30',
    scheduled_duration_minutes: 510,
    net_working_minutes: 480,
    cross_midnight: false,
    attendance_date_cutoff: '04:00',
    grace_in_minutes: 10,
    grace_out_minutes: 10,
    early_out_tolerance_minutes: 10,
    late_threshold_minutes: 20,
    min_hours_full_day: 8,
    min_hours_half_day: 4,
    break_mode: 'PUNCH_BASED',
    breaks: [
      { id: 'brk-2', name: 'Meal Break', start_time: '10:00', end_time: '10:30', duration_minutes: 30, is_paid: false },
    ],
    ot_enabled: true,
    min_ot_threshold_minutes: 15,
    weekday_ot_rate: 1.5,
    weekly_off_ot_rate: 2.0,
    holiday_ot_rate: 2.0,
    max_ot_daily_minutes: 180,
    requires_manager_approval: true,
    requires_hr_approval: true,
    applies_to: { type: 'DEPARTMENTS', ids: ['Production', 'Manufacturing'] },
    effective_from: '2026-01-01',
    status: 'ACTIVE',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'shift-eve-14',
    tenant_id: 'org-joy-01',
    shift_code: 'EVE-14',
    shift_name: 'Evening Shift B (Factory)',
    description: 'Afternoon to night production shift.',
    shift_type: 'ROTATIONAL',
    start_time: '14:00',
    end_time: '22:30',
    scheduled_duration_minutes: 510,
    net_working_minutes: 480,
    cross_midnight: false,
    attendance_date_cutoff: '12:00',
    grace_in_minutes: 10,
    grace_out_minutes: 10,
    early_out_tolerance_minutes: 10,
    late_threshold_minutes: 20,
    min_hours_full_day: 8,
    min_hours_half_day: 4,
    break_mode: 'PUNCH_BASED',
    breaks: [
      { id: 'brk-3', name: 'Dinner Break', start_time: '18:00', end_time: '18:30', duration_minutes: 30, is_paid: false },
    ],
    ot_enabled: true,
    min_ot_threshold_minutes: 15,
    weekday_ot_rate: 1.5,
    weekly_off_ot_rate: 2.0,
    holiday_ot_rate: 2.0,
    max_ot_daily_minutes: 180,
    requires_manager_approval: true,
    requires_hr_approval: true,
    applies_to: { type: 'DEPARTMENTS', ids: ['Production', 'Assembly'] },
    effective_from: '2026-01-01',
    status: 'ACTIVE',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'shift-ngt-22',
    tenant_id: 'org-joy-01',
    shift_code: 'NGT-22',
    shift_name: 'Night Shift C (Cross-Midnight)',
    description: 'Graveyard / 24x7 shift spanning across midnight (22:00 to 06:30 next day).',
    shift_type: 'NIGHT_SHIFT',
    start_time: '22:00',
    end_time: '06:30',
    scheduled_duration_minutes: 510,
    net_working_minutes: 480,
    cross_midnight: true,
    attendance_date_cutoff: '06:00',
    grace_in_minutes: 15,
    grace_out_minutes: 15,
    early_out_tolerance_minutes: 15,
    late_threshold_minutes: 30,
    min_hours_full_day: 8,
    min_hours_half_day: 4,
    break_mode: 'PUNCH_BASED',
    breaks: [
      { id: 'brk-4', name: 'Midnight Meal', start_time: '02:00', end_time: '02:30', duration_minutes: 30, is_paid: false },
    ],
    ot_enabled: true,
    min_ot_threshold_minutes: 30,
    weekday_ot_rate: 1.5,
    weekly_off_ot_rate: 2.0,
    holiday_ot_rate: 2.0,
    max_ot_daily_minutes: 180,
    requires_manager_approval: true,
    requires_hr_approval: true,
    applies_to: { type: 'ORGANIZATION', ids: [] },
    effective_from: '2026-01-01',
    status: 'ACTIVE',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_POLICIES: AttendancePolicy[] = [
  {
    id: 'pol-corp-001',
    tenant_id: 'org-joy-01',
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
    applies_to: { type: 'ORGANIZATION', ids: [] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pol-factory-001',
    tenant_id: 'org-joy-01',
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
    applies_to: { type: 'DEPARTMENTS', ids: ['Production', 'Manufacturing', 'Assembly'] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

class AttendanceRosterService {
  // ==========================================================================
  // 1. SHIFT MASTER CRUD
  // ==========================================================================

  getShifts(tenantId = getActiveOrgId()): ShiftMaster[] {
    const list = getStore<ShiftMaster[]>(STORAGE_KEYS.SHIFTS, [], tenantId);
    if (!list || list.length === 0) {
      const tenantShifts = DEFAULT_SHIFTS.map(s => ({ ...s, tenant_id: tenantId }));
      setStore(STORAGE_KEYS.SHIFTS, tenantShifts, tenantId);
      return tenantShifts;
    }
    return list;
  }

  getShiftById(shiftId: string, tenantId = getActiveOrgId()): ShiftMaster | null {
    const shifts = this.getShifts(tenantId);
    return shifts.find(s => s.id === shiftId || s.shift_code === shiftId) || null;
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
      return {
        success: true,
        message: `Shift has ${inUseCount} historical roster assignments. It has been deactivated instead of deleted to protect attendance records.`,
      };
    }

    const filtered = shifts.filter(s => s.id !== shiftId);
    setStore(STORAGE_KEYS.SHIFTS, filtered, tenantId);

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

  getRosters(startDate: string, endDate: string, tenantId = getActiveOrgId()): EmployeeRosterEntry[] {
    const list = getStore<EmployeeRosterEntry[]>(STORAGE_KEYS.ROSTERS, [], tenantId);
    return list.filter(r => r.date >= startDate && r.date <= endDate);
  }

  getRosterForEmployeeOnDate(employeeId: string, date: string, tenantId = getActiveOrgId()): EmployeeRosterEntry {
    const list = getStore<EmployeeRosterEntry[]>(STORAGE_KEYS.ROSTERS, [], tenantId);
    const match = list.find(r => r.employee_id === employeeId && r.date === date);

    if (match) return match;

    // Default Fallback: General Day Shift Monday-Friday, Saturday/Sunday Off
    const dayOfWeek = new Date(date).getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const defaultShift = this.getShifts(tenantId)[0] || DEFAULT_SHIFTS[0];

    return {
      id: `roster-dyn-${employeeId}-${date}`,
      tenant_id: tenantId,
      employee_id: employeeId,
      employee_code: `EMP-${employeeId.replace(/\D/g, '') || '001'}`,
      employee_name: 'Employee',
      date,
      shift_id: defaultShift.id,
      shift_code: defaultShift.shift_code,
      shift_name: defaultShift.shift_name,
      shift_type: defaultShift.shift_type,
      is_weekly_off: isWeekend,
      is_holiday: false,
      is_override: false,
      assigned_by: 'System Auto-Default',
      updated_at: new Date().toISOString(),
    };
  }

  bulkAssignRoster(payload: {
    employeeIds: string[];
    startDate: string;
    endDate: string;
    shiftId: string;
    weeklyOffDays?: number[]; // [0, 6] = Sun, Sat
    assignedBy?: string;
  }): { assignedCount: number; conflicts: string[] } {
    const tenantId = getActiveOrgId();
    const shift = this.getShiftById(payload.shiftId, tenantId) || this.getShifts(tenantId)[0];
    const weeklyOffs = new Set(payload.weeklyOffDays ?? [0, 6]);
    const assignedBy = payload.assignedBy || 'HR Admin';

    const currentRosters = getStore<EmployeeRosterEntry[]>(STORAGE_KEYS.ROSTERS, [], tenantId);
    const updatedMap = new Map<string, EmployeeRosterEntry>();

    // Index existing
    for (const r of currentRosters) {
      updatedMap.set(`${r.employee_id}_${r.date}`, r);
    }

    let assignedCount = 0;
    const conflicts: string[] = [];

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
          is_override: false,
          assigned_by: assignedBy,
          updated_at: new Date().toISOString(),
        };

        updatedMap.set(key, newEntry);
        assignedCount++;
      }
    }

    const finalList = Array.from(updatedMap.values());
    setStore(STORAGE_KEYS.ROSTERS, finalList, tenantId);

    // Persist to Supabase Database
    const newAssignedEntries = Array.from(updatedMap.values()).filter(r => payload.employeeIds.includes(r.employee_id));
    this.syncRosterEntriesToDb(newAssignedEntries);

    // Broadcast domain event to Realtime Outbox for Flutter
    if (isSupabaseEnabled && supabase) {
        Promise.resolve(
          supabase.from('realtime_outbox').insert({
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
          })
        ).catch(() => {});
    }

    hrEventBus.emit('roster.bulk_assigned', {
      shiftCode: shift.shift_code,
      count: assignedCount,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });

    return { assignedCount, conflicts };
  }

  setShiftOverride(
    employeeId: string,
    date: string,
    newShiftId: string,
    reason: string,
    actorName = 'HR Administrator'
  ): EmployeeRosterEntry {
    const tenantId = getActiveOrgId();
    const shift = this.getShiftById(newShiftId, tenantId) || this.getShifts(tenantId)[0];
    const rosters = getStore<EmployeeRosterEntry[]>(STORAGE_KEYS.ROSTERS, [], tenantId);

    const existingIdx = rosters.findIndex(r => r.employee_id === employeeId && r.date === date);
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

    if (existingIdx !== -1) {
      rosters[existingIdx] = newEntry;
    } else {
      rosters.push(newEntry);
    }

    setStore(STORAGE_KEYS.ROSTERS, rosters, tenantId);
    this.syncRosterEntriesToDb([newEntry]);
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

  generateRotationalRoster(payload: {
    employeeIds: string[];
    patternShifts: string[]; // ['shift-mor-06', 'shift-eve-14', 'shift-ngt-22']
    cycleWeeks: number;
    startDate: string;
    endDate: string;
    weeklyOffDays?: number[];
    teamOffsets?: Record<string, number>;
  }): { assignedCount: number } {
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
        assignedCount++;
        dayIndex++;
      }
    }

    const current = getStore<EmployeeRosterEntry[]>(STORAGE_KEYS.ROSTERS, [], tenantId);
    const updatedMap = new Map<string, EmployeeRosterEntry>();
    for (const r of current) updatedMap.set(`${r.employee_id}_${r.date}`, r);
    for (const r of entries) updatedMap.set(`${r.employee_id}_${r.date}`, r);

    setStore(STORAGE_KEYS.ROSTERS, Array.from(updatedMap.values()), tenantId);
    this.syncRosterEntriesToDb(entries);

    return { assignedCount };
  }

  copySchedule(payload: {
    sourceStartDate: string;
    sourceEndDate: string;
    targetStartDate: string;
    employeeIds: string[];
  }): { copiedCount: number } {
    const tenantId = getActiveOrgId();
    const current = getStore<EmployeeRosterEntry[]>(STORAGE_KEYS.ROSTERS, [], tenantId);
    const sourceEntries = current.filter(
      r => r.date >= payload.sourceStartDate && r.date <= payload.sourceEndDate && payload.employeeIds.includes(r.employee_id)
    );

    const sourceStart = new Date(payload.sourceStartDate).getTime();
    const targetStart = new Date(payload.targetStartDate).getTime();
    const timeDelta = targetStart - sourceStart;

    const newEntries: EmployeeRosterEntry[] = [];
    for (const src of sourceEntries) {
      const srcDate = new Date(src.date).getTime();
      const newTargetDate = new Date(srcDate + timeDelta).toISOString().split('T')[0];

      newEntries.push({
        ...src,
        id: `roster-cp-${src.employee_id}-${newTargetDate}`,
        date: newTargetDate,
        assigned_by: 'Schedule Copy Tool',
        updated_at: new Date().toISOString(),
      });
    }

    const updatedMap = new Map<string, EmployeeRosterEntry>();
    for (const r of current) updatedMap.set(`${r.employee_id}_${r.date}`, r);
    for (const r of newEntries) updatedMap.set(`${r.employee_id}_${r.date}`, r);

    setStore(STORAGE_KEYS.ROSTERS, Array.from(updatedMap.values()), tenantId);
    this.syncRosterEntriesToDb(newEntries);

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
    }
  ): {
    check_in_status: string;
    late_minutes: number;
    early_minutes: number;
    grace_applied_minutes: number;
    regularization_required: boolean;
    approver_chain: string[];
    payroll_consequence: string;
  } {
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const schedInMins = toMins(scenario.scheduled_in);
    const schedOutMins = toMins(scenario.scheduled_out);
    const actInMins = toMins(scenario.actual_in);
    const actOutMins = toMins(scenario.actual_out);

    const diffIn = actInMins - schedInMins;
    const graceIn = policy.check_in_rules.grace_minutes || 0;

    let lateMinutes = 0;
    let checkInStatus = 'On-Time';

    if (diffIn > 0) {
      if (diffIn <= graceIn) {
        checkInStatus = `Within Grace (${diffIn}m elapsed, ≤ ${graceIn}m grace)`;
      } else {
        lateMinutes = diffIn - graceIn;
        checkInStatus = `Late by ${lateMinutes}m (${diffIn}m delay - ${graceIn}m grace)`;
      }
    }

    const diffOut = schedOutMins - actOutMins;
    const graceOut = policy.check_out_rules.early_checkout_grace_minutes || 0;
    let earlyMinutes = 0;

    if (diffOut > 0) {
      if (diffOut > graceOut) {
        earlyMinutes = diffOut - graceOut;
      }
    }

    const regularizationRequired = lateMinutes > 0 || earlyMinutes > 0;
    const approvers = policy.approval_workflow?.levels.map(l => l.role) || ['Reporting Manager', 'HR Admin'];
    const payrollConsequence = lateMinutes > (policy.check_in_rules.late_threshold_minutes || 30)
      ? `${policy.late_deduction_rules.deduction_amount_days || 0.5} Day deduction if triggered ${policy.late_deduction_rules.late_count_trigger || 3} times/mo`
      : 'No financial penalty';

    return {
      check_in_status: checkInStatus,
      late_minutes: lateMinutes,
      early_minutes: earlyMinutes,
      grace_applied_minutes: Math.min(diffIn > 0 ? diffIn : 0, graceIn),
      regularization_required: regularizationRequired,
      approver_chain: approvers,
      payroll_consequence: payrollConsequence,
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

  private async syncShiftToDb(shift: ShiftMaster): Promise<void> {
    if (!isSupabaseEnabled || !supabase) return;
    try {
      await supabase.from('attendance_shifts').upsert({
        id: shift.id,
        organization_id: shift.tenant_id,
        shift_code: shift.shift_code,
        shift_name: shift.shift_name,
        description: shift.description,
        shift_type: shift.shift_type,
        start_time: shift.start_time,
        end_time: shift.end_time,
        scheduled_duration_minutes: shift.scheduled_duration_minutes,
        net_working_minutes: shift.net_working_minutes,
        cross_midnight: shift.cross_midnight,
        attendance_date_cutoff: shift.attendance_date_cutoff,
        grace_in_minutes: shift.grace_in_minutes,
        grace_out_minutes: shift.grace_out_minutes,
        early_out_tolerance_minutes: shift.early_out_tolerance_minutes,
        late_threshold_minutes: shift.late_threshold_minutes,
        min_hours_full_day: shift.min_hours_full_day,
        min_hours_half_day: shift.min_hours_half_day,
        break_mode: shift.break_mode,
        breaks: shift.breaks,
        ot_enabled: shift.ot_enabled,
        min_ot_threshold_minutes: shift.min_ot_threshold_minutes,
        weekday_ot_rate: shift.weekday_ot_rate,
        weekly_off_ot_rate: shift.weekly_off_ot_rate,
        holiday_ot_rate: shift.holiday_ot_rate,
        max_ot_daily_minutes: shift.max_ot_daily_minutes,
        requires_manager_approval: shift.requires_manager_approval,
        requires_hr_approval: shift.requires_hr_approval,
        applies_to: shift.applies_to,
        effective_from: shift.effective_from,
        effective_to: shift.effective_to,
        status: shift.status,
        version: shift.version,
        updated_at: shift.updated_at,
      });
    } catch (e) {
      console.warn('[attendanceRosterService] syncShiftToDb fallback:', e);
    }
  }

  private async syncRosterEntriesToDb(entries: EmployeeRosterEntry[]): Promise<void> {
    if (!isSupabaseEnabled || !supabase || entries.length === 0) return;
    try {
      const allShifts = this.getShifts();
      const shiftMap = new Map(allShifts.map(s => [s.id, s]));

      for (const entry of entries) {
        const shift = shiftMap.get(entry.shift_id) || allShifts.find(s => s.shift_code === entry.shift_code) || allShifts[0];
        const isOff = entry.is_weekly_off || entry.shift_code === 'OFF';
        const isNight = entry.shift_code.includes('NGT') || shift?.cross_midnight;

        const startTime = shift?.start_time || '09:00';
        const endTime = shift?.end_time || '18:00';
        const startDisplay = isNight ? '10:00 PM' : (startTime.startsWith('14') ? '02:00 PM' : (startTime.startsWith('06') ? '06:00 AM' : '09:00 AM'));
        const endDisplay = isNight ? '06:00 AM' : (endTime.startsWith('22') ? '10:30 PM' : (endTime.startsWith('14') ? '02:30 PM' : '06:00 PM'));

        const todayStr = '2026-08-26';
        const d = new Date(entry.date);
        const dateDisplay = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const isToday = entry.date === todayStr;
        const isTomorrow = entry.date === '2026-08-27';

        const title = entry.is_override
          ? (isToday ? 'Today — Shift Updated' : `Shift Updated — ${dateDisplay}`)
          : (isToday ? 'Today — Shift Assigned' : (isTomorrow ? 'Tomorrow — Shift Assigned' : `Upcoming Shift Assignment — ${dateDisplay}`));

        const body = isOff
          ? `Your roster for ${dateDisplay} is set to Weekly Off (Rest Day).`
          : `Your shift for ${dateDisplay} has been assigned: ${shift?.shift_name || entry.shift_name} (${entry.shift_code}, ${startDisplay} – ${endDisplay}) at Joy Corporate Solutions Private Limited (HQ). Assigned by ${entry.assigned_by || 'HR Administrator'}.`;

        // 1. Try sync to attendance_roster_entries
        Promise.resolve(
          supabase.from('attendance_roster_entries').upsert({
            id: entry.id,
            employee_id: entry.employee_id,
            employee_code: entry.employee_code,
            date: entry.date,
            shift_id: entry.shift_id,
            shift_code: entry.shift_code,
            shift_name: entry.shift_name,
            is_weekly_off: isOff,
            is_override: entry.is_override,
            start_time: startTime,
            end_time: endTime,
            updated_at: new Date().toISOString()
          })
        ).catch(() => {});

        // 2. Publish real-time notification_events for Mobile / Flutter
        Promise.resolve(
          supabase.from('notification_events').insert({
            event_type: entry.is_override ? 'SHIFT_UPDATED' : 'SHIFT_ASSIGNED',
            category: 'ATTENDANCE',
            severity: 'INFO',
            title,
            body,
            resource_type: 'SHIFT_ASSIGNMENT',
            resource_id: entry.employee_id,
            actor_name: entry.assigned_by || 'HR Administrator',
            metadata: {
              employee_id: entry.employee_id,
              employee_code: entry.employee_code,
              effective_date: entry.date,
              shift_id: entry.shift_id,
              shift_code: entry.shift_code,
              shift_name: shift?.shift_name || entry.shift_name,
              start_time: startTime,
              end_time: endTime,
              start_time_display: startDisplay,
              end_time_display: endDisplay,
              location: 'Joy Corporate Solutions Private Limited (HQ)',
              assigned_by: entry.assigned_by || 'HR Administrator',
              is_night_shift: isNight,
              is_weekly_off: isOff,
              source: 'WEB_HR_ROSTER'
            }
          })
        ).catch(() => {});
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
      await supabase.from('attendance_daily_ledger').upsert({
        id: record.id,
        organization_id: record.tenant_id,
        employee_id: record.employee_id,
        employee_code: record.employee_code,
        employee_name: record.employee_name,
        department: record.department,
        location: record.location,
        attendance_date: record.attendance_date,
        roster_id: record.roster_id,
        shift_id: record.shift_id,
        shift_code: record.shift_code,
        shift_name: record.shift_name,
        policy_id: record.policy_id,
        policy_code: record.policy_code,
        policy_version: record.policy_version,
        lifecycle_status: record.lifecycle_status,
        status: record.status,
        exception_type: record.exception_type,
        exception_reason: record.exception_reason,
        first_in: record.first_in,
        last_out: record.last_out,
        gross_minutes: record.gross_minutes,
        net_minutes: record.net_minutes,
        break_minutes: record.break_minutes,
        late_minutes: record.late_minutes,
        early_minutes: record.early_minutes,
        overtime_minutes: record.overtime_minutes,
        regularization_id: record.regularization_id,
        regularization_reason: record.regularization_reason,
        calculation_explanation: record.calculation_explanation,
        audit_trail: record.audit_trail,
        calculated_at: record.calculated_at,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[attendanceRosterService] syncLedgerRecordToDb fallback:', e);
    }
  }

  private async syncAuditLogToDb(log: PolicyAuditLog): Promise<void> {
    if (!isSupabaseEnabled || !supabase) return;
    try {
      await supabase.from('attendance_policy_audit_logs').insert({
        id: log.id,
        organization_id: log.tenant_id,
        actor_name: log.actor_name,
        actor_role: log.actor_role,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        entity_name: log.entity_name,
        change_summary: log.change_summary,
        previous_value: log.previous_value,
        new_value: log.new_value,
        reason: log.reason,
        timestamp: log.timestamp,
      });
    } catch (e) {
      console.warn('[attendanceRosterService] syncAuditLogToDb fallback:', e);
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
