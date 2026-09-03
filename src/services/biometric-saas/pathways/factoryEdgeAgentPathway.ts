// ============================================================
// Joy PeopleHR — Pathway 2: Factory Edge Agent Daemon Pathway
// ============================================================
// Runs locally inside customer LAN / factory intranet behind NAT.
// Polls eSSL AI-FACE MAGNUM over TCP port 4370 via native protocol,
// stores logs in local offline buffer, and syncs deltas via outbound HTTPS.
// ============================================================

import { EsslMagnumDriver, EsslAttendanceRecord } from '../esslMagnumDriver';
import { BiometricRawLogsEngine } from '../biometricRawLogsEngine';
import { BiometricUserSyncEngine } from '../biometricUserSyncEngine';
import { BiometricTenantRegistry } from '../biometricTenantRegistry';

export interface FactoryEdgeAgentState {
  agentId: string;
  organizationId: string;
  branchName: string;
  localIp: string;
  pollIntervalSec: number;
  devices: {
    deviceId: string;
    serialNumber: string;
    ipAddress: string;
    port: number;
    lastSyncCursor?: string;
    status: 'ONLINE' | 'OFFLINE' | 'SYNCING';
  }[];
  offlineQueueCount: number;
  lastCloudSyncAt: string;
}

export class FactoryEdgeAgentPathway {
  private static agents: Map<string, FactoryEdgeAgentState> = new Map([
    [
      'agent_factory_chennai_01',
      {
        agentId: 'agent_factory_chennai_01',
        organizationId: 'org_enterprise_demo',
        branchName: 'Chennai Auto Assembly Plant',
        localIp: '192.168.10.15',
        pollIntervalSec: 10,
        devices: [
          {
            deviceId: 'dev_essl_magnum_plant_01',
            serialNumber: 'TDBI253600550',
            ipAddress: '192.168.10.100',
            port: 4370,
            status: 'ONLINE',
            lastSyncCursor: new Date(Date.now() - 300000).toISOString(),
          },
        ],
        offlineQueueCount: 0,
        lastCloudSyncAt: new Date().toISOString(),
      },
    ],
  ]);

  /**
   * Executes local delta sync cycle from factory device
   */
  public static async executeLocalDeltaSync(agentId: string): Promise<{
    success: boolean;
    syncedPunchesCount: number;
    newCursor: string;
  }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { success: false, syncedPunchesCount: 0, newCursor: '' };
    }

    let totalSynced = 0;
    let latestCursor = '';

    for (const dev of agent.devices) {
      // 1. Simulated local TCP 4370 fetch from AI-FACE MAGNUM
      const mockDeviceLogs: EsslAttendanceRecord[] = [
        {
          userPin: '1001',
          timestamp: new Date().toISOString(),
          verifyType: 'FACE',
          inOutState: 'IN',
        },
      ];

      // 2. Incremental delta extraction
      const delta = EsslMagnumDriver.fetchDeltaLogs(mockDeviceLogs, dev.lastSyncCursor);
      dev.lastSyncCursor = delta.updatedCursor;
      latestCursor = delta.updatedCursor;

      // 3. Forward delta to Raw Logs Engine
      for (const rec of delta.newRecords) {
        BiometricRawLogsEngine.ingestRawLog({
          organizationId: agent.organizationId,
          deviceId: dev.deviceId,
          deviceUserId: rec.userPin,
          punchTime: rec.timestamp,
          verificationType: rec.verifyType,
          punchDirection: rec.inOutState,
          rawPayload: { source: 'FACTORY_EDGE_AGENT', agentId, serialNumber: dev.serialNumber },
        });
        totalSynced++;
      }
    }

    // 4. Process raw logs into employee attendance
    BiometricRawLogsEngine.processPendingLogs((orgId, pin) => {
      const u = BiometricUserSyncEngine.getUserByPin(orgId, pin);
      return u?.employeeId;
    });

    agent.lastCloudSyncAt = new Date().toISOString();

    return {
      success: true,
      syncedPunchesCount: totalSynced,
      newCursor: latestCursor,
    };
  }

  public static getAgent(agentId: string): FactoryEdgeAgentState | undefined {
    return this.agents.get(agentId);
  }
}
