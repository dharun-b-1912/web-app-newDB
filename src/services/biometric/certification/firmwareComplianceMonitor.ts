// src/services/biometric/certification/firmwareComplianceMonitor.ts
// ============================================================================
// Joy PeopleHR — Gate B12: Firmware Compliance Monitor & Diagnostics
// ============================================================================

export type FirmwareGovernanceStatus = 'CURRENT' | 'OUTDATED' | 'CRITICAL' | 'UNKNOWN';

export interface FirmwareComplianceRecord {
  deviceId: string;
  manufacturer: string;
  model: string;
  installedVersion: string;
  approvedMinimumVersion: string;
  recommendedVersion: string;
  status: FirmwareGovernanceStatus;
  actionRequired: 'ALLOW' | 'WARN' | 'RESTRICT' | 'INVESTIGATE';
  lastEvaluatedAt: string;
}

export class FirmwareComplianceMonitor {
  static evaluate(params: {
    deviceId: string;
    manufacturer: string;
    model: string;
    installedVersion: string;
    approvedMinimumVersion: string;
    recommendedVersion: string;
  }): FirmwareComplianceRecord {
    const cur = params.installedVersion.replace(/^v/, '');
    const min = params.approvedMinimumVersion.replace(/^v/, '');
    const rec = params.recommendedVersion.replace(/^v/, '');

    let status: FirmwareGovernanceStatus = 'CURRENT';
    let actionRequired: 'ALLOW' | 'WARN' | 'RESTRICT' | 'INVESTIGATE' = 'ALLOW';

    if (!cur) {
      status = 'UNKNOWN';
      actionRequired = 'INVESTIGATE';
    } else if (cur === rec) {
      status = 'CURRENT';
      actionRequired = 'ALLOW';
    } else {
      const curMaj = parseInt(cur.split('.')[0] || '0', 10);
      const minMaj = parseInt(min.split('.')[0] || '0', 10);

      if (curMaj < minMaj) {
        status = 'CRITICAL';
        actionRequired = 'RESTRICT';
      } else {
        status = 'OUTDATED';
        actionRequired = 'WARN';
      }
    }

    return {
      deviceId: params.deviceId,
      manufacturer: params.manufacturer,
      model: params.model,
      installedVersion: params.installedVersion,
      approvedMinimumVersion: params.approvedMinimumVersion,
      recommendedVersion: params.recommendedVersion,
      status,
      actionRequired,
      lastEvaluatedAt: new Date().toISOString(),
    };
  }
}
