const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDevicesAndLogs() {
  console.log('=== 1. ALL BIOMETRIC DEVICES IN DB ===');
  const { data: devices, error: devErr } = await supabase
    .from('biometric_devices')
    .select('*');
  console.log('Devices:', JSON.stringify(devices, null, 2), devErr);

  console.log('\n=== 2. RECENT ATTENDANCE PUNCHES / LOGS ===');
  const { data: punches, error: pErr } = await supabase
    .from('attendance_punches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  console.log('Recent punches count:', punches?.length);
  if (punches && punches.length > 0) {
    console.log('Sample punches:', punches.slice(0, 5));
  }

  // Check if there is an adms_logs or similar table
  const { data: tables } = await supabase.rpc('get_table_columns', { table_name: 'biometric_devices' });
  console.log('biometric_devices cols:', tables);
}

checkDevicesAndLogs();
