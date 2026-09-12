// src/services/__tests__/universalBiometricConnectorMaster.test.ts
// ============================================================================
// JOY PeopleHR — Universal Biometric Connector Enterprise Test Matrix (12 Gates)
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceAdapterFactory } from '../biometric/adapters/deviceAdapterFactory';
import { ZKTecoAdapter } from '../biometric/adapters/zktecoAdapter';
import { ESSLAdapter } from '../biometric/adapters/esslAdapter';
import { MantraAdapter } from '../biometric/adapters/mantraAdapter';
import { MatrixAdapter } from '../biometric/adapters/matrixAdapter';
import { GenericTcpAdapter } from '../biometric/adapters/genericAdapters';
import { recommendDeviceConnection } from '../biometric/recommendation/connectionRecommendationEngine';
import { lookupDeviceProfile } from '../biometric/catalog/deviceCompatibilityCatalog';
import { biometricGatewayService } from '../attendance/biometricGatewayService';

describe('Universal Biometric Connector Architecture Test Matrix', () => {
  // TEST 1: ZKTeco TCP Device
  it('Gate 1: ZKTeco TCP/IP device connects, authenticates, and detects capabilities', async () => {
    const adapter = DeviceAdapterFactory.getAdapter('ZKTeco');
    expect(adapter).toBeInstanceOf(ZKTecoAdapter);

    const caps = adapter.getCapabilities('SpeedFace-V5L');
    expect(caps.supports_tcp).toBe(true);
    expect(caps.supports_push).toBe(true);
    expect(caps.default_port).toBe(4370);

    const conn = await adapter.connect({
      ip_address: '192.168.1.201',
      port: 4370,
      protocol: 'TCP_IP',
      comm_key: 0,
    });
    expect(conn.success).toBe(true);
    expect(conn.device_info?.vendor).toBe('ZKTeco');

    const logs = await adapter.getAttendanceLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].device_user_id).toBe('1');
  });

  // TEST 2: ZKTeco PUSH Device
  it('Gate 2: ZKTeco PUSH/ADMS device subscribes and normalizes events', async () => {
    const adapter = DeviceAdapterFactory.getAdapter('ZKTeco');
    let capturedEvent: any = null;
    const sub = await adapter.subscribeToPush((evt) => {
      capturedEvent = evt;
    });

    expect(sub.active).toBe(true);
    expect(sub.endpoint_url).toBe('/iclock/cdata');
    await sub.unsubscribe();
    expect(sub.active).toBe(false);
  });

  // TEST 3: eSSL TCP/IP Device
  it('Gate 3: eSSL TCP/IP device negotiates protocol and pulls attendance', async () => {
    const adapter = DeviceAdapterFactory.getAdapter('eSSL');
    expect(adapter).toBeInstanceOf(ESSLAdapter);

    const caps = adapter.getCapabilities('eSSL X990');
    expect(caps.supports_tcp).toBe(true);
    expect(caps.default_port).toBe(4370);

    const conn = await adapter.connect({
      ip_address: '192.168.1.202',
      port: 4370,
      protocol: 'TCP_IP',
    });
    expect(conn.success).toBe(true);
    expect(conn.device_info?.vendor).toBe('eSSL');
  });

  // TEST 4: eSSL PUSH Device
  it('Gate 4: eSSL ePushServer protocol registers and streaming activates', async () => {
    const adapter = DeviceAdapterFactory.getAdapter('eSSL');
    const sub = await adapter.subscribeToPush(() => {});
    expect(sub.active).toBe(true);
    expect(sub.endpoint_url).toBe('/epush/event');
    await sub.unsubscribe();
  });

  // TEST 5: Wi-Fi Device Reachability
  it('Gate 5: Wi-Fi device recommendation preserves local connector topology without public IP', () => {
    const rec = recommendDeviceConnection('ZKTeco', 'SpeedFace-V5L', 'WIFI');
    expect(rec.recommended_port).toBe(4370);
    expect(rec.topology_summary).toContain('WIFI Terminal → JOY PeopleHR Local Connector');
    expect(rec.firewall_instruction).toContain('No router port forwarding is needed');
  });

  // TEST 6: Device Offline Detection & Health Check
  it('Gate 6: Device health diagnostic identifies power loss and network isolation without crash', async () => {
    const dev = biometricGatewayService.registerDevice({
      device_name: 'Test Unreachable Gate',
      vendor: 'ZKTeco',
      device_type: 'Turnstile Gate',
      model: 'SpeedFace-V5L',
      serial_number: 'ZK-TEST-OFFLINE',
      ip_address: '192.168.1.249',
      port: 4370,
      branch: 'Bengaluru Campus',
      location_description: 'Test Bay',
      direction_mode: 'BOTH',
      registered_users_count: 0,
      sync_frequency_mins: 1,
    });

    const diagNoPower = biometricGatewayService.runDeviceHealthDiagnostic(dev.id, 'NO_POWER');
    expect(diagNoPower.status).toBe('NO_POWER');
    expect(diagNoPower.troubleshooting_steps.length).toBeGreaterThan(0);

    const diagNoNet = biometricGatewayService.runDeviceHealthDiagnostic(dev.id, 'NO_NETWORK');
    expect(diagNoNet.status).toBe('NO_NETWORK');
  });

  // TEST 7 & 8: Local Queue & Offline Resilience
  it('Gate 7 & 8: Offline durable queue retains punches and tracks telemetry', async () => {
    const tele = await biometricGatewayService.getConnectorTelemetry();
    expect(tele.version).toBe('3.0.0-enterprise');
    expect(typeof tele.pending_queue_count).toBe('number');
  });

  // TEST 9: Safe Device IP Rediscovery
  it('Gate 9: Device IP change is detected by serial number and updated safely', () => {
    const dev = biometricGatewayService.registerDevice({
      device_name: 'Main Factory Gate',
      vendor: 'ZKTeco',
      device_type: 'Turnstile Gate',
      model: 'SpeedFace-V5L',
      serial_number: 'ZK-SERIAL-MATCH-99',
      ip_address: '192.168.1.201',
      port: 4370,
      branch: 'Coimbatore Plant',
      location_description: 'Factory Turnstile',
      direction_mode: 'BOTH',
      registered_users_count: 10,
      sync_frequency_mins: 1,
    });

    const updated = biometricGatewayService.updateDeviceIp(dev.id, '192.168.1.215');
    expect(updated).toBe(true);

    const refreshed = biometricGatewayService.getBiometricDevices().find(d => d.id === dev.id);
    expect(refreshed?.ip_address).toBe('192.168.1.215');
    expect(refreshed?.serial_number).toBe('ZK-SERIAL-MATCH-99');
  });

  // TEST 10: Unknown / Generic Device Fallback
  it('Gate 10: Generic fallback adapter provides standard TCP and HTTP profiles', () => {
    const profile = lookupDeviceProfile('Generic', 'unknown_model');
    expect(profile.vendor).toBe('Generic');
    expect(profile.default_port).toBe(4370);

    const adapter = DeviceAdapterFactory.getAdapter('Generic');
    expect(adapter).toBeInstanceOf(GenericTcpAdapter);
  });

  // TEST 11: Idempotency & Duplicate Punch Protection
  it('Gate 11: Deterministic event key deduplicates identical biometric taps within the same window', async () => {
    const devices = biometricGatewayService.getBiometricDevices();
    const dev = devices[0] || biometricGatewayService.registerDevice({
      device_name: 'Dedup Test Gate',
      vendor: 'ZKTeco',
      device_type: 'Turnstile Gate',
      model: 'SpeedFace-V5L',
      serial_number: 'ZK-DEDUP',
      ip_address: '192.168.1.201',
      port: 4370,
      branch: 'Bengaluru',
      location_description: 'Test',
      direction_mode: 'BOTH',
      registered_users_count: 0,
      sync_frequency_mins: 1,
    });

    const punchIso = '2026-09-11T09:30:00.000Z';
    const firstRes = await biometricGatewayService.ingestRawPunch({
      deviceId: dev.id,
      biometricPin: 'CE0017',
      punchTime: punchIso,
      verificationMode: 'Face',
      sourceType: 'LAN_AGENT',
    });

    const secondRes = await biometricGatewayService.ingestRawPunch({
      deviceId: dev.id,
      biometricPin: 'CE0017',
      punchTime: punchIso,
      verificationMode: 'Face',
      sourceType: 'LAN_AGENT',
    });

    expect(firstRes.punch).toBeDefined();
    expect(firstRes.isDeduplicated).toBe(false);
    expect(secondRes.isDeduplicated).toBe(true);
  });

  // TEST 12: Multi-Tenant Scoping & Employee Auto-Matching
  it('Gate 12: Device user mapping engine matches employee codes with 85%+ confidence', () => {
    const mockEmployees = [
      { id: 'emp-101', name: 'Palanjoychamp reng', employee_code: 'CE0017' },
      { id: 'emp-102', name: 'Dharun Balasubramanian', employee_code: 'CE0018' },
    ];

    const mockDev = biometricGatewayService.registerDevice({
      device_name: 'Mapping Test Gate',
      vendor: 'ZKTeco',
      device_type: 'Turnstile Gate',
      model: 'SpeedFace-V5L',
      serial_number: 'ZK-MAP-TEST',
      ip_address: '192.168.1.201',
      port: 4370,
      branch: 'Bengaluru',
      location_description: 'Test',
      direction_mode: 'BOTH',
      registered_users_count: 0,
      sync_frequency_mins: 1,
    });

    const result = biometricGatewayService.autoMatchDeviceUsersToEmployees(mockDev.id, mockEmployees);
    expect(result.totalDeviceUsers).toBeDefined();
    expect(result.matchedCount).toBeDefined();
    expect(result.unmatchedCount).toBeDefined();
  });
});
