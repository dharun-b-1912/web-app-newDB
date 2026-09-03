// ============================================================
// Joy PeopleHR — Biometric Pathway Master Switchboard (Phase 8.5)
// ============================================================
// Allows SaaS tenants and branch administrators to configure and
// toggle between Pathway 1 (ADMS Push), Pathway 2 (Edge Agent),
// or Pathway 3 (eBioServer DB Bridge) on a per-device / branch basis.
// ============================================================

import { AdmsCloudPushPathway } from './admsCloudPushPathway';
import { FactoryEdgeAgentPathway } from './factoryEdgeAgentPathway';
import { EBioServerBridgePathway } from './ebioServerBridgePathway';
import { BiometricTenantRegistry } from '../biometricTenantRegistry';

export type BiometricIntegrationPathwayType =
  | 'PATHWAY_1_ADMS_CLOUD_PUSH'
  | 'PATHWAY_2_FACTORY_EDGE_AGENT'
  | 'PATHWAY_3_EBIOSERVER_DB_BRIDGE';

export interface DevicePathwayConfiguration {
  deviceId: string;
  organizationId: string;
  deviceSerialNumber: string;
  deviceModel: string;
  selectedPathway: BiometricIntegrationPathwayType;
  pathwaySettings: {
    admsServerPort?: number;
    edgeAgentId?: string;
    eBioServerDbConnectionString?: string;
    autoDeltaSyncIntervalSeconds: number;
    requireZeroPortForwarding: boolean;
  };
  status: 'ACTIVE' | 'PAUSED' | 'CALIBRATING';
}

export class BiometricPathwayManager {
  private static configurations: Map<string, DevicePathwayConfiguration> = new Map([
    [
      'TDBI253600550',
      {
        deviceId: 'dev_essl_magnum_plant_01',
        organizationId: 'org_enterprise_demo',
        deviceSerialNumber: 'TDBI253600550',
        deviceModel: 'AI-FACE MAGNUM',
        selectedPathway: 'PATHWAY_1_ADMS_CLOUD_PUSH',
        pathwaySettings: {
          admsServerPort: 80,
          autoDeltaSyncIntervalSeconds: 5,
          requireZeroPortForwarding: true,
        },
        status: 'ACTIVE',
      },
    ],
  ]);

  public static getConfiguration(serialNumber: string): DevicePathwayConfiguration | undefined {
    return this.configurations.get(serialNumber);
  }

  public static setDevicePathway(
    serialNumber: string,
    config: DevicePathwayConfiguration
  ): boolean {
    this.configurations.set(serialNumber, config);
    return true;
  }

  public static listConfigurations(organizationId: string): DevicePathwayConfiguration[] {
    return Array.from(this.configurations.values()).filter(
      (c) => c.organizationId === organizationId
    );
  }
}
