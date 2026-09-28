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

async function check() {
  const tables = [
    'organizations', 
    'user_profiles', 
    'organization_memberships', 
    'organization_users',
    'roles', 
    'permissions', 
    'role_permissions', 
    'invitations', 
    'organization_invitations', 
    'employees', 
    'vendors',
    'audit_logs',
    'audit_events'
  ];
  for (const t of tables) {
    const { data, count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table ${t}: ERROR -> ${error.message} (${error.code})`);
    } else {
      console.log(`Table ${t}: EXISTS (${count} records)`);
    }
  }
}
check();
