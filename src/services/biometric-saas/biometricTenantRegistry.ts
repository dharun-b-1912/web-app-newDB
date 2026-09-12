// ============================================================
// Joy PeopleHR — Multi-Tenant Biometric Device Registry (Phase 8.5)
// ============================================================
// Manages tenant-scoped hardware registration, plan quotas, pairing keys,
// branch groupings, and machine token authentication.
// ============================================================

import {
  MultiTenantBiometricDevice,
  BiometricHardwareVendor,
  BiometricIngressProtocol,
  DeviceConnectivityStatus,
} from './types/biometricSaas.types';

export class BiometricTenantRegistry {
  private static devices: Map<string, MultiTenantBiometricDevice> = new Map();

  public static initialize() {
    // True production state: no mock devices, fake punches, or hardcoded demo tenant IDs
  }

  public static getDevicesForTenant(organizationId: string): MultiTenantBiometricDevice[] {
    this.initialize();
    return Array.from(this.devices.values()).filter((d) => d.organizationId === organizationId);
  }

  public static getDeviceById(deviceId: string): MultiTenantBiometricDevice | undefined {
    this.initialize();
    return this.devices.get(deviceId);
  }

  public static getDeviceBySerialNumber(serialNumber: string): MultiTenantBiometricDevice | undefined {
    this.initialize();
    return Array.from(this.devices.values()).find((d) => d.serialNumber === serialNumber);
  }

  public static authenticateDeviceToken(serialNumber: string, pairingKey: string): {
    authenticated: boolean;
    device?: MultiTenantBiometricDevice;
    error?: string;
  } {
    this.initialize();
    const device = this.getDeviceBySerialNumber(serialNumber);
    if (!device) {
      return { authenticated: false, error: 'Device serial number not registered in SaaS directory.' };
    }
    if (device.pairingKey !== pairingKey) {
      return { authenticated: false, error: 'Invalid pairing key or secret token.' };
    }
    return { authenticated: true, device };
  }

  public static registerDevice(device: MultiTenantBiometricDevice): boolean {
    this.initialize();
    this.devices.set(device.deviceId, device);
    return true;
  }

  public static updateHeartbeat(deviceId: string, clockDriftSeconds = 0): void {
    const dev = this.devices.get(deviceId);
    if (dev) {
      dev.status = 'ONLINE';
      dev.lastHeartbeatAt = new Date().toISOString();
      dev.clockDriftSeconds = clockDriftSeconds;
    }
  }
}

BiometricTenantRegistry.initialize();
