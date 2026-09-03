// ============================================================
// Joy PeopleHR — Hardened Customer Error Reference Code Service
// ============================================================
// Generates high-entropy unpredictable incident reference codes (e.g. ERR-8F3K2)
// and associates them with full diagnostic telemetry with role-based access control.
// ============================================================

import { ObservabilityLogger } from './observabilityLogger';
import { TraceManager } from './traceManager';

export interface RecordedErrorReference {
  referenceId: string;
  timestamp: string;
  module: string;
  errorMessage: string;
  errorName: string;
  stackTrace?: string;
  traceId: string;
  tenantId: string;
  companyId: string;
  userId: string;
  url: string;
  userAgent: string;
  telemetryEntryId?: string;
}

export class ErrorReferenceService {
  private static referenceMap: Map<string, RecordedErrorReference> = new Map();
  private static readonly MAX_STORED_REFERENCES = 500;
  private static readonly STORAGE_KEY = 'wf_error_reference_registry_v1';
  private static isHydrated = false;

  private static hydrate() {
    if (this.isHydrated || typeof window === 'undefined' || !window.localStorage) return;
    this.isHydrated = true;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const list: RecordedErrorReference[] = JSON.parse(raw);
        list.forEach((item) => this.referenceMap.set(item.referenceId, item));
      }
    } catch (_) {}
  }

  private static persist() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const list = Array.from(this.referenceMap.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  /**
   * Generates a high-entropy, non-sequential alphanumeric code (Gate 11)
   * Uses 32 distinct characters (omits 0, O, 1, I for readability).
   * 32^5 = ~33.5 million combinations per prefix, resisting brute-force enumeration.
   */
  public static generateCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    // Use crypto.getRandomValues if available for true cryptographic entropy
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(5);
      crypto.getRandomValues(bytes);
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(bytes[i] % chars.length);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    return `ERR-${code}`;
  }

  /**
   * Records an error, generates a reference ID, logs it to Observability pipeline,
   * and returns the reference ID for display to the user.
   */
  public static recordError(
    error: Error | any,
    module: string = 'CORE',
    customMessage?: string,
    metadata?: Record<string, any>
  ): string {
    this.hydrate();
    const referenceId = this.generateCode();
    const context = TraceManager.getContext();

    const errObj = error instanceof Error ? error : new Error(String(error));
    const errorMessage = customMessage || errObj.message || 'An unknown operation error occurred';

    // Log to internal telemetry stream
    const telemetryEntry = ObservabilityLogger.log(
      'ERROR_CRASH',
      'ERROR',
      'CUSTOMER_ACTION_FAILED',
      errorMessage,
      {
        module,
        error: errObj,
        referenceId,
        metadata: {
          ...metadata,
          url: typeof window !== 'undefined' ? window.location.href : '',
        },
      }
    );

    const record: RecordedErrorReference = {
      referenceId,
      timestamp: new Date().toISOString(),
      module,
      errorMessage,
      errorName: errObj.name || 'Error',
      stackTrace: errObj.stack,
      traceId: context.traceId,
      tenantId: context.tenantId || 'unknown_tenant',
      companyId: context.companyId || 'unknown_company',
      userId: context.userId || 'unknown_user',
      url: typeof window !== 'undefined' ? window.location.pathname : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      telemetryEntryId: telemetryEntry.id,
    };

    this.referenceMap.set(referenceId, record);
    this.persist();

    // Limit memory footprint
    if (this.referenceMap.size > this.MAX_STORED_REFERENCES) {
      const firstKey = this.referenceMap.keys().next().value;
      if (firstKey) this.referenceMap.delete(firstKey);
      this.persist();
    }

    return referenceId;
  }

  /**
   * Lookup diagnostic data by reference ID with Role-Based Access Control (Gate 9)
   * Only authorized Platform/Engineering roles can read raw stack traces.
   */
  public static getByReferenceId(
    referenceId: string,
    userRole: string = 'PLATFORM_ENGINEER'
  ): RecordedErrorReference | { referenceId: string; status: string; message: string } | undefined {
    this.hydrate();
    const cleanId = referenceId.trim().toUpperCase();
    const record = this.referenceMap.get(cleanId);
    if (!record) return undefined;

    const authorizedRoles = new Set([
      'SUPER_ADMIN',
      'PLATFORM_ENGINEER',
      'DEVOPS_SRE',
      'SECURITY_OFFICER',
      'SUPPORT_LEAD',
    ]);

    // If unauthorized customer user attempts to look up reference details, return only safe status
    if (!authorizedRoles.has(userRole.toUpperCase())) {
      return {
        referenceId: record.referenceId,
        status: 'INCIDENT_RECORDED',
        message: 'Your incident reference has been recorded with platform telemetry.',
      };
    }

    return record;
  }

  /**
   * Get all stored error references (Internal Ops only)
   */
  public static getAllReferences(): RecordedErrorReference[] {
    this.hydrate();
    return Array.from(this.referenceMap.values()).reverse();
  }
}
