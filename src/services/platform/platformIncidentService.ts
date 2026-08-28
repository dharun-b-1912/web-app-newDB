// src/services/platform/platformIncidentService.ts
// ============================================================
// Joy PeopleHR — Platform Incidents & Operations Command Service
// ============================================================

import { platformAuditService } from './platformAuditService';

export type IncidentSeverity =
  | 'SEV-1 Critical'
  | 'SEV-2 Major'
  | 'SEV-3 Moderate'
  | 'SEV-4 Minor';

export type IncidentLifecycleStatus =
  | 'Draft'
  | 'Declared'
  | 'Investigating'
  | 'Identified'
  | 'Mitigating'
  | 'Monitoring'
  | 'Resolved'
  | 'Postmortem Required'
  | 'Closed';

export type RootCauseCategory =
  | 'Deployment'
  | 'Database'
  | 'Infrastructure'
  | 'Network'
  | 'Third-party'
  | 'Configuration'
  | 'Capacity'
  | 'Security'
  | 'Human Error'
  | 'Unknown';

export interface IncidentTimelineEvent {
  id: string;
  timestamp: string;
  event_type:
  | 'Incident Declared'
  | 'Severity Changed'
  | 'Status Changed'
  | 'Responder Added'
  | 'Service Affected'
  | 'Impact Updated'
  | 'Investigation Note'
  | 'Mitigation Started'
  | 'Customer Update'
  | 'Internal Update'
  | 'Rollback'
  | 'Feature Flag Changed'
  | 'Service Recovered'
  | 'Incident Resolved'
  | 'Postmortem Created'
  | 'Reopened';
  actor: string;
  actor_role: string;
  visibility: 'internal' | 'customer';
  message: string;
  details?: string;
}

export interface IncidentResponder {
  user_id: string;
  name: string;
  role: 'Incident Commander' | 'Technical Lead' | 'Communications Lead' | 'SRE Lead' | 'Database Engineer' | 'Application Engineer';
  assigned_at: string;
}

export interface IncidentMitigationTask {
  id: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  completed_at?: string;
}

export interface PostmortemActionItem {
  id: string;
  title: string;
  owner: string;
  priority: 'P1' | 'P2' | 'P3';
  due_date: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

export interface IncidentPostmortem {
  status: 'Not Required' | 'Required' | 'Draft' | 'In Review' | 'Published';
  summary: string;
  impact_summary: string;
  detection_summary: string;
  root_cause_category: RootCauseCategory;
  root_cause_narrative: string;
  contributing_factors: string[];
  what_went_well: string[];
  what_went_wrong: string[];
  action_items: PostmortemActionItem[];
  published_at?: string;
}

export interface IncidentCommunicationItem {
  id: string;
  channel: 'Status Page' | 'Customer Email' | 'WhatsApp Broadcast' | 'In-App Banner';
  audience: string;
  sender: string;
  timestamp: string;
  message: string;
  status: 'Published' | 'Delivered' | 'Scheduled';
}

export interface PlatformIncidentRecord {
  id: string; // e.g. 'INC-2026-014'
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentLifecycleStatus;
  commander_name: string;
  technical_lead_name: string;
  affected_services: string[];
  affected_region: string;
  affected_tenants_count: number;
  affected_users_count: number;
  affected_organizations: {
    id: string;
    name: string;
    plan: string;
    impact_detail: string;
  }[];
  error_rate_pct: number;
  latency_increase_ms: number;
  detection_source:
  | 'Monitoring Alert'
  | 'Platform Health'
  | 'Engineer Report'
  | 'Customer Support'
  | 'Background Job'
  | 'Security Alert'
  | 'External Provider'
  | 'Manual';

  started_at: string;
  detected_at: string;
  acknowledged_at: string;
  mitigation_started_at?: string;
  monitoring_started_at?: string;
  monitoring_expected_completion?: string;
  resolved_at?: string;
  duration_formatted: string;

  // Correlation Telemetry
  recent_deployment?: {
    service: string;
    version: string;
    deployed_at: string;
    is_rollback_available: boolean;
  };
  related_feature_flag?: {
    flag_name: string;
    code: string;
    changed_at: string;
    rollout_pct: number;
  };

  responders: IncidentResponder[];
  timeline: IncidentTimelineEvent[];
  mitigation_tasks: IncidentMitigationTask[];
  postmortem: IncidentPostmortem;
  communications: IncidentCommunicationItem[];
}

// Authoritative Incident Records (Populated live from Web / Supabase)
const initialIncidents: PlatformIncidentRecord[] = [];

let incidentDb = [...initialIncidents];

export const platformIncidentService = {
  getIncidents(): PlatformIncidentRecord[] {
    return incidentDb;
  },

  getIncidentById(id: string): PlatformIncidentRecord | undefined {
    return incidentDb.find((i) => i.id.toLowerCase() === id.toLowerCase());
  },

  getActiveIncidents(): PlatformIncidentRecord[] {
    return incidentDb.filter((i) => i.status !== 'Resolved' && i.status !== 'Closed');
  },

  getPlatformOperationalStatus() {
    const active = this.getActiveIncidents();
    const hasSev1 = active.some((i) => i.severity.includes('SEV-1'));
    const hasSev2 = active.some((i) => i.severity.includes('SEV-2'));
    const hasSev34 = active.length > 0;

    let statusText = '● All Core Services Operational';
    let statusTone: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (hasSev1) {
      statusText = '● Critical Platform Incident Active';
      statusTone = 'critical';
    } else if (hasSev2) {
      statusText = '● Major Service Degradation Active';
      statusTone = 'critical';
    } else if (hasSev34) {
      statusText = '● Minor Service Degradation (1 Incident)';
      statusTone = 'warning';
    }

    return {
      statusText,
      statusTone,
      activeIncidentsCount: active.length,
      criticalCount: active.filter((i) => i.severity.includes('SEV-1')).length,
      degradedServicesCount: Array.from(new Set(active.flatMap((i) => i.affected_services))).length,
      tenantsImpactedCount: active.reduce((acc, curr) => acc + curr.affected_tenants_count, 0),
      mttrThisMonth: '32m',
      incidentsThisMonth: 8,
      postmortemsPending: incidentDb.filter((i) => i.postmortem.status === 'Required' || i.postmortem.status === 'Draft').length,
    };
  },

  async declareIncident(payload: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    affected_services: string[];
    affected_region: string;
    commander_name: string;
    detection_source: any;
    initial_impact_tenants?: number;
  }): Promise<PlatformIncidentRecord> {
    const newInc: PlatformIncidentRecord = {
      id: `INC-2026-0${15 + incidentDb.length}`,
      title: payload.title,
      description: payload.description,
      severity: payload.severity,
      status: 'Investigating',
      commander_name: payload.commander_name || 'WorkForce Super Admin',
      technical_lead_name: 'Anand P. (Technical Lead)',
      affected_services: payload.affected_services,
      affected_region: payload.affected_region || 'India (Pan-India)',
      affected_tenants_count: payload.initial_impact_tenants || 1,
      affected_users_count: (payload.initial_impact_tenants || 1) * 80,
      affected_organizations: [],
      error_rate_pct: payload.severity.includes('SEV-1') ? 25.0 : 4.0,
      latency_increase_ms: payload.severity.includes('SEV-1') ? 850 : 220,
      detection_source: payload.detection_source || 'Manual',
      started_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      detected_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      acknowledged_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration_formatted: '1m',
      responders: [
        {
          user_id: 'user-superadmin',
          name: payload.commander_name || 'WorkForce Super Admin',
          role: 'Incident Commander',
          assigned_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      timeline: [
        {
          id: `ev-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          event_type: 'Incident Declared',
          actor: payload.commander_name || 'WorkForce Super Admin',
          actor_role: 'Incident Commander',
          visibility: 'internal',
          message: `Incident declared: ${payload.title} (${payload.severity})`,
          details: payload.description,
        },
      ],
      mitigation_tasks: [
        { id: `mit-${Date.now()}-1`, title: 'Verify service error telemetry and alert thresholds', status: 'In Progress' },
        { id: `mit-${Date.now()}-2`, title: 'Isolate affected nodes and initiate diagnostic traces', status: 'Pending' },
      ],
      postmortem: {
        status: payload.severity.includes('SEV-1') || payload.severity.includes('SEV-2') ? 'Required' : 'Not Required',
        summary: '',
        impact_summary: '',
        detection_summary: '',
        root_cause_category: 'Unknown',
        root_cause_narrative: '',
        contributing_factors: [],
        what_went_well: [],
        what_went_wrong: [],
        action_items: [],
      },
      communications: [],
    };

    incidentDb.unshift(newInc);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'PLATFORM_INCIDENT_DECLARED',
      resource_type: 'PlatformIncident',
      resource_id: newInc.id,
      severity: payload.severity.includes('SEV-1') || payload.severity.includes('SEV-2') ? 'Critical' : 'High',
      reason: `Declared ${payload.severity}: ${payload.title}`,
    });

    return newInc;
  },

  async addTimelineUpdate(
    incidentId: string,
    event_type: any,
    message: string,
    visibility: 'internal' | 'customer' = 'internal'
  ): Promise<IncidentTimelineEvent> {
    const inc = incidentDb.find((i) => i.id === incidentId);
    if (!inc) throw new Error('Incident not found');

    const newEv: IncidentTimelineEvent = {
      id: `ev-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event_type,
      actor: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      visibility,
      message,
    };

    inc.timeline.unshift(newEv);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'INCIDENT_UPDATE_ADDED',
      resource_type: 'IncidentEvent',
      resource_id: incidentId,
      severity: 'Normal',
      reason: `Added ${visibility} update to ${incidentId}: ${message}`,
    });

    return newEv;
  },

  async updateStatus(incidentId: string, status: IncidentLifecycleStatus, reason?: string): Promise<PlatformIncidentRecord> {
    const inc = incidentDb.find((i) => i.id === incidentId);
    if (!inc) throw new Error('Incident not found');

    const prev = inc.status;
    inc.status = status;

    if (status === 'Monitoring') {
      inc.monitoring_started_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      inc.monitoring_expected_completion = '20m soak period';
    }

    if (status === 'Resolved' || status === 'Closed') {
      inc.resolved_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    inc.timeline.unshift({
      id: `ev-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event_type: 'Status Changed',
      actor: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      visibility: 'internal',
      message: `Status transitioned from ${prev} to ${status}.${reason ? ` Reason: ${reason}` : ''}`,
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'INCIDENT_STATUS_CHANGED',
      resource_type: 'PlatformIncident',
      resource_id: incidentId,
      severity: status === 'Resolved' ? 'High' : 'Normal',
      reason: `Changed status of ${incidentId} from ${prev} to ${status}`,
    });

    return inc;
  },

  async resolveIncident(
    incidentId: string,
    resolutionSummary: string,
    createPostmortem: boolean
  ): Promise<PlatformIncidentRecord> {
    const inc = incidentDb.find((i) => i.id === incidentId);
    if (!inc) throw new Error('Incident not found');

    inc.status = 'Resolved';
    inc.resolved_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (createPostmortem || inc.severity.includes('SEV-1') || inc.severity.includes('SEV-2')) {
      inc.postmortem.status = 'Required';
      inc.postmortem.summary = resolutionSummary;
    }

    inc.timeline.unshift({
      id: `ev-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event_type: 'Incident Resolved',
      actor: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      visibility: 'customer',
      message: `Incident declared resolved. Resolution: ${resolutionSummary}`,
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'PLATFORM_INCIDENT_RESOLVED',
      resource_type: 'PlatformIncident',
      resource_id: incidentId,
      severity: 'High',
      reason: `Resolved incident ${incidentId}: ${resolutionSummary}`,
    });

    return inc;
  },

  async reopenIncident(incidentId: string, reason: string): Promise<PlatformIncidentRecord> {
    const inc = incidentDb.find((i) => i.id === incidentId);
    if (!inc) throw new Error('Incident not found');

    inc.status = 'Investigating';

    inc.timeline.unshift({
      id: `ev-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event_type: 'Reopened',
      actor: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      visibility: 'internal',
      message: `Incident reopened. Reason: ${reason}`,
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'PLATFORM_INCIDENT_REOPENED',
      resource_type: 'PlatformIncident',
      resource_id: incidentId,
      severity: 'Critical',
      reason: `Reopened incident ${incidentId}: ${reason}`,
    });

    return inc;
  },

  async toggleMitigationTask(incidentId: string, taskId: string): Promise<void> {
    const inc = incidentDb.find((i) => i.id === incidentId);
    if (!inc) return;
    const task = inc.mitigation_tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.status = task.status === 'Completed' ? 'In Progress' : 'Completed';
    task.completed_at = task.status === 'Completed' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
  },

  async updatePostmortem(incidentId: string, postmortemData: Partial<IncidentPostmortem>): Promise<void> {
    const inc = incidentDb.find((i) => i.id === incidentId);
    if (!inc) return;

    inc.postmortem = {
      ...inc.postmortem,
      ...postmortemData,
    };

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'INCIDENT_POSTMORTEM_UPDATED',
      resource_type: 'IncidentPostmortem',
      resource_id: incidentId,
      severity: 'Normal',
      reason: `Updated postmortem for ${incidentId} (Status: ${inc.postmortem.status})`,
    });
  },

  // Backward compatibility
  async createIncident(data: any): Promise<any> {
    return this.declareIncident({
      title: data.title,
      description: data.description,
      severity: data.severity,
      affected_services: data.affected_services || ['Core Platform'],
      affected_region: 'India',
      commander_name: data.lead_engineer || 'WorkForce Super Admin',
      detection_source: 'Manual',
    });
  },

  async updateIncidentStatus(id: string, status: any, rootCause?: string): Promise<any> {
    return this.updateStatus(id, status, rootCause);
  },
};
