// src/services/__tests__/biometricTimeSyncPipeline.test.ts
// ============================================================================
// JOY PeopleHR — Biometric Time Synchronization Pipeline Comprehensive Suite
// Verifies 15 Master Gates: Ingestion Normalization, Timezone Authority, Source Locking, Shift Resolution
// ============================================================================

import { describe, it, expect } from 'vitest';
import { attendanceTimeService } from '../attendance/attendanceTimeService';
import { attendanceClassificationEngine } from '../attendance/attendanceClassificationEngine';
import { biometricGatewayService } from '../attendance/biometricGatewayService';
import { hrEventBus } from '../hrEventBus';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[GATE FAILED] ${message}`);
  }
}

export async function runBiometricTimeSyncPipelineSuite(): Promise<{ total: number; passed: number; failed: number }> {
  console.log('\n================================================================');
  console.log('  JOY PEOPLEHR — MASTER BIOMETRIC TIME SYNCHRONIZATION SUITE (15 GATES)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message);
      failed++;
    }
  }

  // Gate 1
  await test('Gate 1: Physical Device 09:12:34 IST -> Supabase 03:42:34 UTC -> Web 09:12:34 AM IST', () => {
    const raw = '2026-09-12 09:12:34';
    const norm = attendanceTimeService.normalizeDeviceTimestamp(raw, 'Asia/Kolkata');
    assert(norm.eventTimestampUtc === '2026-09-12T03:42:34.000Z', `Expected UTC 03:42:34Z, got ${norm.eventTimestampUtc}`);
    assert(norm.businessLocalTimeStr === '09:12:34 AM', `Expected IST 09:12:34 AM, got ${norm.businessLocalTimeStr}`);
    assert(norm.attendanceDate === '2026-09-12', `Expected Date 2026-09-12, got ${norm.attendanceDate}`);
    const webDisplay = attendanceTimeService.formatAttendanceTime(norm.eventTimestampUtc, 'Asia/Kolkata', true);
    assert(webDisplay === '09:12:34 AM', `Web display must match device time: got ${webDisplay}`);
  });

  // Gate 2
  await test('Gate 2: Evening exit punch 18:30:00 IST -> Supabase 13:00:00 UTC -> Web 06:30:00 PM IST', () => {
    const norm = attendanceTimeService.normalizeDeviceTimestamp('2026-09-12 18:30:00', 'Asia/Kolkata');
    assert(norm.eventTimestampUtc === '2026-09-12T13:00:00.000Z', `Expected UTC 13:00:00Z, got ${norm.eventTimestampUtc}`);
    assert(norm.businessLocalTimeStr === '06:30:00 PM', `Expected 06:30:00 PM, got ${norm.businessLocalTimeStr}`);
    assert(norm.minutesFromMidnight === 1110, `Expected 1110 mins from midnight, got ${norm.minutesFromMidnight}`);
  });

  // Gate 3
  await test('Gate 3: Delayed event received 10 minutes late retains device event timestamp', () => {
    const raw = '2026-09-12 09:12:34';
    const receivedTime = new Date('2026-09-12T03:52:34.000Z');
    const norm = attendanceTimeService.normalizeDeviceTimestamp(raw, 'Asia/Kolkata');
    const drift = attendanceTimeService.calculateClockDrift(raw, receivedTime, 'Asia/Kolkata');
    assert(norm.eventTimestampUtc === '2026-09-12T03:42:34.000Z', 'Device event time altered');
    assert(drift.driftSeconds === -600, `Expected drift -600s, got ${drift.driftSeconds}`);
  });

  // Gate 4
  await test('Gate 4: Idempotent duplicate device punch handling', async () => {
    const payload = {
      deviceId: 'bio-dev-zk-k2000',
      biometricPin: '017',
      punchTime: '2026-09-12 09:12:34',
    };
    const p1 = await biometricGatewayService.ingestRawPunch(payload);
    const p2 = await biometricGatewayService.ingestRawPunch(payload);
    assert(p1.punch.punch_time === '2026-09-12T03:42:34.000Z', 'Initial punch timestamp invalid');
    assert(p2.isDeduplicated === true, 'Duplicate punch was not flagged as deduplicated');
  });

  // Gate 5
  await test('Gate 5: Mobile check-in first locks attendance source; biometric punch retains raw log without overriding', async () => {
    const mobNorm = attendanceTimeService.normalizeDeviceTimestamp('2026-09-12 08:55:00', 'Asia/Kolkata');
    const resMob = await attendanceClassificationEngine.ingestAndReconcilePunch({
      deviceId: 'mobile-app',
      biometricPin: '017',
      employeeId: 'emp-gate5',
      employeeName: 'Gate5 Emp',
      employeeCode: 'G5-017',
      timestamp: mobNorm.eventTimestampUtc,
      source: 'MOBILE',
    });
    assert(resMob.calculation.first_in?.source === 'MOBILE', 'Mobile source not registered');

    const bioNorm = attendanceTimeService.normalizeDeviceTimestamp('2026-09-12 09:12:34', 'Asia/Kolkata');
    const resBio = await attendanceClassificationEngine.ingestAndReconcilePunch({
      deviceId: 'bio-dev-zk-k2000',
      biometricPin: '017',
      employeeId: 'emp-gate5',
      employeeName: 'Gate5 Emp',
      employeeCode: 'G5-017',
      timestamp: bioNorm.eventTimestampUtc,
      source: 'BIOMETRIC',
    });
    assert(resBio.calculation.first_in?.source === 'MOBILE', 'Source lock breached by subsequent punch');
    assert(resBio.calculation.first_in?.event_time_str === '08:55:00 AM', 'First check-in time corrupted');
  });

  // Gate 6
  await test('Gate 6: Biometric check-in first creates server-authoritative first_in_at', async () => {
    const norm = attendanceTimeService.normalizeDeviceTimestamp('2026-09-12 09:12:34', 'Asia/Kolkata');
    const res = await attendanceClassificationEngine.ingestAndReconcilePunch({
      deviceId: 'bio-dev-zk-k2000',
      biometricPin: '017',
      employeeId: 'emp-gate6',
      employeeName: 'Gate6 Emp',
      employeeCode: 'G6-017',
      timestamp: norm.eventTimestampUtc,
      source: 'BIOMETRIC',
    });
    assert(res.calculation.first_in?.event_timestamp === '2026-09-12T03:42:34.000Z', 'Invalid first_in_at instant');
    assert(res.calculation.first_in?.event_time_str === '09:12:34 AM', 'Invalid localized time string');
  });

  // Gate 7
  await test('Gate 7: Cross-midnight punch (01:30 AM IST = previous day 20:00 UTC) assigns correct business calendar date', () => {
    const norm = attendanceTimeService.normalizeDeviceTimestamp('2026-09-12 01:30:00', 'Asia/Kolkata');
    assert(norm.eventTimestampUtc === '2026-09-11T20:00:00.000Z', `Expected UTC 20:00:00Z, got ${norm.eventTimestampUtc}`);
    assert(norm.attendanceDate === '2026-09-12', `Business attendance date must be 2026-09-12, got ${norm.attendanceDate}`);
  });

  // Gate 8
  await test('Gate 8: Overnight shift working minutes calculated from UTC instants', () => {
    const inUtc = '2026-09-12T16:30:00.000Z';
    const outUtc = '2026-09-13T00:30:00.000Z';
    const calc = attendanceTimeService.calculateWorkingMinutes(inUtc, outUtc, '10:00 PM', '06:00 AM', 30, 'Asia/Kolkata');
    assert(calc.grossMinutes === 480, `Expected 480 gross mins, got ${calc.grossMinutes}`);
    assert(calc.netMinutes === 450, `Expected 450 net mins, got ${calc.netMinutes}`);
  });

  // Gate 9
  await test('Gate 9: Non-Indian timezones support (Asia/Dubai & UTC)', () => {
    const normDubai = attendanceTimeService.normalizeDeviceTimestamp('2026-09-12 10:00:00', 'Asia/Dubai');
    assert(normDubai.eventTimestampUtc === '2026-09-12T06:00:00.000Z', 'Dubai UTC conversion failed');
    assert(normDubai.deviceTimezone === 'Asia/Dubai', 'Timezone metadata missing');

    const normUtc = attendanceTimeService.normalizeDeviceTimestamp('2026-09-12 12:00:00', 'UTC');
    assert(normUtc.eventTimestampUtc === '2026-09-12T12:00:00.000Z', 'UTC conversion failed');
  });

  // Gate 10
  await test('Gate 10: Device clock drift diagnostics and threshold classification', () => {
    const ref = new Date('2026-09-12T03:42:34.000Z');
    const healthy = attendanceTimeService.calculateClockDrift('2026-09-12 09:12:39', ref, 'Asia/Kolkata');
    const warning = attendanceTimeService.calculateClockDrift('2026-09-12 09:13:19', ref, 'Asia/Kolkata');
    const critical = attendanceTimeService.calculateClockDrift('2026-09-12 09:15:34', ref, 'Asia/Kolkata');

    assert(healthy.status === 'HEALTHY', 'Expected HEALTHY status');
    assert(warning.status === 'WARNING', 'Expected WARNING status');
    assert(critical.status === 'CRITICAL', 'Expected CRITICAL status');
  });

  // Gate 11
  await test('Gate 11: Multi-tenant punch metadata & storage validation', async () => {
    const res = await biometricGatewayService.ingestRawPunch({
      deviceId: 'bio-dev-zk-k2000',
      biometricPin: '017',
      punchTime: '2026-09-12 09:12:34',
    });
    assert(res.punch.punch_time.endsWith('Z'), 'Punch time must be ISO UTC');
    assert(res.punch.device_serial === 'TDBD253600550', 'Device serial mismatch');
  });

  // Gate 12
  await test('Gate 12: Realtime punch events timestamp consistency across bus', async () => {
    let captured: any = null;
    const unsub = hrEventBus.on('attendance.punch_received', (event: any) => {
      const payload = event?.data || event;
      if (payload?.rawEvent?.employee_id === 'emp-gate12' || payload?.employeeId === 'emp-gate12') {
        captured = payload;
      }
    });

    const norm = attendanceTimeService.normalizeDeviceTimestamp('2026-09-12 09:12:34', 'Asia/Kolkata');
    await attendanceClassificationEngine.ingestAndReconcilePunch({
      deviceId: 'bio-dev-zk-k2000',
      biometricPin: '017',
      employeeId: 'emp-gate12',
      employeeName: 'Gate12 Emp',
      timestamp: norm.eventTimestampUtc,
      source: 'BIOMETRIC',
    });

    unsub();
    assert(captured !== null, 'Event was not received on event bus');
    assert(captured.rawEvent.event_timestamp === '2026-09-12T03:42:34.000Z', 'Realtime UTC timestamp corrupted');
    assert(captured.rawEvent.event_time_str === '09:12:34 AM', 'Realtime display string corrupted');
  });

  // Gate 13
  await test('Gate 13: 500+ Concurrent punches batch normalization performance', () => {
    const start = performance.now();
    for (let i = 0; i < 500; i++) {
      const raw = `2026-09-12 09:${String(i % 60).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`;
      const norm = attendanceTimeService.normalizeDeviceTimestamp(raw, 'Asia/Kolkata');
      assert(norm.eventTimestampUtc.endsWith('Z'), 'UTC format error in batch');
      assert(norm.attendanceDate === '2026-09-12', 'Date assignment error in batch');
    }
    const dur = performance.now() - start;
    assert(dur < 200, `Batch processing too slow: ${dur}ms`);
  });

  // Gate 14
  await test('Gate 14: Preservation of device_timestamp_raw and device_timezone evidence', () => {
    const raw = '2026-09-12 09:12:34';
    const norm = attendanceTimeService.normalizeDeviceTimestamp(raw, 'Asia/Kolkata');
    assert(norm.deviceTimestampRaw === '2026-09-12 09:12:34', 'device_timestamp_raw corrupted');
    assert(norm.deviceTimezone === 'Asia/Kolkata', 'device_timezone corrupted');
    assert(norm.eventTimestampUtc === '2026-09-12T03:42:34.000Z', 'event_timestamp_utc corrupted');
  });

  // Gate 15
  await test('Gate 15: Full workday reconciliation Check-In & Check-Out times', async () => {
    const inNorm = attendanceTimeService.normalizeDeviceTimestamp('2026-09-12 09:12:34', 'Asia/Kolkata');
    const outNorm = attendanceTimeService.normalizeDeviceTimestamp('2026-09-12 18:30:00', 'Asia/Kolkata');

    await attendanceClassificationEngine.ingestAndReconcilePunch({
      deviceId: 'bio-dev-zk-k2000',
      biometricPin: '017',
      employeeId: 'emp-gate15',
      employeeName: 'Gate15 Emp',
      timestamp: inNorm.eventTimestampUtc,
      source: 'BIOMETRIC',
    });

    const finalRes = await attendanceClassificationEngine.ingestAndReconcilePunch({
      deviceId: 'bio-dev-zk-k2000',
      biometricPin: '017',
      employeeId: 'emp-gate15',
      employeeName: 'Gate15 Emp',
      timestamp: outNorm.eventTimestampUtc,
      source: 'BIOMETRIC',
    });

    assert(finalRes.calculation.first_in?.event_time_str === '09:12:34 AM', `Check-in time mismatch: ${finalRes.calculation.first_in?.event_time_str}`);
    assert(finalRes.calculation.last_out?.event_time_str === '06:30:00 PM', `Check-out time mismatch: ${finalRes.calculation.last_out?.event_time_str}`);
    assert(finalRes.calculation.status === 'COMPLETED' || finalRes.calculation.status === 'PRESENT', `Expected COMPLETED/PRESENT status, got ${finalRes.calculation.status}`);
    assert(finalRes.calculation.display_status === 'Late' || finalRes.calculation.display_status === 'Present', `Expected display_status Late/Present, got ${finalRes.calculation.display_status}`);
    assert(finalRes.calculation.late_minutes === 12, `Expected 12 late minutes (09:12 vs 09:00), got ${finalRes.calculation.late_minutes}`);
  });


  console.log('================================================================');
  console.log(`  RESULT: ${passed} Passed, ${failed} Failed (Total 15 Gates)`);
  console.log('================================================================\n');

  return { total: 15, passed, failed };
}

describe('JOY PeopleHR — Biometric Time Synchronization Pipeline Comprehensive Suite', () => {
  it('executes and verifies all 15 Master Gates with zero failures', async () => {
    const res = await runBiometricTimeSyncPipelineSuite();
    expect(res.failed).toBe(0);
    expect(res.passed).toBe(15);
  }, 30000);
});

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('biometricTimeSyncPipeline.test.ts')) {
  runBiometricTimeSyncPipelineSuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  }).catch(err => {
    console.error('Suite execution error:', err);
    process.exit(1);
  });
}
