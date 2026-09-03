// ============================================================
// Joy PeopleHR — Rollback Recommendation Engine (Phase 7)
// ============================================================
// Pre-stages rollback targets and manages Level 3 human authorization.
// Rollback is strictly protected: requires Commander Approval.
// ============================================================

export interface RollbackPackage {
  packageId: string;
  service: string;
  failingFingerprint: string;
  rollbackTargetVersion: string;
  rollbackCommitSha: string;
  regressionReason: string;
  status: 'PRE_STAGED' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  requiresCommanderApproval: boolean;
  approvedBy?: string;
  executedAt?: string;
}

export class RollbackRecommendationEngine {
  private static packages: Map<string, RollbackPackage> = new Map([
    [
      'rb_pkg_payroll_01',
      {
        packageId: 'rb_pkg_payroll_01',
        service: 'PAYROLL',
        failingFingerprint: 'REL-20260902-A8F4K',
        rollbackTargetVersion: 'v2.4.0',
        rollbackCommitSha: '7f91c02e88a',
        regressionReason: 'Critical error rate spike (+925%) on salary component calculation.',
        status: 'PRE_STAGED',
        requiresCommanderApproval: true,
      },
    ],
  ]);

  public static getRollbackPackages(): RollbackPackage[] {
    return Array.from(this.packages.values());
  }

  public static approveRollback(packageId: string, commanderName: string): boolean {
    const pkg = this.packages.get(packageId);
    if (!pkg) return false;
    pkg.status = 'APPROVED';
    pkg.approvedBy = commanderName;
    pkg.executedAt = new Date().toISOString();
    return true;
  }

  public static rejectRollback(packageId: string, commanderName: string): boolean {
    const pkg = this.packages.get(packageId);
    if (!pkg) return false;
    pkg.status = 'REJECTED';
    pkg.approvedBy = commanderName;
    return true;
  }
}
