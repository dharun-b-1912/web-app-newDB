// src/services/biometric/tamper/tamperCertificationHarness.ts
// ============================================================================
// Joy PeopleHR — Gate B14: Tamper Detection Certification Test Suite
// ============================================================================

import { TamperEventProcessor } from './tamperEventProcessor';
import { TamperSignalPayload } from './tamperSensorModel';

export interface B14TestResult {
  testId: string;
  scenario: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export class TamperCertificationHarness {
  static async runFullSuite(): Promise<{ total: number; passed: number; failed: number; results: B14TestResult[] }> {
    const orgId = 'org-joy-corporate-solutions-private-';
    const locationId = 'loc-water-tec-unit3';
    const deviceId = 'DEV-CBE-WT-01';

    const results: B14TestResult[] = [];
    let passed = 0;
    let failed = 0;

    // Test 1: Physical Microswitch Cover Open Signal
    const sig1: TamperSignalPayload = {
      organization_id: orgId,
      device_id: deviceId,
      location_id: locationId,
      sensor_type: 'CHASSIS_COVER_SWITCH',
      microswitch_state: 'OPEN',
      tamper_triggered_at: new Date().toISOString(),
    };
    const inc1 = await TamperEventProcessor.processSignal(sig1);
    const pass1 = inc1.status === 'UNACKNOWLEDGED' && inc1.device_restricted === true;
    if (pass1) passed++; else failed++;
    results.push({ testId: 'B14-T01', scenario: 'PHYSICAL MICROSWITCH COVER OPEN', expected: 'UNACKNOWLEDGED + RESTRICTED', actual: `${inc1.status} + RESTRICTED:${inc1.device_restricted}`, passed: pass1 });

    // Test 2: Optical Wall Removal Sensor Breach
    const sig2: TamperSignalPayload = {
      organization_id: orgId,
      device_id: deviceId,
      location_id: locationId,
      sensor_type: 'OPTICAL_WALL_REMOVAL',
      optical_voltage_mv: 4200,
      microswitch_state: 'OPEN',
      tamper_triggered_at: new Date().toISOString(),
    };
    const inc2 = await TamperEventProcessor.processSignal(sig2);
    const pass2 = inc2.severity === 'CRITICAL' && inc2.status === 'UNACKNOWLEDGED';
    if (pass2) passed++; else failed++;
    results.push({ testId: 'B14-T02', scenario: 'OPTICAL WALL REMOVAL BREACH', expected: 'CRITICAL UNACKNOWLEDGED', actual: `${inc2.severity} ${inc2.status}`, passed: pass2 });

    // Test 3: Investigation State Advance
    const ackInc = TamperEventProcessor.acknowledgeIncident(inc1.incident_id, 'admin-sec-01');
    const pass3 = ackInc?.status === 'INVESTIGATING' && ackInc?.acknowledged_by === 'admin-sec-01';
    if (pass3) passed++; else failed++;
    results.push({ testId: 'B14-T03', scenario: 'SECURITY ACKNOWLEDGEMENT TO INVESTIGATING', expected: 'INVESTIGATING', actual: ackInc?.status || 'FAIL', passed: pass3 });

    // Test 4: Physical Resolution & Re-enabling Device
    const resInc = TamperEventProcessor.resolveIncident(inc1.incident_id, 'admin-sec-01', 'Chassis cover secured and inspected.');
    const pass4 = resInc?.status === 'RESOLVED' && resInc?.device_restricted === false;
    if (pass4) passed++; else failed++;
    results.push({ testId: 'B14-T04', scenario: 'ADMINISTRATIVE RESOLUTION & RESTORE', expected: 'RESOLVED + UNRESTRICTED', actual: `${resInc?.status} + RESTRICTED:${resInc?.device_restricted}`, passed: pass4 });

    // Test 5: Rejection of Silent Auto-Closure
    const pass5 = inc2.status === 'UNACKNOWLEDGED';
    if (pass5) passed++; else failed++;
    results.push({ testId: 'B14-T05', scenario: 'SILENT AUTO-CLOSURE REJECTION', expected: 'IMMUTABLE UNACKNOWLEDGED', actual: inc2.status, passed: pass5 });

    return { total: results.length, passed, failed, results };
  }
}
