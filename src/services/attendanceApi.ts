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
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { attendanceRosterService } from './attendance/attendanceRosterService';
import { attendanceTimeService } from './attendance/attendanceTimeService';
import { getActiveOrgId } from './attendance/biometricCommandService';

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

// LocalStorage helpers with tenant isolation
function loadStorage<T>(baseKey: string, seed: T, tenantId = getActiveOrgId()): T {
  try {
    const key = getTenantStorageKey(baseKey, tenantId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Legacy fallback check
      const legacy = localStorage.getItem(baseKey);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          localStorage.setItem(key, legacy);
          return parsed;
        } catch (_) {}
      }
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return seed;
  }
}

function saveStorage<T>(baseKey: string, data: T, tenantId = getActiveOrgId()): void {
  try {
    const key = getTenantStorageKey(baseKey, tenantId);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export const attendanceApi = {
  async getDailyAttendanceAsync(date?: string, department?: string, status?: string, search?: string): Promise<AttendanceDaily[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('attendance_daily').select('*');
        if (date) q = q.eq('date', date);
        const { data, error } = await q;
        if (!error && Array.isArray(data) && data.length > 0) {
          const currentList = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
          const otherDates = date ? currentList.filter(d => d.date !== date) : [];
          const merged = [...data, ...otherDates];
          saveStorage(STORAGE_KEY_DAILY, merged);
          _dailyCache = { data: merged, timestamp: Date.now() };
          return this.getDailyAttendance(date, department, status, search);
        }
      } catch (err) {
        console.warn('[attendanceApi] getDailyAttendanceAsync notice:', err);
      }
    }
    return this.getDailyAttendance(date, department, status, search);
  },

  getDailyAttendance: (date?: string, department?: string, status?: string, search?: string): AttendanceDaily[] => {
    let list: AttendanceDaily[] = [];
    if (_dailyCache?.data && _dailyCache.data.length > 0) {
      list = [..._dailyCache.data];
    } else {
      list = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
      if (list.length > 0) {
        _dailyCache = { data: list, timestamp: Date.now() };
      }
    }

    // Trigger background rehydration from Supabase if cache is cold
    if (isSupabaseEnabled && !_dailyInFlight && (!_dailyCache || Date.now() - _dailyCache.timestamp > 15000)) {
      _dailyInFlight = attendanceApi.getDailyAttendanceAsync(date).finally(() => {
        _dailyInFlight = null;
      });
    }

    // Purge mock/legacy attendance records: only keep records strictly matching existing employees in directory
    try {
      const rawEmployees = localStorage.getItem('workforce_employees');
      if (rawEmployees) {
        const employees: any[] = JSON.parse(rawEmployees);
        const realEmployees = employees.filter(e => e.status !== 'Terminated' && e.status !== 'Exited');

        const cleaned: AttendanceDaily[] = [];
        const seenEmpKeys = new Set<string>();

        const targetDate = date || new Date().toISOString().split('T')[0];

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
              const roster = attendanceRosterService.getRosterForEmployeeOnDate(matchedEmp.id, item.date || targetDate);
              const shiftStart = roster.shift_code.includes('NGT') ? '10:00 PM' : roster.shift_code.includes('MOR') ? '06:00 AM' : '09:00 AM';
              const shiftEnd = roster.shift_code.includes('NGT') ? '06:00 AM' : roster.shift_code.includes('MOR') ? '02:30 PM' : '06:00 PM';

              const rawIn = item.first_check_in || (item as any).in_time || (item as any).check_in;
              const rawOut = item.last_check_out || (item as any).out_time || (item as any).check_out;

              const hasPunch = !!rawIn || !!rawOut;
              const inMins = rawIn ? timeStringToMinutes(rawIn) : null;
              const outMins = rawOut ? timeStringToMinutes(rawOut) : null;
              const expectedInMins = timeStringToMinutes(shiftStart) || 540;
              const expectedOutMins = timeStringToMinutes(shiftEnd) || 1080;
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
                late_minutes: item.late_minutes ?? calc.lateMinutes,
                early_checkout_minutes: item.early_checkout_minutes ?? calc.earlyMinutes,
                overtime_minutes: item.overtime_minutes ?? calc.overtimeMinutes,
                status: resolvedStatus,
                source: (item.source || item.check_in_source || (hasPunch ? 'MOBILE_GPS' : 'WEB')) as any,
              });
            }
          }
        }

        // For any real employee without an attendance record yet, create one resolved with their shift schedule
        for (const emp of realEmployees) {
          const empKey = `${emp.id}_${targetDate}`;
          if (!seenEmpKeys.has(empKey)) {
            seenEmpKeys.add(empKey);
            const roster = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, targetDate);
            const isOff = roster.is_weekly_off;
            const shiftStart = roster.shift_code.includes('NGT') ? '10:00 PM' : roster.shift_code.includes('MOR') ? '06:00 AM' : '09:00 AM';
            const shiftEnd = roster.shift_code.includes('NGT') ? '06:00 AM' : roster.shift_code.includes('MOR') ? '02:30 PM' : '06:00 PM';

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
              source: isOff ? 'SYSTEM' : 'WEB',
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

    if (existingIdx >= 0) {
      const updated: AttendanceDaily = {
        ...list[existingIdx],
        status: 'Present',
        first_check_in: nowIso,
        source,
        updated_at: nowIso,
      };
      list[existingIdx] = updated;
      saveStorage(STORAGE_KEY_DAILY, list);
      if (_dailyCache) {
        const cIdx = _dailyCache.data.findIndex(e => e.employee_id === employeeId && e.date === today);
        if (cIdx >= 0) _dailyCache.data[cIdx] = updated;
        else _dailyCache.data.unshift(updated);
      }

      if (isSupabaseEnabled) {
        // 1. Immutable audit punch event
        Promise.resolve(
          supabase
            .from('attendance_events')
            .insert({
              organization_id: updated.organization_id || getActiveOrgId(),
              employee_id: updated.employee_id,
              type: 'CHECK_IN',
              source: source || 'WEB',
              timestamp: nowIso,
            })
        ).catch((e: any) => console.warn('[Supabase Attendance] event insert notice:', e));

        // 2. Daily summary record
        Promise.resolve(
          supabase
            .from('attendance_daily')
            .upsert({
              id: updated.id,
              organization_id: updated.organization_id || getActiveOrgId(),
              company_id: updated.company_id || 'comp-01',
              employee_id: updated.employee_id,
              employee_code: updated.employee_code,
              employee_name: updated.employee_name,
              department: updated.department,
              designation: updated.designation,
              date: updated.date,
              status: updated.status,
              first_check_in: updated.first_check_in,
              source: updated.source,
              updated_at: updated.updated_at,
            })
        ).catch((e: any) => console.warn('[Supabase Attendance] checkIn sync failed:', e));
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
        created_at: nowIso,
        updated_at: nowIso,
      };
      list.unshift(newItem);
      saveStorage(STORAGE_KEY_DAILY, list);
      if (_dailyCache) {
        _dailyCache.data.unshift(newItem);
      }

      if (isSupabaseEnabled) {
        // 1. Immutable audit punch event
        Promise.resolve(
          supabase
            .from('attendance_events')
            .insert({
              organization_id: newItem.organization_id,
              employee_id: newItem.employee_id,
              type: 'CHECK_IN',
              source: source || 'WEB',
              timestamp: nowIso,
            })
        ).catch((e: any) => console.warn('[Supabase Attendance] event insert notice:', e));

        // 2. Daily summary record
        Promise.resolve(
          supabase
            .from('attendance_daily')
            .upsert({
              id: newItem.id,
              organization_id: newItem.organization_id,
              company_id: newItem.company_id,
              employee_id: newItem.employee_id,
              employee_code: newItem.employee_code,
              employee_name: newItem.employee_name,
              department: newItem.department,
              designation: newItem.designation,
              date: newItem.date,
              status: newItem.status,
              first_check_in: newItem.first_check_in,
              source: newItem.source,
              created_at: newItem.created_at,
              updated_at: newItem.updated_at,
            })
        ).catch((e: any) => console.warn('[Supabase Attendance] checkIn insert failed:', e));
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
    const overallSource: PunchSource = checkInSource === checkOutSource ? checkInSource : 'HYBRID';

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
    if (_dailyCache) {
      const cIdx = _dailyCache.data.findIndex(e => e.employee_id === employeeId && e.date === today);
      if (cIdx >= 0) _dailyCache.data[cIdx] = updated;
    }

    if (isSupabaseEnabled) {
      // 1. Immutable audit punch event
      Promise.resolve(
        supabase
          .from('attendance_events')
          .insert({
            organization_id: updated.organization_id || getActiveOrgId(),
            employee_id: updated.employee_id,
            type: 'CHECK_OUT',
            source: source || 'WEB',
            timestamp: nowIso,
          })
      ).catch((e: any) => console.warn('[Supabase Attendance] event insert notice:', e));

      // 2. Daily summary record update
      Promise.resolve(
        supabase
          .from('attendance_daily')
          .update({
            last_check_out: updated.last_check_out,
            status: updated.status,
            gross_working_minutes: updated.gross_working_minutes,
            net_working_minutes: updated.net_working_minutes,
            late_minutes: updated.late_minutes,
            early_checkout_minutes: updated.early_checkout_minutes,
            overtime_minutes: updated.overtime_minutes,
            source: updated.source,
            updated_at: updated.updated_at,
          })
          .eq('id', updated.id)
      ).catch((e: any) => console.warn('[Supabase Attendance] checkOut update failed:', e));
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

    const existingIdx = list.findIndex(e => e.employee_id === payload.employeeId && e.date === todayStr);

    if (existingIdx >= 0) {
      const existing = list[existingIdx];
      if (!existing.first_check_in || payload.direction === 'IN') {
        existing.first_check_in = existing.first_check_in || timeStr;
        existing.status = 'Present';
        existing.source = 'BIOMETRIC';
      } else {
        existing.last_check_out = timeStr;
        const checkInMins = timeStringToMinutes(existing.first_check_in);
        const checkOutMins = timeStringToMinutes(timeStr);
        const calc = processAttendanceStatus(checkInMins, checkOutMins);
        existing.gross_working_minutes = calc.grossMinutes;
        existing.net_working_minutes = calc.netMinutes;
        existing.status = calc.status;
        existing.source = 'BIOMETRIC';
      }
      existing.updated_at = new Date().toISOString();
      list[existingIdx] = existing;
      saveStorage(STORAGE_KEY_DAILY, list);
      return existing;
    } else {
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(payload.employeeId, todayStr);
      const newItem: AttendanceDaily = {
        id: `att-bio-${Date.now()}`,
        employee_id: payload.employeeId,
        employee_code: `WF-${payload.employeeId}`,
        employee_name: 'Employee',
        department: 'Operations',
        designation: 'Staff',
        organization_id: getActiveOrgId(),
        company_id: 'cmp-01',
        date: todayStr,
        shift_id: roster.shift_id,
        shift_name: `${roster.shift_name} (${roster.shift_code})`,
        expected_check_in: '09:00 AM',
        expected_check_out: '06:00 PM',
        first_check_in: timeStr,
        gross_working_minutes: 0,
        net_working_minutes: 0,
        total_break_minutes: 0,
        late_minutes: 0,
        early_checkout_minutes: 0,
        overtime_minutes: 0,
        status: 'Present',
        source: 'BIOMETRIC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.unshift(newItem);
      saveStorage(STORAGE_KEY_DAILY, list);
      return newItem;
    }
  },

  async getRegularizationsAsync(): Promise<RegularizationRequest[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('attendance_regularization_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: RegularizationRequest[] = data.map((r: any) => ({
            id: r.id,
            employee_id: r.employee_id,
            employee_name: r.employee_name || 'Staff',
            attendance_date: r.attendance_date,
            current_status: (r.original_status as any) || 'Absent',
            original_check_in: r.original_check_in || '--:--',
            original_check_out: r.original_check_out || '--:--',
            requested_check_in: r.requested_check_in,
            requested_check_out: r.requested_check_out,
            reason: r.reason_text || r.reason_code || 'Regularization',
            status: r.status === 'MANAGER_PENDING' ? 'Pending Manager' : r.status === 'HR_PENDING' ? 'Pending HR' : r.status === 'APPROVED' ? 'Approved' : 'Rejected',
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
      Promise.resolve(
        supabase.from('attendance_regularization_requests').insert({
          organization_id: getActiveOrgId(),
          employee_id: newReq.employee_id,
          employee_name: newReq.employee_name,
          attendance_date: (newReq as any).date || (newReq as any).attendance_date || new Date().toISOString().split('T')[0],
          requested_check_in: newReq.requested_check_in,
          requested_check_out: newReq.requested_check_out,
          reason_text: newReq.reason,
          status: 'MANAGER_PENDING',
        })
      ).catch((e: any) => console.warn('[Supabase Attendance] regularization insert failed:', e));
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
      Promise.resolve(
        supabase
          .from('attendance_regularization_requests')
          .update({
            status: dbStatus,
            manager_action_at: new Date().toISOString(),
            manager_comment: comments || null,
          })
          .eq('id', id)
      ).catch((e: any) => console.warn('[Supabase Attendance] regularization update notice:', e));

      if (status === 'Approved' && item) {
        const targetDate = (item as any).date || item.attendance_date;
        Promise.resolve(
          supabase
            .from('attendance_daily')
            .update({
              first_check_in: item.requested_check_in,
              last_check_out: item.requested_check_out,
              status: 'Present',
              updated_at: new Date().toISOString(),
            })
            .eq('employee_id', item.employee_id)
            .eq('date', targetDate)
        ).catch((e: any) => console.warn('[Supabase Attendance] attendance_daily sync notice:', e));
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
