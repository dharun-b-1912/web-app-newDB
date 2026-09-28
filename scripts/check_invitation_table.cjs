const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) {
    let val = v.join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[k.trim()] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const candidates = ['invitations', 'organization_invitations', 'platform_invitations', 'user_invitations', 'vendor_invitations', 'audit_logs', 'audit_events'];
  for (const c of candidates) {
    const { data, error } = await supabase.from(c).select('*').limit(1);
    if (error) {
      console.log(`Table "${c}": ❌ ${error.message}`);
    } else {
      console.log(`Table "${c}": ✅ EXISTS! Rows returned: ${data.length}`);
    }
  }
}
inspect();
