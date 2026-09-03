// src/services/biometric-saas/biometricEvidenceEngine.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — Biometric Evidence Engine
// Ingests, normalizes, and correlates physical device evidence
// Enforces Zero-Mock / Zero-Guess Biometric Credential Verification
// ============================================================================

import {
  BiometricEvidence,
  BiometricModality,
  CredentialState,
  CredentialStatus,
  DeviceHardwareCapabilities,
  DeviceUserState,
  EnrollmentSession,
  EvidenceSource,
} from './types/biometricEvidence.types';

export class BiometricEvidenceEngine {
  private static instance: BiometricEvidenceEngine;

  // In-memory / persistent evidence store
  private evidenceStore: Map<string, BiometricEvidence[]> = new Map(); // key: terminalSerial:machinePin
  private activeSessions: Map<string, EnrollmentSession> = new Map(); // key: sessionId

  private constructor() {}

  public static getInstance(): BiometricEvidenceEngine {
    if (!BiometricEvidenceEngine.instance) {
      BiometricEvidenceEngine.instance = new BiometricEvidenceEngine();
    }
    return BiometricEvidenceEngine.instance;
  }

  /**
   * Generates a deterministic hash for deduplication and audit trail
   */
  private generateEvidenceHash(serial: string, pin: string, modality: string, type: string, payload: any): string {
    const raw = `${serial}:${pin}:${modality}:${type}:${JSON.stringify(payload)}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `ev_hash_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Ingests physical evidence from a device query, ADMS log, or device operation event
   */
  public ingestEvidence(params: {
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
  }): BiometricEvidence {
    const rawHash = this.generateEvidenceHash(
      params.terminalSerial,
      params.machinePin,
      params.modality,
      params.evidenceType,
      { count: params.templateCount, card: params.cardNumber, meta: params.metadata }
    );

    const evidence: BiometricEvidence = {
      id: `evi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      terminalId: params.terminalId,
      terminalSerial: params.terminalSerial,
      machinePin: String(params.machinePin).trim(),
      modality: params.modality,
      evidenceType: params.evidenceType,
      verified: params.verified,
      templateCount: params.templateCount,
      fingerIndexes: params.fingerIndexes,
      cardNumber: params.cardNumber,
      metadata: params.metadata,
      observedAt: new Date().toISOString(),
      rawHash,
    };

    const key = `${params.terminalSerial}:${params.machinePin}`;
    const existing = this.evidenceStore.get(key) || [];
    // Deduplicate identical evidence within 5 seconds
    const isDup = existing.some(e => e.rawHash === rawHash && Date.now() - new Date(e.observedAt).getTime() < 5000);
    if (!isDup) {
      existing.unshift(evidence);
      this.evidenceStore.set(key, existing.slice(0, 50)); // Keep last 50 evidence records per user
    }

    // Correlate with any active enrollment session
    this.correlateWithActiveSessions(evidence);

    return evidence;
  }

  /**
   * Correlates incoming evidence with active enrollment sessions
   */
  private correlateWithActiveSessions(evidence: BiometricEvidence): void {
    const pinNum = parseInt(evidence.machinePin.replace(/\D/g, ''), 10);

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sPinNum = parseInt(session.machinePin.replace(/\D/g, ''), 10);
      const isPinMatch = session.machinePin === evidence.machinePin || (!isNaN(pinNum) && !isNaN(sPinNum) && pinNum === sPinNum);

      if (isPinMatch && session.modality === evidence.modality) {
        if (session.status === 'WAITING_FOR_DEVICE' || session.status === 'DEVICE_ENROLLING' || session.status === 'VERIFYING') {
          if (evidence.verified) {
            session.status = 'COMPLETED';
            session.evidence = evidence;
            session.completedAt = evidence.observedAt;
            session.message = `✓ ${evidence.modality} enrollment verified via ${evidence.evidenceType}`;
            if (evidence.cardNumber) session.cardUid = evidence.cardNumber;
          }
        }
      }
    }
  }

  /**
   * Registers a new enrollment session
   */
  public registerEnrollmentSession(session: EnrollmentSession): void {
    // Check timeout / expiration
    this.cleanExpiredSessions();
    this.activeSessions.set(session.id, session);
  }

  /**
   * Retrieves an enrollment session by ID
   */
  public getEnrollmentSession(sessionId: string): EnrollmentSession | undefined {
    this.cleanExpiredSessions();
    return this.activeSessions.get(sessionId);
  }

  /**
   * Cancels an active enrollment session
   */
  public cancelEnrollmentSession(sessionId: string, reason = 'Cancelled by administrator'): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session && session.status !== 'COMPLETED') {
      session.status = 'FAILED';
      session.message = reason;
      session.completedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Cleans up expired sessions and transitions them to TIMEOUT
   */
  public cleanExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.activeSessions.entries()) {
      if (['WAITING_FOR_DEVICE', 'DEVICE_ENROLLING', 'VERIFYING', 'PROVISIONING'].includes(session.status)) {
        if (new Date(session.expiresAt).getTime() < now) {
          session.status = 'TIMEOUT';
          session.message = 'Enrollment session timed out waiting for physical device capture.';
          session.completedAt = new Date().toISOString();
        }
      }
    }
  }

  /**
   * Determines verified credential state for a specific user and modality on a terminal
   */
  public resolveCredentialState(
    terminalSerial: string,
    machinePin: string,
    modality: BiometricModality,
    hardwareCap?: DeviceHardwareCapabilities
  ): CredentialState {
    const key = `${terminalSerial}:${machinePin}`;
    const evidenceList = this.evidenceStore.get(key) || [];
    const modalityEvidence = evidenceList.filter(e => e.modality === modality && e.verified);

    // If hardware explicitly does not support template reading for this modality
    if (hardwareCap) {
      const modCap = modality === 'FACE' ? hardwareCap.face : modality === 'FINGERPRINT' ? hardwareCap.fingerprint : hardwareCap.card;
      if (!modCap.supported) {
        return {
          status: 'UNSUPPORTED',
          protocolNote: `${modality} is not supported by terminal hardware.`,
        };
      }
    }

    if (modalityEvidence.length > 0) {
      const latest = modalityEvidence[0];
      return {
        status: 'ENROLLED',
        evidenceSource: latest.evidenceType,
        verifiedAt: latest.observedAt,
        templateCount: latest.templateCount || 1,
        fingerIndexes: latest.fingerIndexes,
        cardNumber: latest.cardNumber,
        confidence: 'VERIFIED',
        metadata: latest.metadata,
      };
    }

    // If no evidence exists yet, return UNKNOWN or NOT_ENROLLED based on protocol
    if (modality === 'FACE') {
      // Visible light face templates cannot be read over raw ZK TCP SDK 4370 unless ADMS push or Live Verify event is present
      return {
        status: 'UNKNOWN',
        protocolNote: 'Face template metadata is not verifiable over TCP SDK on Visible Light firmware without device event.',
      };
    }

    if (modality === 'FINGERPRINT') {
      return {
        status: 'NOT_ENROLLED',
        templateCount: 0,
        evidenceSource: 'DEVICE_QUERY',
      };
    }

    if (modality === 'CARD') {
      return {
        status: 'NOT_ENROLLED',
        cardNumber: undefined,
        evidenceSource: 'DEVICE_QUERY',
      };
    }

    return {
      status: 'NOT_ENROLLED',
    };
  }

  /**
   * Builds the comprehensive DeviceUserState for a machine user
   */
  public buildDeviceUserState(
    terminalSerial: string,
    machinePin: string,
    rawUser: {
      name?: string;
      privilege?: any;
      enabled?: boolean;
      cardNumber?: string | null;
      fingerprintCount?: number;
      faceEnrolled?: boolean;
    },
    hardwareCap?: DeviceHardwareCapabilities
  ): DeviceUserState {
    const pin = String(machinePin).trim();
    const cleanCard = rawUser.cardNumber && rawUser.cardNumber !== 'null' && rawUser.cardNumber !== 'undefined' ? rawUser.cardNumber : undefined;

    // Card State
    const cardState: CredentialState = cleanCard
      ? {
          status: 'ENROLLED',
          cardNumber: cleanCard,
          evidenceSource: 'DEVICE_QUERY',
          confidence: 'VERIFIED',
        }
      : {
          status: 'NOT_ENROLLED',
          evidenceSource: 'DEVICE_QUERY',
        };

    // Fingerprint State
    const fpCount = Number(rawUser.fingerprintCount || 0);
    const fpState: CredentialState = fpCount > 0
      ? {
          status: 'ENROLLED',
          templateCount: fpCount,
          evidenceSource: 'DEVICE_QUERY',
          confidence: 'VERIFIED',
        }
      : {
          status: 'NOT_ENROLLED',
          templateCount: 0,
          evidenceSource: 'DEVICE_QUERY',
        };

    // Face State — check if any verified evidence exists
    const faceEvidence = this.resolveCredentialState(terminalSerial, pin, 'FACE', hardwareCap);
    const faceState: CredentialState = faceEvidence.status === 'ENROLLED'
      ? faceEvidence
      : {
          status: 'UNKNOWN',
          protocolNote: 'Visible light face status is pending on-device registration or live verification event.',
        };

    return {
      machinePin: pin,
      identityProvisioned: true,
      name: rawUser.name || `Machine User #${pin}`,
      privilege: rawUser.privilege || 'USER',
      enabled: rawUser.enabled !== false,
      face: faceState,
      fingerprint: fpState,
      card: cardState,
      pin: {
        status: 'UNKNOWN',
      },
      lastSyncedAt: new Date().toISOString(),
    };
  }
}

export const biometricEvidenceEngine = BiometricEvidenceEngine.getInstance();
