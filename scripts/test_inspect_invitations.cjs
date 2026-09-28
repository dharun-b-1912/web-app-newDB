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

async function testOrgInvitations() {
  const { data, error } = await supabase.from('organization_invitations').select('*').limit(1);
  console.log('Result for organization_invitations:', { data, error });

  const { data: omData, error: omError } = await supabase.from('organization_memberships').select('*').limit(1);
  console.log('Result for organization_memberships:', { data: omData, error: omError });

  const { data: pData, error: pError } = await supabase.from('permissions').select('*').limit(5);
  console.log('Result for permissions:', { count: pData?.length, error: pError });
}

testOrgInvitations();
