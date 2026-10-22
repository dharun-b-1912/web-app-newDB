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
      formatted: '— (Pending Checkout)',
      verbose: '0 mins (Shift in progress)',
      hasOvertime: false,
    };
  }

  let ot = rec?.overtime_minutes || 0;

  // 1. If not set or 0, evaluate check-out time past scheduled shift end
  if (ot <= 0 && rec?.last_check_out && shift?.end_time) {
    const parseMins = (str: string) => {
      const parts = str.trim().split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return h * 60 + m;
    };

    const outMins = parseMins(rec.last_check_out);
    const endMins = parseMins(shift.end_time);
    if (outMins > endMins) {
      ot = outMins - endMins;
    }
  }

  // 2. Only if employee has actually checked out, check if net_working_minutes exceeds 8 hours (480 mins)
  if (ot <= 0 && rec?.last_check_out && rec?.net_working_minutes && rec.net_working_minutes > 480) {
    ot = rec.net_working_minutes - 480;
  }

  const hasOvertime = ot > 0;
  const hours = Math.floor(ot / 60);
  const minutes = ot % 60;
  const formatted = hasOvertime
    ? (hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`)
    : '—';
  const verbose = hasOvertime
    ? (hours > 0
        ? `${hours} hr${hours > 1 ? 's' : ''} ${minutes > 0 ? `${minutes} min${minutes > 1 ? 's' : ''}` : ''}`.trim()
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
  if (!val || !val.trim() || val === '—') return '—';
  const str = val.trim();

  if (/AM|PM/i.test(str)) {
    return str.toUpperCase();
  }

  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const istTime = new Date(d.getTime() + (5 * 60 + 30) * 60 * 1000);
      const hours = istTime.getUTCHours();
      const minutes = istTime.getUTCMinutes();
      const seconds = istTime.getUTCSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
    }
  }

  const parts = str.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const secPart = parts[2] ? parseInt(parts[2].substring(0, 2), 10) : 0;
    if (!isNaN(hours) && !isNaN(minutes)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      const s = String(!isNaN(secPart) ? secPart : 0).padStart(2, '0');
      return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${s} ${ampm}`;
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
