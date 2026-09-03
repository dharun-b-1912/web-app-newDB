// src/services/biometric-saas/types/biometricV5.types.ts
// ============================================================================
// Joy PeopleHR — Biometric Architecture V5 Types
// Universal Device Capabilities, Dynamic Enrollment Engine, Observability & Safety
// ============================================================================

import { CanaryReleasePhase, RiskLevel, CommandApprovalStatus } from './biometricUniversal.types';

export * from './biometricUniversal.types';

// Gate 19: End-to-End Trace Step
export interface BiometricTraceStep {
  traceId: string;
  stage: 'DEVICE_INGRESS' | 'GATEWAY_SQLITE_WAL' | 'CLOUD_INGRESS' | 'NORMALIZATION' | 'ATTENDANCE_CALCULATION' | 'PAYROLL_COMMITTED';
  timestamp: string;
  durationMsFromStart: number;
  actorOrService: string;
  nodeId: string;
  metadata?: any;
}

// Gate 20: Distributed Immutable Audit Ledger Entry
export interface BiometricAuditLedgerEntry {
  auditId: string;
  tenantId: string;
  actorId: string;
  actorRole: string;
  actorIp: string;
  actionType: 'DEVICE_CONFIG_CHANGE' | 'GATEWAY_REASSIGNMENT' | 'EMPLOYEE_DELETED' | 'ATTENDANCE_CORRECTED' | 'PAYROLL_RECONCILED' | 'EMERGENCY_MUSTER_TRIGGERED' | 'FACTORY_RESET_INITIATED';
  targetResource: string;
  targetResourceId: string;
  beforeValue?: any;
  afterValue?: any;
  justification: string;
  approvedBy?: string;
  timestamp: string;
  cryptographicSignature: string; // SHA-256 seal of audit payload
}

// Gate 21: Predictive Device Health Score
export interface DeviceHealthScore {
  deviceId: string;
  deviceSerial: string;
  tenantId: string;
  connectivityScore: number;     // 0-100
  latencyScore: number;          // 0-100
  storagePressureScore: number;  // 0-100
  clockDriftScore: number;       // 0-100
  errorRateScore: number;        // 0-100
  overallHealthScore: number;    // Weighted composite: 0-100
  status: 'HEALTHY' | 'DEGRADED' | 'OVERLOADED' | 'CRITICAL';
  predictiveFailureRisk: 'LOW' | 'ELEVATED' | 'HIGH_RISK_FAILURE_IMMINENT';
  recommendedAction?: string;
  lastEvaluatedAt: string;
}

// Gate 22: Gateway Canary Rollout State
export interface GatewayCanaryReleaseState {
  releaseVersion: string;
  targetVersion: string;
  phase: CanaryReleasePhase;
  canaryGatewaysCount: number;
  totalGatewaysCount: number;
  errorRateThresholdPercent: number;
  observedCanaryErrorRatePercent: number;
  isRollbackTriggered: boolean;
  rollbackReason?: string;
  journalPreservationVerified: boolean;
}

// Gate 23: Zero-Trust Gateway Rotating Token & Identity
export interface ZeroTrustGatewayCredentials {
  gatewayId: string;
  hardwareFingerprintUuid: string;
  tenantId: string;
  locationId: string;
  signedSessionToken: string;
  tokenIssuedAt: string;
  tokenExpiresAt: string;
  isRevoked: boolean;
}

// Gate 24: High-Risk Command Approval Request
export interface HighRiskCommandApprovalRequest {
  requestId: string;
  tenantId: string;
  requestedBy: string;
  commandType: 'WIPE_ALL_USERS' | 'WIPE_LOGS' | 'FACTORY_RESET' | 'REMOVE_ADMIN';
  targetDeviceId: string;
  riskLevel: RiskLevel;
  status: CommandApprovalStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  timeLimitedExecutionToken?: string;
  tokenExpiresAt?: string;
  auditReceiptId?: string;
}

// Gate 25: Global Incident Command Center Live Metrics
export interface BiometricCommandCenterMetrics {
  totalDevicesOnline: number;
  totalDevicesDegraded: number;
  totalDevicesOffline: number;
  totalGatewaysHealthy: number;
  totalGatewaysWithSyncBacklog: number;
  globalEventsPerMinute: number;
  averageCloudLatencyMs: number;
  activeCriticalIncidents: number;
  multiRegionReplicationStatus: 'SYNCHRONIZED' | 'DEGRADED' | 'FAILOVER_ACTIVE';
  lastRefreshedAt: string;
}
