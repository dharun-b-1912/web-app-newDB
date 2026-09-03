// src/services/biometric/security/biometricTLSAuditService.ts
// ============================================================================
// Joy PeopleHR — Gate B11: Biometric TLS Security Audit Service
// Dispatches immutable TLS connection audit events through enterprise event bus
// ============================================================================

import { enterpriseNotificationEngine } from '../../operations/enterpriseNotificationEngine';

export type BiometricTLSValidationStatus =
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CERTIFICATE_EXPIRED'
  | 'INVALID_CA'
  | 'TLS_DOWNGRADE'
  | 'DEVICE_MISMATCH'
  | 'PLAINTEXT_BLOCKED'
  | 'UNKNOWN_DEVICE';

export interface BiometricTLSAuditEvent {
  organization_id: string;
  device_id: string;
  connection_id: string;
  tls_version?: string;
  cipher_suite?: string;
  certificate_fingerprint?: string;
  validation_status: BiometricTLSValidationStatus;
  rejection_reason?: string;
  validated_at: string;
}

export class BiometricTLSAuditService {
  private static auditLogs: BiometricTLSAuditEvent[] = [];

  static async logTLSEvent(event: BiometricTLSAuditEvent): Promise<void> {
    this.auditLogs.push(event);

    if (event.validation_status !== 'ACCEPTED') {
      try {
        await enterpriseNotificationEngine.dispatchEvent({
          organizationId: event.organization_id,
          eventType: 'BIOMETRIC_DEVICE_OFFLINE',
          recipientId: 'security-operations',
          recipientName: 'Security Admin',
          title: `🚨 TLS Security Rejection: Device ${event.device_id} (${event.validation_status})`,
          message: `Inbound connection ${event.connection_id} blocked: ${event.rejection_reason || event.validation_status} at ${event.validated_at}.`,
          variables: {
            device_id: event.device_id,
            connection_id: event.connection_id,
            validation_status: event.validation_status,
          },
        });
      } catch (err) {
        console.warn('[TLSAudit] Notification dispatch note:', err);
      }
    }
  }

  static getAuditLogs(): BiometricTLSAuditEvent[] {
    return [...this.auditLogs];
  }
}
