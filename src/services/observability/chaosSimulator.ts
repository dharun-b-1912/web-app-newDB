// ============================================================
// Joy PeopleHR — Synthetic Chaos & Telemetry Simulator
// ============================================================
// Generates simulated production anomalies to test error grouping,
// severity rules, PII scrubbing, and Joy Platform Ops dashboards.
// ============================================================

import { ObservabilityLogger } from './observabilityLogger';
import { ErrorReferenceService } from './errorReferenceService';
import { PiiScrubber } from './piiScrubber';
import { BusinessAnomalyDetector } from './businessAnomalyDetector';
import { TraceManager } from './traceManager';

export class ChaosSimulator {
  /**
   * Simulates a P0 Critical Platform Database Connection Outage
   */
  public static triggerP0DatabaseCrash(): string {
    TraceManager.setTenantContext('tenant_global', 'Joy Corp Global', 'system_db');
    TraceManager.setModule('DATABASE');

    const err = new Error('Supabase connection pool exhausted: Database connection lost [FATAL 53300]');
    (err as any).code = '53300';

    const refId = ErrorReferenceService.recordError(
      err,
      'DATABASE',
      '[SYNTHETIC] Database connection lost: Supabase pool exhausted',
      { poolSize: 200, activeConnections: 200, queueWaitMs: 30000, isSynthetic: true }
    );

    ObservabilityLogger.fatal(
      'DB_POOL_EXHAUSTED',
      '[SYNTHETIC] Supabase connection pool reached limit. All tenant queries failing.',
      err,
      { activeConnections: 200, isSynthetic: true }
    );

    return refId;
  }

  /**
   * Simulates a P1 Payroll Calculation Engine Error with PII
   */
  public static triggerP1PayrollException(): string {
    TraceManager.setTenantContext('tenant_joy_corp', 'Joy Corporate Solutions', 'emp_finance_01');
    TraceManager.setModule('PAYROLL');

    const rawPayloadWithPii = {
      employee_id: 'EMP-9021',
      employee_name: 'Rahul Sharma',
      aadhaar_number: '5489 1234 8901',
      pan_number: 'ABCDE1234F',
      bank_account_number: '987654321098',
      basic_salary: 75000,
      ctc: 1200000,
      password_hash: '$2b$12$e8x...secret',
    };

    // Scrub payload first
    const cleanPayload = PiiScrubber.scrub(rawPayloadWithPii);

    const err = new TypeError("Cannot read property 'hra_components' of undefined in payroll batch");
    const refId = ErrorReferenceService.recordError(
      err,
      'PAYROLL',
      '[SYNTHETIC] Payroll calculation failed for batch SEP-2026',
      { ...cleanPayload, isSynthetic: true }
    );

    return refId;
  }

  /**
   * Simulates an Attendance Biometric Hardware Anomaly
   */
  public static triggerAttendanceAnomaly() {
    BusinessAnomalyDetector.evaluateAttendancePunches(
      'tenant_abc_services',
      'ABC Facility Services',
      15000, // Expected punches
      1200   // Actual punches (92% drop)
    );
  }

  /**
   * Simulates a Payroll Headcount Anomaly
   */
  public static triggerPayrollHeadcountAnomaly() {
    BusinessAnomalyDetector.evaluatePayrollRun(
      'tenant_apex_logistics',
      'Apex Logistics Pvt Ltd',
      1200, // Eligible
      847   // Processed (353 missing)
    );
  }
}
