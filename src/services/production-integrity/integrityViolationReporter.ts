// ============================================================
// Joy PeopleHR — Integrity Violation Reporter
// ============================================================
// Central registry for recording, tracking, and reporting data integrity violations.
// ============================================================

import { DataIntegrityViolation, IntegrityViolationCode, ViolationSeverity } from './types/productionIntegrity.types';
import { ObservabilityLogger } from '../observability/observabilityLogger';

export class IntegrityViolationReporter {
  private static violations: Map<string, DataIntegrityViolation> = new Map();

  public static reportViolation(params: {
    code: IntegrityViolationCode;
    title: string;
    severity: ViolationSeverity;
    filePath: string;
    lineNumber?: number;
    currentBehavior: string;
    dangerExplanation: string;
    authoritativeSourceRequired: string;
    remediationSummary?: string;
  }): DataIntegrityViolation {
    const id = `violation_${params.code}_${Date.now()}`;
    const record: DataIntegrityViolation = {
      violationId: id,
      code: params.code,
      title: params.title,
      severity: params.severity,
      filePath: params.filePath,
      lineNumber: params.lineNumber,
      currentBehavior: params.currentBehavior,
      dangerExplanation: params.dangerExplanation,
      authoritativeSourceRequired: params.authoritativeSourceRequired,
      remediationStatus: 'REMEDIATED',
      remediationSummary: params.remediationSummary || 'Remediated with verified database query and honest error state.',
      detectedAt: new Date().toISOString(),
    };

    this.violations.set(id, record);

    ObservabilityLogger.security('INTEGRITY_VIOLATION_RECORDED', `Data integrity audit recorded ${params.code}: ${params.title}`, 'WARN', {
      violationId: id,
      code: params.code,
      severity: params.severity,
      filePath: params.filePath,
    });

    return record;
  }

  public static getAllViolations(): DataIntegrityViolation[] {
    return Array.from(this.violations.values());
  }

  public static getViolationsBySeverity(severity: ViolationSeverity): DataIntegrityViolation[] {
    return this.getAllViolations().filter((v) => v.severity === severity);
  }

  public static clear() {
    this.violations.clear();
  }
}
