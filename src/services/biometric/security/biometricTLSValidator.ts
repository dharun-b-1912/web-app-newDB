// src/services/biometric/security/biometricTLSValidator.ts
// ============================================================================
// Joy PeopleHR — Gate B11: Biometric TLS Connection & Identity Binding Validator
// ============================================================================

import { BiometricCertificatePolicyService, BiometricTLSPolicy } from './biometricCertificatePolicy';
import { BiometricTLSAuditService, BiometricTLSValidationStatus } from './biometricTLSAuditService';

export interface InboundTLSConnectionContext {
  organizationId: string;
  deviceId: string;
  protocol: 'HTTPS' | 'MQTTS' | 'WSS' | 'HTTP';
  tlsVersion: 'TLSv1.3' | 'TLSv1.2' | 'TLSv1.1' | 'TLSv1.0' | 'NONE';
  cipherSuite: string;
  certificateFingerprint: string;
  isCertExpired: boolean;
  isCATrusted: boolean;
  isSelfSigned: boolean;
  registeredDeviceRecord?: {
    deviceId: string;
    organizationId: string;
    approvedFingerprint: string;
  };
}

export interface TLSValidationResult {
  connectionId: string;
  isAllowed: boolean;
  status: BiometricTLSValidationStatus;
  rejectionReason?: string;
  timestamp: string;
}

export class BiometricTLSValidator {
  /**
   * Evaluates inbound TLS connection against security policy and device identity binding
   */
  static async validateConnection(
    ctx: InboundTLSConnectionContext,
    customPolicy?: Partial<BiometricTLSPolicy>
  ): Promise<TLSValidationResult> {
    const policy = { ...BiometricCertificatePolicyService.getPolicy(), ...customPolicy };
    const connectionId = `CONN_TLS_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    let status: BiometricTLSValidationStatus = 'ACCEPTED';
    let rejectionReason: string | undefined;
    let isAllowed = true;

    // 1. Plaintext HTTP Check
    if (ctx.protocol === 'HTTP' || ctx.tlsVersion === 'NONE') {
      isAllowed = false;
      status = 'PLAINTEXT_BLOCKED';
      rejectionReason = 'Plaintext HTTP connection rejected. Mutual TLS required.';
    }
    // 2. TLS Version Downgrade Check
    else if (
      policy.minimumTLSVersion === 'TLSv1.3' && ctx.tlsVersion !== 'TLSv1.3' ||
      policy.minimumTLSVersion === 'TLSv1.2' && (ctx.tlsVersion === 'TLSv1.1' || ctx.tlsVersion === 'TLSv1.0')
    ) {
      isAllowed = false;
      status = 'TLS_DOWNGRADE';
      rejectionReason = `TLS version ${ctx.tlsVersion} is below minimum allowed version (${policy.minimumTLSVersion}).`;
    }
    // 3. Expired Certificate Check
    else if (policy.rejectExpiredCertificate && ctx.isCertExpired) {
      isAllowed = false;
      status = 'CERTIFICATE_EXPIRED';
      rejectionReason = 'Device certificate is expired.';
    }
    // 4. Invalid CA / Untrusted Check
    else if (policy.requireValidCertificate && !ctx.isCATrusted) {
      isAllowed = false;
      status = 'INVALID_CA';
      rejectionReason = 'Certificate signed by untrusted or unknown Certificate Authority.';
    }
    // 5. Self-Signed Rejection
    else if (policy.rejectSelfSignedCertificate && ctx.isSelfSigned) {
      isAllowed = false;
      status = 'INVALID_CA';
      rejectionReason = 'Self-signed certificates are rejected by enterprise security policy.';
    }
    // 6. Registered Device Check
    else if (!ctx.registeredDeviceRecord) {
      isAllowed = false;
      status = 'UNKNOWN_DEVICE';
      rejectionReason = `Device ${ctx.deviceId} is not registered in organization ${ctx.organizationId}.`;
    }
    // 7. Device Fingerprint Binding Check
    else if (ctx.registeredDeviceRecord.approvedFingerprint !== ctx.certificateFingerprint) {
      isAllowed = false;
      status = 'DEVICE_MISMATCH';
      rejectionReason = `Certificate fingerprint (${ctx.certificateFingerprint}) does not match registered device record.`;
    }

    // Log to Audit Bus
    await BiometricTLSAuditService.logTLSEvent({
      organization_id: ctx.organizationId,
      device_id: ctx.deviceId,
      connection_id: connectionId,
      tls_version: ctx.tlsVersion,
      cipher_suite: ctx.cipherSuite,
      certificate_fingerprint: ctx.certificateFingerprint,
      validation_status: status,
      rejection_reason: rejectionReason,
      validated_at: timestamp,
    });

    return {
      connectionId,
      isAllowed,
      status,
      rejectionReason,
      timestamp,
    };
  }
}
