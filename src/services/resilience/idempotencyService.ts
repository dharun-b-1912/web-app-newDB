// src/services/resilience/idempotencyService.ts
// ============================================================================
// JOY PeopleHR — Deterministic Idempotency & Concurrency Locking Engine
// Biometric Ingestion • Payroll Runs • Device Commands • Zero Race Conditions
// ============================================================================

export interface IdempotencyExecution<T = any> {
  idempotencyKey: string;
  organizationId: string;
  operation: string;
  status: 'IN_FLIGHT' | 'COMPLETED' | 'FAILED';
  result?: T;
  error?: string;
  inFlightPromise?: Promise<T>;
  createdAt: string;
  completedAt?: string;
}

export interface IdempotentExecutionOptions {
  rejectConcurrentInFlight?: boolean; // Set true for strict operations like Payroll creation
}

class IdempotencyService {
  private executionStore: Map<string, IdempotencyExecution> = new Map();

  /**
   * Generates a deterministic SHA-like idempotency key from event parameters.
   */
  generateKey(parts: (string | number | undefined | null)[]): string {
    const raw = parts.map((p) => String(p || '')).join(':');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `idemp_${hex}_${raw.length}`;
  }

  /**
   * Executes an operation with full idempotency guarantee.
   * If the operation is already in-flight:
   * - By default, concurrent callers join the in-flight promise and return the shared result.
   * - If rejectConcurrentInFlight is true, rejects with concurrency conflict.
   */
  async executeIdempotent<T>(
    idempotencyKey: string,
    organizationId: string,
    operation: string,
    executor: () => Promise<T>,
    options?: IdempotentExecutionOptions
  ): Promise<{ status: 'PROCESSED' | 'DUPLICATE_RETURNED'; result: T }> {
    const existing = this.executionStore.get(idempotencyKey);

    if (existing) {
      if (existing.status === 'COMPLETED') {
        return {
          status: 'DUPLICATE_RETURNED',
          result: existing.result as T,
        };
      }
      if (existing.status === 'IN_FLIGHT') {
        if (options?.rejectConcurrentInFlight) {
          throw new Error(`Concurrent execution conflict: Operation ${operation} is already in-flight for key ${idempotencyKey}.`);
        }
        if (existing.inFlightPromise) {
          const res = await existing.inFlightPromise;
          return {
            status: 'DUPLICATE_RETURNED',
            result: res as T,
          };
        }
      }
    }

    // Launch in-flight promise
    const executionPromise = executor();

    const record: IdempotencyExecution<T> = {
      idempotencyKey,
      organizationId,
      operation,
      status: 'IN_FLIGHT',
      inFlightPromise: executionPromise,
      createdAt: new Date().toISOString(),
    };
    this.executionStore.set(idempotencyKey, record);

    try {
      const result = await executionPromise;
      record.status = 'COMPLETED';
      record.result = result;
      record.completedAt = new Date().toISOString();
      record.inFlightPromise = undefined;
      return {
        status: 'PROCESSED',
        result,
      };
    } catch (err: any) {
      record.status = 'FAILED';
      record.error = err.message || String(err);
      record.inFlightPromise = undefined;
      this.executionStore.delete(idempotencyKey); // Clear lock so safe retry is possible
      throw err;
    }
  }

  /**
   * Checks if an idempotency key was previously processed.
   */
  hasBeenProcessed(key: string): boolean {
    const entry = this.executionStore.get(key);
    return entry?.status === 'COMPLETED';
  }
}

export const idempotencyService = new IdempotencyService();
