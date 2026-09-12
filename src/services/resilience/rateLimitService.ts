// src/services/resilience/rateLimitService.ts
// ============================================================================
// JOY PeopleHR — Multi-Dimensional Rate Limiting Engine
// User • Organization • Device Commands • Sliding Window Protection
// ============================================================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetTimeMs: number;
  retryAfterSeconds: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  DEFAULT_API: { maxRequests: 120, windowMs: 60 * 1000 },      // 120 req/min
  DEVICE_COMMANDS: { maxRequests: 15, windowMs: 60 * 1000 },    // 15 cmds/min
  AUTH_ENDPOINTS: { maxRequests: 10, windowMs: 60 * 1000 },     // 10 req/min
  BULK_OPERATIONS: { maxRequests: 5, windowMs: 60 * 1000 },     // 5 bulk jobs/min
  EXPORTS: { maxRequests: 10, windowMs: 60 * 1000 },            // 10 exports/min
};

class RateLimitService {
  private requestBuckets: Map<string, number[]> = new Map();

  /**
   * Evaluates if a request is allowed under the sliding window limit.
   */
  checkLimit(key: string, limitType: keyof typeof DEFAULT_LIMITS = 'DEFAULT_API'): RateLimitCheckResult {
    const config = DEFAULT_LIMITS[limitType] || DEFAULT_LIMITS.DEFAULT_API;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let timestamps = this.requestBuckets.get(key) || [];
    // Evict expired timestamps
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= config.maxRequests) {
      const oldestInWindow = timestamps[0];
      const resetTimeMs = oldestInWindow + config.windowMs;
      const retryAfterSeconds = Math.ceil((resetTimeMs - now) / 1000);

      this.requestBuckets.set(key, timestamps);
      return {
        allowed: false,
        remaining: 0,
        resetTimeMs,
        retryAfterSeconds: Math.max(retryAfterSeconds, 1),
      };
    }

    timestamps.push(now);
    this.requestBuckets.set(key, timestamps);

    return {
      allowed: true,
      remaining: config.maxRequests - timestamps.length,
      resetTimeMs: now + config.windowMs,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Asserts rate limit and throws standard AppException if exceeded.
   */
  assertAllowed(key: string, limitType: keyof typeof DEFAULT_LIMITS = 'DEFAULT_API'): void {
    const res = this.checkLimit(key, limitType);
    if (!res.allowed) {
      throw new Error(`Rate limit exceeded for ${key}. Retry after ${res.retryAfterSeconds}s.`);
    }
  }

  /**
   * Cleans up expired buckets for memory safety.
   */
  prune(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requestBuckets.entries()) {
      const valid = timestamps.filter((t) => now - t < 5 * 60 * 1000);
      if (valid.length === 0) {
        this.requestBuckets.delete(key);
      } else {
        this.requestBuckets.set(key, valid);
      }
    }
  }
}

export const rateLimitService = new RateLimitService();
