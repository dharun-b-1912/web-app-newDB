// src/services/__tests__/universalGatewayV5Certification.test.ts
// ============================================================================
// Universal Biometric Gateway V5 Architecture & Edge Resilience Certification
// Gates 37–44: Multi-Table Classifier, Noise Reduction & Forensic WAL
// ============================================================================

import {
  parseAdmsPayload,
  generatePayloadHash,
  mapVerifyType,
  mapPunchState,
} from '../biometric-saas/admsProtocolEngine';
import { DeviceHeartbeatEngine } from '../biometric-saas/deviceHeartbeatEngine';
import { EdgeEventJournal } from '../biometric-saas/edgeEventJournal';

export interface TestResult {
  gate: string;
  name: string;
  passed: boolean;
  message?: string;
}

export function runUniversalGatewayV5CertificationSuite(): { total: number; passed: number; failed: number; results: TestResult[] } {
  console.log('\n============================================================');
  console.log('  UNIVERSAL BIOMETRIC GATEWAY V5 CERTIFICATION SUITE (Gates 37–44)');
  console.log('============================================================\n');

  const results: TestResult[] = [];

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

  // Gate 37: ATTLOG Parsing
  runTest('GATE 37', 'Correctly classifies and parses standard ATTLOG attendance punches', () => {
    const rawAttlog = '017\t2026-09-02 12:35:21\t15\t0\t0\n154\t2026-09-02 12:36:00\t1\t1\t0';
    const event = parseAdmsPayload('ATTLOG', rawAttlog, 'TBD253600550');

    if (event.table !== 'ATTLOG') throw new Error(`Expected ATTLOG table, got ${event.table}`);
    if (event.eventType !== 'ATTENDANCE_PUNCH') throw new Error(`Expected ATTENDANCE_PUNCH, got ${event.eventType}`);
    if (event.recordsCount !== 2) throw new Error(`Expected 2 records, got ${event.recordsCount}`);
    if (event.attendanceRecords[0].pin !== '017') throw new Error(`Expected PIN 017`);
    if (event.attendanceRecords[0].verifyType !== 'Face Recognition') throw new Error(`Expected Face Recognition`);
    if (event.attendanceRecords[0].punchState !== 'Check-In') throw new Error(`Expected Check-In`);
    if (event.attendanceRecords[1].pin !== '154') throw new Error(`Expected PIN 154`);
    if (event.attendanceRecords[1].punchState !== 'Check-Out') throw new Error(`Expected Check-Out`);
  });

  // Gate 38: OPLOG Punch Detection
  runTest('GATE 38', 'Detects attendance punches sent under OPLOG / OPERLOG table', () => {
    const rawOplog = '27\t2026-09-02 12:40:15\t15\t0';
    const event = parseAdmsPayload('OPLOG', rawOplog, 'TBD253600550');

    if (event.table !== 'OPLOG') throw new Error(`Expected OPLOG table`);
    if (event.eventType !== 'ATTENDANCE_PUNCH') throw new Error(`Expected ATTENDANCE_PUNCH`);
    if (event.attendanceRecords.length !== 1) throw new Error(`Expected 1 attendance record`);
    if (event.attendanceRecords[0].pin !== '27') throw new Error(`Expected PIN 27`);
  });

  // Gate 39: Raw Forensic Storage for Unknown Payloads
  runTest('GATE 39', 'Preserves unknown tables without data loss', () => {
    const rawUnknown = 'CUSTOM_VENDOR_PACKET_XYZ_999';
    const event = parseAdmsPayload('CUSTOM_TABLE_V3', rawUnknown, 'TBD253600550');

    if (event.table !== 'CUSTOM_TABLE_V3') throw new Error(`Expected CUSTOM_TABLE_V3`);
    if (event.eventType !== 'UNKNOWN_EVENT') throw new Error(`Expected UNKNOWN_EVENT`);
    if (event.rawPayload !== rawUnknown) throw new Error(`Raw payload not preserved`);
    if (!event.payloadHash) throw new Error(`Missing payload hash`);
  });

  // Gate 40: SHA-256 Fingerprinting
  runTest('GATE 40', 'Produces deterministic SHA-256 fingerprint for idempotent deduplication', () => {
    const payload = 'PIN=27\tTIME=2026-09-02 12:35:21';
    const hash1 = generatePayloadHash(payload);
    const hash2 = generatePayloadHash(payload);
    const diffHash = generatePayloadHash(payload + '_modified');

    if (hash1 !== hash2) throw new Error(`Hashes for identical payload did not match`);
    if (hash1 === diffHash) throw new Error(`Hashes for different payloads collided`);
  });

  // Gate 41: Heartbeat Aggregation & Noise Filtering
  runTest('GATE 41', 'Aggregates rapid polling and flags log summary only at configured intervals', () => {
    const hbEngine = DeviceHeartbeatEngine.getInstance();
    const sn = `TEST_TERMINAL_SN_${Date.now()}`;

    // 1st poll -> triggers summary
    const poll1 = hbEngine.recordPoll(sn, '192.168.1.201');
    if (!poll1.shouldLogSummary) throw new Error(`First poll should flag log summary`);
    if (poll1.metrics.status !== 'ONLINE') throw new Error(`Status should be ONLINE`);
    if (poll1.metrics.pollCount !== 1) throw new Error(`Poll count should be 1`);

    // 2nd poll within 1 second -> should NOT spam logs
    const poll2 = hbEngine.recordPoll(sn, '192.168.1.201');
    if (poll2.shouldLogSummary) throw new Error(`Subsequent rapid poll should NOT flag log summary`);
    if (poll2.metrics.pollCount !== 2) throw new Error(`Poll count should be 2`);
  });

  // Gate 42: Edge Event Journal Idempotency
  runTest('GATE 42', 'Edge Event Journal detects and rejects duplicate raw payloads', () => {
    const journal = EdgeEventJournal.getInstance();
    const mockEvent = parseAdmsPayload('ATTLOG', `017\t2026-09-02 13:00:${Date.now()}\t15\t0`, 'TBD253600550');

    const firstAppend = journal.appendEvent(mockEvent, 'tenant-corp-01');
    if (firstAppend.isDuplicate) throw new Error(`First append should not be duplicate`);
    if (firstAppend.entry.cloudSyncStatus !== 'PENDING_SYNC') throw new Error(`Status should be PENDING_SYNC`);

    const secondAppend = journal.appendEvent(mockEvent, 'tenant-corp-01');
    if (!secondAppend.isDuplicate) throw new Error(`Second identical append should be flagged as duplicate`);
  });

  // Gate 43: Verification Mode Mapping
  runTest('GATE 43', 'Accurately maps biometric verification modalities', () => {
    if (mapVerifyType(1) !== 'Fingerprint') throw new Error(`Failed Fingerprint mapping`);
    if (mapVerifyType(2) !== 'PIN / Password') throw new Error(`Failed PIN mapping`);
    if (mapVerifyType(4) !== 'RFID Smart Card') throw new Error(`Failed Card mapping`);
    if (mapVerifyType(15) !== 'Face Recognition') throw new Error(`Failed Face mapping`);
    if (mapVerifyType(25) !== 'Palm Vein') throw new Error(`Failed Palm mapping`);
  });

  // Gate 44: Punch Status Mapping
  runTest('GATE 44', 'Accurately maps punch state transitions', () => {
    if (mapPunchState(0) !== 'Check-In') throw new Error(`Failed Check-In mapping`);
    if (mapPunchState(1) !== 'Check-Out') throw new Error(`Failed Check-Out mapping`);
    if (mapPunchState(2) !== 'Break-Out') throw new Error(`Failed Break-Out mapping`);
    if (mapPunchState(3) !== 'Break-In') throw new Error(`Failed Break-In mapping`);
    if (mapPunchState(4) !== 'Overtime-In') throw new Error(`Failed Overtime-In mapping`);
    if (mapPunchState(5) !== 'Overtime-Out') throw new Error(`Failed Overtime-Out mapping`);
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n============================================================`);
  console.log(`  PASSED: ${passed}/${results.length} | FAILED: ${failed}`);
  console.log(`============================================================\n`);

  return { total: results.length, passed, failed, results };
}

// Auto-run when executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('universalGatewayV5Certification')) {
  runUniversalGatewayV5CertificationSuite();
}
