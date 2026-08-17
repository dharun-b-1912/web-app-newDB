// src/services/notification/notificationRealtimeEngine.ts
// ============================================================
// WorkForceOS — Multi-Tenant Notification Realtime Engine
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { WorkForceEvent, HydratedNotificationItem } from '../../types/notification';

export type NotificationEventListener = (event: WorkForceEvent) => void;

class NotificationRealtimeEngine {
  private listeners = new Set<NotificationEventListener>();
  private activeChannels: any[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private processedEventIds = new Set<string>();
  private lastReceivedTimestamp: string = new Date().toISOString();

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

    this.unsubscribeAll();

    try {
      // 1. User Dedicated Channel
      const userChan = supabase
        .channel(`user:${params.userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notification_deliveries',
            filter: `recipient_user_id=eq.${params.userId}`,
          },
          (payload) => this.handleDeliveryInsert(payload)
        )
        .subscribe((status) => {
          this.handleChannelStatus(status);
        });
      this.activeChannels.push(userChan);

      // 2. Organization Channel (if tenant-bound)
      if (params.organizationId) {
        const orgChan = supabase
          .channel(`organization:${params.organizationId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notification_events',
              filter: `organization_id=eq.${params.organizationId}`,
            },
            (payload) => this.handleEventInsert(payload)
          )
          .subscribe();
        this.activeChannels.push(orgChan);
      }

      // 3. Platform Admin Channels (if Super Admin or Staff)
      if (params.isSuperAdmin || params.isPlatformStaff) {
        const platformChan = supabase
          .channel('platform:operations')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notification_events',
            },
            (payload) => this.handleEventInsert(payload)
          )
          .subscribe();
        this.activeChannels.push(platformChan);
      }
    } catch (err) {
      console.warn('[NotificationRealtimeEngine] Supabase Realtime subscription error, using local mesh', err);
      this.isConnected = true;
    }
  }

  private handleChannelStatus(status: string) {
    if (status === 'SUBSCRIBED') {
      this.isConnected = true;
      this.reconnectAttempts = 0;
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;
    setTimeout(() => {
      console.log('[NotificationRealtimeEngine] Reconnecting realtime notifications channel...');
    }, delay);
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
    this.activeChannels.forEach((c) => {
      try {
        supabase.removeChannel(c);
      } catch (e) {
        console.warn(e);
      }
    });
    this.activeChannels = [];
  }

  public getIsConnected(): boolean {
    return this.isConnected || !isSupabaseEnabled;
  }

  public getLastTimestamp(): string {
    return this.lastReceivedTimestamp;
  }
}

export const notificationRealtimeEngine = new NotificationRealtimeEngine();
