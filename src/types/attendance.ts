export type AttendanceStatus =
  | 'Not Checked In'
  | 'Present'
  | 'Late'
  | 'On Leave'
  | 'WFH'
  | 'Half Day'
  | 'Early Checkout'
  | 'Checked Out'
  | 'Missing Punch'
  | 'Absent'
  | 'Holiday'
  | 'Weekly Off'
  | 'Overtime';

export type EventType = 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END' | 'OTHER';

export type PunchSource = 'BIOMETRIC' | 'GPS' | 'WEB' | 'MOBILE' | 'MANUAL' | 'API' | 'IMPORT' | 'SYSTEM' | 'HYBRID';

export type RegularizationStatus = 'Draft' | 'Submitted' | 'Pending Manager' | 'Pending HR' | 'Approved' | 'Rejected' | 'Cancelled';

export type OvertimeStatus = 'Pending' | 'Approved' | 'Rejected' | 'Compensated';

export type WfhStatus = 'Draft' | 'Submitted' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Cancelled';

export type ShiftType = 'Fixed' | 'Flexible' | 'Rotational' | 'Night' | 'Split' | 'Custom';

export interface AttendanceEvent {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string or HH:mm:ss
  event_type: EventType;
  source: PunchSource;
  device_id?: string;
  device_name?: string;
  ip_address?: string;
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
  location_name?: string;
  verification_method?: 'FP' | 'FACE' | 'RFID' | 'GPS' | 'WEB_CLICK' | 'MANUAL';
  created_at: string;
}

export interface AttendanceDaily {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  designation: string;
  avatar_url?: string;
  organization_id: string;
  company_id: string;
  branch_id?: string;
  department_id?: string;
  location_id?: string;
  date: string; // YYYY-MM-DD
  shift_id: string;
  shift_name: string;
  expected_check_in: string; // HH:mm
  expected_check_out: string; // HH:mm
  status: AttendanceStatus;
  first_check_in?: string; // HH:mm
  last_check_out?: string; // HH:mm
  gross_working_minutes: number;
  total_break_minutes: number;
  net_working_minutes: number;
  late_minutes: number;
  early_checkout_minutes: number;
  overtime_minutes: number;
  regularization_status?: RegularizationStatus;
  source: PunchSource;
  check_in_source?: PunchSource;
  check_out_source?: PunchSource;
  is_locked?: boolean;
  lock_period?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendancePolicy {
  id: string;
  name: string;
  description: string;
  required_hours_per_day: number;
  late_grace_minutes: number;
  early_checkout_grace_minutes: number;
  half_day_hours_threshold: number;
  overtime_min_minutes: number;
  max_wfh_days_per_month: number;
  geofence_enabled: boolean;
  allowed_radius_meters: number;
  office_latitude: number;
  office_longitude: number;
  night_shift_enabled: boolean;
  night_shift_cutoff_hour: number; // e.g. 6 AM
  assignment_type: 'Company' | 'Branch' | 'Department' | 'Employee';
  assigned_to: string;
}

export interface RegularizationRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  attendance_date: string;
  current_status: AttendanceStatus;
  requested_check_in: string;
  requested_check_out: string;
  reason: string;
  supporting_doc_url?: string;
  submitted_at: string;
  approver_id?: string;
  approver_name?: string;
  status: RegularizationStatus;
  comments?: string;
}

export interface OvertimeRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  start_time: string;
  end_time: string;
  estimated_hours: number;
  actual_hours?: number;
  reason: string;
  manager_name: string;
  status: OvertimeStatus;
  compensation_type: 'Paid Overtime' | 'Comp Off' | 'Unpaid';
  created_at: string;
}

export interface WfhRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  from_date: string;
  to_date: string;
  total_days: number;
  reason: string;
  location: string;
  work_type: 'Remote' | 'Hybrid' | 'Travel';
  manager_name: string;
  status: WfhStatus;
  comments?: string;
  created_at: string;
}

export interface BiometricDevice {
  id: string;
  device_name: string;
  device_type: 'Fingerprint' | 'Facial Recognition' | 'RFID Card' | 'Palm Vein';
  vendor: 'ZKTeco' | 'Matrix COSEC' | 'Suprema' | 'Hikvision' | 'Custom API';
  model: string;
  serial_number: string;
  ip_address: string;
  port: number;
  location: string;
  branch: string;
  status: 'Online' | 'Offline' | 'Syncing' | 'Error';
  last_sync: string;
  sync_frequency_mins: number;
}

export interface BiometricSyncLog {
  id: string;
  device_id: string;
  device_name: string;
  start_time: string;
  end_time: string;
  records_received: number;
  records_processed: number;
  duplicates: number;
  errors: number;
  status: 'Success' | 'Partial' | 'Failed';
}

export interface AttendanceSnapshot {
  id: string;
  period: string; // e.g. "2026-08"
  employee_id: string;
  employee_name: string;
  total_working_days: number;
  paid_days: number;
  absent_days: number;
  leave_days: number;
  lop_days: number;
  overtime_hours: number;
  late_deduction_days: number;
  finalized_by: string;
  finalized_date: string;
  is_locked: boolean;
}

export interface AttendanceException {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  type: 'Missing Punch' | 'Late Check-in' | 'Early Checkout' | 'Unscheduled Attendance' | 'GPS Failure' | 'Biometric Failure';
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Under Review' | 'Resolved' | 'Waived';
  created_at: string;
}
