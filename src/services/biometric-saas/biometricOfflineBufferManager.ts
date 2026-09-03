// ============================================================
// Joy PeopleHR — Biometric Offline Buffer & Deduplication Manager (Phase 8.5)
// ============================================================
// Handles offline punch log reconciliation during edge network reconnects,
// SHA-256 deduplication, and clock drift anomaly compensation.
// ============================================================

import { TenantBiometricPunchEvent } from './types/biometricSaas.types';

export interface BatchReconciliationReport {
  totalIngested: number;
  processedCount: number;
  deduplicatedIgnoredCount: number;
  clockDriftAdjustedCount: number;
  durationMs: number;
}

export class BiometricOfflineBufferManager {
  private static processedHashes: Set<string> = new Set();

  public static reconcileOfflineBatch(
    punches: TenantBiometricPunchEvent[],
    clockDriftOffsetSeconds = 0
  ): BatchReconciliationReport {
    const start = performance.now();
    let processed = 0;
    let deduplicated = 0;
    let driftAdjusted = 0;

    for (const p of punches) {
      if (this.processedHashes.has(p.dedupHash)) {
        p.status = 'DEDUPLICATED';
        deduplicated++;
        continue;
      }

      // Compensate for machine clock drift if detected
      if (clockDriftOffsetSeconds !== 0) {
        const originalTime = new Date(p.punchTimestamp).getTime();
        const adjustedTime = new Date(originalTime - clockDriftOffsetSeconds * 1000).toISOString();
        p.punchTimestamp = adjustedTime;
        driftAdjusted++;
      }

      this.processedHashes.add(p.dedupHash);
      p.status = 'PROCESSED';
      processed++;
    }

    return {
      totalIngested: punches.length,
      processedCount: processed,
      deduplicatedIgnoredCount: deduplicated,
      clockDriftAdjustedCount: driftAdjusted,
      durationMs: Math.round(performance.now() - start),
    };
  }

  public static isPunchDuplicate(dedupHash: string): boolean {
    return this.processedHashes.has(dedupHash);
  }
}
