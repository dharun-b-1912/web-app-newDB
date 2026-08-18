// src/lib/attendance/timeEngine.ts
// ============================================================================
// WorkForceOS — Multi-Shift Time Engine & Night Shift Auto-Roll
// Sub-second punch consolidation, 15-min grace, break deduction & OT calculation
// ============================================================================

export interface ShiftRule {
  id: string;
  name: string;
  code: string;
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  isNightShift: boolean; // True for cross-midnight (e.g. 22:00 to 06:00)
  graceMinutes: number; // e.g. 15 mins
  halfDayThresholdHours: number; // 4.0 hrs
  fullDayThresholdHours: number; // 7.5 hrs
  breakDurationMinutes: number; // 60 mins
  overtimeThresholdMinutes: number; // 30 mins beyond full shift
}

export const STANDARD_SHIFTS: Record<string, ShiftRule> = {
  GENERAL: {
    id: 'shift-gen',
    name: 'General Day Shift (9 AM - 6 PM)',
    code: 'GEN-0918',
    startTime: '09:00',
    endTime: '18:00',
    isNightShift: false,
    graceMinutes: 15,
    halfDayThresholdHours: 4.0,
    fullDayThresholdHours: 7.5,
    breakDurationMinutes: 60,
    overtimeThresholdMinutes: 30,
  },
  MORNING: {
    id: 'shift-morn',
    name: 'Morning Shift A (6 AM - 2 PM)',
    code: 'MORN-0614',
    startTime: '06:00',
    endTime: '14:00',
    isNightShift: false,
    graceMinutes: 15,
    halfDayThresholdHours: 4.0,
    fullDayThresholdHours: 7.5,
    breakDurationMinutes: 30,
    overtimeThresholdMinutes: 30,
  },
  EVENING: {
    id: 'shift-eve',
    name: 'Evening Shift B (2 PM - 10 PM)',
    code: 'EVE-1422',
    startTime: '14:00',
    endTime: '22:00',
    isNightShift: false,
    graceMinutes: 15,
    halfDayThresholdHours: 4.0,
    fullDayThresholdHours: 7.5,
    breakDurationMinutes: 30,
    overtimeThresholdMinutes: 30,
  },
  NIGHT: {
    id: 'shift-night',
    name: 'Night Shift C (10 PM - 6 AM Next Day)',
    code: 'NIGHT-2206',
    startTime: '22:00',
    endTime: '06:00',
    isNightShift: true,
    graceMinutes: 15,
    halfDayThresholdHours: 4.0,
    fullDayThresholdHours: 7.5,
    breakDurationMinutes: 30,
    overtimeThresholdMinutes: 30,
  },
};

export interface PunchRecord {
  id: string;
  employeeId: string;
  timestamp: string; // ISO 8601 string
  verificationMode: string;
  source: string;
}

export interface DayAttendanceResult {
  employeeId: string;
  shiftDate: string; // "YYYY-MM-DD"
  shiftCode: string;
  firstIn: string | null; // "09:04 AM"
  lastOut: string | null; // "06:12 PM"
  totalPunches: number;
  grossDurationMinutes: number;
  breakDurationMinutes: number;
  netDurationMinutes: number;
  grossHoursFormatted: string; // "8h 15m"
  netHoursFormatted: string; // "7h 15m"
  isLate: boolean;
  lateMinutes: number;
  isEarlyDeparture: boolean;
  earlyMinutes: number;
  overtimeMinutes: number;
  overtimeHoursFormatted: string;
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'MISSING_PUNCH' | 'ON_DUTY' | 'WEEK_OFF';
  exceptionReason?: string;
}

export class WorkForceTimeEngine {
  /**
   * Helper: Parse HH:mm to minutes from midnight
   */
  private static parseTimeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Helper: Format minutes into human-readable duration e.g. "8h 30m"
   */
  public static formatMinutesToDuration(totalMinutes: number): string {
    if (totalMinutes <= 0) return '0h 0m';
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  }

  /**
   * Helper: Format ISO timestamp to local 12-hour string (e.g. "09:05 AM")
   */
  public static formatPunchTime12Hour(isoString: string): string {
    const d = new Date(isoString);
    let hrs = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    return `${hrs}:${mins} ${ampm}`;
  }

  /**
   * Night Shift Auto-Roll: Resolves punch to its logical shift start date.
   * If a punch is made between 00:00 and 06:00 and shift is NIGHT, it rolls back to previous calendar day.
   */
  public static resolveShiftDate(punchIso: string, shift: ShiftRule = STANDARD_SHIFTS.GENERAL): string {
    const d = new Date(punchIso);
    if (!shift.isNightShift) {
      return d.toISOString().split('T')[0];
    }

    const hours = d.getHours();
    // Night shift spans 22:00 -> 06:00.
    // If punch is between 00:00 and 07:00 morning, it belongs to yesterday's shift.
    if (hours >= 0 && hours < 7) {
      const yesterday = new Date(d);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }

    return d.toISOString().split('T')[0];
  }

  /**
   * Process a collection of chronological punches for an employee on a specific shift date.
   */
  public static calculateDailyAttendance(
    employeeId: string,
    shiftDate: string,
    punches: PunchRecord[],
    shift: ShiftRule = STANDARD_SHIFTS.GENERAL
  ): DayAttendanceResult {
    if (!punches || punches.length === 0) {
      return {
        employeeId,
        shiftDate,
        shiftCode: shift.code,
        firstIn: null,
        lastOut: null,
        totalPunches: 0,
        grossDurationMinutes: 0,
        breakDurationMinutes: 0,
        netDurationMinutes: 0,
        grossHoursFormatted: '0h 0m',
        netHoursFormatted: '0h 0m',
        isLate: false,
        lateMinutes: 0,
        isEarlyDeparture: false,
        earlyMinutes: 0,
        overtimeMinutes: 0,
        overtimeHoursFormatted: '0h 0m',
        status: 'ABSENT',
        exceptionReason: 'No biometric event logged',
      };
    }

    // Sort punches chronologically
    const sorted = [...punches].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const firstPunch = sorted[0];
    const lastPunch = sorted[sorted.length - 1];

    const firstInTimeStr = this.formatPunchTime12Hour(firstPunch.timestamp);
    const lastOutTimeStr = sorted.length > 1 ? this.formatPunchTime12Hour(lastPunch.timestamp) : null;

    const firstInDate = new Date(firstPunch.timestamp);
    const lastOutDate = sorted.length > 1 ? new Date(lastPunch.timestamp) : firstInDate;

    // Gross Duration in Minutes
    const grossMinutes = Math.max(
      Math.round((lastOutDate.getTime() - firstInDate.getTime()) / (1000 * 60)),
      0
    );

    // Break Deduction: if gross >= 5 hours, subtract break duration
    const breakMinutes = grossMinutes >= 300 ? shift.breakDurationMinutes : 0;
    const netMinutes = Math.max(grossMinutes - breakMinutes, 0);

    // Check Late Arrival
    const shiftStartMinutes = this.parseTimeToMinutes(shift.startTime);
    const firstInMinutesFromMidnight = firstInDate.getHours() * 60 + firstInDate.getMinutes();

    let lateMinutes = 0;
    let isLate = false;

    if (!shift.isNightShift) {
      if (firstInMinutesFromMidnight > shiftStartMinutes + shift.graceMinutes) {
        lateMinutes = firstInMinutesFromMidnight - shiftStartMinutes;
        isLate = true;
      }
    }

    // Check Early Departure (if more than 1 punch exists)
    let earlyMinutes = 0;
    let isEarlyDeparture = false;
    const shiftEndMinutes = this.parseTimeToMinutes(shift.endTime);

    if (sorted.length > 1 && !shift.isNightShift) {
      const lastOutMinutesFromMidnight = lastOutDate.getHours() * 60 + lastOutDate.getMinutes();
      if (lastOutMinutesFromMidnight < shiftEndMinutes - shift.graceMinutes) {
        earlyMinutes = shiftEndMinutes - lastOutMinutesFromMidnight;
        isEarlyDeparture = true;
      }
    }

    // Overtime Calculation
    const scheduledShiftMinutes = shift.isNightShift ? 8 * 60 : shiftEndMinutes - shiftStartMinutes - shift.breakDurationMinutes;
    let overtimeMinutes = 0;
    if (netMinutes > scheduledShiftMinutes + shift.overtimeThresholdMinutes) {
      overtimeMinutes = netMinutes - scheduledShiftMinutes;
    }

    // Status Assignment
    let status: DayAttendanceResult['status'] = 'PRESENT';
    let exceptionReason: string | undefined = undefined;

    if (sorted.length === 1) {
      status = 'MISSING_PUNCH';
      exceptionReason = 'Missing OUT punch at end of shift';
    } else if (netMinutes < shift.halfDayThresholdHours * 60) {
      status = 'ABSENT';
      exceptionReason = `Net duration (${this.formatMinutesToDuration(netMinutes)}) below half-day threshold`;
    } else if (netMinutes < shift.fullDayThresholdHours * 60) {
      status = 'HALF_DAY';
      exceptionReason = `Net duration (${this.formatMinutesToDuration(netMinutes)}) below full-day requirement`;
    }

    return {
      employeeId,
      shiftDate,
      shiftCode: shift.code,
      firstIn: firstInTimeStr,
      lastOut: lastOutTimeStr,
      totalPunches: sorted.length,
      grossDurationMinutes: grossMinutes,
      breakDurationMinutes: breakMinutes,
      netDurationMinutes: netMinutes,
      grossHoursFormatted: this.formatMinutesToDuration(grossMinutes),
      netHoursFormatted: this.formatMinutesToDuration(netMinutes),
      isLate,
      lateMinutes,
      isEarlyDeparture,
      earlyMinutes,
      overtimeMinutes,
      overtimeHoursFormatted: this.formatMinutesToDuration(overtimeMinutes),
      status,
      exceptionReason,
    };
  }
}
