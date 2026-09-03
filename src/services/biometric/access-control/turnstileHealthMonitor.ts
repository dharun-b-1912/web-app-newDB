// src/services/biometric/access-control/turnstileHealthMonitor.ts
// ============================================================================
// Joy PeopleHR — Gate B15: Physical Turnstile & Barrier Health Monitor
// ============================================================================

export interface TurnstileHealthStatus {
  deviceId: string;
  locationId: string;
  relayHardwareStatus: 'ONLINE_FUNCTIONAL' | 'RELAY_STUCK' | 'POWER_OFFLINE';
  lastCycleLatencyMs: number;
  totalCycleCount: number;
  lastTestedAt: string;
}

export class TurnstileHealthMonitor {
  private static healthRegistry: Map<string, TurnstileHealthStatus> = new Map();

  static recordCycle(deviceId: string, locationId: string, latencyMs: number) {
    const existing = this.healthRegistry.get(deviceId) || {
      deviceId,
      locationId,
      relayHardwareStatus: 'ONLINE_FUNCTIONAL',
      lastCycleLatencyMs: latencyMs,
      totalCycleCount: 0,
      lastTestedAt: new Date().toISOString(),
    };

    existing.totalCycleCount++;
    existing.lastCycleLatencyMs = latencyMs;
    existing.lastTestedAt = new Date().toISOString();
    this.healthRegistry.set(deviceId, existing);
  }

  static getHealth(deviceId: string): TurnstileHealthStatus | undefined {
    return this.healthRegistry.get(deviceId);
  }
}
