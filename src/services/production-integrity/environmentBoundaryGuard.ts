// ============================================================
// Joy PeopleHR — Environment Boundary Guard
// ============================================================
// Enforces strict separation between LOCAL_DEV, STAGING, and PRODUCTION.
// Throws ProductionIntegrityError if mock data attempts to reach production paths.
// ============================================================

export class ProductionIntegrityError extends Error {
  constructor(message: string, public violationCode?: string) {
    super(`[PRODUCTION_DATA_INTEGRITY_VIOLATION] ${message}`);
    this.name = 'ProductionIntegrityError';
  }
}

export class EnvironmentBoundaryGuard {
  public static getCurrentEnvironment(): 'development' | 'staging' | 'production' {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
      return 'production';
    }
    return 'production'; // default to strict production enforcement
  }

  public static assertProductionDataIntegrity(data: any, sourceContext: string) {
    if (this.getCurrentEnvironment() !== 'production') return;

    if (data && typeof data === 'object') {
      if (data.__isMock || data.isMockData === true || data._syntheticPayload) {
        throw new ProductionIntegrityError(
          `Mock data detected in production context: ${sourceContext}. Production requires authenticated authoritative sources.`,
          'PD-001'
        );
      }
    }
  }

  public static assertNoFallbackPayload(primaryData: any, fallbackData: any, fieldName: string) {
    if (primaryData === null || primaryData === undefined) {
      if (fallbackData && typeof fallbackData === 'object' && !Array.isArray(fallbackData)) {
        throw new ProductionIntegrityError(
          `Silent fallback detected for field '${fieldName}'. Display explicit ErrorState or LoadingState instead of fake fallback.`,
          'PD-003'
        );
      }
    }
  }
}
