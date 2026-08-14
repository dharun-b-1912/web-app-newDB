// src/services/platform/platformSessionService.ts
// ============================================================
// WorkForceOS — Active Sessions Management Service (100% Realtime Supabase)
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import {
  PlatformSessionRecord,
  SessionSummaryKPIs,
  SessionFilterOptions,
  SessionEventItem,
  DeviceRegistryItem,
  SessionRiskFactor,
} from '../../types/platformSessions';
import { platformAuditService } from './platformAuditService';

let cachedSummary: SessionSummaryKPIs = {
  active_sessions_count: 0,
  admin_sessions_count: 0,
  tenant_sessions_count: 0,
  suspicious_sessions_count: 0,
  new_devices_count: 0,
  idle_sessions_count: 0,
  expired_today_count: 0,
  revoked_today_count: 0,
  calculated_at: new Date().toISOString(),
};

let cachedSessions: PlatformSessionRecord[] = [];

export const platformSessionService = {
  // -------------------------------------------------------------
  // Realtime Supabase Database Listener
  // -------------------------------------------------------------
  subscribeToRealtime(onChangeCallback: () => void) {
    if (!isSupabaseEnabled) return () => {};

    const channel = supabase
      .channel('platform_sessions_realtime_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_sessions' }, () => {
        onChangeCallback();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_events' }, () => {
        onChangeCallback();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // -------------------------------------------------------------
  // Summary KPIs Aggregation
  // -------------------------------------------------------------
  async fetchSessionSummary(): Promise<SessionSummaryKPIs> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.rpc('fn_get_session_summary');
        if (!error && data) {
          cachedSummary = data as SessionSummaryKPIs;
          return cachedSummary;
        }

        // Direct table aggregation fallback
        const { data: rows, error: qErr } = await supabase
          .from('platform_sessions')
          .select('session_status, is_privileged, risk_level, first_seen_device, expires_at, revoked_at');

        if (!qErr && rows) {
          const now = new Date();
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

          const active = rows.filter((r) => r.session_status === 'Active' && new Date(r.expires_at) > now);
          const admin = active.filter((r) => r.is_privileged);
          const tenant = active.filter((r) => !r.is_privileged);
          const suspicious = active.filter((r) => r.risk_level === 'High' || r.risk_level === 'Critical');
          const newDev = rows.filter((r) => r.first_seen_device);
          const idle = rows.filter((r) => r.session_status === 'Idle' && new Date(r.expires_at) > now);
          const expired = rows.filter(
            (r) =>
              (r.session_status === 'Expired' || new Date(r.expires_at) <= now) &&
              new Date(r.expires_at) >= oneDayAgo
          );
          const revoked = rows.filter(
            (r) => r.session_status === 'Revoked' && r.revoked_at && new Date(r.revoked_at) >= oneDayAgo
          );

          cachedSummary = {
            active_sessions_count: active.length,
            admin_sessions_count: admin.length,
            tenant_sessions_count: tenant.length,
            suspicious_sessions_count: suspicious.length,
            new_devices_count: newDev.length,
            idle_sessions_count: idle.length,
            expired_today_count: expired.length,
            revoked_today_count: revoked.length,
            calculated_at: new Date().toISOString(),
          };
          return cachedSummary;
        }
      } catch (err) {
        console.warn('Failed to query session summary from Supabase:', err);
      }
    }

    return cachedSummary;
  },

  // -------------------------------------------------------------
  // Session Listing with Server-Side Search & Filters
  // -------------------------------------------------------------
  async fetchSessions(filters?: SessionFilterOptions): Promise<{
    sessions: PlatformSessionRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 25;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (isSupabaseEnabled) {
      try {
        let query = supabase.from('platform_sessions').select('*', { count: 'exact' });

        if (filters?.status && filters.status !== 'All') {
          query = query.eq('session_status', filters.status);
        }
        if (filters?.risk && filters.risk !== 'All') {
          query = query.eq('risk_level', filters.risk);
        }
        if (filters?.role && filters.role !== 'All') {
          if (filters.role === 'Admin') {
            query = query.eq('is_privileged', true);
          } else {
            query = query.ilike('role_name', `%${filters.role}%`);
          }
        }
        if (filters?.authMethod && filters.authMethod !== 'All') {
          query = query.eq('auth_method', filters.authMethod);
        }
        if (filters?.deviceType && filters.deviceType !== 'All') {
          query = query.eq('device_type', filters.deviceType);
        }
        if (filters?.firstSeenToday) {
          query = query.eq('first_seen_device', true);
        }
        if (filters?.search) {
          const q = filters.search.trim();
          query = query.or(
            `user_name.ilike.%${q}%,user_email.ilike.%${q}%,tenant_name.ilike.%${q}%,city.ilike.%${q}%,country.ilike.%${q}%,browser_name.ilike.%${q}%,os_name.ilike.%${q}%`
          );
        }

        const sortBy = filters?.sortBy || 'last_activity_at';
        const ascending = filters?.sortDirection === 'asc';
        query = query.order(sortBy, { ascending }).range(from, to);

        const { data, count, error } = await query;
        if (!error && data) {
          cachedSessions = data as PlatformSessionRecord[];
          return {
            sessions: cachedSessions,
            total: count || cachedSessions.length,
            page,
            limit,
          };
        }
      } catch (err) {
        console.warn('Failed to query sessions from Supabase:', err);
      }
    }

    return {
      sessions: cachedSessions,
      total: cachedSessions.length,
      page,
      limit,
    };
  },

  // -------------------------------------------------------------
  // Single Session Detail & Related Events
  // -------------------------------------------------------------
  async fetchSessionById(sessionId: string): Promise<PlatformSessionRecord | null> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('platform_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        if (!error && data) {
          return data as PlatformSessionRecord;
        }
      } catch (err) {
        console.warn('Failed to fetch session detail:', err);
      }
    }
    return cachedSessions.find((s) => s.id === sessionId) || null;
  },

  async fetchSessionEvents(sessionId: string): Promise<SessionEventItem[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('session_events')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data as SessionEventItem[];
        }
      } catch (err) {
        console.warn('Failed to fetch session events:', err);
      }
    }
    return [];
  },

  async fetchUserDeviceHistory(userEmail: string): Promise<DeviceRegistryItem[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('device_registry')
          .select('*')
          .eq('user_email', userEmail)
          .order('last_seen_at', { ascending: false });
        if (!error && data) {
          return data as DeviceRegistryItem[];
        }
      } catch (err) {
        console.warn('Failed to fetch device registry:', err);
      }
    }
    return [];
  },

  // -------------------------------------------------------------
  // Risk Signals Evaluator
  // -------------------------------------------------------------
  getRiskFactors(session: PlatformSessionRecord): SessionRiskFactor[] {
    const factors: SessionRiskFactor[] = [];

    if (session.risk_reason) {
      factors.push({
        signal: 'Security Anomaly Detected',
        points: session.risk_score,
        severity: session.risk_level === 'Critical' ? 'Critical' : session.risk_level === 'High' ? 'High' : 'Warning',
        description: session.risk_reason,
      });
    }

    if (session.is_privileged) {
      factors.push({
        signal: 'Privileged Administrative Role',
        points: 15,
        severity: 'Info',
        description: `Session holds elevated platform permissions (${session.role_name}).`,
      });
    }

    if (session.first_seen_device) {
      factors.push({
        signal: 'Unrecognized / New Device',
        points: 25,
        severity: 'Warning',
        description: `Device ID ${session.device_id} was first enrolled within the last 24 hours.`,
      });
    }

    if (!session.mfa_verified && session.auth_method === 'Password') {
      factors.push({
        signal: 'Single Factor Authentication',
        points: 20,
        severity: 'Warning',
        description: 'Session authenticated using single-factor password without hardware or TOTP second factor.',
      });
    }

    if (session.mfa_verified) {
      factors.push({
        signal: 'Hardware MFA Verified',
        points: 0,
        severity: 'Info',
        description: 'Multi-factor authentication (FIDO2 / WebAuthn / TOTP) successfully challenged.',
      });
    }

    return factors;
  },

  // -------------------------------------------------------------
  // Session Revocation Operations
  // -------------------------------------------------------------
  async revokeSession(sessionId: string, reason: string, actorName = 'WorkForce Super Admin'): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.rpc('fn_revoke_session', {
          p_session_id: sessionId,
          p_revoked_by: actorName,
          p_reason: reason,
        });

        if (!error && data) {
          if (!data.success) {
            return { success: false, error: data.error || 'Failed to revoke session' };
          }
        } else if (error) {
          // Direct fallback update
          await supabase
            .from('platform_sessions')
            .update({
              session_status: 'Revoked',
              revoked_at: new Date().toISOString(),
              revoked_by: actorName,
              revocation_reason: reason,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId);
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Database error during revocation' };
      }
    }

    const session = cachedSessions.find((s) => s.id === sessionId);
    if (session) {
      session.session_status = 'Revoked';
      session.revoked_at = new Date().toISOString();
      session.revoked_by = actorName;
      session.revocation_reason = reason;
    }

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'SESSION_REVOKED',
      resource_type: 'ActiveSession',
      resource_id: sessionId,
      severity: 'High',
      reason,
    });

    return { success: true };
  },

  async revokeAllUserSessions(userEmail: string, reason: string, actorName = 'WorkForce Super Admin'): Promise<{ success: boolean; revokedCount: number; error?: string }> {
    let count = 0;
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.rpc('fn_revoke_user_sessions', {
          p_user_email: userEmail,
          p_revoked_by: actorName,
          p_reason: reason,
        });

        if (!error && data) {
          count = data.revoked_count || 0;
        } else {
          const { count: updatedCount } = await supabase
            .from('platform_sessions')
            .update({
              session_status: 'Revoked',
              revoked_at: new Date().toISOString(),
              revoked_by: actorName,
              revocation_reason: reason,
              updated_at: new Date().toISOString(),
            })
            .eq('user_email', userEmail)
            .in('session_status', ['Active', 'Idle']);
          count = updatedCount || 0;
        }
      } catch (err: any) {
        return { success: false, revokedCount: 0, error: err.message || 'Database error' };
      }
    }

    cachedSessions.forEach((s) => {
      if (s.user_email === userEmail && s.session_status !== 'Revoked') {
        s.session_status = 'Revoked';
        s.revoked_at = new Date().toISOString();
        s.revoked_by = actorName;
        s.revocation_reason = reason;
        count++;
      }
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'USER_SESSIONS_TERMINATED_EVERYWHERE',
      resource_type: 'User',
      resource_id: userEmail,
      severity: 'Critical',
      reason: `Revoked all active sessions for ${userEmail}: ${reason}`,
    });

    return { success: true, revokedCount: count };
  },

  async revokeAllPrivilegedSessions(reason: string, actorName = 'WorkForce Super Admin'): Promise<{ success: boolean; revokedCount: number; error?: string }> {
    let count = 0;
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.rpc('fn_revoke_all_privileged_sessions', {
          p_revoked_by: actorName,
          p_reason: reason,
        });

        if (!error && data) {
          count = data.revoked_count || 0;
        } else {
          const { count: updatedCount } = await supabase
            .from('platform_sessions')
            .update({
              session_status: 'Revoked',
              revoked_at: new Date().toISOString(),
              revoked_by: actorName,
              revocation_reason: reason,
              updated_at: new Date().toISOString(),
            })
            .eq('is_privileged', true)
            .in('session_status', ['Active', 'Idle']);
          count = updatedCount || 0;
        }
      } catch (err: any) {
        return { success: false, revokedCount: 0, error: err.message || 'Database error' };
      }
    }

    cachedSessions.forEach((s) => {
      if (s.is_privileged && s.session_status !== 'Revoked') {
        s.session_status = 'Revoked';
        s.revoked_at = new Date().toISOString();
        s.revoked_by = actorName;
        s.revocation_reason = reason;
        count++;
      }
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'ALL_PRIVILEGED_SESSIONS_REVOKED',
      resource_type: 'PlatformControl',
      resource_id: 'global-privileged-sessions',
      severity: 'Critical',
      reason: `Mass emergency revocation executed: ${reason}`,
    });

    return { success: true, revokedCount: count };
  },
};
