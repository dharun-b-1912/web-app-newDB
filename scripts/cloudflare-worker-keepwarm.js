/**
 * Cloudflare Worker / Cron Trigger Keep-Warm Script
 * 
 * Free Tier Limits:
 * - Cloudflare Workers: 100,000 requests/day (FREE)
 * - Cron trigger every 4 mins = 360 requests/day (0.36% of daily quota)
 */

export default {
  // 1. Cron Trigger Handler (fires every 4 minutes)
  async scheduled(event, env, ctx) {
    const PING_URL = 'https://ysiajemrqakfngasehhi.supabase.co/functions/v1/telegram-webhook?ping=1';
    try {
      const response = await fetch(PING_URL, {
        method: 'GET',
        headers: { 'User-Agent': 'Cloudflare-Worker-KeepWarm/1.0' }
      });
      console.log(`[Keep-Warm Ping] Status: ${response.status}`);
    } catch (err) {
      console.error('[Keep-Warm Ping Error]:', err);
    }
  },

  // 2. HTTP Fetch Handler (Optional: can also be used as a webhook proxy)
  async fetch(request, env, ctx) {
    const PING_URL = 'https://ysiajemrqakfngasehhi.supabase.co/functions/v1/telegram-webhook?ping=1';
    const t0 = Date.now();
    const res = await fetch(PING_URL);
    const latency = Date.now() - t0;
    return new Response(JSON.stringify({
      status: 'warm',
      upstream_status: res.status,
      edge_latency_ms: latency,
      provider: 'Cloudflare Worker Free Tier'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
