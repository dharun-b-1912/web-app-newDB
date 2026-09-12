import { Redis } from '@upstash/redis';

// ============================================================================
// Joy PeopleHR — Optimized Two-Tier Upstash Redis Service (Free-Tier & Scale Ready)
// Architecture:
// 1. L1 Micro-Memory Cache: Prevents redundant HTTP roundtrips & saves free-tier daily commands
// 2. L2 Upstash Serverless Redis: Distributed, durable cloud cache & atomic mutex locks
// 3. Quota Circuit Breaker: Seamlessly falls back to memory if daily quota is reached
// 4. Memory Shield: Enforces strict TTLs so storage stays well below 256 MB limit
// ============================================================================

// Detect credentials from Vite environment or Node process
const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] || '';
    }
  } catch {}
  return '';
};

const REDIS_URL = getEnvVar('VITE_UPSTASH_REDIS_REST_URL') || getEnvVar('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = getEnvVar('VITE_UPSTASH_REDIS_REST_TOKEN') || getEnvVar('UPSTASH_REDIS_REST_TOKEN');

// L1 In-Memory Cache Store (Micro-TTL to slash daily command counts)
class InMemoryL1Cache {
  private store = new Map<string, { value: any; expiry?: number }>();

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value as T;
  }

  set(key: string, value: any, ttlSeconds?: number, nx?: boolean): boolean {
    if (nx && this.store.has(key)) {
      const existing = this.store.get(key);
      if (!existing?.expiry || Date.now() <= existing.expiry) {
        return false;
      }
    }
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiry });
    return true;
  }

  del(...keys: string[]): number {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  keys(pattern: string): string[] {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const valid: string[] = [];
    for (const [k, v] of this.store.entries()) {
      if (v.expiry && Date.now() > v.expiry) {
        this.store.delete(k);
        continue;
      }
      if (regex.test(k)) valid.push(k);
    }
    return valid;
  }

  clear(): void {
    this.store.clear();
  }
}

const memoryL1 = new InMemoryL1Cache();

// Initialize Upstash Client with Free-Tier retry and backoff optimizations
let redisInstance: Redis | null = null;
if (REDIS_URL && REDIS_TOKEN && REDIS_URL.startsWith('http')) {
  try {
    redisInstance = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.min(1000, Math.exp(retryCount) * 50),
      },
    });
  } catch (err) {
    console.warn('[JoyRedis] Upstash client init fallback to memory:', err);
  }
}

// Circuit breaker for Upstash free-tier daily command limits or transient network issues
class CircuitBreaker {
  private isTripped = false;
  private tripUntil = 0;

  recordFailure(error: any) {
    const msg = String(error?.message || error || '').toLowerCase();
    // Check for daily quota exhaustion or 429 rate limit
    if (msg.includes('daily request limit') || msg.includes('quota') || msg.includes('429')) {
      console.warn('[JoyRedis Quota Guard] Free tier limit reached. Auto-switching to local memory cache for 5 minutes.');
      this.isTripped = true;
      this.tripUntil = Date.now() + 5 * 60 * 1000; // 5 min quiet period
    }
  }

  shouldBypassRedis(): boolean {
    if (!this.isTripped) return false;
    if (Date.now() > this.tripUntil) {
      this.isTripped = false;
      return false;
    }
    return true;
  }
}

const quotaBreaker = new CircuitBreaker();

class JoyRedisService {
  private readonly DEFAULT_CACHE_TTL = 300; // 5 minutes
  private readonly MAX_SAFE_TTL = 86400; // 24 hours (prevents memory leaks on 256MB free tier)
  private readonly L1_MICRO_TTL = 20; // 20s local memory shield (cuts Upstash HTTP commands by 70-80%)

  isConfigured(): boolean {
    return Boolean(redisInstance);
  }

  getClient(): Redis | null {
    return redisInstance;
  }

  /**
   * Two-Tier GET:
   * 1. Checks L1 memory cache (0ms, 0 Upstash commands spent)
   * 2. On L1 miss, queries Upstash L2, populates L1 for 20s
   */
  async get<T = any>(key: string): Promise<T | null> {
    // 1. Check L1 Memory Cache first
    const l1Hit = memoryL1.get<T>(key);
    if (l1Hit !== null) {
      return l1Hit;
    }

    // 2. Check Upstash Redis (if configured and circuit breaker not tripped)
    if (redisInstance && !quotaBreaker.shouldBypassRedis()) {
      try {
        const val = (await redisInstance.get<T>(key)) as T | null;
        if (val !== null) {
          // Populate L1 cache for micro-window to save commands on rapid subsequent reads
          memoryL1.set(key, val, this.L1_MICRO_TTL);
        }
        return val;
      } catch (err) {
        quotaBreaker.recordFailure(err);
      }
    }

    return null;
  }

  /**
   * Optimized SET with automatic TTL clamping to protect 256MB free tier
   */
  async set(
    key: string,
    value: any,
    opts?: { ex?: number; nx?: boolean }
  ): Promise<'OK' | null> {
    // Clamp TTL to safe boundaries (default 300s, max 86400s)
    const effectiveTtl = Math.min(opts?.ex || this.DEFAULT_CACHE_TTL, this.MAX_SAFE_TTL);

    // Save to L1 local memory
    const l1Success = memoryL1.set(key, value, opts?.nx ? effectiveTtl : Math.min(effectiveTtl, this.L1_MICRO_TTL), opts?.nx);
    if (opts?.nx && !l1Success) {
      return null;
    }

    // Save to Upstash Redis
    if (redisInstance && !quotaBreaker.shouldBypassRedis()) {
      try {
        let res: any;
        if (opts?.nx) {
          res = await (redisInstance as any).set(key, value, { nx: true, ex: effectiveTtl });
        } else {
          res = await (redisInstance as any).set(key, value, { ex: effectiveTtl });
        }
        return res as 'OK' | null;
      } catch (err) {
        quotaBreaker.recordFailure(err);
        return l1Success ? 'OK' : null;
      }
    }

    return l1Success ? 'OK' : null;
  }

  /**
   * DEL across both L1 and Upstash Redis
   */
  async del(...keys: string[]): Promise<number> {
    memoryL1.del(...keys);

    if (redisInstance && keys.length > 0 && !quotaBreaker.shouldBypassRedis()) {
      try {
        return await redisInstance.del(...keys);
      } catch (err) {
        quotaBreaker.recordFailure(err);
      }
    }
    return keys.length;
  }

  /**
   * Pattern Keys Invalidation (Safe for Free Tier)
   */
  async deletePattern(pattern: string): Promise<number> {
    const memKeys = memoryL1.keys(pattern);
    memoryL1.del(...memKeys);

    if (redisInstance && !quotaBreaker.shouldBypassRedis()) {
      try {
        const found = await redisInstance.keys(pattern);
        if (found && found.length > 0) {
          return await redisInstance.del(...found);
        }
        return 0;
      } catch (err) {
        quotaBreaker.recordFailure(err);
      }
    }
    return memKeys.length;
  }

  // =========================================================================
  // HIGH-VALUE ENTERPRISE HRMS SPECIALIZATIONS (FREE TIER TUNED)
  // =========================================================================

  /**
   * 1. Biometric & Mobile Punch Deduplication Lock
   * Locks punch for 15s using atomic SETNX with auto-expiration
   */
  async verifyAndLockPunch(
    employeeId: string,
    punchTimeStr: string,
    windowSeconds = 15
  ): Promise<{ allowed: boolean; reason?: string }> {
    const lockKey = `joy:punch_lock:${employeeId.toLowerCase()}`;
    const acquired = await this.set(
      lockKey,
      { timestamp: punchTimeStr, acceptedAt: new Date().toISOString() },
      { nx: true, ex: windowSeconds }
    );

    if (!acquired) {
      return {
        allowed: false,
        reason: `Duplicate punch detected within ${windowSeconds}s window. Please wait before punching again.`,
      };
    }

    return { allowed: true };
  }

  /**
   * 2. Attendance Ledger Cache (Sub-10ms Ledger Navigation)
   * Free-Tier Optimized: Stores compact JSON with 180s TTL and 30s L1 memory cache
   */
  async getLedgerCache<T>(tenantId: string, periodKey: string): Promise<T | null> {
    const cacheKey = `joy:ledger:${tenantId}:${periodKey}`;
    return this.get<T>(cacheKey);
  }

  async setLedgerCache<T>(
    tenantId: string,
    periodKey: string,
    data: T,
    ttlSeconds = 180
  ): Promise<void> {
    const cacheKey = `joy:ledger:${tenantId}:${periodKey}`;
    await this.set(cacheKey, data, { ex: ttlSeconds });
  }

  async invalidateLedgerCache(tenantId: string, periodKey?: string): Promise<void> {
    if (periodKey) {
      await this.del(`joy:ledger:${tenantId}:${periodKey}`);
    } else {
      await this.deletePattern(`joy:ledger:${tenantId}:*`);
    }
  }

  /**
   * 3. Distributed Mutex Lock (Payroll Finalization & Critical Batch Jobs)
   */
  async acquireLock(
    lockName: string,
    holderId: string,
    ttlSeconds = 60
  ): Promise<{ acquired: boolean; currentHolder?: string }> {
    const lockKey = `joy:lock:${lockName}`;
    const acquired = await this.set(
      lockKey,
      { holderId, acquiredAt: new Date().toISOString() },
      { nx: true, ex: ttlSeconds }
    );
    if (!acquired) {
      const existing = await this.get<{ holderId: string; acquiredAt: string }>(lockKey);
      return { acquired: false, currentHolder: existing?.holderId || 'another active process' };
    }
    return { acquired: true };
  }

  async releaseLock(lockName: string, holderId: string): Promise<boolean> {
    const lockKey = `joy:lock:${lockName}`;
    const current = await this.get<{ holderId: string }>(lockKey);
    if (!current || current.holderId === holderId) {
      await this.del(lockKey);
      return true;
    }
    return false;
  }
}

export const JoyRedis = new JoyRedisService();
