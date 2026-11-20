const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function checkCols() {
  const { data: cols, error } = await sb.rpc('get_table_columns', { table_name: 'biometric_devices' });
  console.log('Columns via RPC:', { cols, error });

  // Or select * limit 1
  const { data, error: selErr } = await sb.from('biometric_devices').select('*').limit(1);
  if (data && data[0]) {
    console.log('Available columns in biometric_devices:', Object.keys(data[0]));
    console.log('Row 0:', data[0]);
  }
}

checkCols();

