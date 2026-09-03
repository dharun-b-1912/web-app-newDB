// ============================================================
// Joy PeopleHR — Multi-Tenant SaaS Biometric Backend Types
// ============================================================
// Authoritative type definitions for multi-tenant hardware management,
// universal protocol routing, edge agent tunneling, and punch ingestion.
// ============================================================

export type BiometricHardwareVendor =
  | 'ZKTECO'
  | 'ESSL'
  | 'MANTRA'
  | 'HIKVISION'
  | 'SUPREMA'
  | 'MATRIX_COSEC'
  | 'REALTIME'
  | 'ANVIZ';

export type BiometricIngressProtocol =
  | 'TCP_SOCKET_4370'
  | 'ADMS_CLOUD_PUSH'
  | 'HIKVISION_ISAPI'
  | 'MANTRA_RD_USB'
  | 'MATRIX_PUSH_API'
  | 'EDGE_REVERSE_WS';

export type BiometricVerificationMode =
  | 'FINGERPRINT'
  | 'FACIAL_RECOGNITION'
  | 'RFID_CARD'
  | 'IRIS'
  | 'PALM_VEIN'
  | 'PIN_PASSWORD'
  | 'MULTI_MODAL';

export type DeviceConnectivityStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'DEGRADED_LATENCY'
  | 'NO_POWER'
  | 'PORT_BLOCKED'
  | 'PENDING_PAIRING';

export interface DeviceCapabilities {
  face: boolean;
  fingerprint: boolean;
  card: boolean;
  password: boolean;
  iris: boolean;
  palm?: boolean;
}

export interface DeviceCapacity {
  users: number;
  fingerprints: number;
  faces: number;
  cards: number;
  attendance_records: number;
  attendance_photos?: number;
}

export interface DeviceAlgorithms {
  fingerprint?: string; // e.g. 'VX10.0'
  face?: string;        // e.g. 'VX3.5'
}

export interface BiometricDeviceDriver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getDeviceInfo(): Promise<{
    serialNumber: string;
    model: string;
    platform: string;
    firmwareVersion: string;
    macAddress: string;
    ipAddress: string;
  }>;
  getCapabilities(): Promise<DeviceCapabilities>;
  getCapacity(): Promise<DeviceCapacity>;
  getUsers(): Promise<MultiTenantBiometricUser[]>;
  createUser(user: MultiTenantBiometricUser): Promise<void>;
  updateUser(user: MultiTenantBiometricUser): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  getAttendanceLogs(options?: {
    cursor?: string;
    since?: string;
    limit?: number;
  }): Promise<TenantBiometricPunchEvent[]>;
  getDeviceStatus(): Promise<{
    status: DeviceConnectivityStatus;
    latencyMs: number;
    userCount: number;
    faceCount: number;
    fingerprintCount: number;
    logCount: number;
  }>;
}

export interface MultiTenantBiometricDevice {
  deviceId: string;
  organizationId: string; // Tenant ID
  companyId: string;
  branchId: string;
  workLocationId?: string;
  deviceName: string;
  vendor: BiometricHardwareVendor;
  model: string;
  serialNumber: string;
  macAddress: string;
  ipAddress: string;
  port: number;
  protocol: BiometricIngressProtocol;
  pairingKey: string;
  deviceSecretHash: string;
  firmwareVersion: string;
  status: DeviceConnectivityStatus;
  lastHeartbeatAt: string;
  lastPunchReceivedAt?: string;
  registeredUsersCount: number;
  maxUserCapacity: number;
  logCount: number;
  maxLogCapacity: number;
  clockDriftSeconds: number;
  directionMode: 'IN_ONLY' | 'OUT_ONLY' | 'AUTO_BI_DIRECTIONAL';
  edgeAgentId?: string;
  relayAccessEnabled: boolean;
  tamperAlarmArmed: boolean;
  capabilities?: DeviceCapabilities;
  capacity?: DeviceCapacity;
  algorithms?: DeviceAlgorithms;
  createdAt: string;
}

export interface TenantBiometricPunchEvent {
  punchId: string;
  organizationId: string;
  companyId: string;
  branchId: string;
  deviceId: string;
  deviceSerialNumber: string;
  biometricUserPin: string;
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
  punchTimestamp: string; // ISO 8601
  receivedAt: string;     // Ingress timestamp
  verificationMode: BiometricVerificationMode;
  punchDirection: 'IN' | 'OUT' | 'AUTO';
  sourceProtocol: BiometricIngressProtocol;
  dedupHash: string;      // SHA-256 of (orgId + deviceSerial + pin + punchTimestamp)
  isOfflineBuffer: boolean;
  status: 'PROCESSED' | 'DEDUPLICATED' | 'UNRESOLVED_USER' | 'QUARANTINED';
  accessGranted: boolean;
  relayPulseDurationMs?: number;
}

export interface MultiTenantBiometricUser {
  userId: string;
  organizationId: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  biometricPin: string; // Hardware machine numeric user ID
  cardNumber?: string;
  privilege: 'STANDARD_USER' | 'ENROLLER' | 'DEVICE_ADMIN';
  enrolledModes: {
    fingerprintCount: number;
    hasFaceEnrolled: boolean;
    hasPalmEnrolled: boolean;
    hasCardEnrolled: boolean;
  };
  assignedDeviceIds: string[];
  syncStatus: 'SYNCED' | 'PENDING_PUSH' | 'SYNC_FAILED' | 'PENDING_DELETION';
  lastSyncedAt?: string;
}

export interface EncryptedBiometricTemplate {
  templateId: string;
  organizationId: string;
  employeeId: string;
  deviceId?: string;
  biometricPin: string;
  modality?: 'FINGERPRINT' | 'FACE' | 'IRIS' | string;
  mode?: BiometricVerificationMode;
  format?: 'ISO_19794_2' | 'ANSI_378' | 'PROPRIETARY_V10';
  fingerIndex?: number;
  encryptedDataEnvelope?: string;
  encryptedTemplateData?: string; // AES-256-GCM cipher payload
  encryptionKeyVersion?: string;
  sha256Seal?: string;
  iv?: string;
  authTag?: string;
  algorithmVersion?: string;
  checksumSha256?: string;
  createdAt: string;
}

export interface EdgeAgentTunnelSession {
  agentId: string;
  organizationId: string;
  branchId: string;
  agentVersion: string;
  platform: 'WINDOWS' | 'LINUX' | 'RASPBERRY_PI' | 'DOCKER';
  localIp: string;
  publicIp: string;
  connectedDevicesCount: number;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED';
  websocketSessionId: string;
  lastPingAt: string;
  unflushedBufferCount: number;
}

export interface BiometricEdgeAgentState {
  agentId: string;
  organizationId: string;
  companyId: string;
  branchId: string;
  agentHostname: string;
  localIpAddress: string;
  version: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  connectedDeviceCount: number;
  totalDevicesMonitored: number;
  offlineBufferQueueSize: number;
  lastHeartbeat: string;
  pairedAt: string;
}
