const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function testWithLogin() {
  const { data: auth, error: loginErr } = await sb.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });
  if (loginErr) {
    console.error('Login failed:', loginErr);
    return;
  }
  console.log('Login success! User:', auth.user.id, 'User metadata:', auth.user.user_metadata, 'App metadata:', auth.user.app_metadata);

  // Now test select on biometric_devices
  const { data: devs, error: devErr } = await sb.from('biometric_devices').select('*');
  console.log('Select biometric_devices:', { count: devs?.length, devErr, devs });

  // Try insert
  const orgId = auth.user.user_metadata?.organization_id || auth.user.app_metadata?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
  console.log('Testing insert with orgId:', orgId);
  const testDev = {
    organization_id: orgId,
    device_name: 'Test Terminal Magnum',
    serial_number: 'TEST-MAGNUM-' + Date.now(),
    ip_address: '192.168.1.201',
    port: 4370,
  };
  const { data: insData, error: insErr } = await sb.from('biometric_devices').insert(testDev).select();
  console.log('Insert biometric_devices:', { insData, insErr });
}
testWithLogin();
