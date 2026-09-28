// supabase/functions/_shared/rateLimiter.ts
// ============================================================
// Joy PeopleHR Enterprise — Multi-Tier Edge Function Rate Limiter
// Supports Upstash Redis REST API + High-Performance Sliding Window Fallback
// ============================================================

export interface RateLimitOptions {
  profile: string; // e.g., 'BIOMETRIC_PUNCH', 'AUTH_PROVISION', 'ADMIN_CRON'
  maxRequests: number; // Maximum allowed requests within window
  windowSeconds: number; // Sliding window duration in seconds
  identifier?: string; // Custom identifier (IP, Device Token, or User ID)
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
  headers: Record<string, string>;
  response?: Response;
}

// In-memory sliding window cache for local dev or when Redis is not configured
interface WindowEntry {
  count: number;
  startTime: number;
}
const localMemoryStore = new Map<string, WindowEntry>();

// Periodic cleanup of stale memory store entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of localMemoryStore.entries()) {
    if (now - entry.startTime > 300000) {
      localMemoryStore.delete(key);
    }
  }
}, 600000);

/**
 * Extracts client identification key from request headers
 */
export function extractClientIdentifier(req: Request, fallbackId?: string): string {
  if (fallbackId && fallbackId.trim()) return fallbackId.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  const xForwarded = req.headers.get("x-forwarded-for");
  const xRealIp = req.headers.get("x-real-ip");
  const deviceToken = req.headers.get("x-device-token");

  if (deviceToken) return `dev_${deviceToken.slice(-16)}`;
  if (cfIp) return cfIp.trim();
  if (xForwarded) return xForwarded.split(",")[0].trim();
  if (xRealIp) return xRealIp.trim();
  return "anonymous_client";
}

/**
 * Executes a rate limit check against Upstash Redis (if configured) or local sliding window.
 */
export async function checkRateLimit(
  req: Request,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const clientId = extractClientIdentifier(req, options.identifier);
  const cacheKey = `ratelimit:${options.profile}:${clientId}`;
  const now = Date.now();

  const upstashUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const upstashToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  // --- Path A: Upstash Redis REST Pipeline ---
  if (upstashUrl && upstashToken) {
    try {
      // INCR command with EXPIRE
      const pipelineRes = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", cacheKey],
          ["TTL", cacheKey],
        ]),
      });

      if (pipelineRes.ok) {
        const results = await pipelineRes.json();
        const currentCount = results[0]?.result || 1;
        let ttl = results[1]?.result || options.windowSeconds;

        // If newly created key (TTL was -1), set expiration
        if (ttl === -1 || currentCount === 1) {
          await fetch(`${upstashUrl}/expire/${cacheKey}/${options.windowSeconds}`, {
            headers: { Authorization: `Bearer ${upstashToken}` },
          }).catch(() => {});
          ttl = options.windowSeconds;
        }

        const remaining = Math.max(0, options.maxRequests - currentCount);
        const allowed = currentCount <= options.maxRequests;
        const resetSeconds = Math.max(1, ttl);

        const headers: Record<string, string> = {
          "X-RateLimit-Limit": String(options.maxRequests),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(resetSeconds),
        };

        if (!allowed) {
          headers["Retry-After"] = String(resetSeconds);
          return {
            allowed: false,
            limit: options.maxRequests,
            remaining: 0,
            resetInSeconds: resetSeconds,
            headers,
            response: new Response(
              JSON.stringify({
                error: `Too Many Requests: Rate limit exceeded for ${options.profile}.`,
                retry_after_seconds: resetSeconds,
                limit: options.maxRequests,
              }),
              {
                status: 429,
                headers: { ...headers, "Content-Type": "application/json" },
              }
            ),
          };
        }

        return {
          allowed: true,
          limit: options.maxRequests,
          remaining,
          resetInSeconds: resetSeconds,
          headers,
        };
      }
    } catch (redisErr) {
      console.warn("[RateLimiter] Upstash Redis check failed, falling back to in-memory:", redisErr);
    }
  }

  // --- Path B: High-Performance In-Memory Sliding Window ---
  const windowMs = options.windowSeconds * 1000;
  let entry = localMemoryStore.get(cacheKey);

  if (!entry || now - entry.startTime > windowMs) {
    entry = { count: 1, startTime: now };
    localMemoryStore.set(cacheKey, entry);
  } else {
    entry.count += 1;
  }

  const elapsedMs = now - entry.startTime;
  const resetInSeconds = Math.max(1, Math.ceil((windowMs - elapsedMs) / 1000));
  const remaining = Math.max(0, options.maxRequests - entry.count);
  const allowed = entry.count <= options.maxRequests;

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(options.maxRequests),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetInSeconds),
  };

  if (!allowed) {
    headers["Retry-After"] = String(resetInSeconds);
    return {
      allowed: false,
      limit: options.maxRequests,
      remaining: 0,
      resetInSeconds,
      headers,
      response: new Response(
        JSON.stringify({
          error: `Too Many Requests: Rate limit exceeded for ${options.profile}.`,
          retry_after_seconds: resetInSeconds,
          limit: options.maxRequests,
        }),
        {
          status: 429,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      ),
    };
  }

  return {
    allowed: true,
    limit: options.maxRequests,
    remaining,
    resetInSeconds,
    headers,
  };
}
