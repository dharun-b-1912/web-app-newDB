// ============================================================
// Joy PeopleHR — Universal Biometric Protocol Router (Phase 8.5)
// ============================================================
// Universal Ingress Gateway decoding raw payloads from ZKTeco, ADMS,
// Hikvision, Mantra, and Matrix into normalized tenant punch events.
// ============================================================

import {
  TenantBiometricPunchEvent,
  BiometricVerificationMode,
  BiometricIngressProtocol,
} from './types/biometricSaas.types';
import { BiometricTenantRegistry } from './biometricTenantRegistry';

export class BiometricProtocolRouter {
  /**
   * Decodes ADMS / iClock HTTP Push Form Data (POST /iclock/cdata)
   * Example payload: "1001\t2026-09-02 09:15:32\t0\t1\t0\t0\n1002\t2026-09-02 09:16:01\t0\t1\t0\t0"
   */
  public static decodeAdmsPushPayload(
    serialNumber: string,
    rawPayload: string
  ): TenantBiometricPunchEvent[] {
    const device = BiometricTenantRegistry.getDeviceBySerialNumber(serialNumber);
    if (!device) return [];

    const lines = rawPayload.trim().split(/\r?\n/);
    const punches: TenantBiometricPunchEvent[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      const pin = parts[0] || '1001';
      const timeStr = parts[1] || new Date().toISOString();
      const state = parts[2] || '0'; // 0 = IN, 1 = OUT

      const punchIso = timeStr.includes('T')
        ? timeStr
        : new Date(timeStr.replace(' ', 'T') + '+05:30').toISOString();

      const dedupKey = `${device.organizationId}_${serialNumber}_${pin}_${punchIso}`;

      punches.push({
        punchId: `pch_adms_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        organizationId: device.organizationId,
        companyId: device.companyId,
        branchId: device.branchId,
        deviceId: device.deviceId,
        deviceSerialNumber: serialNumber,
        biometricUserPin: pin,
        punchTimestamp: punchIso,
        receivedAt: new Date().toISOString(),
        verificationMode: 'FINGERPRINT',
        punchDirection: state === '1' ? 'OUT' : 'IN',
        sourceProtocol: 'ADMS_CLOUD_PUSH',
        dedupHash: dedupKey,
        isOfflineBuffer: false,
        status: 'PROCESSED',
        accessGranted: true,
        relayPulseDurationMs: 5000,
      });
    }

    return punches;
  }

  /**
   * Decodes ZKTeco TCP Socket Binary Record (CMD_ATTLOG_RRQ = 500)
   */
  public static decodeZkTecoSocketEvent(
    serialNumber: string,
    record: { userPin: string; timestampIso: string; verifyMode: string; inOutState: string }
  ): TenantBiometricPunchEvent | null {
    const device = BiometricTenantRegistry.getDeviceBySerialNumber(serialNumber);
    if (!device) return null;

    let mode: BiometricVerificationMode = 'FINGERPRINT';
    if (record.verifyMode === 'Face' || record.verifyMode === 'FACIAL') mode = 'FACIAL_RECOGNITION';
    if (record.verifyMode === 'Card' || record.verifyMode === 'RFID') mode = 'RFID_CARD';

    return {
      punchId: `pch_zk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      organizationId: device.organizationId,
      companyId: device.companyId,
      branchId: device.branchId,
      deviceId: device.deviceId,
      deviceSerialNumber: serialNumber,
      biometricUserPin: record.userPin,
      punchTimestamp: record.timestampIso,
      receivedAt: new Date().toISOString(),
      verificationMode: mode,
      punchDirection: record.inOutState === 'CHECK_OUT' ? 'OUT' : 'IN',
      sourceProtocol: 'TCP_SOCKET_4370',
      dedupHash: `${device.organizationId}_${serialNumber}_${record.userPin}_${record.timestampIso}`,
      isOfflineBuffer: false,
      status: 'PROCESSED',
      accessGranted: true,
      relayPulseDurationMs: 5000,
    };
  }

  /**
   * Decodes Hikvision ISAPI Access Event Notification JSON
   */
  public static decodeHikvisionIsapiEvent(
    serialNumber: string,
    isapiPayload: {
      AccessControllerEvent: {
        employeeNoString: string;
        currentVerifyMode: string;
        time: string;
      };
    }
  ): TenantBiometricPunchEvent | null {
    const device = BiometricTenantRegistry.getDeviceBySerialNumber(serialNumber);
    if (!device) return null;

    const event = isapiPayload.AccessControllerEvent;
    const punchIso = new Date(event.time).toISOString();

    return {
      punchId: `pch_hik_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      organizationId: device.organizationId,
      companyId: device.companyId,
      branchId: device.branchId,
      deviceId: device.deviceId,
      deviceSerialNumber: serialNumber,
      biometricUserPin: event.employeeNoString,
      punchTimestamp: punchIso,
      receivedAt: new Date().toISOString(),
      verificationMode: 'FACIAL_RECOGNITION',
      punchDirection: 'AUTO',
      sourceProtocol: 'HIKVISION_ISAPI',
      dedupHash: `${device.organizationId}_${serialNumber}_${event.employeeNoString}_${punchIso}`,
      isOfflineBuffer: false,
      status: 'PROCESSED',
      accessGranted: true,
      relayPulseDurationMs: 3000,
    };
  }

  /**
   * Decodes Mantra MFS100 / MIS100 Web USB & RD Service Capture
   */
  public static decodeMantraCaptureEvent(
    organizationId: string,
    employeeId: string,
    biometricPin: string,
    modality: 'FINGERPRINT' | 'IRIS'
  ): TenantBiometricPunchEvent {
    const timestamp = new Date().toISOString();
    return {
      punchId: `pch_mantra_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      organizationId,
      companyId: 'comp_joy_india',
      branchId: 'branch_bangalore_hq',
      deviceId: 'dev_mantra_usb_client',
      deviceSerialNumber: 'MANTRA-USB-LOCAL',
      biometricUserPin: biometricPin,
      employeeId,
      punchTimestamp: timestamp,
      receivedAt: timestamp,
      verificationMode: modality === 'IRIS' ? 'IRIS' : 'FINGERPRINT',
      punchDirection: 'AUTO',
      sourceProtocol: 'MANTRA_RD_USB',
      dedupHash: `${organizationId}_MANTRA-USB-LOCAL_${biometricPin}_${timestamp}`,
      isOfflineBuffer: false,
      status: 'PROCESSED',
      accessGranted: true,
    };
  }
}
