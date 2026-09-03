// ============================================================
// Joy PeopleHR — 10-Step Engineering Issue Lifecycle Engine
// ============================================================
// Manages JOY-XXX issues across the 10 engineering lifecycle states:
// DETECT -> ANALYZE -> TRIAGE -> ASSIGN -> FIX -> TEST -> VERIFY -> RELEASE -> MONITOR -> CLOSE
// ============================================================

export type LifecycleStage =
  | 'DETECT'
  | 'ANALYZE'
  | 'TRIAGE'
  | 'ASSIGN'
  | 'FIX'
  | 'TEST'
  | 'VERIFY'
  | 'RELEASE'
  | 'MONITOR'
  | 'CLOSE';

export type IssuePriority = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW' | 'PRODUCTION_BLOCKER';

export interface EngineeringIssue {
  id: string;
  issueKey: string; // e.g. JOY-204
  title: string;
  module: string;
  fileLocation: string;
  stage: LifecycleStage;
  priority: IssuePriority;
  detectedBy: string;
  environment: 'development' | 'staging' | 'production';
  
  // Analysis
  analysis?: {
    whatFailed: string;
    whyFailed: string;
    productionRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    rootCauseIdentified: boolean;
  };

  // Ownership
  assignedEngineer?: string;
  reviewerLead?: string;

  // Fix details
  fixBranch?: string;
  pullRequestUrl?: string;
  changeSummary?: string;

  // Testing & Verification
  testChecklist?: {
    buildPassed: boolean;
    typeCheckPassed: boolean;
    tenantIsolationVerified: boolean;
    noMockDataConfirmed: boolean;
    manualFlowPassed: boolean;
  };

  verificationNotes?: string;
  targetReleaseVersion: string;
  closedReason?: string;
  preventionRule?: string;
  createdAt: string;
  updatedAt: string;
}

export class EngineeringIssueService {
  private static issues: Map<string, EngineeringIssue> = new Map();
  private static issueCounter = 205;

  public static initialize() {
    if (this.issues.size > 0) return;

    // Seed Issue #1: JOY-204 (Mock data in Attendance)
    const iss1: EngineeringIssue = {
      id: 'iss_joy_204',
      issueKey: 'JOY-204',
      title: 'Biometric device sync falls back to mock array when offline',
      module: 'Attendance & Biometrics',
      fileLocation: 'src/services/attendance/biometricGatewayService.ts',
      stage: 'FIX',
      priority: 'PRODUCTION_BLOCKER',
      detectedBy: 'Automated Reality Audit Scanner',
      environment: 'development',
      analysis: {
        whatFailed: 'Attendance gateway renders fake devices if hardware bridge times out.',
        whyFailed: 'Catch block returns mockGatewayDevices instead of throwing actionable error.',
        productionRisk: 'CRITICAL',
        rootCauseIdentified: true,
      },
      assignedEngineer: 'Arun V. (Backend Lead)',
      reviewerLead: 'Karthik S. (Tech Lead)',
      fixBranch: 'fix/joy-204-remove-biometric-mock-fallback',
      changeSummary: 'Wire biometricGatewayService directly to Supabase biometric_devices table with tenant filter.',
      testChecklist: {
        buildPassed: true,
        typeCheckPassed: true,
        tenantIsolationVerified: true,
        noMockDataConfirmed: true,
        manualFlowPassed: false,
      },
      targetReleaseVersion: 'v2.4.2',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    };
    this.issues.set(iss1.id, iss1);

    // Seed Issue #2: JOY-203 (Geofence fallback)
    const iss2: EngineeringIssue = {
      id: 'iss_joy_203',
      issueKey: 'JOY-203',
      title: 'Geofencing falls back to MOCK_GEO_FENCE_LOCATIONS on empty DB',
      module: 'Location & Geofencing',
      fileLocation: 'src/services/location/workLocationService.ts',
      stage: 'ANALYZE',
      priority: 'PRODUCTION_BLOCKER',
      detectedBy: 'Automated Reality Audit Scanner',
      environment: 'development',
      analysis: {
        whatFailed: 'Punches accepted outside geofence because fallback mock coordinates are used.',
        whyFailed: 'workLocationService.ts has ternary fallback to mock array.',
        productionRisk: 'HIGH',
        rootCauseIdentified: true,
      },
      assignedEngineer: 'Meera N. (Frontend Dev)',
      reviewerLead: 'Karthik S. (Tech Lead)',
      targetReleaseVersion: 'v2.4.2',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    };
    this.issues.set(iss2.id, iss2);

    // Seed Issue #3: JOY-202 (Employee profile fallback) - RESOLVED & VERIFIED
    const iss3: EngineeringIssue = {
      id: 'iss_joy_202',
      issueKey: 'JOY-202',
      title: 'Employee profile fallback object removed in favor of Error Boundary',
      module: 'Workforce',
      fileLocation: 'src/features/people/EmployeeProfileDrawer.tsx',
      stage: 'CLOSE',
      priority: 'PRODUCTION_BLOCKER',
      detectedBy: 'Tech Lead Manual Code Review',
      environment: 'production',
      analysis: {
        whatFailed: 'Employee drawer displayed demo engineer profile if fetch failed.',
        whyFailed: 'Legacy fallback object attached to useEmployeeQuery.',
        productionRisk: 'HIGH',
        rootCauseIdentified: true,
      },
      assignedEngineer: 'Karthik S. (Tech Lead)',
      reviewerLead: 'Platform Owner',
      fixBranch: 'fix/joy-202-remove-profile-fallback',
      changeSummary: 'Replaced fallback with EnterpriseErrorBoundary and ref code ERR-8F3K2.',
      testChecklist: {
        buildPassed: true,
        typeCheckPassed: true,
        tenantIsolationVerified: true,
        noMockDataConfirmed: true,
        manualFlowPassed: true,
      },
      verificationNotes: 'Verified that when API fails, clean error UI with Ref ID is displayed. Zero fake data.',
      targetReleaseVersion: 'v2.4.1',
      closedReason: 'Fixed and verified in production deployment v2.4.1.',
      preventionRule: 'Lint rule disallowing default fallback objects in useQuery hooks.',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    };
    this.issues.set(iss3.id, iss3);
  }

  public static getAllIssues(): EngineeringIssue[] {
    return Array.from(this.issues.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static createIssue(data: {
    title: string;
    module: string;
    fileLocation: string;
    priority: IssuePriority;
    detectedBy: string;
    targetReleaseVersion?: string;
  }): EngineeringIssue {
    const issueKey = `JOY-${this.issueCounter++}`;
    const id = `iss_${Date.now()}`;
    const now = new Date().toISOString();

    const issue: EngineeringIssue = {
      id,
      issueKey,
      title: data.title,
      module: data.module,
      fileLocation: data.fileLocation,
      stage: 'DETECT',
      priority: data.priority,
      detectedBy: data.detectedBy,
      environment: 'development',
      targetReleaseVersion: data.targetReleaseVersion || 'v2.4.2',
      createdAt: now,
      updatedAt: now,
    };

    this.issues.set(id, issue);
    return issue;
  }

  public static advanceStage(id: string, nextStage: LifecycleStage, updates: Partial<EngineeringIssue> = {}) {
    const issue = this.issues.get(id);
    if (!issue) return;

    issue.stage = nextStage;
    issue.updatedAt = new Date().toISOString();
    Object.assign(issue, updates);
  }
}

// Auto-seed initial state
EngineeringIssueService.initialize();
