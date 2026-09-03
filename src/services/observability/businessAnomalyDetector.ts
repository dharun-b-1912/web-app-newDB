// ============================================================
// Joy PeopleHR — Business Workflow Anomaly Detector
// ============================================================
// Detects business logic & operational failures that do not throw runtime
// exceptions (e.g. 90% drop in expected biometric punches, payroll headcount mismatch).
// ============================================================

import { ObservabilityLogger } from './observabilityLogger';

export interface BusinessAnomalyAlert {
  id: string;
  timestamp: string;
  category: 'ATTENDANCE_PUNCHES' | 'PAYROLL_HEADCOUNT' | 'ONBOARDING_FUNNEL' | 'VENDOR_INVOICES';
  tenantId: string;
  companyName: string;
  expectedValue: number;
  actualValue: number;
  deviationPercentage: number;
  severity: 'WARNING' | 'CRITICAL';
  description: string;
}

export class BusinessAnomalyDetector {
  private static anomalies: BusinessAnomalyAlert[] = [];
  private static listeners: Set<(anomalies: BusinessAnomalyAlert[]) => void> = new Set();

  /**
   * Evaluates biometric daily punch volumes vs historical expected baselines
   */
  public static evaluateAttendancePunches(tenantId: string, companyName: string, expected: number, actual: number): BusinessAnomalyAlert | null {
    if (expected <= 0) return null;
    const deviation = ((expected - actual) / expected) * 100;

    if (deviation >= 50) {
      const isCritical = deviation >= 80;
      const alert: BusinessAnomalyAlert = {
        id: `anom_att_${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: 'ATTENDANCE_PUNCHES',
        tenantId,
        companyName,
        expectedValue: expected,
        actualValue: actual,
        deviationPercentage: Math.round(deviation),
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        description: `Potential hardware gateway failure: Received ${actual.toLocaleString()} punches vs expected ${expected.toLocaleString()} (${Math.round(deviation)}% drop)`,
      };

      this.recordAnomaly(alert);
      ObservabilityLogger.businessEvent(
        'ATTENDANCE_PUNCH_ANOMALY',
        alert.description,
        { tenantId, expected, actual, deviation },
        true
      );
      return alert;
    }
    return null;
  }

  /**
   * Evaluates payroll run headcount completeness
   */
  public static evaluatePayrollRun(tenantId: string, companyName: string, activeEmployees: number, processedPayslips: number): BusinessAnomalyAlert | null {
    if (activeEmployees <= 0) return null;
    const missing = activeEmployees - processedPayslips;

    if (missing > 0) {
      const deviation = (missing / activeEmployees) * 100;
      const isCritical = deviation >= 10;
      const alert: BusinessAnomalyAlert = {
        id: `anom_pay_${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: 'PAYROLL_HEADCOUNT',
        tenantId,
        companyName,
        expectedValue: activeEmployees,
        actualValue: processedPayslips,
        deviationPercentage: Math.round(deviation),
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        description: `Payroll run incomplete: Processed ${processedPayslips} of ${activeEmployees} eligible employees (${missing} missing)`,
      };

      this.recordAnomaly(alert);
      ObservabilityLogger.businessEvent(
        'PAYROLL_HEADCOUNT_ANOMALY',
        alert.description,
        { tenantId, activeEmployees, processedPayslips, missing },
        true
      );
      return alert;
    }
    return null;
  }

  private static recordAnomaly(alert: BusinessAnomalyAlert) {
    this.anomalies.unshift(alert);
    if (this.anomalies.length > 100) this.anomalies.pop();
    this.notify();
  }

  public static getAnomalies(): BusinessAnomalyAlert[] {
    return [...this.anomalies];
  }

  public static subscribe(listener: (anomalies: BusinessAnomalyAlert[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify() {
    const list = this.getAnomalies();
    this.listeners.forEach((l) => {
      try {
        l(list);
      } catch (_) {}
    });
  }
}
