// ============================================================
// Joy PeopleHR — Reality Audit & Feature Readiness Engine
// ============================================================
// Audits every feature module against production reality criteria:
// UI, Route, Live API, Auth, Real DB, Tenant Isolation, Zero Mocks.
// ============================================================

export type FeatureReadinessStatus = 'READY' | 'REVIEW' | 'MOCK_BLOCKED' | 'INCOMPLETE';

export interface FeatureAuditRow {
  moduleId: string;
  moduleName: string;
  category: 'CORE' | 'WORKFORCE' | 'OPERATIONS' | 'PAYROLL_STATUTORY' | 'GOVERNANCE';
  uiExists: boolean;
  routeExists: boolean;
  apiConnected: boolean;
  authChecked: boolean;
  realDatabase: boolean;
  tenantIsolation: boolean;
  hasMockFallback: boolean;
  status: FeatureReadinessStatus;
  primaryFile: string;
  notes: string;
}

export class RealityAuditEngine {
  private static matrix: FeatureAuditRow[] = [
    {
      moduleId: 'feat_auth',
      moduleName: 'Authentication & Session',
      category: 'CORE',
      uiExists: true,
      routeExists: true,
      apiConnected: true,
      authChecked: true,
      realDatabase: true,
      tenantIsolation: true,
      hasMockFallback: false,
      status: 'READY',
      primaryFile: 'src/services/auth/employeeAuthService.ts',
      notes: 'Supabase JWT Auth, tenant claim verification, MFA ready.',
    },
    {
      moduleId: 'feat_employees',
      moduleName: 'Employee Directory & Profiles',
      category: 'WORKFORCE',
      uiExists: true,
      routeExists: true,
      apiConnected: true,
      authChecked: true,
      realDatabase: true,
      tenantIsolation: true,
      hasMockFallback: false,
      status: 'READY',
      primaryFile: 'src/services/employeeServices/employeeService.ts',
      notes: 'Full Supabase PostgreSQL binding with RLS tenant filter.',
    },
    {
      moduleId: 'feat_attendance',
      moduleName: 'Attendance & Biometric Sync',
      category: 'OPERATIONS',
      uiExists: true,
      routeExists: true,
      apiConnected: true,
      authChecked: true,
      realDatabase: false,
      tenantIsolation: true,
      hasMockFallback: true,
      status: 'MOCK_BLOCKED',
      primaryFile: 'src/services/attendance/biometricGatewayService.ts',
      notes: 'ZKTeco bridge relies on mock fallback array if device ping times out.',
    },
    {
      moduleId: 'feat_leave',
      moduleName: 'Leave Management & Quotas',
      category: 'OPERATIONS',
      uiExists: true,
      routeExists: true,
      apiConnected: true,
      authChecked: true,
      realDatabase: true,
      tenantIsolation: true,
      hasMockFallback: false,
      status: 'READY',
      primaryFile: 'src/services/leaveApi.ts',
      notes: 'Live leave transactions and accrual balance calculation.',
    },
    {
      moduleId: 'feat_payroll',
      moduleName: 'Payroll Calculation & Payslips',
      category: 'PAYROLL_STATUTORY',
      uiExists: true,
      routeExists: true,
      apiConnected: true,
      authChecked: true,
      realDatabase: true,
      tenantIsolation: true,
      hasMockFallback: true,
      status: 'REVIEW',
      primaryFile: 'src/services/payrollApi.ts',
      notes: 'Calculates live salaries, but fallback gross salary ₹45,000 needs removal.',
    },
    {
      moduleId: 'feat_epfo_esi',
      moduleName: 'EPFO & ESIC Compliance Engines',
      category: 'PAYROLL_STATUTORY',
      uiExists: true,
      routeExists: true,
      apiConnected: true,
      authChecked: true,
      realDatabase: true,
      tenantIsolation: true,
      hasMockFallback: false,
      status: 'READY',
      primaryFile: 'src/services/payroll/epfoEcrEngine.ts',
      notes: 'Statutory ECR text generator and ESI return formulas validated.',
    },
    {
      moduleId: 'feat_vendors',
      moduleName: 'Vendor & Contract Labor Management',
      category: 'GOVERNANCE',
      uiExists: true,
      routeExists: true,
      apiConnected: false,
      authChecked: false,
      realDatabase: false,
      tenantIsolation: false,
      hasMockFallback: true,
      status: 'INCOMPLETE',
      primaryFile: 'src/services/vendorService.ts',
      notes: 'Invoice queries missing tenant isolation filter; mock settlement array.',
    },
    {
      moduleId: 'feat_ats',
      moduleName: 'Recruitment & ATS Pipeline',
      category: 'WORKFORCE',
      uiExists: true,
      routeExists: true,
      apiConnected: true,
      authChecked: true,
      realDatabase: false,
      tenantIsolation: true,
      hasMockFallback: true,
      status: 'MOCK_BLOCKED',
      primaryFile: 'src/services/atsService.ts',
      notes: 'Candidate scoring falls back to demo array when candidate DB is empty.',
    },
    {
      moduleId: 'feat_geofence',
      moduleName: 'Location Geofence & Shifts',
      category: 'OPERATIONS',
      uiExists: true,
      routeExists: true,
      apiConnected: true,
      authChecked: true,
      realDatabase: false,
      tenantIsolation: true,
      hasMockFallback: true,
      status: 'MOCK_BLOCKED',
      primaryFile: 'src/services/location/workLocationService.ts',
      notes: 'Contains MOCK_GEO_FENCE_LOCATIONS fallback.',
    },
  ];

  public static getMatrix(): FeatureAuditRow[] {
    return [...this.matrix];
  }

  public static updateFeatureStatus(moduleId: string, updates: Partial<FeatureAuditRow>) {
    const feature = this.matrix.find((f) => f.moduleId === moduleId);
    if (feature) {
      Object.assign(feature, updates);
    }
  }

  /**
   * Calculates overall platform reality score
   */
  public static getReadinessScore(): {
    scorePercentage: number;
    totalModules: number;
    readyCount: number;
    reviewCount: number;
    mockBlockedCount: number;
    incompleteCount: number;
  } {
    const total = this.matrix.length;
    let earnedPoints = 0;

    this.matrix.forEach((f) => {
      let moduleScore = 0;
      if (f.uiExists) moduleScore += 1;
      if (f.routeExists) moduleScore += 1;
      if (f.apiConnected) moduleScore += 2;
      if (f.authChecked) moduleScore += 2;
      if (f.realDatabase) moduleScore += 2;
      if (f.tenantIsolation) moduleScore += 2;
      if (!f.hasMockFallback) moduleScore += 2; // bonus for zero mock
      earnedPoints += moduleScore;
    });

    const maxPoints = total * 12;
    const scorePercentage = Math.round((earnedPoints / maxPoints) * 100);

    const readyCount = this.matrix.filter((f) => f.status === 'READY').length;
    const reviewCount = this.matrix.filter((f) => f.status === 'REVIEW').length;
    const mockBlockedCount = this.matrix.filter((f) => f.status === 'MOCK_BLOCKED').length;
    const incompleteCount = this.matrix.filter((f) => f.status === 'INCOMPLETE').length;

    return {
      scorePercentage,
      totalModules: total,
      readyCount,
      reviewCount,
      mockBlockedCount,
      incompleteCount,
    };
  }
}
