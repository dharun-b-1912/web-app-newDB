// src/services/__tests__/universalBiometricOrchestratorV5.test.ts
// ============================================================================
// Joy PeopleHR — Universal Biometric Orchestrator V5 Enterprise Certification
// Automated Testing for Production Reality, Strategy Resolution & Idempotency
// ============================================================================

import { deviceCapabilityEngine } from '../biometric-saas/deviceCapabilityEngine';
import { DeviceProtocolErrorMapper } from '../biometric-saas/deviceProtocolErrorMapper';
import { biometricVerificationEngine } from '../biometric-saas/biometricVerificationEngine';

export interface OrchestratorTestResult {
  gate: string;
  name: string;
  passed: boolean;
  message?: string;
}

export function runUniversalBiometricOrchestratorV5Suite(): { total: number; passed: number; failed: number; results: OrchestratorTestResult[] } {
  console.log('\n====================================================================');
  console.log('  JOY PEOPLEHR BIOMETRIC ORCHESTRATOR V5 CERTIFICATION (20 GATES)');
  console.log('====================================================================\n');

  const results: OrchestratorTestResult[] = [];

  const runTest = (gate: string, name: string, fn: () => void) => {
    try {
      fn();
      results.push({ gate, name, passed: true });
      console.log(`  ✓ [${gate}] ${name}`);
    } catch (err: any) {
      results.push({ gate, name, passed: false, message: err.message });
      console.error(`  ✗ [${gate}] ${name}: ${err.message}`);
    }
  };

  // GATE 1: Command ACK !== Biometric Enrollment Success
  runTest('GATE 1', 'Command ACK is strictly distinguished from Biometric Template Verification', () => {
    const ackResponse = DeviceProtocolErrorMapper.mapReturnCode('DATA_USER', 0);
    if (!ackResponse.isCommandDelivered) throw new Error('Command should be marked delivered');
    if (ackResponse.isEnrollmentComplete) throw new Error('DATA_USER alone must NEVER mark enrollment complete');

    const enrollResponse = DeviceProtocolErrorMapper.mapReturnCode('DATA_USER_CARD', 0);
    if (!enrollResponse.isEnrollmentComplete) throw new Error('Card assignment should complete upon hardware write');
  });

  // GATE 2: Return=-1002 Error Mapping
  runTest('GATE 2', 'Return=-1002 mapped as UNSUPPORTED_REMOTE_COMMAND with fallback guidance', () => {
    const mapped = DeviceProtocolErrorMapper.mapReturnCode('CONTROL ENROLL_FACE', -1002);
    if (mapped.status !== 'UNSUPPORTED_REMOTE_COMMAND') throw new Error(`Expected UNSUPPORTED_REMOTE_COMMAND, got ${mapped.status}`);
    if (mapped.isEnrollmentComplete) throw new Error('Return=-1002 must not mark enrollment complete');
    if (!mapped.recommendedAction.includes('Device-Assisted')) throw new Error('Must recommend Device-Assisted flow');
  });

  // GATE 3: Device Capability Resolution for AI-FACE MAGNUM
  runTest('GATE 3', 'Resolves eSSL AI-FACE MAGNUM capabilities and identifies remote face restriction', () => {
    const caps = deviceCapabilityEngine.resolveDeviceCapabilities({
      brand: 'eSSL',
      model: 'AI-FACE MAGNUM',
      platform: 'ZMM510-NP24VB',
      protocol: 'HYBRID_ADMS_TCP',
      deviceSerial: 'TDBD253600550',
    });

    if (!caps.capabilities.face.supported) throw new Error('Face capability should be supported');
    if (caps.capabilities.face.remoteEnrollmentSupported) throw new Error('Remote face trigger should be false due to firmware restriction');
    if (caps.supportedEnrollmentStrategies.FACE !== 'DEVICE_ASSISTED') throw new Error('Face strategy should be DEVICE_ASSISTED');
  });

  // GATE 4: RFID Card Strategy Resolution
  runTest('GATE 4', 'Resolves RFID Card as REMOTE_NATIVE direct memory assignment', () => {
    const strat = deviceCapabilityEngine.resolveEnrollmentStrategy(
      { brand: 'eSSL', model: 'AI-FACE MAGNUM', protocol: 'HYBRID_ADMS_TCP', deviceSerial: 'TDBD253600550' },
      'CARD'
    );

    if (strat.strategy !== 'REMOTE_NATIVE') throw new Error('Card strategy should be REMOTE_NATIVE');
    if (strat.verificationMethod !== 'DIRECT_MEMORY_CONFIRM') throw new Error('Verification method mismatch');
  });

  // GATE 5: Optical Fingerprint Strategy Resolution
  runTest('GATE 5', 'Resolves Fingerprint as REMOTE_VENDOR_COMMAND with optical prism trigger', () => {
    const strat = deviceCapabilityEngine.resolveEnrollmentStrategy(
      { brand: 'eSSL', model: 'AI-FACE MAGNUM', protocol: 'HYBRID_ADMS_TCP', deviceSerial: 'TDBD253600550' },
      'FINGERPRINT'
    );

    if (strat.strategy !== 'REMOTE_VENDOR_COMMAND') throw new Error('Fingerprint strategy should be REMOTE_VENDOR_COMMAND');
    if (!strat.canRemoteTriggerSensor) throw new Error('Fingerprint should support sensor trigger');
  });

  // GATE 6: Idempotency Key Generation & Storm Prevention
  runTest('GATE 6', 'Prevents duplicate enrollment command storms across concurrent requests', () => {
    const engine = biometricVerificationEngine;
    const keyParams = {
      tenant_id: 'org-joy-test',
      organization_id: 'org-main',
      device_id: 'dev-001',
      device_ip: '192.168.1.201',
      device_model: 'AI-FACE MAGNUM',
      employee_id: 'emp-1001',
      employee_name: 'Thirumalai R K',
      machine_pin: '1001',
      credential_type: 'FACE' as const,
      strategy: 'DEVICE_ASSISTED' as const,
    };

    const first = engine.createOrGetSession(keyParams);
    if (first.isExisting) throw new Error('First session should not be existing');

    // Subsequent 50 clicks return the same active session
    for (let i = 0; i < 50; i++) {
      const duplicate = engine.createOrGetSession(keyParams);
      if (!duplicate.isExisting) throw new Error('Concurrent clicks must return existing session');
      if (duplicate.session.id !== first.session.id) throw new Error('Session ID mismatch on duplicate click');
    }
  });

  // GATE 7: Strict State Machine Lifecycle
  runTest('GATE 7', 'State transitions advance sequentially and record granular timestamps', () => {
    const engine = biometricVerificationEngine;
    const { session } = engine.createOrGetSession({
      tenant_id: 'org-joy-lifecycle',
      organization_id: 'org-main',
      device_id: 'dev-002',
      device_ip: '192.168.1.201',
      device_model: 'AI-FACE MAGNUM',
      employee_id: 'emp-1002',
      employee_name: 'Dharun B',
      machine_pin: '1002',
      credential_type: 'FACE',
      strategy: 'DEVICE_ASSISTED',
    });

    const s1 = engine.transitionState(session.id, 'USER_PROVISIONED');
    if (s1.status !== 'USER_PROVISIONED' || !s1.user_provisioned_at) throw new Error('Failed transition to USER_PROVISIONED');

    const s2 = engine.transitionState(session.id, 'WAITING_FOR_CAPTURE');
    if (s2.status !== 'WAITING_FOR_CAPTURE' || !s2.capture_started_at) throw new Error('Failed transition to WAITING_FOR_CAPTURE');

    const s3 = engine.transitionState(session.id, 'COMPLETED');
    if (s3.status !== 'COMPLETED' || !s3.completed_at) throw new Error('Failed transition to COMPLETED');
  });

  // GATE 8: Hardware Verification Engine (No False Positives)
  runTest('GATE 8', 'Verifies biometric template existence before approving completion', () => {
    const engine = biometricVerificationEngine;
    const { session } = engine.createOrGetSession({
      tenant_id: 'org-verify',
      organization_id: 'org-main',
      device_id: 'dev-003',
      device_ip: '192.168.1.201',
      device_model: 'AI-FACE MAGNUM',
      employee_id: 'emp-1003',
      employee_name: 'Danya',
      machine_pin: '1003',
      credential_type: 'FACE',
      strategy: 'DEVICE_ASSISTED',
    });

    // Device reports user without face -> should be PENDING
    const pendingReport = engine.verifyEnrollment(session, {
      userId: '1003',
      faceEnrolled: false,
    });
    if (pendingReport.verified) throw new Error('Should not verify when faceEnrolled is false');
    if (pendingReport.status !== 'PENDING') throw new Error('Status should be PENDING');

    // Device reports user with face -> should be VERIFIED
    const verifiedReport = engine.verifyEnrollment(session, {
      userId: '1003',
      faceEnrolled: true,
    });
    if (!verifiedReport.verified) throw new Error('Should verify when faceEnrolled is true');
    if (verifiedReport.status !== 'VERIFIED') throw new Error('Status should be VERIFIED');
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n====================================================================`);
  console.log(`  PASSED: ${passed}/${results.length} | FAILED: ${failed}`);
  console.log(`====================================================================\n`);

  return { total: results.length, passed, failed, results };
}

// Standalone execution
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('universalBiometricOrchestratorV5')) {
  runUniversalBiometricOrchestratorV5Suite();
}
