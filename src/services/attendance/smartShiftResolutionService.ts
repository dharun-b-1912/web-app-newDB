// src/services/attendance/smartShiftResolutionService.ts
// ============================================================================
// JOY PeopleHR — Smart Adaptive Shift Resolution Service
// Authoritative 6-Tier Shift Determination Hierarchy & Deterministic Punch Inference
// Multi-Tenant Isolation | Traceable Audit Log | Zero Guesswork
// ============================================================================

import { supabase } from '../../lib/supabase';
import { ShiftMaster } from '../../types/shiftRoster';
import { timeStringToMinutes } from '../../lib/attendance/attendanceEngine';

export type ShiftResolutionSource =
  | 'APPROVED_EMPLOYEE_ASSIGNMENT' // Tier 1: Approved employee-specific assignment effective on date
  | 'APPROVED_ROSTER_ROTATION'    // Tier 2: Approved shift roster or rotation
  | 'EMERGENCY_REASSIGNMENT'       // Tier 3: Approved temporary change / emergency reallocation
  | 'DEPARTMENT_SCHEDULE'         // Tier 4: Department / worksite schedule
  | 'ADAPTIVE_PUNCH_INFERENCE'    // Tier 5: Automatic inference from verified attendance punches
  | 'DEFAULT_REVIEW_QUEUE';       // Tier 6: Ambiguous / unresolvable evidence -> HR review required

export type ShiftAssignmentMode =
  | 'FIXED_SHIFT'
  | 'ROTATING_ROSTER'
  | 'ADAPTIVE_SHIFT'
  | 'MANAGER_ASSIGNED_DAILY'
  | 'SITE_DEPARTMENT_SCHEDULE'
  | 'HYBRID_MODE';

export interface CandidateShiftScore {
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  scheduledStart: string;
  scheduledEnd: string;
  startDifferenceMinutes: number;
  inAttendanceWindow: boolean;
  checkoutCompatibilityScore: number;
  totalScore: number; // 0 to 100
  matchConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNMATCHED';
}

export interface ShiftResolutionResult {
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  graceEntryMinutes: number;
  graceExitMinutes: number;
  isOvernight: boolean;
  minHalfDayHours: number;
  minFullDayHours: number;
  source: ShiftResolutionSource;
  confidenceScore: number; // 0 to 100
  isAmbiguous: boolean;
  requiresReview: boolean;
  candidateScores: CandidateShiftScore[];
  resolutionReason: string;
  decisionTimestamp: string;
}

// Fallback baseline corporate shifts if database fetch is unavailable
export const DEFAULT_SHIFTS: Array<Partial<ShiftMaster> & { id: string; code: string; name: string; start_time: string; end_time: string; grace_entry_minutes: number; grace_exit_minutes: number; is_overnight: boolean }> = [
  {
    id: 'f5ff5d00-8489-459b-8d8e-d930ecffef22',
    code: 'GEN-10',
    name: 'General Day Shift (Corporate)',
    start_time: '09:30:00',
    end_time: '18:30:00',
    grace_entry_minutes: 15,
    grace_exit_minutes: 15,
    is_overnight: false,
  },
  {
    id: 'd3725a69-90d3-4267-a1cc-a4c5b2e542fb',
    code: 'GEN-01',
    name: 'General Day Shift 1',
    start_time: '08:30:00',
    end_time: '17:30:00',
    grace_entry_minutes: 30,
    grace_exit_minutes: 15,
    is_overnight: false,
  },
  {
    id: 'f847c561-4bbb-4b9f-a2dd-003162897eef',
    code: 'GEN-09',
    name: 'General Corporate Shift 2',
    start_time: '09:00:00',
    end_time: '18:00:00',
    grace_entry_minutes: 15,
    grace_exit_minutes: 15,
    is_overnight: false,
  },
  {
    id: '50fe0482-4760-415c-9511-3de3e6f73534',
    code: 'GEN-03',
    name: 'General Day Shift 3',
    start_time: '09:00:00',
    end_time: '16:30:00',
    grace_entry_minutes: 15,
    grace_exit_minutes: 15,
    is_overnight: false,
  },
  {
    id: 'shift-night-01',
    code: 'NGT-01',
    name: 'Overnight Production Shift',
    start_time: '20:00:00',
    end_time: '05:00:00',
    grace_entry_minutes: 15,
    grace_exit_minutes: 15,
    is_overnight: true,
  },
];

class SmartShiftResolutionService {
  private activeShiftsCache: Map<string, any[]> = new Map();
  private cacheTimestamp: number = 0;
  private CACHE_TTL_MS = 60 * 1000; // 1 minute cache

  /**
   * Load active shifts for organization
   */
  async getActiveShifts(organizationId: string): Promise<any[]> {
    const now = Date.now();
    if (this.activeShiftsCache.has(organizationId) && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.activeShiftsCache.get(organizationId)!;
    }

    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        this.activeShiftsCache.set(organizationId, data);
        this.cacheTimestamp = now;
        return data;
      }
    } catch (_) {}

    if (organizationId === '0c621892-e938-4707-9957-13534ea32c19') {
      return DEFAULT_SHIFTS;
    }
    return [];
  }

  /**
   * Main Resolution Pipeline:
   * Evaluates the 6-tier hierarchy transparently and deterministically.
   */
  async resolveShiftForEmployeeDate(params: {
    organizationId: string;
    employeeId: string;
    departmentId?: string | null;
    workLocationId?: string | null;
    attendanceDate: string; // YYYY-MM-DD
    firstPunchTime?: string | null; // e.g. "2026-10-29T03:59:10+00:00" or "09:29"
    lastPunchTime?: string | null;
    mode?: ShiftAssignmentMode;
  }): Promise<ShiftResolutionResult> {
    const {
      organizationId,
      employeeId,
      departmentId,
      workLocationId,
      attendanceDate,
      firstPunchTime,
      lastPunchTime,
      mode = 'HYBRID_MODE',
    } = params;

    const activeShifts = await this.getActiveShifts(organizationId);

    // ========================================================================
    // TIER 1: Approved Employee-Specific Shift Assignment Effective on Date
    // ========================================================================
    let assignedShiftObj: any = null;
    try {
      const { data: assignments, error } = await supabase
        .from('employee_shift_assignments')
        .select('*, shifts(*)')
        .eq('employee_id', employeeId)
        .lte('effective_from', attendanceDate)
        .order('effective_from', { ascending: false })
        .limit(1);

      if (!error && assignments && assignments.length > 0) {
        const assigned = assignments[0];
        const toDate = assigned.effective_to || assigned.valid_to;
        if (!toDate || toDate >= attendanceDate) {
          assignedShiftObj = assigned.shifts || activeShifts.find(s => s.id === assigned.shift_id);
          // If strict fixed mode or assigned shift is an overnight shift, lock immediately
          if (assignedShiftObj && (mode === 'FIXED_SHIFT' || assignedShiftObj.is_overnight || !firstPunchTime)) {
            return this.buildResult(
              assignedShiftObj,
              'APPROVED_EMPLOYEE_ASSIGNMENT',
              100,
              false,
              false,
              [],
              `Authoritative employee shift assignment active from ${assigned.effective_from}`
            );
          }
        }
      }
    } catch (_) {}

    // If first punch is available and mode is HYBRID_MODE or ADAPTIVE_SHIFT, evaluate adaptive candidate scoring
    if (firstPunchTime && (mode === 'HYBRID_MODE' || mode === 'ADAPTIVE_SHIFT')) {
      const deterministic = this.resolveShiftDeterministic({
        assignedShift: assignedShiftObj,
        activeShifts,
        firstPunchTime,
        lastPunchTime,
        mode,
      });
      if (deterministic) {
        return deterministic;
      }
    }

    if (assignedShiftObj) {
      return this.buildResult(
        assignedShiftObj,
        'APPROVED_EMPLOYEE_ASSIGNMENT',
        100,
        false,
        false,
        [],
        'Standard employee assigned shift'
      );
    }

    // ========================================================================
    // TIER 2: Approved Shift Roster or Rotation Effective on Date
    // ========================================================================
    try {
      const { data: rosters, error } = await supabase
        .from('shift_rosters')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('roster_date', attendanceDate)
        .limit(1);

      if (!error && rosters && rosters.length > 0) {
        const roster = rosters[0];
        const shift = activeShifts.find(s => s.id === roster.shift_id || s.code === roster.shift_code);
        if (shift) {
          const isOverride = Boolean(roster.is_override);
          return this.buildResult(
            shift,
            isOverride ? 'EMERGENCY_REASSIGNMENT' : 'APPROVED_ROSTER_ROTATION',
            100,
            false,
            false,
            [],
            isOverride
              ? `Operational override/reassignment recorded for ${attendanceDate}: ${roster.remarks || 'Manager override'}`
              : `Scheduled shift roster assignment for ${attendanceDate}`
          );
        }
      }
    } catch (_) {}

    // ========================================================================
    // TIER 3: Approved Temporary Shift Change or Emergency Reassignment
    // (Check in-memory or custom temporary rotation table if present)
    // ========================================================================
    if (typeof localStorage !== 'undefined') {
      try {
        const tempAssignments = JSON.parse(localStorage.getItem('joy_temp_shift_assignments') || '[]');
        const tempMatch = tempAssignments.find(
          (t: any) => t.employeeId === employeeId && t.date === attendanceDate && t.status === 'APPROVED'
        );
        if (tempMatch) {
          const shift = activeShifts.find(s => s.id === tempMatch.shiftId || s.code === tempMatch.shiftCode);
          if (shift) {
            return this.buildResult(
              shift,
              'EMERGENCY_REASSIGNMENT',
              95,
              false,
              false,
              [],
              `Approved emergency manpower reassignment: ${tempMatch.reason || 'Manpower realignment'}`
            );
          }
        }
      } catch (_) {}
    }

    // ========================================================================
    // TIER 4: Department or Worksite Schedule
    // ========================================================================
    if (departmentId || workLocationId) {
      try {
        const { data: deptSchedules, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .limit(10);

        if (!error && deptSchedules) {
          // If a department-linked shift is configured
          const deptShift = deptSchedules.find((s: any) => s.department_id === departmentId);
          if (deptShift) {
            return this.buildResult(
              deptShift,
              'DEPARTMENT_SCHEDULE',
              90,
              false,
              false,
              [],
              `Assigned based on Department operating schedule`
            );
          }
        }
      } catch (_) {}
    }

    // If Mode is strictly FIXED_SHIFT and no punches provided, return default corporate shift
    if (mode === 'FIXED_SHIFT' || !firstPunchTime) {
      const defaultShift = activeShifts[0] || DEFAULT_SHIFTS[0];
      return this.buildResult(
        defaultShift,
        'DEFAULT_REVIEW_QUEUE',
        50,
        false,
        false,
        [],
        'No punch evidence available; applied standard corporate default shift'
      );
    }

    // ========================================================================
    // TIER 5: Automatic Adaptive Shift Inference Using Verified Punches
    // ========================================================================
    const punchMinutes = this.extractMinutesFromPunch(firstPunchTime);
    const checkoutMinutes = lastPunchTime ? this.extractMinutesFromPunch(lastPunchTime) : null;

    if (punchMinutes !== null) {
      const scores: CandidateShiftScore[] = activeShifts.map((candidate) => {
        return this.scoreCandidateShift(candidate, punchMinutes, checkoutMinutes);
      });

      // Sort candidate shifts descending by total score
      scores.sort((a, b) => b.totalScore - a.totalScore);

      const bestCandidate = scores[0];
      const secondCandidate = scores[1];

      // Ambiguity check: if top 2 candidates have identical or within 5 point score
      const isAmbiguous =
        scores.length > 1 &&
        secondCandidate &&
        Math.abs(bestCandidate.totalScore - secondCandidate.totalScore) <= 5 &&
        bestCandidate.totalScore > 0;

      // Out of bounds check: if best candidate totalScore < 40 (punched wildly outside all shift windows)
      const isOutOfBounds = bestCandidate.totalScore < 40;

      if (isAmbiguous || isOutOfBounds) {
        // Flag for HR review; assign best candidate tentatively with UNRESOLVED status
        const tentativeShift = activeShifts.find(s => s.id === bestCandidate.shiftId) || activeShifts[0] || DEFAULT_SHIFTS[0];
        const reason = isAmbiguous
          ? `Ambiguous biometric check-in at ${this.formatMinutesToTime(punchMinutes)}. Equally matches ${bestCandidate.shiftCode} (${bestCandidate.totalScore}%) and ${secondCandidate.shiftCode} (${secondCandidate.totalScore}%). Pending HR review.`
          : `Punch at ${this.formatMinutesToTime(punchMinutes)} falls outside eligible windows of all active shifts. Assigned tentatively pending HR review.`;

        return this.buildResult(
          tentativeShift,
          'DEFAULT_REVIEW_QUEUE',
          bestCandidate.totalScore,
          isAmbiguous,
          true,
          scores,
          reason
        );
      }

      // Strong deterministic match found!
      const matchedShift = activeShifts.find(s => s.id === bestCandidate.shiftId)!;
      return this.buildResult(
        matchedShift,
        'ADAPTIVE_PUNCH_INFERENCE',
        bestCandidate.totalScore,
        false,
        false,
        scores,
        `Adaptive shift inferred from punch at ${this.formatMinutesToTime(punchMinutes)} (Match confidence: ${bestCandidate.matchConfidence}, score: ${bestCandidate.totalScore}%)`
      );
    }

    // ========================================================================
    // TIER 6: Default Shift / HR Review Queue
    // ========================================================================
    const defaultShift = activeShifts[0] || DEFAULT_SHIFTS[0];
    return this.buildResult(
      defaultShift,
      'DEFAULT_REVIEW_QUEUE',
      40,
      false,
      true,
      [],
      'Insufficient attendance punch evidence; routed to HR review queue'
    );
  }

  /**
   * Deterministic Synchronous Shift Resolution Engine
   * Evaluates assigned vs adaptive candidates without database delay.
   */
  resolveShiftDeterministic(params: {
    assignedShift?: any;
    activeShifts?: any[];
    firstPunchTime?: string | null;
    lastPunchTime?: string | null;
    mode?: ShiftAssignmentMode;
    isOverride?: boolean;
    overrideReason?: string;
  }): ShiftResolutionResult {
    const {
      assignedShift,
      activeShifts = DEFAULT_SHIFTS,
      firstPunchTime,
      lastPunchTime,
      mode = 'HYBRID_MODE',
      isOverride = false,
      overrideReason,
    } = params;

    // 1. Manager Override has absolute authoritative priority
    if (isOverride && assignedShift) {
      return this.buildResult(
        assignedShift,
        'EMERGENCY_REASSIGNMENT',
        100,
        false,
        false,
        [],
        overrideReason || 'Authoritative manager shift override'
      );
    }

    // 2. Strict Night Shift (NS-01) is locked
    if (assignedShift && assignedShift.is_overnight) {
      return this.buildResult(
        assignedShift,
        'APPROVED_EMPLOYEE_ASSIGNMENT',
        100,
        false,
        false,
        [],
        'Authoritative overnight shift assignment'
      );
    }

    // 3. Strict Fixed Mode
    if (mode === 'FIXED_SHIFT' || !firstPunchTime) {
      const target = assignedShift || activeShifts[0] || DEFAULT_SHIFTS[0];
      return this.buildResult(
        target,
        assignedShift ? 'APPROVED_EMPLOYEE_ASSIGNMENT' : 'DEFAULT_REVIEW_QUEUE',
        assignedShift ? 100 : 50,
        false,
        false,
        [],
        assignedShift ? 'Fixed assigned shift' : 'Default organization shift'
      );
    }

    // 4. Smart Adaptive Inference (HYBRID_MODE or ADAPTIVE_SHIFT)
    const punchMinutes = this.extractMinutesFromPunch(firstPunchTime);
    const checkoutMinutes = lastPunchTime ? this.extractMinutesFromPunch(lastPunchTime) : null;

    if (punchMinutes !== null) {
      // Score all candidate active shifts
      const candidateScores = activeShifts.map((s) => this.scoreCandidateShift(s, punchMinutes, checkoutMinutes));
      candidateScores.sort((a, b) => b.totalScore - a.totalScore);

      const bestCandidate = candidateScores[0];
      const secondCandidate = candidateScores[1];

      // Score assigned shift if present
      let assignedScore: CandidateShiftScore | null = null;
      if (assignedShift) {
        assignedScore = this.scoreCandidateShift(assignedShift, punchMinutes, checkoutMinutes);
      }

      // In HYBRID_MODE:
      // If assigned shift is still strong (totalScore >= 75), respect the assigned shift
      if (mode === 'HYBRID_MODE' && assignedShift && assignedScore && assignedScore.totalScore >= 75) {
        return this.buildResult(
          assignedShift,
          'APPROVED_EMPLOYEE_ASSIGNMENT',
          assignedScore.totalScore,
          false,
          false,
          candidateScores,
          `Verified punch aligned with assigned shift ${assignedShift.code || assignedShift.shift_code || ''}`
        );
      }

      // If best candidate is strong (>= 70) and clearly outperforms assigned shift (or no assigned shift):
      if (bestCandidate && bestCandidate.totalScore >= 70) {
        // If assigned shift exists, ensure best candidate is at least 15 points better:
        if (!assignedShift || !assignedScore || bestCandidate.totalScore >= (assignedScore.totalScore + 15)) {
          const matchedShift = activeShifts.find((s) => s.id === bestCandidate.shiftId) || assignedShift || activeShifts[0];
          const isAdapted = assignedShift && assignedShift.id !== matchedShift.id;
          return this.buildResult(
            matchedShift,
            'ADAPTIVE_PUNCH_INFERENCE',
            bestCandidate.totalScore,
            false,
            false,
            candidateScores,
            isAdapted
              ? `Auto-adapted from ${assignedShift.code || assignedShift.shift_code} (${(assignedShift.start_time || '').substring(0, 5)}) to ${bestCandidate.shiftCode} (${bestCandidate.scheduledStart} - ${bestCandidate.scheduledEnd}) based on ${this.formatMinutesToTime(punchMinutes)} check-in.`
              : `Adaptive shift matched ${bestCandidate.shiftCode} based on ${this.formatMinutesToTime(punchMinutes)} check-in (${bestCandidate.totalScore}% match).`
          );
        }
      }

      // If ambiguous between top two candidates (score difference <= 5 and both > 60)
      if (secondCandidate && Math.abs(bestCandidate.totalScore - secondCandidate.totalScore) <= 5 && bestCandidate.totalScore >= 60) {
        const tentativeShift = activeShifts.find((s) => s.id === bestCandidate.shiftId) || activeShifts[0];
        return this.buildResult(
          tentativeShift,
          'DEFAULT_REVIEW_QUEUE',
          bestCandidate.totalScore,
          true,
          true,
          candidateScores,
          `Ambiguous check-in at ${this.formatMinutesToTime(punchMinutes)}. Equally close to ${bestCandidate.shiftCode} and ${secondCandidate.shiftCode}. Pending HR review.`
        );
      }
    }

    const fallbackShift = assignedShift || activeShifts[0] || DEFAULT_SHIFTS[0];
    return this.buildResult(
      fallbackShift,
      assignedShift ? 'APPROVED_EMPLOYEE_ASSIGNMENT' : 'DEFAULT_REVIEW_QUEUE',
      50,
      false,
      false,
      [],
      'Retained assigned schedule'
    );
  }

  /**
   * Deterministic Scoring Algorithm for Candidate Shifts:
   * Evaluates:
   * 1. Distance from scheduled shift start time.
   * 2. Compatibility with early-arrival window (up to 90 min before shift start).
   * 3. Compatibility with late-entry grace window (up to 60 min after shift start).
   * 4. Checkout alignment if last punch is present.
   */
  private scoreCandidateShift(
    shift: any,
    firstPunchMinutes: number,
    checkoutMinutes: number | null
  ): CandidateShiftScore {
    const scheduledStartMins = this.extractMinutesFromTimeStr(shift.start_time || '09:00:00');
    const scheduledEndMins = this.extractMinutesFromTimeStr(shift.end_time || '18:00:00');
    const isOvernight = Boolean(shift.is_overnight);

    // Calculate absolute minute difference between punch and scheduled start
    let diffMins = Math.abs(firstPunchMinutes - scheduledStartMins);
    if (diffMins > 720) {
      diffMins = 1440 - diffMins; // Wrap around midnight
    }

    // Permitted early window: up to 90 mins early
    // Permitted late grace: up to 60 mins late
    const isEarlyEligible = firstPunchMinutes >= (scheduledStartMins - 90) && firstPunchMinutes <= scheduledStartMins;
    const isLateEligible = firstPunchMinutes > scheduledStartMins && firstPunchMinutes <= (scheduledStartMins + 60);
    const inAttendanceWindow = isEarlyEligible || isLateEligible;

    // Start-time Score (Max 70 points)
    let startScore = 0;
    if (diffMins <= 15) {
      startScore = 70; // Exact or within grace entry
    } else if (diffMins <= 30) {
      startScore = 60;
    } else if (diffMins <= 60) {
      startScore = 45;
    } else if (diffMins <= 90) {
      startScore = 30;
    } else if (diffMins <= 120) {
      startScore = 15;
    } else {
      startScore = Math.max(0, 10 - Math.floor((diffMins - 120) / 30));
    }

    // Checkout Compatibility Score (Max 30 points)
    let checkoutScore = 20; // Default neutral if no checkout punch yet
    if (checkoutMinutes !== null) {
      let outDiff = Math.abs(checkoutMinutes - scheduledEndMins);
      if (outDiff > 720) outDiff = 1440 - outDiff;

      if (outDiff <= 20) {
        checkoutScore = 30;
      } else if (outDiff <= 45) {
        checkoutScore = 24;
      } else if (outDiff <= 90) {
        checkoutScore = 15;
      } else {
        checkoutScore = Math.max(0, 10 - Math.floor((outDiff - 90) / 30));
      }
    }

    const totalScore = Math.min(100, startScore + checkoutScore);

    let matchConfidence: CandidateShiftScore['matchConfidence'] = 'LOW';
    if (totalScore >= 80) matchConfidence = 'HIGH';
    else if (totalScore >= 60) matchConfidence = 'MEDIUM';
    else if (totalScore < 40) matchConfidence = 'UNMATCHED';

    return {
      shiftId: shift.id,
      shiftCode: shift.code || shift.shift_code || 'GEN',
      shiftName: shift.name || shift.shift_name || 'General Shift',
      scheduledStart: (shift.start_time || '09:00:00').substring(0, 5),
      scheduledEnd: (shift.end_time || '18:00:00').substring(0, 5),
      startDifferenceMinutes: diffMins,
      inAttendanceWindow,
      checkoutCompatibilityScore: checkoutScore,
      totalScore,
      matchConfidence,
    };
  }

  /**
   * Helper to build uniform resolution result
   */
  private buildResult(
    shift: any,
    source: ShiftResolutionSource,
    confidenceScore: number,
    isAmbiguous: boolean,
    requiresReview: boolean,
    candidateScores: CandidateShiftScore[],
    resolutionReason: string
  ): ShiftResolutionResult {
    return {
      shiftId: shift.id,
      shiftCode: shift.code || shift.shift_code || 'GEN',
      shiftName: shift.name || shift.shift_name || 'General Shift',
      startTime: (shift.start_time || '09:00:00').substring(0, 5),
      endTime: (shift.end_time || '18:00:00').substring(0, 5),
      graceEntryMinutes: shift.grace_entry_minutes || 15,
      graceExitMinutes: shift.grace_exit_minutes || 15,
      isOvernight: Boolean(shift.is_overnight),
      minHalfDayHours: shift.min_half_day_hours || 4,
      minFullDayHours: shift.min_full_day_hours || 8,
      source,
      confidenceScore,
      isAmbiguous,
      requiresReview,
      candidateScores,
      resolutionReason,
      decisionTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Utility to extract minute of day (0-1439) in IST timezone
   */
  private extractMinutesFromPunch(punch: string): number | null {
    if (!punch) return null;

    // If ISO timestamp: e.g. "2026-10-29T03:59:10+00:00"
    if (punch.includes('T')) {
      try {
        const d = new Date(punch);
        const istStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d);
        const [h, m] = istStr.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
      } catch (_) {}
    }

    // If time string e.g. "09:30" or "09:30:00"
    return this.extractMinutesFromTimeStr(punch);
  }

  private extractMinutesFromTimeStr(timeStr: string): number {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  private formatMinutesToTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
  }
}

export const smartShiftResolutionService = new SmartShiftResolutionService();
