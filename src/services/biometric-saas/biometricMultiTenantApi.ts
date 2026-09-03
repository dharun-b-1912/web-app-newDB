// ============================================================
// Joy PeopleHR — Multi-Tenant Biometric SaaS API (Phase 8.5)
// ============================================================
// Authoritative API facade providing multi-tenant hardware registration,
// live diagnostics, user synchronization, and time calibration.
// ============================================================

import {
  MultiTenantBiometricDevice,
  TenantBiometricPunchEvent,
  MultiTenantBiometricUser,
} from './types/biometricSaas.types';
import { BiometricTenantRegistry } from './biometricTenantRegistry';
import { BiometricProtocolRouter } from './biometricProtocolRouter';
import { BiometricUserSyncEngine } from './biometricUserSyncEngine';
import { BiometricOfflineBufferManager } from './biometricOfflineBufferManager';
import { BiometricEdgeAgentGateway } from './biometricEdgeAgentGateway';
import { BiometricAccessControlEngine } from './biometricAccessControlEngine';

export class BiometricMultiTenantApi {
  /**
   * Retrieves all hardware devices for a given enterprise tenant
   */
  public static async getTenantDevices(organizationId: string): Promise<MultiTenantBiometricDevice[]> {
    return BiometricTenantRegistry.getDevicesForTenant(organizationId);
  }

  /**
   * Registers a new physical device under the tenant's account
   */
  public static async registerDevice(device: MultiTenantBiometricDevice): Promise<{ success: boolean }> {
    BiometricTenantRegistry.registerDevice(device);
    return { success: true };
  }

  /**
   * Universal punch ingestion endpoint for ADMS Cloud Push or Webhooks
   */
  public static async ingestAdmsPush(
    serialNumber: string,
    rawPayload: string
  ): Promise<{ processedCount: number; punches: TenantBiometricPunchEvent[] }> {
    const punches = BiometricProtocolRouter.decodeAdmsPushPayload(serialNumber, rawPayload);
    const recon = BiometricOfflineBufferManager.reconcileOfflineBatch(punches);

    // Resolve employee details
    for (const p of punches) {
      const user = BiometricUserSyncEngine.getUserByPin(p.organizationId, p.biometricUserPin);
      if (user) {
        p.employeeId = user.employeeId;
        p.employeeCode = user.employeeCode;
        p.employeeName = user.fullName;
      }
    }

    return { processedCount: recon.processedCount, punches };
  }

  /**
   * Synchronizes cloud NTP time to the physical terminal
   */
  public static async syncDeviceClock(deviceId: string): Promise<{ success: boolean; cloudIsoTime: string }> {
    const now = new Date().toISOString();
    BiometricTenantRegistry.updateHeartbeat(deviceId, 0);
    return { success: true, cloudIsoTime: now };
  }

  /**
   * Enrolls or updates an employee on physical biometric terminals
   */
  public static async syncEmployeeToDevices(user: MultiTenantBiometricUser): Promise<{ success: boolean }> {
    BiometricUserSyncEngine.enrollUser(user);
    return { success: true };
  }
}
