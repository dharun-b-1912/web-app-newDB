// ============================================================
// Joy PeopleHR — Biometric Edge Agent Gateway (Phase 8.5)
// ============================================================
// Manages zero-port-forwarding outbound reverse WebSocket tunnels
// connecting on-premise local LAN agents to the SaaS cloud.
// ============================================================

import { EdgeAgentTunnelSession } from './types/biometricSaas.types';

export class BiometricEdgeAgentGateway {
  private static activeSessions: Map<string, EdgeAgentTunnelSession> = new Map([
    [
      'edge_agent_blr_hq_01',
      {
        agentId: 'edge_agent_blr_hq_01',
        organizationId: 'org_enterprise_demo',
        branchId: 'branch_bangalore_hq',
        agentVersion: 'v2.4.0-edge',
        platform: 'LINUX',
        localIp: '192.168.1.50',
        publicIp: '103.21.14.88',
        connectedDevicesCount: 3,
        connectionStatus: 'CONNECTED',
        websocketSessionId: 'wss_sess_blr_89421',
        lastPingAt: new Date().toISOString(),
        unflushedBufferCount: 0,
      },
    ],
    [
      'edge_agent_hyd_01',
      {
        agentId: 'edge_agent_hyd_01',
        organizationId: 'org_enterprise_demo',
        branchId: 'branch_hyderabad_office',
        agentVersion: 'v2.4.0-edge',
        platform: 'WINDOWS',
        localIp: '10.0.4.12',
        publicIp: '103.22.40.12',
        connectedDevicesCount: 2,
        connectionStatus: 'CONNECTED',
        websocketSessionId: 'wss_sess_hyd_11902',
        lastPingAt: new Date().toISOString(),
        unflushedBufferCount: 0,
      },
    ],
  ]);

  public static getAgentsForTenant(organizationId: string): EdgeAgentTunnelSession[] {
    return Array.from(this.activeSessions.values()).filter((a) => a.organizationId === organizationId);
  }

  public static getAgentById(agentId: string): EdgeAgentTunnelSession | undefined {
    return this.activeSessions.get(agentId);
  }

  public static registerAgentHeartbeat(agentId: string): void {
    const agent = this.activeSessions.get(agentId);
    if (agent) {
      agent.connectionStatus = 'CONNECTED';
      agent.lastPingAt = new Date().toISOString();
    }
  }
}
