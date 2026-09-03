// src/services/biometric-saas/deviceHeartbeatEngine.ts
// ============================================================================
// WorkForceOS Universal Biometric Gateway V5 — Heartbeat & Health Aggregator
// Reduces Polling Log Spam & Computes Continuous Health States
// ============================================================================

export type DeviceHealthStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'FLAPPING' | 'UNKNOWN';

export interface DeviceHeartbeatMetrics {
  deviceSerial: string;
  ipAddress: string;
  status: DeviceHealthStatus;
  pollCount: number;
  requestsPerMinute: number;
  latencyMs: number;
  lastSeenAt: string;
  firstSeenAt: string;
  recentPollTimestamps: number[];
  lastSummaryLogAt: number;
}

export class DeviceHeartbeatEngine {
  private static instance: DeviceHeartbeatEngine;
  private heartbeats: Map<string, DeviceHeartbeatMetrics> = new Map();
  private readonly summaryIntervalMs = 60000; // Log summary at most once per 60 seconds

  private constructor() {}

  public static getInstance(): DeviceHeartbeatEngine {
    if (!DeviceHeartbeatEngine.instance) {
      DeviceHeartbeatEngine.instance = new DeviceHeartbeatEngine();
    }
    return DeviceHeartbeatEngine.instance;
  }

  /**
   * Records a heartbeat/poll request from a physical device.
   * Returns a boolean indicating whether this poll should be logged at INFO level.
   */
  public recordPoll(
    deviceSerial: string,
    ipAddress: string = '192.168.1.201',
    latencyMs: number = 5
  ): { metrics: DeviceHeartbeatMetrics; shouldLogSummary: boolean } {
    const now = Date.now();
    let hb = this.heartbeats.get(deviceSerial);

    if (!hb) {
      hb = {
        deviceSerial,
        ipAddress,
        status: 'ONLINE',
        pollCount: 1,
        requestsPerMinute: 1,
        latencyMs,
        lastSeenAt: new Date(now).toISOString(),
        firstSeenAt: new Date(now).toISOString(),
        recentPollTimestamps: [now],
        lastSummaryLogAt: now,
      };
      this.heartbeats.set(deviceSerial, hb);
      return { metrics: hb, shouldLogSummary: true };
    }

    // Update poll counts
    hb.pollCount++;
    hb.ipAddress = ipAddress;
    hb.latencyMs = latencyMs;
    hb.lastSeenAt = new Date(now).toISOString();

    // Sliding window of last 60 seconds
    const windowStart = now - 60000;
    hb.recentPollTimestamps = hb.recentPollTimestamps.filter((t) => t > windowStart);
    hb.recentPollTimestamps.push(now);
    hb.requestsPerMinute = hb.recentPollTimestamps.length;

    // Assess Status
    hb.status = 'ONLINE';

    // Determine if summary should be logged
    const shouldLogSummary = now - hb.lastSummaryLogAt >= this.summaryIntervalMs;
    if (shouldLogSummary) {
      hb.lastSummaryLogAt = now;
    }

    return { metrics: hb, shouldLogSummary };
  }

  public getHeartbeat(deviceSerial: string): DeviceHeartbeatMetrics | undefined {
    const hb = this.heartbeats.get(deviceSerial);
    if (!hb) return undefined;

    // Check offline if not seen for > 45 seconds
    const diff = Date.now() - new Date(hb.lastSeenAt).getTime();
    if (diff > 45000) {
      hb.status = 'OFFLINE';
    } else if (diff > 25000) {
      hb.status = 'DEGRADED';
    } else {
      hb.status = 'ONLINE';
    }

    return hb;
  }

  public getAllHeartbeats(): DeviceHeartbeatMetrics[] {
    const all = Array.from(this.heartbeats.values());
    all.forEach((hb) => {
      const diff = Date.now() - new Date(hb.lastSeenAt).getTime();
      if (diff > 45000) {
        hb.status = 'OFFLINE';
      } else if (diff > 25000) {
        hb.status = 'DEGRADED';
      } else {
        hb.status = 'ONLINE';
      }
    });
    return all;
  }
}

export const deviceHeartbeatEngine = DeviceHeartbeatEngine.getInstance();
