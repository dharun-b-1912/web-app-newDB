const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
  const branchRes = await sb.from('branches').select('id, organization_id').limit(1);
  const branch = branchRes.data[0];
  console.log('Using branch:', branch);

  const testPayload = {
    organization_id: branch.organization_id,
    branch_id: branch.id,
    device_name: 'eSSL AI-FACE MAGNUM Terminal - Main Entrance',
    serial_number: 'TDBD253600550',
    ip_address: '192.168.1.201',
    port: 4370,
    protocol: 'TCP',
    direction: 'BOTH',
    is_active: true
  };

  const { data, error } = await sb.from('biometric_devices').insert(testPayload).select();
  console.log('Insert with proper fields:', { data, error });
}
testInsert();
