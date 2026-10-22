import 'dotenv/config';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

async function testConnections() {
  console.log('====================================================');
  console.log('🔍 TESTING SUPABASE & UPSTASH REDIS INFRASTRUCTURE');
  console.log('====================================================\n');

  // ── 1. Test Supabase Database Connection ──────────────────
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  console.log('--- 1. Testing Supabase REST API Connection ---');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/organizations?select=id,name&limit=1`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    const data = await res.json();
    if (res.ok) {
      console.log('✅ Supabase Connection: SUCCESS (HTTP 200)');
      console.log('Sample Org Found:', data);
    } else {
      console.error('❌ Supabase Connection Failed:', data);
    }
  } catch (err) {
    console.error('❌ Supabase Error:', err.message);
  }

  // ── 2. Test Upstash Serverless Redis ───────────────────────
  console.log('\n--- 2. Testing Upstash Serverless Redis ---');
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error('❌ Upstash Redis credentials missing from .env');
    return;
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    const pingRes = await redis.ping();
    console.log('✅ Redis Ping Response:', pingRes);

    const testKey = `workforceos:test:${Date.now()}`;
    await redis.set(testKey, { server: 'Joy PeopleHR', status: 'online' }, { ex: 60 });
    const getRes = await redis.get(testKey);
    console.log('✅ Redis SET & GET Verified:', getRes);
    await redis.del(testKey);

    // ── 3. Test Upstash Ratelimit ───────────────────────────
    console.log('\n--- 3. Testing Upstash Rate Limiter ---');
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '10 s'),
      prefix: 'ratelimit:test',
    });

    const identifier = 'test_ip_127.0.0.1';
    const limitRes1 = await ratelimit.limit(identifier);
    console.log('✅ Rate Limit Check 1:', {
      success: limitRes1.success,
      remaining: limitRes1.remaining,
      limit: limitRes1.limit,
    });

    const limitRes2 = await ratelimit.limit(identifier);
    console.log('✅ Rate Limit Check 2:', {
      success: limitRes2.success,
      remaining: limitRes2.remaining,
    });
  } catch (err) {
    console.error('❌ Upstash Redis / Ratelimit Error:', err.message);
  }

  console.log('\n====================================================');
  console.log('✅ INFRASTRUCTURE HEALTH VERIFICATION COMPLETE');
  console.log('====================================================');
}

testConnections();
