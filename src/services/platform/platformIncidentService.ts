// src/services/platform/platformIncidentService.ts
// ============================================================
// WorkForceOS — SaaS Incident Management & Status Service
// ============================================================

import { PlatformIncident, IncidentSeverity, IncidentStatus } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

const initialIncidents: PlatformIncident[] = [
  {
    id: 'inc-2026-004',
    title: 'ZK Teco IP Biometric Sync Intermittent Timeout',
    description: 'Hardware push notifications experiencing delayed punch registration in Southern India region due to gateway network jitter.',
    severity: 'SEV-3 Moderate',
    status: 'Monitoring',
    affected_services: ['Biometric Hardware Gateway', 'Realtime Sync'],
    affected_tenants_count: 2,
    started_at: '2026-08-14 08:30 AM',
    detected_at: '2026-08-14 08:34 AM',
    lead_engineer: 'DevOps Lead Karthik',
    root_cause: 'TCP socket buffer pool exhaustion on push adapter edge node',
    postmortem_url: 'https://status.workforceos.com/incidents/inc-2026-004',
  },
  {
    id: 'inc-2026-003',
    title: 'SendGrid Email Dispatch Rate Limit Throttling',
    description: 'Scheduled payslip PDF dispatch batch exceeded burst concurrency limits resulting in a 12-minute delay.',
    severity: 'SEV-4 Minor',
    status: 'Resolved',
    affected_services: ['Email Dispatch Gateway'],
    affected_tenants_count: 5,
    started_at: '2026-08-01 10:00 AM',
    resolved_at: '2026-08-01 10:14 AM',
    lead_engineer: 'Infrastructure Lead Anand',
    root_cause: 'Email worker queue concurrency set above API tier limit',
  },
];

export const platformIncidentService = {
  getIncidents(): PlatformIncident[] {
    return initialIncidents;
  },

  getActiveIncidents(): PlatformIncident[] {
    return initialIncidents.filter(i => i.status !== 'Resolved' && i.status !== 'Closed');
  },

  async createIncident(data: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    affected_services: string[];
    lead_engineer: string;
  }): Promise<PlatformIncident> {
    const newInc: PlatformIncident = {
      id: `inc-2026-00${initialIncidents.length + 1}`,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'Investigating',
      affected_services: data.affected_services,
      affected_tenants_count: 1,
      started_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      detected_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lead_engineer: data.lead_engineer,
    };

    initialIncidents.unshift(newInc);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'PLATFORM_INCIDENT_DECLARED',
      resource_type: 'Incident',
      resource_id: newInc.id,
      severity: data.severity.includes('SEV-1') || data.severity.includes('SEV-2') ? 'Critical' : 'High',
      reason: `Incident declared: ${data.title} (${data.severity})`,
    });

    return newInc;
  },

  async updateIncidentStatus(id: string, status: IncidentStatus, rootCause?: string): Promise<PlatformIncident> {
    const target = initialIncidents.find(i => i.id === id);
    if (!target) throw new Error('Incident not found');

    target.status = status;
    if (rootCause) target.root_cause = rootCause;
    if (status === 'Resolved' || status === 'Closed') {
      target.resolved_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'PLATFORM_INCIDENT_STATUS_UPDATED',
      resource_type: 'Incident',
      resource_id: id,
      severity: 'Normal',
      reason: `Incident ${id} transitioned to ${status}`,
    });

    return target;
  },
};
