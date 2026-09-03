// ============================================================
// Joy PeopleHR — Just-In-Time (JIT) Developer Support Access Engine
// ============================================================
// Enforces zero-standing privileges for developers. Developers must
// request temporary, time-bound, audited access to diagnose tenant issues.
// ============================================================

import { ObservabilityLogger } from './observabilityLogger';

export type JITScope =
  | 'READ_ONLY_PAYROLL_LOGS'
  | 'READ_ONLY_ATTENDANCE_LOGS'
  | 'READ_ONLY_BIOMETRIC_DIAGNOSTICS'
  | 'READ_ONLY_API_TRACES'
  | 'FULL_DIAGNOSTIC_ACCESS';

export interface JITAccessGrant {
  grantId: string;
  developerEmail: string;
  developerName: string;
  targetTenantId: string;
  targetCompanyName: string;
  scope: JITScope;
  reason: string;
  incidentRef?: string;
  requestedAt: string;
  expiresAt: string;
  isActive: boolean;
  approvedBy: string;
}

export class JITSupportAccessService {
  private static grants: Map<string, JITAccessGrant> = new Map();
  private static listeners: Set<(grants: JITAccessGrant[]) => void> = new Set();

  /**
   * Requests and activates time-limited diagnostic access
   */
  public static requestAccess(data: {
    developerEmail: string;
    developerName: string;
    targetTenantId: string;
    targetCompanyName: string;
    scope: JITScope;
    reason: string;
    durationMinutes: number;
    incidentRef?: string;
  }): JITAccessGrant {
    const grantId = `jit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + data.durationMinutes * 60000).toISOString();

    const grant: JITAccessGrant = {
      grantId,
      developerEmail: data.developerEmail,
      developerName: data.developerName,
      targetTenantId: data.targetTenantId,
      targetCompanyName: data.targetCompanyName,
      scope: data.scope,
      reason: data.reason,
      incidentRef: data.incidentRef || 'N/A',
      requestedAt: now.toISOString(),
      expiresAt,
      isActive: true,
      approvedBy: 'Platform Security Policy Auto-Gate',
    };

    this.grants.set(grantId, grant);

    ObservabilityLogger.security(
      'JIT_ACCESS_GRANTED',
      `JIT Support Access granted to ${data.developerName} for ${data.targetCompanyName} (${data.scope}) for ${data.durationMinutes}m`,
      'WARN',
      {
        grantId,
        developerEmail: data.developerEmail,
        tenantId: data.targetTenantId,
        reason: data.reason,
        expiresAt,
      }
    );

    this.notify();
    return grant;
  }

  /**
   * Revokes an active grant immediately
   */
  public static revokeAccess(grantId: string, revokedBy: string): boolean {
    const grant = this.grants.get(grantId);
    if (!grant) return false;

    grant.isActive = false;
    ObservabilityLogger.security(
      'JIT_ACCESS_REVOKED',
      `JIT Access ${grantId} manually revoked by ${revokedBy}`,
      'INFO',
      { grantId, revokedBy }
    );

    this.notify();
    return true;
  }

  /**
   * Check if developer currently has active JIT permission for a tenant
   */
  public static hasActiveAccess(developerEmail: string, tenantId: string, scope: JITScope): boolean {
    const now = new Date().getTime();
    for (const grant of this.grants.values()) {
      if (
        grant.developerEmail === developerEmail &&
        grant.targetTenantId === tenantId &&
        grant.isActive &&
        (grant.scope === scope || grant.scope === 'FULL_DIAGNOSTIC_ACCESS')
      ) {
        if (new Date(grant.expiresAt).getTime() > now) {
          return true;
        } else {
          grant.isActive = false; // expired
        }
      }
    }
    return false;
  }

  public static getActiveGrants(): JITAccessGrant[] {
    const now = new Date().getTime();
    return Array.from(this.grants.values())
      .map((g) => {
        if (g.isActive && new Date(g.expiresAt).getTime() <= now) {
          g.isActive = false;
        }
        return g;
      })
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  public static subscribe(listener: (grants: JITAccessGrant[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify() {
    const list = this.getActiveGrants();
    this.listeners.forEach((l) => {
      try {
        l(list);
      } catch (_) {}
    });
  }
}
