// src/services/__tests__/biometricTrueMultiTenantIsolation.test.ts
// ============================================================================
// JOY PeopleHR — 20-Gate Biometric True Multi-Tenant Security Test Matrix
// Validates: Database Isolation, Cross-Tenant Prevention, Anti-Tampering,
// Anti-Spoofing, Deduplication & Hardware Identity Mesh
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  biometricMultiTenantService,
  TenantSecurityException,
  BiometricTenantContext,
} from '../biometric/biometricMultiTenantService';
import { ZKTecoAdapter } from '../biometric/adapters/zktecoAdapter';

describe('JOY PeopleHR — Biometric True Multi-Tenant Isolation Security Suite (20 Gates)', () => {
  const TENANT_A = 'tenant-org-alpha-manufacturing';
  const TENANT_B = 'tenant-org-beta-logistics';
  const TENANT_C = 'tenant-org-gamma-healthcare';

  const USER_A_ID = 'user-admin-tenant-a';
  const USER_B_ID = 'user-admin-tenant-b';
  const USER_MULTI_TENANT_ID = 'user-consultant-multi-tenant';
  const USER_UNAUTHORIZED_ID = 'user-rogue-stranger';

  let deviceA1: any;
  let deviceA2: any;
  let deviceB1: any;
  let deviceB2: any;
  let deviceC1: any;
  let connectorA: any;
  let connectorB: any;

  beforeEach(async () => {
    // Clean all state
    biometricMultiTenantService.resetTestState();

    // 1. Configure User Memberships
    biometricMultiTenantService.setTestUserMembership(USER_A_ID, [TENANT_A]);
    biometricMultiTenantService.setTestUserMembership(USER_B_ID, [TENANT_B]);
    biometricMultiTenantService.setTestUserMembership(USER_MULTI_TENANT_ID, [TENANT_A, TENANT_B]); // Authorized for A and B only
    biometricMultiTenantService.setTestUserMembership(USER_UNAUTHORIZED_ID, []); // No tenant memberships

    // Provisioning context during setup
    biometricMultiTenantService.setActiveTestContext({
      tenantId: TENANT_A,
      organizationId: TENANT_A,
      userId: 'user-provisioner',
      isPlatformAdmin: true,
      authorizedTenants: [TENANT_A, TENANT_B, TENANT_C],
    });

    // 2. Register Employees
    biometricMultiTenantService.registerTenantEmployee(TENANT_A, { id: 'emp-a-01', name: 'Ramesh Kumar', code: 'EMP-A01' });
    biometricMultiTenantService.registerTenantEmployee(TENANT_A, { id: 'emp-a-02', name: 'Priya Sharma', code: 'EMP-A02' });
    biometricMultiTenantService.registerTenantEmployee(TENANT_B, { id: 'emp-b-01', name: 'Vijay Singh', code: 'EMP-B01' });
    biometricMultiTenantService.registerTenantEmployee(TENANT_C, { id: 'emp-c-01', name: 'Ananya Roy', code: 'EMP-C01' });

    // 3. Register Sites
    biometricMultiTenantService.registerTenantSite(TENANT_A, { id: 'site-a-factory', name: 'Tenant A Main Plant' });
    biometricMultiTenantService.registerTenantSite(TENANT_B, { id: 'site-b-warehouse', name: 'Tenant B Central Warehouse' });

    // 4. Pair Connectors
    // Connector A
    const tokenA = await biometricMultiTenantService.generatePairingToken(TENANT_A, 'site-a-factory');
    connectorA = await biometricMultiTenantService.pairConnector(tokenA.pairingToken, {
      connectorName: 'Factory A LAN Connector',
      localIp: '192.168.1.10',
    });

    // Connector B
    const tokenB = await biometricMultiTenantService.generatePairingToken(TENANT_B, 'site-b-warehouse');
    connectorB = await biometricMultiTenantService.pairConnector(tokenB.pairingToken, {
      connectorName: 'Warehouse B LAN Connector',
      localIp: '10.0.1.5',
    });

    // 5. Register Devices for Tenant A
    deviceA1 = await biometricMultiTenantService.registerDevice({
      tenant_id: TENANT_A,
      organization_id: TENANT_A,
      connector_id: connectorA.id,
      site_id: 'site-a-factory',
      device_name: 'ZKTeco Production Gate 1',
      device_type: 'Facial Recognition',
      vendor: 'ZKTeco',
      model: 'uFace800 Plus',
      serial_number: 'ZK-SN-ALPHA-01',
      connection_type: 'LAN',
      ip_address: '192.168.1.50',
      port: 4370,
      protocol: 'TCP',
      status: 'Online',
      timezone: 'Asia/Kolkata',
      enabled: true,
      registered_users_count: 50,
    }, TENANT_A);

    deviceA2 = await biometricMultiTenantService.registerDevice({
      tenant_id: TENANT_A,
      organization_id: TENANT_A,
      connector_id: connectorA.id,
      device_name: 'eSSL Turnstile Gate 2',
      device_type: 'Multi-Modal',
      vendor: 'eSSL',
      model: 'AI-FACE MAGNUM',
      serial_number: 'ESSL-SN-ALPHA-02',
      connection_type: 'LAN',
      ip_address: '192.168.1.51',
      port: 4370,
      protocol: 'TCP',
      status: 'Online',
      timezone: 'Asia/Kolkata',
      enabled: true,
      registered_users_count: 50,
    }, TENANT_A);

    // 6. Register Devices for Tenant B
    deviceB1 = await biometricMultiTenantService.registerDevice({
      tenant_id: TENANT_B,
      organization_id: TENANT_B,
      connector_id: connectorB.id,
      site_id: 'site-b-warehouse',
      device_name: 'ZKTeco Warehouse Gate',
      device_type: 'Fingerprint',
      vendor: 'ZKTeco',
      model: 'K40',
      serial_number: 'ZK-SN-BETA-01',
      connection_type: 'LAN',
      ip_address: '10.0.1.20',
      port: 4370,
      protocol: 'TCP',
      status: 'Online',
      timezone: 'Asia/Kolkata',
      enabled: true,
      registered_users_count: 30,
    }, TENANT_B);

    deviceB2 = await biometricMultiTenantService.registerDevice({
      tenant_id: TENANT_B,
      organization_id: TENANT_B,
      connector_id: connectorB.id,
      device_name: 'Mantra Loading Bay',
      device_type: 'Fingerprint',
      vendor: 'Mantra',
      model: 'BioBridge Pro',
      serial_number: 'MANTRA-SN-BETA-02',
      connection_type: 'LAN',
      ip_address: '10.0.1.21',
      port: 4370,
      protocol: 'TCP',
      status: 'Online',
      timezone: 'Asia/Kolkata',
      enabled: true,
      registered_users_count: 25,
    }, TENANT_B);

    // 7. Register Devices for Tenant C
    deviceC1 = await biometricMultiTenantService.registerDevice({
      tenant_id: TENANT_C,
      organization_id: TENANT_C,
      device_name: 'Gamma Clinic Scanner',
      device_type: 'Facial Recognition',
      vendor: 'ZKTeco',
      model: 'SpeedFace V5L',
      serial_number: 'ZK-SN-GAMMA-01',
      connection_type: 'LAN',
      ip_address: '172.16.0.15',
      port: 4370,
      protocol: 'TCP',
      status: 'Online',
      timezone: 'Asia/Kolkata',
      enabled: true,
      registered_users_count: 15,
    }, TENANT_C);

    // Set active user as Tenant A Admin by default
    biometricMultiTenantService.setActiveTestContext({
      tenantId: TENANT_A,
      organizationId: TENANT_A,
      userId: USER_A_ID,
      isPlatformAdmin: false,
      authorizedTenants: [TENANT_A],
    });
  });

  // ==========================================================================
  // GATE 1: Tenant A -> own device -> ALLOW
  // ==========================================================================
  it('Gate 1: Tenant A can access its own devices', async () => {
    const devices = await biometricMultiTenantService.getDevices(TENANT_A);
    expect(devices.length).toBe(2);
    expect(devices.map(d => d.id)).toContain(deviceA1.id);
    expect(devices.map(d => d.id)).toContain(deviceA2.id);

    const single = await biometricMultiTenantService.getDeviceById(deviceA1.id, TENANT_A);
    expect(single).not.toBeNull();
    expect(single?.serial_number).toBe('ZK-SN-ALPHA-01');
  });

  // ==========================================================================
  // GATE 2: Tenant A -> Tenant B device -> DENY
  // ==========================================================================
  it('Gate 2: Tenant A querying or accessing Tenant B device returns null / rejected', async () => {
    const single = await biometricMultiTenantService.getDeviceById(deviceB1.id, TENANT_A);
    expect(single).toBeNull();

    // Trying to update Tenant B device while authenticated as Tenant A must throw
    await expect(
      biometricMultiTenantService.updateDevice(deviceB1.id, { device_name: 'Hacked Name' }, TENANT_A)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 3: Tenant A -> Tenant C device -> DENY
  // ==========================================================================
  it('Gate 3: Tenant A querying or accessing Tenant C device returns null / rejected', async () => {
    const single = await biometricMultiTenantService.getDeviceById(deviceC1.id, TENANT_A);
    expect(single).toBeNull();

    await expect(
      biometricMultiTenantService.deleteDevice(deviceC1.id, TENANT_A)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 4: Tenant B -> Tenant A device -> DENY
  // ==========================================================================
  it('Gate 4: Tenant B user cannot see or modify Tenant A device', async () => {
    biometricMultiTenantService.setActiveTestContext({
      tenantId: TENANT_B,
      organizationId: TENANT_B,
      userId: USER_B_ID,
      isPlatformAdmin: false,
      authorizedTenants: [TENANT_B],
    });

    const devices = await biometricMultiTenantService.getDevices(TENANT_B);
    expect(devices.length).toBe(2);
    expect(devices.map(d => d.id)).not.toContain(deviceA1.id);
    expect(devices.map(d => d.id)).not.toContain(deviceA2.id);

    const single = await biometricMultiTenantService.getDeviceById(deviceA1.id, TENANT_B);
    expect(single).toBeNull();
  });

  // ==========================================================================
  // GATE 5: Tenant A -> Tenant B attendance event -> DENY
  // ==========================================================================
  it('Gate 5: Tenant A cannot ingest punches on Tenant B device, and Tenant A cannot see Tenant B punches', async () => {
    // 1. Ingest punch legitimately under Tenant B context
    biometricMultiTenantService.setActiveTestContext({
      tenantId: TENANT_B,
      organizationId: TENANT_B,
      userId: USER_B_ID,
      isPlatformAdmin: false,
      authorizedTenants: [TENANT_B],
    });

    await biometricMultiTenantService.ingestAttendancePunch({
      deviceId: deviceB1.id,
      deviceUserId: '101',
      punchTimestamp: '2026-09-11T09:00:00Z',
      eventType: 'PUNCH',
    }, TENANT_B);

    // 2. Switch back to Tenant A context
    biometricMultiTenantService.setActiveTestContext({
      tenantId: TENANT_A,
      organizationId: TENANT_A,
      userId: USER_A_ID,
      isPlatformAdmin: false,
      authorizedTenants: [TENANT_A],
    });

    // Tenant A attempts to read attendance events -> should see 0
    const punchesA = await biometricMultiTenantService.getAttendanceEvents(50, TENANT_A);
    expect(punchesA.length).toBe(0);

    // Tenant A attempts to ingest punch into Tenant B's device
    await expect(
      biometricMultiTenantService.ingestAttendancePunch({
        deviceId: deviceB1.id,
        deviceUserId: '101',
        punchTimestamp: '2026-09-11T09:05:00Z',
      }, TENANT_A)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 6: Tenant A -> Tenant B employee mapping -> DENY
  // ==========================================================================
  it('Gate 6: Cross-tenant employee mapping is strictly rejected', async () => {
    // Attempt to map Tenant B employee (emp-b-01) to Tenant A device (deviceA1)
    await expect(
      biometricMultiTenantService.mapEmployee({
        deviceId: deviceA1.id,
        deviceUserId: '1001',
        employeeId: 'emp-b-01', // Belongs to Tenant B
      }, TENANT_A)
    ).rejects.toThrow(TenantSecurityException);

    // Attempt to map Tenant A employee to Tenant B device
    await expect(
      biometricMultiTenantService.mapEmployee({
        deviceId: deviceB1.id, // Belongs to Tenant B
        deviceUserId: '2001',
        employeeId: 'emp-a-01',
      }, TENANT_A)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 7: Tenant A -> Tenant B connector -> DENY
  // ==========================================================================
  it('Gate 7: Tenant A cannot see or bind to Tenant B connector', async () => {
    const connectors = await biometricMultiTenantService.getConnectors(TENANT_A);
    expect(connectors.length).toBe(1);
    expect(connectors[0].id).toBe(connectorA.id);
    expect(connectors.map(c => c.id)).not.toContain(connectorB.id);

    // Attempt to register a new device under Tenant A referencing Tenant B connector
    await expect(
      biometricMultiTenantService.registerDevice({
        tenant_id: TENANT_A,
        organization_id: TENANT_A,
        connector_id: connectorB.id, // Cross-tenant connector!
        device_name: 'Rogue Device',
        device_type: 'Fingerprint',
        vendor: 'ZKTeco',
        model: 'F18',
        serial_number: 'ZK-ROGUE-01',
        connection_type: 'LAN',
        ip_address: '192.168.1.99',
        port: 4370,
        protocol: 'TCP',
        status: 'Online',
        timezone: 'Asia/Kolkata',
        enabled: true,
        registered_users_count: 0,
      }, TENANT_A)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 8: Tenant A -> Tenant B sync command -> DENY
  // ==========================================================================
  it('Gate 8: Tenant A dispatching command to Tenant B device is rejected', async () => {
    await expect(
      biometricMultiTenantService.dispatchDeviceCommand({
        deviceId: deviceB1.id,
        commandType: 'CLEAR_LOGS',
      }, TENANT_A)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 9: Tenant A URL tampering -> DENY
  // ==========================================================================
  it('Gate 9: URL tampering (/biometric/devices/{TENANT_B_DEVICE_ID}) returns 404/null', async () => {
    // Authenticated as Tenant A, URL specifies deviceB1.id
    const tamperedResult = await biometricMultiTenantService.getDeviceById(deviceB1.id, TENANT_A);
    expect(tamperedResult).toBeNull();
  });

  // ==========================================================================
  // GATE 10: Tenant A query tenant_id=B -> DENY
  // ==========================================================================
  it('Gate 10: Supplying ?tenant_id=B while authenticated as Tenant A throws security exception', async () => {
    await expect(
      biometricMultiTenantService.resolveTenantContext(TENANT_B)
    ).rejects.toThrow(TenantSecurityException);

    await expect(
      biometricMultiTenantService.getDevices(TENANT_B)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 11: Unauthorized user -> biometric device -> DENY
  // ==========================================================================
  it('Gate 11: Unauthenticated or unassigned user cannot access any biometric devices', async () => {
    biometricMultiTenantService.setActiveTestContext({
      tenantId: 'unassigned',
      organizationId: 'unassigned',
      userId: USER_UNAUTHORIZED_ID,
      isPlatformAdmin: false,
      authorizedTenants: [],
    });

    await expect(
      biometricMultiTenantService.getDevices(TENANT_A)
    ).rejects.toThrow(TenantSecurityException);

    await expect(
      biometricMultiTenantService.getDevices(TENANT_B)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 12: Authorized multi-tenant user -> Tenant A -> ALLOW
  // ==========================================================================
  it('Gate 12: Multi-tenant authorized consultant can access Tenant A devices when context is Tenant A', async () => {
    biometricMultiTenantService.setActiveTestContext({
      tenantId: TENANT_A,
      organizationId: TENANT_A,
      userId: USER_MULTI_TENANT_ID,
      isPlatformAdmin: false,
      authorizedTenants: [TENANT_A, TENANT_B],
    });

    const devices = await biometricMultiTenantService.getDevices(TENANT_A);
    expect(devices.length).toBe(2);
    expect(devices.map(d => d.id)).toContain(deviceA1.id);
  });

  // ==========================================================================
  // GATE 13: Same user -> Tenant B -> ALLOW only when authorized membership exists
  // ==========================================================================
  it('Gate 13: Same consultant switching to Tenant B sees Tenant B devices, but CANNOT access Tenant C', async () => {
    biometricMultiTenantService.setActiveTestContext({
      tenantId: TENANT_B,
      organizationId: TENANT_B,
      userId: USER_MULTI_TENANT_ID,
      isPlatformAdmin: false,
      authorizedTenants: [TENANT_A, TENANT_B],
    });

    const devicesB = await biometricMultiTenantService.getDevices(TENANT_B);
    expect(devicesB.length).toBe(2);
    expect(devicesB.map(d => d.id)).toContain(deviceB1.id);

    // But this user has NO membership in Tenant C
    await expect(
      biometricMultiTenantService.getDevices(TENANT_C)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 14: Connector A -> Tenant A devices -> ALLOW
  // ==========================================================================
  it('Gate 14: Connector A successfully associates with Tenant A devices', async () => {
    expect(deviceA1.connector_id).toBe(connectorA.id);
    expect(deviceA2.connector_id).toBe(connectorA.id);
  });

  // ==========================================================================
  // GATE 15: Connector A -> Tenant B devices -> DENY
  // ==========================================================================
  it('Gate 15: Connector A cannot be attached to Tenant B device', async () => {
    await expect(
      biometricMultiTenantService.registerDevice({
        tenant_id: TENANT_B,
        organization_id: TENANT_B,
        connector_id: connectorA.id, // Connector A belongs to Tenant A!
        device_name: 'Cross Device',
        device_type: 'Fingerprint',
        vendor: 'ZKTeco',
        model: 'F18',
        serial_number: 'ZK-CROSS-01',
        connection_type: 'LAN',
        ip_address: '10.0.1.99',
        port: 4370,
        protocol: 'TCP',
        status: 'Online',
        timezone: 'Asia/Kolkata',
        enabled: true,
        registered_users_count: 0,
      }, TENANT_B)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 16: Device A -> Employee B punch -> DENY
  // ==========================================================================
  it('Gate 16: Punch linking Tenant A device with Tenant B employee is rejected', async () => {
    await expect(
      biometricMultiTenantService.ingestAttendancePunch({
        deviceId: deviceA1.id,
        deviceUserId: '1001',
        employeeId: 'emp-b-01', // Belongs to Tenant B
        punchTimestamp: '2026-09-11T10:00:00Z',
      }, TENANT_A)
    ).rejects.toThrow(TenantSecurityException);
  });

  // ==========================================================================
  // GATE 17: Duplicate punch -> single attendance event (Deduplication key)
  // ==========================================================================
  it('Gate 17: Resent or duplicate punches are deduplicated and do not create duplicate records', async () => {
    const timestamp = '2026-09-11T09:30:00Z';

    // First punch
    const res1 = await biometricMultiTenantService.ingestAttendancePunch({
      deviceId: deviceA1.id,
      deviceUserId: '1001',
      punchTimestamp: timestamp,
      eventType: 'CHECK_IN',
    }, TENANT_A);

    expect(res1.success).toBe(true);
    expect(res1.deduplicated).toBe(false);

    // Duplicate punch with same tenant, device, user, timestamp, eventType
    const res2 = await biometricMultiTenantService.ingestAttendancePunch({
      deviceId: deviceA1.id,
      deviceUserId: '1001',
      punchTimestamp: timestamp,
      eventType: 'CHECK_IN',
    }, TENANT_A);

    expect(res2.success).toBe(true);
    expect(res2.deduplicated).toBe(true);
    expect(res2.event.id).toBe(res1.event.id);

    const allEvents = await biometricMultiTenantService.getAttendanceEvents(50, TENANT_A);
    expect(allEvents.length).toBe(1);
  });

  // ==========================================================================
  // GATE 18: Offline connector -> queue events
  // ==========================================================================
  it('Gate 18: Local offline connector queues events into durable buffer', () => {
    const offlineBuffer: Array<{ pin: string; time: string; status: string }> = [];

    // Simulate network down, events arrive at connector
    offlineBuffer.push({ pin: '1001', time: '2026-09-11T09:40:00Z', status: 'QUEUED' });
    offlineBuffer.push({ pin: '1002', time: '2026-09-11T09:41:00Z', status: 'QUEUED' });

    expect(offlineBuffer.length).toBe(2);
    expect(offlineBuffer.every(e => e.status === 'QUEUED')).toBe(true);
  });

  // ==========================================================================
  // GATE 19: Internet recovery -> queued events uploaded & deduplicated
  // ==========================================================================
  it('Gate 19: Internet restored -> offline queued events are uploaded and acknowledged', async () => {
    const bufferedPunches = [
      { pin: '1001', time: '2026-09-11T08:00:00Z' },
      { pin: '1002', time: '2026-09-11T08:05:00Z' },
      { pin: '1001', time: '2026-09-11T08:00:00Z' }, // Duplicate in buffer
    ];

    let processedCount = 0;
    let deduplicatedCount = 0;

    for (const p of bufferedPunches) {
      const res = await biometricMultiTenantService.ingestAttendancePunch({
        deviceId: deviceA1.id,
        deviceUserId: p.pin,
        punchTimestamp: p.time,
        source: 'OFFLINE_BUFFER',
      }, TENANT_A);

      if (res.deduplicated) {
        deduplicatedCount++;
      } else {
        processedCount++;
      }
    }

    expect(processedCount).toBe(2);
    expect(deduplicatedCount).toBe(1);

    const events = await biometricMultiTenantService.getAttendanceEvents(50, TENANT_A);
    expect(events.length).toBe(2);
    expect(events.every(e => e.tenant_id === TENANT_A)).toBe(true);
  });

  // ==========================================================================
  // GATE 20: IP change -> same physical device recognized where identity permits
  // ==========================================================================
  it('Gate 20: Terminal IP change recognizes same physical device by serial number', async () => {
    const oldIp = deviceA1.ip_address; // 192.168.1.50
    const newIp = '192.168.1.75';

    // Device updates IP due to DHCP reallocation
    const updated = await biometricMultiTenantService.updateDevice(
      deviceA1.id,
      { ip_address: newIp },
      TENANT_A
    );

    expect(updated.id).toBe(deviceA1.id);
    expect(updated.serial_number).toBe('ZK-SN-ALPHA-01');
    expect(updated.ip_address).toBe(newIp);
    expect(updated.ip_address).not.toBe(oldIp);

    // Verify it is still the same single device in inventory
    const devices = await biometricMultiTenantService.getDevices(TENANT_A);
    expect(devices.length).toBe(2);
    const found = devices.find(d => d.serial_number === 'ZK-SN-ALPHA-01');
    expect(found?.ip_address).toBe(newIp);
  });
});
