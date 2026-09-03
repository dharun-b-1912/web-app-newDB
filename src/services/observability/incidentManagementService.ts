// ============================================================
// Joy PeopleHR — Incident Management Service
// ============================================================
// Orchestrates P0–P3 incidents, developer assignments, status lifecycles,
// automated alerts, and postmortem records.
// ============================================================

import { IncidentSeverity } from './severityClassifier';
import { ObservabilityLogger } from './observabilityLogger';

export type IncidentLifecycleState =
  | 'TRIGGERED'
  | 'INVESTIGATING'
  | 'IDENTIFIED'
  | 'FIX_DEPLOYED'
  | 'VERIFIED'
  | 'RESOLVED';

export interface PlatformIncident {
  id: string;
  incidentNumber: string; // e.g. INC-204
  title: string;
  severity: IncidentSeverity;
  state: IncidentLifecycleState;
  module: string;
  affectedTenants: string[];
  affectedUserCount: number;
  triggerSource: string;
  leadEngineer?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  rootCause?: string;
  resolutionSummary?: string;
}

import { RootCauseAnalysisService } from '../engineering-ops/incidents/rootCauseAnalysisService';

export class IncidentResolutionBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncidentResolutionBlockedError';
  }
}

export class IncidentManagementService {
  private static incidents: Map<string, PlatformIncident> = new Map();
  private static listeners: Set<(incidents: PlatformIncident[]) => void> = new Set();
  private static incidentCounter = 205;

  public static initialize() {
    if (this.incidents.size > 0) return;

    // Seed realistic active incident: INC-204
    const inc204: PlatformIncident = {
      id: 'inc_204_seed',
      incidentNumber: 'INC-204',
      title: 'Payroll calculation latency & component unhandled exception',
      severity: 'P1',
      state: 'INVESTIGATING',
      module: 'PAYROLL',
      affectedTenants: ['Joy Corporate Solutions', 'Apex Facility Services', 'Zenith Logistics'],
      affectedUserCount: 128,
      triggerSource: 'Automated Error Grouping (grp_PAYROLL_TYPEERROR_8f3k2)',
      leadEngineer: 'Arun V. (Backend Lead)',
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
      rootCause: 'Regression in salary structure JSON parsing after release v2.4.1',
    };

    this.incidents.set(inc204.id, inc204);
  }

  /**
   * Create a new formal platform incident
   */
  public static createIncident(data: {
    title: string;
    severity: IncidentSeverity;
    module: string;
    affectedTenants: string[];
    affectedUserCount: number;
    triggerSource: string;
    leadEngineer?: string;
  }): PlatformIncident {
    const incNumber = `INC-${this.incidentCounter++}`;
    const id = `inc_${Date.now()}`;
    const now = new Date().toISOString();

    const incident: PlatformIncident = {
      id,
      incidentNumber: incNumber,
      title: data.title,
      severity: data.severity,
      state: 'TRIGGERED',
      module: data.module,
      affectedTenants: data.affectedTenants,
      affectedUserCount: data.affectedUserCount,
      triggerSource: data.triggerSource,
      leadEngineer: data.leadEngineer,
      createdAt: now,
      updatedAt: now,
    };

    this.incidents.set(id, incident);
    ObservabilityLogger.security(
      'INCIDENT_CREATED',
      `Platform Incident ${incNumber} created with severity ${data.severity}`,
      data.severity === 'P0' ? 'FATAL' : 'ERROR',
      { incidentNumber: incNumber, module: data.module, affectedTenants: data.affectedTenants }
    );

    this.notify();
    return incident;
  }

  /**
   * Advance or update incident lifecycle status with Gate 8 RCA enforcement
   */
  public static updateIncidentState(
    id: string,
    state: IncidentLifecycleState,
    details?: {
      leadEngineer?: string;
      rootCause?: string;
      resolutionSummary?: string;
    }
  ) {
    const inc = this.incidents.get(id);
    if (!inc) return;

    // Gate 8: Mandatory RCA Enforcement for P0/P1 incidents
    if (state === 'RESOLVED' && (inc.severity === 'P0' || inc.severity === 'P1')) {
      const existingRca = RootCauseAnalysisService.getRCA(inc.incidentNumber);
      if (!existingRca) {
        throw new IncidentResolutionBlockedError(
          `Resolution blocked: Incident ${inc.incidentNumber} is severity ${inc.severity}. P0/P1 incidents require a signed-off Root Cause Analysis (RCA) before resolution.`
        );
      }
    }

    inc.state = state;
    inc.updatedAt = new Date().toISOString();
    if (details?.leadEngineer) inc.leadEngineer = details.leadEngineer;
    if (details?.rootCause) inc.rootCause = details.rootCause;
    if (details?.resolutionSummary) inc.resolutionSummary = details.resolutionSummary;
    if (state === 'RESOLVED') inc.resolvedAt = new Date().toISOString();

    ObservabilityLogger.app(
      'INCIDENT_STATE_CHANGE',
      `Incident ${inc.incidentNumber} transitioned to ${state}`,
      { incidentId: id, state, leadEngineer: inc.leadEngineer }
    );

    this.notify();
  }

  public static getAllIncidents(): PlatformIncident[] {
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static subscribe(listener: (incidents: PlatformIncident[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify() {
    const list = this.getAllIncidents();
    this.listeners.forEach((l) => {
      try {
        l(list);
      } catch (_) {}
    });
  }
}

// Auto-seed initial state
IncidentManagementService.initialize();
