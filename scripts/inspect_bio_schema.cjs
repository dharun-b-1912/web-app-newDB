const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function inspectTableSchema() {
  const { data, error } = await sb.from('biometric_devices').select('*').limit(1);
  console.log('Sample row from biometric_devices:', data ? data[0] : null);
}

inspectTableSchema();

