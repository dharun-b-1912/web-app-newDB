const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectDeviceCols() {
  const { data } = await supabase.from('biometric_devices').select('*').limit(1);
  console.log('biometric_devices row keys:', Object.keys(data[0]));
}

inspectDeviceCols();

