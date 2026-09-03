// src/services/biometric-saas/types/biometricV3.types.ts
// ============================================================================
// Joy PeopleHR — Biometric Architecture V3 Types
// Multi-Tenant Isolation, Gateway Clustering, Device Leases, Circuit Breakers,
// Emergency Muster Ledger, Command Queue & Dead Letter Queue (DLQ)
// ============================================================================

export type CloudCircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type CloudHealthStatus = 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'RECOVERING';

export type GatewayRole = 'PRIMARY' | 'SECONDARY_STANDBY' | 'STANDALONE';

export type CommandQueueStatus = 'QUEUED' | 'ASSIGNED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'DEAD_LETTER';

export type PresenceStatus = 'PRESENT' | 'OUTSIDE' | 'UNKNOWN' | 'EVACUATED' | 'MISSING';

// 1. Level 1 Tenant Context (Authenticated Claims)
export interface TenantContext {
  tenantId: string;
  organizationId: string;
  locationId?: string;
  branchId?: string;
  userId: string;
  role: string;
}

// 2. Gateway Node in Cluster
export interface GatewayNode {
  gatewayId: string;
  tenantId: string;
  organizationId: string;
  locationId: string;
  clusterGroupId: string;
  role: GatewayRole;
  hostname: string;
  localIp: string;
  status: 'ONLINE' | 'STANDBY' | 'OFFLINE';
  lastHeartbeatAt: string;
  version: string;
  activeLeasesCount: number;
}

// 3. Distributed Device Lease (Leader Election)
export interface DeviceGatewayLease {
  deviceId: string;
  deviceSerial: string;
  tenantId: string;
  locationId: string;
  gatewayId: string;
  leaseToken: string;
  leaseAcquiredAt: string;
  leaseExpiresAt: string;
  heartbeatAt: string;
  isLocked: boolean;
}

// 4. Device Sync Cursor
export interface DeviceSyncCursor {
  deviceId: string;
  deviceSerial: string;
  tenantId: string;
  lastEventTimestamp: string;
  lastEventHash: string;
  lastSyncAt: string;
  totalPunchesReconciled: number;
}

// 5. Local SQLite Event Journal Entry
export interface GatewayLocalJournalEntry {
  id: string;
  tenantId: string;
  organizationId: string;
  locationId: string;
  gatewayId: string;
  deviceId: string;
  deviceSerial: string;
  employeeMachineId: string;
  eventTime: string;
  verificationType: string;
  eventType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_OUT' | 'BREAK_IN' | 'AUTO';
  rawPayload: any;
  eventHash: string;
  syncStatus: 'PENDING' | 'UPLOADING' | 'ACKNOWLEDGED' | 'SYNCED' | 'FAILED_RETRY';
  retryCount: number;
  createdAt: string;
  syncedAt?: string;
  error?: string;
}

// 6. Emergency Muster Ledger (Last-Known Presence)
export interface EmployeePresenceState {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  tenantId: string;
  locationId: string;
  lastEvent: 'IN' | 'OUT';
  lastEventTime: string;
  deviceId: string;
  deviceSerial: string;
  status: PresenceStatus;
  department?: string;
  emergencyContactPhone?: string;
  lastSeenLocationDescription?: string;
}

export interface EmergencyMusterReport {
  musterId: string;
  tenantId: string;
  locationId: string;
  triggeredAt: string;
  totalHeadcount: number;
  safeCount: number;
  insideCount: number;
  missingCount: number;
  activeLedgerSnapshot: EmployeePresenceState[];
  isCloudIndependent: boolean;
}

// 7. Device Command Queue & Dead Letter Queue (DLQ)
export interface DeviceCommandRecord {
  commandId: string;
  tenantId: string;
  locationId: string;
  deviceId: string;
  deviceSerial: string;
  type: 'CREATE_USER' | 'DELETE_USER' | 'UPDATE_USER' | 'PUSH_FACE_TEMPLATE' | 'PUSH_FINGERPRINT' | 'CLEAR_ADMIN' | 'REBOOT_DEVICE' | 'WIPE_LOGS';
  payload: any;
  status: CommandQueueStatus;
  retryCount: number;
  maxRetries: number;
  queuedAt: string;
  assignedGatewayId?: string;
  processedAt?: string;
  resultPayload?: any;
  deadLetterReason?: string;
}

// 8. Controlled Batch Cloud Sync Config & Circuit Breaker Metrics
export interface CloudSyncEngineState {
  circuitState: CloudCircuitState;
  healthStatus: CloudHealthStatus;
  consecutiveFailures: number;
  failureThreshold: number;
  lastFailureAt?: string;
  lastSuccessAt?: string;
  batchSize: number;
  maxConcurrency: number;
  halfOpenTestProbeActive: boolean;
}
