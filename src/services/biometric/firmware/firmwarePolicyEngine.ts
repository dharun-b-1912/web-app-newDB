// src/services/biometric/firmware/firmwarePolicyEngine.ts
// ============================================================================
// Joy PeopleHR — Gate B12: Versioned Firmware Policy Engine
// ============================================================================

export interface FirmwarePolicy {
  organization_id: string;
  manufacturer: string;
  device_model: string;
  minimum_supported_version: string;
  recommended_version: string;
  critical_versions?: string[];
  status: 'ACTIVE' | 'DISABLED';
  effective_from: string;
}

export const DEFAULT_FIRMWARE_POLICIES: FirmwarePolicy[] = [
  {
    organization_id: 'org-joy-corporate-solutions-private-',
    manufacturer: 'ZKTeco',
    device_model: 'SilkBio-101TC',
    minimum_supported_version: '2.4.0',
    recommended_version: '3.4.1',
    critical_versions: ['1.0.0', '1.1.0', '2.0.0'],
    status: 'ACTIVE',
    effective_from: '2026-01-01',
  },
  {
    organization_id: 'org-joy-corporate-solutions-private-',
    manufacturer: 'eSSL',
    device_model: 'SilkBio-100',
    minimum_supported_version: '2.0.0',
    recommended_version: '3.4.1',
    critical_versions: ['1.0.0'],
    status: 'ACTIVE',
    effective_from: '2026-01-01',
  },
  {
    organization_id: 'org-joy-corporate-solutions-private-',
    manufacturer: 'Mantra',
    device_model: 'MFSTAB-II',
    minimum_supported_version: '3.0.0',
    recommended_version: '3.4.1',
    critical_versions: ['2.0.0', '2.1.0'],
    status: 'ACTIVE',
    effective_from: '2026-01-01',
  },
];

export class FirmwarePolicyEngine {
  private static policies: FirmwarePolicy[] = [...DEFAULT_FIRMWARE_POLICIES];

  static findPolicy(orgId: string, manufacturer: string, model: string): FirmwarePolicy | null {
    return (
      this.policies.find(
        (p) =>
          p.organization_id === orgId &&
          p.manufacturer.toLowerCase() === manufacturer.toLowerCase() &&
          p.device_model.toLowerCase() === model.toLowerCase() &&
          p.status === 'ACTIVE'
      ) || null
    );
  }

  static addPolicy(policy: FirmwarePolicy) {
    this.policies.push(policy);
  }
}
