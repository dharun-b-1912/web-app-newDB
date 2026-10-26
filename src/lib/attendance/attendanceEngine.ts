import {
  AttendanceDaily,
  AttendanceEvent,
  AttendancePolicy,
  AttendanceStatus,
  BiometricDevice,
  BiometricSyncLog,
  EventType,
  PunchSource,
} from '../../types/attendance';

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  id: 'pol-default-01',
  name: 'Standard Work Policy (8 Hours + 15m Grace)',
  description: 'Default enterprise attendance policy with 15 mins late grace and 8h minimum net working time',
  required_hours_per_day: 8,
  late_grace_minutes: 15,
  early_checkout_grace_minutes: 15,
  half_day_hours_threshold: 4,
  overtime_min_minutes: 30,
  max_wfh_days_per_month: 8,
  geofence_enabled: true,
  allowed_radius_meters: 200,
  office_latitude: 12.9716,
  office_longitude: 77.5946,
  night_shift_enabled: true,
  night_shift_cutoff_hour: 6,
  assignment_type: 'Company',
  assigned_to: 'Global HQ',
};

export function timeStringToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || timeStr === '—' || timeStr === '-' || timeStr === '--:--') return null;
  const clean = timeStr.trim();
  if (clean.includes('T') || clean.endsWith('Z')) {
    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return d.getHours() * 60 + d.getMinutes();
      }
    } catch (_) {}
  }
  const match = clean.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
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

// Formats minutes from midnight to "HH:mm AM/PM"
export function minutesToTimeString(minutes: number | null): string {
  if (minutes === null) return '—';
  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minsFormatted = mins < 10 ? `0${mins}` : `${mins}`;
  return `${hours12.toString().padStart(2, '0')}:${minsFormatted} ${ampm}`;
}

export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function processAttendanceStatus(
  checkInMinutes: number | null,
  checkOutMinutes: number | null,
  expectedInMinutes: number = 540, // 09:00 AM
  expectedOutMinutes: number = 1080, // 06:00 PM
  policy: AttendancePolicy = DEFAULT_ATTENDANCE_POLICY,
  isLeave: boolean = false,
  isWfh: boolean = false,
  isHoliday: boolean = false,
  attendanceDate?: string,
  currentMinutesOverride?: number
): {
  status: AttendanceStatus;
  grossMinutes: number;
  netMinutes: number;
  lateMinutes: number;
  rawLateMinutes?: number;
  graceAppliedMinutes?: number;
  earlyMinutes: number;
  overtimeMinutes: number;
} {
  if (isHoliday) {
    return {
      status: 'Holiday',
      grossMinutes: 0,
      netMinutes: 0,
      lateMinutes: 0,
      rawLateMinutes: 0,
      graceAppliedMinutes: 0,
      earlyMinutes: 0,
      overtimeMinutes: 0,
    };
  }

  if (isLeave) {
    return {
      status: 'On Leave',
      grossMinutes: 0,
      netMinutes: 0,
      lateMinutes: 0,
      earlyMinutes: 0,
      overtimeMinutes: 0,
    };
  }

  // Real-time time computation in IST (Asia/Kolkata)
  const now = new Date();
  const currentMinutes = currentMinutesOverride ?? (now.getHours() * 60 + now.getMinutes());
  let todayStr = '';
  try {
    todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  } catch {
    todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  const isPastDate = attendanceDate ? attendanceDate < todayStr : false;
  const isToday = attendanceDate ? attendanceDate === todayStr : true;
  const isFutureDate = attendanceDate ? attendanceDate > todayStr : false;

  // Case 1: NO PUNCHES RECORDED
  if (checkInMinutes === null && checkOutMinutes === null) {
    if (isWfh) {
      return {
        status: 'WFH',
        grossMinutes: 480,
        netMinutes: 480,
        lateMinutes: 0,
        rawLateMinutes: 0,
        graceAppliedMinutes: 0,
        earlyMinutes: 0,
        overtimeMinutes: 0,
      };
    }

    // ABSENT CONSTRAINT:
    // If the date is in the past, or if today has passed the end of the shift (+ grace),
    // the employee is classified as Absent. Prior to shift end today, status is 'Not Checked In'.
    const shiftEndBufferMins = expectedOutMinutes + (policy.early_checkout_grace_minutes || 15);
    const isPastCutoff = isPastDate || (isToday && currentMinutes >= shiftEndBufferMins);
    const status: AttendanceStatus = isFutureDate ? 'Not Checked In' : isPastCutoff ? 'Absent' : 'Not Checked In';

    return {
      status,
      grossMinutes: 0,
      netMinutes: 0,
      lateMinutes: 0,
      rawLateMinutes: 0,
      graceAppliedMinutes: 0,
      earlyMinutes: 0,
      overtimeMinutes: 0,
    };
  }

  // Calculate gross duration
  let gross = 0;
  if (checkInMinutes !== null && checkOutMinutes !== null) {
    if (checkOutMinutes >= checkInMinutes) {
      gross = checkOutMinutes - checkInMinutes;
    } else {
      // Night shift spanning midnight (e.g., 22:00 -> 06:00)
      gross = 1440 - checkInMinutes + checkOutMinutes;
    }
  } else if (checkInMinutes !== null && checkOutMinutes === null) {
    // In-progress active shift: calculate elapsed time from check-in to current time
    if (currentMinutes > checkInMinutes) {
      gross = currentMinutes - checkInMinutes;
    } else if (currentMinutes < checkInMinutes && checkInMinutes > 1200) {
      // Night shift active cross-midnight
      gross = 1440 - checkInMinutes + currentMinutes;
    } else {
      gross = 0;
    }
  }

  // Net duration: matches actual logged punch duration (no arbitrary break deduction so SMS matches UI)
  const net = gross;
  const requiredMinutes = (policy.required_hours_per_day || 8) * 60; // 480 minutes (8 hours)
  const halfDayThresholdMinutes = (policy.half_day_hours_threshold || 4) * 60; // 240 minutes (4 hours)

  // Late minutes calculation against shift scheduled start + grace
  let rawLateMinutes = 0;
  let graceAppliedMinutes = 0;
  let lateMinutes = 0;
  const configuredGrace = policy.late_grace_minutes || 15;

  if (checkInMinutes !== null) {
    if (checkInMinutes > expectedInMinutes) {
      rawLateMinutes = checkInMinutes - expectedInMinutes;
      if (rawLateMinutes > configuredGrace) {
        graceAppliedMinutes = configuredGrace;
        lateMinutes = rawLateMinutes - configuredGrace;
      } else {
        graceAppliedMinutes = rawLateMinutes;
        lateMinutes = 0;
      }
    }
  }

  // Early departure minutes
  let earlyMinutes = 0;
  if (checkOutMinutes !== null) {
    earlyMinutes = Math.max(0, expectedOutMinutes - (policy.early_checkout_grace_minutes || 15) - checkOutMinutes);
  }

  // Overtime minutes beyond required hours + OT threshold
  let overtimeMinutes = 0;
  if (net > requiredMinutes + (policy.overtime_min_minutes || 30)) {
    overtimeMinutes = net - requiredMinutes;
  }

  let status: AttendanceStatus = 'Present';

  if (isWfh) {
    status = 'WFH';
  } else if (checkInMinutes !== null && checkOutMinutes === null) {
    // Case 2: CHECKED IN, BUT NO OUT-PUNCH
    const shiftEndBufferMins = expectedOutMinutes + (policy.early_checkout_grace_minutes || 15);
    const isPastShiftEnd = isPastDate || (isToday && currentMinutes >= shiftEndBufferMins);

    if (isPastShiftEnd) {
      status = 'Missing Punch';
    } else {
      status = lateMinutes > 0 ? 'Late' : 'Present';
    }
  } else if (checkOutMinutes !== null) {
    // Case 3: COMPLETED SHIFT (BOTH PUNCHES PRESENT)
    // Rule: Under 2 hours -> Absent. 2 to < 4 hours -> Half Day. 4 hours and above -> Present / Late.
    if (net < 120) {
      status = 'Absent';
    } else if (net < halfDayThresholdMinutes) {
      status = 'Half Day';
    } else if (lateMinutes > 0) {
      status = 'Late';
    } else {
      status = 'Present';
    }
  }

  return {
    status,
    grossMinutes: gross,
    netMinutes: net,
    lateMinutes,
    rawLateMinutes,
    graceAppliedMinutes,
    earlyMinutes,
    overtimeMinutes,
  };
}

export function formatMinutesToHoursStr(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '0h 0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

/**
 * Formats punctuality deviation minutes (late arrival, early departure, overtime)
 * into clean, readable hours and minutes:
 * - When < 60 mins: "45m" or "45 mins"
 * - When >= 60 mins: calculates hours & minutes, e.g. "8h 40m" (instead of bare "520m")
 * - When showBoth is true: "8h 40m (520m)" or "8 hrs 40 mins (520 mins)"
 */
export function formatDeviationDuration(
  minutes?: number | null,
  options?: { showBoth?: boolean; verbose?: boolean; fallback?: string }
): string {
  if (!minutes || minutes <= 0) return options?.fallback ?? '—';
  const totalMins = Math.round(minutes);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  if (hrs === 0) {
    if (options?.verbose) return `${mins} min${mins !== 1 ? 's' : ''}`;
    return `${mins}m`;
  }

  const compact = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  const verbose = `${hrs} hr${hrs !== 1 ? 's' : ''}${mins > 0 ? ` ${mins} min${mins !== 1 ? 's' : ''}` : ''}`;

  if (options?.showBoth) {
    return options.verbose ? `${verbose} (${totalMins} mins)` : `${compact} (${totalMins}m)`;
  }
  if (options?.verbose) {
    return verbose;
  }
  return compact;
}

export function formatCleanTime(timeStr?: string): string {
  if (!timeStr || timeStr === '—' || timeStr === '--:--' || timeStr === '-') return '—';
  let clean = timeStr.trim();

  // Strip fractional seconds like "15:12:41.780231" -> "15:12:41"
  if (/^\d{1,2}:\d{2}:\d{2}\.\d+/.test(clean)) {
    clean = clean.split('.')[0];
  }

  // Handle ISO datetime strings (convert UTC to IST Asia/Kolkata)
  if (clean.includes('T') || clean.endsWith('Z')) {
    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(d);
      }
    } catch (_) {}
  }

  // If plain 24-hour time string without date (e.g. "09:32:00" or "09:32")
  const match24 = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2];
    const s = match24[3] || '00';
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 === 0 ? 12 : h % 12;
    return `${String(h).padStart(2, '0')}:${m}:${s} ${suffix}`;
  }

  return clean;
}
