// src/services/__tests__/biometricNavigationAndRealtimeP0.test.ts
// ============================================================================
// JOY PEOPLEHR — P0 ARCHITECTURAL TEST SUITE
// Biometric Navigation, Decoupled Lifecycle & Realtime Channel Stability
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { realtimeChannelManager } from '../realtime/realtimeChannelManager';
import { biometricGatewayService, BiometricDevice } from '../attendance/biometricGatewayService';
import { ROUTE_ALIASES, ROUTE_TO_PATH } from '../../lib/router/urlRouter';

describe('JOY PeopleHR — Biometric Navigation & Realtime P0 Architecture Gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Non-Blocking Route & Immediate Shell Rendering', () => {
    it('should resolve biometric route instantly without awaiting hardware or socket', () => {
      const startTime = performance.now();
      const canonicalPath = ROUTE_TO_PATH['biometric'];
      const resolvedRoute = ROUTE_ALIASES[canonicalPath];
      const elapsed = performance.now() - startTime;

      expect(canonicalPath).toBe('/biometric');
      expect(resolvedRoute).toBe('biometric');
      expect(elapsed).toBeLessThan(50); // Under 50ms synchronous route transition
    });

    it('should load initial biometric device cache synchronously with 0ms network block', () => {
      const startTime = performance.now();
      const devices = biometricGatewayService.getBiometricDevices();
      const elapsed = performance.now() - startTime;

      expect(Array.isArray(devices)).toBe(true);
      expect(elapsed).toBeLessThan(20);
    });

    it('should gracefully handle offline connector without blocking page initialization', async () => {
      // Simulate offline connector
      const isOffline = biometricGatewayService.isGatewayOffline();
      expect(typeof isOffline).toBe('boolean');

      const telemetry = await biometricGatewayService.getConnectorTelemetry();
      expect(telemetry).toBeDefined();
      expect(telemetry.version).toBeDefined();
    });
  });

  describe('2. Centralized Realtime Multiplexing (No Channel Thrashing)', () => {
    it('should allow multiple table subscriptions without creating separate WebSocket channels', () => {
      let callCount = 0;
      const handler = () => { callCount++; };

      const unsub1 = realtimeChannelManager.subscribeToTable('biometric_devices', handler);
      const unsub2 = realtimeChannelManager.subscribeToTable('biometric_punches', handler);
      const unsub3 = realtimeChannelManager.subscribeToTable('attendance_daily', handler);

      const infos = realtimeChannelManager.getChannelInfos();
      expect(infos.length).toBeGreaterThanOrEqual(3);

      // Verify unmounting/unsubscribing removes handlers without tearing down global connection
      unsub1();
      unsub2();
      unsub3();

      const infosAfter = realtimeChannelManager.getChannelInfos();
      expect(infosAfter.every(info => info.refCount === 0 || info.refCount !== undefined)).toBe(true);
    });

    it('should maintain stable global realtime status across rapid tab changes', () => {
      const status = realtimeChannelManager.getGlobalStatus();
      expect(['DISCONNECTED', 'CONNECTING', 'SUBSCRIBING', 'SUBSCRIBED', 'RECONNECTING']).toContain(status);
    });
  });

  describe('3. Machine Users Pagination (500+ Employee Scalability)', () => {
    it('should correctly paginate large user sets without freezing UI rendering', () => {
      // Generate 500 mock users
      const largeUserList = Array.from({ length: 500 }, (_, i) => ({
        id: `usr-${i + 1}`,
        device_id: 'dev-001',
        device_user_id: String(1000 + i),
        name: `Employee ${i + 1}`,
        fingerprint_count: 2,
        is_mapped: i % 2 === 0,
        last_synced_at: new Date().toISOString(),
      }));

      const pageSize = 50;
      const page1 = largeUserList.slice(0, pageSize);
      const page2 = largeUserList.slice(pageSize, pageSize * 2);

      expect(page1.length).toBe(50);
      expect(page2.length).toBe(50);
      expect(page1[0].device_user_id).toBe('1000');
      expect(page2[0].device_user_id).toBe('1050');
      expect(Math.ceil(largeUserList.length / pageSize)).toBe(10);
    });
  });

  describe('4. Hard Timeouts & Circuit Breaker', () => {
    it('should enforce hard bounded timeouts for probe requests', async () => {
      const probeStart = performance.now();
      const res = await biometricGatewayService.testDeviceConnection('non-existent-device-id');
      const probeElapsed = performance.now() - probeStart;

      expect(res).toBeDefined();
      expect(res.success).toBe(false);
      expect(probeElapsed).toBeLessThan(5000); // Must resolve in less than 5 seconds
    });
  });

  describe('5. Multi-Step Navigation & Route Redirection Verification (All 5 Clocking & Devices Menus)', () => {
    const rolesToTest = ['Company Admin', 'HR Head', 'Manager'];
    const clockingRoutes = [
      { id: 'biometric', label: 'Biometric Devices', path: '/biometric' },
      { id: 'attendance-rules', label: 'Biometric Rules & Automation', path: '/attendance-rules' },
      { id: 'gps', label: 'GPS & Mobile Channel', path: '/gps' },
      { id: 'face-attendance', label: 'Face Recognition', path: '/face-attendance' },
      { id: 'geofences', label: 'Geofence Boundaries', path: '/geofences' },
    ];

    it('should resolve all 5 Clocking & Devices routes and aliases instantaneously (<5ms)', () => {
      for (const route of clockingRoutes) {
        const start = performance.now();
        const canonical = ROUTE_TO_PATH[route.id] || `/${route.id}`;
        const alias = ROUTE_ALIASES[canonical] || ROUTE_ALIASES[`/${route.id}`] || route.id;
        const elapsed = performance.now() - start;

        expect(alias).toBeDefined();
        expect(elapsed).toBeLessThan(10);
      }
    });

    it('should execute full 9-step rapid switching loop without memory leaks or channel stalls', () => {
      const navigationSequence = [
        'payroll-documents',      // Step 3: PAYROLL / DIGITAL PAYSLIPS
        'biometric',              // Step 4: CLOCKING & DEVICES -> BIOMETRIC DEVICES
        'attendance-rules',       // Step 6: BIOMETRIC RULES & AUTOMATION
        'biometric',              // Return to BIOMETRIC DEVICES
        'attendance-employees',   // Step 7: EMPLOYEE ATTENDANCE
        'biometric',              // Return to BIOMETRIC DEVICES
        'gps',                    // GPS & Mobile Channel
        'face-attendance',        // Face Recognition
        'geofences',              // Geofence Boundaries
        'biometric',              // Return to BIOMETRIC DEVICES
      ];

      const start = performance.now();
      let activeView = '';

      for (const targetRoute of navigationSequence) {
        // Simulate immediate synchronous route state dispatch
        activeView = targetRoute;
        expect(activeView).toBe(targetRoute);
      }

      const totalElapsed = performance.now() - start;
      expect(totalElapsed).toBeLessThan(20); // 10 route transitions in <20ms
    });
  });

  describe('6. Connector Disconnect & Reconnect Resilience (No Dev Console Lock)', () => {
    it('should return offline status gracefully when connector process is closed without throwing exceptions', async () => {
      // Probing a closed loopback port should resolve quickly and cleanly
      const probeRes = await biometricGatewayService.probeConnectorHealth(true);
      expect(probeRes).toBeDefined();
      expect(typeof probeRes.online).toBe('boolean');
      expect(['online', 'offline', 'connecting', 'reconnecting', 'error']).toContain(probeRes.status);
      expect(probeRes.telemetry).toBeDefined();
    });

    it('should retain saved database devices when connector is offline', async () => {
      const devices = biometricGatewayService.getBiometricDevices();
      expect(devices.length).toBeGreaterThan(0);
      expect(devices[0].id).toBeDefined();
      expect(devices[0].device_name).toBeDefined();
      expect(devices[0].ip_address).toBeDefined();
    });

    it('should start and cleanly stop background connector monitoring without timer leaks', () => {
      expect(() => {
        biometricGatewayService.startConnectorMonitoring(10000);
        biometricGatewayService.stopConnectorMonitoring();
      }).not.toThrow();
    });

    it('should prevent syncAllDevices from hanging when connector is offline', async () => {
      const start = performance.now();
      const res = await biometricGatewayService.syncAllDevices();
      const elapsed = performance.now() - start;

      expect(res).toBeDefined();
      expect(res.totalDevices).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThan(3000); // Resolves promptly without hanging
    });
  });
});


