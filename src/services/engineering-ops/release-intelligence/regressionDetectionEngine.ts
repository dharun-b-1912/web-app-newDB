// ============================================================
// Joy PeopleHR — Regression Detection Engine (Phase 7)
// ============================================================
// Statistically distinguishes normal variance from release-induced regression.
// Evaluates error rate deltas, latency spikes, and SLO burn shifts.
// ============================================================

import { PrePostReleaseComparator, ReleaseComparisonReport } from './prePostReleaseComparator';

export type RegressionSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RegressionEvidence {
  metricName: string;
  observedDelta: string;
  thresholdExceeded: string;
  isTriggered: boolean;
}

export interface RegressionAssessment {
  service: string;
  associatedRelease: string;
  regressionDetected: boolean;
  severity: RegressionSeverity;
  confidencePercentage: number;
  evidence: RegressionEvidence[];
  recommendedAction: string;
  requiresCommanderRollbackApproval: boolean;
  evaluationTimestamp: string;
}

export class RegressionDetectionEngine {
  public static evaluateRegression(service: string, fingerprint: string): RegressionAssessment {
    const comparison: ReleaseComparisonReport = PrePostReleaseComparator.compareRelease(service, fingerprint);

    const evidence: RegressionEvidence[] = [
      {
        metricName: 'Error Rate Delta',
        observedDelta: `${comparison.delta.errorRateDeltaPercentage > 0 ? '+' : ''}${comparison.delta.errorRateDeltaPercentage}%`,
        thresholdExceeded: '> +100% baseline deviation',
        isTriggered: comparison.delta.errorRateDeltaPercentage > 100,
      },
      {
        metricName: 'P95 Latency Shift',
        observedDelta: `${comparison.delta.latencyDeltaPercentage > 0 ? '+' : ''}${comparison.delta.latencyDeltaPercentage}% (${comparison.postRelease.p95LatencyMs}ms)`,
        thresholdExceeded: '> +100% latency expansion',
        isTriggered: comparison.delta.latencyDeltaPercentage > 100,
      },
      {
        metricName: 'SLO Success Rate Drop',
        observedDelta: `${comparison.delta.successRateDeltaPercentage}%`,
        thresholdExceeded: '< -0.20% availability drop',
        isTriggered: comparison.delta.successRateDeltaPercentage < -0.2,
      },
    ];

    const triggeredCount = evidence.filter((e) => e.isTriggered).length;

    let severity: RegressionSeverity = 'NONE';
    let recommendedAction = 'Release operating within normal statistical variance.';
    let requiresApproval = false;

    if (triggeredCount === 3) {
      severity = 'CRITICAL';
      recommendedAction = 'CRITICAL REGRESSION: Pre-stage rollback package and request Commander approval to rollback.';
      requiresApproval = true;
    } else if (triggeredCount >= 2) {
      severity = 'HIGH';
      recommendedAction = 'HIGH REGRESSION: Extend watch window to 120m, notify technical squad, and inspect DB query locks.';
      requiresApproval = true;
    } else if (triggeredCount === 1) {
      severity = 'MEDIUM';
      recommendedAction = 'ELEVATED METRICS: Increase telemetry sampling rate to 100% and monitor P95 latency.';
    }

    return {
      service,
      associatedRelease: fingerprint,
      regressionDetected: triggeredCount > 0,
      severity,
      confidencePercentage: comparison.confidencePercentage,
      evidence,
      recommendedAction,
      requiresCommanderRollbackApproval: requiresApproval,
      evaluationTimestamp: new Date().toISOString(),
    };
  }

  public static getAllAssessments(): RegressionAssessment[] {
    return [
      this.evaluateRegression('PAYROLL', 'REL-20260902-A8F4K'),
      this.evaluateRegression('ATTENDANCE', 'REL-20260901-B7E2X'),
      this.evaluateRegression('AUTH', 'REL-20260830-C1D9P'),
    ];
  }
}
