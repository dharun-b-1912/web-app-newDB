// ============================================================
// Joy PeopleHR — Release Management & Governance Service
// ============================================================
// Implements Sprint 1: Release Intelligence.
// Maintains first-class operational deployment records, rollback tracking,
// and ensures telemetry is linked to active releases.
// ============================================================

export type ReleaseEnvironment = 'development' | 'staging' | 'production';
export type ReleaseStatus =
  | 'DEPLOYING'
  | 'ACTIVE'
  | 'MONITORING'
  | 'VERIFIED'
  | 'ROLLED_BACK'
  | 'FAILED';

export interface Release {
  id: string;
  version: string; // e.g. v2.4.1
  environment: ReleaseEnvironment;
  commitSha?: string;
  branch?: string;
  deployedBy: string;
  deployedAt: string;
  previousVersion?: string;
  status: ReleaseStatus;
  rollbackReleaseId?: string;
  rollbackVersion?: string;
  metadata?: Record<string, unknown>;
  changeSummary?: string[];
  issuesFixed?: string[];
}

export class ReleaseManagementService {
  private static activeVersion: string = 'v2.4.1';
  private static activeReleaseId: string = 'rel_2026_0241';
  private static releases: Release[] = [
    {
      id: 'rel_2026_0241',
      version: 'v2.4.1',
      environment: 'production',
      commitSha: '7f3a9e2',
      branch: 'main',
      deployedBy: 'CI/CD Automated Fleet Pipeline',
      deployedAt: new Date(Date.now() - 22 * 60000).toISOString(),
      previousVersion: 'v2.4.0',
      status: 'MONITORING',
      rollbackReleaseId: 'rel_2026_0240',
      rollbackVersion: 'v2.4.0',
      changeSummary: [
        'Hardened Observability Ingestion Bridge with Dual Persistence',
        'Enterprise Error Boundaries with ERR-XXXXX Reference Codes',
        '10-Step Feature Certification Engine & Reality Check Matrix',
      ],
      issuesFixed: ['JOY-202', 'JOY-204'],
      metadata: {
        buildDurationSeconds: 48,
        targetFleetWorkers: 8,
        canaryPercentage: 100,
      },
    },
    {
      id: 'rel_2026_0240',
      version: 'v2.4.0',
      environment: 'production',
      commitSha: '4c81d2f',
      branch: 'main',
      deployedBy: 'Platform Lead',
      deployedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      previousVersion: 'v2.3.9',
      status: 'VERIFIED',
      changeSummary: ['Initial Payroll and Attendance Foundation'],
      issuesFixed: [],
    },
  ];

  public static getActiveVersion(): string {
    return this.activeVersion;
  }

  public static getActiveReleaseId(): string {
    return this.activeReleaseId;
  }

  public static getActiveRelease(): Release | undefined {
    return this.releases.find((r) => r.id === this.activeReleaseId);
  }

  public static getAllReleases(): Release[] {
    return [...this.releases];
  }

  public static getAllDeployments(): any[] {
    return this.getAllReleases().map((r) => ({
      ...r,
      releaseId: r.id,
      startedAt: r.deployedAt,
    }));
  }

  public static getRelease(versionOrId: string): Release | undefined {
    return this.releases.find((r) => r.version === versionOrId || r.id === versionOrId);
  }

  public static getDeployment(versionOrId: string): any | undefined {
    const r = this.getRelease(versionOrId);
    if (!r) return undefined;
    return {
      ...r,
      releaseId: r.id,
      startedAt: r.deployedAt,
    };
  }

  public static registerDeployment(data: Omit<Release, 'id' | 'status'>): Release {
    const id = `rel_${Date.now()}_${data.version.replace('.', '_')}`;
    const newRecord: Release = {
      ...data,
      id,
      status: 'MONITORING',
    };

    // Mark previous active as verified or superseded
    this.releases.forEach((r) => {
      if (r.environment === data.environment && (r.status === 'ACTIVE' || r.status === 'MONITORING')) {
        r.status = 'VERIFIED';
      }
    });

    this.releases.unshift(newRecord);
    this.activeVersion = newRecord.version;
    this.activeReleaseId = id;

    return newRecord;
  }

  public static updateReleaseStatus(releaseId: string, status: ReleaseStatus) {
    const rel = this.releases.find((r) => r.id === releaseId);
    if (rel) {
      rel.status = status;
    }
  }
}
