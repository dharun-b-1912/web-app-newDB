// src/services/biometric/biometricTemplateRestoreService.ts
// ============================================================================
// Joy PeopleHR — Gate B13: Biometric Template Restore Service
// Enforces: Strict RBAC + Dual Verification (Tenant + AEAD + SHA-256 Seal)
// ============================================================================

import { BiometricTemplateCryptoService, TemplateCryptoContext, EncryptedTemplateEnvelope } from './biometricTemplateCryptoService';
import { BiometricTemplateBackupService } from './biometricTemplateBackupService';
import { BiometricTemplateAuditService } from './biometricTemplateAuditService';

export const AUTHORIZED_RESTORE_ROLES = ['COMPANY_ADMIN', 'SECURITY_ADMIN', 'BIOMETRIC_ADMIN'];

export interface RestoreRequest {
  backupId: string;
  requesterRole: string;
  requesterId: string;
  targetOrgId: string;
  targetDeviceId: string;
  restoredBinary: string;
  tamperOptions?: {
    tamperCiphertext?: boolean;
    tamperAuthTag?: boolean;
    tamperDek?: boolean;
  };
}

export interface RestoreResponse {
  success: boolean;
  errorCode?: string;
  reason?: string;
  restoredAt?: string;
}

export class BiometricTemplateRestoreService {
  static async requestRestore(req: RestoreRequest): Promise<RestoreResponse> {
    // 1. RBAC Authorization Gate
    if (!AUTHORIZED_RESTORE_ROLES.includes(req.requesterRole)) {
      await BiometricTemplateAuditService.logEvent({
        organization_id: req.targetOrgId,
        event_type: 'biometric.template.restore_rejected',
        backup_id: req.backupId,
        actor_id: req.requesterId,
        details: `RBAC Violation: Role ${req.requesterRole} is not authorized for biometric restore.`,
      });
      return { success: false, errorCode: 'ERR_UNAUTHORIZED_RBAC', reason: 'Role not authorized for template restore.' };
    }

    // 2. Fetch Backup Record
    const bkp = BiometricTemplateBackupService.getBackup(req.backupId);
    if (!bkp) {
      return { success: false, errorCode: 'ERR_BACKUP_NOT_FOUND', reason: 'Backup record not found.' };
    }

    // 3. Cross-Tenant Isolation Check
    if (bkp.organization_id !== req.targetOrgId) {
      await BiometricTemplateAuditService.logEvent({
        organization_id: req.targetOrgId,
        event_type: 'biometric.template.restore_rejected',
        backup_id: req.backupId,
        actor_id: req.requesterId,
        details: `Cross-Tenant Attack Blocked: Target Org ${req.targetOrgId} != Backup Org ${bkp.organization_id}`,
      });
      return { success: false, errorCode: 'ERR_TENANT_ISOLATION_VIOLATION', reason: 'Cross-tenant restore strictly blocked.' };
    }

    // 4. Reconstruct Crypto Context & Validate AEAD / Hash
    const ctx: TemplateCryptoContext = {
      organizationId: bkp.organization_id,
      employeeId: bkp.employee_id,
      deviceId: req.targetDeviceId,
      templateType: bkp.template_type,
      templateVersion: bkp.template_version,
    };

    const envelope: EncryptedTemplateEnvelope = {
      ciphertext: bkp.encrypted_payload,
      encrypted_dek: bkp.encrypted_dek,
      iv: bkp.iv,
      auth_tag: bkp.auth_tag,
      integrity_hash: bkp.integrity_hash,
      algorithm: bkp.encryption_algorithm,
      key_version: bkp.key_version,
      aad_digest: BiometricTemplateCryptoService.constructAAD({
        organizationId: bkp.organization_id,
        employeeId: bkp.employee_id,
        deviceId: bkp.device_id,
        templateType: bkp.template_type,
        templateVersion: bkp.template_version,
      }),
    };

    const verifyResult = BiometricTemplateCryptoService.decryptAndVerify(
      envelope,
      ctx,
      req.restoredBinary,
      req.tamperOptions
    );

    if (!verifyResult.success) {
      await BiometricTemplateAuditService.logEvent({
        organization_id: req.targetOrgId,
        event_type: 'biometric.template.restore_rejected',
        backup_id: req.backupId,
        actor_id: req.requesterId,
        details: `Decryption / Integrity failure: ${verifyResult.reason}`,
      });
      return { success: false, errorCode: verifyResult.errorCode, reason: verifyResult.reason };
    }

    // 5. Restore Success
    const restoredAt = new Date().toISOString();
    bkp.backup_status = 'RESTORED';
    bkp.restored_at = restoredAt;
    bkp.restored_by = req.requesterId;

    await BiometricTemplateAuditService.logEvent({
      organization_id: req.targetOrgId,
      employee_id: bkp.employee_id,
      device_id: req.targetDeviceId,
      event_type: 'biometric.template.restore_completed',
      backup_id: req.backupId,
      actor_id: req.requesterId,
      details: 'Dual-verified template restore successfully deployed to physical device.',
    });

    return { success: true, restoredAt };
  }
}
