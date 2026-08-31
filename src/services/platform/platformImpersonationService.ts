// src/services/platform/platformImpersonationService.ts
// ============================================================
// Joy PeopleHR — Controlled Impersonation Session Service
// Clean Zero-Mock Service
// ============================================================

import { ImpersonationSession, SupportAccessRequest } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';
import { api } from '../api';

const LOCAL_IMPERSONATION_KEY = 'workforce_active_impersonation';

let supportRequestsDb: SupportAccessRequest[] = [];

export const platformImpersonationService = {
  getSupportRequests(): SupportAccessRequest[] {
    return supportRequestsDb;
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
    const currentUser = api.getCurrentUser();

    const session: ImpersonationSession = {
      id: `imp-${Date.now().toString(36)}`,
      admin_user_id: currentUser?.id || 'user-superadmin',
      admin_name: currentUser?.name || 'Platform Super Admin',
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
      actor_id: currentUser?.id || 'user-superadmin',
      actor_name: currentUser?.name || 'Platform Super Admin',
      actor_role: currentUser?.roles?.[0]?.name || 'Super Admin',
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
    const currentUser = api.getCurrentUser();

    if (session) {
      await platformAuditService.logEvent({
        actor_id: currentUser?.id || 'user-superadmin',
        actor_name: currentUser?.name || 'Platform Super Admin',
        actor_role: currentUser?.roles?.[0]?.name || 'Super Admin',
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
