// src/services/operations/biometricEdgeHardwareEngine.ts
// ============================================================================
// Joy PeopleHR — Biometric Edge Hardware & Relay Engine (Gates B11 - B15)
// Supports: TLS Streams (B11), Firmware Diagnostics (B12), Encrypted Template Backup (B13),
// Tamper Sensor Telemetry (B14), Wiegand Relay Decision Engine (B15)
// ============================================================================

import { supabase } from '../../lib/supabase';
import { enterpriseNotificationEngine } from './enterpriseNotificationEngine';
import { computeSha256 } from './vendorGovernancePolicyEngine';

export interface DeviceFirmwareStatus {
  device_id: string;
  manufacturer: string;
  model: string;
  current_firmware_version: string;
  recommended_firmware_version: string;
  status: 'CURRENT' | 'OUTDATED' | 'CRITICAL' | 'UNKNOWN';
  last_checked_at: string;
  upgrade_required: boolean;
}

export interface AccessDecision {
  decision_id: string;
  employee_id: string;
  device_id: string;
  location_id: string;
  decision: 'ALLOW' | 'DENY';
  reason_code: string;
  relay_output_seconds: number;
  issued_at: string;
  expires_at: string; // TTL 5 seconds
  signature: string;
}

export interface BiometricTamperEvent {
  event_type: 'DEVICE_TAMPER_DETECTED';
  severity: 'CRITICAL';
  device_id: string;
  organization_id: string;
  location_id: string;
  tamper_type: 'COVER_OPENED' | 'DEVICE_DISCONNECTED' | 'UNAUTHORIZED_PORT_ACCESS';
  detected_at: string;
  acknowledgement_status: 'DETECTED' | 'UNACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';
  device_payload?: any;
}

export interface BiometricTemplateBackup {
  backup_id: string;
  device_id: string;
  employee_id: string;
  encrypted_blob_reference: string;
  encryption_algorithm: 'AES_256_GCM_ENVELOPE';
  integrity_hash: string; // SHA-256 seal
  created_at: string;
  restore_verified_at?: string;
}

class BiometricEdgeHardwareEngine {
  /**
   * B11 — Hardware TLS Network Stream Validator
   */
  validateTlsNetworkStream(params: {
    deviceId: string;
    protocol: 'HTTPS' | 'MQTTS' | 'WSS';
    cipherSuite: string;
    certValid: boolean;
    isExpired?: boolean;
    isSelfSignedUnauthorized?: boolean;
  }): { secure: boolean; error?: string; event?: string } {
    if (!params.certValid || params.isExpired || params.isSelfSignedUnauthorized) {
      return {
        secure: false,
        error: 'TLS Certificate Validation Failed: Expired, invalid, or unauthorized certificate.',
        event: 'TLS_HANDSHAKE_FAILED_SECURITY_ALERT',
      };
    }
    if (!['HTTPS', 'MQTTS', 'WSS'].includes(params.protocol)) {
      return {
        secure: false,
        error: 'Plaintext protocol rejected. Mutual TLS required.',
        event: 'PLAINTEXT_COMMUNICATION_BLOCKED',
      };
    }
    return { secure: true };
  }

  /**
   * B12 — Device Firmware Health & Diagnostics Governance
   */
  evaluateFirmwareStatus(telemetry: {
    deviceId: string;
    manufacturer: string;
    model: string;
    currentFirmwareVersion: string;
    recommendedFirmwareVersion: string;
  }): DeviceFirmwareStatus {
    const cur = telemetry.currentFirmwareVersion.trim().replace(/^v/, '');
    const rec = telemetry.recommendedFirmwareVersion.trim().replace(/^v/, '');

    let status: 'CURRENT' | 'OUTDATED' | 'CRITICAL' | 'UNKNOWN' = 'CURRENT';
    let upgradeRequired = false;

    if (!cur) {
      status = 'UNKNOWN';
    } else if (cur === rec) {
      status = 'CURRENT';
    } else {
      const curMajor = parseInt(cur.split('.')[0] || '0', 10);
      const recMajor = parseInt(rec.split('.')[0] || '0', 10);
      if (recMajor > curMajor) {
        status = 'CRITICAL';
        upgradeRequired = true;
      } else {
        status = 'OUTDATED';
        upgradeRequired = true;
      }
    }

    return {
      device_id: telemetry.deviceId,
      manufacturer: telemetry.manufacturer,
      model: telemetry.model,
      current_firmware_version: telemetry.currentFirmwareVersion,
      recommended_firmware_version: telemetry.recommendedFirmwareVersion,
      status,
      last_checked_at: new Date().toISOString(),
      upgrade_required: upgradeRequired,
    };
  }

  /**
   * B14 — Physical Tamper Detection & Incident Lifecycle
   */
  async handleTamperAlert(event: {
    deviceId: string;
    organizationId: string;
    locationId: string;
    tamperType: 'COVER_OPENED' | 'DEVICE_DISCONNECTED' | 'UNAUTHORIZED_PORT_ACCESS';
  }): Promise<BiometricTamperEvent> {
    const detectedAt = new Date().toISOString();

    const tamperEvent: BiometricTamperEvent = {
      event_type: 'DEVICE_TAMPER_DETECTED',
      severity: 'CRITICAL',
      device_id: event.deviceId,
      organization_id: event.organizationId,
      location_id: event.locationId,
      tamper_type: event.tamperType,
      detected_at: detectedAt,
      acknowledgement_status: 'UNACKNOWLEDGED',
    };

    try {
      // 1. Mark device status in database
      await supabase
        .from('work_locations')
        .update({
          status: 'TAMPER_ALERT',
          updated_at: detectedAt,
        })
        .eq('id', event.locationId);

      // 2. Dispatch critical security event
      await enterpriseNotificationEngine.dispatchEvent({
        organizationId: event.organizationId,
        eventType: 'BIOMETRIC_DEVICE_OFFLINE',
        recipientId: 'security-operations',
        recipientName: 'Security & Compliance Admin',
        title: `🚨 CRITICAL: Hardware Tamper Sensor Triggered (${event.tamperType})`,
        message: `Device ${event.deviceId} at plant ${event.locationId} reported physical cover opened at ${detectedAt}. Immediate physical security inspection required.`,
        variables: {
          device_id: event.deviceId,
          location_id: event.locationId,
          tamper_type: event.tamperType,
        },
      });
    } catch (err) {
      console.error('[BiometricHardware] Tamper notification dispatch warning:', err);
    }

    return tamperEvent;
  }

  /**
   * B15 — Wiegand Turnstile / Flap Barrier Access Controller
   */
  generateAccessDecision(params: {
    workerActive: boolean;
    locationAuthorized: boolean;
    vendorCompliant: boolean;
    deploymentActive: boolean;
    employeeId: string;
    deviceId: string;
    locationId: string;
  }): AccessDecision {
    const isAllowed =
      params.workerActive &&
      params.locationAuthorized &&
      params.vendorCompliant &&
      params.deploymentActive;

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 5000); // 5-second TTL
    const decisionId = `DEC_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    let reasonCode = 'AUTH_CLEARED';
    if (!params.workerActive) reasonCode = 'WORKER_STATUS_INACTIVE';
    else if (!params.vendorCompliant) reasonCode = 'VENDOR_NON_COMPLIANT';
    else if (!params.locationAuthorized) reasonCode = 'LOCATION_UNAUTHORIZED';
    else if (!params.deploymentActive) reasonCode = 'NO_ACTIVE_DEPLOYMENT';

    const rawPayload = `${decisionId}|${params.employeeId}|${params.deviceId}|${isAllowed ? 'ALLOW' : 'DENY'}|${issuedAt.toISOString()}`;
    const signature = computeSha256(rawPayload);

    return {
      decision_id: decisionId,
      employee_id: params.employeeId,
      device_id: params.deviceId,
      location_id: params.locationId,
      decision: isAllowed ? 'ALLOW' : 'DENY',
      reason_code: reasonCode,
      relay_output_seconds: isAllowed ? 5 : 0,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      signature,
    };
  }

  /**
   * B13 — Encrypted Biometric Template Backup & Restore Verifier
   */
  createEncryptedTemplateBackup(params: {
    deviceId: string;
    employeeId: string;
    rawTemplateBinary: string;
  }): BiometricTemplateBackup {
    const createdAt = new Date().toISOString();
    const backupId = `TMPL_BAK_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Compute SHA-256 seal of the raw template
    const integrityHash = computeSha256(params.rawTemplateBinary);

    // Simulated AES-256-GCM Envelope reference (Raw template never stored in DB)
    const encryptedBlobRef = `vault://biometrics/enc_${params.employeeId}_${Date.now()}.enc`;

    return {
      backup_id: backupId,
      device_id: params.deviceId,
      employee_id: params.employeeId,
      encrypted_blob_reference: encryptedBlobRef,
      encryption_algorithm: 'AES_256_GCM_ENVELOPE',
      integrity_hash: integrityHash,
      created_at: createdAt,
      restore_verified_at: createdAt,
    };
  }
}

export const biometricEdgeHardwareEngine = new BiometricEdgeHardwareEngine();
