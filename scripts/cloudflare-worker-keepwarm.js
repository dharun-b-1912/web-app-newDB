/**
 * Cloudflare Worker / Cron Trigger Keep-Warm Script (Hardened & Secured)
 * 
 * Security Architecture:
 * 1. Blocks public Internet access to your worker (returns 403 Forbidden).
 * 2. Only allows requests that provide the secret token: `?token=YOUR_SECRET`
 * 3. Authenticates outbound ping to Supabase Edge Function with:
 *    `x-sentinel-warm-secret: joy_sentinel_keepwarm_secret_99812`
 * 
 * Free Tier Quota:
 * - 4-minute cron trigger = 360 requests/day (0.36% of 100,000 free daily quota).
 */

const WARM_SECRET = 'joy_sentinel_keepwarm_secret_99812';
const PING_TARGET = `https://ysiajemrqakfngasehhi.supabase.co/functions/v1/telegram-webhook?ping=1&key=${WARM_SECRET}`;

export default {
  // 1. Cron Trigger Handler (Automated every 4 minutes)
  async scheduled(event, env, ctx) {
    try {
      const response = await fetch(PING_TARGET, {
        method: 'GET',
        headers: {
          'x-sentinel-warm-secret': WARM_SECRET,
          'User-Agent': 'Cloudflare-Worker-JoySentinel/1.0',
        },
      });
      console.log(`[Keep-Warm Ping] Status: ${response.status}`);
    } catch (err) {
      console.error('[Keep-Warm Ping Error]:', err);
    }
  },

  // 2. HTTP Fetch Handler (Protected with authorization token)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const clientToken = url.searchParams.get('token') || request.headers.get('x-sentinel-auth');

    // Security Gate: Reject public visitors/scanners
    if (clientToken !== WARM_SECRET) {
      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: 'Access restricted to authorized Joy PeopleHR DevOps maintainers.',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Authorized manual test trigger
    const t0 = Date.now();
    const res = await fetch(PING_TARGET, {
      headers: {
        'x-sentinel-warm-secret': WARM_SECRET,
        'User-Agent': 'Cloudflare-Worker-JoySentinel/1.0',
      },
    });
    const latency = Date.now() - t0;

    return new Response(JSON.stringify({
      status: 'warm',
      upstream_status: res.status,
      edge_latency_ms: latency,
      secured: true,
      provider: 'Cloudflare Worker Free Tier',
      timestamp: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

