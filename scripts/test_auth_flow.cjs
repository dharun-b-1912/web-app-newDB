// scripts/test_auth_flow.cjs
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

async function test() {
  const testEmail = `orgadmin.staging.${Date.now().toString(36)}@joypeoplehr.com`;
  const password = 'Validation#Password2026!';
  console.log(`Attempting signUp for ${testEmail}...`);

  const { data, error } = await client.auth.signUp({
    email: testEmail,
    password,
  });

  if (error) {
    console.log('signUp error:', error.message);
  } else {
    console.log('signUp success, user id:', data.user ? data.user.id : 'no user object');
    console.log('session:', data.session ? 'Session established' : 'Confirmation email pending or no session');
  }
}

test();
