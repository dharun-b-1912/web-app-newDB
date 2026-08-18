// src/lib/biometric/deviceAdapterInterface.ts
// ============================================================================
// WorkForceOS — Universal Biometric Device Adapter Interface
// Pluggable Contract for ZKTeco, Mantra, eSSL, Suprema, Matrix, Hikvision
// ============================================================================

export interface DeviceConnectionConfig {
  deviceId: string;
  organizationId: string;
  branchId?: string;
  ipAddress: string;
  port: number;
  provider: 'ZKTeco' | 'Mantra' | 'eSSL' | 'Suprema' | 'Matrix COSEC' | 'Hikvision' | 'Custom API';
  protocol: 'TCP_SOCKET' | 'RD_SERVICE' | 'ADMS_PUSH' | 'REST_API' | 'WEBSOCKET';
  commKey?: number;
  timeoutMs?: number;
}

export interface DeviceCapabilities {
  supportsRealtimeEvents: boolean;
  supportsUserSync: boolean;
  supportsTemplatePush: boolean;
  supportsTimeSync: boolean;
  supportsRemoteDelete: boolean;
  supportsClearLogs: boolean;
  supportsReboot: boolean;
}

export interface NormalizedDeviceInfo {
  firmwareVersion: string;
  serialNumber: string;
  deviceName: string;
  macAddress: string;
  platform: string;
  userCount: number;
  fingerprintCount: number;
  faceCount: number;
  logCount: number;
  logCapacity: number;
}

export interface NormalizedBiometricUser {
  biometricPin: string;
  employeeCode?: string;
  name: string;
  cardNo?: string;
  privilege: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  enabled: boolean;
}

export interface NormalizedAttendanceLog {
  userPin: string;
  timestampIso: string;
  verifyMode: 'Fingerprint' | 'Face' | 'RFID Card' | 'Password' | 'Manual';
  inOutState: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_OUT' | 'BREAK_IN' | 'OVERTIME_IN' | 'OVERTIME_OUT' | 'AUTO';
  workCode?: number;
  rawEventId?: string;
}

export interface IDeviceAdapter {
  readonly config: DeviceConnectionConfig;

  // Lifecycle & Health
  connect(): Promise<{ success: boolean; latencyMs: number; message: string }>;
  disconnect(): Promise<void>;
  getStatus(): Promise<'Online' | 'Offline' | 'Degraded' | 'Unreachable'>;
  getDeviceInfo(): Promise<NormalizedDeviceInfo>;
  detectCapabilities(): DeviceCapabilities;

  // Clock & Sync
  syncTime(targetDate?: Date): Promise<{ success: boolean; syncedIso: string }>;

  // Attendance Capture & Event Bus
  pullAttendanceLogs(): Promise<NormalizedAttendanceLog[]>;
  clearAttendanceLogs(): Promise<{ success: boolean; count: number }>;
  subscribeEvents(onPunch: (log: NormalizedAttendanceLog) => void): Promise<() => void>;

  // User & Identity Provisioning
  getUsers(): Promise<NormalizedBiometricUser[]>;
  createUser(user: NormalizedBiometricUser): Promise<boolean>;
  updateUser(user: NormalizedBiometricUser): Promise<boolean>;
  deleteUser(biometricPin: string): Promise<boolean>;
}
