const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkCols() {
  // Try inserting a dummy with invalid columns or test insert
  const testDev = {
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    device_name: 'Test Device Probe',
    serial_number: 'TEST-PROBE-001',
    ip_address: '192.168.1.201',
    port: 4370,
  };
  const { data, error } = await sb.from('biometric_devices').insert(testDev).select();
  console.log('Insert test:', { data, error });
  if (data && data.length > 0) {
    console.log('Columns in returned row:', Object.keys(data[0]));
    // Clean up
    await sb.from('biometric_devices').delete().eq('serial_number', 'TEST-PROBE-001');
  }
}
checkCols();
