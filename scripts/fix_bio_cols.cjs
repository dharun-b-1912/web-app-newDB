const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function fixBiometricDeviceCols() {
  const SN = 'JNP2263200782';
  const { data, error } = await sb.from('biometric_devices')
    .update({
      last_heartbeat_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('serial_number', SN)
    .select();
  console.log('Updated biometric device:', { data, error });
}

fixBiometricDeviceCols();

