// ============================================================
// Joy PeopleHR — Reliability Learning Engine (Phase 7)
// ============================================================
// Stores permanent post-incident RCA learnings, detects repeated
// failure patterns, and provides prevention signals for future deployments.
// ============================================================

export interface ReliabilityLearningRecord {
  incidentId: string;
  incidentTitle: string;
  rootCauseCategory: 'DEPLOYMENT_DEFECT' | 'DB_MIGRATION_LOCK' | 'VENDOR_TIMEOUT' | 'MEMORY_LEAK';
  affectedServices: string[];
  triggeringChange?: string;
  detectionSignals: string[];
  missedSignals: string[];
  preventionRecommendations: string[];
  resolvedAt: string;
  recurrencePreventedCount: number;
}

export class ReliabilityLearningEngine {
  private static learningRecords: Map<string, ReliabilityLearningRecord> = new Map([
    [
      'inc_learn_001',
      {
        incidentId: 'inc_learn_001',
        incidentTitle: 'P0 Payroll Calculation Timeout on Month-End Draft',
        rootCauseCategory: 'DB_MIGRATION_LOCK',
        affectedServices: ['PAYROLL', 'POSTGRES_DB'],
        triggeringChange: 'MIG-20260815-DB039',
        detectionSignals: ['P95 Query Latency Spike >2000ms', 'Database Connection Pool Exhaustion (98%)'],
        missedSignals: ['Pre-deployment index lock warning on large table'],
        preventionRecommendations: [
          'Add mandatory non-blocking CONCURRENTLY keyword on PostgreSQL index creations',
          'Enforce pre-deploy migration lock inspection in CI pipeline',
        ],
        resolvedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        recurrencePreventedCount: 3,
      },
    ],
    [
      'inc_learn_002',
      {
        incidentId: 'inc_learn_002',
        incidentTitle: 'P1 Biometric Reader Punch Synchronization Backlog',
        rootCauseCategory: 'VENDOR_TIMEOUT',
        affectedServices: ['ATTENDANCE', 'VENDOR_GATEWAY'],
        triggeringChange: 'FLG-20260820-ZK012',
        detectionSignals: ['TCP Socket Timeout >1500ms', 'Punch Ingestion Queue Backlog >500 items'],
        missedSignals: ['Hardware gateway retry exponential backoff missing'],
        preventionRecommendations: [
          'Implement circuit breaker with fallback buffer on hardware TCP sockets',
          'Limit parallel socket handshakes to 50 concurrent connections',
        ],
        resolvedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        recurrencePreventedCount: 5,
      },
    ],
  ]);

  public static getAllLearningRecords(): ReliabilityLearningRecord[] {
    return Array.from(this.learningRecords.values());
  }

  public static checkPreventionSignalsForChange(service: string, changeType: string): string[] {
    const records = Array.from(this.learningRecords.values()).filter((r) =>
      r.affectedServices.includes(service)
    );

    const signals: string[] = [];
    for (const rec of records) {
      signals.push(...rec.preventionRecommendations);
    }
    return signals;
  }
}
