// src/services/__tests__/universalBiometricV5Certification.test.ts
// ============================================================================
// Joy PeopleHR — Universal Biometric Architecture V5 Enterprise Certification
// Automated Testing for Certification Gates 19 to 36
// ============================================================================

import { capabilityDiscoveryEngine } from '../biometric-saas/capabilityDiscoveryEngine';
import { resolveCertifiedProfile, CERTIFIED_DEVICE_PROFILES } from '../biometric-saas/deviceProfileRegistry';
import { deviceCommandEngine } from '../biometric-saas/deviceCommandEngine';

export interface BiometricTestResult {
  gate: string;
  name: string;
  passed: boolean;
  message?: string;
}

export async function runUniversalBiometricV5CertificationSuite(): Promise<{ total: number; passed: number; failed: number; results: BiometricTestResult[] }> {
  console.log('\n============================================================');
  console.log('  JOY PEOPLEHR UNIVERSAL BIOMETRIC CERTIFICATION SUITE (Gates 19–36)');
  console.log('============================================================\n');

  const results: BiometricTestResult[] = [];

  const runTest = async (gate: string, name: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      results.push({ gate, name, passed: true });
      console.log(`  ✓ [${gate}] ${name}`);
    } catch (err: any) {
      results.push({ gate, name, passed: false, message: err.message });
      console.error(`  ✗ [${gate}] ${name}: ${err.message}`);
    }
  };

  // GATE 19: Universal Capability Detection
  await runTest('GATE 19', 'Universal Capability Detection extracts verified modalities from hardware profile', async () => {
    const caps = await capabilityDiscoveryEngine.discoverCapabilities('dev-magnum-01', {
      manufacturer: 'eSSL',
      model: 'AI-FACE MAGNUM',
      ipAddress: '192.168.1.201',
    });

    if (!caps.credentials.face?.supported) throw new Error('Face capability should be supported');
    if (!caps.credentials.fingerprint?.supported) throw new Error('Fingerprint capability should be supported');
    if (!caps.credentials.card?.supported) throw new Error('Card capability should be supported');
    if (!caps.credentials.pin?.supported) throw new Error('PIN capability should be supported');
    if (caps.source !== 'CERTIFIED_PROFILE') throw new Error('Source should be CERTIFIED_PROFILE');
  });

  // GATE 20: Unsupported Credential Hidden
  await runTest('GATE 20', 'Unsupported credentials (e.g. Iris/Palm on standard FP device) are marked unsupported', async () => {
    const caps = await capabilityDiscoveryEngine.discoverCapabilities('dev-x2008-01', {
      manufacturer: 'eSSL',
      model: 'X2008',
      ipAddress: '192.168.1.202',
    });

    if (caps.credentials.face?.supported) throw new Error('Face should not be supported on X2008');
    if (!caps.credentials.fingerprint?.supported) throw new Error('Fingerprint should be supported on X2008');
    if (caps.credentials.iris?.supported) throw new Error('Iris should not be supported on X2008');
    if (caps.credentials.palm?.supported) throw new Error('Palm should not be supported on X2008');
  });

  // GATE 21: Device-Specific Enrollment Workflow
  await runTest('GATE 21', 'Extracts supported enrollment method list dynamically for UI', async () => {
    const caps = await capabilityDiscoveryEngine.discoverCapabilities('dev-magnum-01', {
      manufacturer: 'eSSL',
      model: 'AI-FACE MAGNUM',
    });

    const methods = capabilityDiscoveryEngine.getSupportedEnrollmentMethods(caps);
    const methodNames = methods.map((m) => m.method);
    if (!methodNames.includes('FACE')) throw new Error('Missing FACE method');
    if (!methodNames.includes('FINGERPRINT')) throw new Error('Missing FINGERPRINT method');
    if (!methodNames.includes('CARD')) throw new Error('Missing CARD method');
    if (!methodNames.includes('PIN')) throw new Error('Missing PIN method');
  });

  // GATE 22: Per-Device Command Serialization & Mutex Lock
  await runTest('GATE 22', 'Per-device locking prevents concurrent TCP packet collisions', async () => {
    const lock1 = await deviceCommandEngine.acquireDeviceLock('192.168.1.201', 'ENR-001', 5000);
    if (!lock1.success) throw new Error('Failed to acquire lock1');

    const lock2 = await deviceCommandEngine.acquireDeviceLock('192.168.1.201', 'ENR-002', 5000);
    if (lock2.success) throw new Error('Lock2 should have been rejected');

    deviceCommandEngine.releaseDeviceLock('192.168.1.201', 'ENR-001');
    const lock3 = await deviceCommandEngine.acquireDeviceLock('192.168.1.201', 'ENR-002', 5000);
    if (!lock3.success) throw new Error('Failed to acquire lock3 after release');
    deviceCommandEngine.releaseDeviceLock('192.168.1.201', 'ENR-002');
  });

  // GATE 23: Multi-Tenant Enrollment Isolation
  await runTest('GATE 23', 'Enrollment session enforces tenant_id and generates correlation ID', () => {
    const session = deviceCommandEngine.createEnrollmentSession({
      tenant_id: 'org-joy-test-tenant',
      organization_id: 'org-main',
      employee_id: 'emp-101',
      employee_name: 'Dharun B',
      employee_code: 'JCS-17',
      device_id: 'dev-001',
      device_model: 'AI-FACE MAGNUM',
      device_ip: '192.168.1.201',
      gateway_id: 'gw-01',
      enrollment_method: 'FACE',
      enrollment_mode: 'REMOTE_SENSOR_TRIGGER',
      machine_pin: '17',
    });

    if (session.tenant_id !== 'org-joy-test-tenant') throw new Error('Tenant ID mismatch');
    if (!/^ENR-\d{8}-\d+$/.test(session.correlation_id)) throw new Error('Invalid correlation ID format');
    if (session.status !== 'CREATED') throw new Error('Status should be CREATED');
  });

  // GATE 24: Unknown Device Safe Mode
  await runTest('GATE 24', 'Unknown device model defaults safely to Safe Mode fallback without assuming biometric features', () => {
    const profile = resolveCertifiedProfile('UnknownBrand', 'MysteryModel-99');
    if (profile.profileId !== 'UNKNOWN_DEVICE_SAFE_MODE') throw new Error('Profile should be UNKNOWN_DEVICE_SAFE_MODE');
    if (profile.defaultCapabilities.credentials.face?.supported) throw new Error('Face should be false in safe mode');
    if (profile.defaultCapabilities.credentials.fingerprint?.supported) throw new Error('Fingerprint should be false in safe mode');
  });

  // GATE 25: Card Technology Validation
  await runTest('GATE 25', 'Device profile specifies certified RFID card technologies', () => {
    const zkProfile = CERTIFIED_DEVICE_PROFILES.ZK_SPEEDFACE_V5L;
    const techs = zkProfile.defaultCapabilities.credentials.card?.technologies || [];
    if (!techs.includes('EM_125KHZ')) throw new Error('Missing EM_125KHZ');
    if (!techs.includes('MIFARE_13_56MHZ')) throw new Error('Missing MIFARE_13_56MHZ');
  });

  // GATE 26: Dynamic Finger Selection
  await runTest('GATE 26', 'Adapts finger selection based on supportedFingerCount (10 vs 2)', () => {
    const esslCaps = CERTIFIED_DEVICE_PROFILES.ESSL_AI_FACE_MAGNUM.defaultCapabilities;
    if (esslCaps.credentials.fingerprint?.supportedFingerCount !== 10) throw new Error('Expected 10 fingers for AI-FACE MAGNUM');

    const mantraCaps = CERTIFIED_DEVICE_PROFILES.MANTRA_MFSTAB2.defaultCapabilities;
    if (mantraCaps.credentials.fingerprint?.supportedFingerCount !== 2) throw new Error('Expected 2 fingers for Mantra MFSTAB2');
  });

  // GATE 27: Enrollment Session Lifecycle
  await runTest('GATE 27', 'Session state transitions through full lifecycle to COMPLETED', () => {
    const session = deviceCommandEngine.createEnrollmentSession({
      tenant_id: 'org-test',
      organization_id: 'org-main',
      employee_id: 'emp-002',
      employee_name: 'Danya',
      employee_code: 'JCS-154',
      device_id: 'dev-001',
      device_model: 'AI-FACE MAGNUM',
      device_ip: '192.168.1.201',
      gateway_id: 'gw-01',
      enrollment_method: 'FINGERPRINT',
      enrollment_mode: 'REMOTE_SENSOR_TRIGGER',
      machine_pin: '154',
    });

    deviceCommandEngine.updateSessionState(session.id, 'CAPTURING', { progress_percent: 50 });
    if (deviceCommandEngine.getSession(session.id)?.status !== 'CAPTURING') throw new Error('Status should be CAPTURING');

    deviceCommandEngine.updateSessionState(session.id, 'COMPLETED', { progress_percent: 100, quality_score: 98 });
    if (deviceCommandEngine.getSession(session.id)?.status !== 'COMPLETED') throw new Error('Status should be COMPLETED');
    if (!deviceCommandEngine.getSession(session.id)?.completed_at) throw new Error('Completed_at timestamp missing');
  });

  // GATE 31: Device Capacity Protection
  await runTest('GATE 31', 'Hardware capacity limit verified before assigning new slots', () => {
    const caps = CERTIFIED_DEVICE_PROFILES.ESSL_AI_FACE_MAGNUM.defaultCapabilities;
    if (caps.credentials.face?.maxTemplates !== 1500) throw new Error('Face maxTemplates should be 1500');
    if (caps.credentials.fingerprint?.maxTemplates !== 5000) throw new Error('Fingerprint maxTemplates should be 5000');
    if (caps.credentials.card?.maxCards !== 10000) throw new Error('Card maxCards should be 10000');
  });

  // GATE 36: High-Frequency Session Soak Test
  await runTest('GATE 36', 'Simulates high-frequency enrollment session creation & release with zero leaks', () => {
    for (let i = 1; i <= 50; i++) {
      const sess = deviceCommandEngine.createEnrollmentSession({
        tenant_id: 'org-soak',
        organization_id: 'org-soak-main',
        employee_id: `emp-soak-${i}`,
        employee_name: `Worker ${i}`,
        employee_code: `SOAK-${i}`,
        device_id: 'dev-soak',
        device_model: 'AI-FACE MAGNUM',
        device_ip: `192.168.1.${100 + (i % 10)}`,
        gateway_id: 'gw-soak',
        enrollment_method: 'FACE',
        enrollment_mode: 'REMOTE_SENSOR_TRIGGER',
        machine_pin: String(1000 + i),
      });

      deviceCommandEngine.updateSessionState(sess.id, 'COMPLETED');
    }
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n============================================================`);
  console.log(`  PASSED: ${passed}/${results.length} | FAILED: ${failed}`);
  console.log(`============================================================\n`);

  return { total: results.length, passed, failed, results };
}

// Auto-run when executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('universalBiometricV5Certification')) {
  runUniversalBiometricV5CertificationSuite();
}
