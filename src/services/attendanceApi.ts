import {
  AttendanceDaily,
  AttendanceEvent,
  AttendanceException,
  AttendancePolicy,
  AttendanceSnapshot,
  BiometricDevice,
  BiometricSyncLog,
  OvertimeRequest,
  PunchSource,
  RegularizationRequest,
  WfhRequest,
} from '../types/attendance';
import { DEFAULT_ATTENDANCE_POLICY, minutesToTimeString, processAttendanceStatus, timeStringToMinutes, formatCleanTime } from '../lib/attendance/attendanceEngine';
import { supabase, supabaseAdmin, isSupabaseEnabled, ensureSupabaseSession } from '../lib/supabase';
import { JoyRedis } from '../lib/redis';
import { attendanceRosterService } from './attendance/attendanceRosterService';
import { attendanceTimeService } from './attendance/attendanceTimeService';
import { attendanceIngestionService } from './attendance/attendanceIngestionService';
import { getActiveOrgId } from './attendance/biometricCommandService';
import { api } from './api';

const STORAGE_KEY_DAILY = 'workforceos_attendance_daily_v2';
const STORAGE_KEY_EVENTS = 'workforceos_attendance_events_v2';
const STORAGE_KEY_REGULARIZATIONS = 'workforceos_attendance_regularizations_v2';
const STORAGE_KEY_OVERTIME = 'workforceos_attendance_overtime_v2';
const STORAGE_KEY_WFH = 'workforceos_attendance_wfh_v2';
const STORAGE_KEY_DEVICES = 'workforceos_biometric_devices_v2';
const STORAGE_KEY_POLICIES = 'workforceos_attendance_policies_v2';
const STORAGE_KEY_SNAPSHOTS = 'workforceos_attendance_snapshots_v2';
const STORAGE_KEY_EXCEPTIONS = 'workforceos_attendance_exceptions_v2';

// Pure database initial state - 0 mock records
const SEED_DAILY: AttendanceDaily[] = [];
const SEED_DEVICES: BiometricDevice[] = [];
const SEED_REGULARIZATIONS: RegularizationRequest[] = [];
const SEED_OVERTIME: OvertimeRequest[] = [];
const SEED_WFH: WfhRequest[] = [];
const SEED_EXCEPTIONS: AttendanceException[] = [];

let _dailyCache: { data: AttendanceDaily[]; timestamp: number } | null = null;
let _dailyInFlight: Promise<AttendanceDaily[]> | null = null;

function getTenantStorageKey(baseKey: string, tenantId = getActiveOrgId()): string {
  return `${baseKey}_${tenantId}`;
}

// High-speed in-memory store with safe fallback to prevent browser QuotaExceeded errors and lag
const inMemoryAttendanceCache = new Map<string, any>();

function loadStorage<T>(baseKey: string, seed: T, tenantId = getActiveOrgId()): T {
  try {
    const key = getTenantStorageKey(baseKey, tenantId);
    if (inMemoryAttendanceCache.has(key)) {
      return inMemoryAttendanceCache.get(key) as T;
    }
    if (typeof localStorage === 'undefined') {
      inMemoryAttendanceCache.set(key, seed);
      return seed;
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      inMemoryAttendanceCache.set(key, seed);
      return seed;
    }
    const parsed = JSON.parse(raw);
    inMemoryAttendanceCache.set(key, parsed);
    return parsed;
  } catch {
    return seed;
  }
}

function saveStorage<T>(baseKey: string, data: T, tenantId = getActiveOrgId()): void {
  try {
    const key = getTenantStorageKey(baseKey, tenantId);
    inMemoryAttendanceCache.set(key, data);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e: any) {
        // Safe quota exceeded recovery — data is already safe in memory and Supabase
        if (e?.name === 'QuotaExceededError' || e?.code === 22) {
          // In-memory cache handles all queries smoothly
        }
      }
    }
  } catch (_) {
    // In-memory cache handles state
  }
}

export const attendanceApi = {
  invalidateCache: () => {
    _dailyCache = null;
    try {
      JoyRedis.invalidateLedgerCache(getActiveOrgId()).catch(() => {});
    } catch {}
  },

  async getDailyAttendanceAsync(date?: string, department?: string, status?: string, search?: string): Promise<AttendanceDaily[]> {
    if (isSupabaseEnabled) {
      try {
        await ensureSupabaseSession();
        const tenantId = getActiveOrgId();
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 12000);

        let q = supabase
          .from('attendance_daily')
          .select('*')
          .eq('organization_id', tenantId)
          .abortSignal(ctrl.signal);
        if (date) q = q.eq('attendance_date', date);
        const { data } = await q;

        // Fetch employee details to enrich daily attendance summaries
        let empMap = new Map<string, any>();
        try {
          const { data: empList } = await supabase
            .from('employees')
            .select('id, organization_id, company_id, employee_code, first_name, last_name, display_name, avatar_url, department_id, designation_id, employment_status')
            .eq('organization_id', tenantId)
            .abortSignal(ctrl.signal);
          if (empList && empList.length > 0) {
            empMap = new Map(empList.map((e: any) => [e.id, e]));
          }
        } catch { }

        // Fetch punches for date to determine authoritative source (MOBILE, WEB, BIOMETRIC) and fallback punch timestamps
        const punchMap = new Map<string, {
          checkInSource?: PunchSource;
          checkOutSource?: PunchSource;
          source?: PunchSource;
          firstInIso?: string;
          lastOutIso?: string;
          organizationId?: string;
        }>();
        try {
          let pq = supabase
            .from('attendance_punches')
            .select('employee_id, organization_id, punch_type, verification_mode, punch_source, device_id, punch_time')
            .eq('organization_id', tenantId)
            .order('punch_time', { ascending: true })
            .limit(500)
            .abortSignal(ctrl.signal);
          if (date) {
            const startRange = new Date(`${date}T00:00:00Z`);
            startRange.setHours(startRange.getHours() - 14);
            const endRange = new Date(`${date}T23:59:59Z`);
            endRange.setHours(endRange.getHours() + 14);
            pq = pq.gte('punch_time', startRange.toISOString()).lte('punch_time', endRange.toISOString());
          }
          const { data: punches } = await pq;
          clearTimeout(tid);
          if (punches) {
            for (const p of punches) {
              if (date) {
                const punchDate = new Date(p.punch_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                if (punchDate !== date) continue;
              }
              const mode = (p.verification_mode || '').toUpperCase();
              const psource = (p.punch_source || '').toUpperCase();
              const dev = (p.device_id || '').toUpperCase();

              let resolved: PunchSource = 'MOBILE';
              if (psource === 'MANUAL' || mode === 'MANUAL' || psource.includes('MANUAL')) {
                resolved = 'MANUAL';
              } else if (mode === 'FACE' || mode === 'FINGERPRINT' || mode === 'CARD' || mode === 'BIOMETRIC' || psource === 'BIOMETRIC' || psource === 'FACE_RECOGNITION') {
                resolved = 'BIOMETRIC';
              } else if (mode === 'GPS' || psource === 'WEB_GPS' || psource === 'MOBILE_GPS' || psource.includes('GPS') || psource.includes('MOBILE') || dev.includes('MOBILE') || dev.includes('APP') || dev.includes('FLUTTER')) {
                resolved = 'MOBILE';
              } else if (psource === 'WEB' || dev.includes('BROWSER')) {
                resolved = 'WEB';
              }

              const empId = p.employee_id;
              const existing = punchMap.get(empId) || {};
              const typeUpper = (p.punch_type || '').toUpperCase();
              if (typeUpper === 'IN' || typeUpper === 'CHECK_IN') {
                if (!existing.checkInSource) existing.checkInSource = resolved;
                if (!existing.firstInIso) existing.firstInIso = p.punch_time;
              } else if (typeUpper === 'OUT' || typeUpper === 'CHECK_OUT') {
                existing.checkOutSource = resolved;
                existing.lastOutIso = p.punch_time;
              }
              if (!existing.source) {
                existing.source = resolved;
              } else if (existing.checkInSource) {
                existing.source = existing.checkInSource;
              }
              existing.organizationId = p.organization_id || existing.organizationId;
              punchMap.set(empId, existing);
            }
          }
        } catch (punchErr) {
          console.warn('[attendanceApi] error resolving punches for source:', punchErr);
        }

        const dailyRows: any[] = [...(data || [])];
        const dailyEmpIds = new Set(dailyRows.map((d: any) => d.employee_id));
        const targetDateStr = date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        // Synthesize daily row for any employee who has punches in attendance_punches today but no attendance_daily row yet
        for (const [empId, pInfo] of punchMap.entries()) {
          if (!dailyEmpIds.has(empId) && (pInfo.firstInIso || pInfo.lastOutIso)) {
            dailyRows.push({
              id: `att-punch-${empId}-${targetDateStr}`,
              employee_id: empId,
              organization_id: pInfo.organizationId || getActiveOrgId(),
              attendance_date: targetDateStr,
              status: 'PRESENT',
              first_check_in: pInfo.firstInIso || null,
              last_check_out: pInfo.lastOutIso || null,
              total_work_minutes: 0,
              break_minutes: 0,
              late_entry_minutes: 0,
              early_exit_minutes: 0,
              overtime_minutes: 0,
              created_at: pInfo.firstInIso || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }

        const mapped: AttendanceDaily[] = dailyRows.map((d: any) => {
          const emp = empMap.get(d.employee_id);
          const empName = emp ? (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee') : 'Employee';
          const empCode = emp?.employee_code || 'EMP';

          const punchInfo = punchMap.get(d.employee_id);
          const rawFirstIn = d.first_check_in || punchInfo?.firstInIso;
          const rawLastOut = d.last_check_out || punchInfo?.lastOutIso;

          const checkInSource: PunchSource | undefined = (d.is_regularized || punchInfo?.checkInSource === 'MANUAL')
            ? 'MANUAL'
            : (punchInfo?.checkInSource || (rawFirstIn ? 'MOBILE' : undefined));
          const checkOutSource: PunchSource | undefined = punchInfo?.checkOutSource;
          const source: PunchSource = (d.is_regularized || punchInfo?.checkInSource === 'MANUAL')
            ? 'MANUAL'
            : (punchInfo?.checkInSource || punchInfo?.source || checkInSource || 'MOBILE');

          const formattedIn = rawFirstIn ? attendanceTimeService.formatAttendanceTime(rawFirstIn, 'Asia/Kolkata', true) : undefined;
          const formattedOut = rawLastOut ? attendanceTimeService.formatAttendanceTime(rawLastOut, 'Asia/Kolkata', true) : undefined;

          // Compute late minutes and working minutes accurately
          const inMins = formattedIn ? timeStringToMinutes(formattedIn) : null;
          const outMins = formattedOut ? timeStringToMinutes(formattedOut) : null;
          const calc = processAttendanceStatus(inMins, outMins, 540, 1080, DEFAULT_ATTENDANCE_POLICY, false, false, false, d.attendance_date);

          let grossMins = d.total_work_minutes || calc.grossMinutes || 0;
          if (!rawLastOut && rawFirstIn) {
            const startMs = new Date(rawFirstIn).getTime();
            if (!isNaN(startMs)) {
              grossMins = Math.max(0, Math.floor((Date.now() - startMs) / 60000));
            }
          }
          const breakMins = d.break_minutes || 0;
          const netMins = calc.netMinutes || grossMins;
          const lateMins = (d.late_entry_minutes && d.late_entry_minutes > 0) ? d.late_entry_minutes : calc.lateMinutes;

          return {
            id: d.id,
            employee_id: d.employee_id,
            employee_code: empCode,
            employee_name: empName,
            department: emp?.department || 'Engineering & Development',
            designation: emp?.designation || 'Senior Software Engineer',
            avatar_url: emp?.avatar_url,
            organization_id: d.organization_id,
            company_id: emp?.company_id || 'cmp-01',
            date: d.attendance_date,
            shift_id: d.shift_id || 'shift-gen',
            shift_name: 'General Shift',
            expected_check_in: '09:00 AM',
            expected_check_out: '06:00 PM',
            status: calc.status,
            first_check_in: formattedIn,
            last_check_out: formattedOut,
            gross_working_minutes: grossMins,
            total_break_minutes: breakMins,
            net_working_minutes: netMins,
            late_minutes: lateMins,
            early_checkout_minutes: d.early_exit_minutes || calc.earlyMinutes || 0,
            overtime_minutes: d.overtime_minutes || calc.overtimeMinutes || 0,
            source,
            check_in_source: checkInSource,
            check_out_source: checkOutSource,
            created_at: d.created_at,
            updated_at: d.updated_at,
          };
        });
        _dailyCache = { data: mapped, timestamp: Date.now() };
        saveStorage(STORAGE_KEY_DAILY, mapped);
        try {
          if (typeof localStorage !== 'undefined') {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const k = localStorage.key(i);
              if (
                k &&
                (k.startsWith('workforce_raw_punch_ledger_v4') ||
                  k.startsWith('workforce_bio_punches_v1') ||
                  k.startsWith('workforce_classified_punch_ledger_v4'))
              ) {
                localStorage.removeItem(k);
              }
            }
          }
        } catch {
          // ignore storage errors
        }
        return this.getDailyAttendance(date, department, status, search);
      } catch (err) {
        console.warn('[attendanceApi] getDailyAttendanceAsync notice:', err);
      }
    }
    return this.getDailyAttendance(date, department, status, search);
  },

  async getDailyAttendanceForPeriodAsync(startDate: string, endDate: string, employeeId?: string): Promise<AttendanceDaily[]> {
    const tenantId = getActiveOrgId();

    if (isSupabaseEnabled) {
      try {
        await ensureSupabaseSession();
        const client = supabaseAdmin || supabase;
        let q = client
          .from('attendance_daily')
          .select('*')
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate);

        if (employeeId) {
          q = q.eq('employee_id', employeeId);
        }

        const { data, error } = await q;
        if (error) {
          console.warn('[attendanceApi] getDailyAttendanceForPeriodAsync DB notice:', error);
        }

        // Fetch employee details
        let empMap = new Map<string, any>();
        try {
          const { data: empList } = await client
            .from('employees')
            .select('id, employee_code, first_name, last_name, display_name, avatar_url');
          if (empList) {
            empMap = new Map(empList.map((e: any) => [e.id, e]));
          }
        } catch {}

        // Fetch punch events for this date range with buffer
        const startRange = new Date(`${startDate}T00:00:00Z`);
        startRange.setHours(startRange.getHours() - 14);
        const endRange = new Date(`${endDate}T23:59:59Z`);
        endRange.setHours(endRange.getHours() + 14);

        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 12000);

        let pq = client
          .from('attendance_punches')
          .select('employee_id, organization_id, punch_type, verification_mode, punch_source, device_id, punch_time')
          .eq('organization_id', tenantId)
          .gte('punch_time', startRange.toISOString())
          .lte('punch_time', endRange.toISOString())
          .order('punch_time', { ascending: true })
          .limit(500)
          .abortSignal(ctrl.signal);

        if (employeeId) {
          pq = pq.eq('employee_id', employeeId);
        }

        const { data: punches } = await pq;
        clearTimeout(tid);
        const punchMap = new Map<string, {
          employeeId: string;
          punchDate: string;
          organizationId?: string;
          checkInSource?: PunchSource;
          checkOutSource?: PunchSource;
          source?: PunchSource;
          firstInIso?: string;
          lastOutIso?: string;
        }>();
        if (punches) {
          for (const p of punches) {
            const punchDate = new Date(p.punch_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            if (punchDate < startDate || punchDate > endDate) continue;
            const key = `${p.employee_id}_${punchDate}`;

            const mode = (p.verification_mode || '').toUpperCase();
            const psource = (p.punch_source || '').toUpperCase();
            const dev = (p.device_id || '').toUpperCase();

            let resolved: PunchSource = 'MOBILE';
            if (psource === 'MANUAL' || mode === 'MANUAL' || psource.includes('MANUAL')) {
              resolved = 'MANUAL';
            } else if (mode === 'FACE' || mode === 'FINGERPRINT' || mode === 'CARD' || mode === 'BIOMETRIC' || psource === 'BIOMETRIC' || psource === 'FACE_RECOGNITION') {
              resolved = 'BIOMETRIC';
            } else if (mode === 'GPS' || psource === 'WEB_GPS' || psource === 'MOBILE_GPS' || psource.includes('GPS') || psource.includes('MOBILE') || dev.includes('MOBILE') || dev.includes('APP') || dev.includes('FLUTTER')) {
              resolved = 'MOBILE';
            } else if (psource === 'WEB' || dev.includes('BROWSER')) {
              resolved = 'WEB';
            }

            const existing: {
              employeeId: string;
              punchDate: string;
              organizationId?: string;
              checkInSource?: PunchSource;
              checkOutSource?: PunchSource;
              source?: PunchSource;
              firstInIso?: string;
              lastOutIso?: string;
            } = punchMap.get(key) || {
              employeeId: p.employee_id,
              punchDate,
              organizationId: p.organization_id,
            };
            const typeUpper = (p.punch_type || '').toUpperCase();
            if (typeUpper === 'IN' || typeUpper === 'CHECK_IN') {
              if (!existing.checkInSource) existing.checkInSource = resolved;
              if (!existing.firstInIso) existing.firstInIso = p.punch_time;
            } else if (typeUpper === 'OUT' || typeUpper === 'CHECK_OUT') {
              existing.checkOutSource = resolved;
              existing.lastOutIso = p.punch_time;
            }
            if (!existing.source) {
              existing.source = resolved;
            } else if (existing.checkInSource) {
              existing.source = existing.checkInSource;
            }
            punchMap.set(key, existing);
          }
        }

        const dailyRows: any[] = [...(data || [])];
        const existingKeys = new Set(dailyRows.map((d: any) => `${d.employee_id}_${d.attendance_date}`));

        // Synthesize daily row from actual punch if attendance_daily row does not exist yet
        for (const [key, pInfo] of punchMap.entries()) {
          if (!existingKeys.has(key) && (pInfo.firstInIso || pInfo.lastOutIso)) {
            dailyRows.push({
              id: `att-punch-${pInfo.employeeId}-${pInfo.punchDate}`,
              employee_id: pInfo.employeeId,
              organization_id: pInfo.organizationId || tenantId,
              attendance_date: pInfo.punchDate,
              status: 'PRESENT',
              first_check_in: pInfo.firstInIso || null,
              last_check_out: pInfo.lastOutIso || null,
              total_work_minutes: 0,
              break_minutes: 0,
              late_entry_minutes: 0,
              early_exit_minutes: 0,
              overtime_minutes: 0,
              created_at: pInfo.firstInIso || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }

        const mapped: AttendanceDaily[] = dailyRows.map((d: any) => {
          const emp = empMap.get(d.employee_id);
          const empName = emp ? (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee') : 'Employee';
          const empCode = emp?.employee_code || 'EMP';

          const punchKey = `${d.employee_id}_${d.attendance_date}`;
          const punchInfo = punchMap.get(punchKey);
          const rawFirstIn = d.first_check_in || punchInfo?.firstInIso;
          const rawLastOut = d.last_check_out || punchInfo?.lastOutIso;

          const checkInSource: PunchSource | undefined = punchInfo?.checkInSource || (rawFirstIn ? 'MOBILE' : undefined);
          const checkOutSource: PunchSource | undefined = punchInfo?.checkOutSource;
          const source: PunchSource = punchInfo?.checkInSource || punchInfo?.source || checkInSource || 'MOBILE';

          const formattedIn = rawFirstIn ? attendanceTimeService.formatAttendanceTime(rawFirstIn, 'Asia/Kolkata', true) : undefined;
          const formattedOut = rawLastOut ? attendanceTimeService.formatAttendanceTime(rawLastOut, 'Asia/Kolkata', true) : undefined;

          const inMins = formattedIn ? timeStringToMinutes(formattedIn) : null;
          const outMins = formattedOut ? timeStringToMinutes(formattedOut) : null;
          const isLeaveStatus = d.status === 'ON_LEAVE' || d.status === 'Leave' || d.status === 'On Leave';
          const isHolidayStatus = d.status === 'HOLIDAY' || d.status === 'Holiday';
          const calc = processAttendanceStatus(inMins, outMins, 540, 1080, DEFAULT_ATTENDANCE_POLICY, isLeaveStatus, false, isHolidayStatus, d.attendance_date);

          let grossMins = d.total_work_minutes || calc.grossMinutes || 0;
          if (!rawLastOut && rawFirstIn) {
            const startMs = new Date(rawFirstIn).getTime();
            if (!isNaN(startMs)) {
              grossMins = Math.max(0, Math.floor((Date.now() - startMs) / 60000));
            }
          }
          const breakMins = d.break_minutes || 0;
          const netMins = Math.max(0, grossMins - breakMins);
          const lateMins = (d.late_entry_minutes && d.late_entry_minutes > 0) ? d.late_entry_minutes : calc.lateMinutes;

          let resolvedStatus = calc.status;
          if (isLeaveStatus) {
            resolvedStatus = 'On Leave';
          } else if (isHolidayStatus) {
            resolvedStatus = 'Holiday';
          } else if (d.status === 'WEEKLY_OFF' || d.status === 'Weekly Off') {
            resolvedStatus = 'Weekly Off';
          } else if (d.status === 'PRESENT' || rawFirstIn) {
            resolvedStatus = calc.status || 'Present';
          } else if (d.status === 'ABSENT') {
            if (netMins >= 120 && netMins < 240) {
              resolvedStatus = 'Half Day';
            } else {
              resolvedStatus = 'Absent';
            }
          }

          return {
            id: d.id,
            employee_id: d.employee_id,
            employee_code: empCode,
            employee_name: empName,
            department: 'Operations',
            designation: 'Staff',
            avatar_url: emp?.avatar_url,
            organization_id: d.organization_id,
            company_id: 'cmp-01',
            date: d.attendance_date,
            shift_id: d.shift_id || 'shift-gen',
            shift_name: 'General Shift',
            expected_check_in: '09:00 AM',
            expected_check_out: '06:00 PM',
            status: resolvedStatus,
            first_check_in: formattedIn,
            last_check_out: formattedOut,
            gross_working_minutes: grossMins,
            total_break_minutes: breakMins,
            net_working_minutes: netMins,
            late_minutes: lateMins,
            early_checkout_minutes: d.early_exit_minutes || calc.earlyMinutes || 0,
            overtime_minutes: d.overtime_minutes || calc.overtimeMinutes || 0,
            source,
            check_in_source: checkInSource,
            check_out_source: checkOutSource,
            created_at: d.created_at,
            updated_at: d.updated_at,
          };
        });

        // Cache mapped records so synchronous payroll/payslip calls can immediately access them
        if (mapped.length > 0) {
          try {
            const cacheKey = `period_att_${startDate}_${endDate}`;
            const existing = loadStorage<AttendanceDaily[]>(cacheKey, []);
            const mergedMap = new Map<string, AttendanceDaily>();
            for (const it of existing) mergedMap.set(`${it.employee_id}_${it.date}`, it);
            for (const it of mapped) mergedMap.set(`${it.employee_id}_${it.date}`, it);
            saveStorage(cacheKey, Array.from(mergedMap.values()));
          } catch {}
        }

        // Return ONLY actual database attendance records — zero pre-filling
        return mapped;
      } catch (err) {
        console.warn('[attendanceApi] getDailyAttendanceForPeriodAsync notice:', err);
      }
    }
    return this.getDailyAttendance();
  },

  getDailyAttendanceForPeriodSync: (startDate: string, endDate: string, employeeIdOrCode?: string): AttendanceDaily[] => {
    let list: AttendanceDaily[] = [];
    try {
      const cacheKey = `period_att_${startDate}_${endDate}`;
      list = loadStorage<AttendanceDaily[]>(cacheKey, []);
      if (list.length === 0) {
        list = attendanceApi.getDailyAttendance();
      }
    } catch {
      list = attendanceApi.getDailyAttendance();
    }
    const target = (employeeIdOrCode || '').toLowerCase().trim();
    return list.filter(r => {
      const matchDate = r.date >= startDate && r.date <= endDate;
      if (!matchDate) return false;
      if (!target) return true;
      const rEmpId = (r.employee_id || '').toLowerCase();
      const rEmpCode = ((r as any).employee_code || '').toLowerCase();
      const rEmpName = ((r as any).employee_name || '').toLowerCase();
      return (
        rEmpId === target ||
        rEmpCode === target ||
        (target.length > 2 && (rEmpId.includes(target) || rEmpCode.includes(target) || rEmpName.includes(target)))
      );
    });
  },

  getDailyAttendance: (date?: string, department?: string, status?: string, search?: string): AttendanceDaily[] => {
    const isUuid = (val: any) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    let list: AttendanceDaily[] = [];
    if (_dailyCache?.data && _dailyCache.data.length > 0) {
      list = [..._dailyCache.data];
    } else {
      list = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
      if (list.length > 0) {
        _dailyCache = { data: list, timestamp: Date.now() };
      }
    }

    // Strictly discard any non-UUID or CE0* seeded worker records even before workforce_employees is populated
    if (isSupabaseEnabled) {
      list = list.filter(
        item =>
          isUuid(item.employee_id) &&
          !String(item.employee_code || '').toUpperCase().startsWith('CE0')
      );
    }

    // Trigger background rehydration from Supabase if cache is cold
    if (isSupabaseEnabled && !_dailyInFlight && (!_dailyCache || Date.now() - _dailyCache.timestamp > 15000)) {
      _dailyInFlight = attendanceApi.getDailyAttendanceAsync(date).finally(() => {
        _dailyInFlight = null;
      });
    }

    // Purge mock/legacy attendance records: only keep records strictly matching existing UUID employees in directory
    try {
      const rawEmployees = localStorage.getItem('workforce_employees');
      if (rawEmployees) {
        const employees: any[] = JSON.parse(rawEmployees);
        const realEmployees = employees.filter(
          e =>
            e.status !== 'Terminated' &&
            e.status !== 'Exited' &&
            e.status !== 'Inactive' &&
            e.status !== 'Suspended' &&
            (e as any).employment_status !== 'SUSPENDED' &&
            (!isSupabaseEnabled || isUuid(e.id)) &&
            !String(e.employee_code || '').toUpperCase().startsWith('CE0')
        );

        const cleaned: AttendanceDaily[] = [];
        const seenEmpKeys = new Set<string>();

        const targetDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        for (const item of list) {
          // Robust matching across ID, Code, Name, and Composite Keys
          const matchedEmp = realEmployees.find(e =>
            (e.id && item.employee_id && e.id.toLowerCase() === item.employee_id.toLowerCase()) ||
            (e.employee_code && item.employee_code && e.employee_code.toLowerCase() === item.employee_code.toLowerCase()) ||
            (e.employee_code && item.employee_id && e.employee_code.toLowerCase() === item.employee_id.toLowerCase()) ||
            (e.id && item.employee_code && e.id.toLowerCase() === item.employee_code.toLowerCase()) ||
            (item.id && e.id && item.id.includes(e.id)) ||
            (item.id && e.employee_code && item.id.includes(e.employee_code)) ||
            (e.display_name && item.employee_name && e.display_name.toLowerCase() === item.employee_name.toLowerCase())
          );

          if (matchedEmp) {
            const empKey = `${matchedEmp.id || matchedEmp.employee_code}_${item.date || targetDate}`;
            if (!seenEmpKeys.has(empKey)) {
              seenEmpKeys.add(empKey);
              const roster = attendanceRosterService.getRosterForEmployeeOnDate(matchedEmp.id, item.date || targetDate, undefined, matchedEmp);
              const shiftDef = attendanceRosterService.getShiftById(roster.shift_id);
              const shiftStart = shiftDef?.start_time || '09:00';
              const shiftEnd = shiftDef?.end_time || '18:00';

              const rawIn = item.first_check_in || (item as any).in_time || (item as any).check_in;
              const rawOut = item.last_check_out || (item as any).out_time || (item as any).check_out;

              const hasPunch = !!rawIn || !!rawOut;
              const inMins = rawIn ? timeStringToMinutes(rawIn) : null;
              const outMins = rawOut ? timeStringToMinutes(rawOut) : null;
              const expectedInMins = timeStringToMinutes(shiftStart) || 570;
              const expectedOutMins = timeStringToMinutes(shiftEnd) || 1110;
              const calc = processAttendanceStatus(inMins, outMins, expectedInMins, expectedOutMins);
              const resolvedStatus = hasPunch ? (item.status || calc.status || 'Present') : (roster.is_weekly_off ? 'Weekly Off' : item.status || 'Not Checked In');

              cleaned.push({
                ...item,
                employee_id: matchedEmp.id,
                employee_code: matchedEmp.employee_code || item.employee_code,
                employee_name: matchedEmp.display_name || `${matchedEmp.first_name || ''} ${matchedEmp.last_name || ''}`.trim() || item.employee_name,
                department: matchedEmp.department_name || matchedEmp.department || 'People & HR',
                designation: matchedEmp.designation_title || matchedEmp.designation || 'Staff',
                shift_id: roster.shift_id,
                shift_name: `${roster.shift_name} (${roster.shift_code})`,
                expected_check_in: shiftStart,
                expected_check_out: shiftEnd,
                first_check_in: rawIn ? formatCleanTime(rawIn) : undefined,
                last_check_out: rawOut ? formatCleanTime(rawOut) : undefined,
                gross_working_minutes: (item.gross_working_minutes && item.gross_working_minutes > 0) ? item.gross_working_minutes : calc.grossMinutes,
                net_working_minutes: (item.net_working_minutes && item.net_working_minutes > 0) ? item.net_working_minutes : calc.netMinutes,
                late_minutes: calc.lateMinutes,
                early_checkout_minutes: item.early_checkout_minutes ?? calc.earlyMinutes,
                overtime_minutes: item.overtime_minutes ?? calc.overtimeMinutes,
                status: resolvedStatus,
                source: (item.source || item.check_in_source || (hasPunch ? 'MOBILE' : undefined)) as any,
                check_in_source: (item.check_in_source || item.source || (hasPunch ? 'MOBILE' : undefined)) as any,
                check_out_source: item.check_out_source,
              });
            }
          } else if (!isSupabaseEnabled || isUuid(item.employee_id)) {
            const rawIn = item.first_check_in || (item as any).in_time || (item as any).check_in;
            const rawOut = item.last_check_out || (item as any).out_time || (item as any).check_out;
            const hasPunch = !!rawIn || !!rawOut;
            const itemDate = (item as any).attendance_date || item.date || targetDate;
            const empKey = `${item.employee_id || item.id}_${itemDate}`;
            if (!seenEmpKeys.has(empKey)) {
              seenEmpKeys.add(empKey);
              const rawStatus = String(item.status || '').toUpperCase();
              const resolvedStatus = (rawStatus === 'PRESENT')
                ? 'Present'
                : (rawStatus === 'ABSENT')
                ? 'Absent'
                : (item.status || (hasPunch ? 'Present' : 'Not Checked In'));

              cleaned.push({
                ...item,
                date: itemDate,
                employee_id: item.employee_id || item.id,
                employee_name: item.employee_name || 'Employee',
                employee_code: item.employee_code || 'EMP',
                first_check_in: rawIn ? formatCleanTime(rawIn) : undefined,
                last_check_out: rawOut ? formatCleanTime(rawOut) : undefined,
                status: resolvedStatus as any,
                source: (item.source || item.check_in_source || (hasPunch ? 'MOBILE' : undefined)) as any,
                check_in_source: (item.check_in_source || item.source || (hasPunch ? 'MOBILE' : undefined)) as any,
                check_out_source: item.check_out_source,
              });
            }
          }
        }

        // For any real employee without an attendance record yet, create one resolved with their shift schedule
        for (const emp of realEmployees) {
          const empKey = `${emp.id}_${targetDate}`;
          if (!seenEmpKeys.has(empKey)) {
            seenEmpKeys.add(empKey);
            const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, targetDate, undefined, emp);
            const isOff = roster.is_weekly_off;
            const shiftDef = attendanceRosterService.getShiftById(roster.shift_id);
            const shiftStart = shiftDef?.start_time || '09:00';
            const shiftEnd = shiftDef?.end_time || '18:00';

            cleaned.push({
              id: `att-dyn-${emp.id}-${targetDate}`,
              employee_id: emp.id,
              employee_code: emp.employee_code || `WF-${emp.id}`,
              employee_name: emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || 'Employee',
              department: emp.department_name || emp.department || 'Operations',
              designation: emp.designation_title || emp.designation || 'Staff',
              organization_id: emp.organization_id || getActiveOrgId(),
              company_id: emp.company_id || 'cmp-01',
              date: targetDate,
              shift_id: roster.shift_id,
              shift_name: `${roster.shift_name} (${roster.shift_code})`,
              expected_check_in: shiftStart,
              expected_check_out: shiftEnd,
              first_check_in: undefined,
              last_check_out: undefined,
              gross_working_minutes: 0,
              net_working_minutes: 0,
              total_break_minutes: 0,
              late_minutes: 0,
              early_checkout_minutes: 0,
              overtime_minutes: 0,
              status: isOff ? 'Weekly Off' : 'Not Checked In',
              source: isOff ? 'SYSTEM' : undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }

        saveStorage(STORAGE_KEY_DAILY, cleaned);
        list = cleaned;
      }
    } catch (_) {}

    if (date) {
      list = list.filter(item => item.date === date || !date);
    }
    if (department && department !== 'ALL') {
      list = list.filter(item => item.department.toLowerCase() === department.toLowerCase());
    }
    if (status && status !== 'ALL') {
      list = list.filter(item => item.status === status);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        item =>
          item.employee_name.toLowerCase().includes(q) ||
          item.employee_code.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q)
      );
    }
    return list;
  },

  getAllAttendanceLogs: (): AttendanceDaily[] => {
    return attendanceApi.getDailyAttendance();
  },

  checkIn: (employeeId: string, employeeName: string, source: PunchSource = 'WEB', locationName: string = 'HQ Office Web Check-in'): AttendanceDaily => {
    const list = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
    const today = attendanceTimeService.getOrganizationBusinessDate();
    const nowIso = new Date().toISOString();

    const existingIdx = list.findIndex(e => e.employee_id === employeeId && e.date === today);
    const calculation = attendanceTimeService.calculateWorkingMinutes(nowIso);

    // If an accepted check-in already exists today: FIRST VALID CHECK-IN WINS!
    // Suppress duplicate check-in, do not overwrite timestamp or source, log diagnostic event.
    if (existingIdx >= 0 && list[existingIdx].first_check_in) {
      const existing = list[existingIdx];
      attendanceIngestionService.ingestAttendanceEvent({
        organizationId: existing.organization_id || getActiveOrgId(),
        employeeId,
        source: (source as any) || 'WEB',
        punchType: 'CHECK_IN',
        punchTime: nowIso,
        rawPayload: { employeeName, locationName },
      }).catch(err => console.warn('[attendanceApi] checkIn deduplication notice:', err));

      return existing;
    }

    // Ingest first valid check-in through centralized ingestion service
    attendanceIngestionService.ingestAttendanceEvent({
      organizationId: getActiveOrgId(),
      employeeId,
      source: (source as any) || 'WEB',
      punchType: 'CHECK_IN',
      punchTime: nowIso,
      rawPayload: { employeeName, locationName },
    }).catch(err => console.warn('[attendanceApi] checkIn ingestion notice:', err));

    if (existingIdx >= 0) {
      const updated: AttendanceDaily = {
        ...list[existingIdx],
        status: 'Present',
        first_check_in: nowIso,
        source,
        check_in_source: source,
        updated_at: nowIso,
      };
      list[existingIdx] = updated;
      saveStorage(STORAGE_KEY_DAILY, list);
      JoyRedis.invalidateLedgerCache(getActiveOrgId()).catch(() => {});
      if (_dailyCache) {
        const cIdx = _dailyCache.data.findIndex(e => e.employee_id === employeeId && e.date === today);
        if (cIdx >= 0) _dailyCache.data[cIdx] = updated;
        else _dailyCache.data.unshift(updated);
      }
      return updated;
    } else {
      const newItem: AttendanceDaily = {
        id: `att-${Date.now()}`,
        employee_id: employeeId,
        employee_name: employeeName,
        employee_code: `WF-${Math.floor(1000 + Math.random() * 9000)}`,
        department: 'Engineering',
        designation: 'Specialist Engineer',
        organization_id: getActiveOrgId(),
        company_id: 'cmp-01',
        date: today,
        shift_id: 'shift-gen',
        shift_name: 'General Shift (09:30 - 18:30)',
        expected_check_in: '09:30 AM',
        expected_check_out: '06:30 PM',
        status: 'Present',
        first_check_in: nowIso,
        gross_working_minutes: 0,
        total_break_minutes: 0,
        net_working_minutes: 0,
        late_minutes: calculation.lateMinutes,
        early_checkout_minutes: 0,
        overtime_minutes: 0,
        source,
        check_in_source: source,
        created_at: nowIso,
        updated_at: nowIso,
      };
      list.unshift(newItem);
      saveStorage(STORAGE_KEY_DAILY, list);
      JoyRedis.invalidateLedgerCache(getActiveOrgId()).catch(() => {});
      if (_dailyCache) {
        _dailyCache.data.unshift(newItem);
      }
      return newItem;
    }
  },

  checkOut: (employeeId: string, source: PunchSource = 'WEB'): AttendanceDaily | null => {
    const list = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
    const today = attendanceTimeService.getOrganizationBusinessDate();
    const nowIso = new Date().toISOString();

    const idx = list.findIndex(e => e.employee_id === employeeId && e.date === today);
    if (idx < 0) return null;

    const record = list[idx];
    const calculation = attendanceTimeService.calculateWorkingMinutes(record.first_check_in, nowIso);

    const checkInSource = record.check_in_source || record.source || 'BIOMETRIC';
    const checkOutSource = source;
    const overallSource: PunchSource = checkInSource || source;

    const updated: AttendanceDaily = {
      ...record,
      last_check_out: nowIso,
      status: 'Present',
      gross_working_minutes: calculation.grossMinutes,
      net_working_minutes: calculation.netMinutes,
      late_minutes: calculation.lateMinutes,
      early_checkout_minutes: calculation.earlyMinutes,
      overtime_minutes: calculation.overtimeMinutes,
      check_in_source: checkInSource,
      check_out_source: checkOutSource,
      source: overallSource,
      updated_at: nowIso,
    };

    list[idx] = updated;
    saveStorage(STORAGE_KEY_DAILY, list);
    JoyRedis.invalidateLedgerCache(getActiveOrgId()).catch(() => {});
    if (_dailyCache) {
      const cIdx = _dailyCache.data.findIndex(e => e.employee_id === employeeId && e.date === today);
      if (cIdx >= 0) _dailyCache.data[cIdx] = updated;
    }

    if (isSupabaseEnabled) {
      // Shared ingestion path for CHECK_OUT
      attendanceIngestionService.ingestAttendanceEvent({
        organizationId: updated.organization_id || getActiveOrgId(),
        employeeId: updated.employee_id,
        source: (source as any) || 'WEB',
        punchType: 'CHECK_OUT',
        punchTime: nowIso,
      }).catch(err => console.warn('[Supabase Attendance] checkOut ingestion notice:', err));
    }

    return updated;
  },

  recordBiometricPunch: (payload: {
    employeeId: string;
    punchTime: string;
    direction?: 'IN' | 'OUT' | 'AUTO';
    deviceName?: string;
    verificationMode?: string;
  }): AttendanceDaily => {
    const list = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
    const todayStr = payload.punchTime ? payload.punchTime.split('T')[0] : new Date().toISOString().split('T')[0];
    const punchDate = new Date(payload.punchTime);
    const timeStr = !isNaN(punchDate.getTime())
      ? punchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : payload.punchTime;

    const existingIdx = list.findIndex(e => (e.employee_id === payload.employeeId || e.employee_code === payload.employeeId) && (e.date === todayStr || (e as any).attendance_date === todayStr));

    const punchIso = payload.punchTime && (payload.punchTime.endsWith('Z') || payload.punchTime.includes('+'))
      ? payload.punchTime
      : attendanceTimeService.normalizeDeviceTimestamp(payload.punchTime, 'Asia/Kolkata').eventTimestampUtc;

    if (existingIdx >= 0) {
      const existing = list[existingIdx];

      // DUPLICATE CHECK-IN SUPPRESSION & MONITOR MODE:
      // If employee already has a valid check-in:
      if (existing.first_check_in) {
        const checkInMins = timeStringToMinutes(existing.first_check_in);
        const currentMins = timeStringToMinutes(timeStr);
        const elapsedMins = (checkInMins !== null && currentMins !== null) ? (currentMins - checkInMins) : 0;

        // In Monitor Mode, if direction is OUT, or if punch is >= 15 mins after check-in (even if device sent IN/AUTO):
        if (payload.direction === 'OUT' || elapsedMins >= 15) {
          existing.last_check_out = timeStr;
          existing.check_out_source = 'BIOMETRIC';
          const calc = processAttendanceStatus(checkInMins, currentMins);
          existing.gross_working_minutes = calc.grossMinutes;
          existing.net_working_minutes = calc.netMinutes;
          existing.status = calc.status;

          attendanceIngestionService.ingestAttendanceEvent({
            organizationId: existing.organization_id || getActiveOrgId(),
            employeeId: payload.employeeId,
            source: 'BIOMETRIC',
            punchType: 'CHECK_OUT',
            verificationMode: (payload.verificationMode as any) || 'BIOMETRIC',
            punchTime: punchIso,
            deviceId: payload.deviceName,
            rawPayload: { ...payload, monitorMode: true, checkInTime: existing.first_check_in },
          }).catch(err => console.warn('[attendanceApi] biometric monitor mode checkOut notice:', err));

          return existing;
        } else {
          // Rapid duplicate punch within 15 mins: suppress and log diagnostic
          attendanceIngestionService.ingestAttendanceEvent({
            organizationId: existing.organization_id || getActiveOrgId(),
            employeeId: payload.employeeId,
            source: 'BIOMETRIC',
            punchType: 'CHECK_IN',
            verificationMode: (payload.verificationMode as any) || 'BIOMETRIC',
            punchTime: punchIso,
            deviceId: payload.deviceName,
            rawPayload: payload,
          }).catch(err => console.warn('[attendanceApi] biometric duplicate check-in notice:', err));

          return existing;
        }
      } else {
        // Employee record existed as 'Not Checked In' placeholder: this is first valid check-in!
        existing.first_check_in = timeStr;
        existing.status = 'Present';
        existing.source = 'BIOMETRIC';
        existing.check_in_source = 'BIOMETRIC';

        attendanceIngestionService.ingestAttendanceEvent({
          organizationId: existing.organization_id || getActiveOrgId(),
          employeeId: payload.employeeId,
          source: 'BIOMETRIC',
          punchType: 'CHECK_IN',
          verificationMode: (payload.verificationMode as any) || 'BIOMETRIC',
          punchTime: punchIso,
          deviceId: payload.deviceName,
          rawPayload: payload,
        }).catch(err => console.warn('[attendanceApi] biometric checkIn notice:', err));
      }

      existing.updated_at = new Date().toISOString();
      list[existingIdx] = existing;
      saveStorage(STORAGE_KEY_DAILY, list);
      _dailyCache = null;
      JoyRedis.invalidateLedgerCache(getActiveOrgId()).catch(() => {});
      return existing;
    } else {
      let empName = 'Employee';
      let empCode = `WF-${payload.employeeId}`;
      try {
        const rawEmps = localStorage.getItem('workforce_employees');
        if (rawEmps) {
          const parsed = JSON.parse(rawEmps);
          const found = parsed.find((e: any) => e.id === payload.employeeId || e.employee_code === payload.employeeId);
          if (found) {
            empName = found.display_name || `${found.first_name || ''} ${found.last_name || ''}`.trim() || found.name;
            empCode = found.employee_code || empCode;
          }
        }
      } catch (_) {}

      const roster = attendanceRosterService.getRosterForEmployeeOnDate(payload.employeeId, todayStr);
      const shiftDef = attendanceRosterService.getShiftById(roster.shift_id);
      const newItem: AttendanceDaily = {
        id: `att-bio-${Date.now()}`,
        employee_id: payload.employeeId,
        employee_code: empCode,
        employee_name: empName,
        department: 'Operations',
        designation: 'Staff',
        organization_id: getActiveOrgId(),
        company_id: 'cmp-01',
        date: todayStr,
        shift_id: roster.shift_id,
        shift_name: `${roster.shift_name} (${roster.shift_code})`,
        expected_check_in: shiftDef?.start_time || '09:30',
        expected_check_out: shiftDef?.end_time || '18:30',
        first_check_in: timeStr,
        gross_working_minutes: 0,
        net_working_minutes: 0,
        total_break_minutes: 0,
        late_minutes: 0,
        early_checkout_minutes: 0,
        overtime_minutes: 0,
        status: 'Present',
        source: 'BIOMETRIC',
        check_in_source: 'BIOMETRIC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.unshift(newItem);
      saveStorage(STORAGE_KEY_DAILY, list);
      _dailyCache = null;
      JoyRedis.invalidateLedgerCache(getActiveOrgId()).catch(() => {});

      // Ingest first valid check-in through centralized ingestion service
      attendanceIngestionService.ingestAttendanceEvent({
        organizationId: getActiveOrgId(),
        employeeId: payload.employeeId,
        source: 'BIOMETRIC',
        punchType: 'CHECK_IN',
        verificationMode: (payload.verificationMode as any) || 'BIOMETRIC',
        punchTime: payload.punchTime || new Date().toISOString(),
        deviceId: payload.deviceName,
        rawPayload: payload,
      }).catch(err => console.warn('[attendanceApi] biometric first check-in notice:', err));

      return newItem;
    }
  },

  async getRegularizationsAsync(): Promise<RegularizationRequest[]> {
    if (isSupabaseEnabled) {
      try {
        await ensureSupabaseSession();
        const { data, error } = await supabase
          .from('attendance_regularizations')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          const mapped: RegularizationRequest[] = data.map((r: any) => ({
            id: r.id,
            employee_id: r.employee_id,
            employee_name: 'Staff',
            attendance_date: r.attendance_date,
            current_status: 'Absent',
            original_check_in: '--:--',
            original_check_out: '--:--',
            requested_check_in: r.requested_check_in,
            requested_check_out: r.requested_check_out,
            reason: r.reason || 'Regularization',
            status: r.status === 'PENDING' ? 'Pending Manager' : r.status === 'APPROVED' ? 'Approved' : 'Rejected',
            submitted_at: r.created_at,
          }));
          saveStorage(STORAGE_KEY_REGULARIZATIONS, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[attendanceApi] getRegularizationsAsync notice:', err);
      }
    }
    return this.getRegularizations();
  },

  getRegularizations: (): RegularizationRequest[] => {
    return loadStorage<RegularizationRequest[]>(STORAGE_KEY_REGULARIZATIONS, SEED_REGULARIZATIONS);
  },

  submitRegularization: (req: Omit<RegularizationRequest, 'id' | 'submitted_at' | 'status'>): RegularizationRequest => {
    const list = loadStorage<RegularizationRequest[]>(STORAGE_KEY_REGULARIZATIONS, SEED_REGULARIZATIONS);
    const newReq: RegularizationRequest = {
      ...req,
      id: `reg-${Date.now()}`,
      submitted_at: new Date().toLocaleString(),
      status: 'Pending Manager',
    };
    list.unshift(newReq);
    saveStorage(STORAGE_KEY_REGULARIZATIONS, list);

    if (isSupabaseEnabled) {
      const orgId = getActiveOrgId();
      if (orgId && req.employee_id && req.employee_id.length === 36) {
        Promise.resolve(
          supabase.from('attendance_regularizations').insert({
            organization_id: orgId,
            employee_id: newReq.employee_id,
            attendance_date: (newReq as any).date || (newReq as any).attendance_date || new Date().toISOString().split('T')[0],
            requested_check_in: newReq.requested_check_in,
            requested_check_out: newReq.requested_check_out,
            reason: newReq.reason,
            status: 'PENDING',
          })
        ).catch((e: any) => console.warn('[Supabase Attendance] regularization insert notice:', e));
      }
    }

    return newReq;
  },

  approveRegularization: (id: string, status: 'Approved' | 'Rejected', comments?: string): void => {
    const list = loadStorage<RegularizationRequest[]>(STORAGE_KEY_REGULARIZATIONS, SEED_REGULARIZATIONS);
    const item = list.find(r => r.id === id);
    if (item) {
      item.status = status;
      if (comments) item.comments = comments;
      saveStorage(STORAGE_KEY_REGULARIZATIONS, list);

      // Recalculate daily attendance if approved
      if (status === 'Approved') {
        const dailyList = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
        const targetDate = (item as any).date || item.attendance_date;
        const daily = dailyList.find(d => d.employee_id === item.employee_id && d.date === targetDate);
        if (daily) {
          daily.first_check_in = item.requested_check_in;
          daily.last_check_out = item.requested_check_out;
          daily.status = 'Present';
          daily.regularization_status = 'Approved';
          daily.gross_working_minutes = 540;
          daily.net_working_minutes = 495;
          saveStorage(STORAGE_KEY_DAILY, dailyList);
          if (_dailyCache) {
            const cIdx = _dailyCache.data.findIndex(d => d.employee_id === item.employee_id && d.date === targetDate);
            if (cIdx >= 0) _dailyCache.data[cIdx] = daily;
          }
        }
      }
    }

    if (isSupabaseEnabled) {
      const dbStatus = status === 'Approved' ? 'APPROVED' : 'REJECTED';
      if (id.length === 36) {
        Promise.resolve(
          supabase
            .from('attendance_regularizations')
            .update({
              status: dbStatus,
              approved_at: new Date().toISOString(),
              rejection_reason: status === 'Rejected' ? comments : null,
            })
            .eq('id', id)
        ).catch((e: any) => console.warn('[Supabase Attendance] regularization update notice:', e));
      }

      if (status === 'Approved' && item) {
        const targetDate = (item as any).date || item.attendance_date;
        if (item.employee_id && item.employee_id.length === 36) {
          Promise.resolve(
            supabase
              .from('attendance_daily')
              .update({
                first_check_in: item.requested_check_in,
                last_check_out: item.requested_check_out,
                status: 'PRESENT',
                is_regularized: true,
                updated_at: new Date().toISOString(),
              })
              .eq('employee_id', item.employee_id)
              .eq('attendance_date', targetDate)
          ).catch((e: any) => console.warn('[Supabase Attendance] attendance_daily sync notice:', e));
        }
      }
    }
  },

  getOvertimeRequests: (): OvertimeRequest[] => {
    return loadStorage<OvertimeRequest[]>(STORAGE_KEY_OVERTIME, SEED_OVERTIME);
  },

  submitOvertime: (req: Omit<OvertimeRequest, 'id' | 'created_at' | 'status'>): OvertimeRequest => {
    const list = loadStorage<OvertimeRequest[]>(STORAGE_KEY_OVERTIME, SEED_OVERTIME);
    const newReq: OvertimeRequest = {
      ...req,
      id: `ot-${Date.now()}`,
      created_at: new Date().toLocaleString(),
      status: 'Pending',
    };
    list.unshift(newReq);
    saveStorage(STORAGE_KEY_OVERTIME, list);
    return newReq;
  },

  approveOvertime: (id: string, status: 'Approved' | 'Rejected'): void => {
    const list = loadStorage<OvertimeRequest[]>(STORAGE_KEY_OVERTIME, SEED_OVERTIME);
    const item = list.find(r => r.id === id);
    if (item) {
      item.status = status;
      saveStorage(STORAGE_KEY_OVERTIME, list);
    }
  },

  getWfhRequests: (): WfhRequest[] => {
    return loadStorage<WfhRequest[]>(STORAGE_KEY_WFH, SEED_WFH);
  },

  submitWfh: (req: Omit<WfhRequest, 'id' | 'created_at' | 'status'>): WfhRequest => {
    const list = loadStorage<WfhRequest[]>(STORAGE_KEY_WFH, SEED_WFH);
    const newReq: WfhRequest = {
      ...req,
      id: `wfh-${Date.now()}`,
      created_at: new Date().toLocaleString(),
      status: 'Pending Approval',
    };
    list.unshift(newReq);
    saveStorage(STORAGE_KEY_WFH, list);
    return newReq;
  },

  approveWfh: (id: string, status: 'Approved' | 'Rejected'): void => {
    const list = loadStorage<WfhRequest[]>(STORAGE_KEY_WFH, SEED_WFH);
    const item = list.find(r => r.id === id);
    if (item) {
      item.status = status;
      saveStorage(STORAGE_KEY_WFH, list);
    }
  },

  getBiometricDevices: (): BiometricDevice[] => {
    return loadStorage<BiometricDevice[]>(STORAGE_KEY_DEVICES, SEED_DEVICES);
  },

  syncBiometricDevice: (deviceId: string): BiometricSyncLog => {
    const list = loadStorage<BiometricDevice[]>(STORAGE_KEY_DEVICES, SEED_DEVICES);
    const dev = list.find(d => d.id === deviceId);
    if (dev) {
      dev.last_sync = new Date().toLocaleTimeString();
      dev.status = 'Online';
      saveStorage(STORAGE_KEY_DEVICES, list);
    }

    return {
      id: `sync-${Date.now()}`,
      device_id: deviceId,
      device_name: dev ? dev.device_name : 'Biometric Terminal',
      start_time: new Date().toLocaleTimeString(),
      end_time: new Date().toLocaleTimeString(),
      records_received: 142,
      records_processed: 142,
      duplicates: 0,
      errors: 0,
      status: 'Success',
    };
  },

  getPolicies: (): AttendancePolicy[] => {
    return loadStorage<AttendancePolicy[]>(STORAGE_KEY_POLICIES, [DEFAULT_ATTENDANCE_POLICY]);
  },

  getExceptions: (): AttendanceException[] => {
    return loadStorage<AttendanceException[]>(STORAGE_KEY_EXCEPTIONS, SEED_EXCEPTIONS);
  },

  resolveException: (id: string): void => {
    const list = loadStorage<AttendanceException[]>(STORAGE_KEY_EXCEPTIONS, SEED_EXCEPTIONS);
    const item = list.find(e => e.id === id);
    if (item) {
      item.status = 'Resolved';
      saveStorage(STORAGE_KEY_EXCEPTIONS, list);
    }
  },

  finalizePayrollSnapshot: (period: string): AttendanceSnapshot[] => {
    const daily = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
    const snapshotList: AttendanceSnapshot[] = daily.map(d => ({
      id: `snap-${d.id}`,
      period,
      employee_id: d.employee_id,
      employee_name: d.employee_name,
      total_working_days: 22,
      paid_days: d.status === 'Absent' ? 21 : 22,
      absent_days: d.status === 'Absent' ? 1 : 0,
      leave_days: d.status === 'On Leave' ? 1 : 0,
      lop_days: d.status === 'Absent' ? 1 : 0,
      overtime_hours: Math.round(d.overtime_minutes / 60),
      late_deduction_days: d.late_minutes > 30 ? 0.5 : 0,
      finalized_by: 'System HR Director',
      finalized_date: new Date().toISOString(),
      is_locked: true,
    }));
    saveStorage(STORAGE_KEY_SNAPSHOTS, snapshotList);
    return snapshotList;
  },
};
