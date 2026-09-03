// src/services/biometric-saas/types/biometricV4.types.ts
// ============================================================================
// Joy PeopleHR — Biometric Architecture V4 Types
// Clock Drift, Multi-Stage EOD Lifecycle, Storage Tiering, Gateway Load Balancing,
// Network Partitioning, Event Storm Protection, 30-Day Soak Simulator
// ============================================================================

export type EodLifecycleStage =
  | 'OPEN'
  | 'PRELIMINARY'
  | 'RECONCILIATION_WINDOW'
  | 'FINALIZED'
  | 'PAYROLL_LOCKED';

export type StorageTier = 'HOT' | 'WARM' | 'ARCHIVE' | 'PURGED';

export interface ClockDriftRecord {
  deviceId: string;
  deviceTimestamp: string;
  gatewayReceivedAt: string;
  cloudReceivedAt: string;
  correctedEventTime: string;
  clockDriftSeconds: number;
  isDriftCritical: boolean;
}

export interface EodAttendanceSession {
  sessionId: string;
  tenantId: string;
  targetDate: string;
  stage: EodLifecycleStage;
  totalPunchesRecorded: number;
  latePunchesProcessed: number;
  preliminaryClosedAt?: string;
  reconciliationWindowClosesAt?: string;
  finalizedAt?: string;
  payrollLockedAt?: string;
  isPayrollLocked: boolean;
  auditTrail: Array<{
    action: string;
    timestamp: string;
    actor: string;
    details?: any;
  }>;
}

export interface GatewayClusterMetrics {
  gatewayId: string;
  hostname: string;
  locationId: string;
  activeDeviceLeases: number;
  maxCapacity: number;
  cpuUtilizationPercent: number;
  queueDepth: number;
  health: 'HEALTHY' | 'DEGRADED' | 'OVERLOADED' | 'OFFLINE';
}

export interface LogLifecycleArchivePolicy {
  tenantId: string;
  hotStorageDays: number;     // e.g. 90
  warmStorageDays: number;    // e.g. 365
  archiveRetentionDays: number; // e.g. 2555 (7 years)
  autoPurgeEnabled: boolean;
}

export interface StorageTierPartition {
  partitionId: string;
  tenantId: string;
  tier: StorageTier;
  startDate: string;
  endDate: string;
  recordCount: number;
  sizeBytes: number;
  isCompressed: boolean;
  archivedAt?: string;
}

export interface EventStormGuardState {
  deviceId: string;
  slidingWindowStartTime: number;
  punchCountInWindow: number;
  maxBurstLimit: number; // e.g. 5000 in 10 mins
  isThrottlingActive: boolean;
  quarantinedSpikeCount: number;
}
