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

async function probeVendorInvitations() {
  const probeCols = [
    'id', 'organization_id', 'vendor_id', 'email', 'role', 'role_code', 'token',
    'status', 'expires_at', 'invited_by', 'created_at', 'updated_at', 'metadata'
  ];
  const validCols = [];
  for (const col of probeCols) {
    const { error } = await supabase.from('vendor_invitations').select(col).limit(1);
    if (!error) validCols.push(col);
  }
  console.log('Valid columns in vendor_invitations:', validCols);
}

probeVendorInvitations();
