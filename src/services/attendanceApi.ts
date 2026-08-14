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

const STORAGE_KEY_DAILY = 'workforceos_attendance_daily_v1';
const STORAGE_KEY_EVENTS = 'workforceos_attendance_events_v1';
const STORAGE_KEY_REGULARIZATIONS = 'workforceos_attendance_regularizations_v1';
const STORAGE_KEY_OVERTIME = 'workforceos_attendance_overtime_v1';
const STORAGE_KEY_WFH = 'workforceos_attendance_wfh_v1';
const STORAGE_KEY_DEVICES = 'workforceos_biometric_devices_v1';
const STORAGE_KEY_POLICIES = 'workforceos_attendance_policies_v1';
const STORAGE_KEY_SNAPSHOTS = 'workforceos_attendance_snapshots_v1';
const STORAGE_KEY_EXCEPTIONS = 'workforceos_attendance_exceptions_v1';

// Seed Initial Data
const SEED_DAILY: AttendanceDaily[] = [
  {
    id: 'att-101',
    employee_id: 'emp-001',
    employee_name: 'Arun Kumar',
    employee_code: 'WF-1001',
    department: 'Engineering',
    designation: 'Staff Software Engineer',
    organization_id: 'org-01',
    company_id: 'cmp-01',
    date: '2026-08-12',
    shift_id: 'shift-gen',
    shift_name: 'General Shift (09:30 - 18:30)',
    expected_check_in: '09:30 AM',
    expected_check_out: '06:30 PM',
    status: 'Checked Out',
    first_check_in: '09:28 AM',
    last_check_out: '06:35 PM',
    gross_working_minutes: 547,
    total_break_minutes: 45,
    net_working_minutes: 502,
    late_minutes: 0,
    early_checkout_minutes: 0,
    overtime_minutes: 22,
    source: 'BIOMETRIC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'att-102',
    employee_id: 'emp-002',
    employee_name: 'Deepa Sharma',
    employee_code: 'WF-1002',
    department: 'People Operations',
    designation: 'HR Business Partner',
    organization_id: 'org-01',
    company_id: 'cmp-01',
    date: '2026-08-12',
    shift_id: 'shift-gen',
    shift_name: 'General Shift (09:30 - 18:30)',
    expected_check_in: '09:30 AM',
    expected_check_out: '06:30 PM',
    status: 'Late',
    first_check_in: '09:58 AM',
    last_check_out: '06:30 PM',
    gross_working_minutes: 512,
    total_break_minutes: 45,
    net_working_minutes: 467,
    late_minutes: 13,
    early_checkout_minutes: 0,
    overtime_minutes: 0,
    source: 'WEB',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'att-103',
    employee_id: 'emp-003',
    employee_name: 'Karthik Raja',
    employee_code: 'WF-1003',
    department: 'Finance & Accounts',
    designation: 'Senior Financial Analyst',
    organization_id: 'org-01',
    company_id: 'cmp-01',
    date: '2026-08-12',
    shift_id: 'shift-gen',
    shift_name: 'General Shift (09:30 - 18:30)',
    expected_check_in: '09:30 AM',
    expected_check_out: '06:30 PM',
    status: 'WFH',
    first_check_in: '09:25 AM',
    last_check_out: '06:30 PM',
    gross_working_minutes: 545,
    total_break_minutes: 45,
    net_working_minutes: 500,
    late_minutes: 0,
    early_checkout_minutes: 0,
    overtime_minutes: 20,
    source: 'GPS',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'att-104',
    employee_id: 'emp-004',
    employee_name: 'Sneha Patel',
    employee_code: 'WF-1004',
    department: 'Engineering',
    designation: 'Frontend Tech Lead',
    organization_id: 'org-01',
    company_id: 'cmp-01',
    date: '2026-08-12',
    shift_id: 'shift-gen',
    shift_name: 'General Shift (09:30 - 18:30)',
    expected_check_in: '09:30 AM',
    expected_check_out: '06:30 PM',
    status: 'On Leave',
    gross_working_minutes: 0,
    total_break_minutes: 0,
    net_working_minutes: 0,
    late_minutes: 0,
    early_checkout_minutes: 0,
    overtime_minutes: 0,
    source: 'MANUAL',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'att-105',
    employee_id: 'emp-005',
    employee_name: 'Vikramaditya Roy',
    employee_code: 'WF-1005',
    department: 'Product Strategy',
    designation: 'VP of Product',
    organization_id: 'org-01',
    company_id: 'cmp-01',
    date: '2026-08-12',
    shift_id: 'shift-night',
    shift_name: 'US Night Shift (22:00 - 06:00)',
    expected_check_in: '10:00 PM',
    expected_check_out: '06:00 AM',
    status: 'Present',
    first_check_in: '09:55 PM',
    gross_working_minutes: 480,
    total_break_minutes: 45,
    net_working_minutes: 435,
    late_minutes: 0,
    early_checkout_minutes: 0,
    overtime_minutes: 0,
    source: 'BIOMETRIC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'att-106',
    employee_id: 'emp-006',
    employee_name: 'Ananya Deshmukh',
    employee_code: 'WF-1006',
    department: 'Quality Assurance',
    designation: 'QA Lead Automation',
    organization_id: 'org-01',
    company_id: 'cmp-01',
    date: '2026-08-12',
    shift_id: 'shift-gen',
    shift_name: 'General Shift (09:30 - 18:30)',
    expected_check_in: '09:30 AM',
    expected_check_out: '06:30 PM',
    status: 'Missing Punch',
    first_check_in: '09:32 AM',
    gross_working_minutes: 0,
    total_break_minutes: 0,
    net_working_minutes: 0,
    late_minutes: 0,
    early_checkout_minutes: 0,
    overtime_minutes: 0,
    regularization_status: 'Pending Manager',
    source: 'BIOMETRIC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_DEVICES: BiometricDevice[] = [
  {
    id: 'bio-001',
    device_name: 'HQ Main Lobby Turnstile #1',
    device_type: 'Facial Recognition',
    vendor: 'ZKTeco',
    model: 'FaceDepot-7BL',
    serial_number: 'ZK-99827162',
    ip_address: '192.168.10.45',
    port: 4370,
    location: 'Bangalore Campus - Tower A',
    branch: 'Bengaluru HQ',
    status: 'Online',
    last_sync: new Date().toLocaleTimeString(),
    sync_frequency_mins: 5,
  },
  {
    id: 'bio-002',
    device_name: 'Tower B Floor 4 Server Entry',
    device_type: 'Fingerprint',
    vendor: 'Suprema',
    model: 'BioStation 2',
    serial_number: 'SUP-4410291',
    ip_address: '192.168.10.88',
    port: 51211,
    location: 'Bangalore Campus - Tower B',
    branch: 'Bengaluru HQ',
    status: 'Online',
    last_sync: new Date().toLocaleTimeString(),
    sync_frequency_mins: 2,
  },
  {
    id: 'bio-003',
    device_name: 'Mumbai Regional Office Main Entrance',
    device_type: 'RFID Card',
    vendor: 'Matrix COSEC',
    model: 'COSEC VEGA FAX',
    serial_number: 'MAT-1029384',
    ip_address: '10.200.4.12',
    port: 8000,
    location: 'BKC Financial Center',
    branch: 'Mumbai Branch',
    status: 'Online',
    last_sync: new Date().toLocaleTimeString(),
    sync_frequency_mins: 10,
  },
];

const SEED_REGULARIZATIONS: RegularizationRequest[] = [
  {
    id: 'reg-001',
    employee_id: 'emp-006',
    employee_name: 'Ananya Deshmukh',
    attendance_date: '2026-08-11',
    current_status: 'Missing Punch',
    requested_check_in: '09:30 AM',
    requested_check_out: '06:30 PM',
    reason: 'Biometric device near Gate 2 failed to record exit timestamp due to power glitch.',
    submitted_at: '2026-08-12 08:30 AM',
    status: 'Pending Manager',
    approver_name: 'Arun Kumar',
  },
  {
    id: 'reg-002',
    employee_id: 'emp-002',
    employee_name: 'Deepa Sharma',
    attendance_date: '2026-08-10',
    current_status: 'Late',
    requested_check_in: '09:30 AM',
    requested_check_out: '06:30 PM',
    reason: 'Official client transit meeting with Metro Rail Authorities in morning.',
    submitted_at: '2026-08-10 07:15 PM',
    status: 'Approved',
    approver_name: 'HR Director',
    comments: 'Approved per client meeting proof attachment.',
  },
];

const SEED_OVERTIME: OvertimeRequest[] = [
  {
    id: 'ot-001',
    employee_id: 'emp-001',
    employee_name: 'Arun Kumar',
    date: '2026-08-10',
    start_time: '06:30 PM',
    end_time: '09:30 PM',
    estimated_hours: 3,
    actual_hours: 3,
    reason: 'Critical production deployment for Core HR v2.4 upgrade.',
    manager_name: 'Vikramaditya Roy',
    status: 'Approved',
    compensation_type: 'Paid Overtime',
    created_at: '2026-08-10 09:40 PM',
  },
];

const SEED_WFH: WfhRequest[] = [
  {
    id: 'wfh-001',
    employee_id: 'emp-003',
    employee_name: 'Karthik Raja',
    from_date: '2026-08-12',
    to_date: '2026-08-14',
    total_days: 3,
    reason: 'Home plumbing repairs and broadband fiber optic installation.',
    location: 'Indiranagar Residence, Bengaluru',
    work_type: 'Remote',
    manager_name: 'Arun Kumar',
    status: 'Approved',
    created_at: '2026-08-11 04:00 PM',
  },
];

const SEED_EXCEPTIONS: AttendanceException[] = [
  {
    id: 'exc-001',
    employee_id: 'emp-006',
    employee_name: 'Ananya Deshmukh',
    date: '2026-08-12',
    type: 'Missing Punch',
    description: 'Check-In registered at 09:32 AM, but no Check-Out event registered before 08:00 PM.',
    severity: 'Medium',
    status: 'Open',
    created_at: '2026-08-12 08:00 PM',
  },
  {
    id: 'exc-002',
    employee_id: 'emp-002',
    employee_name: 'Deepa Sharma',
    date: '2026-08-12',
    type: 'Late Check-in',
    description: 'Arrival at 09:58 AM exceeds 15-minute grace period by 13 minutes.',
    severity: 'Low',
    status: 'Under Review',
    created_at: '2026-08-12 10:00 AM',
  },
];

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
