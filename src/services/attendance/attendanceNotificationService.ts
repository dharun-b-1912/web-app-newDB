// src/services/attendance/attendanceNotificationService.ts
// ============================================================================
// JOY PeopleHR — Centralized Attendance Notification & Hierarchy Push Engine
// Delivers real-time In-App + Remote Push Notifications to Reporting Managers
// and Team Leads/Supervisors whenever an employee checks in or checks out.
// ============================================================================

import { supabase, isSupabaseEnabled, supabaseUrl } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { AttendanceChannelSource, PunchDirection } from './attendanceIngestionService';

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type AttendanceNotificationEventType =
  | 'attendance.check_in.accepted'
  | 'attendance.check_out.accepted';

export type SupervisorRole = 'REPORTING_MANAGER' | 'TL_SUPERVISOR' | 'REPORTING_MANAGER_AND_TL';

export interface ResolvedSupervisor {
  employeeId: string;
  employeeCode: string;
  name: string;
  role: SupervisorRole;
  profileId?: string;
  authUserId?: string;
  workEmail?: string;
  phone?: string;
  fcmTokens: string[];
}

export interface AttendanceNotificationEventPayload {
  organizationId: string;
  punchId?: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  eventType: AttendanceNotificationEventType;
  punchType: PunchDirection;
  source: AttendanceChannelSource;
  punchTime: string; // ISO string
  deviceId?: string;
  deviceName?: string;
  latitude?: number;
  longitude?: number;
  idempotencyKey?: string;
  isLate?: boolean;
  lateMinutes?: number;
  graceMinutes?: number;
  shiftStart?: string;
  shiftEnd?: string;
  shiftCode?: string;
}

export interface AttendanceNotificationDispatchLog {
  id: string;
  eventId: string;
  eventType: AttendanceNotificationEventType;
  punchTime: string;
  source: AttendanceChannelSource;
  punchingEmployee: {
    id: string;
    code: string;
    name: string;
  };
  organizationId: string;
  resolvedRecipients: {
    employeeId: string;
    employeeCode: string;
    name: string;
    role: SupervisorRole;
    fcmTokensCount: number;
  }[];
  deliveries: {
    recipientId: string;
    recipientName: string;
    role: SupervisorRole;
    channel: 'IN_APP' | 'PUSH';
    status: 'SENT' | 'FAILED' | 'SKIPPED_NO_DEVICE';
    inAppNotificationId?: string;
    providerMessageId?: string;
    errorMessage?: string;
    timestamp: string;
  }[];
  missingHierarchy: boolean;
  routingException?: string;
  createdAt: string;
}

export interface AttendanceNotificationPolicy {
  // Source scope
  enableBiometricPunches: boolean;
  enableMobileGpsPunches: boolean;
  enableWebPunches: boolean;

  // Delivery modes
  onTimeDeliveryMode: 'SILENT' | 'PUSH' | 'DISABLED';
  lateDeliveryMode: 'HIGH_PRIORITY_PUSH' | 'SILENT' | 'DISABLED';
  unauthorizedLocationMode: 'HIGH_PRIORITY_PUSH' | 'SILENT' | 'DISABLED';
  earlyCheckoutMode: 'PUSH' | 'SILENT' | 'DISABLED';

  // Grace and anti-fatigue controls
  graceMinutes: number;
  enableNotificationGrouping: boolean;
  enableMorningDigest: boolean;
  digestTime: string;

  // Hierarchy scope
  notifyDirectManager: boolean;
  notifyFunctionalTL: boolean;
}

export const DEFAULT_ATTENDANCE_NOTIFICATION_POLICY: AttendanceNotificationPolicy = {
  enableBiometricPunches: true,
  enableMobileGpsPunches: true,
  enableWebPunches: true,

  onTimeDeliveryMode: 'SILENT', // In-app feed only — prevents 100 morning vibrations!
  lateDeliveryMode: 'HIGH_PRIORITY_PUSH', // Loud push with vibration & sound for late check-in
  unauthorizedLocationMode: 'HIGH_PRIORITY_PUSH',
  earlyCheckoutMode: 'PUSH',

  graceMinutes: 30,
  enableNotificationGrouping: true,
  enableMorningDigest: true,
  digestTime: '09:35',

  notifyDirectManager: true,
  notifyFunctionalTL: true,
};

class AttendanceNotificationService {
  // In-memory diagnostic outbox log (capped at 200 recent events)
  private diagnosticLogs: AttendanceNotificationDispatchLog[] = [];

  // Idempotency cache: idempotencyKey -> DispatchLog
  private idempotencyRegistry: Map<string, AttendanceNotificationDispatchLog> = new Map();

  // Cached Google OAuth2 Access Token for FCM HTTP v1
  private fcmAccessToken: string | null = null;
  private fcmTokenExpiry: number = 0;

  // Cached admin Supabase client for backend/service execution
  private adminClient: any = null;

  // Active tenant policy cache (in-memory + localStorage sync)
  private policyCache: Map<string, AttendanceNotificationPolicy> = new Map();

  /**
   * Authoritative getter for HR Attendance Notification Policy.
   * Gracefully loads from in-memory cache or browser localStorage.
   */
  public getPolicy(orgId: string = '0c621892-e938-4707-9957-13534ea32c19'): AttendanceNotificationPolicy {
    if (this.policyCache.has(orgId)) {
      return this.policyCache.get(orgId)!;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(`joy_att_notif_policy_${orgId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const merged = { ...DEFAULT_ATTENDANCE_NOTIFICATION_POLICY, ...parsed };
          this.policyCache.set(orgId, merged);
          return merged;
        }
      } catch {}
    }

    const fallback = { ...DEFAULT_ATTENDANCE_NOTIFICATION_POLICY };
    this.policyCache.set(orgId, fallback);
    return fallback;
  }

  /**
   * Authoritative setter for HR Attendance Notification Policy.
   * Instantly takes effect across the real-time push engine and browser storage.
   */
  public setPolicy(
    policy: Partial<AttendanceNotificationPolicy>,
    orgId: string = '0c621892-e938-4707-9957-13534ea32c19'
  ): AttendanceNotificationPolicy {
    const current = this.getPolicy(orgId);
    const updated = { ...current, ...policy };
    this.policyCache.set(orgId, updated);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`joy_att_notif_policy_${orgId}`, JSON.stringify(updated));
      } catch {}
    }

    console.log(`[AttendanceNotificationService] Policy updated for org ${orgId}:`, updated);
    return updated;
  }

  /**
   * Return the authoritative Supabase client.
   * In backend/Node environments with SUPABASE_SERVICE_ROLE_KEY, uses service_role
   * to ensure RLS does not block supervisor hierarchy resolution or outbox logging.
   * In browser environments, uses the standard user session client.
   */
  public getDb(): any {
    if (typeof process !== 'undefined' && process.env) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || supabaseUrl;
      if (serviceRoleKey && url) {
        if (!this.adminClient) {
          this.adminClient = createClient(url, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
        }
        return this.adminClient;
      }
    }
    return supabase;
  }

  /**
   * Determine human-readable source label
   */
  public getSourceLabel(source: AttendanceChannelSource): string {
    switch (source) {
      case 'MOBILE':
        return 'Mobile App';
      case 'BIOMETRIC':
        return 'Biometric Terminal';
      case 'WEB':
        return 'Web Portal';
      case 'MANUAL':
        return 'Manual Entry';
      default:
        return source;
    }
  }

  /**
   * Format ISO punch time in Asia/Kolkata standard timezone (e.g. "09:15 AM")
   */
  public formatTimeIst(punchTimeIso: string): string {
    try {
      const d = new Date(punchTimeIso);
      return d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return punchTimeIso;
    }
  }

  private cachedProjectId: string = 'joy-peoplehr';

  /**
   * Retrieve Google OAuth2 Access Token for Firebase Cloud Messaging HTTP v1
   */
  private async getGoogleFcmAccessToken(): Promise<string | null> {
    // FCM HTTP v1 dispatch is handled securely by Supabase Edge Function `send-push`
    return null;
  }

  /**
   * Resolve an employee's effective Reporting Manager and TL / Supervisor from backend data
   */
  public async resolveAttendanceSupervisors(
    employeeId: string,
    organizationId: string
  ): Promise<{
    punchingEmployee: { id: string; code: string; name: string };
    supervisors: ResolvedSupervisor[];
    routingException?: string;
  }> {
    const defaultPunchingEmp = {
      id: employeeId,
      code: 'EMP',
      name: 'Employee',
    };

    if (!isSupabaseEnabled) {
      return { punchingEmployee: defaultPunchingEmp, supervisors: [] };
    }

    try {
      // 1. Fetch punching employee profile
      let query = this.getDb()
        .from('employees')
        .select(`
          id,
          employee_code,
          first_name,
          last_name,
          display_name,
          organization_id,
          reporting_manager_id,
          employment_status,
          user_id
        `);

      if (typeof query.or === 'function') {
        query = query.or(`id.eq.${employeeId},employee_code.eq.${employeeId}`);
      } else if (typeof query.eq === 'function') {
        query = query.eq('id', employeeId);
      }

      const { data: emp, error: empErr } = typeof query.maybeSingle === 'function'
        ? await query.maybeSingle()
        : { data: null, error: null };

      if (empErr || !emp) {
        return {
          punchingEmployee: defaultPunchingEmp,
          supervisors: [],
          routingException: `Employee not found in active directory: ${employeeId}`,
        };
      }

      const punchingEmployee = {
        id: emp.id,
        code: emp.employee_code || 'EMP',
        name: emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee',
      };

      const resolvedOrgId = emp.organization_id || organizationId;

      // Extract raw manager & TL IDs from database fields and JSONB employment
      const rawMgrId =
        emp.reporting_manager_id ||
        (emp.employment as any)?.reporting_manager_id ||
        (emp as any)?.manager_id;
      const rawTlId =
        emp.team_lead_id ||
        (emp.employment as any)?.team_lead_id ||
        (emp.employment as any)?.supervisor_id ||
        (emp as any)?.supervisor_id;

      if (!rawMgrId && !rawTlId) {
        return {
          punchingEmployee,
          supervisors: [],
          routingException: `No Reporting Manager or TL/Supervisor configured for ${punchingEmployee.name} (${punchingEmployee.code})`,
        };
      }

      const targetIds = [rawMgrId, rawTlId].filter((id): id is string => Boolean(id));
      const { data: supervisorRecords } = await this.getDb()
        .from('employees')
        .select(`
          id,
          employee_code,
          first_name,
          last_name,
          display_name,
          organization_id,
          work_email,
          phone,
          employment_status,
          user_id
        `)
        .in('id', targetIds);

      const supervisors: ResolvedSupervisor[] = [];
      const seenIds = new Set<string>();

      // Check if same person occupies both roles
      const isSamePerson = rawMgrId && rawTlId && rawMgrId === rawTlId;

      for (const sRec of supervisorRecords || []) {
        // Enforce strict tenant isolation: Supervisor MUST belong to same organization
        if (sRec.organization_id && resolvedOrgId && sRec.organization_id !== resolvedOrgId) {
          console.warn(`[AttendanceNotification] Tenant mismatch: Supervisor ${sRec.id} not in org ${resolvedOrgId}`);
          continue;
        }

        // Must be active employee
        if (sRec.employment_status === 'TERMINATED' || sRec.employment_status === 'SUSPENDED') {
          continue;
        }

        if (seenIds.has(sRec.id)) continue;
        seenIds.add(sRec.id);

        let role: SupervisorRole = 'REPORTING_MANAGER';
        if (isSamePerson) {
          role = 'REPORTING_MANAGER_AND_TL';
        } else if (sRec.id === rawTlId && sRec.id !== rawMgrId) {
          role = 'TL_SUPERVISOR';
        }

        // Resolve Auth User ID and Profile ID from user_profiles
        let resolvedAuthUserId = sRec.user_id;
        let resolvedProfileId = sRec.user_id;
        try {
          if (sRec.user_id) {
            let profQuery = this.getDb().from('user_profiles').select('id, auth_user_id');
            if (typeof profQuery.or === 'function') {
              profQuery = profQuery.or(`id.eq.${sRec.user_id},auth_user_id.eq.${sRec.user_id}`);
            } else if (typeof profQuery.eq === 'function') {
              profQuery = profQuery.eq('id', sRec.user_id);
            }
            const { data: prof } = typeof profQuery.maybeSingle === 'function'
              ? await profQuery.maybeSingle()
              : { data: null };
            if (prof?.auth_user_id) {
              resolvedAuthUserId = prof.auth_user_id;
            }
            if (prof?.id) {
              resolvedProfileId = prof.id;
            }
          }

          // Fallback: Query user_profiles by employee_id if user_id was null or not found
          if (!resolvedAuthUserId) {
            let profByEmpQuery = this.getDb().from('user_profiles').select('id, auth_user_id').eq('employee_id', sRec.id);
            const { data: profByEmp } = typeof profByEmpQuery.maybeSingle === 'function'
              ? await profByEmpQuery.maybeSingle()
              : { data: null };
            if (profByEmp?.auth_user_id) {
              resolvedAuthUserId = profByEmp.auth_user_id;
            }
            if (profByEmp?.id) {
              resolvedProfileId = profByEmp.id;
            }
          }
        } catch (_) {}

        // Query active device tokens for this supervisor
        const fcmTokens = await this.getDeviceTokensForSupervisor(sRec.id, resolvedAuthUserId || sRec.user_id);

        supervisors.push({
          employeeId: sRec.id,
          employeeCode: sRec.employee_code || '',
          name: sRec.display_name || `${sRec.first_name || ''} ${sRec.last_name || ''}`.trim() || 'Supervisor',
          role,
          profileId: resolvedProfileId || sRec.user_id,
          authUserId: resolvedAuthUserId || sRec.user_id,
          workEmail: sRec.work_email,
          phone: sRec.phone,
          fcmTokens,
        });
      }

      return {
        punchingEmployee,
        supervisors,
        routingException: supervisors.length === 0 ? 'Mapped supervisors are inactive or not in tenant' : undefined,
      };
    } catch (err) {
      console.error('[AttendanceNotificationService] resolveAttendanceSupervisors error:', err);
      return {
        punchingEmployee: defaultPunchingEmp,
        supervisors: [],
        routingException: `Hierarchy query failure: ${String(err)}`,
      };
    }
  }

  /**
   * Fetch registered FCM tokens for an employee from employee_device_tokens and push_subscriptions
   */
  public async getDeviceTokensForSupervisor(employeeId: string, authUserId?: string): Promise<string[]> {
    if (!isSupabaseEnabled) return [];

    const tokens: string[] = [];

    try {
      // 1. Check employee_device_tokens by employee_id
      const { data: dt1 } = await this.getDb()
        .from('employee_device_tokens')
        .select('fcm_token')
        .eq('employee_id', employeeId);

      if (dt1) {
        for (const r of dt1) {
          if (r.fcm_token && r.fcm_token.length > 20) {
            tokens.push(r.fcm_token);
          }
        }
      }

      // 2. Check employee_device_tokens by auth_user_id
      if (authUserId) {
        const { data: dt2 } = await this.getDb()
          .from('employee_device_tokens')
          .select('fcm_token')
          .eq('auth_user_id', authUserId);

        if (dt2) {
          for (const r of dt2) {
            if (r.fcm_token && r.fcm_token.length > 20) {
              tokens.push(r.fcm_token);
            }
          }
        }

        // 3. Fallback to push_subscriptions
        const { data: ps } = await this.getDb()
          .from('push_subscriptions')
          .select('endpoint')
          .eq('user_id', authUserId);

        if (ps) {
          for (const r of ps) {
            if (r.endpoint && !r.endpoint.startsWith('http') && r.endpoint.length > 20) {
              tokens.push(r.endpoint);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[AttendanceNotificationService] Token query error:', err);
    }

    return [...new Set(tokens)];
  }

  /**
   * Invalidate or delete stale FCM tokens returned as NotRegistered
   */
  private async cleanupStaleToken(token: string): Promise<void> {
    if (!isSupabaseEnabled || !token) return;
    try {
      await this.getDb().from('employee_device_tokens').delete().eq('fcm_token', token);
      console.log(`[AttendanceNotification] Cleaned up stale token: ${token.substring(0, 15)}...`);
    } catch (_) {}
  }

  /**
   * Send push notification via Supabase Edge Function `send-push` with direct FCM v1 fallback
   */
  public async dispatchPushToSupervisor(
    supervisor: ResolvedSupervisor,
    title: string,
    body: string,
    extraData: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; errorMessage?: string }> {
    let edgeError: string | undefined;

    // 1. Try Supabase Edge Function first
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await this.getDb().functions.invoke('send-push', {
          body: {
            employee_id: supervisor.employeeId,
            auth_user_id: supervisor.authUserId,
            title,
            body,
            route: 'attendance',
            data: extraData,
          },
        });

        if (!error && data && data.success) {
          const sentResult = data.results?.find((r: any) => r.success);

          // Clean up any stale tokens returned by Edge Function
          if (data.results && Array.isArray(data.results)) {
            for (const r of data.results) {
              if (!r.success && (r.error === 'NotRegistered' || r.error?.includes('UNREGISTERED'))) {
                const tokenStr = r.target?.replace('token:', '');
                if (tokenStr) this.cleanupStaleToken(tokenStr);
              }
            }
          }

          return {
            success: true,
            messageId: sentResult?.messageId || `edge-msg-${Date.now()}`,
          };
        } else {
          edgeError = error?.message || (data?.results ? JSON.stringify(data.results) : data?.error);
        }
      } catch (e: any) {
        edgeError = e?.message || String(e);
        console.warn('[AttendanceNotification] Edge function notice, evaluating direct FCM:', e);
      }
    }

    // 2. Direct FCM v1 Dispatch Fallback
    const accessToken = await this.getGoogleFcmAccessToken();
    if (accessToken && supervisor.fcmTokens.length > 0) {
      const projectId = this.cachedProjectId || 'joy-peoplehr';
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

      let lastMessageId: string | undefined;
      let lastError: string | undefined;
      let delivered = false;

      for (const token of supervisor.fcmTokens) {
        try {
          const payload = {
            message: {
              token,
              notification: {
                title,
                body,
              },
              android: {
                priority: 'HIGH',
                notification: {
                  channel_id: 'joy_peoplehr_high_importance',
                  sound: 'default',
                  default_vibrate_timings: true,
                  notification_priority: 'PRIORITY_MAX',
                  icon: 'ic_launcher',
                  color: '#1A56DB',
                  visibility: 'PUBLIC',
                },
              },
              data: {
                title,
                body,
                message: body,
                route: 'attendance',
                ...extraData,
              },
            },
          };

          const resp = await fetch(fcmUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const result = await resp.json();
          if (resp.ok) {
            delivered = true;
            lastMessageId = result.name;
          } else {
            const errCode = result.error?.details?.[0]?.errorCode || result.error?.message;
            if (errCode === 'UNREGISTERED' || result.error?.message?.includes('NotRegistered')) {
              await this.cleanupStaleToken(token);
            }
            lastError = result.error?.message || JSON.stringify(result);
          }
        } catch (fcmErr) {
          lastError = String(fcmErr);
        }
      }

      if (delivered) {
        return { success: true, messageId: lastMessageId };
      }
      return { success: false, errorMessage: lastError || 'FCM delivery failed for all tokens' };
    }

    // 3. If no device tokens registered
    if (supervisor.fcmTokens.length === 0) {
      return {
        success: false,
        errorMessage: 'NO_DEVICE_TOKENS: Supervisor has not registered a mobile app device yet',
      };
    }

    return {
      success: false,
      errorMessage: edgeError || 'Push delivery failed: No provider available',
    };
  }

  /**
   * Insert durable In-App notification into canonical `notification_events`
   */
  public async persistInAppNotification(
    organizationId: string,
    recipientId: string,
    title: string,
    message: string,
    actionUrl: string
  ): Promise<string | null> {
    if (!isSupabaseEnabled) return null;

    try {
      const notifId = generateUuid();
      const nowIso = new Date().toISOString();

      const { error } = await this.getDb()
        .from('notification_events')
        .insert([
          {
            id: notifId,
            organization_id: organizationId,
            recipient_user_id: recipientId,
            channel: 'IN_APP',
            title,
            message,
            action_url: actionUrl,
            is_read: false,
            is_sent: true,
            sent_at: nowIso,
            created_at: nowIso,
          },
        ]);

      if (!error) {
        return notifId;
      }
      console.warn('[AttendanceNotification] In-app persistence notice:', error);
    } catch (err) {
      console.warn('[AttendanceNotification] In-app persistence notice:', err);
    }
    return null;
  }

  /**
   * Log communication event to `communication_dispatch_logs`
   */
  private async logCommunicationDispatch(
    organizationId: string,
    supervisorId: string,
    supervisorPhone: string | undefined,
    eventType: AttendanceNotificationEventType,
    title: string,
    body: string,
    status: 'DELIVERED' | 'FAILED' | 'PENDING',
    providerMessageId?: string,
    errorMessage?: string
  ): Promise<void> {
    if (!isSupabaseEnabled) return;

    try {
      await this.getDb().from('communication_dispatch_logs').insert([
        {
          organization_id: organizationId,
          employee_id: supervisorId,
          recipient_phone: supervisorPhone || 'APP_PUSH',
          channel: 'PUSH',
          provider: 'FCM',
          template_key: eventType,
          message_content: JSON.stringify({ title, body, route: 'attendance' }),
          dynamic_payload: { eventType, route: 'attendance' },
          provider_message_id: providerMessageId || null,
          status,
          error_message: errorMessage || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (_) {}
  }

  /**
   * Main Public Entrypoint: Centralized Handler for Accepted Attendance Events
   * Invoked asynchronously by attendanceIngestionService when check-in or check-out is accepted.
   */
  public async handleAttendanceEventAccepted(
    payload: AttendanceNotificationEventPayload
  ): Promise<AttendanceNotificationDispatchLog> {
    const orgId = payload.organizationId || '0c621892-e938-4707-9957-13534ea32c19';
    const eventId = payload.punchId || `att-${Date.now()}-${payload.employeeId}`;
    const idempotencyKey =
      payload.idempotencyKey || `att-notif:${eventId}:${payload.eventType}:${payload.employeeId}`;

    // 1. Idempotency Check
    if (this.idempotencyRegistry.has(idempotencyKey)) {
      console.log(`[AttendanceNotification] Idempotent replay detected for ${idempotencyKey}`);
      return this.idempotencyRegistry.get(idempotencyKey)!;
    }

    const policy = this.getPolicy(orgId);

    // Source filtering check
    if (payload.source === 'BIOMETRIC' && !policy.enableBiometricPunches) {
      console.log(`[AttendanceNotification] Biometric punches skipped per policy`);
      return {
        id: `disp-${Date.now()}`,
        eventId,
        eventType: payload.eventType,
        punchTime: payload.punchTime,
        source: payload.source,
        punchingEmployee: { id: payload.employeeId, code: payload.employeeCode || '', name: payload.employeeName || '' },
        organizationId: orgId,
        resolvedRecipients: [],
        deliveries: [],
        missingHierarchy: false,
        routingException: 'Biometric push notifications disabled by HR policy',
        createdAt: new Date().toISOString(),
      };
    }
    if (payload.source === 'MOBILE' && !policy.enableMobileGpsPunches) {
      console.log(`[AttendanceNotification] Mobile GPS punches skipped per policy`);
      return {
        id: `disp-${Date.now()}`,
        eventId,
        eventType: payload.eventType,
        punchTime: payload.punchTime,
        source: payload.source,
        punchingEmployee: { id: payload.employeeId, code: payload.employeeCode || '', name: payload.employeeName || '' },
        organizationId: orgId,
        resolvedRecipients: [],
        deliveries: [],
        missingHierarchy: false,
        routingException: 'Mobile GPS push notifications disabled by HR policy',
        createdAt: new Date().toISOString(),
      };
    }

    const sourceLabel = this.getSourceLabel(payload.source);
    const timeFormatted = this.formatTimeIst(payload.punchTime);

    // 2. Resolve Effective Reporting Hierarchy
    const { punchingEmployee, supervisors, routingException } =
      await this.resolveAttendanceSupervisors(payload.employeeId, orgId);

    // Merge names/codes if available from payload
    if (payload.employeeName) punchingEmployee.name = payload.employeeName;
    if (payload.employeeCode) punchingEmployee.code = payload.employeeCode;

    // 3. Resolve Shift & Punctuality Context (On-Time vs Late)
    let isLate = payload.isLate;
    let lateMinutes = payload.lateMinutes || 0;
    const graceMinutes = payload.graceMinutes ?? policy.graceMinutes ?? 30; // HR policy grace period
    const shiftStart = payload.shiftStart || '09:00';

    if (payload.punchType === 'CHECK_IN' && isLate === undefined) {
      try {
        const punchDt = new Date(payload.punchTime);
        // Calculate IST time (UTC + 5:30)
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(punchDt.getTime() + istOffsetMs);
        const punchHours = istDate.getUTCHours();
        const punchMins = istDate.getUTCMinutes();
        const totalPunchMins = punchHours * 60 + punchMins;

        const [sHour, sMin] = shiftStart.split(':').map((v) => parseInt(v, 10));
        const totalShiftStartMins = (sHour || 9) * 60 + (sMin || 0);

        if (totalPunchMins > totalShiftStartMins + graceMinutes) {
          isLate = true;
          lateMinutes = totalPunchMins - totalShiftStartMins;
        } else {
          isLate = false;
          lateMinutes = 0;
        }
      } catch {
        isLate = false;
        lateMinutes = 0;
      }
    }

    // 4. Construct Notification Content for Mobile Tray & In-App
    let title: string;
    let body: string;

    if (payload.punchType === 'CHECK_IN') {
      if (isLate) {
        title = `🔴 Late Check-In: ${punchingEmployee.name}`;
        body = `${punchingEmployee.name} (${punchingEmployee.code}) arrived LATE at ${timeFormatted} (${lateMinutes} mins late) via ${sourceLabel}.`;
      } else {
        title = `🟢 On-Time Check-In: ${punchingEmployee.name}`;
        body = `${punchingEmployee.name} (${punchingEmployee.code}) checked in ON-TIME at ${timeFormatted} via ${sourceLabel}.`;
      }
    } else {
      title = `👋 Employee Check-Out: ${punchingEmployee.name}`;
      body = `${punchingEmployee.name} (${punchingEmployee.code}) checked out at ${timeFormatted} via ${sourceLabel}.`;
    }

    const actionUrl = `/attendance?emp=${punchingEmployee.id}&date=${payload.punchTime.split('T')[0]}`;
    const extraData: Record<string, string> = {
      employee_id: punchingEmployee.id,
      employee_code: punchingEmployee.code,
      employee_name: punchingEmployee.name,
      event_type: payload.eventType,
      punch_type: payload.punchType,
      punch_time: payload.punchTime,
      source: payload.source,
      punch_id: payload.punchId || '',
      is_late: isLate ? 'true' : 'false',
      late_minutes: String(lateMinutes),
      grace_minutes: String(graceMinutes),
      shift_start: shiftStart,
      timestamp: String(Date.now()),
      tag: policy.enableNotificationGrouping ? 'joy_attendance_manager_alert' : `punch_${eventId}`,
      group: 'joy_attendance_group',
    };

    const dispatchLog: AttendanceNotificationDispatchLog = {
      id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventId,
      eventType: payload.eventType,
      punchTime: payload.punchTime,
      source: payload.source,
      punchingEmployee,
      organizationId: orgId,
      resolvedRecipients: supervisors.map((s) => ({
        employeeId: s.employeeId,
        employeeCode: s.employeeCode,
        name: s.name,
        role: s.role,
        fcmTokensCount: s.fcmTokens.length,
      })),
      deliveries: [],
      missingHierarchy: supervisors.length === 0,
      routingException,
      createdAt: new Date().toISOString(),
    };

    // If no supervisors configured, do NOT broadcast! Record diagnostic log for HR.
    if (supervisors.length === 0) {
      console.warn(`[AttendanceNotification] Routing Notice: ${routingException}`);
      this.recordDiagnosticLog(idempotencyKey, dispatchLog);
      return dispatchLog;
    }
    // 4. Dispatch to Each Authorized Supervisor Independently
    for (const supervisor of supervisors) {
      // 4A. In-App Notification (Durable Persistence)
      let inAppId: string | null = null;
      try {
        const isSimulation = payload.idempotencyKey?.startsWith('sim-');
        if (!isSimulation) {
          const targetUserId = supervisor.profileId || supervisor.authUserId || supervisor.employeeId;
          inAppId = await this.persistInAppNotification(orgId, targetUserId, title, body, actionUrl);
        } else {
          // Simulation tests do not pollute the live employee database
          inAppId = `sim-inapp-${Date.now()}`;
        }

        dispatchLog.deliveries.push({
          recipientId: supervisor.employeeId,
          recipientName: supervisor.name,
          role: supervisor.role,
          channel: 'IN_APP',
          status: inAppId ? 'SENT' : 'FAILED',
          inAppNotificationId: inAppId || undefined,
          timestamp: new Date().toISOString(),
        });
      } catch (inAppErr) {
        console.warn(`[AttendanceNotification] In-app failed for ${supervisor.name}:`, inAppErr);
      }

      // 4B. Remote Push Notification (Guarded by HR Anti-Fatigue Policy for 50-100 teams)
      let shouldSendPush = true;
      let policySkipReason: string | null = null;

      if (payload.punchType === 'CHECK_IN') {
        if (!isLate) {
          if (policy.onTimeDeliveryMode === 'SILENT') {
            shouldSendPush = false;
            policySkipReason = 'On-time punch kept silent in manager inbox per HR anti-fatigue policy (0 phone vibrations)';
          } else if (policy.onTimeDeliveryMode === 'DISABLED') {
            shouldSendPush = false;
            policySkipReason = 'On-time punch push disabled per HR policy';
          }
        } else {
          if (policy.lateDeliveryMode === 'SILENT') {
            shouldSendPush = false;
            policySkipReason = 'Late check-in kept in-app silent per HR policy';
          } else if (policy.lateDeliveryMode === 'DISABLED') {
            shouldSendPush = false;
            policySkipReason = 'Late check-in alerts disabled per HR policy';
          }
        }
      } else {
        if (policy.earlyCheckoutMode === 'SILENT') {
          shouldSendPush = false;
          policySkipReason = 'Check-out alert kept silent per HR policy';
        } else if (policy.earlyCheckoutMode === 'DISABLED') {
          shouldSendPush = false;
          policySkipReason = 'Check-out alerts disabled per HR policy';
        }
      }

      if (!shouldSendPush) {
        dispatchLog.deliveries.push({
          recipientId: supervisor.employeeId,
          recipientName: supervisor.name,
          role: supervisor.role,
          channel: 'PUSH',
          status: 'SKIPPED_POLICY_SILENT' as any,
          errorMessage: policySkipReason || 'Silent delivery per HR policy',
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      try {
        if (supervisor.fcmTokens.length === 0) {
          dispatchLog.deliveries.push({
            recipientId: supervisor.employeeId,
            recipientName: supervisor.name,
            role: supervisor.role,
            channel: 'PUSH',
            status: 'SKIPPED_NO_DEVICE',
            errorMessage: 'Supervisor has no registered mobile app device tokens',
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        const pushResult = await this.dispatchPushToSupervisor(supervisor, title, body, extraData);

        dispatchLog.deliveries.push({
          recipientId: supervisor.employeeId,
          recipientName: supervisor.name,
          role: supervisor.role,
          channel: 'PUSH',
          status: pushResult.success ? 'SENT' : 'FAILED',
          providerMessageId: pushResult.messageId,
          errorMessage: pushResult.errorMessage,
          timestamp: new Date().toISOString(),
        });

        // Audit log in communication_dispatch_logs
        await this.logCommunicationDispatch(
          orgId,
          supervisor.employeeId,
          supervisor.phone,
          payload.eventType,
          title,
          body,
          pushResult.success ? 'DELIVERED' : 'FAILED',
          pushResult.messageId,
          pushResult.errorMessage
        );
      } catch (pushErr) {
        console.error(`[AttendanceNotification] Push failed for ${supervisor.name}:`, pushErr);
        dispatchLog.deliveries.push({
          recipientId: supervisor.employeeId,
          recipientName: supervisor.name,
          role: supervisor.role,
          channel: 'PUSH',
          status: 'FAILED',
          errorMessage: String(pushErr),
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.recordDiagnosticLog(idempotencyKey, dispatchLog);
    return dispatchLog;
  }

  private recordDiagnosticLog(idempotencyKey: string, log: AttendanceNotificationDispatchLog): void {
    this.diagnosticLogs.unshift(log);
    if (this.diagnosticLogs.length > 200) {
      this.diagnosticLogs.pop();
    }
    this.idempotencyRegistry.set(idempotencyKey, log);
  }

  /**
   * Diagnostic Query Method for Admin Dashboard View
   */
  public getDiagnosticLogs(params?: {
    employeeCode?: string;
    eventId?: string;
    limit?: number;
  }): AttendanceNotificationDispatchLog[] {
    let logs = [...this.diagnosticLogs];

    if (params?.employeeCode) {
      const code = params.employeeCode.trim().toLowerCase();
      logs = logs.filter(
        (l) =>
          l.punchingEmployee.code.toLowerCase().includes(code) ||
          l.resolvedRecipients.some((r) => r.employeeCode.toLowerCase().includes(code))
      );
    }

    if (params?.eventId) {
      logs = logs.filter((l) => l.eventId.includes(params.eventId!));
    }

    return logs.slice(0, params?.limit || 50);
  }

  /**
   * Clear state (for isolated unit tests)
   */
  public clearState(): void {
    this.diagnosticLogs = [];
    this.idempotencyRegistry.clear();
  }
}

export const attendanceNotificationService = new AttendanceNotificationService();
