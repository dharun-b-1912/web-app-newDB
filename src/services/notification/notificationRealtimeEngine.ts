// src/services/notification/notificationRealtimeEngine.ts
// ============================================================
// Joy PeopleHR — Multi-Tenant Notification Realtime Engine
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { realtimeChannelManager } from '../realtime/realtimeChannelManager';
import { WorkForceEvent, HydratedNotificationItem } from '../../types/notification';

export type NotificationEventListener = (event: WorkForceEvent) => void;

class NotificationRealtimeEngine {
  private listeners = new Set<NotificationEventListener>();
  private unsubTable: (() => void) | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnected = false;
  private processedEventIds = new Set<string>();
  private lastReceivedTimestamp: string = new Date().toISOString();
  private currentParams: { userId?: string; organizationId?: string } = {};

  constructor() {
    this.initLocalMesh();
  }

  private initLocalMesh() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('workforceos-unified-notifications');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.eventId) {
            this.handleIncomingEvent(event.data);
          }
        };
      } catch (err) {
        console.warn('[NotificationRealtimeEngine] BroadcastChannel fallback', err);
      }
    }
  }

  /**
   * Initialize authorized Supabase Realtime subscriptions based on user & platform scope.
   */
  public subscribeUserChannels(params: {
    userId: string;
    organizationId?: string;
    isSuperAdmin?: boolean;
    isPlatformStaff?: boolean;
  }) {
    if (!isSupabaseEnabled) {
      this.isConnected = true;
      return;
    }

    this.currentParams = params;
    this.unsubscribeAll();

    try {
      this.unsubTable = realtimeChannelManager.subscribeToTable('notification_events', (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new;
          // Filter in-memory by recipient or tenant or platform scope
          if (
            row.recipient_user_id === params.userId ||
            (params.organizationId && row.organization_id === params.organizationId) ||
            params.isSuperAdmin ||
            params.isPlatformStaff
          ) {
            this.handleEventInsert(payload);
          }
        }
      });
      this.isConnected = true;
    } catch (err) {
      console.warn('[NotificationRealtimeEngine] Realtime notification registration notice:', err);
      this.isConnected = true;
    }
  }

  private async handleDeliveryInsert(payload: any) {
    if (!payload.new || !payload.new.notification_id) return;
    try {
      const { data: notif } = await supabase
        .from('notification_events')
        .select('*')
        .eq('id', payload.new.notification_id)
        .maybeSingle();

      if (notif) {
        const wfEvent: WorkForceEvent = {
          eventId: notif.id,
          eventType: notif.event_type,
          category: notif.category,
          severity: notif.severity,
          title: notif.title,
          body: notif.body,
          organizationId: notif.organization_id,
          actorId: notif.actor_id,
          actorName: notif.actor_name,
          actorAvatar: notif.actor_avatar,
          resourceType: notif.resource_type,
          resourceId: notif.resource_id,
          actionUrl: notif.action_url,
          timestamp: notif.created_at,
          metadata: notif.metadata,
        };
        this.handleIncomingEvent(wfEvent);
      }
    } catch (err) {
      console.error('[NotificationRealtimeEngine] Failed to resolve delivery event payload:', err);
    }
  }

  private handleEventInsert(payload: any) {
    if (!payload.new) return;
    const n = payload.new;
    const wfEvent: WorkForceEvent = {
      eventId: n.id,
      eventType: n.event_type,
      category: n.category,
      severity: n.severity,
      title: n.title,
      body: n.body,
      organizationId: n.organization_id,
      actorId: n.actor_id,
      actorName: n.actor_name,
      actorAvatar: n.actor_avatar,
      resourceType: n.resource_type,
      resourceId: n.resource_id,
      actionUrl: n.action_url,
      timestamp: n.created_at,
      metadata: n.metadata,
    };
    this.handleIncomingEvent(wfEvent);
  }

  /**
   * Internal deduplication and broadcast to subscribers
   */
  public handleIncomingEvent(event: WorkForceEvent) {
    if (this.processedEventIds.has(event.eventId)) {
      return; // Deduplicated
    }
    this.processedEventIds.add(event.eventId);
    if (this.processedEventIds.size > 2000) {
      // Keep memory bounded
      this.processedEventIds.clear();
    }

    this.lastReceivedTimestamp = event.timestamp || new Date().toISOString();

    // Play subtle audio chime for critical alerts if permitted
    if (event.severity === 'CRITICAL' || event.severity === 'ERROR') {
      this.playAlertSound();
    }

    // Display native OS Desktop System Tray notification if browser permission granted
    this.displayDesktopTrayNotification(event);

    // Broadcast locally to listeners
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[NotificationRealtimeEngine] Listener execution failed:', err);
      }
    });

    // Cross-tab broadcast
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(event);
      } catch (err) {
        console.warn('Cross-tab broadcast failed', err);
      }
    }
  }

  /**
   * Display native OS System Tray / Notification Center banner
   */
  public displayDesktopTrayNotification(event: WorkForceEvent) {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const title = event.title || 'Joy PeopleHR Alert';
        const body = event.body || '';
        const tag = event.eventId || `joy-notif-${Date.now()}`;

        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag,
          requireInteraction: event.severity === 'CRITICAL' || event.title?.includes('Late'),
        });

        notif.onclick = () => {
          window.focus();
          if (event.actionUrl) {
            window.location.hash = event.actionUrl;
          }
          notif.close();
        };
      }
    } catch (err) {
      console.warn('[NotificationRealtimeEngine] Desktop tray popup notice:', err);
    }
  }

  /**
   * Request native desktop notification permission from user
   */
  public async requestDesktopNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  private playAlertSound() {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio playback not allowed without user gesture
    }
  }

  public subscribe(listener: NotificationEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public unsubscribeAll() {
    if (this.unsubTable) {
      this.unsubTable();
      this.unsubTable = null;
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected || !isSupabaseEnabled;
  }

  public getLastTimestamp(): string {
    return this.lastReceivedTimestamp;
  }
}

export const notificationRealtimeEngine = new NotificationRealtimeEngine();
