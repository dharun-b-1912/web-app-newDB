// ============================================================
// Joy PeopleHR — Hardened Telemetry Ingestion & Dual Persistence Bridge
// ============================================================
// Ingests, validates, rate-limits, deduplicates, and double-scrubs all telemetry.
// Enforces Idempotency (Gate 6), Anti-Recursion Guard (Gate 7), and App Isolation (Gate 8).
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { PiiScrubber } from './piiScrubber';
import { StructuredTelemetryEntry } from './observabilityLogger';

const LOCAL_STORAGE_KEY = 'wf_observability_event_store_v1';
const MAX_LOCAL_STORE = 500;
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_EVENTS_PER_MINUTE = 60;

export interface IngestedEventPayload extends StructuredTelemetryEntry {
  serverTimestamp: string;
  isSynthetic?: boolean;
  ingestionStatus: 'PERSISTED_DB' | 'PERSISTED_LOCAL_QUEUE' | 'RATE_LIMITED' | 'DEDUPLICATED';
}

export class TelemetryIngestionBridge {
  private static eventCountInWindow = 0;
  private static windowStart = Date.now();
  private static isInitialized = false;
  private static isIngestingInternal = false; // Anti-Recursion Loop Breaker (Gate 7)
  private static dedupCache: Set<string> = new Set(); // Idempotency Cache (Gate 6)
  private static isRemoteTableAvailable = true;

  public static initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Periodically flush local queue to Supabase if connection restores
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flushQueue();
      });
      // Initial flush attempt safely isolated
      setTimeout(() => {
        try {
          this.flushQueue();
        } catch (_) {}
      }, 3000);
    }
  }

  /**
   * Primary ingestion endpoint.
   * Rate limits, deduplicates, second-pass scrubs PII, and securely persists.
   * Total App Isolation Guarantee (Gate 8): NEVER throws an unhandled error to the host application.
   */
  public static async ingest(entry: StructuredTelemetryEntry, isSynthetic = false): Promise<IngestedEventPayload> {
    // 0. Anti-Recursion Loop Breaker (Gate 7)
    if (this.isIngestingInternal) {
      return {
        ...entry,
        serverTimestamp: new Date().toISOString(),
        isSynthetic,
        ingestionStatus: 'RATE_LIMITED',
      };
    }

    try {
      this.isIngestingInternal = true;

      // 1. Idempotency Check (Gate 6) - Prevents duplicate stored events on retry
      if (this.dedupCache.has(entry.id)) {
        return {
          ...entry,
          serverTimestamp: new Date().toISOString(),
          isSynthetic,
          ingestionStatus: 'DEDUPLICATED',
        };
      }
      this.dedupCache.add(entry.id);
      if (this.dedupCache.size > 2000) {
        const first = this.dedupCache.values().next().value;
        if (first) this.dedupCache.delete(first);
      }

      // 2. Rate Limiting Check (Gate 7)
      const now = Date.now();
      if (now - this.windowStart > RATE_LIMIT_WINDOW_MS) {
        this.windowStart = now;
        this.eventCountInWindow = 0;
      }

      this.eventCountInWindow++;
      if (this.eventCountInWindow > MAX_EVENTS_PER_MINUTE) {
        return {
          ...entry,
          serverTimestamp: new Date().toISOString(),
          isSynthetic,
          ingestionStatus: 'RATE_LIMITED',
        };
      }

      // 3. Second-Pass Server-Side / Ingestion PII Redaction (Gate 4)
      const sanitizedMetadata = entry.metadata ? PiiScrubber.scrub(entry.metadata) : undefined;
      const sanitizedError = entry.error ? PiiScrubber.scrub(entry.error) : undefined;
      const sanitizedMessage = PiiScrubber.sanitizeString(entry.message);

      const payload: IngestedEventPayload = {
        ...entry,
        message: sanitizedMessage,
        metadata: sanitizedMetadata,
        error: sanitizedError,
        serverTimestamp: new Date().toISOString(),
        isSynthetic,
        ingestionStatus: 'PERSISTED_LOCAL_QUEUE',
      };

      // 4. Persist to Local Resilient Store (ensures survival across page refreshes)
      this.saveToLocalQueue(payload);

      // 5. Persist to Supabase Database (if configured and online)
      if (isSupabaseEnabled && typeof window !== 'undefined' && navigator.onLine && this.isRemoteTableAvailable) {
        try {
          const { error } = await supabase.from('observability_events').upsert(
            {
              id: payload.id,
              timestamp: payload.timestamp,
              environment: payload.traceContext.environment,
              service: payload.module,
              event_type: payload.stream,
              level: payload.level,
              message: payload.message,
              trace_id: payload.traceContext.traceId,
              correlation_id: payload.traceContext.correlationId,
              request_id: payload.traceContext.requestId,
              tenant_id: payload.traceContext.tenantId,
              release_version: payload.traceContext.releaseVersion,
              metadata: payload.metadata || {},
              error: payload.error || {},
              is_synthetic: payload.isSynthetic || false,
            },
            { onConflict: 'id' }
          );

          if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist') || (error as any).status === 404) {
              this.isRemoteTableAvailable = false; // Disable remote attempts until table is migrated
            }
          } else {
            payload.ingestionStatus = 'PERSISTED_DB';
          }
        } catch (_) {
          // Handled silently; local queue retains payload
        }
      }

      return payload;
    } catch (_) {
      // Gate 8: Fail-safe fallback - never bubble exception to user UI
      return {
        ...entry,
        serverTimestamp: new Date().toISOString(),
        isSynthetic,
        ingestionStatus: 'PERSISTED_LOCAL_QUEUE',
      };
    } finally {
      this.isIngestingInternal = false;
    }
  }

  /**
   * Reads all persisted events (survives browser reload)
   */
  public static getPersistedEvents(): IngestedEventPayload[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Save payload to persistent browser store
   */
  private static saveToLocalQueue(payload: IngestedEventPayload) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const existing = this.getPersistedEvents();
      // Check if entry with same id already exists (idempotency)
      const existingIdx = existing.findIndex((e) => e.id === payload.id);
      if (existingIdx >= 0) {
        existing[existingIdx] = payload;
      } else {
        existing.unshift(payload);
      }

      if (existing.length > MAX_LOCAL_STORE) {
        existing.pop();
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch (_) {}
  }

  /**
   * Flush queued events to remote backend
   */
  public static async flushQueue() {
    if (!isSupabaseEnabled || typeof window === 'undefined' || !navigator.onLine || !this.isRemoteTableAvailable) return;
    const events = this.getPersistedEvents().filter((e) => e.ingestionStatus === 'PERSISTED_LOCAL_QUEUE');
    if (events.length === 0) return;

    try {
      const batch = events.slice(0, 20).map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        environment: e.traceContext.environment,
        service: e.module,
        event_type: e.stream,
        level: e.level,
        message: e.message,
        trace_id: e.traceContext.traceId,
        correlation_id: e.traceContext.correlationId,
        request_id: e.traceContext.requestId,
        tenant_id: e.traceContext.tenantId,
        release_version: e.traceContext.releaseVersion,
        metadata: e.metadata || {},
        error: e.error || {},
        is_synthetic: e.isSynthetic || false,
      }));

      const { error } = await supabase.from('observability_events').upsert(batch, { onConflict: 'id' });
      if (error && (error.code === '42P01' || error.message?.includes('does not exist') || (error as any).status === 404)) {
        this.isRemoteTableAvailable = false;
      }
    } catch (_) {}
  }

  /**
   * Get sync health metrics
   */
  public static getSyncMetrics() {
    const events = this.getPersistedEvents();
    return {
      totalPersisted: events.length,
      realEventsCount: events.filter((e) => !e.isSynthetic).length,
      syntheticCount: events.filter((e) => e.isSynthetic).length,
      isDbActive: isSupabaseEnabled,
    };
  }

  /**
   * Clear in-memory dedup cache (for testing)
   */
  public static resetDedupCacheForTests() {
    this.dedupCache.clear();
    this.eventCountInWindow = 0;
  }
}

TelemetryIngestionBridge.initialize();
