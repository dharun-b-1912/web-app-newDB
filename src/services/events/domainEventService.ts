// src/services/events/domainEventService.ts
// ============================================================================
// JOY PeopleHR — Gate 3A: Server-Authoritative Transactional Outbox Event Mesh
// Persistent, Idempotent, Concurrent-Worker-Safe with Exponential Backoff
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import {
  DomainEventRecord,
  DomainEventStatus,
  CreateDomainEventInput,
  CANONICAL_DOMAIN_EVENTS,
} from '../../types/domainEvents';

export type DomainEventHandler<T = any> = (event: DomainEventRecord<T>) => Promise<void> | void;

const STORAGE_KEY_DOMAIN_EVENTS = 'joy_peoplehr_domain_events_mesh_v1';

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export class DomainEventService {
  private static instance: DomainEventService;
  private handlers: Map<string, Set<DomainEventHandler>> = new Map();
  private localLock: boolean = false;
  private isSupabaseTablePresent: boolean | null = null;
  private supabaseCheckPromise: Promise<boolean> | null = null;
  private claimChain: Promise<void> = Promise.resolve();
  private publishChain: Promise<void> = Promise.resolve();

  private constructor() {}

  public static getInstance(): DomainEventService {
    if (!DomainEventService.instance) {
      DomainEventService.instance = new DomainEventService();
    }
    return DomainEventService.instance;
  }

  private async checkSupabaseTable(): Promise<boolean> {
    if (this.isSupabaseTablePresent !== null) {
      return this.isSupabaseTablePresent;
    }
    if (!isSupabaseEnabled) {
      this.isSupabaseTablePresent = false;
      return false;
    }
    if (!this.supabaseCheckPromise) {
      this.supabaseCheckPromise = (async () => {
        try {
          const { error } = await supabase.from('domain_events').select('id').limit(0);
          this.isSupabaseTablePresent = !error || error.code !== 'PGRST205';
        } catch {
          this.isSupabaseTablePresent = false;
        }
        return this.isSupabaseTablePresent;
      })();
    }
    return this.supabaseCheckPromise;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Local/Persistent Fallback Store Helpers
  // ──────────────────────────────────────────────────────────────────────────
  private getLocalEvents(): DomainEventRecord[] {
    if (typeof window === 'undefined') return (globalThis as any).__JOY_DOMAIN_EVENTS__ || [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DOMAIN_EVENTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalEvents(events: DomainEventRecord[]): void {
    if (typeof window === 'undefined') {
      (globalThis as any).__JOY_DOMAIN_EVENTS__ = events;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_DOMAIN_EVENTS, JSON.stringify(events));
    } catch {
      // Quota or memory fallback
    }
  }

  /**
   * Reset local storage store (useful for clean testing)
   */
  public clearLocalStore(): void {
    if (typeof window === 'undefined') {
      (globalThis as any).__JOY_DOMAIN_EVENTS__ = [];
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY_DOMAIN_EVENTS);
      } catch {}
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4: Transactional Outbox Publishing with Mandatory Idempotency
  // ──────────────────────────────────────────────────────────────────────────
  public async publishEvent<T = Record<string, any>>(
    input: CreateDomainEventInput<T>
  ): Promise<DomainEventRecord<T>> {
    if (!input.idempotency_key) {
      throw new Error(`[DomainEventService] Every domain event must provide an idempotency_key.`);
    }

    const now = new Date().toISOString();

    // 1. Try Supabase if table is present and organization_id is a valid UUID
    const hasTable = await this.checkSupabaseTable();
    if (hasTable && isValidUUID(input.organization_id)) {
      try {
        // Check if event already exists for idempotency
        const { data: existing, error: findErr } = await supabase
          .from('domain_events')
          .select('*')
          .eq('idempotency_key', input.idempotency_key)
          .maybeSingle();

        if (existing && !findErr) {
          return existing as DomainEventRecord<T>;
        }

        const newId = crypto.randomUUID();
        const eventRow: Partial<DomainEventRecord<T>> = {
          id: newId,
          organization_id: input.organization_id,
          event_type: input.event_type,
          aggregate_type: input.aggregate_type,
          aggregate_id: input.aggregate_id,
          idempotency_key: input.idempotency_key,
          payload: input.payload,
          actor_id: input.actor_id || null,
          status: 'PENDING',
          retry_count: 0,
          max_retries: input.max_retries ?? 5,
          available_at: input.available_at || now,
          created_at: now,
        };

        const { data: inserted, error: insErr } = await supabase
          .from('domain_events')
          .insert(eventRow)
          .select()
          .single();

        if (inserted && !insErr) {
          return inserted as DomainEventRecord<T>;
        }

        // If unique violation occurred concurrently, fetch the existing record
        if (insErr && (insErr.code === '23505' || insErr.message?.includes('duplicate key'))) {
          const { data: dupRecord } = await supabase
            .from('domain_events')
            .select('*')
            .eq('idempotency_key', input.idempotency_key)
            .single();
          if (dupRecord) return dupRecord as DomainEventRecord<T>;
        }
      } catch (dbErr) {
        console.warn('[DomainEventService] Supabase outbox write falling back to persistent store:', dbErr);
      }
    }

    // 2. Persistent Local Store with Atomic Mutex Protection
    return new Promise<DomainEventRecord<T>>((resolve) => {
      this.publishChain = this.publishChain.then(async () => {
        const events = this.getLocalEvents();
        const existing = events.find((e) => e.idempotency_key === input.idempotency_key);
        if (existing) {
          resolve(existing as DomainEventRecord<T>);
          return;
        }

        const createdRecord: DomainEventRecord<T> = {
          id: crypto.randomUUID(),
          organization_id: input.organization_id,
          event_type: input.event_type,
          aggregate_type: input.aggregate_type,
          aggregate_id: input.aggregate_id,
          idempotency_key: input.idempotency_key,
          payload: input.payload,
          actor_id: input.actor_id || null,
          status: 'PENDING',
          retry_count: 0,
          max_retries: input.max_retries ?? 5,
          available_at: input.available_at || now,
          locked_at: null,
          locked_by: null,
          last_error: null,
          created_at: now,
          processed_at: null,
        };

        events.push(createdRecord);
        this.saveLocalEvents(events);
        resolve(createdRecord);
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 5: Worker Concurrency & Safe Event Claiming (FOR UPDATE SKIP LOCKED)
  // ──────────────────────────────────────────────────────────────────────────
  public async claimPendingEvents(
    workerId: string,
    batchSize: number = 10
  ): Promise<DomainEventRecord[]> {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Try Supabase RPC if table is present
    const hasTable = await this.checkSupabaseTable();
    if (hasTable) {
      try {
        const { data, error } = await supabase.rpc('fn_claim_domain_events', {
          p_worker_id: workerId,
          p_batch_size: batchSize,
        });

        if (data && !error && Array.isArray(data) && data.length > 0) {
          return data as DomainEventRecord[];
        }
      } catch (err) {
        console.warn('[DomainEventService] RPC fn_claim_domain_events notice, using local engine:', err);
      }
    }

    // 2. Concurrency-Safe Local Store Claiming with Mutex
    return new Promise<DomainEventRecord[]>((resolve) => {
      this.claimChain = this.claimChain.then(async () => {
        const events = this.getLocalEvents();
        const claimed: DomainEventRecord[] = [];

        for (const event of events) {
          if (claimed.length >= batchSize) break;

          const isClaimableStatus = event.status === 'PENDING' || event.status === 'FAILED';
          const isAvailable = new Date(event.available_at).getTime() <= now.getTime();
          const isLockExpired =
            !event.locked_at ||
            now.getTime() - new Date(event.locked_at).getTime() > 5 * 60 * 1000;

          if (isClaimableStatus && isAvailable && isLockExpired) {
            event.status = 'PROCESSING';
            event.locked_at = nowIso;
            event.locked_by = workerId;
            claimed.push({ ...event });
          }
        }

        this.saveLocalEvents(events);
        resolve(claimed);
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Event Completion
  // ──────────────────────────────────────────────────────────────────────────
  public async completeEvent(eventId: string): Promise<void> {
    const nowIso = new Date().toISOString();

    const hasTable = await this.checkSupabaseTable();
    if (hasTable) {
      try {
        await supabase
          .from('domain_events')
          .update({
            status: 'COMPLETED',
            processed_at: nowIso,
            locked_at: null,
            locked_by: null,
          })
          .eq('id', eventId);
      } catch (err) {
        console.warn('[DomainEventService] Supabase complete notice:', err);
      }
    }

    const events = this.getLocalEvents();
    const target = events.find((e) => e.id === eventId);
    if (target) {
      target.status = 'COMPLETED';
      target.processed_at = nowIso;
      target.locked_at = null;
      target.locked_by = null;
      this.saveLocalEvents(events);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Event Failure & Exponential Backoff Retry Engine
  // Attempt 1 -> +30s
  // Attempt 2 -> +2m (120s)
  // Attempt 3 -> +10m (600s)
  // Attempt 4 -> +30m (1800s)
  // Attempt 5+ -> DEAD_LETTER
  // ──────────────────────────────────────────────────────────────────────────
  public async failEvent(
    eventId: string,
    errorMessage: string
  ): Promise<{ status: DomainEventStatus; retry_count: number; available_at: string }> {
    const now = new Date();

    const events = this.getLocalEvents();
    const target = events.find((e) => e.id === eventId);
    const currentRetry = (target?.retry_count ?? 0) + 1;
    const maxRetries = target?.max_retries ?? 5;

    let newStatus: DomainEventStatus = 'PENDING';
    let delaySeconds = 0;

    if (currentRetry >= maxRetries) {
      newStatus = 'DEAD_LETTER';
    } else {
      switch (currentRetry) {
        case 1:
          delaySeconds = 30;
          break;
        case 2:
          delaySeconds = 120;
          break;
        case 3:
          delaySeconds = 600;
          break;
        case 4:
          delaySeconds = 1800;
          break;
        default:
          delaySeconds = 3600;
      }
    }

    const newAvailableAt = new Date(now.getTime() + delaySeconds * 1000).toISOString();

    const hasTable = await this.checkSupabaseTable();
    if (hasTable) {
      try {
        await supabase
          .from('domain_events')
          .update({
            status: newStatus,
            retry_count: currentRetry,
            available_at: newAvailableAt,
            last_error: errorMessage,
            locked_at: null,
            locked_by: null,
          })
          .eq('id', eventId);
      } catch (err) {
        console.warn('[DomainEventService] Supabase fail notice:', err);
      }
    }

    if (target) {
      target.status = newStatus;
      target.retry_count = currentRetry;
      target.available_at = newAvailableAt;
      target.last_error = errorMessage;
      target.locked_at = null;
      target.locked_by = null;
      this.saveLocalEvents(events);
    }

    return {
      status: newStatus,
      retry_count: currentRetry,
      available_at: newAvailableAt,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Subscriptions & Routing
  // ──────────────────────────────────────────────────────────────────────────
  public registerEventHandler<T = any>(
    eventType: string,
    handler: DomainEventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Worker Processor Execution Cycle
  // ──────────────────────────────────────────────────────────────────────────
  public async processNextBatch(
    workerId: string,
    batchSize: number = 10
  ): Promise<{ processed: number; failed: number; deadLetter: number }> {
    const claimed = await this.claimPendingEvents(workerId, batchSize);
    let processed = 0;
    let failed = 0;
    let deadLetter = 0;

    for (const event of claimed) {
      try {
        const typeHandlers = this.handlers.get(event.event_type);
        const wildcardHandlers = this.handlers.get('*');

        const allHandlers: DomainEventHandler[] = [
          ...(typeHandlers ? Array.from(typeHandlers) : []),
          ...(wildcardHandlers ? Array.from(wildcardHandlers) : []),
        ];

        for (const handler of allHandlers) {
          await handler(event);
        }

        await this.completeEvent(event.id);
        processed++;
      } catch (err: any) {
        const failResult = await this.failEvent(event.id, err?.message || 'Execution failed');
        if (failResult.status === 'DEAD_LETTER') {
          deadLetter++;
        } else {
          failed++;
        }
      }
    }

    return { processed, failed, deadLetter };
  }

  /**
   * Helper: Read current events for verification/testing
   */
  public getEvents(filter?: { organizationId?: string; status?: DomainEventStatus }): DomainEventRecord[] {
    let list = this.getLocalEvents();
    if (filter?.organizationId) {
      list = list.filter((e) => e.organization_id === filter.organizationId);
    }
    if (filter?.status) {
      list = list.filter((e) => e.status === filter.status);
    }
    return list;
  }
}

export const domainEventService = DomainEventService.getInstance();
