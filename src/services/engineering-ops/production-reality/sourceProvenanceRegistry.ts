// ============================================================
// Joy PeopleHR — Source Provenance Registry (Phase 8)
// ============================================================
// Authoritative registry defining the mathematical formula, database table,
// and freshness requirements for every Engineering Ops KPI.
// ============================================================

export interface MetricProvenanceContract {
  kpiId: string;
  kpiTitle: string;
  uiComponentLocation: string;
  authoritativeTable: string;
  mathematicalFormula: string;
  maxAllowedStalenessSeconds: number;
  syntheticAllowedInCalculation: boolean;
  mockAllowedInCalculation: boolean;
}

export class SourceProvenanceRegistry {
  private static contracts: Map<string, MetricProvenanceContract> = new Map([
    [
      'PLATFORM_HEALTH_SLO',
      {
        kpiId: 'PLATFORM_HEALTH_SLO',
        kpiTitle: 'Platform Health & Availability',
        uiComponentLocation: 'JoyEngineeringOpsMaster.tsx -> Top Mission Control Bar',
        authoritativeTable: 'public.observability_events',
        mathematicalFormula: '(successful_requests / total_requests) * 100',
        maxAllowedStalenessSeconds: 60,
        syntheticAllowedInCalculation: false,
        mockAllowedInCalculation: false,
      },
    ],
    [
      'ACTIVE_INCIDENTS_COUNT',
      {
        kpiId: 'ACTIVE_INCIDENTS_COUNT',
        kpiTitle: 'Active Incidents Count',
        uiComponentLocation: 'JoyEngineeringOpsMaster.tsx -> Top Mission Control Bar',
        authoritativeTable: 'public.incidents',
        mathematicalFormula: 'COUNT(*) WHERE status IN (\'INVESTIGATING\', \'IDENTIFIED\', \'MONITORING\')',
        maxAllowedStalenessSeconds: 30,
        syntheticAllowedInCalculation: false,
        mockAllowedInCalculation: false,
      },
    ],
    [
      'PREDICTIVE_RISK_SUMMARY',
      {
        kpiId: 'PREDICTIVE_RISK_SUMMARY',
        kpiTitle: 'Predictive Risks Count',
        uiComponentLocation: 'JoyEngineeringOpsMaster.tsx -> Top Mission Control Bar',
        authoritativeTable: 'public.observability_events',
        mathematicalFormula: 'COUNT(modules) WHERE total_risk_score >= 51',
        maxAllowedStalenessSeconds: 60,
        syntheticAllowedInCalculation: false,
        mockAllowedInCalculation: false,
      },
    ],
    [
      'SLO_BURN_RATE',
      {
        kpiId: 'SLO_BURN_RATE',
        kpiTitle: 'SLO Error Budget Burn Multiplier',
        uiComponentLocation: 'JoyEngineeringOpsMaster.tsx -> Top Mission Control Bar',
        authoritativeTable: 'public.observability_events',
        mathematicalFormula: 'current_hourly_error_rate / (error_budget / 720h)',
        maxAllowedStalenessSeconds: 60,
        syntheticAllowedInCalculation: false,
        mockAllowedInCalculation: false,
      },
    ],
    [
      'DATA_PLANE_TRUST',
      {
        kpiId: 'DATA_PLANE_TRUST',
        kpiTitle: 'Reliability Data Plane Trust %',
        uiComponentLocation: 'JoyEngineeringOpsMaster.tsx -> Top Mission Control Bar',
        authoritativeTable: 'public.observability_events',
        mathematicalFormula: '(trusted_verified_events / total_ingested_events) * 100',
        maxAllowedStalenessSeconds: 60,
        syntheticAllowedInCalculation: false,
        mockAllowedInCalculation: false,
      },
    ],
  ]);

  public static getAllContracts(): MetricProvenanceContract[] {
    return Array.from(this.contracts.values());
  }

  public static getContract(kpiId: string): MetricProvenanceContract | undefined {
    return this.contracts.get(kpiId);
  }
}
