// src/services/operations/securityRateLimiterEngine.ts
// ============================================================================
// Joy PeopleHR — Security Rate Limiter & DoS Protection Engine (Gate S15)
// Multi-tier Rate Limiting: Login (10/min), General API (100/min), Biometric Ingestion
// ============================================================================

export interface RateLimitProfile {
  maxRequests: number;
  windowMs: number; // in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  remaining: number;
  retryAfterSeconds?: number;
}

class SecurityRateLimiterEngine {
  private requestStore: Map<string, { count: number; resetAt: number }> = new Map();

  private profiles: Record<string, RateLimitProfile> = {
    LOGIN: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests / min
    PASSWORD_RESET: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 / hour
    GENERAL_API: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 / min
    BIOMETRIC_INGESTION: { maxRequests: 500, windowMs: 60 * 1000 }, // 500 / min per device
    PUBLIC_WEBHOOK: { maxRequests: 60, windowMs: 60 * 1000 },
  };

  /**
   * Evaluates request against sliding window rate limit
   */
  evaluateRateLimit(
    clientKey: string,
    profileType: 'LOGIN' | 'PASSWORD_RESET' | 'GENERAL_API' | 'BIOMETRIC_INGESTION' | 'PUBLIC_WEBHOOK'
  ): RateLimitResult {
    const profile = this.profiles[profileType] || this.profiles.GENERAL_API;
    const key = `${profileType}:${clientKey}`;
    const now = Date.now();

    const entry = this.requestStore.get(key);

    if (!entry || now > entry.resetAt) {
      // First request or window expired
      this.requestStore.set(key, { count: 1, resetAt: now + profile.windowMs });
      return {
        allowed: true,
        currentCount: 1,
        maxLimit: profile.maxRequests,
        remaining: profile.maxRequests - 1,
      };
    }

    if (entry.count >= profile.maxRequests) {
      // RATE LIMIT EXCEEDED (429)
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      return {
        allowed: false,
        currentCount: entry.count,
        maxLimit: profile.maxRequests,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      currentCount: entry.count,
      maxLimit: profile.maxRequests,
      remaining: profile.maxRequests - entry.count,
    };
  }

  /**
   * Resets rate limit for a client (e.g. on successful login)
   */
  resetRateLimit(clientKey: string, profileType: string) {
    this.requestStore.delete(`${profileType}:${clientKey}`);
  }
}

export const securityRateLimiterEngine = new SecurityRateLimiterEngine();
