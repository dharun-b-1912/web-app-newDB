// ============================================================
// Joy PeopleHR — Automated Error Severity Classifier (P0–P3)
// ============================================================
// Evaluates error context, affected tenant count, and module criticality
// to assign standardized production incident severity.
// ============================================================

export type IncidentSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export interface SeverityRuleResult {
  severity: IncidentSeverity;
  label: string;
  reason: string;
  dispatchImmediateAlert: boolean;
}

export class SeverityClassifier {
  /**
   * Evaluates an error or aggregated error group to determine severity
   */
  public static classify(input: {
    module: string;
    errorMessage: string;
    affectedTenantsCount?: number;
    affectedUsersCount?: number;
    occurrencesInLast10Min?: number;
    isSystemDown?: boolean;
    isSecurityBreach?: boolean;
  }): SeverityRuleResult {
    const {
      module,
      errorMessage,
      affectedTenantsCount = 1,
      affectedUsersCount = 1,
      occurrencesInLast10Min = 1,
      isSystemDown = false,
      isSecurityBreach = false,
    } = input;

    const lowerMsg = (errorMessage || '').toLowerCase();
    const upperModule = (module || '').toUpperCase();

    // 1. P0 — CRITICAL (Platform Down, DB Unavailable, Global Auth Failure, Security Breach)
    if (
      isSystemDown ||
      isSecurityBreach ||
      lowerMsg.includes('database connection lost') ||
      lowerMsg.includes('supabase connection timeout') ||
      lowerMsg.includes('all tenants locked') ||
      (upperModule === 'AUTH' && affectedTenantsCount >= 3)
    ) {
      return {
        severity: 'P0',
        label: 'P0 — Platform Critical',
        reason: 'Global platform availability or critical security integrity impacted',
        dispatchImmediateAlert: true,
      };
    }

    // 2. P1 — HIGH (Payroll Engine Failure, Multi-Tenant Failure, High Error Spike)
    if (
      (upperModule === 'PAYROLL' && (occurrencesInLast10Min >= 5 || affectedTenantsCount >= 2)) ||
      affectedTenantsCount >= 3 ||
      occurrencesInLast10Min >= 50 ||
      lowerMsg.includes('payroll calculation failed') ||
      lowerMsg.includes('biometric sync engine stopped')
    ) {
      return {
        severity: 'P1',
        label: 'P1 — High Severity',
        reason: 'Core business workflow (Payroll/Biometrics) or multi-tenant operations degraded',
        dispatchImmediateAlert: true,
      };
    }

    // 3. P2 — MEDIUM (Single Tenant Impact, Specific Integration Delay, Performance Drop)
    if (
      affectedUsersCount >= 5 ||
      occurrencesInLast10Min >= 10 ||
      upperModule === 'ATTENDANCE' ||
      upperModule === 'LEAVE' ||
      upperModule === 'INTEGRATIONS' ||
      lowerMsg.includes('integration timeout')
    ) {
      return {
        severity: 'P2',
        label: 'P2 — Medium Severity',
        reason: 'Localized module degradation or third-party integration delay',
        dispatchImmediateAlert: false,
      };
    }

    // 4. P3 — LOW (Minor UI Glitch, Single User Action Error, Non-blocking)
    return {
      severity: 'P3',
      label: 'P3 — Low Severity',
      reason: 'Minor non-blocking anomaly or isolated user input error',
      dispatchImmediateAlert: false,
    };
  }
}
