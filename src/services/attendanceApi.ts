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
import { DEFAULT_ATTENDANCE_POLICY, minutesToTimeString, processAttendanceStatus, timeStringToMinutes } from '../lib/attendance/attendanceEngine';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

const STORAGE_KEY_DAILY = 'workforceos_attendance_daily_v1';
const STORAGE_KEY_EVENTS = 'workforceos_attendance_events_v1';
const STORAGE_KEY_REGULARIZATIONS = 'workforceos_attendance_regularizations_v1';
const STORAGE_KEY_OVERTIME = 'workforceos_attendance_overtime_v1';
const STORAGE_KEY_WFH = 'workforceos_attendance_wfh_v1';
const STORAGE_KEY_DEVICES = 'workforceos_biometric_devices_v1';
const STORAGE_KEY_POLICIES = 'workforceos_attendance_policies_v1';
const STORAGE_KEY_SNAPSHOTS = 'workforceos_attendance_snapshots_v1';
const STORAGE_KEY_EXCEPTIONS = 'workforceos_attendance_exceptions_v1';

// Pure database initial state - 0 mock records
const SEED_DAILY: AttendanceDaily[] = [];
const SEED_DEVICES: BiometricDevice[] = [];
const SEED_REGULARIZATIONS: RegularizationRequest[] = [];
const SEED_OVERTIME: OvertimeRequest[] = [];
const SEED_WFH: WfhRequest[] = [];
const SEED_EXCEPTIONS: AttendanceException[] = [];

// LocalStorage helpers
function loadStorage<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return seed;
  }
}

function saveStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export const attendanceApi = {
  getDailyAttendance: (date?: string, department?: string, status?: string, search?: string): AttendanceDaily[] => {
    let list = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
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

  checkIn: (employeeId: string, employeeName: string, source: PunchSource = 'WEB', locationName: string = 'HQ Office Web Check-in'): AttendanceDaily => {
    const list = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
    const today = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const existingIdx = list.findIndex(e => e.employee_id === employeeId && e.date === today);
    const checkInMins = timeStringToMinutes(nowStr);

    const calculation = processAttendanceStatus(checkInMins, null);

    if (existingIdx >= 0) {
      const updated: AttendanceDaily = {
        ...list[existingIdx],
        status: 'Present',
        first_check_in: nowStr,
        source,
        updated_at: new Date().toISOString(),
      };
      list[existingIdx] = updated;
      saveStorage(STORAGE_KEY_DAILY, list);

      if (isSupabaseEnabled) {
        Promise.resolve(
          supabase
            .from('attendance_daily')
            .upsert({
              id: updated.id,
              organization_id: updated.organization_id || 'org-01',
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
        organization_id: 'org-01',
        company_id: 'cmp-01',
        date: today,
        shift_id: 'shift-gen',
        shift_name: 'General Shift (09:30 - 18:30)',
        expected_check_in: '09:30 AM',
        expected_check_out: '06:30 PM',
        status: 'Present',
        first_check_in: nowStr,
        gross_working_minutes: 0,
        total_break_minutes: 0,
        net_working_minutes: 0,
        late_minutes: calculation.lateMinutes,
        early_checkout_minutes: 0,
        overtime_minutes: 0,
        source,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.unshift(newItem);
      saveStorage(STORAGE_KEY_DAILY, list);

      if (isSupabaseEnabled) {
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

  checkOut: (employeeId: string): AttendanceDaily | null => {
    const list = loadStorage<AttendanceDaily[]>(STORAGE_KEY_DAILY, SEED_DAILY);
    const today = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const idx = list.findIndex(e => e.employee_id === employeeId && e.date === today);
    if (idx < 0) return null;

    const record = list[idx];
    const checkInMins = timeStringToMinutes(record.first_check_in);
    const checkOutMins = timeStringToMinutes(nowStr);

    const calculation = processAttendanceStatus(checkInMins, checkOutMins);

    const updated: AttendanceDaily = {
      ...record,
      last_check_out: nowStr,
      status: calculation.status,
      gross_working_minutes: calculation.grossMinutes,
      net_working_minutes: calculation.netMinutes,
      late_minutes: calculation.lateMinutes,
      early_checkout_minutes: calculation.earlyMinutes,
      overtime_minutes: calculation.overtimeMinutes,
      updated_at: new Date().toISOString(),
    };

    list[idx] = updated;
    saveStorage(STORAGE_KEY_DAILY, list);

    if (isSupabaseEnabled) {
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
            updated_at: updated.updated_at,
          })
          .eq('id', updated.id)
      ).catch((e: any) => console.warn('[Supabase Attendance] checkOut update failed:', e));
    }

    return updated;
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
        const daily = dailyList.find(d => d.employee_id === item.employee_id && d.date === item.attendance_date);
        if (daily) {
          daily.first_check_in = item.requested_check_in;
          daily.last_check_out = item.requested_check_out;
          daily.status = 'Present';
          daily.regularization_status = 'Approved';
          daily.gross_working_minutes = 540;
          daily.net_working_minutes = 495;
          saveStorage(STORAGE_KEY_DAILY, dailyList);
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
