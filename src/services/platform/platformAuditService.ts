// src/services/platform/platformAuditService.ts
// ============================================================
// WorkForceOS — Platform Audit Service
// ============================================================
// Immutable audit logging for all privileged SaaS operations.
// Writes to Supabase platform_audit_events table with local fallback.
// ============================================================

import { PlatformAuditEvent } from '../../types/platformAdmin';
import { db, isSupabaseEnabled } from '../../lib/supabase';

const LOCAL_AUDIT_KEY = 'workforce_platform_audit_events';

const initialAuditEvents: PlatformAuditEvent[] = [
  { id: 'aud-001', actor_id: 'user-superadmin', actor_name: 'WorkForce Super Admin', actor_role: 'Super Admin', organization_id: 'org-acme-01', organization_name: 'Acme Technologies', action: 'TENANT_PROVISIONED', resource_type: 'Tenant', resource_id: 'org-acme-01', severity: 'Normal', reason: 'Enterprise plan onboarded', ip_address: '106.51.72.18', created_at: '2026-08-14 09:30 AM', time_ago: '1 hr ago' },
  { id: 'aud-002', actor_id: 'user-superadmin', actor_name: 'WorkForce Super Admin', actor_role: 'Super Admin', organization_id: 'org-zenith-04', organization_name: 'Zenith Logistics', action: 'IMPERSONATION_STARTED', resource_type: 'Session', resource_id: 'imp-101', severity: 'High', reason: 'Investigating payroll LOP sync error', ip_address: '106.51.72.18', created_at: '2026-08-14 08:45 AM', time_ago: '2 hrs ago' },
  { id: 'aud-003', actor_id: 'user-superadmin', actor_name: 'WorkForce Super Admin', actor_role: 'Super Admin', organization_id: 'org-innovate-05', organization_name: 'Innovate Labs', action: 'FEATURE_OVERRIDE_ENABLED', resource_type: 'FeatureFlag', resource_id: 'feature.ai.hr_assistant', severity: 'Normal', reason: 'Customer requested beta access to AI Copilot', ip_address: '106.51.72.18', created_at: '2026-08-13 04:15 PM', time_ago: 'Yesterday' },
  { id: 'aud-004', actor_id: 'user-superadmin', actor_name: 'WorkForce Super Admin', actor_role: 'Super Admin', action: 'MAINTENANCE_SCHEDULED', resource_type: 'System', resource_id: 'maint-v5', severity: 'High', reason: 'Scheduled DB index optimization window', ip_address: '106.51.72.18', created_at: '2026-08-12 11:00 AM', time_ago: '2 days ago' },
  { id: 'aud-005', actor_id: 'user-superadmin', actor_name: 'WorkForce Super Admin', actor_role: 'Super Admin', organization_id: 'org-cyber-03', organization_name: 'CyberSoft Global', action: 'SESSION_REVOKED', resource_type: 'Session', resource_id: 'sess-09', severity: 'High', reason: 'Suspicious IP travel anomaly detected', ip_address: '106.51.72.18', created_at: '2026-08-11 02:20 PM', time_ago: '3 days ago' },
];

function getLocalAuditEvents(): PlatformAuditEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    return raw ? JSON.parse(raw) : initialAuditEvents;
  } catch {
    return initialAuditEvents;
  }
}

function saveLocalAuditEvents(events: PlatformAuditEvent[]): void {
  try {
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('Failed to write audit event to local storage', err);
  }
}

export const platformAuditService = {
  async getAuditEvents(limit: number = 50): Promise<PlatformAuditEvent[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await db('platform_audit_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (data && !error && data.length > 0) {
          return data as PlatformAuditEvent[];
        }
      } catch (err) {
        console.warn('Supabase audit query fallback to local store', err);
      }
    }
    return getLocalAuditEvents().slice(0, limit);
  },

  async logEvent(event: Omit<PlatformAuditEvent, 'id' | 'created_at' | 'time_ago'>): Promise<PlatformAuditEvent> {
    const newEvent: PlatformAuditEvent = {
      ...event,
      id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      time_ago: 'Just now',
    };

    // Save to local store
    const list = getLocalAuditEvents();
    saveLocalAuditEvents([newEvent, ...list]);

    // Async write to Supabase if connected
    if (isSupabaseEnabled) {
      try {
        await db('platform_audit_events').insert({
          id: newEvent.id,
          actor_id: newEvent.actor_id,
          actor_name: newEvent.actor_name,
          actor_role: newEvent.actor_role,
          organization_id: newEvent.organization_id || null,
          action: newEvent.action,
          resource_type: newEvent.resource_type,
          resource_id: newEvent.resource_id,
          severity: newEvent.severity,
          reason: newEvent.reason || null,
          ip_address: newEvent.ip_address || '127.0.0.1',
        });
      } catch (err) {
        console.error('Async audit write to Supabase failed', err);
      }
    }

    return newEvent;
  },
};
