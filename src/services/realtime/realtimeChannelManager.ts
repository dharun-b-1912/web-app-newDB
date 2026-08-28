// ============================================================
// Joy PeopleHR — Realtime Channel & Lifecycle Manager
// ============================================================
// Central singleton managing Supabase Realtime WebSocket subscriptions
// Prevents duplicate listeners, tracks connection status, and handles auto-reconnects
// ============================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { logger } from '../diagnostics/loggerService';
import { CorrelationService } from '../diagnostics/correlationService';
import { hrEventBus } from '../hrEventBus';

export type RealtimeStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'SUBSCRIBING'
  | 'SUBSCRIBED'
  | 'RECONNECTING'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT';

export interface ChannelSubscriptionInfo {
  channelName: string;
  table?: string;
  schema?: string;
  filter?: string;
  status: RealtimeStatus;
  refCount: number;
  lastEventAt?: string;
  lastEventTable?: string;
  lastEventType?: string;
  lastEventId?: string;
  error?: string;
}

export type RealtimeChangeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new: any;
  old: any;
  table: string;
  schema: string;
  commit_timestamp?: string;
}) => void;

class RealtimeChannelManager {
  private channels: Map<string, { channel: RealtimeChannel; info: ChannelSubscriptionInfo }> = new Map();
  private handlers: Map<string, Set<RealtimeChangeHandler>> = new Map();
  private globalStatus: RealtimeStatus = 'DISCONNECTED';
  private statusListeners: Set<(status: RealtimeStatus, channels: ChannelSubscriptionInfo[]) => void> = new Set();
  private isInitialized: boolean = false;
  private reconnectTimer: any = null;

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (!isSupabaseEnabled) {
      this.setGlobalStatus('DISCONNECTED');
      logger.realtime('INIT_SKIPPED', { message: 'Supabase is not configured' });
      return;
    }

    logger.realtime('INIT_STARTED', { message: 'RealtimeChannelManager starting' });
    this.setGlobalStatus('CONNECTING');

    // Register Network Reconnect Listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        logger.realtime('NETWORK_ONLINE', { message: 'Browser network came online, reconnecting realtime...' });
        this.reconnectAll();
      });

      window.addEventListener('offline', () => {
        logger.realtime('NETWORK_OFFLINE', { message: 'Browser network went offline' });
        this.setGlobalStatus('DISCONNECTED');
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          logger.realtime('TAB_ACTIVE', { message: 'Tab returned to foreground, checking realtime health...' });
          this.verifyHealthAndReconcile();
        }
      });
    }
  }

  public getGlobalStatus(): RealtimeStatus {
    return this.globalStatus;
  }

  public getChannelInfos(): ChannelSubscriptionInfo[] {
    return Array.from(this.channels.values()).map((v) => ({ ...v.info }));
  }

  private setGlobalStatus(status: RealtimeStatus): void {
    this.globalStatus = status;
    this.notifyStatusListeners();
  }

  private notifyStatusListeners(): void {
    const infos = this.getChannelInfos();
    this.statusListeners.forEach((listener) => {
      try {
        listener(this.globalStatus, infos);
      } catch (_) {}
    });
  }

  public onStatusChange(listener: (status: RealtimeStatus, channels: ChannelSubscriptionInfo[]) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.globalStatus, this.getChannelInfos());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Acquire a managed subscription to a Postgres table changes stream
   * Automatically re-uses existing channels (prevents duplicate listeners)
   */
  public subscribeToTable(
    table: string,
    handler: RealtimeChangeHandler,
    options: {
      schema?: string;
      filter?: string;
      channelPrefix?: string;
    } = {}
  ): () => void {
    if (!isSupabaseEnabled) {
      return () => {};
    }

    const schema = options.schema || 'public';
    const channelName = options.channelPrefix 
      ? `${options.channelPrefix}-${table}` 
      : `wf-realtime-${schema}-${table}`;

    // Register handler in set
    if (!this.handlers.has(channelName)) {
      this.handlers.set(channelName, new Set());
    }
    const handlerSet = this.handlers.get(channelName)!;
    handlerSet.add(handler);

    // If channel already exists, increment refCount
    if (this.channels.has(channelName)) {
      const existing = this.channels.get(channelName)!;
      existing.info.refCount += 1;
      logger.realtime('CHANNEL_REUSED', {
        table,
        message: `Reusing existing channel ${channelName}, refCount=${existing.info.refCount}`,
      });
      return () => this.releaseSubscription(channelName, handler);
    }

    // Create brand new channel
    const info: ChannelSubscriptionInfo = {
      channelName,
      table,
      schema,
      filter: options.filter,
      status: 'SUBSCRIBING',
      refCount: 1,
    };

    logger.realtime('CHANNEL_CREATE', {
      table,
      action: 'SUBSCRIBING',
      message: `Creating channel ${channelName}`,
    });

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema, table, filter: options.filter },
        (payload: any) => {
          const correlationId = CorrelationService.generate('WF-RT');
          info.lastEventAt = new Date().toISOString();
          info.lastEventTable = table;
          info.lastEventType = payload.eventType;
          info.lastEventId = payload.new?.id || payload.old?.id || 'unknown';

          logger.realtime('EVENT_RECEIVED', {
            correlationId,
            table,
            operation: payload.eventType,
            status: 'RECEIVED',
            employeeId: payload.new?.employee_id || payload.new?.id || payload.old?.employee_id || payload.old?.id,
            metadata: {
              new: payload.new,
              old: payload.old,
            },
          });

          // Dispatch to all registered handlers for this channel
          const currentHandlers = this.handlers.get(channelName);
          if (currentHandlers) {
            currentHandlers.forEach((h) => {
              try {
                h(payload);
              } catch (err) {
                logger.error('REALTIME', 'HANDLER_ERROR', err, { correlationId, table });
              }
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          info.status = 'SUBSCRIBED';
          info.error = undefined;
          this.setGlobalStatus('SUBSCRIBED');
          logger.realtime('SUBSCRIBED', {
            table,
            status: 'SUBSCRIBED',
            message: `Channel ${channelName} is live and subscribed`,
          });
        } else if (status === 'CLOSED') {
          info.status = 'DISCONNECTED';
          logger.realtime('CLOSED', { table, status: 'CLOSED' });
        } else if (status === 'CHANNEL_ERROR') {
          info.status = 'CHANNEL_ERROR';
          info.error = err?.message || 'Subscription failed';
          logger.error('REALTIME', 'CHANNEL_ERROR', err, {
            table,
            message: `Channel ${channelName} encountered error: ${err?.message}`,
          });
        } else if (status === 'TIMED_OUT') {
          info.status = 'TIMED_OUT';
          logger.realtime('TIMED_OUT', { table, status: 'TIMED_OUT' });
        }
        this.notifyStatusListeners();
      });

    this.channels.set(channelName, { channel, info });
    this.notifyStatusListeners();

    return () => this.releaseSubscription(channelName, handler);
  }

  private releaseSubscription(channelName: string, handler: RealtimeChangeHandler): void {
    const handlerSet = this.handlers.get(channelName);
    if (handlerSet) {
      handlerSet.delete(handler);
    }

    const item = this.channels.get(channelName);
    if (!item) return;

    item.info.refCount -= 1;
    logger.realtime('SUBSCRIPTION_RELEASED', {
      table: item.info.table,
      message: `Released subscription on ${channelName}, remaining refs=${item.info.refCount}`,
    });

    if (item.info.refCount <= 0) {
      logger.realtime('CHANNEL_DISPOSED', {
        table: item.info.table,
        message: `Closing and removing channel ${channelName}`,
      });
      supabase.removeChannel(item.channel);
      this.channels.delete(channelName);
      this.handlers.delete(channelName);
      this.notifyStatusListeners();
    }
  }

  public reconnectAll(): void {
    if (!isSupabaseEnabled) return;
    this.setGlobalStatus('RECONNECTING');
    logger.realtime('RECONNECTING_ALL', { message: 'Reconnecting all active realtime channels...' });

    for (const [name, { channel }] of this.channels.entries()) {
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
    }
    this.channels.clear();

    // Re-initialize all previously registered handlers
    const previousHandlers = new Map(this.handlers);
    this.handlers.clear();

    // Trigger reconciliation on event bus
    hrEventBus.publish('sync.reconcile_requested', { reason: 'network_reconnected' });
  }

  public verifyHealthAndReconcile(): void {
    const hasActiveSubscription = Array.from(this.channels.values()).some((c) => c.info.status === 'SUBSCRIBED');
    if (!hasActiveSubscription && this.channels.size > 0) {
      this.reconnectAll();
    } else {
      hrEventBus.publish('sync.reconcile_requested', { reason: 'tab_focus_reconcile' });
    }
  }
}

export const realtimeChannelManager = new RealtimeChannelManager();
