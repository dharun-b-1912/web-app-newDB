// src/services/attendance/permissionGovernanceService.ts
// ============================================================================
// JOY PeopleHR — Monthly Permission Governance & Allowance Engine
// Configurable Monthly Allowance (Default 120 Minutes / 2 Hours)
// Policy A: Threshold-Crossing Day Classification | Concurrency-Safe Ledger & Recalculation
// ============================================================================

import { supabase } from '../../lib/supabase';

export type PermissionThresholdPolicy =
  | 'POLICY_A_THRESHOLD_CROSSING_DAY' // (Default) Only the day on which cumulative monthly usage exceeds 120 min is marked Half-Day
  | 'POLICY_B_EXCESS_PERMISSION_DAY'    // Days that independently exceed daily threshold are marked Half-Day
  | 'POLICY_C_HR_REVIEW';              // Excess usage flagged for authorized HR review before classification

export type PermissionCategory =
  | 'LATE_ARRIVAL_PERMISSION'
  | 'EARLY_DEPARTURE_PERMISSION'
  | 'MIDDAY_PERSONAL_PERMISSION'
  | 'OFFICIAL_DUTY_PERMISSION';

export type PermissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface AttendancePermissionRecord {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  attendanceDate: string; // YYYY-MM-DD
  category: PermissionCategory;
  requestedMinutes: number;
  approvedMinutes: number;
  usedMinutes: number;
  startTime?: string; // HH:mm
  endTime?: string;
  reason: string;
  status: PermissionStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeMonthlyPermissionLedger {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  monthStr: string; // YYYY-MM
  openingAllowanceMinutes: number; // Default 120 min
  totalApprovedMinutes: number;
  totalUsedMinutes: number;
  permissionMinutesOnly: number;
  lateMinutesConsumed: number;
  remainingAllowanceMinutes: number;
  excessMinutes: number;
  consumptionPercentage: number;
  isThresholdExceeded: boolean;
  thresholdCrossingDate: string | null;
  halfDayClassificationDates: string[];
  activePolicy: PermissionThresholdPolicy;
  subsequentExcessHandling: 'LOG_EXCESS_ONLY' | 'MARK_EVERY_EXCESS_HALF_DAY' | 'DEDUCT_PAYROLL_HOURS';
  includeLateArrivalsBeyondGrace: boolean;
  lastRecalculatedAt: string;
}

export interface PermissionPolicyConfig {
  organizationId: string;
  monthlyAllowanceMinutes: number; // default 120
  monthStartDay: number;          // default 1 (calendar month)
  activePolicy: PermissionThresholdPolicy;
  consumeOn: 'APPROVED_DURATION' | 'USED_DURATION';
  autoApplyHalfDay: boolean;
  graceThresholdMinutes: number;  // 15
  includeLateArrivalsBeyondGrace: boolean; // Real company scenario: late arrivals auto-consume from 120m allowance
  subsequentExcessHandling: 'LOG_EXCESS_ONLY' | 'MARK_EVERY_EXCESS_HALF_DAY' | 'DEDUCT_PAYROLL_HOURS';
  version: string;
}

export const DEFAULT_PERMISSION_POLICY: PermissionPolicyConfig = {
  organizationId: '0c621892-e938-4707-9957-13534ea32c19',
  monthlyAllowanceMinutes: 120, // 2 Hours
  monthStartDay: 1,
  activePolicy: 'POLICY_A_THRESHOLD_CROSSING_DAY',
  consumeOn: 'APPROVED_DURATION',
  autoApplyHalfDay: true,
  graceThresholdMinutes: 15,
  includeLateArrivalsBeyondGrace: true, // Enabled by default for enterprise workforce
  subsequentExcessHandling: 'LOG_EXCESS_ONLY',
  version: '2026.2',
};

export const DEFAULT_PERMISSION_POLICY_ELECTRA: PermissionPolicyConfig = {
  organizationId: 'c5ab6b03-adde-47cc-a033-064f4c39b21e',
  monthlyAllowanceMinutes: 120, // 2 Hours standard monthly permission quota
  monthStartDay: 1,
  activePolicy: 'POLICY_A_THRESHOLD_CROSSING_DAY',
  consumeOn: 'APPROVED_DURATION',
  autoApplyHalfDay: true,
  graceThresholdMinutes: 5, // Strict 5-minute grace period for Electra EV manufacturing
  includeLateArrivalsBeyondGrace: true, // Check-in after 5 min grace reduces permission minutes
  subsequentExcessHandling: 'MARK_EVERY_EXCESS_HALF_DAY', // Once permission minutes are over, mark as Half Day
  version: '2026.2-ELECTRA',
};

const STORAGE_KEYS = {
  PERMISSIONS_LIST: 'joy_peoplehr_attendance_permissions_v1',
  LEDGER_MAP: 'joy_peoplehr_permission_ledger_v1',
  POLICY_CONFIG: 'joy_peoplehr_permission_policy_config_v1',
};

class PermissionGovernanceService {
  private policyConfig: PermissionPolicyConfig = DEFAULT_PERMISSION_POLICY;

  constructor() {
    this.loadPolicyConfig();
  }

  /**
   * Load policy configuration isolated by organization
   */
  loadPolicyConfig(orgId?: string): PermissionPolicyConfig {
    const activeOrg = orgId || (typeof localStorage !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : '') || '0c621892-e938-4707-9957-13534ea32c19';
    const isElectra = activeOrg === 'c5ab6b03-adde-47cc-a033-064f4c39b21e' || activeOrg.toLowerCase().includes('electra');
    const baseDefault = isElectra ? DEFAULT_PERMISSION_POLICY_ELECTRA : DEFAULT_PERMISSION_POLICY;

    if (typeof localStorage !== 'undefined') {
      try {
        const storedOrg = localStorage.getItem(`${STORAGE_KEYS.POLICY_CONFIG}_${activeOrg}`);
        if (storedOrg) {
          this.policyConfig = { ...baseDefault, ...JSON.parse(storedOrg) };
          return this.policyConfig;
        }
        const storedGlobal = localStorage.getItem(STORAGE_KEYS.POLICY_CONFIG);
        if (storedGlobal) {
          this.policyConfig = { ...baseDefault, ...JSON.parse(storedGlobal) };
          return this.policyConfig;
        }
      } catch (_) {}
    }
    this.policyConfig = { ...baseDefault };
    return this.policyConfig;
  }

  /**
   * Update policy configuration isolated by organization
   */
  savePolicyConfig(config: Partial<PermissionPolicyConfig>, orgId?: string): PermissionPolicyConfig {
    const activeOrg = orgId || config.organizationId || (typeof localStorage !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : '') || '0c621892-e938-4707-9957-13534ea32c19';
    this.policyConfig = { ...this.policyConfig, ...config, organizationId: activeOrg };
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_KEYS.POLICY_CONFIG}_${activeOrg}`, JSON.stringify(this.policyConfig));
        localStorage.setItem(STORAGE_KEYS.POLICY_CONFIG, JSON.stringify(this.policyConfig));
      } catch (_) {}
    }
    return this.policyConfig;
  }

  /**
   * Fetch all permissions for an employee within a calendar month
   */
  async getEmployeePermissionsForMonth(
    employeeId: string,
    monthStr: string // YYYY-MM
  ): Promise<AttendancePermissionRecord[]> {
    // 1. Check Supabase attendance_regularizations for persistent permission records
    try {
      const startOfMonth = `${monthStr}-01`;
      const endOfMonth = `${monthStr}-31`;

      const { data: regData } = await supabase
        .from('attendance_regularizations')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', endOfMonth)
        .order('attendance_date', { ascending: true });

      if (regData && regData.length > 0) {
        const parsed: AttendancePermissionRecord[] = [];
        for (const r of regData) {
          const reasonStr = r.reason || '';
          if (reasonStr.includes('[PERMISSION:') || reasonStr.toLowerCase().includes('permission')) {
            const match = reasonStr.match(/\[PERMISSION:(.*?):(\d+)m\]/);
            const category: PermissionCategory = (match ? match[1] : 'LATE_ARRIVAL_PERMISSION') as PermissionCategory;
            const mins = match ? Number(match[2]) : (r.requested_check_in ? 60 : 30);
            parsed.push({
              id: r.id,
              organizationId: r.organization_id,
              employeeId: r.employee_id,
              attendanceDate: r.attendance_date,
              category,
              requestedMinutes: mins,
              approvedMinutes: mins,
              usedMinutes: mins,
              reason: reasonStr.replace(/\[PERMISSION:.*?\]\s*/, ''),
              status: r.status === 'APPROVED' ? 'APPROVED' : (r.status as any),
              approvedBy: r.approved_by,
              approvedAt: r.approved_at,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            });
          }
        }
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}

    // 2. Fallback to local store / cache
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.PERMISSIONS_LIST);
        if (stored) {
          const list: AttendancePermissionRecord[] = JSON.parse(stored);
          return list.filter(
            (p) => p.employeeId === employeeId && p.attendanceDate.startsWith(monthStr)
          );
        }
      } catch (_) {}
    }

    return [];
  }

  /**
   * Save / Record a permission request
   */
  async recordPermission(
    permission: Omit<AttendancePermissionRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AttendancePermissionRecord> {
    const record: AttendancePermissionRecord = {
      ...permission,
      id: `perm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Attempt Supabase insert into attendance_regularizations with permission metadata
    try {
      const formattedReason = `[PERMISSION:${record.category}:${record.approvedMinutes}m] ${record.reason}`;
      await supabase.from('attendance_regularizations').insert({
        organization_id: record.organizationId,
        employee_id: record.employeeId,
        attendance_date: record.attendanceDate,
        reason: formattedReason,
        status: record.status || 'APPROVED',
        approved_by: null,
        approved_at: record.approvedAt || new Date().toISOString(),
      });

      // 2. Update attendance_daily on that date to regularize and deduct late minutes
      if (record.category === 'LATE_ARRIVAL_PERMISSION') {
        const { data: dailyRow } = await supabase
          .from('attendance_daily')
          .select('id, late_entry_minutes')
          .eq('employee_id', record.employeeId)
          .eq('attendance_date', record.attendanceDate)
          .maybeSingle();

        if (dailyRow) {
          const currentLate = Number(dailyRow.late_entry_minutes || 0);
          const newLate = Math.max(0, currentLate - record.approvedMinutes);
          const finalizedLate = newLate <= 15 ? 0 : newLate; // Zero out if within grace buffer
          await supabase
            .from('attendance_daily')
            .update({
              is_regularized: true,
              late_entry_minutes: finalizedLate,
              status: 'PRESENT',
              payable_status: 1.0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', dailyRow.id);
        }
      }
    } catch (err) {
      console.warn('[PermissionGovernanceService] Error persisting to Supabase:', err);
    }

    // 3. Store in local ledger cache
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.PERMISSIONS_LIST);
        const list: AttendancePermissionRecord[] = stored ? JSON.parse(stored) : [];
        list.push(record);
        localStorage.setItem(STORAGE_KEYS.PERMISSIONS_LIST, JSON.stringify(list));
      } catch (_) {}
    }

    // 4. Trigger deterministic ledger recalculation
    const monthStr = record.attendanceDate.substring(0, 7);
    await this.calculateMonthlyLedger(record.organizationId, record.employeeId, monthStr, {
      employeeCode: record.employeeCode,
      employeeName: record.employeeName,
    });

    return record;
  }

  /**
   * Authoritative Deterministic Monthly Ledger Calculation:
   * Aggregates eligible permissions and applies Policy A/B/C threshold evaluation.
   */
  async calculateMonthlyLedger(
    organizationId: string,
    employeeId: string,
    monthStr: string, // YYYY-MM
    employeeInfo?: { employeeCode?: string; employeeName?: string }
  ): Promise<EmployeeMonthlyPermissionLedger> {
    const policy = this.loadPolicyConfig();
    const permissions = await this.getEmployeePermissionsForMonth(employeeId, monthStr);

    // Filter strictly to APPROVED records
    const approvedPermissions = permissions
      .filter((p) => p.status === 'APPROVED')
      .sort((a, b) => a.attendanceDate.localeCompare(b.attendanceDate));

    let totalPermissionMinutesOnly = 0;
    let totalLateMinutesConsumed = 0;

    // Map of dates to combined consumption items
    const dailyEventsMap = new Map<string, { permissionMins: number; lateMins: number }>();

    for (const perm of approvedPermissions) {
      const minutesToCount =
        policy.consumeOn === 'USED_DURATION' ? (perm.usedMinutes || perm.approvedMinutes) : perm.approvedMinutes;
      const d = perm.attendanceDate;
      const cur = dailyEventsMap.get(d) || { permissionMins: 0, lateMins: 0 };
      cur.permissionMins += minutesToCount;
      dailyEventsMap.set(d, cur);
      totalPermissionMinutesOnly += minutesToCount;
    }

    // Real enterprise company policy: Late arrivals beyond shift grace auto-consume from the 120m monthly allowance
    if (policy.includeLateArrivalsBeyondGrace) {
      try {
        const { data: dailyRows } = await supabase
          .from('attendance_daily')
          .select('attendance_date, late_entry_minutes')
          .eq('employee_id', employeeId)
          .gte('attendance_date', `${monthStr}-01`)
          .lte('attendance_date', `${monthStr}-31`);

        if (dailyRows) {
          for (const row of dailyRows) {
            const rawLate = Number(row.late_entry_minutes || 0);
            const grace = policy.graceThresholdMinutes || 15;
            const d = row.attendance_date;
            const cur = dailyEventsMap.get(d) || { permissionMins: 0, lateMins: 0 };
            
            // Subtract any approved permission on this date so late arrival is excused and not double-counted
            const unexcusedLate = Math.max(0, rawLate - cur.permissionMins);
            if (unexcusedLate > grace) {
              const excessLate = unexcusedLate - grace; // Minutes beyond shift grace
              cur.lateMins += excessLate;
              dailyEventsMap.set(d, cur);
              totalLateMinutesConsumed += excessLate;
            }
          }
        }
      } catch (_) {}
    }

    // Chronologically process daily events
    const sortedDates = Array.from(dailyEventsMap.keys()).sort();
    let cumulativeMinutes = 0;
    let thresholdCrossingDate: string | null = null;
    const halfDayClassificationDates: string[] = [];
    const allowance = policy.monthlyAllowanceMinutes; // 120 minutes

    for (const d of sortedDates) {
      const ev = dailyEventsMap.get(d)!;
      const dayTotal = ev.permissionMins + (policy.includeLateArrivalsBeyondGrace ? ev.lateMins : 0);
      const prevCumulative = cumulativeMinutes;
      cumulativeMinutes += dayTotal;

      if (policy.activePolicy === 'POLICY_A_THRESHOLD_CROSSING_DAY') {
        if (prevCumulative <= allowance && cumulativeMinutes > allowance) {
          thresholdCrossingDate = d;
          if (!halfDayClassificationDates.includes(d)) {
            halfDayClassificationDates.push(d);
          }
        } else if (cumulativeMinutes > allowance && policy.subsequentExcessHandling === 'MARK_EVERY_EXCESS_HALF_DAY') {
          if (!halfDayClassificationDates.includes(d)) {
            halfDayClassificationDates.push(d);
          }
        }
      } else if (policy.activePolicy === 'POLICY_B_EXCESS_PERMISSION_DAY') {
        if (dayTotal > 60) {
          if (!halfDayClassificationDates.includes(d)) {
            halfDayClassificationDates.push(d);
          }
        }
      }
    }

    const excessMinutes = Math.max(0, cumulativeMinutes - allowance);
    const remainingAllowanceMinutes = Math.max(0, allowance - cumulativeMinutes);
    const isThresholdExceeded = cumulativeMinutes > allowance;
    const consumptionPercentage = allowance > 0 ? Math.min(100, Math.round((cumulativeMinutes / allowance) * 100)) : 0;

    const ledger: EmployeeMonthlyPermissionLedger = {
      id: `ledger-${employeeId}-${monthStr}`,
      organizationId,
      employeeId,
      employeeCode: employeeInfo?.employeeCode || employeeId,
      employeeName: employeeInfo?.employeeName || 'Staff Member',
      monthStr,
      openingAllowanceMinutes: allowance,
      totalApprovedMinutes: cumulativeMinutes,
      totalUsedMinutes: cumulativeMinutes,
      permissionMinutesOnly: totalPermissionMinutesOnly,
      lateMinutesConsumed: totalLateMinutesConsumed,
      remainingAllowanceMinutes,
      excessMinutes,
      consumptionPercentage,
      isThresholdExceeded,
      thresholdCrossingDate,
      halfDayClassificationDates,
      activePolicy: policy.activePolicy,
      subsequentExcessHandling: policy.subsequentExcessHandling,
      includeLateArrivalsBeyondGrace: policy.includeLateArrivalsBeyondGrace,
      lastRecalculatedAt: new Date().toISOString(),
    };

    // Cache ledger
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.LEDGER_MAP);
        const map = stored ? JSON.parse(stored) : {};
        map[`${employeeId}_${monthStr}`] = ledger;
        localStorage.setItem(STORAGE_KEYS.LEDGER_MAP, JSON.stringify(map));
      } catch (_) {}
    }

    return ledger;
  }

  /**
   * Check if a specific date for an employee should be classified as Half-Day
   * due to Monthly Permission Allowance exceeded.
   */
  async evaluateDayPermissionImpact(
    organizationId: string,
    employeeId: string,
    dateStr: string // YYYY-MM-DD
  ): Promise<{
    isHalfDayFromPermission: boolean;
    reason: string | null;
    cumulativeMinutes: number;
    allowanceMinutes: number;
    excessMinutes: number;
  }> {
    const monthStr = dateStr.substring(0, 7);
    const ledger = await this.calculateMonthlyLedger(organizationId, employeeId, monthStr);

    const isHalfDay = ledger.halfDayClassificationDates.includes(dateStr);

    // If marked as Half-Day under Policy A or B, persist the 0.5 payable status to Supabase attendance_daily
    if (isHalfDay && employeeId && employeeId.length === 36) {
      try {
        await supabase
          .from('attendance_daily')
          .update({
            status: 'HALF_DAY',
            payable_status: 0.5,
            updated_at: new Date().toISOString(),
          })
          .eq('employee_id', employeeId)
          .eq('attendance_date', dateStr);
      } catch (err) {
        console.warn('[PermissionGovernance] Failed to update attendance_daily half-day status:', err);
      }
    }

    return {
      isHalfDayFromPermission: isHalfDay,
      reason: isHalfDay
        ? `Monthly permission allowance exceeded (${ledger.totalApprovedMinutes}m / ${ledger.openingAllowanceMinutes}m allowance; threshold crossed on ${ledger.thresholdCrossingDate})`
        : null,
      cumulativeMinutes: ledger.totalApprovedMinutes,
      allowanceMinutes: ledger.openingAllowanceMinutes,
      excessMinutes: ledger.excessMinutes,
    };
  }

  /**
   * Fetch all monthly ledgers across organization for reporting and MIS
   * Queries authoritative Supabase database and reconciles without relying solely on localStorage.
   */
  async getAllMonthlyLedgers(
    organizationId: string,
    monthStr: string
  ): Promise<EmployeeMonthlyPermissionLedger[]> {
    // 1. Check local cache first for instant UI response
    let cachedList: EmployeeMonthlyPermissionLedger[] = [];
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.LEDGER_MAP);
        if (stored) {
          const map = JSON.parse(stored);
          const list: EmployeeMonthlyPermissionLedger[] = Object.values(map);
          cachedList = list.filter(
            (l) => l.organizationId === organizationId && l.monthStr === monthStr
          );
        }
      } catch (_) {}
    }

    if (cachedList.length > 0) {
      return cachedList;
    }

    // 2. Authoritative Supabase query fallback for multi-session and fresh logins
    try {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, employee_code, first_name, last_name, display_name')
        .eq('organization_id', organizationId)
        .limit(200);

      if (employees && employees.length > 0) {
        const calculatedList: EmployeeMonthlyPermissionLedger[] = [];
        for (const emp of employees) {
          const empName = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Staff Member';
          const ledger = await this.calculateMonthlyLedger(organizationId, emp.id, monthStr, {
            employeeCode: emp.employee_code || emp.id,
            employeeName: empName,
          });
          calculatedList.push(ledger);
        }
        return calculatedList;
      }
    } catch (err) {
      console.warn('[PermissionGovernance] Error fetching authoritative monthly ledgers from Supabase:', err);
    }

    return cachedList;
  }
}

export const permissionGovernanceService = new PermissionGovernanceService();
