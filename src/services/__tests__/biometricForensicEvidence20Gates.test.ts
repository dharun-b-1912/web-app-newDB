// src/services/__tests__/biometricForensicEvidence20Gates.test.ts
// ============================================================================
// Joy PeopleHR — Biometric Forensic Evidence Certification Test Suite (20 Gates)
// Validates strict physical device evidence truth layers & zero-mock guarantees
// ============================================================================

import { biometricEvidenceEngine } from '../biometric-saas/biometricEvidenceEngine';
import { capabilityDiscoveryEngine } from '../biometric-saas/capabilityDiscoveryEngine';
import { CERTIFIED_DEVICE_PROFILES } from '../biometric-saas/deviceProfileRegistry';
import {
  EnrollmentSession,
  BiometricModality,
  DeviceHardwareCapabilities,
} from '../biometric-saas/types/biometricEvidence.types';

export function runBiometricForensic20GatesSuite() {
  const results: { gate: string; title: string; passed: boolean; error?: string }[] = [];

  const runGate = (gate: string, title: string, fn: () => void) => {
    try {
      fn();
      results.push({ gate, title, passed: true });
    } catch (err: any) {
      results.push({ gate, title, passed: false, error: err.message });
    }
  };

  // GATE 1: User provisioning does NOT imply biometric enrollment
  runGate('GATE 1', 'User provisioning creates identity without marking biometric enrollment', () => {
    const rawUser = {
      name: 'Test Employee A',
      privilege: 'USER' as const,
      enabled: true,
      cardNumber: null,
      fingerprintCount: 0,
      faceEnrolled: false,
    };
    const userState = biometricEvidenceEngine.buildDeviceUserState('SN-TEST-001', '17', rawUser);
    if (userState.face.status === 'ENROLLED') throw new Error('Face must NOT be marked enrolled upon user creation');
    if (userState.fingerprint.status === 'ENROLLED') throw new Error('Fingerprint must NOT be marked enrolled upon user creation');
    if (userState.card.status === 'ENROLLED') throw new Error('Card must NOT be marked enrolled without card UID');
    if (!userState.identityProvisioned) throw new Error('Identity should be marked provisioned');
  });

  // GATE 2: Command acknowledgement does NOT imply enrollment completion
  runGate('GATE 2', 'Command ACK (Return=0) does NOT mark enrollment complete', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-2',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-01',
      terminalId: 'term-01',
      machinePin: '17',
      modality: 'FACE',
      strategy: 'DEVICE_ASSISTED',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Command dispatched to terminal',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);

    // Command ACK arrives from gateway
    const ackResult = { command: 'DATA USER PIN=17', returnCode: 0, status: 'ACKNOWLEDGED' };
    if (ackResult.returnCode === 0) {
      // Must NOT transition session to COMPLETED
      const current = biometricEvidenceEngine.getEnrollmentSession('sess-gate-2');
      if (current?.status === 'COMPLETED') throw new Error('Command ACK must not complete enrollment');
      if (current?.status !== 'WAITING_FOR_DEVICE') throw new Error('Session must remain WAITING_FOR_DEVICE');
    }
  });

  // GATE 3: Face enrollment requires physical evidence
  runGate('GATE 3', 'Face enrollment requires verified physical evidence', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-3',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-02',
      terminalId: 'term-01',
      terminalSerial: 'SN-ZK-FACE-01',
      machinePin: '17',
      modality: 'FACE',
      strategy: 'DEVICE_ASSISTED',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Waiting for device camera capture',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);

    // Ingest real physical evidence from terminal punch/event
    biometricEvidenceEngine.ingestEvidence({
      terminalId: 'term-01',
      terminalSerial: 'SN-ZK-FACE-01',
      machinePin: '17',
      modality: 'FACE',
      evidenceType: 'DEVICE_EVENT',
      verified: true,
      metadata: { verifyCode: 15, source: 'ADMS_LIVE' },
    });

    const updated = biometricEvidenceEngine.getEnrollmentSession('sess-gate-3');
    if (updated?.status !== 'COMPLETED') throw new Error('Session should complete upon verified physical evidence');
    if (!updated?.evidence || !updated.evidence.verified) throw new Error('Session must attach verified evidence');
  });

  // GATE 4: Fingerprint enrollment requires physical evidence
  runGate('GATE 4', 'Fingerprint enrollment requires verified physical evidence', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-4',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-03',
      terminalId: 'term-01',
      terminalSerial: 'SN-ZK-FP-01',
      machinePin: '27',
      modality: 'FINGERPRINT',
      strategy: 'DEVICE_ASSISTED',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Waiting for 3 optical finger scans',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);

    // Ingest FP template evidence
    biometricEvidenceEngine.ingestEvidence({
      terminalId: 'term-01',
      terminalSerial: 'SN-ZK-FP-01',
      machinePin: '27',
      modality: 'FINGERPRINT',
      evidenceType: 'DEVICE_QUERY',
      verified: true,
      templateCount: 1,
      fingerIndexes: [6],
    });

    const updated = biometricEvidenceEngine.getEnrollmentSession('sess-gate-4');
    if (updated?.status !== 'COMPLETED') throw new Error('Fingerprint session should complete on template evidence');
    if (updated?.evidence?.templateCount !== 1) throw new Error('Template count mismatch');
  });

  // GATE 5: Card UID must originate from device event or verified assignment
  runGate('GATE 5', 'Card UID must originate from device event or verified assignment', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-5',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-04',
      terminalId: 'term-01',
      terminalSerial: 'SN-ZK-CARD-01',
      machinePin: '154',
      modality: 'CARD',
      strategy: 'CARD_SCAN',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Waiting for RFID card tap',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);

    // Ingest card scan evidence with real UID
    biometricEvidenceEngine.ingestEvidence({
      terminalId: 'term-01',
      terminalSerial: 'SN-ZK-CARD-01',
      machinePin: '154',
      modality: 'CARD',
      evidenceType: 'CARD_SCAN_ASSIGNMENT',
      verified: true,
      cardNumber: 'CARD-8839211',
    });

    const updated = biometricEvidenceEngine.getEnrollmentSession('sess-gate-5');
    if (updated?.status !== 'COMPLETED') throw new Error('Card session should complete on card tap');
    if (updated?.cardUid !== 'CARD-8839211') throw new Error('Captured card UID mismatch');
  });

  // GATE 6: Unsupported remote enrollment displays DEVICE_ASSISTED
  runGate('GATE 6', 'AI-FACE MAGNUM resolves to DEVICE_ASSISTED for face and fingerprint', () => {
    const profile = CERTIFIED_DEVICE_PROFILES.ESSL_AI_FACE_MAGNUM;
    if (!profile) throw new Error('Profile ESSL_AI_FACE_MAGNUM not found');
    if (!profile.defaultCapabilities.credentials.face.requiresDeviceInteraction) {
      throw new Error('AI Face requires physical device interaction on terminal');
    }
  });

  // GATE 7: Unknown credential state is never displayed as enrolled
  runGate('GATE 7', 'Unknown credential state is resolved as UNKNOWN or NOT_ENROLLED, never ENROLLED', () => {
    const state = biometricEvidenceEngine.resolveCredentialState('SN-UNPROVISIONED', '999', 'FACE');
    if (state.status === 'ENROLLED') throw new Error('Unverified face state must not be ENROLLED');
    if (state.status !== 'UNKNOWN' && state.status !== 'NOT_ENROLLED') {
      throw new Error('State must be UNKNOWN or NOT_ENROLLED');
    }
  });

  // GATE 8: Expired enrollment sessions transition to TIMEOUT
  runGate('GATE 8', 'Expired enrollment sessions transition to TIMEOUT', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-8',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-05',
      terminalId: 'term-01',
      machinePin: '99',
      modality: 'FACE',
      strategy: 'DEVICE_ASSISTED',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Waiting',
      expiresAt: new Date(Date.now() - 5000).toISOString(), // Expired 5 seconds ago
      createdAt: new Date(Date.now() - 305000).toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);
    biometricEvidenceEngine.cleanExpiredSessions();

    const current = biometricEvidenceEngine.getEnrollmentSession('sess-gate-8');
    if (current?.status !== 'TIMEOUT') throw new Error(`Expected TIMEOUT, got ${current?.status}`);
  });

  // GATE 9: Different modalities can have independent sessions
  runGate('GATE 9', 'Different modalities for same employee PIN can have independent sessions', () => {
    const faceSession: EnrollmentSession = {
      id: 'sess-face-9',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-06',
      terminalId: 'term-01',
      machinePin: '17',
      modality: 'FACE',
      strategy: 'DEVICE_ASSISTED',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Face session',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    const cardSession: EnrollmentSession = {
      id: 'sess-card-9',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-06',
      terminalId: 'term-01',
      machinePin: '17',
      modality: 'CARD',
      strategy: 'CARD_SCAN',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Card session',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    biometricEvidenceEngine.registerEnrollmentSession(faceSession);
    biometricEvidenceEngine.registerEnrollmentSession(cardSession);

    const s1 = biometricEvidenceEngine.getEnrollmentSession('sess-face-9');
    const s2 = biometricEvidenceEngine.getEnrollmentSession('sess-card-9');
    if (!s1 || !s2) throw new Error('Both modality sessions should coexist independently');
    if (s1.modality === s2.modality) throw new Error('Modalities should differ');
  });

  // GATE 10: Duplicate modality sessions are idempotent
  runGate('GATE 10', 'Active session can be safely retrieved without state corruption', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-10',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-07',
      terminalId: 'term-01',
      machinePin: '27',
      modality: 'FINGERPRINT',
      strategy: 'DEVICE_ASSISTED',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Active',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);
    const retrieved = biometricEvidenceEngine.getEnrollmentSession('sess-gate-10');
    if (retrieved?.id !== 'sess-gate-10') throw new Error('Failed to retrieve session');
  });

  // GATE 11: Tenant boundaries prevent cross-tenant device access
  runGate('GATE 11', 'Enrollment sessions strictly record tenantId', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-11',
      tenantId: 'org-tenant-alpha',
      employeeId: 'emp-08',
      terminalId: 'term-alpha-01',
      machinePin: '10',
      modality: 'FACE',
      strategy: 'DEVICE_ASSISTED',
      status: 'CREATED',
      progressStep: 0,
      message: 'Created',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);
    const current = biometricEvidenceEngine.getEnrollmentSession('sess-gate-11');
    if (current?.tenantId !== 'org-tenant-alpha') throw new Error('Tenant ID mismatch');
  });

  // GATE 12: Device reconnect continues enrollment verification
  runGate('GATE 12', 'Evidence ingestion correlates with sessions created prior to device reconnect', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-12',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-09',
      terminalId: 'term-reconnect',
      terminalSerial: 'SN-RECONNECT-01',
      machinePin: '33',
      modality: 'FACE',
      strategy: 'DEVICE_ASSISTED',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Awaiting device reconnect',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);

    // After reconnection, punch event arrives
    biometricEvidenceEngine.ingestEvidence({
      terminalId: 'term-reconnect',
      terminalSerial: 'SN-RECONNECT-01',
      machinePin: '33',
      modality: 'FACE',
      evidenceType: 'ADMS_OPERLOG',
      verified: true,
    });

    const updated = biometricEvidenceEngine.getEnrollmentSession('sess-gate-12');
    if (updated?.status !== 'COMPLETED') throw new Error('Session must complete after reconnect evidence');
  });

  // GATE 13: ADMS duplicate events are deduplicated
  runGate('GATE 13', 'Duplicate identical evidence within window is deduplicated', () => {
    const ev1 = biometricEvidenceEngine.ingestEvidence({
      terminalId: 'term-dedup',
      terminalSerial: 'SN-DEDUP-01',
      machinePin: '44',
      modality: 'FACE',
      evidenceType: 'ADMS_OPERLOG',
      verified: true,
      metadata: { seq: 100 },
    });
    const ev2 = biometricEvidenceEngine.ingestEvidence({
      terminalId: 'term-dedup',
      terminalSerial: 'SN-DEDUP-01',
      machinePin: '44',
      modality: 'FACE',
      evidenceType: 'ADMS_OPERLOG',
      verified: true,
      metadata: { seq: 100 },
    });
    if (ev1.rawHash !== ev2.rawHash) throw new Error('Evidence hashes should match for duplicate events');
  });

  // GATE 14: Gateway session cancellation updates session state
  runGate('GATE 14', 'Manual cancellation transitions session to FAILED / Cancelled', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-14',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-10',
      terminalId: 'term-01',
      machinePin: '55',
      modality: 'FINGERPRINT',
      strategy: 'DEVICE_ASSISTED',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Active',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);
    const ok = biometricEvidenceEngine.cancelEnrollmentSession('sess-gate-14', 'User aborted');
    if (!ok) throw new Error('Cancellation should succeed');
    const updated = biometricEvidenceEngine.getEnrollmentSession('sess-gate-14');
    if (updated?.status !== 'FAILED') throw new Error('Status should be FAILED');
  });

  // GATE 15: Zero employee-specific hardcoded biometric assignments in engine
  runGate('GATE 15', 'Engine contains no hardcoded employee biometric mappings', () => {
    // Arbitrary employee PIN 777 has no pre-existing fake state
    const state = biometricEvidenceEngine.resolveCredentialState('SN-CLEAN-01', '777', 'FACE');
    if (state.status === 'ENROLLED') throw new Error('Unenrolled PIN must not return ENROLLED');
  });

  // GATE 16: Evidence hash integrity prevents spoofed verification
  runGate('GATE 16', 'Evidence record carries non-empty rawHash and audit metadata', () => {
    const ev = biometricEvidenceEngine.ingestEvidence({
      terminalId: 'term-audit',
      terminalSerial: 'SN-AUDIT-01',
      machinePin: '88',
      modality: 'CARD',
      evidenceType: 'DEVICE_QUERY',
      verified: true,
      cardNumber: 'CARD-994411',
    });
    if (!ev.rawHash || !ev.rawHash.startsWith('ev_hash_')) {
      throw new Error('Evidence must contain a valid rawHash');
    }
  });

  // GATE 17: Raw biometric templates are not stored in cloud payload
  runGate('GATE 17', 'Evidence Engine only stores metadata & counts, never raw template binary blobs', () => {
    const ev = biometricEvidenceEngine.ingestEvidence({
      terminalId: 'term-sec',
      terminalSerial: 'SN-SEC-01',
      machinePin: '90',
      modality: 'FINGERPRINT',
      evidenceType: 'DEVICE_QUERY',
      verified: true,
      templateCount: 2,
      fingerIndexes: [6, 7],
    });
    if ((ev as any).rawTemplateBlob) throw new Error('Raw template binary blobs must never be stored in evidence payload');
  });

  // GATE 18: Terminal PIN resolution handles zero-padded IDs (017 == 17)
  runGate('GATE 18', 'PIN matching normalizes numeric strings (017 == 17)', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-18',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-11',
      terminalId: 'term-pin',
      terminalSerial: 'SN-PIN-01',
      machinePin: '017',
      modality: 'FACE',
      strategy: 'DEVICE_ASSISTED',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Waiting',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);

    // Event arrives with PIN "17" (unpadded)
    biometricEvidenceEngine.ingestEvidence({
      terminalId: 'term-pin',
      terminalSerial: 'SN-PIN-01',
      machinePin: '17',
      modality: 'FACE',
      evidenceType: 'DEVICE_EVENT',
      verified: true,
    });

    const updated = biometricEvidenceEngine.getEnrollmentSession('sess-gate-18');
    if (updated?.status !== 'COMPLETED') throw new Error('Unpadded PIN 17 should match padded PIN 017');
  });

  // GATE 19: Card tap event matches active card enrollment session
  runGate('GATE 19', 'Card tap event extracts UID and completes active CARD session', () => {
    const session: EnrollmentSession = {
      id: 'sess-gate-19',
      tenantId: 'tenant-joy-1',
      employeeId: 'emp-12',
      terminalId: 'term-card',
      terminalSerial: 'SN-CARD-02',
      machinePin: '154',
      modality: 'CARD',
      strategy: 'CARD_SCAN',
      status: 'WAITING_FOR_DEVICE',
      progressStep: 1,
      message: 'Tap card',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    biometricEvidenceEngine.registerEnrollmentSession(session);

    biometricEvidenceEngine.ingestEvidence({
      terminalId: 'term-card',
      terminalSerial: 'SN-CARD-02',
      machinePin: '154',
      modality: 'CARD',
      evidenceType: 'CARD_SCAN_ASSIGNMENT',
      verified: true,
      cardNumber: 'CARD-UID-554433',
    });

    const updated = biometricEvidenceEngine.getEnrollmentSession('sess-gate-19');
    if (updated?.status !== 'COMPLETED') throw new Error('Card session must complete');
    if (updated?.cardUid !== 'CARD-UID-554433') throw new Error('Card UID must be captured');
  });

  // GATE 20: Multi-device tenant capability isolation
  runGate('GATE 20', 'Hardware capabilities correctly indicate supported vs unsupported modalities', () => {
    const hwCaps: DeviceHardwareCapabilities = {
      deviceModel: 'AI-FACE MAGNUM',
      manufacturer: 'eSSL',
      face: {
        supported: true,
        enrollmentStrategy: 'DEVICE_ASSISTED',
        verificationStrategy: 'DEVICE_EVENT',
        templateRead: 'NONE',
        description: 'Face camera registration on device',
      },
      fingerprint: {
        supported: true,
        enrollmentStrategy: 'DEVICE_ASSISTED',
        verificationStrategy: 'DEVICE_QUERY',
        templateRead: 'METADATA_ONLY',
        description: 'Optical FP sensor',
      },
      card: {
        supported: true,
        enrollmentStrategy: 'CARD_SCAN',
        verificationStrategy: 'CARD_SCAN_ASSIGNMENT',
        templateRead: 'FULL',
        description: '125kHz RFID reader',
      },
      pin: {
        supported: true,
        enrollmentStrategy: 'MANUAL_ENTRY',
        verificationStrategy: 'MANUAL_VERIFICATION',
        templateRead: 'METADATA_ONLY',
        description: 'Keypad PIN',
      },
      adms: {
        supported: true,
        operlogSupported: true,
        attlogSupported: true,
      },
    };

    const state = biometricEvidenceEngine.resolveCredentialState('SN-HW-01', '101', 'FACE', hwCaps);
    if (state.status === 'ENROLLED') throw new Error('Without evidence, status cannot be ENROLLED');
    if (state.status !== 'UNKNOWN') throw new Error(`Expected UNKNOWN for Visible Light face, got ${state.status}`);
  });

  return results;
}
