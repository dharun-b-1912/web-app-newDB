// src/services/platform/platformImpersonationService.ts
// ============================================================
// WorkForceOS — Controlled Impersonation Session Service
// ============================================================

import { ImpersonationSession, SupportAccessRequest } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

const LOCAL_IMPERSONATION_KEY = 'workforce_active_impersonation';

const initialSupportRequests: SupportAccessRequest[] = [
  { id: 'sup-req-101', tenant_id: 'org-zenith-04', tenant_name: 'Zenith Logistics & Supply Chain', requested_by: 'Lead Support Engineer Arun', reason: 'Investigating payroll loss of pay (LOP) calculation discrepancy on July cycle', duration_minutes: 60, status: 'Active', started_at: '2026-08-14 10:45 AM', expires_at: '2026-08-14 11:45 AM' },
  { id: 'sup-req-102', tenant_id: 'org-cyber-03', tenant_name: 'CyberSoft Global Tech Ltd', requested_by: 'Solutions Architect Priya', reason: 'Assisting with ZK Teco biometric hardware network configuration', duration_minutes: 30, status: 'Approved', expires_at: '2026-08-14 02:00 PM' },
];

export const platformImpersonationService = {
  getSupportRequests(): SupportAccessRequest[] {
    return initialSupportRequests;
  },

  getActiveSession(): ImpersonationSession | null {
    try {
      const raw = sessionStorage.getItem(LOCAL_IMPERSONATION_KEY);
      if (!raw) return null;
      const session: ImpersonationSession = JSON.parse(raw);
      if (new Date(session.expires_at).getTime() < Date.now()) {
        sessionStorage.removeItem(LOCAL_IMPERSONATION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  async startImpersonation(data: {
    target_tenant_id: string;
    target_tenant_name: string;
    reason: string;
    duration_minutes: number;
  }): Promise<ImpersonationSession> {
    const expiresAt = new Date(Date.now() + data.duration_minutes * 60000).toISOString();

    const session: ImpersonationSession = {
      id: `imp-${Date.now().toString(36)}`,
      admin_user_id: 'user-superadmin',
      admin_name: 'WorkForce Super Admin',
      target_tenant_id: data.target_tenant_id,
      target_tenant_name: data.target_tenant_name,
      reason: data.reason,
      duration_minutes: data.duration_minutes,
      status: 'Active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    sessionStorage.setItem(LOCAL_IMPERSONATION_KEY, JSON.stringify(session));

    // Audit Event
    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: data.target_tenant_id,
      organization_name: data.target_tenant_name,
      action: 'IMPERSONATION_SESSION_STARTED',
      resource_type: 'TenantSession',
      resource_id: session.id,
      severity: 'Critical',
      reason: `Impersonation requested: ${data.reason} (Expires in ${data.duration_minutes}m)`,
    });

    return session;
  },

  async endImpersonation(): Promise<void> {
    const session = this.getActiveSession();
    sessionStorage.removeItem(LOCAL_IMPERSONATION_KEY);

    if (session) {
      await platformAuditService.logEvent({
        actor_id: 'user-superadmin',
        actor_name: 'WorkForce Super Admin',
        actor_role: 'Super Admin',
        organization_id: session.target_tenant_id,
        organization_name: session.target_tenant_name,
        action: 'IMPERSONATION_SESSION_ENDED',
        resource_type: 'TenantSession',
        resource_id: session.id,
        severity: 'Normal',
        reason: 'Administrator voluntarily exited tenant impersonation mode',
      });
    }
  },
};
