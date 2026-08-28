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

// Converts "09:30", "15:12:41", "09:30 AM" to minutes from midnight
export function timeStringToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || timeStr === '—' || timeStr === '-' || timeStr === '--:--') return null;
  const clean = timeStr.trim();
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
  isHoliday: boolean = false
): {
  status: AttendanceStatus;
  grossMinutes: number;
  netMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  overtimeMinutes: number;
} {
  if (isHoliday) {
    return {
      status: 'Holiday',
      grossMinutes: 0,
      netMinutes: 0,
      lateMinutes: 0,
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

  if (checkInMinutes === null && checkOutMinutes === null) {
    if (isWfh) {
      return {
        status: 'WFH',
        grossMinutes: 480,
        netMinutes: 480,
        lateMinutes: 0,
        earlyMinutes: 0,
        overtimeMinutes: 0,
      };
    }
    return {
      status: 'Not Checked In',
      grossMinutes: 0,
      netMinutes: 0,
      lateMinutes: 0,
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
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (currentMinutes > checkInMinutes) {
      gross = currentMinutes - checkInMinutes;
    } else if (currentMinutes < checkInMinutes && checkInMinutes > 1200) {
      // Night shift active cross-midnight
      gross = 1440 - checkInMinutes + currentMinutes;
    } else {
      // Initial punch within same minute
      gross = 0;
    }
  }

  // Deduct break time (only apply standard 45m break if worked duration exceeds 4 hours)
  const breakDeduction = gross >= 240 ? 45 : 0;
  const net = Math.max(0, gross - breakDeduction);
  const requiredMinutes = policy.required_hours_per_day * 60;

  // Late minutes calculation against shift scheduled start + grace
  let lateMinutes = 0;
  if (checkInMinutes !== null) {
    lateMinutes = Math.max(0, checkInMinutes - (expectedInMinutes + policy.late_grace_minutes));
  }

  // Early departure minutes
  let earlyMinutes = 0;
  if (checkOutMinutes !== null) {
    earlyMinutes = Math.max(0, expectedOutMinutes - policy.early_checkout_grace_minutes - checkOutMinutes);
  }

  // Overtime minutes beyond required hours + OT threshold
  let overtimeMinutes = 0;
  if (net > requiredMinutes + policy.overtime_min_minutes) {
    overtimeMinutes = net - requiredMinutes;
  }

  let status: AttendanceStatus = 'Present';

  if (isWfh) {
    status = 'WFH';
  } else if (checkOutMinutes === null && checkInMinutes !== null) {
    // Actively working
    status = lateMinutes > 0 ? 'Late' : 'Present';
  } else if (net < policy.half_day_hours_threshold * 60 && net > 0) {
    status = 'Half Day';
  } else if (lateMinutes > 0) {
    status = 'Late';
  } else if (earlyMinutes > 0) {
    status = 'Early Checkout';
  } else if (overtimeMinutes > 0) {
    status = 'Overtime';
  } else if (checkOutMinutes !== null) {
    status = 'Checked Out';
  }

  return {
    status,
    grossMinutes: gross,
    netMinutes: net,
    lateMinutes,
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

export function formatCleanTime(timeStr?: string): string {
  if (!timeStr || timeStr === '—' || timeStr === '--:--' || timeStr === '-') return '—';
  let clean = timeStr.trim();

  // Strip fractional seconds like "15:12:41.780231" -> "15:12:41"
  if (/^\d{1,2}:\d{2}:\d{2}\.\d+/.test(clean)) {
    clean = clean.split('.')[0];
  }

  // Handle ISO datetime strings
  if (clean.includes('T') || clean.endsWith('Z')) {
    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      }
    } catch (_) {}
  }

  return clean;
}
