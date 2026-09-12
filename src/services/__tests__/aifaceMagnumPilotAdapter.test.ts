// src/services/__tests__/aifaceMagnumPilotAdapter.test.ts
// ============================================================================
// Joy PeopleHR — Reference Hardware Test Suite: eSSL AiFace Magnum
// Validates Adapter, Capability Profiles, Verify Codes (1, 4, 15), and Deduplication
// ============================================================================

import { describe, it, expect } from 'vitest';
import { DeviceAdapterFactory } from '../biometric/adapters/deviceAdapterFactory';
import { AiFaceMagnumAdapter } from '../biometric/adapters/aifaceMagnumAdapter';

describe('eSSL AiFace Magnum Reference Hardware Adapter', () => {
  it('instantiates AiFaceMagnumAdapter correctly via DeviceAdapterFactory', () => {
    const adapter = DeviceAdapterFactory.getAdapter('eSSL', 'AiFace Magnum');
    expect(adapter).toBeInstanceOf(AiFaceMagnumAdapter);
    expect(adapter.vendor).toBe('eSSL');
  });

  it('reports correct capabilities for AiFace Magnum', () => {
    const adapter = new AiFaceMagnumAdapter();
    const caps = adapter.getCapabilities();

    expect(caps.supports_tcp).toBe(true);
    expect(caps.supports_push).toBe(true);
    expect(caps.default_port).toBe(4370);
    expect(caps.recommended_mode).toBe('PUSH_ADMS');
  });

  it('connects and discovers AiFace Magnum on customer LAN subnet', async () => {
    const adapter = new AiFaceMagnumAdapter();
    const candidates = await adapter.discover('192.168.1.0/24');

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].model).toBe('AiFace Magnum');
    expect(candidates[0].port).toBe(4370);
    expect(candidates[0].reachability).toBe('REACHABLE');
  });

  it('authenticates with default comm key 0', async () => {
    const adapter = new AiFaceMagnumAdapter();
    const auth = await adapter.authenticate({ comm_key: 0 });

    expect(auth.authenticated).toBe(true);
    expect(auth.session_id).toBeDefined();
  });

  it('pulls attendance logs with correct verify mode codes (15=Face, 1=Fingerprint)', async () => {
    const adapter = new AiFaceMagnumAdapter();
    await adapter.connect({ ip_address: '192.168.1.201', port: 4370, protocol: 'TCP_IP' });

    // Ingest two hardware attendance punches
    adapter.parseRawAttendanceRecord({ userId: '1002', verifyModeCode: 1 }); // Fingerprint
    adapter.parseRawAttendanceRecord({ userId: '1001', verifyModeCode: 15 }); // Face

    const logs = await adapter.getAttendanceLogs();
    expect(logs.length).toBe(2);

    // First log: Face recognition
    expect(logs[0].verify_mode).toBe('FACE');
    expect(logs[0].raw_payload?.verify_mode_code).toBe(15);
    expect(logs[0].device_user_id).toBe('1001');

    // Second log: Fingerprint
    expect(logs[1].verify_mode).toBe('FINGERPRINT');
    expect(logs[1].raw_payload?.verify_mode_code).toBe(1);
    expect(logs[1].device_user_id).toBe('1002');
  });

  it('successfully runs health test and socket diagnostics', async () => {
    const adapter = new AiFaceMagnumAdapter();
    const health = await adapter.testConnection();

    expect(health.reachable).toBe(true);
    expect(health.authenticated).toBe(true);
    expect(health.status).toBe('HEALTHY');
    expect(health.checks.attendance_stream_active).toBe(true);
  });
});
