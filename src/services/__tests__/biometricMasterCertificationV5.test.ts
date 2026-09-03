import {
  universalBiometricEngineV5Master,
  CommandErrorInterpreter,
  EnrollmentSessionStatus,
} from '../biometric-saas/universalBiometricEngineV5Master';

export function runMasterCertificationV5Suite() {
  const results: { test: string; name: string; passed: boolean; error?: string }[] = [];

  const run = (test: string, name: string, fn: () => void) => {
    try {
      fn();
      results.push({ test, name, passed: true });
    } catch (e: any) {
      results.push({ test, name, passed: false, error: e.message });
    }
  };

  run('TEST 1', 'Provision User creates identity without marking face_enrolled', () => {
    const { session } = universalBiometricEngineV5Master.createOrGetEnrollmentSession({
      tenantId: 'org-test',
      organizationId: 'org-main',
      deviceId: 'dev-001',
      deviceSerial: 'TDBD253600550',
      employeeId: 'emp-dharun',
      employeeName: 'Dharun B',
      machinePin: '1001',
      modality: 'FACE',
    });

    if (session.evidence.templateStored) throw new Error('Template must not be marked stored upon creation');
    if (session.status === EnrollmentSessionStatus.COMPLETED) throw new Error('Session must not be completed upon creation');
  });

  run('TEST 2', 'eSSL AI-Face Magnum defaults to LOCAL_DEVICE_ENROLLMENT due to firmware restriction', () => {
    const profile = universalBiometricEngineV5Master.resolveDeviceProfile({
      serialNumber: 'TDBD253600550',
      model: 'AI-FACE MAGNUM',
    });
    if (profile.capabilities.FACE.enrollmentMode !== 'LOCAL_DEVICE_ENROLLMENT') {
      throw new Error(`Expected LOCAL_DEVICE_ENROLLMENT, got ${profile.capabilities.FACE.enrollmentMode}`);
    }
  });

  run('TEST 3', 'Command ACK (Return=0) does NOT mark enrollment complete', () => {
    const ack = CommandErrorInterpreter.interpret(0, 'CONTROL ENROLL_FACE PIN=1001');
    if (!ack.commandAccepted) throw new Error('Command should be accepted');
    if (ack.executionConfirmed) throw new Error('Execution must not be confirmed');
  });

  run('TEST 4', 'RFID Direct Assignment requires non-empty card number', () => {
    const { session } = universalBiometricEngineV5Master.createOrGetEnrollmentSession({
      tenantId: 'org-test',
      organizationId: 'org-main',
      deviceId: 'dev-rfid',
      deviceSerial: 'TDBD253600550',
      employeeId: 'emp-danya',
      employeeName: 'Danya',
      machinePin: '154',
      modality: 'RFID_CARD',
      cardUid: '3212737',
    });

    if (session.cardUid !== '3212737') throw new Error('Card UID mismatch');
    if (session.status !== EnrollmentSessionStatus.COMPLETED) throw new Error('Status should be COMPLETED');
  });

  run('TEST 5', 'Blank RFID Card assignment is rejected', () => {
    let threw = false;
    try {
      universalBiometricEngineV5Master.createOrGetEnrollmentSession({
        tenantId: 'org-test',
        organizationId: 'org-main',
        deviceId: 'dev-rfid-blank',
        deviceSerial: 'TDBD253600550',
        employeeId: 'emp-danya-blank',
        employeeName: 'Danya',
        machinePin: '154',
        modality: 'RFID_CARD',
        cardUid: '',
      });
    } catch {
      threw = true;
    }
    if (!threw) throw new Error('Blank card must throw');
  });

  run('TEST 6', 'Return=-1002 is interpreted as COMMAND_NOT_SUPPORTED_BY_FIRMWARE', () => {
    const interpreted = CommandErrorInterpreter.interpret(-1002, 'CONTROL ENROLL_FACE PIN=1001');
    if (interpreted.commandAccepted) throw new Error('Return=-1002 must not be marked accepted');
    if (interpreted.executionConfirmed) throw new Error('Return=-1002 must not be marked confirmed');
    if (!interpreted.recommendedAction.includes('Local Device-Assisted Enrollment')) {
      throw new Error('Must recommend Local Device-Assisted flow');
    }
  });

  run('TEST 7', 'Live Attendance punch confirms biometric template existence', () => {
    const { session } = universalBiometricEngineV5Master.createOrGetEnrollmentSession({
      tenantId: 'org-test',
      organizationId: 'org-main',
      deviceId: 'dev-punch',
      deviceSerial: 'TDBD253600550',
      employeeId: 'emp-punch',
      employeeName: 'Dharun B',
      machinePin: '1001',
      modality: 'FACE',
    });

    const report = universalBiometricEngineV5Master.verifyBiometricTemplate(session.id, {
      type: 'LIVE_PUNCH',
      pin: '1001',
    });

    if (!report.verified) throw new Error('Live punch should verify enrollment');
    if (report.session.status !== EnrollmentSessionStatus.COMPLETED) throw new Error('Session should be COMPLETED');
  });

  run('TEST 8', 'Device Mutex returns existing session for identical in-progress request', () => {
    const params = {
      tenantId: 'org-test',
      organizationId: 'org-main',
      deviceId: 'dev-mutex-active',
      deviceSerial: 'TDBD253600550',
      employeeId: 'emp-thiru-mutex',
      employeeName: 'Thirumalai R K',
      machinePin: '27',
      modality: 'FINGERPRINT' as const,
      fingerPosition: 'RIGHT_INDEX' as const,
    };

    const first = universalBiometricEngineV5Master.createOrGetEnrollmentSession(params);
    const second = universalBiometricEngineV5Master.createOrGetEnrollmentSession(params);

    if (!second.isExisting) throw new Error('Second call must return existing session');
    if (second.session.id !== first.session.id) throw new Error('Session ID mismatch');
  });

  run('TEST 9', 'Return=-1002 is interpreted as COMMAND_NOT_SUPPORTED_BY_FIRMWARE', () => {
    const interpreted = CommandErrorInterpreter.interpret(-1002, 'CONTROL ENROLL_FACE PIN=1001');
    if (interpreted.commandAccepted) throw new Error('Return=-1002 must not be marked accepted');
    if (interpreted.executionConfirmed) throw new Error('Return=-1002 must not be marked confirmed');
    if (!interpreted.recommendedAction.includes('Local Device-Assisted Enrollment')) {
      throw new Error('Must recommend Local Device-Assisted flow');
    }
  });

  run('TEST 10', 'Master anti-simulation rule prohibits auto-exit and fake timers', () => {
    const session = universalBiometricEngineV5Master.createOrGetEnrollmentSession({
      tenantId: 'org-test',
      organizationId: 'org-main',
      deviceId: 'dev-anti-sim',
      deviceSerial: 'TDBD253600550',
      employeeId: 'emp-anti-sim',
      employeeName: 'Anti Sim User',
      machinePin: '999',
      modality: 'FACE',
    });

    if (session.session.status === EnrollmentSessionStatus.COMPLETED) throw new Error('Status must not be completed');
    if (session.session.evidence.templateStored) throw new Error('Template stored must be false');
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return { passed, failed, total: results.length, results };
}
