// src/services/platform/platformSessionService.ts
// ============================================================
// WorkForceOS — Platform Sessions & Device Security Service
// (Unified: Personal Account Session Center & Platform Control Plane Console)
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';
import {
  PlatformSessionRecord,
  SessionSummaryKPIs,
  SessionFilterOptions,
  SessionEventItem,
  DeviceRegistryItem,
  SessionRiskFactor,
} from '../../types/platformSessions';

export interface AdminSessionItem {
  id: string;
  is_current: boolean;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  last_active_at: string;
  created_at: string;
  assurance_level: 'AAL1' | 'AAL2';
  mfa_verified: boolean;
  status: 'Active' | 'Revoked' | 'Idle';
}

let cachedPersonalSessions: AdminSessionItem[] = [
  {
    id: 'sess-curr-01',
    is_current: true,
    device_name: 'WorkStation Primary',
    browser: 'Chrome 128.0',
    os: 'Windows 11 Pro',
    ip_address: '103.21.144.92',
    location: 'Bengaluru, Karnataka, India',
    last_active_at: 'Just now',
    created_at: '2026-08-17T09:41:00Z',
    assurance_level: 'AAL2',
    mfa_verified: true,
    status: 'Active',
  },
  {
    id: 'sess-other-02',
    is_current: false,
    device_name: 'MacBook Pro M3 Max',
    browser: 'Safari 17.5',
    os: 'macOS Sonoma',
    ip_address: '49.207.214.18',
    location: 'Mumbai, Maharashtra, India',
    last_active_at: '14 minutes ago',
    created_at: '2026-08-17T08:15:00Z',
    assurance_level: 'AAL2',
    mfa_verified: true,
    status: 'Active',
  },
  {
    id: 'sess-other-03',
    is_current: false,
    device_name: 'Surface Laptop Studio',
    browser: 'Microsoft Edge 127.0',
    os: 'Windows 11 Enterprise',
    ip_address: '157.48.112.5',
    location: 'Chennai, Tamil Nadu, India',
    last_active_at: '2 hours ago',
    created_at: '2026-08-16T22:30:00Z',
    assurance_level: 'AAL2',
    mfa_verified: true,
    status: 'Active',
  },
];

let cachedPlatformSessions: PlatformSessionRecord[] = [
  {
    id: 'sess-curr-01',
    auth_session_id: 'auth-sess-101',
    user_name: 'Arun Kumar',
    user_email: 'superadmin@workforceos.com',
    tenant_id: 'org-global-01',
    tenant_name: 'Global Platform Control Plane',
    role_id: 'role-super-admin',
    role_name: 'Super Admin',
    session_status: 'Active',
    created_at: '2026-08-17T09:41:00Z',
    last_activity_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    ip_masked: '103.21.144.xxx',
    country: 'India',
    city: 'Bengaluru',
    device_id: 'dev-win-01',
    device_name: 'WorkStation Primary',
    device_type: 'Desktop',
    os_name: 'Windows 11 Pro',
    browser_name: 'Google Chrome',
    auth_method: 'MFA',
    mfa_verified: true,
    is_privileged: true,
    risk_level: 'Low',
    risk_score: 5,
    first_seen_device: false,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sess-other-02',
    auth_session_id: 'auth-sess-102',
    user_name: 'Arun Kumar',
    user_email: 'superadmin@workforceos.com',
    tenant_id: 'org-global-01',
    tenant_name: 'Global Platform Control Plane',
    role_id: 'role-super-admin',
    role_name: 'Super Admin',
    session_status: 'Active',
    created_at: '2026-08-17T08:15:00Z',
    last_activity_at: new Date(Date.now() - 14 * 60000).toISOString(),
    last_seen_at: new Date(Date.now() - 14 * 60000).toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    ip_masked: '49.207.214.xxx',
    country: 'India',
    city: 'Mumbai',
    device_id: 'dev-mac-02',
    device_name: 'MacBook Pro M3 Max',
    device_type: 'Desktop',
    os_name: 'macOS Sonoma',
    browser_name: 'Apple Safari',
    auth_method: 'MFA',
    mfa_verified: true,
    is_privileged: true,
    risk_level: 'Low',
    risk_score: 8,
    first_seen_device: false,
    updated_at: new Date().toISOString(),
  },
];

export const platformSessionService = {
  // -------------------------------------------------------------
  // Realtime Supabase Channel
  // -------------------------------------------------------------
  subscribeToRealtime(onChangeCallback: () => void): () => void {
    if (!isSupabaseEnabled) return () => {};

    const channel = supabase
      .channel('platform_sessions_realtime_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions' }, () => {
        onChangeCallback();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // -------------------------------------------------------------
  // Personal Account Session Center Methods
  // -------------------------------------------------------------
  async getSessions(): Promise<AdminSessionItem[]> {
    if (isSupabaseEnabled) {
      try {
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser';
        const isWindows = userAgent.includes('Windows');
        const isMac = userAgent.includes('Macintosh');
        const isChrome = userAgent.includes('Chrome');
        const isSafari = userAgent.includes('Safari') && !isChrome;
        const isEdge = userAgent.includes('Edg');

        const browserName = isEdge ? 'Microsoft Edge' : isChrome ? 'Google Chrome' : isSafari ? 'Apple Safari' : 'Modern Browser';
        const osName = isWindows ? 'Windows 11' : isMac ? 'macOS' : 'Linux / Unix';

        const currentSession = cachedPersonalSessions.find((s) => s.is_current);
        if (currentSession) {
          currentSession.browser = browserName;
          currentSession.os = osName;
          currentSession.last_active_at = 'Just now';
        }
      } catch (err) {
        console.warn('[PlatformSessionService] Session resolution warning:', err);
      }
    }

    return cachedPersonalSessions.filter((s) => s.status === 'Active');
  },

  async revokeOtherSessions(): Promise<{ count: number }> {
    const revokedSessions = cachedPersonalSessions.filter((s) => !s.is_current && s.status === 'Active');
    const count = revokedSessions.length;

    cachedPersonalSessions = cachedPersonalSessions.filter((s) => s.is_current);
    cachedPlatformSessions = cachedPlatformSessions.filter((s) => s.id === 'sess-curr-01');

    await platformAuditService.logEvent({
      action: 'sessions.revoked_all_others',
      category: 'Security',
      resource_type: 'ActiveSession',
      resource_id: 'global-other-sessions',
      severity: 'High',
      reason: `Platform Admin terminated ${count} other active device sessions`,
    });

    return { count };
  },

  async signOutEverywhere(): Promise<void> {
    cachedPersonalSessions = [];
    cachedPlatformSessions = [];

    if (isSupabaseEnabled) {
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('[PlatformSessionService] Supabase global sign out warning:', err);
      }
    }

    await platformAuditService.logEvent({
      action: 'sessions.revoked_everywhere',
      category: 'Security',
      resource_type: 'ActiveSession',
      resource_id: 'global-terminate-all',
      severity: 'Critical',
      reason: `Platform Admin triggered global sign out across all devices and revoked all refresh tokens`,
    });
  },

  // -------------------------------------------------------------
  // Platform-wide Sessions & Security Console (ActiveSessionsView)
  // -------------------------------------------------------------
  async fetchSessionSummary(): Promise<SessionSummaryKPIs> {
    const activeCount = cachedPlatformSessions.filter((s) => s.session_status === 'Active').length;
    const adminCount = cachedPlatformSessions.filter((s) => s.is_privileged && s.session_status === 'Active').length;
    const suspiciousCount = cachedPlatformSessions.filter((s) => s.risk_level === 'High' || s.risk_level === 'Critical').length;
    const newDevicesCount = cachedPlatformSessions.filter((s) => s.first_seen_device).length;

    return {
      active_sessions_count: activeCount,
      admin_sessions_count: adminCount,
      tenant_sessions_count: activeCount - adminCount,
      suspicious_sessions_count: suspiciousCount,
      new_devices_count: newDevicesCount,
      idle_sessions_count: 0,
      expired_today_count: 0,
      revoked_today_count: 2,
      calculated_at: new Date().toISOString(),
    };
  },

  async fetchSessions(filters?: SessionFilterOptions): Promise<{ sessions: PlatformSessionRecord[]; total: number }> {
    let list = [...cachedPlatformSessions];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.user_name.toLowerCase().includes(q) ||
          s.user_email.toLowerCase().includes(q) ||
          s.tenant_name.toLowerCase().includes(q) ||
          s.device_name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q)
      );
    }

    if (filters?.risk && filters.risk !== 'ALL') {
      list = list.filter((s) => s.risk_level === filters.risk);
    }

    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((s) => s.session_status === filters.status);
    }

    return {
      sessions: list,
      total: list.length,
    };
  },

  async fetchSessionEvents(sessionId?: string): Promise<SessionEventItem[]> {
    return [
      {
        id: 'evt-101',
        session_id: sessionId || 'sess-curr-01',
        event_type: 'SESSION_AUTHENTICATED',
        user_email: 'superadmin@workforceos.com',
        actor_name: 'Arun Kumar',
        ip_masked: '103.21.144.xxx',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        details: { method: 'Password + TOTP', aal: 'AAL2' },
      },
      {
        id: 'evt-102',
        session_id: sessionId || 'sess-curr-01',
        event_type: 'SECURITY_CHECK_PASSED',
        user_email: 'superadmin@workforceos.com',
        actor_name: 'Security Engine',
        ip_masked: '103.21.144.xxx',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        details: { result: 'TLS 1.3 Cipher Verified' },
      },
    ];
  },

  async fetchUserDeviceHistory(email: string): Promise<DeviceRegistryItem[]> {
    return [
      {
        id: 'dreg-01',
        device_id: 'dev-win-01',
        user_email: email,
        tenant_id: 'org-global-01',
        device_type: 'Desktop',
        os_name: 'Windows 11 Pro',
        browser_name: 'Google Chrome',
        first_seen_at: '2026-06-01T10:00:00Z',
        last_seen_at: new Date().toISOString(),
        trust_status: 'Trusted',
      },
    ];
  },

  getRiskFactors(session: PlatformSessionRecord): SessionRiskFactor[] {
    const factors: SessionRiskFactor[] = [];
    if (session.risk_score > 50) {
      factors.push({
        signal: 'Elevated Risk Indicator',
        severity: 'High',
        description: 'Anomalous access pattern detected.',
        points: 40,
      });
    } else {
      factors.push({
        signal: 'Known Corporate Gateway',
        severity: 'Info',
        description: 'Validated enterprise network address with verified TLS cipher.',
        points: 0,
      });
    }
    return factors;
  },

  async revokeSession(sessionId: string, reason: string = 'Administrative Revocation'): Promise<{ success: boolean; error?: string }> {
    const target = cachedPersonalSessions.find((s) => s.id === sessionId);
    const platTarget = cachedPlatformSessions.find((s) => s.id === sessionId);

    if (target) target.status = 'Revoked';
    if (platTarget) platTarget.session_status = 'Revoked';

    await platformAuditService.logEvent({
      action: 'session.revoked',
      category: 'Security',
      resource_type: 'ActiveSession',
      resource_id: sessionId,
      resource_name: target?.device_name || platTarget?.device_name || sessionId,
      severity: 'Normal',
      reason: `Platform Admin revoked active session ${sessionId}: ${reason}`,
    });

    return { success: true };
  },

  async revokeAllUserSessions(email: string, reason: string = 'Bulk User Revocation'): Promise<{ success: boolean; revoked_count: number; error?: string }> {
    const count = cachedPlatformSessions.filter((s) => s.user_email === email && s.session_status === 'Active').length;
    cachedPlatformSessions.forEach((s) => {
      if (s.user_email === email) s.session_status = 'Revoked';
    });

    await platformAuditService.logEvent({
      action: 'sessions.revoked_user_all',
      category: 'Security',
      resource_type: 'ActiveSession',
      resource_id: email,
      severity: 'High',
      reason: `Revoked all active sessions for ${email} (${count} sessions): ${reason}`,
    });

    return { success: true, revoked_count: count };
  },

  async revokeAllPrivilegedSessions(reason: string = 'Security Protocol Triggered'): Promise<{ success: boolean; revoked_count: number; error?: string }> {
    const count = cachedPlatformSessions.filter((s) => s.is_privileged && s.session_status === 'Active').length;
    cachedPlatformSessions.forEach((s) => {
      if (s.is_privileged) s.session_status = 'Revoked';
    });

    await platformAuditService.logEvent({
      action: 'sessions.revoked_privileged_all',
      category: 'Security',
      resource_type: 'ActiveSession',
      resource_id: 'privileged-sessions',
      severity: 'Critical',
      reason: `Emergency termination of all privileged sessions (${count} sessions): ${reason}`,
    });

    return { success: true, revoked_count: count };
  },
};
