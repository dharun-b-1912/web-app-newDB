// src/services/biometric/security/deviceCertificateRegistry.ts
// ============================================================================
// Joy PeopleHR — Gate B11: Device Certificate Trust Registry & Fingerprint Pinning
// Enforces: ONE DEVICE -> ONE ACTIVE CERTIFICATE FINGERPRINT -> ONE TRUSTED IDENTITY
// ============================================================================

export type CertificateStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'REVOKED';

export interface DeviceCertificateRecord {
  id: string;
  organization_id: string;
  device_id: string;
  certificate_serial: string;
  certificate_fingerprint_sha256: string;
  issuer: string;
  valid_from: string;
  valid_until: string;
  status: CertificateStatus;
  last_verified_at: string;
}

export const CANONICAL_DEVICE_CERTIFICATES: DeviceCertificateRecord[] = [
  {
    id: 'cert-cbe-wt-01',
    organization_id: 'org-joy-corporate-solutions-private-',
    device_id: 'ZK-COIMBATORE-001',
    certificate_serial: '7F:2A:99:B1:00:1A',
    certificate_fingerprint_sha256: 'SHA256:A4:9D:11:72:8B:45:3C:9E:F1:2A:77:88:99:00:11:22',
    issuer: "Joy Corporate Root CA / Let's Encrypt Enterprise",
    valid_from: '2026-01-01T00:00:00Z',
    valid_until: '2027-01-01T00:00:00Z',
    status: 'ACTIVE',
    last_verified_at: '2026-09-01T08:50:00Z',
  },
  {
    id: 'cert-cbe-hq-01',
    organization_id: 'org-joy-corporate-solutions-private-',
    device_id: 'ESSL-COIMBATORE-HQ-01',
    certificate_serial: '4B:11:7C:9D:E2:88',
    certificate_fingerprint_sha256: 'SHA256:88:2E:41:0B:99:A1:33:44:55:66:77:88:99:AA:BB:CC',
    issuer: 'Joy Corporate Root CA',
    valid_from: '2026-01-01T00:00:00Z',
    valid_until: '2027-01-01T00:00:00Z',
    status: 'ACTIVE',
    last_verified_at: '2026-09-01T08:50:00Z',
  },
  {
    id: 'cert-cbe-cn-01',
    organization_id: 'org-joy-corporate-solutions-private-',
    device_id: 'MANTRA-CARE-NOW-01',
    certificate_serial: '3C:99:AA:22:11:FF',
    certificate_fingerprint_sha256: 'SHA256:77:33:F2:1C:6A:B9:00:11:22:33:44:55:66:77:88:99',
    issuer: 'Joy Corporate Root CA',
    valid_from: '2026-01-01T00:00:00Z',
    valid_until: '2027-01-01T00:00:00Z',
    status: 'ACTIVE',
    last_verified_at: '2026-09-01T08:50:00Z',
  },
];

export class DeviceCertificateRegistry {
  private static registry: Map<string, DeviceCertificateRecord> = new Map(
    CANONICAL_DEVICE_CERTIFICATES.map((c) => [c.device_id, c])
  );

  static getCertificateForDevice(deviceId: string): DeviceCertificateRecord | null {
    return this.registry.get(deviceId) || null;
  }

  static isCertificateRevoked(fingerprint: string): boolean {
    for (const cert of this.registry.values()) {
      if (cert.certificate_fingerprint_sha256 === fingerprint && cert.status === 'REVOKED') {
        return true;
      }
    }
    return false;
  }

  static verifyDeviceFingerprint(deviceId: string, incomingFingerprint: string): {
    matched: boolean;
    record?: DeviceCertificateRecord;
    reason?: string;
  } {
    const record = this.getCertificateForDevice(deviceId);
    if (!record) {
      return { matched: false, reason: 'DEVICE_UNREGISTERED' };
    }

    if (record.status === 'REVOKED') {
      return { matched: false, record, reason: 'CERTIFICATE_REVOKED' };
    }

    const now = new Date();
    if (new Date(record.valid_until) < now) {
      return { matched: false, record, reason: 'CERTIFICATE_EXPIRED' };
    }

    if (record.certificate_fingerprint_sha256 !== incomingFingerprint) {
      return { matched: false, record, reason: 'CERTIFICATE_FINGERPRINT_MISMATCH' };
    }

    return { matched: true, record };
  }
}
