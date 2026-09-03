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
    if (this.devices.size > 0) return;

    const initialDevices: MultiTenantBiometricDevice[] = [
      {
        deviceId: 'dev_zk_blr_01',
        organizationId: 'org_enterprise_demo',
        companyId: 'comp_joy_india',
        branchId: 'branch_bangalore_hq',
        workLocationId: 'loc_koramangala_tech_park',
        deviceName: 'HQ Main Entrance Face & Fingerprint',
        vendor: 'ZKTECO',
        model: 'uFace800 Plus',
        serialNumber: 'ZK-BLR-8492019',
        macAddress: '00:17:61:A2:44:81',
        ipAddress: '192.168.1.120',
        port: 4370,
        protocol: 'TCP_SOCKET_4370',
        pairingKey: 'PAIR-JOY-ZK8492-BLR',
        deviceSecretHash: 'sha256_sec_zk8492019_blr_hq_prod',
        firmwareVersion: 'Ver 8.4.3 (Build 20260612)',
        status: 'ONLINE',
        lastHeartbeatAt: new Date(Date.now() - 4000).toISOString(),
        lastPunchReceivedAt: new Date(Date.now() - 45000).toISOString(),
        registeredUsersCount: 1240,
        maxUserCapacity: 5000,
        logCount: 84200,
        maxLogCapacity: 100000,
        clockDriftSeconds: 1,
        directionMode: 'AUTO_BI_DIRECTIONAL',
        edgeAgentId: 'edge_agent_blr_hq_01',
        relayAccessEnabled: true,
        tamperAlarmArmed: true,
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      },
      {
        deviceId: 'dev_essl_hyd_01',
        organizationId: 'org_enterprise_demo',
        companyId: 'comp_joy_india',
        branchId: 'branch_hyderabad_office',
        workLocationId: 'loc_hitec_city_tower_b',
        deviceName: 'Hyderabad Turnstile SpeedGate',
        vendor: 'ESSL',
        model: 'SilkBio-101TC',
        serialNumber: 'ESSL-HYD-992104',
        macAddress: '00:17:61:B3:99:12',
        ipAddress: '10.0.4.55',
        port: 80,
        protocol: 'ADMS_CLOUD_PUSH',
        pairingKey: 'PAIR-JOY-ESSL9921-HYD',
        deviceSecretHash: 'sha256_sec_essl992104_hyd_prod',
        firmwareVersion: 'Ver 7.2.1 (ADMS Cloud)',
        status: 'ONLINE',
        lastHeartbeatAt: new Date(Date.now() - 8000).toISOString(),
        lastPunchReceivedAt: new Date(Date.now() - 120000).toISOString(),
        registeredUsersCount: 480,
        maxUserCapacity: 3000,
        logCount: 32000,
        maxLogCapacity: 50000,
        clockDriftSeconds: 0,
        directionMode: 'IN_ONLY',
        edgeAgentId: 'edge_agent_hyd_01',
        relayAccessEnabled: true,
        tamperAlarmArmed: true,
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
      {
        deviceId: 'dev_hik_mum_01',
        organizationId: 'org_enterprise_demo',
        companyId: 'comp_joy_india',
        branchId: 'branch_mumbai_finance',
        workLocationId: 'loc_bkc_diamond_square',
        deviceName: 'Mumbai BKC Facial Recognition Kiosk',
        vendor: 'HIKVISION',
        model: 'DS-K1T671MF',
        serialNumber: 'HIK-MUM-440192',
        macAddress: '54:C8:0F:77:E2:10',
        ipAddress: '172.16.2.80',
        port: 8000,
        protocol: 'HIKVISION_ISAPI',
        pairingKey: 'PAIR-JOY-HIK4401-MUM',
        deviceSecretHash: 'sha256_sec_hik440192_mum_prod',
        firmwareVersion: 'V3.2.30_build260401',
        status: 'ONLINE',
        lastHeartbeatAt: new Date(Date.now() - 2000).toISOString(),
        lastPunchReceivedAt: new Date(Date.now() - 15000).toISOString(),
        registeredUsersCount: 320,
        maxUserCapacity: 50000,
        logCount: 14200,
        maxLogCapacity: 100000,
        clockDriftSeconds: 0,
        directionMode: 'AUTO_BI_DIRECTIONAL',
        edgeAgentId: 'edge_agent_mum_01',
        relayAccessEnabled: true,
        tamperAlarmArmed: true,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ];

    for (const dev of initialDevices) {
      this.devices.set(dev.deviceId, dev);
    }
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
