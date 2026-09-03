// ============================================================
// Joy PeopleHR — Stale Data Detector (Phase 8)
// ============================================================
// Enforces strict freshness classification across all telemetry metrics.
// Prevents silent display of stale or cached data during database outages.
// ============================================================

export type DataFreshnessTier = 'LIVE_VERIFIED' | 'DATA_DELAYED' | 'DATA_STALE' | 'DATA_UNAVAILABLE';

export interface FreshnessEvaluation {
  metricKey: string;
  ageSeconds: number;
  tier: DataFreshnessTier;
  displayBadge: string;
  badgeColor: string;
  isSafeForProductionDecisions: boolean;
}

export class StaleDataDetector {
  public static evaluateFreshness(metricKey: string, lastUpdatedTimestamp?: string): FreshnessEvaluation {
    if (!lastUpdatedTimestamp) {
      return {
        metricKey,
        ageSeconds: Infinity,
        tier: 'DATA_UNAVAILABLE',
        displayBadge: '● DATA UNAVAILABLE',
        badgeColor: '#EF4444',
        isSafeForProductionDecisions: false,
      };
    }

    const ageSeconds = Math.max(0, Math.round((Date.now() - new Date(lastUpdatedTimestamp).getTime()) / 1000));

    if (ageSeconds < 60) {
      return {
        metricKey,
        ageSeconds,
        tier: 'LIVE_VERIFIED',
        displayBadge: '● LIVE VERIFIED',
        badgeColor: '#10B981',
        isSafeForProductionDecisions: true,
      };
    }

    if (ageSeconds <= 300) {
      return {
        metricKey,
        ageSeconds,
        tier: 'DATA_DELAYED',
        displayBadge: '● DATA DELAYED',
        badgeColor: '#F59E0B',
        isSafeForProductionDecisions: true,
      };
    }

    return {
      metricKey,
      ageSeconds,
      tier: 'DATA_STALE',
      displayBadge: '● DATA STALE (>5m)',
      badgeColor: '#F97316',
      isSafeForProductionDecisions: false,
    };
  }
}
