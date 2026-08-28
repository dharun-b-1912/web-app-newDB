// src/services/attendance/attendanceTimeService.ts
// ============================================================================
// WorkForceOS — Centralized Attendance Time & Timezone Service (Web)
// Authoritative UTC Database Contract with Organization Timezone Rendering (Asia/Kolkata)
// ============================================================================

export class AttendanceTimeService {
  public static readonly DEFAULT_TIMEZONE = 'Asia/Kolkata';
  public static readonly IST_OFFSET_MINUTES = 330; // +05:30 (5 hours 30 minutes)

  /**
   * Resolves timezone offset in minutes
   */
  public static getTimezoneOffsetMinutes(timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE): number {
    const tz = timezone.toLowerCase();
    if (tz.includes('kolkata') || tz.includes('ist') || tz.includes('india') || tz.includes('calcutta')) {
      return AttendanceTimeService.IST_OFFSET_MINUTES;
    }
    return AttendanceTimeService.IST_OFFSET_MINUTES; // Default to India Standard Time
  }

  /**
   * Robustly parses any backend raw string/Date into a valid UTC Date
   */
  public static parseToDate(raw: string | Date | undefined): Date | null {
    if (!raw) return null;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    const str = String(raw).trim();
    if (!str || str === 'null' || str === '—') return null;

    // 1. If it contains a date (YYYY-MM-DD...)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      let iso = str.replace(' ', 'T');
      // If Postgres timestamptz like "2026-08-25 12:34:32+00"
      if (!iso.endsWith('Z') && !iso.includes('+') && !iso.includes('-0') && !iso.includes('-1')) {
        iso = `${iso}Z`;
      }
      const d = new Date(iso);
      return isNaN(d.getTime()) ? null : d;
    }

    // 2. Plain time strings: 12-hour format (e.g. "12:34 PM", "03:12:41 PM")
    const match12 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const s = match12[3] ? parseInt(match12[3], 10) : 0;
      const isPm = match12[4].toUpperCase() === 'PM';
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      const now = new Date();
      // Assume stored time from punch event is in UTC
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, s));
    }

    // 3. Plain time strings: 24-hour format (e.g. "12:34:32", "18:04")
    const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match24) {
      const h = parseInt(match24[1], 10);
      const m = parseInt(match24[2], 10);
      const s = match24[3] ? parseInt(match24[3], 10) : 0;
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, s));
    }

    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  /**
   * Converts any Date or UTC string to the organization local Date
   */
  public static toOrganizationTime(raw: string | Date | undefined, timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE): Date | null {
    const d = AttendanceTimeService.parseToDate(raw);
    if (!d) return null;
    const offsetMs = AttendanceTimeService.getTimezoneOffsetMinutes(timezone) * 60000;
    return new Date(d.getTime() + offsetMs);
  }

  /**
   * Determines the authoritative business attendance date (YYYY-MM-DD) in the organization timezone
   */
  public static getOrganizationBusinessDate(date: Date = new Date(), timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE): string {
    const local = AttendanceTimeService.toOrganizationTime(date, timezone);
    if (!local) {
      const now = new Date();
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    }
    return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`;
  }

  /**
   * Formats any backend timestamptz or raw UTC time into authoritative 12-hour display string in Asia/Kolkata (IST)
   * e.g. "10:09:47 AM" or "06:04:32 PM"
   */
  public static formatAttendanceTime(
    raw: string | Date | undefined,
    timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE,
    withSeconds: boolean = false,
    fallback: string = '—'
  ): string {
    if (!raw) return fallback;
    const str = String(raw).trim();
    if (!str || str === 'null' || str === '—' || str === '--:--' || str === '-') return fallback;

    // 1. If already 12-hour AM/PM string (e.g. "10:09 AM", "03:12:41 PM")
    const match12 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (match12) {
      const h = match12[1].padStart(2, '0');
      const m = match12[2];
      const s = match12[3];
      const ampm = match12[4].toUpperCase();
      return withSeconds && s ? `${h}:${m}:${s} ${ampm}` : `${h}:${m} ${ampm}`;
    }

    // 2. If plain 24-hour time string without date (e.g. "10:09:47", "18:04")
    const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match24) {
      let h = parseInt(match24[1], 10);
      const m = match24[2];
      const s = match24[3] || '00';
      const suffix = h >= 12 ? 'PM' : 'AM';
      h = h % 12 === 0 ? 12 : h % 12;
      const hh = String(h).padStart(2, '0');
      return withSeconds ? `${hh}:${m}:${s} ${suffix}` : `${hh}:${m} ${suffix}`;
    }

    // 3. ISO DateTime string or Postgres timestamptz (e.g. "2026-08-26T04:39:47.123Z" or "2026-08-26 04:39:47+00")
    try {
      const iso = str.includes('T') ? str : str.replace(' ', 'T');
      const normalized = (!iso.endsWith('Z') && !iso.includes('+') && !iso.includes('-0') && !iso.includes('-1'))
        ? `${iso}Z`
        : iso;
      const date = new Date(normalized);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          timeZone: timezone || AttendanceTimeService.DEFAULT_TIMEZONE,
          hour: '2-digit',
          minute: '2-digit',
          second: withSeconds ? '2-digit' : undefined,
          hour12: true,
        }).format(date);
      }
    } catch (_) {}

    return str;
  }

  /**
   * Calculates gross and net working minutes, late minutes, and overtime
   */
  public static calculateWorkingMinutes(
    firstInRaw?: string | Date,
    lastOutRaw?: string | Date,
    expectedIn: string = '09:00 AM',
    expectedOut: string = '06:00 PM',
    breakMinutes: number = 45
  ): {
    grossMinutes: number;
    netMinutes: number;
    lateMinutes: number;
    earlyMinutes: number;
    overtimeMinutes: number;
  } {
    if (!firstInRaw) {
      return { grossMinutes: 0, netMinutes: 0, lateMinutes: 0, earlyMinutes: 0, overtimeMinutes: 0 };
    }

    const inDate = AttendanceTimeService.toOrganizationTime(firstInRaw);
    if (!inDate) {
      return { grossMinutes: 0, netMinutes: 0, lateMinutes: 0, earlyMinutes: 0, overtimeMinutes: 0 };
    }

    const outDate = lastOutRaw ? AttendanceTimeService.toOrganizationTime(lastOutRaw) : null;
    let grossMinutes = 0;

    if (outDate && outDate > inDate) {
      grossMinutes = Math.floor((outDate.getTime() - inDate.getTime()) / 60000);
    }

    const netMinutes = Math.max(0, grossMinutes - breakMinutes);

    // Calculate late arrival
    const inTotalMins = inDate.getHours() * 60 + inDate.getMinutes();
    const expInMatch = expectedIn.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    let expInMins = 540; // 09:00 AM default
    if (expInMatch) {
      let eh = parseInt(expInMatch[1], 10);
      const em = parseInt(expInMatch[2], 10);
      if (expInMatch[3]?.toUpperCase() === 'PM' && eh < 12) eh += 12;
      if (expInMatch[3]?.toUpperCase() === 'AM' && eh === 12) eh = 0;
      expInMins = eh * 60 + em;
    }
    const lateMinutes = Math.max(0, inTotalMins - expInMins);

    // Overtime
    const overtimeMinutes = Math.max(0, netMinutes - 480);

    return {
      grossMinutes,
      netMinutes,
      lateMinutes,
      earlyMinutes: 0,
      overtimeMinutes,
    };
  }

  /**
   * Diagnostic logger
   */
  public static logDiagnostic(context: string, raw: any, timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE): void {
    const formatted = AttendanceTimeService.formatAttendanceTime(raw, timezone, true);
    console.log(`[ATTENDANCE_TIME_DIAGNOSTIC][${context}] RAW:`, raw, `| TZ: ${timezone} | DISPLAY: ${formatted}`);
  }
}

export const attendanceTimeService = AttendanceTimeService;
