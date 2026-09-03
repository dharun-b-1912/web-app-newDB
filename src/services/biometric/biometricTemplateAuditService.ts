// src/services/biometric/biometricTemplateAuditService.ts
// ============================================================================
// Joy PeopleHR — Gate B13: Biometric Template Immutable Audit Service
// ============================================================================

import { enterpriseNotificationEngine } from '../operations/enterpriseNotificationEngine';

export interface TemplateAuditEvent {
  organization_id: string;
  employee_id?: string;
  device_id?: string;
  event_type:
    | 'biometric.template.backup_created'
    | 'biometric.template.restore_completed'
    | 'biometric.template.restore_rejected'
    | 'biometric.template.revoked';
  backup_id: string;
  actor_id: string;
  details: string;
  timestamp?: string;
}

export class BiometricTemplateAuditService {
  private static auditLogs: TemplateAuditEvent[] = [];

  static async logEvent(evt: TemplateAuditEvent): Promise<void> {
    const timestamp = new Date().toISOString();
    const entry = { ...evt, timestamp };
    this.auditLogs.push(entry);

    if (evt.event_type === 'biometric.template.restore_rejected') {
      try {
        await enterpriseNotificationEngine.dispatchEvent({
          organizationId: evt.organization_id,
          eventType: 'BIOMETRIC_DEVICE_OFFLINE',
          recipientId: 'ciso-security-team',
          recipientName: 'Security Admin',
          title: `🛡️ Security Alert: Biometric Template Restore Rejection`,
          message: `Restore attempt blocked for backup ${evt.backup_id} by actor ${evt.actor_id}: ${evt.details}`,
          variables: {
            backup_id: evt.backup_id,
            actor_id: evt.actor_id,
          },
        });
      } catch (err) {
        console.warn('[TemplateAudit] Notification warning:', err);
      }
    }
  }

  static getAuditLogs(): TemplateAuditEvent[] {
    return [...this.auditLogs];
  }
}
