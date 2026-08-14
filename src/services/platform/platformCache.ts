// src/services/platform/platformCache.ts
// ============================================================
// WorkForceOS — Zero-Latency In-Memory SWR Cache Engine
// ============================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

class PlatformCacheEngine {
  private cache = new Map<string, CacheEntry<any>>();
  private listeners = new Map<string, Set<(data: any) => void>>();

  /**
   * Get data from cache if still within TTL.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttlMs;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data into cache with configurable TTL (default: 30 seconds).
   */
  set<T>(key: string, data: T, ttlMs: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs,
    });
    this.notify(key, data);
  }

  /**
   * Optimistic Mutator: Instantly updates cached data and notifies subscribers
   */
  mutate<T>(key: string, updater: (prev: T | null) => T): T {
    const current = this.get<T>(key);
    const updated = updater(current);
    this.set(key, updated);
    return updated;
  }

  /**
   * Invalidate a specific cache key or regex pattern
   */
  invalidate(keyOrPattern: string | RegExp): void {
    if (typeof keyOrPattern === 'string') {
      this.cache.delete(keyOrPattern);
    } else {
      for (const key of this.cache.keys()) {
        if (keyOrPattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Subscribe to cache updates
   */
  subscribe<T>(key: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // If data already in cache, trigger immediately
    const existing = this.get<T>(key);
    if (existing !== null) {
      callback(existing);
    }

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  private notify(key: string, data: any): void {
    const subs = this.listeners.get(key);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in cache subscriber for ${key}:`, e);
        }
      });
    }
  }
}

export const platformCache = new PlatformCacheEngine();
