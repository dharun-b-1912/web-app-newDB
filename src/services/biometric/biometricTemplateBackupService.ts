// src/services/biometric/biometricTemplateBackupService.ts
// ============================================================================
// Joy PeopleHR — Gate B13: Biometric Template Backup Service
// Enforces: Zero plaintext persistence & dedicated biometric_template_backups registry
// ============================================================================

import { BiometricTemplateCryptoService, TemplateCryptoContext } from './biometricTemplateCryptoService';
import { BiometricTemplateAuditService } from './biometricTemplateAuditService';

export interface TemplateBackupRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  device_id: string;
  template_type: 'FINGERPRINT' | 'FACE';
  template_version: string;
  encrypted_payload: string;
  encrypted_dek: string;
  iv: string;
  auth_tag: string;
  integrity_hash: string;
  encryption_algorithm: 'AES-256-GCM';
  key_version: string;
  backup_status: 'ACTIVE' | 'REVOKED' | 'RESTORED';
  created_at: string;
  restored_at?: string;
  restored_by?: string;
}

export class BiometricTemplateBackupService {
  private static backups: Map<string, TemplateBackupRecord> = new Map();

  static async backupTemplate(
    rawTemplateBinary: string,
    ctx: TemplateCryptoContext,
    actorId: string
  ): Promise<TemplateBackupRecord> {
    const envelope = BiometricTemplateCryptoService.encryptTemplate(rawTemplateBinary, ctx);
    const backupId = `VLT_BKP_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const record: TemplateBackupRecord = {
      id: backupId,
      organization_id: ctx.organizationId,
      employee_id: ctx.employeeId,
      device_id: ctx.deviceId,
      template_type: ctx.templateType,
      template_version: ctx.templateVersion,
      encrypted_payload: envelope.ciphertext,
      encrypted_dek: envelope.encrypted_dek,
      iv: envelope.iv,
      auth_tag: envelope.auth_tag,
      integrity_hash: envelope.integrity_hash,
      encryption_algorithm: 'AES-256-GCM',
      key_version: envelope.key_version,
      backup_status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.backups.set(backupId, record);

    await BiometricTemplateAuditService.logEvent({
      organization_id: ctx.organizationId,
      employee_id: ctx.employeeId,
      device_id: ctx.deviceId,
      event_type: 'biometric.template.backup_created',
      backup_id: backupId,
      actor_id: actorId,
      details: `Envelope backup created with SHA-256 seal ${envelope.integrity_hash.substring(0, 16)}...`,
    });

    return record;
  }

  static getBackup(backupId: string): TemplateBackupRecord | undefined {
    return this.backups.get(backupId);
  }
}
