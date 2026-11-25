// src/services/attendance/shiftReportScheduleService.ts
// ============================================================================
// Joy PeopleHR Enterprise — Shift-Based Timed Report Workflow & Automation
// Supports per-shift Check-In (e.g. Shift Start + 30m -> 06:30 AM) and
// Check-Out (e.g. Shift End + 30m -> 03:00 PM) automated & manual dispatches
// with Shift-Wise & Department-Wise structured summaries (Electra EV & all orgs).
// Completely isolated so existing Daily/Weekly/Monthly MIS flows are unaffected.
// ============================================================================

import { supabase } from '../../lib/supabase';
import { AttendanceReportRow } from './attendanceReportExportService';
import { ELECTRA_EV_SHIFTS, DEFAULT_SHIFTS } from './smartShiftResolutionService';

export type ShiftReportPhase = 'CHECK_IN' | 'CHECK_OUT';

export interface ShiftReportRule {
  id: string;
  shiftCode: string;
  shiftName: string;
  shiftStart: string; // HH:MM (24-hr)
  shiftEnd: string;   // HH:MM (24-hr)
  isOvernight: boolean;

  // Check-In Turnout Dispatch (e.g. 06:00 start + 30 min = 06:30 AM)
  checkInEnabled: boolean;
  checkInOffsetMinutes: number;
  checkInDispatchTime: string; // HH:MM (24-hr)

  // Check-Out & OT Dispatch (e.g. 14:30 end + 30 min = 15:00 / 03:00 PM)
  checkOutEnabled: boolean;
  checkOutOffsetMinutes: number;
  checkOutDispatchTime: string; // HH:MM (24-hr)

  departmentFilter: string; // 'ALL' or specific department name
  includeDepartmentBreakdown: boolean;
  lastCheckInRunDate?: string;
  lastCheckOutRunDate?: string;
}

export interface ShiftReportScheduleConfig {
  enabled: boolean;
  organizationId: string;
  rules: ShiftReportRule[];
  updatedAt: string;
}

export interface DepartmentShiftMetrics {
  department: string;
  total: number;
  checkedIn: number;
  checkedOut: number;
  onTime: number;
  late: number;
  absentOrNotIn: number;
  onLeave: number;
  earlyCheckout: number;
  overtimeCount: number;
  missingOutPunch: number;
  totalOtMinutes: number;
  totalNetMinutes: number;
}

export interface ShiftDepartmentStructuredSummary {
  shiftCode: string;
  shiftName: string;
  phase: ShiftReportPhase;
  totalEmployees: number;
  checkedInCount: number;
  checkedOutCount: number;
  onTimeCount: number;
  lateCount: number;
  absentOrNotInCount: number;
  onLeaveCount: number;
  earlyCheckoutCount: number;
  overtimeCount: number;
  missingOutPunchCount: number;
  turnoutPct: number;
  departments: DepartmentShiftMetrics[];
}

const STORAGE_PREFIX = 'joy_shift_report_schedule_v1_';

/**
 * Adds offsetMinutes to a 24-hr HH:MM(SS) string, wrapping cleanly across midnight.
 */
export function computeOffsetTime24(baseTime24: string, offsetMinutes: number = 30): string {
  const parts = String(baseTime24 || '09:00').split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  if (isNaN(h)) return '09:30';
  const total = ((h * 60 + m + offsetMinutes) % 1440 + 1440) % 1440;
  const outH = Math.floor(total / 60);
  const outM = total % 60;
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
}

export function formatTime24To12(time24: string): string {
  const parts = String(time24 || '09:00').split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] ? parts[1].replace(/\D/g, '').padStart(2, '0').slice(0, 2) : '00';
  if (isNaN(h)) h = 9;
  const period = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, '0')}:${m} ${period}`;
}

export function isElectraEvOrg(orgId?: string): boolean {
  if (!orgId) return false;
  return (
    orgId === 'c5ab6b03-adde-47cc-a033-064f4c39b21e' ||
    orgId === 'c0bbfb28-1500-4ebb-aba8-453b3681f342' ||
    orgId === 'org-electra-01'
  );
}

/**
 * Generates default shift-based report dispatch rules for an organization.
 * Defaults to +30 minutes after shift start (Check-In) and +30 minutes after shift end (Check-Out).
 */
export function getDefaultShiftRulesForOrg(orgId: string, customShifts?: any[]): ShiftReportRule[] {
  const sourceShifts = isElectraEvOrg(orgId)
    ? ELECTRA_EV_SHIFTS
    : (customShifts && customShifts.length > 0 ? customShifts : DEFAULT_SHIFTS);

  return sourceShifts.map((s: any, idx: number) => {
    const code = s.code || s.shift_code || `SHIFT-${idx + 1}`;
    const name = s.name || s.shift_name || code;
    const startRaw = String(s.start_time || '09:00').slice(0, 5);
    const endRaw = String(s.end_time || '18:00').slice(0, 5);
    const isOvernight = Boolean(s.is_overnight || s.cross_midnight);

    return {
      id: s.id || `rule-${code}`,
      shiftCode: code,
      shiftName: name,
      shiftStart: startRaw,
      shiftEnd: endRaw,
      isOvernight,
      checkInEnabled: true,
      checkInOffsetMinutes: 30,
      checkInDispatchTime: computeOffsetTime24(startRaw, 30),
      checkOutEnabled: true,
      checkOutOffsetMinutes: 30,
      checkOutDispatchTime: computeOffsetTime24(endRaw, 30),
      departmentFilter: 'ALL',
      includeDepartmentBreakdown: true,
    };
  });
}

class ShiftReportScheduleService {
  private cache = new Map<string, ShiftReportScheduleConfig>();

  getScheduleSync(orgId: string, customShifts?: any[]): ShiftReportScheduleConfig {
    if (this.cache.has(orgId)) {
      return this.cache.get(orgId)!;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${orgId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as ShiftReportScheduleConfig;
          if (parsed && Array.isArray(parsed.rules) && parsed.rules.length > 0) {
            this.cache.set(orgId, parsed);
            return parsed;
          }
        }
      }
    } catch (_) {}

    const def: ShiftReportScheduleConfig = {
      enabled: isElectraEvOrg(orgId),
      organizationId: orgId,
      rules: getDefaultShiftRulesForOrg(orgId, customShifts),
      updatedAt: new Date().toISOString(),
    };
    this.cache.set(orgId, def);
    return def;
  }

  async loadScheduleAsync(orgId: string, customShifts?: any[]): Promise<ShiftReportScheduleConfig> {
    try {
      const { data } = await supabase
        .from('attendance_report_schedules')
        .select('id, custom_note, updated_at')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check if shift_report_config is stored in localStorage or org metadata
      if (data?.custom_note && data.custom_note.includes('__SHIFT_RULES__:')) {
        const marker = '__SHIFT_RULES__:';
        const jsonPart = data.custom_note.split(marker)[1];
        if (jsonPart) {
          const parsed = JSON.parse(jsonPart) as ShiftReportScheduleConfig;
          if (parsed?.rules?.length > 0) {
            this.cache.set(orgId, parsed);
            try {
              localStorage.setItem(`${STORAGE_PREFIX}${orgId}`, JSON.stringify(parsed));
            } catch (_) {}
            return parsed;
          }
        }
      }
    } catch (_) {}

    return this.getScheduleSync(orgId, customShifts);
  }

  async saveScheduleAsync(orgId: string, config: ShiftReportScheduleConfig): Promise<ShiftReportScheduleConfig> {
    const updated: ShiftReportScheduleConfig = {
      ...config,
      organizationId: orgId,
      updatedAt: new Date().toISOString(),
    };
    this.cache.set(orgId, updated);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${STORAGE_PREFIX}${orgId}`, JSON.stringify(updated));
      }
    } catch (_) {}
    return updated;
  }

  /**
   * Filters attendance rows cleanly by shiftCode ('ALL' or exact shift code) and optional department.
   */
  filterRowsForShiftAndDepartment(
    rows: AttendanceReportRow[],
    shiftCode: string,
    department: string = 'ALL'
  ): AttendanceReportRow[] {
    return rows.filter((row) => {
      const rowShiftCode = String(
        row.shift?.shift_code ||
        (row.shift as any)?.code ||
        row.roster?.shift_code ||
        ''
      ).toUpperCase();
      const rowShiftName = String(row.shift?.shift_name || row.record?.shift_name || '').toUpperCase();

      const matchesShift =
        !shiftCode ||
        shiftCode === 'ALL' ||
        rowShiftCode === shiftCode.toUpperCase() ||
        rowShiftName.includes(shiftCode.toUpperCase());

      if (!matchesShift) return false;

      if (department && department !== 'ALL') {
        const empDept = String(row.emp?.department_name || row.emp?.department || row.record?.department || '').trim();
        return empDept.toLowerCase() === department.trim().toLowerCase();
      }
      return true;
    });
  }

  /**
   * Builds a structured Shift -> Department breakdown for Check-In or Check-Out reporting.
   */
  buildShiftDepartmentStructuredSummary(
    rows: AttendanceReportRow[],
    shiftCode: string,
    phase: ShiftReportPhase,
    department: string = 'ALL',
    shiftLabel?: string
  ): ShiftDepartmentStructuredSummary {
    const scoped = this.filterRowsForShiftAndDepartment(rows, shiftCode, department);
    const deptMap = new Map<string, DepartmentShiftMetrics>();

    let checkedInCount = 0;
    let checkedOutCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let absentOrNotInCount = 0;
    let onLeaveCount = 0;
    let earlyCheckoutCount = 0;
    let overtimeCount = 0;
    let missingOutPunchCount = 0;

    for (const row of scoped) {
      const deptName = String(row.emp?.department_name || row.emp?.department || row.record?.department || 'General').trim() || 'General';
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, {
          department: deptName,
          total: 0,
          checkedIn: 0,
          checkedOut: 0,
          onTime: 0,
          late: 0,
          absentOrNotIn: 0,
          onLeave: 0,
          earlyCheckout: 0,
          overtimeCount: 0,
          missingOutPunch: 0,
          totalOtMinutes: 0,
          totalNetMinutes: 0,
        });
      }
      const d = deptMap.get(deptName)!;
      d.total++;

      const rec = row.record;
      const hasIn = Boolean(rec?.first_check_in);
      const hasOut = Boolean(rec?.last_check_out);
      const status = rec?.status || 'Not Checked In';
      const lateMins = rec?.late_minutes || 0;
      const earlyMins = rec?.early_checkout_minutes || 0;
      const otMins = rec?.overtime_minutes || 0;
      const netMins = rec?.net_working_minutes || 0;

      if (hasIn) {
        checkedInCount++;
        d.checkedIn++;
        if (lateMins > 0 || status === 'Late') {
          lateCount++;
          d.late++;
        } else {
          onTimeCount++;
          d.onTime++;
        }

        if (hasOut) {
          checkedOutCount++;
          d.checkedOut++;
          d.totalNetMinutes += netMins;
        } else {
          missingOutPunchCount++;
          d.missingOutPunch++;
        }

        if (earlyMins > 0 || status === 'Early Checkout') {
          earlyCheckoutCount++;
          d.earlyCheckout++;
        }
        if (otMins > 0 || status === 'Overtime') {
          overtimeCount++;
          d.overtimeCount++;
          d.totalOtMinutes += otMins;
        }
      } else if (status === 'On Leave') {
        onLeaveCount++;
        d.onLeave++;
      } else {
        absentOrNotInCount++;
        d.absentOrNotIn++;
      }
    }

    const departments = Array.from(deptMap.values()).sort((a, b) => b.total - a.total);
    const totalEmployees = scoped.length;
    const turnoutPct = totalEmployees > 0 ? Math.round((checkedInCount / totalEmployees) * 100) : 0;

    return {
      shiftCode,
      shiftName: shiftLabel || (shiftCode === 'ALL' ? 'All Shifts' : shiftCode),
      phase,
      totalEmployees,
      checkedInCount,
      checkedOutCount,
      onTimeCount,
      lateCount,
      absentOrNotInCount,
      onLeaveCount,
      earlyCheckoutCount,
      overtimeCount,
      missingOutPunchCount,
      turnoutPct,
      departments,
    };
  }

  formatShiftEmailSubject(params: {
    companyName: string;
    reportDate: string;
    shiftCode: string;
    shiftName?: string;
    phase: ShiftReportPhase;
    department?: string;
    dispatchTimeLabel?: string;
  }): string {
    const phaseTag = params.phase === 'CHECK_IN' ? 'CHECK-IN TURNOUT' : 'CHECK-OUT & OT AUDIT';
    const shiftTag = params.shiftCode === 'ALL' ? 'All Shifts' : `${params.shiftCode}${params.shiftName ? ` (${params.shiftName})` : ''}`;
    const deptTag = params.department && params.department !== 'ALL' ? ` • Dept: ${params.department}` : ' • Dept-Wise Breakdown';
    const timeTag = params.dispatchTimeLabel ? ` @ ${params.dispatchTimeLabel}` : '';
    return `[Joy PeopleHR] [${phaseTag}] ${shiftTag}${timeTag} — ${params.reportDate} (${params.companyName}${deptTag})`;
  }

  formatShiftExecutiveNote(params: {
    summary: ShiftDepartmentStructuredSummary;
    reportDate: string;
    companyName: string;
    dispatchTimeLabel?: string;
  }): string {
    const { summary, reportDate, companyName, dispatchTimeLabel } = params;
    const deptLines = summary.departments
      .map(
        (d) =>
          summary.phase === 'CHECK_IN'
            ? `• ${d.department}: ${d.checkedIn}/${d.total} In (On-Time: ${d.onTime}, Late: ${d.late}, Not In: ${d.absentOrNotIn})`
            : `• ${d.department}: ${d.checkedOut}/${d.checkedIn} Out (Missing Out: ${d.missingOutPunch}, Early Out: ${d.earlyCheckout}, OT Staff: ${d.overtimeCount})`
      )
      .join('\n');

    if (summary.phase === 'CHECK_IN') {
      return [
        `[SHIFT CHECK-IN TURNOUT REPORT] ${summary.shiftName} | Date: ${reportDate}${dispatchTimeLabel ? ` | Cutoff: ${dispatchTimeLabel}` : ''}`,
        `Organization: ${companyName} | Scheduled: ${summary.totalEmployees} | Checked In: ${summary.checkedInCount} (${summary.turnoutPct}%) | On-Time: ${summary.onTimeCount} | Late: ${summary.lateCount} | Not Checked In: ${summary.absentOrNotInCount}`,
        '',
        'Department-Wise Check-In Breakdown:',
        deptLines || '• No department records in scope.',
      ].join('\n');
    }

    return [
      `[SHIFT CHECK-OUT & OT RECONCILIATION] ${summary.shiftName} | Date: ${reportDate}${dispatchTimeLabel ? ` | Cutoff: ${dispatchTimeLabel}` : ''}`,
      `Organization: ${companyName} | Checked In: ${summary.checkedInCount} | Checked Out: ${summary.checkedOutCount} | Missing Out: ${summary.missingOutPunchCount} | Early Out: ${summary.earlyCheckoutCount} | Overtime Staff: ${summary.overtimeCount}`,
      '',
      'Department-Wise Check-Out & Overtime Breakdown:',
      deptLines || '• No department records in scope.',
    ].join('\n');
  }
}

export const shiftReportScheduleService = new ShiftReportScheduleService();

