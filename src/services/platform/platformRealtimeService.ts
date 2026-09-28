import React, { useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { realtimeChannelManager } from '../realtime/realtimeChannelManager';
import { platformCache } from './platformCache';

export interface RealtimeEventPayload {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'PULSE';
  newRecord?: any;
  oldRecord?: any;
  timestamp: string;
}

export type RealtimeSubscriber = (payload: RealtimeEventPayload) => void;

class PlatformRealtimeEngine {
  private subscribers = new Set<RealtimeSubscriber>();
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnected = false;

  constructor() {
    this.init();
  }

  private init() {
    // 1. Cross-tab Broadcast Channel for zero-latency local realtime mesh
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('workforceos-platform-realtime');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data) {
            this.notifySubscribers(event.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization fallback', err);
      }
    }

    // 2. Supabase Postgres Changes Channel
    if (isSupabaseEnabled) {
      this.initSupabaseChannel();
    } else {
      this.isConnected = true;
    }
  }

  private initSupabaseChannel() {
    try {
      const tables = [
        'organizations',
        'invoices',
        'subscriptions',
        'platform_incidents',
        'background_jobs',
        'platform_audit_log',
      ];
      tables.forEach((tbl) => {
        realtimeChannelManager.subscribeToTable(tbl, (payload) => {
          this.handlePostgresChange(tbl, payload);
        });
      });
      this.isConnected = true;
    } catch (err) {
      console.warn('Failed to subscribe to Supabase Realtime channel, fallback to local mesh', err);
      this.isConnected = true;
    }
  }

  private handlePostgresChange(table: string, payload: any) {
    platformCache.invalidate(table);

    const eventPayload: RealtimeEventPayload = {
      table,
      eventType: payload.eventType || 'UPDATE',
      newRecord: payload.new,
      oldRecord: payload.old,
      timestamp: new Date().toISOString(),
    };

    this.notifySubscribers(eventPayload);
  }

  private notifySubscribers(payload: RealtimeEventPayload) {
    this.subscribers.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error('Error broadcasting realtime event:', err);
      }
    });
  }

  /**
   * Subscribe a component or callback to real-time events.
   */
  subscribe(callback: RealtimeSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Manual dispatch for optimistic operations & cross-tab sync
   */
  emit(table: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'PULSE', newRecord?: any) {
    platformCache.invalidate(table);
    const payload: RealtimeEventPayload = {
      table,
      eventType,
      newRecord,
      timestamp: new Date().toISOString(),
    };

    this.notifySubscribers(payload);

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (err) {
        console.warn('BroadcastChannel postMessage failed', err);
      }
    }
  }

  getIsConnected(): boolean {
    return this.isConnected || !isSupabaseEnabled;
  }
}

export const platformRealtimeService = new PlatformRealtimeEngine();

/**
 * React Hook for consuming live platform events with automatic cleanup.
 */
export function usePlatformRealtime(
  targetTable?: string,
  onEvent?: (payload: RealtimeEventPayload) => void
) {
  const [lastEvent, setLastEvent] = useState<RealtimeEventPayload | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const unsubscribe = platformRealtimeService.subscribe((payload) => {
      if (!targetTable || payload.table === targetTable) {
        setLastEvent(payload);
        if (onEventRef.current) {
          onEventRef.current(payload);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [targetTable]);

  return {
    lastEvent,
    isConnected: platformRealtimeService.getIsConnected(),
  };
}
