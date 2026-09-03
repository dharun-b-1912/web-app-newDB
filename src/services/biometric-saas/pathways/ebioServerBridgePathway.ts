// ============================================================
// Joy PeopleHR — Pathway 3: eBioServer & ePush Database Bridge
// ============================================================
// Ingests attendance records from official eBioServer / ePush Server
// relational databases (devicelogs table in MySQL / MS SQL / PostgreSQL)
// via database change data capture (CDC) or webhook relay.
// ============================================================

import { BiometricRawLogsEngine } from '../biometricRawLogsEngine';
import { BiometricUserSyncEngine } from '../biometricUserSyncEngine';

export interface EBioServerLogEntry {
  DeviceLogId: number;
  DownloadDate: string;
  DeviceId: number;
  UserId: string; // Machine user PIN
  LogDate: string; // "YYYY-MM-DD HH:MM:SS"
  Direction?: string; // "IN" / "OUT"
  AttDirection?: string;
  SerialNumber?: string;
}

export class EBioServerBridgePathway {
  /**
   * Ingests a batch of records extracted from the eBioServer / ePush 'devicelogs' table
   */
  public static ingestEBioServerBatch(
    organizationId: string,
    mappedDeviceId: string,
    records: EBioServerLogEntry[]
  ): {
    ingestedCount: number;
    duplicatesCount: number;
  } {
    let ingested = 0;
    let duplicates = 0;

    for (const rec of records) {
      const punchIso = rec.LogDate.includes('T')
        ? rec.LogDate
        : new Date(rec.LogDate.replace(' ', 'T') + '+05:30').toISOString();

      const result = BiometricRawLogsEngine.ingestRawLog({
        organizationId,
        deviceId: mappedDeviceId,
        deviceUserId: rec.UserId,
        punchTime: punchIso,
        verificationType: 'FACE',
        punchDirection: rec.Direction === 'OUT' ? 'OUT' : 'IN',
        rawPayload: { source: 'EBIOSERVER_DB_BRIDGE', eBioLogId: rec.DeviceLogId },
      });

      if (result.isDuplicate) {
        duplicates++;
      } else {
        ingested++;
      }
    }

    // Process into final employee attendance
    BiometricRawLogsEngine.processPendingLogs((orgId, pin) => {
      const u = BiometricUserSyncEngine.getUserByPin(orgId, pin);
      return u?.employeeId;
    });

    return {
      ingestedCount: ingested,
      duplicatesCount: duplicates,
    };
  }
}
