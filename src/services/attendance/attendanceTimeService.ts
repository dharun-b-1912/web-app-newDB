// src/services/attendance/attendanceTimeService.ts
// ============================================================================
// JOY PeopleHR — Authoritative Attendance Time & Timezone Service
// Centralized Ingestion Boundary • UTC Instant Normalization • Business Timezone Rendering
// ============================================================================

export interface NormalizedDeviceTimestamp {
  eventTimestampUtc: string;      // Canonical ISO UTC instant: "2026-09-12T03:42:34.000Z"
  deviceTimestampRaw: string;     // Preserved device local time: "2026-09-12 09:12:34"
  deviceTimezone: string;         // Configured/detected device timezone: "Asia/Kolkata"
  attendanceDate: string;         // Business calendar date: "2026-09-12"
  businessLocalTimeStr: string;   // 12-hour display string: "09:12:34 AM"
  minutesFromMidnight: number;    // Minutes from midnight in business timezone (0-1439)
}

export interface DeviceClockDriftDiagnostic {
  deviceTime: string;             // Displayed device time
  serverTimeUtc: string;          // Cloud server UTC instant
  businessTime: string;           // Server time in business timezone
  driftSeconds: number;           // Device time minus Server time in seconds
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  timezone: string;
  message: string;
}

export class AttendanceTimeService {
  public static readonly DEFAULT_TIMEZONE = 'Asia/Kolkata';
  public static readonly IST_OFFSET_MINUTES = 330; // +05:30 (5 hours 30 minutes)

  /**
   * Resolves the offset in minutes for any IANA timezone relative to UTC for a given date
   */
  public static getTimezoneOffsetMinutes(timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE, forDate: Date = new Date()): number {
    const tz = (timezone || AttendanceTimeService.DEFAULT_TIMEZONE).trim();
    const tzLower = tz.toLowerCase();

    // Fast path for IST / Indian locations
    if (tzLower.includes('kolkata') || tzLower.includes('ist') || tzLower.includes('india') || tzLower.includes('calcutta')) {
      return AttendanceTimeService.IST_OFFSET_MINUTES;
    }
    if (tzLower === 'utc' || tzLower === 'gmt') {
      return 0;
    }

    try {
      // Dynamic IANA calculation via Intl
      const utcDate = new Date(forDate.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(forDate.toLocaleString('en-US', { timeZone: tz }));
      return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
    } catch {
      return AttendanceTimeService.IST_OFFSET_MINUTES;
    }
  }

  /**
   * Normalizes a raw biometric device timestamp string/Date into a canonical UTC instant
   * and derives the authoritative business calendar attendance date and display times.
   *
   * Example:
   * Device reports: "2026-09-12 09:12:34" in "Asia/Kolkata" (+05:30)
   * Normalized:
   *   eventTimestampUtc: "2026-09-12T03:42:34.000Z"
   *   attendanceDate: "2026-09-12"
   *   businessLocalTimeStr: "09:12:34 AM"
   */
  public static normalizeDeviceTimestamp(
    raw: string | Date | undefined,
    deviceTimezone: string = AttendanceTimeService.DEFAULT_TIMEZONE
  ): NormalizedDeviceTimestamp {
    const tz = deviceTimezone || AttendanceTimeService.DEFAULT_TIMEZONE;
    const now = new Date();

    if (!raw) {
      const utcIso = now.toISOString();
      return {
        eventTimestampUtc: utcIso,
        deviceTimestampRaw: AttendanceTimeService.formatUtcToLocalRaw(now, tz),
        deviceTimezone: tz,
        attendanceDate: AttendanceTimeService.getAttendanceDate(utcIso, tz),
        businessLocalTimeStr: AttendanceTimeService.formatAttendanceTime(utcIso, tz, true),
        minutesFromMidnight: AttendanceTimeService.getMinutesFromMidnight(utcIso, tz),
      };
    }

    // 1. If Date instance
    if (raw instanceof Date) {
      if (isNaN(raw.getTime())) {
        return AttendanceTimeService.normalizeDeviceTimestamp(undefined, tz);
      }
      const utcIso = raw.toISOString();
      return {
        eventTimestampUtc: utcIso,
        deviceTimestampRaw: AttendanceTimeService.formatUtcToLocalRaw(raw, tz),
        deviceTimezone: tz,
        attendanceDate: AttendanceTimeService.getAttendanceDate(utcIso, tz),
        businessLocalTimeStr: AttendanceTimeService.formatAttendanceTime(utcIso, tz, true),
        minutesFromMidnight: AttendanceTimeService.getMinutesFromMidnight(utcIso, tz),
      };
    }

    const str = String(raw).trim();

    // 2. Format: "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss" without timezone offset (Device Local Time)
    const localMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
    if (localMatch) {
      const year = parseInt(localMatch[1], 10);
      const month = parseInt(localMatch[2], 10) - 1;
      const day = parseInt(localMatch[3], 10);
      const hours = parseInt(localMatch[4], 10);
      const minutes = parseInt(localMatch[5], 10);
      const seconds = localMatch[6] ? parseInt(localMatch[6], 10) : 0;

      // Calculate UTC timestamp from device local components by subtracting device timezone offset
      const approxDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      const offsetMinutes = AttendanceTimeService.getTimezoneOffsetMinutes(tz, approxDate);
      const utcEpochMs = approxDate.getTime() - offsetMinutes * 60000;
      const utcDate = new Date(utcEpochMs);
      const eventTimestampUtc = utcDate.toISOString();

      const rawReconstructed = `${localMatch[1]}-${localMatch[2]}-${localMatch[3]} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      const attendanceDate = `${localMatch[1]}-${localMatch[2]}-${localMatch[3]}`;

      const h12 = hours % 12 === 0 ? 12 : hours % 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const businessLocalTimeStr = `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;

      return {
        eventTimestampUtc,
        deviceTimestampRaw: rawReconstructed,
        deviceTimezone: tz,
        attendanceDate,
        businessLocalTimeStr,
        minutesFromMidnight: hours * 60 + minutes,
      };
    }

    // 3. Explicit ISO string with UTC 'Z' or offset (e.g. "2026-09-12T03:42:34.000Z" or "+05:30")
    if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(str)) {
      const isoCandidate = str.includes('T') ? str : str.replace(' ', 'T');
      const parsedDate = new Date(isoCandidate);
      if (!isNaN(parsedDate.getTime())) {
        const utcIso = parsedDate.toISOString();
        return {
          eventTimestampUtc: utcIso,
          deviceTimestampRaw: AttendanceTimeService.formatUtcToLocalRaw(parsedDate, tz),
          deviceTimezone: tz,
          attendanceDate: AttendanceTimeService.getAttendanceDate(utcIso, tz),
          businessLocalTimeStr: AttendanceTimeService.formatAttendanceTime(utcIso, tz, true),
          minutesFromMidnight: AttendanceTimeService.getMinutesFromMidnight(utcIso, tz),
        };
      }
    }

    // 4. Plain 12-hour or 24-hour time strings (e.g. "09:12 AM" or "09:12:34")
    const match12 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match12 || match24) {
      const todayDateStr = AttendanceTimeService.getAttendanceDate(now.toISOString(), tz);
      let h = parseInt((match12 ? match12[1] : match24![1]), 10);
      const m = parseInt((match12 ? match12[2] : match24![2]), 10);
      const s = (match12 ? match12[3] : match24![3]) ? parseInt((match12 ? match12[3] : match24![3])!, 10) : 0;

      if (match12) {
        const isPm = match12[4].toUpperCase() === 'PM';
        if (isPm && h < 12) h += 12;
        if (!isPm && h === 12) h = 0;
      }

      const approxDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s));
      const offsetMinutes = AttendanceTimeService.getTimezoneOffsetMinutes(tz, approxDate);
      const utcEpochMs = approxDate.getTime() - offsetMinutes * 60000;
      const utcIso = new Date(utcEpochMs).toISOString();

      return {
        eventTimestampUtc: utcIso,
        deviceTimestampRaw: `${todayDateStr} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
        deviceTimezone: tz,
        attendanceDate: todayDateStr,
        businessLocalTimeStr: AttendanceTimeService.formatAttendanceTime(utcIso, tz, true),
        minutesFromMidnight: h * 60 + m,
      };
    }

    // Fallback
    const fallback = new Date(str);
    const validUtc = isNaN(fallback.getTime()) ? now.toISOString() : fallback.toISOString();
    return {
      eventTimestampUtc: validUtc,
      deviceTimestampRaw: str,
      deviceTimezone: tz,
      attendanceDate: AttendanceTimeService.getAttendanceDate(validUtc, tz),
      businessLocalTimeStr: AttendanceTimeService.formatAttendanceTime(validUtc, tz, true),
      minutesFromMidnight: AttendanceTimeService.getMinutesFromMidnight(validUtc, tz),
    };
  }

  /**
   * Helper: Formats a UTC Date into local raw "YYYY-MM-DD HH:mm:ss" in specified timezone
   */
  private static formatUtcToLocalRaw(date: Date, timezone: string): string {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || AttendanceTimeService.DEFAULT_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(date);

      const p: Record<string, string> = {};
      parts.forEach((part) => { p[part.type] = part.value; });
      return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
    } catch {
      return date.toISOString().replace('T', ' ').slice(0, 19);
    }
  }

  /**
   * Calculates minutes from midnight (0 - 1439) for a UTC timestamp in the business timezone
   */
  public static getMinutesFromMidnight(utcIsoOrDate: string | Date, timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE): number {
    try {
      if (!utcIsoOrDate) return 0;
      if (typeof utcIsoOrDate === 'string') {
        const str = utcIsoOrDate.trim();
        // 1. Check for simple 24-hour "HH:mm" or "HH:mm:ss"
        const m24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (m24) {
          const h = parseInt(m24[1], 10);
          const m = parseInt(m24[2], 10);
          return (h % 24) * 60 + m;
        }
        // 2. Check for 12-hour "HH:mm AM/PM" or "HH:mm:ss AM/PM"
        const m12 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
        if (m12) {
          let h = parseInt(m12[1], 10);
          const m = parseInt(m12[2], 10);
          const isPm = m12[4].toUpperCase() === 'PM';
          if (isPm && h < 12) h += 12;
          if (!isPm && h === 12) h = 0;
          return h * 60 + m;
        }
      }

      const date = typeof utcIsoOrDate === 'string' ? new Date(utcIsoOrDate) : utcIsoOrDate;
      if (isNaN(date.getTime())) return 0;

      // Fast path for standard Indian Standard Time (UTC + 5:30)
      const tz = (timezone || AttendanceTimeService.DEFAULT_TIMEZONE).toLowerCase();
      if (tz.includes('kolkata') || tz.includes('calcutta') || tz.includes('ist')) {
        const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
        return (utcMinutes + 330) % 1440;
      }

      // Generic fallback
      const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
      return utcMinutes;
    } catch {
      return 0;
    }
  }

  /**
   * Robustly parses any backend raw string/Date into a valid UTC Date
   */
  public static parseToDate(raw: string | Date | undefined): Date | null {
    if (!raw) return null;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    const str = String(raw).trim();
    if (!str || str === 'null' || str === '—') return null;

    const norm = AttendanceTimeService.normalizeDeviceTimestamp(str);
    return new Date(norm.eventTimestampUtc);
  }

  /**
   * Converts any Date or UTC string to the organization local Date
   */
  public static toOrganizationTime(raw: string | Date | undefined, timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE): Date | null {
    const d = AttendanceTimeService.parseToDate(raw);
    if (!d) return null;
    const offsetMs = AttendanceTimeService.getTimezoneOffsetMinutes(timezone, d) * 60000;
    return new Date(d.getTime() + offsetMs);
  }

  private static _formatterCache = new Map<string, Intl.DateTimeFormat>();
  private static _todayMemo: { date: string; expires: number; tz: string } = { date: '', expires: 0, tz: '' };
  private static _yesterdayMemo: { date: string; expires: number; tz: string } = { date: '', expires: 0, tz: '' };
  private static _relativeFormatCache = new Map<string, {
    isToday: boolean;
    isYesterday: boolean;
    relativeLabel: string;
    formattedDate: string;
    formattedDateWithYear: string;
    isoDate: string;
  }>();

  private static getFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = `${locale}|${options.timeZone || ''}|${options.year || ''}|${options.month || ''}|${options.day || ''}|${options.hour || ''}|${options.minute || ''}|${options.second || ''}|${options.hour12 ?? ''}`;
    let fmt = AttendanceTimeService._formatterCache.get(key);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat(locale, options);
      AttendanceTimeService._formatterCache.set(key, fmt);
    }
    return fmt;
  }

  /**
   * Determines the authoritative business attendance date (YYYY-MM-DD) in the organization timezone
   */
  public static getAttendanceDate(utcIsoOrDate: string | Date = new Date(), timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE): string {
    const tz = timezone || AttendanceTimeService.DEFAULT_TIMEZONE;

    // Fast path: if string is already formatted as YYYY-MM-DD or contains local date prefix
    if (typeof utcIsoOrDate === 'string' && (tz.includes('Kolkata') || tz.includes('IST') || tz.includes('India'))) {
      const match = utcIsoOrDate.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match && !utcIsoOrDate.endsWith('Z') && !utcIsoOrDate.includes('+') && !utcIsoOrDate.includes('T')) {
        return match[1];
      }
    }

    const d = typeof utcIsoOrDate === 'string' ? new Date(utcIsoOrDate) : utcIsoOrDate;
    if (isNaN(d.getTime())) {
      const fallback = new Date();
      return `${fallback.getUTCFullYear()}-${String(fallback.getUTCMonth() + 1).padStart(2, '0')}-${String(fallback.getUTCDate()).padStart(2, '0')}`;
    }

    try {
      const fmt = AttendanceTimeService.getFormatter('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = fmt.formatToParts(d);
      const p: Record<string, string> = {};
      parts.forEach((part) => { p[part.type] = part.value; });
      return `${p.year}-${p.month}-${p.day}`;
    } catch {
      return d.toISOString().split('T')[0];
    }
  }

  public static getOrganizationBusinessDate(date: Date = new Date(), timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE): string {
    return AttendanceTimeService.getAttendanceDate(date, timezone);
  }

  /**
   * Formats any backend timestamptz or raw UTC time into authoritative 12-hour display string in Asia/Kolkata (IST)
   * e.g. "09:12:34 AM" or "06:04:32 PM"
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

    // If already 12-hour AM/PM string without date, return standardized format
    const match12 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (match12 && !str.includes('-') && !str.includes('/')) {
      const h = match12[1].padStart(2, '0');
      const m = match12[2];
      const s = match12[3] || '00';
      const ampm = match12[4].toUpperCase();
      return withSeconds ? `${h}:${m}:${s} ${ampm}` : `${h}:${m} ${ampm}`;
    }

    // If plain 24-hour time string without date (e.g. "09:12:34", "18:04")
    const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match24 && !str.includes('-') && !str.includes('/')) {
      let h = parseInt(match24[1], 10);
      const m = match24[2];
      const s = match24[3] || '00';
      const suffix = h >= 12 ? 'PM' : 'AM';
      h = h % 12 === 0 ? 12 : h % 12;
      const hh = String(h).padStart(2, '0');
      return withSeconds ? `${hh}:${m}:${s} ${suffix}` : `${hh}:${m} ${suffix}`;
    }

    // If raw date string without timezone components (e.g. "YYYY-MM-DD HH:mm:ss")
    const localMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (localMatch) {
      let h = parseInt(localMatch[4], 10);
      const m = localMatch[5];
      const s = localMatch[6] || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 === 0 ? 12 : h % 12;
      const hh = String(h).padStart(2, '0');
      return withSeconds ? `${hh}:${m}:${s} ${ampm}` : `${hh}:${m} ${ampm}`;
    }

    try {
      const parsed = raw instanceof Date ? raw : new Date(str);
      if (!isNaN(parsed.getTime())) {
        return AttendanceTimeService.getFormatter('en-US', {
          timeZone: timezone || AttendanceTimeService.DEFAULT_TIMEZONE,
          hour: '2-digit',
          minute: '2-digit',
          second: withSeconds ? '2-digit' : undefined,
          hour12: true,
        }).format(parsed);
      }
    } catch (_) {}

    return str;
  }

  /**
   * Formats attendance date with relative descriptor ('Today', 'Yesterday', or 'DD MMM YYYY')
   * in business timezone (IST / Asia/Kolkata).
   */
  public static formatAttendanceDateWithRelative(
    raw: string | Date | undefined,
    timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE
  ): {
    isToday: boolean;
    isYesterday: boolean;
    relativeLabel: string;
    formattedDate: string;
    formattedDateWithYear: string;
    isoDate: string;
  } {
    const tz = timezone || AttendanceTimeService.DEFAULT_TIMEZONE;
    const cacheKey = `${String(raw)}|${tz}`;
    const cached = AttendanceTimeService._relativeFormatCache.get(cacheKey);
    if (cached) return cached;

    const nowMs = Date.now();
    let todayIsoDate = (AttendanceTimeService._todayMemo.tz === tz && AttendanceTimeService._todayMemo.expires > nowMs)
      ? AttendanceTimeService._todayMemo.date
      : '';
    if (!todayIsoDate) {
      todayIsoDate = AttendanceTimeService.getAttendanceDate(new Date(nowMs).toISOString(), tz);
      AttendanceTimeService._todayMemo = { date: todayIsoDate, expires: nowMs + 60000, tz };
    }

    let yesterdayIsoDate = (AttendanceTimeService._yesterdayMemo.tz === tz && AttendanceTimeService._yesterdayMemo.expires > nowMs)
      ? AttendanceTimeService._yesterdayMemo.date
      : '';
    if (!yesterdayIsoDate) {
      yesterdayIsoDate = AttendanceTimeService.getAttendanceDate(new Date(nowMs - 86400000).toISOString(), tz);
      AttendanceTimeService._yesterdayMemo = { date: yesterdayIsoDate, expires: nowMs + 60000, tz };
    }

    const norm = AttendanceTimeService.normalizeDeviceTimestamp(raw, tz);
    const punchDate = norm.attendanceDate || todayIsoDate;

    const isToday = punchDate === todayIsoDate;
    const isYesterday = punchDate === yesterdayIsoDate;

    const dateObj = new Date(norm.eventTimestampUtc);
    let formattedDate = punchDate;
    let formattedDateWithYear = punchDate;

    if (!isNaN(dateObj.getTime())) {
      try {
        formattedDate = AttendanceTimeService.getFormatter('en-IN', {
          timeZone: tz,
          day: '2-digit',
          month: 'short',
        }).format(dateObj);

        formattedDateWithYear = AttendanceTimeService.getFormatter('en-IN', {
          timeZone: tz,
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(dateObj);
      } catch (_) {}
    }

    let relativeLabel = formattedDateWithYear;
    if (isToday) {
      relativeLabel = 'Today';
    } else if (isYesterday) {
      relativeLabel = 'Yesterday';
    }

    const result = {
      isToday,
      isYesterday,
      relativeLabel,
      formattedDate,
      formattedDateWithYear,
      isoDate: punchDate,
    };

    if (AttendanceTimeService._relativeFormatCache.size > 500) {
      AttendanceTimeService._relativeFormatCache.clear();
    }
    AttendanceTimeService._relativeFormatCache.set(cacheKey, result);

    return result;
  }

  /**
   * Calculates Clock Drift between a device reported time and cloud server reference time
   */
  public static calculateClockDrift(
    deviceTimeRaw: string | Date,
    serverReferenceDate: Date = new Date(),
    deviceTimezone: string = AttendanceTimeService.DEFAULT_TIMEZONE
  ): DeviceClockDriftDiagnostic {
    const tz = deviceTimezone || AttendanceTimeService.DEFAULT_TIMEZONE;
    const normalized = AttendanceTimeService.normalizeDeviceTimestamp(deviceTimeRaw, tz);
    const deviceUtcDate = new Date(normalized.eventTimestampUtc);

    const driftMs = deviceUtcDate.getTime() - serverReferenceDate.getTime();
    const driftSeconds = Math.round(driftMs / 1000);
    const absDrift = Math.abs(driftSeconds);

    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    let message = 'Clock is synchronized within normal operating parameters.';

    if (absDrift > 120) {
      status = 'CRITICAL';
      const mins = Math.floor(absDrift / 60);
      const secs = absDrift % 60;
      message = `Device clock is ${driftSeconds > 0 ? 'ahead of' : 'behind'} cloud server by ${mins}m ${secs}s. Immediate time synchronization required.`;
    } else if (absDrift > 30) {
      status = 'WARNING';
      message = `Device clock drift is ${driftSeconds > 0 ? '+' : ''}${driftSeconds}s (Threshold: 30s). Consider running time synchronization.`;
    }

    return {
      deviceTime: normalized.businessLocalTimeStr,
      serverTimeUtc: serverReferenceDate.toISOString(),
      businessTime: AttendanceTimeService.formatAttendanceTime(serverReferenceDate.toISOString(), tz, true),
      driftSeconds,
      status,
      timezone: tz,
      message,
    };
  }

  /**
   * Calculates gross and net working minutes, late minutes, and overtime
   */
  public static calculateWorkingMinutes(
    firstInRaw?: string | Date,
    lastOutRaw?: string | Date,
    expectedIn: string = '09:00 AM',
    expectedOut: string = '06:00 PM',
    breakMinutes: number = 45,
    timezone: string = AttendanceTimeService.DEFAULT_TIMEZONE
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

    const inNorm = AttendanceTimeService.normalizeDeviceTimestamp(firstInRaw, timezone);
    const inDate = new Date(inNorm.eventTimestampUtc);
    if (isNaN(inDate.getTime())) {
      return { grossMinutes: 0, netMinutes: 0, lateMinutes: 0, earlyMinutes: 0, overtimeMinutes: 0 };
    }

    let outDate: Date | null = null;
    if (lastOutRaw) {
      const outNorm = AttendanceTimeService.normalizeDeviceTimestamp(lastOutRaw, timezone);
      outDate = new Date(outNorm.eventTimestampUtc);
    }

    let grossMinutes = 0;
    if (outDate && !isNaN(outDate.getTime()) && outDate > inDate) {
      grossMinutes = Math.floor((outDate.getTime() - inDate.getTime()) / 60000);
    }

    const netMinutes = Math.max(0, grossMinutes - breakMinutes);

    // Calculate late arrival in business timezone
    const inTotalMins = inNorm.minutesFromMidnight;
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
    const norm = AttendanceTimeService.normalizeDeviceTimestamp(raw, timezone);
    console.log(`[ATTENDANCE_TIME_DIAGNOSTIC][${context}] RAW:`, raw, `| UTC: ${norm.eventTimestampUtc} | BUSINESS: ${norm.businessLocalTimeStr} (${norm.deviceTimezone}) | DATE: ${norm.attendanceDate}`);
  }
}

export const attendanceTimeService = AttendanceTimeService;
