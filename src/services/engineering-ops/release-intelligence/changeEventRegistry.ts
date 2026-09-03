// ============================================================
// Joy PeopleHR — Change Event Registry (Phase 7)
// ============================================================
// Tracks all production change events: code deployments, database
// migrations, configuration updates, feature flags, and dependency upgrades.
// ============================================================

export type ProductionChangeType =
  | 'CODE_DEPLOYMENT'
  | 'DATABASE_MIGRATION'
  | 'CONFIGURATION_CHANGE'
  | 'FEATURE_FLAG'
  | 'DEPENDENCY_UPDATE'
  | 'INFRASTRUCTURE_CHANGE';

export interface ProductionChangeEvent {
  changeId: string;
  fingerprint: string;
  type: ProductionChangeType;
  service: string;
  deployedAt: string;
  version: {
    previous: string;
    current: string;
  };
  commitSha: string;
  buildId: string;
  actor: {
    type: 'CI_CD' | 'ENGINEER' | 'AUTOMATION';
    id: string;
  };
  affectedDomains: string[];
  rollbackAvailable: boolean;
  rollbackTargetVersion?: string;
  trustStatus: 'VERIFIED';
  description: string;
}

export class ChangeEventRegistry {
  private static events: Map<string, ProductionChangeEvent> = new Map();

  public static initialize() {
    if (this.events.size > 0) return;

    const initialEvents: ProductionChangeEvent[] = [
      {
        changeId: 'chg_dep_01',
        fingerprint: 'REL-20260902-A8F4K',
        type: 'CODE_DEPLOYMENT',
        service: 'PAYROLL',
        deployedAt: new Date(Date.now() - 25 * 60000).toISOString(),
        version: {
          previous: 'v2.4.0',
          current: 'v2.4.1',
        },
        commitSha: 'a8f4k92e10c',
        buildId: 'BUILD-9482',
        actor: {
          type: 'CI_CD',
          id: 'github-actions-prod-deploy',
        },
        affectedDomains: ['PAYROLL_CALC', 'STATUTORY_PF', 'PAYSLIP_GEN'],
        rollbackAvailable: true,
        rollbackTargetVersion: 'v2.4.0',
        trustStatus: 'VERIFIED',
        description: 'Optimized salary component calculation and added statutory PF slab update.',
      },
      {
        changeId: 'chg_mig_01',
        fingerprint: 'MIG-20260902-DB042',
        type: 'DATABASE_MIGRATION',
        service: 'POSTGRES_DB',
        deployedAt: new Date(Date.now() - 40 * 60000).toISOString(),
        version: {
          previous: 'mig_041_shifts',
          current: 'mig_042_payroll_runs_index',
        },
        commitSha: 'b4c7e11f88a',
        buildId: 'BUILD-9480',
        actor: {
          type: 'ENGINEER',
          id: 'lead-database-architect',
        },
        affectedDomains: ['PAYROLL_RUNS_TABLE', 'SALARY_STRUCTURES_TABLE'],
        rollbackAvailable: true,
        rollbackTargetVersion: 'mig_041_shifts',
        trustStatus: 'VERIFIED',
        description: 'Added composite b-tree index on payroll_runs (company_id, month, year, status).',
      },
      {
        changeId: 'chg_flag_01',
        fingerprint: 'FLG-20260902-ZK019',
        type: 'FEATURE_FLAG',
        service: 'ATTENDANCE',
        deployedAt: new Date(Date.now() - 60 * 60000).toISOString(),
        version: {
          previous: 'false',
          current: 'true',
        },
        commitSha: 'c9f0a44e21d',
        buildId: 'BUILD-9475',
        actor: {
          type: 'ENGINEER',
          id: 'platform-staff-engineer',
        },
        affectedDomains: ['BIOMETRIC_SYNC', 'ZKTECO_GATEWAY'],
        rollbackAvailable: true,
        rollbackTargetVersion: 'false',
        trustStatus: 'VERIFIED',
        description: 'Enabled hardware TCP socket streaming mode for physical biometric readers.',
      },
    ];

    for (const chg of initialEvents) {
      this.events.set(chg.changeId, chg);
    }
  }

  public static getChangeEvents(): ProductionChangeEvent[] {
    this.initialize();
    return Array.from(this.events.values());
  }

  public static getLatestReleaseForService(service: string): ProductionChangeEvent | undefined {
    this.initialize();
    return Array.from(this.events.values())
      .filter((e) => e.service === service)
      .sort((a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime())[0];
  }

  public static getByFingerprint(fingerprint: string): ProductionChangeEvent | undefined {
    this.initialize();
    return Array.from(this.events.values()).find((e) => e.fingerprint === fingerprint);
  }
}

ChangeEventRegistry.initialize();
