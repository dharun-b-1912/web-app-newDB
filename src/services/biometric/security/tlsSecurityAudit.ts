// src/services/biometric/security/tlsSecurityAudit.ts
// ============================================================================
// Joy PeopleHR — Gate B11: Immutable TLS Security Event Audit Engine
// ============================================================================

import { enterpriseNotificationEngine } from '../../operations/enterpriseNotificationEngine';

export type TLSSecurityEventType =
  | 'biometric.tls.connection_established'
  | 'biometric.tls.connection_rejected'
  | 'biometric.tls.certificate_expiring'
  | 'biometric.tls.certificate_expired'
  | 'biometric.tls.certificate_mismatch'
  | 'biometric.tls.handshake_failed'
  | 'biometric.tls.connection_lost'
  | 'biometric.tls.connection_restored';

export interface TLSSecurityAuditEntry {
  id: string;
  eventType: TLSSecurityEventType;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  organizationId: string;
  deviceId: string;
  details: string;
  timestamp: string;
}

export class TLSSecurityAudit {
  private static auditLedger: TLSSecurityAuditEntry[] = [];

  static async emit(
    eventType: TLSSecurityEventType,
    severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL',
    organizationId: string,
    deviceId: string,
    details: string
  ): Promise<TLSSecurityAuditEntry> {
    const entry: TLSSecurityAuditEntry = {
      id: `SEC_EVT_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      eventType,
      severity,
      organizationId,
      deviceId,
      details,
      timestamp: new Date().toISOString(),
    };

    this.auditLedger.push(entry);

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      try {
        await enterpriseNotificationEngine.dispatchEvent({
          organizationId,
          eventType: 'BIOMETRIC_DEVICE_OFFLINE',
          recipientId: 'ciso-security-team',
          recipientName: 'Enterprise CISO Security Team',
          title: `🛡️ Security Alert: ${eventType} (${deviceId})`,
          message: `TLS Security Event [${severity}]: ${details} on device ${deviceId} at ${entry.timestamp}.`,
          variables: {
            device_id: deviceId,
            event_type: eventType,
            severity,
          },
        });
      } catch (err) {
        console.warn('[TLSSecurityAudit] Notification note:', err);
      }
    }

    return entry;
  }

  static getLedger(): TLSSecurityAuditEntry[] {
    return [...this.auditLedger];
  }
}
