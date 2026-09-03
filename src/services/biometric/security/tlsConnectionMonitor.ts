// src/services/biometric/security/tlsConnectionMonitor.ts
// ============================================================================
// Joy PeopleHR — Gate B11: TLS Connection State Machine & Health Telemetry
// Lifecycle: DISCONNECTED -> CONNECTING -> TLS_HANDSHAKE -> CERTIFICATE_VALIDATION -> AUTHENTICATED -> STREAMING
// ============================================================================

export type TLSConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'TLS_HANDSHAKE'
  | 'CERTIFICATE_VALIDATION'
  | 'AUTHENTICATED'
  | 'STREAMING'
  | 'DEGRADED'
  | 'REJECTED'
  | 'SECURITY_ALERT';

export interface DeviceConnectionSession {
  deviceId: string;
  organizationId: string;
  connectionId: string;
  state: TLSConnectionState;
  tlsVersion: string;
  cipherSuite: string;
  establishedAt: string;
  lastHeartbeatAt: string;
  reconnectCount: number;
}

export class TLSConnectionMonitor {
  private static sessions: Map<string, DeviceConnectionSession> = new Map();

  static transition(
    deviceId: string,
    orgId: string,
    state: TLSConnectionState,
    meta?: { tlsVersion?: string; cipherSuite?: string }
  ): DeviceConnectionSession {
    let session = this.sessions.get(deviceId);
    const now = new Date().toISOString();

    if (!session) {
      session = {
        deviceId,
        organizationId: orgId,
        connectionId: `TLS_SESS_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        state,
        tlsVersion: meta?.tlsVersion || 'TLSv1.3',
        cipherSuite: meta?.cipherSuite || 'TLS_AES_256_GCM_SHA384',
        establishedAt: now,
        lastHeartbeatAt: now,
        reconnectCount: 0,
      };
    } else {
      session.state = state;
      session.lastHeartbeatAt = now;
      if (meta?.tlsVersion) session.tlsVersion = meta.tlsVersion;
      if (meta?.cipherSuite) session.cipherSuite = meta.cipherSuite;
      if (state === 'STREAMING' && session.state !== 'STREAMING') {
        session.reconnectCount++;
      }
    }

    this.sessions.set(deviceId, session);
    return session;
  }

  static getSession(deviceId: string): DeviceConnectionSession | undefined {
    return this.sessions.get(deviceId);
  }

  static getAllActiveStreams(): DeviceConnectionSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.state === 'STREAMING');
  }
}
