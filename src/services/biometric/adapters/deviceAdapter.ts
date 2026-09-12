// src/services/biometric/adapters/deviceAdapter.ts
// ============================================================================
// Joy PeopleHR — Universal Biometric Device Adapter Interface
// Hardware Protocol Abstraction for Multi-Vendor Biometric Integration
// ============================================================================

export type BiometricVendor =
  | 'ZKTeco'
  | 'eSSL'
  | 'Mantra'
  | 'Matrix'
  | 'Suprema'
  | 'Hikvision'
  | 'Generic';

export type CommunicationMode =
  | 'TCP_IP'
  | 'HTTP_REST'
  | 'HTTPS_REST'
  | 'PUSH_ADMS'
  | 'EPUSH_SERVER'
  | 'VENDOR_SDK'
  | 'GENERIC_ADAPTER';

export type HealthStatusLevel = 'HEALTHY' | 'DELAYED' | 'WARNING' | 'OFFLINE' | 'AUTH_FAILED';

export interface AdapterCapabilities {
  supports_tcp: boolean;
  supports_http: boolean;
  supports_https: boolean;
  supports_push: boolean;
  supports_sdk: boolean;
  supports_user_sync: boolean;
  supports_attendance_pull: boolean;
  supports_attendance_push: boolean;
  supports_device_time: boolean;
  supports_device_health: boolean;
  supports_remote_restart: boolean;
  supports_user_enrollment: boolean;
  default_port: number;
  recommended_mode: CommunicationMode;
}

export interface DiscoveredDeviceCandidate {
  ip_address: string;
  mac_address?: string;
  port: number;
  vendor: BiometricVendor;
  model: string;
  serial_number?: string;
  firmware_version?: string;
  protocol: CommunicationMode;
  reachability: 'REACHABLE' | 'AUTH_REQUIRED' | 'UNREACHABLE';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  latency_ms: number;
  capabilities: AdapterCapabilities;
  fingerprint_raw?: Record<string, any>;
}

export interface DeviceConnectionConfig {
  ip_address: string;
  port: number;
  protocol: CommunicationMode;
  password?: string;
  comm_key?: number;
  timeout_ms?: number;
  use_tls?: boolean;
}

export interface ConnectionResult {
  success: boolean;
  latency_ms: number;
  message: string;
  device_info?: DeviceInfo;
  error_code?: string;
}

export interface DeviceCredentials {
  password?: string;
  comm_key?: number;
  api_key?: string;
}

export interface AuthResult {
  authenticated: boolean;
  message: string;
  session_id?: string | number;
}

export interface DeviceInfo {
  vendor: BiometricVendor;
  model: string;
  serial_number: string;
  firmware_version: string;
  user_capacity: number;
  log_capacity: number;
  enrolled_users_count: number;
  fingerprint_count?: number;
  face_count?: number;
  card_count?: number;
  log_count: number;
  ip_address: string;
  mac_address?: string;
  device_time?: string;
}

export interface MachineUser {
  device_user_id: string; // PIN on hardware
  name: string;
  card_number?: string;
  privilege: 'USER' | 'ADMIN' | 'SUPERADMIN';
  password_enabled?: boolean;
  fingerprint_count?: number;
  face_enrolled?: boolean;
}

export interface UserSyncResult {
  total_users: number;
  pushed_users: number;
  failed_users: number;
  errors: Array<{ device_user_id: string; error: string }>;
}

export interface RawAttendanceLog {
  device_id: string;
  device_user_id: string; // PIN
  punch_time: string; // ISO format or device local time
  punch_type: 'CHECK_IN' | 'CHECK_OUT' | 'AUTO';
  verify_mode: 'FINGERPRINT' | 'FACE' | 'CARD' | 'PASSWORD' | 'UNKNOWN';
  work_code?: string;
  raw_payload?: Record<string, any>;
}

export interface PushSubscription {
  active: boolean;
  endpoint_url?: string;
  subscription_id: string;
  unsubscribe: () => Promise<void>;
}

export interface HealthTestResult {
  reachable: boolean;
  authenticated: boolean;
  latency_ms: number;
  packet_loss_percent: number;
  clock_drift_seconds: number;
  status: HealthStatusLevel;
  checks: {
    connector_running: boolean;
    local_network_available: boolean;
    device_reachable: boolean;
    device_authenticated: boolean;
    attendance_stream_active: boolean;
  };
  diagnostics: string[];
}

export interface DeviceHealthStatus {
  level: HealthStatusLevel;
  last_heartbeat: string;
  last_punch_at?: string;
  pending_queue_count: number;
  clock_drift_seconds: number;
  drift_classification: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface DeviceTimeInfo {
  device_time: string;
  server_time: string;
  drift_seconds: number;
  timezone: string;
  within_tolerance: boolean;
}

export interface TimeSyncResult {
  success: boolean;
  previous_drift_seconds: number;
  current_drift_seconds: number;
  synced_at: string;
  message: string;
}

export interface DiagnosticReport {
  timestamp: string;
  vendor: BiometricVendor;
  model: string;
  ip_address: string;
  port: number;
  protocol: CommunicationMode;
  connector_id: string;
  checks: Record<string, { ok: boolean; message: string; duration_ms: number }>;
  suggested_fixes: string[];
  raw_log_snippet?: string[];
}

/**
 * Universal Device Adapter Interface
 * Implemented by every biometric hardware driver (ZKTeco, eSSL, Mantra, Matrix, etc.)
 */
export interface DeviceAdapter {
  vendor: BiometricVendor;
  getCapabilities(model?: string): AdapterCapabilities;
  discover(subnetHint?: string): Promise<DiscoveredDeviceCandidate[]>;
  connect(config: DeviceConnectionConfig): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  authenticate(credentials: DeviceCredentials): Promise<AuthResult>;
  getDeviceInfo(): Promise<DeviceInfo>;
  getUsers(): Promise<MachineUser[]>;
  syncUsers(users: MachineUser[]): Promise<UserSyncResult>;
  getAttendanceLogs(sinceTimestamp?: string): Promise<RawAttendanceLog[]>;
  subscribeToPush(onEvent: (log: RawAttendanceLog) => void): Promise<PushSubscription>;
  testConnection(): Promise<HealthTestResult>;
  getDeviceHealth(): Promise<DeviceHealthStatus>;
  getDeviceTime(): Promise<DeviceTimeInfo>;
  syncDeviceTime(targetUtcTime?: string): Promise<TimeSyncResult>;
  clearLogs(): Promise<boolean>;
  diagnostics(): Promise<DiagnosticReport>;
}
