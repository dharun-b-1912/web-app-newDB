const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));

const UPSTASH_URL = envConfig.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = envConfig.UPSTASH_REDIS_REST_TOKEN;

async function checkRedis() {
  console.log('Testing Upstash Redis URL:', UPSTASH_URL);
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.error('Missing Upstash credentials in .env');
    return;
  }

  const res = await fetch(`${UPSTASH_URL}/scan/0`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });
  const data = await res.json();
  console.log('Redis keys (scan 0):', data);

  // Check specific keys for JNP2263200782
  const checkKeys = [
    'adms_cmd_queue:JNP2263200782',
    'adms_auto_lock:JNP2263200782',
    'adms_unmapped_punches:JNP2263200782',
    'adms_cmd_queue:TDBD253600550'
  ];

  for (const k of checkKeys) {
    const r = await fetch(`${UPSTASH_URL}/get/${k}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const d = await r.json();
    console.log(`Key [${k}]:`, d);
  }
}

checkRedis();

