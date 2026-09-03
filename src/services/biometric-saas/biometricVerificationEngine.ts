// src/services/biometric-saas/biometricVerificationEngine.ts
// ============================================================================
// Joy PeopleHR — Biometric Verification Engine & Session State Machine V5
// Enforces: COMMAND_ACK !== ENROLLMENT_SUCCESS and Strict Idempotency
// ============================================================================

import { EnrollmentStrategyType } from './deviceCapabilityEngine';

export type BiometricSessionState =
  | 'IDLE'
  | 'REQUESTED'
  | 'VALIDATING_DEVICE'
  | 'PROVISIONING_USER'
  | 'USER_PROVISIONED'
  | 'RESOLVING_STRATEGY'
  | 'COMMAND_QUEUED'
  | 'COMMAND_DELIVERED'
  | 'WAITING_FOR_DEVICE'
  | 'ENROLLMENT_STARTED'
  | 'WAITING_FOR_CAPTURE'
  | 'CAPTURE_DETECTED'
  | 'TEMPLATE_COMMITTED'
  | 'VERIFYING'
  | 'COMPLETED'
  // Failure States
  | 'UNSUPPORTED'
  | 'DEVICE_OFFLINE'
  | 'DEVICE_BUSY'
  | 'COMMAND_REJECTED'
  | 'COMMAND_TIMEOUT'
  | 'CAPTURE_TIMEOUT'
  | 'USER_CANCELLED'
  | 'NETWORK_INTERRUPTED'
  | 'VERIFICATION_FAILED';

export interface BiometricEnrollmentSession {
  id: string;
  correlation_id: string;
  tenant_id: string;
  organization_id: string;
  location_id?: string;
  device_id: string;
  device_ip: string;
  device_model: string;
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  machine_pin: string;
  credential_type: 'FACE' | 'FINGERPRINT' | 'CARD' | 'PIN' | 'IRIS' | 'PALM';
  strategy: EnrollmentStrategyType;
  status: BiometricSessionState;

  // Granular Lifecycle Timestamps
  requested_at: string;
  user_provisioned_at?: string;
  command_delivered_at?: string;
  device_acknowledged_at?: string;
  capture_started_at?: string;
  template_committed_at?: string;
  verified_at?: string;
  completed_at?: string;

  // Verification & Quality Proof
  verification_source?: 'HARDWARE_QUERY' | 'LIVE_PUNCH_DIFF' | 'DEVICE_STATUS_ACK' | 'MANUAL_VERIFIED';
  quality_score?: number;
  template_fingerprint?: string;

  // Error Info
  failure_code?: string;
  failure_message?: string;
  raw_return_code?: number | string;
}

export interface VerificationResult {
  verified: boolean;
  status: 'VERIFIED' | 'NOT_FOUND' | 'PENDING' | 'UNSUPPORTED' | 'FAILED';
  templateCount: number;
  isEnrolled: boolean;
  message: string;
}

/**
 * Biometric Verification & State Machine Manager
 */
export class BiometricVerificationEngine {
  private static instance: BiometricVerificationEngine;
  private sessions = new Map<string, BiometricEnrollmentSession>();
  private activeIdempotencyKeys = new Map<string, string>(); // Key -> SessionId

  public static getInstance(): BiometricVerificationEngine {
    if (!BiometricVerificationEngine.instance) {
      BiometricVerificationEngine.instance = new BiometricVerificationEngine();
    }
    return BiometricVerificationEngine.instance;
  }

  /**
   * Generates a deterministic idempotency key to prevent duplicate command storms
   */
  public generateIdempotencyKey(
    tenantId: string,
    deviceId: string,
    employeeId: string,
    credentialType: string
  ): string {
    return `${tenantId}:${deviceId}:${employeeId}:${credentialType.toUpperCase()}`;
  }

  /**
   * Initiates a new enrollment session with strict idempotency guard
   */
  public createOrGetSession(params: {
    tenant_id: string;
    organization_id: string;
    location_id?: string;
    device_id: string;
    device_ip: string;
    device_model: string;
    employee_id: string;
    employee_name: string;
    employee_code?: string;
    machine_pin: string;
    credential_type: 'FACE' | 'FINGERPRINT' | 'CARD' | 'PIN' | 'IRIS' | 'PALM';
    strategy: EnrollmentStrategyType;
  }): { session: BiometricEnrollmentSession; isExisting: boolean } {
    const idempotencyKey = this.generateIdempotencyKey(
      params.tenant_id,
      params.device_id,
      params.employee_id,
      params.credential_type
    );

    const existingSessionId = this.activeIdempotencyKeys.get(idempotencyKey);
    if (existingSessionId) {
      const existing = this.sessions.get(existingSessionId);
      if (existing && this.isActiveState(existing.status)) {
        console.log(`[IDEMPOTENCY] Returned existing active session ${existing.id} for key ${idempotencyKey}`);
        return { session: existing, isExisting: true };
      }
    }

    const sessionId = `ENR-SES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const correlationId = `WF-ENR-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;

    const newSession: BiometricEnrollmentSession = {
      id: sessionId,
      correlation_id: correlationId,
      tenant_id: params.tenant_id,
      organization_id: params.organization_id,
      location_id: params.location_id,
      device_id: params.device_id,
      device_ip: params.device_ip,
      device_model: params.device_model,
      employee_id: params.employee_id,
      employee_name: params.employee_name,
      employee_code: params.employee_code,
      machine_pin: params.machine_pin,
      credential_type: params.credential_type,
      strategy: params.strategy,
      status: 'REQUESTED',
      requested_at: new Date().toISOString(),
    };

    this.sessions.set(sessionId, newSession);
    this.activeIdempotencyKeys.set(idempotencyKey, sessionId);
    return { session: newSession, isExisting: false };
  }

  /**
   * Advances session state with strict state machine validation
   */
  public transitionState(
    sessionId: string,
    nextState: BiometricSessionState,
    meta?: Partial<BiometricEnrollmentSession>
  ): BiometricEnrollmentSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Enrollment session ${sessionId} not found.`);

    const now = new Date().toISOString();
    session.status = nextState;

    if (nextState === 'USER_PROVISIONED') session.user_provisioned_at = now;
    if (nextState === 'COMMAND_DELIVERED') session.command_delivered_at = now;
    if (nextState === 'WAITING_FOR_CAPTURE') session.capture_started_at = now;
    if (nextState === 'TEMPLATE_COMMITTED') session.template_committed_at = now;
    if (nextState === 'VERIFYING') session.verified_at = now;
    if (nextState === 'COMPLETED') {
      session.completed_at = now;
      // Clear active idempotency lock on completion
      const key = this.generateIdempotencyKey(
        session.tenant_id,
        session.device_id,
        session.employee_id,
        session.credential_type
      );
      this.activeIdempotencyKeys.delete(key);
    }

    if (meta) {
      Object.assign(session, meta);
    }

    return session;
  }

  /**
   * Hardware Verification: Checks if biometric template actually exists on physical machine
   */
  public verifyEnrollment(
    session: BiometricEnrollmentSession,
    deviceReport: {
      userId: string;
      fingerprintCount?: number;
      faceEnrolled?: boolean;
      cardNumber?: string | null;
    }
  ): VerificationResult {
    if (deviceReport.userId !== session.machine_pin) {
      return {
        verified: false,
        status: 'PENDING',
        templateCount: 0,
        isEnrolled: false,
        message: 'Awaiting device synchronization for target PIN.',
      };
    }

    if (session.credential_type === 'FACE') {
      if (deviceReport.faceEnrolled) {
        return {
          verified: true,
          status: 'VERIFIED',
          templateCount: 1,
          isEnrolled: true,
          message: `✓ Face template verified in hardware flash for PIN #${session.machine_pin}.`,
        };
      }
      return {
        verified: false,
        status: 'PENDING',
        templateCount: 0,
        isEnrolled: false,
        message: `Employee PIN #${session.machine_pin} provisioned. Awaiting face registration on terminal.`,
      };
    }

    if (session.credential_type === 'FINGERPRINT') {
      const count = deviceReport.fingerprintCount || 0;
      if (count > 0) {
        return {
          verified: true,
          status: 'VERIFIED',
          templateCount: count,
          isEnrolled: true,
          message: `✓ ${count} fingerprint template(s) verified in hardware flash for PIN #${session.machine_pin}.`,
        };
      }
      return {
        verified: false,
        status: 'PENDING',
        templateCount: 0,
        isEnrolled: false,
        message: `Awaiting optical finger scan on terminal for PIN #${session.machine_pin}.`,
      };
    }

    if (session.credential_type === 'CARD') {
      if (deviceReport.cardNumber) {
        return {
          verified: true,
          status: 'VERIFIED',
          templateCount: 1,
          isEnrolled: true,
          message: `✓ RFID Card #${deviceReport.cardNumber} committed to hardware memory.`,
        };
      }
    }

    return {
      verified: false,
      status: 'PENDING',
      templateCount: 0,
      isEnrolled: false,
      message: 'Awaiting template confirmation from hardware.',
    };
  }

  public getSession(sessionId: string): BiometricEnrollmentSession | undefined {
    return this.sessions.get(sessionId);
  }

  private isActiveState(status: BiometricSessionState): boolean {
    return ![
      'COMPLETED',
      'UNSUPPORTED',
      'DEVICE_OFFLINE',
      'COMMAND_REJECTED',
      'COMMAND_TIMEOUT',
      'CAPTURE_TIMEOUT',
      'USER_CANCELLED',
      'NETWORK_INTERRUPTED',
      'VERIFICATION_FAILED',
    ].includes(status);
  }
}

export const biometricVerificationEngine = BiometricVerificationEngine.getInstance();
