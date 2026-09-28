// ============================================================
// Joy PeopleHR — Realtime Channel & Lifecycle Manager
// ============================================================
// Synchronous, non-blocking manager for database & event lifecycle
// Supabase WebSocket Realtime is disabled to ensure zero page delays
// and 100% synchronous/on-demand device sync reliability.
// ============================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseEnabled } from '../../lib/supabase';
import { logger } from '../diagnostics/loggerService';

export type RealtimeStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'SUBSCRIBING'
  | 'SUBSCRIBED'
  | 'POLLING_FALLBACK'
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
  private tableHandlers: Map<string, Set<RealtimeChangeHandler>> = new Map();
  private globalStatus: RealtimeStatus = 'DISCONNECTED';
  private statusListeners: Set<(status: RealtimeStatus, channels: ChannelSubscriptionInfo[]) => void> = new Set();
  private isInitialized: boolean = false;
  private lastEventTimestamp: number | null = null;
  private lastHealthyTimestamp: number = Date.now();

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.setGlobalStatus('DISCONNECTED');
  }

  public getGlobalStatus(): RealtimeStatus {
    return this.globalStatus;
  }

  public getLastEventTimestamp(): number | null {
    return this.lastEventTimestamp;
  }

  public getLastHealthyTimestamp(): number {
    return this.lastHealthyTimestamp;
  }

  public isDegraded(): boolean {
    return false;
  }

  public getChannelInfos(): ChannelSubscriptionInfo[] {
    const infos: ChannelSubscriptionInfo[] = [];
    this.tableHandlers.forEach((handlers, table) => {
      infos.push({
        channelName: `sync:${table}`,
        table,
        schema: 'public',
        status: this.globalStatus,
        refCount: handlers.size,
        lastEventAt: this.lastEventTimestamp ? new Date(this.lastEventTimestamp).toISOString() : undefined,
      });
    });
    return infos;
  }

  private setGlobalStatus(status: RealtimeStatus): void {
    if (this.globalStatus === status) return;
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
   * Acquire a subscription to table change events.
   * Runs non-blockingly without establishing WebSocket connections.
   */
  public subscribeToTable(
    table: string,
    handler: RealtimeChangeHandler,
    _options: {
      schema?: string;
      filter?: string;
      channelPrefix?: string;
    } = {}
  ): () => void {
    if (!isSupabaseEnabled) {
      return () => {};
    }

    if (!this.tableHandlers.has(table)) {
      this.tableHandlers.set(table, new Set());
    }
    const handlerSet = this.tableHandlers.get(table)!;
    handlerSet.add(handler);

    return () => {
      handlerSet.delete(handler);
      if (handlerSet.size === 0) {
        this.tableHandlers.delete(table);
      }
    };
  }

  /**
   * Dispatch a local change event to subscribers (used for optimistic updates)
   */
  public dispatchLocalChange(table: string, payload: Parameters<RealtimeChangeHandler>[0]): void {
    this.lastEventTimestamp = Date.now();
    this.lastHealthyTimestamp = Date.now();
    const handlers = this.tableHandlers.get(table);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(payload);
        } catch (err) {
          logger.error('REALTIME', 'DISPATCH_ERROR', err);
        }
      });
    }
  }

  public async reconnectAll(_force: boolean = false): Promise<void> {
    this.setGlobalStatus('DISCONNECTED');
  }

  public destroy(): void {
    this.tableHandlers.clear();
    this.statusListeners.clear();
    this.isInitialized = false;
    this.setGlobalStatus('DISCONNECTED');
  }
}

export const realtimeChannelManager = new RealtimeChannelManager();
