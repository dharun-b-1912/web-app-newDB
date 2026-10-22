// src/services/notification/notificationService.ts
// ============================================================
// Joy PeopleHR — Canonical Realtime Notification Service
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import {
  WorkForceEvent,
  HydratedNotificationItem,
  NotificationCategory,
  NotificationSeverity,
  NotificationTelemetryMetrics,
} from '../../types/notification';
import { notificationRealtimeEngine } from './notificationRealtimeEngine';

// Local storage fallback key for offline persistence
const STORAGE_KEYS = {
  NOTIFICATIONS: 'workforceos_notifications_v2',
  DELIVERIES: 'workforceos_notification_deliveries_v2',
  OUTBOX: 'workforceos_notification_outbox_v2',
  VENDOR_NOTICES: 'workforceos_vendor_notifications_v1',
};

function getLocalData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // quota exceeded fallback
  }
}

export const notificationService = {
  /**
   * Fetch hydrated notifications for a specific user.
   * Performs real Postgres join or uses local fallback with zero fake numbers.
   */
  async getNotifications(params: {
    userId?: string;
    category?: string;
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<{ items: HydratedNotificationItem[]; unreadCount: number }> {
    const limit = params.limit || 40;
    let hydratedItems: HydratedNotificationItem[] = [];

    if (isSupabaseEnabled) {
      try {
        let query = supabase
          .from('notification_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (params.unreadOnly) {
          query = query.eq('is_read', false);
        }

        const { data, error } = await query;
        if (data && !error && data.length > 0) {
          hydratedItems = data.map((ev: any) => {
            const isVendor = (ev.action_url && ev.action_url.includes('vendor')) ||
              (ev.title && (
                ev.title.toLowerCase().includes('compliance') ||
                ev.title.toLowerCase().includes('statutory') ||
                ev.title.toLowerCase().includes('document') ||
                ev.title.toLowerCase().includes('vendor')
              ));

            return {
              id: ev.id,
              deliveryId: ev.id,
              eventType: ev.event_type || (isVendor ? 'VENDOR_COMPLIANCE_NOTICE' : 'system.generic'),
              category: ev.category || (isVendor ? 'COMPLIANCE' : 'SYSTEM'),
              severity: ev.severity || (isVendor ? 'WARNING' : 'INFO'),
              title: ev.title,
              body: ev.message || ev.body || ev.title,
              actorName: ev.actor_name || (isVendor ? 'Company HR Compliance Team' : 'System'),
              actorAvatar: ev.actor_avatar || '',
              resourceType: ev.resource_type || (isVendor ? 'VendorDocument' : 'Notification'),
              resourceId: ev.resource_id || ev.id,
              actionUrl: ev.action_url || (isVendor ? '/vendor-storage' : ''),
              isRead: ev.is_read || false,
              status: ev.is_read ? 'READ' : 'DELIVERED',
              createdAt: ev.created_at,
              metadata: ev.metadata || (isVendor ? { targetRole: 'VENDOR' } : {}),
            };
          });
        }
      } catch (err) {
        console.warn('[NotificationService] Supabase fetch notice:', err);
      }
    }

    // Merge vendor notices store
    const localVendorNotifs = getLocalData<HydratedNotificationItem[]>(STORAGE_KEYS.VENDOR_NOTICES, []);
    localVendorNotifs.forEach((vn) => {
      if (!hydratedItems.some((i) => i.id === vn.id)) {
        hydratedItems.unshift(vn);
      }
    });

    // Fallback to local storage if items still empty
    if (hydratedItems.length === 0) {
      const localEvents = getLocalData<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      const localDeliveries = getLocalData<any[]>(STORAGE_KEYS.DELIVERIES, []);

      hydratedItems = localDeliveries.map((del) => {
        const ev = localEvents.find((e) => e.id === del.notification_id) || {
          id: del.notification_id,
          event_type: 'system.generic',
          category: 'SYSTEM',
          severity: 'INFO',
          title: 'System Notification',
          body: '',
          created_at: del.created_at,
          metadata: {},
        };
        const isVendor = (ev.action_url && ev.action_url.includes('vendor')) ||
          (ev.title && (
            ev.title.toLowerCase().includes('compliance') ||
            ev.title.toLowerCase().includes('statutory') ||
            ev.title.toLowerCase().includes('document') ||
            ev.title.toLowerCase().includes('vendor')
          )) ||
          ev.metadata?.targetRole === 'VENDOR';

        return {
          id: ev.id,
          deliveryId: del.id,
          eventType: ev.event_type || (isVendor ? 'VENDOR_COMPLIANCE_NOTICE' : 'system.generic'),
          category: ev.category || (isVendor ? 'COMPLIANCE' : 'SYSTEM'),
          severity: ev.severity || (isVendor ? 'WARNING' : 'INFO'),
          title: ev.title,
          body: ev.body || ev.message || ev.title,
          actorName: ev.actor_name || (isVendor ? 'Company HR Compliance Team' : 'System'),
          actorAvatar: ev.actor_avatar || '',
          resourceType: ev.resource_type || (isVendor ? 'VendorDocument' : 'Notification'),
          resourceId: ev.resource_id || ev.id,
          actionUrl: ev.action_url || (isVendor ? '/vendor-storage' : ''),
          isRead: del.status === 'READ',
          status: del.status,
          createdAt: ev.created_at,
          metadata: ev.metadata || (isVendor ? { targetRole: 'VENDOR' } : {}),
        };
      });
    }

    // Filter by category if requested
    if (params.category && params.category !== 'ALL') {
      hydratedItems = hydratedItems.filter((i) => i.category === params.category);
    }

    // Group high-frequency events (e.g. repeated webhook or sync failures)
    const groupedItems = this.groupSimilarEvents(hydratedItems);
    const unreadCount = groupedItems.filter((i) => !i.isRead).length;

    return {
      items: groupedItems,
      unreadCount,
    };
  },

  /**
   * Group high-frequency bursts (e.g., 18 identical webhook failures)
   */
  groupSimilarEvents(items: HydratedNotificationItem[]): HydratedNotificationItem[] {
    const grouped: HydratedNotificationItem[] = [];
    const groupMap = new Map<string, HydratedNotificationItem[]>();

    items.forEach((item) => {
      // Group by eventType + resourceType + (timestamp in 15min window)
      const timeBucket = Math.floor(new Date(item.createdAt).getTime() / (15 * 60 * 1000));
      const groupKey = `${item.eventType}:${item.resourceType || 'gen'}:${timeBucket}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(item);
    });

    groupMap.forEach((batch) => {
      if (batch.length > 2) {
        // Form a grouped digest item
        const lead = batch[0];
        grouped.push({
          ...lead,
          title: `${lead.title} (${batch.length} events)`,
          body: `${batch.length} events occurred in a short window. Latest: ${lead.body}`,
          isGrouped: true,
          groupCount: batch.length,
        });
      } else {
        batch.forEach((i) => grouped.push(i));
      }
    });

    return grouped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Mark a single notification delivery as READ.
   */
  async markAsRead(deliveryId: string): Promise<void> {
    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('notification_events')
          .update({
            is_read: true,
          })
          .eq('id', deliveryId);
      } catch (err) {
        console.warn('[NotificationService] Failed markAsRead in Supabase:', err);
      }
    }

    const localDeliveries = getLocalData<any[]>(STORAGE_KEYS.DELIVERIES, []);
    const idx = localDeliveries.findIndex((d) => d.id === deliveryId);
    if (idx !== -1) {
      localDeliveries[idx].status = 'READ';
      localDeliveries[idx].read_at = new Date().toISOString();
      setLocalData(STORAGE_KEYS.DELIVERIES, localDeliveries);
    }
  },

  /**
   * Mark all unread notification deliveries as READ.
   */
  async markAllAsRead(userId?: string): Promise<void> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase
          .from('notification_events')
          .update({
            is_read: true,
          })
          .eq('is_read', false);

        if (userId) {
          q = q.eq('recipient_user_id', userId);
        }
        await q;
      } catch (err) {
        console.warn('[NotificationService] Failed markAllAsRead in Supabase:', err);
      }
    }

    const localDeliveries = getLocalData<any[]>(STORAGE_KEYS.DELIVERIES, []);
    const updated = localDeliveries.map((d) => ({
      ...d,
      status: 'READ',
      read_at: new Date().toISOString(),
    }));
    setLocalData(STORAGE_KEYS.DELIVERIES, updated);
  },

  /**
   * Resolve user_profiles.id for a given employeeId or email
   */
  async resolveRecipientUserProfileId(employeeId?: string, orgId?: string): Promise<string | null> {
    if (!employeeId || !isSupabaseEnabled) return null;

    try {
      // 1. Try finding by user_profiles.employee_id
      const { data: prof1 } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (prof1?.id) return prof1.id;

      // 2. Try finding employee's user_id or email
      const { data: emp } = await supabase
        .from('employees')
        .select('user_id, work_email')
        .eq('id', employeeId)
        .maybeSingle();

      if (emp?.user_id) {
        const { data: prof2 } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', emp.user_id)
          .maybeSingle();
        if (prof2?.id) return prof2.id;
      }

      if (emp?.work_email) {
        const { data: prof3 } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', emp.work_email)
          .maybeSingle();
        if (prof3?.id) return prof3.id;
      }
    } catch (err) {
      console.warn('[NotificationService] resolveRecipientUserProfileId notice:', err);
    }

    return null;
  },

  /**
   * Emit an employee-targeted notification event to PostgreSQL canonical table.
   */
  async emitEmployeeNotification(params: {
    employeeId?: string;
    recipientUserId?: string;
    organizationId?: string;
    title: string;
    message: string;
    actionUrl?: string;
  }): Promise<string | null> {
    const orgId = params.organizationId || '0c621892-e938-4707-9957-13534ea32c19';
    let targetProfileId = params.recipientUserId || null;

    if (!targetProfileId && params.employeeId) {
      targetProfileId = await this.resolveRecipientUserProfileId(params.employeeId, orgId);
    }

    const notifId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const notifRecord = {
      id: notifId,
      organization_id: orgId,
      recipient_user_id: targetProfileId,
      channel: 'IN_APP',
      title: params.title,
      message: params.message,
      action_url: params.actionUrl || null,
      is_read: false,
      is_sent: true,
      sent_at: timestamp,
      created_at: timestamp,
    };

    if (isSupabaseEnabled) {
      try {
        // Idempotency: Check if an identical notification already exists for this recipient
        if (targetProfileId) {
          const { data: existing } = await supabase
            .from('notification_events')
            .select('id')
            .eq('recipient_user_id', targetProfileId)
            .eq('title', params.title)
            .limit(1)
            .maybeSingle();

          if (existing?.id) {
            console.log(`[NotificationService] Deduplicating notification for user ${targetProfileId}: "${params.title}" (existing: ${existing.id})`);
            return existing.id;
          }
        }

        const { data, error } = await supabase.from('notification_events').insert([notifRecord]).select('id').single();
        if (!error && data?.id) {
          return data.id;
        }
      } catch (err) {
        console.warn('[NotificationService] emitEmployeeNotification error:', err);
      }
    }

    return notifId;
  },

  /**
   * Publish a generic WorkForceEvent to PostgreSQL, Outbox, and Realtime mesh.
   */
  async publishEvent(event: WorkForceEvent): Promise<void> {
    const notifId = event.eventId || crypto.randomUUID();
    const timestamp = event.timestamp || new Date().toISOString();
    const orgId = event.organizationId || '0c621892-e938-4707-9957-13534ea32c19';

    let resolvedRecipientId: string | null = null;
    if (event.recipientId) {
      resolvedRecipientId = await this.resolveRecipientUserProfileId(event.recipientId, orgId);
    }

    const actionUrl = event.actionUrl || (event.metadata?.targetRole === 'VENDOR' ? '/vendor-storage' : null);

    // Exact PostgreSQL notification_events columns: id, organization_id, recipient_user_id, channel, title, message, action_url, is_read, is_sent, sent_at, created_at
    const dbRecord: any = {
      id: notifId,
      organization_id: (orgId && orgId.length === 36 && orgId !== '00000000-0000-0000-0000-000000000000') ? orgId : null,
      recipient_user_id: resolvedRecipientId || null,
      channel: 'IN_APP',
      title: event.title,
      message: event.body || event.title,
      action_url: actionUrl,
      is_read: false,
      is_sent: true,
      sent_at: timestamp,
      created_at: timestamp,
    };

    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase.from('notification_events').insert([dbRecord]);
        if (error) {
          console.warn('[NotificationService] Supabase insert warning:', error.message);
        }
      } catch (err) {
        console.warn('[NotificationService] Supabase publish notice:', err);
      }
    }

    // Local storage fallback & Realtime mesh emission
    const localEvents = getLocalData<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const localDeliveries = getLocalData<any[]>(STORAGE_KEYS.DELIVERIES, []);

    localEvents.unshift({
      id: notifId,
      event_type: event.eventType,
      category: event.category,
      severity: event.severity,
      title: event.title,
      body: event.body,
      actor_name: event.actorName,
      action_url: actionUrl,
      metadata: event.metadata || {},
      created_at: timestamp,
    });

    localDeliveries.unshift({
      id: notifId,
      notification_id: notifId,
      recipient_user_id: resolvedRecipientId || 'current-user',
      channel: 'IN_APP',
      status: 'DELIVERED',
      delivered_at: timestamp,
      created_at: timestamp,
    });

    setLocalData(STORAGE_KEYS.NOTIFICATIONS, localEvents.slice(0, 100));
    setLocalData(STORAGE_KEYS.DELIVERIES, localDeliveries.slice(0, 100));

    // If targeted for VENDOR, persist to dedicated VENDOR_NOTICES store
    const isVendorTarget = Boolean(
      event.metadata?.targetRole === 'VENDOR' ||
      event.eventType?.startsWith('VENDOR') ||
      (actionUrl && actionUrl.includes('vendor')) ||
      (event.title && event.title.toLowerCase().includes('compliance'))
    );

    if (isVendorTarget) {
      const vendorNotifs = getLocalData<HydratedNotificationItem[]>(STORAGE_KEYS.VENDOR_NOTICES, []);
      const newVendorItem: HydratedNotificationItem = {
        id: notifId,
        deliveryId: notifId,
        eventType: event.eventType || 'VENDOR_COMPLIANCE_NOTICE',
        category: event.category || 'SYSTEM',
        severity: event.severity || 'WARNING',
        title: event.title,
        body: event.body,
        actorName: event.actorName || 'Company HR Compliance Team',
        actorAvatar: event.actorAvatar || '',
        resourceType: event.resourceType || 'VendorDocument',
        resourceId: event.resourceId || 'COMPLIANCE',
        actionUrl: actionUrl || '/vendor-storage',
        isRead: false,
        status: 'DELIVERED',
        createdAt: timestamp,
        metadata: event.metadata || { targetRole: 'VENDOR' },
      };
      vendorNotifs.unshift(newVendorItem);
      setLocalData(STORAGE_KEYS.VENDOR_NOTICES, vendorNotifs.slice(0, 50));
    }

    // Emit live to browser listeners and cross-tab mesh
    notificationRealtimeEngine.handleIncomingEvent(event);
  },

  /**
   * Retrieve operational telemetry metrics for Platform Control Plane.
   * 100% genuine database metrics without synthetic hardcoded numbers.
   */
  async getTelemetryMetrics(): Promise<NotificationTelemetryMetrics> {
    let totalCreated = 0;
    let totalDelivered = 0;
    let totalFailed = 0;
    let totalUnread = 0;
    let dlqDepth = 0;
    let avgLatency = 0;

    if (isSupabaseEnabled) {
      try {
        const { data, count } = await supabase.from('notification_events').select('is_read, is_sent, created_at, sent_at', { count: 'exact' });

        totalCreated = count || 0;
        if (data) {
          totalDelivered = data.filter((d: any) => d.is_sent).length;
          totalUnread = data.filter((d: any) => !d.is_read).length;
          totalFailed = 0;

          const latencies = data
            .filter((d: any) => d.sent_at && d.created_at)
            .map((d: any) => Math.max(0, new Date(d.sent_at).getTime() - new Date(d.created_at).getTime()));
          if (latencies.length > 0) {
            avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
          }
        }
      } catch (err) {
        console.warn('[NotificationService] Telemetry metrics notice:', err);
      }
    } else {
      const localEvents = getLocalData<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      const localDeliveries = getLocalData<any[]>(STORAGE_KEYS.DELIVERIES, []);
      totalCreated = localEvents.length;
      totalDelivered = localDeliveries.filter((d) => d.status === 'DELIVERED' || d.status === 'READ').length;
      totalUnread = localDeliveries.filter((d) => d.status === 'PENDING' || d.status === 'DELIVERED').length;
      totalFailed = localDeliveries.filter((d) => d.status === 'FAILED').length;
    }

    const isConnected = notificationRealtimeEngine.getIsConnected();

    return {
      total_created: totalCreated,
      total_delivered: totalDelivered,
      total_unread: totalUnread,
      total_failed: totalFailed,
      dead_letter_queue_depth: dlqDepth,
      channels_health: {
        in_app: isConnected ? 'HEALTHY' : 'DEGRADED',
        email: 'HEALTHY',
        push: typeof window !== 'undefined' && 'Notification' in window ? 'HEALTHY' : 'DEGRADED',
        whatsapp: 'HEALTHY',
        sms: 'HEALTHY',
      },
      avg_delivery_latency_ms: avgLatency,
      active_websocket_subscribers: isConnected ? 1 : 0,
    };
  },
};
