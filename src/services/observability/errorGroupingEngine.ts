// ============================================================
// Joy PeopleHR — Intelligent Error Grouping & Aggregation Engine
// ============================================================
// Combines thousands of noisy individual logs into unified, actionable issues
// based on deterministic stack & semantic fingerprints.
// ============================================================

import { StructuredTelemetryEntry, ObservabilityLogger } from './observabilityLogger';
import { SeverityClassifier, IncidentSeverity } from './severityClassifier';

export type IssueStatus = 'INVESTIGATING' | 'IDENTIFIED' | 'RESOLVED' | 'MUTED';

export interface ErrorGroup {
  fingerprint: string;
  title: string;
  module: string;
  severity: IncidentSeverity;
  status: IssueStatus;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  affectedTenants: Set<string>;
  affectedUsers: Set<string>;
  sampleEntry: StructuredTelemetryEntry;
  stackTracePreview?: string;
  assignedTo?: string;
  releaseVersion: string;
}

export interface SerializableErrorGroup {
  fingerprint: string;
  title: string;
  module: string;
  severity: IncidentSeverity;
  status: IssueStatus;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  affectedTenantsCount: number;
  affectedUsersCount: number;
  affectedTenantsList: string[];
  sampleEntry: StructuredTelemetryEntry;
  stackTracePreview?: string;
  assignedTo?: string;
  releaseVersion: string;
}

export class ErrorGroupingEngine {
  private static groups: Map<string, ErrorGroup> = new Map();
  private static listeners: Set<(groups: SerializableErrorGroup[]) => void> = new Set();
  private static initialized = false;

  public static initialize() {
    if (this.initialized) return;
    this.initialized = true;

    // Automatically listen to all incoming telemetry errors
    ObservabilityLogger.subscribe((entry) => {
      if (entry.stream === 'ERROR_CRASH' || entry.level === 'ERROR' || entry.level === 'FATAL') {
        this.ingest(entry);
      }
    });

    // Populate initial sample seed groups for immediate live demonstration
    this.seedRealisticGroups();
  }

  /**
   * Generates a deterministic fingerprint hash from normalized error message & module
   */
  public static computeFingerprint(entry: StructuredTelemetryEntry): string {
    const normMsg = (entry.error?.message || entry.message || '')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
      .replace(/\d+/g, '<NUM>')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const module = (entry.module || 'CORE').toUpperCase();
    const errName = (entry.error?.name || 'Error').toUpperCase();

    return `grp_${module}_${errName}_${this.simpleHash(normMsg)}`;
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  /**
   * Ingests a new error entry and updates or creates an ErrorGroup
   */
  public static ingest(entry: StructuredTelemetryEntry): ErrorGroup {
    const fingerprint = this.computeFingerprint(entry);
    entry.fingerprint = fingerprint;

    let group = this.groups.get(fingerprint);

    if (!group) {
      const classification = SeverityClassifier.classify({
        module: entry.module,
        errorMessage: entry.error?.message || entry.message,
        affectedTenantsCount: 1,
        affectedUsersCount: 1,
      });

      group = {
        fingerprint,
        title: entry.error?.message || entry.message || 'Unhandled Application Exception',
        module: entry.module || 'CORE',
        severity: classification.severity,
        status: 'INVESTIGATING',
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp,
        occurrences: 1,
        affectedTenants: new Set([entry.traceContext.tenantId || 'tenant_default']),
        affectedUsers: new Set([entry.traceContext.userId || 'anon_user']),
        sampleEntry: entry,
        stackTracePreview: entry.error?.stack ? entry.error.stack.split('\n').slice(0, 4).join('\n') : undefined,
        releaseVersion: entry.traceContext.releaseVersion || 'v2.4.1',
      };
      this.groups.set(fingerprint, group);
    } else {
      group.occurrences += 1;
      group.lastSeen = entry.timestamp;
      if (entry.traceContext.tenantId) group.affectedTenants.add(entry.traceContext.tenantId);
      if (entry.traceContext.userId) group.affectedUsers.add(entry.traceContext.userId);

      // Re-evaluate severity with updated tenant counts
      const reClassified = SeverityClassifier.classify({
        module: group.module,
        errorMessage: group.title,
        affectedTenantsCount: group.affectedTenants.size,
        affectedUsersCount: group.affectedUsers.size,
        occurrencesInLast10Min: group.occurrences,
      });
      group.severity = reClassified.severity;
    }

    this.notify();
    return group;
  }

  /**
   * Update the triage status of an error group
   */
  public static setStatus(fingerprint: string, status: IssueStatus, assignedTo?: string) {
    const group = this.groups.get(fingerprint);
    if (group) {
      group.status = status;
      if (assignedTo !== undefined) group.assignedTo = assignedTo;
      this.notify();
    }
  }

  /**
   * Returns serializable error groups for UI consumption
   */
  public static getSerializableGroups(): SerializableErrorGroup[] {
    return Array.from(this.groups.values())
      .map((g) => ({
        fingerprint: g.fingerprint,
        title: g.title,
        module: g.module,
        severity: g.severity,
        status: g.status,
        firstSeen: g.firstSeen,
        lastSeen: g.lastSeen,
        occurrences: g.occurrences,
        affectedTenantsCount: g.affectedTenants.size,
        affectedUsersCount: g.affectedUsers.size,
        affectedTenantsList: Array.from(g.affectedTenants),
        sampleEntry: g.sampleEntry,
        stackTracePreview: g.stackTracePreview,
        assignedTo: g.assignedTo,
        releaseVersion: g.releaseVersion,
      }))
      .sort((a, b) => {
        const sevOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
        if (sevOrder[a.severity] !== sevOrder[b.severity]) {
          return sevOrder[a.severity] - sevOrder[b.severity];
        }
        return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      });
  }

  public static subscribe(listener: (groups: SerializableErrorGroup[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify() {
    const data = this.getSerializableGroups();
    this.listeners.forEach((l) => {
      try {
        l(data);
      } catch (_) {}
    });
  }

  private static seedRealisticGroups() {
    if (this.groups.size > 0) return;

    // Seed Issue #1: Payroll Calculation TypeError
    const entry1: StructuredTelemetryEntry = {
      id: 'tel_init_01',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      level: 'ERROR',
      stream: 'ERROR_CRASH',
      action: 'PAYROLL_CALCULATION_CYCLE',
      module: 'PAYROLL',
      message: "Cannot read property 'salary_components' of undefined",
      referenceId: 'ERR-8F3K2',
      traceContext: {
        traceId: 'tr_8f3k2_pay',
        correlationId: 'corr_9901',
        requestId: 'req_pay_1',
        sessionId: 'sess_1',
        tenantId: 'Joy Corporate Solutions',
        companyId: 'company_joy_hq',
        userId: 'emp_hr_lead',
        module: 'PAYROLL',
        releaseVersion: 'v2.4.1',
        environment: 'production',
      },
      error: {
        name: 'TypeError',
        message: "Cannot read property 'salary_components' of undefined",
        stack: "TypeError: Cannot read property 'salary_components' of undefined\n  at calculateNetSalary (payrollApi.ts:412)\n  at processBatch (payrollEngine.ts:184)",
      },
    };

    const g1: ErrorGroup = {
      fingerprint: 'grp_PAYROLL_TYPEERROR_8f3k2',
      title: "Cannot read property 'salary_components' of undefined",
      module: 'PAYROLL',
      severity: 'P1',
      status: 'INVESTIGATING',
      firstSeen: new Date(Date.now() - 65 * 60000).toISOString(),
      lastSeen: new Date(Date.now() - 5 * 60000).toISOString(),
      occurrences: 142,
      affectedTenants: new Set(['Joy Corporate Solutions', 'Apex Facility Services', 'Zenith Logistics']),
      affectedUsers: new Set(['user_1', 'user_2', 'user_3', 'user_4']),
      sampleEntry: entry1,
      stackTracePreview: "TypeError: Cannot read property 'salary_components' of undefined\n  at calculateNetSalary (payrollApi.ts:412)",
      releaseVersion: 'v2.4.1',
    };
    this.groups.set(g1.fingerprint, g1);

    // Seed Issue #2: Biometric Sync Timeout
    const entry2: StructuredTelemetryEntry = {
      id: 'tel_init_02',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      level: 'WARN',
      stream: 'INTEGRATION',
      action: 'ZKTECO_DEVICE_PULL',
      module: 'ATTENDANCE',
      message: 'ZKTeco Hardware Gateway connection timed out after 10000ms',
      referenceId: 'ERR-ZK990',
      traceContext: {
        traceId: 'tr_zk_990',
        correlationId: 'corr_zk_2',
        requestId: 'req_zk_1',
        sessionId: 'sess_2',
        tenantId: 'ABC Facility Services',
        companyId: 'company_abc',
        userId: 'sys_sync',
        module: 'ATTENDANCE',
        releaseVersion: 'v2.4.1',
        environment: 'production',
      },
      error: {
        name: 'TimeoutError',
        message: 'ZKTeco Hardware Gateway connection timed out after 10000ms',
        stack: 'TimeoutError: Connection timed out\n  at ZKTecoBridge.fetchPunches (biometricSync.ts:89)',
      },
    };

    const g2: ErrorGroup = {
      fingerprint: 'grp_ATTENDANCE_TIMEOUT_zk990',
      title: 'ZKTeco Hardware Gateway connection timed out after 10000ms',
      module: 'ATTENDANCE',
      severity: 'P2',
      status: 'IDENTIFIED',
      firstSeen: new Date(Date.now() - 180 * 60000).toISOString(),
      lastSeen: new Date(Date.now() - 12 * 60000).toISOString(),
      occurrences: 48,
      affectedTenants: new Set(['ABC Facility Services']),
      affectedUsers: new Set(['sys_agent']),
      sampleEntry: entry2,
      stackTracePreview: 'TimeoutError: Connection timed out\n  at ZKTecoBridge.fetchPunches (biometricSync.ts:89)',
      releaseVersion: 'v2.4.1',
    };
    this.groups.set(g2.fingerprint, g2);
  }
}

// Auto initialize on module load
ErrorGroupingEngine.initialize();
