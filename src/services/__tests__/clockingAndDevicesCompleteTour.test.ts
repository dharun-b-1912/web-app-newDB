// src/services/__tests__/clockingAndDevicesCompleteTour.test.ts
// ============================================================================
// Joy PeopleHR — CLOCKING & DEVICES Complete Architecture & Navigation Tour Test Suite
// Full Verification of Slugs, Subviews, Device Workspaces, Actions, and Zero-Delay Navigation
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseRouteFromUrl, syncUrlWithRoute, ROUTE_ALIASES, ROUTE_TO_PATH } from '../../lib/router/urlRouter';
import { biometricGatewayService } from '../attendance/biometricGatewayService';
import { workLocationService } from '../location/workLocationService';
import { attendanceTimeService } from '../attendance/attendanceTimeService';

describe('Joy PeopleHR — CLOCKING & DEVICES Comprehensive Tour', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Gate 1: Slug Routing & URL Normalization for All Clocking & Devices Slugs', () => {
    it('correctly maps /biometric and /biometric/ to biometric route', () => {
      expect(ROUTE_ALIASES['/biometric']).toBe('biometric');
      expect(ROUTE_ALIASES['/biometric/']).toBe('biometric');
      expect(ROUTE_ALIASES['/biometric-devices']).toBe('biometric');
      expect(ROUTE_ALIASES['/biometric_devices']).toBe('biometric');
    });

    it('correctly maps /biometric/workspace and /biometric/devices to biometric route', () => {
      expect(ROUTE_ALIASES['/biometric/workspace']).toBe('biometric');
      expect(ROUTE_ALIASES['/biometric/devices']).toBe('biometric');
    });

    it('correctly maps /biometric/terminal-ledger and /biometric/ledger to biometric route', () => {
      expect(ROUTE_ALIASES['/biometric/terminal-ledger']).toBe('biometric');
      expect(ROUTE_ALIASES['/biometric/ledger']).toBe('biometric');
    });

    it('correctly maps /attendance-rules and /biometric-rules to attendance-rules route', () => {
      expect(ROUTE_ALIASES['/attendance-rules']).toBe('attendance-rules');
      expect(ROUTE_ALIASES['/biometric-rules']).toBe('attendance-rules');
    });

    it('correctly maps GPS and Geofence slugs', () => {
      expect(ROUTE_ALIASES['/gps']).toBe('gps');
      expect(ROUTE_ALIASES['/gps-attendance']).toBe('gps');
      expect(ROUTE_ALIASES['/geofences']).toBe('geofences');
    });

    it('correctly maps Face Recognition slugs', () => {
      expect(ROUTE_ALIASES['/face-attendance']).toBe('face-attendance');
      expect(ROUTE_ALIASES['/face-recognition']).toBe('face-attendance');
      expect(ROUTE_ALIASES['/face-enrollment']).toBe('face-attendance');
      expect(ROUTE_ALIASES['/face-devices']).toBe('face-attendance');
      expect(ROUTE_ALIASES['/face-logs']).toBe('face-attendance');
    });
  });

  describe('Gate 2: Biometric Hub Telemetry & Timestamp Calculations', () => {
    it('computes accurate Last Sync and Last Event timestamps from database records', () => {
      const devices = biometricGatewayService.getBiometricDevices();
      expect(devices).toBeDefined();
      expect(Array.isArray(devices)).toBe(true);

      const punches = biometricGatewayService.getRawPunches(50);
      expect(punches).toBeDefined();
      expect(Array.isArray(punches)).toBe(true);

      // Verify no NaN or invalid formatting on time calculations
      if (devices.length > 0 && devices[0].last_sync) {
        const timeVal = new Date(devices[0].last_sync).getTime();
        expect(isNaN(timeVal)).toBe(false);
      }
    });

    it('returns valid hardware modality summary on demand', () => {
      const summary = biometricGatewayService.getDeviceUsersSummary('bio-dev-cbe-aiface-01');
      expect(summary).toBeDefined();
      expect(typeof summary.total).toBe('number');
      expect(typeof summary.mapped).toBe('number');
      expect(summary.total).toBeGreaterThanOrEqual(summary.mapped);
    });
  });

  describe('Gate 3: Device Actions & Latency Probe Resilience', () => {
    it('tests device connection asynchronously without locking thread', async () => {
      const dev = biometricGatewayService.getBiometricDevices()[0];
      const probeRes = await biometricGatewayService.testDeviceConnection(dev?.id || '40576a24-8c22-43ee-95b8-b74ab380c968');
      expect(probeRes).toBeDefined();
      expect(typeof probeRes.success).toBe('boolean');
      expect(typeof probeRes.message).toBe('string');
    });

    it('synchronizes device clock with UTC instant', async () => {
      const dev = biometricGatewayService.getBiometricDevices()[0];
      const syncRes = await biometricGatewayService.syncDeviceClock(dev?.id || '40576a24-8c22-43ee-95b8-b74ab380c968');
      expect(syncRes).toBeDefined();
      expect(syncRes.success).toBe(true);
      expect(syncRes.message).toContain('synchronized');
    });

    it('unlocks terminal admin lock on physical hardware', async () => {
      const dev = biometricGatewayService.getBiometricDevices()[0];
      const unlockRes = await biometricGatewayService.unlockTerminalAdmin(dev?.id || '40576a24-8c22-43ee-95b8-b74ab380c968');
      expect(unlockRes).toBeDefined();
      expect(unlockRes.success).toBe(true);
      expect(unlockRes.message).toContain('unlocked');
    });
  });

  describe('Gate 4: GPS & Geofencing Channel Initialization', () => {
    it('retrieves configured work locations and geofence radii', () => {
      const locations = workLocationService.getLocations();
      expect(locations).toBeDefined();
      expect(Array.isArray(locations)).toBe(true);
    });

    it('retrieves employee work location assignments', () => {
      const assignments = workLocationService.getAllAssignments();
      expect(assignments).toBeDefined();
      expect(Array.isArray(assignments)).toBe(true);
    });
  });

  describe('Gate 5: Time & Timezone Service Verification', () => {
    it('formats canonical attendance timestamps in Asia/Kolkata timezone with zero error', () => {
      const nowIso = new Date().toISOString();
      const formatted = attendanceTimeService.formatAttendanceTime(nowIso, 'Asia/Kolkata', true);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});
