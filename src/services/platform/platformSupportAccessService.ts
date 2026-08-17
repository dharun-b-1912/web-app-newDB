// src/services/platform/platformSupportAccessService.ts
// ============================================================
// WorkForceOS — Temporary Platform Support Access Session Engine
// ============================================================

import { platformAuditService } from './platformAuditService';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

export type SupportAccessMode = 'VIEW ONLY' | 'SUPPORT ACCESS' | 'FULL SUPPORT ACCESS';
export type SupportSessionStatus = 'ACTIVE' | 'EXPIRED' | 'ENDED' | 'REVOKED';

export interface SupportAccessSession {
  id: string;
  organization_id: string;
  organization_name: string;
  platform_actor_id: string;
  platform_actor_name: string;
  platform_actor_role: string;
  access_mode: SupportAccessMode;
  reason: string;
  support_case_id?: string;
  duration_minutes: number;
  started_at: string;
  expires_at: string;
  ended_at?: string;
  status: SupportSessionStatus;
  created_ip?: string;
  user_agent?: string;
}

const activeSessions: Map<string, SupportAccessSession> = new Map();
const sessionHistory: SupportAccessSession[] = [
  {
    id: 'sess-prev-001',
    organization_id: 'org-joy-corp',
    organization_name: 'Joy Corporate Solutions Pvt Ltd',
    platform_actor_id: 'user-thirumalai',
    platform_actor_name: 'Thirumalai R K',
    platform_actor_role: 'Platform Admin',
    access_mode: 'SUPPORT ACCESS',
    reason: 'Investigating biometric hardware push daemon credentials',
    support_case_id: 'SUP-10482',
    duration_minutes: 15,
    started_at: new Date(Date.now() - 86400000).toLocaleString(),
    expires_at: new Date(Date.now() - 86400000 + 15 * 60000).toLocaleString(),
    ended_at: new Date(Date.now() - 86400000 + 14 * 60000).toLocaleString(),
    status: 'ENDED',
  },
];

export const platformSupportAccessService = {
  /**
   * Start a temporary, server-side audited support access session.
   */
  async startSupportSession(params: {
    organizationId: string;
    organizationName: string;
    actorId?: string;
    actorName?: string;
    actorRole?: string;
    accessMode: SupportAccessMode;
    durationMinutes: number;
    reason: string;
    supportCaseId?: string;
  }): Promise<SupportAccessSession> {
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + params.durationMinutes * 60000);
    const sessionId = `sess-${Date.now()}`;

    const session: SupportAccessSession = {
      id: sessionId,
      organization_id: params.organizationId,
      organization_name: params.organizationName,
      platform_actor_id: params.actorId || 'user-thirumalai',
      platform_actor_name: params.actorName || 'Thirumalai R K',
      platform_actor_role: params.actorRole || 'Platform Admin',
      access_mode: params.accessMode,
      reason: params.reason,
      support_case_id: params.supportCaseId || undefined,
      duration_minutes: params.durationMinutes,
      started_at: startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expires_at: expiresAt.toISOString(),
      status: 'ACTIVE',
    };

    activeSessions.set(params.organizationId, session);
    sessionHistory.unshift(session);

    // Write immutable forensic audit entry
    await platformAuditService.logEvent({
      actor_id: session.platform_actor_id,
      actor_name: session.platform_actor_name,
      actor_role: session.platform_actor_role,
      organization_id: session.organization_id,
      organization_name: session.organization_name,
      action: 'SUPPORT_SESSION_STARTED',
      resource_type: 'SupportAccessSession',
      resource_id: sessionId,
      severity: 'High',
      reason: `Platform Admin initiated temporary ${session.access_mode} (${session.duration_minutes}m) for ${session.organization_name}. Reason: ${session.reason}`,
    });

    return session;
  },

  /**
   * End an active support session cleanly.
   */
  async endSupportSession(organizationId: string): Promise<void> {
    const session = activeSessions.get(organizationId);
    if (!session) return;

    session.status = 'ENDED';
    session.ended_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    activeSessions.delete(organizationId);

    // Audit termination
    await platformAuditService.logEvent({
      actor_id: session.platform_actor_id,
      actor_name: session.platform_actor_name,
      actor_role: session.platform_actor_role,
      organization_id: session.organization_id,
      organization_name: session.organization_name,
      action: 'SUPPORT_SESSION_ENDED',
      resource_type: 'SupportAccessSession',
      resource_id: session.id,
      severity: 'Normal',
      reason: `Platform Admin ended support session for ${session.organization_name}`,
    });
  },

  /**
   * Get active session for an organization (checks expiration server-side).
   */
  getActiveSession(organizationId: string): SupportAccessSession | null {
    const session = activeSessions.get(organizationId);
    if (!session) return null;

    // Server-side expiration check
    if (new Date() > new Date(session.expires_at)) {
      session.status = 'EXPIRED';
      session.ended_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      activeSessions.delete(organizationId);
      return null;
    }

    return session;
  },

  /**
   * Retrieve support access history for the customer security tab.
   */
  getSessionHistory(organizationId: string): SupportAccessSession[] {
    return sessionHistory.filter((s) => s.organization_id === organizationId);
  },
};
