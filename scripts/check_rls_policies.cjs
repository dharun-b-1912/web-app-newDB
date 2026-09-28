// scripts/check_rls_policies.cjs
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach((l) => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  // Query existing vendors
  const { data, error } = await client.from('vendors').select('*').limit(5);
  console.log('vendors query result:', { count: data ? data.length : 0, error: error?.message });
}

check();
