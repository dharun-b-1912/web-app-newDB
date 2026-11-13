export type BreakCategoryCode =
  | 'LUNCH'
  | 'TEA'
  | 'COFFEE'
  | 'PERSONAL'
  | 'REST'
  | 'OTHER';

export interface BreakCategoryConfig {
  code: BreakCategoryCode;
  label: string;
  paid: boolean;
  max_minutes_per_break: number;
  max_per_day: number;
  auto_deduct_eligible: boolean;
  core_hours_allowed: boolean;
  enabled: boolean;
}

export interface ScopedBreakPolicy {
  id: string;
  organization_id: string;
  name: string;
  version: number;
  scope_type: 'ORGANIZATION' | 'BRANCH' | 'DEPARTMENT' | 'SHIFT' | 'EMPLOYEE';
  scope_id: string | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  auto_deduct_enabled: boolean;
  auto_deduct_after_minutes: number;
  auto_deduct_minutes: number;
  paid_break_allowance_minutes: number;
  max_unpaid_break_minutes: number;
  max_breaks_per_day: number;
  core_hours_start: string;
  core_hours_end: string;
  breaks_prohibited_in_core_hours: boolean;
  mandatory_lunch_break: boolean;
  rounding_rule: 'NONE' | 'NEAREST_5' | 'UP_5' | 'DOWN_5' | 'NEAREST_15';
  categories: BreakCategoryConfig[];
}

export interface PersistedBreakEvent {
  id: string;
  organization_id: string;
  employee_id: string;
  attendance_daily_id?: string | null;
  attendance_date: string;
  break_category: BreakCategoryCode;
  is_paid: boolean;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  status: 'ACTIVE' | 'COMPLETED' | 'AUTO_CLOSED' | 'CANCELLED' | 'CORRECTED';
  source: string;
  policy_id?: string | null;
  policy_version?: number | null;
  is_excess?: boolean;
  excess_minutes?: number;
  is_core_hours_violation?: boolean;
  notes?: string | null;
  corrected_by?: string | null;
  correction_reason?: string | null;
}

export interface WorkHoursInput {
  grossPresenceMinutes: number;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  scheduledMinutes: number;
  approvedOtMinutes?: number;
  breaks: Pick<
    PersistedBreakEvent,
    'id' | 'break_category' | 'is_paid' | 'started_at' | 'ended_at' | 'duration_minutes' | 'status'
  >[];
  policy: Pick<
    ScopedBreakPolicy,
    | 'name'
    | 'version'
    | 'auto_deduct_enabled'
    | 'auto_deduct_after_minutes'
    | 'auto_deduct_minutes'
    | 'paid_break_allowance_minutes'
    | 'max_unpaid_break_minutes'
    | 'core_hours_start'
    | 'core_hours_end'
    | 'breaks_prohibited_in_core_hours'
    | 'mandatory_lunch_break'
    | 'rounding_rule'
  >;
  referenceNowIso?: string;
}

export interface ComputedWorkHoursResult {
  grossPresenceMinutes: number;
  rawBreakMinutes: number;
  paidBreakMinutes: number;
  unpaidBreakMinutes: number;
  excessPaidConvertedMinutes: number;
  autoDeductedBreakMinutes: number;
  totalDeductedMinutes: number;
  netPayableMinutes: number;
  approvedOtMinutes: number;
  deficitMinutes: number;
  hasActiveBreak: boolean;
  hasMissingLunchException: boolean;
  hasExceededUnpaidLimit: boolean;
  hasCoreHoursViolation: boolean;
  steps: string[];
}

export const DEFAULT_BREAK_CATEGORIES: BreakCategoryConfig[] = [
  {
    code: 'LUNCH',
    label: 'Lunch Break',
    paid: false,
    max_minutes_per_break: 60,
    max_per_day: 1,
    auto_deduct_eligible: true,
    core_hours_allowed: true,
    enabled: true,
  },
  {
    code: 'TEA',
    label: 'Tea Break',
    paid: true,
    max_minutes_per_break: 15,
    max_per_day: 2,
    auto_deduct_eligible: false,
    core_hours_allowed: true,
    enabled: true,
  },
  {
    code: 'COFFEE',
    label: 'Coffee Break',
    paid: true,
    max_minutes_per_break: 15,
    max_per_day: 2,
    auto_deduct_eligible: false,
    core_hours_allowed: true,
    enabled: true,
  },
  {
    code: 'PERSONAL',
    label: 'Personal Break',
    paid: false,
    max_minutes_per_break: 30,
    max_per_day: 2,
    auto_deduct_eligible: false,
    core_hours_allowed: false,
    enabled: true,
  },
  {
    code: 'REST',
    label: 'Rest Break',
    paid: true,
    max_minutes_per_break: 15,
    max_per_day: 2,
    auto_deduct_eligible: false,
    core_hours_allowed: true,
    enabled: true,
  },
  {
    code: 'OTHER',
    label: 'Other Break',
    paid: false,
    max_minutes_per_break: 30,
    max_per_day: 2,
    auto_deduct_eligible: false,
    core_hours_allowed: false,
    enabled: true,
  },
];

function parseHhMmToMinutes(hhmm: string): number {
  const parts = String(hhmm || '00:00').split(':');
  const h = Number(parts[0] || 0);
  const m = Number(parts[1] || 0);
  return h * 60 + m;
}

function applyRounding(minutes: number, rule: ScopedBreakPolicy['rounding_rule']): number {
  if (minutes <= 0 || rule === 'NONE') return Math.max(0, Math.round(minutes));
  if (rule === 'NEAREST_5') return Math.round(minutes / 5) * 5;
  if (rule === 'UP_5') return Math.ceil(minutes / 5) * 5;
  if (rule === 'DOWN_5') return Math.floor(minutes / 5) * 5;
  if (rule === 'NEAREST_15') return Math.round(minutes / 15) * 15;
  return Math.max(0, Math.round(minutes));
}

function overlapsCoreHours(
  startIso: string,
  endIso: string,
  coreStartHhMm: string,
  coreEndHhMm: string
): boolean {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return false;
  const coreStart = parseHhMmToMinutes(coreStartHhMm);
  const coreEnd = parseHhMmToMinutes(coreEndHhMm);
  const sMin = s.getHours() * 60 + s.getMinutes();
  const eMin = e.getHours() * 60 + e.getMinutes();

  if (coreEnd > coreStart) {
    return sMin < coreEnd && eMin > coreStart;
  }
  return sMin >= coreStart || eMin <= coreEnd;
}

export interface AttendanceTimelineInterval {
  id: string;
  type: 'CHECK_IN' | 'WORK' | 'PAID_BREAK' | 'UNPAID_BREAK' | 'OVERTIME' | 'CHECK_OUT';
  title: string;
  start_at: string;
  end_at: string | null;
  duration_minutes: number;
  is_current: boolean;
  is_paid?: boolean;
  break_event?: Pick<
    PersistedBreakEvent,
    'id' | 'break_category' | 'is_paid' | 'started_at' | 'ended_at' | 'duration_minutes' | 'status'
  >;
}

/**
 * Shared chronological timeline builder matching the Flutter employee timeline.
 */
export function buildAttendanceTimelineIntervals(params: {
  checkInAt?: string | null;
  checkOutAt?: string | null;
  breaks: Pick<
    PersistedBreakEvent,
    'id' | 'break_category' | 'is_paid' | 'started_at' | 'ended_at' | 'duration_minutes' | 'status'
  >[];
  approvedOtMinutes?: number;
  referenceNowIso?: string;
}): AttendanceTimelineInterval[] {
  if (!params.checkInAt) return [];
  const nowIso = params.referenceNowIso || new Date().toISOString();
  const nowMs = new Date(nowIso).getTime();
  const intervals: AttendanceTimelineInterval[] = [];

  const validBreaks = [...(params.breaks || [])]
    .filter((b) => b.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  intervals.push({
    id: 'evt-checkin',
    type: 'CHECK_IN',
    title: 'Check In',
    start_at: params.checkInAt,
    end_at: null,
    duration_minutes: 0,
    is_current: false,
  });

  let cursorIso = params.checkInAt;
  for (let i = 0; i < validBreaks.length; i++) {
    const brk = validBreaks[i];
    const cursorMs = new Date(cursorIso).getTime();
    const brkStartMs = new Date(brk.started_at).getTime();
    if (brkStartMs > cursorMs) {
      intervals.push({
        id: `work-${i}`,
        type: 'WORK',
        title: i === 0 ? 'Working' : 'Work Resumed',
        start_at: cursorIso,
        end_at: brk.started_at,
        duration_minutes: Math.max(0, Math.floor((brkStartMs - cursorMs) / 60000)),
        is_current: false,
      });
    }

    const isActive = brk.status === 'ACTIVE' && !brk.ended_at;
    const brkEndIso = brk.ended_at || (isActive ? nowIso : brk.started_at);
    const brkEndMs = new Date(brkEndIso).getTime();
    const durMins =
      brk.duration_minutes != null && !isActive
        ? brk.duration_minutes
        : Math.max(0, Math.floor((brkEndMs - brkStartMs) / 60000));

    intervals.push({
      id: `brk-${brk.id}`,
      type: brk.is_paid ? 'PAID_BREAK' : 'UNPAID_BREAK',
      title: `${brk.break_category} (${brk.is_paid ? 'Paid' : 'Unpaid'})`,
      start_at: brk.started_at,
      end_at: isActive ? null : brkEndIso,
      duration_minutes: durMins,
      is_current: isActive,
      is_paid: brk.is_paid,
      break_event: brk,
    });

    cursorIso = brkEndIso;
  }

  const hasActiveBreak = validBreaks.some((b) => b.status === 'ACTIVE' && !b.ended_at);
  if (!hasActiveBreak) {
    const tailEndIso = params.checkOutAt || nowIso;
    const tailMs = new Date(tailEndIso).getTime();
    const cursorMs = new Date(cursorIso).getTime();
    if (tailMs >= cursorMs) {
      intervals.push({
        id: 'work-tail',
        type: 'WORK',
        title: params.checkOutAt ? 'Working' : 'Working Now',
        start_at: cursorIso,
        end_at: params.checkOutAt || null,
        duration_minutes: Math.max(0, Math.floor((tailMs - cursorMs) / 60000)),
        is_current: !params.checkOutAt,
      });
    }
  }

  if ((params.approvedOtMinutes || 0) > 0 && params.checkOutAt) {
    const outMs = new Date(params.checkOutAt).getTime();
    const otStartIso = new Date(
      Math.max(new Date(params.checkInAt).getTime(), outMs - (params.approvedOtMinutes || 0) * 60000)
    ).toISOString();
    intervals.push({
      id: 'approved-ot',
      type: 'OVERTIME',
      title: 'Approved Overtime',
      start_at: otStartIso,
      end_at: params.checkOutAt,
      duration_minutes: params.approvedOtMinutes || 0,
      is_current: false,
    });
  }

  if (params.checkOutAt) {
    intervals.push({
      id: 'evt-checkout',
      type: 'CHECK_OUT',
      title: 'Check Out',
      start_at: params.checkOutAt,
      end_at: null,
      duration_minutes: 0,
      is_current: false,
    });
  }

  void nowMs;
  return intervals;
}

/**
 * Authoritative pure calculation mirror of `fn_recalculate_daily_attendance`.
 * Ensures zero phantom paid break credits on 0h/absent rows and zero double-deduction
 * between logged meal breaks and automatic break deductions.
 */
export function computeWorkHoursWithBreaks(input: WorkHoursInput): ComputedWorkHoursResult {
  const nowMs = input.referenceNowIso ? new Date(input.referenceNowIso).getTime() : Date.now();

  let grossPresenceMinutes = Math.max(0, Math.round(input.grossPresenceMinutes || 0));
  if (grossPresenceMinutes === 0 && input.checkInAt) {
    const inMs = new Date(input.checkInAt).getTime();
    const outMs = input.checkOutAt ? new Date(input.checkOutAt).getTime() : nowMs;
    if (!Number.isNaN(inMs) && !Number.isNaN(outMs) && outMs > inMs) {
      grossPresenceMinutes = Math.floor((outMs - inMs) / 60000);
    }
  }

  const validBreaks = (input.breaks || []).filter((b) => b.status !== 'CANCELLED');
  let hasActiveBreak = false;
  let rawPaidMinutes = 0;
  let rawUnpaidMinutes = 0;
  let hasLunchBreak = false;
  let hasCoreHoursViolation = false;

  for (const brk of validBreaks) {
    if (brk.status === 'ACTIVE' && !brk.ended_at) {
      hasActiveBreak = true;
    }
    if (brk.break_category === 'LUNCH') {
      hasLunchBreak = true;
    }

    let dur = brk.duration_minutes ?? 0;
    if ((brk.duration_minutes == null || brk.status === 'ACTIVE') && brk.started_at) {
      const sMs = new Date(brk.started_at).getTime();
      const eMs = brk.ended_at ? new Date(brk.ended_at).getTime() : nowMs;
      if (!Number.isNaN(sMs) && !Number.isNaN(eMs) && eMs > sMs) {
        dur = Math.max(0, Math.floor((eMs - sMs) / 60000));
      }
    }

    const roundedDur = applyRounding(dur, input.policy.rounding_rule);
    if (brk.is_paid) {
      rawPaidMinutes += roundedDur;
    } else {
      rawUnpaidMinutes += roundedDur;
    }

    if (
      input.policy.breaks_prohibited_in_core_hours &&
      brk.ended_at &&
      overlapsCoreHours(
        brk.started_at,
        brk.ended_at,
        input.policy.core_hours_start,
        input.policy.core_hours_end
      )
    ) {
      hasCoreHoursViolation = true;
    }
  }

  // Zero-presence guard: never credit paid break allowance when employee did not work
  if (grossPresenceMinutes <= 0) {
    return {
      grossPresenceMinutes: 0,
      rawBreakMinutes: 0,
      paidBreakMinutes: 0,
      unpaidBreakMinutes: 0,
      excessPaidConvertedMinutes: 0,
      autoDeductedBreakMinutes: 0,
      totalDeductedMinutes: 0,
      netPayableMinutes: 0,
      approvedOtMinutes: 0,
      deficitMinutes: 0,
      hasActiveBreak,
      hasMissingLunchException: false,
      hasExceededUnpaidLimit: false,
      hasCoreHoursViolation: false,
      steps: [
        'Actual presence is 0m — no paid break allowance or auto-deduction applied.',
      ],
    };
  }

  const paidAllowance = Math.max(0, input.policy.paid_break_allowance_minutes || 0);
  const creditedPaidBreakMinutes = Math.min(rawPaidMinutes, paidAllowance);
  const excessPaidConvertedMinutes = Math.max(0, rawPaidMinutes - paidAllowance);
  const effectiveUnpaidMinutes = rawUnpaidMinutes + excessPaidConvertedMinutes;
  const rawBreakMinutes = rawPaidMinutes + rawUnpaidMinutes;

  // Non-duplicating auto-deduction: only deducts remainder if employee worked past threshold
  // without already logging enough unpaid break time.
  let autoDeductedBreakMinutes = 0;
  if (
    input.policy.auto_deduct_enabled &&
    grossPresenceMinutes >= input.policy.auto_deduct_after_minutes &&
    effectiveUnpaidMinutes < input.policy.auto_deduct_minutes
  ) {
    autoDeductedBreakMinutes = Math.max(
      0,
      input.policy.auto_deduct_minutes - effectiveUnpaidMinutes
    );
  }

  const totalDeductedMinutes = effectiveUnpaidMinutes + autoDeductedBreakMinutes;
  const basePayableMinutes = Math.max(0, grossPresenceMinutes - totalDeductedMinutes);
  const approvedOtMinutes = Math.max(0, Math.round(input.approvedOtMinutes || 0));
  const netPayableMinutes = basePayableMinutes;
  // An employee who is still checked in (no checkOutAt) is mid-shift, not in deficit.
  const isOngoingSession = Boolean(input.checkInAt) && !input.checkOutAt;
  const deficitMinutes =
    !isOngoingSession && input.scheduledMinutes > 0
      ? Math.max(0, input.scheduledMinutes - netPayableMinutes)
      : 0;

  const hasExceededUnpaidLimit =
    input.policy.max_unpaid_break_minutes > 0 &&
    effectiveUnpaidMinutes > input.policy.max_unpaid_break_minutes;

  const hasMissingLunchException =
    Boolean(input.policy.mandatory_lunch_break) &&
    grossPresenceMinutes >= input.policy.auto_deduct_after_minutes &&
    !hasLunchBreak &&
    Boolean(input.checkOutAt);

  const steps: string[] = [
    `1. Gross Attendance Span: ${grossPresenceMinutes}m`,
    `2. Paid Breaks Taken: ${rawPaidMinutes}m (Credited up to ${paidAllowance}m allowance = ${creditedPaidBreakMinutes}m; excess = ${excessPaidConvertedMinutes}m)`,
    `3. Unpaid Breaks Logged: ${rawUnpaidMinutes}m (+${excessPaidConvertedMinutes}m excess paid = ${effectiveUnpaidMinutes}m)`,
    autoDeductedBreakMinutes > 0
      ? `4. Auto-Deduction Applied: -${autoDeductedBreakMinutes}m (threshold ${input.policy.auto_deduct_after_minutes}m, target ${input.policy.auto_deduct_minutes}m)`
      : `4. Auto-Deduction Applied: 0m (covered by logged unpaid breaks or below threshold)`,
    `5. Net Payable Work: ${grossPresenceMinutes}m - ${totalDeductedMinutes}m = ${netPayableMinutes}m`,
  ];

  if (approvedOtMinutes > 0) {
    steps.push(`6. Approved Overtime: +${approvedOtMinutes}m`);
  }

  return {
    grossPresenceMinutes,
    rawBreakMinutes,
    paidBreakMinutes: creditedPaidBreakMinutes,
    unpaidBreakMinutes: effectiveUnpaidMinutes,
    excessPaidConvertedMinutes,
    autoDeductedBreakMinutes,
    totalDeductedMinutes,
    netPayableMinutes,
    approvedOtMinutes,
    deficitMinutes,
    hasActiveBreak,
    hasMissingLunchException,
    hasExceededUnpaidLimit,
    hasCoreHoursViolation,
    steps,
  };
}

