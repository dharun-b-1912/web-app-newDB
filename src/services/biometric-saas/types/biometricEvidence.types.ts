// src/services/biometric-saas/types/biometricEvidence.types.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — Biometric Evidence & Truth Layer Types
// Strictly separates Intent -> Capability -> Gateway Session -> Physical Evidence
// ============================================================================

export type BiometricModality = 'FACE' | 'FINGERPRINT' | 'CARD' | 'PIN';

export type CredentialStatus =
  | 'UNKNOWN'
  | 'NOT_ENROLLED'
  | 'REQUESTED'
  | 'WAITING_FOR_DEVICE'
  | 'ENROLLING'
  | 'VERIFYING'
  | 'ENROLLED'
  | 'FAILED'
  | 'UNSUPPORTED'
  | 'TIMEOUT';

export type EvidenceSource =
  | 'DEVICE_QUERY'
  | 'DEVICE_EVENT'
  | 'ADMS_OPERLOG'
  | 'CARD_SCAN_ASSIGNMENT'
  | 'MANUAL_VERIFICATION'
  | 'UNKNOWN';

export interface CredentialState {
  status: CredentialStatus;
  evidenceSource?: EvidenceSource;
  verifiedAt?: string;
  templateCount?: number;
  fingerIndexes?: number[];
  cardNumber?: string;
  confidence?: 'VERIFIED' | 'UNVERIFIED' | 'UNKNOWN';
  metadata?: Record<string, unknown>;
  protocolNote?: string;
}

export interface DeviceUserState {
  machinePin: string;
  identityProvisioned: boolean;
  name?: string;
  privilege?: 'USER' | 'ADMIN' | 'SUPERADMIN' | 'ENROLLER';
  enabled: boolean;
  face: CredentialState;
  fingerprint: CredentialState;
  card: CredentialState;
  pin: CredentialState;
  lastSyncedAt?: string;
}

export interface BiometricEvidence {
  id: string;
  terminalId: string;
  terminalSerial: string;
  machinePin: string;
  modality: BiometricModality;
  evidenceType: EvidenceSource;
  verified: boolean;
  templateCount?: number;
  fingerIndexes?: number[];
  cardNumber?: string;
  metadata?: Record<string, unknown>;
  observedAt: string;
  rawHash: string;
}

export type EnrollmentStrategy =
  | 'REMOTE_COMMAND'
  | 'DEVICE_ASSISTED'
  | 'DEVICE_MENU'
  | 'CARD_SCAN'
  | 'MANUAL_ENTRY'
  | 'UNSUPPORTED';

export type SessionState =
  | 'CREATED'
  | 'PROVISIONING'
  | 'CAPABILITY_CHECK'
  | 'WAITING_FOR_DEVICE'
  | 'REMOTE_COMMAND_SENT'
  | 'DEVICE_ENROLLING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'UNSUPPORTED';

export interface EnrollmentIntent {
  employeeId: string;
  terminalId: string;
  modality: BiometricModality;
  requestedAt: string;
  requestedBy: string;
}

export interface EnrollmentSession {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  terminalId: string;
  terminalSerial?: string;
  machinePin: string;
  modality: BiometricModality;
  strategy: EnrollmentStrategy;
  status: SessionState;
  progressStep: number;
  message: string;
  evidence?: BiometricEvidence;
  cardUid?: string;
  fingerIndex?: number;
  expiresAt: string;
  createdAt: string;
  completedAt?: string;
}

export interface ModalityCapability {
  supported: boolean;
  maxTemplates?: number;
  enrollmentStrategy: EnrollmentStrategy;
  verificationStrategy: EvidenceSource;
  templateRead: 'FULL' | 'METADATA_ONLY' | 'NONE';
  description: string;
}

export interface DeviceHardwareCapabilities {
  deviceModel: string;
  manufacturer: string;
  firmwareVersion?: string;
  face: ModalityCapability;
  fingerprint: ModalityCapability;
  card: ModalityCapability;
  pin: ModalityCapability;
  adms: {
    supported: boolean;
    operlogSupported: boolean;
    attlogSupported: boolean;
  };
}
