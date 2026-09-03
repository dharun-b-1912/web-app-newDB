// ============================================================
// Joy PeopleHR — Production Reality Guard
// ============================================================
// Master service unifying forensic scanners, computing the
// mathematically auditable Production Integrity Score, and enforcing zero fake data.
// ============================================================

import { ProductionIntegrityScoreCard, DataIntegrityViolation } from './types/productionIntegrity.types';
import { DataIntegrityScanner } from './dataIntegrityScanner';
import { IntegrityViolationReporter } from './integrityViolationReporter';

export class ProductionRealityGuard {
  public static calculateIntegrityScoreCard(): ProductionIntegrityScoreCard {
    const scan = DataIntegrityScanner.runFullScan();
    const violations = IntegrityViolationReporter.getAllViolations();

    const activeViolations = violations.filter((v) => v.remediationStatus !== 'REMEDIATED');

    const criticalCount = activeViolations.filter((v) => v.severity === 'CRITICAL').length;
    const highCount = activeViolations.filter((v) => v.severity === 'HIGH').length;
    const mediumCount = activeViolations.filter((v) => v.severity === 'MEDIUM').length;
    const lowCount = activeViolations.filter((v) => v.severity === 'LOW').length;

    // Mathematical Penalty Formula:
    // Base 100 - (Critical * 20 + High * 10 + Medium * 5 + Low * 2)
    const penalties = criticalCount * 20 + highCount * 10 + mediumCount * 5 + lowCount * 2;
    const integrityScore = Math.max(0, 100 - penalties);

    return {
      integrityScore,
      totalFilesScanned: scan.filesScanned,
      productionPathsVerified: scan.productionFilesVerified,
      apiChainsVerified: scan.apiChainsChecked,
      criticalViolationsCount: criticalCount,
      highViolationsCount: highCount,
      mediumViolationsCount: mediumCount,
      lowViolationsCount: lowCount,
      activeViolationsList: violations,
      scannedAt: scan.scannedAt,
      isProductionCertified: integrityScore === 100 && criticalCount === 0 && highCount === 0,
    };
  }
}
