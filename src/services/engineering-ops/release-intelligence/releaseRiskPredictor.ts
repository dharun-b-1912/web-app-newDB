// ============================================================
// Joy PeopleHR — Pre-Deployment Release Risk Predictor (Phase 7)
// ============================================================
// Evaluates planned releases before production deployment against
// historical changes, database migrations, and business criticality.
// ============================================================

export interface ReleaseRiskFactor {
  factorName: string;
  pointsAdded: number;
  evidence: string;
  isTriggered: boolean;
}

export interface ReleaseRiskForecast {
  service: string;
  version: string;
  riskScore: number; // 0 - 100
  confidencePercentage: number;
  factors: ReleaseRiskFactor[];
  recommendedWatchWindowMinutes: 10 | 30 | 60 | 120;
  recommendation: string;
  evaluatedAt: string;
}

export class ReleaseRiskPredictor {
  public static predictReleaseRisk(params: {
    service: string;
    version: string;
    hasDatabaseMigration: boolean;
    isCriticalDomain: boolean;
    hasRecentIncidents: boolean;
    hasHighDependencyFanout: boolean;
  }): ReleaseRiskForecast {
    const factors: ReleaseRiskFactor[] = [
      {
        factorName: 'Database Schema Migration',
        pointsAdded: params.hasDatabaseMigration ? 20 : 0,
        evidence: params.hasDatabaseMigration ? 'DDL/DML migration on core tables' : 'No schema changes',
        isTriggered: params.hasDatabaseMigration,
      },
      {
        factorName: 'Business Criticality Domain',
        pointsAdded: params.isCriticalDomain ? 20 : 0,
        evidence: params.isCriticalDomain ? 'Mission-critical domain (Payroll / Auth)' : 'Standard domain',
        isTriggered: params.isCriticalDomain,
      },
      {
        factorName: 'Past Similar Incident Proximity',
        pointsAdded: params.hasRecentIncidents ? 15 : 0,
        evidence: params.hasRecentIncidents ? 'RCA recorded incident on this service in last 30d' : 'No recent incidents',
        isTriggered: params.hasRecentIncidents,
      },
      {
        factorName: 'High Dependency Fan-out Depth',
        pointsAdded: params.hasHighDependencyFanout ? 12 : 0,
        evidence: params.hasHighDependencyFanout ? 'Affects >3 downstream critical processes' : 'Isolated dependency blast radius',
        isTriggered: params.hasHighDependencyFanout,
      },
    ];

    const riskScore = factors.reduce((sum, f) => sum + f.pointsAdded, 0);

    let recommendedWatchWindowMinutes: 10 | 30 | 60 | 120 = 30;
    if (riskScore >= 60) {
      recommendedWatchWindowMinutes = 120;
    } else if (riskScore >= 40) {
      recommendedWatchWindowMinutes = 60;
    } else if (riskScore < 20) {
      recommendedWatchWindowMinutes = 10;
    }

    return {
      service: params.service,
      version: params.version,
      riskScore,
      confidencePercentage: 88,
      factors,
      recommendedWatchWindowMinutes,
      recommendation: `Recommended Post-Release Health Watch: ${recommendedWatchWindowMinutes} Minutes`,
      evaluatedAt: new Date().toISOString(),
    };
  }

  public static getSampleForecast(): ReleaseRiskForecast {
    return this.predictReleaseRisk({
      service: 'PAYROLL',
      version: 'v2.4.1',
      hasDatabaseMigration: true,
      isCriticalDomain: true,
      hasRecentIncidents: true,
      hasHighDependencyFanout: true,
    });
  }
}
