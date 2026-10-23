// supabase/functions/attendance-report-dispatcher/reportHelpers.ts
// ============================================================================
// Joy PeopleHR Enterprise — Report Helpers & Calculations
// Parity with src/services/attendance/attendanceReportExportService.ts
// ============================================================================

export interface AttendanceReportRow {
  emp: any;
  record: any;
  roster?: any;
  shift?: any;
}

export interface AttendanceExportOptions {
  companyName?: string;
  reportDate: string;
  generatedBy?: string;
  includePunches?: boolean;
  reportType?: 'MORNING_CHECKIN' | 'EVENING_FINAL' | 'FULL_CONSOLIDATED';
  cutoffTime?: string;
  yesterdayRows?: any[];
}

export interface ClassifiedPunchEvent {
  employee_id?: string;
  employee_code?: string;
  employee_name?: string;
  punch_time?: string;
  timestamp?: string;
  event_time_str?: string;
  event_timestamp?: string;
  classification?: string;
  punch_direction?: string;
  punch_type?: string;
  device_name?: string;
  verification_method?: string;
  classification_reason?: string;
  [key: string]: any;
}

export interface ResolvedOvertime {
  overtimeMinutes: number;
  hours: number;
  minutes: number;
  formatted: string; // e.g. "1h 45m" or "0h 30m" or "—"
  verbose: string; // e.g. "1 hr 45 mins" or "30 mins" or "0 mins"
  hasOvertime: boolean;
}

/**
 * Helper to parse any time representation (ISO timestamp, "HH:MM", "HH:MM:SS", "hh:mm AM/PM")
 * into total minutes from start of day in IST.
 */
export function extractIstMinutesOfDay(val?: string | null): number | null {
  if (!val || typeof val !== 'string') return null;
  const str = val.trim();
  if (!str || str === '—' || str.includes('In Shift')) return null;

  // 1. ISO format with date: e.g. "2026-10-22T12:08:20+00:00"
  if (str.includes('T') || (str.includes('-') && str.length > 10)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const istDate = new Date(d.getTime() + (5 * 60 + 30) * 60 * 1000);
      return istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
    }
  }

  // 2. 12-Hour format with AM/PM: e.g. "05:38 PM"
  const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const meridiem = ampmMatch[3].toUpperCase();
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  // 3. 24-Hour format: e.g. "18:00"
  const parts = str.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return h * 60 + m;
    }
  }

  return null;
}

/**
 * Computes exact overtime minutes and formatted duration string (e.g. "1h 45m", "1 hr 45 mins")
 * Evaluates both record.overtime_minutes and actual checkout time past scheduled shift end.
 */
export function computeEmployeeOvertime(
  rec: any,
  shift?: any,
  isMorningSnapshot: boolean = false
): ResolvedOvertime {
  if (isMorningSnapshot && !rec?.last_check_out) {
    return {
      overtimeMinutes: 0,
      hours: 0,
      minutes: 0,
      formatted: '—',
      verbose: '0 mins (Shift in progress)',
      hasOvertime: false,
    };
  }

  // Priority 1: Check if attendance record already has explicit overtime_minutes
  let ot = typeof rec?.overtime_minutes === 'number' ? rec.overtime_minutes : 0;

  // Priority 2: If not set, evaluate check-out time past scheduled shift end
  if (ot <= 0 && rec?.last_check_out && shift?.end_time) {
    const outMins = extractIstMinutesOfDay(rec.last_check_out);
    const endMins = extractIstMinutesOfDay(shift.end_time);
    if (outMins !== null && endMins !== null && outMins > endMins + 15) {
      ot = outMins - endMins;
    }
  }

  // Priority 3: Only if employee has actually checked out, check if net working minutes exceeds shift duration
  const workMins = rec?.total_work_minutes ?? rec?.net_working_minutes ?? 0;
  const shiftDuration = shift?.scheduled_duration_minutes || 480;
  if (ot <= 0 && rec?.last_check_out && workMins > shiftDuration + 15) {
    ot = workMins - shiftDuration;
  }

  // Safety guard: Single shift overtime capped at 360 mins (6 hours)
  if (ot > 360) {
    ot = 360;
  }
  if (ot < 0) ot = 0;

  const hasOvertime = ot > 0;
  const hours = Math.floor(ot / 60);
  const minutes = ot % 60;
  const formatted = hasOvertime
    ? (hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim() : `${minutes}m`)
    : '—';
  const verbose = hasOvertime
    ? (hours > 0
        ? `${hours} hr${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min${minutes > 1 ? 's' : ''}` : ''}`.trim()
        : `${minutes} min${minutes > 1 ? 's' : ''}`)
    : '0 mins';

  return {
    overtimeMinutes: ot,
    hours,
    minutes,
    formatted,
    verbose,
    hasOvertime,
  };
}

export function formatMinutesToHoursStr(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '0h 0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

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

export function formatTo12HourTime(val?: string | null): string {
  if (!val || typeof val !== 'string' || !val.trim() || val === '—') return '—';
  const str = val.trim();

  // If already formatted like "09:49 AM" or "09:49:15 AM", clean and return
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    const h = ampmMatch[1].padStart(2, '0');
    const m = ampmMatch[2];
    const p = ampmMatch[3].toUpperCase();
    return `${h}:${m} ${p}`;
  }

  // If ISO timestamp: e.g. "2026-10-22T04:19:45.426284+00:00"
  if (str.includes('T') || (str.includes('-') && str.length > 10)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  // If "HH:MM" or "HH:MM:SS" 24-hour time
  const parts = str.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    }
  }

  return str;
}

export function resolveEmploymentSourceLabel(emp: any): string {
  if (emp?.vendor_name && String(emp.vendor_name).trim()) {
    return String(emp.vendor_name).trim();
  }
  const source = emp?.employment_source || emp?.employment?.employment_source;
  if (source === 'VENDOR') {
    return emp?.vendor_name || emp?.employment?.vendor_name || 'Vendor Workforce';
  }
  if (source === 'DIRECT_CONTRACT') return 'Direct Contract';
  if (source === 'INTERN') return 'Intern / Trainee';
  if (source === 'TEMP') return 'Temporary Staff';
  if (source === 'CONSULTANT') return 'Consultant';
  return 'Direct Employee';
}

export function generateMisReportFilename(params: {
  companyName?: string;
  reportType?: 'MORNING_CHECKIN' | 'EVENING_FINAL' | 'AUDIT' | 'WORKFORCE_MIS' | string;
  reportDate: string;
}): string {
  const { companyName = 'Joy Corporate Solutions', reportType, reportDate } = params;

  let orgPrefix = 'JOY';
  const cleanCompany = (companyName || '').trim();
  if (cleanCompany && !/workforce organization/i.test(cleanCompany)) {
    if (/^joy/i.test(cleanCompany)) {
      orgPrefix = 'JOY';
    } else {
      const words = cleanCompany.split(/\s+/).filter(Boolean);
      if (words.length > 1 && words[0].length <= 5) {
        orgPrefix = words[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
      } else if (words.length >= 2) {
        const acronym = words.map((w) => w[0]).join('').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
        orgPrefix = acronym.length >= 2 ? acronym : words[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
      } else {
        orgPrefix = words[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
      }
    }
  }
  if (!orgPrefix || orgPrefix.length < 2) {
    orgPrefix = 'JOY';
  }

  let typeTag = 'Attendance_MIS';
  const typeUpper = (reportType || '').toUpperCase();
  if (typeUpper === 'MORNING_CHECKIN' || typeUpper.includes('MORNING') || typeUpper.includes('SNAPSHOT')) {
    typeTag = 'Morning_Snapshot';
  } else if (typeUpper === 'EVENING_FINAL' || typeUpper.includes('DAILY') || typeUpper.includes('FINAL')) {
    typeTag = 'Attendance_MIS';
  } else if (typeUpper.includes('AUDIT')) {
    typeTag = 'Workforce_Audit';
  } else if (typeUpper.includes('WORKFORCE')) {
    typeTag = 'Workforce_MIS';
  }

  const cleanDate = reportDate ? reportDate.replace(/[^0-9-]/g, '') : new Date().toISOString().split('T')[0];
  return `${orgPrefix}_${typeTag}_${cleanDate}.pdf`;
}

export interface DetailedLateness {
  scheduledStartStr: string;
  actualCheckInStr: string;
  rawDelayMinutes: number;
  graceAllowedMinutes: number;
  latenessBeyondGrace: number;
  isLate: boolean;
  displayBreakdown: string;
}

export function computeLatenessDetails(
  checkInVal?: string | null,
  shiftStartVal?: string | null,
  graceMinutes: number = 15
): DetailedLateness {
  const inMins = extractIstMinutesOfDay(checkInVal);
  const startMins = extractIstMinutesOfDay(shiftStartVal) ?? 540;

  if (inMins === null) {
    return {
      scheduledStartStr: formatTo12HourTime(shiftStartVal) || '09:00 AM',
      actualCheckInStr: '—',
      rawDelayMinutes: 0,
      graceAllowedMinutes: graceMinutes,
      latenessBeyondGrace: 0,
      isLate: false,
      displayBreakdown: '—',
    };
  }

  const rawDelay = Math.max(0, inMins - startMins);
  const beyondGrace = Math.max(0, rawDelay - graceMinutes);
  const isLate = beyondGrace > 0;

  return {
    scheduledStartStr: formatTo12HourTime(shiftStartVal) || '09:00 AM',
    actualCheckInStr: formatTo12HourTime(checkInVal) || '—',
    rawDelayMinutes: rawDelay,
    graceAllowedMinutes: graceMinutes,
    latenessBeyondGrace: beyondGrace,
    isLate,
    displayBreakdown: isLate
      ? `Late ${beyondGrace}m (Delay ${rawDelay}m, Grace ${graceMinutes}m)`
      : (rawDelay > 0 ? `On Time (Within ${graceMinutes}m grace)` : 'On Time'),
  };
}

export async function computeSha256Hex(content: string | Uint8Array): Promise<string> {
  let data: Uint8Array;
  if (typeof content === 'string') {
    data = new TextEncoder().encode(content);
  } else {
    data = content;
  }
  const cryptoObj: any = typeof crypto !== 'undefined' ? crypto : (globalThis as any).crypto;
  if (cryptoObj?.subtle) {
    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b: number) => b.toString(16).padStart(2, '0')).join('');
  }
  return '0'.repeat(64);
}
