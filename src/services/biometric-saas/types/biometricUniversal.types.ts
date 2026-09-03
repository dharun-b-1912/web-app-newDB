// src/services/biometric-saas/types/biometricUniversal.types.ts
// ============================================================================
// Joy PeopleHR — Universal Biometric Device & Dynamic Enrollment Engine V5 Types
// Multi-Brand Capability Discovery, Method-Specific Workflows & Command Serialization
// ============================================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CommandApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'EXECUTED';
export type CanaryReleasePhase = 'CANARY_5_PERCENT' | 'STAGED_25_PERCENT' | 'FULL_ROLLOUT' | 'ROLLBACK_TRIGGERED';

export type EnrollmentMethod =
  | 'FACE'
  | 'FINGERPRINT'
  | 'CARD'
  | 'PIN'
  | 'PASSWORD'
  | 'IRIS'
  | 'PALM'
  | 'VEIN'
  | 'QR'
  | 'PHOTO_ID';

export type EnrollmentMode =
  | 'REMOTE_SENSOR_TRIGGER'
  | 'DEVICE_LOCAL'
  | 'SDK_TEMPLATE_UPLOAD'
  | 'CARD_TAP'
  | 'MANUAL_IDENTIFIER';

export type EnrollmentSessionStatus =
  | 'CREATED'
  | 'VALIDATING'
  | 'DEVICE_RESERVED'
  | 'COMMAND_QUEUED'
  | 'COMMAND_SENT'
  | 'WAITING_FOR_EMPLOYEE'
  | 'CAPTURING'
  | 'QUALITY_CHECK'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT';

export type CardTechnology =
  | 'EM_125KHZ'
  | 'MIFARE_13_56MHZ'
  | 'MIFARE_DESFIRE'
  | 'HID_PROX'
  | 'HID_ICLASS'
  | 'NFC_MOBILE'
  | 'UNKNOWN_OEM';

export type FingerPosition =
  | 'RIGHT_THUMB'
  | 'RIGHT_INDEX'
  | 'RIGHT_MIDDLE'
  | 'RIGHT_RING'
  | 'RIGHT_LITTLE'
  | 'LEFT_THUMB'
  | 'LEFT_INDEX'
  | 'LEFT_MIDDLE'
  | 'LEFT_RING'
  | 'LEFT_LITTLE';

export interface DeviceCapabilities {
  identity: {
    manufacturer: 'eSSL' | 'ZKTeco' | 'Mantra' | 'Hikvision' | 'Suprema' | 'Matrix COSEC' | 'Realtime' | 'Generic OEM';
    model: string;
    firmwareVersion?: string;
    platform?: string;
    serialNumber?: string;
  };

  connectivity: {
    ethernet: boolean;
    wifi: boolean;
    tcpSdk: boolean;
    admsPush: boolean;
    rs232: boolean;
    rs485: boolean;
    cloudManaged: boolean;
    defaultPorts: {
      tcp: number;
      adms?: number;
      http?: number;
      https?: number;
    };
  };

  credentials: {
    face?: {
      supported: boolean;
      remoteEnrollment: boolean;
      algorithm?: string;
      maxTemplates?: number;
      currentCount?: number;
      requiresDeviceInteraction: boolean;
    };

    fingerprint?: {
      supported: boolean;
      remoteEnrollment: boolean;
      maxTemplates?: number;
      currentCount?: number;
      supportedFingerCount: number; // e.g. 10 fingers vs 2 fingers vs 1
      supportedFingers?: FingerPosition[];
      algorithm?: string;
      requiresDeviceInteraction: boolean;
      scansRequiredPerFinger?: number; // e.g. 3 scans
    };

    card?: {
      supported: boolean;
      technologies: CardTechnology[];
      remoteEnrollment: boolean;
      maxCards?: number;
      currentCount?: number;
      supportsManualUid: boolean;
      supportsTapOnDevice: boolean;
    };

    iris?: {
      supported: boolean;
      remoteEnrollment: boolean;
      algorithm?: string;
    };

    palm?: {
      supported: boolean;
      remoteEnrollment: boolean;
    };

    vein?: {
      supported: boolean;
      remoteEnrollment: boolean;
    };

    pin?: {
      supported: boolean;
      minLength: number;
      maxLength: number;
      numericOnly: boolean;
      deviceSpecificRestrictions?: string;
    };

    password?: {
      supported: boolean;
      minLength?: number;
      maxLength?: number;
    };

    qrCode?: {
      supported: boolean;
    };
  };

  enrollment: {
    supported: boolean;
    modes: {
      remoteSensorTrigger: boolean;
      deviceLocalEnrollment: boolean;
      sdkTemplateUpload: boolean;
      cardTapEnrollment: boolean;
      faceCaptureOnDevice: boolean;
      fingerprintCaptureOnDevice: boolean;
    };
  };

  attendance: {
    realtimePush: boolean;
    polling: boolean;
    offlineBuffer: boolean;
    bufferCapacity?: number;
  };

  security: {
    commKey: boolean;
    tls: boolean;
    deviceCertificates: boolean;
    signedCommands: boolean;
  };

  source: 'LIVE_QUERY' | 'FIRMWARE_RESPONSE' | 'CERTIFIED_PROFILE' | 'MANUFACTURER_DEFAULTS' | 'SAFE_MODE_FALLBACK';
}

export interface UniversalEnrollmentSession {
  id: string;
  tenant_id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  device_id: string;
  device_model: string;
  device_ip: string;
  gateway_id: string;
  enrollment_method: EnrollmentMethod;
  enrollment_mode: EnrollmentMode;
  selected_finger?: FingerPosition;
  card_technology?: CardTechnology;
  card_number?: string;
  machine_pin: string;
  entered_pin?: string;
  status: EnrollmentSessionStatus;
  progress_percent: number;
  step_message: string;
  quality_score?: number; // 0-100
  quality_grade?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  scans_completed?: number;
  scans_required?: number;
  started_at: string;
  expires_at: string;
  completed_at?: string;
  failure_reason?: string;
  correlation_id: string;
}

export interface DeviceCommand {
  command_id: string;
  tenant_id: string;
  organization_id: string;
  device_id: string;
  device_ip: string;
  gateway_id: string;
  command_type:
    | 'CREATE_USER'
    | 'UPDATE_USER'
    | 'DELETE_USER'
    | 'START_FACE_ENROLLMENT'
    | 'START_FINGERPRINT_ENROLLMENT'
    | 'START_CARD_ENROLLMENT'
    | 'SET_PIN'
    | 'SYNC_USERS'
    | 'SYNC_CLOCK'
    | 'REBOOT_DEVICE'
    | 'REFRESH_DEVICE'
    | 'RECONCILE_LOGS'
    | 'WIPE_ALL_USERS'
    | 'WIPE_LOGS';
  payload: Record<string, any>;
  priority: 'P0_CRITICAL' | 'P1_HIGH' | 'P2_NORMAL' | 'P3_BACKGROUND';
  status: 'QUEUED' | 'LEASED' | 'SENT' | 'ACKNOWLEDGED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'DEAD_LETTER';
  retry_count: number;
  max_retries: number;
  created_at: string;
  acknowledged_at?: string;
  completed_at?: string;
  correlation_id: string;
  error_message?: string;
}

export interface DeviceProfile {
  profileId: string;
  manufacturer: string;
  modelCode: string;
  displayName: string;
  certified: boolean;
  defaultCapabilities: DeviceCapabilities;
}
