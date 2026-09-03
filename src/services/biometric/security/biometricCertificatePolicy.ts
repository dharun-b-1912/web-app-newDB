// src/services/biometric/security/biometricCertificatePolicy.ts
// ============================================================================
// Joy PeopleHR — Gate B11: Configurable Biometric TLS & Certificate Policy
// ============================================================================

export interface BiometricTLSPolicy {
  minimumTLSVersion: 'TLSv1.2' | 'TLSv1.3';
  requireValidCertificate: boolean;
  rejectExpiredCertificate: boolean;
  rejectSelfSignedCertificate: boolean;
  validateHostname: boolean;
  allowedCertificateFingerprints?: string[];
  certificateRotationWarningDays: number;
}

export const DEFAULT_BIOMETRIC_TLS_POLICY: BiometricTLSPolicy = {
  minimumTLSVersion: 'TLSv1.2',
  requireValidCertificate: true,
  rejectExpiredCertificate: true,
  rejectSelfSignedCertificate: true,
  validateHostname: true,
  certificateRotationWarningDays: 30,
};

export class BiometricCertificatePolicyService {
  private static currentPolicy: BiometricTLSPolicy = { ...DEFAULT_BIOMETRIC_TLS_POLICY };

  static getPolicy(): BiometricTLSPolicy {
    return this.currentPolicy;
  }

  static updatePolicy(newPolicy: Partial<BiometricTLSPolicy>) {
    this.currentPolicy = { ...this.currentPolicy, ...newPolicy };
  }

  static resetPolicy() {
    this.currentPolicy = { ...DEFAULT_BIOMETRIC_TLS_POLICY };
  }
}
